#include "hardware_frames_context.h"
#include "frame.h"
#include "common.h"
#include <napi.h>

extern "C" {
#include <libavutil/hwcontext.h>
}

namespace ffmpeg {

Napi::Value HardwareFramesContext::TransferDataSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (dst, src)")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Frame* dst = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  Frame* src = UnwrapNativeObject<Frame>(env, info[1], "Frame");

  if (!dst || !dst->Get() || !src || !src->Get()) {
    Napi::Error::New(env, "Invalid frame(s)").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  int flags = 0;
  if (info.Length() > 2 && info[2].IsNumber()) {
    flags = info[2].As<Napi::Number>().Int32Value();
  }

  // Direct synchronous call
  int ret = av_hwframe_transfer_data(dst->Get(), src->Get(), flags);

  // The transfer allocated the destination frame's buffers; reconcile V8.
  if (ret >= 0) {
    dst->SyncExternalMemory(env);
  }

  return Napi::Number::New(env, ret);
}

} // namespace ffmpeg