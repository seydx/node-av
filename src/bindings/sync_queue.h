#ifndef NODE_AV_SYNC_QUEUE_H
#define NODE_AV_SYNC_QUEUE_H

#include <napi.h>

extern "C" {
#include "fftools/sync_queue.h"
}

namespace ffmpeg {

class SyncQueue : public Napi::ObjectWrap<SyncQueue> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    SyncQueue(const Napi::CallbackInfo& info);
    ~SyncQueue();

    ::SyncQueue* Get() { return queue_; }

private:
    static thread_local Napi::FunctionReference constructor;
    ::SyncQueue* queue_;
    unsigned int nb_streams_;

    // Static methods
    static Napi::Value Create(const Napi::CallbackInfo& info);

    // Instance methods
    Napi::Value AddStream(const Napi::CallbackInfo& info);
    Napi::Value Send(const Napi::CallbackInfo& info);
    Napi::Value Receive(const Napi::CallbackInfo& info);
    void Free(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // NODE_AV_SYNC_QUEUE_H
