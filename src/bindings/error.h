#ifndef FFMPEG_ERROR_H
#define FFMPEG_ERROR_H

#include <napi.h>

extern "C" {
#include <libavutil/error.h>
}

namespace ffmpeg {

class FFmpegError : public Napi::ObjectWrap<FFmpegError> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  FFmpegError(const Napi::CallbackInfo& info);
  ~FFmpegError() = default;

  int Get() const { return code_; }
  void Set(int code) { code_ = code; }

private:
  static thread_local Napi::FunctionReference constructor;

  int code_ = 0;

  static Napi::Value Strerror(const Napi::CallbackInfo& info);
  static Napi::Value GetAverror(const Napi::CallbackInfo& info);

  Napi::Value GetErrorCode(const Napi::CallbackInfo& info);
  Napi::Value GetMessage(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_ERROR_H