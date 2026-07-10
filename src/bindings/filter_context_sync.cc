#include "filter_context.h"
#include "frame.h"
#include <napi.h>

extern "C" {
#include <libavfilter/buffersrc.h>
#include <libavfilter/buffersink.h>
}

namespace ffmpeg {

Napi::Value FilterContext::BuffersrcAddFrameSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVFilterContext* ctx = Get();
  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Frame* frame = nullptr;
  if (!info[0].IsNull() && !info[0].IsUndefined()) {
    frame = UnwrapNativeObject<Frame>(env, info[0], "Frame");
    if (!frame) {
      Napi::TypeError::New(env, "Invalid frame object").ThrowAsJavaScriptException();
      return Napi::Number::New(env, AVERROR(EINVAL));
    }
  }

  // Optional flags parameter (defaults to 0 = AV_BUFFERSRC_FLAG_NONE)
  int flags = 0;
  if (info.Length() >= 2 && info[1].IsNumber()) {
    flags = info[1].As<Napi::Number>().Int32Value();
  }

  int ret = av_buffersrc_add_frame_flags(ctx, frame ? frame->Get() : nullptr, flags);

  return Napi::Number::New(env, ret);
}

Napi::Value FilterContext::BuffersinkGetFrameSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVFilterContext* ctx = Get();
  if (!ctx) {
    Napi::TypeError::New(env, "FilterContext is not initialized").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "Frame expected").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Frame* frame = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  if (!frame || !frame->Get()) {
    Napi::TypeError::New(env, "Invalid frame object").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  // Direct synchronous call
  int ret = av_buffersink_get_frame(ctx, frame->Get());

  // buffersink fills the frame's buffers internally; reconcile V8 accounting.
  if (ret >= 0) {
    frame->SyncExternalMemory(env);
  }

  return Napi::Number::New(env, ret);
}

} // namespace ffmpeg