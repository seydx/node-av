#include "audio_fifo.h"
#include <napi.h>

extern "C" {
#include <libavutil/audio_fifo.h>
#include <libavutil/mem.h>
}

namespace ffmpeg {

Napi::Value AudioFifo::WriteSync(const Napi::CallbackInfo& info) {
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
  int result = 0;

  // Handle array of buffers (one per channel for planar formats)
  if (info[0].IsArray()) {
    Napi::Array dataArray = info[0].As<Napi::Array>();

    if (!ValidateBufferCount(env, dataArray.Length())) {
      return env.Undefined();
    }

    void** data = static_cast<void**>(av_malloc(dataArray.Length() * sizeof(void*)));
    if (!data) {
      Napi::Error::New(env, "Out of memory").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    for (uint32_t i = 0; i < dataArray.Length(); i++) {
      if (dataArray.Get(i).IsBuffer()) {
        Napi::Buffer<uint8_t> buf = dataArray.Get(i).As<Napi::Buffer<uint8_t>>();
        data[i] = buf.Data();
      } else {
        data[i] = nullptr;
      }
    }

    // Direct synchronous call
    result = av_audio_fifo_write(fifo_, data, nb_samples);

    av_free(data);
  }
  // Handle single buffer (interleaved format)
  else if (info[0].IsBuffer()) {
    if (!ValidateBufferCount(env, 1)) {
      return env.Undefined();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    void* data[1] = { buffer.Data() };

    // Direct synchronous call
    result = av_audio_fifo_write(fifo_, data, nb_samples);
  }
  else {
    Napi::TypeError::New(env, "Expected Buffer or Array of Buffers").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  return Napi::Number::New(env, result);
}

Napi::Value AudioFifo::ReadSync(const Napi::CallbackInfo& info) {
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
  int result = 0;

  // Handle array of buffers (one per channel for planar formats)
  if (info[0].IsArray()) {
    Napi::Array dataArray = info[0].As<Napi::Array>();

    if (!ValidateBufferCount(env, dataArray.Length())) {
      return env.Undefined();
    }

    void** data = static_cast<void**>(av_malloc(dataArray.Length() * sizeof(void*)));
    if (!data) {
      Napi::Error::New(env, "Out of memory").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    for (uint32_t i = 0; i < dataArray.Length(); i++) {
      if (dataArray.Get(i).IsBuffer()) {
        Napi::Buffer<uint8_t> buf = dataArray.Get(i).As<Napi::Buffer<uint8_t>>();
        data[i] = buf.Data();
      } else {
        data[i] = nullptr;
      }
    }

    // Direct synchronous call
    result = av_audio_fifo_read(fifo_, data, nb_samples);

    av_free(data);
  }
  // Handle single buffer (interleaved format)
  else if (info[0].IsBuffer()) {
    if (!ValidateBufferCount(env, 1)) {
      return env.Undefined();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    void* data[1] = { buffer.Data() };

    // Direct synchronous call
    result = av_audio_fifo_read(fifo_, data, nb_samples);
  }
  else {
    Napi::TypeError::New(env, "Expected Buffer or Array of Buffers").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  return Napi::Number::New(env, result);
}

Napi::Value AudioFifo::PeekSync(const Napi::CallbackInfo& info) {
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
  int result = 0;

  // Handle array of buffers (one per channel for planar formats)
  if (info[0].IsArray()) {
    Napi::Array dataArray = info[0].As<Napi::Array>();

    if (!ValidateBufferCount(env, dataArray.Length())) {
      return env.Undefined();
    }

    void** data = static_cast<void**>(av_malloc(dataArray.Length() * sizeof(void*)));
    if (!data) {
      Napi::Error::New(env, "Out of memory").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    for (uint32_t i = 0; i < dataArray.Length(); i++) {
      if (dataArray.Get(i).IsBuffer()) {
        Napi::Buffer<uint8_t> buf = dataArray.Get(i).As<Napi::Buffer<uint8_t>>();
        data[i] = buf.Data();
      } else {
        data[i] = nullptr;
      }
    }

    // Direct synchronous call
    result = av_audio_fifo_peek(fifo_, data, nb_samples);

    av_free(data);
  }
  // Handle single buffer (interleaved format)
  else if (info[0].IsBuffer()) {
    if (!ValidateBufferCount(env, 1)) {
      return env.Undefined();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    void* data[1] = { buffer.Data() };

    // Direct synchronous call
    result = av_audio_fifo_peek(fifo_, data, nb_samples);
  }
  else {
    Napi::TypeError::New(env, "Expected Buffer or Array of Buffers").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  return Napi::Number::New(env, result);
}

} // namespace ffmpeg