#include "input_format.h"
#include <cstring>

namespace ffmpeg {

thread_local Napi::FunctionReference InputFormat::constructor;

Napi::Object InputFormat::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "InputFormat", {
    StaticMethod<&InputFormat::FindInputFormat>("findInputFormat"),
    StaticMethod<&InputFormat::Probe>("probe"),
    StaticMethod<&InputFormat::ProbeBufferAsync>("probeBuffer"),
    StaticMethod<&InputFormat::ProbeBufferSync>("probeBufferSync"),

    InstanceAccessor<&InputFormat::GetName>("name"),
    InstanceAccessor<&InputFormat::GetLongName>("longName"),
    InstanceAccessor<&InputFormat::GetExtensions>("extensions"),
    InstanceAccessor<&InputFormat::GetMimeType>("mimeType"),
    InstanceAccessor<&InputFormat::GetFlags>("flags"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("InputFormat", func);
  return exports;
}

InputFormat::InputFormat(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<InputFormat>(info), format_(nullptr) {
  // Constructor does nothing - format is set via static factory methods
}

Napi::Value InputFormat::FindInputFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Format short name (string) required").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string shortName = info[0].As<Napi::String>().Utf8Value();
  const AVInputFormat* fmt = av_find_input_format(shortName.c_str());
  
  if (!fmt) {
    return env.Null();
  }
  
  // Create new InputFormat object
  Napi::Object formatObj = constructor.New({});
  InputFormat* wrapper = Napi::ObjectWrap<InputFormat>::Unwrap(formatObj);
  wrapper->Set(fmt);
  
  return formatObj;
}

Napi::Value InputFormat::Probe(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Buffer required").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
  std::string filename;
  
  // Optional filename parameter
  if (info.Length() >= 2 && info[1].IsString()) {
    filename = info[1].As<Napi::String>().Utf8Value();
  }
  
  // Create AVProbeData structure
  AVProbeData pd;
  memset(&pd, 0, sizeof(pd));
  pd.buf = buffer.Data();
  pd.buf_size = static_cast<int>(buffer.Length());
  if (!filename.empty()) {
    pd.filename = filename.c_str();
  }
  
  // Probe the format with confidence score
  int score = 0;
  const AVInputFormat* fmt = av_probe_input_format3(&pd, 1, &score);
  
  if (!fmt) {
    return env.Null();
  }
  
  // Create new InputFormat object
  Napi::Object formatObj = constructor.New({});
  InputFormat* wrapper = Napi::ObjectWrap<InputFormat>::Unwrap(formatObj);
  wrapper->Set(fmt);
  
  return formatObj;
}

Napi::Value InputFormat::GetName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_ || !format_->name) {
    return env.Null();
  }
  return Napi::String::New(env, format_->name);
}

Napi::Value InputFormat::GetLongName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_ || !format_->long_name) {
    return env.Null();
  }
  return Napi::String::New(env, format_->long_name);
}

Napi::Value InputFormat::GetExtensions(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_ || !format_->extensions) {
    return env.Null();
  }
  return Napi::String::New(env, format_->extensions);
}

Napi::Value InputFormat::GetMimeType(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_ || !format_->mime_type) {
    return env.Null();
  }
  return Napi::String::New(env, format_->mime_type);
}

Napi::Value InputFormat::GetFlags(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, format_->flags);
}

} // namespace ffmpeg