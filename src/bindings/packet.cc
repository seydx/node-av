#include "packet.h"

namespace ffmpeg {

Napi::FunctionReference Packet::constructor;

Napi::Object Packet::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "Packet", {
    InstanceMethod<&Packet::Alloc>("alloc"),
    InstanceMethod<&Packet::Free>("free"),
    InstanceMethod<&Packet::Ref>("ref"),
    InstanceMethod<&Packet::Unref>("unref"),
    InstanceMethod<&Packet::Clone>("clone"),
    InstanceMethod<&Packet::RescaleTs>("rescaleTs"),
    InstanceMethod<&Packet::MakeRefcounted>("makeRefcounted"),
    InstanceMethod<&Packet::MakeWritable>("makeWritable"),
    InstanceMethod<&Packet::GetSideData>("getSideData"),
    InstanceMethod<&Packet::AddSideData>("addSideData"),
    InstanceMethod<&Packet::NewSideData>("newSideData"),
    InstanceMethod<&Packet::FreeSideData>("freeSideData"),
    InstanceMethod<&Packet::Dispose>(Napi::Symbol::WellKnown(env, "dispose")),

    InstanceAccessor<&Packet::GetStreamIndex, &Packet::SetStreamIndex>("streamIndex"),
    InstanceAccessor<&Packet::GetPts, &Packet::SetPts>("pts"),
    InstanceAccessor<&Packet::GetDts, &Packet::SetDts>("dts"),
    InstanceAccessor<&Packet::GetDuration, &Packet::SetDuration>("duration"),
    InstanceAccessor<&Packet::GetTimeBase, &Packet::SetTimeBase>("timeBase"),
    InstanceAccessor<&Packet::GetPos, &Packet::SetPos>("pos"),
    InstanceAccessor<&Packet::GetSize>("size"),
    InstanceAccessor<&Packet::GetFlags, &Packet::SetFlagsAccessor>("flags"),
    InstanceAccessor<&Packet::GetData, &Packet::SetData>("data"),
    InstanceAccessor<&Packet::GetIsKeyframe, &Packet::SetIsKeyframe>("isKeyframe"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("Packet", func);
  return exports;
}

Packet::Packet(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<Packet>(info) {
  // Constructor does nothing - user must explicitly call alloc()
}

Packet::~Packet() {
  av_packet_free(&packet_);
}

Napi::Value Packet::Alloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVPacket* pkt = av_packet_alloc();
  if (!pkt) {
    Napi::Error::New(env, "Failed to allocate packet (ENOMEM)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  av_packet_free(&packet_);

  packet_ = pkt;
  return env.Undefined();
}

Napi::Value Packet::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  av_packet_free(&packet_);
  return env.Undefined();
}

Napi::Value Packet::Ref(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!packet_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Source packet required").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  Packet* src = UnwrapNativeObject<Packet>(env, info[0], "Packet");
  if (!src || !src->Get()) {
    Napi::TypeError::New(env, "Invalid source packet").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = av_packet_ref(packet_, src->Get());
  return Napi::Number::New(env, ret);
}

Napi::Value Packet::Unref(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (packet_) {
    av_packet_unref(packet_);
  }
  
  return env.Undefined();
}

Napi::Value Packet::Clone(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!packet_) {
    return env.Null();
  }
  
  AVPacket* cloned = av_packet_clone(packet_);
  if (!cloned) {
    return env.Null();
  }
  
  // Create new Packet object
  Napi::Object newPacket = constructor.New({});
  Packet* wrapper = Napi::ObjectWrap<Packet>::Unwrap(newPacket);
  wrapper->packet_ = cloned;

  return newPacket;
}

Napi::Value Packet::RescaleTs(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!packet_) {
    return env.Undefined();
  }
  
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Source and destination timebases required").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  AVRational src_tb = JSToRational(info[0].As<Napi::Object>());
  AVRational dst_tb = JSToRational(info[1].As<Napi::Object>());
  
  av_packet_rescale_ts(packet_, src_tb, dst_tb);
  
  return env.Undefined();
}

Napi::Value Packet::MakeRefcounted(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!packet_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = av_packet_make_refcounted(packet_);
  return Napi::Number::New(env, ret);
}

Napi::Value Packet::MakeWritable(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!packet_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = av_packet_make_writable(packet_);
  return Napi::Number::New(env, ret);
}

Napi::Value Packet::GetSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!packet_) {
    Napi::TypeError::New(env, "Invalid packet").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected side data type as number").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  enum AVPacketSideDataType type = static_cast<AVPacketSideDataType>(info[0].As<Napi::Number>().Int32Value());
  
  size_t size = 0;
  uint8_t* data = av_packet_get_side_data(packet_, type, &size);
  
  if (!data) {
    return env.Null();
  }
  
  // Return as Buffer
  return Napi::Buffer<uint8_t>::Copy(env, data, size);
}

Napi::Value Packet::AddSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!packet_) {
    Napi::TypeError::New(env, "Invalid packet").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsBuffer()) {
    Napi::TypeError::New(env, "Expected (type: number, data: Buffer)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  enum AVPacketSideDataType type = static_cast<AVPacketSideDataType>(info[0].As<Napi::Number>().Int32Value());
  Napi::Buffer<uint8_t> buffer = info[1].As<Napi::Buffer<uint8_t>>();
  
  // Allocate and copy data
  uint8_t* data = static_cast<uint8_t*>(av_malloc(buffer.Length()));
  if (!data) {
    Napi::Error::New(env, "Failed to allocate side data (ENOMEM)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  memcpy(data, buffer.Data(), buffer.Length());
  
  int ret = av_packet_add_side_data(packet_, type, data, buffer.Length());
  if (ret < 0) {
    av_free(data);
    char errbuf[AV_ERROR_MAX_STRING_SIZE];
    av_strerror(ret, errbuf, sizeof(errbuf));
    Napi::Error::New(env, std::string("Failed to add side data: ") + errbuf).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  return Napi::Number::New(env, 0);
}

Napi::Value Packet::NewSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!packet_) {
    Napi::TypeError::New(env, "Invalid packet").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Expected (type: number, size: number)").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  enum AVPacketSideDataType type = static_cast<AVPacketSideDataType>(info[0].As<Napi::Number>().Int32Value());
  size_t size = info[1].As<Napi::Number>().Uint32Value();
  
  uint8_t* data = av_packet_new_side_data(packet_, type, size);
  if (!data) {
    Napi::Error::New(env, "Failed to allocate new side data").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  
  // Return as Buffer that references the side data (not a copy)
  // Note: The buffer lifetime is tied to the packet
  return Napi::Buffer<uint8_t>::NewOrCopy(env, data, size, [](Napi::Env, uint8_t*) {
    // No-op finalizer since the data is owned by the packet
  });
}

Napi::Value Packet::FreeSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!packet_) {
    Napi::TypeError::New(env, "Invalid packet").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  av_packet_free_side_data(packet_);
  return env.Undefined();
}

Napi::Value Packet::GetStreamIndex(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!packet_) {
    return Napi::Number::New(env, -1);
  }
  return Napi::Number::New(env, packet_->stream_index);
}

void Packet::SetStreamIndex(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (packet_) {
    packet_->stream_index = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Packet::GetPts(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!packet_) {
    return Napi::BigInt::New(env, AV_NOPTS_VALUE);
  }
  return Napi::BigInt::New(env, packet_->pts);
}

void Packet::SetPts(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (packet_) {
    bool lossless;
    packet_->pts = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Packet::GetDts(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!packet_) {
    return Napi::BigInt::New(env, AV_NOPTS_VALUE);
  }
  return Napi::BigInt::New(env, packet_->dts);
}

void Packet::SetDts(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (packet_) {
    bool lossless;
    packet_->dts = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Packet::GetDuration(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!packet_) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  return Napi::BigInt::New(env, packet_->duration);
}

void Packet::SetDuration(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (packet_) {
    bool lossless;
    packet_->duration = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Packet::GetTimeBase(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!packet_) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("num", 0);
    obj.Set("den", 1);
    return obj;
  }
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("num", packet_->time_base.num);
  obj.Set("den", packet_->time_base.den);
  return obj;
}

void Packet::SetTimeBase(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (packet_ && value.IsObject()) {
    Napi::Object obj = value.As<Napi::Object>();
    if (obj.Has("num") && obj.Has("den")) {
      packet_->time_base.num = obj.Get("num").As<Napi::Number>().Int32Value();
      packet_->time_base.den = obj.Get("den").As<Napi::Number>().Int32Value();
    }
  }
}

Napi::Value Packet::GetPos(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!packet_) {
    return Napi::BigInt::New(env, static_cast<int64_t>(-1));
  }
  return Napi::BigInt::New(env, packet_->pos);
}

void Packet::SetPos(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (packet_) {
    bool lossless;
    packet_->pos = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value Packet::GetSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!packet_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, packet_->size);
}

Napi::Value Packet::GetFlags(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!packet_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, packet_->flags);
}

void Packet::SetFlagsAccessor(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (packet_) {
    packet_->flags = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value Packet::GetData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!packet_ || !packet_->data || packet_->size <= 0) {
    return env.Null();
  }
  
  // Return a copy of the data as Buffer
  return Napi::Buffer<uint8_t>::Copy(env, packet_->data, packet_->size);
}

void Packet::SetData(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  if (!packet_) {
    return;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    // Clear data
    av_packet_unref(packet_);
    return;
  }
  
  if (!value.IsBuffer()) {
    Napi::TypeError::New(env, "Data must be a Buffer").ThrowAsJavaScriptException();
    return;
  }
  
  Napi::Buffer<uint8_t> buffer = value.As<Napi::Buffer<uint8_t>>();
  size_t size = buffer.Length();
  
  // Allocate new buffer for packet
  int ret = av_new_packet(packet_, size);
  if (ret < 0) {
    Napi::Error::New(env, "Failed to allocate packet data").ThrowAsJavaScriptException();
    return;
  }
  
  // Copy data
  memcpy(packet_->data, buffer.Data(), size);
}

Napi::Value Packet::GetIsKeyframe(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!packet_) {
    return Napi::Boolean::New(env, false);
  }
  return Napi::Boolean::New(env, (packet_->flags & AV_PKT_FLAG_KEY) != 0);
}

void Packet::SetIsKeyframe(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (packet_) {
    if (value.As<Napi::Boolean>().Value()) {
      packet_->flags |= AV_PKT_FLAG_KEY;
    } else {
      packet_->flags &= ~AV_PKT_FLAG_KEY;
    }
  }
}

Napi::Value Packet::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}

} // namespace ffmpeg