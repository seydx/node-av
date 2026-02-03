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

Napi::Value Device::ListDevicesSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    std::vector<DeviceInfo> devices = enumerateDevices();
    return DevicesToJS(env, devices);
  } catch (const std::exception& e) {
    Napi::Error::New(env, std::string("Failed to enumerate devices: ") + e.what())
      .ThrowAsJavaScriptException();
    return env.Null();
  }
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

Napi::Value Device::ListDeviceModesSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string argument for device name").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string deviceName = info[0].As<Napi::String>().Utf8Value();

  try {
    std::vector<DeviceMode> modes = enumerateDeviceModes(deviceName);
    return DeviceModesToJS(env, modes);
  } catch (const std::exception& e) {
    Napi::Error::New(env, std::string("Failed to enumerate device modes: ") + e.what())
      .ThrowAsJavaScriptException();
    return env.Null();
  }
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

Napi::Value Device::ListAudioDeviceModesSync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string argument for device name").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string deviceName = info[0].As<Napi::String>().Utf8Value();

  try {
    std::vector<AudioDeviceMode> modes = enumerateAudioDeviceModes(deviceName);
    return AudioDeviceModesToJS(env, modes);
  } catch (const std::exception& e) {
    Napi::Error::New(env, std::string("Failed to enumerate audio device modes: ") + e.what())
      .ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value Device::HasScreenCapturePermission(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Boolean::New(env, hasScreenCapturePermission());
}

Napi::Value Device::RequestScreenCaptureAccess(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Boolean::New(env, requestScreenCaptureAccess());
}

} // namespace ffmpeg
