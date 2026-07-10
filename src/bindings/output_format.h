#ifndef FFMPEG_OUTPUT_FORMAT_H
#define FFMPEG_OUTPUT_FORMAT_H

#include <napi.h>

extern "C" {
#include <libavformat/avformat.h>
}

namespace ffmpeg {

class OutputFormat : public Napi::ObjectWrap<OutputFormat> {
public:
  static thread_local Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  OutputFormat(const Napi::CallbackInfo& info);
  ~OutputFormat() = default;

  const AVOutputFormat* Get() const { return format_; }
  AVOutputFormat* Get() { return const_cast<AVOutputFormat*>(format_); }
  void Set(const AVOutputFormat* fmt) { format_ = fmt; }

private:
  friend class FormatContext;


  const AVOutputFormat* format_ = nullptr;
  
  static Napi::Value GuessFormat(const Napi::CallbackInfo& info);

  Napi::Value GetName(const Napi::CallbackInfo& info);
  Napi::Value GetLongName(const Napi::CallbackInfo& info);
  Napi::Value GetExtensions(const Napi::CallbackInfo& info);
  Napi::Value GetMimeType(const Napi::CallbackInfo& info);
  Napi::Value GetAudioCodec(const Napi::CallbackInfo& info);
  Napi::Value GetVideoCodec(const Napi::CallbackInfo& info);
  Napi::Value GetSubtitleCodec(const Napi::CallbackInfo& info);
  Napi::Value GetFlags(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_OUTPUT_FORMAT_H