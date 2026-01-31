#ifdef __linux__

#include "device.h"
#include <algorithm>
#include <map>
#include <dirent.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <unistd.h>
#include <cstring>
#include <fstream>
#include <linux/videodev2.h>

namespace ffmpeg {

std::vector<DeviceInfo> enumerateDevices() {
  std::vector<DeviceInfo> devices;

  // Enumerate V4L2 video devices
  DIR* dir = opendir("/dev");
  if (dir) {
    struct dirent* entry;
    bool isFirstVideo = true;

    while ((entry = readdir(dir)) != nullptr) {
      // Look for video devices (video0, video1, etc.)
      if (strncmp(entry->d_name, "video", 5) == 0) {
        std::string devicePath = std::string("/dev/") + entry->d_name;

        int fd = open(devicePath.c_str(), O_RDONLY);
        if (fd >= 0) {
          struct v4l2_capability cap;
          if (ioctl(fd, VIDIOC_QUERYCAP, &cap) == 0) {
            // Check if it's a video capture device
            if (cap.device_caps & V4L2_CAP_VIDEO_CAPTURE) {
              DeviceInfo info;
              info.name = devicePath;
              info.description = std::string(reinterpret_cast<const char*>(cap.card));
              info.type = "video";
              info.isDefault = isFirstVideo;
              isFirstVideo = false;
              devices.push_back(info);
            }
          }
          close(fd);
        }
      }
    }
    closedir(dir);
  }

  // Enumerate ALSA audio devices by reading /proc/asound/cards
  std::ifstream cardsFile("/proc/asound/cards");
  if (cardsFile.is_open()) {
    std::string line;
    bool isFirstAudio = true;

    while (std::getline(cardsFile, line)) {
      // Parse lines like " 0 [PCH            ]: HDA-Intel - HDA Intel PCH"
      if (!line.empty() && line[0] == ' ' && isdigit(line[1])) {
        // Extract card number
        size_t pos = 1;
        while (pos < line.size() && isdigit(line[pos])) pos++;

        std::string cardNum = line.substr(1, pos - 1);

        // Find the description (after the colon)
        size_t colonPos = line.find(':');
        std::string description;
        if (colonPos != std::string::npos && colonPos + 2 < line.size()) {
          description = line.substr(colonPos + 2);
        } else {
          description = "Audio Card " + cardNum;
        }

        DeviceInfo info;
        info.name = "hw:" + cardNum;
        info.description = description;
        info.type = "audio";
        info.isDefault = isFirstAudio;
        isFirstAudio = false;
        devices.push_back(info);
      }
    }
    cardsFile.close();
  }

  // Also add default audio device if we found any cards
  bool hasAudioDevices = false;
  for (const auto& d : devices) {
    if (d.type == "audio") {
      hasAudioDevices = true;
      break;
    }
  }

  if (!hasAudioDevices) {
    // Add default as fallback
    DeviceInfo defaultAudio;
    defaultAudio.name = "default";
    defaultAudio.description = "Default Audio Device";
    defaultAudio.type = "audio";
    defaultAudio.isDefault = true;
    devices.push_back(defaultAudio);
  }

  return devices;
}

std::vector<DeviceMode> enumerateDeviceModes(const std::string& deviceName) {
  std::vector<DeviceMode> modes;

  int fd = open(deviceName.c_str(), O_RDONLY);
  if (fd < 0) {
    throw std::runtime_error("Failed to open device: " + deviceName);
  }

  struct ResKey {
    int w, h;
    bool operator<(const ResKey& o) const {
      return w != o.w ? w < o.w : h < o.h;
    }
  };
  std::map<ResKey, std::pair<double, double>> resMap;

  struct v4l2_frmsizeenum frmsize;
  memset(&frmsize, 0, sizeof(frmsize));
  frmsize.pixel_format = V4L2_PIX_FMT_YUYV;

  for (frmsize.index = 0; ioctl(fd, VIDIOC_ENUM_FRAMESIZES, &frmsize) == 0; frmsize.index++) {
    if (frmsize.type == V4L2_FRMSIZE_TYPE_DISCRETE) {
      int w = frmsize.discrete.width;
      int h = frmsize.discrete.height;

      struct v4l2_frmivalenum frmival;
      memset(&frmival, 0, sizeof(frmival));
      frmival.pixel_format = V4L2_PIX_FMT_YUYV;
      frmival.width = w;
      frmival.height = h;

      double minFps = 1e9, maxFps = 0;

      for (frmival.index = 0; ioctl(fd, VIDIOC_ENUM_FRAMEINTERVALS, &frmival) == 0; frmival.index++) {
        if (frmival.type == V4L2_FRMIVAL_TYPE_DISCRETE) {
          double fps = (double)frmival.discrete.denominator / (double)frmival.discrete.numerator;
          if (fps < minFps) minFps = fps;
          if (fps > maxFps) maxFps = fps;
        } else if (frmival.type == V4L2_FRMIVAL_TYPE_STEPWISE || frmival.type == V4L2_FRMIVAL_TYPE_CONTINUOUS) {
          double fpsMin = (double)frmival.stepwise.max.denominator / (double)frmival.stepwise.max.numerator;
          double fpsMax = (double)frmival.stepwise.min.denominator / (double)frmival.stepwise.min.numerator;
          if (fpsMin < minFps) minFps = fpsMin;
          if (fpsMax > maxFps) maxFps = fpsMax;
          break;
        }
      }

      if (maxFps > 0) {
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
  }

  close(fd);

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
  return "v4l2";
}

std::string getAudioInputFormat() {
  return "alsa";
}

std::string getScreenInputFormat() {
  return "xcbgrab";
}

bool hasScreenCapturePermission() {
  return true;
}

bool requestScreenCaptureAccess() {
  return true;
}

} // namespace ffmpeg

#endif // __linux__
