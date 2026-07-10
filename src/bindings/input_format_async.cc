#include "input_format.h"
#include "io_context.h"

extern "C" {
#include <libavformat/avformat.h>
}

namespace ffmpeg {

class InputFormatProbeBufferWorker : public Napi::AsyncWorker {
public:
  InputFormatProbeBufferWorker(
    Napi::Env env,
    Napi::Object ioCtxObj,
    IOContext* ioContext,
    int maxProbeSize
  ) : AsyncWorker(env),
      ops_(&ioContext->async_ops_),
      io_context_(ioContext),
      max_probe_size_(maxProbeSize),
      result_format_(nullptr),
      ret_(0),
      deferred_(Napi::Promise::Deferred::New(env)) {
    // Hold reference to prevent GC during async operation
    io_ctx_ref_.Reset(ioCtxObj, 1);
    ops_->Begin();
  }

  ~InputFormatProbeBufferWorker() {
    io_ctx_ref_.Reset();
  }

  void Execute() override {
    // Null checks to prevent use-after-free crashes
    if (io_context_) {
      AVIOContext* avio = io_context_->Get();
      if (!avio) {
        ret_ = AVERROR(EINVAL);
      } else {
        // av_probe_input_buffer2 will probe the format from the IO context
        const AVInputFormat* fmt = nullptr;
        ret_ = av_probe_input_buffer2(
          avio,
          &fmt,
          nullptr,  // filename (optional)
          nullptr,  // logctx
          0,        // offset
          max_probe_size_
        );

        if (ret_ >= 0) {
          result_format_ = fmt;
        }
      }
    } else {
      ret_ = AVERROR(EINVAL);
    }

    // Release before OnOK: the AVIOContext is not touched past this point,
    // so a guard wait on the main thread can proceed
    if (ops_) {
      ops_->End();
      ops_ = nullptr;
    }
  }

  void OnOK() override {
    if (!CanCallIntoJs(Env())) {
      return;
    }
    Napi::Env env = Env();

    if (ret_ < 0) {
      // Error case
      char errbuf[AV_ERROR_MAX_STRING_SIZE];
      av_strerror(ret_, errbuf, sizeof(errbuf));
      deferred_.Reject(Napi::Error::New(env, std::string("Failed to probe input format: ") + errbuf).Value());
      return;
    }

    if (!result_format_) {
      deferred_.Resolve(env.Null());
      return;
    }

    // Create new InputFormat object
    Napi::Object formatObj = InputFormat::constructor.New({});
    InputFormat* wrapper = Napi::ObjectWrap<InputFormat>::Unwrap(formatObj);
    wrapper->Set(result_format_);

    deferred_.Resolve(formatObj);
  }

  void OnError(const Napi::Error& e) override {
    if (ops_) {
      ops_->End();
      ops_ = nullptr;
    }
    if (!CanCallIntoJs(Env())) {
      return;
    }
    deferred_.Reject(e.Value());
  }

  Napi::Promise GetPromise() {
    return deferred_.Promise();
  }

private:
  Napi::ObjectReference io_ctx_ref_;
  AsyncOpCounter* ops_;
  IOContext* io_context_;
  int max_probe_size_;
  const AVInputFormat* result_format_;
  int ret_;
  Napi::Promise::Deferred deferred_;
};

Napi::Value InputFormat::ProbeBufferAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "IOContext required").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Check for IOContext using instanceof
  IOContext* ioContext = nullptr;
  Napi::Object obj = info[0].As<Napi::Object>();
  if (!IOContext::constructor.IsEmpty()) {
    Napi::Function ctor = IOContext::constructor.Value();
    if (obj.InstanceOf(ctor)) {
      ioContext = Napi::ObjectWrap<IOContext>::Unwrap(obj);
    }
  }

  if (!ioContext) {
    Napi::TypeError::New(env, "Invalid IOContext").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Optional max probe size (default: 1MB)
  int maxProbeSize = 1048576;
  if (info.Length() >= 2 && info[1].IsNumber()) {
    maxProbeSize = info[1].As<Napi::Number>().Int32Value();
  }

  auto* worker = new InputFormatProbeBufferWorker(env, obj, ioContext, maxProbeSize);
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
}

} // namespace ffmpeg