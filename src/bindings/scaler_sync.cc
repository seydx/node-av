#include "scaler.h"
#include <napi.h>

extern "C" {
#include <libavutil/error.h>
#include <libavutil/frame.h>
}

namespace ffmpeg {

Napi::Value Scaler::Process(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  ScaleJob job;
  if (!PrepareJob(env, info, job)) {
    return env.Undefined();
  }

  Napi::Buffer<uint8_t> outBuffer = Napi::Buffer<uint8_t>::New(env, job.outSize);
  int ret = RunJob(job, outBuffer.Data());
  if (job.cropped) av_frame_free(&job.cropped);

  if (ret < 0) {
    char errbuf[AV_ERROR_MAX_STRING_SIZE];
    av_strerror(ret, errbuf, sizeof(errbuf));
    Napi::Error::New(env, std::string("sws_scale failed: ") + errbuf).ThrowAsJavaScriptException();
    return env.Undefined();
  }

  return outBuffer;
}

} // namespace ffmpeg
