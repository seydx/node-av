#include "filter_context.h"
#include "frame.h"
#include "common.h"
#include <napi.h>

extern "C" {
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersrc.h>
#include <libavfilter/buffersink.h>
#include <libavutil/channel_layout.h>
}

namespace ffmpeg {

class FCBuffersrcAddFrameWorker : public Napi::AsyncWorker {
public:
  FCBuffersrcAddFrameWorker(Napi::Env env, Napi::Object ctxObj, FilterContext* ctx,
                            Napi::Value frameVal, Frame* frame, int flags)
    : Napi::AsyncWorker(env),
      ctx_(ctx),
      frame_(frame),
      flags_(flags),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold references to prevent GC during async operation
    ctx_ref_.Reset(ctxObj, 1);
    if (frame && frameVal.IsObject()) {
      frame_ref_.Reset(frameVal.As<Napi::Object>(), 1);
    }
  }

  ~FCBuffersrcAddFrameWorker() {
    ctx_ref_.Reset();
    frame_ref_.Reset();
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!ctx_ || !ctx_->Get()) {
      ret_ = AVERROR(EINVAL);
      return;
    }

    ret_ = av_buffersrc_add_frame_flags(ctx_->Get(), frame_ ? frame_->Get() : nullptr, flags_);
  }

  void OnOK() override {
    deferred_.Resolve(Napi::Number::New(Env(), ret_));
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference ctx_ref_;
  Napi::ObjectReference frame_ref_;
  FilterContext* ctx_;
  Frame* frame_;
  int flags_;
  int ret_;
  Napi::Promise::Deferred deferred_;
};

class FCBuffersinkGetFrameWorker : public Napi::AsyncWorker {
public:
  FCBuffersinkGetFrameWorker(Napi::Env env, Napi::Object ctxObj, FilterContext* ctx,
                             Napi::Object frameObj, Frame* frame)
    : Napi::AsyncWorker(env),
      ctx_(ctx),
      frame_(frame),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold references to prevent GC during async operation
    ctx_ref_.Reset(ctxObj, 1);
    frame_ref_.Reset(frameObj, 1);
  }

  ~FCBuffersinkGetFrameWorker() {
    ctx_ref_.Reset();
    frame_ref_.Reset();
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!ctx_ || !ctx_->Get()) {
      ret_ = AVERROR(EINVAL);
      return;
    }

    if (!frame_ || !frame_->Get()) {
      ret_ = AVERROR(EINVAL);
      return;
    }

    ret_ = av_buffersink_get_frame(ctx_->Get(), frame_->Get());
  }

  void OnOK() override {
    // buffersink filled the frame's buffers on the worker thread; reconcile V8
    // accounting now that we are back on the JS thread.
    if (ret_ >= 0) {
      frame_->SyncExternalMemory(Env());
    }
    deferred_.Resolve(Napi::Number::New(Env(), ret_));
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference ctx_ref_;
  Napi::ObjectReference frame_ref_;
  FilterContext* ctx_;
  Frame* frame_;
  int ret_;
  Napi::Promise::Deferred deferred_;
};

Napi::Value FilterContext::BuffersrcAddFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Frame* frame = nullptr;
  Napi::Value frameVal = env.Undefined();
  if (!info[0].IsNull() && !info[0].IsUndefined()) {
    frameVal = info[0];
    frame = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  }

  // Optional flags parameter (defaults to 0 = AV_BUFFERSRC_FLAG_NONE)
  int flags = 0;
  if (info.Length() >= 2 && info[1].IsNumber()) {
    flags = info[1].As<Napi::Number>().Int32Value();
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCBuffersrcAddFrameWorker(env, thisObj, this, frameVal, frame, flags);
  worker->Queue();
  return worker->GetPromise();
}

Napi::Value FilterContext::BuffersinkGetFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "Frame expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Object frameObj = info[0].As<Napi::Object>();
  Frame* frame = UnwrapNativeObject<Frame>(env, info[0], "Frame");

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCBuffersinkGetFrameWorker(env, thisObj, this, frameObj, frame);
  worker->Queue();
  return worker->GetPromise();
}

} // namespace ffmpeg
