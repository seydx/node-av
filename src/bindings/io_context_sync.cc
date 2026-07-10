#include "io_context.h"
#include <napi.h>
#include <libavformat/avio.h>

namespace ffmpeg {

Napi::Value IOContext::Open2Sync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected at least 1 argument (url)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Opening over an existing context would leak it (mirrors open2)
  if (ctx_) {
    Napi::Error::New(env, "IOContext already initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string url = info[0].As<Napi::String>().Utf8Value();
  int flags = AVIO_FLAG_READ;
  if (info.Length() >= 2 && info[1].IsNumber()) {
    flags = info[1].As<Napi::Number>().Int32Value();
  }

  // Direct FFmpeg call
  AVIOContext* avio_ctx = nullptr;
  int ret = avio_open2(&avio_ctx, url.c_str(), flags, nullptr, nullptr);

  if (ret < 0) {
    return Napi::Number::New(env, ret);
  }

  // Store the newly opened context
  ctx_ = avio_ctx;

  return Napi::Number::New(env, 0);
}

Napi::Value IOContext::ReadSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (size)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  AVIOContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "IOContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int size = info[0].As<Napi::Number>().Int32Value();

  // Allocate buffer
  std::vector<uint8_t> buffer(size);

  // Direct FFmpeg call
  int bytes_read = avio_read(ctx, buffer.data(), size);

  if (bytes_read < 0) {
    // Error case - return error code
    return Napi::Number::New(env, bytes_read);
  } else {
    // Success case - return buffer with actual bytes read
    return Napi::Buffer<uint8_t>::Copy(env, buffer.data(), bytes_read);
  }
}

Napi::Value IOContext::WriteSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (buffer)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  AVIOContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "IOContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();

  // Direct FFmpeg call
  avio_write(ctx, buffer.Data(), buffer.Length());

  return env.Undefined();
}

Napi::Value IOContext::SeekSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (offset, whence)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  AVIOContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "IOContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  bool lossless;
  int64_t offset = info[0].As<Napi::BigInt>().Int64Value(&lossless);
  int whence = info[1].As<Napi::Number>().Int32Value();

  // Direct FFmpeg call
  int64_t new_pos = avio_seek(ctx, offset, whence);

  return Napi::BigInt::New(env, new_pos);
}

Napi::Value IOContext::ClosepSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }

  // Closing while an async op still uses the context would be a use-after-free
  if (!GuardOps(env)) {
    return env.Undefined();
  }

  // Mark callbacks as inactive
  if (callback_data_) {
    callback_data_->active = false;
  }

  // Direct FFmpeg call
  int ret = avio_closep(&ctx);

  // Update internal state
  ctx_ = nullptr;

  // Clean up callbacks on the main thread
  CleanupCallbacks();

  return Napi::Number::New(env, ret);
}

Napi::Value IOContext::SizeSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVIOContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "IOContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Direct FFmpeg call
  int64_t size = avio_size(ctx);

  return Napi::BigInt::New(env, size);
}

Napi::Value IOContext::FlushSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVIOContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "IOContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Direct FFmpeg call
  avio_flush(ctx);

  return env.Undefined();
}

Napi::Value IOContext::SkipSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (offset)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  AVIOContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "IOContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  bool lossless;
  int64_t offset = info[0].As<Napi::BigInt>().Int64Value(&lossless);

  // Direct FFmpeg call
  int64_t new_pos = avio_skip(ctx, offset);

  return Napi::BigInt::New(env, new_pos);
}

} // namespace ffmpeg