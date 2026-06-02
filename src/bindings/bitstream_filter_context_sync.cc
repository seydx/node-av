#include "bitstream_filter_context.h"
#include "packet.h"
#include "common.h"
#include <napi.h>

extern "C" {
#include <libavcodec/bsf.h>
}

namespace ffmpeg {

Napi::Value BitStreamFilterContext::SendPacketSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!context_) {
    Napi::Error::New(env, "BitStreamFilterContext not allocated")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (!is_initialized_) {
    Napi::Error::New(env, "BitStreamFilterContext not initialized")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  AVPacket* packet = nullptr;

  // Check if packet is provided (null packet means EOF)
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    if (!info[0].IsObject()) {
      Napi::TypeError::New(env, "Packet object expected")
          .ThrowAsJavaScriptException();
      return Napi::Number::New(env, AVERROR(EINVAL));
    }

    Packet* pkt = UnwrapNativeObject<Packet>(env, info[0].As<Napi::Object>(), "Packet");
    if (!pkt) {
      Napi::Error::New(env, "Invalid Packet object")
          .ThrowAsJavaScriptException();
      return Napi::Number::New(env, AVERROR(EINVAL));
    }

    packet = pkt->Get();
  }

  // Direct synchronous call
  int ret = av_bsf_send_packet(context_, packet);

  return Napi::Number::New(env, ret);
}

Napi::Value BitStreamFilterContext::ReceivePacketSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!context_) {
    Napi::Error::New(env, "BitStreamFilterContext not allocated")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (!is_initialized_) {
    Napi::Error::New(env, "BitStreamFilterContext not initialized")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "Packet object required")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Packet* packet = UnwrapNativeObject<Packet>(env, info[0].As<Napi::Object>(), "Packet");
  if (!packet) {
    Napi::Error::New(env, "Invalid Packet object")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (!packet->Get()) {
    Napi::Error::New(env, "Packet not allocated")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  // Direct synchronous call
  int ret = av_bsf_receive_packet(context_, packet->Get());

  // The bitstream filter fills the packet's buffer internally; reconcile V8.
  if (ret >= 0) {
    packet->SyncExternalMemory(env);
  }

  return Napi::Number::New(env, ret);
}

} // namespace ffmpeg