#include "io_context.h"
#include "promise_worker.h"
#include <napi.h>
#include <memory>
#include <vector>

extern "C" {
#include <libavformat/avio.h>
}

namespace ffmpeg {

class IOClosepWorker : public Napi::AsyncWorker {
public:
  IOClosepWorker(Napi::Env env, Napi::Object ctxObj, IOContext* ctx)
    : Napi::AsyncWorker(env),
      ops_(&ctx->async_ops_),
      ctx_(ctx),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold reference to prevent GC during async operation
    ctx_ref_.Reset(ctxObj, 1);
    ops_->Begin();
  }

  ~IOClosepWorker() {
    ctx_ref_.Reset();
  }

  void Execute() override {
    AVIOContext* ctx = ctx_->Get();
    if (ctx) {
      // Mark callbacks as inactive to prevent further calls
      // We can't release ThreadSafeFunctions from worker thread
      if (ctx_->callback_data_) {
        ctx_->callback_data_->active = false;
      }

      ret_ = avio_closep(&ctx);
      // avio_closep freed the context and set the pointer to NULL
      // Update our internal state
      ctx_->ctx_ = nullptr;
    }
    // Release before OnOK: the context is not touched past this point, so a
    // GuardOps() wait on the main thread can proceed even though the OnOK
    // callback is still queued behind it
    if (ops_) {
      ops_->End();
      ops_ = nullptr;
    }
  }

  void OnOK() override {
    // Clean up callbacks on the main thread after closep succeeds
    ctx_->CleanupCallbacks();
    deferred_.Resolve(Napi::Number::New(Env(), ret_));
  }

  void OnError(const Napi::Error& e) override {
    if (ops_) {
      ops_->End();
      ops_ = nullptr;
    }
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference ctx_ref_;
  AsyncOpCounter* ops_;
  IOContext* ctx_;
  int ret_;
  Napi::Promise::Deferred deferred_;
};

Napi::Value IOContext::Open2Async(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (url, flags)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (ctx_) {
    Napi::Error::New(env, "IOContext already initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string url = info[0].As<Napi::String>().Utf8Value();
  int flags = info[1].As<Napi::Number>().Int32Value();

  // The work fn writes the opened context back into self->ctx_ - safe because
  // the op counter keeps free/replace paths on the main thread waiting, and
  // the pin keeps the wrapper alive
  IOContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [self, url, flags]() {
    AVIOContext* avio_ctx = nullptr;
    int ret = avio_open2(&avio_ctx, url.c_str(), flags, nullptr, nullptr);
    if (ret >= 0) {
      // Free old context if exists
      if (self->ctx_) {
        avio_context_free(&self->ctx_);
      }
      self->ctx_ = avio_ctx;
    }
    return ret;
  });
}

Napi::Value IOContext::ClosepAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // closep frees the AVIOContext - wait for in-flight async operations first
  // (or error immediately when one is parked on a JS callback)
  if (!GuardOps(env)) {
    return env.Undefined();
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new IOClosepWorker(env, thisObj, this);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
}

Napi::Value IOContext::ReadAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (size)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int size = info[0].As<Napi::Number>().Int32Value();

  IOContext* self = this;
  auto buffer = std::make_shared<std::vector<uint8_t>>(static_cast<size_t>(size));
  return PromiseWorker::Run(
    env, &async_ops_, {info.This().As<Napi::Object>()},
    [self, buffer, size]() {
      // ctx_ is resolved at execute time (not queue time) so a read queued
      // right after open2() sees the freshly opened context
      AVIOContext* ctx = self->ctx_;
      if (!ctx) {
        return AVERROR(EINVAL);
      }
      return avio_read(ctx, buffer->data(), size);
    },
    [buffer](Napi::Env env, int ret) -> Napi::Value {
      if (ret < 0) {
        // Error case - return error code
        return Napi::Number::New(env, ret);
      }
      // Success case - return buffer
      return Napi::Buffer<uint8_t>::Copy(env, buffer->data(), ret);
    });
}

Napi::Value IOContext::WriteAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (buffer)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();

  // Copy the data since the JS buffer might be detached/freed before the
  // work runs
  auto data = std::make_shared<std::vector<uint8_t>>(buffer.Data(), buffer.Data() + buffer.Length());

  IOContext* self = this;
  return PromiseWorker::Run(
    env, &async_ops_, {info.This().As<Napi::Object>()},
    [self, data]() {
      AVIOContext* ctx = self->ctx_;
      if (!ctx) {
        return 0;
      }
      avio_write(ctx, data->data(), static_cast<int>(data->size()));
      return 0;
    },
    [](Napi::Env env, int) -> Napi::Value {
      return env.Undefined();
    });
}

Napi::Value IOContext::SeekAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (offset, whence)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  bool lossless;
  int64_t offset = info[0].As<Napi::BigInt>().Int64Value(&lossless);
  int whence = info[1].As<Napi::Number>().Int32Value();

  IOContext* self = this;
  auto new_pos = std::make_shared<int64_t>(0);
  return PromiseWorker::Run(
    env, &async_ops_, {info.This().As<Napi::Object>()},
    [self, new_pos, offset, whence]() {
      AVIOContext* ctx = self->ctx_;
      *new_pos = ctx ? avio_seek(ctx, offset, whence) : AVERROR(EINVAL);
      return 0;
    },
    [new_pos](Napi::Env env, int) -> Napi::Value {
      return Napi::BigInt::New(env, *new_pos);
    });
}

Napi::Value IOContext::SizeAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  IOContext* self = this;
  auto size = std::make_shared<int64_t>(0);
  return PromiseWorker::Run(
    env, &async_ops_, {info.This().As<Napi::Object>()},
    [self, size]() {
      AVIOContext* ctx = self->ctx_;
      *size = ctx ? avio_size(ctx) : AVERROR(EINVAL);
      return 0;
    },
    [size](Napi::Env env, int) -> Napi::Value {
      return Napi::BigInt::New(env, *size);
    });
}

Napi::Value IOContext::FlushAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  IOContext* self = this;
  return PromiseWorker::Run(
    env, &async_ops_, {info.This().As<Napi::Object>()},
    [self]() {
      AVIOContext* ctx = self->ctx_;
      if (ctx) {
        avio_flush(ctx);
      }
      return 0;
    },
    [](Napi::Env env, int) -> Napi::Value {
      return env.Undefined();
    });
}

Napi::Value IOContext::SkipAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (offset)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  bool lossless;
  int64_t offset = info[0].As<Napi::BigInt>().Int64Value(&lossless);

  IOContext* self = this;
  auto new_pos = std::make_shared<int64_t>(0);
  return PromiseWorker::Run(
    env, &async_ops_, {info.This().As<Napi::Object>()},
    [self, new_pos, offset]() {
      AVIOContext* ctx = self->ctx_;
      *new_pos = ctx ? avio_skip(ctx, offset) : AVERROR(EINVAL);
      return 0;
    },
    [new_pos](Napi::Env env, int) -> Napi::Value {
      return Napi::BigInt::New(env, *new_pos);
    });
}

} // namespace ffmpeg
