#include "format_context.h"
#include "packet.h"
#include "input_format.h"
#include "output_format.h"
#include "dictionary.h"
#include "common.h"
#include "promise_worker.h"
#include <napi.h>
#include <memory>
#include <thread>
#include <chrono>

extern "C" {
#include <libavformat/avformat.h>
}

namespace ffmpeg {

Napi::Value FormatContext::OpenInputAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "URL required").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // avformat_open_input() frees a pre-allocated context (custom I/O) on
  // failure - wait for in-flight async operations that may still use it
  // (use-after-free guard)
  if (ctx_ && !GuardAsyncOps(env, async_ops_, "FormatContext")) {
    return env.Undefined();
  }

  std::string url = info[0].As<Napi::String>().Utf8Value();
  AVInputFormat* fmt = nullptr;
  AVDictionary* options = nullptr;

  if (info.Length() > 1 && !info[1].IsNull() && !info[1].IsUndefined()) {
    InputFormat* inputFormat = UnwrapNativeObject<InputFormat>(env, info[1], "InputFormat");
    if (!inputFormat) {
      // Throw before the worker is created - napi_create_promise crashes with a pending exception
      Napi::TypeError::New(env, "Invalid InputFormat object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    fmt = const_cast<AVInputFormat*>(inputFormat->Get());
  }

  if (info.Length() > 2 && !info[2].IsNull() && !info[2].IsUndefined()) {
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, info[2], "Dictionary");
    if (!dict) {
      Napi::TypeError::New(env, "Invalid Dictionary object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (dict->Get()) {
      av_dict_copy(&options, dict->Get(), 0);
    }
  }

  // std::function requires copyable captures - hold the dictionary copy in a
  // shared_ptr whose deleter frees whatever avformat_open_input left
  // unconsumed (runs on the main thread when the worker is destroyed)
  auto optionsHolder = std::shared_ptr<AVDictionary*>(new AVDictionary*(options), [](AVDictionary** opts) {
    if (*opts) {
      av_dict_free(opts);
    }
    delete opts;
  });

  FormatContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [self, url, fmt, optionsHolder]() {
    std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_, std::defer_lock);
    if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
      return AVERROR(EBUSY);
    }
    // If we already have a context (e.g., for custom I/O), use it
    AVFormatContext* ctx = self->ctx_;

    // For custom I/O, pass NULL as URL
    const char* urlPtr = nullptr;
    if (!url.empty() && url != "dummy") {
      urlPtr = url.c_str();
    }

    int ret = avformat_open_input(&ctx, urlPtr, fmt, *optionsHolder ? optionsHolder.get() : nullptr);

    // Always update — on failure, avformat_open_input frees ctx and sets it to NULL.
    // Without this, self->ctx_ would be a dangling pointer after failure.
    // The pin keeps the wrapper alive and the op counter blocks free paths
    // until this returns, so writing wrapper state here is safe.
    self->ctx_ = ctx;

    if (ret >= 0) {
      self->is_output_ = false;
    }
    return ret;
  });
}

Napi::Value FormatContext::FindStreamInfoAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    Napi::Error::New(env, "FormatContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Build the per-stream options array on the JS thread — the worker thread
  // must not touch V8 objects. BuildStreamOptions copies each provided
  // Dictionary so the JS wrappers are never consumed by FFmpeg.
  std::vector<AVDictionary*> options;
  if (!BuildStreamOptions(env, info.Length() > 0 ? info[0] : env.Null(), ctx_->nb_streams, options)) {
    return env.Undefined();
  }

  // std::function requires copyable captures - hold the per-stream dictionary
  // copies in a shared_ptr whose deleter frees whatever FFmpeg left after
  // removing the consumed entries
  auto optionsHolder = std::shared_ptr<std::vector<AVDictionary*>>(
      new std::vector<AVDictionary*>(std::move(options)),
      [](std::vector<AVDictionary*>* opts) {
        FormatContext::FreeStreamOptions(*opts);
        delete opts;
      });

  FormatContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [self, optionsHolder]() {
    // Serializes FFmpeg calls on this context and pins it against close/free
    // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
    std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
    if (!self->ctx_) {
      return AVERROR(EINVAL);
    }

    // FFmpeg requires options to be an ic->nb_streams long array of
    // AVDictionary* (one entry per stream) — a single dictionary would be
    // read out of bounds. The array was built on the JS thread by
    // BuildStreamOptions with exactly nb_streams entries.
    return avformat_find_stream_info(self->ctx_, optionsHolder->empty() ? nullptr : optionsHolder->data());
  });
}

Napi::Value FormatContext::ReadFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Packet required").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Packet* packet = UnwrapNativeObject<Packet>(env, info[0], "Packet");
  if (!packet) {
    Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  FormatContext* self = this;
  return PromiseWorker::Run(
      env, &async_ops_, {info.This().As<Napi::Object>(), info[0].As<Napi::Object>()},
      [self, packet]() {
        // Serializes FFmpeg calls on this context and pins it against close/free
        // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
        std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
        // Check interrupt flag BEFORE calling av_read_frame()
        // The interrupt callback is only invoked during blocking I/O operations.
        // If packets are already buffered, av_read_frame() won't block and the
        // callback won't be called. We must manually check here.
        if (self->interrupt_requested_.load()) {
          return AVERROR_EXIT;
        }

        if (!self->ctx_) {
          return AVERROR(EINVAL);
        }

        // active_read_operations_ complements the op counter: it marks a reader
        // that may be BLOCKED inside av_read_frame(). Only the AVIO interrupt
        // callback can abort such a read - the op counter can merely wait for it.
        self->active_read_operations_.fetch_add(1);

        int ret = av_read_frame(self->ctx_, packet->Get());

        self->active_read_operations_.fetch_sub(1);
        return ret;
      },
      [packet](Napi::Env env, int ret) -> Napi::Value {
        // av_read_frame filled the packet's buffer on the worker thread; reconcile
        // V8 accounting now that we are back on the JS thread. The packet pin
        // keeps the wrapper alive until here.
        if (ret >= 0) {
          packet->SyncExternalMemory(env);
        }
        return Napi::Number::New(env, ret);
      });
}

Napi::Value FormatContext::SeekFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 3) {
    Napi::TypeError::New(env, "stream_index, timestamp, and flags required").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int stream_index = info[0].As<Napi::Number>().Int32Value();
  bool lossless;
  int64_t timestamp = info[1].As<Napi::BigInt>().Int64Value(&lossless);
  int flags = info[2].As<Napi::Number>().Int32Value();

  FormatContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [self, stream_index, timestamp, flags]() {
    // Serializes FFmpeg calls on this context and pins it against close/free
    // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
    std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
    if (!self->ctx_) {
      return AVERROR(EINVAL);
    }
    return av_seek_frame(self->ctx_, stream_index, timestamp, flags);
  });
}

Napi::Value FormatContext::SeekFileAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 5) {
    Napi::TypeError::New(env, "stream_index, min_ts, ts, max_ts, and flags required").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int stream_index = info[0].As<Napi::Number>().Int32Value();
  bool lossless;
  int64_t min_ts = info[1].As<Napi::BigInt>().Int64Value(&lossless);
  int64_t ts = info[2].As<Napi::BigInt>().Int64Value(&lossless);
  int64_t max_ts = info[3].As<Napi::BigInt>().Int64Value(&lossless);
  int flags = info[4].As<Napi::Number>().Int32Value();

  FormatContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [self, stream_index, min_ts, ts, max_ts, flags]() {
    // Serializes FFmpeg calls on this context and pins it against close/free
    // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
    std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
    if (!self->ctx_) {
      return AVERROR(EINVAL);
    }
    return avformat_seek_file(self->ctx_, stream_index, min_ts, ts, max_ts, flags);
  });
}

Napi::Value FormatContext::WriteHeaderAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVDictionary* options = nullptr;

  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, info[0], "Dictionary");
    if (!dict) {
      Napi::TypeError::New(env, "Invalid Dictionary object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (dict->Get()) {
      av_dict_copy(&options, dict->Get(), 0);
    }
  }

  // std::function requires copyable captures - hold the dictionary copy in a
  // shared_ptr whose deleter frees whatever avformat_write_header left
  // unconsumed
  auto optionsHolder = std::shared_ptr<AVDictionary*>(new AVDictionary*(options), [](AVDictionary** opts) {
    if (*opts) {
      av_dict_free(opts);
    }
    delete opts;
  });

  FormatContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [self, optionsHolder]() {
    // Serializes FFmpeg calls on this context and pins it against close/free
    // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
    std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
    AVFormatContext* ctx = self->ctx_;
    if (!ctx) {
      return AVERROR(EINVAL);
    }

    // Check if pb is valid for formats that require file I/O
    // AVFMT_NOFILE formats don't need pb (e.g., image2, rawvideo output to pipe)
    if (ctx->oformat && !(ctx->oformat->flags & AVFMT_NOFILE)) {
      if (!ctx->pb) {
        // File was not opened or open failed
        // This can happen if avio_open failed but writeHeader was still called
        return AVERROR(ENOENT);  // File not found/not opened
      }
    }

    return avformat_write_header(ctx, *optionsHolder ? optionsHolder.get() : nullptr);
  });
}

Napi::Value FormatContext::WriteFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Packet* packet = nullptr;
  std::vector<Napi::Object> pins = {info.This().As<Napi::Object>()};

  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    packet = UnwrapNativeObject<Packet>(env, info[0], "Packet");
    if (!packet) {
      Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (info[0].IsObject()) {
      pins.push_back(info[0].As<Napi::Object>());
    }
  }

  FormatContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, std::move(pins), [self, packet]() {
    // Serializes FFmpeg calls on this context and pins it against close/free
    // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
    std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
    if (!self->ctx_) {
      return AVERROR(EINVAL);
    }
    return av_write_frame(self->ctx_, packet ? packet->Get() : nullptr);
  });
}

Napi::Value FormatContext::InterleavedWriteFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Packet* packet = nullptr;
  std::vector<Napi::Object> pins = {info.This().As<Napi::Object>()};

  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    packet = UnwrapNativeObject<Packet>(env, info[0], "Packet");
    if (!packet) {
      Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (info[0].IsObject()) {
      pins.push_back(info[0].As<Napi::Object>());
    }
  }

  FormatContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, std::move(pins), [self, packet]() {
    // Serializes FFmpeg calls on this context and pins it against close/free
    // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
    std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
    if (!self->ctx_) {
      return AVERROR(EINVAL);
    }
    return av_interleaved_write_frame(self->ctx_, packet ? packet->Get() : nullptr);
  });
}

Napi::Value FormatContext::WriteTrailerAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  FormatContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [self]() {
    // Serializes FFmpeg calls on this context and pins it against close/free
    // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
    std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
    if (!self->ctx_) {
      return AVERROR(EINVAL);
    }
    return av_write_trailer(self->ctx_);
  });
}

Napi::Value FormatContext::OpenOutputAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "No format context allocated").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!is_output_) {
    Napi::Error::New(env, "Not an output context").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Check if oformat is set
  if (!ctx->oformat) {
    Napi::Error::New(env, "No output format set").ThrowAsJavaScriptException();
    return env.Null();
  }

  FormatContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [self]() {
    // Serializes FFmpeg calls on this context and pins it against close/free
    // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
    std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
    AVFormatContext* ctx = self->ctx_;
    if (!ctx || !ctx->oformat || !ctx->url) {
      return AVERROR(EINVAL);
    }

    // Check if we need to open the file (not NOFILE format)
    if (!(ctx->oformat->flags & AVFMT_NOFILE)) {
      return avio_open(&ctx->pb, ctx->url, AVIO_FLAG_WRITE);
    }
    return 0;
  });
}

Napi::Value FormatContext::CloseOutputAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return env.Null();
  }

  if (!is_output_) {
    Napi::Error::New(env, "Not an output context").ThrowAsJavaScriptException();
    return env.Null();
  }

  // avio_closep() frees the AVIOContext that in-flight writes may still be
  // using on the threadpool - wait for them first (use-after-free guard)
  if (!GuardAsyncOps(env, async_ops_, "FormatContext")) {
    return env.Undefined();
  }

  FormatContext* self = this;
  return PromiseWorker::Run(
      env, &async_ops_, {info.This().As<Napi::Object>()},
      [self]() {
        std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_, std::defer_lock);
        if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
          return AVERROR(EBUSY);
        }
        AVFormatContext* ctx = self->ctx_;
        if (ctx && ctx->pb) {
          if (!ctx->oformat || !(ctx->oformat->flags & AVFMT_NOFILE)) {
            avio_closep(&ctx->pb);
          }
        }
        return 0;
      },
      [](Napi::Env env, int) -> Napi::Value { return env.Undefined(); });
}

Napi::Value FormatContext::CloseInputAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    return env.Null();
  }

  // Interrupt BEFORE guarding: a reader blocked inside av_read_frame() only
  // returns once the AVIO interrupt callback fires - the op counter cannot
  // abort it, only wait for it. With the flag set, blocked readers unwind
  // with AVERROR_EXIT and release the counter, letting the guard pass.
  RequestInterrupt();

  // Wait for remaining in-flight async operations (read/seek/write/...) so
  // the close below cannot free the context under a threadpool op
  if (!GuardAsyncOps(env, async_ops_, "FormatContext")) {
    return env.Undefined();
  }

  FormatContext* self = this;
  return PromiseWorker::Run(
      env, &async_ops_, {info.This().As<Napi::Object>()},
      [self]() {
        // Keep the original interrupt+wait flow for readers as belt and
        // braces: the guard above already waited on the JS thread, but a
        // sync read may still have started since
        self->RequestInterrupt();

        int wait_count = 0;
        while (self->active_read_operations_.load() > 0) {
          std::this_thread::sleep_for(std::chrono::milliseconds(10));

          // Timeout after 1 second
          if (wait_count++ > 100) {
            break;
          }
        }

        // Exclusive hold on the context lifetime: a reader that slipped past
        // the counters still pins ctx_ via its shared lock, so we either wait
        // for it or fail with EBUSY - never free underneath it
        std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_, std::defer_lock);
        if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
          return AVERROR(EBUSY);
        }

        AVFormatContext* ctx = self->ctx_;
        if (!ctx) {
          return 0;
        }

        // Clear our references
        self->ctx_ = nullptr;

        if (ctx->interrupt_callback.opaque == self) {
          ctx->interrupt_callback.opaque = nullptr;
        }

        // Check if this is a custom IO context
        bool is_custom_io = (ctx->flags & AVFMT_FLAG_CUSTOM_IO) != 0;

        if (ctx->pb || ctx->nb_streams > 0) {
          // Context was successfully opened (has pb or streams), use close_input
          // IMPORTANT: avformat_close_input will:
          // - For AVFMT_FLAG_CUSTOM_IO: set pb to NULL but NOT free it
          // - For non-custom IO: close and free the pb
          avformat_close_input(&ctx);
        } else {
          // Context was allocated but not opened successfully
          // Clear pb reference before calling avformat_free_context to prevent double-free
          if (is_custom_io && ctx->pb) {
            ctx->pb = nullptr;
          }
          // Use avformat_free_context to free the allocated context
          avformat_free_context(ctx);
        }

        self->is_output_ = false;
        return 0;
      },
      [](Napi::Env env, int) -> Napi::Value { return env.Undefined(); });
}

Napi::Value FormatContext::DisposeAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    // Already freed, return resolved promise
    auto deferred = Napi::Promise::Deferred::New(env);
    deferred.Resolve(env.Undefined());
    return deferred.Promise();
  }

  if (is_output_) {
    // closeOutput() only closes pb (avio_closep) and deliberately keeps the
    // AVFormatContext alive for further use. Dispose must be a real free —
    // otherwise `await using` on an output context leaks it until GC.

    // The worker below frees the context - wait for in-flight async
    // operations that may still use it (use-after-free guard)
    if (!GuardAsyncOps(env, async_ops_, "FormatContext")) {
      return env.Undefined();
    }

    FormatContext* self = this;
    return PromiseWorker::Run(
        env, &async_ops_, {info.This().As<Napi::Object>()},
        [self]() {
          std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_, std::defer_lock);
          if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
            return AVERROR(EBUSY);
          }
          AVFormatContext* ctx = self->ctx_;
          if (!ctx) {
            // Already freed (e.g., user called closeOutput() + freeContext() first)
            return 0;
          }

          // Take ownership before freeing so concurrent accessors see a null
          // context instead of a dangling pointer, and a later freeContext()
          // becomes a no-op (no double-free).
          self->ctx_ = nullptr;

          if (ctx->interrupt_callback.opaque == self) {
            ctx->interrupt_callback.opaque = nullptr;
          }

          // Close pb first so buffered output is flushed to disk. Custom IO is
          // owned by the IOContext wrapper and AVFMT_NOFILE formats never opened
          // one, so those are left alone.
          if (ctx->pb && !(ctx->flags & AVFMT_FLAG_CUSTOM_IO)) {
            if (!ctx->oformat || !(ctx->oformat->flags & AVFMT_NOFILE)) {
              avio_closep(&ctx->pb);
            }
          }

          // avformat_free_context() never touches pb, so this is safe for custom IO
          avformat_free_context(ctx);

          self->is_output_ = false;
          return 0;
        },
        [](Napi::Env env, int) -> Napi::Value { return env.Undefined(); });
  }

  // Input contexts: closeInput() already closes pb, frees the context and
  // nulls ctx_, so it is a full dispose.
  return CloseInputAsync(info);
}

Napi::Value FormatContext::FlushAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  FormatContext* self = this;
  return PromiseWorker::Run(
      env, &async_ops_, {info.This().As<Napi::Object>()},
      [self]() {
        // Serializes FFmpeg calls on this context and pins it against close/free
        // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
        std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
        if (self->ctx_ && self->ctx_->pb) {
          avio_flush(self->ctx_->pb);
        }
        return 0;
      },
      [](Napi::Env env, int) -> Napi::Value { return env.Undefined(); });
}

Napi::Value FormatContext::SendRTSPPacketAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Parameters: streamIndex (number), rtpPacketData (Buffer)
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments: streamIndex and rtpPacketData").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[0].IsNumber()) {
    Napi::TypeError::New(env, "streamIndex must be a number").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[1].IsBuffer()) {
    Napi::TypeError::New(env, "rtpPacketData must be a Buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int stream_index = info[0].As<Napi::Number>().Int32Value();
  Napi::Buffer<uint8_t> buffer = info[1].As<Napi::Buffer<uint8_t>>();
  uint8_t* data = buffer.Data();
  size_t len = buffer.Length();

  // Copy the RTP payload on the JS thread - the Buffer is not pinned and may
  // be GC'd or detached while the worker runs
  auto rtpData = std::make_shared<std::vector<uint8_t>>(data, data + len);

  FormatContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [self, stream_index, rtpData]() {
    // Serializes FFmpeg calls on this context and pins it against close/free
    // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
    std::unique_lock<std::shared_timed_mutex> lifecycle(self->ctx_mutex_);
    if (!self->ctx_) {
      return AVERROR(EINVAL);
    }

    // Check if this is an RTSP input context
    if (!self->ctx_->iformat || !self->ctx_->iformat->name ||
        (strcmp(self->ctx_->iformat->name, "rtsp") != 0)) {
      return AVERROR(ENOTSUP);
    }

    // Access RTSP private data
    RTSPState* rt = static_cast<RTSPState*>(self->ctx_->priv_data);
    if (!rt) {
      return AVERROR(ENOTSUP);
    }

    // Find the RTSP stream by index
    RTSPStream* rtsp_st = nullptr;
    for (int i = 0; i < rt->nb_rtsp_streams; i++) {
      if (rt->rtsp_streams[i] && rt->rtsp_streams[i]->stream_index == stream_index) {
        rtsp_st = rt->rtsp_streams[i];
        break;
      }
    }

    if (!rtsp_st) {
      return AVERROR(EINVAL); // Stream not found
    }

    // Send based on transport type
    if (rt->lower_transport == RTSP_LOWER_TRANSPORT_TCP) {
      // TCP: Send with interleaved header over RTSP connection
      if (!rt->rtsp_hd) {
        return AVERROR(ENOTSUP); // No TCP connection
      }

      // Build interleaved packet: $ + channel_id + length (2 bytes) + RTP data
      int channel_id = rtsp_st->interleaved_min;
      size_t total_len = 4 + rtpData->size();
      std::vector<uint8_t> interleaved_packet(total_len);

      interleaved_packet[0] = '$';
      interleaved_packet[1] = static_cast<uint8_t>(channel_id);
      interleaved_packet[2] = static_cast<uint8_t>((rtpData->size() >> 8) & 0xFF);
      interleaved_packet[3] = static_cast<uint8_t>(rtpData->size() & 0xFF);
      memcpy(interleaved_packet.data() + 4, rtpData->data(), rtpData->size());

      // Write to RTSP TCP socket
      return ffurl_write(static_cast<URLContext*>(rt->rtsp_hd), interleaved_packet.data(), total_len);
    }

    if (rt->lower_transport == RTSP_LOWER_TRANSPORT_UDP ||
        rt->lower_transport == RTSP_LOWER_TRANSPORT_UDP_MULTICAST) {
      // UDP: Send raw RTP packet directly over UDP socket
      if (!rtsp_st->rtp_handle) {
        return AVERROR(ENOTSUP); // No UDP socket
      }

      // Write raw RTP packet to UDP socket (no interleaved header)
      return ffurl_write(static_cast<URLContext*>(rtsp_st->rtp_handle), rtpData->data(), rtpData->size());
    }

    return AVERROR(ENOTSUP); // Unknown transport
  });
}

} // namespace ffmpeg
