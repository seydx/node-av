#ifndef FFMPEG_STREAM_H
#define FFMPEG_STREAM_H

#include <napi.h>
#include "common.h"
#include "borrow_registry.h"

extern "C" {
#include <libavformat/avformat.h>
}

namespace ffmpeg {

// Forward declarations
class CodecParameters;
class Dictionary;
class FormatContext;
class Packet;

// Points into its AVFormatContext, which invalidates it before freeing the
// stream (see Borrower): afterwards it reads defaults and ignores writes
class Stream : public Napi::ObjectWrap<Stream>, public Borrower {
public:
  static thread_local Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  Stream(const Napi::CallbackInfo& info);
  ~Stream();

  AVStream* Get() { return stream_; }
  const AVStream* Get() const { return stream_; }
  // `registry` is the borrow registry of `owner`, the format context the
  // stream belongs to
  void Set(AVStream* stream, const std::shared_ptr<BorrowRegistry>& registry, FormatContext* owner) {
    stream_ = stream;
    owner_ = owner;
    BorrowFrom(registry);
  }

private:
  friend class FormatContext;

  void Invalidate() override {
    stream_ = nullptr;
    owner_ = nullptr;
  }

  AVStream* stream_ = nullptr;
  // Cleared together with stream_, before the format context frees it
  FormatContext* owner_ = nullptr;

  Napi::Value GetIndex(const Napi::CallbackInfo& info);

  Napi::Value GetId(const Napi::CallbackInfo& info);
  void SetId(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetCodecpar(const Napi::CallbackInfo& info);
  void SetCodecpar(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetTimeBase(const Napi::CallbackInfo& info);
  void SetTimeBase(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetStartTime(const Napi::CallbackInfo& info);
  void SetStartTime(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetDuration(const Napi::CallbackInfo& info);
  void SetDuration(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetNbFrames(const Napi::CallbackInfo& info);
  void SetNbFrames(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetDisposition(const Napi::CallbackInfo& info);
  void SetDisposition(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetDiscard(const Napi::CallbackInfo& info);
  void SetDiscard(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetSampleAspectRatio(const Napi::CallbackInfo& info);
  void SetSampleAspectRatio(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetAvgFrameRate(const Napi::CallbackInfo& info);
  void SetAvgFrameRate(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetRFrameRate(const Napi::CallbackInfo& info);
  void SetRFrameRate(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetMetadata(const Napi::CallbackInfo& info);
  void SetMetadata(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetAttachedPic(const Napi::CallbackInfo& info);

  Napi::Value GetPtsWrapBits(const Napi::CallbackInfo& info);
  void SetPtsWrapBits(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetEventFlags(const Napi::CallbackInfo& info);
  void SetEventFlagsAccessor(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetParser(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_STREAM_H