#include "option.h"
#include "codec_context.h"
#include "format_context.h"
#include "filter_context.h"
#include "filter_graph.h"
#include "software_scale_context.h"
#include "software_resample_context.h"
#include "io_context.h"
#include "bitstream_filter_context.h"
#include "dictionary.h"
#include "error.h"
#include "common.h"
#include <vector>
#include <string>

extern "C" {
#include <libavutil/channel_layout.h>
}

namespace ffmpeg {

thread_local Napi::FunctionReference AVOptionWrapper::constructor;

Napi::Object AVOptionWrapper::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "AVOptionWrapper", {
    StaticMethod<&AVOptionWrapper::Next>("next"),
    StaticMethod<&AVOptionWrapper::Find>("find"),
    StaticMethod<&AVOptionWrapper::Find2>("find2"),
    StaticMethod<&AVOptionWrapper::Get>("get"),
    StaticMethod<&AVOptionWrapper::GetInt>("getInt"),
    StaticMethod<&AVOptionWrapper::GetDouble>("getDouble"),
    StaticMethod<&AVOptionWrapper::GetRational>("getRational"),
    StaticMethod<&AVOptionWrapper::GetPixelFormat>("getPixelFormat"),
    StaticMethod<&AVOptionWrapper::GetSampleFormat>("getSampleFormat"),
    StaticMethod<&AVOptionWrapper::GetImageSize>("getImageSize"),
    StaticMethod<&AVOptionWrapper::GetChannelLayout>("getChannelLayout"),
    StaticMethod<&AVOptionWrapper::GetDict>("getDict"),
    StaticMethod<&AVOptionWrapper::Set>("set"),
    StaticMethod<&AVOptionWrapper::SetInt>("setInt"),
    StaticMethod<&AVOptionWrapper::SetDouble>("setDouble"),
    StaticMethod<&AVOptionWrapper::SetRational>("setRational"),
    StaticMethod<&AVOptionWrapper::SetPixelFormat>("setPixelFormat"),
    StaticMethod<&AVOptionWrapper::SetSampleFormat>("setSampleFormat"),
    StaticMethod<&AVOptionWrapper::SetImageSize>("setImageSize"),
    StaticMethod<&AVOptionWrapper::SetChannelLayout>("setChannelLayout"),
    StaticMethod<&AVOptionWrapper::SetDict>("setDict"),
    StaticMethod<&AVOptionWrapper::SetBin>("setBin"),
    StaticMethod<&AVOptionWrapper::SetDefaults>("setDefaults"),
    StaticMethod<&AVOptionWrapper::Copy>("copy"),
    StaticMethod<&AVOptionWrapper::IsSetToDefault>("isSetToDefault"),
    StaticMethod<&AVOptionWrapper::Serialize>("serialize"),
    StaticMethod<&AVOptionWrapper::Free>("free"),
    StaticMethod<&AVOptionWrapper::Show>("show"),

    InstanceAccessor<&AVOptionWrapper::GetName, nullptr>("name"),
    InstanceAccessor<&AVOptionWrapper::GetHelp, nullptr>("help"),
    InstanceAccessor<&AVOptionWrapper::GetType, nullptr>("type"),
    InstanceAccessor<&AVOptionWrapper::GetDefaultValue, nullptr>("defaultValue"),
    InstanceAccessor<&AVOptionWrapper::GetMin, nullptr>("min"),
    InstanceAccessor<&AVOptionWrapper::GetMax, nullptr>("max"),
    InstanceAccessor<&AVOptionWrapper::GetFlags, nullptr>("flags"),
    InstanceAccessor<&AVOptionWrapper::GetUnit, nullptr>("unit"),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Option", func);
  return exports;
}

AVOptionWrapper::AVOptionWrapper(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AVOptionWrapper>(info) {
  this->option_ = nullptr;
}

AVOptionWrapper::~AVOptionWrapper() {
  // Note: AVOptions are not owned by this wrapper, they belong to their parent object
  // So we don't free them here
}

void AVOptionWrapper::SetOption(const ::AVOption* opt) {
  this->option_ = opt;
}

// Helper to extract void* from Native objects
void* AVOptionWrapper::GetNativePointer(const Napi::Value& obj) {
  if (!obj.IsObject()) {
    return nullptr;
  }
  
  Napi::Object jsObj = obj.As<Napi::Object>();
  
  // Use instanceof checks for all types to avoid UnwrapNativeObject issues
  
  // CodecContext
  if (!CodecContext::constructor.IsEmpty()) {
    Napi::Function ctor = CodecContext::constructor.Value();
    if (jsObj.InstanceOf(ctor)) {
      CodecContext* cc = Napi::ObjectWrap<CodecContext>::Unwrap(jsObj);
      if (cc) {
        return cc->Get();
      }
    }
  }
  
  // FormatContext
  if (!FormatContext::constructor.IsEmpty()) {
    Napi::Function ctor = FormatContext::constructor.Value();
    if (jsObj.InstanceOf(ctor)) {
      FormatContext* fc = Napi::ObjectWrap<FormatContext>::Unwrap(jsObj);
      if (fc) {
        return fc->Get();
      }
    }
  }
  
  // FilterContext
  if (!FilterContext::constructor.IsEmpty()) {
    Napi::Function ctor = FilterContext::constructor.Value();
    if (jsObj.InstanceOf(ctor)) {
      FilterContext* fctx = Napi::ObjectWrap<FilterContext>::Unwrap(jsObj);
      if (fctx) {
        return fctx->Get();
      }
    }
  }
  
  // FilterGraph
  if (!FilterGraph::constructor.IsEmpty()) {
    Napi::Function ctor = FilterGraph::constructor.Value();
    if (jsObj.InstanceOf(ctor)) {
      FilterGraph* fg = Napi::ObjectWrap<FilterGraph>::Unwrap(jsObj);
      if (fg) {
        return fg->Get();
      }
    }
  }
  
  // SoftwareScaleContext
  if (!SoftwareScaleContext::constructor.IsEmpty()) {
    Napi::Function ctor = SoftwareScaleContext::constructor.Value();
    if (jsObj.InstanceOf(ctor)) {
      SoftwareScaleContext* sws = Napi::ObjectWrap<SoftwareScaleContext>::Unwrap(jsObj);
      if (sws) {
        return sws->Get();
      }
    }
  }
  
  // SoftwareResampleContext
  if (!SoftwareResampleContext::constructor.IsEmpty()) {
    Napi::Function ctor = SoftwareResampleContext::constructor.Value();
    if (jsObj.InstanceOf(ctor)) {
      SoftwareResampleContext* swr = Napi::ObjectWrap<SoftwareResampleContext>::Unwrap(jsObj);
      if (swr) {
        return swr->Get();
      }
    }
  }
  
  // IOContext
  if (!IOContext::constructor.IsEmpty()) {
    Napi::Function ctor = IOContext::constructor.Value();
    if (jsObj.InstanceOf(ctor)) {
      IOContext* io = Napi::ObjectWrap<IOContext>::Unwrap(jsObj);
      if (io) {
        return io->Get();
      }
    }
  }
  
  // BitStreamFilterContext
  if (!BitStreamFilterContext::constructor.IsEmpty()) {
    Napi::Function ctor = BitStreamFilterContext::constructor.Value();
    if (jsObj.InstanceOf(ctor)) {
      BitStreamFilterContext* bsf = Napi::ObjectWrap<BitStreamFilterContext>::Unwrap(jsObj);
      if (bsf) {
        return bsf->Get();
      }
    }
  }
  
  return nullptr;
}

// Property getters for option metadata
Napi::Value AVOptionWrapper::GetName(const Napi::CallbackInfo& info) {
  if (!option_ || !option_->name) {
    return info.Env().Null();
  }
  return Napi::String::New(info.Env(), option_->name);
}

Napi::Value AVOptionWrapper::GetHelp(const Napi::CallbackInfo& info) {
  if (!option_ || !option_->help) {
    return info.Env().Null();
  }
  return Napi::String::New(info.Env(), option_->help);
}

Napi::Value AVOptionWrapper::GetType(const Napi::CallbackInfo& info) {
  if (!option_) {
    return info.Env().Null();
  }
  return Napi::Number::New(info.Env(), option_->type);
}

Napi::Value AVOptionWrapper::GetDefaultValue(const Napi::CallbackInfo& info) {
  if (!option_) {
    return info.Env().Null();
  }
  
  // Return default value based on type
  switch (option_->type) {
    case AV_OPT_TYPE_INT:
    case AV_OPT_TYPE_INT64:
    case AV_OPT_TYPE_UINT:
    case AV_OPT_TYPE_UINT64:
    case AV_OPT_TYPE_DURATION:
    case AV_OPT_TYPE_CHLAYOUT:
    case AV_OPT_TYPE_FLAGS:
    case AV_OPT_TYPE_BOOL:
    case AV_OPT_TYPE_PIXEL_FMT:
    case AV_OPT_TYPE_SAMPLE_FMT:
    case AV_OPT_TYPE_CONST:
      return Napi::Number::New(info.Env(), option_->default_val.i64);
    
    case AV_OPT_TYPE_DOUBLE:
    case AV_OPT_TYPE_FLOAT:
      return Napi::Number::New(info.Env(), option_->default_val.dbl);
    
    case AV_OPT_TYPE_STRING:
    case AV_OPT_TYPE_BINARY:
    case AV_OPT_TYPE_COLOR:
      if (option_->default_val.str) {
        return Napi::String::New(info.Env(), option_->default_val.str);
      }
      break;
    
    case AV_OPT_TYPE_RATIONAL:
    case AV_OPT_TYPE_VIDEO_RATE:
      return RationalToJS(info.Env(), option_->default_val.q);
      
    case AV_OPT_TYPE_IMAGE_SIZE:
      {
        // Image size doesn't have a direct default value field
        // Return null for now
        return info.Env().Null();
      }
      
    case AV_OPT_TYPE_DICT:
      {
        // Dictionary doesn't have a direct default value
        return info.Env().Null();
      }
      
    default:
      // For any new or unsupported types
      return info.Env().Null();
  }
  
  return info.Env().Null();
}

Napi::Value AVOptionWrapper::GetMin(const Napi::CallbackInfo& info) {
  if (!option_) {
    return info.Env().Null();
  }
  return Napi::Number::New(info.Env(), option_->min);
}

Napi::Value AVOptionWrapper::GetMax(const Napi::CallbackInfo& info) {
  if (!option_) {
    return info.Env().Null();
  }
  return Napi::Number::New(info.Env(), option_->max);
}

Napi::Value AVOptionWrapper::GetFlags(const Napi::CallbackInfo& info) {
  if (!option_) {
    return info.Env().Null();
  }
  return Napi::Number::New(info.Env(), option_->flags);
}

Napi::Value AVOptionWrapper::GetUnit(const Napi::CallbackInfo& info) {
  if (!option_ || !option_->unit) {
    return info.Env().Null();
  }
  return Napi::String::New(info.Env(), option_->unit);
}

Napi::Value AVOptionWrapper::Next(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Missing required argument: object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  const ::AVOption* prev = nullptr;
  if (info.Length() >= 2 && info[1].IsObject()) {
    Napi::Object prevObj = info[1].As<Napi::Object>();
    if (prevObj.InstanceOf(constructor.Value())) {
      AVOptionWrapper* prevOpt = Napi::ObjectWrap<AVOptionWrapper>::Unwrap(prevObj);
      prev = prevOpt->option_;
    }
  }
  
  const ::AVOption* opt = av_opt_next(obj, prev);
  if (!opt) {
    return env.Null();
  }
  
  Napi::Object optObj = constructor.New({});
  AVOptionWrapper* wrapper = Napi::ObjectWrap<AVOptionWrapper>::Unwrap(optObj);
  wrapper->SetOption(opt);
  
  return optObj;
}

Napi::Value AVOptionWrapper::Find(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  const ::AVOption* opt = av_opt_find(obj, name.c_str(), nullptr, 0, search_flags);
  if (!opt) {
    return env.Null();
  }
  
  Napi::Object optObj = constructor.New({});
  AVOptionWrapper* wrapper = Napi::ObjectWrap<AVOptionWrapper>::Unwrap(optObj);
  wrapper->SetOption(opt);
  
  return optObj;
}

Napi::Value AVOptionWrapper::Find2(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  void* target_obj = nullptr;
  const ::AVOption* opt = av_opt_find2(obj, name.c_str(), nullptr, 0, search_flags, &target_obj);
  if (!opt) {
    return env.Null();
  }
  
  Napi::Object result = Napi::Object::New(env);
  
  Napi::Object optObj = constructor.New({});
  AVOptionWrapper* wrapper = Napi::ObjectWrap<AVOptionWrapper>::Unwrap(optObj);
  wrapper->SetOption(opt);
  
  result.Set("option", optObj);
  // We can't return the target_obj as a JavaScript object without knowing its type
  // So we just indicate if it's different from the original
  result.Set("isDifferentTarget", target_obj != obj);
  
  return result;
}

Napi::Value AVOptionWrapper::Get(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  uint8_t* out_val = nullptr;
  int ret = av_opt_get(obj, name.c_str(), search_flags, &out_val);
  
  if (ret < 0) {
    return env.Null();
  }
  
  if (!out_val) {
    return env.Null();
  }
  
  Napi::String result = Napi::String::New(env, reinterpret_cast<char*>(out_val));
  av_free(out_val);
  
  return result;
}

Napi::Value AVOptionWrapper::GetInt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  int64_t out_val;
  int ret = av_opt_get_int(obj, name.c_str(), search_flags, &out_val);
  
  if (ret < 0) {
    return env.Null();
  }
  
  return Napi::Number::New(env, static_cast<double>(out_val));
}

Napi::Value AVOptionWrapper::GetDouble(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  double out_val;
  int ret = av_opt_get_double(obj, name.c_str(), search_flags, &out_val);
  
  if (ret < 0) {
    return env.Null();
  }
  
  return Napi::Number::New(env, out_val);
}

Napi::Value AVOptionWrapper::GetRational(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  AVRational out_val;
  int ret = av_opt_get_q(obj, name.c_str(), search_flags, &out_val);
  
  if (ret < 0) {
    return env.Null();
  }
  
  return RationalToJS(env, out_val);
}

Napi::Value AVOptionWrapper::GetPixelFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  enum AVPixelFormat out_val;
  int ret = av_opt_get_pixel_fmt(obj, name.c_str(), search_flags, &out_val);
  
  if (ret < 0) {
    return env.Null();
  }
  
  return Napi::Number::New(env, out_val);
}

Napi::Value AVOptionWrapper::GetSampleFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  enum AVSampleFormat out_val;
  int ret = av_opt_get_sample_fmt(obj, name.c_str(), search_flags, &out_val);
  
  if (ret < 0) {
    return env.Null();
  }
  
  return Napi::Number::New(env, out_val);
}

Napi::Value AVOptionWrapper::GetImageSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  int w_out, h_out;
  int ret = av_opt_get_image_size(obj, name.c_str(), search_flags, &w_out, &h_out);
  
  if (ret < 0) {
    return env.Null();
  }
  
  Napi::Object size = Napi::Object::New(env);
  size.Set("width", w_out);
  size.Set("height", h_out);
  
  return size;
}

Napi::Value AVOptionWrapper::GetChannelLayout(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  AVChannelLayout ch_layout = {};
  int ret = av_opt_get_chlayout(obj, name.c_str(), search_flags, &ch_layout);
  
  if (ret < 0) {
    return env.Null();
  }
  
  // Return channel layout as an object with order and mask
  Napi::Object layout = Napi::Object::New(env);
  layout.Set("order", static_cast<int>(ch_layout.order));
  layout.Set("nbChannels", ch_layout.nb_channels);
  if (ch_layout.order == AV_CHANNEL_ORDER_NATIVE) {
    layout.Set("mask", static_cast<double>(ch_layout.u.mask));
  }
  av_channel_layout_uninit(&ch_layout);
  return layout;
}

Napi::Value AVOptionWrapper::GetDict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  AVDictionary* dict = nullptr;
  int ret = av_opt_get_dict_val(obj, name.c_str(), search_flags, &dict);
  
  if (ret < 0) {
    return env.Null();
  }
  
  if (!dict) {
    return env.Null();
  }
  
  // Return dictionary content as plain JavaScript object
  // This is consistent with FFmpeg's behavior where av_opt_get_dict_val
  // returns the dictionary content, not a reference to an internal dictionary
  Napi::Object result = Napi::Object::New(env);
  AVDictionaryEntry* entry = nullptr;
  while ((entry = av_dict_get(dict, "", entry, AV_DICT_IGNORE_SUFFIX))) {
    result.Set(entry->key, entry->value);
  }
  av_dict_free(&dict);
  
  return result;
}

// Setter methods

Napi::Value AVOptionWrapper::Set(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Missing required arguments: object, name, value").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  std::string value = info[2].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 4 && info[3].IsNumber()) {
    search_flags = info[3].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_opt_set(obj, name.c_str(), value.c_str(), search_flags);
  return Napi::Number::New(env, ret);
}

Napi::Value AVOptionWrapper::SetInt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Missing required arguments: object, name, value").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  
  // Support both Number and BigInt for int64 values
  int64_t value = 0;
  if (info[2].IsBigInt()) {
    bool lossless = true;
    value = info[2].As<Napi::BigInt>().Int64Value(&lossless);
    if (!lossless) {
      Napi::RangeError::New(env, "BigInt value out of int64 range").ThrowAsJavaScriptException();
      return env.Undefined();
    }
  } else if (info[2].IsNumber()) {
    value = info[2].As<Napi::Number>().Int64Value();
  } else {
    Napi::TypeError::New(env, "Value must be a number or bigint").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int search_flags = 0;
  
  if (info.Length() >= 4 && info[3].IsNumber()) {
    search_flags = info[3].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_opt_set_int(obj, name.c_str(), value, search_flags);
  return Napi::Number::New(env, ret);
}

Napi::Value AVOptionWrapper::SetDouble(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Missing required arguments: object, name, value").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  double value = info[2].As<Napi::Number>().DoubleValue();
  int search_flags = 0;
  
  if (info.Length() >= 4 && info[3].IsNumber()) {
    search_flags = info[3].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_opt_set_double(obj, name.c_str(), value, search_flags);
  return Napi::Number::New(env, ret);
}

Napi::Value AVOptionWrapper::SetRational(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Missing required arguments: object, name, value").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  
  if (!info[2].IsObject()) {
    Napi::TypeError::New(env, "Value must be an object with num and den properties").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  Napi::Object rational = info[2].As<Napi::Object>();
  AVRational value = JSToRational(rational);
  
  int search_flags = 0;
  
  if (info.Length() >= 4 && info[3].IsNumber()) {
    search_flags = info[3].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_opt_set_q(obj, name.c_str(), value, search_flags);
  return Napi::Number::New(env, ret);
}

Napi::Value AVOptionWrapper::SetPixelFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Missing required arguments: object, name, value").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  enum AVPixelFormat value = static_cast<enum AVPixelFormat>(info[2].As<Napi::Number>().Int32Value());
  int search_flags = 0;
  
  if (info.Length() >= 4 && info[3].IsNumber()) {
    search_flags = info[3].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_opt_set_pixel_fmt(obj, name.c_str(), value, search_flags);
  return Napi::Number::New(env, ret);
}

Napi::Value AVOptionWrapper::SetSampleFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Missing required arguments: object, name, value").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  enum AVSampleFormat value = static_cast<enum AVSampleFormat>(info[2].As<Napi::Number>().Int32Value());
  int search_flags = 0;
  
  if (info.Length() >= 4 && info[3].IsNumber()) {
    search_flags = info[3].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_opt_set_sample_fmt(obj, name.c_str(), value, search_flags);
  return Napi::Number::New(env, ret);
}

Napi::Value AVOptionWrapper::SetImageSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 4) {
    Napi::TypeError::New(env, "Missing required arguments: object, name, width, height").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int width = info[2].As<Napi::Number>().Int32Value();
  int height = info[3].As<Napi::Number>().Int32Value();
  int search_flags = 0;
  
  if (info.Length() >= 5 && info[4].IsNumber()) {
    search_flags = info[4].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_opt_set_image_size(obj, name.c_str(), width, height, search_flags);
  return Napi::Number::New(env, ret);
}

Napi::Value AVOptionWrapper::SetChannelLayout(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Missing required arguments: object, name, value").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  
  // Support both Number and BigInt for channel layout (int64) values
  int64_t value = 0;
  if (info[2].IsBigInt()) {
    bool lossless = true;
    value = info[2].As<Napi::BigInt>().Int64Value(&lossless);
    if (!lossless) {
      Napi::RangeError::New(env, "BigInt value out of int64 range").ThrowAsJavaScriptException();
      return env.Undefined();
    }
  } else if (info[2].IsNumber()) {
    value = info[2].As<Napi::Number>().Int64Value();
  } else {
    Napi::TypeError::New(env, "Value must be a number or bigint").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int search_flags = 0;
  
  if (info.Length() >= 4 && info[3].IsNumber()) {
    search_flags = info[3].As<Napi::Number>().Int32Value();
  }
  
  AVChannelLayout layout = {};
  av_channel_layout_from_mask(&layout, static_cast<uint64_t>(value));
  int ret = av_opt_set_chlayout(obj, name.c_str(), &layout, search_flags);
  av_channel_layout_uninit(&layout);

  return Napi::Number::New(env, ret);
}

Napi::Value AVOptionWrapper::SetDict(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Missing required arguments: object, name, value").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  
  AVDictionary* dict = nullptr;
  if (info[2].IsObject()) {
    Dictionary* wrapper = UnwrapNativeObject<Dictionary>(env, info[2], "Dictionary");
    if (wrapper) {
      dict = wrapper->Get();
    }
  }
  
  int search_flags = 0;
  
  if (info.Length() >= 4 && info[3].IsNumber()) {
    search_flags = info[3].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_opt_set_dict_val(obj, name.c_str(), dict, search_flags);
  return Napi::Number::New(env, ret);
}

Napi::Value AVOptionWrapper::SetBin(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Missing required arguments: object, name, value").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  
  if (!info[2].IsBuffer()) {
    Napi::TypeError::New(env, "Value must be a Buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  Napi::Buffer<uint8_t> buffer = info[2].As<Napi::Buffer<uint8_t>>();
  int search_flags = 0;
  
  if (info.Length() >= 4 && info[3].IsNumber()) {
    search_flags = info[3].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_opt_set_bin(obj, name.c_str(), buffer.Data(), buffer.Length(), search_flags);
  return Napi::Number::New(env, ret);
}

// Utility methods

Napi::Value AVOptionWrapper::SetDefaults(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Missing required argument: object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  av_opt_set_defaults(obj);
  
  return env.Undefined();
}

Napi::Value AVOptionWrapper::Copy(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: dest, src").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* dest = GetNativePointer(info[0]);
  if (!dest) {
    Napi::TypeError::New(env, "Invalid destination object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* src = GetNativePointer(info[1]);
  if (!src) {
    Napi::TypeError::New(env, "Invalid source object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int ret = av_opt_copy(dest, src);
  return Napi::Number::New(env, ret);
}

Napi::Value AVOptionWrapper::IsSetToDefault(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Missing required arguments: object, name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string name = info[1].As<Napi::String>().Utf8Value();
  int search_flags = 0;
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    search_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  int ret = av_opt_is_set_to_default_by_name(obj, name.c_str(), search_flags);
  
  if (ret < 0) {
    return env.Null();
  }
  
  return Napi::Boolean::New(env, ret > 0);
}

Napi::Value AVOptionWrapper::Serialize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Missing required argument: object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int opt_flags = 0;
  int flags = 0;
  const char* key_val_sep = "=";
  const char* pairs_sep = ",";
  
  if (info.Length() >= 2 && info[1].IsNumber()) {
    opt_flags = info[1].As<Napi::Number>().Int32Value();
  }
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  if (info.Length() >= 4 && info[3].IsString()) {
    std::string sep = info[3].As<Napi::String>().Utf8Value();
    if (!sep.empty()) {
      key_val_sep = sep.c_str();
    }
  }
  
  if (info.Length() >= 5 && info[4].IsString()) {
    std::string sep = info[4].As<Napi::String>().Utf8Value();
    if (!sep.empty()) {
      pairs_sep = sep.c_str();
    }
  }
  
  char* buffer = nullptr;
  int ret = av_opt_serialize(obj, opt_flags, flags, &buffer, key_val_sep[0], pairs_sep[0]);
  
  if (ret < 0) {
    return env.Null();
  }
  
  if (!buffer) {
    return env.Null();
  }
  
  Napi::String result = Napi::String::New(env, buffer);
  av_free(buffer);
  
  return result;
}

Napi::Value AVOptionWrapper::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Missing required argument: object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  av_opt_free(obj);
  
  return env.Undefined();
}

Napi::Value AVOptionWrapper::Show(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Missing required argument: object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* obj = GetNativePointer(info[0]);
  if (!obj) {
    Napi::TypeError::New(env, "Invalid native object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int req_flags = 0;
  int rej_flags = 0;
  
  if (info.Length() >= 2 && info[1].IsNumber()) {
    req_flags = info[1].As<Napi::Number>().Int32Value();
  }
  
  if (info.Length() >= 3 && info[2].IsNumber()) {
    rej_flags = info[2].As<Napi::Number>().Int32Value();
  }
  
  // av_opt_show2 outputs to stderr by default
  // For now, we just call it to show the options in the console
  int ret = av_opt_show2(obj, stderr, req_flags, rej_flags);
  return Napi::Number::New(env, ret);
}

} // namespace ffmpeg