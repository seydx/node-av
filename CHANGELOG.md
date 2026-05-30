# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [6.0.0 Beta] - 2026-05-28

### Breaking Changes

#### WebRTC / RTP moved to the `node-av/webrtc` subpath

`WebRTCStream`, `RTPStream`, and the re-exported werift primitives (`RTCPeerConnection`, `MediaStreamTrack`, `RtpPacket`, `RTCSessionDescription`, `RTCIceCandidate`, `RTCRtpCodecParameters`, `PeerConfig`) are no longer exported from the main package. They now live under the dedicated `node-av/webrtc` entry point. This removes the werift dependency chain from the core import graph.

`werift` is now an **optional dependency** — only required when using `node-av/webrtc`.

**Migration:**
```typescript
// Before
import { WebRTCStream, RTPStream, RTCPeerConnection } from 'node-av';

// After
import { WebRTCStream, RTPStream, RTCPeerConnection } from 'node-av/webrtc';
```

#### `FilterPreset` thin wrappers replaced by the generic `filter()`

The hand-written single-filter convenience methods on `FilterPreset` (e.g. `fps`, `rotate`, `fade`, `volume`, `drawtext`, `trim`, `concat`, `highpass`, `aresample`, …) were removed in favor of the type-safe generic `filter(name, options)`, which covers **every** FFmpeg filter with autocomplete and validation. The hardware-aware / auto-mapping methods (`scale`, `crop`, `overlay`, `tonemap`, `deinterlace`, `format`, `aformat`, `whisper`, …) and `custom()` remain.

**Migration:**
```typescript
// Before
FilterPreset.chain().fps(30).drawtext('hi', { x: 10 }).build();

// After
FilterPreset.chain()
  .filter('fps', { fps: 30 })
  .filter('drawtext', { text: 'hi', x: 10 })
  .build();
```

### Added

#### `Scaler` — hardware-aware image scale / crop / convert / encode

High-level `Scaler` (from `node-av/api`) that scales, crops, and converts decoded frames to raw pixel buffers or JPEG/PNG. Pools its contexts, GPU graphs, and encoders for the detection/thumbnail/snapshot workload; hardware frames are processed on the GPU.

#### `EncoderPool` — pooled image encoders

`EncoderPool` (from `node-av/api`) reuses image encoders across recurring resolutions. Adds `Encoder.encodeOne()` / `encodeOneSync()` for one-shot single-frame encodes.

#### `Frame.exportIOSurface()` — zero-copy IOSurface export (macOS)

Exports the `IOSurfaceRef` backing a decoded VideoToolbox frame as an 8-byte pointer `Buffer` — the inverse of `Frame.fromIOSurface()`. Enables zero-copy interop with Metal / CoreVideo (e.g. feeding hardware-decoded frames into a GPU compositor) without a GPU → CPU readback.

```typescript
const handle = frame.exportIOSurface();
if (handle) {
  // Pass to a Metal-based compositor; keep `frame` alive while using the handle.
}
```

Returns `null` for non-VideoToolbox frames and on non-macOS platforms. The IOSurface stays owned by the frame's `CVPixelBuffer`, so the frame must be kept alive while the handle is in use.

#### Type-safe codec options

`Encoder.create()` / `createSync()` and `Decoder.create()` / `createSync()` now infer the codec-specific private options from the codec constant. When you pass a branded constant (e.g. `FF_ENCODER_LIBX264`), the `options` field is strongly typed to that codec's known options — with editor autocomplete, and compile-time errors for unknown keys or invalid enum values:

```typescript
// Autocomplete + validation for libx264's private options
await Encoder.create(FF_ENCODER_LIBX264, {
  options: { preset: 'fast', crf: 23 },
});

await Encoder.create(FF_ENCODER_H264_VIDEOTOOLBOX, {
  options: { coder: 'nope' }, // ✗ Type error: not assignable to 'cavlc' | 'vlc' | 'cabac' | 'ac'
});
```

The option types are generated from FFmpeg's `AVOption` metadata, covering every codec known to FFmpeg. Each codec's bag also includes the generic `AVCodecContext` options (e.g. `strict`, `flags`, `bf`), with the codec's private options taking precedence on name clashes (`profile`, `level`). Codecs passed by `AVCodecID`, by `Codec` instance, or as a plain string still accept a loose option bag, so existing dynamic usage is unchanged. Combinable flag options (e.g. `mpv_flags`) suggest the known tokens while still accepting any combined string (`'+a+b'`).

#### Type-safe container & bitstream-filter options

The same generated-from-source typing now extends to containers and bitstream filters:

**`Muxer.open()` / `openSync()` and `Demuxer.open()` / `openSync()`** — when `format` is given as a literal (e.g. `'mp4'`, `'mov'`), the `options` bag is typed to that (de)muxer's private options plus the generic `AVFormatContext` options, with autocomplete for keys and enum/flag values:

```typescript
await Muxer.open('out.mp4', {
  format: 'mp4',
  options: { movflags: '+faststart+frag_keyframe' }, // autocomplete of mov flags
});
```

The `format` field itself autocompletes every available muxer/demuxer name (the generated `MuxerFormat` / `DemuxerFormat` unions, covering libavformat **and** libavdevice), while still accepting any string. Because container option bags also legitimately carry protocol and codec-child options (e.g. `rtsp_transport` on a demuxer), unknown keys remain accepted — typing is additive autocomplete, never a hard gate.

**`BitStreamFilterAPI.create()`** — the filter name autocompletes every available bitstream filter (the generated `BsfName` union), and the `options` bag is strongly typed to the named filter's options (strict, like codecs), so `h264_metadata`'s `aud?: 'pass' | 'insert' | 'remove'` is validated at compile time. Unknown names still pass through via the `(string & {})` fallback.

Formats/filters referenced dynamically (no literal name) still accept a loose option bag.

#### Bitstream filters in transcode pipelines

`BitStreamFilterAPI.create()` now accepts a `Stream` (copy), an `Encoder` (transcode), or another filter (chain) as its input source, and initializes lazily on the first packet. This makes coded-bitstream filters like `h264_metadata` work after a re-encode the same way the FFmpeg CLI does — the filter derives its parameters from the encoder's output once it is open, and the muxer writes the filter's output parameters to the container (so e.g. a rewritten `level` is reflected in the file):

```typescript
using bsf = BitStreamFilterAPI.create('h264_metadata', encoder, {
  options: { aud: 'remove', level: '4.1' },
});
pipeline(input, decoder, filter, encoder, bsf, output);
```

#### Type-safe filters via `FilterPreset.filter()`

`FilterPreset` gained a generic `filter(name, options)` that exposes **every** FFmpeg filter (≈580) with autocomplete for both the filter name and its options, generated from FFmpeg's `AVOption` metadata — including each filter's description and a link to the FFmpeg docs as JSDoc:

```typescript
FilterPreset.chain()
  .filter('drawtext', { text: 'hello', fontsize: 24 })
  .filter('haldclut', { clut: 'all' })   // 'bogus' → compile error
  .build();
```

Enum options are validated (typos are compile errors), while expression options (e.g. `scale` geometry, `setpts`) accept both strings and numbers. Values are escaped for the filtergraph automatically. Filters not in the map can still be added with `custom()`.

#### `Codec.getOptions()` — runtime codec option introspection

New low-level method that returns a codec's private (`priv_class`) AVOptions at runtime — name, help, `AVOptionType`, unit, flags, min/max and default — mirroring `ffmpeg -h encoder=<name>`:

```typescript
const codec = Codec.findEncoderByName(FF_ENCODER_LIBX264);
for (const opt of codec?.getOptions() ?? []) {
  console.log(opt.name, opt.type, opt.help);
}
```

Returns an empty array for codecs without private options.

#### `probe()` — high-level media probing

New high-level helper that opens a source, reads stream info, and returns a typed, structured summary - the `ffprobe -show_format -show_streams` equivalent as a plain object, without managing a `Demuxer`:

```typescript
import { probe } from 'node-av/api';

const info = await probe('input.mkv');
console.log(info.format, info.duration, info.bitrate);
if (info.video) {
  console.log(`${info.video.codec} ${info.video.width}x${info.video.height} @ ${info.video.frameRate}fps`);
}
```

Returns `format`, `duration`, `bitrate`, per-stream `ProbeStream[]` (codec, type, dimensions, frame rate, sample rate, channels, language, …), plus `video`/`audio` convenience accessors. A `probeSync()` variant is also available. When `format` is a known literal, the options bag is typed to that demuxer's options.

#### Typed `FFmpegError` code helpers

`FFmpegError` instances gained boolean getters for the common FFmpeg/POSIX codes, so error branching no longer needs manual numeric comparison:

```typescript
const error = FFmpegError.fromCode(ret);
if (error?.isEAGAIN) {
  // feed more input, then retry
} else if (error?.isEOF) {
  // end of stream
} else if (error?.isInvalidData) {
  // corrupt input
}
```

Adds `isEAGAIN`, `isEOF`, `isInvalidData`, `isEINVAL`, `isENOMEM`, `isENOENT`, `isEACCES`, `isEIO`, `isEPIPE`, `isExit`, and an instance `is(code)` for arbitrary codes.

#### Type-safe `filter_complex` graph builder

New `FilterComplexGraph` builder brings the type-safe `filter(name, options)` API (autocomplete + enum validation, generated from FFmpeg's `AVOption` metadata) to multi-input/output graphs. It composes labeled chains and renders the description string `FilterComplexAPI.create()` accepts (and can be passed to it directly):

```typescript
const graph = FilterComplexGraph.create()
  .chain({ inputs: ['0:v', '1:v'], outputs: 'tmp' }, (c) => c.filter('overlay', { x: 100, y: 50 }))
  .chain({ inputs: 'tmp', outputs: 'out' }, (c) => c.filter('hue', { s: 0 }))
  .build();
// "[0:v][1:v]overlay=x=100:y=50[tmp];[tmp]hue=s=0[out]"

using complex = FilterComplexAPI.create(graph, { inputs: [{ label: '0:v' }, { label: '1:v' }], outputs: [{ label: 'out' }] });
```

#### Pipeline progress reporting

`pipeline()` now reports progress. Pass `onProgress` (throttled via `progressInterval`) for push updates, or poll `control.progress` - mirroring FFmpeg's CLI figures (`frame= fps= time= bitrate= speed=`):

```typescript
const control = pipeline(input, decoder, encoder, output, {
  progressInterval: 200,
  onProgress: (p) => console.log(`frame=${p.frames} fps=${p.fps.toFixed(1)} time=${p.time.toFixed(2)}s speed=${p.speed.toFixed(2)}x`),
});
await control.completion;
```

`PipelineProgress` exposes `frames`, `bytes`, `time` (media seconds), `fps`, `bitrate`, `speed`, and `elapsed`. Works across simple, stream-copy, and named pipelines.

### Changed

- Synced FFmpeg with the latest master (~700 upstream commits) — numerous bug fixes, stability and performance improvements. Highlights relevant to node-av users:
  - **Animated WebP** — new demuxer and decoding support
  - **ProRes RAW** — VideoToolbox (Apple) and Vulkan hardware decoding
  - **APV** (Samsung Advanced Professional Video) — hardware decoding and `liboapv` encoder
  - **HE-AAC (DAB+)** — decoding of 960-frame streams
  - **FFV1 on Vulkan** — GPU encoding/decoding, including 32-bit float video
  - New filters: `transpose_cuda` (CUDA transpose), `frc_amf` (AMD frame rate converter)
  - Faster VVC/H.266 and HEVC decoding (AArch64 NEON, x86 SSSE3)
- Regenerated constants, encoders, and decoders from updated FFmpeg headers

### Fixed

- **`Packet.data` setter leaked the previous buffer and side data when a packet was reused.** Assigning `packet.data = buffer` called `av_new_packet()` without first releasing the packet's existing payload, so reusing one packet across a decode/encode loop (the common pattern) leaked the prior buffer and any side data every iteration. The setter now unreferences the packet before allocating, so re-assigning `data` cleanly replaces it. Reported via [mediabunny#392](https://github.com/Vanilagy/mediabunny/issues/392).
- **`SharedTexture.mapTo()` used a hardware wrapper as the mapping software format.** The mapping `HardwareFramesContext` was configured with `sw_format = srcFrame.format`, which for an imported GPU frame is a hardware format (`AV_PIX_FMT_DRM_PRIME` on Linux DMA-BUF, `AV_PIX_FMT_D3D11` on Windows, `AV_PIX_FMT_VIDEOTOOLBOX` on macOS) — never a valid software layout, so `av_hwframe_ctx_init()` rejected it (e.g. "Unsupported format: drm_prime" mapping DMA-BUF → VAAPI). It now uses the source frame's own hwframe context software format when present (macOS IOSurface imports), and otherwise the software layout used at import time, which also fixes a stale-format case when `importHandle()` was called with a per-call `pixelFormat`. Thanks to @alyssaxuu ([#243](https://github.com/seydx/node-av/pull/243)).

## [5.2.3] - 2026-04-14

### Changed

- Updated FFmpeg with new encoders, JPEG-XS support, swscale Vulkan support, and more
- Regenerated constants, encoders, and decoders from updated FFmpeg headers

### Fixed

- Various bug fixes and stability improvements
- Updated dependencies

## [5.2.1] - 2026-02-05

### Added

#### SharedTexture - Electron GPU Texture Import

New high-level `SharedTexture` class for importing Electron's offscreen rendering GPU textures as FFmpeg hardware frames with zero-copy.

**Platform support:**

| Platform | GPU Format | Handle Type |
|----------|-----------|-------------|
| macOS | `AV_PIX_FMT_VIDEOTOOLBOX` | IOSurface |
| Windows | `AV_PIX_FMT_D3D11` | DXGI shared handle |
| Linux | `AV_PIX_FMT_DRM_PRIME` | DMA-BUF |

**Example:**
```typescript
import { HardwareContext, SharedTexture, AV_HWDEVICE_TYPE_VIDEOTOOLBOX } from 'node-av';

// Create hardware context (platform-specific)
const hw = HardwareContext.create(AV_HWDEVICE_TYPE_VIDEOTOOLBOX);
using sharedTexture = SharedTexture.create(hw);

// In Electron paint event with offscreen rendering
offscreen.webContents.on('paint', (event) => {
  const texture = event.texture;
  if (!texture?.textureInfo) return;

  // Import as hardware frame (zero-copy)
  using frame = sharedTexture.importTexture(texture.textureInfo, { pts: 0n });
  // frame.format === AV_PIX_FMT_VIDEOTOOLBOX (macOS)
  // frame.format === AV_PIX_FMT_D3D11 (Windows)
  // frame.format === AV_PIX_FMT_DRM_PRIME (Linux)

  texture.release();
});
```

**New `mapTo()` helper** for mapping frames between hardware formats (e.g., DRM PRIME → VAAPI):
```typescript
// Import DRM PRIME frame
const drmFrame = sharedTexture.importTexture(textureInfo, { pts: 0n });

// Map to VAAPI for encoding
const vaapiHw = HardwareContext.create(AV_HWDEVICE_TYPE_VAAPI);
const vaapiFrame = sharedTexture.mapTo(drmFrame, vaapiHw);
```

#### FMP4Stream - Async Generator & Init Segment API

- **`fragments()` async generator**: Yields media fragments (moof+mdat) for streaming, separate from init segment
- **`initSegment` property**: Promise that resolves with ftyp+moov data once available (box mode only)
- **AbortSignal support**: `signal` option for graceful stream cancellation

**Example:**
```typescript
const stream = FMP4Stream.create('rtsp://camera/stream', {
  supportedCodecs: 'avc1.640029,mp4a.40.2',
  boxMode: true,
  signal: controller.signal,
});

await stream.start();

// Get init segment (ftyp+moov) for MSE SourceBuffer initialization
const init = await stream.initSegment;
sourceBuffer.appendBuffer(init);

// Stream media fragments via async generator
for await (const fragment of stream.fragments()) {
  sourceBuffer.appendBuffer(fragment.data);
}
```

#### RTPStream - AbortSignal Support

- **AbortSignal support**: `signal` option for graceful stream cancellation, consistent with FMP4Stream

**Example:**
```typescript
const controller = new AbortController();

const stream = RTPStream.create('rtsp://camera/stream', {
  signal: controller.signal,
  onVideoPacket: (rtp) => peer.sendRtp(rtp),
  onAudioPacket: (rtp) => peer.sendRtp(rtp),
});

await stream.start();

// Cancel after timeout
setTimeout(() => controller.abort(), 30000);
```

## [5.2.0] - 2026-02-05

### Added

#### Device API - Native Camera, Microphone & Screen Capture

New high-level `DeviceAPI` for cross-platform device capture with native bindings for macOS, Linux, and Windows.

**Example:**
```typescript
import { DeviceAPI } from 'node-av/api';

// List devices
const devices = await DeviceAPI.list();

// Camera capture
await using camera = await DeviceAPI.openCamera({
  width: 1280, height: 720, frameRate: 30,
});

// Combined video + audio capture (macOS/Windows)
await using device = await DeviceAPI.openDevice({
  videoDevice: 0, audioDevice: 0,
  width: 1280, height: 720, frameRate: 30,
});

// Screen capture with system audio (macOS 13.0+)
await using screen = await DeviceAPI.openScreen({
  frameRate: 30, drawMouse: true,
  avfoundation: { captureSystemAudio: true, audioSampleRate: 48000 },
});
```

**Platform support:**

| Feature | macOS | Linux | Windows |
|---------|-------|-------|---------|
| Camera | AVFoundation | V4L2 | DirectShow |
| Microphone | AVFoundation | ALSA | DirectShow |
| Combined | AVFoundation | — | DirectShow |
| Screen | ScreenCaptureKit | x11grab | GDI grab |

#### AbortSignal / AbortController Support

All high-level API classes now support `AbortSignal` for cancellation via an optional `signal` property in their options:

- `Demuxer`, `Muxer`, `Decoder`, `Encoder`, `FilterAPI`, `BitStreamFilterAPI` — pass `signal` in options
- `pipeline()` — pass `{ signal }` as the last argument
- Async generators (`packets()`, `frames()`, `packets()`) stop yielding on abort
- Async methods (`decode()`, `encode()`, `writePacket()`, etc.) throw `AbortError` on abort
- Pre-aborted signals are rejected immediately
- `close()` is never affected — cleanup always runs

**Example:**
```typescript
const controller = new AbortController();

await using input = await Demuxer.open('input.mp4', { signal: controller.signal });
using decoder = await Decoder.create(input.video()!, { signal: controller.signal });

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  for await (const packet of input.packets()) {
    for await (const frame of decoder.frames(packet)) {
      // Process frame...
    }
  }
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Processing cancelled');
  }
}

// Pipeline with signal
const control = pipeline(input, decoder, encoder, output, { signal: controller.signal });
await control.completion;
```

#### Readable & Writable Stream Support

- `Demuxer.open()` now accepts a Node.js `Readable` stream as input, and `Muxer.open()` now accepts a `Writable` stream as output. This enables seamless integration with Node.js stream APIs.

**Example:**
```typescript
import { createReadStream, createWriteStream } from 'fs';

// Demux from a Readable stream
const readable = createReadStream('input.mkv');
await using input = await Demuxer.open(readable, { format: 'matroska' });

// Mux to a Writable stream (use non-seekable formats like mpegts or matroska)
const writable = createWriteStream('output.ts');
await using output = await Muxer.open(writable, { format: 'mpegts' });
```

#### IOContext Synchronous Dispose

- `IOContext` now implements the synchronous `Disposable` interface (`Symbol.dispose`) in addition to `AsyncDisposable`. This allows using `using` (synchronous) instead of `await using` when async cleanup is not needed.

#### IOContext Input Support

- `Demuxer.open()` and `Demuxer.openSync()` now accept a pre-created `IOContext` as input, enabling advanced custom I/O scenarios with more control over buffering and seeking.

#### Muxer - Start Time Offset

- New `startTime` option in `Muxer` stream options for controlling packet timestamp offsets.

#### FFmpeg Update

Updated to the latest FFmpeg version with new codec and hardware acceleration support:

- New codec: `AV_CODEC_ID_JPEGXS` (JPEG XS)
- New decoder: `FF_DECODER_LIBSVTJPEGXS` (SVT-JPEG XS)
- New encoder: `FF_ENCODER_LIBSVTJPEGXS` (SVT-JPEG XS)
- New hardware encoders: `FF_ENCODER_AV1_D3D12VA`, `FF_ENCODER_H264_D3D12VA`, `FF_ENCODER_HEVC_D3D12VA` (Direct3D 12)

### Changed

#### Improved Type Safety

- Stricter typings across the entire codebase — branded types are now enforced at compile time, preventing accidental use of raw number literals
- Replaced inline magic numbers and objects with predefined constants

#### Demuxer Input Support

- `FMP4Stream.create()`, `WebRTCStream.create()`, and `RTPStream.create()` now accept a pre-opened `Demuxer` instance as input in addition to URL strings. This enables using device capture or custom I/O as input for streaming.

#### Build Configuration

- Enhanced symbol visibility flags and exports for native bindings
- Updated linker flags for improved compatibility

### Fixed

#### Electron Compatibility

- Fixed external buffer access in Electron environment by refactoring native buffer creation to use `NewOrCopy`
- Ensures safe buffer handling when Node.js buffers are accessed from native code in Electron's process model

#### Audio Channel Layout

- Fixed channel layout formatting for audio frames in filter graphs.

## [5.1.0] - 2026-01-27

### Added

#### Benchmark Suite

New comprehensive benchmark tool for comparing node-av performance against FFmpeg CLI.

- Transcode speed benchmarks (software and hardware encoding)
- Memory usage measurements
- Latency metrics

📊 **[Full benchmark results](https://github.com/seydx/node-av/tree/main/BENCHMARK.md)**

### Changed

#### Threading API - Auto-Detection & Flushing

Thread count now defaults to `0` (auto-detect) when not explicitly specified. This allows FFmpeg to automatically determine the optimal number of threads based on the system.

**⚠️ Important**: With multi-threaded decoding/encoding, frames are buffered internally and may not be immediately available from `receive()`. Proper flushing is required to retrieve all buffered frames at stream end.

**Example:**
```typescript
// Using async generators - flushing is handled automatically
// input.packets() yields null at EOF which flushes the decoder
for await (const packet of input.packets()) {
  await decoder.decode(packet); // null packet at EOF triggers flush
  while (true) {
    const frame = await decoder.receive();
    if (!frame) break; // EAGAIN - no more frames available yet
    // Process frame...
  }
}
```

#### BitStreamFilterAPI

- Enhanced `setOption()` to support optional filter-specific parameters
- Allows passing codec-specific options to bitstream filters

#### Decoder/Encoder/FilterAPI/BitStreamFilterAPI - EOF Handling & Manual Flush

- Methods now properly handle `null` frames/packets for explicit EOF signaling
- Enables manual flushing of internal buffers in encoding/decoding chains

#### HardwareContext.auto() - Device Type Caching

`HardwareContext.auto()` now caches the successful hardware device type instead of testing all hardware types on every call. Subsequent calls skip the full hardware test and directly create the cached type.

- First call: Tests all hardware types, caches the successful device type
- Subsequent calls: Directly creates the cached hardware type (much faster)
- `resetAutoCache()`: Clears cache, forces re-testing on next call
- Custom options bypass cache (always tests)

### Fixed

#### Error Handling

- **Muxer Option Validation**: `Muxer` now throws errors when setting invalid options instead of silently failing

#### Hardware Detection

- **VAAPI Runtime Check**: Added FFmpeg patch for dynamic VAAPI/DRM library loading. Gracefully handles missing libraries instead of crashing.

- **HardwareContext.testDecoder()**: Fixed logic bug where hardware types without codec support (like DRM without VAAPI) were incorrectly accepted. Now properly returns `false` when the hardware doesn't support decoding, ensuring `HardwareContext.auto()` only returns functional hardware acceleration.

#### FilterAPI / FilterComplexAPI

- **Stability Fix**: Improved resource cleanup order in `close()` to properly invalidate FilterContext references before freeing the graph.

## [5.0.0] - 2025-11-19

### Breaking Changes

#### Encoder/Decoder/FilterAPI/BitStreamFilterAPI - Send/Receive Pattern

The encode, decode, filter, and process methods now follow FFmpeg's send/receive pattern more closely. FFmpeg can produce multiple output frames/packets for a single input (e.g., B-frames in encoding, frame buffering in decoding).

**Changes:**
- Methods now return `void` instead of a single `Frame` or `Packet`
- You must call `receive()`/`receiveSync()` to retrieve output frames/packets
- Supports proper multi-frame/packet output handling

**Migration Example:**
```typescript
// Before
const frame = await decoder.decode(packet);
const packet = await encoder.encode(frame);

// After
await decoder.decode(packet);
const frame = await decoder.receive(); // May need to call multiple times

await encoder.encode(frame);
const packet = await encoder.receive(); // May return multiple packets
```

### Added

#### Core Features

- **Fifo** - Generic FIFO buffer bindings (AVFifo) for arbitrary data types

- **FilterComplexAPI** - Support for complex filtergraphs with multiple inputs/outputs
  - Advanced multi-input/multi-output filter operations
  - Direct mapping to FFmpeg's filtergraph functionality
  - Use cases: overlay, picture-in-picture, side-by-side, multi-stream mixing

- **WhisperTranscriber** - High-level API for automatic speech recognition
  - Based on OpenAI's Whisper model with whisper.cpp integration
  - GPU acceleration support (Metal/Vulkan/OpenCL)
  - Voice Activity Detection (VAD) for better audio segmentation
  - Automatic model downloading from HuggingFace
  - Multiple model sizes: tiny, base, small, medium, large
  - Type-safe transcription segments with precise timestamps

#### Code Examples

**FilterComplexAPI - Picture-in-Picture Effect:**
```typescript
import { FilterComplexAPI } from 'node-av/api';

using complex = FilterComplexAPI.create(
  '[1:v]scale=320:240[pip];[0:v][pip]overlay=x=W-w-10:y=H-h-10[out]',
  {
    inputs: [{ label: '0:v' }, { label: '1:v' }],
    outputs: [{ label: 'out' }],
  }
);

for await (using frame of complex.frames('out', {
  '0:v': decoder1.frames(input1.packets(streamIndex1)),
  '1:v': decoder2.frames(input2.packets(streamIndex2)),
})) {
  for await (using packet of encoder.packets(frame)) {
    await output.writePacket(packet, outputStreamIndex);
  }
}
```

**WhisperTranscriber - Audio Transcription:**
```typescript
import { Demuxer, Decoder, WhisperTranscriber } from 'node-av/api';

using transcriber = await WhisperTranscriber.create({
  model: 'base.en',
  modelDir: './models',
  language: 'en',
  useGpu: true,
});

await using input = await Demuxer.open('podcast.mp3');
using decoder = await Decoder.create(input.audio());

for await (const segment of transcriber.transcribe(decoder.frames(input.packets()))) {
  const timestamp = `[${(segment.start / 1000).toFixed(1)}s - ${(segment.end / 1000).toFixed(1)}s]`;
  console.log(`${timestamp}: ${segment.text}`);

  // [0.0s - 5.2s]: Welcome to the podcast...
  // [5.2s - 10.8s]: Today we will discuss...
  // ...
}
```

### Fixed

#### EOF Handling & Stability

Comprehensive improvements to end-of-file handling across the entire API stack, ensuring data integrity and preventing frame/packet loss during stream termination:

- **Decoder** - Proper EOF propagation through decode/receive pipeline with complete buffer flushing
- **Encoder** - Correct EOF handling in encode/receive pipeline guaranteeing all buffered packets output
- **FilterAPI** - Consistent EOF processing through filter chains preventing dropped frames during flush
- **Demuxer** - Reliable EOF detection and signaling for all stream types
- **Muxer** - Proper finalization and trailer writing on EOF

#### General Improvements

- Various bug fixes and stability improvements across the codebase

## [4.0.0] - 2025-11-12

### Major Focus: FFmpeg CLI Compatibility & Production Stability

This release brings the High-Level API closer to FFmpeg CLI behavior, making it more intuitive, stable, and robust for production use.

### Breaking Changes

**Class Renaming**: The High-Level API classes have been renamed to better reflect their FFmpeg terminology:
- `MediaInput` → `Demuxer`
- `MediaOutput` → `Muxer`

**High-Level API Refactoring**: All High-Level API classes (`Demuxer`, `Muxer`, `Decoder`, `Encoder`, `FilterAPI`, `BitStreamFilterAPI`) have been refactored with improved type definitions, option handling, and significantly enhanced stability. Many aspects have been brought closer to FFmpeg CLI behavior, including automatic parameter propagation, metadata preservation, robust error handling, and better defaults. This makes the API more intuitive and production-ready.

**Native Bindings Enhancement**: Many additional useful utility functions have been added to the native bindings for improved low-level control and functionality.

**Migration**: Update your imports and class references. Review your High-Level API usage - some option property names/types may have changed. The Low-Level API remains stable.

### Changed

- **FFmpeg Update**: Updated to latest FFmpeg master version with newest features, performance improvements, and bug fixes

### Fixed

- Numerous bug fixes and stability improvements across the entire codebase

## [3.1.2] - 2025-10-27

### Added

- **RTSP Backchannel/Talkback Support**: New methods for bi-directional RTSP communication with IP cameras
  - `FormatContext.getRTSPStreamInfo()`: Retrieve detailed stream information including:
    - Transport type (TCP/UDP)
    - Stream direction (sendonly/recvonly/sendrecv)
    - Codec details (ID, MIME type, payload type)
    - Audio properties (sample rate, channels)
    - MIME type
    - FMTP parameters
  - `FormatContext.sendRTSPPacket()`: Send RTP packets to RTSP streams with automatic transport handling. Supports both TCP (interleaved) and UDP modes, enabling audio transmission to camera backchannel streams for two-way communication.
  - Use cases: IP camera talkback/intercom functionality, security system audio announcements, remote audio injection, WebRTC integration with original SDP parameters
  - See `examples/rtsp-stream-info.ts` for detailed RTSP stream inspection including FMTP parameters
  - See `examples/browser/webrtc` for a complete implementation of RTSP talkback.

## [3.1.1] - 2025-10-25

### Added

- **`MediaInput`**: Custom I/O callbacks support via `IOInputCallbacks`

```typescript
import { MediaInput } from 'node-av/api';

import type { IOInputCallbacks } from 'node-av/api';

const callbacks: IOInputCallbacks = {
  read: (size: number) => {
    // Read data from custom source
    return buffer; // or null for EOF
  },
  seek: (offset: bigint, whence: AVSeekWhence) => {
    // Seek in custom source
    return offset;
  }
};

await using input = await MediaInput.open(callbacks, {
  format: 'mp4',
  bufferSize: 8192
});
```

- **`MediaInput`**: Buffer input support in synchronous mode
  - `MediaInput.openSync()` now accepts `Buffer` input
  - Previously restricted due to callback requirements
  - Enabled by direct callback invocation improvements

### Fixed

- **Critical**: Fixed deadlock when using `using` keyword with `IOOutputCallbacks`
  - `MediaOutput` with custom I/O callbacks now properly closes synchronously
  - Direct callback invocation in same thread eliminates event loop dependency

```typescript
// This now works without deadlock!
try {
  using output = MediaOutput.openSync(callbacks, { format: 'mp4' });
  // ... write packets
  // Automatically closes without deadlock
} catch (e) {
  console.error('Error caught correctly!', e); // ✅ Works now
}
```

## [3.1.0] - 2025-10-24

### Added

#### WebRTC High-Level API

- **`WebRTCSession`**: Complete WebRTC streaming with SDP negotiation and ICE handling
  - Automatic codec detection and transcoding (H.264, H.265, VP8, VP9, AV1 video; Opus, PCMA, PCMU audio)
  - Hardware acceleration support
  - Werift integration for peer connection management

```typescript
import { WebRTCSession } from 'node-av/api';

const session = await WebRTCSession.create('rtsp://camera.local/stream', {
  hardware: 'auto'
});

// Handle signaling
session.onIceCandidate = (candidate) => ws.send({ type: 'candidate', candidate });
const answer = await session.setOffer(sdpOffer);
await session.start();
```

- **`WebRTCStream`**: Library-agnostic WebRTC streaming with RTP callbacks for custom WebRTC implementations

#### fMP4/MSE High-Level API

- **`FMP4Stream`**: Fragmented MP4 streaming for Media Source Extensions
  - Browser codec negotiation (H.264, H.265, AV1 video; AAC, FLAC, Opus audio)
  - Automatic transcoding based on browser support
  - Hardware acceleration support

```typescript
import { FMP4Stream, FMP4_CODECS } from 'node-av/api';

const stream = await FMP4Stream.create('input.mp4', {
  supportedCodecs: 'avc1.640029,mp4a.40.2', // From browser
  hardware: 'auto',
  onChunk: (chunk) => ws.send(chunk)
});

const codecString = stream.getCodecString(); // For MSE addSourceBuffer()
await stream.start();
```

- **`FMP4_CODECS`**: Predefined codec strings (H.264, H.265, AV1, AAC, FLAC, Opus)

## [3.0.2] - 2025-10-14

### Breaking Changes

- ⚠️ **Version 3.x is NOT compatible with version 2.x** due to FFmpeg major version upgrade
  - Native bindings rebuilt against FFmpeg 8.0 (was 7.1.2 in v2.x)

### Changed

- Updated FFmpeg from 7.1.2 to **8.0**

### Removed

- Deprecated FFmpeg 7.x APIs and constants that were removed in FFmpeg 8.0

### FFmpeg 8.0 Changelog

version `<next>`:
- ffprobe -codec option
- EXIF Metadata Parsing
- gfxcapture: Windows.Graphics.Capture based window/monitor capture
- hxvs demuxer for HXVS/HXVT IP camera format
- MPEG-H 3D Audio decoding via mpeghdec


version 8.0:
- Whisper filter
- Drop support for OpenSSL < 1.1.0
- Enable TLS peer certificate verification by default (on next major version bump)
- Drop support for OpenSSL < 1.1.1
- yasm support dropped, users need to use nasm
- VVC VAAPI decoder
- RealVideo 6.0 decoder
- OpenMAX encoders deprecated
- libx265 alpha layer encoding
- ADPCM IMA Xbox decoder
- Enhanced FLV v2: Multitrack audio/video, modern codec support
- Animated JPEG XL encoding (via libjxl)
- VVC in Matroska
- CENC AV1 support in MP4 muxer
- pngenc: set default prediction method to PAETH
- APV decoder and APV raw bitstream muxing and demuxing
- APV parser
- APV encoding support through a libopenapv wrapper
- VVC decoder supports all content of SCC (Screen Content Coding):
  IBC (Inter Block Copy), Palette Mode and ACT (Adaptive Color Transform
- G.728 decoder
- pad_cuda filter
- Sanyo LD-ADPCM decoder
- APV in MP4/ISOBMFF muxing and demuxing
- OpenHarmony hardware decoder/encoder
- Colordetect filter
- Add vf_scale_d3d11 filter
- No longer disabling GCC autovectorization, on X86, ARM and AArch64
- VP9 Vulkan hwaccel
- AV1 Vulkan encoder
- ProRes RAW decoder
- ProRes RAW Vulkan hwaccel
- ffprobe -codec option
- HDR10+ metadata passthrough when decoding/encoding with libaom-av1

### Note

- The Whisper filter from FFmpeg 8.0 is not yet available in this release and will be implemented in a future update

## [2.7.1] - 2025-10-07

### Added

- **Automatic Hardware Decoder Selection**: `Decoder.create()` now automatically selects hardware decoders when hardware context is provided
  - Mimics FFmpeg CLI behavior: "Selecting decoder 'hevc_qsv' because of requested hwaccel method qsv"
  - New `HardwareContext.getDecoderCodec()` method to find hardware-specific decoders (e.g., `hevc_qsv`)
  - Falls back to software decoder if no hardware decoder is available
  - Works with both async `create()` and sync `createSync()` methods

### Changed

- **QSV Filter Support**: `FilterPresets` now uses `vpp_qsv` filter for Intel Quick Sync Video instead of `scale_qsv`

## [2.7.0] - 2025-10-07

### Added

- **Hardware Frame Allocation Control**: Added `extraHWFrames` option to `DecoderOptions` and `FilterOptions` for controlling hardware frame buffer size
  - Low-level access via `codecContext.extraHWFrames` and `filterContext.extraHWFrames`

### Changed

- **High-Level API Error Handling**: All high-level API methods now return `null` instead of throwing errors when resources are closed
  - Affected methods: `decode()`, `encode()`, `process()`, `flush()` and their sync variants
  - Generator methods (`frames()`, `packets()`, etc.) now exit gracefully when `closed`/`isClosed` flag is set
  - Improves error handling in cleanup scenarios

- **BitStreamFilterAPI Lifecycle Management**:
  - Renamed `dispose()` method to `close()` for consistency with other high-level APIs
  - Added `isBitstreamFilterOpen` getter to check filter state
  - Symbol.dispose still supported for automatic cleanup with `using` statement

- **Consistent Closed State Behavior**:
  - Methods check closed state and return `null` instead of throwing exceptions
  - Generator loops respect closed state

### Fixed

- **Log Callback Event Loop**: Fixed Node.js process not exiting when using `Log.setCallback()`
  - ThreadSafeFunction is now unref'd to prevent keeping event loop alive
  - Proper cleanup order in `SetCallback()` and `ResetCallback()`

- **VideoToolbox Patch**: Fixed "Duplicated pixel format" error in hardware acceleration
  - Corrected patch 1006 to avoid duplicate `AV_PIX_FMT_BGRA` entries in `supported_formats[]`
  - Added `AV_PIX_FMT_GRAY8` and `AV_PIX_FMT_RGB24` to VideoToolbox format support

## [2.6.0] - 2025-09-29

### Added

#### Frame Processing Utilities

Added `FrameUtils` class for efficient image processing of NV12 video frames. This native implementation provides crop, resize, and format conversion operations with internal resource pooling for improved performance in streaming scenarios.

**Usage:**
```typescript
import { FrameUtils } from 'node-av/lib';

// Initialize once for your input dimensions
const processor = new FrameUtils(1920, 1080);

// Process frames with various operations
const output = processor.process(nv12Buffer, {
  crop: { left: 100, top: 100, width: 640, height: 480 },
  resize: { width: 1280, height: 720 },
  format: { to: 'rgba' }
});

processor.close();

// Automatic cleanup with using statement
{
  using processor = new FrameUtils(320, 180);
  // Process frames...
} // Automatically disposed
```

## [2.5.0] - 2025-09-26

### Added

- **FFmpeg Binary Access**: New `node-av/ffmpeg` entry point provides easy access to FFmpeg binaries
  - `ffmpegPath()` - Get path to FFmpeg executable
  - `isFfmpegAvailable()` - Check if FFmpeg binary is available
  - Automatic download and installation of platform-specific FFmpeg binaries from GitHub releases


## [2.4.0] - 2025-09-25

### Added

#### Windows Build Improvements
- Added Windows MSVC builds alongside existing MinGW builds for better compatibility
- Now distributes both `@seydx/node-av-win32-x64-msvc` and `@seydx/node-av-win32-x64-mingw` packages

#### FFmpeg Binary Distribution
- Now includes standalone FFmpeg v7.1.2 binaries as release assets for all supported platforms:
  - **Jellyfin builds**: `ffmpeg-v7.1.2-{platform}-jellyfin.zip` (Windows MinGW, Linux, macOS)
  - **MSVC builds**: `ffmpeg-v7.1.2-win-{arch}.zip` (Windows MSVC only)

### Changed

#### FFmpeg Upgrade
- Updated FFmpeg from 7.1 to **7.1.2** with latest performance improvements and bug fixes

## [2.1.0] - 2025-09-18

### Added

#### Synchronous Methods for All Async Operations

Added synchronous variants for all async methods to eliminate AsyncWorker overhead and achieve near-native FFmpeg performance. Every async method now has a corresponding `Sync` suffix variant.

**Performance Improvements:**
- Eliminates N-API AsyncWorker overhead for CPU-bound operations
- Near-native FFmpeg performance for sequential processing

**Usage:**

```typescript
// Async version (non-blocking, good for concurrent operations)
const frame = await decoder.decode(packet);
for await (const packet of input.packets()) { /* ... */ }

// Sync version (faster for sequential processing)
const frame = decoder.decodeSync(packet);
for (const packet of input.packetsSync()) { /* ... */ }
```

## [2.0.0] - 2025-09-13

### Changed

#### Breaking Changes

##### Encoder Hardware Context Removal
The `hardware` option has been removed from `Encoder.create()`. Hardware context is now automatically detected from input frames.

```typescript
// Before (v1.x)
const hw = HardwareContext.auto();
const encoderCodec = hw.getEncoderCodec('h264'); // e.g., returns FF_ENCODER_H264_VIDEOTOOLBOX
const encoder = await Encoder.create(encoderCodec.name, streamInfo, {
  hardware: hw,
  bitrate: 5000000
});

// After (v2.0)
const hw = HardwareContext.auto();
const encoderCodec = hw.getEncoderCodec('h264');
const encoder = await Encoder.create(encoderCodec, {
  bitrate: 5000000
});
// Hardware context automatically detected from input frames

// Or using typed constants directly:
import { FF_ENCODER_H264_VIDEOTOOLBOX } from '@seydx/av/constants';
const encoder = await Encoder.create(FF_ENCODER_H264_VIDEOTOOLBOX, { bitrate: 5000000 });
```

##### FilterPreset Hardware Support
`HardwareFilterPresets` class has been removed. Use `FilterPreset` with `chain()` for hardware acceleration.

```typescript
// Before (v1.x)
const hw = HardwareContext.auto();
const hwFilter = new HardwareFilterPresets(hw);
const filter = hwFilter.scale(1920, 1080);

// After (v2.0)
const hw = HardwareContext.auto();
const filterChain = FilterPreset.chain(hw).scale(1920, 1080).build(); // Pass hardware context to chain
```

##### MediaOutput Automatic Management
No longer need to manually manage headers and trailers.

```typescript
// Before (v1.x)
const output = await MediaOutput.create('output.mp4');
await output.writeHeader();
// ... write packets ...
await output.writeTrailer();
await output.close();

// After (v2.0)
await using output = await MediaOutput.create('output.mp4');
// ... write packets ...
// Header/trailer handled automatically, close on dispose
```

### Added

- More Filter presets
- Better error messages throughout the API

### Fixed

- Video duration calculation issues (was showing 10000+ seconds instead of actual duration)
- Memory management in filter buffer handling
- Dictionary.fromObject to properly handle number values
- Codec context initialization and cleanup

### Removed

- `HardwareFilterPresets` class (replaced by enhanced `FilterPreset`)
- Manual `writeHeader()` and `writeTrailer()` requirements in MediaOutput
- Unused stream information types from type exports

## [1.0.0] - 2025-08-30

- Initial Release