#include "filter_inout.h"
#include "filter_context.h"
#include "common.h"

extern "C" {
#include <libavutil/mem.h>
}

namespace ffmpeg {

thread_local Napi::FunctionReference FilterInOut::constructor;

Napi::Object FilterInOut::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "FilterInOut", {
    InstanceMethod<&FilterInOut::Alloc>("alloc"),
    InstanceMethod<&FilterInOut::Free>("free"),
    InstanceMethod(Napi::Symbol::WellKnown(env, "dispose"), &FilterInOut::Dispose),

    InstanceAccessor("name", &FilterInOut::GetName, &FilterInOut::SetName, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("filterCtx", &FilterInOut::GetFilterCtx, &FilterInOut::SetFilterCtx, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("padIdx", &FilterInOut::GetPadIdx, &FilterInOut::SetPadIdx, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("next", &FilterInOut::GetNext, &FilterInOut::SetNext, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("FilterInOut", func);
  return exports;
}

FilterInOut::FilterInOut(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<FilterInOut>(info) {
  // Constructor does nothing - user must explicitly call alloc()
}

FilterInOut::~FilterInOut() {
  // Only free if we own it
  if (is_owned_) {
    avfilter_inout_free(&inout_);
  }
}

Napi::Value FilterInOut::Alloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Free old inout if exists and we own it
  if (is_owned_) {
    avfilter_inout_free(&inout_);
  }

  inout_ = avfilter_inout_alloc();
  is_owned_ = true;  // We allocated it, so we own it

  if (!inout_) {
    Napi::Error::New(env, "Failed to allocate FilterInOut").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  return env.Undefined();
}

Napi::Value FilterInOut::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Only free if we own it
  if (is_owned_) {
    avfilter_inout_free(&inout_);
  }

  return env.Undefined();
}

Napi::Value FilterInOut::GetName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterInOut* inout = inout_;
  if (!inout || !inout->name) {
    return env.Null();
  }
  return Napi::String::New(env, inout->name);
}

void FilterInOut::SetName(const Napi::CallbackInfo& info, const Napi::Value& value) {
  AVFilterInOut* inout = inout_;
  if (!inout) {
    return;
  }
  
  if (value.IsString()) {
    std::string name = value.As<Napi::String>().Utf8Value();
    av_freep(&inout->name);
    inout->name = av_strdup(name.c_str());
  } else if (value.IsNull()) {
    av_freep(&inout->name);
    inout->name = nullptr;
  }
}

Napi::Value FilterInOut::GetFilterCtx(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFilterInOut* inout = inout_;
  if (!inout || !inout->filter_ctx) {
    return env.Null();
  }
  
  // Wrap the filter context
  Napi::Object ctxObj = FilterContext::constructor.New({});
  FilterContext* wrapper = Napi::ObjectWrap<FilterContext>::Unwrap(ctxObj);
  wrapper->SetUnowned(inout->filter_ctx);
  
  return ctxObj;
}

void FilterInOut::SetFilterCtx(const Napi::CallbackInfo& info, const Napi::Value& value) {
  AVFilterInOut* inout = inout_;
  if (!inout) {
    return;
  }
  
  Napi::Env env = info.Env();
  
  if (value.IsNull() || value.IsUndefined()) {
    inout->filter_ctx = nullptr;
    return;
  }
  
  FilterContext* ctx = UnwrapNativeObject<FilterContext>(env, value, "FilterContext");
  if (ctx) {
    inout->filter_ctx = ctx->Get();
  }
}

Napi::Value FilterInOut::GetPadIdx(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterInOut* inout = inout_;
  if (!inout) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, inout->pad_idx);
}

void FilterInOut::SetPadIdx(const Napi::CallbackInfo& info, const Napi::Value& value) {
  AVFilterInOut* inout = inout_;
  if (inout && value.IsNumber()) {
    inout->pad_idx = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value FilterInOut::GetNext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFilterInOut* inout = inout_;
  if (!inout || !inout->next) {
    return env.Null();
  }
  
  // Wrap the next FilterInOut
  Napi::Object nextObj = constructor.New({});
  FilterInOut* wrapper = Napi::ObjectWrap<FilterInOut>::Unwrap(nextObj);
  // The next element is part of our chain, so we don't own it separately
  wrapper->inout_ = inout->next;
  wrapper->is_owned_ = false;  // We don't own this - it's part of the parent's chain

  return nextObj;
}

void FilterInOut::SetNext(const Napi::CallbackInfo& info, const Napi::Value& value) {
  AVFilterInOut* inout = inout_;
  if (!inout) {
    return;
  }
  
  Napi::Env env = info.Env();
  
  if (value.IsNull() || value.IsUndefined()) {
    inout->next = nullptr;
    return;
  }
  
  FilterInOut* next = UnwrapNativeObject<FilterInOut>(env, value, "FilterInOut");
  if (next) {
    inout->next = next->Get();
    // Mark the next element as not owned - it's now part of our chain
    // and will be freed when we free the head
    next->is_owned_ = false;
  }
}

// === Utility ===

Napi::Value FilterInOut::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}

} // namespace ffmpeg