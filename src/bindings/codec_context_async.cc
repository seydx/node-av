#include "codec_context.h"
#include "packet.h"
#include "frame.h"
#include "codec.h"
#include "dictionary.h"
#include "common.h"
#include "promise_worker.h"
#include <napi.h>
#include <memory>

extern "C" {
#include <libavcodec/avcodec.h>
}

namespace ffmpeg {

Napi::Value CodecContext::Open2Async(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!context_) {
    Napi::Error::New(env, "CodecContext not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  const AVCodec* codec = nullptr;
  AVDictionary* options = nullptr;

  // Parse arguments (codec, options) - both optional
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Napi::Object codecObj = info[0].As<Napi::Object>();
    Codec* codecWrapper = UnwrapNativeObject<Codec>(env, codecObj, "Codec");
    if (!codecWrapper) {
      Napi::TypeError::New(env, "Invalid Codec object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    codec = codecWrapper->Get();
  }

  if (info.Length() > 1 && !info[1].IsNull() && !info[1].IsUndefined()) {
    Napi::Object dictObj = info[1].As<Napi::Object>();
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, dictObj, "Dictionary");
    if (!dict) {
      // Throw before the worker is created - napi_create_promise crashes with a pending exception
      Napi::TypeError::New(env, "Invalid Dictionary object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    options = dict->Get();
  }

  // Work on a copy of the dictionary: avcodec_open2 consumes options via
  // av_opt_set_dict2, which av_dict_free()s the input dict and replaces it
  // with one holding only the unconsumed entries. Passing the Dictionary
  // wrapper's pointer directly would leave the wrapper dangling on freed
  // memory (UAF/double-free on the next get()/free()/GC). The shared_ptr
  // deleter frees whatever remains after avcodec_open2.
  AVDictionary* optionsCopy = nullptr;
  if (options) {
    av_dict_copy(&optionsCopy, options, 0);
  }
  auto optionsHolder = std::shared_ptr<AVDictionary*>(new AVDictionary*(optionsCopy), [](AVDictionary** opts) {
    if (*opts) {
      av_dict_free(opts);
    }
    delete opts;
  });

  AVCodecContext* ctx = context_;
  CodecContext* self = this;
  return PromiseWorker::Run(env, &async_ops_, {info.This().As<Napi::Object>()}, [self, ctx, codec, optionsHolder]() {
    int ret = avcodec_open2(ctx, codec, *optionsHolder ? optionsHolder.get() : nullptr);
    if (ret >= 0) {
      // The pin keeps the wrapper alive and the op counter blocks freeContext()
      // until this returns, so flagging the wrapper here is safe
      self->is_open_ = true;
    }
    return ret;
  });
}

Napi::Value CodecContext::SendPacketAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Packet* packet = nullptr;

  // Parse packet argument - can be null for flush
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Napi::Object pktObj = info[0].As<Napi::Object>();
    packet = UnwrapNativeObject<Packet>(env, pktObj, "Packet");
    if (!packet) {
      Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
  }

  AVCodecContext* ctx = context_;
  AVPacket* pkt = packet ? packet->Get() : nullptr;

  std::vector<Napi::Object> pins = {info.This().As<Napi::Object>()};
  if (packet) {
    pins.push_back(info[0].As<Napi::Object>());
  }

  return PromiseWorker::Run(env, &async_ops_, std::move(pins), [ctx, pkt]() {
    // Null check: sendPacket on an unallocated context resolves EINVAL
    // instead of crashing
    if (!ctx) {
      return AVERROR(EINVAL);
    }

    return avcodec_send_packet(ctx, pkt);
  });
}

Napi::Value CodecContext::ReceiveFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (frame)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Object frameObj = info[0].As<Napi::Object>();
  Frame* frame = UnwrapNativeObject<Frame>(env, frameObj, "Frame");
  if (!frame) {
    Napi::TypeError::New(env, "Invalid frame object")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  AVCodecContext* ctx = context_;
  AVFrame* avFrame = frame->Get();

  return PromiseWorker::Run(
      env, &async_ops_, {info.This().As<Napi::Object>(), frameObj},
      [ctx, avFrame]() {
        // Null check: receiveFrame on an unallocated context resolves EINVAL
        // instead of crashing
        if (!ctx) {
          return AVERROR(EINVAL);
        }

        return avcodec_receive_frame(ctx, avFrame);
      },
      [frame](Napi::Env env, int ret) -> Napi::Value {
        // avcodec_receive_frame filled the frame's buffers on the worker thread;
        // reconcile V8's external-memory accounting now that we are back on the JS
        // thread with a valid env. The frame wrapper is pinned, so it is alive here.
        if (ret >= 0) {
          frame->SyncExternalMemory(env);
        }
        return Napi::Number::New(env, ret);
      });
}

Napi::Value CodecContext::SendFrameAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Frame* frame = nullptr;

  // Parse frame argument - can be null for flush
  if (info.Length() > 0 && !info[0].IsNull() && !info[0].IsUndefined()) {
    Napi::Object frameObj = info[0].As<Napi::Object>();
    frame = UnwrapNativeObject<Frame>(env, frameObj, "Frame");
    if (!frame) {
      Napi::TypeError::New(env, "Invalid frame object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
  }

  AVCodecContext* ctx = context_;
  AVFrame* avFrame = frame ? frame->Get() : nullptr;

  std::vector<Napi::Object> pins = {info.This().As<Napi::Object>()};
  if (frame) {
    pins.push_back(info[0].As<Napi::Object>());
  }

  return PromiseWorker::Run(env, &async_ops_, std::move(pins), [ctx, avFrame]() {
    // Null check: sendFrame on an unallocated context resolves EINVAL
    // instead of crashing
    if (!ctx) {
      return AVERROR(EINVAL);
    }

    // Reject mismatched audio frames before FFmpeg touches them (would crash,
    // not error - see CodecContext::ValidateAudioFrame)
    int ret = CodecContext::ValidateAudioFrame(ctx, avFrame);
    if (ret < 0) {
      return ret;
    }

    // Simply pass to FFmpeg and let it handle validation
    return avcodec_send_frame(ctx, avFrame);
  });
}

Napi::Value CodecContext::ReceivePacketAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (packet)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Object pktObj = info[0].As<Napi::Object>();
  Packet* packet = UnwrapNativeObject<Packet>(env, pktObj, "Packet");
  if (!packet) {
    Napi::TypeError::New(env, "Invalid packet object")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  AVCodecContext* ctx = context_;
  AVPacket* pkt = packet->Get();

  return PromiseWorker::Run(
      env, &async_ops_, {info.This().As<Napi::Object>(), pktObj},
      [ctx, pkt]() {
        // Null check: receivePacket on an unallocated context resolves EINVAL
        // instead of crashing
        if (!ctx) {
          return AVERROR(EINVAL);
        }

        return avcodec_receive_packet(ctx, pkt);
      },
      [packet](Napi::Env env, int ret) -> Napi::Value {
        // avcodec_receive_packet filled the packet's buffer on the worker thread;
        // reconcile V8 accounting now that we are back on the JS thread. The
        // packet wrapper is pinned, so it is alive here.
        if (ret >= 0) {
          packet->SyncExternalMemory(env);
        }
        return Napi::Number::New(env, ret);
      });
}

} // namespace ffmpeg
