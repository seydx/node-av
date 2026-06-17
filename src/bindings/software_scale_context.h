#ifndef FFMPEG_SOFTWARE_SCALE_CONTEXT_H
#define FFMPEG_SOFTWARE_SCALE_CONTEXT_H

#include <napi.h>
#include "common.h"

extern "C" {
#include <libswscale/swscale.h>
#include <libavutil/imgutils.h>
}

namespace ffmpeg {

class SoftwareScaleContext : public Napi::ObjectWrap<SoftwareScaleContext> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  SoftwareScaleContext(const Napi::CallbackInfo& info);
  ~SoftwareScaleContext();

  SwsContext* Get() { return ctx_; }

private:
  friend class AVOptionWrapper;
  friend class SwsScaleFrameWorker;

  static thread_local Napi::FunctionReference constructor;

  SwsContext* ctx_ = nullptr;

  Napi::Value AllocContext(const Napi::CallbackInfo& info);
  Napi::Value GetContext(const Napi::CallbackInfo& info);
  Napi::Value InitContext(const Napi::CallbackInfo& info);
  Napi::Value FreeContext(const Napi::CallbackInfo& info);
  Napi::Value ScaleAsync(const Napi::CallbackInfo& info);
  Napi::Value ScaleSync(const Napi::CallbackInfo& info);
  Napi::Value ScaleFrameAsync(const Napi::CallbackInfo& info);
  Napi::Value ScaleFrameSync(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_SOFTWARE_SCALE_CONTEXT_H