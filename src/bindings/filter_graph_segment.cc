#include "filter_graph_segment.h"
#include "filter_graph.h"
#include "filter_inout.h"

namespace ffmpeg {

thread_local Napi::FunctionReference FilterGraphSegment::constructor;

Napi::Object FilterGraphSegment::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "FilterGraphSegment", {
    InstanceMethod<&FilterGraphSegment::Free>("free"),
    InstanceMethod<&FilterGraphSegment::CreateFilters>("createFilters"),
    InstanceMethod<&FilterGraphSegment::ApplyOpts>("applyOpts"),
    InstanceMethod<&FilterGraphSegment::Apply>("apply"),
    InstanceMethod(Napi::Symbol::WellKnown(env, "dispose"), &FilterGraphSegment::Dispose),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("FilterGraphSegment", func);
  return exports;
}

FilterGraphSegment::FilterGraphSegment(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<FilterGraphSegment>(info) {
}

FilterGraphSegment::~FilterGraphSegment() {
  avfilter_graph_segment_free(&segment_);
}

Napi::Value FilterGraphSegment::Free(const Napi::CallbackInfo& info) {
  avfilter_graph_segment_free(&segment_);
  return info.Env().Undefined();
}

Napi::Value FilterGraphSegment::CreateFilters(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!segment_) {
    Napi::Error::New(env, "Segment is null").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int flags = 0;
  if (info.Length() > 0 && info[0].IsNumber()) {
    flags = info[0].As<Napi::Number>().Int32Value();
  }

  int ret = avfilter_graph_segment_create_filters(segment_, flags);

  return Napi::Number::New(env, ret);
}

Napi::Value FilterGraphSegment::ApplyOpts(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!segment_) {
    Napi::Error::New(env, "Segment is null").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int flags = 0;
  if (info.Length() > 0 && info[0].IsNumber()) {
    flags = info[0].As<Napi::Number>().Int32Value();
  }

  int ret = avfilter_graph_segment_apply_opts(segment_, flags);

  return Napi::Number::New(env, ret);
}

Napi::Value FilterGraphSegment::Apply(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!segment_) {
    Napi::Error::New(env, "Segment is null").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsObject()) {
    Napi::TypeError::New(env, "Expected (inputs: FilterInOut, outputs: FilterInOut)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Get FilterInOut objects
  FilterInOut* inputs_obj = FilterInOut::Unwrap(info[0].As<Napi::Object>());
  FilterInOut* outputs_obj = FilterInOut::Unwrap(info[1].As<Napi::Object>());

  if (!inputs_obj || !outputs_obj) {
    Napi::Error::New(env, "Invalid FilterInOut objects").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  AVFilterInOut* inputs = inputs_obj->Get();
  AVFilterInOut* outputs = outputs_obj->Get();

  int flags = 0;
  if (info.Length() > 2 && info[2].IsNumber()) {
    flags = info[2].As<Napi::Number>().Int32Value();
  }

  int ret = avfilter_graph_segment_apply(segment_, flags, &inputs, &outputs);

  // Update the FilterInOut objects with potentially modified pointers
  inputs_obj->SetUnowned(inputs);
  outputs_obj->SetUnowned(outputs);

  return Napi::Number::New(env, ret);
}

Napi::Value FilterGraphSegment::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}

} // namespace ffmpeg
