#ifndef FFMPEG_DEVICE_H
#define FFMPEG_DEVICE_H

#include <napi.h>
#include <vector>
#include <string>

extern "C" {
#include <libavutil/pixfmt.h>
#include <libavutil/samplefmt.h>
}

namespace ffmpeg {

struct DeviceInfo {
  std::string name;
  std::string description;
  std::string type;  // "video", "audio", or "screen"
  bool isDefault;
  // Screen bounds (only meaningful for type == "screen")
  int screenX = 0;
  int screenY = 0;
  int screenWidth = 0;
  int screenHeight = 0;
};

struct DeviceMode {
  int width;
  int height;
  double minFrameRate;
  double maxFrameRate;
  AVPixelFormat pixelFormat = AV_PIX_FMT_NONE;  // FFmpeg AVPixelFormat enum value
};

struct AudioDeviceMode {
  int sampleRate;
  int channels;
  AVSampleFormat sampleFormat = AV_SAMPLE_FMT_NONE;
};

// Platform-specific implementations
std::vector<DeviceInfo> enumerateDevices();
std::vector<DeviceMode> enumerateDeviceModes(const std::string& deviceName);
std::vector<AudioDeviceMode> enumerateAudioDeviceModes(const std::string& deviceName);
std::string getVideoInputFormat();
std::string getAudioInputFormat();
std::string getScreenInputFormat();
bool hasScreenCapturePermission();
bool requestScreenCaptureAccess();

class ListDevicesWorker : public Napi::AsyncWorker {
public:
  ListDevicesWorker(Napi::Env env, Napi::Promise::Deferred deferred);
  void Execute() override;
  void OnOK() override;
  void OnError(const Napi::Error& error) override;

private:
  Napi::Promise::Deferred deferred_;
  std::vector<DeviceInfo> devices_;
};

class ListDeviceModesWorker : public Napi::AsyncWorker {
public:
  ListDeviceModesWorker(Napi::Env env, Napi::Promise::Deferred deferred, const std::string& deviceName);
  void Execute() override;
  void OnOK() override;
  void OnError(const Napi::Error& error) override;

private:
  Napi::Promise::Deferred deferred_;
  std::string deviceName_;
  std::vector<DeviceMode> modes_;
};

class ListAudioDeviceModesWorker : public Napi::AsyncWorker {
public:
  ListAudioDeviceModesWorker(Napi::Env env, Napi::Promise::Deferred deferred, const std::string& deviceName);
  void Execute() override;
  void OnOK() override;
  void OnError(const Napi::Error& error) override;

private:
  Napi::Promise::Deferred deferred_;
  std::string deviceName_;
  std::vector<AudioDeviceMode> modes_;
};

class Device : public Napi::ObjectWrap<Device> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  Device(const Napi::CallbackInfo& info);
  ~Device();

  static Napi::FunctionReference constructor;

private:
  static Napi::Value ListDevices(const Napi::CallbackInfo& info);
  static Napi::Value ListDevicesSync(const Napi::CallbackInfo& info);
  static Napi::Value ListDeviceModes(const Napi::CallbackInfo& info);
  static Napi::Value ListDeviceModesSync(const Napi::CallbackInfo& info);
  static Napi::Value ListAudioDeviceModes(const Napi::CallbackInfo& info);
  static Napi::Value ListAudioDeviceModesSync(const Napi::CallbackInfo& info);
  static Napi::Value GetVideoFormat(const Napi::CallbackInfo& info);
  static Napi::Value GetAudioFormat(const Napi::CallbackInfo& info);
  static Napi::Value GetScreenFormat(const Napi::CallbackInfo& info);
  static Napi::Value HasScreenCapturePermission(const Napi::CallbackInfo& info);
  static Napi::Value RequestScreenCaptureAccess(const Napi::CallbackInfo& info);
};

} // namespace ffmpeg

#endif // FFMPEG_DEVICE_H
