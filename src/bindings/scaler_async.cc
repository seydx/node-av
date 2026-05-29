#include "scaler.h"
#include <napi.h>

extern "C" {
#include <libavutil/error.h>
#include <libavutil/frame.h>
}

namespace ffmpeg {

class ScalerProcessWorker : public Napi::AsyncWorker {
public:
  ScalerProcessWorker(Napi::Env env, Napi::Object frameObj, const Scaler::ScaleJob& job, Napi::Buffer<uint8_t> outBuf)
    : Napi::AsyncWorker(env),
      job_(job),
      outData_(outBuf.Data()),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Keep the source frame and the output buffer alive for the operation.
    frame_ref_.Reset(frameObj, 1);
    buf_ref_.Reset(outBuf, 1);
  }

  ~ScalerProcessWorker() {
    if (job_.cropped) {
      av_frame_free(&job_.cropped);
    }
    frame_ref_.Reset();
    buf_ref_.Reset();
  }

  void Execute() override {
    ret_ = Scaler::RunJob(job_, outData_);
  }

  void OnOK() override {
    if (ret_ < 0) {
      char errbuf[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret_, errbuf, sizeof(errbuf));
      deferred_.Reject(Napi::Error::New(Env(), std::string("sws_scale failed: ") + errbuf).Value());
      return;
    }
    deferred_.Resolve(buf_ref_.Value());
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Scaler::ScaleJob job_;
  uint8_t* outData_;
  int ret_;
  Napi::ObjectReference frame_ref_;
  Napi::ObjectReference buf_ref_;
  Napi::Promise::Deferred deferred_;
};

Napi::Value Scaler::ProcessAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  ScaleJob job;
  if (!PrepareJob(env, info, job)) {
    // PrepareJob has thrown a JS exception for invalid input.
    return env.Undefined();
  }

  Napi::Buffer<uint8_t> outBuffer = Napi::Buffer<uint8_t>::New(env, job.outSize);
  auto* worker = new ScalerProcessWorker(env, info[0].As<Napi::Object>(), job, outBuffer);
  Napi::Promise promise = worker->GetPromise();
  worker->Queue();
  return promise;
}

} // namespace ffmpeg
