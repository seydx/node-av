#include "device.h"

namespace ffmpeg {

static Napi::Array DevicesToJS(Napi::Env env, const std::vector<DeviceInfo>& devices) {
  Napi::Array result = Napi::Array::New(env, devices.size());

  for (size_t i = 0; i < devices.size(); i++) {
    Napi::Object deviceObj = Napi::Object::New(env);
    deviceObj.Set("name", Napi::String::New(env, devices[i].name));
    deviceObj.Set("description", Napi::String::New(env, devices[i].description));
    deviceObj.Set("type", Napi::String::New(env, devices[i].type));
    deviceObj.Set("isDefault", Napi::Boolean::New(env, devices[i].isDefault));
    if (devices[i].type == "screen") {
      deviceObj.Set("screenX", Napi::Number::New(env, devices[i].screenX));
      deviceObj.Set("screenY", Napi::Number::New(env, devices[i].screenY));
      deviceObj.Set("screenWidth", Napi::Number::New(env, devices[i].screenWidth));
      deviceObj.Set("screenHeight", Napi::Number::New(env, devices[i].screenHeight));
    }
    result[i] = deviceObj;
  }

  return result;
}

ListDevicesWorker::ListDevicesWorker(Napi::Env env, Napi::Promise::Deferred deferred)
  : AsyncWorker(env), deferred_(deferred) {}

void ListDevicesWorker::Execute() {
  try {
    devices_ = enumerateDevices();
  } catch (const std::exception& e) {
    SetError(std::string("Failed to enumerate devices: ") + e.what());
  }
}

void ListDevicesWorker::OnOK() {
  Napi::Env env = Env();
  deferred_.Resolve(DevicesToJS(env, devices_));
}

void ListDevicesWorker::OnError(const Napi::Error& error) {
  deferred_.Reject(error.Value());
}

Napi::Value Device::ListDevices(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  ListDevicesWorker* worker = new ListDevicesWorker(env, deferred);
  worker->Queue();

  return deferred.Promise();
}

static Napi::Array DeviceModesToJS(Napi::Env env, const std::vector<DeviceMode>& modes) {
  Napi::Array result = Napi::Array::New(env, modes.size());

  for (size_t i = 0; i < modes.size(); i++) {
    Napi::Object modeObj = Napi::Object::New(env);
    modeObj.Set("width", Napi::Number::New(env, modes[i].width));
    modeObj.Set("height", Napi::Number::New(env, modes[i].height));
    modeObj.Set("minFrameRate", Napi::Number::New(env, modes[i].minFrameRate));
    modeObj.Set("maxFrameRate", Napi::Number::New(env, modes[i].maxFrameRate));
    modeObj.Set("pixelFormat", Napi::Number::New(env, static_cast<int>(modes[i].pixelFormat)));
    result[i] = modeObj;
  }

  return result;
}

ListDeviceModesWorker::ListDeviceModesWorker(Napi::Env env, Napi::Promise::Deferred deferred, const std::string& deviceName)
  : AsyncWorker(env), deferred_(deferred), deviceName_(deviceName) {}

void ListDeviceModesWorker::Execute() {
  try {
    modes_ = enumerateDeviceModes(deviceName_);
  } catch (const std::exception& e) {
    SetError(std::string("Failed to enumerate device modes: ") + e.what());
  }
}

void ListDeviceModesWorker::OnOK() {
  Napi::Env env = Env();
  deferred_.Resolve(DeviceModesToJS(env, modes_));
}

void ListDeviceModesWorker::OnError(const Napi::Error& error) {
  deferred_.Reject(error.Value());
}

Napi::Value Device::ListDeviceModes(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string argument for device name").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string deviceName = info[0].As<Napi::String>().Utf8Value();

  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  ListDeviceModesWorker* worker = new ListDeviceModesWorker(env, deferred, deviceName);
  worker->Queue();

  return deferred.Promise();
}

static Napi::Array AudioDeviceModesToJS(Napi::Env env, const std::vector<AudioDeviceMode>& modes) {
  Napi::Array result = Napi::Array::New(env, modes.size());

  for (size_t i = 0; i < modes.size(); i++) {
    Napi::Object modeObj = Napi::Object::New(env);
    modeObj.Set("sampleRate", Napi::Number::New(env, modes[i].sampleRate));
    modeObj.Set("channels", Napi::Number::New(env, modes[i].channels));
    modeObj.Set("sampleFormat", Napi::Number::New(env, static_cast<int>(modes[i].sampleFormat)));
    result[i] = modeObj;
  }

  return result;
}

ListAudioDeviceModesWorker::ListAudioDeviceModesWorker(Napi::Env env, Napi::Promise::Deferred deferred, const std::string& deviceName)
  : AsyncWorker(env), deferred_(deferred), deviceName_(deviceName) {}

void ListAudioDeviceModesWorker::Execute() {
  try {
    modes_ = enumerateAudioDeviceModes(deviceName_);
  } catch (const std::exception& e) {
    SetError(std::string("Failed to enumerate audio device modes: ") + e.what());
  }
}

void ListAudioDeviceModesWorker::OnOK() {
  Napi::Env env = Env();
  deferred_.Resolve(AudioDeviceModesToJS(env, modes_));
}

void ListAudioDeviceModesWorker::OnError(const Napi::Error& error) {
  deferred_.Reject(error.Value());
}

Napi::Value Device::ListAudioDeviceModes(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string argument for device name").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string deviceName = info[0].As<Napi::String>().Utf8Value();

  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  ListAudioDeviceModesWorker* worker = new ListAudioDeviceModesWorker(env, deferred, deviceName);
  worker->Queue();

  return deferred.Promise();
}

} // namespace ffmpeg
