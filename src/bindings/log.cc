#include "log.h"
#include <thread>
#include <chrono>
#include <atomic>

namespace ffmpeg {

// Static member definitions
thread_local Napi::FunctionReference Log::constructor;
Napi::ThreadSafeFunction Log::tsfn = nullptr;
std::atomic<bool> Log::callback_active(false);
std::atomic<int> Log::callback_max_level(AV_LOG_INFO);
std::queue<std::pair<int, std::string>> Log::log_queue;
std::mutex Log::queue_mutex;
std::condition_variable Log::queue_cv;

Napi::Object Log::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "Log", {
    StaticMethod<&Log::SetLevel>("setLevel"),
    StaticMethod<&Log::GetLevel>("getLevel"),
    StaticMethod<&Log::SetCallback>("setCallback"),
    StaticMethod<&Log::ResetCallback>("resetCallback"),
    StaticMethod<&Log::LogMessage>("log"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("Log", func);
  return exports;
}

Log::Log(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<Log>(info) {
  // This class should not be instantiated
  Napi::Error::New(info.Env(), "Log class cannot be instantiated").ThrowAsJavaScriptException();
}

Log::~Log() {
  // Nothing to clean up
}

Napi::Value Log::SetLevel(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected number (log level)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int level = info[0].As<Napi::Number>().Int32Value();
  av_log_set_level(level);
  
  return env.Undefined();
}

Napi::Value Log::GetLevel(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, av_log_get_level());
}

Napi::Value Log::SetCallback(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected callback function and optional options").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // First argument must be a function or null
  if (!info[0].IsFunction() && !info[0].IsNull() && !info[0].IsUndefined()) {
    Napi::TypeError::New(env, "First argument must be a function or null").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Reset FFmpeg callback FIRST to prevent new calls
  av_log_set_callback(av_log_default_callback);

  // Clean up existing callback if any
  if (callback_active.load()) {
    // Stop our callback from processing
    callback_active.store(false);
    queue_cv.notify_all();  // Wake up worker thread

    if (tsfn) {
      // Always use Release (not Abort) to allow graceful shutdown
      tsfn.Release();
      tsfn = nullptr;
    }

    // Clear queue
    {
      std::lock_guard<std::mutex> lock(queue_mutex);
      std::queue<std::pair<int, std::string>> empty;
      log_queue.swap(empty);
    }
  }

  // Reset if null/undefined
  if (info[0].IsNull() || info[0].IsUndefined()) {
    return env.Undefined();
  }
  
  // Parse options if provided
  int maxLevel = AV_LOG_INFO;
  if (info.Length() >= 2 && info[1].IsObject()) {
    Napi::Object options = info[1].As<Napi::Object>();
    
    // maxLevel option
    if (options.Has("maxLevel")) {
      Napi::Value maxLevelVal = options.Get("maxLevel");
      if (maxLevelVal.IsNumber()) {
        maxLevel = maxLevelVal.As<Napi::Number>().Int32Value();
      }
    }
  }
  
  callback_max_level.store(maxLevel);
  
  // Create ThreadSafeFunction for non-blocking callback
  tsfn = Napi::ThreadSafeFunction::New(
    env,
    info[0].As<Napi::Function>(),  // JavaScript function
    "FFmpegLogCallback",            // Resource name
    0,                              // Unlimited queue
    1,                              // Only one thread
    [](Napi::Env) {                // Finalizer - called when TSFN is destroyed
      // Cleanup complete
    }
  );

  // Unref the TSFN so it doesn't keep the event loop alive
  tsfn.Unref(env);

  callback_active.store(true);
  
  // Set our C callback
  av_log_set_callback(LogCallback);
  
  return env.Undefined();
}

Napi::Value Log::LogMessage(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments (level, message)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (!info[0].IsNumber()) {
    Napi::TypeError::New(env, "Level must be a number").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (!info[1].IsString()) {
    Napi::TypeError::New(env, "Message must be a string").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  int level = info[0].As<Napi::Number>().Int32Value();
  std::string message = info[1].As<Napi::String>().Utf8Value();
  
  // Call av_log with the message
  av_log(nullptr, level, "%s", message.c_str());
  
  return env.Undefined();
}

Napi::Value Log::ResetCallback(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Reset FFmpeg callback FIRST to prevent new calls
  av_log_set_callback(av_log_default_callback);

  // Stop our callback from processing
  callback_active.store(false);
  queue_cv.notify_all();

  if (tsfn) {
    // Always use Release for graceful shutdown
    tsfn.Release();
    tsfn = nullptr;
  }

  {
    std::lock_guard<std::mutex> lock(queue_mutex);
    std::queue<std::pair<int, std::string>> empty;
    log_queue.swap(empty);
  }

  return env.Undefined();
}

// === Internal ===

void Log::LogCallback(void* ptr, int level, const char* fmt, va_list vl) {
  // Early exit if not active or level filtered
  if (!callback_active.load() || level > callback_max_level.load()) {
    return;
  }
  
  // Format the message
  char buffer[4096];
  vsnprintf(buffer, sizeof(buffer), fmt, vl);
  
  // Remove trailing newline if present
  size_t len = strlen(buffer);
  if (len > 0 && buffer[len - 1] == '\n') {
    buffer[len - 1] = '\0';
  }
  
  // Create message pair
  auto message = std::make_pair(level, std::string(buffer));
  
  // Non-blocking send to JavaScript
  if (tsfn) {
    // Use ThreadSafeFunction to call JavaScript callback
    // This is non-blocking and thread-safe
    auto* data = new std::pair<int, std::string>(std::move(message));
    
    napi_status status = tsfn.NonBlockingCall(data, [](Napi::Env env, Napi::Function jsCallback, std::pair<int, std::string>* data) {
      if (data != nullptr) {
        jsCallback.Call({
          Napi::Number::New(env, data->first),
          Napi::String::New(env, data->second)
        });
        delete data;
      }
    });
    
    // If the queue is full (which shouldn't happen with unlimited queue),
    // we just drop the message rather than blocking
    if (status != napi_ok && data != nullptr) {
      delete data;
    }
  }
}

} // namespace ffmpeg