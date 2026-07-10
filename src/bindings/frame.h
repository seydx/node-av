#ifndef FFMPEG_FRAME_H
#define FFMPEG_FRAME_H

#include <napi.h>
#include "common.h"
#include "promise_worker.h"

extern "C" {
#include <libavutil/frame.h>
#include <libavutil/pixdesc.h>
#include <libavutil/samplefmt.h>
#include <libavutil/imgutils.h>
}

namespace ffmpeg {

class Frame : public Napi::ObjectWrap<Frame> {
public:
  static thread_local Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  Frame(const Napi::CallbackInfo& info);
  ~Frame();

  AVFrame* Get() { return frame_; }

  void SyncExternalMemory(napi_env env);

private:
  // Async workers (in other translation units) that operate on this frame's
  // AVFrame from the threadpool; they mark the frame busy via async_ops_.
  friend class HwframeTransferDataWorker;
  friend class HWFCTransferDataWorker;
  friend class SwsScaleFrameWorker;
  friend class FCBuffersrcAddFrameWorker;
  friend class FCBuffersinkGetFrameWorker;
  friend class ScalerProcessWorker;


  AVFrame* frame_ = nullptr;

  // In-flight threadpool operations touching frame_ (hwframe transfers,
  // scaling, filter I/O). free()/unref()/alloc() wait on this so they cannot
  // pull the buffers out from under a worker (use-after-free).
  AsyncOpCounter async_ops_;

  // Bytes of native buffer memory currently reported to V8 via
  // napi_adjust_external_memory. Kept in sync by SyncExternalMemory().
  int64_t reported_memory_ = 0;

  // Cached JS plane arrays handed out by the data/extendedData getters. Building
  // them allocates an Array plus a Buffer wrapper per plane on every access, which
  // dominates per-sample/per-pixel loops. The cache is dropped whenever the frame's
  // data pointers may have changed: every SyncExternalMemory() call site (alloc,
  // free, ref, unref, clone, getBuffer, makeWritable, fromBuffer, and all native
  // fill sites) plus applyCropping (shifts data pointers without changing buf[]).
  Napi::Reference<Napi::Array> cached_data_;
  Napi::Reference<Napi::Array> cached_extended_data_;

  void InvalidateDataCache();

  // @internal test hook: exposes reported_memory_ so the accounting can be
  // asserted deterministically (the value is not observable via V8 heap stats).
  Napi::Value GetReportedMemory(const Napi::CallbackInfo& info);

  Napi::Value Alloc(const Napi::CallbackInfo& info);
  Napi::Value Free(const Napi::CallbackInfo& info);
  Napi::Value Ref(const Napi::CallbackInfo& info);
  Napi::Value Unref(const Napi::CallbackInfo& info);
  Napi::Value Clone(const Napi::CallbackInfo& info);
  Napi::Value GetBuffer(const Napi::CallbackInfo& info);
  Napi::Value AllocBuffer(const Napi::CallbackInfo& info);
  Napi::Value MakeWritable(const Napi::CallbackInfo& info);
  Napi::Value CopyProps(const Napi::CallbackInfo& info);
  Napi::Value Copy(const Napi::CallbackInfo& info);
  Napi::Value FromBuffer(const Napi::CallbackInfo& info);
  Napi::Value ToBuffer(const Napi::CallbackInfo& info);
  Napi::Value HwframeTransferDataAsync(const Napi::CallbackInfo& info);
  Napi::Value HwframeTransferDataSync(const Napi::CallbackInfo& info);
  Napi::Value IsHwFrame(const Napi::CallbackInfo& info);
  Napi::Value IsSwFrame(const Napi::CallbackInfo& info);
  Napi::Value GetSideData(const Napi::CallbackInfo& info);
  Napi::Value NewSideData(const Napi::CallbackInfo& info);
  Napi::Value RemoveSideData(const Napi::CallbackInfo& info);
  Napi::Value GetMetadata(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);

  Napi::Value GetFormat(const Napi::CallbackInfo& info);
  void SetFormat(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetWidth(const Napi::CallbackInfo& info);
  void SetWidth(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetHeight(const Napi::CallbackInfo& info);
  void SetHeight(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetNbSamples(const Napi::CallbackInfo& info);
  void SetNbSamples(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetPts(const Napi::CallbackInfo& info);
  void SetPts(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetPktDts(const Napi::CallbackInfo& info);
  void SetPktDts(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetBestEffortTimestamp(const Napi::CallbackInfo& info);
  void SetBestEffortTimestamp(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetTimeBase(const Napi::CallbackInfo& info);
  void SetTimeBase(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetKeyFrame(const Napi::CallbackInfo& info);
  void SetKeyFrame(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetPictType(const Napi::CallbackInfo& info);
  void SetPictType(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetQuality(const Napi::CallbackInfo& info);
  void SetQuality(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetSampleAspectRatio(const Napi::CallbackInfo& info);
  void SetSampleAspectRatio(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetSampleRate(const Napi::CallbackInfo& info);
  void SetSampleRate(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetChannelLayout(const Napi::CallbackInfo& info);
  void SetChannelLayout(const Napi::CallbackInfo& info, const Napi::Value& value);
  
  Napi::Value GetChannels(const Napi::CallbackInfo& info);
  
  Napi::Value GetLinesize(const Napi::CallbackInfo& info);
  
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

  Napi::Value GetAlphaMode(const Napi::CallbackInfo& info);
  void SetAlphaMode(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetData(const Napi::CallbackInfo& info);
  Napi::Value GetExtendedData(const Napi::CallbackInfo& info);

  Napi::Value GetIsWritable(const Napi::CallbackInfo& info);

  Napi::Value GetHwFramesCtx(const Napi::CallbackInfo& info);
  void SetHwFramesCtx(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetFlags(const Napi::CallbackInfo& info);
  void SetFlags(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetDecodeErrorFlags(const Napi::CallbackInfo& info);
  void SetDecodeErrorFlags(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetDuration(const Napi::CallbackInfo& info);
  void SetDuration(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetRepeatPict(const Napi::CallbackInfo& info);
  void SetRepeatPict(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value ApplyCropping(const Napi::CallbackInfo& info);

  Napi::Value ImportIOSurface(const Napi::CallbackInfo& info);
  Napi::Value ExportIOSurface(const Napi::CallbackInfo& info);
  Napi::Value ImportNSImage(const Napi::CallbackInfo& info);
  Napi::Value ImportD3D11Texture(const Napi::CallbackInfo& info);
  Napi::Value ImportDmaBuf(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_FRAME_H