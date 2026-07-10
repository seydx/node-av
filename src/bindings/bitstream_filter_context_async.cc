#include "bitstream_filter_context.h"
#include "packet.h"
#include "common.h"
#include "promise_worker.h"
#include <napi.h>

extern "C" {
#include <libavcodec/bsf.h>
}

namespace ffmpeg {

Napi::Value BitStreamFilterContext::SendPacketAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!context_) {
    Napi::Error::New(env, "BitStreamFilterContext not allocated")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!is_initialized_) {
    Napi::Error::New(env, "BitStreamFilterContext not initialized")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  AVPacket* packet = nullptr;
  bool hasPacket = false;

  // Check if packet is provided (null packet means EOF)
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    if (!info[0].IsObject()) {
      Napi::TypeError::New(env, "Packet object expected")
          .ThrowAsJavaScriptException();
      return env.Undefined();
    }

    Packet* pkt = UnwrapNativeObject<Packet>(env, info[0].As<Napi::Object>(), "Packet");
    if (!pkt) {
      Napi::Error::New(env, "Invalid Packet object")
          .ThrowAsJavaScriptException();
      return env.Undefined();
    }

    packet = pkt->Get();
    hasPacket = true;
  }

  AVBSFContext* ctx = context_;

  std::vector<Napi::Object> pins = {info.This().As<Napi::Object>()};
  if (hasPacket) {
    pins.push_back(info[0].As<Napi::Object>());
  }

  return PromiseWorker::Run(env, &async_ops_, std::move(pins), [ctx, packet]() {
    // Null check to prevent use-after-free crashes
    if (!ctx) {
      return AVERROR(EINVAL);
    }

    return av_bsf_send_packet(ctx, packet);
  });
}

Napi::Value BitStreamFilterContext::ReceivePacketAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!context_) {
    Napi::Error::New(env, "BitStreamFilterContext not allocated")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!is_initialized_) {
    Napi::Error::New(env, "BitStreamFilterContext not initialized")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "Packet object required")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Packet* packet = UnwrapNativeObject<Packet>(env, info[0].As<Napi::Object>(), "Packet");
  if (!packet) {
    Napi::Error::New(env, "Invalid Packet object")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!packet->Get()) {
    Napi::Error::New(env, "Packet not allocated")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  AVBSFContext* ctx = context_;
  AVPacket* pkt = packet->Get();

  return PromiseWorker::Run(
      env, &async_ops_, {info.This().As<Napi::Object>(), info[0].As<Napi::Object>()},
      [ctx, pkt]() {
        // Null checks to prevent use-after-free crashes
        if (!ctx || !pkt) {
          return AVERROR(EINVAL);
        }

        return av_bsf_receive_packet(ctx, pkt);
      },
      [packet](Napi::Env env, int ret) -> Napi::Value {
        // The bitstream filter filled the packet's buffer on the worker thread;
        // reconcile V8 accounting now that we are back on the JS thread. The
        // packet wrapper is pinned, so it is alive here.
        if (ret >= 0) {
          packet->SyncExternalMemory(env);
        }
        return Napi::Number::New(env, ret);
      });
}

} // namespace ffmpeg
