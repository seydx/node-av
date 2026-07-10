#ifndef FFMPEG_HARDWARE_DEVICE_CONTEXT_H
#define FFMPEG_HARDWARE_DEVICE_CONTEXT_H

#include <napi.h>
#include <memory>
#include "common.h"

extern "C" {
#include <libavutil/hwcontext.h>
#include <libavutil/buffer.h>
}

namespace ffmpeg {

class HardwareDeviceContext : public Napi::ObjectWrap<HardwareDeviceContext> {
public:
  static thread_local Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  HardwareDeviceContext(const Napi::CallbackInfo& info);
  ~HardwareDeviceContext();

  AVBufferRef* Get() {
    return device_ref_;
  }
  void SetOwned(AVBufferRef* ref) {
    av_buffer_unref(&device_ref_);
    device_ref_ = ref;
  }

  // Static factory
  static Napi::Value Wrap(Napi::Env env, AVBufferRef* device_ref);
  
private:
  friend class HardwareFramesContext;
  friend class CodecContext;
  friend class FilterContext;

  
  // Always this wrapper's own reference (av_buffer_ref), never a borrowed
  // pointer: Wrap() takes its own ref so the JS object stays valid even after
  // the owner (frame/codec/frames context) drops the underlying context.
  AVBufferRef* device_ref_ = nullptr;

  static Napi::Value GetTypeName(const Napi::CallbackInfo& info);
  static Napi::Value IterateTypes(const Napi::CallbackInfo& info);
  static Napi::Value FindTypeByName(const Napi::CallbackInfo& info);
  
  Napi::Value Alloc(const Napi::CallbackInfo& info);
  Napi::Value Init(const Napi::CallbackInfo& info);
  Napi::Value Create(const Napi::CallbackInfo& info);
  Napi::Value CreateDerived(const Napi::CallbackInfo& info);
  Napi::Value HwconfigAlloc(const Napi::CallbackInfo& info);
  Napi::Value GetHwframeConstraints(const Napi::CallbackInfo& info);
  Napi::Value Free(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);

  Napi::Value GetType(const Napi::CallbackInfo& info);

  Napi::Value GetHwctx(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_HARDWARE_DEVICE_CONTEXT_H