#include "format_context.h"
#include "input_reader.h"
#include "packet.h"
#include "input_format.h"
#include "dictionary.h"
#include "common.h"
#include <napi.h>
#include <thread>
#include <chrono>

namespace ffmpeg {

Napi::Value FormatContext::ReadFrameSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (reader_) {
    Napi::Error::New(env, "FormatContext has an active async reader - use the async API").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Packet required").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Packet* packet = UnwrapNativeObject<Packet>(env, info[0], "Packet");
  if (!packet) {
    Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    Napi::Error::New(env, "FormatContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Check interrupt flag BEFORE calling av_read_frame()
  // The interrupt callback is only invoked during blocking I/O operations.
  // If packets are already buffered, av_read_frame() won't block and the
  // callback won't be called. We must manually check here.
  if (interrupt_requested_.load()) {
    return Napi::Number::New(env, AVERROR_EXIT);
  }

  // Increment counter to signal we're in an active read operation
  active_read_operations_.fetch_add(1);

  // Read a frame
  int result = av_read_frame(ctx_, packet->Get());

  // Decrement counter to signal read operation is complete
  active_read_operations_.fetch_sub(1);

  // av_read_frame fills the packet's buffer internally; reconcile V8 accounting.
  if (result >= 0) {
    packet->SyncExternalMemory(env);
  }

  return Napi::Number::New(env, result);
}

Napi::Value FormatContext::WriteFrameSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    Napi::Error::New(env, "FormatContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Packet* packet = nullptr;
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    packet = UnwrapNativeObject<Packet>(env, info[0], "Packet");
    if (!packet) {
      Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
  }

  // Direct synchronous call to av_write_frame
  int result = av_write_frame(ctx_, packet ? packet->Get() : nullptr);

  return Napi::Number::New(env, result);
}

Napi::Value FormatContext::InterleavedWriteFrameSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    Napi::Error::New(env, "FormatContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Packet* packet = nullptr;
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    packet = UnwrapNativeObject<Packet>(env, info[0], "Packet");
    if (!packet) {
      Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
  }

  // Direct synchronous call to av_interleaved_write_frame
  int result = av_interleaved_write_frame(ctx_, packet ? packet->Get() : nullptr);

  return Napi::Number::New(env, result);
}

Napi::Value FormatContext::OpenInputSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // Exclusive hold on the context lifetime (see ctx_mutex_) - fail with
  // EBUSY instead of freeing/replacing the context under a threadpool op
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // avformat_open_input() frees a pre-allocated context (custom I/O) on
  // failure - wait for in-flight async operations that may still use it
  if (ctx_ && !GuardAsyncOps(env, async_ops_, "FormatContext")) {
    return env.Undefined();
  }

  std::string url;
  AVInputFormat* fmt = nullptr;
  AVDictionary* options = nullptr;

  // Parse URL argument
  if (info.Length() > 0 && info[0].IsString()) {
    url = info[0].As<Napi::String>().Utf8Value();
  }

  // Parse format argument
  if (info.Length() > 1 && !info[1].IsNull() && !info[1].IsUndefined()) {
    InputFormat* inputFormat = UnwrapNativeObject<InputFormat>(env, info[1], "InputFormat");
    if (!inputFormat) {
      Napi::TypeError::New(env, "Invalid InputFormat object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    fmt = const_cast<AVInputFormat*>(inputFormat->Get());
  }

  // Parse options argument
  if (info.Length() > 2 && !info[2].IsNull() && !info[2].IsUndefined()) {
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, info[2], "Dictionary");
    if (!dict) {
      Napi::TypeError::New(env, "Invalid Dictionary object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    av_dict_copy(&options, dict->Get(), 0);
  }

  // If we already have a context (e.g., for custom I/O), preserve it
  AVFormatContext* ctx = ctx_;

  // URL path: pre-allocate so the interrupt callback is wired before any I/O
  // starts (avformat_open_input() would allocate without it). The flag reset
  // matches AllocContext: a stale interrupt from a previous close/open on
  // this wrapper must not abort a fresh open.
  if (!ctx) {
    ctx = avformat_alloc_context();
    if (!ctx) {
      Napi::Error::New(env, "Out of memory allocating format context").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    ctx->interrupt_callback.callback = InterruptCallback;
    ctx->interrupt_callback.opaque = this;
    interrupt_requested_.store(false);
  }

  // Direct synchronous call
  const char* urlPtr = url.empty() || url == "dummy" ? nullptr : url.c_str();
  int ret = avformat_open_input(&ctx, urlPtr, fmt, options ? &options : nullptr);

  // Always update — on failure, avformat_open_input frees ctx and sets it to NULL.
  // Without this, ctx_ would be a dangling pointer after failure.
  ctx_ = ctx;

  if (ret >= 0) {
    is_output_ = false;
  }

  // Clean up options if any remain
  if (options) {
    av_dict_free(&options);
  }

  return Napi::Number::New(env, ret);
}

Napi::Value FormatContext::FindStreamInfoSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (reader_) {
    Napi::Error::New(env, "FormatContext has an active async reader - use the async API").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    Napi::Error::New(env, "FormatContext not initialized").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  // Build the per-stream options array (see BuildStreamOptions for the FFmpeg contract)
  std::vector<AVDictionary*> options;
  if (!BuildStreamOptions(env, info.Length() > 0 ? info[0] : env.Null(), ctx_->nb_streams, options)) {
    return env.Undefined();
  }

  // Direct synchronous call
  int ret = avformat_find_stream_info(ctx_, options.empty() ? nullptr : options.data());

  // Clean up the dictionary copies
  FreeStreamOptions(options);

  return Napi::Number::New(env, ret);
}

Napi::Value FormatContext::SeekFrameSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (reader_) {
    Napi::Error::New(env, "FormatContext has an active async reader - use the async API").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    Napi::Error::New(env, "FormatContext not initialized").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (info.Length() < 3) {
    Napi::TypeError::New(env, "stream_index, timestamp, and flags required").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int stream_index = info[0].As<Napi::Number>().Int32Value();
  bool lossless;
  int64_t timestamp = info[1].As<Napi::BigInt>().Int64Value(&lossless);
  int flags = info[2].As<Napi::Number>().Int32Value();

  // Direct synchronous call
  int ret = av_seek_frame(ctx_, stream_index, timestamp, flags);

  return Napi::Number::New(env, ret);
}

Napi::Value FormatContext::SeekFileSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (reader_) {
    Napi::Error::New(env, "FormatContext has an active async reader - use the async API").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    Napi::Error::New(env, "FormatContext not initialized").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

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

  // Direct synchronous call
  int ret = avformat_seek_file(ctx_, stream_index, min_ts, ts, max_ts, flags);

  return Napi::Number::New(env, ret);
}

Napi::Value FormatContext::WriteHeaderSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    Napi::Error::New(env, "FormatContext not initialized").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (!is_output_) {
    Napi::Error::New(env, "Not an output context").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  AVDictionary* options = nullptr;

  // Parse options argument
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, info[0], "Dictionary");
    if (!dict) {
      Napi::TypeError::New(env, "Invalid Dictionary object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    av_dict_copy(&options, dict->Get(), 0);
  }

  // Direct synchronous call
  int ret = avformat_write_header(ctx_, options ? &options : nullptr);

  // Clean up options if any remain
  if (options) {
    av_dict_free(&options);
  }

  return Napi::Number::New(env, ret);
}

Napi::Value FormatContext::WriteTrailerSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    Napi::Error::New(env, "FormatContext not initialized").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (!is_output_) {
    Napi::Error::New(env, "Not an output context").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  // Direct synchronous call
  int ret = av_write_trailer(ctx_);

  return Napi::Number::New(env, ret);
}

Napi::Value FormatContext::CloseInputSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    return env.Undefined();
  }

  if (is_output_) {
    Napi::Error::New(env, "Cannot close output context as input").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  StopReader();

  // Request interrupt to cancel any pending av_read_frame()
  FormatContext::RequestInterrupt();

  // Wait for in-flight async workers before freeing (use-after-free guard).
  // The interrupt above unblocks readers stuck in blocking I/O so they can
  // release the counter.
  if (!GuardAsyncOps(env, async_ops_, "FormatContext")) {
    return env.Undefined();
  }

  // Now wait a short time for any in-flight av_read_frame() to return with error
  int wait_count = 0;
  while (active_read_operations_.load() > 0) {
    std::this_thread::sleep_for(std::chrono::milliseconds(10));

    // Timeout after 1 second
    if (wait_count++ > 100) {
      break;
    }
  }

  // Exclusive hold on the context lifetime: a reader that slipped past the
  // counters still pins ctx_ via its shared lock - fail with EBUSY instead of
  // freeing underneath it (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    // Freed concurrently while waiting
    return env.Undefined();
  }

  // Clear our references
  if (ctx_->interrupt_callback.opaque == this) {
    ctx_->interrupt_callback.opaque = nullptr;
  }

  // Check if this is a custom IO context
  bool is_custom_io = (ctx_->flags & AVFMT_FLAG_CUSTOM_IO) != 0;

  if (ctx_->pb || ctx_->nb_streams > 0) {
    // Context was successfully opened (has pb or streams), use close_input
    // IMPORTANT: avformat_close_input will:
    // - For AVFMT_FLAG_CUSTOM_IO: set pb to NULL but NOT free it
    // - For non-custom IO: close and free the pb
    avformat_close_input(&ctx_);
  } else {
    // Context was allocated but not opened successfully
    // Clear pb reference before calling avformat_free_context to prevent double-free
    if (is_custom_io && ctx_->pb) {
      ctx_->pb = nullptr;
    }
    // Use avformat_free_context to free the allocated context
    avformat_free_context(ctx_);
    ctx_ = nullptr;
  }

  is_output_ = false;

  return env.Undefined();
}

Napi::Value FormatContext::OpenOutputSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    Napi::Error::New(env, "FormatContext not initialized").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (!is_output_) {
    Napi::Error::New(env, "Not an output context").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (!ctx_->oformat) {
    Napi::Error::New(env, "Output format not set").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (!ctx_->url) {
    Napi::Error::New(env, "URL not set").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  // Check if format needs a file
  if (ctx_->oformat->flags & AVFMT_NOFILE) {
    return Napi::Number::New(env, 0);
  }

  // Direct synchronous call
  int ret = avio_open(&ctx_->pb, ctx_->url, AVIO_FLAG_WRITE);

  return Napi::Number::New(env, ret);
}

Napi::Value FormatContext::CloseOutputSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // Exclusive hold on the context lifetime (see ctx_mutex_) - fail with
  // EBUSY instead of freeing/replacing the context under a threadpool op
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    return env.Undefined();
  }

  if (!is_output_) {
    Napi::Error::New(env, "Not an output context").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_->pb) {
    return env.Undefined();
  }

  // Check for custom I/O
  if (ctx_->flags & AVFMT_FLAG_CUSTOM_IO) {
    return env.Undefined();
  }

  // Check if format needs a file
  if (ctx_->oformat && (ctx_->oformat->flags & AVFMT_NOFILE)) {
    return env.Undefined();
  }

  // avio_closep() frees the AVIOContext that in-flight async writes may still
  // be using on the threadpool - wait for them first (use-after-free guard)
  if (!GuardAsyncOps(env, async_ops_, "FormatContext")) {
    return env.Undefined();
  }

  // Direct synchronous call
  avio_closep(&ctx_->pb);

  return env.Undefined();
}

Napi::Value FormatContext::FlushSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (reader_) {
    Napi::Error::New(env, "FormatContext has an active async reader - use the async API").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!ctx_) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (ctx_->pb) {
    avio_flush(ctx_->pb);
  }

  return env.Undefined();
}

Napi::Value FormatContext::SendRTSPPacketSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (reader_) {
    Napi::Error::New(env, "FormatContext has an active async reader - use the async API").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  // Serializes FFmpeg calls on this context and pins it against close/free
  // - AVFormatContext is not safe for concurrent use (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

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

  // Check if this is an RTSP input context
  if (!ctx_->iformat || !ctx_->iformat->name ||
      (strcmp(ctx_->iformat->name, "rtsp") != 0)) {
    return Napi::Number::New(env, AVERROR(ENOTSUP));
  }

  int stream_index = info[0].As<Napi::Number>().Int32Value();
  Napi::Buffer<uint8_t> buffer = info[1].As<Napi::Buffer<uint8_t>>();
  uint8_t* data = buffer.Data();
  size_t len = buffer.Length();

  // Access RTSP private data
  RTSPState* rt = static_cast<RTSPState*>(ctx_->priv_data);
  if (!rt) {
    return Napi::Number::New(env, AVERROR(ENOTSUP));
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
    return Napi::Number::New(env, AVERROR(EINVAL)); // Stream not found
  }

  int ret = 0;

  // Send based on transport type
  if (rt->lower_transport == RTSP_LOWER_TRANSPORT_TCP) {
    // TCP: Send with interleaved header over RTSP connection
    if (!rt->rtsp_hd) {
      return Napi::Number::New(env, AVERROR(ENOTSUP)); // No TCP connection
    }

    // Build interleaved packet: $ + channel_id + length (2 bytes) + RTP data
    int channel_id = rtsp_st->interleaved_min;
    size_t total_len = 4 + len;
    std::vector<uint8_t> interleaved_packet(total_len);

    interleaved_packet[0] = '$';
    interleaved_packet[1] = static_cast<uint8_t>(channel_id);
    interleaved_packet[2] = static_cast<uint8_t>((len >> 8) & 0xFF);
    interleaved_packet[3] = static_cast<uint8_t>(len & 0xFF);
    memcpy(interleaved_packet.data() + 4, data, len);

    // Write to RTSP TCP socket
    ret = ffurl_write(static_cast<URLContext*>(rt->rtsp_hd), interleaved_packet.data(), total_len);

  } else if (rt->lower_transport == RTSP_LOWER_TRANSPORT_UDP ||
             rt->lower_transport == RTSP_LOWER_TRANSPORT_UDP_MULTICAST) {
    // UDP: Send raw RTP packet directly over UDP socket
    if (!rtsp_st->rtp_handle) {
      return Napi::Number::New(env, AVERROR(ENOTSUP)); // No UDP socket
    }

    // Write raw RTP packet to UDP socket (no interleaved header)
    ret = ffurl_write(static_cast<URLContext*>(rtsp_st->rtp_handle), data, len);

  } else {
    return Napi::Number::New(env, AVERROR(ENOTSUP)); // Unknown transport
  }

  return Napi::Number::New(env, ret);
}

} // namespace ffmpeg