#include "software_scale_context.h"
#include "frame.h"
#include <napi.h>

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
  }

  ~SwsScaleFrameWorker() {
    ctx_ref_.Reset();
    dst_ref_.Reset();
    src_ref_.Reset();
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!ctx_ || !ctx_->Get()) {
      ret_ = AVERROR(EINVAL);
      return;
    }

    if (!dst_ || !dst_->Get() || !src_ || !src_->Get()) {
      ret_ = AVERROR(EINVAL);
      return;
    }

    ret_ = sws_scale_frame(ctx_->Get(), dst_->Get(), src_->Get());
  }

  void OnOK() override {
    // sws_scale_frame auto-allocated the destination buffers on the worker
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
  Napi::ObjectReference ctx_ref_;
  Napi::ObjectReference dst_ref_;
  Napi::ObjectReference src_ref_;
  SoftwareScaleContext* ctx_;
  Frame* dst_;
  Frame* src_;
  int ret_;
  Napi::Promise::Deferred deferred_;
};

class SwsScaleWorker : public Napi::AsyncWorker {
public:
  SwsScaleWorker(Napi::Env env, Napi::Object ctxObj, SoftwareScaleContext* ctx,
                 const uint8_t* const srcSlice[], const int srcStride[],
                 int srcSliceY, int srcSliceH,
                 uint8_t* const dst[], const int dstStride[],
                 std::vector<Napi::Reference<Napi::Value>>&& srcRefs,
                 std::vector<Napi::Reference<Napi::Value>>&& dstRefs)
    : Napi::AsyncWorker(env),
      ctx_(ctx),
      srcSliceY_(srcSliceY),
      srcSliceH_(srcSliceH),
      ret_(0),
      srcRefs_(std::move(srcRefs)),
      dstRefs_(std::move(dstRefs)),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold reference to context
    ctx_ref_.Reset(ctxObj, 1);

    // Copy pointers and strides
    for (int i = 0; i < 4; i++) {
      srcSlice_[i] = srcSlice[i];
      srcStride_[i] = srcStride[i];
      dst_[i] = dst[i];
      dstStride_[i] = dstStride[i];
    }
  }

  ~SwsScaleWorker() {
    ctx_ref_.Reset();
    for (auto& ref : srcRefs_) {
      ref.Reset();
    }
    for (auto& ref : dstRefs_) {
      ref.Reset();
    }
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!ctx_ || !ctx_->Get()) {
      ret_ = AVERROR(EINVAL);
      return;
    }

    ret_ = sws_scale(ctx_->Get(), srcSlice_, srcStride_, srcSliceY_, srcSliceH_, dst_, dstStride_);
  }

  void OnOK() override {
    deferred_.Resolve(Napi::Number::New(Env(), ret_));
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference ctx_ref_;
  SoftwareScaleContext* ctx_;
  const uint8_t* srcSlice_[4];
  int srcStride_[4];
  int srcSliceY_;
  int srcSliceH_;
  uint8_t* dst_[4];
  int dstStride_[4];
  int ret_;
  std::vector<Napi::Reference<Napi::Value>> srcRefs_;
  std::vector<Napi::Reference<Napi::Value>> dstRefs_;
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
  Frame* dst = Napi::ObjectWrap<Frame>::Unwrap(dstObj);
  Frame* src = Napi::ObjectWrap<Frame>::Unwrap(srcObj);

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

  // Prepare source pointers and strides - need persistent references
  const uint8_t* srcSlicePtr[4] = {nullptr, nullptr, nullptr, nullptr};
  int srcStrideVal[4] = {0, 0, 0, 0};

  // Store persistent references to buffers
  std::vector<Napi::Reference<Napi::Value>> srcRefs;

  for (uint32_t i = 0; i < srcSlice.Length() && i < 4; i++) {
    Napi::Value val = srcSlice[i];
    if (val.IsBuffer()) {
      Napi::Buffer<uint8_t> buf = val.As<Napi::Buffer<uint8_t>>();
      srcSlicePtr[i] = buf.Data();
      // Keep reference to buffer
      srcRefs.push_back(Napi::Persistent(val));
    }

    if (i < srcStride.Length()) {
      Napi::Value strideVal = srcStride[i];
      srcStrideVal[i] = strideVal.As<Napi::Number>().Int32Value();
    }
  }

  // Prepare destination pointers and strides - need persistent references
  uint8_t* dstPtr[4] = {nullptr, nullptr, nullptr, nullptr};
  int dstStrideVal[4] = {0, 0, 0, 0};

  // Store persistent references to buffers
  std::vector<Napi::Reference<Napi::Value>> dstRefs;

  for (uint32_t i = 0; i < dst.Length() && i < 4; i++) {
    Napi::Value val = dst[i];
    if (val.IsBuffer()) {
      Napi::Buffer<uint8_t> buf = val.As<Napi::Buffer<uint8_t>>();
      dstPtr[i] = buf.Data();
      // Keep reference to buffer
      dstRefs.push_back(Napi::Persistent(val));
    }

    if (i < dstStride.Length()) {
      Napi::Value strideVal = dstStride[i];
      dstStrideVal[i] = strideVal.As<Napi::Number>().Int32Value();
    }
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new SwsScaleWorker(env, thisObj, this, srcSlicePtr, srcStrideVal, srcSliceY, srcSliceH,
                                    dstPtr, dstStrideVal, std::move(srcRefs), std::move(dstRefs));

  worker->Queue();
  return worker->GetPromise();
}

} // namespace ffmpeg
