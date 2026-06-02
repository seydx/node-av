#include "utilities.h"
#include "common.h"
#include "format_context.h"
#include "codec_parameters.h"
#include "packet.h"
#include "stream.h"
#include "codec_parser.h"
#include <cstring>
#include <vector>
extern "C" {
#include <libavutil/version.h>
#include <libavformat/version.h>
#include <libavcodec/version.h>
#include <libavfilter/version.h>
#include <libavdevice/version.h>
#include <libswscale/version.h>
#include <libswresample/version.h>
#include <libavutil/ffversion.h>
#include <libavutil/intreadwrite.h>
#include <libavutil/bprint.h>
#include <libavformat/internal.h>
}

namespace ffmpeg {

Napi::Object Utilities::Init(Napi::Env env, Napi::Object exports) {
  // Sample format utilities
  exports.Set("avGetBytesPerSample", Napi::Function::New(env, GetBytesPerSample));
  exports.Set("avGetSampleFmtName", Napi::Function::New(env, GetSampleFmtName));
  exports.Set("avGetSampleFmtFromName", Napi::Function::New(env, GetSampleFmtFromName));
  exports.Set("avGetPackedSampleFmt", Napi::Function::New(env, GetPackedSampleFmt));
  exports.Set("avGetPlanarSampleFmt", Napi::Function::New(env, GetPlanarSampleFmt));
  exports.Set("avSampleFmtIsPlanar", Napi::Function::New(env, SampleFmtIsPlanar));

  // Pixel format utilities
  exports.Set("avGetPixFmtName", Napi::Function::New(env, GetPixFmtName));
  exports.Set("avGetPixFmtFromName", Napi::Function::New(env, GetPixFmtFromName));
  exports.Set("avIsHardwarePixelFormat", Napi::Function::New(env, IsHardwarePixelFormat));

  // Hardware device type utilities
  exports.Set("avGetHardwareDeviceTypeName", Napi::Function::New(env, GetHardwareDeviceTypeName));
  exports.Set("avGetHardwareDeviceTypeFromName", Napi::Function::New(env, GetHardwareDeviceTypeFromName));

  // Media type utilities
  exports.Set("avGetMediaTypeString", Napi::Function::New(env, GetMediaTypeString));

  // Codec utilities
  exports.Set("avGetCodecName", Napi::Function::New(env, GetCodecName));
  exports.Set("avGetCodecString", Napi::Function::New(env, GetCodecString));
  exports.Set("avGetMimeTypeDash", Napi::Function::New(env, GetMimeTypeDash));

  // Image utilities
  exports.Set("avImageAlloc", Napi::Function::New(env, ImageAlloc));
  exports.Set("avImageCopy2", Napi::Function::New(env, ImageCopy2));
  exports.Set("avImageGetBufferSize", Napi::Function::New(env, ImageGetBufferSize));
  exports.Set("avImageCopyToBuffer", Napi::Function::New(env, ImageCopyToBuffer));
  exports.Set("avImageCrop", Napi::Function::New(env, ImageCrop));

  // Timestamp utilities
  exports.Set("avTs2Str", Napi::Function::New(env, Ts2Str));
  exports.Set("avTs2TimeStr", Napi::Function::New(env, Ts2TimeStr));
  exports.Set("avCompareTs", Napi::Function::New(env, CompareTs));
  exports.Set("avRescaleQ", Napi::Function::New(env, RescaleQ));
  exports.Set("avRescaleRnd", Napi::Function::New(env, RescaleRnd));
  exports.Set("avRescaleDelta", Napi::Function::New(env, RescaleDelta));
  exports.Set("avGetAudioFrameDuration2", Napi::Function::New(env, GetAudioFrameDuration2));
  exports.Set("avUsleep", Napi::Function::New(env, Usleep));

  // Rational arithmetic utilities
  exports.Set("avMulQ", Napi::Function::New(env, MulQ));
  exports.Set("avInvQ", Napi::Function::New(env, InvQ));
  exports.Set("avAddQ", Napi::Function::New(env, AddQ));
  exports.Set("avGcd", Napi::Function::New(env, Gcd));
  exports.Set("avRescaleQRnd", Napi::Function::New(env, RescaleQRnd));

  // Audio sample utilities
  exports.Set("avSamplesAlloc", Napi::Function::New(env, SamplesAlloc));
  exports.Set("avSamplesGetBufferSize", Napi::Function::New(env, SamplesGetBufferSize));

  // Channel layout utilities
  exports.Set("avChannelLayoutDescribe", Napi::Function::New(env, ChannelLayoutDescribe));
  exports.Set("avChannelLayoutDefault", Napi::Function::New(env, ChannelLayoutDefault));

  // SDP utilities
  exports.Set("avSdpCreate", Napi::Function::New(env, SdpCreate));

  // Timestamp prediction utilities
  exports.Set("dtsPredict", Napi::Function::New(env, DtsPredict));

  // FFmpeg information
  exports.Set("getFFmpegInfo", Napi::Function::New(env, GetFFmpegInfo));

  return exports;
}

Utilities::Utilities(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<Utilities>(info) {
  // No instance creation needed for utilities
}

// === FFmpeg information utilities ===

Napi::Value Utilities::GetFFmpegInfo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Napi::Object result = Napi::Object::New(env);

  // FFmpeg version string (e.g., "7.1.2-Jellyfin")
  result.Set("version", Napi::String::New(env, FFMPEG_VERSION));

  // Configuration string
  const char* config = avcodec_configuration();
  result.Set("configuration", Napi::String::New(env, config ? config : ""));

  // Library versions object
  Napi::Object libs = Napi::Object::New(env);

  char libVersion[128];

  // libavutil
  snprintf(libVersion, sizeof(libVersion), "%d.%d.%d",
    LIBAVUTIL_VERSION_MAJOR, LIBAVUTIL_VERSION_MINOR, LIBAVUTIL_VERSION_MICRO);
  libs.Set("avutil", Napi::String::New(env, libVersion));

  // libavcodec
  snprintf(libVersion, sizeof(libVersion), "%d.%d.%d",
    LIBAVCODEC_VERSION_MAJOR, LIBAVCODEC_VERSION_MINOR, LIBAVCODEC_VERSION_MICRO);
  libs.Set("avcodec", Napi::String::New(env, libVersion));

  // libavformat
  snprintf(libVersion, sizeof(libVersion), "%d.%d.%d",
    LIBAVFORMAT_VERSION_MAJOR, LIBAVFORMAT_VERSION_MINOR, LIBAVFORMAT_VERSION_MICRO);
  libs.Set("avformat", Napi::String::New(env, libVersion));

  // libavfilter
  snprintf(libVersion, sizeof(libVersion), "%d.%d.%d",
    LIBAVFILTER_VERSION_MAJOR, LIBAVFILTER_VERSION_MINOR, LIBAVFILTER_VERSION_MICRO);
  libs.Set("avfilter", Napi::String::New(env, libVersion));

  // libavdevice
  snprintf(libVersion, sizeof(libVersion), "%d.%d.%d",
    LIBAVDEVICE_VERSION_MAJOR, LIBAVDEVICE_VERSION_MINOR, LIBAVDEVICE_VERSION_MICRO);
  libs.Set("avdevice", Napi::String::New(env, libVersion));

  // libswscale
  snprintf(libVersion, sizeof(libVersion), "%d.%d.%d",
    LIBSWSCALE_VERSION_MAJOR, LIBSWSCALE_VERSION_MINOR, LIBSWSCALE_VERSION_MICRO);
  libs.Set("swscale", Napi::String::New(env, libVersion));

  // libswresample
  snprintf(libVersion, sizeof(libVersion), "%d.%d.%d",
    LIBSWRESAMPLE_VERSION_MAJOR, LIBSWRESAMPLE_VERSION_MINOR, LIBSWRESAMPLE_VERSION_MICRO);
  libs.Set("swresample", Napi::String::New(env, libVersion));

  result.Set("libraries", libs);

  return result;
}

// === Sample format utilities ===

Napi::Value Utilities::GetBytesPerSample(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected sample format as number").ThrowAsJavaScriptException();
    return Napi::Number::New(env, -1);
  }
  
  int sample_fmt = info[0].As<Napi::Number>().Int32Value();
  int bytes = av_get_bytes_per_sample(static_cast<AVSampleFormat>(sample_fmt));
  
  return Napi::Number::New(env, bytes);
}

Napi::Value Utilities::GetSampleFmtName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected sample format as number").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int sample_fmt = info[0].As<Napi::Number>().Int32Value();
  const char* name = av_get_sample_fmt_name(static_cast<AVSampleFormat>(sample_fmt));
  
  if (name) {
    return Napi::String::New(env, name);
  }
  return env.Null();
}

Napi::Value Utilities::GetPackedSampleFmt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected sample format as number").ThrowAsJavaScriptException();
    return Napi::Number::New(env, -1);
  }
  
  int sample_fmt = info[0].As<Napi::Number>().Int32Value();
  AVSampleFormat packed = av_get_packed_sample_fmt(static_cast<AVSampleFormat>(sample_fmt));
  
  return Napi::Number::New(env, static_cast<int>(packed));
}

Napi::Value Utilities::GetPlanarSampleFmt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected sample format as number").ThrowAsJavaScriptException();
    return Napi::Number::New(env, -1);
  }
  
  int sample_fmt = info[0].As<Napi::Number>().Int32Value();
  AVSampleFormat planar = av_get_planar_sample_fmt(static_cast<AVSampleFormat>(sample_fmt));
  
  return Napi::Number::New(env, static_cast<int>(planar));
}

Napi::Value Utilities::SampleFmtIsPlanar(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected sample format as number").ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }

  int sample_fmt = info[0].As<Napi::Number>().Int32Value();
  int is_planar = av_sample_fmt_is_planar(static_cast<AVSampleFormat>(sample_fmt));

  return Napi::Boolean::New(env, is_planar != 0);
}

Napi::Value Utilities::GetSampleFmtFromName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected sample format name as string").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AV_SAMPLE_FMT_NONE);
  }

  std::string name = info[0].As<Napi::String>().Utf8Value();
  AVSampleFormat sample_fmt = av_get_sample_fmt(name.c_str());

  return Napi::Number::New(env, static_cast<int>(sample_fmt));
}

// === Pixel format utilities ===

Napi::Value Utilities::GetPixFmtName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected pixel format as number").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int pix_fmt = info[0].As<Napi::Number>().Int32Value();
  const char* name = av_get_pix_fmt_name(static_cast<AVPixelFormat>(pix_fmt));
  
  if (name) {
    return Napi::String::New(env, name);
  }
  return env.Null();
}

Napi::Value Utilities::GetPixFmtFromName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected pixel format name as string").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AV_PIX_FMT_NONE);
  }
  
  std::string name = info[0].As<Napi::String>().Utf8Value();
  AVPixelFormat pix_fmt = av_get_pix_fmt(name.c_str());
  
  return Napi::Number::New(env, static_cast<int>(pix_fmt));
}

Napi::Value Utilities::IsHardwarePixelFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected pixel format as number").ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }
  
  int pix_fmt = info[0].As<Napi::Number>().Int32Value();
  const AVPixFmtDescriptor* desc = av_pix_fmt_desc_get(static_cast<AVPixelFormat>(pix_fmt));
  
  if (!desc) {
    return Napi::Boolean::New(env, false);
  }
  
  // Check if the pixel format has the HWACCEL flag
  bool is_hw = (desc->flags & AV_PIX_FMT_FLAG_HWACCEL) != 0;
  return Napi::Boolean::New(env, is_hw);
}

// === Hardware device type utilities ===

Napi::Value Utilities::GetHardwareDeviceTypeName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected hardware device type as number").ThrowAsJavaScriptException();
    return env.Null();
  }

  int type = info[0].As<Napi::Number>().Int32Value();
  const char* name = av_hwdevice_get_type_name(static_cast<AVHWDeviceType>(type));

  if (name) {
    return Napi::String::New(env, name);
  }
  return env.Null();
}

Napi::Value Utilities::GetHardwareDeviceTypeFromName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected hardware device type name as string").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AV_HWDEVICE_TYPE_NONE);
  }

  std::string name = info[0].As<Napi::String>().Utf8Value();
  AVHWDeviceType type = av_hwdevice_find_type_by_name(name.c_str());

  return Napi::Number::New(env, static_cast<int>(type));
}

// === Media type utilities ===

Napi::Value Utilities::GetMediaTypeString(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected media type as number").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int media_type = info[0].As<Napi::Number>().Int32Value();
  const char* name = av_get_media_type_string(static_cast<AVMediaType>(media_type));
  
  if (name) {
    return Napi::String::New(env, name);
  }
  return env.Null();
}

// === Codec utilities ===

Napi::Value Utilities::GetCodecName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected codec ID as number").ThrowAsJavaScriptException();
    return env.Null();
  }

  int codec_id = info[0].As<Napi::Number>().Int32Value();
  const char* name = avcodec_get_name(static_cast<AVCodecID>(codec_id));

  if (name) {
    return Napi::String::New(env, name);
  }
  return env.Null();
}

Napi::Value Utilities::GetCodecString(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Expects: CodecParameters object, optional frameRate { num, den }
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected CodecParameters object").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Unwrap CodecParameters
  CodecParameters* codecParams = UnwrapNativeObject<CodecParameters>(env, info[0], "CodecParameters");
  if (!codecParams || !codecParams->Get()) {
    Napi::TypeError::New(env, "Invalid CodecParameters object").ThrowAsJavaScriptException();
    return env.Null();
  }

  AVCodecParameters* par = codecParams->Get();

  // Optional frame rate parameter for video (needed for VP9)
  AVRational frame_rate = {0, 1};
  const AVRational* frame_rate_ptr = nullptr;

  if (info.Length() >= 2 && info[1].IsObject()) {
    Napi::Object frObj = info[1].As<Napi::Object>();
    if (frObj.Has("num") && frObj.Has("den")) {
      frame_rate.num = frObj.Get("num").As<Napi::Number>().Int32Value();
      frame_rate.den = frObj.Get("den").As<Napi::Number>().Int32Value();
      if (frame_rate.num > 0 && frame_rate.den > 0) {
        frame_rate_ptr = &frame_rate;
      }
    }
  }

  // Use FFmpeg's centralized codec string function
  AVBPrint buf;
  av_bprint_init(&buf, 0, AV_BPRINT_SIZE_AUTOMATIC);

  int ret = ff_make_codec_str(nullptr, par, frame_rate_ptr, &buf);

  if (ret < 0 || !buf.str) {
    av_bprint_finalize(&buf, nullptr);
    return env.Null();
  }

  Napi::String result = Napi::String::New(env, buf.str);
  av_bprint_finalize(&buf, nullptr);

  return result;
}

Napi::Value Utilities::GetMimeTypeDash(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Expects: CodecParameters object
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected CodecParameters object").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Unwrap CodecParameters
  CodecParameters* codecParams = UnwrapNativeObject<CodecParameters>(env, info[0], "CodecParameters");
  if (!codecParams || !codecParams->Get()) {
    Napi::TypeError::New(env, "Invalid CodecParameters object").ThrowAsJavaScriptException();
    return env.Null();
  }

  AVCodecParameters* par = codecParams->Get();
  AVCodecID codec_id = par->codec_id;
  AVMediaType media_type = par->codec_type;

  // Determine segment type based on codec (same as FFmpeg dashenc.c:select_segment_type)
  const char* container_format;
  if (codec_id == AV_CODEC_ID_VP8 || codec_id == AV_CODEC_ID_VP9 ||
      codec_id == AV_CODEC_ID_VORBIS || codec_id == AV_CODEC_ID_OPUS) {
    container_format = "webm";
  } else {
    container_format = "mp4";
  }

  // Build MIME type: {mediaType}/{containerFormat}
  const char* media_type_str;
  switch (media_type) {
    case AVMEDIA_TYPE_VIDEO:
      media_type_str = "video";
      break;
    case AVMEDIA_TYPE_AUDIO:
      media_type_str = "audio";
      break;
    case AVMEDIA_TYPE_SUBTITLE:
      media_type_str = "application";
      break;
    default:
      return env.Null();
  }

  char mime_type[64];
  snprintf(mime_type, sizeof(mime_type), "%s/%s", media_type_str, container_format);
  return Napi::String::New(env, mime_type);
}

// === Image utilities ===

Napi::Value Utilities::ImageAlloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 4) {
    Napi::TypeError::New(env, "Expected 4 arguments (width, height, pixFmt, align)").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int width = info[0].As<Napi::Number>().Int32Value();
  int height = info[1].As<Napi::Number>().Int32Value();
  int pix_fmt = info[2].As<Napi::Number>().Int32Value();
  int align = info[3].As<Napi::Number>().Int32Value();
  
  uint8_t* pointers[4] = {nullptr};
  int linesizes[4] = {0};
  
  int ret = av_image_alloc(pointers, linesizes, width, height, 
                           static_cast<AVPixelFormat>(pix_fmt), align);
  
  if (ret < 0) {
    char errbuf[AV_ERROR_MAX_STRING_SIZE];
    av_strerror(ret, errbuf, sizeof(errbuf));
    Napi::Error::New(env, std::string("av_image_alloc failed: ") + errbuf).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Create result object with buffer and linesize info
  Napi::Object result = Napi::Object::New(env);
  result.Set("size", Napi::Number::New(env, ret));
  
  // Create buffer from allocated memory
  Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::NewOrCopy(env, pointers[0], ret,
    [](Napi::Env, uint8_t* data) {
      av_freep(&data);
    });
  result.Set("buffer", buffer);
  
  // Add linesizes
  Napi::Array linesizeArray = Napi::Array::New(env, 4);
  for (int i = 0; i < 4; i++) {
    linesizeArray[i] = Napi::Number::New(env, linesizes[i]);
  }
  result.Set("linesizes", linesizeArray);
  
  return result;
}

Napi::Value Utilities::ImageCopy2(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 7) {
    Napi::TypeError::New(env, "Expected 7 arguments (dstData, dstLinesizes, srcData, srcLinesizes, pixFmt, width, height)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Parse destination data
  if (!info[0].IsArray() || !info[1].IsArray()) {
    Napi::TypeError::New(env, "dstData and dstLinesizes must be arrays").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  Napi::Array dstDataArray = info[0].As<Napi::Array>();
  Napi::Array dstLinesizeArray = info[1].As<Napi::Array>();
  
  uint8_t* dst_data[4] = {nullptr};
  int dst_linesizes[4] = {0};
  
  for (uint32_t i = 0; i < 4 && i < dstDataArray.Length(); i++) {
    Napi::Value val = dstDataArray[i];
    if (val.IsBuffer()) {
      Napi::Buffer<uint8_t> buf = val.As<Napi::Buffer<uint8_t>>();
      dst_data[i] = buf.Data();
    }
  }
  
  for (uint32_t i = 0; i < 4 && i < dstLinesizeArray.Length(); i++) {
    Napi::Value val = dstLinesizeArray[i];
    dst_linesizes[i] = val.As<Napi::Number>().Int32Value();
  }
  
  // Parse source data
  if (!info[2].IsArray() || !info[3].IsArray()) {
    Napi::TypeError::New(env, "srcData and srcLinesizes must be arrays").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  Napi::Array srcDataArray = info[2].As<Napi::Array>();
  Napi::Array srcLinesizeArray = info[3].As<Napi::Array>();
  
  uint8_t* src_data[4] = {nullptr};
  int src_linesizes[4] = {0};
  
  for (uint32_t i = 0; i < 4 && i < srcDataArray.Length(); i++) {
    Napi::Value val = srcDataArray[i];
    if (val.IsBuffer()) {
      Napi::Buffer<uint8_t> buf = val.As<Napi::Buffer<uint8_t>>();
      src_data[i] = buf.Data();
    }
  }
  
  for (uint32_t i = 0; i < 4 && i < srcLinesizeArray.Length(); i++) {
    Napi::Value val = srcLinesizeArray[i];
    src_linesizes[i] = val.As<Napi::Number>().Int32Value();
  }
  
  int pix_fmt = info[4].As<Napi::Number>().Int32Value();
  int width = info[5].As<Napi::Number>().Int32Value();
  int height = info[6].As<Napi::Number>().Int32Value();
  
  av_image_copy2(dst_data, dst_linesizes, src_data, src_linesizes,
                 static_cast<AVPixelFormat>(pix_fmt), width, height);
  
  return env.Undefined();
}

Napi::Value Utilities::ImageGetBufferSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 4) {
    Napi::TypeError::New(env, "Expected 4 arguments (pixFmt, width, height, align)")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int pix_fmt = info[0].As<Napi::Number>().Int32Value();
  int width = info[1].As<Napi::Number>().Int32Value();
  int height = info[2].As<Napi::Number>().Int32Value();
  int align = info[3].As<Napi::Number>().Int32Value();
  
  int size = av_image_get_buffer_size(static_cast<AVPixelFormat>(pix_fmt), 
                                      width, height, align);
  
  return Napi::Number::New(env, size);
}

Napi::Value Utilities::ImageCopyToBuffer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 8) {
    Napi::TypeError::New(env, "Expected 8 arguments (dst, dstSize, srcData, srcLinesize, pixFmt, width, height, align)")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  // Get destination buffer
  if (!info[0].IsBuffer()) {
    Napi::TypeError::New(env, "First argument must be a buffer").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  Napi::Buffer<uint8_t> dstBuffer = info[0].As<Napi::Buffer<uint8_t>>();
  uint8_t* dst = dstBuffer.Data();
  
  int dst_size = info[1].As<Napi::Number>().Int32Value();
  
  // Get source data planes
  if (!info[2].IsArray()) {
    Napi::TypeError::New(env, "srcData must be an array").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  Napi::Array srcDataArray = info[2].As<Napi::Array>();
  
  // Get source linesizes
  if (!info[3].IsArray()) {
    Napi::TypeError::New(env, "srcLinesize must be an array").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  Napi::Array srcLinesizeArray = info[3].As<Napi::Array>();
  
  const uint8_t* src_data[4] = {nullptr};
  int src_linesize[4] = {0};
  
  // Fill source data pointers
  for (uint32_t i = 0; i < 4 && i < srcDataArray.Length(); i++) {
    Napi::Value val = srcDataArray[i];
    if (val.IsBuffer()) {
      Napi::Buffer<uint8_t> buf = val.As<Napi::Buffer<uint8_t>>();
      src_data[i] = buf.Data();
    }
  }
  
  // Fill source linesizes
  for (uint32_t i = 0; i < 4 && i < srcLinesizeArray.Length(); i++) {
    Napi::Value val = srcLinesizeArray[i];
    if (val.IsNumber()) {
      src_linesize[i] = val.As<Napi::Number>().Int32Value();
    }
  }
  
  int pix_fmt = info[4].As<Napi::Number>().Int32Value();
  int width = info[5].As<Napi::Number>().Int32Value();
  int height = info[6].As<Napi::Number>().Int32Value();
  int align = info[7].As<Napi::Number>().Int32Value();
  
  int ret = av_image_copy_to_buffer(dst, dst_size, src_data, src_linesize,
                                    static_cast<AVPixelFormat>(pix_fmt), 
                                    width, height, align);
  
  return Napi::Number::New(env, ret);
}

Napi::Value Utilities::ImageCrop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 9) {
    Napi::TypeError::New(env, "Expected 9 arguments (dstBuffer, srcBuffer, pixFmt, srcWidth, srcHeight, cropX, cropY, cropWidth, cropHeight)")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  // Get destination buffer
  if (!info[0].IsBuffer()) {
    Napi::TypeError::New(env, "First argument must be a destination buffer").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  Napi::Buffer<uint8_t> dstBuffer = info[0].As<Napi::Buffer<uint8_t>>();
  uint8_t* dst = dstBuffer.Data();

  // Get source buffer
  if (!info[1].IsBuffer()) {
    Napi::TypeError::New(env, "Second argument must be a source buffer").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  Napi::Buffer<uint8_t> srcBuffer = info[1].As<Napi::Buffer<uint8_t>>();
  const uint8_t* src = srcBuffer.Data();

  // Get parameters
  int pix_fmt = info[2].As<Napi::Number>().Int32Value();
  int src_width = info[3].As<Napi::Number>().Int32Value();
  int src_height = info[4].As<Napi::Number>().Int32Value();
  int crop_x = info[5].As<Napi::Number>().Int32Value();
  int crop_y = info[6].As<Napi::Number>().Int32Value();
  int crop_width = info[7].As<Napi::Number>().Int32Value();
  int crop_height = info[8].As<Napi::Number>().Int32Value();

  // Validate crop parameters
  if (crop_x < 0 || crop_y < 0 || crop_width <= 0 || crop_height <= 0 ||
      crop_x + crop_width > src_width || crop_y + crop_height > src_height) {
    Napi::TypeError::New(env, "Invalid crop parameters").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  AVPixelFormat format = static_cast<AVPixelFormat>(pix_fmt);
  const AVPixFmtDescriptor* desc = av_pix_fmt_desc_get(format);
  if (!desc) {
    Napi::TypeError::New(env, "Invalid pixel format").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  // Handle different pixel formats with optimized copy
  int bytes_copied = 0;

  if (format == AV_PIX_FMT_NV12 || format == AV_PIX_FMT_NV21) {
    // NV12/NV21: Y plane followed by interleaved UV plane
    int y_stride = src_width;
    int uv_stride = src_width;
    int y_src_offset = crop_y * y_stride + crop_x;
    int uv_src_offset = src_width * src_height + (crop_y / 2) * uv_stride + (crop_x & ~1);

    // Copy Y plane with SIMD-friendly memcpy
    for (int y = 0; y < crop_height; y++) {
      memcpy(dst + y * crop_width,
             src + y_src_offset + y * y_stride,
             crop_width);
    }
    bytes_copied += crop_width * crop_height;

    // Copy UV plane (height is halved for 4:2:0)
    int uv_crop_height = (crop_height + 1) / 2;
    int uv_crop_width = (crop_width + 1) & ~1; // Ensure even width
    for (int y = 0; y < uv_crop_height; y++) {
      memcpy(dst + crop_width * crop_height + y * uv_crop_width,
             src + uv_src_offset + y * uv_stride,
             uv_crop_width);
    }
    bytes_copied += uv_crop_width * uv_crop_height;

  } else if (format == AV_PIX_FMT_YUV420P || format == AV_PIX_FMT_YUV422P || format == AV_PIX_FMT_YUV444P) {
    // Planar YUV formats
    int y_stride = src_width;
    int y_size = src_width * src_height;

    // Determine chroma subsampling
    int h_sub = (format == AV_PIX_FMT_YUV444P) ? 0 : 1;
    int v_sub = (format == AV_PIX_FMT_YUV420P) ? 1 : 0;

    int chroma_width = (src_width + h_sub) >> h_sub;
    int chroma_height = (src_height + v_sub) >> v_sub;
    int u_stride = chroma_width;
    int v_stride = chroma_width;

    // Copy Y plane
    int y_src_offset = crop_y * y_stride + crop_x;
    for (int y = 0; y < crop_height; y++) {
      memcpy(dst + y * crop_width,
             src + y_src_offset + y * y_stride,
             crop_width);
    }
    bytes_copied += crop_width * crop_height;

    // Calculate chroma crop dimensions
    int chroma_crop_x = crop_x >> h_sub;
    int chroma_crop_y = crop_y >> v_sub;
    int chroma_crop_width = (crop_width + h_sub) >> h_sub;
    int chroma_crop_height = (crop_height + v_sub) >> v_sub;

    // Copy U plane
    int u_src_offset = y_size + chroma_crop_y * u_stride + chroma_crop_x;
    for (int y = 0; y < chroma_crop_height; y++) {
      memcpy(dst + crop_width * crop_height + y * chroma_crop_width,
             src + u_src_offset + y * u_stride,
             chroma_crop_width);
    }
    bytes_copied += chroma_crop_width * chroma_crop_height;

    // Copy V plane
    int v_src_offset = y_size + chroma_width * chroma_height + chroma_crop_y * v_stride + chroma_crop_x;
    for (int y = 0; y < chroma_crop_height; y++) {
      memcpy(dst + crop_width * crop_height + chroma_crop_width * chroma_crop_height + y * chroma_crop_width,
             src + v_src_offset + y * v_stride,
             chroma_crop_width);
    }
    bytes_copied += chroma_crop_width * chroma_crop_height;

  } else if (format == AV_PIX_FMT_RGB24 || format == AV_PIX_FMT_BGR24) {
    // Packed RGB formats - 3 bytes per pixel
    int bytes_per_pixel = 3;
    int src_stride = src_width * bytes_per_pixel;
    int dst_stride = crop_width * bytes_per_pixel;
    int src_offset = crop_y * src_stride + crop_x * bytes_per_pixel;

    for (int y = 0; y < crop_height; y++) {
      memcpy(dst + y * dst_stride,
             src + src_offset + y * src_stride,
             dst_stride);
    }
    bytes_copied = dst_stride * crop_height;

  } else if (format == AV_PIX_FMT_RGBA || format == AV_PIX_FMT_BGRA ||
             format == AV_PIX_FMT_ARGB || format == AV_PIX_FMT_ABGR) {
    // Packed RGBA formats - 4 bytes per pixel
    int bytes_per_pixel = 4;
    int src_stride = src_width * bytes_per_pixel;
    int dst_stride = crop_width * bytes_per_pixel;
    int src_offset = crop_y * src_stride + crop_x * bytes_per_pixel;

    // Use optimized copy for aligned data
    if ((reinterpret_cast<uintptr_t>(src + src_offset) & 15) == 0 &&
        (reinterpret_cast<uintptr_t>(dst) & 15) == 0 &&
        (dst_stride & 15) == 0) {
      // Data is 16-byte aligned, can use SIMD operations
      for (int y = 0; y < crop_height; y++) {
        const uint32_t* src_row = reinterpret_cast<const uint32_t*>(src + src_offset + y * src_stride);
        uint32_t* dst_row = reinterpret_cast<uint32_t*>(dst + y * dst_stride);

        // Copy as 32-bit integers for better performance
        for (int x = 0; x < crop_width; x++) {
          dst_row[x] = src_row[x];
        }
      }
    } else {
      // Fallback to regular memcpy
      for (int y = 0; y < crop_height; y++) {
        memcpy(dst + y * dst_stride,
               src + src_offset + y * src_stride,
               dst_stride);
      }
    }
    bytes_copied = dst_stride * crop_height;

  } else if (format == AV_PIX_FMT_GRAY8) {
    // Grayscale - 1 byte per pixel
    int src_stride = src_width;
    int src_offset = crop_y * src_stride + crop_x;

    for (int y = 0; y < crop_height; y++) {
      memcpy(dst + y * crop_width,
             src + src_offset + y * src_stride,
             crop_width);
    }
    bytes_copied = crop_width * crop_height;

  } else if (format == AV_PIX_FMT_GRAY16BE || format == AV_PIX_FMT_GRAY16LE) {
    // 16-bit grayscale
    int bytes_per_pixel = 2;
    int src_stride = src_width * bytes_per_pixel;
    int dst_stride = crop_width * bytes_per_pixel;
    int src_offset = crop_y * src_stride + crop_x * bytes_per_pixel;

    for (int y = 0; y < crop_height; y++) {
      memcpy(dst + y * dst_stride,
             src + src_offset + y * src_stride,
             dst_stride);
    }
    bytes_copied = dst_stride * crop_height;

  } else {
    // Generic fallback for other formats using av_image_copy2
    // This is slower but handles all formats correctly
    uint8_t* dst_data[4] = {dst, nullptr, nullptr, nullptr};
    int dst_linesizes[4] = {0};

    uint8_t* src_data[4] = {const_cast<uint8_t*>(src), nullptr, nullptr, nullptr};
    int src_linesizes_int[4] = {0};
    ptrdiff_t src_linesizes[4] = {0};

    // Calculate linesizes for the format
    av_image_fill_linesizes(src_linesizes_int, format, src_width);
    av_image_fill_linesizes(dst_linesizes, format, crop_width);

    // Convert int linesizes to ptrdiff_t for av_image_fill_plane_sizes
    for (int i = 0; i < 4; i++) {
      src_linesizes[i] = src_linesizes_int[i];
    }

    // Set up plane pointers
    if (desc->nb_components > 1) {
      // Calculate plane offsets
      size_t plane_sizes[4] = {0};
      av_image_fill_plane_sizes(plane_sizes, format, src_height, src_linesizes);

      // Set up source plane pointers
      for (int i = 1; i < 4 && i < desc->nb_components; i++) {
        if (plane_sizes[i-1] > 0) {
          src_data[i] = src_data[i-1] + plane_sizes[i-1];
        }
      }

      // Adjust source pointers for crop offset
      for (int i = 0; i < desc->nb_components; i++) {
        if (src_data[i] && src_linesizes_int[i] > 0) {
          int plane_crop_x = crop_x;
          int plane_crop_y = crop_y;

          // Adjust for chroma subsampling
          if (i > 0) {
            plane_crop_x >>= desc->log2_chroma_w;
            plane_crop_y >>= desc->log2_chroma_h;
          }

          src_data[i] += plane_crop_y * src_linesizes_int[i] + plane_crop_x;
        }
      }

      // Set up destination plane pointers
      size_t dst_plane_sizes[4] = {0};
      ptrdiff_t dst_linesizes_ptrdiff[4] = {0};
      for (int i = 0; i < 4; i++) {
        dst_linesizes_ptrdiff[i] = dst_linesizes[i];
      }
      av_image_fill_plane_sizes(dst_plane_sizes, format, crop_height, dst_linesizes_ptrdiff);
      for (int i = 1; i < 4 && i < desc->nb_components; i++) {
        if (dst_plane_sizes[i-1] > 0) {
          dst_data[i] = dst_data[i-1] + dst_plane_sizes[i-1];
        }
      }
    }

    // Copy using av_image_copy2
    av_image_copy2(dst_data, dst_linesizes, src_data, src_linesizes_int,
                   format, crop_width, crop_height);

    bytes_copied = av_image_get_buffer_size(format, crop_width, crop_height, 1);
  }

  return Napi::Number::New(env, bytes_copied);
}

// === Timestamp utilities ===

Napi::Value Utilities::Ts2Str(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected timestamp").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int64_t ts;
  if (info[0].IsBigInt()) {
    bool lossless;
    ts = info[0].As<Napi::BigInt>().Int64Value(&lossless);
  } else if (info[0].IsNull() || info[0].IsUndefined()) {
    ts = AV_NOPTS_VALUE;
  } else {
    ts = info[0].As<Napi::Number>().Int64Value();
  }
  
  char buf[AV_TS_MAX_STRING_SIZE];
  av_ts_make_string(buf, ts);
  
  return Napi::String::New(env, buf);
}

Napi::Value Utilities::Ts2TimeStr(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (timestamp, timebase)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int64_t ts;
  if (info[0].IsBigInt()) {
    bool lossless;
    ts = info[0].As<Napi::BigInt>().Int64Value(&lossless);
  } else if (info[0].IsNull() || info[0].IsUndefined()) {
    ts = AV_NOPTS_VALUE;
  } else {
    ts = info[0].As<Napi::Number>().Int64Value();
  }
  
  // Parse timebase as rational
  if (!info[1].IsObject()) {
    Napi::TypeError::New(env, "timebase must be an object with num and den").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Object tb = info[1].As<Napi::Object>();
  AVRational time_base;
  time_base.num = tb.Get("num").As<Napi::Number>().Int32Value();
  time_base.den = tb.Get("den").As<Napi::Number>().Int32Value();
  
  char buf[AV_TS_MAX_STRING_SIZE];
  av_ts_make_time_string(buf, ts, &time_base);
  
  return Napi::String::New(env, buf);
}

Napi::Value Utilities::CompareTs(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 4) {
    Napi::TypeError::New(env, "Expected 4 arguments (ts_a, tb_a, ts_b, tb_b)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // Parse first timestamp
  int64_t ts_a;
  if (info[0].IsBigInt()) {
    bool lossless;
    ts_a = info[0].As<Napi::BigInt>().Int64Value(&lossless);
  } else if (info[0].IsNull() || info[0].IsUndefined()) {
    ts_a = AV_NOPTS_VALUE;
  } else {
    ts_a = info[0].As<Napi::Number>().Int64Value();
  }
  
  // Parse first timebase
  AVRational tb_a = {1, 1}; // default
  if (info[1].IsNull() || info[1].IsUndefined()) {
    // Use default 1/1 for null timebase
  } else if (info[1].IsObject()) {
    Napi::Object tb_a_obj = info[1].As<Napi::Object>();
    tb_a.num = tb_a_obj.Get("num").As<Napi::Number>().Int32Value();
    tb_a.den = tb_a_obj.Get("den").As<Napi::Number>().Int32Value();
  } else {
    Napi::TypeError::New(env, "tb_a must be an object with num and den or null").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // Parse second timestamp
  int64_t ts_b;
  if (info[2].IsBigInt()) {
    bool lossless;
    ts_b = info[2].As<Napi::BigInt>().Int64Value(&lossless);
  } else if (info[2].IsNull() || info[2].IsUndefined()) {
    ts_b = AV_NOPTS_VALUE;
  } else {
    ts_b = info[2].As<Napi::Number>().Int64Value();
  }
  
  // Parse second timebase
  AVRational tb_b = {1, 1}; // default
  if (info[3].IsNull() || info[3].IsUndefined()) {
    // Use default 1/1 for null timebase
  } else if (info[3].IsObject()) {
    Napi::Object tb_b_obj = info[3].As<Napi::Object>();
    tb_b.num = tb_b_obj.Get("num").As<Napi::Number>().Int32Value();
    tb_b.den = tb_b_obj.Get("den").As<Napi::Number>().Int32Value();
  } else {
    Napi::TypeError::New(env, "tb_b must be an object with num and den or null").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int result = av_compare_ts(ts_a, tb_a, ts_b, tb_b);
  
  return Napi::Number::New(env, result);
}

Napi::Value Utilities::RescaleQ(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Expected 3 arguments (a, bq, cq)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // Parse timestamp
  int64_t a;
  if (info[0].IsBigInt()) {
    bool lossless;
    a = info[0].As<Napi::BigInt>().Int64Value(&lossless);
  } else if (info[0].IsNull() || info[0].IsUndefined()) {
    a = AV_NOPTS_VALUE;
  } else {
    a = info[0].As<Napi::Number>().Int64Value();
  }
  
  // Parse source timebase
  if (!info[1].IsObject()) {
    Napi::TypeError::New(env, "bq must be an object with num and den").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object bq_obj = info[1].As<Napi::Object>();
  AVRational bq;
  bq.num = bq_obj.Get("num").As<Napi::Number>().Int32Value();
  bq.den = bq_obj.Get("den").As<Napi::Number>().Int32Value();
  
  // Parse destination timebase
  if (!info[2].IsObject()) {
    Napi::TypeError::New(env, "cq must be an object with num and den").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object cq_obj = info[2].As<Napi::Object>();
  AVRational cq;
  cq.num = cq_obj.Get("num").As<Napi::Number>().Int32Value();
  cq.den = cq_obj.Get("den").As<Napi::Number>().Int32Value();
  
  int64_t result = av_rescale_q(a, bq, cq);
  
  // Return as BigInt for large values
  return Napi::BigInt::New(env, result);
}

Napi::Value Utilities::RescaleRnd(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 4) {
    Napi::TypeError::New(env, "Expected 4 arguments (a, b, c, rnd)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // Parse a
  int64_t a;
  if (info[0].IsBigInt()) {
    bool lossless;
    a = info[0].As<Napi::BigInt>().Int64Value(&lossless);
  } else {
    a = info[0].As<Napi::Number>().Int64Value();
  }
  
  // Parse b
  int64_t b;
  if (info[1].IsBigInt()) {
    bool lossless;
    b = info[1].As<Napi::BigInt>().Int64Value(&lossless);
  } else {
    b = info[1].As<Napi::Number>().Int64Value();
  }
  
  // Parse c
  int64_t c;
  if (info[2].IsBigInt()) {
    bool lossless;
    c = info[2].As<Napi::BigInt>().Int64Value(&lossless);
  } else {
    c = info[2].As<Napi::Number>().Int64Value();
  }
  
  // Parse rounding mode
  if (!info[3].IsNumber()) {
    Napi::TypeError::New(env, "rnd must be a number (AVRounding enum)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  int rnd = info[3].As<Napi::Number>().Int32Value();
  
  int64_t result = av_rescale_rnd(a, b, c, static_cast<AVRounding>(rnd));

  // Return as BigInt for large values
  return Napi::BigInt::New(env, result);
}

Napi::Value Utilities::RescaleDelta(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 6) {
    Napi::TypeError::New(env, "Expected 6 arguments (inTb, inTs, fsTb, duration, lastRef, outTb)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parse inTb (AVRational)
  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "inTb must be an object {num, den}")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object inTbObj = info[0].As<Napi::Object>();
  AVRational inTb;
  inTb.num = inTbObj.Get("num").As<Napi::Number>().Int32Value();
  inTb.den = inTbObj.Get("den").As<Napi::Number>().Int32Value();

  // Parse inTs (int64_t)
  int64_t inTs;
  if (info[1].IsBigInt()) {
    bool lossless;
    inTs = info[1].As<Napi::BigInt>().Int64Value(&lossless);
  } else {
    inTs = info[1].As<Napi::Number>().Int64Value();
  }

  // Parse fsTb (AVRational)
  if (!info[2].IsObject()) {
    Napi::TypeError::New(env, "fsTb must be an object {num, den}")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object fsTbObj = info[2].As<Napi::Object>();
  AVRational fsTb;
  fsTb.num = fsTbObj.Get("num").As<Napi::Number>().Int32Value();
  fsTb.den = fsTbObj.Get("den").As<Napi::Number>().Int32Value();

  // Parse duration (int)
  int duration = info[3].As<Napi::Number>().Int32Value();

  // Parse lastRef (int64_t*) - passed as object with value property that we modify
  if (!info[4].IsObject()) {
    Napi::TypeError::New(env, "lastRef must be an object with 'value' property")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object lastRefObj = info[4].As<Napi::Object>();
  int64_t last;
  if (lastRefObj.Has("value")) {
    Napi::Value lastVal = lastRefObj.Get("value");
    if (lastVal.IsBigInt()) {
      bool lossless;
      last = lastVal.As<Napi::BigInt>().Int64Value(&lossless);
    } else {
      last = lastVal.As<Napi::Number>().Int64Value();
    }
  } else {
    last = AV_NOPTS_VALUE;
  }

  // Parse outTb (AVRational)
  if (!info[5].IsObject()) {
    Napi::TypeError::New(env, "outTb must be an object {num, den}")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object outTbObj = info[5].As<Napi::Object>();
  AVRational outTb;
  outTb.num = outTbObj.Get("num").As<Napi::Number>().Int32Value();
  outTb.den = outTbObj.Get("den").As<Napi::Number>().Int32Value();

  // Call av_rescale_delta
  int64_t result = av_rescale_delta(inTb, inTs, fsTb, duration, &last, outTb);

  // Update the lastRef object
  lastRefObj.Set("value", Napi::BigInt::New(env, last));

  // Return result
  return Napi::BigInt::New(env, result);
}

Napi::Value Utilities::GetAudioFrameDuration2(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (codecpar, frameBytes)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parse codecpar (NativeCodecParameters)
  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "codecpar must be a CodecParameters object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  CodecParameters* codecpar_wrapper = UnwrapNativeObject<CodecParameters>(env, info[0], "CodecParameters");
  if (!codecpar_wrapper || !codecpar_wrapper->Get()) {
    Napi::TypeError::New(env, "Invalid CodecParameters object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  AVCodecParameters* codecpar = codecpar_wrapper->Get();

  // Parse frameBytes (int)
  int frameBytes = info[1].As<Napi::Number>().Int32Value();

  // Call av_get_audio_frame_duration2
  int duration = av_get_audio_frame_duration2(codecpar, frameBytes);

  return Napi::Number::New(env, duration);
}

Napi::Value Utilities::Usleep(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected microseconds as number").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  unsigned usec = info[0].As<Napi::Number>().Uint32Value();
  
  // Call FFmpeg's av_usleep function
  av_usleep(usec);
  
  return env.Undefined();
}

Napi::Value Utilities::SamplesAlloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 4) {
    Napi::TypeError::New(env, "Expected 4 arguments (nbChannels, nbSamples, sampleFmt, align)")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int nb_channels = info[0].As<Napi::Number>().Int32Value();
  int nb_samples = info[1].As<Napi::Number>().Int32Value();
  int sample_fmt = info[2].As<Napi::Number>().Int32Value();
  int align = info[3].As<Napi::Number>().Int32Value();
  
  uint8_t* audio_data[8] = {nullptr};
  int linesize = 0;
  
  int ret = av_samples_alloc(audio_data, &linesize, nb_channels, nb_samples,
                             static_cast<AVSampleFormat>(sample_fmt), align);
  
  if (ret < 0) {
    char errbuf[AV_ERROR_MAX_STRING_SIZE];
    av_strerror(ret, errbuf, sizeof(errbuf));
    Napi::Error::New(env, std::string("av_samples_alloc failed: ") + errbuf).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Create result object with buffer and linesize info
  Napi::Object result = Napi::Object::New(env);
  result.Set("size", Napi::Number::New(env, ret));
  result.Set("linesize", Napi::Number::New(env, linesize));
  
  // Check if format is planar
  bool is_planar = av_sample_fmt_is_planar(static_cast<AVSampleFormat>(sample_fmt));
  int planes = is_planar ? nb_channels : 1;
  
  // Create array of buffers for planar formats
  Napi::Array dataArray = Napi::Array::New(env, planes);
  
  if (is_planar) {
    // For planar formats, each channel gets its own buffer
    // IMPORTANT: av_samples_alloc allocates all channels in a single block
    // Only the first pointer should be freed
    for (int i = 0; i < planes; i++) {
      if (audio_data[i]) {
        // Only attach finalizer to first buffer
        if (i == 0) {
          Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::NewOrCopy(env, audio_data[i], linesize,
            [](Napi::Env, uint8_t* data) {
              av_freep(&data);
            });
          dataArray[i] = buffer;
        } else {
          // For subsequent channels, create buffer without finalizer
          // as they point into the same allocation
          Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::NewOrCopy(env, audio_data[i], linesize,
            [](Napi::Env, uint8_t*) {
              // No-op - memory will be freed with first buffer
            });
          dataArray[i] = buffer;
        }
      }
    }
  } else {
    // For packed formats, all data is in the first buffer
    Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::NewOrCopy(env, audio_data[0], ret,
      [](Napi::Env, uint8_t* data) {
        av_freep(&data);
      });
    dataArray[uint32_t(0)] = buffer;
  }
  
  result.Set("data", dataArray);
  
  return result;
}

Napi::Value Utilities::SamplesGetBufferSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 4) {
    Napi::TypeError::New(env, "Expected 4 arguments (nbChannels, nbSamples, sampleFmt, align)")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int nb_channels = info[0].As<Napi::Number>().Int32Value();
  int nb_samples = info[1].As<Napi::Number>().Int32Value();
  int sample_fmt = info[2].As<Napi::Number>().Int32Value();
  int align = info[3].As<Napi::Number>().Int32Value();
  
  int linesize = 0;
  int size = av_samples_get_buffer_size(&linesize, nb_channels, nb_samples,
                                        static_cast<AVSampleFormat>(sample_fmt), align);
  
  if (size < 0) {
    return Napi::Number::New(env, size);
  }
  
  // Return object with both size and linesize
  Napi::Object result = Napi::Object::New(env);
  result.Set("size", Napi::Number::New(env, size));
  result.Set("linesize", Napi::Number::New(env, linesize));
  
  return result;
}

Napi::Value Utilities::ChannelLayoutDescribe(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "Expected channel layout object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Object channelLayoutObj = info[0].As<Napi::Object>();
  
  // Create AVChannelLayout from the JS object
  AVChannelLayout ch_layout;
  memset(&ch_layout, 0, sizeof(AVChannelLayout));
  
  if (channelLayoutObj.Has("order")) {
    ch_layout.order = static_cast<AVChannelOrder>(channelLayoutObj.Get("order").As<Napi::Number>().Int32Value());
  }
  
  if (channelLayoutObj.Has("nbChannels")) {
    ch_layout.nb_channels = channelLayoutObj.Get("nbChannels").As<Napi::Number>().Int32Value();
  }
  
  if (channelLayoutObj.Has("mask")) {
    Napi::Value maskValue = channelLayoutObj.Get("mask");
    if (maskValue.IsBigInt()) {
      bool lossless;
      ch_layout.u.mask = maskValue.As<Napi::BigInt>().Uint64Value(&lossless);
    } else if (maskValue.IsNumber()) {
      ch_layout.u.mask = maskValue.As<Napi::Number>().Int64Value();
    }
  }
  
  // Describe the channel layout
  char buf[256];
  int ret = av_channel_layout_describe(&ch_layout, buf, sizeof(buf));

  if (ret < 0) {
    return env.Null();
  }

  return Napi::String::New(env, buf);
}

Napi::Value Utilities::ChannelLayoutDefault(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected number of channels").ThrowAsJavaScriptException();
    return env.Null();
  }

  int nb_channels = info[0].As<Napi::Number>().Int32Value();

  AVChannelLayout ch_layout;
  memset(&ch_layout, 0, sizeof(AVChannelLayout));
  av_channel_layout_default(&ch_layout, nb_channels);

  Napi::Object result = Napi::Object::New(env);
  result.Set("order", Napi::Number::New(env, static_cast<int>(ch_layout.order)));
  result.Set("nbChannels", Napi::Number::New(env, ch_layout.nb_channels));
  result.Set("mask", Napi::BigInt::New(env, ch_layout.u.mask));
  return result;
}

// === SDP utilities ===

Napi::Value Utilities::SdpCreate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsArray()) {
    Napi::TypeError::New(env, "First argument must be an array of FormatContext objects").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Array arr = info[0].As<Napi::Array>();
  int n_files = arr.Length();
  
  if (n_files == 0) {
    Napi::TypeError::New(env, "Array must contain at least one FormatContext").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // Collect AVFormatContext pointers
  std::vector<AVFormatContext*> contexts;
  contexts.reserve(n_files);
  
  for (uint32_t i = 0; i < arr.Length(); i++) {
    if (!arr.Get(i).IsObject()) {
      Napi::TypeError::New(env, "Array must contain FormatContext objects").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    Napi::Object obj = arr.Get(i).As<Napi::Object>();

    // Note: We need to get the FormatContext wrapper first, then access its internal context
    FormatContext* formatCtx = UnwrapNativeObject<FormatContext>(env, obj, "FormatContext");
    if (!formatCtx) {
      Napi::TypeError::New(env, "Invalid FormatContext object").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    AVFormatContext* ctx = formatCtx->Get();
    if (!ctx) {
      Napi::TypeError::New(env, "FormatContext has null AVFormatContext").ThrowAsJavaScriptException();
      return env.Null();
    }
    
    contexts.push_back(ctx);
  }
  
  // Create SDP with larger buffer (65536 as requested)
  char buf[65536];
  int ret = av_sdp_create(contexts.data(), n_files, buf, sizeof(buf));
  
  if (ret < 0) {
    return env.Null();
  }
  
  return Napi::String::New(env, buf);
}

Napi::Value Utilities::MulQ(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (a, b)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parse first rational
  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "a must be an object with num and den").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object a_obj = info[0].As<Napi::Object>();
  AVRational a;
  a.num = a_obj.Get("num").As<Napi::Number>().Int32Value();
  a.den = a_obj.Get("den").As<Napi::Number>().Int32Value();

  // Parse second rational
  if (!info[1].IsObject()) {
    Napi::TypeError::New(env, "b must be an object with num and den").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object b_obj = info[1].As<Napi::Object>();
  AVRational b;
  b.num = b_obj.Get("num").As<Napi::Number>().Int32Value();
  b.den = b_obj.Get("den").As<Napi::Number>().Int32Value();

  // Multiply rationals using FFmpeg's av_mul_q
  AVRational result = av_mul_q(a, b);

  // Return as object
  Napi::Object result_obj = Napi::Object::New(env);
  result_obj.Set("num", Napi::Number::New(env, result.num));
  result_obj.Set("den", Napi::Number::New(env, result.den));

  return result_obj;
}

Napi::Value Utilities::InvQ(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected 1 argument (q)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parse rational
  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "q must be an object with num and den").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object q_obj = info[0].As<Napi::Object>();
  AVRational q;
  q.num = q_obj.Get("num").As<Napi::Number>().Int32Value();
  q.den = q_obj.Get("den").As<Napi::Number>().Int32Value();

  // Invert rational using FFmpeg's av_inv_q
  AVRational result = av_inv_q(q);

  // Return as object
  Napi::Object result_obj = Napi::Object::New(env);
  result_obj.Set("num", Napi::Number::New(env, result.num));
  result_obj.Set("den", Napi::Number::New(env, result.den));

  return result_obj;
}

Napi::Value Utilities::AddQ(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (a, b)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parse first rational
  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "a must be an object with num and den").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object a_obj = info[0].As<Napi::Object>();
  AVRational a;
  a.num = a_obj.Get("num").As<Napi::Number>().Int32Value();
  a.den = a_obj.Get("den").As<Napi::Number>().Int32Value();

  // Parse second rational
  if (!info[1].IsObject()) {
    Napi::TypeError::New(env, "b must be an object with num and den").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object b_obj = info[1].As<Napi::Object>();
  AVRational b;
  b.num = b_obj.Get("num").As<Napi::Number>().Int32Value();
  b.den = b_obj.Get("den").As<Napi::Number>().Int32Value();

  // Add rationals using FFmpeg's av_add_q
  AVRational result = av_add_q(a, b);

  // Return as object
  Napi::Object result_obj = Napi::Object::New(env);
  result_obj.Set("num", Napi::Number::New(env, result.num));
  result_obj.Set("den", Napi::Number::New(env, result.den));

  return result_obj;
}

Napi::Value Utilities::Gcd(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (a, b)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parse arguments
  int64_t a, b;
  if (info[0].IsBigInt()) {
    bool lossless;
    a = info[0].As<Napi::BigInt>().Int64Value(&lossless);
  } else {
    a = info[0].As<Napi::Number>().Int64Value();
  }

  if (info[1].IsBigInt()) {
    bool lossless;
    b = info[1].As<Napi::BigInt>().Int64Value(&lossless);
  } else {
    b = info[1].As<Napi::Number>().Int64Value();
  }

  // Calculate GCD using FFmpeg's av_gcd
  int64_t result = av_gcd(a, b);

  return Napi::BigInt::New(env, result);
}

Napi::Value Utilities::RescaleQRnd(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 4) {
    Napi::TypeError::New(env, "Expected 4 arguments (a, bq, cq, rnd)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  // Parse timestamp
  int64_t a;
  if (info[0].IsBigInt()) {
    bool lossless;
    a = info[0].As<Napi::BigInt>().Int64Value(&lossless);
  } else if (info[0].IsNull() || info[0].IsUndefined()) {
    a = AV_NOPTS_VALUE;
  } else {
    a = info[0].As<Napi::Number>().Int64Value();
  }

  // Parse source timebase
  if (!info[1].IsObject()) {
    Napi::TypeError::New(env, "bq must be an object with num and den").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object bq_obj = info[1].As<Napi::Object>();
  AVRational bq;
  bq.num = bq_obj.Get("num").As<Napi::Number>().Int32Value();
  bq.den = bq_obj.Get("den").As<Napi::Number>().Int32Value();

  // Parse destination timebase
  if (!info[2].IsObject()) {
    Napi::TypeError::New(env, "cq must be an object with num and den").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Object cq_obj = info[2].As<Napi::Object>();
  AVRational cq;
  cq.num = cq_obj.Get("num").As<Napi::Number>().Int32Value();
  cq.den = cq_obj.Get("den").As<Napi::Number>().Int32Value();

  // Parse rounding mode
  int rnd = info[3].As<Napi::Number>().Int32Value();

  // Rescale with rounding using FFmpeg's av_rescale_q_rnd
  int64_t result = av_rescale_q_rnd(a, bq, cq, (AVRounding)rnd);

  return Napi::BigInt::New(env, result);
}

Napi::Value Utilities::DtsPredict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Expected 3 arguments: packet, stream, state").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get native Packet
  Packet* packetWrapper = UnwrapNativeObject<Packet>(env, info[0].As<Napi::Object>(), "Packet");
  if (!packetWrapper) {
    Napi::TypeError::New(env, "Invalid packet object").ThrowAsJavaScriptException();
    return env.Null();
  }
  AVPacket* pkt = packetWrapper->Get();
  if (!pkt) {
    Napi::TypeError::New(env, "Packet is null").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get native Stream
  Stream* streamWrapper = UnwrapNativeObject<Stream>(env, info[1].As<Napi::Object>(), "Stream");
  if (!streamWrapper) {
    Napi::TypeError::New(env, "Invalid stream object").ThrowAsJavaScriptException();
    return env.Null();
  }
  AVStream* stream = streamWrapper->Get();
  if (!stream) {
    Napi::TypeError::New(env, "Stream is null").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Get codecpar from stream
  AVCodecParameters* par = stream->codecpar;
  if (!par) {
    Napi::TypeError::New(env, "Stream codecpar is null").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Extract state
  Napi::Object stateObj = info[2].As<Napi::Object>();
  bool saw_first_ts = stateObj.Get("sawFirstTs").As<Napi::Boolean>().Value();

  int64_t dts = AV_NOPTS_VALUE;
  int64_t next_dts = AV_NOPTS_VALUE;
  int64_t first_dts = AV_NOPTS_VALUE;

  auto extractInt64 = [](Napi::Object& obj, const char* key, int64_t defaultVal) -> int64_t {
    if (!obj.Has(key)) return defaultVal;
    Napi::Value val = obj.Get(key);
    if (val.IsBigInt()) {
      bool lossless;
      return val.As<Napi::BigInt>().Int64Value(&lossless);
    } else if (val.IsNumber()) {
      return val.As<Napi::Number>().Int64Value();
    }
    return defaultVal;
  };

  dts = extractInt64(stateObj, "dts", AV_NOPTS_VALUE);
  next_dts = extractInt64(stateObj, "nextDts", AV_NOPTS_VALUE);
  first_dts = extractInt64(stateObj, "firstDts", AV_NOPTS_VALUE);

  // Extract values from native objects
  int64_t pkt_pts = pkt->pts;
  int64_t pkt_dts = pkt->dts;
  int64_t pkt_duration = pkt->duration;
  AVRational pkt_time_base = pkt->time_base;

  AVRational avg_frame_rate = stream->avg_frame_rate;
  int video_delay = par->video_delay;
  int codec_type = par->codec_type;
  int sample_rate = par->sample_rate;
  int frame_size = par->frame_size;
  AVRational frame_rate = par->framerate;

  // Get parser context from stream (if available)
  AVCodecParserContext* parser_ctx = av_stream_get_parser(stream);
  int repeat_pict = parser_ctx ? parser_ctx->repeat_pict : 0;

  // Check if codec has AV_CODEC_PROP_FIELDS property
  const AVCodecDescriptor* desc = avcodec_descriptor_get(par->codec_id);
  bool has_fields_property = desc && (desc->props & AV_CODEC_PROP_FIELDS);

  // First timestamp seen
  if (!saw_first_ts) {
    first_dts = dts = (avg_frame_rate.num && avg_frame_rate.den)
        ? -video_delay * AV_TIME_BASE / av_q2d(avg_frame_rate)
        : 0;

    if (pkt_pts != AV_NOPTS_VALUE) {
      first_dts = dts += av_rescale_q(pkt_pts, pkt_time_base, AV_TIME_BASE_Q);
    }
    saw_first_ts = true;
  }

  // Initialize next_dts if not set
  if (next_dts == AV_NOPTS_VALUE) {
    next_dts = dts;
  }

  // Update from packet DTS if available
  if (pkt_dts != AV_NOPTS_VALUE) {
    next_dts = dts = av_rescale_q(pkt_dts, pkt_time_base, AV_TIME_BASE_Q);
  }

  dts = next_dts;

  // Predict next DTS based on codec type
  switch (codec_type) {
    case AVMEDIA_TYPE_AUDIO:
      if (sample_rate > 0) {
        next_dts += ((int64_t)AV_TIME_BASE * frame_size) / sample_rate;
      } else {
        next_dts += av_rescale_q(pkt_duration, pkt_time_base, AV_TIME_BASE_Q);
      }
      break;

    case AVMEDIA_TYPE_VIDEO:
      if (pkt_duration > 0) {
        next_dts += av_rescale_q(pkt_duration, pkt_time_base, AV_TIME_BASE_Q);
      } else if (frame_rate.num != 0 && frame_rate.den != 0) {
        AVRational two_one = {2, 1};
        AVRational field_rate = av_mul_q(frame_rate, two_one);
        int fields = 2;

        if (has_fields_property && parser_ctx && repeat_pict >= 0) {
          fields = 1 + repeat_pict;
        }

        if (field_rate.num != 0 && field_rate.den != 0) {
          next_dts += av_rescale_q(fields, av_inv_q(field_rate), AV_TIME_BASE_Q);
        }
      }
      break;

    default:
      // For other codec types, try using packet duration
      if (pkt_duration > 0) {
        next_dts += av_rescale_q(pkt_duration, pkt_time_base, AV_TIME_BASE_Q);
      }
      break;
  }

  // Return updated state
  Napi::Object result = Napi::Object::New(env);
  result.Set("sawFirstTs", Napi::Boolean::New(env, saw_first_ts));
  result.Set("dts", Napi::BigInt::New(env, dts));
  result.Set("nextDts", Napi::BigInt::New(env, next_dts));
  result.Set("firstDts", Napi::BigInt::New(env, first_dts));

  return result;
}

} // namespace ffmpeg