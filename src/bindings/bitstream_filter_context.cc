#include "bitstream_filter_context.h"
#include "bitstream_filter.h"
#include "codec_parameters.h"
#include "packet.h"
#include "error.h"

namespace ffmpeg {

thread_local Napi::FunctionReference BitStreamFilterContext::constructor;

Napi::Object BitStreamFilterContext::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "BitStreamFilterContext", {
    InstanceMethod<&BitStreamFilterContext::Alloc>("alloc"),
    InstanceMethod<&BitStreamFilterContext::Init>("init"),
    InstanceMethod<&BitStreamFilterContext::Free>("free"),
    InstanceMethod<&BitStreamFilterContext::Flush>("flush"),
    InstanceMethod<&BitStreamFilterContext::SendPacketAsync>("sendPacket"),
    InstanceMethod<&BitStreamFilterContext::SendPacketSync>("sendPacketSync"),
    InstanceMethod<&BitStreamFilterContext::ReceivePacketAsync>("receivePacket"),
    InstanceMethod<&BitStreamFilterContext::ReceivePacketSync>("receivePacketSync"),
    InstanceMethod<&BitStreamFilterContext::IsInitialized>("isInitialized"),
    InstanceMethod<&BitStreamFilterContext::Dispose>(Napi::Symbol::WellKnown(env, "dispose")),

    InstanceAccessor<&BitStreamFilterContext::GetInputCodecParameters>("inputCodecParameters"),
    InstanceAccessor<&BitStreamFilterContext::GetOutputCodecParameters>("outputCodecParameters"),
    InstanceAccessor("inputTimeBase", &BitStreamFilterContext::GetInputTimeBase, &BitStreamFilterContext::SetInputTimeBase, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&BitStreamFilterContext::GetOutputTimeBase>("outputTimeBase"),
    InstanceAccessor<&BitStreamFilterContext::GetFilter>("filter"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("BitStreamFilterContext", func);
  return exports;
}

BitStreamFilterContext::BitStreamFilterContext(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<BitStreamFilterContext>(info) {
  // Constructor does nothing - context is allocated via alloc()
}

BitStreamFilterContext::~BitStreamFilterContext() {
  av_bsf_free(&context_);
}

Napi::Value BitStreamFilterContext::Alloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (context_) {
    Napi::Error::New(env, "BitStreamFilterContext already allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "BitStreamFilter required").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  BitStreamFilter* filter = UnwrapNativeObject<BitStreamFilter>(env, info[0].As<Napi::Object>(), "BitStreamFilter");
  if (!filter || !filter->Get()) {
    Napi::Error::New(env, "Invalid BitStreamFilter").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int ret = av_bsf_alloc(filter->Get(), &context_);
  if (ret < 0) {
    return Napi::Number::New(env, ret);
  }

  return Napi::Number::New(env, 0);
}

Napi::Value BitStreamFilterContext::Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!context_) {
    Napi::Error::New(env, "BitStreamFilterContext not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (is_initialized_) {
    Napi::Error::New(env, "BitStreamFilterContext already initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int ret = av_bsf_init(context_);
  if (ret < 0) {
    return Napi::Number::New(env, ret);
  }
  
  is_initialized_ = true;
  return Napi::Number::New(env, 0);
}

Napi::Value BitStreamFilterContext::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (context_) {
    // Freeing while a worker still uses the context on the threadpool would be
    // a use-after-free; wait bounded, then error instead of crashing
    if (!GuardAsyncOps(env, async_ops_, "BitStreamFilterContext")) {
      return env.Undefined();
    }
  }

  av_bsf_free(&context_);
  is_initialized_ = false;
  return env.Undefined();
}

Napi::Value BitStreamFilterContext::Flush(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!context_) {
    Napi::Error::New(env, "BitStreamFilterContext not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  av_bsf_flush(context_);
  return env.Undefined();
}

Napi::Value BitStreamFilterContext::IsInitialized(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), is_initialized_);
}

Napi::Value BitStreamFilterContext::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}

Napi::Value BitStreamFilterContext::GetInputCodecParameters(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!context_ || !context_->par_in) {
    return env.Null();
  }
  
  // Create a CodecParameters wrapper for the AVCodecParameters
  // The AVCodecParameters is owned by AVBSFContext, so we don't transfer ownership
  Napi::Object codecParamsObj = CodecParameters::constructor.New({});
  CodecParameters* codecParams = UnwrapNativeObject<CodecParameters>(env, codecParamsObj, "CodecParameters");
  
  // Set the internal pointer without transferring ownership
  codecParams->SetParameters(context_->par_in, false); // false = not owned
  
  return codecParamsObj;
}

Napi::Value BitStreamFilterContext::GetOutputCodecParameters(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!context_ || !context_->par_out) {
    return env.Null();
  }
  
  // Create a CodecParameters wrapper for the AVCodecParameters
  // The AVCodecParameters is owned by AVBSFContext, so we don't transfer ownership
  Napi::Object codecParamsObj = CodecParameters::constructor.New({});
  CodecParameters* codecParams = UnwrapNativeObject<CodecParameters>(env, codecParamsObj, "CodecParameters");
  
  // Set the internal pointer without transferring ownership
  codecParams->SetParameters(context_->par_out, false); // false = not owned
  
  return codecParamsObj;
}

Napi::Value BitStreamFilterContext::GetInputTimeBase(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!context_) {
    return RationalToJS(env, {0, 1});
  }
  
  return RationalToJS(env, context_->time_base_in);
}

void BitStreamFilterContext::SetInputTimeBase(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_ && value.IsObject()) {
    context_->time_base_in = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value BitStreamFilterContext::GetOutputTimeBase(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!context_) {
    return RationalToJS(env, {0, 1});
  }
  
  return RationalToJS(env, context_->time_base_out);
}

Napi::Value BitStreamFilterContext::GetFilter(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!context_ || !context_->filter) {
    return env.Null();
  }
  
  return BitStreamFilter::NewInstance(env, context_->filter);
}

} // namespace ffmpeg