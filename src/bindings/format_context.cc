#include "format_context.h"
#include "packet.h"
#include "stream.h"
#include "codec.h"
#include "dictionary.h"
#include "input_format.h"
#include "output_format.h"
#include "io_context.h"
#include "common.h"
#include <napi.h>
#include <memory>

namespace ffmpeg {

thread_local Napi::FunctionReference FormatContext::constructor;

Napi::Object FormatContext::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "FormatContext", {
    InstanceMethod<&FormatContext::AllocContext>("allocContext"),
    InstanceMethod<&FormatContext::AllocOutputContext2>("allocOutputContext2"),
    InstanceMethod<&FormatContext::FreeContext>("freeContext"),
    InstanceMethod<&FormatContext::CloseInputAsync>("closeInput"),
    InstanceMethod<&FormatContext::CloseInputSync>("closeInputSync"),
    InstanceMethod<&FormatContext::OpenOutputAsync>("openOutput"),
    InstanceMethod<&FormatContext::OpenOutputSync>("openOutputSync"),
    InstanceMethod<&FormatContext::CloseOutputAsync>("closeOutput"),
    InstanceMethod<&FormatContext::CloseOutputSync>("closeOutputSync"),
    InstanceMethod<&FormatContext::OpenInputAsync>("openInput"),
    InstanceMethod<&FormatContext::OpenInputSync>("openInputSync"),
    InstanceMethod<&FormatContext::FindStreamInfoAsync>("findStreamInfo"),
    InstanceMethod<&FormatContext::FindStreamInfoSync>("findStreamInfoSync"),
    InstanceMethod<&FormatContext::ReadFrameAsync>("readFrame"),
    InstanceMethod<&FormatContext::ReadFrameSync>("readFrameSync"),
    InstanceMethod<&FormatContext::SeekFrameAsync>("seekFrame"),
    InstanceMethod<&FormatContext::SeekFrameSync>("seekFrameSync"),
    InstanceMethod<&FormatContext::SeekFileAsync>("seekFile"),
    InstanceMethod<&FormatContext::SeekFileSync>("seekFileSync"),
    InstanceMethod<&FormatContext::WriteHeaderAsync>("writeHeader"),
    InstanceMethod<&FormatContext::WriteHeaderSync>("writeHeaderSync"),
    InstanceMethod<&FormatContext::WriteFrameAsync>("writeFrame"),
    InstanceMethod<&FormatContext::WriteFrameSync>("writeFrameSync"),
    InstanceMethod<&FormatContext::InterleavedWriteFrameAsync>("interleavedWriteFrame"),
    InstanceMethod<&FormatContext::InterleavedWriteFrameSync>("interleavedWriteFrameSync"),
    InstanceMethod<&FormatContext::WriteTrailerAsync>("writeTrailer"),
    InstanceMethod<&FormatContext::WriteTrailerSync>("writeTrailerSync"),
    InstanceMethod<&FormatContext::FlushAsync>("flush"),
    InstanceMethod<&FormatContext::FlushSync>("flushSync"),
    InstanceMethod<&FormatContext::NewStream>("newStream"),
    InstanceMethod<&FormatContext::DumpFormat>("dumpFormat"),
    InstanceMethod<&FormatContext::FindBestStream>("findBestStream"),
    InstanceMethod<&FormatContext::GetRTSPStreamInfo>("getRTSPStreamInfo"),
    InstanceMethod<&FormatContext::SendRTSPPacketAsync>("sendRTSPPacket"),
    InstanceMethod<&FormatContext::SendRTSPPacketSync>("sendRTSPPacketSync"),
    InstanceMethod<&FormatContext::Interrupt>("interrupt"),
    InstanceMethod(Napi::Symbol::WellKnown(env, "asyncDispose"), &FormatContext::DisposeAsync),

    InstanceAccessor<&FormatContext::GetStreams, nullptr>("streams"),
    InstanceAccessor<&FormatContext::GetNbStreams, nullptr>("nbStreams"),
    InstanceAccessor("url", &FormatContext::GetUrl, &FormatContext::SetUrl, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&FormatContext::GetStartTime, nullptr>("startTime"),
    InstanceAccessor<&FormatContext::GetDuration, nullptr>("duration"),
    InstanceAccessor<&FormatContext::GetBitRate, nullptr>("bitRate"),
    InstanceAccessor("flags", &FormatContext::GetFlags, &FormatContext::SetFlagsAccessor, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("probesize", &FormatContext::GetProbesize, &FormatContext::SetProbesize, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("maxAnalyzeDuration", &FormatContext::GetMaxAnalyzeDuration, &FormatContext::SetMaxAnalyzeDuration, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("maxInterleaveDelta", &FormatContext::GetMaxInterleaveDelta, &FormatContext::SetMaxInterleaveDelta, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("metadata", &FormatContext::GetMetadata, &FormatContext::SetMetadata, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&FormatContext::GetIformat, nullptr>("iformat"),
    InstanceAccessor("oformat", &FormatContext::GetOformat, &FormatContext::SetOformat, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("pb", nullptr, &FormatContext::SetPb, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&FormatContext::GetPbBytes, nullptr>("pbBytes"),
    InstanceAccessor("strictStdCompliance", &FormatContext::GetStrictStdCompliance, &FormatContext::SetStrictStdCompliance, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("maxStreams", &FormatContext::GetMaxStreams, &FormatContext::SetMaxStreams, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&FormatContext::GetNbPrograms, nullptr>("nbPrograms"),
    InstanceAccessor<&FormatContext::GetProbeScore, nullptr>("probeScore"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("FormatContext", func);
  return exports;
}

// === Lifecycle ===

FormatContext::FormatContext(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<FormatContext>(info) {
  // Constructor does nothing - user must explicitly call allocContext or allocOutputContext2
}

FormatContext::~FormatContext() {
  // Clean up if user forgot to call freeContext()
  if (ctx_) {
    // Clear the interrupt callback opaque
    ctx_->interrupt_callback.opaque = nullptr;

    // We never own custom pb - IOContext always keeps ownership

    if (is_output_) {
      // For output contexts
      // Only close pb if it's not custom IO
      if (ctx_->pb && !(ctx_->flags & AVFMT_FLAG_CUSTOM_IO)) {
        if (!ctx_->oformat || !(ctx_->oformat->flags & AVFMT_NOFILE)) {
          avio_closep(&ctx_->pb);
        }
      }
      avformat_free_context(ctx_);
    } else {
      // For input contexts
      // avformat_close_input will set pb to NULL but not free custom pb
      avformat_close_input(&ctx_);
    }
    ctx_ = nullptr;
  }
}

// === Methods ===

Napi::Value FormatContext::AllocContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVFormatContext* new_ctx = avformat_alloc_context();
  if (!new_ctx) {
    Napi::Error::New(env, "Failed to allocate format context").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Register interrupt callback BEFORE avformat_open_input()
  // This allows FFmpeg to check for interruption during blocking I/O operations
  new_ctx->interrupt_callback.callback = InterruptCallback;
  new_ctx->interrupt_callback.opaque = this;
  interrupt_requested_.store(false);

  ctx_ = new_ctx;
  is_output_ = false;

  return env.Undefined();
}

Napi::Value FormatContext::AllocOutputContext2(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Expected 3 arguments (oformat, formatName, filename)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  AVOutputFormat* oformat = nullptr;
  const char* format_name = nullptr;
  const char* filename = nullptr;
  
  // oformat can be null
  if (!info[0].IsNull() && !info[0].IsUndefined()) {
    OutputFormat* outputFormat = UnwrapNativeObject<OutputFormat>(env, info[0], "OutputFormat");
    if (outputFormat) {
      oformat = outputFormat->Get();
    }
  }
  
  std::string format_name_str;
  if (!info[1].IsNull() && !info[1].IsUndefined()) {
    format_name_str = info[1].As<Napi::String>().Utf8Value();
    format_name = format_name_str.c_str();
  }
  
  std::string filename_str;
  if (!info[2].IsNull() && !info[2].IsUndefined()) {
    filename_str = info[2].As<Napi::String>().Utf8Value();
    filename = filename_str.c_str();
  }
  
  AVFormatContext* new_ctx = nullptr;
  int ret = avformat_alloc_output_context2(&new_ctx, oformat, format_name, filename);

  if (ret < 0) {
    char errbuf[AV_ERROR_MAX_STRING_SIZE];
    av_strerror(ret, errbuf, sizeof(errbuf));
    Napi::Error::New(env, std::string("Failed to allocate output context: ") + errbuf).ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Register interrupt callback for output contexts too
  new_ctx->interrupt_callback.callback = InterruptCallback;
  new_ctx->interrupt_callback.opaque = this;
  interrupt_requested_.store(false);

  ctx_ = new_ctx;
  is_output_ = true;

  return Napi::Number::New(env, ret);
}

Napi::Value FormatContext::FreeContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    // Already freed
    return env.Undefined();
  }

  // Freeing while a worker still uses the context on the threadpool would be
  // a use-after-free; wait bounded, then error instead of crashing. Blocked
  // readers are not interrupted here - freeContext() has no abort semantics,
  // use closeInput()/interrupt() for that.
  if (!GuardAsyncOps(env, async_ops_, "FormatContext")) {
    return env.Undefined();
  }

  // Exclusive hold on the context lifetime: a reader that slipped past the
  // counters still pins ctx_ via its shared lock - fail with EBUSY instead of
  // freeing underneath it (see ctx_mutex_)
  std::unique_lock<std::shared_timed_mutex> lifecycle(ctx_mutex_, std::defer_lock);
  if (!lifecycle.try_lock_for(std::chrono::seconds(3))) {
    Napi::Error::New(env, "FormatContext is busy: operation still in flight").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  AVFormatContext* ctx = ctx_;
  ctx_ = nullptr;

  if (!ctx) {
    // Already freed
    return env.Undefined();
  }

  // Clear the interrupt callback opaque pointer
  ctx->interrupt_callback.opaque = nullptr;

  if (is_output_) {
    // For output contexts allocated with avformat_alloc_output_context2
    // Close pb if it exists and the format requires file I/O
    // OR if it's a custom IO context (no oformat check needed for custom IO)
    if (ctx->pb) {
      if (!ctx->oformat || !(ctx->oformat->flags & AVFMT_NOFILE)) {
        avio_closep(&ctx->pb);
      }
    }
    avformat_free_context(ctx);
  } else {
    // For input contexts, use avformat_close_input which also frees the context
    avformat_close_input(&ctx);
  }

  is_output_ = false;

  return env.Undefined();
}

Napi::Value FormatContext::NewStream(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  AVCodec* codec = nullptr;
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Codec* codecWrapper = UnwrapNativeObject<Codec>(env, info[0], "Codec");
    if (codecWrapper) {
      codec = const_cast<AVCodec*>(codecWrapper->Get());
    }
  }
  
  AVStream* stream = avformat_new_stream(ctx, codec);
  if (!stream) {
    Napi::Error::New(env, "Failed to create new stream").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Wrap AVStream and return it
  Napi::Object streamObj = Stream::constructor.New({});
  Stream* streamWrapper = UnwrapNativeObject<Stream>(env, streamObj, "Stream");
  streamWrapper->Set(stream);
  
  return streamObj;
}

Napi::Value FormatContext::DumpFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Parameters: index, url, is_output
  int index = 0;
  std::string url = "";
  int is_output = 0;
  
  if (info.Length() > 0 && info[0].IsNumber()) {
    index = info[0].As<Napi::Number>().Int32Value();
  }
  
  if (info.Length() > 1 && info[1].IsString()) {
    url = info[1].As<Napi::String>().Utf8Value();
  }
  
  if (info.Length() > 2 && info[2].IsBoolean()) {
    is_output = info[2].As<Napi::Boolean>().Value() ? 1 : 0;
  }
  
  // Call av_dump_format - prints to stderr
  av_dump_format(ctx, index, url.c_str(), is_output);
  
  return env.Undefined();
}

Napi::Value FormatContext::FindBestStream(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  // Parameters: type, wanted_stream_nb, related_stream, decoder_ret, flags
  int type = AVMEDIA_TYPE_UNKNOWN;
  int wanted_stream_nb = -1;
  int related_stream = -1;
  const AVCodec* decoder = nullptr;
  const AVCodec** decoder_ret = nullptr;
  int flags = 0;
  
  if (info.Length() > 0 && info[0].IsNumber()) {
    type = info[0].As<Napi::Number>().Int32Value();
  }
  
  if (info.Length() > 1 && info[1].IsNumber()) {
    wanted_stream_nb = info[1].As<Napi::Number>().Int32Value();
  }
  
  if (info.Length() > 2 && info[2].IsNumber()) {
    related_stream = info[2].As<Napi::Number>().Int32Value();
  }
  
  // Check if caller wants decoder returned (4th parameter)
  bool wantDecoder = false;
  if (info.Length() > 3 && info[3].IsBoolean()) {
    wantDecoder = info[3].As<Napi::Boolean>().Value();
    if (wantDecoder) {
      decoder_ret = &decoder;
    }
  }
  
  if (info.Length() > 4 && info[4].IsNumber()) {
    flags = info[4].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_find_best_stream(ctx, static_cast<AVMediaType>(type), 
                                wanted_stream_nb, related_stream, 
                                decoder_ret, flags);
  
  // If decoder was requested and found, return object with stream index and decoder
  if (wantDecoder && decoder && ret >= 0) {
    Napi::Object result = Napi::Object::New(env);
    result.Set("streamIndex", Napi::Number::New(env, ret));
    
    // Create Codec wrapper for the decoder
    Napi::Object codecObj = Codec::NewInstance(env, const_cast<AVCodec*>(decoder));
    result.Set("decoder", codecObj);
    
    return result;
  }
  
  return Napi::Number::New(env, ret);
}

Napi::Value FormatContext::GetRTSPStreamInfo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!ctx_) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Return null if this is not an RTSP input context
  if (!ctx_->iformat || !ctx_->iformat->name ||
      (strcmp(ctx_->iformat->name, "rtsp") != 0)) {
    return env.Null();
  }

  // Return null if RTSP private data not available
  RTSPState* rt = static_cast<RTSPState*>(ctx_->priv_data);
  if (!rt) {
    return env.Null();
  }

  // Determine transport type (applies to all streams)
  const char* transport_str = "unknown";
  switch (rt->lower_transport) {
    case RTSP_LOWER_TRANSPORT_UDP:
      transport_str = "udp";
      break;
    case RTSP_LOWER_TRANSPORT_TCP:
      transport_str = "tcp";
      break;
    case RTSP_LOWER_TRANSPORT_UDP_MULTICAST:
      transport_str = "udp_multicast";
      break;
  }

  // Build array of stream info
  Napi::Array streams = Napi::Array::New(env);

  for (int i = 0; i < rt->nb_rtsp_streams; i++) {
    RTSPStream* rtsp_st = rt->rtsp_streams[i];
    if (!rtsp_st) continue;

    Napi::Object streamInfo = Napi::Object::New(env);
    streamInfo.Set("streamIndex", Napi::Number::New(env, rtsp_st->stream_index));
    streamInfo.Set("controlUrl", Napi::String::New(env, rtsp_st->control_url));
    streamInfo.Set("transport", Napi::String::New(env, transport_str));
    streamInfo.Set("payloadType", Napi::Number::New(env, rtsp_st->sdp_payload_type));

    // Get codec information from AVStream
    if (rtsp_st->stream_index >= 0 && rtsp_st->stream_index < (int)ctx_->nb_streams) {
      AVStream* stream = ctx_->streams[rtsp_st->stream_index];
      if (stream && stream->codecpar) {
        streamInfo.Set("codecId", Napi::Number::New(env, stream->codecpar->codec_id));

        // Add media type
        const char* media_type_str = "unknown";
        switch (stream->codecpar->codec_type) {
          case AVMEDIA_TYPE_VIDEO:
            media_type_str = "video";
            break;
          case AVMEDIA_TYPE_AUDIO:
            media_type_str = "audio";
            break;
          case AVMEDIA_TYPE_DATA:
            media_type_str = "data";
            break;
          case AVMEDIA_TYPE_SUBTITLE:
            media_type_str = "subtitle";
            break;
          case AVMEDIA_TYPE_ATTACHMENT:
            media_type_str = "attachment";
            break;
          case AVMEDIA_TYPE_NB:
          case AVMEDIA_TYPE_UNKNOWN:
          default:
            media_type_str = "unknown";
            break;
        }
        streamInfo.Set("mediaType", Napi::String::New(env, media_type_str));

        // Use MIME type directly from SDP if available, otherwise build from parsed values
        if (rtsp_st->sdp_mime_type[0] != '\0') {
          // Use the complete MIME type string from SDP rtpmap line
          streamInfo.Set("mimeType", Napi::String::New(env, rtsp_st->sdp_mime_type));
        } else {
          // Get RTP codec name from dynamic_handler (directly from SDP) if available
          const char* rtp_codec_name = nullptr;
          if (rtsp_st->dynamic_handler && rtsp_st->dynamic_handler->enc_name) {
            rtp_codec_name = rtsp_st->dynamic_handler->enc_name;
          } else {
            // Fallback: Map AVCodecID to RTP/SDP-compliant codec name
            switch (stream->codecpar->codec_id) {
              // Audio codecs
              case AV_CODEC_ID_PCM_ALAW:   rtp_codec_name = "PCMA"; break;
              case AV_CODEC_ID_PCM_MULAW:  rtp_codec_name = "PCMU"; break;
              case AV_CODEC_ID_OPUS:       rtp_codec_name = "opus"; break;
              case AV_CODEC_ID_AAC:        rtp_codec_name = "mpeg4-generic"; break;
              case AV_CODEC_ID_MP3:        rtp_codec_name = "MPA"; break;
              case AV_CODEC_ID_VORBIS:     rtp_codec_name = "vorbis"; break;

              // Video codecs
              case AV_CODEC_ID_H264:       rtp_codec_name = "H264"; break;
              case AV_CODEC_ID_H265:       rtp_codec_name = "H265"; break;
              case AV_CODEC_ID_VP8:        rtp_codec_name = "VP8"; break;
              case AV_CODEC_ID_VP9:        rtp_codec_name = "VP9"; break;
              case AV_CODEC_ID_AV1:        rtp_codec_name = "AV1"; break;
              case AV_CODEC_ID_MJPEG:      rtp_codec_name = "JPEG"; break;
              case AV_CODEC_ID_MPEG4:      rtp_codec_name = "MP4V-ES"; break;

              default:
                // Fallback: use FFmpeg codec name and uppercase first letter
                const char* ffmpeg_name = avcodec_get_name(stream->codecpar->codec_id);
                static char fallback_name[64];
                snprintf(fallback_name, sizeof(fallback_name), "%s", ffmpeg_name);
                if (fallback_name[0] >= 'a' && fallback_name[0] <= 'z') {
                  fallback_name[0] = fallback_name[0] - 'a' + 'A';
                }
                rtp_codec_name = fallback_name;
                break;
            }
          }


          // Fallback: Build RTP MIME type from SDP-parsed values (e.g., "H264/90000" or "PCMA/8000")
          char mime_type[128];

          if (stream->codecpar->codec_type == AVMEDIA_TYPE_AUDIO) {
            // Audio: Use sample_rate from SDP (clock rate) and channels
            int sample_rate = stream->codecpar->sample_rate;
            int channels = stream->codecpar->ch_layout.nb_channels;

            streamInfo.Set("sampleRate", Napi::Number::New(env, sample_rate));
            streamInfo.Set("channels", Napi::Number::New(env, channels));

            // Audio MIME: codec/rate or codec/rate/channels (as parsed from SDP)
            if (channels > 1) {
              snprintf(mime_type, sizeof(mime_type), "%s/%d/%d", rtp_codec_name, sample_rate, channels);
            } else {
              snprintf(mime_type, sizeof(mime_type), "%s/%d", rtp_codec_name, sample_rate);
            }
          } else if (stream->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
            // Video: Use clock rate from timebase (as parsed from SDP rtpmap line)
            // FFmpeg stores the clock rate in time_base.den (numerator is 1)
            int clock_rate = stream->time_base.den;

            // Video MIME: codec/clock_rate (as parsed from SDP)
            snprintf(mime_type, sizeof(mime_type), "%s/%d", rtp_codec_name, clock_rate);
          } else {
            // Other types: Use clock rate from timebase if available
            int clock_rate = stream->time_base.den > 0 ? stream->time_base.den : 90000;
            snprintf(mime_type, sizeof(mime_type), "%s/%d", rtp_codec_name, clock_rate);
          }

          streamInfo.Set("mimeType", Napi::String::New(env, mime_type));
        }

        // Add audio properties if not set yet (when using sdp_mime_type directly)
        if (stream->codecpar->codec_type == AVMEDIA_TYPE_AUDIO) {
          int sample_rate = stream->codecpar->sample_rate;
          int channels = stream->codecpar->ch_layout.nb_channels;
          streamInfo.Set("sampleRate", Napi::Number::New(env, sample_rate));
          streamInfo.Set("channels", Napi::Number::New(env, channels));
        }
      }
    }

    // SDP direction attribute (RFC 4566)
    const char* direction_str = "recvonly"; // default
    switch (rtsp_st->sdp_direction) {
      case RTSP_DIRECTION_SENDONLY:
        direction_str = "sendonly";
        break;
      case RTSP_DIRECTION_RECVONLY:
        direction_str = "recvonly";
        break;
      case RTSP_DIRECTION_SENDRECV:
        direction_str = "sendrecv";
        break;
      case RTSP_DIRECTION_INACTIVE:
        direction_str = "inactive";
        break;
    }
    streamInfo.Set("direction", Napi::String::New(env, direction_str));

    // Add FMTP parameters from SDP if available
    if (rtsp_st->sdp_fmtp[0] != '\0') {
      streamInfo.Set("fmtp", Napi::String::New(env, rtsp_st->sdp_fmtp));
    }

    streams.Set(i, streamInfo);
  }

  return streams;
}

Napi::Value FormatContext::GetStreams(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::Array::New(env, 0);
  }
  
  Napi::Array streams = Napi::Array::New(env, ctx->nb_streams);
  
  for (unsigned int i = 0; i < ctx->nb_streams; i++) {
    // Wrap AVStream and add to array
    Napi::Object streamObj = Stream::constructor.New({});
    Stream* streamWrapper = UnwrapNativeObject<Stream>(env, streamObj, "Stream");
    streamWrapper->Set(ctx->streams[i]);
    streams[i] = streamObj;
  }
  
  return streams;
}

Napi::Value FormatContext::GetNbStreams(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->nb_streams);
}

// === Properties ===

Napi::Value FormatContext::GetUrl(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx || !ctx->url) {
    return env.Null();
  }
  
  return Napi::String::New(env, ctx->url);
}

void FormatContext::SetUrl(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return;
  }
  
  if (value.IsString()) {
    std::string url = value.As<Napi::String>().Utf8Value();
    av_freep(&ctx->url);
    ctx->url = av_strdup(url.c_str());
  }
}

Napi::Value FormatContext::GetStartTime(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::BigInt::New(env, static_cast<int64_t>(-1));
  }
  
  return Napi::BigInt::New(env, ctx->start_time);
}

Napi::Value FormatContext::GetDuration(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::BigInt::New(env, static_cast<int64_t>(-1));
  }
  
  return Napi::BigInt::New(env, ctx->duration);
}

Napi::Value FormatContext::GetBitRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  
  return Napi::BigInt::New(env, ctx->bit_rate);
}

Napi::Value FormatContext::GetFlags(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->flags);
}

void FormatContext::SetFlagsAccessor(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();

  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return;
  }

  if (value.IsNumber()) {
    ctx->flags = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value FormatContext::GetProbesize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  
  return Napi::BigInt::New(env, ctx->probesize);
}

void FormatContext::SetProbesize(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return;
  }
  
  if (value.IsBigInt()) {
    bool lossless;
    ctx->probesize = value.As<Napi::BigInt>().Int64Value(&lossless);
  } else if (value.IsNumber()) {
    ctx->probesize = value.As<Napi::Number>().Int64Value();
  }
}

Napi::Value FormatContext::GetMaxAnalyzeDuration(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  
  return Napi::BigInt::New(env, ctx->max_analyze_duration);
}

void FormatContext::SetMaxAnalyzeDuration(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();

  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return;
  }

  if (value.IsBigInt()) {
    bool lossless;
    ctx->max_analyze_duration = value.As<Napi::BigInt>().Int64Value(&lossless);
  } else if (value.IsNumber()) {
    ctx->max_analyze_duration = value.As<Napi::Number>().Int64Value();
  }
}

Napi::Value FormatContext::GetMaxInterleaveDelta(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }

  return Napi::BigInt::New(env, ctx->max_interleave_delta);
}

void FormatContext::SetMaxInterleaveDelta(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();

  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return;
  }

  if (value.IsBigInt()) {
    bool lossless;
    ctx->max_interleave_delta = value.As<Napi::BigInt>().Int64Value(&lossless);
  } else if (value.IsNumber()) {
    ctx->max_interleave_delta = value.As<Napi::Number>().Int64Value();
  }
}

Napi::Value FormatContext::GetMetadata(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx || !ctx->metadata) {
    return env.Null();
  }
  
  // Create a Dictionary wrapper for the metadata
  Napi::Object dictObj = Dictionary::constructor.New({});
  Dictionary* dict = UnwrapNativeObject<Dictionary>(env, dictObj, "Dictionary");
  
  // Copy the dictionary content (we transfer ownership of the copy)
  AVDictionary* copy = nullptr;
  av_dict_copy(&copy, ctx->metadata, 0);
  dict->SetOwned(copy);
  
  return dictObj;
}

void FormatContext::SetMetadata(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    // Clear metadata
    if (ctx->metadata) {
      av_dict_free(&ctx->metadata);
      ctx->metadata = nullptr;
    }
    return;
  }
  
  Dictionary* dict = UnwrapNativeObject<Dictionary>(env, value, "Dictionary");
  if (dict && dict->Get()) {
    // Free existing metadata
    if (ctx->metadata) {
      av_dict_free(&ctx->metadata);
    }
    // Copy the dictionary content
    av_dict_copy(&ctx->metadata, dict->Get(), 0);
  }
}

Napi::Value FormatContext::GetIformat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx || !ctx->iformat) {
    return env.Null();
  }
  
  // Create an InputFormat wrapper
  Napi::Object formatObj = InputFormat::constructor.New({});
  InputFormat* format = UnwrapNativeObject<InputFormat>(env, formatObj, "InputFormat");
  format->Set(const_cast<AVInputFormat*>(ctx->iformat));
  
  return formatObj;
}

Napi::Value FormatContext::GetOformat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx || !ctx->oformat) {
    return env.Null();
  }
  
  // Create an OutputFormat wrapper
  Napi::Object formatObj = OutputFormat::constructor.New({});
  OutputFormat* format = UnwrapNativeObject<OutputFormat>(env, formatObj, "OutputFormat");
  format->Set(const_cast<AVOutputFormat*>(ctx->oformat));
  
  return formatObj;
}

void FormatContext::SetOformat(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    ctx->oformat = nullptr;
    return;
  }
  
  OutputFormat* format = UnwrapNativeObject<OutputFormat>(env, value, "OutputFormat");
  if (format) {
    ctx->oformat = format->Get();
  }
}

void FormatContext::SetPb(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    ctx->pb = nullptr;
    return;
  }
  
  IOContext* io = UnwrapNativeObject<IOContext>(env, value, "IOContext");
  if (io) {
    // Set the custom IO context
    ctx->pb = io->Get();

    // AVFMT_FLAG_CUSTOM_IO marks a pb that libavformat must never close for us
    // (avformat_close_input() would otherwise avio_closep() it). Only
    // callback-backed contexts qualify: a pb opened via avio_open2() owns a
    // protocol handle that still has to be released with avio_closep(), and
    // flagging it as custom IO would leak the file descriptor / Windows HANDLE
    // - the file then stays locked until the process exits.
    if (io->callback_data_) {
      ctx->flags |= AVFMT_FLAG_CUSTOM_IO;
    }

    // We never own custom pb - IOContext keeps ownership
  }
}

Napi::Value FormatContext::GetStrictStdCompliance(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->strict_std_compliance);
}

void FormatContext::SetStrictStdCompliance(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return;
  }
  
  if (value.IsNumber()) {
    ctx->strict_std_compliance = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value FormatContext::GetMaxStreams(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->max_streams);
}

Napi::Value FormatContext::GetNbPrograms(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->nb_programs);
}

Napi::Value FormatContext::GetPbBytes(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx || !ctx->pb) {
    return Napi::Number::New(env, 0);
  }
  
  // Get current position in the file (bytes read/written)
  int64_t pos = avio_tell(ctx->pb);
  if (pos < 0) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::BigInt::New(env, pos);
}

Napi::Value FormatContext::GetProbeScore(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, ctx->probe_score);
}

void FormatContext::SetMaxStreams(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  AVFormatContext* ctx = ctx_;
  if (!ctx) {
    Napi::Error::New(env, "Format context not allocated").ThrowAsJavaScriptException();
    return;
  }
  
  if (value.IsNumber()) {
    ctx->max_streams = value.As<Napi::Number>().Uint32Value();
  }
}

// Builds the per-stream options array required by avformat_find_stream_info().
// FFmpeg's contract is "an ic.nb_streams long array" of AVDictionary* — passing a
// single dictionary would make FFmpeg read options[1..] out of bounds on
// multi-stream input. Each provided Dictionary is copied via av_dict_copy() so
// FFmpeg consumes the copies and the JS wrapper dictionaries are never freed;
// missing or extra entries stay nullptr. Returns false with a pending TypeError
// if value is neither null/undefined nor an array.
bool FormatContext::BuildStreamOptions(Napi::Env env, const Napi::Value& value, unsigned int nb_streams, std::vector<AVDictionary*>& out) {
  out.assign(nb_streams, nullptr);

  if (value.IsNull() || value.IsUndefined()) {
    return true;
  }

  if (!value.IsArray()) {
    Napi::TypeError::New(env, "options must be an array of Dictionary or null").ThrowAsJavaScriptException();
    return false;
  }

  Napi::Array arr = value.As<Napi::Array>();
  uint32_t count = arr.Length() < nb_streams ? arr.Length() : nb_streams;
  for (uint32_t i = 0; i < count; i++) {
    Napi::Value item = arr.Get(i);
    if (item.IsNull() || item.IsUndefined()) {
      continue;
    }
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, item, "Dictionary");
    if (dict && dict->Get()) {
      av_dict_copy(&out[i], dict->Get(), 0);
    }
  }

  return true;
}

// Frees the dictionary copies created by BuildStreamOptions
void FormatContext::FreeStreamOptions(std::vector<AVDictionary*>& options) {
  for (auto& dict : options) {
    if (dict) {
      av_dict_free(&dict);
    }
  }
  options.clear();
}

int FormatContext::InterruptCallback(void* opaque) {
  // The opaque pointer might be invalid if FormatContext was destroyed
  if (!opaque) {
    return 0;
  }

  FormatContext* self = static_cast<FormatContext*>(opaque);

  // Return 1 to interrupt FFmpeg operations, 0 to continue
  return self->interrupt_requested_.load() ? 1 : 0;
}

Napi::Value FormatContext::Interrupt(const Napi::CallbackInfo& info) {
  RequestInterrupt();
  return info.Env().Undefined();
}

void FormatContext::RequestInterrupt() {
  interrupt_requested_.store(true);
}

} // namespace ffmpeg