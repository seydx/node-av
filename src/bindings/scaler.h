#pragma once

#include <napi.h>
#include <unordered_map>

extern "C" {
#include <libavutil/frame.h>
#include <libavutil/imgutils.h>
#include <libavutil/pixdesc.h>
#include <libswscale/swscale.h>
}

namespace ffmpeg {

class Scaler : public Napi::ObjectWrap<Scaler> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  static thread_local Napi::FunctionReference constructor;

  explicit Scaler(const Napi::CallbackInfo& info);
  ~Scaler();

  Scaler(const Scaler&) = delete;
  Scaler& operator=(const Scaler&) = delete;

private:
  int flags_;  // sws scaling flags (e.g. SWS_BILINEAR)

  struct FrameConfig {
    int width;
    int height;
    AVPixelFormat format;
    bool operator==(const FrameConfig& o) const { return width == o.width && height == o.height && format == o.format; }
  };
  struct FrameConfigHash {
    std::size_t operator()(const FrameConfig& c) const {
      return std::hash<int>()(c.width) ^ (std::hash<int>()(c.height) << 1) ^ (std::hash<int>()(c.format) << 2);
    }
  };

  struct SwsConfig {
    int src_w, src_h, dst_w, dst_h;
    AVPixelFormat src_fmt, dst_fmt;
    bool operator==(const SwsConfig& o) const {
      return src_w == o.src_w && src_h == o.src_h && dst_w == o.dst_w && dst_h == o.dst_h && src_fmt == o.src_fmt && dst_fmt == o.dst_fmt;
    }
  };
  struct SwsConfigHash {
    std::size_t operator()(const SwsConfig& c) const {
      return std::hash<int>()(c.src_w) ^ (std::hash<int>()(c.src_h) << 1) ^ (std::hash<int>()(c.dst_w) << 2) ^ (std::hash<int>()(c.dst_h) << 3) ^
             (std::hash<int>()(c.src_fmt) << 4) ^ (std::hash<int>()(c.dst_fmt) << 5);
    }
  };

  std::unordered_map<FrameConfig, AVFrame*, FrameConfigHash> frame_pool_;
  std::unordered_map<SwsConfig, SwsContext*, SwsConfigHash> sws_pool_;

  Napi::Value Process(const Napi::CallbackInfo& info);
  Napi::Value ProcessAsync(const Napi::CallbackInfo& info);
  Napi::Value Close(const Napi::CallbackInfo& info);

  AVFrame* GetOrCreateFrame(int width, int height, AVPixelFormat format);
  SwsContext* GetOrCreateSwsContext(int src_w, int src_h, AVPixelFormat src_fmt, int dst_w, int dst_h, AVPixelFormat dst_fmt);

  void CleanupFrames();
  void CleanupSwsContexts();

public:
  struct ScaleJob {
    AVFrame* effective = nullptr;
    AVFrame* cropped = nullptr;
    AVFrame* scaled = nullptr;
    SwsContext* sws = nullptr;
    AVFrame* outFrame = nullptr;
    int srcH = 0;
    int outSize = 0;
  };

  bool PrepareJob(Napi::Env env, const Napi::CallbackInfo& info, ScaleJob& job);

  static int RunJob(const ScaleJob& job, uint8_t* dst);
};

} // namespace ffmpeg
