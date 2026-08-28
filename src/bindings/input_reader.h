#ifndef FFMPEG_INPUT_READER_H
#define FFMPEG_INPUT_READER_H

#include <napi.h>
#include <atomic>
#include <condition_variable>
#include <cstddef>
#include <deque>
#include <functional>
#include <mutex>
#include <optional>
#include <thread>
#include <vector>

extern "C" {
#include <libavformat/avformat.h>
}

namespace ffmpeg {

class FormatContext;
class Packet;

// One owner thread per input context, modelled on the ffmpeg CLI's demuxer
// thread: once reading has started it is the only thread that touches the
// AVFormatContext. av_read_frame() blocks here instead of on the libuv
// threadpool, packets reach JS through a bounded queue, and everything else
// that must run on the context (seek, backchannel writes, stream info) is a
// command executed between two reads.
class InputReader {
public:
  using Command = std::function<int()>;

  // Main thread; starts the owner thread right away.
  InputReader(Napi::Env env, FormatContext* owner);
  ~InputReader();

  // Main thread. Resolves with the av_read_frame() result once a packet has
  // been moved into `packet`.
  Napi::Promise ReadFrame(Napi::Env env, std::vector<Napi::Object> pins, Packet* packet);

  // Main thread. Runs `command` on the owner thread after the current read
  // returns; with `flushQueue` the buffered packets are dropped first (seek).
  Napi::Promise RunCommand(Napi::Env env, std::vector<Napi::Object> pins, Command command, bool flushQueue);

  // Wakes the owner thread so it notices the owner's interrupt flag.
  void Interrupt();

  // Stops and joins the owner thread; pending reads and commands settle with
  // AVERROR_EXIT. Any thread except the owner thread. The object frees itself
  // once the last completion has reached JS, so drop the pointer afterwards.
  void Stop();

private:
  struct Completion {
    std::optional<Napi::Promise::Deferred> deferred;
    std::vector<Napi::ObjectReference> pins;
    Packet* packet = nullptr;
    AVPacket* delivered = nullptr;
    int result = 0;
    bool release = false;
  };

  struct PendingCommand {
    Completion* completion;
    Command command;
    bool flushQueue;
  };

  static void CallJs(Napi::Env env, Napi::Function jsCallback, InputReader* reader, Completion* completion);
  static void Finalize(Napi::Env env, void* data, InputReader* reader);

  using ThreadSafeFunction = Napi::TypedThreadSafeFunction<InputReader, Completion, &InputReader::CallJs>;

  static constexpr size_t kMaxQueuedPackets = 16;
  static constexpr size_t kMaxQueuedBytes = 8 * 1024 * 1024;

  void Run();
  void FlushQueueLocked();
  bool QueueFullLocked() const;
  Completion* NewCompletion(Napi::Env env, std::vector<Napi::Object> pins);
  void Complete(Completion* completion, int result);
  void Deliver(Napi::Env env, Completion* completion, int result);
  void Discard(Completion* completion);
  void Track(Napi::Env env);
  void Untrack(Napi::Env env);

  FormatContext* owner_;
  ThreadSafeFunction tsfn_;
  std::thread thread_;

  std::mutex mutex_;
  std::condition_variable cv_;
  std::deque<AVPacket*> packets_;
  size_t queuedBytes_ = 0;
  int terminal_ = 0;
  bool stop_ = false;
  std::deque<Completion*> pendingReads_;
  std::deque<PendingCommand> commands_;

  // main thread only: completions handed out but not yet delivered; the TSFN
  // stays ref'd (event loop alive) while this is non-zero
  int outstanding_ = 0;
};

} // namespace ffmpeg

#endif // FFMPEG_INPUT_READER_H
