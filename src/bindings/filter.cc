#include "filter.h"

namespace ffmpeg {

thread_local Napi::FunctionReference Filter::constructor;

Napi::Object Filter::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "Filter", {
    StaticMethod<&Filter::GetByName>("getByName"),
    StaticMethod<&Filter::GetList>("getList"),

    InstanceAccessor<&Filter::GetName>("name"),
    InstanceAccessor<&Filter::GetDescription>("description"),
    InstanceAccessor<&Filter::GetInputs>("inputs"),
    InstanceAccessor<&Filter::GetOutputs>("outputs"),
    InstanceAccessor<&Filter::GetFlags>("flags"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("Filter", func);
  return exports;
}

Filter::Filter(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<Filter>(info) {
  // Filter objects are created internally, not by users
}

Napi::Value Filter::GetByName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string argument (name)").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[0].As<Napi::String>().Utf8Value();
  const AVFilter* filter = avfilter_get_by_name(name.c_str());
  
  if (!filter) {
    return env.Null();
  }
  
  Napi::Object filterObj = constructor.New({});
  Filter* wrapper = Napi::ObjectWrap<Filter>::Unwrap(filterObj);
  wrapper->Set(filter);
  
  return filterObj;
}

Napi::Value Filter::GetList(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array filters = Napi::Array::New(env);
  
  void* opaque = nullptr;
  const AVFilter* filter = nullptr;
  uint32_t index = 0;
  
  while ((filter = av_filter_iterate(&opaque)) != nullptr) {
    Napi::Object filterObj = constructor.New({});
    Filter* wrapper = Napi::ObjectWrap<Filter>::Unwrap(filterObj);
    wrapper->Set(filter);
    filters.Set(index++, filterObj);
  }
  
  return filters;
}

Napi::Value Filter::GetName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!filter_ || !filter_->name) {
    return env.Null();
  }
  return Napi::String::New(env, filter_->name);
}

Napi::Value Filter::GetDescription(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!filter_ || !filter_->description) {
    return env.Null();
  }
  return Napi::String::New(env, filter_->description);
}

Napi::Value Filter::GetInputs(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!filter_) {
    return Napi::Array::New(env, 0);
  }
  
  // In newer FFmpeg versions, AVFilterPad is opaque
  // We can only get the count using avfilter_filter_pad_count
  int count = avfilter_filter_pad_count(filter_, 0); // 0 for inputs
  
  Napi::Array inputs = Napi::Array::New(env, count);
  for (int i = 0; i < count; i++) {
    Napi::Object padObj = Napi::Object::New(env);
    const char* name = avfilter_pad_get_name(filter_->inputs, i);
    padObj.Set("name", name ? Napi::String::New(env, name) : env.Null());
    padObj.Set("type", Napi::Number::New(env, avfilter_pad_get_type(filter_->inputs, i)));
    inputs.Set(i, padObj);
  }
  
  return inputs;
}

Napi::Value Filter::GetOutputs(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!filter_) {
    return Napi::Array::New(env, 0);
  }
  
  // In newer FFmpeg versions, AVFilterPad is opaque
  // We can only get the count using avfilter_filter_pad_count
  int count = avfilter_filter_pad_count(filter_, 1); // 1 for outputs
  
  Napi::Array outputs = Napi::Array::New(env, count);
  for (int i = 0; i < count; i++) {
    Napi::Object padObj = Napi::Object::New(env);
    const char* name = avfilter_pad_get_name(filter_->outputs, i);
    padObj.Set("name", name ? Napi::String::New(env, name) : env.Null());
    padObj.Set("type", Napi::Number::New(env, avfilter_pad_get_type(filter_->outputs, i)));
    outputs.Set(i, padObj);
  }
  
  return outputs;
}

Napi::Value Filter::GetFlags(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!filter_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, filter_->flags);
}

} // namespace ffmpeg