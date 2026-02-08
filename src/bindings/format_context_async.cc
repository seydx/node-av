#include "format_context.h"
#include "packet.h"
#include "input_format.h"
#include "output_format.h"
#include "dictionary.h"
#include "common.h"
#include <napi.h>
#include <thread>
#include <chrono>

extern "C" {
#include <libavformat/avformat.h>
}

namespace ffmpeg {

class FCOpenInputWorker : public Napi::AsyncWorker {
public:
  FCOpenInputWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent,
                    const std::string& url, AVInputFormat* fmt, AVDictionary* options)
    : AsyncWorker(env),
      parent_(parent),
      url_(url),
      fmt_(fmt),
      options_(options),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold reference to prevent GC during async operation
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCOpenInputWorker() {
    parent_ref_.Reset();
    if (options_) {
      av_dict_free(&options_);
    }
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!parent_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    // If we already have a context (e.g., for custom I/O), use it
    AVFormatContext* ctx = parent_->ctx_;

    // For custom I/O, pass NULL as URL
    const char* url = nullptr;
    if (!url_.empty() && url_ != "dummy") {
      url = url_.c_str();
    }

    result_ = avformat_open_input(&ctx, url, fmt_, options_ ? &options_ : nullptr);

    // Always update — on failure, avformat_open_input frees ctx and sets it to NULL.
    // Without this, parent_->ctx_ would be a dangling pointer after failure.
    parent_->ctx_ = ctx;

    if (result_ >= 0) {
      parent_->is_output_ = false;
    }
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;  // prevents GC during async operation
  FormatContext* parent_;
  std::string url_;
  AVInputFormat* fmt_;
  AVDictionary* options_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

class FCFindStreamInfoWorker : public Napi::AsyncWorker {
public:
  FCFindStreamInfoWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent,
                         AVDictionary* options)
    : AsyncWorker(env),
      parent_(parent),
      options_(options),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCFindStreamInfoWorker() {
    parent_ref_.Reset();
    if (options_) {
      av_dict_free(&options_);
    }
  }

  void Execute() override {
    if (!parent_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    if (parent_->ctx_) {
      result_ = avformat_find_stream_info(parent_->ctx_, options_ ? &options_ : nullptr);
    } else {
      result_ = AVERROR(EINVAL);
    }
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;
  FormatContext* parent_;
  AVDictionary* options_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

class FCReadFrameWorker : public Napi::AsyncWorker {
public:
  FCReadFrameWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent,
                    Napi::Object packetObj, Packet* packet)
    : AsyncWorker(env),
      parent_(parent),
      packet_(packet),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold references to prevent GC during async operation
    parent_ref_.Reset(parentObj, 1);
    packet_ref_.Reset(packetObj, 1);
  }

  ~FCReadFrameWorker() {
    parent_ref_.Reset();
    packet_ref_.Reset();
  }

  void Execute() override {
    if (!parent_ || !packet_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    // Check interrupt flag BEFORE calling av_read_frame()
    // The interrupt callback is only invoked during blocking I/O operations.
    // If packets are already buffered, av_read_frame() won't block and the
    // callback won't be called. We must manually check here.
    if (parent_->interrupt_requested_.load()) {
      result_ = AVERROR_EXIT;
      return;
    }

    if (!parent_->ctx_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    // Increment counter to signal we're in an active read operation
    parent_->active_read_operations_.fetch_add(1);

    // Read a frame
    result_ = av_read_frame(parent_->ctx_, packet_->Get());

    // Decrement counter to signal read operation is complete
    parent_->active_read_operations_.fetch_sub(1);
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;
  Napi::ObjectReference packet_ref_;
  FormatContext* parent_;
  Packet* packet_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

class FCSeekFrameWorker : public Napi::AsyncWorker {
public:
  FCSeekFrameWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent,
                    int stream_index, int64_t timestamp, int flags)
    : AsyncWorker(env),
      parent_(parent),
      stream_index_(stream_index),
      timestamp_(timestamp),
      flags_(flags),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCSeekFrameWorker() {
    parent_ref_.Reset();
  }

  void Execute() override {
    if (!parent_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    if (parent_->ctx_) {
      result_ = av_seek_frame(parent_->ctx_, stream_index_, timestamp_, flags_);
    } else {
      result_ = AVERROR(EINVAL);
    }
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;
  FormatContext* parent_;
  int stream_index_;
  int64_t timestamp_;
  int flags_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

class FCSeekFileWorker : public Napi::AsyncWorker {
public:
  FCSeekFileWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent,
                   int stream_index, int64_t min_ts, int64_t ts, int64_t max_ts, int flags)
    : AsyncWorker(env),
      parent_(parent),
      stream_index_(stream_index),
      min_ts_(min_ts),
      ts_(ts),
      max_ts_(max_ts),
      flags_(flags),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCSeekFileWorker() {
    parent_ref_.Reset();
  }

  void Execute() override {
    if (!parent_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    if (parent_->ctx_) {
      result_ = avformat_seek_file(parent_->ctx_, stream_index_,
                                   min_ts_, ts_, max_ts_, flags_);
    } else {
      result_ = AVERROR(EINVAL);
    }
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;
  FormatContext* parent_;
  int stream_index_;
  int64_t min_ts_;
  int64_t ts_;
  int64_t max_ts_;
  int flags_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

class FCWriteHeaderWorker : public Napi::AsyncWorker {
public:
  FCWriteHeaderWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent,
                      AVDictionary* options)
    : AsyncWorker(env),
      parent_(parent),
      options_(options),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCWriteHeaderWorker() {
    parent_ref_.Reset();
    if (options_) {
      av_dict_free(&options_);
    }
  }

  void Execute() override {
    if (!parent_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    if (parent_->ctx_) {
      AVFormatContext* ctx = parent_->ctx_;

      // Check if pb is valid for formats that require file I/O
      // AVFMT_NOFILE formats don't need pb (e.g., image2, rawvideo output to pipe)
      if (ctx->oformat && !(ctx->oformat->flags & AVFMT_NOFILE)) {
        if (!ctx->pb) {
          // File was not opened or open failed
          // This can happen if avio_open failed but writeHeader was still called
          result_ = AVERROR(ENOENT);  // File not found/not opened
          return;
        }
      }

      result_ = avformat_write_header(ctx, options_ ? &options_ : nullptr);
    } else {
      result_ = AVERROR(EINVAL);
    }
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;
  FormatContext* parent_;
  AVDictionary* options_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

class FCWriteFrameWorker : public Napi::AsyncWorker {
public:
  FCWriteFrameWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent,
                     Napi::Value packetVal, Packet* packet)
    : AsyncWorker(env),
      parent_(parent),
      packet_(packet),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
    if (packet && packetVal.IsObject()) {
      packet_ref_.Reset(packetVal.As<Napi::Object>(), 1);
    }
  }

  ~FCWriteFrameWorker() {
    parent_ref_.Reset();
    packet_ref_.Reset();
  }

  void Execute() override {
    if (!parent_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    if (parent_->ctx_) {
      result_ = av_write_frame(parent_->ctx_, packet_ ? packet_->Get() : nullptr);
    } else {
      result_ = AVERROR(EINVAL);
    }
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;
  Napi::ObjectReference packet_ref_;
  FormatContext* parent_;
  Packet* packet_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

class FCInterleavedWriteFrameWorker : public Napi::AsyncWorker {
public:
  FCInterleavedWriteFrameWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent,
                                Napi::Value packetVal, Packet* packet)
    : AsyncWorker(env),
      parent_(parent),
      packet_(packet),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
    if (packet && packetVal.IsObject()) {
      packet_ref_.Reset(packetVal.As<Napi::Object>(), 1);
    }
  }

  ~FCInterleavedWriteFrameWorker() {
    parent_ref_.Reset();
    packet_ref_.Reset();
  }

  void Execute() override {
    if (!parent_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    if (parent_->ctx_) {
      result_ = av_interleaved_write_frame(parent_->ctx_, packet_ ? packet_->Get() : nullptr);
    } else {
      result_ = AVERROR(EINVAL);
    }
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;
  Napi::ObjectReference packet_ref_;
  FormatContext* parent_;
  Packet* packet_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

class FCWriteTrailerWorker : public Napi::AsyncWorker {
public:
  FCWriteTrailerWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent)
    : AsyncWorker(env),
      parent_(parent),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCWriteTrailerWorker() {
    parent_ref_.Reset();
  }

  void Execute() override {
    if (!parent_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    if (parent_->ctx_) {
      result_ = av_write_trailer(parent_->ctx_);
    } else {
      result_ = AVERROR(EINVAL);
    }
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;
  FormatContext* parent_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

class FCOpenOutputWorker : public Napi::AsyncWorker {
public:
  FCOpenOutputWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent)
    : AsyncWorker(env),
      parent_(parent),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCOpenOutputWorker() {
    parent_ref_.Reset();
  }

  void Execute() override {
    if (!parent_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    AVFormatContext* ctx = parent_->ctx_;
    if (!ctx || !ctx->oformat || !ctx->url) {
      result_ = AVERROR(EINVAL);
      return;
    }

    // Check if we need to open the file (not NOFILE format)
    if (!(ctx->oformat->flags & AVFMT_NOFILE)) {
      result_ = avio_open(&ctx->pb, ctx->url, AVIO_FLAG_WRITE);
    } else {
      result_ = 0;
    }

    if (result_ >= 0) {
      // Successfully opened
    }
  }

  void OnOK() override {
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference parent_ref_;
  FormatContext* parent_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

class FCCloseOutputWorker : public Napi::AsyncWorker {
public:
  FCCloseOutputWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent)
    : AsyncWorker(env),
      parent_(parent),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCCloseOutputWorker() {
    parent_ref_.Reset();
  }

  void Execute() override {
    if (!parent_) {
      return;
    }

    AVFormatContext* ctx = parent_->ctx_;
    if (ctx && ctx->pb) {
      if (!ctx->oformat || !(ctx->oformat->flags & AVFMT_NOFILE)) {
        avio_closep(&ctx->pb);
      }
    }
    // Closed
  }

  void OnOK() override {
    deferred_.Resolve(Env().Undefined());
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference parent_ref_;
  FormatContext* parent_;
  Napi::Promise::Deferred deferred_;
};

class FCCloseInputWorker : public Napi::AsyncWorker {
public:
  FCCloseInputWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent)
    : AsyncWorker(env),
      parent_(parent),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCCloseInputWorker() {
    parent_ref_.Reset();
  }

  void Execute() override {
    if (!parent_) {
      return;
    }

    // Request interrupt to cancel any pending av_read_frame()
    parent_->RequestInterrupt();

    // Now wait a short time for any in-flight av_read_frame() to return with error
    int wait_count = 0;
    while (parent_->active_read_operations_.load() > 0) {
      std::this_thread::sleep_for(std::chrono::milliseconds(10));

      // Timeout after 1 second
      if (wait_count++ > 100) {
        break;
      }
    }

    AVFormatContext* ctx = parent_->ctx_;

    if (!ctx) {
      return;
    }

    // Clear our references
    parent_->ctx_ = nullptr;

    if (ctx->interrupt_callback.opaque == parent_) {
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

    parent_->is_output_ = false;
  }

  void OnOK() override {
    deferred_.Resolve(Env().Undefined());
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference parent_ref_;
  FormatContext* parent_;
  Napi::Promise::Deferred deferred_;
};

class FCFlushWorker : public Napi::AsyncWorker {
public:
  FCFlushWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent)
    : AsyncWorker(env),
      parent_(parent),
      deferred_(Napi::Promise::Deferred::New(env)) {
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCFlushWorker() {
    parent_ref_.Reset();
  }

  void Execute() override {
    if (!parent_) {
      return;
    }

    if (parent_->ctx_ && parent_->ctx_->pb) {
      avio_flush(parent_->ctx_->pb);
    }
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Env().Undefined());
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;
  FormatContext* parent_;
  Napi::Promise::Deferred deferred_;
};

Napi::Value FormatContext::OpenInputAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "URL required").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string url = info[0].As<Napi::String>().Utf8Value();
  AVInputFormat* fmt = nullptr;
  AVDictionary* options = nullptr;

  if (info.Length() > 1 && !info[1].IsNull() && !info[1].IsUndefined()) {
    InputFormat* inputFormat = UnwrapNativeObject<InputFormat>(env, info[1], "InputFormat");
    if (inputFormat) {
      fmt = const_cast<AVInputFormat*>(inputFormat->Get());
    }
  }

  if (info.Length() > 2 && !info[2].IsNull() && !info[2].IsUndefined()) {
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, info[2], "Dictionary");
    if (dict && dict->Get()) {
      av_dict_copy(&options, dict->Get(), 0);
    }
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCOpenInputWorker(env, thisObj, this, url, fmt, options);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
}

Napi::Value FormatContext::FindStreamInfoAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVDictionary* options = nullptr;

  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, info[0], "Dictionary");
    if (dict && dict->Get()) {
      av_dict_copy(&options, dict->Get(), 0);
    }
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCFindStreamInfoWorker(env, thisObj, this, options);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
}

Napi::Value FormatContext::ReadFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Packet required").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Object packetObj = info[0].As<Napi::Object>();
  Packet* packet = UnwrapNativeObject<Packet>(env, info[0], "Packet");
  if (!packet) {
    Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCReadFrameWorker(env, thisObj, this, packetObj, packet);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
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

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCSeekFrameWorker(env, thisObj, this, stream_index, timestamp, flags);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
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

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCSeekFileWorker(env, thisObj, this, stream_index, min_ts, ts, max_ts, flags);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
}

Napi::Value FormatContext::WriteHeaderAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVDictionary* options = nullptr;

  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, info[0], "Dictionary");
    if (dict && dict->Get()) {
      av_dict_copy(&options, dict->Get(), 0);
    }
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCWriteHeaderWorker(env, thisObj, this, options);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
}

Napi::Value FormatContext::WriteFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Packet* packet = nullptr;
  Napi::Value packetVal = env.Undefined();

  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    packetVal = info[0];
    packet = UnwrapNativeObject<Packet>(env, info[0], "Packet");
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCWriteFrameWorker(env, thisObj, this, packetVal, packet);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
}

Napi::Value FormatContext::InterleavedWriteFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Packet* packet = nullptr;
  Napi::Value packetVal = env.Undefined();

  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    packetVal = info[0];
    packet = UnwrapNativeObject<Packet>(env, info[0], "Packet");
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCInterleavedWriteFrameWorker(env, thisObj, this, packetVal, packet);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
}

Napi::Value FormatContext::WriteTrailerAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCWriteTrailerWorker(env, thisObj, this);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
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

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCOpenOutputWorker(env, thisObj, this);
  worker->Queue();
  return worker->GetPromise();
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

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCCloseOutputWorker(env, thisObj, this);
  worker->Queue();
  return worker->GetPromise();
}

Napi::Value FormatContext::CloseInputAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    return env.Null();
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCCloseInputWorker(env, thisObj, this);
  worker->Queue();
  return worker->GetPromise();
}

Napi::Value FormatContext::FlushAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCFlushWorker(env, thisObj, this);
  worker->Queue();
  return worker->GetPromise();
}

class FCSendRTSPPacketWorker : public Napi::AsyncWorker {
public:
  FCSendRTSPPacketWorker(Napi::Env env, Napi::Object parentObj, FormatContext* parent,
                         int stream_index, const uint8_t* data, size_t len)
    : AsyncWorker(env),
      parent_(parent),
      stream_index_(stream_index),
      rtp_data_(data, data + len),
      result_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold reference to prevent GC during async operation
    parent_ref_.Reset(parentObj, 1);
  }

  ~FCSendRTSPPacketWorker() {
    parent_ref_.Reset();
  }

  void Execute() override {
    if (!parent_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    if (!parent_->ctx_) {
      result_ = AVERROR(EINVAL);
      return;
    }

    // Check if this is an RTSP input context
    if (!parent_->ctx_->iformat || !parent_->ctx_->iformat->name ||
        (strcmp(parent_->ctx_->iformat->name, "rtsp") != 0)) {
      result_ = AVERROR(ENOTSUP);
      return;
    }

    // Access RTSP private data
    RTSPState* rt = static_cast<RTSPState*>(parent_->ctx_->priv_data);
    if (!rt) {
      result_ = AVERROR(ENOTSUP);
      return;
    }

    // Find the RTSP stream by index
    RTSPStream* rtsp_st = nullptr;
    for (int i = 0; i < rt->nb_rtsp_streams; i++) {
      if (rt->rtsp_streams[i] && rt->rtsp_streams[i]->stream_index == stream_index_) {
        rtsp_st = rt->rtsp_streams[i];
        break;
      }
    }

    if (!rtsp_st) {
      result_ = AVERROR(EINVAL); // Stream not found
      return;
    }

    // Send based on transport type
    if (rt->lower_transport == RTSP_LOWER_TRANSPORT_TCP) {
      // TCP: Send with interleaved header over RTSP connection
      if (!rt->rtsp_hd) {
        result_ = AVERROR(ENOTSUP); // No TCP connection
        return;
      }

      // Build interleaved packet: $ + channel_id + length (2 bytes) + RTP data
      int channel_id = rtsp_st->interleaved_min;
      size_t total_len = 4 + rtp_data_.size();
      std::vector<uint8_t> interleaved_packet(total_len);

      interleaved_packet[0] = '$';
      interleaved_packet[1] = static_cast<uint8_t>(channel_id);
      interleaved_packet[2] = static_cast<uint8_t>((rtp_data_.size() >> 8) & 0xFF);
      interleaved_packet[3] = static_cast<uint8_t>(rtp_data_.size() & 0xFF);
      memcpy(interleaved_packet.data() + 4, rtp_data_.data(), rtp_data_.size());

      // Write to RTSP TCP socket
      result_ = ffurl_write(static_cast<URLContext*>(rt->rtsp_hd), interleaved_packet.data(), total_len);

    } else if (rt->lower_transport == RTSP_LOWER_TRANSPORT_UDP ||
               rt->lower_transport == RTSP_LOWER_TRANSPORT_UDP_MULTICAST) {
      // UDP: Send raw RTP packet directly over UDP socket
      if (!rtsp_st->rtp_handle) {
        result_ = AVERROR(ENOTSUP); // No UDP socket
        return;
      }

      // Write raw RTP packet to UDP socket (no interleaved header)
      result_ = ffurl_write(static_cast<URLContext*>(rtsp_st->rtp_handle),
                           rtp_data_.data(), rtp_data_.size());

    } else {
      result_ = AVERROR(ENOTSUP); // Unknown transport
    }
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }

  void OnError(const Napi::Error& error) override {
    deferred_.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred_.Promise(); }

private:
  Napi::ObjectReference parent_ref_;
  FormatContext* parent_;
  int stream_index_;
  std::vector<uint8_t> rtp_data_;
  int result_;
  Napi::Promise::Deferred deferred_;
};

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

  Napi::Object thisObj = info.This().As<Napi::Object>();
  auto* worker = new FCSendRTSPPacketWorker(env, thisObj, this, stream_index, data, len);
  worker->Queue();
  return worker->GetPromise();
}

} // namespace ffmpeg