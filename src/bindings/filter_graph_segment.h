#ifndef FFMPEG_FILTER_GRAPH_SEGMENT_H
#define FFMPEG_FILTER_GRAPH_SEGMENT_H

#include <napi.h>
#include "common.h"

extern "C" {
#include <libavfilter/avfilter.h>
}

namespace ffmpeg {

// Forward declarations
class FilterGraph;

class FilterGraphSegment : public Napi::ObjectWrap<FilterGraphSegment> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  FilterGraphSegment(const Napi::CallbackInfo& info);
  ~FilterGraphSegment();

  AVFilterGraphSegment* Get() { return segment_; }

  void SetSegment(AVFilterGraphSegment* segment) {
    avfilter_graph_segment_free(&segment_);
    segment_ = segment;
  }

private:
  friend class FilterGraph;

  static thread_local Napi::FunctionReference constructor;

  AVFilterGraphSegment* segment_ = nullptr;

  Napi::Value Free(const Napi::CallbackInfo& info);
  Napi::Value CreateFilters(const Napi::CallbackInfo& info);
  Napi::Value ApplyOpts(const Napi::CallbackInfo& info);
  Napi::Value Apply(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_FILTER_GRAPH_SEGMENT_H
