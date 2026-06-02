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
  HWFCTransferDataWorker(Napi::Env env, Napi::Object dstObj, Frame* dst,
                         Napi::Object srcObj, Frame* src, int flags)
    : Napi::AsyncWorker(env),
      dst_(dst),
      src_(src),
      flags_(flags),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold references to prevent GC during async operation
    dst_ref_.Reset(dstObj, 1);
    src_ref_.Reset(srcObj, 1);
  }

  ~HWFCTransferDataWorker() {
    dst_ref_.Reset();
    src_ref_.Reset();
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!dst_ || !dst_->Get() || !src_ || !src_->Get()) {
      ret_ = AVERROR(EINVAL);
      return;
    }

    ret_ = av_hwframe_transfer_data(dst_->Get(), src_->Get(), flags_);
  }

  void OnOK() override {
    // The transfer allocated the destination frame's buffers on the worker
    // thread; reconcile V8 accounting now that we are back on the JS thread.
    if (ret_ >= 0) {
      dst_->SyncExternalMemory(Env());
    }
    deferred_.Resolve(Napi::Number::New(Env(), ret_));
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference dst_ref_;
  Napi::ObjectReference src_ref_;
  Frame* dst_;
  Frame* src_;
  int flags_;
  int ret_;
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

  Napi::Object dstObj = info[0].As<Napi::Object>();
  Napi::Object srcObj = info[1].As<Napi::Object>();
  auto* worker = new HWFCTransferDataWorker(env, dstObj, dst, srcObj, src, flags);
  worker->Queue();
  return worker->GetPromise();
}

} // namespace ffmpeg