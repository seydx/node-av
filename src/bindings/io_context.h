#ifndef FFMPEG_IO_CONTEXT_H
#define FFMPEG_IO_CONTEXT_H

#include <napi.h>
#include <memory>
#include <atomic>
#include <thread>
#include "common.h"
#include "promise_worker.h"

extern "C" {
#include <libavformat/avio.h>
#include <libavutil/mem.h>
}

namespace ffmpeg {

class FormatContext;

// Exit state ending callback round-trips: one per JS environment (main thread
// or worker), shared by the callback-backed IOContexts created in it, and one
// per IOContext for its own callbacks (see CallbackData::abort_state)
struct IOExitState {
  std::atomic<bool> exiting{false};
};

// State of one callback's ThreadSafeFunction, shared by the threads calling it
// and its finalizer
struct IOCallbackState {
  // Set by the finalizer (our Release, or env teardown closing it). Releasing
  // a finalized TSFN deadlocks on its lock or touches freed memory.
  std::atomic<bool> finalized{false};
  // Set once a call failed: a call on a closing TSFN consumes our thread
  // count, after which Node may free it, so it must not be called again
  std::atomic<bool> closed{false};
};

class IOContext : public Napi::ObjectWrap<IOContext> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  IOContext(const Napi::CallbackInfo& info);
  ~IOContext();

  AVIOContext* Get() { return ctx_; }

  Napi::Value FreeContext(const Napi::CallbackInfo& info);
  Napi::Value ClosepAsync(const Napi::CallbackInfo& info);
  Napi::Value ClosepSync(const Napi::CallbackInfo& info);
  Napi::Value ReadAsync(const Napi::CallbackInfo& info);
  Napi::Value ReadSync(const Napi::CallbackInfo& info);
  Napi::Value WriteAsync(const Napi::CallbackInfo& info);
  Napi::Value WriteSync(const Napi::CallbackInfo& info);
  Napi::Value SeekAsync(const Napi::CallbackInfo& info);
  Napi::Value SeekSync(const Napi::CallbackInfo& info);
  Napi::Value SizeAsync(const Napi::CallbackInfo& info);
  Napi::Value SizeSync(const Napi::CallbackInfo& info);
  Napi::Value FlushAsync(const Napi::CallbackInfo& info);
  Napi::Value FlushSync(const Napi::CallbackInfo& info);
  Napi::Value SkipAsync(const Napi::CallbackInfo& info);
  Napi::Value SkipSync(const Napi::CallbackInfo& info);
  Napi::Value Tell(const Napi::CallbackInfo& info);
  
  Napi::Value GetEof(const Napi::CallbackInfo& info);

  Napi::Value GetError(const Napi::CallbackInfo& info);

  Napi::Value GetSeekable(const Napi::CallbackInfo& info);

  Napi::Value GetMaxPacketSize(const Napi::CallbackInfo& info);
  void SetMaxPacketSize(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetDirect(const Napi::CallbackInfo& info);
  void SetDirect(const Napi::CallbackInfo& info, const Napi::Value& value);

  Napi::Value GetPos(const Napi::CallbackInfo& info);

  Napi::Value GetBufferSize(const Napi::CallbackInfo& info);

  Napi::Value GetWriteFlag(const Napi::CallbackInfo& info);
  
  // Static members  
  static thread_local Napi::FunctionReference constructor;

private:
  friend class AVOptionWrapper;
  friend class FormatContext;
  friend class InputFormatProbeBufferWorker;
  friend class IOClosepWorker;

  AVIOContext* ctx_ = nullptr;
  AsyncOpCounter async_ops_;

  // The FormatContext using ctx_ as its pb (see FormatContext::pb_io_)
  FormatContext* pb_of_ = nullptr;

  // Before ctx_ is closed or freed here: clears the pb of the FormatContext
  // using it, as avio_closep(&ofmt->pb) does in C; false with a pending
  // exception while that context still reads or writes through it
  bool DetachFromFormat(Napi::Env env);
  // Custom I/O callback support
  struct CallbackData {
    IOContext* io_context;
    napi_env env = nullptr;  // Store env for direct calls (synchronous operations)
    std::thread::id main_thread_id;  // Thread ID where callbacks were registered
    Napi::ThreadSafeFunction read_callback;
    Napi::ThreadSafeFunction write_callback;
    Napi::ThreadSafeFunction seek_callback;
    Napi::FunctionReference read_callback_direct;   // For direct synchronous calls
    Napi::FunctionReference write_callback_direct;  // For direct synchronous calls
    Napi::FunctionReference seek_callback_direct;   // For direct synchronous calls
    bool has_read_callback = false;
    bool has_write_callback = false;
    bool has_seek_callback = false;
    void* opaque_data;  // User data passed to callbacks
    std::atomic<bool> active{false};
    // Exit state of the env the callbacks belong to: once set (or once the
    // process exits) threadpool round-trips fail with AVERROR_EXIT
    std::shared_ptr<IOExitState> exit_state;
    // Exit state of this context alone, set once the input reading through it
    // is closed or interrupted, or once the callbacks are released: from then
    // on every callback fails with AVERROR_EXIT, pending threadpool round-trips
    // included. A read waiting for a source that stalls for good would
    // otherwise keep the input's close waiting with it. Outlives this struct.
    std::shared_ptr<IOExitState> abort_state = std::make_shared<IOExitState>();
    // Per-TSFN state, outlives this struct. Env teardown finalizes the TSFNs
    // before this context's own finalizer runs, possibly while still holding
    // the TSFN's mutex, so CleanupCallbacks() must not release them then.
    std::shared_ptr<IOCallbackState> read_state = std::make_shared<IOCallbackState>();
    std::shared_ptr<IOCallbackState> write_state = std::make_shared<IOCallbackState>();
    std::shared_ptr<IOCallbackState> seek_state = std::make_shared<IOCallbackState>();
  };

  std::unique_ptr<CallbackData> callback_data_;

  // Exit state of the environment running on this thread, renewed per module
  // load (one env per thread, like the thread_local constructors)
  static thread_local std::shared_ptr<IOExitState> exit_state_;

  // Helper to clean up callbacks
  void CleanupCallbacks(bool keep_allocated = false);

  // Callback-aware async-op guard for free/close/replace paths
  bool GuardOps(Napi::Env env);
  
  // Static callback functions for FFmpeg
  static int ReadPacket(void* opaque, uint8_t* buf, int buf_size);
  static int WritePacket(void* opaque, const uint8_t* buf, int buf_size);
  static int64_t Seek(void* opaque, int64_t offset, int whence);

  // False once the callbacks' env or the whole process exits, or once the
  // TSFN behind `state` is finalized or closed: a round-trip would never return
  static bool CanRoundTrip(const CallbackData* data, const IOCallbackState& state);

  // Fails the pending and later callbacks of the context owning `state` (its
  // abort_state) with AVERROR_EXIT; for FormatContext's input close paths
  static void AbortCallbacks(const std::shared_ptr<IOExitState>& state);

  // Called from the env's 'exit' event: fails pending and future threadpool
  // round-trips of this env (of every env when the main thread exits)
  static Napi::Value MarkExiting(const Napi::CallbackInfo& info);

  // True once the main thread's 'exit' event ran: process.exit() joins the
  // threadpool next, so FFmpeg I/O blocked there on a stalled peer must unwind
  static bool ProcessExiting();

  // AVIO interrupt callback for contexts no one else can interrupt: fires only
  // once the process exits
  static int ExitInterruptCallback(void* opaque);

  Napi::Value AllocContext(const Napi::CallbackInfo& info);
  Napi::Value AllocContextWithCallbacks(const Napi::CallbackInfo& info);
  Napi::Value Open2Async(const Napi::CallbackInfo& info);
  Napi::Value Open2Sync(const Napi::CallbackInfo& info);
  Napi::Value AsyncDispose(const Napi::CallbackInfo& info);
  Napi::Value SyncDispose(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_IO_CONTEXT_H