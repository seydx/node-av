#ifndef FFMPEG_BITSTREAM_FILTER_H
#define FFMPEG_BITSTREAM_FILTER_H

#include <napi.h>
#include "common.h"

extern "C" {
#include <libavcodec/bsf.h>
}

namespace ffmpeg {

class BitStreamFilter : public Napi::ObjectWrap<BitStreamFilter> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  BitStreamFilter(const Napi::CallbackInfo& info);
  ~BitStreamFilter();

  const AVBitStreamFilter* Get() const { return bsf_; }
  void Set(const AVBitStreamFilter* bsf) { bsf_ = bsf; }
  
  // Create instance from native filter
  static Napi::Object NewInstance(Napi::Env env, const AVBitStreamFilter* bsf);

private:
  static thread_local Napi::FunctionReference constructor;

  const AVBitStreamFilter* bsf_; // AVBitStreamFilter is const, we don't own it

  static Napi::Value GetByName(const Napi::CallbackInfo& info);
  static Napi::Value Iterate(const Napi::CallbackInfo& info);

  Napi::Value GetName(const Napi::CallbackInfo& info);

  Napi::Value GetCodecIds(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_BITSTREAM_FILTER_H