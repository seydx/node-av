#ifndef FFMPEG_COMMON_H
#define FFMPEG_COMMON_H

#include <napi.h>
#include <memory>
#include <string>

// Fix for glibc > 2.31 compatibility
// These _finite functions were removed but FFmpeg might still reference them
#ifdef __linux__
#include <math.h>
extern "C" {
  __attribute__((weak)) float __log2f_finite(float x) {
    return log2f(x);
  }
  __attribute__((weak)) double __log2_finite(double x) {
    return log2(x);
  }
  __attribute__((weak)) float __logf_finite(float x) {
    return logf(x);
  }
  __attribute__((weak)) double __log_finite(double x) {
    return log(x);
  }
  __attribute__((weak)) float __expf_finite(float x) {
    return expf(x);
  }
  __attribute__((weak)) double __exp_finite(double x) {
    return exp(x);
  }
  __attribute__((weak)) float __exp2f_finite(float x) {
    return exp2f(x);
  }
  __attribute__((weak)) double __exp2_finite(double x) {
    return exp2(x);
  }
  __attribute__((weak)) float __powf_finite(float x, float y) {
    return powf(x, y);
  }
  __attribute__((weak)) double __pow_finite(double x, double y) {
    return pow(x, y);
  }
}
#endif

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavfilter/avfilter.h>
#include <libavutil/avutil.h>
#include <libavutil/buffer.h>
#include <libavutil/dict.h>
#include <libavutil/error.h>
#include <libavutil/rational.h>
#include <libswscale/swscale.h>
#include <libswresample/swresample.h>
}

namespace ffmpeg {

inline AVRational JSToRational(const Napi::Object& obj) {
  AVRational r;
  r.num = obj.Get("num").As<Napi::Number>().Int32Value();
  r.den = obj.Get("den").As<Napi::Number>().Int32Value();
  return r;
}

inline Napi::Object RationalToJS(const Napi::Env& env, const AVRational& r) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("num", Napi::Number::New(env, r.num));
  obj.Set("den", Napi::Number::New(env, r.den));
  return obj;
}

template<typename T>
T* UnwrapNativeObject(const Napi::Env& env, const Napi::Value& value, const char* typeName) {
  if (!value.IsObject()) {
    return nullptr;
  }

  Napi::Object obj = value.As<Napi::Object>();

  // napi_unwrap returns the wrapped pointer for ANY ObjectWrap instance regardless
  // of its class, so an instanceof check is required before reinterpreting it as T.
  // Deliberately does not throw: callers throw their own TypeError on nullptr, and a
  // second ThrowAsJavaScriptException while one is pending is fatal with
  // NAPI_DISABLE_CPP_EXCEPTIONS.
  if (T::constructor.IsEmpty() || !obj.InstanceOf(T::constructor.Value())) {
    return nullptr;
  }

  return Napi::ObjectWrap<T>::Unwrap(obj);
}

} // namespace ffmpeg

#endif // FFMPEG_COMMON_H