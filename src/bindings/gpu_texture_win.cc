#include "gpu_texture.h"
#include <d3d11_1.h>

extern "C" {
#include <libavutil/hwcontext_d3d11va.h>
}

namespace ffmpeg {

int importD3D11Texture(AVFrame* frame, const uint8_t* handleData, size_t handleSize,
                       AVBufferRef* hwDeviceRef) {
  if (!frame || !handleData || handleSize < sizeof(HANDLE) || !hwDeviceRef) {
    return AVERROR(EINVAL);
  }

  HANDLE ntHandle = *(HANDLE*)handleData;
  if (!ntHandle) {
    return AVERROR(EINVAL);
  }

  // Extract D3D11 device from HW device context
  AVHWDeviceContext* deviceCtx = (AVHWDeviceContext*)hwDeviceRef->data;
  AVD3D11VADeviceContext* d3d11Ctx = (AVD3D11VADeviceContext*)deviceCtx->hwctx;
  ID3D11Device* device = d3d11Ctx->device;

  // Query ID3D11Device1 for OpenSharedResource1
  ID3D11Device1* device1 = NULL;
  HRESULT hr = device->QueryInterface(__uuidof(ID3D11Device1), (void**)&device1);
  if (FAILED(hr) || !device1) {
    return AVERROR(EIO);
  }

  // Open the shared texture
  ID3D11Texture2D* texture = NULL;
  hr = device1->OpenSharedResource1(ntHandle, __uuidof(ID3D11Texture2D),
                                     (void**)&texture);
  device1->Release();
  if (FAILED(hr) || !texture) {
    return AVERROR(EIO);
  }

  // Get texture description for dimensions
  D3D11_TEXTURE2D_DESC desc;
  texture->GetDesc(&desc);

  // Release any texture a previous import left on this frame - otherwise
  // re-importing into the same frame overwrites buf[0] and leaks the prior
  // texture's COM reference (NULL-safe).
  av_buffer_unref(&frame->buf[0]);

  // Configure AVFrame
  frame->format = AV_PIX_FMT_D3D11;
  frame->width = desc.Width;
  frame->height = desc.Height;
  frame->data[0] = (uint8_t*)texture;
  frame->data[1] = (uint8_t*)(intptr_t)0; // array index

  // AVBufferRef for lifecycle management — releases texture when frame is freed
  frame->buf[0] = av_buffer_create(
    (uint8_t*)texture, sizeof(ID3D11Texture2D*),
    [](void*, uint8_t* data) {
      ((ID3D11Texture2D*)data)->Release();
    },
    NULL, 0);

  if (!frame->buf[0]) {
    texture->Release();
    return AVERROR(ENOMEM);
  }

  // Set HW device context (D3D11 uses device ctx, not frames ctx for imported textures)
  if (hwDeviceRef) {
    frame->hw_frames_ctx = NULL; // Will be set by caller if needed
  }

  return 0;
}

} // namespace ffmpeg
