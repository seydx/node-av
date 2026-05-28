#include "codec.h"
#include "common.h"

extern "C" {
#include <libavutil/opt.h>
}

namespace ffmpeg {

Napi::FunctionReference Codec::constructor;

Napi::Object Codec::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "Codec", {
    StaticMethod<&Codec::FindDecoder>("findDecoder"),
    StaticMethod<&Codec::FindDecoderByName>("findDecoderByName"),
    StaticMethod<&Codec::FindEncoder>("findEncoder"),
    StaticMethod<&Codec::FindEncoderByName>("findEncoderByName"),
    StaticMethod<&Codec::GetCodecList>("getCodecList"),
    StaticMethod<&Codec::IterateCodecs>("iterateCodecs"),

    InstanceMethod<&Codec::IsEncoder>("isEncoder"),
    InstanceMethod<&Codec::IsDecoder>("isDecoder"),
    InstanceMethod<&Codec::IsExperimental>("isExperimental"),
    InstanceMethod<&Codec::GetHwConfig>("getHwConfig"),
    InstanceMethod<&Codec::GetOptions>("getOptions"),

    InstanceAccessor<&Codec::GetName>("name"),
    InstanceAccessor<&Codec::GetLongName>("longName"),
    InstanceAccessor<&Codec::GetType>("type"),
    InstanceAccessor<&Codec::GetId>("id"),
    InstanceAccessor<&Codec::GetCapabilities>("capabilities"),
    InstanceAccessor<&Codec::GetMaxLowres>("maxLowres"),
    InstanceAccessor<&Codec::GetProfiles>("profiles"),
    InstanceAccessor<&Codec::GetWrapper>("wrapper"),
    InstanceAccessor<&Codec::GetSupportedFramerates>("supportedFramerates"),
    InstanceAccessor<&Codec::GetPixelFormats>("pixelFormats"),
    InstanceAccessor<&Codec::GetSupportedSamplerates>("supportedSamplerates"),
    InstanceAccessor<&Codec::GetSampleFormats>("sampleFormats"),
    InstanceAccessor<&Codec::GetChannelLayouts>("channelLayouts"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("Codec", func);
  return exports;
}

Codec::Codec(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<Codec>(info), codec_(nullptr) {
  // Constructor does nothing - codec is set via static factory methods
}

Codec::~Codec() {
  // We don't own the AVCodec, it's a static definition from FFmpeg
}
Napi::Object Codec::NewInstance(Napi::Env env, AVCodec* codec) {
  if (!codec) {
    return env.Null().ToObject();
  }
  
  Napi::Object codecObj = constructor.New({});
  Codec* wrapper = UnwrapNativeObject<Codec>(env, codecObj, "Codec");
  wrapper->Set(const_cast<const AVCodec*>(codec));
  
  return codecObj;
}

Napi::Value Codec::FindDecoder(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Codec ID (number) required").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  AVCodecID codecId = static_cast<AVCodecID>(info[0].As<Napi::Number>().Int32Value());
  const AVCodec* codec = avcodec_find_decoder(codecId);
  
  if (!codec) {
    return env.Null();
  }
  
  // Create new Codec object
  Napi::Object codecObj = constructor.New({});
  Codec* wrapper = UnwrapNativeObject<Codec>(env, codecObj, "Codec");
  wrapper->Set(codec);
  
  return codecObj;
}

Napi::Value Codec::FindDecoderByName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Codec name (string) required").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[0].As<Napi::String>().Utf8Value();
  const AVCodec* codec = avcodec_find_decoder_by_name(name.c_str());
  
  if (!codec) {
    return env.Null();
  }
  
  // Create new Codec object
  Napi::Object codecObj = constructor.New({});
  Codec* wrapper = UnwrapNativeObject<Codec>(env, codecObj, "Codec");
  wrapper->Set(codec);
  
  return codecObj;
}

Napi::Value Codec::FindEncoder(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Codec ID (number) required").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  AVCodecID codecId = static_cast<AVCodecID>(info[0].As<Napi::Number>().Int32Value());
  const AVCodec* codec = avcodec_find_encoder(codecId);
  
  if (!codec) {
    return env.Null();
  }
  
  // Create new Codec object
  Napi::Object codecObj = constructor.New({});
  Codec* wrapper = UnwrapNativeObject<Codec>(env, codecObj, "Codec");
  wrapper->Set(codec);
  
  return codecObj;
}

Napi::Value Codec::FindEncoderByName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Codec name (string) required").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[0].As<Napi::String>().Utf8Value();
  const AVCodec* codec = avcodec_find_encoder_by_name(name.c_str());
  
  if (!codec) {
    return env.Null();
  }
  
  // Create new Codec object
  Napi::Object codecObj = constructor.New({});
  Codec* wrapper = UnwrapNativeObject<Codec>(env, codecObj, "Codec");
  wrapper->Set(codec);
  
  return codecObj;
}

Napi::Value Codec::GetCodecList(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array codecs = Napi::Array::New(env);
  
  void* opaque = nullptr;
  const AVCodec* codec = nullptr;
  uint32_t index = 0;
  
  while ((codec = av_codec_iterate(&opaque)) != nullptr) {
    Napi::Object codecObj = constructor.New({});
    Codec* wrapper = UnwrapNativeObject<Codec>(env, codecObj, "Codec");
    wrapper->Set(codec);
    codecs.Set(index++, codecObj);
  }
  
  return codecs;
}

Napi::Value Codec::IterateCodecs(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  void* opaque = nullptr;
  
  // Get iterator state if provided
  if (info.Length() > 0 && info[0].IsBigInt()) {
    bool lossless;
    uint64_t val = info[0].As<Napi::BigInt>().Uint64Value(&lossless);
    opaque = reinterpret_cast<void*>(val);
  }
  
  const AVCodec* codec = av_codec_iterate(&opaque);
  if (!codec) {
    return env.Null();
  }
  
  // Create codec object
  Napi::Object codecObj = constructor.New({});
  Codec* wrapper = UnwrapNativeObject<Codec>(env, codecObj, "Codec");
  wrapper->Set(codec);
  
  // Return iterator result
  Napi::Object result = Napi::Object::New(env);
  result.Set("codec", codecObj);
  result.Set("opaque", Napi::BigInt::New(env, reinterpret_cast<uint64_t>(opaque)));
  
  return result;
}

Napi::Value Codec::GetName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!codec_) {
    return env.Null();
  }
  return codec_->name ? Napi::String::New(env, codec_->name) : env.Null();
}

Napi::Value Codec::GetLongName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!codec_) {
    return env.Null();
  }
  return codec_->long_name ? Napi::String::New(env, codec_->long_name) : env.Null();
}

Napi::Value Codec::GetType(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!codec_) {
    return Napi::Number::New(env, AVMEDIA_TYPE_UNKNOWN);
  }
  return Napi::Number::New(env, codec_->type);
}

Napi::Value Codec::GetId(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!codec_) {
    return Napi::Number::New(env, AV_CODEC_ID_NONE);
  }
  return Napi::Number::New(env, codec_->id);
}

Napi::Value Codec::GetCapabilities(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!codec_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, codec_->capabilities);
}

Napi::Value Codec::GetMaxLowres(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!codec_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, codec_->max_lowres);
}

Napi::Value Codec::GetProfiles(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!codec_ || !codec_->profiles) {
    return env.Null();
  }
  
  Napi::Array profiles = Napi::Array::New(env);
  uint32_t index = 0;
  
  const AVProfile* profile = codec_->profiles;
  while (profile && profile->profile != AV_PROFILE_UNKNOWN) {
    Napi::Object prof = Napi::Object::New(env);
    prof.Set("profile", Napi::Number::New(env, profile->profile));
    if (profile->name) {
      prof.Set("name", Napi::String::New(env, profile->name));
    }
    profiles.Set(index++, prof);
    profile++;
  }
  
  return profiles;
}

Napi::Value Codec::GetWrapper(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!codec_) {
    return env.Null();
  }
  return codec_->wrapper_name ? Napi::String::New(env, codec_->wrapper_name) : env.Null();
}

Napi::Value Codec::GetSupportedFramerates(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!codec_) {
    return env.Null();
  }
  
  // Use avcodec_get_supported_config instead of deprecated supported_framerates
  const AVRational* supported_rates = nullptr;
  int num_rates = 0;
  
  int ret = avcodec_get_supported_config(nullptr, codec_, AV_CODEC_CONFIG_FRAME_RATE, 
                                         0, (const void**)&supported_rates, &num_rates);
  
  if (ret < 0 || !supported_rates) {
    return env.Null();
  }
  
  Napi::Array framerates = Napi::Array::New(env);
  
  for (int i = 0; i < num_rates; i++) {
    framerates.Set(i, RationalToJS(env, supported_rates[i]));
  }
  
  return framerates;
}

Napi::Value Codec::GetPixelFormats(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!codec_) {
    return env.Null();
  }
  
  // Use avcodec_get_supported_config instead of deprecated pix_fmts
  const AVPixelFormat* supported_formats = nullptr;
  int num_formats = 0;
  
  int ret = avcodec_get_supported_config(nullptr, codec_, AV_CODEC_CONFIG_PIX_FORMAT,
                                         0, (const void**)&supported_formats, &num_formats);
  
  if (ret < 0 || !supported_formats) {
    return env.Null();
  }
  
  Napi::Array formats = Napi::Array::New(env);
  
  for (int i = 0; i < num_formats; i++) {
    formats.Set(i, Napi::Number::New(env, supported_formats[i]));
  }
  
  return formats;
}

Napi::Value Codec::GetSupportedSamplerates(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!codec_) {
    return env.Null();
  }
  
  // Use avcodec_get_supported_config instead of deprecated supported_samplerates
  const int* supported_rates = nullptr;
  int num_rates = 0;
  
  int ret = avcodec_get_supported_config(nullptr, codec_, AV_CODEC_CONFIG_SAMPLE_RATE,
                                         0, (const void**)&supported_rates, &num_rates);
  
  if (ret < 0 || !supported_rates) {
    return env.Null();
  }
  
  Napi::Array rates = Napi::Array::New(env);
  
  for (int i = 0; i < num_rates; i++) {
    rates.Set(i, Napi::Number::New(env, supported_rates[i]));
  }
  
  return rates;
}

Napi::Value Codec::GetSampleFormats(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!codec_) {
    return env.Null();
  }
  
  // Use avcodec_get_supported_config instead of deprecated sample_fmts
  const AVSampleFormat* supported_formats = nullptr;
  int num_formats = 0;
  
  int ret = avcodec_get_supported_config(nullptr, codec_, AV_CODEC_CONFIG_SAMPLE_FORMAT,
                                         0, (const void**)&supported_formats, &num_formats);
  
  if (ret < 0 || !supported_formats) {
    return env.Null();
  }
  
  Napi::Array formats = Napi::Array::New(env);
  
  for (int i = 0; i < num_formats; i++) {
    formats.Set(i, Napi::Number::New(env, supported_formats[i]));
  }
  
  return formats;
}

Napi::Value Codec::GetChannelLayouts(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!codec_) {
    return env.Null();
  }
  
  // Use avcodec_get_supported_config instead of deprecated ch_layouts
  const AVChannelLayout* supported_layouts = nullptr;
  int num_layouts = 0;
  
  int ret = avcodec_get_supported_config(nullptr, codec_, AV_CODEC_CONFIG_CHANNEL_LAYOUT,
                                         0, (const void**)&supported_layouts, &num_layouts);
  
  if (ret < 0 || !supported_layouts) {
    return env.Null();
  }
  
  Napi::Array layouts = Napi::Array::New(env);
  
  for (int i = 0; i < num_layouts; i++) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("nbChannels", Napi::Number::New(env, supported_layouts[i].nb_channels));
    obj.Set("order", Napi::Number::New(env, supported_layouts[i].order));
    obj.Set("mask", Napi::BigInt::New(env, supported_layouts[i].u.mask));
    layouts.Set(i, obj);
  }
  
  return layouts;
}

Napi::Value Codec::IsEncoder(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!codec_) {
    return Napi::Boolean::New(env, false);
  }
  return Napi::Boolean::New(env, av_codec_is_encoder(codec_) != 0);
}

Napi::Value Codec::IsDecoder(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!codec_) {
    return Napi::Boolean::New(env, false);
  }
  return Napi::Boolean::New(env, av_codec_is_decoder(codec_) != 0);
}

Napi::Value Codec::IsExperimental(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!codec_) {
    return Napi::Boolean::New(env, false);
  }
  return Napi::Boolean::New(env, (codec_->capabilities & AV_CODEC_CAP_EXPERIMENTAL) != 0);
}

Napi::Value Codec::GetHwConfig(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!codec_) {
    return env.Null();
  }
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected index as number").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int index = info[0].As<Napi::Number>().Int32Value();
  const AVCodecHWConfig* config = avcodec_get_hw_config(codec_, index);
  
  if (!config) {
    return env.Null();
  }
  
  Napi::Object result = Napi::Object::New(env);
  result.Set("pixFmt", Napi::Number::New(env, config->pix_fmt));
  result.Set("methods", Napi::Number::New(env, config->methods));
  result.Set("deviceType", Napi::Number::New(env, config->device_type));

  return result;
}

Napi::Value Codec::GetOptions(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Napi::Array result = Napi::Array::New(env);
  if (!codec_ || !codec_->priv_class) {
    return result; // codec has no private options
  }

  // av_opt_next() iterates an AVClass's options. Passing the address of the
  // priv_class pointer works because av_opt_next only needs an object whose
  // first member is `const AVClass*` (same trick FFmpeg uses in -h encoder=...).
  const AVClass* priv_class = codec_->priv_class;
  const void* obj = &priv_class;

  uint32_t i = 0;
  const AVOption* opt = nullptr;
  while ((opt = av_opt_next(obj, opt)) != nullptr) {
    Napi::Object o = Napi::Object::New(env);
    o.Set("name", Napi::String::New(env, opt->name ? opt->name : ""));
    o.Set("help", opt->help ? Napi::Value(Napi::String::New(env, opt->help)) : env.Null());
    o.Set("type", Napi::Number::New(env, static_cast<int>(opt->type)));
    o.Set("flags", Napi::Number::New(env, opt->flags));
    o.Set("unit", opt->unit ? Napi::Value(Napi::String::New(env, opt->unit)) : env.Null());
    o.Set("min", Napi::Number::New(env, opt->min));
    o.Set("max", Napi::Number::New(env, opt->max));

    // Default value, decoded per option type
    switch (opt->type) {
      case AV_OPT_TYPE_FLAGS:
      case AV_OPT_TYPE_INT:
      case AV_OPT_TYPE_INT64:
      case AV_OPT_TYPE_UINT:
      case AV_OPT_TYPE_UINT64:
      case AV_OPT_TYPE_BOOL:
      case AV_OPT_TYPE_DURATION:
      case AV_OPT_TYPE_PIXEL_FMT:
      case AV_OPT_TYPE_SAMPLE_FMT:
      case AV_OPT_TYPE_CONST:
        o.Set("default", Napi::Number::New(env, static_cast<double>(opt->default_val.i64)));
        break;
      case AV_OPT_TYPE_DOUBLE:
      case AV_OPT_TYPE_FLOAT:
        o.Set("default", Napi::Number::New(env, opt->default_val.dbl));
        break;
      case AV_OPT_TYPE_STRING:
      case AV_OPT_TYPE_COLOR:
      case AV_OPT_TYPE_IMAGE_SIZE:
      case AV_OPT_TYPE_VIDEO_RATE:
        o.Set("default", opt->default_val.str ? Napi::Value(Napi::String::New(env, opt->default_val.str)) : env.Null());
        break;
      case AV_OPT_TYPE_RATIONAL: {
        Napi::Object q = Napi::Object::New(env);
        q.Set("num", Napi::Number::New(env, opt->default_val.q.num));
        q.Set("den", Napi::Number::New(env, opt->default_val.q.den));
        o.Set("default", q);
        break;
      }
      default:
        o.Set("default", env.Null());
        break;
    }

    result.Set(i++, o);
  }

  return result;
}

} // namespace ffmpeg