#ifdef __linux__

#include "device.h"
#include <algorithm>
#include <map>
#include <set>
#include <tuple>
#include <dirent.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <unistd.h>
#include <cstring>
#include <fstream>
#include <linux/videodev2.h>

#include <alsa/asoundlib.h>
#include <X11/Xlib.h>
#include <X11/extensions/Xrandr.h>

// Suppress ALSA's own stderr error messages.
// FFmpeg handles ALSA errors through its own logging system (av_log),
// so the raw ALSA messages are redundant noise for the end user.
static void alsa_error_handler(const char*, int, const char*, int, const char*, ...) {}

static struct AlsaSilencer {
  AlsaSilencer() { snd_lib_error_set_handler(alsa_error_handler); }
} alsa_silencer;

namespace ffmpeg {

// V4L2 fourcc → FFmpeg AVPixelFormat
static AVPixelFormat v4l2FormatToAV(uint32_t fourcc) {
  switch (fourcc) {
    case V4L2_PIX_FMT_YUYV:    return AV_PIX_FMT_YUYV422;
    case V4L2_PIX_FMT_UYVY:    return AV_PIX_FMT_UYVY422;
    case V4L2_PIX_FMT_YUV420:  return AV_PIX_FMT_YUV420P;
    case V4L2_PIX_FMT_YVU420:  return AV_PIX_FMT_YUV420P;
    case V4L2_PIX_FMT_NV12:    return AV_PIX_FMT_NV12;
    case V4L2_PIX_FMT_NV21:    return AV_PIX_FMT_NV21;
    case V4L2_PIX_FMT_RGB24:   return AV_PIX_FMT_RGB24;
    case V4L2_PIX_FMT_BGR24:   return AV_PIX_FMT_BGR24;
    case V4L2_PIX_FMT_RGB32:   return AV_PIX_FMT_RGBA;
    case V4L2_PIX_FMT_BGR32:   return AV_PIX_FMT_BGRA;
    case V4L2_PIX_FMT_GREY:    return AV_PIX_FMT_GRAY8;
    default:                   return AV_PIX_FMT_NONE;
  }
}

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

        // Check if this card has capture capability (pcm*c entries)
        bool hasCapture = false;
        std::string cardDir = "/proc/asound/card" + cardNum;
        DIR* cardDirHandle = opendir(cardDir.c_str());
        if (cardDirHandle) {
          struct dirent* cardEntry;
          while ((cardEntry = readdir(cardDirHandle)) != nullptr) {
            std::string entryName(cardEntry->d_name);
            if (entryName.size() >= 4 && entryName.substr(0, 3) == "pcm" && entryName.back() == 'c') {
              hasCapture = true;
              break;
            }
          }
          closedir(cardDirHandle);
        }
        if (!hasCapture) continue;

        // Verify the device can actually be opened for capture.
        // The pcm*c check only confirms the driver supports capture,
        // not that hardware (e.g., a microphone) is connected.
        std::string probeName = "hw:" + cardNum;
        snd_pcm_t* probeHandle = nullptr;
        int probeRet = snd_pcm_open(&probeHandle, probeName.c_str(), SND_PCM_STREAM_CAPTURE, SND_PCM_NONBLOCK);
        if (probeRet < 0) continue;
        snd_pcm_close(probeHandle);

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

  // Enumerate screen/display devices
  const char* waylandDisplay = getenv("WAYLAND_DISPLAY");
  const char* x11Display = getenv("DISPLAY");

  if (x11Display) {
    Display* dpy = XOpenDisplay(x11Display);
    if (dpy) {
      int screen = DefaultScreen(dpy);
      XRRScreenResources* res = XRRGetScreenResources(dpy, RootWindow(dpy, screen));
      if (res) {
        bool isFirst = true;
        for (int c = 0; c < res->ncrtc; c++) {
          XRRCrtcInfo* crtc = XRRGetCrtcInfo(dpy, res, res->crtcs[c]);
          if (crtc && crtc->width > 0 && crtc->height > 0) {
            DeviceInfo info;
            info.type = "screen";
            info.isDefault = isFirst;
            isFirst = false;
            info.name = std::string(x11Display);

            // Try to get output name for description
            std::string outputName = "Display " + std::to_string(c);
            if (crtc->noutput > 0) {
              XRROutputInfo* output = XRRGetOutputInfo(dpy, res, crtc->outputs[0]);
              if (output) {
                if (output->name) {
                  outputName = std::string(output->name);
                }
                XRRFreeOutputInfo(output);
              }
            }
            info.description = outputName;

            info.screenX = crtc->x;
            info.screenY = crtc->y;
            info.screenWidth = static_cast<int>(crtc->width);
            info.screenHeight = static_cast<int>(crtc->height);

            devices.push_back(info);
          }
          if (crtc) XRRFreeCrtcInfo(crtc);
        }
        XRRFreeScreenResources(res);
      }
      XCloseDisplay(dpy);
    }
  } else if (waylandDisplay) {
    // Wayland fallback: single display without bounds
    DeviceInfo info;
    info.name = "default";
    info.description = "Wayland Display";
    info.type = "screen";
    info.isDefault = true;
    devices.push_back(info);
  }

  return devices;
}

std::vector<DeviceMode> enumerateDeviceModes(const std::string& deviceName) {
  std::vector<DeviceMode> modes;

  int fd = open(deviceName.c_str(), O_RDONLY);
  if (fd < 0) {
    throw std::runtime_error("Failed to open device: " + deviceName);
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

  // Iterate over all supported pixel formats
  struct v4l2_fmtdesc fmt;
  memset(&fmt, 0, sizeof(fmt));
  fmt.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;

  for (fmt.index = 0; ioctl(fd, VIDIOC_ENUM_FMT, &fmt) == 0; fmt.index++) {
    AVPixelFormat pixFmt = v4l2FormatToAV(fmt.pixelformat);

    struct v4l2_frmsizeenum frmsize;
    memset(&frmsize, 0, sizeof(frmsize));
    frmsize.pixel_format = fmt.pixelformat;

    for (frmsize.index = 0; ioctl(fd, VIDIOC_ENUM_FRAMESIZES, &frmsize) == 0; frmsize.index++) {
      if (frmsize.type == V4L2_FRMSIZE_TYPE_DISCRETE) {
        int w = frmsize.discrete.width;
        int h = frmsize.discrete.height;

        struct v4l2_frmivalenum frmival;
        memset(&frmival, 0, sizeof(frmival));
        frmival.pixel_format = fmt.pixelformat;
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
    }
  }

  close(fd);

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

  snd_pcm_t* pcm = nullptr;
  snd_pcm_hw_params_t* params = nullptr;

  int err = snd_pcm_open(&pcm, deviceName.c_str(), SND_PCM_STREAM_CAPTURE, SND_PCM_NONBLOCK);
  if (err < 0) {
    throw std::runtime_error("Failed to open ALSA device: " + deviceName + " (" + snd_strerror(err) + ")");
  }

  snd_pcm_hw_params_malloc(&params);
  snd_pcm_hw_params_any(pcm, params);

  // Collect supported sample rates
  static const unsigned testRates[] = {8000, 11025, 16000, 22050, 44100, 48000, 88200, 96000, 176400, 192000};
  std::vector<int> supportedRates;
  for (unsigned rate : testRates) {
    if (snd_pcm_hw_params_test_rate(pcm, params, rate, 0) == 0) {
      supportedRates.push_back(static_cast<int>(rate));
    }
  }

  // Collect supported channel counts
  static const unsigned testChannels[] = {1, 2, 4, 6, 8};
  std::vector<int> supportedChannels;
  for (unsigned ch : testChannels) {
    if (snd_pcm_hw_params_test_channels(pcm, params, ch) == 0) {
      supportedChannels.push_back(static_cast<int>(ch));
    }
  }

  // ALSA format → AVSampleFormat mapping
  struct FormatMapping {
    snd_pcm_format_t alsaFormat;
    AVSampleFormat avFormat;
  };
  static const FormatMapping formatMap[] = {
    {SND_PCM_FORMAT_U8, AV_SAMPLE_FMT_U8},
    {SND_PCM_FORMAT_S16_LE, AV_SAMPLE_FMT_S16},
    {SND_PCM_FORMAT_S32_LE, AV_SAMPLE_FMT_S32},
    {SND_PCM_FORMAT_FLOAT_LE, AV_SAMPLE_FMT_FLT},
    {SND_PCM_FORMAT_FLOAT64_LE, AV_SAMPLE_FMT_DBL},
  };

  std::vector<AVSampleFormat> supportedFormats;
  for (const auto& fm : formatMap) {
    if (snd_pcm_hw_params_test_format(pcm, params, fm.alsaFormat) == 0) {
      supportedFormats.push_back(fm.avFormat);
    }
  }

  snd_pcm_hw_params_free(params);
  snd_pcm_close(pcm);

  // Build all (rate, channels, format) combinations
  std::set<std::tuple<int, int, int>> seen;
  for (int rate : supportedRates) {
    for (int ch : supportedChannels) {
      for (AVSampleFormat fmt : supportedFormats) {
        auto key = std::make_tuple(rate, ch, static_cast<int>(fmt));
        if (seen.insert(key).second) {
          AudioDeviceMode mode;
          mode.sampleRate = rate;
          mode.channels = ch;
          mode.sampleFormat = fmt;
          modes.push_back(mode);
        }
      }
    }
  }

  // Sort: sampleRate desc, then channels desc
  std::sort(modes.begin(), modes.end(), [](const AudioDeviceMode& a, const AudioDeviceMode& b) {
    if (a.sampleRate != b.sampleRate) return a.sampleRate > b.sampleRate;
    return a.channels > b.channels;
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
  return "x11grab";
}

bool hasScreenCapturePermission() {
  return true;
}

bool requestScreenCaptureAccess() {
  return true;
}

} // namespace ffmpeg

#endif // __linux__
