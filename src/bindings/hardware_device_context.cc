#include "hardware_device_context.h"
#include "dictionary.h"
#include "error.h"
#include "common.h"
#include <sstream>

namespace ffmpeg {

thread_local Napi::FunctionReference HardwareDeviceContext::constructor;

Napi::Object HardwareDeviceContext::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "HardwareDeviceContext", {
    StaticMethod<&HardwareDeviceContext::GetTypeName>("getTypeName"),
    StaticMethod<&HardwareDeviceContext::IterateTypes>("iterateTypes"),
    StaticMethod<&HardwareDeviceContext::FindTypeByName>("findTypeByName"),

    InstanceMethod<&HardwareDeviceContext::Alloc>("alloc"),
    InstanceMethod<&HardwareDeviceContext::Init>("init"),
    InstanceMethod<&HardwareDeviceContext::Create>("create"),
    InstanceMethod<&HardwareDeviceContext::CreateDerived>("createDerived"),
    InstanceMethod<&HardwareDeviceContext::HwconfigAlloc>("hwconfigAlloc"),
    InstanceMethod<&HardwareDeviceContext::GetHwframeConstraints>("getHwframeConstraints"),
    InstanceMethod<&HardwareDeviceContext::Free>("free"),
    InstanceMethod(Napi::Symbol::WellKnown(env, "dispose"), &HardwareDeviceContext::Dispose),

    InstanceAccessor("type", &HardwareDeviceContext::GetType, nullptr),
    InstanceAccessor("hwctx", &HardwareDeviceContext::GetHwctx, nullptr),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("HardwareDeviceContext", func);
  return exports;
}

HardwareDeviceContext::HardwareDeviceContext(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<HardwareDeviceContext>(info) {
  // Constructor does nothing - user must call alloc() or create()
}

HardwareDeviceContext::~HardwareDeviceContext() {
  av_buffer_unref(&device_ref_);
}

Napi::Value HardwareDeviceContext::Wrap(Napi::Env env, AVBufferRef* device_ref) {
  if (!device_ref) {
    return env.Null();
  }

  // Take our own reference on the context: the owner (frame/codec/frames
  // context) can drop its ref at any time, and a borrowed pointer would leave
  // the wrapper dereferencing freed memory. The destructor/free() unref
  // exactly this ref.
  AVBufferRef* ref = av_buffer_ref(device_ref);
  if (!ref) {
    Napi::Error::New(env, "Failed to reference hardware device context (ENOMEM)").ThrowAsJavaScriptException();
    return env.Null();
  }

  Napi::Object obj = constructor.New({});
  HardwareDeviceContext* ctx = Napi::ObjectWrap<HardwareDeviceContext>::Unwrap(obj);
  ctx->SetOwned(ref);
  return obj;
}

Napi::Value HardwareDeviceContext::GetTypeName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected number (AVHWDeviceType)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  enum AVHWDeviceType type = static_cast<AVHWDeviceType>(info[0].As<Napi::Number>().Int32Value());
  const char* name = av_hwdevice_get_type_name(type);
  
  if (!name) {
    return env.Null();
  }
  
  return Napi::String::New(env, name);
}

Napi::Value HardwareDeviceContext::IterateTypes(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  Napi::Array types = Napi::Array::New(env);
  uint32_t index = 0;
  
  enum AVHWDeviceType type = AV_HWDEVICE_TYPE_NONE;
  while ((type = av_hwdevice_iterate_types(type)) != AV_HWDEVICE_TYPE_NONE) {
    types[index++] = Napi::Number::New(env, type);
  }
  
  return types;
}

Napi::Value HardwareDeviceContext::FindTypeByName(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string (device name)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string name = info[0].As<Napi::String>().Utf8Value();
  enum AVHWDeviceType type = av_hwdevice_find_type_by_name(name.c_str());
  
  return Napi::Number::New(env, type);
}

Napi::Value HardwareDeviceContext::Alloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected number (AVHWDeviceType)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (Get()) {
    Napi::Error::New(env, "Device context already allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  enum AVHWDeviceType type = static_cast<AVHWDeviceType>(info[0].As<Napi::Number>().Int32Value());
  
  AVBufferRef* new_ref = av_hwdevice_ctx_alloc(type);
  if (!new_ref) {
    Napi::Error::New(env, "Failed to allocate hardware device context").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  av_buffer_unref(&device_ref_);
  device_ref_ = new_ref;
  return env.Undefined();
}

Napi::Value HardwareDeviceContext::Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVBufferRef* ref = Get();
  if (!ref) {
    Napi::Error::New(env, "Device context not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int ret = av_hwdevice_ctx_init(ref);
  return Napi::Number::New(env, ret);
}

Napi::Value HardwareDeviceContext::Create(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected (type: number, device: string | null, options: Dictionary | null)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  enum AVHWDeviceType type = static_cast<AVHWDeviceType>(info[0].As<Napi::Number>().Int32Value());
  
  const char* device = nullptr;
  std::string device_str;
  if (info.Length() > 1 && !info[1].IsNull() && !info[1].IsUndefined()) {
    if (!info[1].IsString()) {
      Napi::TypeError::New(env, "Device must be string or null")
          .ThrowAsJavaScriptException();
      return env.Undefined();
    }
    device_str = info[1].As<Napi::String>().Utf8Value();
    device = device_str.c_str();
  }
  
  AVDictionary* opts = nullptr;
  
  if (info.Length() > 2 && !info[2].IsNull() && !info[2].IsUndefined()) {
    Dictionary* dict = UnwrapNativeObject<Dictionary>(env, info[2], "Dictionary");
    if (!dict) {
      // Bail out before the existing context is unref'd below
      Napi::TypeError::New(env, "Invalid Dictionary object").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    if (dict->Get()) {
      av_dict_copy(&opts, dict->Get(), 0);
    }
  }
  
  // Free existing context if any
  av_buffer_unref(&device_ref_);

  AVBufferRef* new_ref = nullptr;
  int ret = av_hwdevice_ctx_create(&new_ref, type, device, opts, 0);

  if (opts) {
    av_dict_free(&opts);
  }

  if (ret >= 0 && new_ref) {
    device_ref_ = new_ref;
  }

  return Napi::Number::New(env, ret);
}

Napi::Value HardwareDeviceContext::CreateDerived(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Expected (sourceDevice: HardwareDeviceContext, type: number)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  HardwareDeviceContext* src = UnwrapNativeObject<HardwareDeviceContext>(env, info[0], "HardwareDeviceContext");
  if (!src || !src->Get()) {
    Napi::Error::New(env, "Invalid source device context").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  enum AVHWDeviceType type = static_cast<AVHWDeviceType>(info[1].As<Napi::Number>().Int32Value());

  // Free existing context if any
  av_buffer_unref(&device_ref_);

  AVBufferRef* new_ref = nullptr;
  int ret = av_hwdevice_ctx_create_derived(&new_ref, type, src->Get(), 0);

  if (ret >= 0 && new_ref) {
    device_ref_ = new_ref;
  }

  return Napi::Number::New(env, ret);
}

Napi::Value HardwareDeviceContext::HwconfigAlloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVBufferRef* ref = Get();
  if (!ref) {
    Napi::Error::New(env, "Device context not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* hwconfig = av_hwdevice_hwconfig_alloc(ref);
  if (!hwconfig) {
    return env.Null();
  }
  
  // Return as BigInt pointer for advanced users
  return Napi::BigInt::New(env, reinterpret_cast<uint64_t>(hwconfig));
}

Napi::Value HardwareDeviceContext::GetHwframeConstraints(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVBufferRef* ref = Get();
  if (!ref) {
    Napi::Error::New(env, "Device context not allocated").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  void* hwconfig = nullptr;
  if (info.Length() > 0 && info[0].IsBigInt()) {
    bool lossless;
    hwconfig = reinterpret_cast<void*>(info[0].As<Napi::BigInt>().Uint64Value(&lossless));
  }
  
  AVHWFramesConstraints* constraints = av_hwdevice_get_hwframe_constraints(ref, hwconfig);
  if (!constraints) {
    return env.Null();
  }
  
  // Create object with constraints info
  Napi::Object obj = Napi::Object::New(env);
  
  // Valid pixel formats
  if (constraints->valid_hw_formats) {
    Napi::Array formats = Napi::Array::New(env);
    uint32_t index = 0;
    for (int i = 0; constraints->valid_hw_formats[i] != AV_PIX_FMT_NONE; i++) {
      formats[index++] = Napi::Number::New(env, constraints->valid_hw_formats[i]);
    }
    obj.Set("validHwFormats", formats);
  }
  
  if (constraints->valid_sw_formats) {
    Napi::Array formats = Napi::Array::New(env);
    uint32_t index = 0;
    for (int i = 0; constraints->valid_sw_formats[i] != AV_PIX_FMT_NONE; i++) {
      formats[index++] = Napi::Number::New(env, constraints->valid_sw_formats[i]);
    }
    obj.Set("validSwFormats", formats);
  }
  
  obj.Set("minWidth", Napi::Number::New(env, constraints->min_width));
  obj.Set("minHeight", Napi::Number::New(env, constraints->min_height));
  obj.Set("maxWidth", Napi::Number::New(env, constraints->max_width));
  obj.Set("maxHeight", Napi::Number::New(env, constraints->max_height));
  
  av_hwframe_constraints_free(&constraints);
  
  return obj;
}

Napi::Value HardwareDeviceContext::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  av_buffer_unref(&device_ref_);

  return env.Undefined();
}

Napi::Value HardwareDeviceContext::GetType(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVBufferRef* ref = Get();
  if (!ref || !ref->data) {
    return env.Undefined();
  }
  
  AVHWDeviceContext* ctx = reinterpret_cast<AVHWDeviceContext*>(ref->data);
  return Napi::Number::New(env, ctx->type);
}

Napi::Value HardwareDeviceContext::GetHwctx(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  AVBufferRef* ref = Get();
  if (!ref || !ref->data) {
    return env.Null();
  }
  
  AVHWDeviceContext* ctx = reinterpret_cast<AVHWDeviceContext*>(ref->data);
  return Napi::BigInt::New(env, reinterpret_cast<uint64_t>(ctx->hwctx));
}

Napi::Value HardwareDeviceContext::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}

} // namespace ffmpeg