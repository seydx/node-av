#ifndef FFMPEG_CODEC_PARAMETERS_H
#define FFMPEG_CODEC_PARAMETERS_H

#include <napi.h>
#include "common.h"

extern "C" {
#include <libavcodec/avcodec.h>
}

namespace ffmpeg {

class CodecParameters : public Napi::ObjectWrap<CodecParameters> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  CodecParameters(const Napi::CallbackInfo& info);
  ~CodecParameters();

  AVCodecParameters* Get() { return params_; }
  const AVCodecParameters* Get() const { return params_; }
  
  void SetParameters(AVCodecParameters* params, bool owned) {
    // Free old parameters if we owned them
    if (is_owned_) {
      avcodec_parameters_free(&params_);
    }
    params_ = params;
    is_owned_ = owned;
  }
  

private:
  friend class Stream;
  friend class BitStreamFilterContext;

  static thread_local Napi::FunctionReference constructor;

  AVCodecParameters* params_ = nullptr;
  bool is_owned_ = true;

  Napi::Value Alloc(const Napi::CallbackInfo& info);
  Napi::Value Free(const Napi::CallbackInfo& info);
  Napi::Value Copy(const Napi::CallbackInfo& info);
  Napi::Value FromContext(const Napi::CallbackInfo& info);
  Napi::Value ToContext(const Napi::CallbackInfo& info);
  Napi::Value ParseExtradata(const Napi::CallbackInfo& info);
  Napi::Value GetCodecString(const Napi::CallbackInfo& info);
  Napi::Value GetDecoderConfigurationRecord(const Napi::CallbackInfo& info);
  Napi::Value ToJSON(const Napi::CallbackInfo& info);
  Napi::Value GetCodedSideData(const Napi::CallbackInfo& info);
  Napi::Value AddCodedSideData(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);

  Napi::Value GetCodecType(const Napi::CallbackInfo& info);
  void SetCodecType(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetCodecId(const Napi::CallbackInfo& info);
  void SetCodecId(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetCodecTag(const Napi::CallbackInfo& info);
  void SetCodecTag(const Napi::CallbackInfo& info, const Napi::Value& value);
  Napi::Value GetCodecTagString(const Napi::CallbackInfo& info);

  Napi::Value GetExtradata(const Napi::CallbackInfo& info);
  void SetExtradata(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetExtradataSize(const Napi::CallbackInfo& info);
  
  Napi::Value GetFormat(const Napi::CallbackInfo& info);
  void SetFormat(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetBitRate(const Napi::CallbackInfo& info);
  void SetBitRate(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetBitsPerCodedSample(const Napi::CallbackInfo& info);
  void SetBitsPerCodedSample(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetBitsPerRawSample(const Napi::CallbackInfo& info);
  void SetBitsPerRawSample(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetProfile(const Napi::CallbackInfo& info);
  void SetProfile(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetLevel(const Napi::CallbackInfo& info);
  void SetLevel(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetWidth(const Napi::CallbackInfo& info);
  void SetWidth(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetHeight(const Napi::CallbackInfo& info);
  void SetHeight(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetSampleAspectRatio(const Napi::CallbackInfo& info);
  void SetSampleAspectRatio(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetFrameRate(const Napi::CallbackInfo& info);
  void SetFrameRate(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetColorRange(const Napi::CallbackInfo& info);
  void SetColorRange(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetColorPrimaries(const Napi::CallbackInfo& info);
  void SetColorPrimaries(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetColorTrc(const Napi::CallbackInfo& info);
  void SetColorTrc(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetColorSpace(const Napi::CallbackInfo& info);
  void SetColorSpace(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetChromaLocation(const Napi::CallbackInfo& info);
  void SetChromaLocation(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetChannelLayout(const Napi::CallbackInfo& info);
  void SetChannelLayout(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetChannels(const Napi::CallbackInfo& info);
  void SetChannels(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetSampleRate(const Napi::CallbackInfo& info);
  void SetSampleRate(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetFrameSize(const Napi::CallbackInfo& info);
  void SetFrameSize(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetInitialPadding(const Napi::CallbackInfo& info);
  void SetInitialPadding(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetVideoDelay(const Napi::CallbackInfo& info);
  void SetVideoDelay(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetNbCodedSideData(const Napi::CallbackInfo& info);
  Napi::Value GetAllCodedSideData(const Napi::CallbackInfo& info);

  Napi::Value GetCodecProperties(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_CODEC_PARAMETERS_H