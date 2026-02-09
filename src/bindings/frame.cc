#include "frame.h"
#include "hardware_frames_context.h"
#include "hardware_device_context.h"
#include "dictionary.h"

// Platform-specific GPU texture imports
#if defined(__APPLE__) || defined(_WIN32) || defined(__linux__)
#include "gpu_texture.h"
#endif

namespace ffmpeg {

Napi::FunctionReference Frame::constructor;

Napi::Object Frame::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "Frame", {
    InstanceMethod<&Frame::Alloc>("alloc"),
    InstanceMethod<&Frame::Free>("free"),
    InstanceMethod<&Frame::Ref>("ref"),
    InstanceMethod<&Frame::Unref>("unref"),
    InstanceMethod<&Frame::Clone>("clone"),
    InstanceMethod<&Frame::GetBuffer>("getBuffer"),
    InstanceMethod<&Frame::AllocBuffer>("allocBuffer"),
    InstanceMethod<&Frame::MakeWritable>("makeWritable"),
    InstanceMethod<&Frame::CopyProps>("copyProps"),
    InstanceMethod<&Frame::Copy>("copy"),
    InstanceMethod<&Frame::FromBuffer>("fromBuffer"),
    InstanceMethod<&Frame::ToBuffer>("toBuffer"),
    InstanceMethod<&Frame::HwframeTransferDataAsync>("hwframeTransferData"),
    InstanceMethod<&Frame::HwframeTransferDataSync>("hwframeTransferDataSync"),
    InstanceMethod<&Frame::IsHwFrame>("isHwFrame"),
    InstanceMethod<&Frame::IsSwFrame>("isSwFrame"),
    InstanceMethod<&Frame::GetSideData>("getSideData"),
    InstanceMethod<&Frame::NewSideData>("newSideData"),
    InstanceMethod<&Frame::RemoveSideData>("removeSideData"),
    InstanceMethod<&Frame::GetMetadata>("getMetadata"),
    InstanceMethod<&Frame::ApplyCropping>("applyCropping"),
    InstanceMethod<&Frame::ImportIOSurface>("importIOSurface"),
    InstanceMethod<&Frame::ImportD3D11Texture>("importD3D11Texture"),
    InstanceMethod<&Frame::ImportDmaBuf>("importDmaBuf"),
    InstanceMethod<&Frame::Dispose>(Napi::Symbol::WellKnown(env, "dispose")),

    InstanceAccessor("format", &Frame::GetFormat, &Frame::SetFormat, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("width", &Frame::GetWidth, &Frame::SetWidth, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("height", &Frame::GetHeight, &Frame::SetHeight, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("nbSamples", &Frame::GetNbSamples, &Frame::SetNbSamples, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("pts", &Frame::GetPts, &Frame::SetPts, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("pktDts", &Frame::GetPktDts, &Frame::SetPktDts, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("bestEffortTimestamp", &Frame::GetBestEffortTimestamp, &Frame::SetBestEffortTimestamp, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("timeBase", &Frame::GetTimeBase, &Frame::SetTimeBase, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("keyFrame", &Frame::GetKeyFrame, &Frame::SetKeyFrame, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("pictType", &Frame::GetPictType, &Frame::SetPictType, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("quality", &Frame::GetQuality, &Frame::SetQuality, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("sampleAspectRatio", &Frame::GetSampleAspectRatio, &Frame::SetSampleAspectRatio, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("sampleRate", &Frame::GetSampleRate, &Frame::SetSampleRate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("channelLayout", &Frame::GetChannelLayout, &Frame::SetChannelLayout, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&Frame::GetChannels>("channels"),
    InstanceAccessor<&Frame::GetLinesize>("linesize"),
    InstanceAccessor("colorRange", &Frame::GetColorRange, &Frame::SetColorRange, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorPrimaries", &Frame::GetColorPrimaries, &Frame::SetColorPrimaries, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorTrc", &Frame::GetColorTrc, &Frame::SetColorTrc, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorSpace", &Frame::GetColorSpace, &Frame::SetColorSpace, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("chromaLocation", &Frame::GetChromaLocation, &Frame::SetChromaLocation, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&Frame::GetData>("data"),
    InstanceAccessor<&Frame::GetExtendedData>("extendedData"),
    InstanceAccessor<&Frame::GetIsWritable>("isWritable"),
    InstanceAccessor("hwFramesCtx", &Frame::GetHwFramesCtx, &Frame::SetHwFramesCtx, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("flags", &Frame::GetFlags, &Frame::SetFlags, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("decodeErrorFlags", &Frame::GetDecodeErrorFlags, &Frame::SetDecodeErrorFlags, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("duration", &Frame::GetDuration, &Frame::SetDuration, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("repeatPict", &Frame::GetRepeatPict, &Frame::SetRepeatPict, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("Frame", func);
  return exports;
}

Frame::Frame(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<Frame>(info) {
  // Constructor does nothing - user must explicitly call alloc()
}

Frame::~Frame() {
  av_frame_free(&frame_);
}

Napi::Value Frame::Alloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVFrame* frame = av_frame_alloc();
  if (!frame) {
    Napi::Error::New(env, "Failed to allocate frame (ENOMEM)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  av_frame_free(&frame_);

  frame_ = frame;
  return env.Undefined();
}

Napi::Value Frame::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  av_frame_free(&frame_);
  return env.Undefined();
}

Napi::Value Frame::Ref(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Source frame required").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  Frame* src = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  if (!src || !src->Get()) {
    Napi::TypeError::New(env, "Invalid source frame").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = av_frame_ref(frame_, src->Get());
  return Napi::Number::New(env, ret);
}

Napi::Value Frame::Unref(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (frame_) {
    av_frame_unref(frame_);
  }
  
  return env.Undefined();
}

Napi::Value Frame::Clone(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    return env.Null();
  }
  
  AVFrame* cloned = av_frame_clone(frame_);
  if (!cloned) {
    return env.Null();
  }
  
  // Create new Frame object
  Napi::Object newFrame = constructor.New({});
  Frame* wrapper = Napi::ObjectWrap<Frame>::Unwrap(newFrame);
  wrapper->frame_ = cloned;

  return newFrame;
}

Napi::Value Frame::GetBuffer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int align = 0;
  if (info.Length() > 0 && info[0].IsNumber()) {
    align = info[0].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_frame_get_buffer(frame_, align);
  return Napi::Number::New(env, ret);
}

Napi::Value Frame::AllocBuffer(const Napi::CallbackInfo& info) {
  // Alias for getBuffer with default alignment
  return GetBuffer(info);
}

Napi::Value Frame::MakeWritable(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = av_frame_make_writable(frame_);
  return Napi::Number::New(env, ret);
}

Napi::Value Frame::CopyProps(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Source frame required").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  Frame* src = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  if (!src || !src->Get()) {
    Napi::TypeError::New(env, "Invalid source frame").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = av_frame_copy_props(frame_, src->Get());
  return Napi::Number::New(env, ret);
}

Napi::Value Frame::Copy(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Source frame required").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  Frame* src = UnwrapNativeObject<Frame>(env, info[0], "Frame");
  if (!src || !src->Get()) {
    Napi::TypeError::New(env, "Invalid source frame").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = av_frame_copy(frame_, src->Get());
  return Napi::Number::New(env, ret);
}

Napi::Value Frame::FromBuffer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    Napi::TypeError::New(env, "Frame not allocated").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Buffer required").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
  uint8_t* data = buffer.Data();
  size_t size = buffer.Length();
  
  // For video frames, copy the buffer data to frame's data planes
  if (frame_->width > 0 && frame_->height > 0) {
    // Calculate expected size for the pixel format
    int expected_size = av_image_get_buffer_size(
      static_cast<AVPixelFormat>(frame_->format),
      frame_->width,
      frame_->height,
      1
    );
    
    if (expected_size < 0) {
      Napi::Error::New(env, "Failed to calculate buffer size").ThrowAsJavaScriptException();
      return Napi::Number::New(env, expected_size);
    }
    
    if (size < static_cast<size_t>(expected_size)) {
      Napi::Error::New(env, "Buffer too small for frame data").ThrowAsJavaScriptException();
      return Napi::Number::New(env, AVERROR(EINVAL));
    }
    
    // Fill frame data planes from buffer
    int ret = av_image_fill_arrays(
      frame_->data,
      frame_->linesize,
      data,
      static_cast<AVPixelFormat>(frame_->format),
      frame_->width,
      frame_->height,
      1
    );
    
    return Napi::Number::New(env, ret);
  }
  // For audio frames
  else if (frame_->nb_samples > 0) {
    int channels = frame_->ch_layout.nb_channels;
    AVSampleFormat sample_fmt = static_cast<AVSampleFormat>(frame_->format);
    int bytes_per_sample = av_get_bytes_per_sample(sample_fmt);
    bool is_planar = av_sample_fmt_is_planar(sample_fmt);
    
    int expected_size;
    if (is_planar) {
      // Planar: nb_samples * bytes_per_sample per channel
      expected_size = frame_->nb_samples * bytes_per_sample * channels;
    } else {
      // Interleaved: nb_samples * channels * bytes_per_sample
      expected_size = frame_->nb_samples * channels * bytes_per_sample;
    }
    
    if (size < static_cast<size_t>(expected_size)) {
      Napi::Error::New(env, "Buffer too small for audio data").ThrowAsJavaScriptException();
      return Napi::Number::New(env, AVERROR(EINVAL));
    }
    
    // Copy audio data
    if (is_planar) {
      // For planar formats, copy to each plane
      int plane_size = frame_->nb_samples * bytes_per_sample;
      for (int ch = 0; ch < channels; ch++) {
        memcpy(frame_->data[ch], data + (ch * plane_size), plane_size);
      }
    } else {
      // For interleaved formats, copy to data[0]
      memcpy(frame_->data[0], data, expected_size);
    }
    
    return Napi::Number::New(env, 0);
  }
  
  return Napi::Number::New(env, AVERROR(EINVAL));
}

Napi::Value Frame::ToBuffer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!frame_) {
    Napi::Error::New(env, "Frame not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Check if this is a hardware frame (cannot convert directly to buffer)
  if (frame_->hw_frames_ctx) {
    Napi::Error::New(env, "Cannot convert hardware frame to buffer - use hwframeTransferData first").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Check if frame has data
  if (!frame_->data[0]) {
    Napi::Error::New(env, "Frame has no data").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Handle video frames
  if (frame_->width > 0 && frame_->height > 0) {
    // Calculate required buffer size for video frame
    int buffer_size = av_image_get_buffer_size(
      static_cast<AVPixelFormat>(frame_->format),
      frame_->width,
      frame_->height,
      1
    );

    if (buffer_size < 0) {
      Napi::Error::New(env, "Failed to calculate buffer size for video frame").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    // Allocate buffer
    Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::New(env, buffer_size);
    uint8_t* buffer_data = buffer.Data();

    if (!buffer_data) {
      Napi::Error::New(env, "Failed to allocate buffer memory").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    // Copy frame data to buffer
    int ret = av_image_copy_to_buffer(
      buffer_data,
      buffer_size,
      (const uint8_t* const*)frame_->data,
      frame_->linesize,
      static_cast<AVPixelFormat>(frame_->format),
      frame_->width,
      frame_->height,
      1
    );

    if (ret < 0) {
      Napi::Error::New(env, "Failed to copy frame data to buffer").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    return buffer;
  }
  // Handle audio frames
  else if (frame_->nb_samples > 0) {
    int channels = frame_->ch_layout.nb_channels;
    AVSampleFormat sample_fmt = static_cast<AVSampleFormat>(frame_->format);
    int bytes_per_sample = av_get_bytes_per_sample(sample_fmt);
    bool is_planar = av_sample_fmt_is_planar(sample_fmt);

    if (bytes_per_sample <= 0) {
      Napi::Error::New(env, "Invalid sample format").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    int buffer_size;
    if (is_planar) {
      // Planar: all channels concatenated
      buffer_size = frame_->nb_samples * bytes_per_sample * channels;
    } else {
      // Interleaved: already in correct format
      buffer_size = frame_->nb_samples * channels * bytes_per_sample;
    }

    // Allocate buffer
    Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::New(env, buffer_size);
    uint8_t* buffer_data = buffer.Data();

    if (!buffer_data) {
      Napi::Error::New(env, "Failed to allocate buffer memory").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    // Copy audio data
    if (is_planar) {
      // Copy each channel sequentially
      int plane_size = frame_->nb_samples * bytes_per_sample;
      for (int ch = 0; ch < channels; ch++) {
        if (!frame_->data[ch]) {
          Napi::Error::New(env, "Missing audio channel data").ThrowAsJavaScriptException();
          return env.Undefined();
        }
        memcpy(buffer_data + (ch * plane_size), frame_->data[ch], plane_size);
      }
    } else {
      // Copy interleaved data directly
      memcpy(buffer_data, frame_->data[0], buffer_size);
    }

    return buffer;
  }

  // Neither video nor audio frame
  Napi::Error::New(env, "Frame is neither video nor audio").ThrowAsJavaScriptException();
  return env.Undefined();
}

Napi::Value Frame::GetFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, -1);
  }
  return Napi::Number::New(env, frame_->format);
}

void Frame::SetFormat(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->format = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Frame::GetWidth(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, frame_->width);
}

void Frame::SetWidth(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->width = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Frame::GetHeight(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, frame_->height);
}

void Frame::SetHeight(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->height = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Frame::GetNbSamples(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, frame_->nb_samples);
}

void Frame::SetNbSamples(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->nb_samples = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Frame::GetPts(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::BigInt::New(env, AV_NOPTS_VALUE);
  }
  return Napi::BigInt::New(env, frame_->pts);
}

void Frame::SetPts(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    bool lossless;
    frame_->pts = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Frame::GetPktDts(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::BigInt::New(env, AV_NOPTS_VALUE);
  }
  return Napi::BigInt::New(env, frame_->pkt_dts);
}

void Frame::SetPktDts(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    bool lossless;
    frame_->pkt_dts = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Frame::GetBestEffortTimestamp(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::BigInt::New(env, AV_NOPTS_VALUE);
  }
  // best_effort_timestamp is deprecated in newer FFmpeg versions
  // Use pts if available, otherwise use dts
  int64_t best_effort = frame_->pts;
  if (best_effort == AV_NOPTS_VALUE) {
    best_effort = frame_->pkt_dts;
  }
  return Napi::BigInt::New(env, best_effort);
}

void Frame::SetBestEffortTimestamp(const Napi::CallbackInfo& info, const Napi::Value& value) {
  // This is typically a read-only computed value
  // Setting it doesn't make much sense, but we'll allow it for compatibility
  if (frame_) {
    bool lossless;
    frame_->pts = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Frame::GetTimeBase(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    AVRational tb = {0, 1};
    return RationalToJS(env, tb);
  }
  return RationalToJS(env, frame_->time_base);
}

void Frame::SetTimeBase(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->time_base = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value Frame::GetKeyFrame(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, 0);
  }
  // Use AV_FRAME_FLAG_KEY instead of deprecated key_frame field
  // Return 1 or 0 for compatibility with FFmpeg API
  return Napi::Number::New(env, (frame_->flags & AV_FRAME_FLAG_KEY) ? 1 : 0);
}

void Frame::SetKeyFrame(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    // Use AV_FRAME_FLAG_KEY instead of deprecated key_frame field
    // Accept number (0 or 1) for compatibility with FFmpeg API
    int keyFrame = value.As<Napi::Number>().Int32Value();
    if (keyFrame) {
      frame_->flags |= AV_FRAME_FLAG_KEY;
    } else {
      frame_->flags &= ~AV_FRAME_FLAG_KEY;
    }
  }
}

Napi::Value Frame::GetPictType(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, AV_PICTURE_TYPE_NONE);
  }
  return Napi::Number::New(env, frame_->pict_type);
}

void Frame::SetPictType(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->pict_type = static_cast<AVPictureType>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value Frame::GetQuality(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, frame_->quality);
}

void Frame::SetQuality(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->quality = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Frame::GetSampleAspectRatio(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    AVRational sar = {0, 1};
    return RationalToJS(env, sar);
  }
  return RationalToJS(env, frame_->sample_aspect_ratio);
}

void Frame::SetSampleAspectRatio(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->sample_aspect_ratio = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value Frame::GetSampleRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, frame_->sample_rate);
}

void Frame::SetSampleRate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->sample_rate = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Frame::GetChannelLayout(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return env.Null();
  }
  
  AVFrame* f = frame_;
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("nbChannels", Napi::Number::New(env, f->ch_layout.nb_channels));
  obj.Set("order", Napi::Number::New(env, f->ch_layout.order));
  obj.Set("mask", Napi::BigInt::New(env, f->ch_layout.u.mask));
  
  return obj;
}

void Frame::SetChannelLayout(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (!frame_ || !value.IsObject()) {
    return;
  }
  
  Napi::Object obj = value.As<Napi::Object>();
  AVFrame* f = frame_;
  
  // Clean up any existing channel layout
  av_channel_layout_uninit(&f->ch_layout);
  
  // Initialize to default state
  memset(&f->ch_layout, 0, sizeof(AVChannelLayout));
  
  if (obj.Has("order")) {
    f->ch_layout.order = static_cast<AVChannelOrder>(obj.Get("order").As<Napi::Number>().Int32Value());
  }
  if (obj.Has("nbChannels")) {
    f->ch_layout.nb_channels = obj.Get("nbChannels").As<Napi::Number>().Int32Value();
  }
  if (obj.Has("mask")) {
    bool lossless;
    f->ch_layout.u.mask = obj.Get("mask").As<Napi::BigInt>().Uint64Value(&lossless);
  }
}

Napi::Value Frame::GetChannels(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, frame_->ch_layout.nb_channels);
}

Napi::Value Frame::GetLinesize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return env.Null();
  }
  
  Napi::Array arr = Napi::Array::New(env, AV_NUM_DATA_POINTERS);
  for (int i = 0; i < AV_NUM_DATA_POINTERS; i++) {
    arr.Set(i, Napi::Number::New(env, frame_->linesize[i]));
  }
  return arr;
}

Napi::Value Frame::GetColorRange(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, AVCOL_RANGE_UNSPECIFIED);
  }
  return Napi::Number::New(env, frame_->color_range);
}

void Frame::SetColorRange(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->color_range = static_cast<AVColorRange>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value Frame::GetColorPrimaries(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, AVCOL_PRI_UNSPECIFIED);
  }
  return Napi::Number::New(env, frame_->color_primaries);
}

void Frame::SetColorPrimaries(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->color_primaries = static_cast<AVColorPrimaries>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value Frame::GetColorTrc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, AVCOL_TRC_UNSPECIFIED);
  }
  return Napi::Number::New(env, frame_->color_trc);
}

void Frame::SetColorTrc(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->color_trc = static_cast<AVColorTransferCharacteristic>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value Frame::GetColorSpace(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, AVCOL_SPC_UNSPECIFIED);
  }
  return Napi::Number::New(env, frame_->colorspace);
}

void Frame::SetColorSpace(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->colorspace = static_cast<AVColorSpace>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value Frame::GetChromaLocation(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Number::New(env, AVCHROMA_LOC_UNSPECIFIED);
  }
  return Napi::Number::New(env, frame_->chroma_location);
}

void Frame::SetChromaLocation(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (frame_) {
    frame_->chroma_location = static_cast<AVChromaLocation>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value Frame::GetData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    return env.Null();
  }
  
  AVFrame* f = frame_;
  
  // Check if there's any data
  if (!f->data[0]) {
    return env.Null();
  }
  
  // Return array of data planes for video/audio
  Napi::Array planes = Napi::Array::New(env);
  
  // Check if this is an audio frame
  if (f->nb_samples > 0) {
    // Audio frame
    AVSampleFormat sample_fmt = static_cast<AVSampleFormat>(f->format);
    int nb_channels = f->ch_layout.nb_channels;
    int bytes_per_sample = av_get_bytes_per_sample(sample_fmt);
    
    if (av_sample_fmt_is_planar(sample_fmt)) {
      // Planar audio - one plane per channel
      for (int i = 0; i < nb_channels && f->data[i]; i++) {
        size_t plane_size = f->nb_samples * bytes_per_sample;
        planes.Set(static_cast<uint32_t>(i), Napi::Buffer<uint8_t>::NewOrCopy(env, f->data[i], plane_size));
      }
    } else {
      // Interleaved audio - all channels in one plane
      if (f->data[0]) {
        size_t plane_size = f->nb_samples * nb_channels * bytes_per_sample;
        planes.Set(static_cast<uint32_t>(0), Napi::Buffer<uint8_t>::NewOrCopy(env, f->data[0], plane_size));
      }
    }
  } else {
    // Video frame
    for (int i = 0; i < AV_NUM_DATA_POINTERS && f->data[i]; i++) {
      if (f->linesize[i] > 0) {
        // Calculate plane size
        int planeHeight = f->height;
        if (i > 0) {
          // For chroma planes in YUV formats, they might be subsampled
          const AVPixFmtDescriptor* desc = av_pix_fmt_desc_get(static_cast<AVPixelFormat>(f->format));
          if (desc && i < 3) {
            planeHeight = AV_CEIL_RSHIFT(f->height, desc->log2_chroma_h);
          }
        }
        size_t planeSize = f->linesize[i] * planeHeight;
        
        // Create buffer view (copies in Electron where external buffers are not allowed)
        planes.Set(static_cast<uint32_t>(i), Napi::Buffer<uint8_t>::NewOrCopy(env, f->data[i], planeSize));
      }
    }
  }
  
  return planes;
}

Napi::Value Frame::GetExtendedData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVFrame* f = frame_;
  if (!f || !f->extended_data) {
    return env.Null();
  }
  
  // For audio with more than 8 channels, extended_data contains all channel data
  // For video and audio with <= 8 channels, extended_data == data
  Napi::Array extData = Napi::Array::New(env);
  
  // Check if this is an audio frame by checking nb_samples
  if (f->nb_samples > 0) {
    // Audio frame
    int nb_channels = f->ch_layout.nb_channels;
    int nb_samples = f->nb_samples;
    int bytes_per_sample = av_get_bytes_per_sample(static_cast<AVSampleFormat>(f->format));
    
    if (bytes_per_sample <= 0 || nb_samples <= 0) {
      return env.Null();
    }
    
    // For planar audio, each channel is in a separate buffer
    bool is_planar = av_sample_fmt_is_planar(static_cast<AVSampleFormat>(f->format));
    
    if (is_planar) {
      // Each channel in separate buffer
      for (int ch = 0; ch < nb_channels; ch++) {
        if (!f->extended_data[ch]) break;
        
        size_t channel_size = nb_samples * bytes_per_sample;
        extData.Set(ch, Napi::Buffer<uint8_t>::NewOrCopy(env, f->extended_data[ch], channel_size));
      }
    } else {
      // All channels interleaved in single buffer
      size_t total_size = nb_samples * nb_channels * bytes_per_sample;
      if (f->extended_data[0]) {
        extData.Set(0u, Napi::Buffer<uint8_t>::NewOrCopy(env, f->extended_data[0], total_size));
      }
    }
  } else {
    // Video frame or no audio channels - use same logic as GetData
    for (int i = 0; i < AV_NUM_DATA_POINTERS && f->extended_data[i]; i++) {
      if (f->linesize[i] <= 0) break;
      
      // Calculate plane size based on format and dimensions
      int planeHeight = f->height;
      if (i > 0) {
        // For chroma planes in YUV formats
        const AVPixFmtDescriptor* desc = av_pix_fmt_desc_get(static_cast<AVPixelFormat>(f->format));
        if (desc) {
          planeHeight = AV_CEIL_RSHIFT(f->height, desc->log2_chroma_h);
        }
      }
      
      size_t planeSize = f->linesize[i] * planeHeight;
      extData.Set(i, Napi::Buffer<uint8_t>::NewOrCopy(env, f->extended_data[i], planeSize));
    }
  }
  
  return extData;
}

Napi::Value Frame::GetIsWritable(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return Napi::Boolean::New(env, false);
  }
  return Napi::Boolean::New(env, av_frame_is_writable(frame_) > 0);
}

// Hardware Acceleration
Napi::Value Frame::GetHwFramesCtx(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_ || !frame_->hw_frames_ctx) {
    return env.Null();
  }
  
  // Wrap the existing AVBufferRef in a HardwareFramesContext object
  return HardwareFramesContext::Wrap(env, frame_->hw_frames_ctx);
}

void Frame::SetHwFramesCtx(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (!frame_) {
    return;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    // Unref existing context
    if (frame_->hw_frames_ctx) {
      av_buffer_unref(&frame_->hw_frames_ctx);
    }
    return;
  }
  
  // Extract the HardwareFramesContext and get its AVBufferRef
  if (!value.IsObject()) {
    Napi::Error::New(info.Env(), "hwFramesCtx must be a HardwareFramesContext object").ThrowAsJavaScriptException();
    return;
  }
  
  HardwareFramesContext* frames = Napi::ObjectWrap<HardwareFramesContext>::Unwrap(value.As<Napi::Object>());
  if (!frames || !frames->Get()) {
    Napi::Error::New(info.Env(), "Invalid HardwareFramesContext").ThrowAsJavaScriptException();
    return;
  }
  
  // Unref old context if exists
  if (frame_->hw_frames_ctx) {
    av_buffer_unref(&frame_->hw_frames_ctx);
  }
  
  // Reference the new context
  frame_->hw_frames_ctx = av_buffer_ref(frames->Get());
}

Napi::Value Frame::IsHwFrame(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    return Napi::Boolean::New(env, false);
  }
  
  // A frame is a hardware frame if it has hw_frames_ctx set
  bool isHw = (frame_->hw_frames_ctx != nullptr);
  return Napi::Boolean::New(env, isHw);
}

Napi::Value Frame::IsSwFrame(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    return Napi::Boolean::New(env, false);
  }
  
  // A frame is a software frame if it doesn't have hw_frames_ctx 
  // but has actual data in the first plane
  bool isSw = (frame_->hw_frames_ctx == nullptr) && (frame_->data[0] != nullptr);
  return Napi::Boolean::New(env, isSw);
}

// === Side Data ===

Napi::Value Frame::GetSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    Napi::TypeError::New(env, "Invalid frame").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected side data type as number").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  enum AVFrameSideDataType type = static_cast<AVFrameSideDataType>(info[0].As<Napi::Number>().Int32Value());
  
  AVFrameSideData* sd = av_frame_get_side_data(frame_, type);
  if (!sd) {
    return env.Null();
  }
  
  // Return as Buffer
  return Napi::Buffer<uint8_t>::Copy(env, sd->data, sd->size);
}

Napi::Value Frame::NewSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    Napi::TypeError::New(env, "Invalid frame").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Expected (type: number, size: number)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  enum AVFrameSideDataType type = static_cast<AVFrameSideDataType>(info[0].As<Napi::Number>().Int32Value());
  size_t size = info[1].As<Napi::Number>().Uint32Value();
  
  AVFrameSideData* sd = av_frame_new_side_data(frame_, type, size);
  if (!sd) {
    Napi::Error::New(env, "Failed to allocate new side data").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Return as Buffer that references the side data (not a copy)
  // Note: The buffer lifetime is tied to the frame
  return Napi::Buffer<uint8_t>::NewOrCopy(env, sd->data, sd->size, [](Napi::Env, uint8_t*) {
    // No-op finalizer since the data is owned by the frame
  });
}

Napi::Value Frame::RemoveSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!frame_) {
    Napi::TypeError::New(env, "Invalid frame").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected side data type as number").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  enum AVFrameSideDataType type = static_cast<AVFrameSideDataType>(info[0].As<Napi::Number>().Int32Value());

  av_frame_remove_side_data(frame_, type);
  return env.Undefined();
}

Napi::Value Frame::GetMetadata(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!frame_) {
    Napi::TypeError::New(env, "Invalid frame").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Create Dictionary wrapper from AVFrame metadata
  Napi::Object obj = Dictionary::constructor.New({});
  Dictionary* dict = Dictionary::Unwrap(obj);

  // Copy frame metadata to dictionary
  if (frame_->metadata) {
    av_dict_copy(dict->GetDirectPtr(), frame_->metadata, 0);
  }

  return obj;
}

Napi::Value Frame::GetFlags(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return env.Null();
  }
  return Napi::Number::New(env, frame_->flags);
}

void Frame::SetFlags(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (!frame_) {
    return;
  }
  if (value.IsNumber()) {
    frame_->flags = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Frame::GetDecodeErrorFlags(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return env.Null();
  }
  return Napi::Number::New(env, frame_->decode_error_flags);
}

void Frame::SetDecodeErrorFlags(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (!frame_) {
    return;
  }
  if (value.IsNumber()) {
    frame_->decode_error_flags = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Frame::GetDuration(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return env.Null();
  }
  return Napi::BigInt::New(env, frame_->duration);
}

void Frame::SetDuration(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (!frame_) {
    return;
  }
  if (value.IsBigInt()) {
    bool lossless;
    frame_->duration = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Frame::GetRepeatPict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!frame_) {
    return env.Null();
  }
  return Napi::Number::New(env, frame_->repeat_pict);
}

void Frame::SetRepeatPict(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (!frame_) {
    return;
  }
  if (value.IsNumber()) {
    frame_->repeat_pict = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Frame::ApplyCropping(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!frame_) {
    Napi::TypeError::New(env, "Frame has been freed").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get flags argument (default to AV_FRAME_CROP_UNALIGNED = 1 << 0)
  int flags = 1 << 0; // AV_FRAME_CROP_UNALIGNED
  if (info.Length() > 0 && info[0].IsNumber()) {
    flags = info[0].As<Napi::Number>().Int32Value();
  }

  // Apply cropping using FFmpeg's av_frame_apply_cropping
  int ret = av_frame_apply_cropping(frame_, flags);

  return Napi::Number::New(env, ret);
}

Napi::Value Frame::ImportIOSurface(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

#ifdef __APPLE__
  if (!frame_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsObject()) {
    Napi::TypeError::New(env, "Expected (buffer, hwFramesCtx)").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
  HardwareFramesContext* framesCtx = UnwrapNativeObject<HardwareFramesContext>(env, info[1], "HardwareFramesContext");

  if (!framesCtx || !framesCtx->Get()) {
    Napi::TypeError::New(env, "Invalid HardwareFramesContext").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  int ret = importIOSurface(frame_, buffer.Data(), buffer.Length(), framesCtx->Get());
  return Napi::Number::New(env, ret);
#else
  // IOSurface is only available on macOS
  Napi::Error::New(env, "importIOSurface is only available on macOS").ThrowAsJavaScriptException();
  return Napi::Number::New(env, AVERROR(ENOSYS));
#endif
}

Napi::Value Frame::ImportD3D11Texture(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

#ifdef _WIN32
  if (!frame_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsObject()) {
    Napi::TypeError::New(env, "Expected (buffer, hwDeviceCtx)").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
  HardwareDeviceContext* deviceCtx = UnwrapNativeObject<HardwareDeviceContext>(env, info[1], "HardwareDeviceContext");

  if (!deviceCtx || !deviceCtx->Get()) {
    Napi::TypeError::New(env, "Invalid HardwareDeviceContext").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  int ret = importD3D11Texture(frame_, buffer.Data(), buffer.Length(), deviceCtx->Get());
  return Napi::Number::New(env, ret);
#else
  // D3D11 is only available on Windows
  Napi::Error::New(env, "importD3D11Texture is only available on Windows").ThrowAsJavaScriptException();
  return Napi::Number::New(env, AVERROR(ENOSYS));
#endif
}

Napi::Value Frame::ImportDmaBuf(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

#ifdef __linux__
  if (!frame_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  // importDmaBuf(planes, width, height, modifier, swFormat)
  if (info.Length() < 5 || !info[0].IsArray() || !info[1].IsNumber() ||
      !info[2].IsNumber() || !info[3].IsBigInt() || !info[4].IsNumber()) {
    Napi::TypeError::New(env, "Expected (planes[], width, height, modifier, swFormat)").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  Napi::Array planes = info[0].As<Napi::Array>();
  int width = info[1].As<Napi::Number>().Int32Value();
  int height = info[2].As<Napi::Number>().Int32Value();
  bool lossless;
  uint64_t modifier = info[3].As<Napi::BigInt>().Uint64Value(&lossless);
  int swFormat = info[4].As<Napi::Number>().Int32Value();

  int numPlanes = planes.Length();
  if (numPlanes <= 0 || numPlanes > 4) {
    Napi::TypeError::New(env, "Invalid number of planes (expected 1-4)").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  int fds[4] = {0};
  int strides[4] = {0};
  int offsets[4] = {0};
  int sizes[4] = {0};

  for (int i = 0; i < numPlanes; i++) {
    Napi::Object plane = planes.Get(i).As<Napi::Object>();
    fds[i] = plane.Get("fd").As<Napi::Number>().Int32Value();
    strides[i] = plane.Get("stride").As<Napi::Number>().Int32Value();
    offsets[i] = plane.Get("offset").As<Napi::Number>().Int32Value();
    sizes[i] = plane.Get("size").As<Napi::Number>().Int32Value();
  }

  int ret = importDmaBuf(frame_, fds, strides, offsets, sizes,
                          numPlanes, width, height, modifier, swFormat);
  return Napi::Number::New(env, ret);
#else
  // DMA-BUF is only available on Linux
  Napi::Error::New(env, "importDmaBuf is only available on Linux").ThrowAsJavaScriptException();
  return Napi::Number::New(env, AVERROR(ENOSYS));
#endif
}

Napi::Value Frame::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}

} // namespace ffmpeg