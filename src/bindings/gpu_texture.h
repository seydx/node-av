#ifndef FFMPEG_GPU_TEXTURE_H
#define FFMPEG_GPU_TEXTURE_H

#include "common.h"

extern "C" {
#include <libavutil/frame.h>
#include <libavutil/hwcontext.h>
#include <libavutil/buffer.h>
}

namespace ffmpeg {

// macOS — available when __APPLE__ is defined
int importIOSurface(AVFrame* frame, const uint8_t* handleData, size_t handleSize,
                    AVBufferRef* hwFramesRef);
int importNSImage(AVFrame* frame, const uint8_t* handleData, size_t handleSize);

// Windows — available when _WIN32 is defined
int importD3D11Texture(AVFrame* frame, const uint8_t* handleData, size_t handleSize,
                       AVBufferRef* hwDeviceRef);

// Linux — available when __linux__ is defined
int importDmaBuf(AVFrame* frame, int* fds, int* strides, int* offsets, int* sizes,
                 int numPlanes, int width, int height, uint64_t modifier,
                 int swFormat);

} // namespace ffmpeg

#endif // FFMPEG_GPU_TEXTURE_H
