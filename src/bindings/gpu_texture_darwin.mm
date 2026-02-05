#include "gpu_texture.h"
#import <IOSurface/IOSurface.h>
#import <CoreVideo/CoreVideo.h>

extern "C" {
#include <libavutil/hwcontext_videotoolbox.h>
}

namespace ffmpeg {

int importIOSurface(AVFrame* frame, const uint8_t* handleData, size_t handleSize,
                    AVBufferRef* hwFramesRef) {
  if (!frame || !handleData || handleSize < sizeof(IOSurfaceRef)) {
    return AVERROR(EINVAL);
  }

  // Extract IOSurfaceRef from buffer
  IOSurfaceRef ioSurface = *(IOSurfaceRef*)handleData;
  if (!ioSurface) {
    return AVERROR(EINVAL);
  }

  // Increment use count to keep the surface alive while we use it
  IOSurfaceIncrementUseCount(ioSurface);

  // Create CVPixelBuffer from IOSurface (zero-copy)
  CVPixelBufferRef pixelBuffer = NULL;
  CVReturn status = CVPixelBufferCreateWithIOSurface(
    kCFAllocatorDefault, ioSurface, NULL, &pixelBuffer);

  IOSurfaceDecrementUseCount(ioSurface);

  if (status != kCVReturnSuccess || !pixelBuffer) {
    return AVERROR(ENOMEM);
  }

  // Configure AVFrame
  frame->format = AV_PIX_FMT_VIDEOTOOLBOX;
  frame->width = (int)CVPixelBufferGetWidth(pixelBuffer);
  frame->height = (int)CVPixelBufferGetHeight(pixelBuffer);
  frame->data[3] = (uint8_t*)pixelBuffer;

  // AVBufferRef for lifecycle management — releases CVPixelBuffer when frame is freed
  frame->buf[0] = av_buffer_create(
    (uint8_t*)pixelBuffer, sizeof(CVPixelBufferRef),
    [](void*, uint8_t* data) {
      CVPixelBufferRelease((CVPixelBufferRef)data);
    },
    NULL, 0);

  if (!frame->buf[0]) {
    CVPixelBufferRelease(pixelBuffer);
    return AVERROR(ENOMEM);
  }

  // Set HW frames context
  if (hwFramesRef) {
    frame->hw_frames_ctx = av_buffer_ref(hwFramesRef);
    if (!frame->hw_frames_ctx) {
      av_buffer_unref(&frame->buf[0]);
      return AVERROR(ENOMEM);
    }
  }

  return 0;
}

} // namespace ffmpeg
