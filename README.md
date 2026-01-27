<p align="center">
  <img src="https://github.com/seydx/node-av/blob/main/docs/logo.png?raw=true" width="250px">
</p>

# NodeAV

[![npm version](https://img.shields.io/npm/v/node-av.svg)](https://www.npmjs.com/package/node-av)
[![npm downloads](https://img.shields.io/npm/dt/node-av.svg)](https://www.npmjs.com/package/node-av)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-8-green.svg)](https://ffmpeg.org)
[![Platform](https://img.shields.io/badge/platform-Windows%20(MSVC%20%7C%20MinGW)%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/seydx/node-av)

Native Node.js bindings for FFmpeg with full TypeScript support. Provides direct access to FFmpeg's C APIs through N-API. Includes both raw FFmpeg bindings for full control and higher-level abstractions. Automatic resource management via Disposable pattern, hardware acceleration support and prebuilt binaries for Windows, Linux, and macOS.

📚 **[Documentation](https://seydx.github.io/node-av)**

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Low-Level API](#low-level-api)
  - [High-Level API](#high-level-api)
  - [Pipeline API](#pipeline-api)
- [Key Features](#key-features)
- [Hardware Acceleration](#hardware-acceleration)
  - [Auto-Detection](#auto-detection)
  - [Specific Hardware](#specific-hardware)
- [Imports and Tree Shaking](#imports-and-tree-shaking)
- [Stream Processing](#stream-processing)
  - [From Files](#from-files)
  - [From Network](#from-network)
  - [From Buffers](#from-buffers)
  - [Raw Media Processing](#raw-media-processing)
- [Resource Management](#resource-management)
- [FFmpeg Binary Access](#ffmpeg-binary-access)
- [Performance](#performance)
  - [Benchmarks](#benchmarks)
  - [Sync vs Async Operations](#sync-vs-async-operations)
- [Memory Safety Considerations](#memory-safety-considerations)
- [Examples](#examples)
- [Prebuilt Binaries](#prebuilt-binaries)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Contributing](#contributing)
- [Support](#support)
- [See Also](#see-also)

## Installation

```bash
npm install node-av
```

## Quick Start

### Low-Level API

Direct access to FFmpeg's C APIs with minimal abstractions. Perfect when you need full control over FFmpeg functionality.

```typescript
import { AVERROR_EOF, AVMEDIA_TYPE_VIDEO } from 'node-av/constants';
import { Codec, CodecContext, FFmpegError, FormatContext, Frame, Packet, Rational } from 'node-av/lib';

// Open input file
await using ifmtCtx = new FormatContext();

let ret = await ifmtCtx.openInput('input.mp4');
FFmpegError.throwIfError(ret, 'Could not open input file');

ret = await ifmtCtx.findStreamInfo();
FFmpegError.throwIfError(ret, 'Could not find stream info');

// Find video stream
const videoStreamIndex = ifmtCtx.findBestStream(AVMEDIA_TYPE_VIDEO);
const videoStream = ifmtCtx.streams?.[videoStreamIndex];

if (!videoStream) {
  throw new Error('No video stream found');
}

// Create codec
const codec = Codec.findDecoder(videoStream.codecpar.codecId);
if (!codec) {
  throw new Error('Codec not found');
}

// Allocate codec context for the decoder
using decoderCtx = new CodecContext();
decoderCtx.allocContext3(codec);

ret = decoderCtx.parametersToContext(videoStream.codecpar);
FFmpegError.throwIfError(ret, 'Could not copy codec parameters to decoder context');

// Open decoder context
ret = await decoderCtx.open2(codec, null);
FFmpegError.throwIfError(ret, 'Could not open codec');

// Process packets
using packet = new Packet();
packet.alloc();

using frame = new Frame();
frame.alloc();

while (true) {
  let ret = await ifmtCtx.readFrame(packet);
  if (ret < 0) {
    break;
  }

  if (packet.streamIndex === videoStreamIndex) {
    // Send packet to decoder
    ret = await decoderCtx.sendPacket(packet);
    if (ret < 0 && ret !== AVERROR_EOF) {
      FFmpegError.throwIfError(ret, 'Error sending packet to decoder');
    }

    // Receive decoded frames
    while (true) {
      const ret = await decoderCtx.receiveFrame(frame);
      if (ret === AVERROR_EOF || ret < 0) {
        break;
      }

      console.log(`Decoded frame ${frame.pts}, size: ${frame.width}x${frame.height}`);

      // Process frame data...
    }
  }

  packet.unref();
}
```

### High-Level API

Higher-level abstractions for common tasks like decoding, encoding, filtering, and transcoding. Easier to use while still providing access to low-level details when needed.

```typescript
import { Decoder, Demuxer, Encoder, HardwareContext, Muxer } from 'node-av/api';
import { FF_ENCODER_LIBX264 } from 'node-av/constants';

// Open Demuxer
await using input = await Demuxer.open('input.mp4');

// Get video stream
const videoStream = input.video()!;

// Optional, setup hardware acceleration
using hw = HardwareContext.auto();

// Create decoder
using decoder = await Decoder.create(videoStream, {
  hardware: hw, // Optional, use hardware acceleration if available
});

// Create encoder
using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
  decoder, // Optional, copy settings from decoder
});

// Open Muxer
await using output = await Muxer.open('output.mp4', {
  input, // Optional, used to copy global headers and metadata
});

// Add stream to output
const outputIndex = output.addStream(encoder, {
  inputStream: videoStream, // Optional, copy settings from input stream
});

// Create processing generators
const inputGenerator = input.packets(videoStream.index);
const decoderGenerator = decoder.frames(inputGenerator);
const encoderGenerator = encoder.packets(decoderGenerator);

// Process packets
for await (using packet of encoderGenerator) {
  await output.writePacket(packet, outputIndex);
}

// Done
```

### Pipeline API

A simple way to chain together multiple processing steps like decoding, filtering, encoding, and muxing.

```typescript
import { Decoder, Demuxer, Encoder, HardwareContext, Muxer, pipeline } from 'node-av/api';
import { FF_ENCODER_LIBX264 } from 'node-av/constants';

// Simple transcode pipeline: input → decoder → encoder → output

// Open Demuxer
await using input = await Demuxer.open('input.mp4');

// Get video stream
const videoStream = input.video()!;

// Optional, setup hardware acceleration
using hw = HardwareContext.auto();

// Create decoder
using decoder = await Decoder.create(videoStream, {
  hardware: hw, // Optional, use hardware acceleration if available
});

// Create encoder
using encoder = await Encoder.create(FF_ENCODER_LIBX264, {
  decoder, // Optional, copy settings from decoder
});

// Open Muxer
await using output = await Muxer.open('output.mp4', {
  input, // Optional, used to copy global headers and metadata
});

const control = pipeline(input, decoder, encoder, output);
await control.completion;
```

## Key Features

Beyond basic transcoding, NodeAV provides advanced media processing capabilities:

**Speech Recognition with Whisper**
Integrate automatic speech-to-text transcription using OpenAI's Whisper model through the whisper.cpp implementation. The library handles automatic model downloading from HuggingFace, supports multiple model sizes (tiny, base, small, medium, large) for different accuracy/performance tradeoffs, and provides hardware-accelerated inference through Metal (macOS), Vulkan (cross-platform), or OpenCL backends. Transcription results include precise timestamps and can be processed in real-time from any audio source.

**Advanced Video Filtering with FilterComplexAPI**
Build sophisticated video processing pipelines using FFmpeg's complete filter ecosystem. The FilterComplexAPI provides direct access to complex filtergraphs with multiple inputs and outputs, enabling advanced operations like picture-in-picture overlays, multi-stream composition (side-by-side, grid layouts), real-time video effects, and custom processing chains. All filters support hardware acceleration where available, and filter configurations can be dynamically constructed based on runtime requirements.

**Browser Streaming**
Stream any media source directly to web browsers through fragmented MP4 (fMP4) or WebRTC protocols. The library can process inputs from RTSP cameras, local files, network streams, or custom sources and package them for browser consumption with minimal latency. Complete examples demonstrate both Media Source Extensions (MSE) based playback for on-demand content and WebRTC integration for real-time streaming scenarios.

**RTSP Backchannel / Talkback**
Implements bidirectional RTSP communication for IP camera integration. The library provides native support for RTSP backchannel streams, enabling audio transmission to camera devices. Transport is handled automatically with support for both TCP (interleaved mode) and UDP protocols, with proper RTP packet formatting and stream synchronization.

See the [Examples](#examples) section for complete implementations.

## Hardware Acceleration

The library supports all hardware acceleration methods available in FFmpeg. The specific hardware types available depend on your FFmpeg build and system configuration.

### Auto-Detection

```typescript
import { HardwareContext } from 'node-av/api';
import { FF_ENCODER_LIBX264 } from 'node-av/constants';

// Automatically detect best available hardware
const hw = HardwareContext.auto();
console.log(`Using hardware: ${hw.deviceTypeName}`);

// Use with decoder
const decoder = await Decoder.create(stream, {
  hardware: hw
});

// Use with encoder (use hardware-specific codec)
const encoderCodec = hw?.getEncoderCodec('h264') ?? FF_ENCODER_LIBX264;
const encoder = await Encoder.create(encoderCodec, {
  decoder,
});
```

### Specific Hardware

```typescript
import { AV_HWDEVICE_TYPE_CUDA, AV_HWDEVICE_TYPE_VAAPI } from 'node-av/constants';

// Use specific hardware type
const cuda = HardwareContext.create(AV_HWDEVICE_TYPE_CUDA);
const vaapi = HardwareContext.create(AV_HWDEVICE_TYPE_VAAPI, '/dev/dri/renderD128');
```

## Imports and Tree Shaking

The library provides multiple entry points for optimal tree shaking:

```typescript
// High-Level API only - Recommended for most use cases
import { Muxer, Muxer, Decoder, Encoder } from 'node-av/api';

// Low-Level API only - Direct FFmpeg bindings
import { FormatContext, CodecContext, Frame, Packet } from 'node-av/lib';

// Constants only - When you just need FFmpeg constants
import { AV_PIX_FMT_YUV420P, AV_CODEC_ID_H264 } from 'node-av/constants';

// Channel layouts only - For audio channel configurations
import { AV_CHANNEL_LAYOUT_STEREO, AV_CHANNEL_LAYOUT_5POINT1 } from 'node-av/layouts';

// Default export - Includes everything
import * as ffmpeg from 'node-av';
```

## Stream Processing

### From Files or Network

```typescript
const media = await Muxer.open('input.mp4');

// or

const media = await Muxer.open('rtsp://example.com/stream');
```

### From Buffers

```typescript
import { readFile } from 'fs/promises';

const buffer = await readFile('input.mp4');
const media = await Muxer.open(buffer);
```

### Custom I/O Callbacks

```typescript
import type { IOInputCallbacks, IOOutputCallbacks } from 'node-av/api';

// Custom input source
const inputCallbacks: IOInputCallbacks = {
  read: (size: number) => {
    // Read from your custom source
    return buffer; // or null for EOF
  },
  seek: (offset: bigint, whence: number) => {
    // Seek in your custom source
    return newPosition;
  }
};

await using input = await Muxer.open(inputCallbacks, {
  format: 'mp4'
});
```

### Raw Media Processing

```typescript
// Raw video input
const rawVideo = await Muxer.open({
  type: 'video',
  input: 'input.yuv',
  width: 1280,
  height: 720,
  pixelFormat: AV_PIX_FMT_YUV420P,
  frameRate: { num: 30, den: 1 }
});

// Raw audio input
const rawAudio = await Muxer.open({
  type: 'audio',
  input: 'input.pcm',
  sampleRate: 48000,
  channels: 2,
  sampleFormat: AV_SAMPLE_FMT_S16
}, {
  format: 's16le'
});
```

## Resource Management

The library supports automatic resource cleanup using the Disposable pattern:

```typescript
// Automatic cleanup with 'using'
{
  await using media = await Muxer.open('input.mp4');
  using decoder = await Decoder.create(media.video());
  // Resources automatically cleaned up at end of scope
}

// Manual cleanup
const media = await Muxer.open('input.mp4');
try {
  // Process media
} finally {
  await media.close();
}
```

## FFmpeg Binary Access

Need direct access to the FFmpeg binary? The library provides an easy way to get FFmpeg binaries that automatically downloads and manages platform-specific builds.

```typescript
import { ffmpegPath, isFfmpegAvailable } from 'node-av/ffmpeg';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Check if FFmpeg binary is available
if (isFfmpegAvailable()) {
  console.log('FFmpeg binary found at:', ffmpegPath());

  // Use FFmpeg binary directly
  const { stdout } = await execFileAsync(ffmpegPath(), ['-version']);
  console.log(stdout);
} else {
  console.log('FFmpeg binary not available - install may have failed');
}

// Direct usage example
async function convertVideo(input: string, output: string) {
  const args = [
    '-i', input,
    '-c:v', 'libx264',
    '-crf', '23',
    '-c:a', 'aac',
    output
  ];

  await execFileAsync(ffmpegPath(), args);
}
```

The FFmpeg binary is automatically downloaded during installation from GitHub releases and matches the same build used by the native bindings.

## Performance

NodeAV executes all media operations directly through FFmpeg's native C libraries. The Node.js bindings add minimal overhead - mostly just the JavaScript-to-C boundary crossings. During typical operations like transcoding or filtering, most processing time is spent in FFmpeg's optimized C code.

### Benchmarks

Performance comparison with FFmpeg CLI (4K 60fps, 30s test files on Apple M3 Max):

| Operation | FFmpeg CLI (FPS) | node-av (FPS) | FFmpeg CLI (Time) | node-av (Time) | Diff |
|-----------|------------------|---------------|-------------------|----------------|------|
| SW H.264 Transcode | 96 fps | 96 fps | 18.7s | 18.7s | ≈0% |
| SW H.265 Transcode | 40 fps | 41 fps | 44.5s | 43.7s | **+1.5%** |
| HW H.264 Transcode | 55 fps | 55 fps | 33.0s | 32.8s | **+0.5%** |
| Stream Copy (Remux) | 48k fps | 31k fps | 38ms | 106ms | -35% |

**Memory Usage:**
| Operation | FFmpeg CLI | node-av | Difference |
|-----------|-----------|---------|------------|
| H.264 Transcode (4K) | 3.6 GB | 3.4 GB | **-5%** |
| Stream Copy | 28 MB | 1 MB | **-96%** |

📊 **[Full benchmark results](https://github.com/seydx/node-av/tree/main/BENCHMARK.md)**

### Sync vs Async Operations

Every async method in NodeAV has a corresponding synchronous variant with the `Sync` suffix:

- **Async methods** (default) - Non-blocking operations using N-API's AsyncWorker. Methods like `decode()`, `encode()`, `read()`, `packets()` return Promises or AsyncGenerators.

- **Sync methods** - Direct FFmpeg calls without AsyncWorker overhead. Same methods with `Sync` suffix: `decodeSync()`, `encodeSync()`, `readSync()`, `packetsSync()`.

The key difference: Async methods don't block the Node.js event loop, allowing other operations to run concurrently. Sync methods block until completion but avoid AsyncWorker overhead, making them faster for sequential processing.

## Memory Safety Considerations

NodeAV provides direct bindings to FFmpeg's C APIs, which work with raw memory pointers. The high-level API adds safety abstractions and automatic resource management, but incorrect usage can still cause crashes. Common issues include mismatched video dimensions, incompatible pixel formats, or improper frame buffer handling. The library validates parameters where possible, but can't guarantee complete memory safety without limiting functionality. When using the low-level API, pay attention to parameter consistency, resource cleanup, and format compatibility. Following the documented patterns helps avoid memory-related issues.

## Examples

| Example | FFmpeg | Low-Level API | High-Level API |
|---------|--------|---------------|----------------|
| `browser-fmp4` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/browser/fmp4) |
| `browser-webrtc` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/browser/webrtc) |
| `api-dash` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-dash.ts) |
| `api-encode-decode` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-encode-decode.ts) |
| `api-filter-complex` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-filter-complex.ts) |
| `api-filter-complex-grid` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-filter-complex-grid.ts) |
| `api-fmp4` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-fmp4.ts) |
| `api-frame-extract` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-frame-extract.ts) |
| `api-hw-codecs` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-hw-codecs.ts) |
| `api-hw-decode-sw-encode` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-hw-decode-sw-encode.ts) |
| `api-hw-raw` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-hw-raw.ts) |
| `api-hw-raw-output` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-hw-raw-output.ts) |
| `api-hw-rtsp` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-hw-rtsp.ts) |
| `api-hw-stream-custom-io` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-hw-stream-custom-io.ts) |
| `api-hw-transcode` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-hw-transcode.ts) |
| `api-hw-filter-sync` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-hw-filter-sync.ts) |
| `api-muxing` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-muxing.ts) |
| `api-pipeline-hw-rtsp` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-pipeline-hw-rtsp.ts) |
| `api-pipeline-raw-muxing` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-pipeline-raw-muxing.ts) |
| `api-rtp` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-rtp.ts) |
| `api-sdp-custom` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-sdp-custom.ts) |
| `api-sdp-input` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-sdp-input.ts) |
| `api-stream-input` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-stream-input.ts) |
| `api-sw-decode-hw-encode` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-sw-decode-hw-encode.ts) |
| `api-sw-transcode` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-sw-transcode.ts) |
| `api-whisper-subtitles` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-whisper-subtitles.ts) |
| `api-whisper-transcribe` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-whisper-transcribe.ts) |
| `frame-utils` | | [✓](https://github.com/seydx/node-av/tree/main/examples/frame-utils.ts) | |
| `avio-read-callback` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/avio_read_callback.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/avio-read-callback.ts) | |
| `avio-async-read-callback` | | [✓](https://github.com/seydx/node-av/tree/main/examples/avio-async-read-callback.ts) | |
| `decode-audio` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/decode_audio.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/decode-audio.ts) | |
| `decode-filter-audio` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/decode_filter_audio.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/decode-filter-audio.ts) | |
| `decode-filter-video` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/decode_filter_video.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/decode-filter-video.ts) | |
| `decode-video` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/decode_video.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/decode-video.ts) | |
| `demux-decode` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/demux_decode.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/demux-decode.ts) | |
| `encode-audio` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/encode_audio.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/encode-audio.ts) | |
| `encode-video` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/encode_video.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/encode-video.ts) | |
| `ffprobe-metadata` | | [✓](https://github.com/seydx/node-av/tree/main/examples/ffprobe-metadata.ts) | |
| `filter-audio` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/filter_audio.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/filter-audio.ts) | |
| `hw-decode` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/hw_decode.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/hw-decode.ts) | |
| `hw-encode` | | [✓](https://github.com/seydx/node-av/tree/main/examples/hw-encode.ts) | |
| `hw-transcode` | | [✓](https://github.com/seydx/node-av/tree/main/examples/hw-transcode.ts) | |
| `qsv-decode` | [✓](https://github.com/FFmpeg/FFmpeg/blob/master/doc/examples/qsv_decode.c) | | |
| `qsv-transcode` | [✓](https://github.com/FFmpeg/FFmpeg/blob/master/doc/examples/qsv_transcode.c) | | |
| `vaapi-encode` | [✓](https://github.com/FFmpeg/FFmpeg/blob/master/doc/examples/vaapi_encode.c) | | |
| `vaapi-transcode` | [✓](https://github.com/FFmpeg/FFmpeg/blob/master/doc/examples/vaapi_transcode.c) | | |
| `mux` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/mux.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/mux.ts) | |
| `remux` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/remux.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/remux.ts) | |
| `resample-audio` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/resample_audio.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/resample-audio.ts) | |
| `rtsp-stream-info` | | [✓](https://github.com/seydx/node-av/tree/main/examples/rtsp-stream-info.ts) | |
| `scale-video` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/scale_video.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/scale-video.ts) | |
| `show-metadata` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/show_metadata.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/show-metadata.ts) | |
| `transcode-aac` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/transcode_aac.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/transcode-aac.ts) | |
| `transcode` | [✓](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples/transcode.c) | [✓](https://github.com/seydx/node-av/tree/main/examples/transcode.ts) | |


## Prebuilt Binaries

Prebuilt binaries are available for multiple platforms:

- **macOS**: x64, ARM64
- **Linux**: x64, ARM64
- **Windows**: x64, ARM64 (automatic MSVC/MinGW selection)

## Troubleshooting

### Hardware Acceleration on Linux (Intel/VAAPI)

For hardware-accelerated video processing with Intel GPUs on Linux, you need to install specific system packages. The FFmpeg binaries included with this library are built with **libva 2.20**, which requires **Ubuntu 24.04+** or **Debian 13+** as minimum OS versions.

#### Installation Steps

1. **Add Kisak-Mesa PPA** (recommended for newer Mesa versions with better hardware support):

```bash
sudo add-apt-repository ppa:kisak/kisak-mesa
sudo apt update
```

2. **Install required packages**:

```bash
sudo apt install libmfx-gen1.2 mesa-va-drivers mesa-vulkan-drivers libva2 libva-drm2 vainfo libvulkan1 vulkan-tools
```

After installation, verify hardware acceleration is working:

```bash
# Check VAAPI support
vainfo

# Check Vulkan support
vulkaninfo

# Should show available profiles and entrypoints for your Intel GPU
```

**Note**: If you're running an older Ubuntu version (< 24.04) or Debian version (< 13), you'll need to upgrade your OS to use hardware acceleration with this library.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

**Important**: FFmpeg itself is licensed under LGPL/GPL. Please ensure compliance with FFmpeg's license terms when using this library. The FFmpeg libraries themselves retain their original licenses, and this wrapper library does not change those terms. See [FFmpeg License](https://ffmpeg.org/legal.html) for details.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](https://github.com/seydx/node-av/tree/main/CONTRIBUTING.md) for development setup, code standards, and contribution guidelines before submitting pull requests.

## Support

For issues and questions, please use the GitHub issue tracker.

## See Also

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [FFmpeg Doxygen](https://ffmpeg.org/doxygen/trunk/)
- [Jellyfin FFmpeg](https://github.com/seydx/jellyfin-ffmpeg)
- [FFmpeg MSVC](https://github.com/seydx/ffmpeg-msvc-prebuilt)
