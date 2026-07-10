#include "frame.h"
#include "common.h"
#include <napi.h>

extern "C" {
#include <libavutil/frame.h>
#include <libavutil/hwcontext.h>
}

namespace ffmpeg {

class HwframeTransferDataWorker : public Napi::AsyncWorker {
public:
  HwframeTransferDataWorker(Napi::Env env, Napi::Object srcObj, Frame* src,
                            Napi::Object dstObj, Frame* dst, int flags)
    : Napi::AsyncWorker(env),
      src_(src),
      dst_(dst),
      flags_(flags),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold references to prevent GC during async operation
    src_ref_.Reset(srcObj, 1);
    dst_ref_.Reset(dstObj, 1);
    // Mark both frames busy so free()/unref() waits instead of pulling the
    // buffers out from under the transfer (see promise_worker.h)
    src_->async_ops_.Begin();
    dst_->async_ops_.Begin();
  }

  ~HwframeTransferDataWorker() {
    src_ref_.Reset();
    dst_ref_.Reset();
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!src_ || !src_->Get() || !dst_ || !dst_->Get()) {
      ret_ = AVERROR(EINVAL);
    } else {
      ret_ = av_hwframe_transfer_data(dst_->Get(), src_->Get(), flags_);
    }
    // Release before OnOK so a GuardAsyncOps() wait on the main thread can
    // proceed even though the OnOK callback is still queued behind it
    EndOps();
  }

  void OnOK() override {
    // The transfer allocated the destination's (software) buffers on the worker
    // thread; reconcile V8 accounting now that we are back on the JS thread.
    // Safe even if the frame was freed after EndOps(): SyncExternalMemory
    // handles a null AVFrame.
    if (ret_ >= 0) {
      dst_->SyncExternalMemory(Env());
    }
    deferred_.Resolve(Napi::Number::New(Env(), ret_));
  }

  void OnError(const Napi::Error& e) override {
    EndOps();  // Execute may have been skipped
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  void EndOps() {
    if (ops_ended_) {
      return;
    }
    ops_ended_ = true;
    src_->async_ops_.End();
    dst_->async_ops_.End();
  }

  Napi::ObjectReference src_ref_;
  Napi::ObjectReference dst_ref_;
  Frame* src_;
  Frame* dst_;
  int flags_;
  int ret_;
  bool ops_ended_ = false;
  Napi::Promise::Deferred deferred_;
};

Napi::Value Frame::HwframeTransferDataAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!frame_) {
    Napi::Error::New(env, "Frame not allocated").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected destination frame").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "Destination must be a Frame object").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Object dstObj = info[0].As<Napi::Object>();
  Frame* dst = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  if (!dst || !dst->frame_) {
    Napi::Error::New(env, "Invalid destination frame").ThrowAsJavaScriptException();
    return env.Null();
  }

  int flags = 0;
  if (info.Length() >= 2 && info[1].IsNumber()) {
    flags = info[1].As<Napi::Number>().Int32Value();
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new HwframeTransferDataWorker(env, thisObj, this, dstObj, dst, flags);
  worker->Queue();
  return worker->GetPromise();
}

} // namespace ffmpeg
