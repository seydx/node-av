#include "io_context.h"
#include "format_context.h"
#include <libavutil/error.h>
#include <libavutil/mem.h>
#include <chrono>
#include <condition_variable>
#include <cstring>
#include <mutex>
#include <thread>

namespace ffmpeg {

thread_local Napi::FunctionReference IOContext::constructor;
thread_local std::shared_ptr<IOExitState> IOContext::exit_state_;

namespace {

// How often a thread waiting for a promise the JS callback returned asks the JS
// thread whether its env still runs JS. worker.terminate() emits no 'exit'
// event, and such a promise never settles once the env is torn down.
constexpr auto kExitProbeInterval = std::chrono::milliseconds(250);

// Set by the main thread's 'exit' event: the whole process is going down and
// joins the threadpool, so no env's callback will run again
std::atomic<bool> g_process_exiting{false};

// Waiting side of a callback round-trip, linked into a registry so an exiting
// env, an aborted context or a finalized TSFN can wake its waiters. Waits have
// no timeout: live sources keep a read or write pending for as long as they stall.
class CallWaiter {
public:
  CallWaiter(std::shared_ptr<IOExitState> exit_state, std::shared_ptr<IOExitState> abort_state, std::shared_ptr<IOCallbackState> callback_state)
      : exit_state_(std::move(exit_state)), abort_state_(std::move(abort_state)), callback_state_(std::move(callback_state)) {}

  // Wakes the waiting calls ended by `state` (an env's or a context's), or of
  // every env when null
  static void WakeExitState(const IOExitState* state) {
    WakeIf([state](const CallWaiter& waiter) { return !state || waiter.exit_state_.get() == state || waiter.abort_state_.get() == state; });
  }

  // Wakes the waiting calls of one callback's TSFN
  static void WakeCallback(const IOCallbackState* state) {
    WakeIf([state](const CallWaiter& waiter) { return waiter.callback_state_.get() == state; });
  }

protected:
  bool ExitRequested() const {
    return g_process_exiting.load(std::memory_order_acquire) || exit_state_->exiting.load(std::memory_order_acquire) ||
           abort_state_->exiting.load(std::memory_order_acquire) || callback_state_->finalized.load(std::memory_order_acquire);
  }

  // Called without holding mutex_ (lock order: registry, then waiter)
  void Register() {
    Registry& registry = GetRegistry();
    std::lock_guard<std::mutex> lock(registry.mutex);
    next_ = registry.head;
    if (next_) {
      next_->prev_ = this;
    }
    registry.head = this;
  }

  void Unregister() {
    Registry& registry = GetRegistry();
    std::lock_guard<std::mutex> lock(registry.mutex);
    if (prev_) {
      prev_->next_ = next_;
    } else {
      registry.head = next_;
    }
    if (next_) {
      next_->prev_ = prev_;
    }
    prev_ = next_ = nullptr;
  }

  std::mutex mutex_;
  std::condition_variable cv_;
  std::shared_ptr<IOExitState> exit_state_;
  std::shared_ptr<IOExitState> abort_state_;
  std::shared_ptr<IOCallbackState> callback_state_;

private:
  struct Registry {
    std::mutex mutex;
    CallWaiter* head = nullptr;
  };

  // Never destroyed: threads outside the threadpool (an InputReader on custom
  // IO) can still unregister while static destructors run at process exit
  static Registry& GetRegistry() {
    static Registry* registry = new Registry();
    return *registry;
  }

  template <typename Pred>
  static void WakeIf(Pred&& matches) {
    Registry& registry = GetRegistry();
    std::lock_guard<std::mutex> lock(registry.mutex);
    for (CallWaiter* waiter = registry.head; waiter; waiter = waiter->next_) {
      if (matches(*waiter)) {
        // Under the waiter's lock, so a check-then-wait cannot miss it
        std::lock_guard<std::mutex> waiter_lock(waiter->mutex_);
        waiter->cv_.notify_all();
      }
    }
  }

  CallWaiter* prev_ = nullptr;
  CallWaiter* next_ = nullptr;
};

// Fails pending and later threadpool round-trips of one env, or every callback
// of one context
void MarkExitState(const std::shared_ptr<IOExitState>& state) {
  state->exiting.store(true, std::memory_order_release);
  CallWaiter::WakeExitState(state.get());
}

// One round-trip of a custom-IO callback from a threadpool thread to the JS
// thread. The JS side completes it (directly, or from a .then() long after the
// call) unless the waiting thread gave up first because the env exits; the
// FFmpeg buffer is only touched under the lock while the call is pending, so a
// late JS result never writes into a buffer the waiter already abandoned.
template <typename T>
class PendingCall : public CallWaiter {
public:
  PendingCall(std::shared_ptr<IOExitState> exit_state, std::shared_ptr<IOExitState> abort_state, std::shared_ptr<IOCallbackState> callback_state)
      : CallWaiter(std::move(exit_state), std::move(abort_state), std::move(callback_state)) {}

  // JS thread: runs `fn` under the lock while the call is still pending.
  // Returns false once the waiter gave up.
  template <typename Fn>
  bool WhilePending(Fn&& fn) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (state_ != kPending) {
      return false;
    }
    fn();
    return true;
  }

  // JS thread: false once the waiter gave up (nobody needs the callback then)
  bool Pending() {
    std::lock_guard<std::mutex> lock(mutex_);
    return state_ == kPending;
  }

  // JS thread: publishes the value `produce` returns (run under the lock, may
  // fill the FFmpeg buffer). Ignored once settled or abandoned.
  template <typename Fn>
  void CompleteWith(Fn&& produce) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (state_ != kPending) {
      return;
    }
    value_ = produce();
    state_ = kDone;
    cv_.notify_all();
  }

  void Complete(T value) {
    CompleteWith([value] { return value; });
  }

  // JS thread: the callback returned a promise, which only settles while the
  // env runs JS - from now on the waiter probes for a torn-down env
  void AwaitingPromise() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (state_ == kPending) {
      awaiting_promise_ = true;
      cv_.notify_all();
    }
  }

  // Threadpool thread: waits for the JS result, or returns `on_exit` once the
  // env or the process exits or the TSFN goes away
  T Await(Napi::ThreadSafeFunction tsfn, T on_exit) {
    Register();
    T result = Wait(tsfn, on_exit);
    Unregister();
    return result;
  }

private:
  enum State { kPending, kDone, kAbandoned };

  T Wait(Napi::ThreadSafeFunction& tsfn, T on_exit) {
    std::unique_lock<std::mutex> lock(mutex_);
    auto next_probe = std::chrono::steady_clock::time_point::max();
    while (state_ == kPending) {
      if (ExitRequested()) {
        state_ = kAbandoned;
        return on_exit;
      }
      if (!awaiting_promise_) {
        cv_.wait(lock);
        continue;
      }
      auto now = std::chrono::steady_clock::now();
      if (next_probe == std::chrono::steady_clock::time_point::max()) {
        next_probe = now + kExitProbeInterval;
      }
      if (now < next_probe) {
        cv_.wait_until(lock, next_probe);
        continue;
      }
      // One probe per interval, answered or not: a closing TSFN drops queued
      // calls without running them, so waiting for an answer could wait forever
      next_probe = now + kExitProbeInterval;
      lock.unlock();
      std::shared_ptr<IOExitState> exit_state = exit_state_;
      napi_status status = tsfn.NonBlockingCall([exit_state](Napi::Env env, Napi::Function) {
        if (!CanCallIntoJs(env)) {
          MarkExitState(exit_state);
        }
      });
      lock.lock();
      if (status != napi_ok) {
        // A closing TSFN never runs this call's callback either
        callback_state_->closed.store(true, std::memory_order_release);
        if (state_ == kPending) {
          state_ = kAbandoned;
          return on_exit;
        }
      }
    }
    return value_;
  }

  State state_ = kPending;
  T value_{};
  bool awaiting_promise_ = false;
};

// Creates the ThreadSafeFunction for one callback. It does not hold the event
// loop open (a context the user never frees must not prevent exit). Once it is
// finalized, calls still queued on it are dropped without running, so the
// finalizer wakes their waiters.
Napi::ThreadSafeFunction NewCallbackTsfn(Napi::Env env, Napi::Function fn, const char* name, std::shared_ptr<IOCallbackState> state) {
  // Unlimited queue, one thread (the AVIOContext's threadpool user)
  Napi::ThreadSafeFunction tsfn = Napi::ThreadSafeFunction::New(env, fn, name, 0, 1, [state](Napi::Env) {
    state->finalized.store(true, std::memory_order_release);
    CallWaiter::WakeCallback(state.get());
  });
  tsfn.Unref(env);
  return tsfn;
}

// Releases our thread count of a callback's TSFN unless env teardown finalized
// it or a failed call already consumed the count
void ReleaseCallbackTsfn(Napi::ThreadSafeFunction& tsfn, const IOCallbackState& state) {
  if (!state.finalized.load(std::memory_order_acquire) && !state.closed.load(std::memory_order_acquire)) {
    tsfn.Release();
  }
}

} // namespace

Napi::Object IOContext::Init(Napi::Env env, Napi::Object exports) {
  // Fresh state per env: a thread can host a new env after the old one exited
  exit_state_ = std::make_shared<IOExitState>();

  // Env teardown (worker.terminate(), a worker's or the main thread's natural
  // end) runs every cleanup hook before it finalizes the env's TSFNs, and no JS
  // runs from then on. Waking the env's waiters here frees threads outside the
  // threadpool (an InputReader on custom IO) before the reader's TSFN finalizer
  // joins them, whatever order libuv finalizes the TSFNs in.
  env.AddCleanupHook([state = exit_state_] { MarkExitState(state); });

  Napi::Function func = DefineClass(env, "IOContext", {
    StaticMethod<&IOContext::MarkExiting>("markExiting"),
    InstanceMethod<&IOContext::AllocContext>("allocContext"),
    InstanceMethod<&IOContext::AllocContextWithCallbacks>("allocContextWithCallbacks"),
    InstanceMethod<&IOContext::FreeContext>("freeContext"),
    InstanceMethod<&IOContext::Open2Async>("open2"),
    InstanceMethod<&IOContext::Open2Sync>("open2Sync"),
    InstanceMethod<&IOContext::ClosepAsync>("closep"),
    InstanceMethod<&IOContext::ClosepSync>("closepSync"),
    InstanceMethod<&IOContext::ReadAsync>("read"),
    InstanceMethod<&IOContext::ReadSync>("readSync"),
    InstanceMethod<&IOContext::WriteAsync>("write"),
    InstanceMethod<&IOContext::WriteSync>("writeSync"),
    InstanceMethod<&IOContext::SeekAsync>("seek"),
    InstanceMethod<&IOContext::SeekSync>("seekSync"),
    InstanceMethod<&IOContext::SizeAsync>("size"),
    InstanceMethod<&IOContext::SizeSync>("sizeSync"),
    InstanceMethod<&IOContext::FlushAsync>("flush"),
    InstanceMethod<&IOContext::FlushSync>("flushSync"),
    InstanceMethod<&IOContext::SkipAsync>("skip"),
    InstanceMethod<&IOContext::SkipSync>("skipSync"),
    InstanceMethod<&IOContext::Tell>("tell"),
    InstanceMethod(Napi::Symbol::WellKnown(env, "asyncDispose"), &IOContext::AsyncDispose),
    InstanceMethod(Napi::Symbol::WellKnown(env, "dispose"), &IOContext::SyncDispose),

    InstanceAccessor<&IOContext::GetEof, nullptr>("eof"),
    InstanceAccessor<&IOContext::GetError, nullptr>("error"),
    InstanceAccessor<&IOContext::GetSeekable, nullptr>("seekable"),
    InstanceAccessor("maxPacketSize", &IOContext::GetMaxPacketSize, &IOContext::SetMaxPacketSize, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("direct", &IOContext::GetDirect, &IOContext::SetDirect, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&IOContext::GetPos, nullptr>("pos"),
    InstanceAccessor<&IOContext::GetBufferSize, nullptr>("bufferSize"),
    InstanceAccessor<&IOContext::GetWriteFlag, nullptr>("writeFlag"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("IOContext", func);
  return exports;
}

IOContext::IOContext(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<IOContext>(info),
    ctx_(nullptr) {
  // Constructor does nothing - user must call allocContext() or open2()
}

IOContext::~IOContext() {
  // Never freed or closed explicitly (e.g. the input of a demuxer dropped
  // without close()). Free ctx_ here unless the FormatContext using it as its
  // pb closes it (an output's pb opened with open2()). Threadpool work still
  // using it keeps it alive instead, as freeing it then would be a
  // use-after-free; nothing can start new work from inside a finalizer.
  bool format_closes = pb_of_ && pb_of_->ctx_ && pb_of_->ctx_->pb == ctx_ && pb_of_->ClosesPb();
  bool busy = async_ops_.Active() > 0 || (pb_of_ && (pb_of_->reader_ || pb_of_->async_ops_.Active() > 0));
  bool frees = ctx_ && !format_closes && !busy;
  if (pb_of_) {
    if (frees && pb_of_->ctx_ && pb_of_->ctx_->pb == ctx_) {
      pb_of_->ctx_->pb = nullptr;
    }
    pb_of_->pb_io_ = nullptr;
    pb_of_ = nullptr;
  }

  // Opened with avio_open2(): its opaque is the protocol handle to close
  bool opened = ctx_ && !callback_data_ && ctx_->opaque;
  // The work that keeps ctx_ alive still calls into it with the callback data
  // as its opaque, so the data stays allocated with ctx_, switched off
  CleanupCallbacks(ctx_ && busy);

  if (frees) {
    if (opened) {
      avio_closep(&ctx_);
    } else {
      // avio_context_free does not free the I/O buffer
      av_free(ctx_->buffer);
      avio_context_free(&ctx_);
    }
  }
  ctx_ = nullptr;
}

int IOContext::ReadPacket(void* opaque, uint8_t* buf, int buf_size) {
  CallbackData* data = static_cast<CallbackData*>(opaque);
  if (!data || !data->active || !data->has_read_callback) {
    return AVERROR_EOF;
  }

  // The input reading through this context is closed or interrupted. Its
  // source may never deliver again, and FFmpeg retries reads after an error
  // (avio_feof() clears eof_reached), so every later call fails as well.
  if (data->abort_state->exiting.load(std::memory_order_acquire)) {
    return AVERROR_EXIT;
  }

  // Try direct call first (for synchronous operations in main thread)
  // IMPORTANT: Only use direct call if we're in the same thread where callbacks were registered
  if (data->env && !data->read_callback_direct.IsEmpty() &&
      std::this_thread::get_id() == data->main_thread_id) {
    try {
      Napi::Env env(data->env);
      Napi::HandleScope scope(env);

      Napi::Value result = data->read_callback_direct.Call({Napi::Number::New(env, buf_size)});

      if (result.IsNull() || result.IsUndefined()) {
        return AVERROR_EOF;
      } else if (result.IsBuffer()) {
        Napi::Buffer<uint8_t> buffer = result.As<Napi::Buffer<uint8_t>>();
        int bytes_read = std::min(static_cast<int>(buffer.Length()), buf_size);
        memcpy(buf, buffer.Data(), bytes_read);
        return bytes_read;
      } else if (result.IsNumber()) {
        // Error code
        return result.As<Napi::Number>().Int32Value();
      } else {
        return AVERROR(EINVAL);
      }
    } catch (...) {
      // Napi never unwinds here: all three gyp files build with
      // NAPI_DISABLE_CPP_EXCEPTIONS, so a throwing JS callback leaves a pending
      // exception that surfaces once control returns to JS. This only catches
      // non-Napi failures such as a bad allocation.
      return AVERROR(EIO);
    }
  }

  // Fallback to ThreadSafeFunction (for async operations or when not in main thread).
  // An exiting env never runs the callback again (process.exit() then joins this
  // thread, a terminated worker waits for it), so fail instead of parking here;
  // same for a TSFN that is gone (see IOCallbackState).
  if (!CanRoundTrip(data, *data->read_state)) {
    return AVERROR_EXIT;
  }

  // Shared with the JS side so a result can arrive after this thread gave up
  // (env exit, input close): the late result is then dropped untouched
  auto call = std::make_shared<PendingCall<int>>(data->exit_state, data->abort_state, data->read_state);
  std::shared_ptr<IOExitState> exit_state = data->exit_state;

  auto callback = [call, exit_state, buf, buf_size](Napi::Env env, Napi::Function jsCallback) {
    // Dispatched during env teardown (worker.terminate()): no JS can run, and a
    // failed napi call would escalate to a fatal error (see CanCallIntoJs)
    if (!CanCallIntoJs(env)) {
      MarkExitState(exit_state);
      call->Complete(AVERROR_EXIT);
      return;
    }
    if (!call->Pending()) {
      return;
    }
    try {
      Napi::Value result = jsCallback.Call({Napi::Number::New(env, buf_size)});

      // Check if result is a Promise (has .then method)
      if (result.IsObject() && !result.IsBuffer() && !result.IsNull()) {
        Napi::Object obj = result.As<Napi::Object>();
        if (obj.Has("then") && obj.Get("then").IsFunction()) {
          // It's a Promise - attach .then() handler
          Napi::Function thenFn = obj.Get("then").As<Napi::Function>();

          // Create resolve handler - fills buf only while the reader still waits for it
          auto onResolve = Napi::Function::New(env, [call, buf, buf_size](const Napi::CallbackInfo& info) {
            if (info.Length() == 0 || info[0].IsNull() || info[0].IsUndefined()) {
              call->Complete(AVERROR_EOF);
            } else if (info[0].IsBuffer()) {
              Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
              call->CompleteWith([&] {
                int bytes = std::min(static_cast<int>(buffer.Length()), buf_size);
                memcpy(buf, buffer.Data(), bytes);
                return bytes;
              });
            } else if (info[0].IsNumber()) {
              call->Complete(info[0].As<Napi::Number>().Int32Value());
            } else {
              call->Complete(AVERROR(EINVAL));
            }
          });

          // Create reject handler
          auto onReject = Napi::Function::New(env, [call](const Napi::CallbackInfo& info) {
            call->Complete(AVERROR(EIO));
          });

          call->AwaitingPromise();
          thenFn.Call(obj, {onResolve, onReject});
          return; // Don't complete here - wait for .then()
        }
      }

      // Synchronous result
      if (result.IsNull() || result.IsUndefined()) {
        call->Complete(AVERROR_EOF);
      } else if (result.IsBuffer()) {
        Napi::Buffer<uint8_t> buffer = result.As<Napi::Buffer<uint8_t>>();
        call->CompleteWith([&] {
          int bytes_read = std::min(static_cast<int>(buffer.Length()), buf_size);
          memcpy(buf, buffer.Data(), bytes_read);
          return bytes_read;
        });
      } else if (result.IsNumber()) {
        call->Complete(result.As<Napi::Number>().Int32Value());
      } else {
        call->Complete(AVERROR(EINVAL));
      }
    } catch (...) {
      call->Complete(AVERROR(EIO));
    }
  };

  napi_status status = data->read_callback.BlockingCall(callback);
  if (status != napi_ok) {
    data->read_state->closed.store(true, std::memory_order_release);
    return AVERROR(EIO);
  }

  return call->Await(data->read_callback, AVERROR_EXIT);
}

int IOContext::WritePacket(void* opaque, const uint8_t* buf, int buf_size) {
  CallbackData* data = static_cast<CallbackData*>(opaque);
  if (!data || !data->active || !data->has_write_callback) {
    return AVERROR(ENOSYS);
  }

  // Closed or interrupted input (see ReadPacket)
  if (data->abort_state->exiting.load(std::memory_order_acquire)) {
    return AVERROR_EXIT;
  }

  // Try direct call first (for synchronous operations in main thread)
  // IMPORTANT: Only use direct call if we're in the same thread where callbacks were registered
  if (data->env && !data->write_callback_direct.IsEmpty() &&
      std::this_thread::get_id() == data->main_thread_id) {
    try {
      Napi::Env env(data->env);
      Napi::HandleScope scope(env);

      Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, const_cast<uint8_t*>(buf), buf_size);
      Napi::Value result = data->write_callback_direct.Call({buffer});

      if (result.IsNumber()) {
        return result.As<Napi::Number>().Int32Value();
      }
      return buf_size;  // Assume all bytes written
    } catch (...) {
      // Napi never unwinds here: all three gyp files build with
      // NAPI_DISABLE_CPP_EXCEPTIONS, so a throwing JS callback leaves a pending
      // exception that surfaces once control returns to JS. This only catches
      // non-Napi failures such as a bad allocation.
      return AVERROR(EIO);
    }
  }

  // Fallback to ThreadSafeFunction (for async operations or when not in main thread).
  // An exiting env never runs the callback again (see ReadPacket).
  if (!CanRoundTrip(data, *data->write_state)) {
    return AVERROR_EXIT;
  }

  // Shared with the JS side so a result can arrive after this thread gave up
  auto call = std::make_shared<PendingCall<int>>(data->exit_state, data->abort_state, data->write_state);
  std::shared_ptr<IOExitState> exit_state = data->exit_state;

  auto callback = [call, exit_state, buf, buf_size](Napi::Env env, Napi::Function jsCallback) {
    // Dispatched during env teardown (see ReadPacket)
    if (!CanCallIntoJs(env)) {
      MarkExitState(exit_state);
      call->Complete(AVERROR_EXIT);
      return;
    }
    try {
      // Copy while the writer still waits: once it gave up, buf may be reused
      Napi::Buffer<uint8_t> buffer;
      if (!call->WhilePending([&] { buffer = Napi::Buffer<uint8_t>::Copy(env, const_cast<uint8_t*>(buf), buf_size); })) {
        return;
      }
      Napi::Value result = jsCallback.Call({buffer});

      // Check if result is a Promise (has .then method)
      if (result.IsObject()) {
        Napi::Object obj = result.As<Napi::Object>();
        if (obj.Has("then") && obj.Get("then").IsFunction()) {
          // It's a Promise - attach .then() handler
          Napi::Function thenFn = obj.Get("then").As<Napi::Function>();

          // Create resolve handler
          auto onResolve = Napi::Function::New(env, [call, buf_size](const Napi::CallbackInfo& info) {
            int value = buf_size;
            if (info.Length() > 0 && info[0].IsNumber()) {
              value = info[0].As<Napi::Number>().Int32Value();
            }
            call->Complete(value);
          });

          // Create reject handler
          auto onReject = Napi::Function::New(env, [call](const Napi::CallbackInfo& info) {
            call->Complete(AVERROR(EIO));
          });

          call->AwaitingPromise();
          thenFn.Call(obj, {onResolve, onReject});
          return; // Don't complete here - wait for .then()
        }
      }

      // Synchronous result
      if (result.IsNumber()) {
        call->Complete(result.As<Napi::Number>().Int32Value());
      } else {
        call->Complete(buf_size);  // Assume all bytes written
      }
    } catch (...) {
      call->Complete(AVERROR(EIO));
    }
  };

  napi_status status = data->write_callback.BlockingCall(callback);
  if (status != napi_ok) {
    data->write_state->closed.store(true, std::memory_order_release);
    return AVERROR(EIO);
  }

  return call->Await(data->write_callback, AVERROR_EXIT);
}

int64_t IOContext::Seek(void* opaque, int64_t offset, int whence) {
  CallbackData* data = static_cast<CallbackData*>(opaque);
  if (!data || !data->active || !data->has_seek_callback) {
    return AVERROR(ENOSYS);
  }

  // Closed or interrupted input (see ReadPacket)
  if (data->abort_state->exiting.load(std::memory_order_acquire)) {
    return AVERROR_EXIT;
  }

  // Special case: AVSEEK_SIZE
  if (whence & AVSEEK_SIZE) {
    whence = AVSEEK_SIZE;
  }

  // Try direct call first (for synchronous operations in main thread)
  // IMPORTANT: Only use direct call if we're in the same thread where callbacks were registered
  if (data->env && !data->seek_callback_direct.IsEmpty() &&
      std::this_thread::get_id() == data->main_thread_id) {
    try {
      Napi::Env env(data->env);
      Napi::HandleScope scope(env);

      Napi::Value result = data->seek_callback_direct.Call({
        Napi::BigInt::New(env, offset),
        Napi::Number::New(env, whence)
      });

      if (result.IsBigInt()) {
        bool lossless;
        return result.As<Napi::BigInt>().Int64Value(&lossless);
      } else if (result.IsNumber()) {
        return static_cast<int64_t>(result.As<Napi::Number>().Int64Value());
      } else {
        return AVERROR(EINVAL);
      }
    } catch (...) {
      // Napi never unwinds here: all three gyp files build with
      // NAPI_DISABLE_CPP_EXCEPTIONS, so a throwing JS callback leaves a pending
      // exception that surfaces once control returns to JS. This only catches
      // non-Napi failures such as a bad allocation.
      return AVERROR(EIO);
    }
  }

  // Fallback to ThreadSafeFunction (for async operations or when not in main thread).
  // An exiting env never runs the callback again (see ReadPacket).
  if (!CanRoundTrip(data, *data->seek_state)) {
    return AVERROR_EXIT;
  }

  // Shared with the JS side so a result can arrive after this thread gave up
  auto call = std::make_shared<PendingCall<int64_t>>(data->exit_state, data->abort_state, data->seek_state);
  std::shared_ptr<IOExitState> exit_state = data->exit_state;

  auto callback = [call, exit_state, offset, whence](Napi::Env env, Napi::Function jsCallback) {
    // Dispatched during env teardown (see ReadPacket)
    if (!CanCallIntoJs(env)) {
      MarkExitState(exit_state);
      call->Complete(AVERROR_EXIT);
      return;
    }
    if (!call->Pending()) {
      return;
    }
    try {
      Napi::Value result = jsCallback.Call({
        Napi::BigInt::New(env, offset),
        Napi::Number::New(env, whence)
      });

      // Check if result is a Promise (has .then method)
      if (result.IsObject() && !result.IsNull()) {
        Napi::Object obj = result.As<Napi::Object>();
        if (obj.Has("then") && obj.Get("then").IsFunction()) {
          // It's a Promise - attach .then() handler
          Napi::Function thenFn = obj.Get("then").As<Napi::Function>();

          // Create resolve handler
          auto onResolve = Napi::Function::New(env, [call](const Napi::CallbackInfo& info) {
            int64_t value = AVERROR(EINVAL);
            if (info.Length() > 0) {
              if (info[0].IsBigInt()) {
                bool lossless;
                value = info[0].As<Napi::BigInt>().Int64Value(&lossless);
              } else if (info[0].IsNumber()) {
                value = static_cast<int64_t>(info[0].As<Napi::Number>().Int64Value());
              }
            }
            call->Complete(value);
          });

          // Create reject handler
          auto onReject = Napi::Function::New(env, [call](const Napi::CallbackInfo& info) {
            call->Complete(static_cast<int64_t>(AVERROR(EIO)));
          });

          call->AwaitingPromise();
          thenFn.Call(obj, {onResolve, onReject});
          return; // Don't complete here - wait for .then()
        }
      }

      // Synchronous result
      if (result.IsBigInt()) {
        bool lossless;
        call->Complete(result.As<Napi::BigInt>().Int64Value(&lossless));
      } else if (result.IsNumber()) {
        call->Complete(static_cast<int64_t>(result.As<Napi::Number>().Int64Value()));
      } else {
        call->Complete(static_cast<int64_t>(AVERROR(EINVAL)));
      }
    } catch (...) {
      call->Complete(static_cast<int64_t>(AVERROR(EIO)));
    }
  };

  napi_status status = data->seek_callback.BlockingCall(callback);
  if (status != napi_ok) {
    data->seek_state->closed.store(true, std::memory_order_release);
    return AVERROR(EIO);
  }

  return call->Await(data->seek_callback, static_cast<int64_t>(AVERROR_EXIT));
}

bool IOContext::CanRoundTrip(const CallbackData* data, const IOCallbackState& state) {
  return !g_process_exiting.load(std::memory_order_acquire) && !data->exit_state->exiting.load(std::memory_order_acquire) &&
         !state.finalized.load(std::memory_order_acquire) && !state.closed.load(std::memory_order_acquire);
}

void IOContext::AbortCallbacks(const std::shared_ptr<IOExitState>& state) {
  if (state) {
    MarkExitState(state);
  }
}

Napi::Value IOContext::MarkExiting(const Napi::CallbackInfo& info) {
  // Runs from 'exit', the last point before process.exit() joins the threadpool
  // (env cleanup hooks and atexit handlers only run after that join, if at all)
  bool process_exit = info.Length() > 0 && info[0].IsBoolean() && info[0].As<Napi::Boolean>().Value();
  if (exit_state_) {
    MarkExitState(exit_state_);
  }
  if (process_exit) {
    g_process_exiting.store(true, std::memory_order_release);
    CallWaiter::WakeExitState(nullptr);
  }
  return info.Env().Undefined();
}

bool IOContext::ProcessExiting() {
  return g_process_exiting.load(std::memory_order_acquire);
}

int IOContext::ExitInterruptCallback(void* /*opaque*/) {
  return ProcessExiting() ? 1 : 0;
}

bool IOContext::DetachFromFormat(Napi::Env env) {
  FormatContext* format = pb_of_;
  if (!format) {
    return true;
  }
  // The owner thread dereferences ctx->pb in every av_read_frame()
  if (format->reader_) {
    Napi::Error::New(env, "IOContext is the pb of a FormatContext with an active async reader - close the input first").ThrowAsJavaScriptException();
    return false;
  }
  if (!GuardAsyncOps(env, format->async_ops_, "FormatContext")) {
    return false;
  }
  if (format->ctx_ && format->ctx_->pb == ctx_) {
    format->ctx_->pb = nullptr;
  }
  format->pb_io_ = nullptr;
  pb_of_ = nullptr;
  return true;
}

bool IOContext::GuardOps(Napi::Env env) {
  if (async_ops_.Active() == 0) {
    return true;
  }
  // Callback-backed contexts: an in-flight operation may be parked in a
  // ThreadSafeFunction BlockingCall that needs THIS (main) thread's event
  // loop to run the JS callback. Waiting here would block the event loop and
  // guarantee the timeout - fail fast with a defined error instead.
  if (callback_data_) {
    Napi::Error::New(env, "IOContext is busy: async operations still in flight - await them before freeing").ThrowAsJavaScriptException();
    return false;
  }
  // File/URL-backed contexts complete on the threadpool without the main
  // thread - a bounded wait is safe here.
  return GuardAsyncOps(env, async_ops_, "IOContext");
}

void IOContext::CleanupCallbacks(bool keep_allocated) {
  if (callback_data_ && callback_data_->active) {
    callback_data_->active = false;
    // A round-trip still waiting on these callbacks fails now rather than once
    // the TSFNs released below finalize on a later event loop turn
    MarkExitState(callback_data_->abort_state);
    if (callback_data_->has_read_callback) {
      ReleaseCallbackTsfn(callback_data_->read_callback, *callback_data_->read_state);
      callback_data_->read_callback_direct.Reset();
      callback_data_->has_read_callback = false;
    }
    if (callback_data_->has_write_callback) {
      ReleaseCallbackTsfn(callback_data_->write_callback, *callback_data_->write_state);
      callback_data_->write_callback_direct.Reset();
      callback_data_->has_write_callback = false;
    }
    if (callback_data_->has_seek_callback) {
      ReleaseCallbackTsfn(callback_data_->seek_callback, *callback_data_->seek_state);
      callback_data_->seek_callback_direct.Reset();
      callback_data_->has_seek_callback = false;
    }
    if (keep_allocated) {
      (void)callback_data_.release();
    } else {
      callback_data_.reset();
    }
  }
}

Napi::Value IOContext::AllocContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (bufferSize, writeFlag)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (Get()) {
    Napi::Error::New(env, "IOContext already allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Replacing the context frees ctx_->buffer + context below - wait for
  // in-flight async operations (e.g. a racing open2) first
  if (!GuardOps(env) || !DetachFromFormat(env)) {
    return env.Undefined();
  }

  int buffer_size = info[0].As<Napi::Number>().Int32Value();
  int write_flag = info[1].As<Napi::Number>().Int32Value();
  
  // Allocate buffer
  unsigned char* buffer = static_cast<unsigned char*>(av_malloc(buffer_size));
  if (!buffer) {
    Napi::Error::New(env, "Failed to allocate buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Create AVIOContext without callbacks
  AVIOContext* new_ctx = avio_alloc_context(
    buffer, 
    buffer_size,
    write_flag,
    nullptr, // opaque pointer - no callbacks
    nullptr, // read_packet - no custom read
    nullptr, // write_packet - no custom write  
    nullptr  // seek - no custom seek
  );
  
  if (!new_ctx) {
    av_free(buffer);
    Napi::Error::New(env, "Failed to allocate AVIOContext").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Free old context if exists (avio_context_free does not free the I/O buffer)
  if (ctx_) {
    av_free(ctx_->buffer);
    avio_context_free(&ctx_);
  }

  ctx_ = new_ctx;
  return env.Undefined();
}

Napi::Value IOContext::AllocContextWithCallbacks(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // Parameters: bufferSize, writeFlag, readCallback, writeCallback, seekCallback
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected at least bufferSize and writeFlag").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (!info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "bufferSize and writeFlag must be numbers").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Replacing the context frees ctx_->buffer + context below and releases the
  // previous callbacks - wait for in-flight async operations first (or error
  // immediately when one is parked on a callback)
  if (!GuardOps(env) || !DetachFromFormat(env)) {
    return env.Undefined();
  }

  int buffer_size = info[0].As<Napi::Number>().Int32Value();
  int write_flag = info[1].As<Napi::Number>().Int32Value();

  // Allocate buffer (ownership passes to the AVIOContext; freed via ctx_->buffer,
  // never via a stale copy of this pointer - libavformat may replace the buffer)
  uint8_t* buffer = (uint8_t*)av_malloc(buffer_size);
  if (!buffer) {
    Napi::Error::New(env, "Failed to allocate buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Release previous callbacks before replacing them - leaked ThreadSafeFunctions
  // keep the event loop alive forever
  CleanupCallbacks();

  // Initialize callback data
  callback_data_ = std::make_unique<CallbackData>();
  callback_data_->io_context = this;
  callback_data_->env = env;  // Store env for direct calls
  callback_data_->main_thread_id = std::this_thread::get_id();  // Store thread ID for safety check
  callback_data_->exit_state = exit_state_ ? exit_state_ : std::make_shared<IOExitState>();
  callback_data_->active = true;

  // Setup callbacks
  int (*read_cb)(void*, uint8_t*, int) = nullptr;
  int (*write_cb)(void*, const uint8_t*, int) = nullptr;
  int64_t (*seek_cb)(void*, int64_t, int) = nullptr;

  // Read callback
  if (info.Length() > 2 && info[2].IsFunction()) {
    Napi::Function read_fn = info[2].As<Napi::Function>();
    callback_data_->read_callback = NewCallbackTsfn(env, read_fn, "IOReadCallback", callback_data_->read_state);
    callback_data_->read_callback_direct = Napi::Persistent(read_fn);
    callback_data_->has_read_callback = true;
    read_cb = ReadPacket;
  }

  // Write callback
  if (info.Length() > 3 && info[3].IsFunction()) {
    Napi::Function write_fn = info[3].As<Napi::Function>();
    callback_data_->write_callback = NewCallbackTsfn(env, write_fn, "IOWriteCallback", callback_data_->write_state);
    callback_data_->write_callback_direct = Napi::Persistent(write_fn);
    callback_data_->has_write_callback = true;
    write_cb = WritePacket;
  }

  // Seek callback
  if (info.Length() > 4 && info[4].IsFunction()) {
    Napi::Function seek_fn = info[4].As<Napi::Function>();
    callback_data_->seek_callback = NewCallbackTsfn(env, seek_fn, "IOSeekCallback", callback_data_->seek_state);
    callback_data_->seek_callback_direct = Napi::Persistent(seek_fn);
    callback_data_->has_seek_callback = true;
    seek_cb = Seek;
  }
  
  // Create AVIOContext with callbacks
  AVIOContext* new_ctx = avio_alloc_context(
    buffer,
    buffer_size,
    write_flag,
    callback_data_.get(),  // Pass callback data as opaque
    read_cb,
    write_cb,
    seek_cb
  );

  if (!new_ctx) {
    av_free(buffer);
    callback_data_.reset();
    Napi::Error::New(env, "Failed to allocate AVIOContext with callbacks").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Free old context if exists (avio_context_free does not free the I/O buffer)
  if (ctx_) {
    av_free(ctx_->buffer);
    avio_context_free(&ctx_);
  }

  ctx_ = new_ctx;
  return env.Undefined();
}

Napi::Value IOContext::FreeContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Freeing while a worker still uses the context on the threadpool would be
  // a use-after-free - wait bounded (or error immediately for callback-backed
  // contexts), then error instead of crashing
  if (!GuardOps(env) || !DetachFromFormat(env)) {
    return env.Undefined();
  }

  // Clean up callbacks first if they exist
  CleanupCallbacks();

  if (ctx_) {
    // avio_context_free() frees only the struct, NOT the I/O buffer (avio.h:
    // "AVIOContext.buffer ... must be later freed with av_free()"). Free the
    // current ctx_->buffer pointer - libavformat may have replaced the buffer
    // originally passed to avio_alloc_context().
    av_free(ctx_->buffer);
    avio_context_free(&ctx_);
    ctx_ = nullptr;
  }

  return env.Undefined();
}

Napi::Value IOContext::Tell(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "IOContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int64_t pos = avio_tell(ctx);
  return Napi::BigInt::New(env, pos);
}

Napi::Value IOContext::GetEof(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Boolean::New(env, false);
  }
  
  return Napi::Boolean::New(env, avio_feof(ctx) != 0);
}

Napi::Value IOContext::GetError(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->error);
}

Napi::Value IOContext::GetSeekable(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->seekable);
}

Napi::Value IOContext::GetMaxPacketSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->max_packet_size);
}

void IOContext::SetMaxPacketSize(const Napi::CallbackInfo& info, const Napi::Value& value) {
  AVIOContext* ctx = Get();
  if (!ctx) {
    return;
  }
  
  ctx->max_packet_size = value.As<Napi::Number>().Int32Value();
}

Napi::Value IOContext::GetDirect(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->direct);
}

void IOContext::SetDirect(const Napi::CallbackInfo& info, const Napi::Value& value) {
  AVIOContext* ctx = Get();
  if (!ctx) {
    return;
  }
  
  ctx->direct = value.As<Napi::Number>().Int32Value();
}

Napi::Value IOContext::GetPos(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  
  return Napi::BigInt::New(env, static_cast<int64_t>(ctx->pos));
}

Napi::Value IOContext::GetBufferSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->buffer_size);
}

Napi::Value IOContext::GetWriteFlag(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Boolean::New(env, false);
  }
  
  return Napi::Boolean::New(env, ctx->write_flag != 0);
}

Napi::Value IOContext::AsyncDispose(const Napi::CallbackInfo& info) {
  // Check if this context was created with callbacks or opened with avio_open2
  // Contexts with callbacks should use freeContext, others use closep
  if (callback_data_) {
    // This context was created with allocContextWithCallbacks
    // We need to clean it up with freeContext, not closep
    // For now, we'll do synchronous cleanup and return a resolved promise
    Napi::Env env = info.Env();

    // Freeing while async operations are in flight would be a use-after-free
    if (!GuardOps(env) || !DetachFromFormat(env)) {
      return env.Undefined();
    }

    // Clean up callbacks
    CleanupCallbacks();

    // Free the context if it exists (avio_context_free does not free the I/O buffer)
    if (ctx_) {
      av_free(ctx_->buffer);
      avio_context_free(&ctx_);
      ctx_ = nullptr;
    }

    // Return resolved promise
    auto deferred = Napi::Promise::Deferred::New(env);
    deferred.Resolve(env.Undefined());
    return deferred.Promise();
  } else {
    // This context was opened with avio_open2, use closep
    return ClosepAsync(info);
  }
}

Napi::Value IOContext::SyncDispose(const Napi::CallbackInfo& info) {
  if (callback_data_) {
    // Created with allocContextWithCallbacks — use freeContext logic
    // Freeing while async operations are in flight would be a use-after-free
    if (!GuardOps(info.Env()) || !DetachFromFormat(info.Env())) {
      return info.Env().Undefined();
    }

    CleanupCallbacks();

    if (ctx_) {
      // avio_context_free does not free the I/O buffer
      av_free(ctx_->buffer);
      avio_context_free(&ctx_);
      ctx_ = nullptr;
    }
  } else {
    // Opened with avio_open2 — use closepSync logic
    return ClosepSync(info);
  }

  return info.Env().Undefined();
}

} // namespace ffmpeg