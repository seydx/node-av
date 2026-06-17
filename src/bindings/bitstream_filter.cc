#include "bitstream_filter.h"

namespace ffmpeg {

thread_local Napi::FunctionReference BitStreamFilter::constructor;

Napi::Object BitStreamFilter::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "BitStreamFilter", {
    StaticMethod<&BitStreamFilter::GetByName>("getByName"),
    StaticMethod<&BitStreamFilter::Iterate>("iterate"),

    InstanceAccessor<&BitStreamFilter::GetName>("name"),
    InstanceAccessor<&BitStreamFilter::GetCodecIds>("codecIds"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("BitStreamFilter", func);
  return exports;
}

BitStreamFilter::BitStreamFilter(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<BitStreamFilter>(info), bsf_(nullptr) {
  // Constructor does nothing - bsf is set via static factory methods
}

BitStreamFilter::~BitStreamFilter() {
  // We don't own the AVBitStreamFilter, it's a static definition from FFmpeg
}

Napi::Object BitStreamFilter::NewInstance(Napi::Env env, const AVBitStreamFilter* bsf) {
  if (!bsf) {
    return env.Null().ToObject();
  }
  
  Napi::Object bsfObj = constructor.New({});
  BitStreamFilter* wrapper = UnwrapNativeObject<BitStreamFilter>(env, bsfObj, "BitStreamFilter");
  wrapper->Set(bsf);
  
  return bsfObj;
}

Napi::Value BitStreamFilter::GetByName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[0].As<Napi::String>().Utf8Value();
  const AVBitStreamFilter* bsf = av_bsf_get_by_name(name.c_str());
  
  if (!bsf) {
    return env.Null();
  }
  
  return NewInstance(env, bsf);
}

Napi::Value BitStreamFilter::Iterate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array result = Napi::Array::New(env);
  
  void* opaque = nullptr;
  const AVBitStreamFilter* bsf = nullptr;
  uint32_t index = 0;
  
  while ((bsf = av_bsf_iterate(&opaque)) != nullptr) {
    result[index++] = NewInstance(env, bsf);
  }
  
  return result;
}

Napi::Value BitStreamFilter::GetName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!bsf_) {
    return env.Null();
  }
  
  if (!bsf_->name) {
    return env.Null();
  }
  
  return Napi::String::New(env, bsf_->name);
}

Napi::Value BitStreamFilter::GetCodecIds(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!bsf_ || !bsf_->codec_ids) {
    return env.Null();
  }
  
  Napi::Array result = Napi::Array::New(env);
  uint32_t index = 0;
  
  const enum AVCodecID* codec_id = bsf_->codec_ids;
  while (*codec_id != AV_CODEC_ID_NONE) {
    result[index++] = Napi::Number::New(env, *codec_id);
    codec_id++;
  }
  
  return result;
}

} // namespace ffmpeg