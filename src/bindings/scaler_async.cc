#include "scaler.h"
#include "frame.h"
#include <napi.h>

extern "C" {
#include <libavutil/error.h>
#include <libavutil/frame.h>
}

namespace ffmpeg {

class ScalerProcessWorker : public Napi::AsyncWorker {
public:
  ScalerProcessWorker(Napi::Env env, Napi::Object scalerObj, Scaler* scaler,
                      Napi::Object frameObj, Frame* srcFrame,
                      const Scaler::ScaleJob& job, Napi::Buffer<uint8_t> outBuf)
    : Napi::AsyncWorker(env),
      scaler_(scaler),
      src_frame_(srcFrame),
      job_(job),
      outData_(outBuf.Data()),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Keep the scaler, the source frame and the output buffer alive for the
    // operation.
    scaler_ref_.Reset(scalerObj, 1);
    frame_ref_.Reset(frameObj, 1);
    buf_ref_.Reset(outBuf, 1);
    // Mark the scaler (pooled frames/contexts) and the source frame busy so
    // close()/free() waits instead of pulling memory out from under the job
    // (see promise_worker.h)
    scaler_->async_ops_.Begin();
    src_frame_->async_ops_.Begin();
  }

  ~ScalerProcessWorker() {
    if (job_.cropped) {
      av_frame_free(&job_.cropped);
    }
    scaler_ref_.Reset();
    frame_ref_.Reset();
    buf_ref_.Reset();
  }

  void Execute() override {
    ret_ = Scaler::RunJob(job_, outData_);
    // Release before OnOK so a GuardAsyncOps() wait on the main thread can
    // proceed even though the OnOK callback is still queued behind it
    EndOps();
  }

  void OnOK() override {
    if (!CanCallIntoJs(Env())) {
      return;
    }
    if (ret_ < 0) {
      char errbuf[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret_, errbuf, sizeof(errbuf));
      deferred_.Reject(Napi::Error::New(Env(), std::string("sws_scale failed: ") + errbuf).Value());
      return;
    }
    deferred_.Resolve(buf_ref_.Value());
  }

  void OnError(const Napi::Error& e) override {
    EndOps();  // Execute may have been skipped
    if (!CanCallIntoJs(Env())) {
      return;
    }
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  void EndOps() {
    if (ops_ended_) {
      return;
    }
    ops_ended_ = true;
    scaler_->async_ops_.End();
    src_frame_->async_ops_.End();
  }

  Scaler* scaler_;
  Frame* src_frame_;
  Scaler::ScaleJob job_;
  uint8_t* outData_;
  int ret_;
  bool ops_ended_ = false;
  Napi::ObjectReference scaler_ref_;
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

  // PrepareJob validated the source frame, so the unwrap cannot fail here.
  Frame* srcFrame = Napi::ObjectWrap<Frame>::Unwrap(info[0].As<Napi::Object>());

  Napi::Buffer<uint8_t> outBuffer = Napi::Buffer<uint8_t>::New(env, job.outSize);
  auto* worker = new ScalerProcessWorker(env, info.This().As<Napi::Object>(), this, info[0].As<Napi::Object>(), srcFrame, job, outBuffer);
  Napi::Promise promise = worker->GetPromise();
  worker->Queue();
  return promise;
}

} // namespace ffmpeg
