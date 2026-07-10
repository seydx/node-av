#include "codec_context.h"
#include "codec.h"
#include "codec_parameters.h"
#include "packet.h"
#include "frame.h"
#include "dictionary.h"
#include "hardware_device_context.h"
#include "hardware_frames_context.h"
#include "common.h"

extern "C" {
#include <libavutil/pixfmt.h>
#include <libavutil/opt.h>
}

namespace ffmpeg {

thread_local Napi::FunctionReference CodecContext::constructor;

Napi::Object CodecContext::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "CodecContext", {
    InstanceMethod<&CodecContext::AllocContext3>("allocContext3"),
    InstanceMethod<&CodecContext::FreeContext>("freeContext"),
    InstanceMethod<&CodecContext::Open2Async>("open2"),
    InstanceMethod<&CodecContext::Open2Sync>("open2Sync"),
    InstanceMethod<&CodecContext::ParametersToContext>("parametersToContext"),
    InstanceMethod<&CodecContext::ParametersFromContext>("parametersFromContext"),
    InstanceMethod<&CodecContext::FlushBuffers>("flushBuffers"),
    InstanceMethod<&CodecContext::SendPacketAsync>("sendPacket"),
    InstanceMethod<&CodecContext::SendPacketSync>("sendPacketSync"),
    InstanceMethod<&CodecContext::ReceiveFrameAsync>("receiveFrame"),
    InstanceMethod<&CodecContext::ReceiveFrameSync>("receiveFrameSync"),
    InstanceMethod<&CodecContext::SendFrameAsync>("sendFrame"),
    InstanceMethod<&CodecContext::SendFrameSync>("sendFrameSync"),
    InstanceMethod<&CodecContext::ReceivePacketAsync>("receivePacket"),
    InstanceMethod<&CodecContext::ReceivePacketSync>("receivePacketSync"),
    InstanceMethod<&CodecContext::SetHardwarePixelFormat>("setHardwarePixelFormat"),
    InstanceMethod<&CodecContext::Dispose>(Napi::Symbol::WellKnown(env, "dispose")),

    InstanceAccessor("codecType", &CodecContext::GetCodecType, &CodecContext::SetCodecType, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("codecId", &CodecContext::GetCodecId, &CodecContext::SetCodecId, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("codecTag", &CodecContext::GetCodecTag, &CodecContext::SetCodecTag, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&CodecContext::GetCodecTagString>("codecTagString"),
    InstanceAccessor("bitRate", &CodecContext::GetBitRate, &CodecContext::SetBitRate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("timeBase", &CodecContext::GetTimeBase, &CodecContext::SetTimeBase, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("pktTimebase", &CodecContext::GetPktTimebase, &CodecContext::SetPktTimebase, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&CodecContext::GetDelay>("delay"),
    InstanceAccessor("flags", &CodecContext::GetFlags, &CodecContext::SetFlagsAccessor, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("flags2", &CodecContext::GetFlags2, &CodecContext::SetFlags2Accessor, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("extraData", &CodecContext::GetExtraData, &CodecContext::SetExtraData, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("profile", &CodecContext::GetProfile, &CodecContext::SetProfile, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("level", &CodecContext::GetLevel, &CodecContext::SetLevel, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("threadCount", &CodecContext::GetThreadCount, &CodecContext::SetThreadCount, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("threadType", &CodecContext::GetThreadType, &CodecContext::SetThreadType, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("width", &CodecContext::GetWidth, &CodecContext::SetWidth, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("height", &CodecContext::GetHeight, &CodecContext::SetHeight, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("gopSize", &CodecContext::GetGopSize, &CodecContext::SetGopSize, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("pixelFormat", &CodecContext::GetPixelFormat, &CodecContext::SetPixelFormat, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("maxBFrames", &CodecContext::GetMaxBFrames, &CodecContext::SetMaxBFrames, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("mbDecision", &CodecContext::GetMbDecision, &CodecContext::SetMbDecision, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&CodecContext::GetHasBFrames>("hasBFrames"),
    InstanceAccessor("sampleAspectRatio", &CodecContext::GetSampleAspectRatio, &CodecContext::SetSampleAspectRatio, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("framerate", &CodecContext::GetFramerate, &CodecContext::SetFramerate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorRange", &CodecContext::GetColorRange, &CodecContext::SetColorRange, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorPrimaries", &CodecContext::GetColorPrimaries, &CodecContext::SetColorPrimaries, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorTrc", &CodecContext::GetColorTrc, &CodecContext::SetColorTrc, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorSpace", &CodecContext::GetColorSpace, &CodecContext::SetColorSpace, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("chromaLocation", &CodecContext::GetChromaLocation, &CodecContext::SetChromaLocation, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("sampleRate", &CodecContext::GetSampleRate, &CodecContext::SetSampleRate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("channels", &CodecContext::GetChannels, &CodecContext::SetChannels, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("sampleFormat", &CodecContext::GetSampleFormat, &CodecContext::SetSampleFormat, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("frameSize", &CodecContext::GetFrameSize, &CodecContext::SetFrameSize, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("bitsPerCodedSample", &CodecContext::GetBitsPerCodedSample, &CodecContext::SetBitsPerCodedSample, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("bitsPerRawSample", &CodecContext::GetBitsPerRawSample, &CodecContext::SetBitsPerRawSample, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&CodecContext::GetFrameNumber>("frameNumber"),
    InstanceAccessor("channelLayout", &CodecContext::GetChannelLayout, &CodecContext::SetChannelLayout, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("qMin", &CodecContext::GetQMin, &CodecContext::SetQMin, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("qMax", &CodecContext::GetQMax, &CodecContext::SetQMax, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("globalQuality", &CodecContext::GetGlobalQuality, &CodecContext::SetGlobalQuality, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("rcBufferSize", &CodecContext::GetRcBufferSize, &CodecContext::SetRcBufferSize, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("rcMaxRate", &CodecContext::GetRcMaxRate, &CodecContext::SetRcMaxRate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("rcMinRate", &CodecContext::GetRcMinRate, &CodecContext::SetRcMinRate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("hwDeviceCtx", &CodecContext::GetHwDeviceCtx, &CodecContext::SetHwDeviceCtx, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("hwFramesCtx", &CodecContext::GetHwFramesCtx, &CodecContext::SetHwFramesCtx, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("extraHWFrames", &CodecContext::GetExtraHWFrames, &CodecContext::SetExtraHWFrames, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&CodecContext::IsOpen>("isOpen"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("CodecContext", func);
  return exports;
}

CodecContext::CodecContext(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<CodecContext>(info) {
  // Constructor does nothing - user must explicitly call allocContext3()
}

CodecContext::~CodecContext() {
  avcodec_free_context(&context_);
}

Napi::Value CodecContext::AllocContext3(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  const AVCodec* codec = nullptr;
  
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Codec* codecObj = UnwrapNativeObject<Codec>(env, info[0], "Codec");
    if (codecObj) {
      codec = codecObj->Get();
    }
  }
  
  // Replacing an existing context while a worker still uses it on the
  // threadpool would be a use-after-free; wait for in-flight operations first
  if (context_) {
    if (!GuardAsyncOps(env, async_ops_, "CodecContext")) {
      return env.Undefined();
    }
  }

  AVCodecContext* ctx = avcodec_alloc_context3(codec);
  if (!ctx) {
    Napi::Error::New(env, "Failed to allocate codec context (ENOMEM)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  context_ = ctx;
  return env.Undefined();
}

Napi::Value CodecContext::FreeContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (context_) {
    // Freeing while a worker still uses the context on the threadpool would be
    // a use-after-free; wait bounded, then error instead of crashing
    if (!GuardAsyncOps(env, async_ops_, "CodecContext")) {
      return env.Undefined();
    }
    avcodec_free_context(&context_);
  }

  return env.Undefined();
}

int CodecContext::ValidateAudioFrame(const AVCodecContext* avctx, const AVFrame* frame) {
  if (!frame || avctx->codec_type != AVMEDIA_TYPE_AUDIO) {
    return 0;
  }

  // A channel count mismatch makes FFmpeg dereference per-channel planes that
  // don't exist on the frame - a crash, not a clean error - so reject it here
  if (frame->ch_layout.nb_channels != avctx->ch_layout.nb_channels) {
    return AVERROR(EINVAL);
  }

  // Sample format mismatch (e.g. planar vs interleaved) misinterprets the buffer layout
  if (frame->format != avctx->sample_fmt) {
    return AVERROR(EINVAL);
  }

  return 0;
}

Napi::Value CodecContext::ParametersToContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!context_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "CodecParameters object required").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  CodecParameters* params = UnwrapNativeObject<CodecParameters>(env, info[0], "CodecParameters");
  if (!params || !params->Get()) {
    Napi::TypeError::New(env, "Invalid CodecParameters object").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = avcodec_parameters_to_context(context_, params->Get());
  return Napi::Number::New(env, ret);
}

Napi::Value CodecContext::ParametersFromContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!context_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "CodecParameters object required").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  CodecParameters* params = UnwrapNativeObject<CodecParameters>(env, info[0], "CodecParameters");
  if (!params || !params->Get()) {
    Napi::TypeError::New(env, "Invalid CodecParameters object").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = avcodec_parameters_from_context(params->Get(), context_);
  return Napi::Number::New(env, ret);
}

Napi::Value CodecContext::FlushBuffers(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (context_) {
    avcodec_flush_buffers(context_);
  }
  
  return env.Undefined();
}

Napi::Value CodecContext::GetCodecType(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AVMEDIA_TYPE_UNKNOWN);
  }
  return Napi::Number::New(env, context_->codec_type);
}

void CodecContext::SetCodecType(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->codec_type = static_cast<AVMediaType>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecContext::GetCodecId(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AV_CODEC_ID_NONE);
  }
  return Napi::Number::New(env, context_->codec_id);
}

void CodecContext::SetCodecId(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->codec_id = static_cast<AVCodecID>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecContext::GetCodecTag(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->codec_tag);
}

void CodecContext::SetCodecTag(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->codec_tag = value.As<Napi::Number>().Uint32Value();
  }
}

Napi::Value CodecContext::GetCodecTagString(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return env.Null();
  }

  char buf[AV_FOURCC_MAX_STRING_SIZE] = {0};
  av_fourcc_make_string(buf, context_->codec_tag);

  return Napi::String::New(env, buf);
}

Napi::Value CodecContext::GetBitRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  return Napi::BigInt::New(env, context_->bit_rate);
}

void CodecContext::SetBitRate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    bool lossless;
    context_->bit_rate = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value CodecContext::GetTimeBase(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    AVRational tb = {0, 1};
    return RationalToJS(env, tb);
  }
  return RationalToJS(env, context_->time_base);
}

void CodecContext::SetTimeBase(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->time_base = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value CodecContext::GetPktTimebase(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    AVRational tb = {0, 1};
    return RationalToJS(env, tb);
  }
  return RationalToJS(env, context_->pkt_timebase);
}

void CodecContext::SetPktTimebase(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->pkt_timebase = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value CodecContext::GetDelay(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->delay);
}

Napi::Value CodecContext::GetFlags(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->flags);
}

void CodecContext::SetFlagsAccessor(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->flags = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetFlags2(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->flags2);
}

void CodecContext::SetFlags2Accessor(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->flags2 = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetExtraData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  AVCodecContext* ctx = context_;
  
  if (!ctx || !ctx->extradata || ctx->extradata_size <= 0) {
    return env.Null();
  }
  
  return Napi::Buffer<uint8_t>::Copy(env, ctx->extradata, ctx->extradata_size);
}

void CodecContext::SetExtraData(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  AVCodecContext* ctx = context_;
  
  if (!ctx) return;
  
  if (value.IsNull() || value.IsUndefined()) {
    if (ctx->extradata) {
      av_free(ctx->extradata);
      ctx->extradata = nullptr;
      ctx->extradata_size = 0;
    }
    return;
  }
  
  if (!value.IsBuffer()) {
    Napi::TypeError::New(env, "Extra data must be a Buffer").ThrowAsJavaScriptException();
    return;
  }
  
  Napi::Buffer<uint8_t> buffer = value.As<Napi::Buffer<uint8_t>>();
  size_t size = buffer.Length();
  
  // Free old extra data
  if (ctx->extradata) {
    av_free(ctx->extradata);
  }
  
  // Allocate and copy new extra data
  ctx->extradata = static_cast<uint8_t*>(av_mallocz(size + AV_INPUT_BUFFER_PADDING_SIZE));
  if (!ctx->extradata) {
    // Keep size consistent with the NULL pointer - FFmpeg reads extradata_size bytes
    ctx->extradata_size = 0;
    Napi::Error::New(env, "Failed to allocate extra data").ThrowAsJavaScriptException();
    return;
  }
  
  memcpy(ctx->extradata, buffer.Data(), size);
  ctx->extradata_size = size;
}





Napi::Value CodecContext::GetProfile(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AV_PROFILE_UNKNOWN);
  }
  return Napi::Number::New(env, context_->profile);
}

void CodecContext::SetProfile(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->profile = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetLevel(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AV_LEVEL_UNKNOWN);
  }
  return Napi::Number::New(env, context_->level);
}

void CodecContext::SetLevel(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->level = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetThreadCount(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->thread_count);
}

void CodecContext::SetThreadCount(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->thread_count = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetThreadType(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->thread_type);
}

void CodecContext::SetThreadType(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->thread_type = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetWidth(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->width);
}

void CodecContext::SetWidth(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->width = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetHeight(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->height);
}

void CodecContext::SetHeight(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->height = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetGopSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->gop_size);
}

void CodecContext::SetGopSize(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->gop_size = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetPixelFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AV_PIX_FMT_NONE);
  }
  return Napi::Number::New(env, context_->pix_fmt);
}

void CodecContext::SetPixelFormat(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->pix_fmt = static_cast<AVPixelFormat>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecContext::GetMaxBFrames(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->max_b_frames);
}

void CodecContext::SetMaxBFrames(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->max_b_frames = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetMbDecision(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->mb_decision);
}

void CodecContext::SetMbDecision(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->mb_decision = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetHasBFrames(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->has_b_frames);
}

Napi::Value CodecContext::GetSampleAspectRatio(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    AVRational sar = {0, 1};
    return RationalToJS(env, sar);
  }
  return RationalToJS(env, context_->sample_aspect_ratio);
}

void CodecContext::SetSampleAspectRatio(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->sample_aspect_ratio = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value CodecContext::GetFramerate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    AVRational fr = {0, 1};
    return RationalToJS(env, fr);
  }
  return RationalToJS(env, context_->framerate);
}

void CodecContext::SetFramerate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->framerate = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value CodecContext::GetColorRange(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AVCOL_RANGE_UNSPECIFIED);
  }
  return Napi::Number::New(env, context_->color_range);
}

void CodecContext::SetColorRange(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->color_range = static_cast<AVColorRange>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecContext::GetColorPrimaries(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AVCOL_PRI_UNSPECIFIED);
  }
  return Napi::Number::New(env, context_->color_primaries);
}

void CodecContext::SetColorPrimaries(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->color_primaries = static_cast<AVColorPrimaries>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecContext::GetColorTrc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AVCOL_TRC_UNSPECIFIED);
  }
  return Napi::Number::New(env, context_->color_trc);
}

void CodecContext::SetColorTrc(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->color_trc = static_cast<AVColorTransferCharacteristic>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecContext::GetColorSpace(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AVCOL_SPC_UNSPECIFIED);
  }
  return Napi::Number::New(env, context_->colorspace);
}

void CodecContext::SetColorSpace(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->colorspace = static_cast<AVColorSpace>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecContext::GetChromaLocation(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AVCHROMA_LOC_UNSPECIFIED);
  }
  return Napi::Number::New(env, context_->chroma_sample_location);
}

void CodecContext::SetChromaLocation(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->chroma_sample_location = static_cast<AVChromaLocation>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecContext::GetSampleRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->sample_rate);
}

void CodecContext::SetSampleRate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->sample_rate = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetChannels(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->ch_layout.nb_channels);
}

void CodecContext::SetChannels(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->ch_layout.nb_channels = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetSampleFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, AV_SAMPLE_FMT_NONE);
  }
  return Napi::Number::New(env, context_->sample_fmt);
}

void CodecContext::SetSampleFormat(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->sample_fmt = static_cast<AVSampleFormat>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecContext::GetFrameSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->frame_size);
}

void CodecContext::SetFrameSize(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->frame_size = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetBitsPerCodedSample(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->bits_per_coded_sample);
}

void CodecContext::SetBitsPerCodedSample(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->bits_per_coded_sample = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetBitsPerRawSample(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->bits_per_raw_sample);
}

void CodecContext::SetBitsPerRawSample(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->bits_per_raw_sample = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetFrameNumber(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->frame_num);
}

Napi::Value CodecContext::GetChannelLayout(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return env.Null();
  }
  
  AVCodecContext* ctx = context_;
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("nbChannels", Napi::Number::New(env, ctx->ch_layout.nb_channels));
  obj.Set("order", Napi::Number::New(env, ctx->ch_layout.order));
  obj.Set("mask", Napi::BigInt::New(env, ctx->ch_layout.u.mask));
  
  return obj;
}

void CodecContext::SetChannelLayout(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (!context_ || !value.IsObject()) {
    return;
  }
  
  Napi::Object obj = value.As<Napi::Object>();
  AVCodecContext* ctx = context_;

  // Free any custom channel map the previous layout may own before overwriting
  av_channel_layout_uninit(&ctx->ch_layout);
  memset(&ctx->ch_layout, 0, sizeof(AVChannelLayout));

  if (obj.Has("nbChannels")) {
    ctx->ch_layout.nb_channels = obj.Get("nbChannels").As<Napi::Number>().Int32Value();
  }
  if (obj.Has("order")) {
    ctx->ch_layout.order = static_cast<AVChannelOrder>(obj.Get("order").As<Napi::Number>().Int32Value());
  }
  if (obj.Has("mask")) {
    bool lossless;
    ctx->ch_layout.u.mask = obj.Get("mask").As<Napi::BigInt>().Uint64Value(&lossless);
  }
}

Napi::Value CodecContext::GetQMin(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 2);
  }
  return Napi::Number::New(env, context_->qmin);
}

void CodecContext::SetQMin(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->qmin = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetQMax(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 31);
  }
  return Napi::Number::New(env, context_->qmax);
}

void CodecContext::SetQMax(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->qmax = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetGlobalQuality(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->global_quality);
}

void CodecContext::SetGlobalQuality(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->global_quality = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetRcBufferSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->rc_buffer_size);
}

void CodecContext::SetRcBufferSize(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    context_->rc_buffer_size = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecContext::GetRcMaxRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  return Napi::BigInt::New(env, context_->rc_max_rate);
}

void CodecContext::SetRcMaxRate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    bool lossless;
    context_->rc_max_rate = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value CodecContext::GetRcMinRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  return Napi::BigInt::New(env, context_->rc_min_rate);
}

void CodecContext::SetRcMinRate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (context_) {
    bool lossless;
    context_->rc_min_rate = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

// Hardware Acceleration
Napi::Value CodecContext::GetHwDeviceCtx(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_ || !context_->hw_device_ctx) {
    return env.Null();
  }
  
  // Wrap the existing AVBufferRef in a HardwareDeviceContext object
  return HardwareDeviceContext::Wrap(env, context_->hw_device_ctx);
}

void CodecContext::SetHwDeviceCtx(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (!context_) {
    return;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    // Unref existing context
    if (context_->hw_device_ctx) {
      av_buffer_unref(&context_->hw_device_ctx);
    }
    return;
  }
  
  // Extract the HardwareDeviceContext and get its AVBufferRef
  if (!value.IsObject()) {
    Napi::Error::New(info.Env(), "hwDeviceCtx must be a HardwareDeviceContext object").ThrowAsJavaScriptException();
    return;
  }
  
  HardwareDeviceContext* device = UnwrapNativeObject<HardwareDeviceContext>(info.Env(), value, "HardwareDeviceContext");
  if (!device || !device->Get()) {
    Napi::Error::New(info.Env(), "Invalid HardwareDeviceContext").ThrowAsJavaScriptException();
    return;
  }
  
  // Unref old context if exists
  if (context_->hw_device_ctx) {
    av_buffer_unref(&context_->hw_device_ctx);
  }
  
  // Reference the new context
  context_->hw_device_ctx = av_buffer_ref(device->Get());
}

Napi::Value CodecContext::GetHwFramesCtx(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_ || !context_->hw_frames_ctx) {
    return env.Null();
  }
  
  // Wrap the existing AVBufferRef in a HardwareFramesContext object
  return HardwareFramesContext::Wrap(env, context_->hw_frames_ctx);
}

void CodecContext::SetHwFramesCtx(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (!context_) {
    return;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    // Unref existing context
    if (context_->hw_frames_ctx) {
      av_buffer_unref(&context_->hw_frames_ctx);
    }
    return;
  }
  
  // Extract the HardwareFramesContext and get its AVBufferRef
  if (!value.IsObject()) {
    Napi::Error::New(info.Env(), "hwFramesCtx must be a HardwareFramesContext object").ThrowAsJavaScriptException();
    return;
  }
  
  HardwareFramesContext* frames = UnwrapNativeObject<HardwareFramesContext>(info.Env(), value, "HardwareFramesContext");
  if (!frames || !frames->Get()) {
    Napi::Error::New(info.Env(), "Invalid HardwareFramesContext").ThrowAsJavaScriptException();
    return;
  }
  
  // Unref old context if exists
  if (context_->hw_frames_ctx) {
    av_buffer_unref(&context_->hw_frames_ctx);
  }
  
  // Reference the new context
  context_->hw_frames_ctx = av_buffer_ref(frames->Get());
}

Napi::Value CodecContext::GetExtraHWFrames(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, context_->extra_hw_frames);
}

void CodecContext::SetExtraHWFrames(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (!context_) {
    return;
  }

  if (value.IsNumber()) {
    int extraHWFrames = value.As<Napi::Number>().Int32Value();
    if (extraHWFrames >= 0) {
      context_->extra_hw_frames = extraHWFrames;
    }
  }
}

Napi::Value CodecContext::SetHardwarePixelFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected hardware pixel format as first argument").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (!context_) {
    Napi::Error::New(env, "CodecContext not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Set hardware pixel format
  hw_pix_fmt_ = static_cast<enum AVPixelFormat>(info[0].As<Napi::Number>().Int32Value());
  
  // Optional: Set software fallback format
  if (info.Length() >= 2 && info[1].IsNumber()) {
    sw_pix_fmt_ = static_cast<enum AVPixelFormat>(info[1].As<Napi::Number>().Int32Value());
  } else {
    sw_pix_fmt_ = AV_PIX_FMT_NONE;
  }
  
  // Store the context pointer as opaque data
  context_->opaque = this;
  
  // Set the static callback function
  context_->get_format = CodecContext::GetFormatCallback;

  return env.Undefined();
}

Napi::Value CodecContext::IsOpen(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!context_) {
    return Napi::Boolean::New(env, false);
  }
  return Napi::Boolean::New(env, avcodec_is_open(context_) > 0);
}

Napi::Value CodecContext::Dispose(const Napi::CallbackInfo& info) {
  return FreeContext(info);
}

enum AVPixelFormat CodecContext::GetFormatCallback(AVCodecContext* ctx, const enum AVPixelFormat* pix_fmts) {
  // Get the CodecContext instance from opaque
  CodecContext* self = static_cast<CodecContext*>(ctx->opaque);
  if (!self) {
    // No context, return first format
    return pix_fmts[0];
  }
  
  // Check if hardware format is in the list
  const enum AVPixelFormat* p = pix_fmts;
  while (*p != AV_PIX_FMT_NONE) {
    if (*p == self->hw_pix_fmt_) {
      return *p;
    }
    p++;
  }
  
  // Hardware format not found, try software fallback
  if (self->sw_pix_fmt_ != AV_PIX_FMT_NONE) {
    p = pix_fmts;
    while (*p != AV_PIX_FMT_NONE) {
      if (*p == self->sw_pix_fmt_) {
        return *p;
      }
      p++;
    }
  }
  
  // Neither hardware nor software format found, return first format
  return pix_fmts[0];
}

} // namespace ffmpeg