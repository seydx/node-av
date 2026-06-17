#pragma once

#include <napi.h>
#include <unordered_map>
#include <string>
#include <memory>

extern "C" {
#include <libavutil/frame.h>
#include <libavutil/imgutils.h>
#include <libavutil/pixdesc.h>
#include <libswscale/swscale.h>
}

namespace ffmpeg {

class FrameUtils : public Napi::ObjectWrap<FrameUtils> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  static thread_local Napi::FunctionReference constructor;

  explicit FrameUtils(const Napi::CallbackInfo& info);
  ~FrameUtils();

  // Prevent copying
  FrameUtils(const FrameUtils&) = delete;
  FrameUtils& operator=(const FrameUtils&) = delete;

private:
  // Configuration
  int input_width_;
  int input_height_;
  AVPixelFormat input_format_;  // Always NV12

  // Frame pool - pre-allocated frames for different configurations
  struct FrameConfig {
    int width;
    int height;
    AVPixelFormat format;

    bool operator==(const FrameConfig& other) const {
      return width == other.width && height == other.height && format == other.format;
    }
  };

  struct FrameConfigHash {
    std::size_t operator()(const FrameConfig& config) const {
      return std::hash<int>()(config.width) ^
             (std::hash<int>()(config.height) << 1) ^
             (std::hash<int>()(config.format) << 2);
    }
  };

  std::unordered_map<FrameConfig, AVFrame*, FrameConfigHash> frame_pool_;

  // SWS contexts for different scale operations
  struct SwsConfig {
    int src_w, src_h, dst_w, dst_h;
    AVPixelFormat src_fmt, dst_fmt;

    bool operator==(const SwsConfig& other) const {
      return src_w == other.src_w && src_h == other.src_h &&
             dst_w == other.dst_w && dst_h == other.dst_h &&
             src_fmt == other.src_fmt && dst_fmt == other.dst_fmt;
    }
  };

  struct SwsConfigHash {
    std::size_t operator()(const SwsConfig& config) const {
      return std::hash<int>()(config.src_w) ^
             (std::hash<int>()(config.src_h) << 1) ^
             (std::hash<int>()(config.dst_w) << 2) ^
             (std::hash<int>()(config.dst_h) << 3) ^
             (std::hash<int>()(config.src_fmt) << 4) ^
             (std::hash<int>()(config.dst_fmt) << 5);
    }
  };

  std::unordered_map<SwsConfig, SwsContext*, SwsConfigHash> sws_pool_;

  // Input frame (persistent)
  AVFrame* input_frame_;

  // Methods
  Napi::Value Process(const Napi::CallbackInfo& info);
  Napi::Value Close(const Napi::CallbackInfo& info);

  // Internal helpers
  AVFrame* GetOrCreateFrame(int width, int height, AVPixelFormat format);
  SwsContext* GetOrCreateSwsContext(int src_w, int src_h, AVPixelFormat src_fmt,
                                    int dst_w, int dst_h, AVPixelFormat dst_fmt);

  void CropFrame(AVFrame* dst, AVFrame* src, int x, int y, int width, int height);
  void CopyBufferToFrame(AVFrame* frame, const uint8_t* buffer, size_t buffer_size);
  size_t CopyFrameToBuffer(uint8_t* buffer, AVFrame* frame);

  // Cleanup
  void CleanupFrames();
  void CleanupSwsContexts();
};

} // namespace ffmpeg