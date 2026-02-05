#include "gpu_texture.h"

extern "C" {
#include <libavutil/hwcontext_drm.h>
}

// DRM fourcc format codes - inline definitions to avoid libdrm header dependency
// These are stable kernel ABI and won't change
#ifndef DRM_FORMAT_ARGB8888
#define DRM_FORMAT_ARGB8888 0x34325241 // 'AR24'
#endif
#ifndef DRM_FORMAT_ABGR8888
#define DRM_FORMAT_ABGR8888 0x34324241 // 'AB24'
#endif
#ifndef DRM_FORMAT_XRGB8888
#define DRM_FORMAT_XRGB8888 0x34325258 // 'XR24'
#endif
#ifndef DRM_FORMAT_XBGR8888
#define DRM_FORMAT_XBGR8888 0x34324258 // 'XB24'
#endif
#ifndef DRM_FORMAT_BGRA8888
#define DRM_FORMAT_BGRA8888 0x41524742 // 'BGRA'
#endif
#ifndef DRM_FORMAT_RGBA8888
#define DRM_FORMAT_RGBA8888 0x41424752 // 'RGBA'
#endif

namespace ffmpeg {

// Convert AVPixelFormat to DRM fourcc format code
static uint32_t avPixFmtToDrmFormat(int avFormat) {
  switch (avFormat) {
    case AV_PIX_FMT_BGRA:
      return DRM_FORMAT_ARGB8888;
    case AV_PIX_FMT_RGBA:
      return DRM_FORMAT_ABGR8888;
    case AV_PIX_FMT_BGR0:
      return DRM_FORMAT_XRGB8888;
    case AV_PIX_FMT_RGB0:
      return DRM_FORMAT_XBGR8888;
    case AV_PIX_FMT_ARGB:
      return DRM_FORMAT_BGRA8888;
    case AV_PIX_FMT_ABGR:
      return DRM_FORMAT_RGBA8888;
    default:
      // Default to ARGB8888 (most common for Electron "bgra")
      return DRM_FORMAT_ARGB8888;
  }
}

/**
 * Import DMA-BUF as DRM PRIME frame (universal Linux implementation).
 *
 * Creates an AV_PIX_FMT_DRM_PRIME frame from DMA-BUF file descriptors.
 * This works on all Linux architectures (x64, ARM64, etc.).
 *
 * The returned frame can be mapped to VAAPI, Vulkan, or other hardware
 * formats using av_hwframe_map() if needed.
 *
 * @param frame         Pre-allocated AVFrame (via av_frame_alloc)
 * @param fds           File descriptors for each plane
 * @param strides       Stride (pitch) for each plane
 * @param offsets       Offset for each plane
 * @param sizes         Size for each plane
 * @param numPlanes     Number of planes (1-4)
 * @param width         Frame width in pixels
 * @param height        Frame height in pixels
 * @param modifier      DRM format modifier (from Electron nativePixmap.modifier)
 * @param swFormat      Software pixel format (AVPixelFormat)
 *
 * @return 0 on success, negative AVERROR on failure
 */
int importDmaBuf(AVFrame* frame, int* fds, int* strides, int* offsets, int* sizes,
                 int numPlanes, int width, int height, uint64_t modifier,
                 int swFormat) {
  if (!frame || !fds || !strides || !offsets || !sizes ||
      numPlanes <= 0 || numPlanes > 4) {
    return AVERROR(EINVAL);
  }

  // Convert AVPixelFormat to DRM format
  uint32_t drmFormat = avPixFmtToDrmFormat(swFormat);

  // Allocate DRM frame descriptor
  AVDRMFrameDescriptor* desc = (AVDRMFrameDescriptor*)av_mallocz(sizeof(AVDRMFrameDescriptor));
  if (!desc) {
    return AVERROR(ENOMEM);
  }

  // Single DMA-BUF object (all planes share the same fd)
  desc->nb_objects = 1;
  desc->objects[0].fd = fds[0];
  desc->objects[0].format_modifier = modifier;

  // Calculate total size from all planes
  size_t totalSize = 0;
  for (int i = 0; i < numPlanes; i++) {
    size_t planeEnd = offsets[i] + sizes[i];
    if (planeEnd > totalSize) {
      totalSize = planeEnd;
    }
  }
  desc->objects[0].size = totalSize;

  // Single layer with all planes
  desc->nb_layers = 1;
  desc->layers[0].format = drmFormat;
  desc->layers[0].nb_planes = numPlanes;

  for (int i = 0; i < numPlanes; i++) {
    desc->layers[0].planes[i].object_index = 0;
    desc->layers[0].planes[i].offset = offsets[i];
    desc->layers[0].planes[i].pitch = strides[i];
  }

  // Configure AVFrame
  frame->format = AV_PIX_FMT_DRM_PRIME;
  frame->width = width;
  frame->height = height;
  frame->data[0] = (uint8_t*)desc;

  // AVBufferRef for lifecycle management — frees descriptor when frame is freed
  // Note: We don't close the fd here as it's owned by Electron
  frame->buf[0] = av_buffer_create(
    (uint8_t*)desc, sizeof(AVDRMFrameDescriptor),
    [](void*, uint8_t* data) {
      av_free(data);
    },
    nullptr, 0);

  if (!frame->buf[0]) {
    av_free(desc);
    return AVERROR(ENOMEM);
  }

  return 0;
}

} // namespace ffmpeg
