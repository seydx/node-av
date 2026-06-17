#include "software_scale_context.h"
#include "frame.h"
#include "common.h"


namespace ffmpeg {

thread_local Napi::FunctionReference SoftwareScaleContext::constructor;

Napi::Object SoftwareScaleContext::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "SoftwareScaleContext", {
    InstanceMethod<&SoftwareScaleContext::AllocContext>("allocContext"),
    InstanceMethod<&SoftwareScaleContext::GetContext>("getContext"),
    InstanceMethod<&SoftwareScaleContext::InitContext>("initContext"),
    InstanceMethod<&SoftwareScaleContext::FreeContext>("freeContext"),
    InstanceMethod<&SoftwareScaleContext::ScaleAsync>("scale"),
    InstanceMethod<&SoftwareScaleContext::ScaleSync>("scaleSync"),
    InstanceMethod<&SoftwareScaleContext::ScaleFrameAsync>("scaleFrame"),
    InstanceMethod<&SoftwareScaleContext::ScaleFrameSync>("scaleFrameSync"),
    InstanceMethod(Napi::Symbol::WellKnown(env, "dispose"), &SoftwareScaleContext::Dispose),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("SoftwareScaleContext", func);
  return exports;
}

SoftwareScaleContext::SoftwareScaleContext(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<SoftwareScaleContext>(info) {
  // Constructor does nothing - user must explicitly call allocContext() or getContext()
}

SoftwareScaleContext::~SoftwareScaleContext() {
  sws_freeContext(ctx_);
  ctx_ = nullptr;
}

Napi::Value SoftwareScaleContext::AllocContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  sws_freeContext(ctx_);

  SwsContext* new_ctx = sws_alloc_context();
  if (!new_ctx) {
    Napi::Error::New(env, "Failed to allocate SwsContext").ThrowAsJavaScriptException();
    ctx_ = nullptr;
    return env.Undefined();
  }

  ctx_ = new_ctx;

  return env.Undefined();
}

Napi::Value SoftwareScaleContext::GetContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 7) {
    Napi::TypeError::New(env, "Expected 7 arguments (srcW, srcH, srcFormat, dstW, dstH, dstFormat, flags)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int srcW = info[0].As<Napi::Number>().Int32Value();
  int srcH = info[1].As<Napi::Number>().Int32Value();
  int srcFormat = info[2].As<Napi::Number>().Int32Value();
  int dstW = info[3].As<Napi::Number>().Int32Value();
  int dstH = info[4].As<Napi::Number>().Int32Value();
  int dstFormat = info[5].As<Napi::Number>().Int32Value();
  int flags = info[6].As<Napi::Number>().Int32Value();

  sws_freeContext(ctx_);

  // Create new context
  SwsContext* new_ctx = sws_getContext(
    srcW, srcH, static_cast<AVPixelFormat>(srcFormat),
    dstW, dstH, static_cast<AVPixelFormat>(dstFormat),
    flags, nullptr, nullptr, nullptr
  );

  if (!new_ctx) {
    Napi::Error::New(env, "Failed to create SwsContext").ThrowAsJavaScriptException();
    ctx_ = nullptr;
    return env.Undefined();
  }

  ctx_ = new_ctx;

  return env.Undefined();
}

Napi::Value SoftwareScaleContext::InitContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  SwsContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "Context not allocated").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = sws_init_context(ctx, nullptr, nullptr);
  return Napi::Number::New(env, ret);
}

Napi::Value SoftwareScaleContext::FreeContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  sws_freeContext(ctx_);
  ctx_ = nullptr;

  return env.Undefined();
}

Napi::Value SoftwareScaleContext::Dispose(const Napi::CallbackInfo& info) {
  return FreeContext(info);
}

} // namespace ffmpeg