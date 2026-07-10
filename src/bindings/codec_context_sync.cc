#include "codec_context.h"
#include "packet.h"
#include "frame.h"
#include "codec.h"
#include "dictionary.h"
#include "common.h"
#include <napi.h>

extern "C" {
#include <libavcodec/avcodec.h>
}

namespace ffmpeg {

Napi::Value CodecContext::Open2Sync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!context_) {
    Napi::Error::New(env, "CodecContext not allocated").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  const AVCodec* codec = nullptr;
  AVDictionary* options = nullptr;
  
  // Parse arguments (codec, options) - both optional
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Napi::Object codecObj = info[0].As<Napi::Object>();
    Codec* codecWrapper = UnwrapNativeObject<Codec>(env, codecObj, "Codec");
    if (!codecWrapper) {
      Napi::TypeError::New(env, "Invalid Codec object").ThrowAsJavaScriptException();
      return Napi::Number::New(env, AVERROR(EINVAL));
    }
    codec = codecWrapper->Get();
  }
  
  if (info.Length() > 1 && !info[1].IsNull() && !info[1].IsUndefined()) {
    Napi::Object dictObj = info[1].As<Napi::Object>();
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, dictObj, "Dictionary");
    if (!dict) {
      Napi::TypeError::New(env, "Invalid Dictionary object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (dict->Get()) {
      // Work on a copy; avcodec_open2 frees/replaces the passed dict (see Open2Async)
      av_dict_copy(&options, dict->Get(), 0);
    }
  }

  // Call avcodec_open2 synchronously
  int ret = avcodec_open2(context_, codec, options ? &options : nullptr);

  if (ret >= 0) {
    is_open_ = true;
  }

  // Free our copy (holds any unconsumed options)
  if (options) {
    av_dict_free(&options);
  }
  
  return Napi::Number::New(env, ret);
}

Napi::Value CodecContext::SendPacketSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!context_) {
    Napi::Error::New(env, "CodecContext not initialized").ThrowAsJavaScriptException();
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

  // Direct synchronous call
  int ret = avcodec_send_packet(context_, packet ? packet->Get() : nullptr);

  return Napi::Number::New(env, ret);
}

Napi::Value CodecContext::ReceiveFrameSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!context_) {
    Napi::Error::New(env, "CodecContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Frame required").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Frame* frame = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  if (!frame) {
    Napi::TypeError::New(env, "Invalid frame object").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Direct synchronous call
  int ret = avcodec_receive_frame(context_, frame->Get());

  // Receiving fills the frame's buffers internally (no JS getBuffer call), so
  // reconcile V8's external-memory accounting here.
  if (ret >= 0) {
    frame->SyncExternalMemory(env);
  }

  return Napi::Number::New(env, ret);
}

Napi::Value CodecContext::SendFrameSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!context_) {
    Napi::Error::New(env, "CodecContext not initialized").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Frame* frame = nullptr;
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    frame = UnwrapNativeObject<Frame>(env, info[0], "Frame");
    if (!frame) {
      Napi::TypeError::New(env, "Invalid frame object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
  }

  // Guard against mismatched audio frames (see CodecContext::ValidateAudioFrame)
  int ret = ValidateAudioFrame(context_, frame ? frame->Get() : nullptr);
  if (ret < 0) {
    return Napi::Number::New(env, ret);
  }

  // Direct synchronous call
  ret = avcodec_send_frame(context_, frame ? frame->Get() : nullptr);

  return Napi::Number::New(env, ret);
}

Napi::Value CodecContext::ReceivePacketSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!context_) {
    Napi::Error::New(env, "CodecContext not initialized").ThrowAsJavaScriptException();
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

  // Direct synchronous call
  int ret = avcodec_receive_packet(context_, packet->Get());

  // Receiving fills the packet's buffer internally; reconcile V8 accounting.
  if (ret >= 0) {
    packet->SyncExternalMemory(env);
  }

  return Napi::Number::New(env, ret);
}

} // namespace ffmpeg