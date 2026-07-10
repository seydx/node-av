#include "software_resample_context.h"
#include "promise_worker.h"
#include <napi.h>
#include <array>

extern "C" {
#include <libswresample/swresample.h>
}

namespace ffmpeg {

static std::array<uint8_t*, 8> ParseBuffers(Napi::Array arr) {
  std::array<uint8_t*, 8> ptrs = {nullptr};
  for (uint32_t i = 0; i < arr.Length() && i < 8; i++) {
    Napi::Value val = arr[i];
    if (val.IsBuffer()) {
      ptrs[i] = val.As<Napi::Buffer<uint8_t>>().Data();
    }
  }
  return ptrs;
}

Napi::Value SoftwareResampleContext::ConvertAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    Napi::TypeError::New(env, "SoftwareResampleContext is not initialized").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (info.Length() < 4) {
    Napi::TypeError::New(env, "Expected 4 arguments (out, out_count, in, in_count)").ThrowAsJavaScriptException();
    return env.Null();
  }

  int out_count = info[1].As<Napi::Number>().Int32Value();
  int in_count = info[3].As<Napi::Number>().Int32Value();

  Napi::Array outArray = info[0].IsNull() ? Napi::Array::New(env) :
                         info[0].IsArray() ? info[0].As<Napi::Array>() : Napi::Array::New(env);
  Napi::Array inArray = info[2].IsNull() ? Napi::Array::New(env) :
                        info[2].IsArray() ? info[2].As<Napi::Array>() : Napi::Array::New(env);

  SwrContext* ctx = ctx_;
  std::array<uint8_t*, 8> out_ptrs = ParseBuffers(outArray);
  std::array<uint8_t*, 8> in_ptrs = ParseBuffers(inArray);

  return PromiseWorker::Run(env, &async_ops_,
                            {info.This().As<Napi::Object>(), outArray.As<Napi::Object>(), inArray.As<Napi::Object>()},
                            [ctx, out_ptrs, in_ptrs, out_count, in_count]() mutable {
    return swr_convert(ctx, out_ptrs.data(), out_count, const_cast<const uint8_t**>(in_ptrs.data()), in_count);
  });
}

} // namespace ffmpeg
