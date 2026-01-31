#ifdef _WIN32

#include "device.h"
#include <algorithm>
#include <map>
#include <dshow.h>
#include <comdef.h>

#pragma comment(lib, "strmiids.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "oleaut32.lib")

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
        info.description = info.name;  // DirectShow doesn't have separate description
        info.type = type;
        info.isDefault = isFirst;
        isFirst = false;

        // Get device path if available (for unique identification)
        VARIANT varPath;
        VariantInit(&varPath);
        if (SUCCEEDED(propBag->Read(L"DevicePath", &varPath, nullptr))) {
          // Use device path as name for uniqueness
          info.name = WideToUTF8(varPath.bstrVal);
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

  struct ResKey {
    int w, h;
    bool operator<(const ResKey& o) const {
      return w != o.w ? w < o.w : h < o.h;
    }
  };
  std::map<ResKey, std::pair<double, double>> resMap;

  while (enumMoniker->Next(1, &moniker, nullptr) == S_OK) {
    IPropertyBag* propBag = nullptr;
    hr = moniker->BindToStorage(nullptr, nullptr, IID_IPropertyBag, reinterpret_cast<void**>(&propBag));

    if (SUCCEEDED(hr) && propBag) {
      // Check if this is the device we're looking for
      VARIANT varPath;
      VariantInit(&varPath);
      std::string thisDeviceName;

      if (SUCCEEDED(propBag->Read(L"DevicePath", &varPath, nullptr))) {
        thisDeviceName = WideToUTF8(varPath.bstrVal);
        VariantClear(&varPath);
      } else {
        VARIANT varName;
        VariantInit(&varName);
        if (SUCCEEDED(propBag->Read(L"FriendlyName", &varName, nullptr))) {
          thisDeviceName = WideToUTF8(varName.bstrVal);
          VariantClear(&varName);
        }
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

                        ResKey key{w, h};
                        auto it = resMap.find(key);
                        if (it == resMap.end()) {
                          resMap[key] = {minFps, maxFps};
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

  for (auto& [key, fps] : resMap) {
    DeviceMode mode;
    mode.width = key.w;
    mode.height = key.h;
    mode.minFrameRate = fps.first;
    mode.maxFrameRate = fps.second;
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
