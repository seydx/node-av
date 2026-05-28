#ifndef FFMPEG_CODEC_H
#define FFMPEG_CODEC_H

#include <napi.h>
#include "common.h"

extern "C" {
#include <libavcodec/avcodec.h>
}

namespace ffmpeg {

class Codec : public Napi::ObjectWrap<Codec> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  Codec(const Napi::CallbackInfo& info);
  ~Codec();

  const AVCodec* Get() const { return codec_; }
  
  // Create instance from native codec
  static Napi::Object NewInstance(Napi::Env env, AVCodec* codec);

private:
  static Napi::FunctionReference constructor;

  const AVCodec* codec_; // AVCodec is const, we don't own it

  static Napi::Value FindDecoder(const Napi::CallbackInfo& info);
  static Napi::Value FindDecoderByName(const Napi::CallbackInfo& info);
  static Napi::Value FindEncoder(const Napi::CallbackInfo& info);
  static Napi::Value FindEncoderByName(const Napi::CallbackInfo& info);
  static Napi::Value GetCodecList(const Napi::CallbackInfo& info);
  static Napi::Value IterateCodecs(const Napi::CallbackInfo& info);

  Napi::Value GetName(const Napi::CallbackInfo& info);
  Napi::Value GetLongName(const Napi::CallbackInfo& info);
  Napi::Value GetType(const Napi::CallbackInfo& info);
  Napi::Value GetId(const Napi::CallbackInfo& info);
  Napi::Value GetCapabilities(const Napi::CallbackInfo& info);
  Napi::Value GetMaxLowres(const Napi::CallbackInfo& info);
  Napi::Value GetProfiles(const Napi::CallbackInfo& info);
  Napi::Value GetWrapper(const Napi::CallbackInfo& info);
  Napi::Value GetSupportedFramerates(const Napi::CallbackInfo& info);
  Napi::Value GetPixelFormats(const Napi::CallbackInfo& info);
  Napi::Value GetSupportedSamplerates(const Napi::CallbackInfo& info);
  Napi::Value GetSampleFormats(const Napi::CallbackInfo& info);
  Napi::Value GetChannelLayouts(const Napi::CallbackInfo& info);
  Napi::Value IsEncoder(const Napi::CallbackInfo& info);
  Napi::Value IsDecoder(const Napi::CallbackInfo& info);
  Napi::Value IsExperimental(const Napi::CallbackInfo& info);
  Napi::Value GetHwConfig(const Napi::CallbackInfo& info);
  Napi::Value GetOptions(const Napi::CallbackInfo& info);

  void Set(const AVCodec* codec) { codec_ = codec; }
};

} // namespace ffmpeg

#endif // FFMPEG_CODEC_H