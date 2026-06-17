#ifndef FFMPEG_CODEC_PARSER_H
#define FFMPEG_CODEC_PARSER_H

#include <napi.h>

extern "C" {
#include <libavcodec/avcodec.h>
}

namespace ffmpeg {

class CodecParser : public Napi::ObjectWrap<CodecParser> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  
  CodecParser(const Napi::CallbackInfo& info);
  ~CodecParser();

  AVCodecParserContext* Get() { return parser_ctx_; }

  // Set parser context (for parsers obtained from stream)
  void SetParserContext(AVCodecParserContext* parser_ctx, bool owns = true);

private:
  friend class Stream;

  static thread_local Napi::FunctionReference constructor;

  AVCodecParserContext* parser_ctx_ = nullptr;
  bool owns_parser_ = true;  // Whether we own the parser context

  Napi::Value InitParser(const Napi::CallbackInfo& info);
  Napi::Value Parse2(const Napi::CallbackInfo& info);
  Napi::Value Close(const Napi::CallbackInfo& info);
  Napi::Value GetRepeatPict(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_CODEC_PARSER_H