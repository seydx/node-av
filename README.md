<p align="center">
  <img src="https://github.com/seydx/node-av/blob/main/docs/logo.png?raw=true" width="250px">
</p>

# NodeAV

[![npm version](https://img.shields.io/npm/v/node-av.svg)](https://www.npmjs.com/package/node-av)
[![npm downloads](https://img.shields.io/npm/dt/node-av.svg)](https://www.npmjs.com/package/node-av)
[![Socket Badge](https://badge.socket.dev/npm/package/node-av/6.0.0)](https://socket.dev/npm/package/node-av)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-8.1.1-green.svg)](https://ffmpeg.org)
[![Platform](https://img.shields.io/badge/platform-Windows%20(MSVC)%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/seydx/node-av)

Native Node.js bindings for FFmpeg with full TypeScript support - including type-safe options (autocomplete + validation) for every codec, format, filter, and bitstream filter, generated from FFmpeg's own metadata. Provides direct access to FFmpeg's C APIs through N-API. Includes both raw FFmpeg bindings for full control and higher-level abstractions. Automatic resource management via Disposable pattern, hardware acceleration support and prebuilt binaries for Windows, Linux, and macOS.

📚 **[Documentation](https://seydx.github.io/node-av)**

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Low-Level API](#low-level-api)
  - [High-Level API](#high-level-api)
  - [Pipeline API](#pipeline-api)
- [Hardware Acceleration](#hardware-acceleration)
  - [Auto-Detection](#auto-detection)
  - [Specific Hardware](#specific-hardware)
- [Stream Processing](#stream-processing)
  - [From Files or Network](#from-files-or-network)
  - [From Buffers](#from-buffers)
  - [Raw Media Processing](#raw-media-processing)
- [Device Capture](#device-capture)
- [FFmpeg Binary Access](#ffmpeg-binary-access)
- [Resource Management](#resource-management)
- [Imports and Tree Shaking](#imports-and-tree-shaking)
- [Key Features](#key-features)
- [Performance](#performance)
  - [Benchmarks](#benchmarks)
  - [Sync vs Async Operations](#sync-vs-async-operations)
- [Memory Safety Considerations](#memory-safety-considerations)
- [Electron](#electron)
- [Examples](#examples)
- [Prebuilt Binaries](#prebuilt-binaries)
  - [Cross-Platform Packaging (CI/CD)](#cross-platform-packaging-cicd)
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

      frame.unref();
    }
  }

  packet.unref();
}

// Flush the decoder - codecs buffer frames internally (B-frames, threading),
// so the last frames only come out after signaling EOF with a null packet.
ret = await decoderCtx.sendPacket(null);
if (ret < 0 && ret !== AVERROR_EOF) {
  FFmpegError.throwIfError(ret, 'Failed to flush decoder');
}

while (true) {
  const ret = await decoderCtx.receiveFrame(frame);
  if (ret === AVERROR_EOF || ret < 0) {
    break;
  }

  console.log(`Decoded frame ${frame.pts}, size: ${frame.width}x${frame.height}`);

  // Process frame data...

  frame.unref();
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

## Stream Processing

### From Files or Network

```typescript
const media = await Demuxer.open('input.mp4');

// or

const media = await Demuxer.open('rtsp://example.com/stream');
```

### From Buffers

```typescript
import { readFile } from 'fs/promises';

const buffer = await readFile('input.mp4');
const media = await Demuxer.open(buffer);
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

await using input = await Demuxer.open(inputCallbacks, {
  format: 'mp4'
});
```

### Raw Media Processing

```typescript
// Raw video input
const rawVideo = await Demuxer.open({
  type: 'video',
  input: 'input.yuv',
  width: 1280,
  height: 720,
  pixelFormat: AV_PIX_FMT_YUV420P,
  frameRate: { num: 30, den: 1 }
});

// Raw audio input
const rawAudio = await Demuxer.open({
  type: 'audio',
  input: 'input.pcm',
  sampleRate: 48000,
  channels: 2,
  sampleFormat: AV_SAMPLE_FMT_S16
}, {
  format: 's16le'
});
```

## Device Capture

Capture video, audio, and screen content directly from system devices. Platform-specific formats are handled automatically.

```typescript
import { DeviceAPI } from 'node-av/api';

// List devices and query capabilities
const devices = await DeviceAPI.list();
const modes = await DeviceAPI.modes(devices.find(d => d.type === 'video')!.name);

// Camera
await using camera = await DeviceAPI.openCamera({ videoDevice: 0, width: 1280, height: 720, frameRate: 30 });

// Microphone
await using mic = await DeviceAPI.openMicrophone({ audioDevice: 0, sampleRate: 48000, channels: 2 });

// Combined video + audio (macOS/Windows)
await using device = await DeviceAPI.openDevice({ videoDevice: 0, audioDevice: 0, width: 1280, height: 720, frameRate: 30 });

// Screen capture
await using screen = await DeviceAPI.openScreen({ frameRate: 30, drawMouse: true });

// Screen capture with system audio (macOS 13.0+)
await using screen2 = await DeviceAPI.openScreen({
  frameRate: 30,
  avfoundation: { captureSystemAudio: true, audioSampleRate: 48000, audioChannels: 2 },
});
```

| Platform | Video | Audio | Screen |
|----------|-------|-------|--------|
| macOS | AVFoundation | AVFoundation | AVFoundation (ScreenCaptureKit) |
| Linux | V4L2 | ALSA | x11grab |
| Windows | DirectShow | DirectShow | GDIGrab |

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

## Resource Management

The library supports automatic resource cleanup using the Disposable pattern:

```typescript
// Automatic cleanup with 'using'
{
  await using media = await Demuxer.open('input.mp4');
  using decoder = await Decoder.create(media.video());
  // Resources automatically cleaned up at end of scope
}

// Manual cleanup
const media = await Demuxer.open('input.mp4');
try {
  // Process media
} finally {
  await media.close();
}
```

## Imports and Tree Shaking

The library provides multiple entry points for optimal tree shaking:

```typescript
// High-Level API only - Recommended for most use cases
import { Demuxer, Muxer, Decoder, Encoder } from 'node-av/api';

// Low-Level API only - Direct FFmpeg bindings
import { FormatContext, CodecContext, Frame, Packet } from 'node-av/lib';

// Constants only - When you just need FFmpeg constants
import { AV_PIX_FMT_YUV420P, AV_CODEC_ID_H264 } from 'node-av/constants';

// Channel layouts only - For audio channel configurations
import { AV_CHANNEL_LAYOUT_STEREO, AV_CHANNEL_LAYOUT_5POINT1 } from 'node-av/layouts';

// Default export - Includes everything
import * as ffmpeg from 'node-av';
```

## Key Features

Beyond basic transcoding, NodeAV provides advanced media processing capabilities:

**Fully Typed FFmpeg Options**
Every FFmpeg option is typed - across codecs, formats, ~580 filters, and bitstream filters. Keys autocomplete, enum values are validated, and typos become compile-time errors, all generated directly from FFmpeg's `AVOption` metadata (including each option's description and a link to the FFmpeg docs as JSDoc). No more grepping the FFmpeg docs for flag names.

**Speech Recognition with Whisper**
Integrate automatic speech-to-text transcription using OpenAI's Whisper model through the whisper.cpp implementation. The library handles automatic model downloading from HuggingFace, supports multiple model sizes (tiny, base, small, medium, large) for different accuracy/performance tradeoffs, and provides hardware-accelerated inference through Metal (macOS), Vulkan (cross-platform), or OpenCL backends. Transcription results include precise timestamps and can be processed in real-time from any audio source.

**Advanced Video Filtering with FilterComplexAPI**
Build sophisticated video processing pipelines using FFmpeg's complete filter ecosystem. The FilterComplexAPI provides direct access to complex filtergraphs with multiple inputs and outputs, enabling advanced operations like picture-in-picture overlays, multi-stream composition (side-by-side, grid layouts), real-time video effects, and custom processing chains. All filters support hardware acceleration where available, and filter configurations can be dynamically constructed based on runtime requirements.

**Browser Streaming**
Stream any media source directly to web browsers through fragmented MP4 (fMP4) or WebRTC protocols. The library can process inputs from RTSP cameras, local files, network streams, or custom sources and package them for browser consumption with minimal latency. Complete examples demonstrate both Media Source Extensions (MSE) based playback for on-demand content and WebRTC integration for real-time streaming scenarios.

**RTSP Backchannel / Talkback**
Implements bidirectional RTSP communication for IP camera integration. The library provides native support for RTSP backchannel streams, enabling audio transmission to camera devices. Transport is handled automatically with support for both TCP (interleaved mode) and UDP protocols, with proper RTP packet formatting and stream synchronization.

**Image Scaling & Snapshots**
The `Scaler` turns decoded frames into raw pixel buffers (`rgb`/`rgba`/`gray`/`nv12`/`yuv420p`) or JPEG/PNG images for detection, thumbnail, and snapshot workloads. One reusable instance pools its swscale contexts, GPU filter graphs, and encoders for zero per-frame allocation; hardware frames are cropped/scaled on the GPU with only the small result downloaded. Recurring resolutions can also be served directly by `EncoderPool`.

See the [Examples](#examples) section for complete implementations.

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

## Worker Threads and the libuv Thread Pool

NodeAV works inside `worker_threads`, with two caveats:

- **Prefer graceful shutdown over `worker.terminate()`.** Terminating a worker while native calls are in flight is mitigated (pending completions are dropped safely instead of aborting), but a termination that lands exactly inside a running synchronous native call can still abort the process — a limitation of Node-API error handling during isolate teardown. Signal the worker to close its NodeAV resources and exit on its own. For test runners, process isolation (e.g. vitest `pool: 'forks'`) is the most robust choice.
- **Async operations share the libuv thread pool** (default: 4 threads, process-wide across all workers). A custom IO read callback that never settles parks one pool thread until it resolves; enough of them stall every async NodeAV operation in the entire process. Make custom IO callbacks always settle (return `null` for EOF, throw on error), and raise `UV_THREADPOOL_SIZE` when running many parallel live inputs.

## Electron

NodeAV fully supports Electron applications. The prebuilt binaries are ABI-compatible with Electron, so no native rebuild is required during packaging. Both the native bindings and the bundled FFmpeg CLI binaries work seamlessly within Electron's main process.

NodeAV also supports Electron's [offscreen rendering with shared textures](https://www.electronjs.org/docs/latest/tutorial/offscreen-rendering), enabling zero-copy GPU texture import for hardware-accelerated encoding. See the [Electron Builder](https://github.com/seydx/node-av/tree/main/examples/electron/builder) and [Electron Forge](https://github.com/seydx/node-av/tree/main/examples/electron/forge) examples for complete implementations.

If you encounter module resolution errors like `Cannot find module 'lib/binary-stream'`, add this override to your project's `package.json`:

```json
{
  "overrides": {
    "@shinyoshiaki/binary-data": "npm:@seydx/binary-data@0.6.2"
  }
}
```

## Examples

The repository ships 60+ runnable examples covering both API levels — high-level (`api-*`: transcoding, hardware acceleration, RTSP, fMP4/DASH, RTP, Whisper, device capture, …) and low-level ports of the official FFmpeg C examples.

**[→ Browse all examples](https://github.com/seydx/node-av/tree/main/examples)**

## Prebuilt Binaries

Prebuilt binaries are available for multiple platforms:

- **macOS**: x64, ARM64
- **Linux**: x64, ARM64
- **Windows**: x64, ARM64 (MSVC)

### Cross-Platform Packaging (CI/CD)

By default the install step fetches the native binding and FFmpeg binary for the
host platform. When packaging for a different target (e.g. building a Windows
Electron app from a Linux CI runner), pass npm's standard `--os` / `--cpu` flags:

```bash
# Install Windows x64 binaries while running on Linux
npm install --os=win32 --cpu=x64
```

npm filters the platform-specific `optionalDependencies` by these flags, and the
postinstall hook honors them for the bundled FFmpeg binary as well.

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

## Star History

<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="
      https://star-history.dera.page/svg?repos=seydx/node-av&type=Date&theme=dark
    "
  />
  <source
    media="(prefers-color-scheme: light)"
    srcset="
https://star-history.dera.page/svg?repos=seydx/node-av&type=Date
    "
  />
  <img
    alt="Star History Chart"
    src="https://star-history.dera.page/svg?repos=seydx/node-av&type=Date"
  />
</picture>
