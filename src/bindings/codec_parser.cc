#include "codec_parser.h"
#include "codec_context.h"
#include "packet.h"
#include "common.h"
#include <napi.h>

namespace ffmpeg {

thread_local Napi::FunctionReference CodecParser::constructor;

Napi::Object CodecParser::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "CodecParser", {
    InstanceMethod<&CodecParser::InitParser>("init"),
    InstanceMethod<&CodecParser::Parse2>("parse2"),
    InstanceMethod<&CodecParser::Close>("close"),
    InstanceAccessor<&CodecParser::GetRepeatPict>("repeatPict"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("CodecParser", func);
  return exports;
}

CodecParser::CodecParser(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<CodecParser>(info) {
}

CodecParser::~CodecParser() {
  if (parser_ctx_ && owns_parser_) {
    av_parser_close(parser_ctx_);
    parser_ctx_ = nullptr;
  }
}

Napi::Value CodecParser::InitParser(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Codec ID required").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int codec_id = info[0].As<Napi::Number>().Int32Value();
  
  parser_ctx_ = av_parser_init(codec_id);
  if (!parser_ctx_) {
    Napi::Error::New(env, "Failed to initialize parser").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  return env.Undefined();
}

Napi::Value CodecParser::Parse2(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!parser_ctx_) {
    Napi::Error::New(env, "Parser not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (info.Length() < 6) {
    Napi::TypeError::New(env, "Expected 6 arguments (codecContext, packet, data, pts, dts, pos)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Get codec context
  CodecContext* codecCtx = UnwrapNativeObject<CodecContext>(env, info[0], "CodecContext");
  if (!codecCtx) {
    Napi::TypeError::New(env, "Invalid codec context").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Get packet
  Packet* packet = UnwrapNativeObject<Packet>(env, info[1], "Packet");
  if (!packet) {
    Napi::TypeError::New(env, "Invalid packet").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Get input data buffer
  if (!info[2].IsBuffer()) {
    Napi::TypeError::New(env, "Data must be a Buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Napi::Buffer<uint8_t> dataBuffer = info[2].As<Napi::Buffer<uint8_t>>();
  uint8_t* data = dataBuffer.Data();
  int data_size = dataBuffer.Length();
  
  // Get timestamps
  bool lossless;
  int64_t pts = info[3].As<Napi::BigInt>().Int64Value(&lossless);
  int64_t dts = info[4].As<Napi::BigInt>().Int64Value(&lossless);
  int64_t pos = info[5].As<Napi::Number>().Int64Value();
  
  // Parse
  AVPacket* pkt = packet->Get();
  if (!pkt) {
    Napi::Error::New(env, "Packet not initialized - call alloc() first").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  AVCodecContext* ctx = codecCtx->Get();
  if (!ctx) {
    Napi::Error::New(env, "CodecContext not initialized - call allocContext3() first").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int ret = av_parser_parse2(parser_ctx_, ctx, 
                             &pkt->data, &pkt->size,
                             data, data_size,
                             pts, dts, pos);
  
  if (ret < 0) {
    return Napi::Number::New(env, ret);
  }
  
  // Update packet timestamps if parser provided them
  if (parser_ctx_->pts != AV_NOPTS_VALUE) {
    pkt->pts = parser_ctx_->pts;
  }
  if (parser_ctx_->dts != AV_NOPTS_VALUE) {
    pkt->dts = parser_ctx_->dts;
  }
  if (parser_ctx_->pos != -1) {
    pkt->pos = parser_ctx_->pos;
  }
  
  // Set key frame flag if applicable
  if (parser_ctx_->key_frame == 1) {
    pkt->flags |= AV_PKT_FLAG_KEY;
  }
  
  return Napi::Number::New(env, ret);
}

Napi::Value CodecParser::Close(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (parser_ctx_ && owns_parser_) {
    av_parser_close(parser_ctx_);
    parser_ctx_ = nullptr;
  }

  return env.Undefined();
}

void CodecParser::SetParserContext(AVCodecParserContext* parser_ctx, bool owns) {
  if (parser_ctx_ && owns_parser_) {
    av_parser_close(parser_ctx_);
  }
  parser_ctx_ = parser_ctx;
  owns_parser_ = owns;
}

Napi::Value CodecParser::GetRepeatPict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!parser_ctx_) {
    return Napi::Number::New(env, 0);
  }

  return Napi::Number::New(env, parser_ctx_->repeat_pict);
}

} // namespace ffmpeg