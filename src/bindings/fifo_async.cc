#include "fifo.h"
#include "promise_worker.h"
#include <napi.h>

extern "C" {
#include <libavutil/fifo.h>
}

namespace ffmpeg {

Napi::Value Fifo::WriteAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    Napi::Error::New(env, "Fifo not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (buf, nb_elems)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Expected Buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
  size_t nb_elems = static_cast<size_t>(info[1].As<Napi::Number>().Int64Value());

  AVFifo* fifo = fifo_;
  void* buf = buffer.Data();
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>(), info[0].As<Napi::Object>()}, [fifo, buf, nb_elems]() {
    // av_fifo_write returns 0 on success (not the element count) in FFmpeg 8.0+
    int ret = av_fifo_write(fifo, buf, nb_elems);
    return ret >= 0 ? static_cast<int>(nb_elems) : ret;
  });
}

Napi::Value Fifo::ReadAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    Napi::Error::New(env, "Fifo not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (buf, nb_elems)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Expected Buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
  size_t nb_elems = static_cast<size_t>(info[1].As<Napi::Number>().Int64Value());

  AVFifo* fifo = fifo_;
  void* buf = buffer.Data();
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>(), info[0].As<Napi::Object>()}, [fifo, buf, nb_elems]() {
    int ret = av_fifo_read(fifo, buf, nb_elems);
    if (ret >= 0) {
      return static_cast<int>(nb_elems);
    }
    // EINVAL means the FIFO holds fewer elements than requested - report 0
    // elements read instead of an error
    return ret == AVERROR(EINVAL) ? 0 : ret;
  });
}

Napi::Value Fifo::PeekAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    Napi::Error::New(env, "Fifo not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 or 3 arguments (buf, nb_elems, [offset])").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Expected Buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
  size_t nb_elems = static_cast<size_t>(info[1].As<Napi::Number>().Int64Value());
  size_t offset = 0;

  if (info.Length() >= 3) {
    offset = static_cast<size_t>(info[2].As<Napi::Number>().Int64Value());
  }

  AVFifo* fifo = fifo_;
  void* buf = buffer.Data();
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>(), info[0].As<Napi::Object>()}, [fifo, buf, nb_elems, offset]() {
    int ret = av_fifo_peek(fifo, buf, nb_elems, offset);
    return ret >= 0 ? static_cast<int>(nb_elems) : ret;
  });
}

} // namespace ffmpeg
