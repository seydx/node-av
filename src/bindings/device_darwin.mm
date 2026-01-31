#ifdef __APPLE__

#include "device.h"
#include <algorithm>
#include <map>
#import <AVFoundation/AVFoundation.h>
#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>

namespace ffmpeg {

std::vector<DeviceInfo> enumerateDevices() {
  std::vector<DeviceInfo> devices;

  @autoreleasepool {
    // Video devices using AVCaptureDeviceDiscoverySession (modern API)
    NSArray<AVCaptureDeviceType>* videoDeviceTypes = @[
      AVCaptureDeviceTypeBuiltInWideAngleCamera,
      AVCaptureDeviceTypeExternalUnknown
    ];

    AVCaptureDeviceDiscoverySession* videoDiscoverySession =
      [AVCaptureDeviceDiscoverySession discoverySessionWithDeviceTypes:videoDeviceTypes
                                                             mediaType:AVMediaTypeVideo
                                                              position:AVCaptureDevicePositionUnspecified];

    bool isFirstVideo = true;
    for (AVCaptureDevice* device in videoDiscoverySession.devices) {
      DeviceInfo info;
      info.name = std::string([[device uniqueID] UTF8String]);
      info.description = std::string([[device localizedName] UTF8String]);
      info.type = "video";
      info.isDefault = isFirstVideo;
      isFirstVideo = false;
      devices.push_back(info);
    }

    // Audio devices using AVCaptureDeviceDiscoverySession
    NSArray<AVCaptureDeviceType>* audioDeviceTypes = @[
      AVCaptureDeviceTypeBuiltInMicrophone,
      AVCaptureDeviceTypeExternalUnknown
    ];

    AVCaptureDeviceDiscoverySession* audioDiscoverySession =
      [AVCaptureDeviceDiscoverySession discoverySessionWithDeviceTypes:audioDeviceTypes
                                                             mediaType:AVMediaTypeAudio
                                                              position:AVCaptureDevicePositionUnspecified];

    bool isFirstAudio = true;
    for (AVCaptureDevice* device in audioDiscoverySession.devices) {
      DeviceInfo info;
      info.name = std::string([[device uniqueID] UTF8String]);
      info.description = std::string([[device localizedName] UTF8String]);
      info.type = "audio";
      info.isDefault = isFirstAudio;
      isFirstAudio = false;
      devices.push_back(info);
    }

    // Muxed devices (devices with both audio and video)
    AVCaptureDeviceDiscoverySession* muxedDiscoverySession =
      [AVCaptureDeviceDiscoverySession discoverySessionWithDeviceTypes:videoDeviceTypes
                                                             mediaType:AVMediaTypeMuxed
                                                              position:AVCaptureDevicePositionUnspecified];

    for (AVCaptureDevice* device in muxedDiscoverySession.devices) {
      std::string deviceId = std::string([[device uniqueID] UTF8String]);

      // Check if already added
      bool alreadyAdded = false;
      for (const auto& d : devices) {
        if (d.name == deviceId) {
          alreadyAdded = true;
          break;
        }
      }

      if (!alreadyAdded) {
        DeviceInfo info;
        info.name = deviceId;
        info.description = std::string([[device localizedName] UTF8String]);
        info.type = "video";
        info.isDefault = false;
        devices.push_back(info);
      }
    }
  }

  return devices;
}

std::vector<DeviceMode> enumerateDeviceModes(const std::string& deviceName) {
  std::vector<DeviceMode> modes;

  @autoreleasepool {
    NSString* targetId = [NSString stringWithUTF8String:deviceName.c_str()];
    AVCaptureDevice* device = [AVCaptureDevice deviceWithUniqueID:targetId];

    if (!device) {
      throw std::runtime_error("Device not found: " + deviceName);
    }

    // Map: (width, height) -> (minFps, maxFps) — keep widest range per resolution
    struct ResKey {
      int w, h;
      bool operator<(const ResKey& o) const {
        return w != o.w ? w < o.w : h < o.h;
      }
    };
    std::map<ResKey, std::pair<double, double>> resMap;

    for (AVCaptureDeviceFormat* fmt in device.formats) {
      CMVideoDimensions dims = CMVideoFormatDescriptionGetDimensions(fmt.formatDescription);
      int w = dims.width;
      int h = dims.height;

      for (AVFrameRateRange* range in fmt.videoSupportedFrameRateRanges) {
        double minFps = range.minFrameRate;
        double maxFps = range.maxFrameRate;

        ResKey key{w, h};
        auto it = resMap.find(key);
        if (it == resMap.end()) {
          resMap[key] = {minFps, maxFps};
        } else {
          if (minFps < it->second.first) it->second.first = minFps;
          if (maxFps > it->second.second) it->second.second = maxFps;
        }
      }
    }

    for (auto& [key, fps] : resMap) {
      DeviceMode mode;
      mode.width = key.w;
      mode.height = key.h;
      mode.minFrameRate = fps.first;
      mode.maxFrameRate = fps.second;
      modes.push_back(mode);
    }

    // Sort descending by area, then by maxFrameRate
    std::sort(modes.begin(), modes.end(), [](const DeviceMode& a, const DeviceMode& b) {
      int areaA = a.width * a.height;
      int areaB = b.width * b.height;
      if (areaA != areaB) return areaA > areaB;
      return a.maxFrameRate > b.maxFrameRate;
    });
  }

  return modes;
}

std::string getVideoInputFormat() {
  return "avfoundation";
}

std::string getAudioInputFormat() {
  return "avfoundation";
}

std::string getScreenInputFormat() {
  return "avfoundation";
}

bool hasScreenCapturePermission() {
  if (@available(macOS 11.0, *)) {
    return CGPreflightScreenCaptureAccess();
  }
  // Pre-macOS 11: no API to check, assume granted
  return true;
}

bool requestScreenCaptureAccess() {
  if (@available(macOS 11.0, *)) {
    return CGRequestScreenCaptureAccess();
  }
  // Pre-macOS 11: no API to request, assume granted
  return true;
}

} // namespace ffmpeg

#endif // __APPLE__
