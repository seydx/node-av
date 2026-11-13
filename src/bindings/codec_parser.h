#ifndef FFMPEG_CODEC_PARSER_H
#define FFMPEG_CODEC_PARSER_H

#include <napi.h>

extern "C" {
#include <libavcodec/avcodec.h>
}

namespace ffmpeg {

// Owns the parser init() creates. The one Stream::GetParser() hands out has
// none and carries a copy of the stream parser's state instead.
class CodecParser : public Napi::ObjectWrap<CodecParser> {
public:
  static thread_local Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  CodecParser(const Napi::CallbackInfo& info);
  ~CodecParser();

  AVCodecParserContext* Get() { return parser_ctx_; }

  // State of a stream's parser, read while there is no parser of its own
  void SetSnapshot(int repeatPict) { snapshot_repeat_pict_ = repeatPict; }

private:
  AVCodecParserContext* parser_ctx_ = nullptr;
  int snapshot_repeat_pict_ = 0;

  Napi::Value InitParser(const Napi::CallbackInfo& info);
  Napi::Value Parse2(const Napi::CallbackInfo& info);
  Napi::Value Close(const Napi::CallbackInfo& info);
  Napi::Value GetRepeatPict(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_CODEC_PARSER_H