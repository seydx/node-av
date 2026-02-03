#include "device.h"

namespace ffmpeg {

Napi::FunctionReference Device::constructor;

Napi::Object Device::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "Device", {
    StaticMethod<&Device::ListDevices>("listDevices"),
    StaticMethod<&Device::ListDevicesSync>("listDevicesSync"),
    StaticMethod<&Device::ListDeviceModes>("listDeviceModes"),
    StaticMethod<&Device::ListDeviceModesSync>("listDeviceModesSync"),
    StaticMethod<&Device::ListAudioDeviceModes>("listAudioDeviceModes"),
    StaticMethod<&Device::ListAudioDeviceModesSync>("listAudioDeviceModesSync"),
    StaticMethod<&Device::GetVideoFormat>("getVideoFormat"),
    StaticMethod<&Device::GetAudioFormat>("getAudioFormat"),
    StaticMethod<&Device::GetScreenFormat>("getScreenFormat"),
    StaticMethod<&Device::HasScreenCapturePermission>("hasScreenCapturePermission"),
    StaticMethod<&Device::RequestScreenCaptureAccess>("requestScreenCaptureAccess"),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Device", func);
  return exports;
}

Device::Device(const Napi::CallbackInfo& info)
  : Napi::ObjectWrap<Device>(info) {
  Napi::Error::New(info.Env(), "Device class cannot be instantiated").ThrowAsJavaScriptException();
}

Device::~Device() {
}

Napi::Value Device::GetVideoFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, getVideoInputFormat());
}

Napi::Value Device::GetAudioFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, getAudioInputFormat());
}

Napi::Value Device::GetScreenFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, getScreenInputFormat());
}

} // namespace ffmpeg
