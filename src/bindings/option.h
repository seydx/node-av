#pragma once

#include <napi.h>

extern "C" {
#include <libavutil/opt.h>
}

namespace ffmpeg {

class AVOptionWrapper : public Napi::ObjectWrap<AVOptionWrapper> {
public:
  static thread_local Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  AVOptionWrapper(const Napi::CallbackInfo& info);
  ~AVOptionWrapper();

  void SetOption(const ::AVOption* opt);

  Napi::Value GetName(const Napi::CallbackInfo& info);
  Napi::Value GetHelp(const Napi::CallbackInfo& info);
  Napi::Value GetType(const Napi::CallbackInfo& info);
  Napi::Value GetDefaultValue(const Napi::CallbackInfo& info);
  Napi::Value GetMin(const Napi::CallbackInfo& info);
  Napi::Value GetMax(const Napi::CallbackInfo& info);
  Napi::Value GetFlags(const Napi::CallbackInfo& info);
  Napi::Value GetUnit(const Napi::CallbackInfo& info);

  static Napi::Value Next(const Napi::CallbackInfo& info);
  static Napi::Value Find(const Napi::CallbackInfo& info);
  static Napi::Value Find2(const Napi::CallbackInfo& info);
  static Napi::Value Get(const Napi::CallbackInfo& info);
  static Napi::Value GetInt(const Napi::CallbackInfo& info);
  static Napi::Value GetInt64(const Napi::CallbackInfo& info);
  static Napi::Value GetDouble(const Napi::CallbackInfo& info);
  static Napi::Value GetRational(const Napi::CallbackInfo& info);
  static Napi::Value GetPixelFormat(const Napi::CallbackInfo& info);
  static Napi::Value GetSampleFormat(const Napi::CallbackInfo& info);
  static Napi::Value GetImageSize(const Napi::CallbackInfo& info);
  static Napi::Value GetChannelLayout(const Napi::CallbackInfo& info);
  static Napi::Value GetDict(const Napi::CallbackInfo& info);
  static Napi::Value Set(const Napi::CallbackInfo& info);
  static Napi::Value SetInt(const Napi::CallbackInfo& info);
  static Napi::Value SetDouble(const Napi::CallbackInfo& info);
  static Napi::Value SetRational(const Napi::CallbackInfo& info);
  static Napi::Value SetPixelFormat(const Napi::CallbackInfo& info);
  static Napi::Value SetSampleFormat(const Napi::CallbackInfo& info);
  static Napi::Value SetImageSize(const Napi::CallbackInfo& info);
  static Napi::Value SetChannelLayout(const Napi::CallbackInfo& info);
  static Napi::Value SetDict(const Napi::CallbackInfo& info);
  static Napi::Value SetBin(const Napi::CallbackInfo& info);
  static Napi::Value SetDefaults(const Napi::CallbackInfo& info);
  static Napi::Value Copy(const Napi::CallbackInfo& info);
  static Napi::Value IsSetToDefault(const Napi::CallbackInfo& info);
  static Napi::Value Serialize(const Napi::CallbackInfo& info);
  static Napi::Value Free(const Napi::CallbackInfo& info);
  static Napi::Value Show(const Napi::CallbackInfo& info);

private:
  const ::AVOption* option_;
  
  // Helper to extract void* from Native objects
  static void* GetNativePointer(const Napi::Value& obj);
};

} // namespace ffmpeg