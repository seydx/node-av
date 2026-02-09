#include "stream.h"
#include "codec_parameters.h"
#include "codec_parser.h"
#include "dictionary.h"
#include "packet.h"
#include "common.h"

namespace ffmpeg {

Napi::FunctionReference Stream::constructor;

Napi::Object Stream::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "Stream", {
    InstanceAccessor<&Stream::GetIndex>("index"),
    InstanceAccessor("id", &Stream::GetId, &Stream::SetId, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("codecpar", &Stream::GetCodecpar, &Stream::SetCodecpar, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("timeBase", &Stream::GetTimeBase, &Stream::SetTimeBase, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("startTime", &Stream::GetStartTime, &Stream::SetStartTime, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("duration", &Stream::GetDuration, &Stream::SetDuration, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("nbFrames", &Stream::GetNbFrames, &Stream::SetNbFrames, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("disposition", &Stream::GetDisposition, &Stream::SetDisposition, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("discard", &Stream::GetDiscard, &Stream::SetDiscard, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("sampleAspectRatio", &Stream::GetSampleAspectRatio, &Stream::SetSampleAspectRatio, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("avgFrameRate", &Stream::GetAvgFrameRate, &Stream::SetAvgFrameRate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("rFrameRate", &Stream::GetRFrameRate, &Stream::SetRFrameRate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("metadata", &Stream::GetMetadata, &Stream::SetMetadata, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&Stream::GetAttachedPic>("attachedPic"),
    InstanceAccessor("ptsWrapBits", &Stream::GetPtsWrapBits, &Stream::SetPtsWrapBits, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("eventFlags", &Stream::GetEventFlags, &Stream::SetEventFlagsAccessor, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&Stream::GetParser>("parser"),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("Stream", func);
  return exports;
}

Stream::Stream(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<Stream>(info) {
  // Stream objects are created internally by FormatContext
}

Stream::~Stream() {
  // We don't own the AVStream, so nothing to free
}

Napi::Value Stream::GetIndex(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return Napi::Number::New(env, -1);
  }
  return Napi::Number::New(env, stream_->index);
}

Napi::Value Stream::GetId(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, stream_->id);
}

void Stream::SetId(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_) {
    stream_->id = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Stream::GetCodecpar(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!stream_ || !stream_->codecpar) {
    return env.Null();
  }
  
  // Create a CodecParameters wrapper for the AVCodecParameters
  // The AVCodecParameters is owned by AVStream, so we don't transfer ownership
  Napi::Object codecParamsObj = CodecParameters::constructor.New({});
  CodecParameters* codecParams = UnwrapNativeObject<CodecParameters>(env, codecParamsObj, "CodecParameters");
  
  // Set the internal pointer without transferring ownership
  // The user can read/write through this wrapper, and changes will affect the stream directly
  codecParams->SetParameters(stream_->codecpar, false); // false = not owned
  
  return codecParamsObj;
}

void Stream::SetCodecpar(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  if (!stream_ || !stream_->codecpar) {
    return;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    return;
  }
  
  CodecParameters* codecParams = UnwrapNativeObject<CodecParameters>(env, value, "CodecParameters");
  if (codecParams && codecParams->Get()) {
    // Copy the parameters to the stream's codecpar
    avcodec_parameters_copy(stream_->codecpar, codecParams->Get());
  }
}

Napi::Value Stream::GetTimeBase(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return RationalToJS(env, {0, 1});
  }
  return RationalToJS(env, stream_->time_base);
}

void Stream::SetTimeBase(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_ && value.IsObject()) {
    stream_->time_base = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value Stream::GetStartTime(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return Napi::BigInt::New(env, static_cast<int64_t>(AV_NOPTS_VALUE));
  }
  return Napi::BigInt::New(env, stream_->start_time);
}

void Stream::SetStartTime(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_) {
    bool lossless;
    stream_->start_time = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Stream::GetDuration(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  return Napi::BigInt::New(env, stream_->duration);
}

void Stream::SetDuration(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_) {
    bool lossless;
    stream_->duration = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Stream::GetNbFrames(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  return Napi::BigInt::New(env, stream_->nb_frames);
}

void Stream::SetNbFrames(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_) {
    bool lossless;
    stream_->nb_frames = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Stream::GetDisposition(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, stream_->disposition);
}

void Stream::SetDisposition(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_) {
    stream_->disposition = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Stream::GetDiscard(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return Napi::Number::New(env, AVDISCARD_DEFAULT);
  }
  return Napi::Number::New(env, stream_->discard);
}

void Stream::SetDiscard(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_) {
    stream_->discard = static_cast<AVDiscard>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value Stream::GetSampleAspectRatio(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return RationalToJS(env, {0, 1});
  }
  return RationalToJS(env, stream_->sample_aspect_ratio);
}

void Stream::SetSampleAspectRatio(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_ && value.IsObject()) {
    stream_->sample_aspect_ratio = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value Stream::GetAvgFrameRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return RationalToJS(env, {0, 1});
  }
  return RationalToJS(env, stream_->avg_frame_rate);
}

void Stream::SetAvgFrameRate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_ && value.IsObject()) {
    stream_->avg_frame_rate = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value Stream::GetRFrameRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return RationalToJS(env, {0, 1});
  }
  return RationalToJS(env, stream_->r_frame_rate);
}

void Stream::SetRFrameRate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_ && value.IsObject()) {
    stream_->r_frame_rate = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value Stream::GetMetadata(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!stream_ || !stream_->metadata) {
    return env.Null();
  }
  
  // Create a Dictionary wrapper for the AVDictionary
  Napi::Object dictObj = Dictionary::constructor.New({});
  Dictionary* dict = UnwrapNativeObject<Dictionary>(env, dictObj, "Dictionary");
  
  // Copy the dictionary content (we transfer ownership of the copy)
  AVDictionary* copy = nullptr;
  av_dict_copy(&copy, stream_->metadata, 0);
  dict->SetOwned(copy);
  
  return dictObj;
}

void Stream::SetMetadata(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  if (!stream_) {
    return;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    // Clear metadata
    if (stream_->metadata) {
      av_dict_free(&stream_->metadata);
      stream_->metadata = nullptr;
    }
    return;
  }
  
  Dictionary* dict = UnwrapNativeObject<Dictionary>(env, value, "Dictionary");
  if (dict && dict->Get()) {
    // Free existing metadata
    if (stream_->metadata) {
      av_dict_free(&stream_->metadata);
    }
    // Copy the dictionary content
    av_dict_copy(&stream_->metadata, dict->Get(), 0);
  }
}

Napi::Value Stream::GetAttachedPic(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!stream_ || stream_->attached_pic.size == 0) {
    return env.Null();
  }
  
  // Create a Packet wrapper for the attached picture
  Napi::Object packetObj = Packet::constructor.New({});
  Packet* packet = UnwrapNativeObject<Packet>(env, packetObj, "Packet");
  
  // The packet constructor already allocates, so we just need to copy
  av_packet_ref(packet->Get(), &stream_->attached_pic);
  
  return packetObj;
}

Napi::Value Stream::GetPtsWrapBits(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return Napi::Number::New(env, 64);  // Default: no wrapping
  }
  return Napi::Number::New(env, stream_->pts_wrap_bits);
}

void Stream::SetPtsWrapBits(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_) {
    stream_->pts_wrap_bits = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Stream::GetEventFlags(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!stream_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, stream_->event_flags);
}

void Stream::SetEventFlagsAccessor(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (stream_) {
    stream_->event_flags = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Stream::GetParser(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!stream_) {
    return env.Null();
  }

  // Get parser from stream using av_stream_get_parser
  AVCodecParserContext* parser_ctx = av_stream_get_parser(stream_);
  if (!parser_ctx) {
    return env.Null();
  }

  // Create CodecParser wrapper
  // Note: Parser context is owned by AVStream, so we don't transfer ownership
  Napi::Object parserObj = CodecParser::constructor.New({});
  CodecParser* parser = UnwrapNativeObject<CodecParser>(env, parserObj, "CodecParser");

  if (parser) {
    parser->SetParserContext(parser_ctx, false); // false = not owned
  }

  return parserObj;
}

} // namespace ffmpeg