#include "bitstream_filter_context.h"
#include "packet.h"
#include "common.h"
#include <napi.h>

extern "C" {
#include <libavcodec/bsf.h>
}

namespace ffmpeg {

class BSFSendPacketWorker : public Napi::AsyncWorker {
public:
  BSFSendPacketWorker(Napi::Env env, Napi::Object ctxObj, BitStreamFilterContext* context,
                      Napi::Value packetVal, AVPacket* packet)
    : Napi::AsyncWorker(env),
      context_(context),
      packet_(packet),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold references to prevent GC during async operation
    ctx_ref_.Reset(ctxObj, 1);
    if (packet && packetVal.IsObject()) {
      packet_ref_.Reset(packetVal.As<Napi::Object>(), 1);
    }
  }

  ~BSFSendPacketWorker() {
    ctx_ref_.Reset();
    packet_ref_.Reset();
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!context_ || !context_->Get()) {
      ret_ = AVERROR(EINVAL);
      return;
    }

    ret_ = av_bsf_send_packet(context_->Get(), packet_);
  }

  void OnOK() override {
    deferred_.Resolve(Napi::Number::New(Env(), ret_));
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference ctx_ref_;
  Napi::ObjectReference packet_ref_;
  BitStreamFilterContext* context_;
  AVPacket* packet_;
  int ret_;
  Napi::Promise::Deferred deferred_;
};

class BSFReceivePacketWorker : public Napi::AsyncWorker {
public:
  BSFReceivePacketWorker(Napi::Env env, Napi::Object ctxObj, BitStreamFilterContext* context,
                         Napi::Object packetObj, AVPacket* packet)
    : Napi::AsyncWorker(env),
      context_(context),
      packet_(packet),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold references to prevent GC during async operation
    ctx_ref_.Reset(ctxObj, 1);
    packet_ref_.Reset(packetObj, 1);
  }

  ~BSFReceivePacketWorker() {
    ctx_ref_.Reset();
    packet_ref_.Reset();
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (!context_ || !context_->Get()) {
      ret_ = AVERROR(EINVAL);
      return;
    }

    if (!packet_) {
      ret_ = AVERROR(EINVAL);
      return;
    }

    ret_ = av_bsf_receive_packet(context_->Get(), packet_);
  }

  void OnOK() override {
    // The bitstream filter filled the packet's buffer on the worker thread;
    // reconcile V8 accounting now that we are back on the JS thread.
    if (ret_ >= 0) {
      Packet* wrapper = Napi::ObjectWrap<Packet>::Unwrap(packet_ref_.Value().As<Napi::Object>());
      if (wrapper) {
        wrapper->SyncExternalMemory(Env());
      }
    }
    deferred_.Resolve(Napi::Number::New(Env(), ret_));
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference ctx_ref_;
  Napi::ObjectReference packet_ref_;
  BitStreamFilterContext* context_;
  AVPacket* packet_;
  int ret_;
  Napi::Promise::Deferred deferred_;
};

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
  }

  Napi::Object thisObj = info.This().As<Napi::Object>();
  Napi::Value packetVal = (info.Length() > 0) ? info[0] : env.Undefined();
  auto* worker = new BSFSendPacketWorker(env, thisObj, this, packetVal, packet);
  auto promise = worker->GetPromise();
  worker->Queue();
  
  return promise;
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

  Napi::Object thisObj = info.This().As<Napi::Object>();
  Napi::Object packetObj = info[0].As<Napi::Object>();
  auto* worker = new BSFReceivePacketWorker(env, thisObj, this, packetObj, packet->Get());
  auto promise = worker->GetPromise();
  worker->Queue();
  
  return promise;
}

} // namespace ffmpeg