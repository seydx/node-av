#ifndef FFMPEG_AUDIO_FIFO_H
#define FFMPEG_AUDIO_FIFO_H

#include <napi.h>
#include "common.h"
#include "promise_worker.h"

extern "C" {
#include <libavutil/audio_fifo.h>
}

namespace ffmpeg {

class AudioFifo : public Napi::ObjectWrap<AudioFifo> {
public:
  static thread_local Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  AudioFifo(const Napi::CallbackInfo& info);
  ~AudioFifo();

  AVAudioFifo* Get() { return fifo_; }

private:

  AVAudioFifo* fifo_ = nullptr;
  int nb_buffers_ = 0;  // Plane buffers required per write/read/peek (planar: channels, interleaved: 1)
  AsyncOpCounter async_ops_;

  // Shared validation for the sync and async write/read/peek paths
  bool ValidateBufferCount(Napi::Env env, uint32_t count);

  Napi::Value Alloc(const Napi::CallbackInfo& info);
  Napi::Value Free(const Napi::CallbackInfo& info);
  Napi::Value WriteAsync(const Napi::CallbackInfo& info);
  Napi::Value WriteSync(const Napi::CallbackInfo& info);
  Napi::Value ReadAsync(const Napi::CallbackInfo& info);
  Napi::Value ReadSync(const Napi::CallbackInfo& info);
  Napi::Value PeekAsync(const Napi::CallbackInfo& info);
  Napi::Value PeekSync(const Napi::CallbackInfo& info);
  Napi::Value Drain(const Napi::CallbackInfo& info);
  Napi::Value Reset(const Napi::CallbackInfo& info);
  Napi::Value Realloc(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);

  Napi::Value GetSize(const Napi::CallbackInfo& info);
  Napi::Value GetSpace(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_AUDIO_FIFO_H