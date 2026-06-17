#include "error.h"
#include <errno.h>

namespace ffmpeg {

thread_local Napi::FunctionReference FFmpegError::constructor;

Napi::Object FFmpegError::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "FFmpegError", {
    StaticMethod<&FFmpegError::Strerror>("strerror"),
    StaticMethod<&FFmpegError::GetAverror>("getAverror"),

    InstanceAccessor<&FFmpegError::GetErrorCode>("code"),
    InstanceAccessor<&FFmpegError::GetMessage>("message"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("FFmpegError", func);
  
  return exports;
}

FFmpegError::FFmpegError(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<FFmpegError>(info) {
  if (info.Length() > 0 && info[0].IsNumber()) {
    code_ = info[0].As<Napi::Number>().Int32Value();
  }
}

Napi::Value FFmpegError::Strerror(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Error code (number) required").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int errnum = info[0].As<Napi::Number>().Int32Value();
  
  char errbuf[AV_ERROR_MAX_STRING_SIZE];
  av_strerror(errnum, errbuf, AV_ERROR_MAX_STRING_SIZE);
  
  return Napi::String::New(env, errbuf);
}

Napi::Value FFmpegError::GetAverror(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Error name (string) required").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string errorName = info[0].As<Napi::String>().Utf8Value();
  
  // Handle POSIX error codes
  if (errorName == "EAGAIN") return Napi::Number::New(env, AVERROR(EAGAIN));
  if (errorName == "ENOMEM") return Napi::Number::New(env, AVERROR(ENOMEM));
  if (errorName == "EINVAL") return Napi::Number::New(env, AVERROR(EINVAL));
  if (errorName == "EIO") return Napi::Number::New(env, AVERROR(EIO));
  if (errorName == "EPIPE") return Napi::Number::New(env, AVERROR(EPIPE));
  if (errorName == "ENOSPC") return Napi::Number::New(env, AVERROR(ENOSPC));
  if (errorName == "ENOENT") return Napi::Number::New(env, AVERROR(ENOENT));
  if (errorName == "EACCES") return Napi::Number::New(env, AVERROR(EACCES));
  if (errorName == "EPERM") return Napi::Number::New(env, AVERROR(EPERM));
  if (errorName == "EEXIST") return Napi::Number::New(env, AVERROR(EEXIST));
  if (errorName == "ENODEV") return Napi::Number::New(env, AVERROR(ENODEV));
  if (errorName == "ENOTDIR") return Napi::Number::New(env, AVERROR(ENOTDIR));
  if (errorName == "EISDIR") return Napi::Number::New(env, AVERROR(EISDIR));
  if (errorName == "EBUSY") return Napi::Number::New(env, AVERROR(EBUSY));
  if (errorName == "EMFILE") return Napi::Number::New(env, AVERROR(EMFILE));
  if (errorName == "ERANGE") return Napi::Number::New(env, AVERROR(ERANGE));
  
  // We don't handle FFmpeg-specific error codes here
  // They are already available as constants
  
  // Unknown error name
  Napi::TypeError::New(env, "Unknown error name: " + errorName).ThrowAsJavaScriptException();
  return env.Null();
}

Napi::Value FFmpegError::GetErrorCode(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, code_);
}

Napi::Value FFmpegError::GetMessage(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  char errbuf[AV_ERROR_MAX_STRING_SIZE];
  av_strerror(code_, errbuf, AV_ERROR_MAX_STRING_SIZE);
  
  return Napi::String::New(env, errbuf);
}

} // namespace ffmpeg