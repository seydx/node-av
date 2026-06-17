#include "sync_queue.h"
#include "packet.h"
#include "common.h"
#include <napi.h>

extern "C" {
#include "fftools/sync_queue.h"
}

namespace ffmpeg {

thread_local Napi::FunctionReference SyncQueue::constructor;

Napi::Object SyncQueue::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "SyncQueue", {
        StaticMethod<&SyncQueue::Create>("create"),
        InstanceMethod<&SyncQueue::AddStream>("addStream"),
        InstanceMethod<&SyncQueue::Send>("send"),
        InstanceMethod<&SyncQueue::Receive>("receive"),
        InstanceMethod<&SyncQueue::Free>("free"),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("SyncQueue", func);
    return exports;
}

SyncQueue::SyncQueue(const Napi::CallbackInfo& info) : Napi::ObjectWrap<SyncQueue>(info) {
    queue_ = nullptr;
    nb_streams_ = 0;
}

SyncQueue::~SyncQueue() {
    if (queue_) {
        sq_free(&queue_);
    }
}

Napi::Value SyncQueue::Create(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected 2 arguments: type, bufferSizeUs").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsNumber() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Arguments must be numbers").ThrowAsJavaScriptException();
        return env.Null();
    }

    int type = info[0].As<Napi::Number>().Int32Value();
    int64_t bufferSizeUs = info[1].As<Napi::Number>().Int64Value();

    // Create the wrapper object
    Napi::Object obj = constructor.New({});
    SyncQueue* wrap = Napi::ObjectWrap<SyncQueue>::Unwrap(obj);

    // Allocate the sync queue
    wrap->queue_ = sq_alloc(static_cast<SyncQueueType>(type), bufferSizeUs, nullptr);
    if (!wrap->queue_) {
        Napi::Error::New(env, "Failed to allocate sync queue").ThrowAsJavaScriptException();
        return env.Null();
    }

    return obj;
}

Napi::Value SyncQueue::AddStream(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!queue_) {
        Napi::Error::New(env, "Sync queue not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected 1 argument: limiting").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsNumber()) {
        Napi::TypeError::New(env, "Argument must be a number").ThrowAsJavaScriptException();
        return env.Null();
    }

    int limiting = info[0].As<Napi::Number>().Int32Value();

    int streamIdx = sq_add_stream(queue_, limiting);
    if (streamIdx < 0) {
        Napi::Error::New(env, "Failed to add stream to sync queue").ThrowAsJavaScriptException();
        return env.Null();
    }

    nb_streams_++;
    return Napi::Number::New(env, streamIdx);
}

Napi::Value SyncQueue::Send(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!queue_) {
        Napi::Error::New(env, "Sync queue not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected 2 arguments: streamIdx, packet").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsNumber()) {
        Napi::TypeError::New(env, "streamIdx must be a number").ThrowAsJavaScriptException();
        return env.Null();
    }

    unsigned int streamIdx = info[0].As<Napi::Number>().Uint32Value();

    // Validate stream index
    if (streamIdx >= nb_streams_) {
        return Napi::Number::New(env, AVERROR(EINVAL));
    }

    // Check if packet is null/undefined (EOF signal)
    ::SyncQueueFrame sqframe;
    sqframe.f = nullptr;

    if (info[1].IsNull() || info[1].IsUndefined()) {
        // Send EOF signal (NULL packet)
        sqframe.p = nullptr;
    } else {
        // Get the packet object
        if (!info[1].IsObject()) {
            Napi::TypeError::New(env, "packet must be an object, null, or undefined").ThrowAsJavaScriptException();
            return env.Null();
        }

        Packet* packet = UnwrapNativeObject<Packet>(env, info[1].As<Napi::Object>(), "Packet");
        if (!packet) {
            Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
            return env.Null();
        }

        AVPacket* pkt = packet->Get();
        if (!pkt) {
            Napi::Error::New(env, "Packet is null").ThrowAsJavaScriptException();
            return env.Null();
        }

        // Clone the packet for the queue
        sqframe.p = av_packet_clone(pkt);
        if (!sqframe.p) {
            Napi::Error::New(env, "Failed to clone packet").ThrowAsJavaScriptException();
            return env.Null();
        }
    }

    int ret = sq_send(queue_, streamIdx, sqframe);
    if (ret < 0) {
        // Only free packet if it's not NULL (we own it if clone succeeded)
        if (sqframe.p) {
            av_packet_free(&sqframe.p);
        }
        if (ret == AVERROR_EOF) {
            return Napi::Number::New(env, ret);
        }
        Napi::Error::New(env, "Failed to send packet to sync queue").ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Number::New(env, ret);
}

Napi::Value SyncQueue::Receive(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!queue_) {
        Napi::Error::New(env, "Sync queue not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected 2 arguments: streamIdx, packet").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsNumber()) {
        Napi::TypeError::New(env, "streamIdx must be a number").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[1].IsObject()) {
        Napi::TypeError::New(env, "packet must be an object").ThrowAsJavaScriptException();
        return env.Null();
    }

    int streamIdx = info[0].As<Napi::Number>().Int32Value();

    // Get the packet object (output parameter)
    Packet* packet = UnwrapNativeObject<Packet>(env, info[1].As<Napi::Object>(), "Packet");
    if (!packet) {
        Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
        return env.Null();
    }

    AVPacket* pkt = packet->Get();
    if (!pkt) {
        Napi::Error::New(env, "Packet is null").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Unref the packet first (in case it has data)
    av_packet_unref(pkt);

    // Create SyncQueueFrame
    ::SyncQueueFrame sqframe;
    sqframe.f = nullptr;
    sqframe.p = pkt;

    // Receive from sync queue
    // Returns: stream_idx (>= 0) on success, or negative error code
    int ret = sq_receive(queue_, streamIdx, sqframe);

    // Return the stream_idx or error code
    return Napi::Number::New(env, ret);
}

void SyncQueue::Free(const Napi::CallbackInfo& info) {
    if (queue_) {
        sq_free(&queue_);
        queue_ = nullptr;
        nb_streams_ = 0;
    }
}

} // namespace ffmpeg
