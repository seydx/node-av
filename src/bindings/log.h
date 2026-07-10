#ifndef FFMPEG_LOG_H
#define FFMPEG_LOG_H

#include <napi.h>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <atomic>

extern "C" {
#include <libavutil/log.h>
}

namespace ffmpeg {

class Log : public Napi::ObjectWrap<Log> {
public:
  static thread_local Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  Log(const Napi::CallbackInfo& info);
  ~Log();
  
private:
  static Napi::ThreadSafeFunction tsfn;
  static std::atomic<bool> callback_active;
  static std::atomic<int> callback_max_level;
  static std::queue<std::pair<int, std::string>> log_queue;
  static std::mutex queue_mutex;
  static std::condition_variable queue_cv;

  static Napi::Value SetLevel(const Napi::CallbackInfo& info);
  static Napi::Value GetLevel(const Napi::CallbackInfo& info);
  static Napi::Value SetCallback(const Napi::CallbackInfo& info);
  static Napi::Value ResetCallback(const Napi::CallbackInfo& info);
  static Napi::Value LogMessage(const Napi::CallbackInfo& info);
  
  // === Internal ===

  static void LogCallback(void* ptr, int level, const char* fmt, va_list vl);
};

} // namespace ffmpeg

#endif // FFMPEG_LOG_H