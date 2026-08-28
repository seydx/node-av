#ifndef FFMPEG_PROMISE_WORKER_H
#define FFMPEG_PROMISE_WORKER_H

#include <napi.h>
#include <atomic>
#include <chrono>
#include <functional>
#include <string>
#include <thread>
#include <utility>
#include <vector>

#include "common.h"

namespace ffmpeg {

class AsyncOpCounter {
public:
  void Begin() { count_.fetch_add(1, std::memory_order_acq_rel); }
  void End() { count_.fetch_sub(1, std::memory_order_acq_rel); }

  int Active() const { return count_.load(std::memory_order_acquire); }

  // Bounded wait on the main thread. Safe because End() runs at the end of
  // Execute() on the worker thread - completion does not require the main
  // thread's event loop to turn.
  bool WaitIdle(int timeout_ms = 2000) const {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeout_ms);
    while (Active() > 0) {
      if (std::chrono::steady_clock::now() >= deadline) {
        return false;
      }
      std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
    return true;
  }

private:
  std::atomic<int> count_{0};
};

inline bool GuardAsyncOps(Napi::Env env, const AsyncOpCounter& ops, const char* typeName) {
  if (ops.WaitIdle()) {
    return true;
  }
  Napi::Error::New(env, std::string(typeName) + " is busy: async operations still in flight - await them before freeing").ThrowAsJavaScriptException();
  return false;
}

class PromiseWorker : public Napi::AsyncWorker {
public:
  using WorkFn = std::function<int()>;
  using ResolveFn = std::function<Napi::Value(Napi::Env, int)>;

  // Every counter in `ops` is held for the duration of Execute(): the owning
  // object's own counter plus the counters of the packets/frames the work
  // touches, so none of them can be freed underneath the worker
  PromiseWorker(Napi::Env env, std::vector<AsyncOpCounter*> ops, std::vector<Napi::Object> pins, WorkFn work, ResolveFn resolve = nullptr)
    : AsyncWorker(env),
      ops_(std::move(ops)),
      work_(std::move(work)),
      resolve_(std::move(resolve)),
      deferred_(Napi::Promise::Deferred::New(env)) {
    pins_.reserve(pins.size());
    for (auto& obj : pins) {
      pins_.emplace_back();
      pins_.back().Reset(obj, 1);
    }
    for (AsyncOpCounter* op : ops_) {
      if (op) {
        op->Begin();
      }
    }
  }

  PromiseWorker(Napi::Env env, AsyncOpCounter* ops, std::vector<Napi::Object> pins, WorkFn work, ResolveFn resolve = nullptr)
    : PromiseWorker(env, std::vector<AsyncOpCounter*>{ops}, std::move(pins), std::move(work), std::move(resolve)) {}

  ~PromiseWorker() override {
    for (auto& ref : pins_) {
      ref.Reset();
    }
  }

  void Execute() override {
    result_ = work_();
    // Release before OnOK: the FFmpeg objects are not touched past this
    // point, so a GuardAsyncOps() wait on the main thread can proceed even
    // though the OnOK callback is still queued behind it.
    ReleaseOps();
  }

  void OnOK() override {
    Napi::Env env = Env();
    // Bail out after worker.terminate(): the env still drains pending
    // completions but can no longer run JS - resolving would escalate a failed
    // napi call to a process-fatal abort (see CanCallIntoJs)
    if (!CanCallIntoJs(env)) {
      return;
    }
    deferred_.Resolve(resolve_ ? resolve_(env, result_) : Napi::Number::New(env, result_));
  }

  void OnError(const Napi::Error& error) override {
    ReleaseOps();
    if (!CanCallIntoJs(Env())) {
      return;
    }
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

  // Create, queue and return the promise in one step
  static Napi::Promise Run(Napi::Env env, std::vector<AsyncOpCounter*> ops, std::vector<Napi::Object> pins, WorkFn work, ResolveFn resolve = nullptr) {
    auto* worker = new PromiseWorker(env, std::move(ops), std::move(pins), std::move(work), std::move(resolve));
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
  }

  static Napi::Promise Run(Napi::Env env, AsyncOpCounter* ops, std::vector<Napi::Object> pins, WorkFn work, ResolveFn resolve = nullptr) {
    return Run(env, std::vector<AsyncOpCounter*>{ops}, std::move(pins), std::move(work), std::move(resolve));
  }

private:
  void ReleaseOps() {
    for (AsyncOpCounter* op : ops_) {
      if (op) {
        op->End();
      }
    }
    ops_.clear();
  }

  std::vector<AsyncOpCounter*> ops_;
  WorkFn work_;
  ResolveFn resolve_;
  int result_ = 0;
  std::vector<Napi::ObjectReference> pins_;
  Napi::Promise::Deferred deferred_;
};

} // namespace ffmpeg

#endif // FFMPEG_PROMISE_WORKER_H
