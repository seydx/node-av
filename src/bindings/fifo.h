#ifndef FFMPEG_FIFO_H
#define FFMPEG_FIFO_H

#include <napi.h>
#include "common.h"

extern "C" {
#include <libavutil/fifo.h>
}

namespace ffmpeg {

class Fifo : public Napi::ObjectWrap<Fifo> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  Fifo(const Napi::CallbackInfo& info);
  ~Fifo();

  AVFifo* Get() { return fifo_; }

private:
  static thread_local Napi::FunctionReference constructor;

  AVFifo* fifo_ = nullptr;

  Napi::Value Alloc(const Napi::CallbackInfo& info);
  Napi::Value Free(const Napi::CallbackInfo& info);
  Napi::Value WriteAsync(const Napi::CallbackInfo& info);
  Napi::Value WriteSync(const Napi::CallbackInfo& info);
  Napi::Value ReadAsync(const Napi::CallbackInfo& info);
  Napi::Value ReadSync(const Napi::CallbackInfo& info);
  Napi::Value PeekAsync(const Napi::CallbackInfo& info);
  Napi::Value PeekSync(const Napi::CallbackInfo& info);
  Napi::Value Grow(const Napi::CallbackInfo& info);
  Napi::Value Reset(const Napi::CallbackInfo& info);
  Napi::Value SetAutoGrowLimit(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);

  Napi::Value GetSize(const Napi::CallbackInfo& info);
  Napi::Value GetCanRead(const Napi::CallbackInfo& info);
  Napi::Value GetCanWrite(const Napi::CallbackInfo& info);
  Napi::Value GetElemSize(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_FIFO_H
