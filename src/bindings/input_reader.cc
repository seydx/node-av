#include "input_reader.h"
#include "format_context.h"
#include "packet.h"
#include "common.h"

#include <chrono>
#include <utility>

#ifdef _WIN32
#include <windows.h>
#else
#include <pthread.h>
#endif

extern "C" {
#include <libavutil/error.h>
}

namespace ffmpeg {

InputReader::InputReader(Napi::Env env, FormatContext* owner) : owner_(owner) {
  tsfn_ = ThreadSafeFunction::New(env, "InputReader", 0, 1, this, Finalize, static_cast<void*>(nullptr));
  // an idle reader must not keep the process alive; Track() refs it while a
  // read or command is outstanding
  tsfn_.Unref(env);
  thread_ = std::thread([this]() { Run(); });
}

InputReader::~InputReader() {
  // only reachable through Finalize() before Stop() ran (env teardown with a
  // live reader): end the thread here so std::thread does not terminate()
  if (thread_.joinable()) {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      stop_ = true;
    }
    cv_.notify_all();
    owner_->RequestInterrupt();
    thread_.join();
  }
  std::lock_guard<std::mutex> lock(mutex_);
  FlushQueueLocked();
  for (Completion* completion : pendingReads_) {
    Discard(completion);
  }
  for (PendingCommand& pending : commands_) {
    Discard(pending.completion);
  }
}

Napi::Promise InputReader::ReadFrame(Napi::Env env, std::vector<Napi::Object> pins, Packet* packet) {
  Completion* completion = NewCompletion(env, std::move(pins));
  completion->packet = packet;
  Napi::Promise promise = completion->deferred->Promise();

  std::unique_lock<std::mutex> lock(mutex_);
  if (!packets_.empty()) {
    AVPacket* queued = packets_.front();
    packets_.pop_front();
    queuedBytes_ -= static_cast<size_t>(queued->size);
    lock.unlock();
    cv_.notify_all();
    completion->delivered = queued;
    Deliver(env, completion, 0);
    return promise;
  }

  if (stop_ || terminal_ != 0) {
    int result = stop_ ? AVERROR_EXIT : terminal_;
    lock.unlock();
    Deliver(env, completion, result);
    return promise;
  }

  pendingReads_.push_back(completion);
  lock.unlock();
  Track(env);
  return promise;
}

Napi::Promise InputReader::RunCommand(Napi::Env env, std::vector<Napi::Object> pins, Command command, bool flushQueue) {
  Completion* completion = NewCompletion(env, std::move(pins));
  Napi::Promise promise = completion->deferred->Promise();

  std::unique_lock<std::mutex> lock(mutex_);
  if (stop_) {
    lock.unlock();
    Deliver(env, completion, AVERROR_EXIT);
    return promise;
  }
  commands_.push_back({completion, std::move(command), flushQueue});
  lock.unlock();
  cv_.notify_all();
  Track(env);
  return promise;
}

void InputReader::Interrupt() {
  cv_.notify_all();
}

void InputReader::Stop() {
  {
    std::lock_guard<std::mutex> lock(mutex_);
    stop_ = true;
  }
  cv_.notify_all();
  // unblocks a read parked in FFmpeg I/O (checked every POLLING_TIME)
  owner_->RequestInterrupt();
  if (thread_.joinable()) {
    thread_.join();
  }

  std::deque<Completion*> reads;
  std::deque<PendingCommand> commands;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    reads.swap(pendingReads_);
    commands.swap(commands_);
    FlushQueueLocked();
  }
  for (Completion* completion : reads) {
    Complete(completion, AVERROR_EXIT);
  }
  for (PendingCommand& pending : commands) {
    Complete(pending.completion, AVERROR_EXIT);
  }

  // the marker releases the TSFN on the main thread, after every completion
  // queued above has been delivered and unref'd there - releasing from this
  // thread could race a main-thread Unref()
  auto* marker = new Completion();
  marker->release = true;
  if (tsfn_.NonBlockingCall(marker) != napi_ok) {
    delete marker;
    tsfn_.Release();
  }
}

// visible in thread dumps (wchan snapshots) next to the libuv pool threads
static void SetThreadName() {
#if defined(__APPLE__)
  pthread_setname_np("av-reader");
#elif defined(__linux__)
  pthread_setname_np(pthread_self(), "av-reader");
#elif defined(_WIN32)
  SetThreadDescription(GetCurrentThread(), L"av-reader");
#endif
}

void InputReader::Run() {
  SetThreadName();
  AVPacket* pkt = av_packet_alloc();
  std::unique_lock<std::mutex> lock(mutex_);

  for (;;) {
    while (!commands_.empty()) {
      PendingCommand pending = std::move(commands_.front());
      commands_.pop_front();
      if (pending.flushQueue) {
        FlushQueueLocked();
        terminal_ = 0;
      }
      lock.unlock();
      int result = pending.command();
      Complete(pending.completion, result);
      lock.lock();
    }

    if (stop_) {
      break;
    }

    if (terminal_ != 0 || QueueFullLocked()) {
      cv_.wait(lock);
      continue;
    }

    lock.unlock();
    // the interrupt callback only fires inside blocking I/O; buffered packets
    // would otherwise keep flowing after interrupt()
    int result = owner_->interrupt_requested_.load() ? AVERROR_EXIT : av_read_frame(owner_->ctx_, pkt);
    lock.lock();

    if (result == AVERROR(EAGAIN)) {
      // ffmpeg CLI: av_usleep(10000) between polls of a source without data
      cv_.wait_for(lock, std::chrono::milliseconds(10));
      continue;
    }

    if (result < 0) {
      terminal_ = result;
      std::deque<Completion*> reads;
      reads.swap(pendingReads_);
      lock.unlock();
      for (Completion* completion : reads) {
        Complete(completion, result);
      }
      lock.lock();
      continue;
    }

    AVPacket* slot = av_packet_alloc();
    av_packet_move_ref(slot, pkt);

    if (!pendingReads_.empty()) {
      Completion* completion = pendingReads_.front();
      pendingReads_.pop_front();
      completion->delivered = slot;
      lock.unlock();
      Complete(completion, 0);
      lock.lock();
      continue;
    }

    queuedBytes_ += static_cast<size_t>(slot->size);
    packets_.push_back(slot);
  }

  lock.unlock();
  av_packet_free(&pkt);
}

void InputReader::FlushQueueLocked() {
  for (AVPacket* queued : packets_) {
    av_packet_free(&queued);
  }
  packets_.clear();
  queuedBytes_ = 0;
}

bool InputReader::QueueFullLocked() const {
  return packets_.size() >= kMaxQueuedPackets || queuedBytes_ >= kMaxQueuedBytes;
}

InputReader::Completion* InputReader::NewCompletion(Napi::Env env, std::vector<Napi::Object> pins) {
  auto* completion = new Completion();
  completion->deferred.emplace(Napi::Promise::Deferred::New(env));
  completion->pins.reserve(pins.size());
  for (Napi::Object& obj : pins) {
    completion->pins.emplace_back();
    completion->pins.back().Reset(obj, 1);
  }
  return completion;
}

// owner or closing thread: hand the completion to the main thread
void InputReader::Complete(Completion* completion, int result) {
  completion->result = result;
  if (tsfn_.NonBlockingCall(completion) != napi_ok) {
    Discard(completion);
  }
}

// main thread: move the packet, settle the promise, drop the pins
void InputReader::Deliver(Napi::Env env, Completion* completion, int result) {
  if (completion->delivered) {
    AVPacket* target = completion->packet ? completion->packet->Get() : nullptr;
    if (target && result >= 0) {
      av_packet_unref(target);
      av_packet_move_ref(target, completion->delivered);
      completion->packet->SyncExternalMemory(env);
    }
    av_packet_free(&completion->delivered);
  }
  if (CanCallIntoJs(env)) {
    completion->deferred->Resolve(Napi::Number::New(env, result));
  }
  delete completion;
}

// off the main thread: JS is unreachable, free without touching V8
void InputReader::Discard(Completion* completion) {
  if (completion->delivered) {
    av_packet_free(&completion->delivered);
  }
  for (Napi::ObjectReference& ref : completion->pins) {
    ref.SuppressDestruct();
  }
  delete completion;
}

void InputReader::Track(Napi::Env env) {
  if (outstanding_++ == 0) {
    tsfn_.Ref(env);
  }
}

void InputReader::Untrack(Napi::Env env) {
  if (--outstanding_ == 0) {
    tsfn_.Unref(env);
  }
}

void InputReader::CallJs(Napi::Env env, Napi::Function, InputReader* reader, Completion* completion) {
  if (env == nullptr) {
    // env torn down: the finalizer takes care of the reader itself
    reader->Discard(completion);
    return;
  }
  if (completion->release) {
    delete completion;
    reader->tsfn_.Release();
    return;
  }
  reader->Untrack(env);
  reader->Deliver(env, completion, completion->result);
}

void InputReader::Finalize(Napi::Env, void*, InputReader* reader) {
  delete reader;
}

} // namespace ffmpeg
