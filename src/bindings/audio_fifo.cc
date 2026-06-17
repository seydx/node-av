#include "audio_fifo.h"
#include "common.h"

extern "C" {
#include <libavutil/mem.h>
#include <libavutil/audio_fifo.h>
}

namespace ffmpeg {

thread_local Napi::FunctionReference AudioFifo::constructor;

Napi::Object AudioFifo::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "AudioFifo", {
    InstanceMethod<&AudioFifo::Alloc>("alloc"),
    InstanceMethod<&AudioFifo::Free>("free"),
    InstanceMethod<&AudioFifo::WriteAsync>("write"),
    InstanceMethod<&AudioFifo::WriteSync>("writeSync"),
    InstanceMethod<&AudioFifo::ReadAsync>("read"),
    InstanceMethod<&AudioFifo::ReadSync>("readSync"),
    InstanceMethod<&AudioFifo::PeekAsync>("peek"),
    InstanceMethod<&AudioFifo::PeekSync>("peekSync"),
    InstanceMethod<&AudioFifo::Drain>("drain"),
    InstanceMethod<&AudioFifo::Reset>("reset"),
    InstanceMethod<&AudioFifo::Realloc>("realloc"),
    InstanceMethod(Napi::Symbol::WellKnown(env, "dispose"), &AudioFifo::Dispose),

    InstanceAccessor<&AudioFifo::GetSize>("size"),
    InstanceAccessor<&AudioFifo::GetSpace>("space"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("AudioFifo", func);
  return exports;
}

AudioFifo::AudioFifo(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<AudioFifo>(info) {
  // Constructor does nothing - user must explicitly call alloc()
}

AudioFifo::~AudioFifo() {
  // Manual cleanup if not already done
  if (fifo_) {
    av_audio_fifo_free(fifo_);
    fifo_ = nullptr;
  }
}

Napi::Value AudioFifo::Alloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Expected 3 arguments (sample_fmt, channels, nb_samples)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Free old fifo if exists
  if (fifo_) {
    av_audio_fifo_free(fifo_);
  }
  
  AVSampleFormat sample_fmt = static_cast<AVSampleFormat>(info[0].As<Napi::Number>().Int32Value());
  int channels = info[1].As<Napi::Number>().Int32Value();
  int nb_samples = info[2].As<Napi::Number>().Int32Value();
  
  fifo_ = av_audio_fifo_alloc(sample_fmt, channels, nb_samples);
  
  if (!fifo_) {
    Napi::Error::New(env, "Failed to allocate AudioFifo").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  return env.Undefined();
}

Napi::Value AudioFifo::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (fifo_) {
    av_audio_fifo_free(fifo_);
    fifo_ = nullptr;
  }
  
  return env.Undefined();
}

Napi::Value AudioFifo::Drain(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!fifo_) {
    Napi::Error::New(env, "AudioFifo not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (nb_samples)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int nb_samples = info[0].As<Napi::Number>().Int32Value();
  av_audio_fifo_drain(fifo_, nb_samples);
  
  return env.Undefined();
}

Napi::Value AudioFifo::Reset(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!fifo_) {
    Napi::Error::New(env, "AudioFifo not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  av_audio_fifo_reset(fifo_);
  
  return env.Undefined();
}

Napi::Value AudioFifo::Realloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!fifo_) {
    Napi::Error::New(env, "AudioFifo not allocated").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (nb_samples)").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int nb_samples = info[0].As<Napi::Number>().Int32Value();
  int ret = av_audio_fifo_realloc(fifo_, nb_samples);
  
  return Napi::Number::New(env, ret);
}

Napi::Value AudioFifo::GetSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!fifo_) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, av_audio_fifo_size(fifo_));
}

Napi::Value AudioFifo::GetSpace(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!fifo_) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, av_audio_fifo_space(fifo_));
}

Napi::Value AudioFifo::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}

} // namespace ffmpeg