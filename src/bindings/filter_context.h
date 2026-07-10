#ifndef FFMPEG_FILTER_CONTEXT_H
#define FFMPEG_FILTER_CONTEXT_H

#include <napi.h>
#include "common.h"
#include "promise_worker.h"

extern "C" {
#include <libavfilter/avfilter.h>
}

namespace ffmpeg {

// Forward declarations
class Filter;
class FilterGraph;

class FilterContext : public Napi::ObjectWrap<FilterContext> {
public:
  static thread_local Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  FilterContext(const Napi::CallbackInfo& info);
  ~FilterContext();

  AVFilterContext* Get() {
    return ctx_ ? ctx_ : unowned_ctx_;
  }
  void SetOwned(AVFilterContext* ctx) {
    if (ctx_) {
      avfilter_free(ctx_);
    }
    ctx_ = ctx;
    unowned_ctx_ = nullptr;
  }
  void SetUnowned(AVFilterContext* ctx) {
    if (ctx_) {
      avfilter_free(ctx_);
    }
    ctx_ = nullptr;
    unowned_ctx_ = ctx;
  }

private:
  friend class Filter;
  friend class FilterGraph;
  friend class FilterInOut;
  friend class FCBuffersrcAddFrameWorker;
  friend class FCBuffersinkGetFrameWorker;
  friend class AVOptionWrapper;


  AVFilterContext* ctx_ = nullptr;
  AVFilterContext* unowned_ctx_ = nullptr;

  // In-flight threadpool operations (buffersrc/buffersink); free() waits on
  // this so it cannot free ctx_ under a worker.
  AsyncOpCounter async_ops_;

  Napi::Value Init(const Napi::CallbackInfo& info);
  Napi::Value InitStr(const Napi::CallbackInfo& info);
  Napi::Value Link(const Napi::CallbackInfo& info);
  Napi::Value Unlink(const Napi::CallbackInfo& info);
  Napi::Value Free(const Napi::CallbackInfo& info);
  Napi::Value BuffersrcAddFrameAsync(const Napi::CallbackInfo& info);
  Napi::Value BuffersrcAddFrameSync(const Napi::CallbackInfo& info);
  Napi::Value BuffersrcParametersSet(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetFrameAsync(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetFrameSync(const Napi::CallbackInfo& info);
  // Napi::Value BuffersinkSetFrameSize(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetTimeBase(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetFormat(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetWidth(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetHeight(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetSampleAspectRatio(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetFrameRate(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetSampleRate(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetChannelLayout(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetColorspace(const Napi::CallbackInfo& info);
  Napi::Value BuffersinkGetColorRange(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);

  Napi::Value GetName(const Napi::CallbackInfo& info);
  void SetName(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetExtraHWFrames(const Napi::CallbackInfo& info);
  void SetExtraHWFrames(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetFilter(const Napi::CallbackInfo& info);

  Napi::Value GetGraph(const Napi::CallbackInfo& info);

  Napi::Value GetNbInputs(const Napi::CallbackInfo& info);

  Napi::Value GetNbOutputs(const Napi::CallbackInfo& info);

  Napi::Value GetHwDeviceCtx(const Napi::CallbackInfo& info);
  void SetHwDeviceCtx(const Napi::CallbackInfo& info, const Napi::Value& value);
};

} // namespace ffmpeg

#endif // FFMPEG_FILTER_CONTEXT_H