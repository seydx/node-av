#ifndef FFMPEG_FILTER_GRAPH_H
#define FFMPEG_FILTER_GRAPH_H

#include <napi.h>
#include "common.h"

extern "C" {
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersink.h>
#include <libavfilter/buffersrc.h>
}

namespace ffmpeg {

// Forward declarations
class Filter;
class FilterContext;

class FilterGraph : public Napi::ObjectWrap<FilterGraph> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  FilterGraph(const Napi::CallbackInfo& info);
  ~FilterGraph();

  AVFilterGraph* Get() { 
    return graph_ ? graph_ : unowned_graph_; 
  }
  void SetOwned(AVFilterGraph* graph) {
    avfilter_graph_free(&graph_);
    graph_ = graph;
    unowned_graph_ = nullptr;
  }
  void SetUnowned(AVFilterGraph* graph) {
    avfilter_graph_free(&graph_);
    graph_ = nullptr;
    unowned_graph_ = graph;
  }

private:
  friend class AVOptionWrapper;
  friend class FilterContext;
  friend class FGConfigWorker;
  friend class FGRequestOldestWorker;

  static thread_local Napi::FunctionReference constructor;

  AVFilterGraph* graph_ = nullptr;
  AVFilterGraph* unowned_graph_ = nullptr;

  Napi::Value Alloc(const Napi::CallbackInfo& info);
  Napi::Value Free(const Napi::CallbackInfo& info);
  Napi::Value CreateFilter(const Napi::CallbackInfo& info);
  Napi::Value AllocFilter(const Napi::CallbackInfo& info);
  Napi::Value GetFilter(const Napi::CallbackInfo& info);
  Napi::Value ConfigAsync(const Napi::CallbackInfo& info);
  Napi::Value ConfigSync(const Napi::CallbackInfo& info);
  Napi::Value Parse(const Napi::CallbackInfo& info);
  Napi::Value Parse2(const Napi::CallbackInfo& info);
  Napi::Value ParsePtr(const Napi::CallbackInfo& info);
  Napi::Value SegmentParse(const Napi::CallbackInfo& info);
  Napi::Value Validate(const Napi::CallbackInfo& info);
  Napi::Value RequestOldestAsync(const Napi::CallbackInfo& info);
  Napi::Value RequestOldestSync(const Napi::CallbackInfo& info);
  Napi::Value Dump(const Napi::CallbackInfo& info);
  Napi::Value SendCommand(const Napi::CallbackInfo& info);
  Napi::Value QueueCommand(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);

  Napi::Value GetNbFilters(const Napi::CallbackInfo& info);

  Napi::Value GetFilters(const Napi::CallbackInfo& info);

  Napi::Value GetThreadType(const Napi::CallbackInfo& info);
  void SetThreadType(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetNbThreads(const Napi::CallbackInfo& info);
  void SetNbThreads(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetScaleSwsOpts(const Napi::CallbackInfo& info);
  void SetScaleSwsOpts(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetAresampleSwrOpts(const Napi::CallbackInfo& info);
  void SetAresampleSwrOpts(const Napi::CallbackInfo& info, const Napi::Value& value);
};

} // namespace ffmpeg

#endif // FFMPEG_FILTER_GRAPH_H