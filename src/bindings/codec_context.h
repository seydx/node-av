#ifndef FFMPEG_CODEC_CONTEXT_H
#define FFMPEG_CODEC_CONTEXT_H

#include <napi.h>
#include "common.h"
#include <memory>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavutil/pixfmt.h>
}

namespace ffmpeg {

class CodecContext : public Napi::ObjectWrap<CodecContext> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  CodecContext(const Napi::CallbackInfo& info);
  ~CodecContext();

  AVCodecContext* Get() { return context_; }

private:
  friend class AVOptionWrapper;
  friend class CCOpen2Worker;
  friend class CCSendPacketWorker;
  friend class CCReceiveFrameWorker;
  friend class CCSendFrameWorker;
  friend class CCReceivePacketWorker;

  static Napi::FunctionReference constructor;

  AVCodecContext* context_ = nullptr;
  bool is_open_ = false;

  enum AVPixelFormat hw_pix_fmt_ = AV_PIX_FMT_NONE;
  enum AVPixelFormat sw_pix_fmt_ = AV_PIX_FMT_NONE;

  Napi::Value AllocContext3(const Napi::CallbackInfo& info);
  Napi::Value FreeContext(const Napi::CallbackInfo& info);
  Napi::Value Open2Async(const Napi::CallbackInfo& info);
  Napi::Value Open2Sync(const Napi::CallbackInfo& info);
  Napi::Value ParametersToContext(const Napi::CallbackInfo& info);
  Napi::Value ParametersFromContext(const Napi::CallbackInfo& info);
  Napi::Value FlushBuffers(const Napi::CallbackInfo& info);
  Napi::Value SendPacketAsync(const Napi::CallbackInfo& info);
  Napi::Value SendPacketSync(const Napi::CallbackInfo& info);
  Napi::Value ReceiveFrameAsync(const Napi::CallbackInfo& info);
  Napi::Value ReceiveFrameSync(const Napi::CallbackInfo& info);
  Napi::Value SendFrameAsync(const Napi::CallbackInfo& info);
  Napi::Value SendFrameSync(const Napi::CallbackInfo& info);
  Napi::Value ReceivePacketAsync(const Napi::CallbackInfo& info);
  Napi::Value ReceivePacketSync(const Napi::CallbackInfo& info);
  Napi::Value IsOpen(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);

  Napi::Value GetCodecType(const Napi::CallbackInfo& info);
  void SetCodecType(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetCodecId(const Napi::CallbackInfo& info);
  void SetCodecId(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetCodecTag(const Napi::CallbackInfo& info);
  void SetCodecTag(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetCodecTagString(const Napi::CallbackInfo& info);

  Napi::Value GetBitRate(const Napi::CallbackInfo& info);
  void SetBitRate(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetTimeBase(const Napi::CallbackInfo& info);
  void SetTimeBase(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetPktTimebase(const Napi::CallbackInfo& info);
  void SetPktTimebase(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetDelay(const Napi::CallbackInfo& info);

  Napi::Value GetFlags(const Napi::CallbackInfo& info);
  void SetFlagsAccessor(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetFlags2(const Napi::CallbackInfo& info);
  void SetFlags2Accessor(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetExtraData(const Napi::CallbackInfo& info);
  void SetExtraData(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetProfile(const Napi::CallbackInfo& info);
  void SetProfile(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetLevel(const Napi::CallbackInfo& info);
  void SetLevel(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetThreadCount(const Napi::CallbackInfo& info);
  void SetThreadCount(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetThreadType(const Napi::CallbackInfo& info);
  void SetThreadType(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetWidth(const Napi::CallbackInfo& info);
  void SetWidth(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetHeight(const Napi::CallbackInfo& info);
  void SetHeight(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetGopSize(const Napi::CallbackInfo& info);
  void SetGopSize(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetPixelFormat(const Napi::CallbackInfo& info);
  void SetPixelFormat(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetMaxBFrames(const Napi::CallbackInfo& info);
  void SetMaxBFrames(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetMbDecision(const Napi::CallbackInfo& info);
  void SetMbDecision(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetHasBFrames(const Napi::CallbackInfo& info);

  Napi::Value GetSampleAspectRatio(const Napi::CallbackInfo& info);
  void SetSampleAspectRatio(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetFramerate(const Napi::CallbackInfo& info);
  void SetFramerate(const Napi::CallbackInfo& info, const Napi::Value& value);

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

  Napi::Value GetSampleRate(const Napi::CallbackInfo& info);
  void SetSampleRate(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetChannels(const Napi::CallbackInfo& info);
  void SetChannels(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetSampleFormat(const Napi::CallbackInfo& info);
  void SetSampleFormat(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetFrameSize(const Napi::CallbackInfo& info);
  void SetFrameSize(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetBitsPerCodedSample(const Napi::CallbackInfo& info);
  void SetBitsPerCodedSample(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetBitsPerRawSample(const Napi::CallbackInfo& info);
  void SetBitsPerRawSample(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetFrameNumber(const Napi::CallbackInfo& info);

  Napi::Value GetChannelLayout(const Napi::CallbackInfo& info);
  void SetChannelLayout(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetQMin(const Napi::CallbackInfo& info);
  void SetQMin(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetQMax(const Napi::CallbackInfo& info);
  void SetQMax(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetGlobalQuality(const Napi::CallbackInfo& info);
  void SetGlobalQuality(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetRcBufferSize(const Napi::CallbackInfo& info);
  void SetRcBufferSize(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetRcMaxRate(const Napi::CallbackInfo& info);
  void SetRcMaxRate(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetRcMinRate(const Napi::CallbackInfo& info);
  void SetRcMinRate(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetHwDeviceCtx(const Napi::CallbackInfo& info);
  void SetHwDeviceCtx(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetHwFramesCtx(const Napi::CallbackInfo& info);
  void SetHwFramesCtx(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetExtraHWFrames(const Napi::CallbackInfo& info);
  void SetExtraHWFrames(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value SetHardwarePixelFormat(const Napi::CallbackInfo& info);
  
  // Static callback for FFmpeg
  static enum AVPixelFormat GetFormatCallback(AVCodecContext* ctx, const enum AVPixelFormat* pix_fmts);
};

} // namespace ffmpeg

#endif // FFMPEG_CODEC_CONTEXT_H