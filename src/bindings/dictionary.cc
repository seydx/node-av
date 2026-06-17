#include "dictionary.h"
#include "common.h"

namespace ffmpeg {

thread_local Napi::FunctionReference Dictionary::constructor;

Napi::Object Dictionary::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "Dictionary", {
    InstanceMethod<&Dictionary::Alloc>("alloc"),
    InstanceMethod<&Dictionary::Free>("free"),
    InstanceMethod<&Dictionary::Copy>("copy"),
    InstanceMethod<&Dictionary::Set>("set"),
    InstanceMethod<&Dictionary::Get>("get"),
    InstanceMethod<&Dictionary::Count>("count"),
    InstanceMethod<&Dictionary::GetAll>("getAll"),
    InstanceMethod<&Dictionary::ParseString>("parseString"),
    InstanceMethod<&Dictionary::GetString>("getString"),
    InstanceMethod<&Dictionary::Dispose>(Napi::Symbol::WellKnown(env, "dispose")),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("Dictionary", func);
  return exports;
}

Dictionary::Dictionary(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<Dictionary>(info) {
  // Constructor does nothing - user must explicitly call alloc() or set()
}

Dictionary::~Dictionary() {
  av_dict_free(&dict_);
}

Napi::Value Dictionary::Alloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // FFmpeg doesn't have explicit av_dict_alloc, it's implicit in av_dict_set
  // Free any existing dictionary first
  av_dict_free(&dict_);

  return env.Undefined();
}

Napi::Value Dictionary::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  av_dict_free(&dict_);
  return env.Undefined();
}

Napi::Value Dictionary::Copy(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Dictionary and flags required").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Get destination dictionary
  Napi::Object dstObj = info[0].As<Napi::Object>();
  Dictionary* dst = UnwrapNativeObject<Dictionary>(env, dstObj, "Dictionary");
  
  if (!dst) {
    Napi::TypeError::New(env, "Invalid dictionary object").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int flags = info[1].As<Napi::Number>().Int32Value();
  
  // Copy from this dictionary to destination
  // av_dict_copy merges the dictionaries, it doesn't replace
  int ret = av_dict_copy(&dst->dict_, dict_, flags);

  return Napi::Number::New(env, ret);
}

Napi::Value Dictionary::Set(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 3 || !info[0].IsString() || !info[1].IsString() || !info[2].IsNumber()) {
    Napi::TypeError::New(env, "Key (string), value (string), and flags (number) required").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string key = info[0].As<Napi::String>().Utf8Value();
  std::string value = info[1].As<Napi::String>().Utf8Value();
  int flags = info[2].As<Napi::Number>().Int32Value();
  
  // av_dict_set will allocate the dictionary if it's NULL
  int ret = av_dict_set(&dict_, key.c_str(), value.c_str(), flags);

  return Napi::Number::New(env, ret);
}

Napi::Value Dictionary::Get(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Key (string) and flags (number) required").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (!dict_) {
    return env.Null();
  }
  
  std::string key = info[0].As<Napi::String>().Utf8Value();
  int flags = info[1].As<Napi::Number>().Int32Value();
  
  // av_dict_get with NULL as prev to get first match
  AVDictionaryEntry* entry = av_dict_get(dict_, key.c_str(), nullptr, flags);
  
  if (!entry) {
    return env.Null();
  }
  
  return Napi::String::New(env, entry->value);
}

Napi::Value Dictionary::Count(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!dict_) {
    return Napi::Number::New(env, 0);
  }
  
  int count = av_dict_count(dict_);
  return Napi::Number::New(env, count);
}

Napi::Value Dictionary::GetAll(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Object result = Napi::Object::New(env);
  
  if (!dict_) {
    return result;
  }
  
  AVDictionaryEntry* entry = nullptr;
  while ((entry = av_dict_get(dict_, "", entry, AV_DICT_IGNORE_SUFFIX))) {
    result.Set(entry->key, Napi::String::New(env, entry->value));
  }
  
  return result;
}

Napi::Value Dictionary::ParseString(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 4 || !info[0].IsString() || !info[1].IsString() || 
      !info[2].IsString() || !info[3].IsNumber()) {
    Napi::TypeError::New(env, "String, keyValSep (string), pairsSep (string), and flags (number) required")
      .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  std::string str = info[0].As<Napi::String>().Utf8Value();
  std::string keyValSep = info[1].As<Napi::String>().Utf8Value();
  std::string pairsSep = info[2].As<Napi::String>().Utf8Value();
  int flags = info[3].As<Napi::Number>().Int32Value();
  
  // Free old dictionary if exists
  av_dict_free(&dict_);

  int ret = av_dict_parse_string(&dict_, str.c_str(), keyValSep.c_str(), pairsSep.c_str(), flags);

  return Napi::Number::New(env, ret);
}

Napi::Value Dictionary::GetString(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "keyValSep (string) and pairsSep (string) required")
      .ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (!dict_) {
    return Napi::String::New(env, "");
  }
  
  std::string keyValSep = info[0].As<Napi::String>().Utf8Value();
  std::string pairsSep = info[1].As<Napi::String>().Utf8Value();
  
  if (keyValSep.length() != 1 || pairsSep.length() != 1) {
    Napi::TypeError::New(env, "Separators must be single characters").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  char* buffer = nullptr;
  int ret = av_dict_get_string(dict_, &buffer, keyValSep[0], pairsSep[0]);
  
  if (ret < 0 || !buffer) {
    return env.Null();
  }
  
  Napi::String result = Napi::String::New(env, buffer);
  av_free(buffer);
  
  return result;
}

Napi::Value Dictionary::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}

} // namespace ffmpeg