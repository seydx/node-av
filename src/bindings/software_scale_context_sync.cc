#include "software_scale_context.h"
#include "frame.h"
#include <napi.h>

extern "C" {
#include <libswscale/swscale.h>
}

namespace ffmpeg {

Napi::Value SoftwareScaleContext::ScaleFrameSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    Napi::TypeError::New(env, "SoftwareScaleContext is not initialized").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (dst, src)").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Frame* dst = Napi::ObjectWrap<Frame>::Unwrap(info[0].As<Napi::Object>());
  Frame* src = Napi::ObjectWrap<Frame>::Unwrap(info[1].As<Napi::Object>());

  // Direct synchronous call
  int ret = sws_scale_frame(ctx_, dst->Get(), src->Get());

  // sws_scale_frame auto-allocates the destination buffers; reconcile V8.
  if (ret >= 0) {
    dst->SyncExternalMemory(env);
  }

  return Napi::Number::New(env, ret);
}

Napi::Value SoftwareScaleContext::ScaleSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    Napi::Error::New(env, "Context not initialized").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (info.Length() < 6) {
    Napi::TypeError::New(env, "Expected 6 arguments (srcSlice, srcStride, srcSliceY, srcSliceH, dst, dstStride)")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  // Parse source data
  if (!info[0].IsArray() || !info[1].IsArray()) {
    Napi::TypeError::New(env, "srcSlice and srcStride must be arrays").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Napi::Array srcSlice = info[0].As<Napi::Array>();
  Napi::Array srcStride = info[1].As<Napi::Array>();
  int srcSliceY = info[2].As<Napi::Number>().Int32Value();
  int srcSliceH = info[3].As<Napi::Number>().Int32Value();

  // Parse destination data
  if (!info[4].IsArray() || !info[5].IsArray()) {
    Napi::TypeError::New(env, "dst and dstStride must be arrays").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Napi::Array dst = info[4].As<Napi::Array>();
  Napi::Array dstStride = info[5].As<Napi::Array>();

  // Prepare source pointers and strides
  const uint8_t* srcSlicePtr[4] = {nullptr};
  int srcStrideVal[4] = {0};

  for (uint32_t i = 0; i < srcSlice.Length() && i < 4; i++) {
    Napi::Value val = srcSlice[i];
    if (val.IsBuffer()) {
      Napi::Buffer<uint8_t> buf = val.As<Napi::Buffer<uint8_t>>();
      srcSlicePtr[i] = buf.Data();
    }

    if (i < srcStride.Length()) {
      Napi::Value strideVal = srcStride[i];
      srcStrideVal[i] = strideVal.As<Napi::Number>().Int32Value();
    }
  }

  // Prepare destination pointers and strides
  uint8_t* dstPtr[4] = {nullptr};
  int dstStrideVal[4] = {0};

  for (uint32_t i = 0; i < dst.Length() && i < 4; i++) {
    Napi::Value val = dst[i];
    if (val.IsBuffer()) {
      Napi::Buffer<uint8_t> buf = val.As<Napi::Buffer<uint8_t>>();
      dstPtr[i] = buf.Data();
    }

    if (i < dstStride.Length()) {
      Napi::Value strideVal = dstStride[i];
      dstStrideVal[i] = strideVal.As<Napi::Number>().Int32Value();
    }
  }

  // Direct synchronous call
  int ret = sws_scale(ctx_, srcSlicePtr, srcStrideVal, srcSliceY, srcSliceH, dstPtr, dstStrideVal);

  return Napi::Number::New(env, ret);
}

} // namespace ffmpeg