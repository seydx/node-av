#ifdef _WIN32

#include "device.h"
#include <algorithm>
#include <map>
#include <set>
#include <tuple>
#include <dshow.h>
#include <mmreg.h>
#include <comdef.h>

#pragma comment(lib, "strmiids.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "oleaut32.lib")

// MEDIASUBTYPE_I420 is not defined in standard DirectShow headers
#ifndef MEDIASUBTYPE_I420_DEFINED
static const GUID MEDIASUBTYPE_I420 = {
  0x30323449, 0x0000, 0x0010, {0x80, 0x00, 0x00, 0xAA, 0x00, 0x38, 0x9B, 0x71}
};
#define MEDIASUBTYPE_I420_DEFINED
#endif

namespace ffmpeg {

// Helper function to convert wide string to UTF-8
static std::string WideToUTF8(const wchar_t* wstr) {
  if (!wstr) return "";

  int size = WideCharToMultiByte(CP_UTF8, 0, wstr, -1, nullptr, 0, nullptr, nullptr);
  if (size <= 0) return "";

  std::string result(size - 1, 0);
  WideCharToMultiByte(CP_UTF8, 0, wstr, -1, &result[0], size, nullptr, nullptr);
  return result;
}

// DirectShow MEDIASUBTYPE GUID → FFmpeg AVPixelFormat
static AVPixelFormat mediaSubtypeToAV(const GUID& subtype) {
  if (subtype == MEDIASUBTYPE_YUY2)   return AV_PIX_FMT_YUYV422;
  if (subtype == MEDIASUBTYPE_UYVY)   return AV_PIX_FMT_UYVY422;
  if (subtype == MEDIASUBTYPE_NV12)   return AV_PIX_FMT_NV12;
  if (subtype == MEDIASUBTYPE_YV12)   return AV_PIX_FMT_YUV420P;
  if (subtype == MEDIASUBTYPE_I420)   return AV_PIX_FMT_YUV420P;
  if (subtype == MEDIASUBTYPE_IYUV)   return AV_PIX_FMT_YUV420P;
  if (subtype == MEDIASUBTYPE_RGB24)  return AV_PIX_FMT_BGR24;
  if (subtype == MEDIASUBTYPE_RGB32)  return AV_PIX_FMT_BGRA;
  if (subtype == MEDIASUBTYPE_ARGB32) return AV_PIX_FMT_ARGB;
  if (subtype == MEDIASUBTYPE_RGB565) return AV_PIX_FMT_RGB565LE;
  return AV_PIX_FMT_NONE;
}

// Helper function to enumerate devices of a specific category
static void enumerateDeviceCategory(
  std::vector<DeviceInfo>& devices,
  const GUID& category,
  const std::string& type,
  bool& isFirst
) {
  ICreateDevEnum* devEnum = nullptr;
  IEnumMoniker* enumMoniker = nullptr;
  IMoniker* moniker = nullptr;

  HRESULT hr = CoCreateInstance(
    CLSID_SystemDeviceEnum,
    nullptr,
    CLSCTX_INPROC_SERVER,
    IID_ICreateDevEnum,
    reinterpret_cast<void**>(&devEnum)
  );

  if (FAILED(hr) || !devEnum) {
    return;
  }

  hr = devEnum->CreateClassEnumerator(category, &enumMoniker, 0);
  if (hr != S_OK || !enumMoniker) {
    devEnum->Release();
    return;
  }

  while (enumMoniker->Next(1, &moniker, nullptr) == S_OK) {
    IPropertyBag* propBag = nullptr;
    hr = moniker->BindToStorage(nullptr, nullptr, IID_IPropertyBag, reinterpret_cast<void**>(&propBag));

    if (SUCCEEDED(hr) && propBag) {
      VARIANT varName;
      VariantInit(&varName);

      // Get friendly name
      hr = propBag->Read(L"FriendlyName", &varName, nullptr);
      if (SUCCEEDED(hr)) {
        DeviceInfo info;
        info.name = WideToUTF8(varName.bstrVal);
        info.description = info.name;
        info.type = type;
        info.isDefault = isFirst;
        isFirst = false;

        // Store device path in description for unique identification
        VARIANT varPath;
        VariantInit(&varPath);
        if (SUCCEEDED(propBag->Read(L"DevicePath", &varPath, nullptr))) {
          info.description = WideToUTF8(varPath.bstrVal);
          VariantClear(&varPath);
        }

        devices.push_back(info);
        VariantClear(&varName);
      }

      propBag->Release();
    }

    moniker->Release();
  }

  enumMoniker->Release();
  devEnum->Release();
}

// Monitor enumeration callback for screen devices
static BOOL CALLBACK MonitorEnumProc(HMONITOR hMonitor, HDC, LPRECT, LPARAM dwData) {
  auto* devices = reinterpret_cast<std::vector<DeviceInfo>*>(dwData);
  MONITORINFOEXW miex = { sizeof(miex) };
  GetMonitorInfoW(hMonitor, &miex);

  DeviceInfo info;
  info.type = "screen";
  info.isDefault = (miex.dwFlags & MONITORINFOF_PRIMARY) != 0;
  info.name = "desktop";

  int len = WideCharToMultiByte(CP_UTF8, 0, miex.szDevice, -1, nullptr, 0, nullptr, nullptr);
  std::string deviceName(len - 1, '\0');
  WideCharToMultiByte(CP_UTF8, 0, miex.szDevice, -1, &deviceName[0], len, nullptr, nullptr);
  info.description = deviceName;

  // Screen bounds from MONITORINFOEX
  info.screenX = miex.rcMonitor.left;
  info.screenY = miex.rcMonitor.top;
  info.screenWidth = miex.rcMonitor.right - miex.rcMonitor.left;
  info.screenHeight = miex.rcMonitor.bottom - miex.rcMonitor.top;

  devices->push_back(info);
  return TRUE;
}

std::vector<DeviceInfo> enumerateDevices() {
  std::vector<DeviceInfo> devices;

  // Initialize COM
  HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  bool comInitialized = SUCCEEDED(hr) || hr == RPC_E_CHANGED_MODE;

  if (comInitialized || hr == RPC_E_CHANGED_MODE) {
    bool isFirstVideo = true;
    bool isFirstAudio = true;

    // Enumerate video capture devices
    enumerateDeviceCategory(devices, CLSID_VideoInputDeviceCategory, "video", isFirstVideo);

    // Enumerate audio capture devices
    enumerateDeviceCategory(devices, CLSID_AudioInputDeviceCategory, "audio", isFirstAudio);

    // Only uninitialize if we successfully initialized
    if (SUCCEEDED(hr)) {
      CoUninitialize();
    }
  }

  // Enumerate screen/display devices
  EnumDisplayMonitors(NULL, NULL, MonitorEnumProc, reinterpret_cast<LPARAM>(&devices));

  return devices;
}

std::vector<DeviceMode> enumerateDeviceModes(const std::string& deviceName) {
  std::vector<DeviceMode> modes;

  HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  bool comInitialized = SUCCEEDED(hr) || hr == RPC_E_CHANGED_MODE;

  if (!comInitialized && hr != RPC_E_CHANGED_MODE) {
    throw std::runtime_error("Failed to initialize COM");
  }

  ICreateDevEnum* devEnum = nullptr;
  IEnumMoniker* enumMoniker = nullptr;
  IMoniker* moniker = nullptr;

  hr = CoCreateInstance(
    CLSID_SystemDeviceEnum,
    nullptr,
    CLSCTX_INPROC_SERVER,
    IID_ICreateDevEnum,
    reinterpret_cast<void**>(&devEnum)
  );

  if (FAILED(hr) || !devEnum) {
    if (SUCCEEDED(hr)) CoUninitialize();
    throw std::runtime_error("Failed to create device enumerator");
  }

  hr = devEnum->CreateClassEnumerator(CLSID_VideoInputDeviceCategory, &enumMoniker, 0);
  if (hr != S_OK || !enumMoniker) {
    devEnum->Release();
    if (SUCCEEDED(hr)) CoUninitialize();
    throw std::runtime_error("No video capture devices found");
  }

  struct ModeKey {
    int w, h;
    AVPixelFormat pixelFormat;
    bool operator<(const ModeKey& o) const {
      if (w != o.w) return w < o.w;
      if (h != o.h) return h < o.h;
      return pixelFormat < o.pixelFormat;
    }
  };
  std::map<ModeKey, std::pair<double, double>> modeMap;

  while (enumMoniker->Next(1, &moniker, nullptr) == S_OK) {
    IPropertyBag* propBag = nullptr;
    hr = moniker->BindToStorage(nullptr, nullptr, IID_IPropertyBag, reinterpret_cast<void**>(&propBag));

    if (SUCCEEDED(hr) && propBag) {
      // Check if this is the device we're looking for (by FriendlyName)
      VARIANT varName;
      VariantInit(&varName);
      std::string thisDeviceName;

      if (SUCCEEDED(propBag->Read(L"FriendlyName", &varName, nullptr))) {
        thisDeviceName = WideToUTF8(varName.bstrVal);
        VariantClear(&varName);
      }

      propBag->Release();

      if (thisDeviceName == deviceName) {
        // Found the device, get stream caps
        IBaseFilter* baseFilter = nullptr;
        hr = moniker->BindToObject(nullptr, nullptr, IID_IBaseFilter, reinterpret_cast<void**>(&baseFilter));

        if (SUCCEEDED(hr) && baseFilter) {
          IEnumPins* enumPins = nullptr;
          hr = baseFilter->EnumPins(&enumPins);

          if (SUCCEEDED(hr) && enumPins) {
            IPin* pin = nullptr;
            while (enumPins->Next(1, &pin, nullptr) == S_OK) {
              PIN_DIRECTION dir;
              pin->QueryDirection(&dir);

              if (dir == PINDIR_OUTPUT) {
                IAMStreamConfig* streamConfig = nullptr;
                hr = pin->QueryInterface(IID_IAMStreamConfig, reinterpret_cast<void**>(&streamConfig));

                if (SUCCEEDED(hr) && streamConfig) {
                  int count = 0, size = 0;
                  streamConfig->GetNumberOfCapabilities(&count, &size);

                  for (int i = 0; i < count; i++) {
                    AM_MEDIA_TYPE* mediaType = nullptr;
                    BYTE* caps = new BYTE[size];

                    if (SUCCEEDED(streamConfig->GetStreamCaps(i, &mediaType, caps))) {
                      if (mediaType->formattype == FORMAT_VideoInfo && mediaType->pbFormat) {
                        VIDEOINFOHEADER* vih = reinterpret_cast<VIDEOINFOHEADER*>(mediaType->pbFormat);
                        int w = vih->bmiHeader.biWidth;
                        int h = abs(vih->bmiHeader.biHeight);

                        VIDEO_STREAM_CONFIG_CAPS* vscCaps = reinterpret_cast<VIDEO_STREAM_CONFIG_CAPS*>(caps);
                        double minFps = vscCaps->MaxFrameInterval > 0 ? 10000000.0 / vscCaps->MaxFrameInterval : 1.0;
                        double maxFps = vscCaps->MinFrameInterval > 0 ? 10000000.0 / vscCaps->MinFrameInterval : 30.0;

                        AVPixelFormat pixFmt = mediaSubtypeToAV(mediaType->subtype);

                        ModeKey key{w, h, pixFmt};
                        auto it = modeMap.find(key);
                        if (it == modeMap.end()) {
                          modeMap[key] = {minFps, maxFps};
                        } else {
                          if (minFps < it->second.first) it->second.first = minFps;
                          if (maxFps > it->second.second) it->second.second = maxFps;
                        }
                      }

                      if (mediaType->cbFormat > 0 && mediaType->pbFormat) {
                        CoTaskMemFree(mediaType->pbFormat);
                      }
                      if (mediaType->pUnk) {
                        mediaType->pUnk->Release();
                      }
                      CoTaskMemFree(mediaType);
                    }

                    delete[] caps;
                  }

                  streamConfig->Release();
                }
              }

              pin->Release();
            }

            enumPins->Release();
          }

          baseFilter->Release();
        }

        moniker->Release();
        break;
      }
    }

    moniker->Release();
  }

  enumMoniker->Release();
  devEnum->Release();

  if (SUCCEEDED(hr)) {
    CoUninitialize();
  }

  for (auto& [key, fps] : modeMap) {
    DeviceMode mode;
    mode.width = key.w;
    mode.height = key.h;
    mode.minFrameRate = fps.first;
    mode.maxFrameRate = fps.second;
    mode.pixelFormat = key.pixelFormat;
    modes.push_back(mode);
  }

  std::sort(modes.begin(), modes.end(), [](const DeviceMode& a, const DeviceMode& b) {
    int areaA = a.width * a.height;
    int areaB = b.width * b.height;
    if (areaA != areaB) return areaA > areaB;
    return a.maxFrameRate > b.maxFrameRate;
  });

  return modes;
}

std::vector<AudioDeviceMode> enumerateAudioDeviceModes(const std::string& deviceName) {
  std::vector<AudioDeviceMode> modes;

  HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  bool comInitialized = SUCCEEDED(hr) || hr == RPC_E_CHANGED_MODE;

  if (!comInitialized && hr != RPC_E_CHANGED_MODE) {
    throw std::runtime_error("Failed to initialize COM");
  }

  ICreateDevEnum* devEnum = nullptr;
  IEnumMoniker* enumMoniker = nullptr;
  IMoniker* moniker = nullptr;

  hr = CoCreateInstance(
    CLSID_SystemDeviceEnum,
    nullptr,
    CLSCTX_INPROC_SERVER,
    IID_ICreateDevEnum,
    reinterpret_cast<void**>(&devEnum)
  );

  if (FAILED(hr) || !devEnum) {
    if (SUCCEEDED(hr)) CoUninitialize();
    throw std::runtime_error("Failed to create device enumerator");
  }

  hr = devEnum->CreateClassEnumerator(CLSID_AudioInputDeviceCategory, &enumMoniker, 0);
  if (hr != S_OK || !enumMoniker) {
    devEnum->Release();
    if (SUCCEEDED(hr)) CoUninitialize();
    throw std::runtime_error("No audio capture devices found");
  }

  std::set<std::tuple<int, int, int>> seen;

  while (enumMoniker->Next(1, &moniker, nullptr) == S_OK) {
    IPropertyBag* propBag = nullptr;
    hr = moniker->BindToStorage(nullptr, nullptr, IID_IPropertyBag, reinterpret_cast<void**>(&propBag));

    if (SUCCEEDED(hr) && propBag) {
      VARIANT varName;
      VariantInit(&varName);
      std::string thisDeviceName;

      if (SUCCEEDED(propBag->Read(L"FriendlyName", &varName, nullptr))) {
        thisDeviceName = WideToUTF8(varName.bstrVal);
        VariantClear(&varName);
      }

      propBag->Release();

      if (thisDeviceName == deviceName) {
        IBaseFilter* baseFilter = nullptr;
        hr = moniker->BindToObject(nullptr, nullptr, IID_IBaseFilter, reinterpret_cast<void**>(&baseFilter));

        if (SUCCEEDED(hr) && baseFilter) {
          IEnumPins* enumPins = nullptr;
          hr = baseFilter->EnumPins(&enumPins);

          if (SUCCEEDED(hr) && enumPins) {
            IPin* pin = nullptr;
            while (enumPins->Next(1, &pin, nullptr) == S_OK) {
              PIN_DIRECTION dir;
              pin->QueryDirection(&dir);

              if (dir == PINDIR_OUTPUT) {
                IAMStreamConfig* streamConfig = nullptr;
                hr = pin->QueryInterface(IID_IAMStreamConfig, reinterpret_cast<void**>(&streamConfig));

                if (SUCCEEDED(hr) && streamConfig) {
                  int count = 0, size = 0;
                  streamConfig->GetNumberOfCapabilities(&count, &size);

                  for (int i = 0; i < count; i++) {
                    AM_MEDIA_TYPE* mediaType = nullptr;
                    BYTE* caps = new BYTE[size];

                    if (SUCCEEDED(streamConfig->GetStreamCaps(i, &mediaType, caps))) {
                      if (mediaType->formattype == FORMAT_WaveFormatEx && mediaType->pbFormat) {
                        WAVEFORMATEX* wfx = reinterpret_cast<WAVEFORMATEX*>(mediaType->pbFormat);
                        int sampleRate = static_cast<int>(wfx->nSamplesPerSec);
                        int channels = static_cast<int>(wfx->nChannels);
                        int bitsPerSample = static_cast<int>(wfx->wBitsPerSample);
                        AVSampleFormat sampleFormat = AV_SAMPLE_FMT_NONE;

                        if (wfx->wFormatTag == WAVE_FORMAT_PCM || wfx->wFormatTag == WAVE_FORMAT_EXTENSIBLE) {
                          if (bitsPerSample == 8) sampleFormat = AV_SAMPLE_FMT_U8;
                          else if (bitsPerSample == 16) sampleFormat = AV_SAMPLE_FMT_S16;
                          else if (bitsPerSample == 32) sampleFormat = AV_SAMPLE_FMT_S32;
                        } else if (wfx->wFormatTag == WAVE_FORMAT_IEEE_FLOAT) {
                          if (bitsPerSample == 32) sampleFormat = AV_SAMPLE_FMT_FLT;
                          else if (bitsPerSample == 64) sampleFormat = AV_SAMPLE_FMT_DBL;
                        }

                        auto key = std::make_tuple(sampleRate, channels, static_cast<int>(sampleFormat));
                        if (seen.insert(key).second) {
                          AudioDeviceMode mode;
                          mode.sampleRate = sampleRate;
                          mode.channels = channels;
                          mode.sampleFormat = sampleFormat;
                          modes.push_back(mode);
                        }
                      }

                      if (mediaType->cbFormat > 0 && mediaType->pbFormat) {
                        CoTaskMemFree(mediaType->pbFormat);
                      }
                      if (mediaType->pUnk) {
                        mediaType->pUnk->Release();
                      }
                      CoTaskMemFree(mediaType);
                    }

                    delete[] caps;
                  }

                  streamConfig->Release();
                }
              }

              pin->Release();
            }

            enumPins->Release();
          }

          baseFilter->Release();
        }

        moniker->Release();
        break;
      }
    }

    moniker->Release();
  }

  enumMoniker->Release();
  devEnum->Release();

  if (SUCCEEDED(hr)) {
    CoUninitialize();
  }

  // Sort: sampleRate desc, then channels desc
  std::sort(modes.begin(), modes.end(), [](const AudioDeviceMode& a, const AudioDeviceMode& b) {
    if (a.sampleRate != b.sampleRate) return a.sampleRate > b.sampleRate;
    return a.channels > b.channels;
  });

  return modes;
}

std::string getVideoInputFormat() {
  return "dshow";
}

std::string getAudioInputFormat() {
  return "dshow";
}

std::string getScreenInputFormat() {
  return "gdigrab";
}

bool hasScreenCapturePermission() {
  return true;
}

bool requestScreenCaptureAccess() {
  return true;
}

} // namespace ffmpeg

#endif // _WIN32
