#include "software_scale_context.h"
#include "frame.h"
#include "promise_worker.h"
#include <napi.h>
#include <array>
#include <vector>

extern "C" {
#include <libswscale/swscale.h>
}

namespace ffmpeg {

class SwsScaleFrameWorker : public Napi::AsyncWorker {
public:
  SwsScaleFrameWorker(Napi::Env env, Napi::Object ctxObj, SoftwareScaleContext* ctx,
                      Napi::Object dstObj, Frame* dst, Napi::Object srcObj, Frame* src)
    : Napi::AsyncWorker(env),
      ctx_(ctx),
      dst_(dst),
      src_(src),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold references to prevent GC during async operation
    ctx_ref_.Reset(ctxObj, 1);
    dst_ref_.Reset(dstObj, 1);
    src_ref_.Reset(srcObj, 1);
    // Mark the context and both frames busy so free()/unref() waits instead
    // of pulling memory out from under the scale (see promise_worker.h)
    ctx_->async_ops_.Begin();
    dst_->async_ops_.Begin();
    src_->async_ops_.Begin();
  }

  ~SwsScaleFrameWorker() {
    ctx_ref_.Reset();
    dst_ref_.Reset();
    src_ref_.Reset();
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!ctx_ || !ctx_->Get() || !dst_ || !dst_->Get() || !src_ || !src_->Get()) {
      ret_ = AVERROR(EINVAL);
    } else {
      ret_ = sws_scale_frame(ctx_->Get(), dst_->Get(), src_->Get());
    }
    // Release before OnOK so a GuardAsyncOps() wait on the main thread can
    // proceed even though the OnOK callback is still queued behind it
    EndOps();
  }

  void OnOK() override {
    // sws_scale_frame auto-allocated the destination buffers on the worker
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
    ctx_->async_ops_.End();
    dst_->async_ops_.End();
    src_->async_ops_.End();
  }

  Napi::ObjectReference ctx_ref_;
  Napi::ObjectReference dst_ref_;
  Napi::ObjectReference src_ref_;
  SoftwareScaleContext* ctx_;
  Frame* dst_;
  Frame* src_;
  int ret_;
  bool ops_ended_ = false;
  Napi::Promise::Deferred deferred_;
};

Napi::Value SoftwareScaleContext::ScaleFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    Napi::TypeError::New(env, "SoftwareScaleContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (dst, src)").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Object dstObj = info[0].As<Napi::Object>();
  Napi::Object srcObj = info[1].As<Napi::Object>();
  Frame* dst = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  Frame* src = UnwrapNativeObject<Frame>(env, info[1], "Frame");
  if (!dst || !src) {
    // Must not queue a worker with a pending exception - creating the
    // promise deferred fails and leaves it in an invalid state
    Napi::TypeError::New(env, "Invalid frame(s)").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new SwsScaleFrameWorker(env, thisObj, this, dstObj, dst, srcObj, src);
  worker->Queue();
  return worker->GetPromise();
}

Napi::Value SoftwareScaleContext::ScaleAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  SwsContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "Context not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (info.Length() < 6) {
    Napi::TypeError::New(env, "Expected 6 arguments (srcSlice, srcStride, srcSliceY, srcSliceH, dst, dstStride)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parse source data
  if (!info[0].IsArray() || !info[1].IsArray()) {
    Napi::TypeError::New(env, "srcSlice and srcStride must be arrays").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Array srcSlice = info[0].As<Napi::Array>();
  Napi::Array srcStride = info[1].As<Napi::Array>();
  int srcSliceY = info[2].As<Napi::Number>().Int32Value();
  int srcSliceH = info[3].As<Napi::Number>().Int32Value();

  // Parse destination data
  if (!info[4].IsArray() || !info[5].IsArray()) {
    Napi::TypeError::New(env, "dst and dstStride must be arrays").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Array dst = info[4].As<Napi::Array>();
  Napi::Array dstStride = info[5].As<Napi::Array>();

  // Pointers/strides are captured by value into the work function; the JS
  // buffers themselves stay alive through the worker's pins.
  std::vector<Napi::Object> pins = {info.This().As<Napi::Object>()};

  std::array<const uint8_t*, 4> srcSlicePtr = {nullptr, nullptr, nullptr, nullptr};
  std::array<int, 4> srcStrideVal = {0, 0, 0, 0};

  for (uint32_t i = 0; i < srcSlice.Length() && i < 4; i++) {
    Napi::Value val = srcSlice[i];
    if (val.IsBuffer()) {
      srcSlicePtr[i] = val.As<Napi::Buffer<uint8_t>>().Data();
      pins.push_back(val.As<Napi::Object>());
    }

    if (i < srcStride.Length()) {
      Napi::Value strideVal = srcStride[i];
      srcStrideVal[i] = strideVal.As<Napi::Number>().Int32Value();
    }
  }

  std::array<uint8_t*, 4> dstPtr = {nullptr, nullptr, nullptr, nullptr};
  std::array<int, 4> dstStrideVal = {0, 0, 0, 0};

  for (uint32_t i = 0; i < dst.Length() && i < 4; i++) {
    Napi::Value val = dst[i];
    if (val.IsBuffer()) {
      dstPtr[i] = val.As<Napi::Buffer<uint8_t>>().Data();
      pins.push_back(val.As<Napi::Object>());
    }

    if (i < dstStride.Length()) {
      Napi::Value strideVal = dstStride[i];
      dstStrideVal[i] = strideVal.As<Napi::Number>().Int32Value();
    }
  }

  return PromiseWorker::Run(env, &async_ops_, std::move(pins),
                            [ctx, srcSlicePtr, srcStrideVal, srcSliceY, srcSliceH, dstPtr, dstStrideVal]() {
    return sws_scale(ctx, srcSlicePtr.data(), srcStrideVal.data(), srcSliceY, srcSliceH, dstPtr.data(), dstStrideVal.data());
  });
}

} // namespace ffmpeg
