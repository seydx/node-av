#ifndef FFMPEG_FILTER_INOUT_H
#define FFMPEG_FILTER_INOUT_H

#include <napi.h>
#include "common.h"

extern "C" {
#include <libavfilter/avfilter.h>
}

namespace ffmpeg {

// Forward declaration
class FilterContext;

class FilterInOut : public Napi::ObjectWrap<FilterInOut> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  FilterInOut(const Napi::CallbackInfo& info);
  ~FilterInOut();

  AVFilterInOut* Get() { return inout_; }
  void SetOwned(AVFilterInOut* inout) {
    // Free old inout if exists and we own it
    if (is_owned_) {
      avfilter_inout_free(&inout_);
    }
    inout_ = inout;
    is_owned_ = true;  // SetOwned means we take ownership
  }

  void SetUnowned(AVFilterInOut* inout) {
    // Free old inout if exists and we own it
    if (is_owned_) {
      avfilter_inout_free(&inout_);
    }
    inout_ = inout;
    is_owned_ = false;  // SetUnowned means we don't own it
  }

  // Mark as consumed by FFmpeg (e.g., by avfilter_graph_parse)
  void MarkAsConsumed() {
    is_owned_ = false;
    inout_ = nullptr;
  }

private:
  friend class FilterGraph;

  static thread_local Napi::FunctionReference constructor;

  AVFilterInOut* inout_ = nullptr;
  bool is_owned_ = true;

  Napi::Value Alloc(const Napi::CallbackInfo& info);
  Napi::Value Free(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);

  Napi::Value GetName(const Napi::CallbackInfo& info);
  void SetName(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetFilterCtx(const Napi::CallbackInfo& info);
  void SetFilterCtx(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetPadIdx(const Napi::CallbackInfo& info);
  void SetPadIdx(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetNext(const Napi::CallbackInfo& info);
  void SetNext(const Napi::CallbackInfo& info, const Napi::Value& value);
};

} // namespace ffmpeg

#endif // FFMPEG_FILTER_INOUT_H