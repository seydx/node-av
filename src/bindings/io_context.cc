#include "io_context.h"
#include <libavutil/error.h>
#include <libavutil/mem.h>
#include <future>
#include <cstring>
#include <thread>

namespace ffmpeg {

thread_local Napi::FunctionReference IOContext::constructor;

Napi::Object IOContext::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "IOContext", {
    InstanceMethod<&IOContext::AllocContext>("allocContext"),
    InstanceMethod<&IOContext::AllocContextWithCallbacks>("allocContextWithCallbacks"),
    InstanceMethod<&IOContext::FreeContext>("freeContext"),
    InstanceMethod<&IOContext::Open2Async>("open2"),
    InstanceMethod<&IOContext::Open2Sync>("open2Sync"),
    InstanceMethod<&IOContext::ClosepAsync>("closep"),
    InstanceMethod<&IOContext::ClosepSync>("closepSync"),
    InstanceMethod<&IOContext::ReadAsync>("read"),
    InstanceMethod<&IOContext::ReadSync>("readSync"),
    InstanceMethod<&IOContext::WriteAsync>("write"),
    InstanceMethod<&IOContext::WriteSync>("writeSync"),
    InstanceMethod<&IOContext::SeekAsync>("seek"),
    InstanceMethod<&IOContext::SeekSync>("seekSync"),
    InstanceMethod<&IOContext::SizeAsync>("size"),
    InstanceMethod<&IOContext::SizeSync>("sizeSync"),
    InstanceMethod<&IOContext::FlushAsync>("flush"),
    InstanceMethod<&IOContext::FlushSync>("flushSync"),
    InstanceMethod<&IOContext::SkipAsync>("skip"),
    InstanceMethod<&IOContext::SkipSync>("skipSync"),
    InstanceMethod<&IOContext::Tell>("tell"),
    InstanceMethod(Napi::Symbol::WellKnown(env, "asyncDispose"), &IOContext::AsyncDispose),
    InstanceMethod(Napi::Symbol::WellKnown(env, "dispose"), &IOContext::SyncDispose),

    InstanceAccessor<&IOContext::GetEof, nullptr>("eof"),
    InstanceAccessor<&IOContext::GetError, nullptr>("error"),
    InstanceAccessor<&IOContext::GetSeekable, nullptr>("seekable"),
    InstanceAccessor("maxPacketSize", &IOContext::GetMaxPacketSize, &IOContext::SetMaxPacketSize, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("direct", &IOContext::GetDirect, &IOContext::SetDirect, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&IOContext::GetPos, nullptr>("pos"),
    InstanceAccessor<&IOContext::GetBufferSize, nullptr>("bufferSize"),
    InstanceAccessor<&IOContext::GetWriteFlag, nullptr>("writeFlag"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("IOContext", func);
  return exports;
}

IOContext::IOContext(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<IOContext>(info),
    ctx_(nullptr) {
  // Constructor does nothing - user must call allocContext() or open2()
}

IOContext::~IOContext() {
  // Clean up callbacks first
  CleanupCallbacks();
  
  // Don't automatically free anything in destructor
  // The user must explicitly call freeContext() or closep()
  // This prevents double-free when FormatContext cleans up
  
  // if (ctx_) {
  //   #ifdef DEBUG
  //   fprintf(stderr, "WARNING: IOContext destructor called with non-null ctx_. Call freeContext() or closep() explicitly.\n");
  //   #endif
  // }
  
  // Clear pointer without freeing
  ctx_ = nullptr;
}

int IOContext::ReadPacket(void* opaque, uint8_t* buf, int buf_size) {
  CallbackData* data = static_cast<CallbackData*>(opaque);
  if (!data || !data->active || !data->has_read_callback) {
    return AVERROR_EOF;
  }

  // Try direct call first (for synchronous operations in main thread)
  // IMPORTANT: Only use direct call if we're in the same thread where callbacks were registered
  if (data->env && !data->read_callback_direct.IsEmpty() &&
      std::this_thread::get_id() == data->main_thread_id) {
    try {
      Napi::Env env(data->env);
      Napi::HandleScope scope(env);

      Napi::Value result = data->read_callback_direct.Call({Napi::Number::New(env, buf_size)});

      if (result.IsNull() || result.IsUndefined()) {
        return AVERROR_EOF;
      } else if (result.IsBuffer()) {
        Napi::Buffer<uint8_t> buffer = result.As<Napi::Buffer<uint8_t>>();
        int bytes_read = std::min(static_cast<int>(buffer.Length()), buf_size);
        memcpy(buf, buffer.Data(), bytes_read);
        return bytes_read;
      } else if (result.IsNumber()) {
        // Error code
        return result.As<Napi::Number>().Int32Value();
      } else {
        return AVERROR(EINVAL);
      }
    } catch (const Napi::Error& e) {
      // Direct call failed (likely not in main thread or exception thrown)
      // Fall through to ThreadSafeFunction approach
    } catch (...) {
      // Unknown error
      return AVERROR(EIO);
    }
  }

  // Fallback to ThreadSafeFunction (for async operations or when not in main thread)
  // Use shared_ptr so the promise can outlive the callback (needed for async JS callbacks)
  auto promisePtr = std::make_shared<std::promise<int>>();
  std::future<int> future = promisePtr->get_future();

  auto callback = [promisePtr, buf, buf_size](Napi::Env env, Napi::Function jsCallback) {
    try {
      Napi::Value result = jsCallback.Call({Napi::Number::New(env, buf_size)});

      // Check if result is a Promise (has .then method)
      if (result.IsObject() && !result.IsBuffer() && !result.IsNull()) {
        Napi::Object obj = result.As<Napi::Object>();
        if (obj.Has("then") && obj.Get("then").IsFunction()) {
          // It's a Promise - attach .then() handler
          Napi::Function thenFn = obj.Get("then").As<Napi::Function>();

          // Create resolve handler - captures buf for memcpy
          auto onResolve = Napi::Function::New(env, [promisePtr, buf, buf_size](const Napi::CallbackInfo& info) {
            if (info.Length() == 0 || info[0].IsNull() || info[0].IsUndefined()) {
              promisePtr->set_value(AVERROR_EOF);
            } else if (info[0].IsBuffer()) {
              Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
              int bytes = std::min(static_cast<int>(buffer.Length()), buf_size);
              memcpy(buf, buffer.Data(), bytes);
              promisePtr->set_value(bytes);
            } else if (info[0].IsNumber()) {
              promisePtr->set_value(info[0].As<Napi::Number>().Int32Value());
            } else {
              promisePtr->set_value(AVERROR(EINVAL));
            }
          });

          // Create reject handler
          auto onReject = Napi::Function::New(env, [promisePtr](const Napi::CallbackInfo& info) {
            promisePtr->set_value(AVERROR(EIO));
          });

          thenFn.Call(obj, {onResolve, onReject});
          return; // Don't set promise value here - wait for .then()
        }
      }

      // Synchronous result
      if (result.IsNull() || result.IsUndefined()) {
        promisePtr->set_value(AVERROR_EOF);
      } else if (result.IsBuffer()) {
        Napi::Buffer<uint8_t> buffer = result.As<Napi::Buffer<uint8_t>>();
        int bytes_read = std::min(static_cast<int>(buffer.Length()), buf_size);
        memcpy(buf, buffer.Data(), bytes_read);
        promisePtr->set_value(bytes_read);
      } else if (result.IsNumber()) {
        promisePtr->set_value(result.As<Napi::Number>().Int32Value());
      } else {
        promisePtr->set_value(AVERROR(EINVAL));
      }
    } catch (...) {
      promisePtr->set_value(AVERROR(EIO));
    }
  };

  napi_status status = data->read_callback.BlockingCall(callback);
  if (status != napi_ok) {
    return AVERROR(EIO);
  }

  return future.get();
}

int IOContext::WritePacket(void* opaque, const uint8_t* buf, int buf_size) {
  CallbackData* data = static_cast<CallbackData*>(opaque);
  if (!data || !data->active || !data->has_write_callback) {
    return AVERROR(ENOSYS);
  }

  // Try direct call first (for synchronous operations in main thread)
  // IMPORTANT: Only use direct call if we're in the same thread where callbacks were registered
  if (data->env && !data->write_callback_direct.IsEmpty() &&
      std::this_thread::get_id() == data->main_thread_id) {
    try {
      Napi::Env env(data->env);
      Napi::HandleScope scope(env);

      Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, const_cast<uint8_t*>(buf), buf_size);
      Napi::Value result = data->write_callback_direct.Call({buffer});

      if (result.IsNumber()) {
        return result.As<Napi::Number>().Int32Value();
      }
      return buf_size;  // Assume all bytes written
    } catch (const Napi::Error& e) {
      // Direct call failed (likely not in main thread or exception thrown)
      // Fall through to ThreadSafeFunction approach
    } catch (...) {
      // Unknown error
      return AVERROR(EIO);
    }
  }

  // Fallback to ThreadSafeFunction (for async operations or when not in main thread)
  // Use shared_ptr so the promise can outlive the callback (needed for async JS callbacks)
  auto promisePtr = std::make_shared<std::promise<int>>();
  std::future<int> future = promisePtr->get_future();

  auto callback = [promisePtr, buf, buf_size](Napi::Env env, Napi::Function jsCallback) {
    try {
      Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, const_cast<uint8_t*>(buf), buf_size);
      Napi::Value result = jsCallback.Call({buffer});

      // Check if result is a Promise (has .then method)
      if (result.IsObject()) {
        Napi::Object obj = result.As<Napi::Object>();
        if (obj.Has("then") && obj.Get("then").IsFunction()) {
          // It's a Promise - attach .then() handler
          Napi::Function thenFn = obj.Get("then").As<Napi::Function>();

          // Create resolve handler
          auto onResolve = Napi::Function::New(env, [promisePtr, buf_size](const Napi::CallbackInfo& info) {
            int value = buf_size;
            if (info.Length() > 0 && info[0].IsNumber()) {
              value = info[0].As<Napi::Number>().Int32Value();
            }
            promisePtr->set_value(value);
          });

          // Create reject handler
          auto onReject = Napi::Function::New(env, [promisePtr](const Napi::CallbackInfo& info) {
            promisePtr->set_value(AVERROR(EIO));
          });

          thenFn.Call(obj, {onResolve, onReject});
          return; // Don't set promise value here - wait for .then()
        }
      }

      // Synchronous result
      if (result.IsNumber()) {
        promisePtr->set_value(result.As<Napi::Number>().Int32Value());
      } else {
        promisePtr->set_value(buf_size);  // Assume all bytes written
      }
    } catch (...) {
      promisePtr->set_value(AVERROR(EIO));
    }
  };

  napi_status status = data->write_callback.BlockingCall(callback);
  if (status != napi_ok) {
    return AVERROR(EIO);
  }

  return future.get();
}

int64_t IOContext::Seek(void* opaque, int64_t offset, int whence) {
  CallbackData* data = static_cast<CallbackData*>(opaque);
  if (!data || !data->active || !data->has_seek_callback) {
    return AVERROR(ENOSYS);
  }

  // Special case: AVSEEK_SIZE
  if (whence & AVSEEK_SIZE) {
    whence = AVSEEK_SIZE;
  }

  // Try direct call first (for synchronous operations in main thread)
  // IMPORTANT: Only use direct call if we're in the same thread where callbacks were registered
  if (data->env && !data->seek_callback_direct.IsEmpty() &&
      std::this_thread::get_id() == data->main_thread_id) {
    try {
      Napi::Env env(data->env);
      Napi::HandleScope scope(env);

      Napi::Value result = data->seek_callback_direct.Call({
        Napi::BigInt::New(env, offset),
        Napi::Number::New(env, whence)
      });

      if (result.IsBigInt()) {
        bool lossless;
        return result.As<Napi::BigInt>().Int64Value(&lossless);
      } else if (result.IsNumber()) {
        return static_cast<int64_t>(result.As<Napi::Number>().Int64Value());
      } else {
        return AVERROR(EINVAL);
      }
    } catch (const Napi::Error& e) {
      // Direct call failed (likely not in main thread or exception thrown)
      // Fall through to ThreadSafeFunction approach
    } catch (...) {
      // Unknown error
      return AVERROR(EIO);
    }
  }

  // Fallback to ThreadSafeFunction (for async operations or when not in main thread)
  // Use shared_ptr so the promise can outlive the callback (needed for async JS callbacks)
  auto promisePtr = std::make_shared<std::promise<int64_t>>();
  std::future<int64_t> future = promisePtr->get_future();

  auto callback = [promisePtr, offset, whence](Napi::Env env, Napi::Function jsCallback) {
    try {
      Napi::Value result = jsCallback.Call({
        Napi::BigInt::New(env, offset),
        Napi::Number::New(env, whence)
      });

      // Check if result is a Promise (has .then method)
      if (result.IsObject() && !result.IsNull()) {
        Napi::Object obj = result.As<Napi::Object>();
        if (obj.Has("then") && obj.Get("then").IsFunction()) {
          // It's a Promise - attach .then() handler
          Napi::Function thenFn = obj.Get("then").As<Napi::Function>();

          // Create resolve handler
          auto onResolve = Napi::Function::New(env, [promisePtr](const Napi::CallbackInfo& info) {
            int64_t value = AVERROR(EINVAL);
            if (info.Length() > 0) {
              if (info[0].IsBigInt()) {
                bool lossless;
                value = info[0].As<Napi::BigInt>().Int64Value(&lossless);
              } else if (info[0].IsNumber()) {
                value = static_cast<int64_t>(info[0].As<Napi::Number>().Int64Value());
              }
            }
            promisePtr->set_value(value);
          });

          // Create reject handler
          auto onReject = Napi::Function::New(env, [promisePtr](const Napi::CallbackInfo& info) {
            promisePtr->set_value(static_cast<int64_t>(AVERROR(EIO)));
          });

          thenFn.Call(obj, {onResolve, onReject});
          return; // Don't set promise value here - wait for .then()
        }
      }

      // Synchronous result
      if (result.IsBigInt()) {
        bool lossless;
        promisePtr->set_value(result.As<Napi::BigInt>().Int64Value(&lossless));
      } else if (result.IsNumber()) {
        promisePtr->set_value(static_cast<int64_t>(result.As<Napi::Number>().Int64Value()));
      } else {
        promisePtr->set_value(static_cast<int64_t>(AVERROR(EINVAL)));
      }
    } catch (...) {
      promisePtr->set_value(static_cast<int64_t>(AVERROR(EIO)));
    }
  };

  napi_status status = data->seek_callback.BlockingCall(callback);
  if (status != napi_ok) {
    return AVERROR(EIO);
  }

  return future.get();
}

bool IOContext::GuardOps(Napi::Env env) {
  if (async_ops_.Active() == 0) {
    return true;
  }
  // Callback-backed contexts: an in-flight operation may be parked in a
  // ThreadSafeFunction BlockingCall that needs THIS (main) thread's event
  // loop to run the JS callback. Waiting here would block the event loop and
  // guarantee the timeout - fail fast with a defined error instead.
  if (callback_data_) {
    Napi::Error::New(env, "IOContext is busy: async operations still in flight - await them before freeing").ThrowAsJavaScriptException();
    return false;
  }
  // File/URL-backed contexts complete on the threadpool without the main
  // thread - a bounded wait is safe here.
  return GuardAsyncOps(env, async_ops_, "IOContext");
}

void IOContext::CleanupCallbacks() {
  if (callback_data_ && callback_data_->active) {
    callback_data_->active = false;
    if (callback_data_->has_read_callback) {
      callback_data_->read_callback.Release();
      callback_data_->read_callback_direct.Reset();
      callback_data_->has_read_callback = false;
    }
    if (callback_data_->has_write_callback) {
      callback_data_->write_callback.Release();
      callback_data_->write_callback_direct.Reset();
      callback_data_->has_write_callback = false;
    }
    if (callback_data_->has_seek_callback) {
      callback_data_->seek_callback.Release();
      callback_data_->seek_callback_direct.Reset();
      callback_data_->has_seek_callback = false;
    }
    callback_data_.reset();
  }
}

Napi::Value IOContext::AllocContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (bufferSize, writeFlag)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (Get()) {
    Napi::Error::New(env, "IOContext already allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Replacing the context frees ctx_->buffer + context below - wait for
  // in-flight async operations (e.g. a racing open2) first
  if (!GuardOps(env)) {
    return env.Undefined();
  }

  int buffer_size = info[0].As<Napi::Number>().Int32Value();
  int write_flag = info[1].As<Napi::Number>().Int32Value();
  
  // Allocate buffer
  unsigned char* buffer = static_cast<unsigned char*>(av_malloc(buffer_size));
  if (!buffer) {
    Napi::Error::New(env, "Failed to allocate buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Create AVIOContext without callbacks
  AVIOContext* new_ctx = avio_alloc_context(
    buffer, 
    buffer_size,
    write_flag,
    nullptr, // opaque pointer - no callbacks
    nullptr, // read_packet - no custom read
    nullptr, // write_packet - no custom write  
    nullptr  // seek - no custom seek
  );
  
  if (!new_ctx) {
    av_free(buffer);
    Napi::Error::New(env, "Failed to allocate AVIOContext").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Free old context if exists (avio_context_free does not free the I/O buffer)
  if (ctx_) {
    av_free(ctx_->buffer);
    avio_context_free(&ctx_);
  }

  ctx_ = new_ctx;
  return env.Undefined();
}

Napi::Value IOContext::AllocContextWithCallbacks(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // Parameters: bufferSize, writeFlag, readCallback, writeCallback, seekCallback
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected at least bufferSize and writeFlag").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (!info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "bufferSize and writeFlag must be numbers").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Replacing the context frees ctx_->buffer + context below and releases the
  // previous callbacks - wait for in-flight async operations first (or error
  // immediately when one is parked on a callback)
  if (!GuardOps(env)) {
    return env.Undefined();
  }

  int buffer_size = info[0].As<Napi::Number>().Int32Value();
  int write_flag = info[1].As<Napi::Number>().Int32Value();

  // Allocate buffer (ownership passes to the AVIOContext; freed via ctx_->buffer,
  // never via a stale copy of this pointer - libavformat may replace the buffer)
  uint8_t* buffer = (uint8_t*)av_malloc(buffer_size);
  if (!buffer) {
    Napi::Error::New(env, "Failed to allocate buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Release previous callbacks before replacing them - leaked ThreadSafeFunctions
  // keep the event loop alive forever
  CleanupCallbacks();

  // Initialize callback data
  callback_data_ = std::make_unique<CallbackData>();
  callback_data_->io_context = this;
  callback_data_->env = env;  // Store env for direct calls
  callback_data_->main_thread_id = std::this_thread::get_id();  // Store thread ID for safety check
  callback_data_->active = true;

  // Setup callbacks
  int (*read_cb)(void*, uint8_t*, int) = nullptr;
  int (*write_cb)(void*, const uint8_t*, int) = nullptr;
  int64_t (*seek_cb)(void*, int64_t, int) = nullptr;

  // Read callback
  if (info.Length() > 2 && info[2].IsFunction()) {
    Napi::Function read_fn = info[2].As<Napi::Function>();
    callback_data_->read_callback = Napi::ThreadSafeFunction::New(
      env,
      read_fn,
      "IOReadCallback",
      0,  // Unlimited queue
      1   // One thread
    );
    // Don't hold the event loop open: a context the user never frees must not
    // prevent process exit; the TSFN stays callable as long as the process runs
    callback_data_->read_callback.Unref(env);
    callback_data_->read_callback_direct = Napi::Persistent(read_fn);
    callback_data_->has_read_callback = true;
    read_cb = ReadPacket;
  }

  // Write callback
  if (info.Length() > 3 && info[3].IsFunction()) {
    Napi::Function write_fn = info[3].As<Napi::Function>();
    callback_data_->write_callback = Napi::ThreadSafeFunction::New(
      env,
      write_fn,
      "IOWriteCallback",
      0,  // Unlimited queue
      1   // One thread
    );
    callback_data_->write_callback.Unref(env);
    callback_data_->write_callback_direct = Napi::Persistent(write_fn);
    callback_data_->has_write_callback = true;
    write_cb = WritePacket;
  }

  // Seek callback
  if (info.Length() > 4 && info[4].IsFunction()) {
    Napi::Function seek_fn = info[4].As<Napi::Function>();
    callback_data_->seek_callback = Napi::ThreadSafeFunction::New(
      env,
      seek_fn,
      "IOSeekCallback",
      0,  // Unlimited queue
      1   // One thread
    );
    callback_data_->seek_callback.Unref(env);
    callback_data_->seek_callback_direct = Napi::Persistent(seek_fn);
    callback_data_->has_seek_callback = true;
    seek_cb = Seek;
  }
  
  // Create AVIOContext with callbacks
  AVIOContext* new_ctx = avio_alloc_context(
    buffer,
    buffer_size,
    write_flag,
    callback_data_.get(),  // Pass callback data as opaque
    read_cb,
    write_cb,
    seek_cb
  );

  if (!new_ctx) {
    av_free(buffer);
    callback_data_.reset();
    Napi::Error::New(env, "Failed to allocate AVIOContext with callbacks").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Free old context if exists (avio_context_free does not free the I/O buffer)
  if (ctx_) {
    av_free(ctx_->buffer);
    avio_context_free(&ctx_);
  }

  ctx_ = new_ctx;
  return env.Undefined();
}

Napi::Value IOContext::FreeContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Freeing while a worker still uses the context on the threadpool would be
  // a use-after-free - wait bounded (or error immediately for callback-backed
  // contexts), then error instead of crashing
  if (!GuardOps(env)) {
    return env.Undefined();
  }

  // Clean up callbacks first if they exist
  CleanupCallbacks();

  if (ctx_) {
    // avio_context_free() frees only the struct, NOT the I/O buffer (avio.h:
    // "AVIOContext.buffer ... must be later freed with av_free()"). Free the
    // current ctx_->buffer pointer - libavformat may have replaced the buffer
    // originally passed to avio_alloc_context().
    av_free(ctx_->buffer);
    avio_context_free(&ctx_);
    ctx_ = nullptr;
  }

  return env.Undefined();
}

Napi::Value IOContext::Tell(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    Napi::Error::New(env, "IOContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int64_t pos = avio_tell(ctx);
  return Napi::BigInt::New(env, pos);
}

Napi::Value IOContext::GetEof(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Boolean::New(env, false);
  }
  
  return Napi::Boolean::New(env, avio_feof(ctx) != 0);
}

Napi::Value IOContext::GetError(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->error);
}

Napi::Value IOContext::GetSeekable(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->seekable);
}

Napi::Value IOContext::GetMaxPacketSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->max_packet_size);
}

void IOContext::SetMaxPacketSize(const Napi::CallbackInfo& info, const Napi::Value& value) {
  AVIOContext* ctx = Get();
  if (!ctx) {
    return;
  }
  
  ctx->max_packet_size = value.As<Napi::Number>().Int32Value();
}

Napi::Value IOContext::GetDirect(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->direct);
}

void IOContext::SetDirect(const Napi::CallbackInfo& info, const Napi::Value& value) {
  AVIOContext* ctx = Get();
  if (!ctx) {
    return;
  }
  
  ctx->direct = value.As<Napi::Number>().Int32Value();
}

Napi::Value IOContext::GetPos(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  
  return Napi::BigInt::New(env, static_cast<int64_t>(ctx->pos));
}

Napi::Value IOContext::GetBufferSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->buffer_size);
}

Napi::Value IOContext::GetWriteFlag(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVIOContext* ctx = Get();
  if (!ctx) {
    return Napi::Boolean::New(env, false);
  }
  
  return Napi::Boolean::New(env, ctx->write_flag != 0);
}

Napi::Value IOContext::AsyncDispose(const Napi::CallbackInfo& info) {
  // Check if this context was created with callbacks or opened with avio_open2
  // Contexts with callbacks should use freeContext, others use closep
  if (callback_data_) {
    // This context was created with allocContextWithCallbacks
    // We need to clean it up with freeContext, not closep
    // For now, we'll do synchronous cleanup and return a resolved promise
    Napi::Env env = info.Env();

    // Freeing while async operations are in flight would be a use-after-free
    if (!GuardOps(env)) {
      return env.Undefined();
    }

    // Clean up callbacks
    CleanupCallbacks();

    // Free the context if it exists (avio_context_free does not free the I/O buffer)
    if (ctx_) {
      av_free(ctx_->buffer);
      avio_context_free(&ctx_);
      ctx_ = nullptr;
    }

    // Return resolved promise
    auto deferred = Napi::Promise::Deferred::New(env);
    deferred.Resolve(env.Undefined());
    return deferred.Promise();
  } else {
    // This context was opened with avio_open2, use closep
    return ClosepAsync(info);
  }
}

Napi::Value IOContext::SyncDispose(const Napi::CallbackInfo& info) {
  if (callback_data_) {
    // Created with allocContextWithCallbacks — use freeContext logic
    // Freeing while async operations are in flight would be a use-after-free
    if (!GuardOps(info.Env())) {
      return info.Env().Undefined();
    }

    CleanupCallbacks();

    if (ctx_) {
      // avio_context_free does not free the I/O buffer
      av_free(ctx_->buffer);
      avio_context_free(&ctx_);
      ctx_ = nullptr;
    }
  } else {
    // Opened with avio_open2 — use closepSync logic
    return ClosepSync(info);
  }

  return info.Env().Undefined();
}

} // namespace ffmpeg