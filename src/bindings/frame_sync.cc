#include "frame.h"
#include <napi.h>

extern "C" {
#include <libavutil/frame.h>
#include <libavutil/hwcontext.h>
}

namespace ffmpeg {

Napi::Value Frame::HwframeTransferDataSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!frame_) {
    Napi::Error::New(env, "Frame not allocated").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected destination frame").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "Destination must be a Frame object").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Frame* dst = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  if (!dst || !dst->frame_) {
    Napi::Error::New(env, "Invalid destination frame").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  int flags = 0;
  if (info.Length() >= 2 && info[1].IsNumber()) {
    flags = info[1].As<Napi::Number>().Int32Value();
  }

  // Direct synchronous call
  int ret = av_hwframe_transfer_data(dst->frame_, frame_, flags);

  // The transfer allocated the destination's (software) buffers; reconcile V8.
  if (ret >= 0) {
    dst->SyncExternalMemory(env);
  }

  return Napi::Number::New(env, ret);
}

} // namespace ffmpeg