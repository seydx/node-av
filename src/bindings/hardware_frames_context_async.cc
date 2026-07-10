#include "hardware_frames_context.h"
#include "frame.h"
#include "common.h"
#include <napi.h>

extern "C" {
#include <libavutil/hwcontext.h>
}

namespace ffmpeg {

class HWFCTransferDataWorker : public Napi::AsyncWorker {
public:
  HWFCTransferDataWorker(Napi::Env env, Napi::Object ctxObj, HardwareFramesContext* ctx,
                         Napi::Object dstObj, Frame* dst,
                         Napi::Object srcObj, Frame* src, int flags)
    : Napi::AsyncWorker(env),
      ctx_(ctx),
      dst_(dst),
      src_(src),
      flags_(flags),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold references to prevent GC during async operation
    ctx_ref_.Reset(ctxObj, 1);
    dst_ref_.Reset(dstObj, 1);
    src_ref_.Reset(srcObj, 1);
    // Mark the context and both frames busy so free()/unref() waits instead of
    // pulling memory out from under the transfer (see promise_worker.h)
    ctx_->async_ops_.Begin();
    dst_->async_ops_.Begin();
    src_->async_ops_.Begin();
  }

  ~HWFCTransferDataWorker() {
    ctx_ref_.Reset();
    dst_ref_.Reset();
    src_ref_.Reset();
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!dst_ || !dst_->Get() || !src_ || !src_->Get()) {
      ret_ = AVERROR(EINVAL);
    } else {
      ret_ = av_hwframe_transfer_data(dst_->Get(), src_->Get(), flags_);
    }
    // Release before OnOK so a GuardAsyncOps() wait on the main thread can
    // proceed even though the OnOK callback is still queued behind it
    EndOps();
  }

  void OnOK() override {
    if (!CanCallIntoJs(Env())) {
      return;
    }
    // The transfer allocated the destination frame's buffers on the worker
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
    if (!CanCallIntoJs(Env())) {
      return;
    }
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
    ctx_->async_ops_.End();
    dst_->async_ops_.End();
    src_->async_ops_.End();
  }

  Napi::ObjectReference ctx_ref_;
  Napi::ObjectReference dst_ref_;
  Napi::ObjectReference src_ref_;
  HardwareFramesContext* ctx_;
  Frame* dst_;
  Frame* src_;
  int flags_;
  int ret_;
  bool ops_ended_ = false;
  Napi::Promise::Deferred deferred_;
};

Napi::Value HardwareFramesContext::TransferDataAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (dst, src)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  Frame* dst = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  Frame* src = UnwrapNativeObject<Frame>(env, info[1], "Frame");

  if (!dst || !dst->Get() || !src || !src->Get()) {
    Napi::Error::New(env, "Invalid frame(s)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int flags = 0;
  if (info.Length() > 2 && info[2].IsNumber()) {
    flags = info[2].As<Napi::Number>().Int32Value();
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  Napi::Object dstObj = info[0].As<Napi::Object>();
  Napi::Object srcObj = info[1].As<Napi::Object>();
  auto* worker = new HWFCTransferDataWorker(env, thisObj, this, dstObj, dst, srcObj, src, flags);
  worker->Queue();
  return worker->GetPromise();
}

} // namespace ffmpeg
