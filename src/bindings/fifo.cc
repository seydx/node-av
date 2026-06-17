#include "fifo.h"
#include "common.h"

extern "C" {
#include <libavutil/mem.h>
#include <libavutil/fifo.h>
}

namespace ffmpeg {

thread_local Napi::FunctionReference Fifo::constructor;

Napi::Object Fifo::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "Fifo", {
    InstanceMethod<&Fifo::Alloc>("alloc"),
    InstanceMethod<&Fifo::Free>("free"),
    InstanceMethod<&Fifo::WriteAsync>("write"),
    InstanceMethod<&Fifo::WriteSync>("writeSync"),
    InstanceMethod<&Fifo::ReadAsync>("read"),
    InstanceMethod<&Fifo::ReadSync>("readSync"),
    InstanceMethod<&Fifo::PeekAsync>("peek"),
    InstanceMethod<&Fifo::PeekSync>("peekSync"),
    InstanceMethod<&Fifo::Grow>("grow"),
    InstanceMethod<&Fifo::Reset>("reset"),
    InstanceMethod<&Fifo::SetAutoGrowLimit>("setAutoGrowLimit"),
    InstanceMethod(Napi::Symbol::WellKnown(env, "dispose"), &Fifo::Dispose),

    InstanceAccessor<&Fifo::GetSize>("size"),
    InstanceAccessor<&Fifo::GetCanRead>("canRead"),
    InstanceAccessor<&Fifo::GetCanWrite>("canWrite"),
    InstanceAccessor<&Fifo::GetElemSize>("elemSize"),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Fifo", func);
  return exports;
}

Fifo::Fifo(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<Fifo>(info) {
  // Constructor does nothing - user must explicitly call alloc()
}

Fifo::~Fifo() {
  // Manual cleanup if not already done
  if (fifo_) {
    av_fifo_freep2(&fifo_);
  }
}

Napi::Value Fifo::Alloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 or 3 arguments (nb_elems, elem_size, [flags])").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Free old fifo if exists
  if (fifo_) {
    av_fifo_freep2(&fifo_);
  }

  size_t nb_elems = static_cast<size_t>(info[0].As<Napi::Number>().Int64Value());
  size_t elem_size = static_cast<size_t>(info[1].As<Napi::Number>().Int64Value());
  unsigned int flags = 0;

  if (info.Length() >= 3) {
    flags = info[2].As<Napi::Number>().Uint32Value();
  }

  fifo_ = av_fifo_alloc2(nb_elems, elem_size, flags);

  if (!fifo_) {
    Napi::Error::New(env, "Failed to allocate Fifo").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  return env.Undefined();
}

Napi::Value Fifo::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (fifo_) {
    av_fifo_freep2(&fifo_);
  }

  return env.Undefined();
}

Napi::Value Fifo::Grow(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    Napi::Error::New(env, "Fifo not allocated").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (inc)").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  size_t inc = static_cast<size_t>(info[0].As<Napi::Number>().Int64Value());
  int ret = av_fifo_grow2(fifo_, inc);

  return Napi::Number::New(env, ret);
}

Napi::Value Fifo::Reset(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    Napi::Error::New(env, "Fifo not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  av_fifo_reset2(fifo_);

  return env.Undefined();
}

Napi::Value Fifo::SetAutoGrowLimit(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    Napi::Error::New(env, "Fifo not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (max_elems)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  size_t max_elems = static_cast<size_t>(info[0].As<Napi::Number>().Int64Value());
  av_fifo_auto_grow_limit(fifo_, max_elems);

  return env.Undefined();
}

Napi::Value Fifo::GetSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    return Napi::Number::New(env, 0);
  }

  return Napi::Number::New(env, static_cast<double>(av_fifo_can_read(fifo_)));
}

Napi::Value Fifo::GetCanRead(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    return Napi::Number::New(env, 0);
  }

  return Napi::Number::New(env, static_cast<double>(av_fifo_can_read(fifo_)));
}

Napi::Value Fifo::GetCanWrite(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    return Napi::Number::New(env, 0);
  }

  return Napi::Number::New(env, static_cast<double>(av_fifo_can_write(fifo_)));
}

Napi::Value Fifo::GetElemSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!fifo_) {
    return Napi::Number::New(env, 0);
  }

  return Napi::Number::New(env, static_cast<double>(av_fifo_elem_size(fifo_)));
}

Napi::Value Fifo::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}

} // namespace ffmpeg
