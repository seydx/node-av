#include "filter_graph.h"
#include "promise_worker.h"
#include <napi.h>

extern "C" {
#include <libavfilter/avfilter.h>
}

namespace ffmpeg {

Napi::Value FilterGraph::ConfigAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!graph_) {
    Napi::TypeError::New(env, "FilterGraph is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }

  AVFilterGraph* graph = graph_;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [graph]() {
    return avfilter_graph_config(graph, nullptr);
  });
}

Napi::Value FilterGraph::RequestOldestAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!graph_) {
    Napi::TypeError::New(env, "FilterGraph is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }

  AVFilterGraph* graph = graph_;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [graph]() {
    return avfilter_graph_request_oldest(graph);
  });
}

} // namespace ffmpeg
