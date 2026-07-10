#include "scaler.h"
#include "frame.h"

namespace ffmpeg {

thread_local Napi::FunctionReference Scaler::constructor;

Napi::Object Scaler::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "Scaler", {
    InstanceMethod<&Scaler::ProcessAsync>("process"),
    InstanceMethod<&Scaler::Process>("processSync"),
    InstanceMethod<&Scaler::Close>("close"),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Scaler", func);
  return exports;
}

Scaler::Scaler(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Scaler>(info), flags_(SWS_BILINEAR) {
  if (info.Length() >= 1 && info[0].IsNumber()) {
    flags_ = info[0].As<Napi::Number>().Int32Value();
  }
}

Scaler::~Scaler() {
  CleanupFrames();
  CleanupSwsContexts();
}

static AVPixelFormat ParseOutputFormat(const std::string& s, AVPixelFormat fallback) {
  if (s == "rgb") return AV_PIX_FMT_RGB24;
  if (s == "rgba") return AV_PIX_FMT_RGBA;
  if (s == "gray") return AV_PIX_FMT_GRAY8;
  if (s == "nv12") return AV_PIX_FMT_NV12;
  if (s == "yuv420p") return AV_PIX_FMT_YUV420P;
  return fallback;
}

bool Scaler::PrepareJob(Napi::Env env, const Napi::CallbackInfo& info, ScaleJob& job) {
  if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsObject()) {
    Napi::TypeError::New(env, "Expected (frame, options)").ThrowAsJavaScriptException();
    return false;
  }

  Frame* srcWrap = Napi::ObjectWrap<Frame>::Unwrap(info[0].As<Napi::Object>());
  AVFrame* src = srcWrap ? srcWrap->Get() : nullptr;
  if (!src || !src->data[0] || src->width <= 0 || src->height <= 0) {
    Napi::TypeError::New(env, "Invalid source frame (must be a software frame with data; hardware frames must be downloaded first)").ThrowAsJavaScriptException();
    return false;
  }

  Napi::Object options = info[1].As<Napi::Object>();

  // Crop (optional)
  int cropX = 0, cropY = 0, cropW = src->width, cropH = src->height;
  bool hasCrop = false;
  if (options.Has("crop") && options.Get("crop").IsObject()) {
    Napi::Object crop = options.Get("crop").As<Napi::Object>();
    if (crop.Has("x")) cropX = crop.Get("x").As<Napi::Number>().Int32Value();
    if (crop.Has("y")) cropY = crop.Get("y").As<Napi::Number>().Int32Value();
    if (crop.Has("width")) cropW = crop.Get("width").As<Napi::Number>().Int32Value();
    if (crop.Has("height")) cropH = crop.Get("height").As<Napi::Number>().Int32Value();
    hasCrop = (cropX != 0 || cropY != 0 || cropW != src->width || cropH != src->height);
  }

  if (cropX < 0 || cropY < 0 || cropW <= 0 || cropH <= 0 || cropX + cropW > src->width || cropY + cropH > src->height) {
    Napi::TypeError::New(env, "Invalid crop region").ThrowAsJavaScriptException();
    return false;
  }

  // Apply crop on a cheap ref of the source
  AVFrame* effective = src;
  AVFrame* cropped = nullptr;
  if (hasCrop) {
    cropped = av_frame_alloc();
    if (!cropped || av_frame_ref(cropped, src) < 0) {
      if (cropped) av_frame_free(&cropped);
      Napi::Error::New(env, "Failed to reference frame for cropping").ThrowAsJavaScriptException();
      return false;
    }
    cropped->crop_left = cropX;
    cropped->crop_top = cropY;
    cropped->crop_right = src->width - (cropX + cropW);
    cropped->crop_bottom = src->height - (cropY + cropH);
    int cr = av_frame_apply_cropping(cropped, AV_FRAME_CROP_UNALIGNED);
    if (cr < 0) {
      av_frame_free(&cropped);
      Napi::Error::New(env, "Failed to apply cropping").ThrowAsJavaScriptException();
      return false;
    }
    effective = cropped;
  }

  int srcW = effective->width;
  int srcH = effective->height;
  AVPixelFormat srcFmt = static_cast<AVPixelFormat>(effective->format);

  // Destination geometry/format
  int dstW = srcW, dstH = srcH;
  if (options.Has("resize") && options.Get("resize").IsObject()) {
    Napi::Object resize = options.Get("resize").As<Napi::Object>();
    if (resize.Has("width")) dstW = resize.Get("width").As<Napi::Number>().Int32Value();
    if (resize.Has("height")) dstH = resize.Get("height").As<Napi::Number>().Int32Value();
  }
  AVPixelFormat dstFmt = srcFmt;
  if (options.Has("format") && options.Get("format").IsString()) {
    dstFmt = ParseOutputFormat(options.Get("format").As<Napi::String>().Utf8Value(), srcFmt);
  }

  if (dstW <= 0 || dstH <= 0) {
    if (cropped) av_frame_free(&cropped);
    Napi::TypeError::New(env, "Invalid output dimensions").ThrowAsJavaScriptException();
    return false;
  }

  AVFrame* outFrame = effective;
  AVFrame* scaled = nullptr;
  SwsContext* sws = nullptr;

  const bool needsWork = (dstW != srcW || dstH != srcH || dstFmt != srcFmt);
  if (needsWork) {
    scaled = GetOrCreateFrame(dstW, dstH, dstFmt);
    sws = scaled ? GetOrCreateSwsContext(srcW, srcH, srcFmt, dstW, dstH, dstFmt) : nullptr;
    if (!scaled || !sws) {
      if (cropped) av_frame_free(&cropped);
      Napi::Error::New(env, "Failed to allocate scaling context").ThrowAsJavaScriptException();
      return false;
    }
    outFrame = scaled;
  }

  int outSize = av_image_get_buffer_size(static_cast<AVPixelFormat>(outFrame->format), outFrame->width, outFrame->height, 1);
  if (outSize <= 0) {
    if (cropped) av_frame_free(&cropped);
    Napi::Error::New(env, "Failed to compute output buffer size").ThrowAsJavaScriptException();
    return false;
  }

  job.effective = effective;
  job.cropped = cropped;
  job.scaled = scaled;
  job.sws = sws;
  job.outFrame = outFrame;
  job.srcH = srcH;
  job.outSize = outSize;
  return true;
}

int Scaler::RunJob(const ScaleJob& job, uint8_t* dst) {
  if (job.sws && job.scaled) {
    int ret = sws_scale(job.sws, job.effective->data, job.effective->linesize, 0, job.srcH, job.scaled->data, job.scaled->linesize);
    if (ret < 0) {
      return ret;
    }
  }
  // Pack the output frame into a tightly-aligned buffer (alignment 1).
  av_image_copy_to_buffer(dst, job.outSize, (const uint8_t* const*)job.outFrame->data, job.outFrame->linesize,
                          static_cast<AVPixelFormat>(job.outFrame->format), job.outFrame->width, job.outFrame->height, 1);
  return 0;
}

Napi::Value Scaler::Close(const Napi::CallbackInfo& info) {
  // Freeing the pooled frames/contexts while a process() job still uses them
  // on the threadpool would be a use-after-free; wait bounded, then error
  // instead of crashing
  if (!GuardAsyncOps(info.Env(), async_ops_, "Scaler")) {
    return info.Env().Undefined();
  }
  CleanupFrames();
  CleanupSwsContexts();
  return info.Env().Undefined();
}

AVFrame* Scaler::GetOrCreateFrame(int width, int height, AVPixelFormat format) {
  FrameConfig config = {width, height, format};
  auto it = frame_pool_.find(config);
  if (it != frame_pool_.end()) return it->second;

  AVFrame* frame = av_frame_alloc();
  if (!frame) return nullptr;
  frame->width = width;
  frame->height = height;
  frame->format = format;
  if (av_frame_get_buffer(frame, 0) < 0) {
    av_frame_free(&frame);
    return nullptr;
  }
  frame_pool_[config] = frame;
  return frame;
}

SwsContext* Scaler::GetOrCreateSwsContext(int src_w, int src_h, AVPixelFormat src_fmt, int dst_w, int dst_h, AVPixelFormat dst_fmt) {
  SwsConfig config = {src_w, src_h, dst_w, dst_h, src_fmt, dst_fmt};
  auto it = sws_pool_.find(config);
  if (it != sws_pool_.end()) return it->second;

  SwsContext* sws = sws_getContext(src_w, src_h, src_fmt, dst_w, dst_h, dst_fmt, flags_, nullptr, nullptr, nullptr);
  if (!sws) return nullptr;
  sws_pool_[config] = sws;
  return sws;
}

void Scaler::CleanupFrames() {
  for (auto& p : frame_pool_) {
    if (p.second) av_frame_free(&p.second);
  }
  frame_pool_.clear();
}

void Scaler::CleanupSwsContexts() {
  for (auto& p : sws_pool_) {
    if (p.second) sws_freeContext(p.second);
  }
  sws_pool_.clear();
}

} // namespace ffmpeg
