#include "audio_fifo.h"
#include "promise_worker.h"
#include <napi.h>
#include <vector>

extern "C" {
#include <libavutil/audio_fifo.h>
}

namespace ffmpeg {

static std::vector<void*> CollectPlanePointers(const Napi::Value& dataVal) {
  std::vector<void*> data;
  if (dataVal.IsArray()) {
    Napi::Array dataArray = dataVal.As<Napi::Array>();
    data.resize(dataArray.Length(), nullptr);
    for (uint32_t i = 0; i < dataArray.Length(); i++) {
      if (dataArray.Get(i).IsBuffer()) {
        data[i] = dataArray.Get(i).As<Napi::Buffer<uint8_t>>().Data();
      }
    }
  } else {
    data.push_back(dataVal.As<Napi::Buffer<uint8_t>>().Data());
  }
  return data;
}

Napi::Value AudioFifo::WriteAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    Napi::Error::New(env, "AudioFifo not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (data, nb_samples)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int nb_samples = info[1].As<Napi::Number>().Int32Value();

  if (!info[0].IsArray() && !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Expected Buffer or Array of Buffers").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ValidateBufferCount(env, info[0].IsArray() ? info[0].As<Napi::Array>().Length() : 1)) {
    return env.Undefined();
  }

  AVAudioFifo* fifo = fifo_;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>(), info[0].As<Napi::Object>()},
                            [fifo, data = CollectPlanePointers(info[0]), nb_samples]() mutable {
    return av_audio_fifo_write(fifo, data.data(), nb_samples);
  });
}

Napi::Value AudioFifo::ReadAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    Napi::Error::New(env, "AudioFifo not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (data, nb_samples)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int nb_samples = info[1].As<Napi::Number>().Int32Value();

  if (!info[0].IsArray() && !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Expected Buffer or Array of Buffers").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ValidateBufferCount(env, info[0].IsArray() ? info[0].As<Napi::Array>().Length() : 1)) {
    return env.Undefined();
  }

  AVAudioFifo* fifo = fifo_;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>(), info[0].As<Napi::Object>()},
                            [fifo, data = CollectPlanePointers(info[0]), nb_samples]() mutable {
    return av_audio_fifo_read(fifo, data.data(), nb_samples);
  });
}

Napi::Value AudioFifo::PeekAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    Napi::Error::New(env, "AudioFifo not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (data, nb_samples)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int nb_samples = info[1].As<Napi::Number>().Int32Value();

  if (!info[0].IsArray() && !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Expected Buffer or Array of Buffers").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ValidateBufferCount(env, info[0].IsArray() ? info[0].As<Napi::Array>().Length() : 1)) {
    return env.Undefined();
  }

  AVAudioFifo* fifo = fifo_;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>(), info[0].As<Napi::Object>()},
                            [fifo, data = CollectPlanePointers(info[0]), nb_samples]() mutable {
    return av_audio_fifo_peek(fifo, data.data(), nb_samples);
  });
}

} // namespace ffmpeg
