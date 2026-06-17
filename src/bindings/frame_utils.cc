#include "frame_utils.h"
#include "common.h"
#include <cstring>

namespace ffmpeg {

thread_local Napi::FunctionReference FrameUtils::constructor;

Napi::Object FrameUtils::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "FrameUtils", {
    InstanceMethod<&FrameUtils::Process>("process"),
    InstanceMethod<&FrameUtils::Close>("close"),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("FrameUtils", func);
  return exports;
}

FrameUtils::FrameUtils(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<FrameUtils>(info), input_frame_(nullptr) {

  Napi::Env env = info.Env();

  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Expected width and height as arguments").ThrowAsJavaScriptException();
    return;
  }

  input_width_ = info[0].As<Napi::Number>().Int32Value();
  input_height_ = info[1].As<Napi::Number>().Int32Value();
  input_format_ = AV_PIX_FMT_NV12;  // Always NV12 as specified

  // Validate dimensions
  if (input_width_ <= 0 || input_height_ <= 0 || input_width_ > 16384 || input_height_ > 16384) {
    Napi::TypeError::New(env, "Invalid dimensions").ThrowAsJavaScriptException();
    return;
  }

  // Pre-allocate input frame
  input_frame_ = av_frame_alloc();
  if (!input_frame_) {
    Napi::Error::New(env, "Failed to allocate input frame").ThrowAsJavaScriptException();
    return;
  }

  input_frame_->width = input_width_;
  input_frame_->height = input_height_;
  input_frame_->format = input_format_;

  // Use default alignment (0) for better cross-platform compatibility
  // FFmpeg will choose appropriate alignment for the platform
  int ret = av_frame_get_buffer(input_frame_, 0);
  if (ret < 0) {
    av_frame_free(&input_frame_);
    input_frame_ = nullptr;
    char errbuf[AV_ERROR_MAX_STRING_SIZE];
    av_strerror(ret, errbuf, sizeof(errbuf));
    Napi::Error::New(env, std::string("Failed to allocate frame buffer: ") + errbuf).ThrowAsJavaScriptException();
    return;
  }

  // Make frame writable to ensure clean state
  ret = av_frame_make_writable(input_frame_);
  if (ret < 0) {
    av_frame_free(&input_frame_);
    input_frame_ = nullptr;
    Napi::Error::New(env, "Failed to make frame writable").ThrowAsJavaScriptException();
    return;
  }
}

FrameUtils::~FrameUtils() {
  // Clean up in reverse order of allocation
  if (input_frame_) {
    av_frame_free(&input_frame_);
    input_frame_ = nullptr;
  }

  CleanupFrames();
  CleanupSwsContexts();
}

Napi::Value FrameUtils::Process(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsObject()) {
    Napi::TypeError::New(env, "Expected buffer and options object").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Get input buffer
  Napi::Buffer<uint8_t> inputBuffer = info[0].As<Napi::Buffer<uint8_t>>();
  const uint8_t* inputData = inputBuffer.Data();
  size_t inputSize = inputBuffer.Length();

  // Validate buffer size (NV12 requires width * height * 1.5 bytes)
  size_t requiredSize = input_width_ * input_height_ * 3 / 2;
  if (inputSize < requiredSize) {
    Napi::TypeError::New(env,
      "Invalid buffer size. Expected at least " + std::to_string(requiredSize) +
      " bytes, got " + std::to_string(inputSize)).ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Parse options
  Napi::Object options = info[1].As<Napi::Object>();

  // Default values
  int cropX = 0, cropY = 0, cropWidth = input_width_, cropHeight = input_height_;
  AVPixelFormat outputFormat = AV_PIX_FMT_NV12;

  // Parse crop options
  if (options.Has("crop") && options.Get("crop").IsObject()) {
    Napi::Object crop = options.Get("crop").As<Napi::Object>();
    if (crop.Has("left")) cropX = crop.Get("left").As<Napi::Number>().Int32Value();
    if (crop.Has("top")) cropY = crop.Get("top").As<Napi::Number>().Int32Value();
    if (crop.Has("width")) cropWidth = crop.Get("width").As<Napi::Number>().Int32Value();
    if (crop.Has("height")) cropHeight = crop.Get("height").As<Napi::Number>().Int32Value();
  }

  // Default resize to crop dimensions (or input dimensions if no crop)
  int resizeWidth = cropWidth;
  int resizeHeight = cropHeight;

  // Parse resize options (overrides defaults)
  if (options.Has("resize") && options.Get("resize").IsObject()) {
    Napi::Object resize = options.Get("resize").As<Napi::Object>();
    if (resize.Has("width")) resizeWidth = resize.Get("width").As<Napi::Number>().Int32Value();
    if (resize.Has("height")) resizeHeight = resize.Get("height").As<Napi::Number>().Int32Value();
  }

  // Parse format options
  if (options.Has("format") && options.Get("format").IsObject()) {
    Napi::Object format = options.Get("format").As<Napi::Object>();
    if (format.Has("to") && format.Get("to").IsString()) {
      std::string formatStr = format.Get("to").As<Napi::String>().Utf8Value();
      if (formatStr == "rgb") {
        outputFormat = AV_PIX_FMT_RGB24;
      } else if (formatStr == "rgba") {
        outputFormat = AV_PIX_FMT_RGBA;
      } else if (formatStr == "gray") {
        outputFormat = AV_PIX_FMT_GRAY8;
      } else if (formatStr == "nv12") {
        outputFormat = AV_PIX_FMT_NV12;
      } else if (formatStr == "yuv420p") {
        outputFormat = AV_PIX_FMT_YUV420P;
      }
    }
  }

  // Validate crop parameters
  if (cropX < 0 || cropY < 0 || cropWidth <= 0 || cropHeight <= 0 ||
      cropX + cropWidth > input_width_ || cropY + cropHeight > input_height_) {
    Napi::TypeError::New(env, "Invalid crop parameters").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Copy input buffer to frame
  CopyBufferToFrame(input_frame_, inputData, inputSize);

  AVFrame* current_frame = input_frame_;

  // Step 1: Crop if needed
  if (cropX != 0 || cropY != 0 || cropWidth != input_width_ || cropHeight != input_height_) {
    AVFrame* cropped_frame = GetOrCreateFrame(cropWidth, cropHeight, input_format_);
    if (!cropped_frame) {
      Napi::Error::New(env, "Failed to allocate cropped frame").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    CropFrame(cropped_frame, current_frame, cropX, cropY, cropWidth, cropHeight);
    current_frame = cropped_frame;
  }

  // Step 2: Scale and/or convert format if needed
  bool needs_scaling = (resizeWidth != cropWidth || resizeHeight != cropHeight);
  bool needs_conversion = (outputFormat != input_format_);

  if (needs_scaling || needs_conversion) {
    AVFrame* output_frame = GetOrCreateFrame(resizeWidth, resizeHeight, outputFormat);
    if (!output_frame) {
      Napi::Error::New(env, "Failed to allocate output frame").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    SwsContext* sws_ctx = GetOrCreateSwsContext(
      current_frame->width, current_frame->height, static_cast<AVPixelFormat>(current_frame->format),
      resizeWidth, resizeHeight, outputFormat
    );

    if (!sws_ctx) {
      Napi::Error::New(env, "Failed to create SWS context").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    int ret = sws_scale(sws_ctx,
                       current_frame->data, current_frame->linesize, 0, current_frame->height,
                       output_frame->data, output_frame->linesize);

    if (ret < 0) {
      char errbuf[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret, errbuf, sizeof(errbuf));
      Napi::Error::New(env, std::string("Failed to scale frame: ") + errbuf).ThrowAsJavaScriptException();
      return env.Undefined();
    }

    current_frame = output_frame;
  }

  // Allocate output buffer
  int output_size = av_image_get_buffer_size(
    static_cast<AVPixelFormat>(current_frame->format),
    current_frame->width,
    current_frame->height,
    1
  );

  Napi::Buffer<uint8_t> outputBuffer = Napi::Buffer<uint8_t>::New(env, output_size);
  uint8_t* outputData = outputBuffer.Data();

  // Copy frame to output buffer
  CopyFrameToBuffer(outputData, current_frame);

  return outputBuffer;
}

Napi::Value FrameUtils::Close(const Napi::CallbackInfo& info) {
  CleanupFrames();
  CleanupSwsContexts();
  return info.Env().Undefined();
}

AVFrame* FrameUtils::GetOrCreateFrame(int width, int height, AVPixelFormat format) {
  FrameConfig config = {width, height, format};

  auto it = frame_pool_.find(config);
  if (it != frame_pool_.end()) {
    // Return existing frame with matching config
    AVFrame* frame = it->second;
    // Ensure frame dimensions match (in case of reuse)
    frame->width = width;
    frame->height = height;
    frame->format = format;
    return frame;
  }

  // Create new frame
  AVFrame* frame = av_frame_alloc();
  if (!frame) {
    return nullptr;
  }

  frame->width = width;
  frame->height = height;
  frame->format = format;

  int ret = av_frame_get_buffer(frame, 0);  // Use platform default alignment
  if (ret < 0) {
    av_frame_free(&frame);
    return nullptr;
  }

  ret = av_frame_make_writable(frame);
  if (ret < 0) {
    av_frame_free(&frame);
    return nullptr;
  }

  frame_pool_[config] = frame;
  return frame;
}

SwsContext* FrameUtils::GetOrCreateSwsContext(int src_w, int src_h, AVPixelFormat src_fmt,
                                              int dst_w, int dst_h, AVPixelFormat dst_fmt) {
  SwsConfig config = {src_w, src_h, dst_w, dst_h, src_fmt, dst_fmt};

  auto it = sws_pool_.find(config);
  if (it != sws_pool_.end()) {
    return it->second;
  }

  // Create new context
  SwsContext* sws_ctx = sws_getContext(
    src_w, src_h, src_fmt,
    dst_w, dst_h, dst_fmt,
    SWS_BILINEAR,
    nullptr, nullptr, nullptr
  );

  if (!sws_ctx) {
    return nullptr;
  }

  sws_pool_[config] = sws_ctx;
  return sws_ctx;
}

void FrameUtils::CropFrame(AVFrame* dst, AVFrame* src, int x, int y, int width, int height) {
  // Validate data pointers
  if (!src->data[0] || !dst->data[0]) {
    return;  // Invalid frames
  }

  // For NV12: Y plane followed by interleaved UV
  int src_y_stride = src->linesize[0];
  int dst_y_stride = dst->linesize[0];

  // Copy Y plane
  for (int row = 0; row < height; row++) {
    memcpy(dst->data[0] + row * dst_y_stride,
           src->data[0] + (y + row) * src_y_stride + x,
           width);
  }

  // Copy UV plane if present (height is halved, width stays same for NV12)
  if (src->data[1] && dst->data[1]) {
    int uv_height = (height + 1) / 2;
    int src_uv_stride = src->linesize[1];
    int dst_uv_stride = dst->linesize[1];

    for (int row = 0; row < uv_height; row++) {
      memcpy(dst->data[1] + row * dst_uv_stride,
             src->data[1] + (y/2 + row) * src_uv_stride + (x & ~1),
             (width + 1) & ~1);
    }
  }
}

void FrameUtils::CopyBufferToFrame(AVFrame* frame, const uint8_t* buffer, size_t buffer_size) {
  // Validate input
  if (!frame->data[0] || !buffer) {
    return;
  }

  // For NV12 format
  int y_size = frame->width * frame->height;
  int uv_size = y_size / 2;

  // Check if buffer is large enough for Y plane
  if (buffer_size < static_cast<size_t>(y_size)) {
    // Buffer too small, copy what we can or skip
    return;
  }

  // Copy Y plane
  const uint8_t* src_y = buffer;
  uint8_t* dst_y = frame->data[0];
  for (int row = 0; row < frame->height; row++) {
    size_t offset = row * frame->width;
    // Check if this row is within buffer bounds
    if (offset + frame->width > buffer_size) {
      break;  // Stop if we would read past buffer end
    }
    memcpy(dst_y + row * frame->linesize[0],
           src_y + offset,
           frame->width);
  }

  // Copy UV plane if present and buffer is large enough
  if (frame->data[1] && buffer_size >= static_cast<size_t>(y_size + uv_size)) {
    const uint8_t* src_uv = buffer + y_size;
    uint8_t* dst_uv = frame->data[1];
    int uv_height = frame->height / 2;

    for (int row = 0; row < uv_height; row++) {
      memcpy(dst_uv + row * frame->linesize[1],
             src_uv + row * frame->width,
             frame->width);
    }
  }
}

size_t FrameUtils::CopyFrameToBuffer(uint8_t* buffer, AVFrame* frame) {
  int ret = av_image_copy_to_buffer(
    buffer,
    av_image_get_buffer_size(static_cast<AVPixelFormat>(frame->format),
                             frame->width, frame->height, 1),
    (const uint8_t* const*)frame->data,
    frame->linesize,
    static_cast<AVPixelFormat>(frame->format),
    frame->width,
    frame->height,
    1
  );

  return ret > 0 ? ret : 0;
}

void FrameUtils::CleanupFrames() {
  for (auto& pair : frame_pool_) {
    if (pair.second) {
      av_frame_free(&pair.second);
    }
  }
  frame_pool_.clear();
}

void FrameUtils::CleanupSwsContexts() {
  for (auto& pair : sws_pool_) {
    if (pair.second) {
      sws_freeContext(pair.second);
    }
  }
  sws_pool_.clear();
}

} // namespace ffmpeg