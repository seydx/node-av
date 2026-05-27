#include "gpu_texture.h"
#import <AppKit/AppKit.h>
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

int exportIOSurface(AVFrame* frame, uint8_t* outHandle, size_t outSize) {
  if (!frame || !outHandle || outSize < sizeof(IOSurfaceRef)) {
    return AVERROR(EINVAL);
  }

  // Only decoded VideoToolbox frames carry a CVPixelBuffer in data[3]
  if (frame->format != AV_PIX_FMT_VIDEOTOOLBOX || !frame->data[3]) {
    return AVERROR(EINVAL);
  }

  CVPixelBufferRef pixelBuffer = (CVPixelBufferRef)frame->data[3];
  IOSurfaceRef ioSurface = CVPixelBufferGetIOSurface(pixelBuffer);
  if (!ioSurface) {
    return AVERROR(EINVAL);
  }

  // The IOSurface remains owned by the frame's CVPixelBuffer. The caller must
  // keep the frame alive while using the handle
  *(IOSurfaceRef*)outHandle = ioSurface;
  return 0;
}

int importNSImage(AVFrame* frame, const uint8_t* handleData, size_t handleSize) {
  if (!frame || !handleData || handleSize < sizeof(NSImage*)) {
    return AVERROR(EINVAL);
  }

  NSImage* nsImage = *(NSImage* __unsafe_unretained *)handleData;
  if (!nsImage) {
    return AVERROR(EINVAL);
  }

  // Find NSBitmapImageRep for zero-copy pixel data access
  NSBitmapImageRep* bitmapRep = nil;
  for (NSImageRep* rep in [nsImage representations]) {
    if ([rep isKindOfClass:[NSBitmapImageRep class]]) {
      bitmapRep = (NSBitmapImageRep*)rep;
      break;
    }
  }
  if (!bitmapRep) {
    return AVERROR(ENOTSUP);
  }

  unsigned char* bitmapData = [bitmapRep bitmapData];
  if (!bitmapData) {
    return AVERROR(EINVAL);
  }

  int width = (int)[bitmapRep pixelsWide];
  int height = (int)[bitmapRep pixelsHigh];
  int bytesPerRow = (int)[bitmapRep bytesPerRow];
  int bitsPerPixel = (int)[bitmapRep bitsPerPixel];
  int samplesPerPixel = (int)[bitmapRep samplesPerPixel];
  NSBitmapFormat bitmapFormat = [bitmapRep bitmapFormat];
  BOOL hasAlpha = [bitmapRep hasAlpha];

  // Detect pixel format from NSBitmapImageRep properties
  AVPixelFormat pixFmt = AV_PIX_FMT_NONE;
  AVAlphaMode alphaMode = AVALPHA_MODE_UNSPECIFIED;

  if (bitsPerPixel == 32 && samplesPerPixel >= 3) {
    bool alphaFirst = (bitmapFormat & NSBitmapFormatAlphaFirst) != 0;
    bool alphaNonPremul = (bitmapFormat & NSBitmapFormatAlphaNonpremultiplied) != 0;

    if (hasAlpha) {
      alphaMode = alphaNonPremul ? AVALPHA_MODE_STRAIGHT : AVALPHA_MODE_PREMULTIPLIED;
    }
    pixFmt = alphaFirst ? AV_PIX_FMT_ARGB : AV_PIX_FMT_BGRA;
  } else if (bitsPerPixel == 24 && samplesPerPixel == 3) {
    pixFmt = AV_PIX_FMT_RGB24;
  }

  if (pixFmt == AV_PIX_FMT_NONE) {
    return AVERROR(ENOTSUP);
  }

  // Retain NSImage so bitmapData stays valid
  CFTypeRef retainedRef = CFRetain((__bridge CFTypeRef)nsImage);

  frame->format = pixFmt;
  frame->width = width;
  frame->height = height;
  frame->data[0] = bitmapData;
  frame->linesize[0] = bytesPerRow;
  if (alphaMode != AVALPHA_MODE_UNSPECIFIED) {
    frame->alpha_mode = alphaMode;
  }

  // AVBufferRef for lifecycle — releases NSImage when frame is freed
  frame->buf[0] = av_buffer_create(
    bitmapData, bytesPerRow * height,
    [](void* opaque, uint8_t*) { CFRelease((CFTypeRef)opaque); },
    (void*)retainedRef, AV_BUFFER_FLAG_READONLY);

  if (!frame->buf[0]) {
    CFRelease(retainedRef);
    frame->data[0] = NULL;
    frame->linesize[0] = 0;
    return AVERROR(ENOMEM);
  }

  return 0;
}

} // namespace ffmpeg
