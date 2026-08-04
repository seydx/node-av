#include "filter_context.h"
#include "filter.h"
#include "filter_graph.h"
#include "dictionary.h"
#include "frame.h"
#include "hardware_device_context.h"
#include "hardware_frames_context.h"
#include "common.h"

extern "C" {
#include <libavutil/mem.h>
#include <libavutil/opt.h>
#include <libavutil/buffer.h>
#include <libavfilter/buffersrc.h>
#include <libavfilter/buffersink.h>
}

namespace ffmpeg {

thread_local Napi::FunctionReference FilterContext::constructor;

Napi::Object FilterContext::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "FilterContext", {
    InstanceMethod<&FilterContext::Init>("init"),
    InstanceMethod<&FilterContext::InitStr>("initStr"),
    InstanceMethod<&FilterContext::Link>("link"),
    InstanceMethod<&FilterContext::Unlink>("unlink"),
    InstanceMethod<&FilterContext::Free>("free"),
    InstanceMethod<&FilterContext::BuffersrcAddFrameAsync>("buffersrcAddFrame"),
    InstanceMethod<&FilterContext::BuffersrcAddFrameSync>("buffersrcAddFrameSync"),
    InstanceMethod<&FilterContext::BuffersrcParametersSet>("buffersrcParametersSet"),
    InstanceMethod<&FilterContext::BuffersinkGetFrameAsync>("buffersinkGetFrame"),
    InstanceMethod<&FilterContext::BuffersinkGetFrameSync>("buffersinkGetFrameSync"),
    // InstanceMethod<&FilterContext::BuffersinkSetFrameSize>("buffersinkSetFrameSize"),
    InstanceMethod<&FilterContext::BuffersinkGetTimeBase>("buffersinkGetTimeBase"),
    InstanceMethod<&FilterContext::BuffersinkGetFormat>("buffersinkGetFormat"),
    InstanceMethod<&FilterContext::BuffersinkGetWidth>("buffersinkGetWidth"),
    InstanceMethod<&FilterContext::BuffersinkGetHeight>("buffersinkGetHeight"),
    InstanceMethod<&FilterContext::BuffersinkGetSampleAspectRatio>("buffersinkGetSampleAspectRatio"),
    InstanceMethod<&FilterContext::BuffersinkGetFrameRate>("buffersinkGetFrameRate"),
    InstanceMethod<&FilterContext::BuffersinkGetSampleRate>("buffersinkGetSampleRate"),
    InstanceMethod<&FilterContext::BuffersinkGetChannelLayout>("buffersinkGetChannelLayout"),
    InstanceMethod<&FilterContext::BuffersinkGetColorspace>("buffersinkGetColorspace"),
    InstanceMethod<&FilterContext::BuffersinkGetColorRange>("buffersinkGetColorRange"),
    InstanceMethod(Napi::Symbol::WellKnown(env, "dispose"), &FilterContext::Dispose),

    InstanceAccessor("name", &FilterContext::GetName, &FilterContext::SetName, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("extraHWFrames", &FilterContext::GetExtraHWFrames, &FilterContext::SetExtraHWFrames, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&FilterContext::GetFilter>("filter"),
    InstanceAccessor<&FilterContext::GetGraph>("graph"),
    InstanceAccessor<&FilterContext::GetNbInputs>("nbInputs"),
    InstanceAccessor<&FilterContext::GetNbOutputs>("nbOutputs"),
    InstanceAccessor("hwDeviceCtx", &FilterContext::GetHwDeviceCtx, &FilterContext::SetHwDeviceCtx, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("FilterContext", func);
  return exports;
}

FilterContext::FilterContext(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<FilterContext>(info), unowned_ctx_(nullptr) {
  // Context is created by FilterGraph::createFilter
}

FilterContext::~FilterContext() {
  if (ctx_) {
    avfilter_free(ctx_);
    ctx_ = nullptr;
  }
}

Napi::Value FilterContext::Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFilterContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "FilterContext not allocated").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  AVDictionary* options = nullptr;
  
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, info[0], "Dictionary");
    if (dict && dict->Get()) {
      av_dict_copy(&options, dict->Get(), 0);
    }
  }
  
  int ret = avfilter_init_dict(ctx, &options);
  
  if (options) {
    av_dict_free(&options);
  }
  
  return Napi::Number::New(env, ret);
}

Napi::Value FilterContext::InitStr(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFilterContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "FilterContext not allocated").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  const char* args = nullptr;
  std::string args_str;
  
  if (info.Length() > 0 && info[0].IsString()) {
    args_str = info[0].As<Napi::String>().Utf8Value();
    args = args_str.c_str();
  }
  
  int ret = avfilter_init_str(ctx, args);
  
  return Napi::Number::New(env, ret);
}

Napi::Value FilterContext::Link(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFilterContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "FilterContext not allocated").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Expected 3 arguments (srcPad, dst, dstPad)").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int srcPad = info[0].As<Napi::Number>().Int32Value();
  
  FilterContext* dst = UnwrapNativeObject<FilterContext>(env, info[1], "FilterContext");
  if (!dst || !dst->Get()) {
    Napi::TypeError::New(env, "Invalid destination FilterContext").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int dstPad = info[2].As<Napi::Number>().Int32Value();
  
  int ret = avfilter_link(ctx, srcPad, dst->Get(), dstPad);
  
  return Napi::Number::New(env, ret);
}

Napi::Value FilterContext::Unlink(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFilterContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "FilterContext not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (pad)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int pad = info[0].As<Napi::Number>().Int32Value();
  
  // Fix sign comparison warning by casting to unsigned
  if (pad >= 0 && static_cast<unsigned int>(pad) < ctx->nb_inputs) {
    // avfilter_link_free is deprecated, just set to nullptr instead
    // The link will be freed when the filter context is freed
    if (ctx->inputs[pad]) {
      ctx->inputs[pad] = nullptr;
    }
  }
  
  return env.Undefined();
}

Napi::Value FilterContext::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (ctx_ || unowned_ctx_) {
    // Freeing (or detaching) while a buffersrc/buffersink worker still uses
    // the context on the threadpool would be a use-after-free; wait bounded,
    // then error instead of crashing
    if (!GuardAsyncOps(env, async_ops_, "FilterContext")) {
      return env.Undefined();
    }
  }
  if (ctx_) {
    avfilter_free(ctx_);
    ctx_ = nullptr;
  }
  unowned_ctx_ = nullptr;

  return env.Undefined();
}

Napi::Value FilterContext::BuffersrcParametersSet(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFilterContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "FilterContext not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // Parse parameters object
  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "Parameters object expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Object params = info[0].As<Napi::Object>();
  
  // Allocate parameters structure
  AVBufferSrcParameters* par = av_buffersrc_parameters_alloc();
  if (!par) {
    Napi::Error::New(env, "Failed to allocate buffer source parameters").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (params.Has("format")) {
    Napi::Value val = params.Get("format");
    if (val.IsNumber()) {
      par->format = val.As<Napi::Number>().Int32Value();
    }
  }
  if (params.Has("timeBase")) {
    Napi::Value tb = params.Get("timeBase");
    if (tb.IsObject() && !tb.IsNull()) {
      Napi::Object tbObj = tb.As<Napi::Object>();
      par->time_base.num = tbObj.Get("num").As<Napi::Number>().Int32Value();
      par->time_base.den = tbObj.Get("den").As<Napi::Number>().Int32Value();
    }
  }

  // Set video parameters
  if (params.Has("width")) {
    Napi::Value val = params.Get("width");
    if (val.IsNumber()) {
      par->width = val.As<Napi::Number>().Int32Value();
    }
  }
  if (params.Has("height")) {
    Napi::Value val = params.Get("height");
    if (val.IsNumber()) {
      par->height = val.As<Napi::Number>().Int32Value();
    }
  }
  if (params.Has("frameRate")) {
    Napi::Value fr = params.Get("frameRate");
    if (fr.IsObject() && !fr.IsNull()) {
      Napi::Object frObj = fr.As<Napi::Object>();
      par->frame_rate.num = frObj.Get("num").As<Napi::Number>().Int32Value();
      par->frame_rate.den = frObj.Get("den").As<Napi::Number>().Int32Value();
    }
  }
  if (params.Has("sampleAspectRatio")) {
    Napi::Value sar = params.Get("sampleAspectRatio");
    if (sar.IsObject() && !sar.IsNull()) {
      Napi::Object sarObj = sar.As<Napi::Object>();
      par->sample_aspect_ratio.num = sarObj.Get("num").As<Napi::Number>().Int32Value();
      par->sample_aspect_ratio.den = sarObj.Get("den").As<Napi::Number>().Int32Value();
    }
  }
  if (params.Has("colorRange")) {
    Napi::Value val = params.Get("colorRange");
    if (val.IsNumber()) {
      par->color_range = static_cast<AVColorRange>(val.As<Napi::Number>().Int32Value());
    }
  }
  if (params.Has("colorSpace")) {
    Napi::Value val = params.Get("colorSpace");
    if (val.IsNumber()) {
      par->color_space = static_cast<AVColorSpace>(val.As<Napi::Number>().Int32Value());
    }
  }
  if (params.Has("alphaMode")) {
    Napi::Value val = params.Get("alphaMode");
    if (val.IsNumber()) {
      par->alpha_mode = static_cast<AVAlphaMode>(val.As<Napi::Number>().Int32Value());
    }
  }

  // Set hardware frames context if provided
  if (params.Has("hwFramesCtx")) {
    Napi::Value hwFramesCtxValue = params.Get("hwFramesCtx");
    if (hwFramesCtxValue.IsObject() && !hwFramesCtxValue.IsNull()) {
      HardwareFramesContext* hwFramesCtx = UnwrapNativeObject<HardwareFramesContext>(env, hwFramesCtxValue, "HardwareFramesContext");
      if (hwFramesCtx && hwFramesCtx->Get()) {
        par->hw_frames_ctx = av_buffer_ref(hwFramesCtx->Get());
      }
    }
  }
  
  // Set audio parameters
  if (params.Has("sampleRate")) {
    Napi::Value val = params.Get("sampleRate");
    if (val.IsNumber()) {
      par->sample_rate = val.As<Napi::Number>().Int32Value();
    }
  }
  if (params.Has("channelLayout")) {
    Napi::Value chLayout = params.Get("channelLayout");
    if (chLayout.IsObject() && !chLayout.IsNull()) {
      Napi::Object chLayoutObj = chLayout.As<Napi::Object>();
      if (chLayoutObj.Has("mask")) {
        uint64_t layout_mask = chLayoutObj.Get("mask").As<Napi::BigInt>().Uint64Value(nullptr);
        av_channel_layout_from_mask(&par->ch_layout, layout_mask);
      }
    } else if (chLayout.IsBigInt()) {
      // Legacy: direct BigInt value (backward compatibility)
      uint64_t layout_mask = chLayout.As<Napi::BigInt>().Uint64Value(nullptr);
      av_channel_layout_from_mask(&par->ch_layout, layout_mask);
    }
  }
  
  // Apply parameters to buffer source
  int ret = av_buffersrc_parameters_set(ctx, par);

  // av_buffersrc_parameters_set makes its own references; the allocated
  // fields in par stay owned by us and must be released before av_free
  av_buffer_unref(&par->hw_frames_ctx);
  av_free(par);
  
  return Napi::Number::New(env, ret);
}

// Napi::Value FilterContext::BuffersinkSetFrameSize(const Napi::CallbackInfo& info) {
//   Napi::Env env = info.Env();
//   AVFilterContext* ctx = Get();
  
//   if (!ctx) {
//     Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
//     return env.Undefined();
//   }
  
//   if (info.Length() < 1 || !info[0].IsNumber()) {
//     Napi::TypeError::New(env, "Expected frame size as number").ThrowAsJavaScriptException();
//     return env.Undefined();
//   }
  
//   unsigned int frame_size = info[0].As<Napi::Number>().Uint32Value();
  
//   // Set the frame size for buffersink
//   av_buffersink_set_frame_size(ctx, frame_size);
  
//   return env.Undefined();
// }

Napi::Value FilterContext::BuffersinkGetTimeBase(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  
  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }

  AVRational tb = av_buffersink_get_time_base(ctx);

  Napi::Object result = Napi::Object::New(env);
  result.Set("num", Napi::Number::New(env, tb.num));
  result.Set("den", Napi::Number::New(env, tb.den));
  
  return result;
}

Napi::Value FilterContext::BuffersinkGetFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  
  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int format = av_buffersink_get_format(ctx);
  return Napi::Number::New(env, format);
}

Napi::Value FilterContext::BuffersinkGetWidth(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  
  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int width = av_buffersink_get_w(ctx);
  return Napi::Number::New(env, width);
}

Napi::Value FilterContext::BuffersinkGetHeight(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  
  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int height = av_buffersink_get_h(ctx);
  return Napi::Number::New(env, height);
}

Napi::Value FilterContext::BuffersinkGetSampleAspectRatio(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  
  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  AVRational sar = av_buffersink_get_sample_aspect_ratio(ctx);
  
  Napi::Object result = Napi::Object::New(env);
  result.Set("num", Napi::Number::New(env, sar.num));
  result.Set("den", Napi::Number::New(env, sar.den));
  
  return result;
}

Napi::Value FilterContext::BuffersinkGetFrameRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  
  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  AVRational fr = av_buffersink_get_frame_rate(ctx);
  
  Napi::Object result = Napi::Object::New(env);
  result.Set("num", Napi::Number::New(env, fr.num));
  result.Set("den", Napi::Number::New(env, fr.den));
  
  return result;
}

Napi::Value FilterContext::BuffersinkGetSampleRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  
  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int sample_rate = av_buffersink_get_sample_rate(ctx);
  return Napi::Number::New(env, sample_rate);
}

Napi::Value FilterContext::BuffersinkGetChannelLayout(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  
  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  AVChannelLayout ch_layout;
  av_channel_layout_default(&ch_layout, 2); // Initialize with default
  int ret = av_buffersink_get_ch_layout(ctx, &ch_layout);
  if (ret < 0) {
    av_channel_layout_uninit(&ch_layout);
    return env.Null();
  }
  
  // Return complete channel layout object
  Napi::Object result = Napi::Object::New(env);
  result.Set("order", Napi::Number::New(env, ch_layout.order));
  result.Set("nbChannels", Napi::Number::New(env, ch_layout.nb_channels));
  
  // Union field based on order
  if (ch_layout.order == AV_CHANNEL_ORDER_NATIVE) {
    result.Set("mask", Napi::BigInt::New(env, ch_layout.u.mask));
  } else if (ch_layout.order == AV_CHANNEL_ORDER_CUSTOM) {
    // For custom layout, we'd need to handle the map array
    // For now, just set mask to 0
    result.Set("mask", Napi::BigInt::New(env, static_cast<uint64_t>(0)));
  } else {
    result.Set("mask", Napi::BigInt::New(env, static_cast<uint64_t>(0)));
  }
  
  av_channel_layout_uninit(&ch_layout);

  return result;
}

Napi::Value FilterContext::BuffersinkGetColorspace(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();

  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }

  enum AVColorSpace colorspace = av_buffersink_get_colorspace(ctx);
  return Napi::Number::New(env, static_cast<int>(colorspace));
}

Napi::Value FilterContext::BuffersinkGetColorRange(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();

  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }

  enum AVColorRange color_range = av_buffersink_get_color_range(ctx);
  return Napi::Number::New(env, static_cast<int>(color_range));
}

Napi::Value FilterContext::GetName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  if (!ctx || !ctx->name) {
    return env.Null();
  }
  return Napi::String::New(env, ctx->name);
}

Napi::Value FilterContext::GetExtraHWFrames(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, ctx->extra_hw_frames);
}

void FilterContext::SetExtraHWFrames(const Napi::CallbackInfo& info, const Napi::Value& value) {
  AVFilterContext* ctx = Get();
  if (!ctx) {
    return;
  }
  
  if (value.IsNumber()) {
    int extraHWFrames = value.As<Napi::Number>().Int32Value();
    if (extraHWFrames >= 0) {
      ctx->extra_hw_frames = extraHWFrames;
    }
  }
}

void FilterContext::SetName(const Napi::CallbackInfo& info, const Napi::Value& value) {
  AVFilterContext* ctx = Get();
  if (!ctx) {
    return;
  }
  
  if (value.IsString()) {
    std::string name = value.As<Napi::String>().Utf8Value();
    av_freep(&ctx->name);
    ctx->name = av_strdup(name.c_str());
  }
}

Napi::Value FilterContext::GetFilter(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFilterContext* ctx = Get();
  if (!ctx || !ctx->filter) {
    return env.Null();
  }
  
  Napi::Object filterObj = Filter::constructor.New({});
  Filter* filter = Napi::ObjectWrap<Filter>::Unwrap(filterObj);
  filter->Set(ctx->filter);
  
  return filterObj;
}

Napi::Value FilterContext::GetGraph(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFilterContext* ctx = Get();
  if (!ctx || !ctx->graph) {
    return env.Null();
  }
  
  // Wrap the existing AVFilterGraph in a FilterGraph object
  // Note: We don't own this graph, it's managed by the filter context
  Napi::Object graphObj = FilterGraph::constructor.New({});
  FilterGraph* graph = Napi::ObjectWrap<FilterGraph>::Unwrap(graphObj);
  graph->SetUnowned(ctx->graph); // We don't own it
  return graphObj;
}

Napi::Value FilterContext::GetNbInputs(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, ctx->nb_inputs);
}

Napi::Value FilterContext::GetNbOutputs(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, ctx->nb_outputs);
}

Napi::Value FilterContext::GetHwDeviceCtx(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  if (!ctx || !ctx->hw_device_ctx) {
    return env.Null();
  }
  
  // Use Wrap to create a HardwareDeviceContext wrapper for the existing AVBufferRef
  return HardwareDeviceContext::Wrap(env, ctx->hw_device_ctx);
}

void FilterContext::SetHwDeviceCtx(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  AVFilterContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "FilterContext not allocated").ThrowAsJavaScriptException();
    return;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    // Clear hw_device_ctx
    if (ctx->hw_device_ctx) {
      av_buffer_unref(&ctx->hw_device_ctx);
    }
  } else if (value.IsObject()) {
    // Expect a HardwareDeviceContext object
    HardwareDeviceContext* hwDeviceCtx = UnwrapNativeObject<HardwareDeviceContext>(env, value, "HardwareDeviceContext");
    if (hwDeviceCtx) {
      AVBufferRef* deviceRef = hwDeviceCtx->Get();
      if (deviceRef) {
        // Unref old if exists
        if (ctx->hw_device_ctx) {
          av_buffer_unref(&ctx->hw_device_ctx);
        }
        // Ref the new one
        ctx->hw_device_ctx = av_buffer_ref(deviceRef);
      }
    }
  } else {
    Napi::TypeError::New(env, "hwDeviceCtx must be a HardwareDeviceContext or null").ThrowAsJavaScriptException();
  }
}

Napi::Value FilterContext::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}

} // namespace ffmpeg