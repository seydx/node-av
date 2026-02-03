#ifdef __APPLE__

#include "device.h"
#include <algorithm>
#include <map>
#include <set>
#include <tuple>
#import <AVFoundation/AVFoundation.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreGraphics/CoreGraphics.h>
#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>

namespace ffmpeg {

// CoreVideo FourCC → FFmpeg AVPixelFormat
static AVPixelFormat cvPixelFormatToAV(OSType format) {
  switch (format) {
    case kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange:
    case kCVPixelFormatType_420YpCbCr8BiPlanarFullRange:   return AV_PIX_FMT_NV12;
    case kCVPixelFormatType_422YpCbCr8:                    return AV_PIX_FMT_UYVY422;
    case kCVPixelFormatType_422YpCbCr8_yuvs:               return AV_PIX_FMT_YUYV422;
    case kCVPixelFormatType_32BGRA:                        return AV_PIX_FMT_BGRA;
    case kCVPixelFormatType_32ARGB:                        return AV_PIX_FMT_ARGB;
    case kCVPixelFormatType_24RGB:                         return AV_PIX_FMT_RGB24;
    case kCVPixelFormatType_420YpCbCr8Planar:              return AV_PIX_FMT_YUV420P;
    case kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange: return AV_PIX_FMT_P010LE;
    default:                                               return AV_PIX_FMT_NONE;
  }
}

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
      info.name = std::string([[device localizedName] UTF8String]);
      info.description = std::string([[device uniqueID] UTF8String]);
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
      info.name = std::string([[device localizedName] UTF8String]);
      info.description = std::string([[device uniqueID] UTF8String]);
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
      std::string deviceName = std::string([[device localizedName] UTF8String]);

      // Check if already added
      bool alreadyAdded = false;
      for (const auto& d : devices) {
        if (d.name == deviceName) {
          alreadyAdded = true;
          break;
        }
      }

      if (!alreadyAdded) {
        DeviceInfo info;
        info.name = deviceName;
        info.description = std::string([[device uniqueID] UTF8String]);
        info.type = "video";
        info.isDefault = false;
        devices.push_back(info);
      }
    }

    // Screen/display devices
    uint32_t displayCount = 0;
    CGGetActiveDisplayList(0, nullptr, &displayCount);
    if (displayCount > 0) {
      std::vector<CGDirectDisplayID> displays(displayCount);
      CGGetActiveDisplayList(displayCount, displays.data(), &displayCount);
      NSArray *screens = [NSScreen screens];
      for (uint32_t i = 0; i < displayCount; i++) {
        DeviceInfo info;
        info.type = "screen";
        info.isDefault = (i == 0);
        info.name = std::string("Capture screen ") + std::to_string(i);
        NSString *screenName = nil;
        for (NSScreen *screen in screens) {
          NSDictionary *desc = [screen deviceDescription];
          CGDirectDisplayID screenID = [[desc objectForKey:@"NSScreenNumber"] unsignedIntValue];
          if (screenID == displays[i]) {
            screenName = screen.localizedName;
            break;
          }
        }
        info.description = screenName ? [screenName UTF8String] : ("Display " + std::to_string(i));

        // Screen bounds from CoreGraphics
        CGRect bounds = CGDisplayBounds(displays[i]);
        info.screenX = static_cast<int>(bounds.origin.x);
        info.screenY = static_cast<int>(bounds.origin.y);
        info.screenWidth = static_cast<int>(bounds.size.width);
        info.screenHeight = static_cast<int>(bounds.size.height);

        devices.push_back(info);
      }
    }
  }

  return devices;
}

std::vector<DeviceMode> enumerateDeviceModes(const std::string& deviceName) {
  std::vector<DeviceMode> modes;

  @autoreleasepool {
    NSString* targetName = [NSString stringWithUTF8String:deviceName.c_str()];

    // First try uniqueID lookup (for backwards compatibility with description field)
    AVCaptureDevice* device = [AVCaptureDevice deviceWithUniqueID:targetName];

    // If not found, search by localizedName
    if (!device) {
      NSArray<AVCaptureDeviceType>* deviceTypes = @[
        AVCaptureDeviceTypeBuiltInWideAngleCamera,
        AVCaptureDeviceTypeBuiltInMicrophone,
        AVCaptureDeviceTypeExternalUnknown
      ];
      for (AVMediaType mediaType in @[AVMediaTypeVideo, AVMediaTypeAudio, AVMediaTypeMuxed]) {
        AVCaptureDeviceDiscoverySession* session =
          [AVCaptureDeviceDiscoverySession discoverySessionWithDeviceTypes:deviceTypes
                                                                 mediaType:mediaType
                                                                  position:AVCaptureDevicePositionUnspecified];
        for (AVCaptureDevice* d in session.devices) {
          if ([[d localizedName] isEqualToString:targetName]) {
            device = d;
            break;
          }
        }
        if (device) break;
      }
    }

    if (!device) {
      throw std::runtime_error("Device not found: " + deviceName);
    }

    // Map: (width, height, pixelFormat) -> (minFps, maxFps)
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

    for (AVCaptureDeviceFormat* fmt in device.formats) {
      CMVideoDimensions dims = CMVideoFormatDescriptionGetDimensions(fmt.formatDescription);
      int w = dims.width;
      int h = dims.height;

      // Get pixel format from format description
      OSType cvFormat = CMFormatDescriptionGetMediaSubType(fmt.formatDescription);
      AVPixelFormat pixFmt = cvPixelFormatToAV(cvFormat);

      for (AVFrameRateRange* range in fmt.videoSupportedFrameRateRanges) {
        double minFps = range.minFrameRate;
        double maxFps = range.maxFrameRate;

        ModeKey key{w, h, pixFmt};
        auto it = modeMap.find(key);
        if (it == modeMap.end()) {
          modeMap[key] = {minFps, maxFps};
        } else {
          if (minFps < it->second.first) it->second.first = minFps;
          if (maxFps > it->second.second) it->second.second = maxFps;
        }
      }
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

std::vector<AudioDeviceMode> enumerateAudioDeviceModes(const std::string& deviceName) {
  std::vector<AudioDeviceMode> modes;

  @autoreleasepool {
    NSString* targetName = [NSString stringWithUTF8String:deviceName.c_str()];

    // First try uniqueID lookup
    AVCaptureDevice* device = [AVCaptureDevice deviceWithUniqueID:targetName];

    // If not found, search by localizedName
    if (!device) {
      NSArray<AVCaptureDeviceType>* deviceTypes = @[
        AVCaptureDeviceTypeBuiltInMicrophone,
        AVCaptureDeviceTypeExternalUnknown
      ];
      for (AVMediaType mediaType in @[AVMediaTypeAudio, AVMediaTypeMuxed]) {
        AVCaptureDeviceDiscoverySession* session =
          [AVCaptureDeviceDiscoverySession discoverySessionWithDeviceTypes:deviceTypes
                                                                 mediaType:mediaType
                                                                  position:AVCaptureDevicePositionUnspecified];
        for (AVCaptureDevice* d in session.devices) {
          if ([[d localizedName] isEqualToString:targetName]) {
            device = d;
            break;
          }
        }
        if (device) break;
      }
    }

    if (!device) {
      throw std::runtime_error("Audio device not found: " + deviceName);
    }

    // Deduplicate using set of (sampleRate, channels, sampleFormat)
    std::set<std::tuple<int, int, int>> seen;

    for (AVCaptureDeviceFormat* fmt in device.formats) {
      CMFormatDescriptionRef desc = fmt.formatDescription;
      CMMediaType mediaType = CMFormatDescriptionGetMediaType(desc);

      if (mediaType != kCMMediaType_Audio) {
        continue;
      }

      const AudioStreamBasicDescription* asbd =
        CMAudioFormatDescriptionGetStreamBasicDescription(desc);

      if (!asbd) continue;

      int sampleRate = static_cast<int>(asbd->mSampleRate);
      int channels = static_cast<int>(asbd->mChannelsPerFrame);
      AVSampleFormat sampleFormat = AV_SAMPLE_FMT_NONE;

      if (asbd->mFormatID == kAudioFormatLinearPCM) {
        bool isFloat = (asbd->mFormatFlags & kAudioFormatFlagIsFloat) != 0;
        bool isSignedInt = (asbd->mFormatFlags & kAudioFormatFlagIsSignedInteger) != 0;
        int bitsPerChannel = static_cast<int>(asbd->mBitsPerChannel);

        if (isFloat && bitsPerChannel == 32) {
          sampleFormat = AV_SAMPLE_FMT_FLT;
        } else if (isFloat && bitsPerChannel == 64) {
          sampleFormat = AV_SAMPLE_FMT_DBL;
        } else if (isSignedInt && bitsPerChannel == 16) {
          sampleFormat = AV_SAMPLE_FMT_S16;
        } else if (isSignedInt && bitsPerChannel == 32) {
          sampleFormat = AV_SAMPLE_FMT_S32;
        } else if (!isSignedInt && !isFloat && bitsPerChannel == 8) {
          sampleFormat = AV_SAMPLE_FMT_U8;
        }
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

    // Sort: sampleRate desc, then channels desc
    std::sort(modes.begin(), modes.end(), [](const AudioDeviceMode& a, const AudioDeviceMode& b) {
      if (a.sampleRate != b.sampleRate) return a.sampleRate > b.sampleRate;
      return a.channels > b.channels;
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
