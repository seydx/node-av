#ifndef FFMPEG_HARDWARE_FRAMES_CONTEXT_H
#define FFMPEG_HARDWARE_FRAMES_CONTEXT_H

#include <napi.h>
#include <memory>
#include "common.h"

extern "C" {
#include <libavutil/hwcontext.h>
#include <libavutil/buffer.h>
#include <libavutil/frame.h>
}

namespace ffmpeg {

// Forward declarations
class HardwareDeviceContext;
class Frame;

class HardwareFramesContext : public Napi::ObjectWrap<HardwareFramesContext> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  HardwareFramesContext(const Napi::CallbackInfo& info);
  ~HardwareFramesContext();

  AVBufferRef* Get() {
    return frames_ref_ ? frames_ref_ : unowned_ref_;
  }
  void SetOwned(AVBufferRef* ref) {
    av_buffer_unref(&frames_ref_);
    frames_ref_ = ref;
    unowned_ref_ = nullptr;
  }
  void SetUnowned(AVBufferRef* ref) {
    av_buffer_unref(&frames_ref_);
    frames_ref_ = nullptr;
    unowned_ref_ = ref;
  }
  
  // Static factory
  static Napi::Value Wrap(Napi::Env env, AVBufferRef* frames_ref);
  
private:
  friend class CodecContext;
  friend class Frame;

  static thread_local Napi::FunctionReference constructor;

  AVBufferRef* frames_ref_ = nullptr;
  AVBufferRef* unowned_ref_ = nullptr;

  Napi::Value Alloc(const Napi::CallbackInfo& info);
  Napi::Value Init(const Napi::CallbackInfo& info);
  Napi::Value GetBuffer(const Napi::CallbackInfo& info);
  Napi::Value TransferDataAsync(const Napi::CallbackInfo& info);
  Napi::Value TransferDataSync(const Napi::CallbackInfo& info);
  Napi::Value TransferGetFormats(const Napi::CallbackInfo& info);
  Napi::Value Map(const Napi::CallbackInfo& info);
  Napi::Value CreateDerived(const Napi::CallbackInfo& info);
  Napi::Value Free(const Napi::CallbackInfo& info);
  Napi::Value Dispose(const Napi::CallbackInfo& info);
  
  Napi::Value GetFormat(const Napi::CallbackInfo& info);
  void SetFormat(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetSwFormat(const Napi::CallbackInfo& info);
  void SetSwFormat(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetWidth(const Napi::CallbackInfo& info);
  void SetWidth(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetHeight(const Napi::CallbackInfo& info);
  void SetHeight(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetInitialPoolSize(const Napi::CallbackInfo& info);
  void SetInitialPoolSize(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetDeviceRef(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_HARDWARE_FRAMES_CONTEXT_H