#include "output_format.h"

namespace ffmpeg {

thread_local Napi::FunctionReference OutputFormat::constructor;

Napi::Object OutputFormat::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "OutputFormat", {
    StaticMethod<&OutputFormat::GuessFormat>("guessFormat"),

    InstanceAccessor<&OutputFormat::GetName>("name"),
    InstanceAccessor<&OutputFormat::GetLongName>("longName"),
    InstanceAccessor<&OutputFormat::GetExtensions>("extensions"),
    InstanceAccessor<&OutputFormat::GetMimeType>("mimeType"),
    InstanceAccessor<&OutputFormat::GetAudioCodec>("audioCodec"),
    InstanceAccessor<&OutputFormat::GetVideoCodec>("videoCodec"),
    InstanceAccessor<&OutputFormat::GetSubtitleCodec>("subtitleCodec"),
    InstanceAccessor<&OutputFormat::GetFlags>("flags"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("OutputFormat", func);
  return exports;
}

OutputFormat::OutputFormat(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<OutputFormat>(info), format_(nullptr) {
  // Constructor does nothing - format is set via static factory methods
}

Napi::Value OutputFormat::GuessFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "shortName, filename, and mimeType required (use null for unused)").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  const char* shortName = nullptr;
  const char* filename = nullptr;
  const char* mimeType = nullptr;
  
  std::string shortNameStr;
  std::string filenameStr;
  std::string mimeTypeStr;
  
  if (!info[0].IsNull() && info[0].IsString()) {
    shortNameStr = info[0].As<Napi::String>().Utf8Value();
    shortName = shortNameStr.c_str();
  }
  
  if (!info[1].IsNull() && info[1].IsString()) {
    filenameStr = info[1].As<Napi::String>().Utf8Value();
    filename = filenameStr.c_str();
  }
  
  if (!info[2].IsNull() && info[2].IsString()) {
    mimeTypeStr = info[2].As<Napi::String>().Utf8Value();
    mimeType = mimeTypeStr.c_str();
  }
  
  const AVOutputFormat* fmt = av_guess_format(shortName, filename, mimeType);
  
  if (!fmt) {
    return env.Null();
  }
  
  // Create new OutputFormat object
  Napi::Object formatObj = constructor.New({});
  OutputFormat* wrapper = Napi::ObjectWrap<OutputFormat>::Unwrap(formatObj);
  wrapper->Set(fmt);
  
  return formatObj;
}

Napi::Value OutputFormat::GetName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_ || !format_->name) {
    return env.Null();
  }
  return Napi::String::New(env, format_->name);
}

Napi::Value OutputFormat::GetLongName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_ || !format_->long_name) {
    return env.Null();
  }
  return Napi::String::New(env, format_->long_name);
}

Napi::Value OutputFormat::GetExtensions(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_ || !format_->extensions) {
    return env.Null();
  }
  return Napi::String::New(env, format_->extensions);
}

Napi::Value OutputFormat::GetMimeType(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_ || !format_->mime_type) {
    return env.Null();
  }
  return Napi::String::New(env, format_->mime_type);
}

Napi::Value OutputFormat::GetAudioCodec(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_) {
    return Napi::Number::New(env, AV_CODEC_ID_NONE);
  }
  return Napi::Number::New(env, format_->audio_codec);
}

Napi::Value OutputFormat::GetVideoCodec(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_) {
    return Napi::Number::New(env, AV_CODEC_ID_NONE);
  }
  return Napi::Number::New(env, format_->video_codec);
}

Napi::Value OutputFormat::GetSubtitleCodec(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_) {
    return Napi::Number::New(env, AV_CODEC_ID_NONE);
  }
  return Napi::Number::New(env, format_->subtitle_codec);
}

Napi::Value OutputFormat::GetFlags(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!format_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, format_->flags);
}

} // namespace ffmpeg