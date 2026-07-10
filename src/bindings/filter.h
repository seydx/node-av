#ifndef FFMPEG_FILTER_H
#define FFMPEG_FILTER_H

#include <napi.h>

extern "C" {
#include <libavfilter/avfilter.h>
}

namespace ffmpeg {

class Filter : public Napi::ObjectWrap<Filter> {
public:
  static thread_local Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  Filter(const Napi::CallbackInfo& info);
  ~Filter() = default;

  const AVFilter* Get() const { return filter_; }
  void Set(const AVFilter* filter) { filter_ = filter; }

private:
  friend class FilterContext;
  friend class FilterGraph;
  friend class FilterInOut;


  const AVFilter* filter_ = nullptr; // NOT owned - filters are static definitions

  static Napi::Value GetByName(const Napi::CallbackInfo& info);
  static Napi::Value GetList(const Napi::CallbackInfo& info);

  Napi::Value GetName(const Napi::CallbackInfo& info);

  Napi::Value GetDescription(const Napi::CallbackInfo& info);

  Napi::Value GetInputs(const Napi::CallbackInfo& info);

  Napi::Value GetOutputs(const Napi::CallbackInfo& info);

  Napi::Value GetFlags(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_FILTER_H