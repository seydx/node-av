# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [7.0.3] - 2026-11-12

### Fixed

- **Installing for another platform no longer fails.** With `npm install --os=linux --cpu=arm64` (plus `--libc=musl` for Alpine), e.g. to build an arm64 image on an x64 machine, npm installs the target's prebuilt package. The install check looked for the build host's package instead and aborted with "No prebuilt binary available".

## [7.0.2] - 2026-11-12

### Fixed

- **A broken OpenCL installation no longer exits the process when Whisper starts.** whisper.cpp's OpenCL backend called `exit(1)` when its kernels failed to compile, e.g. on Alpine with `intel-compute-runtime` but without `intel-graphics-compiler`. The kernels compile while the backend probes the devices, so this hit every `WhisperTranscriber`, even with `useGpu: false`. The device is now skipped and Whisper runs on Vulkan or the CPU.
- **Whisper on Windows skips Vulkan when no Vulkan loader is installed.** The fix from 7.0.0 for Linux systems without `libvulkan.so.1` was missing from the Windows builds. Without `vulkan-1.dll`, Whisper now transcribes on the CPU there as well.

## [7.0.1] - 2026-11-12

### Added

- **`audio.transcode` on `RTPStream`.** The audio is encoded again even when its codec is one of `supportedAudioCodecs`, so the encoder options apply, e.g. for a receiver that negotiated Opus in 20 ms frames from a source that sends 60 ms.

### Fixed

- **`RTPStream` and `FMP4Stream` decode Opus with libopus.** FFmpeg's own Opus decoder turned SILK frames with in-band FEC into loud noise, e.g. the audio of Ring cameras.

## [7.0.0] - 2026-11-12

### Breaking Changes

#### The FFmpeg CLI is a separate package ([#332](https://github.com/seydx/node-av/issues/332))

node-av no longer downloads the `ffmpeg` binary in a `postinstall` script. Install `@seydx/node-av-ffmpeg` next to it if you use `node-av/ffmpeg`:

```bash
npm install node-av @seydx/node-av-ffmpeg
```

Like the native bindings, the binary comes as one npm package per platform (`@seydx/node-av-ffmpeg-{darwin,linux,win32}-{arm64,x64}`, plus `-musl` variants for Linux), and npm installs only the matching one. Installs without the CLI are 29–63 MB smaller to download, depending on the platform. Installing no longer needs network access to GitHub. It also works where lifecycle scripts are blocked (pnpm 10+, bun, `--ignore-scripts`).

- `ffmpegPath()` throws when the package is not installed instead of returning a path that doesn't exist. Check `isFfmpegAvailable()` first if the CLI is optional.
- The binary moves from `node_modules/node-av/binary/` into `node_modules/@seydx/node-av-ffmpeg-<platform>/`. Electron apps must unpack it from the ASAR archive (e.g. `asarUnpack: node_modules/@seydx/**`).
- `SKIP_FFMPEG` is gone, and node-av no longer depends on `unzipper`.

#### FFmpeg 8.1.3 from jellyfin-ffmpeg instead of an FFmpeg development snapshot

The bundled FFmpeg moves from an FFmpeg master snapshot (June 2026) to jellyfin-ffmpeg 8.1.3 and its patch set. Every prebuild now builds this one source with the same patches and dependency versions, including the Windows MSVC builds. 8.1.3 carries the 8.1 branch's backported fixes, among them security fixes the snapshot lacked (mov/mpegts bounds checks, HEVC WPP, RTSP credentials on redirect, …). It does not carry the features that only existed on FFmpeg master.

`ffmpegVersion()` returns `'8.1.3'` instead of `'8.1'`. `getFFmpegInfo()` reports lower library versions than 6.2.0 (e.g. libavcodec 62.28 instead of 62.36), because the snapshot was ahead of the 8.1 branch.

Removed together with the master-only features:

- **Constants:**
  - the swscale ops API: `SWS_UOP_*`, `SWS_OP_FILTER_H`/`_V`, `SWS_RW_*`, `SWS_BACKEND_GLSL`, `SWS_BACKEND_MAX_ENUM`
  - frame and packet side data: `AV_FRAME_DATA_IAMF_*_PARAM`, `AV_FRAME_DATA_RAW_COLOR_PARAMS` with `AV_RAW_COLOR_PARAMS_*`, `AV_FRAME_DATA_DYNAMIC_HDR_SMPTE_2094_APP5`, `AV_PKT_DATA_DYNAMIC_HDR_SMPTE_2094_APP5`, `AV_PKT_DATA_HEVC_CONF`
  - stream groups: `AV_STREAM_GROUP_PARAMS_DOLBY_VISION`, `AV_STREAM_GROUP_PARAMS_TREF`
  - codec IDs: `AV_CODEC_ID_APPLE_APAC`, `AV_CODEC_ID_WEBP_ANIM`
  - flags: `AVFMT_FIXED_FRAMESIZE`, `AV_CODEC_FLAG2_FIXED_FRAME_SIZE`, `AVFMT_PROGCOPY_*`, `AV_CPU_FLAG_EOR3`, `AV_CPU_FLAG_PMULL`
- **Components:**
  - the `pdv` encoder and muxer (`FF_ENCODER_PDV`)
  - the `webp_anim` decoder and demuxer (`FF_DECODER_WEBP_ANIM`)
  - the `frc_amf` and `v360_vulkan` filters
  - the `dovi_split` bitstream filter
- **Options:**
  - `whisper`: `translate`
  - `aac`/`aac_fixed`: `target_level`
  - `libopus`: `dtx`
  - `h264_d3d12va`/`hevc_d3d12va`: `constrained_intra_pred`
  - `ffv1_vulkan`: `remap_mode`
  - `overlay_vaapi`: `alpha_format`
  - `vpp_amf`: the `in_*`/`out_*` color options
  - `dash`: `availability_start_time_ms`, `suggested_presentation_delay`
  - `whip`: `timeout`

#### Constant values that changed

`AV_HWDEVICE_TYPE_RKMPP`, `AV_HWDEVICE_TYPE_AMF` and `AV_HWDEVICE_TYPE_OHCODEC` are now 15, 13 and 14 (were 13, 14 and 15). `AV_PKT_DATA_RTP_TIMESTAMP` is now 41 (was 43). Code that uses the constants by name is unaffected. Numeric values stored or sent elsewhere must be updated.

#### NVENC uses SDK 12.0: driver 520/522 instead of 610, without SDK 12.1+ features

The NVENC headers move from SDK 13.1 to SDK 12.0, as in jellyfin-ffmpeg. NVENC now opens on drivers from 520.56 (Linux) and 522.25 (Windows). In 6.2.0, every `*_nvenc` encoder failed below driver 610 with "Driver does not support the required nvenc API version", so NVENC returns on older and stable-branch drivers (e.g. a GTX 1080 on 582).

Not available in SDK 12.0, and no longer part of the encoders' option types:

- split-frame encoding (`split_encode_mode`)
- temporal filtering (`tf_level`)
- `lookahead_level`
- UHQ tuning (`tune: 'uhq'`)
- unidirectional B-frames (`unidir_b`)
- 10-bit and 4:2:2 H.264 (`highbitdepth`, `high10`, `high422`) and the `highbitdepth` option of `hevc_nvenc`
- MV-HEVC (`mv`)
- HEVC/AV1 mastering display metadata

#### `scale_opencl` has no crop options

The `cw`, `ch`, `cx` and `cy` options of `scale_opencl` came from a node-av FFmpeg patch that is gone: jellyfin's `scale_opencl` applies the frame's crop fields itself. `FilterPreset.crop()` on OpenCL now emits `crop=w:h:x:y,scale_opencl=w:h`, and `Scaler` follows. Filter strings that pass the options directly must crop first.

**Migration:**

```typescript
// Before
'scale_opencl=cw=1280:ch=720:cx=320:cy=180'

// After
'crop=1280:720:320:180,scale_opencl=1280:720'
```

### Added

- **Prebuilt binaries for musl Linux (Alpine)** ([#280](https://github.com/seydx/node-av/issues/280)). node-av and `@seydx/node-av-ffmpeg` now install on Alpine and other musl distributions (x64 and arm64), from the new packages `@seydx/node-av-linux-{arm64,x64}-musl` and `@seydx/node-av-ffmpeg-linux-{arm64,x64}-musl`. They are built from the same FFmpeg with the same codecs, filters and hardware APIs as the glibc builds. NVIDIA (CUDA, NVENC, NVDEC) and AMD AMF are unavailable on musl, because their drivers exist only for glibc. VAAPI, QSV and Vulkan need the drivers from Alpine's packages (e.g. `mesa-va-gallium`, `intel-media-driver`, `onevpl-intel-gpu`, `vulkan-loader`). The Linux packages now declare their C library, so npm and pnpm install only the matching one. To install the musl binaries from a glibc system (e.g. for an Alpine image), pass `--libc=musl`.
- **VAAPI on Linux arm64.** The Linux arm64 prebuilds link VA-API like the x64 ones, so `HardwareContext.create(AV_HWDEVICE_TYPE_VAAPI)` and the `*_vaapi` codecs and filters work on arm64 boards with a VA-API driver.
- **`DeviceMode.codecId` identifies compressed capture modes** ([#349](https://github.com/seydx/node-av/issues/349)). MJPEG and H.264 (and HEVC on Linux) camera modes reported `pixelFormat: AV_PIX_FMT_NONE` and nothing else, so they couldn't be told apart. Raw modes now report `AV_CODEC_ID_RAWVIDEO` next to their pixel format, compressed modes their codec (`avGetCodecName(mode.codecId)` → `'mjpeg'`). On Windows, modes described by a `VIDEOINFOHEADER2` are listed too.
- **`AV_PROFILE_DTS_HD_HRA_X`, `AV_PROFILE_DTS_HD_HRA_X_IMAX` and `FF_DECODER_LIBCELT`.**

### Performance

- **HEVC software decoding is about 13 % faster** per thread (4K on Apple Silicon: ~128 → ~148 fps single-threaded, about 9 % less CPU multithreaded), from FFmpeg master's residual decoding and deblocking improvements. Output is bit-identical; the HEVC conformance suite passes.
- **Hardware frame downloads reuse their buffers.** `av_hwframe_transfer_data()` into an empty frame (used by the `Decoder` and `Scaler` when they move hardware frames to system memory) now takes the buffer from a pool instead of allocating it per frame. Per download: CUDA on a GTX 1080 (Windows) 1.8 → 0.9 ms at 1080p and 6.2 → 2.5 ms at 4K, D3D11VA 1.8 → 1.1 ms and 6.9 → 3.9 ms, VAAPI on an Intel N100 7.0 → 3.3 ms at 1080p (4K unchanged). macOS's allocator already cached these buffers, so it shows no difference there.

### Changed

- **Codec constants carry the right media type.** 13 encoders and 67 decoders were typed as video. Among them are audio codecs like `libgsm`, `libopencore_amrnb`, `libshine`, `ape` and `als`, and subtitle codecs like `mov_text`. `Encoder.create()`/`Decoder.create()` now type the options for what the codec really is.
- **Option types match what FFmpeg reports at runtime.** The generators now expand macro-built option tables and resolve classes and option arrays across files. The output is checked against a runtime dump of the build.
  - Many hardware codecs gained option types (`*_cuvid`, `*_qsv`, `*_rkmpp`, `*_v4l2m2m`, `*_mediacodec`, `*_amf`, …), as did raw, PCM and image-pipe formats and filters such as `vpp_qsv`, `scale_qsv`, the `*_d3d11` and `*_videotoolbox` filters, the biquad audio filters and `lut*`.
  - Options that never existed are gone: `noise`'s `all`/`c0`–`c3` (really `all_seed`, `c0_strength`, …), `selectivecolor`'s `red`, `green`, … (really `reds`, `greens`, …), framesync options on `lut3d` and `tblend`, and `file` on `haldclut`.
- **`MuxerFormat` and `DemuxerFormat` list every format.** 21 muxers and 75 demuxers were missing: PCM, raw bitstreams like `h264`, `hevc` and `mjpeg`, and the image pipes.
- **The bundled Windows `ffmpeg.exe` has an application icon** (jellyfin's `fftools.ico`).

### Fixed

- **The `whisper` filter no longer crashes the process on Linux systems without a Vulkan loader** (`libvulkan.so.1`), e.g. Docker containers without a GPU stack. Transcribing there (`WhisperTranscriber` or the filter directly) ended in a segmentation fault, even with GPU use disabled. ggml now skips its Vulkan backend when no loader is found and transcribes on the CPU.
- **Closing an RTSP input sends TEARDOWN.** `Demuxer.close()` interrupts pending I/O first, which also aborted the TEARDOWN, so cameras kept the session alive until it timed out (60 s with mediamtx over UDP) and could reject an immediate reconnect with "453 Not Enough Bandwidth". The TEARDOWN is now sent and its reply read within 500 ms.
- **RTP/RTSP depacketizer fixes from FFmpeg master:** MPEG-TS over RTP no longer loses data after a reordered packet, RTCP receiver reports clamp cumulative loss correctly, SRTP setup errors are reported, and malformed H.264 framesize, Opus and AV1 payloads and SampleRate attributes are rejected. Redirects are limited.
- **H.264 streams with lost frames decode better with hardware decoding.** Frames filling a `frame_num` gap had invalid field POCs and lacked the hardware decoder state of the frame they duplicate, so frames referencing them decoded wrong. With VAAPI on an Intel N100, 551 instead of 403 of 878 frames of a test stream with dropped frames now match the software decoder. NVIDIA (NVDEC, D3D11VA) was barely affected.
- **HEVC deblocking and chroma SAO fixes** for deblocking offsets taken from the wrong CTB and chroma SAO with 16×16 CTBs.
- **`h264_videotoolbox`/`hevc_videotoolbox` no longer crash when opened again in the same process** after encoding a transfer characteristic CoreVideo has no constant for (e.g. V-Log). Also fixes a double free when a frame submission fails, leaks when frames are dropped or on error paths, and timestamps when VideoToolbox returns another timescale.

## [6.2.0] - 2026-11-01

### Performance

- **`Muxer` writes packets with less overhead.** The timestamp fixup reads each timestamp once and per-stream state once per stream instead of from native code on every access; remuxing is 7–14 % faster with identical output.
- **Rational getters are about 2.5× faster** (`Frame.timeBase`, `Stream.timeBase`, `CodecContext.framerate`, …): the `{ num, den }` object is created in JS instead of natively.
- **`Scaler` writes scaled output directly into the result buffer** when the packed layout allows it, skipping the staging copy.
- **`FilterAPI.create()` accepts a function that builds the description from a frame.** It runs for the first frame and again whenever the graph is rebuilt for frames with other properties, so the graph can follow what the frames turn out to be, e.g. hardware frames, or software frames after a decoder fell back. When the graph fails to configure, the function is asked once more with the error and can return another description, e.g. one without the device filter the driver refused.


### Added

- **`Encoder.requestKeyframe()`** encodes the next frame as a keyframe, e.g. to answer an RTCP PLI. With `forced-idr` set it is an IDR.
- **`AV_PKT_DATA_RTP_TIMESTAMP` packet side data.** The bundled FFmpeg's RTP demuxer attaches each packet's raw 32-bit RTP timestamp (little-endian `uint32`), so packets can be correlated by the sender's clock instead of the rebased `pts`. Read it with `packet.getSideData(AV_PKT_DATA_RTP_TIMESTAMP)`.
- **`RTPStream`, `WebRTCStream` and `FMP4Stream` accept a frame source.** Besides a URL or `Demuxer`, `create()` takes `{ video?, audio? }` as `AsyncIterable<Frame | null>` (`MediaFrameSource`) and encodes the frames directly, e.g. a composited `FilterComplexAPI` output. See `examples/api-webrtc-pip.ts` and `examples/api-fmp4-pip.ts`.
- **`WebRTCStream` handles the peer lifecycle.** It answers RTCP PLI with a keyframe (new `RTPStream.requestVideoKeyframe()`), starts streaming after `setOffer()` (`start()` stays valid and idempotent) and stops with `onClose` when the peer disconnects (ICE consent, RFC 7675).
- **`FilterComplexGraph.create()` accepts a `HardwareContext`.** Each `chain()` then selects hardware filters like `FilterPreset.chain(hw)` (e.g. `scale_vaapi`, `overlay_videotoolbox`), so decoding, compositing and encoding can stay on the GPU.
- **`maxQueuedFragments` on `FMP4Stream`** (default 16). When a consumer of a live source falls behind, the oldest media fragments are dropped instead of buffered without limit; the init segment is kept and `droppedFragments` counts what was shed.
- **`FormatContext.seekFileSync()`**, the synchronous mirror of `seekFile()`.
- **`dtsBackwardThreshold` on `Muxer` and `FMP4Stream`** (seconds, `0` = off). A packet whose DTS lies more than this behind the stream's last written DTS fails the write instead of being clamped, which collapsed the timeline until the source caught up ([#351](https://github.com/seydx/node-av/issues/351)); smaller jumps are still clamped. Off by default in `Muxer`.
- **`dtsForwardThreshold` on `Muxer` and `FMP4Stream`** (seconds, `0` = off). A packet whose DTS runs further ahead of real time than this fails the write before it reaches libavformat; real gaps pass because real time passed with them. Off by default in `Muxer`.
- **`maxPacketAge` on `FMP4Stream`** (seconds, `0` = off). A packet held in the muxer longer than this, measured in real time, ends the session, so broken or missing timestamps can no longer pile up packets without output until memory runs out.
- **`audioFrameBuffer` option on `Encoder`** (`AudioFrameBufferOptions`, also accepted by `AudioFrameBuffer.create()`). `maxGapFill` (seconds, default 1) is the largest input gap filled with silence; `timestamps: 'samples'` counts the output from 0 as before. Real-time RTP outputs should use `maxGapFill: 0`, as `RTPStream` does.
- **`output` option on `Scaler.toBuffer()`/`toBufferSync()` and `Frame.toBuffer()`.** The result is written into the caller's `Buffer` instead of a new one; the returned buffer is a view of its first bytes.
- **`FMP4Stream` transcodes audio to Opus when the client lists Opus but not AAC.** Unsupported input audio is encoded with libopus at 48 kHz in 20 ms frames, mono input stays mono, and `getCodecString()` reports `opus`. With AAC in `supportedCodecs` the target stays AAC as before.
- **`Decoder.decodeErrors`** counts the packets and frames that failed to decode, like the ffmpeg CLI's decode error count; useful with `exitOnError: false`, where these errors are skipped.
- **`FilterPreset.supports(operation)`** tells whether a chain's hardware has a filter for an operation (e.g. `scale` on D3D11VA or MediaCodec), since the builder methods skip unsupported ones and leave the chain unchanged.
- **`hardwareFallback` on `Decoder`.** A hardware decoder that produces nothing (no frame within 16 packets plus its thread count after the first keyframe, or two keyframes in a row without output later) is replaced by a software decoder, and the packets since the last silent keyframe are decoded again, so no picture is lost. `RTPStream` and `FMP4Stream` turn it on.
- **`OutputFormat.getCodecTag()`/`getCodecId()`** look up a format's codec tag table (`av_codec_get_tag2`, `av_codec_get_id`), and **`avGuessFrameRate(stream)`** wraps `av_guess_frame_rate`.
- **`video.transcode` on `RTPStream` and `FMP4Stream`.** The video is encoded again even when its codec is one of `supportedVideoCodecs` (`supportedCodecs` for `FMP4Stream`), so `width`, `height`, `fps` and `bitrate` apply to a stream that would otherwise pass through.

### Changed

- **Windows MinGW builds are discontinued.** Only the MSVC prebuilds (`@seydx/node-av-win32-{x64,arm64}-msvc`) are published; a MinGW-compiled Node.js loads them as well, and the bundled FFmpeg binary is the standard Windows build.
- **`Packet.timeBase` returns a `Rational`** like `Frame.timeBase` ([#284](https://github.com/seydx/node-av/issues/284)). The setters still accept any `{ num, den }` object.
- **Demuxer read errors are errors, not end-of-file.** A disconnect or I/O failure ended `packets()` like a finished file; it now throws an `FFmpegError` after the buffered packets and rejects `pipeline().completion`. `interrupt()`, `stop()` and abort signals still end cleanly.
- **`findStreamInfoSync()` takes a `Dictionary[]`** like the async variant; the single-`Dictionary` form read out of bounds on multi-stream inputs. The dictionaries are copied, not consumed.
- **`BitStreamFilterAPI.flush()` no longer discards buffered packets.** It only signals EOF, so they can be drained with `receive()`; use `reset()` to discard.
- **`werift` is an optional peer dependency.** Install it (`npm install werift`) to use the WebRTC APIs.
- **Untyped `setOption(name, value)` uses the option's declared type** (via `av_opt_find`) instead of always writing a string; string values are still parsed by FFmpeg.
- **Passing the wrong wrapper type throws a `TypeError`.** Native methods reinterpreted any object they were given (e.g. a `Packet` where a `Frame` was expected) and corrupted memory; every unwrap is type-checked now.
- **`AudioFifo` validates plane counts.** Passing fewer plane buffers than channels to `write`/`read`/`peek` throws a `TypeError` instead of corrupting memory.
- **Freeing an object with native operations in flight is safe.** `free()`/`close()` (and `unref()`/`alloc()` on `Frame` and `Packet`) wait up to ~2 s for running operations and then throw a "busy" error instead of freeing memory under them; custom-IO contexts throw immediately. Closing a `FormatContext` interrupts a blocked network read first.
- **`fps` on `RTPStream` no longer re-times passthrough streams**; it only applies where frames are encoded. Passthrough uses the input's real frame rate instead of a fixed 20 fps, which played faster sources in slow motion.
- **Packaging:** platform packages are pinned to the exact main version, `engines` requires Node ≥ 22.18 and releases are published with `--provenance`. The postinstall FFmpeg download verifies SHA256 checksums, retries, skips binaries that are already present and no longer fails `npm install` on disk errors; unsupported platforms get a clear install message.
- **`FormatContext.metadata` and `Stream.metadata` are documented to return a copy**: modify it and assign it back to apply changes.
- **Input reads run on a reader thread per input instead of the libuv threadpool**, like the ffmpeg CLI's demuxer threads, so live inputs no longer starve the threadpool. The first async `readFrame()` starts it and packets reach JS through a bounded queue (16 packets / 8 MB); while it runs, sync variants and assigning `pb` throw, so do not mix `packets()` and `packetsSync()` on one demuxer.
- **`FMP4Stream.initSegment` rejects when the stream fails or stops before producing it** instead of never settling, and `fragments()` rejects a second concurrent consumer.
- **`FMP4Stream` ends a session on a backward DTS jump of more than 10 s** with `onClose(error)` instead of continuing with a collapsed timeline. This also affects looped or concatenated inputs; set `dtsBackwardThreshold: 0` to keep clamping.
- **`FMP4Stream` ends a live session when the DTS jumps more than 10 s further ahead than the time that passed.** On for live URLs (rtsp, rtmp, rtp, udp, srt, tcp, …), off for files, HTTP inputs, a pre-opened `Demuxer` and frame sources; set `dtsForwardThreshold` for those if they are live.
- **`FMP4Stream` treats `rtsps`, `rtmps`, `rtmpt`, `rtmpe`, `rtmpte`, `rtmpts`, `srtp` and `tls` URLs as live inputs**, with the low-latency input options (`nobuffer`, `low_delay`) and the forward check.
- **`FMP4Stream` ends a session when a packet waited more than 60 s in the muxer** (`maxPacketAge`). This also fires when no fragment is emitted for that long, e.g. audio-only output with `fragDuration: 0`; set `maxPacketAge: 0` to keep the old behavior.
- **`FMP4Stream` drops buffered output when a session fails.** No `onData` follows the error and no trailer is written, so a failed session no longer ends with a fragment placed after a timestamp jump. `stop()` and a clean end still emit everything.
- **Exceptions thrown by `onClose` in `FMP4Stream` and `RTPStream` are logged with `console.error`** instead of propagating, and `onClose` fires exactly once per session (a throwing callback used to fire it twice and cause an unhandled rejection).
- **Encoded audio keeps the input timing.** Fixed-frame-size encoders (AAC, Opus, MP3, …) and `autoResample` re-stamped their output from 0 by sample count, so audio that started late or had gaps drifted against the video. Frames now carry their first input sample's timestamp; gaps up to 1 s are filled with silence, overlaps up to 1 s are dropped and larger jumps restart the timeline (`audioFrameBuffer: { timestamps: 'samples' }` restores the old behavior).
- **Decoders with `exitOnError: false` pass corrupt frames on** with their `decodeErrorFlags`/`AV_FRAME_FLAG_CORRUPT` set instead of dropping them, as the ffmpeg CLI does; with `exitOnError: true` they still throw.
- **Audio encoders use the codec's default bitrate** when none is set, as the ffmpeg CLI does, instead of a fixed 128 kbit/s: G.726 encodes the standard 32 kbit/s instead of 40, G.723.1 opens at all, AAC gets 69 kbit/s per mono channel and Opus 64 (mono) or 96 kbit/s (stereo). Video keeps the 1 Mbit/s default.
- **`FMP4Stream` encodes video without B-frames**, like `RTPStream` and libx264 with `zerolatency`. Hardware encoders default to B-frames, which delay every fragment, and `h264_d3d12va` failed with them on a driver that reports support for them (GTX 1080).
- **`RTPStream` and `FMP4Stream` start decoding live video sooner.** Frame threading held back one frame per thread (up to 16) before the first output, ~0.6 s at 25 fps. Hardware decoding now uses slice threading and software decoding at most 4 frame threads; `FMP4Stream` keeps the full thread count for file inputs.
- **`RTPStream` derives the video bitrate from the picture when none is given.** A transcode without `video.bitrate` encoded at the encoder's 1 Mbps default, which blocks up at camera resolutions. The target now follows size and frame rate (0.1 bit per pixel for H.264, 0.06 for HEVC) and is capped like an explicit bitrate.
- **`RTPStream` never scales the video up.** A `video.width` or `video.height` larger than the source keeps the source size, since a bigger picture only raises the bitrate.
- **`RTPStream` sends a keyframe every 2 seconds when it transcodes a URL or `Demuxer` input.** Frame sources and `FMP4Stream` already did. Before, the encoder default applied, 120 frames for VAAPI and 250 for libx264 and NVENC, so a receiver that lost a packet showed a still picture for up to 8 s at 15 fps.
- **`RTPStream.requestVideoKeyframe()` also works when a URL or `Demuxer` input is transcoded.** It only applied to frame sources, so a receiver that lost packets waited for the next scheduled keyframe. A passed-through stream keeps the source's keyframes.
- **`FMP4Stream` never scales the video up**, like `RTPStream`. A `video.width` or `video.height` larger than the source keeps the source size.
- **`FMP4Stream` tests a hardware encoder with the size it will encode**, like `RTPStream`, so a GPU that cannot encode that size falls back to software before the stream starts.

### Fixed

- **macOS prebuilds include FFmpeg's Metal filters** (`overlay_videotoolbox`, …). The Metal toolchain is a separate download since Xcode 26 and FFmpeg silently dropped them; the build now requires Metal.
- **`FilterPreset.overlay()` emits named options** (`overlay=x=…:y=…`), which hardware overlays such as `overlay_videotoolbox` require.
- **`FilterComplexAPI.frames()`/`framesSync()` close their input iterators when stopped early.** Unclosed upstream generators could block the demuxer's read loop and deadlock teardown.
- **`FilterComplexAPI` no longer ends the whole graph when one input ends.** EOF flushes only that input and the filter decides how to continue (e.g. overlay's `eof_action`), as in the ffmpeg CLI.
- **The low-level decoding example in the README flushes the decoder** and frees received frames; it dropped the last frames ([#283](https://github.com/seydx/node-av/issues/283)).
- **Resampled audio plays at the right speed.** When the encoder forced another sample rate (e.g. 44.1 kHz → 48 kHz for Opus), the codec time base kept the input rate, making audio about 8.8 % slow.
- **Audio encodes keep the final partial frame.** Fixed-frame-size codecs dropped up to `frameSize − 1` samples on flush; the tail is now encoded as a silence-padded frame (`AudioFrameBuffer.pullPartial()`).
- **A failed background write no longer deadlocks the `Muxer`.** Pending and later writes reject with the error, and `close()` frees all resources before surfacing it.
- **The fMP4 box parser no longer loses bytes when a write splits a box header.** Partial headers are buffered across writes, and 64-bit box sizes are supported.
- **RTP timestamps are derived from PTS again** instead of a fixed increment per marker, which broke B-frame passthrough and drifted on variable frame rates.
- **Named pipelines with multiple outputs close their muxers.** Trailers were never written; each muxer is now closed once all its streams complete, and a failing stream rejects `completion`.
- **Bitstream filters no longer drop packets on `EAGAIN`**, and `packets()` signals EOF to the filter so buffered packets are emitted.
- **Concurrent `Scaler` and `EncoderPool` use is safe.** Parallel calls shared one filter graph (crash under load) and eviction could close an encoder mid-encode; entries now carry a lock and a reference count.
- **Two `packets()` readers on one demuxed stream no longer deadlock the demuxer**; all waiters are woken.
- **`IOStream` adapters no longer leak or hang.** A `Readable` error is a read error instead of EOF, a destroyed `Writable` fails the write instead of hanging, and closing a demuxer early detaches the adapter's listeners.
- **Whisper timestamps follow the frames' PTS**, so silence no longer shifts segments, and `transcribe()` flushes at the end of input so short inputs emit their segments.
- **`Stream.attachedPic` returns a working `Packet`** with its own reference to the picture data, instead of a native object whose methods all threw.
- **`FormatContext.freeContext()` no longer closes a custom output `pb`**, which freed the callback data like a file handle (double free at exit); the `IOContext` stays its owner.
- **`Encoder.close()` and `Decoder.close()` no longer crash in `av_packet_unref` under load**: the codec context is now freed before the packet or frame it fills.
- **Native memory-safety fixes** in `open2Sync()` with a `Dictionary`, `Frame.fromBuffer()` for video, `frame.data`/`extendedData`/side-data views after `unref()`, `hwFramesCtx`/`deviceRef` wrappers, custom `AVIOContext` buffers, `HardwareDeviceContext.create()` with several devices, the YUVA alpha plane in `extendedData` and async disposal of output `FormatContext`s.
- **`packet.data = buf` keeps the packet's metadata, `closeInputSync()` no longer spins forever, and unused thread-safe functions are released**, so they no longer keep the process from exiting.
- **`Decoder.createSync()` sets `AV_CODEC_FLAG_COPY_OPAQUE`** like `create()`, so packet opaque data reaches the frames.
- **`HardwareContext.auto()` no longer mutates the caller's options.**
- **`getOption(name, AV_OPT_TYPE_INT64)` returns exact values** beyond 2^53.
- **Unset timestamps (`AV_NOPTS_VALUE`) pass through the encoder and filter paths** instead of being rescaled into garbage.
- **`Scaler` no longer grows without bound with changing crop geometries**; its scaler and frame pools are LRU-bounded.
- **Hardware filter graphs no longer leak the hardware frames context.** Every hardware `FilterAPI` graph pinned the decoder's frame pool and device (on VAAPI a DRM fd and the surface pool), so processes that rebuild graphs accumulated GPU memory.
- **`Scaler` applies crops on hardware when the target size equals the frame size.** `scale_vaapi`, `scale_cuda` and `vpp_qsv` skipped themselves and returned the uncropped frame.
- **Hardware scalers clear consumed crop metadata** (`scale_cuda`, `vpp_qsv`, `scale_rkrga`), so a following GPU filter no longer crops twice.
- **Audio encoders get the real samples under Electron**, where `Frame.data` is a copy: AAC rejected the frames and Opus produced noise (since 5.2.0).
- **Rejected audio frames no longer pile up in the `Encoder`** (up to about 1.3 GB per stereo AAC stream); they are skipped.
- **`FMP4Stream` video transcoding no longer makes every frame a keyframe with the default `fragDuration`.** Below 0.5 s the GOP is 2 s; from 0.5 s on it follows the fragment duration.
- **MP4/MOV outputs no longer abort or break on huge timestamp jumps.** The `Muxer` rejects a DTS step or packet duration of INT_MAX ticks or more with an error, also with `exitOnError: false`; movenc either aborted the process or collapsed the step into a broken timeline.
- **A clamped packet's duration shrinks to the clamped step**, which otherwise could end in a negative sample duration and an abort in movenc.
- **Fragmented MP4 no longer aborts on a late-arriving stream whose first packet lies before the output's start.** Without an edit list it became a sample of negative duration; it now fails the write, which ends an `FMP4Stream` session through `onClose(error)`.
- **`Muxer` no longer loses packets written while the header is being written**, which could cut the start of an output with two or more streams.
- **`FMP4Stream` teardown after a write error releases everything.** `stop()` rethrew the writer's error and skipped closing the codecs and the input; it now resolves, and the error reaches `onClose(error)` exactly once. `RTPStream.stop()` got the same guard.
- **Exiting no longer hangs while a custom-IO callback is pending.** Once the environment exits, pending and later callbacks fail with `AVERROR_EXIT`, so `process.exit()` and `worker.terminate()` complete; while running, callbacks are still awaited without a timeout.
- **Ending a process or worker no longer aborts or hangs** while a `Demuxer` is still reading or a callback-backed `IOContext` is still allocated.
- **Closing a `Demuxer` no longer hangs on a stalled custom-IO source** (`Readable` or `IOInputCallbacks`). Closing or interrupting fails the pending read, seek or probe with `AVERROR_EXIT`, and the context does not call its callbacks again; `closeSync()` no longer throws on an active reader.
- **`FormatContext.closeInputSync(true)` no longer crashes while `openInput()` is still running.**
- **`process.exit()` no longer waits for stalled network I/O.** An open, read or write blocked on a peer that stopped answering (e.g. a `Demuxer.open()` reconnect in flight) held the exit until its socket timeout; it now aborts with `AVERROR_EXIT` once the process exits. Outputs opened with `FormatContext.openOutput()` now also honor `interrupt()`.
- **Streams no longer read freed memory after their input or output is closed.** A `Stream`, its `codecpar` and `parser`, and a `BitStreamFilterContext`'s `inputCodecParameters`/`outputCodecParameters` pointed into memory the owning context frees; reading them afterwards (e.g. `stream.index` in a callback still running after `Demuxer.close()`) could crash the process on Windows. They now read their defaults (`index` -1) and ignore writes once the owner is closed or freed.
- **Filter contexts no longer use freed memory once their graph is freed.** A `FilterContext` (from `createFilter()`, `getFilter()`, `filters` or `FilterInOut.filterCtx`) and a `FilterGraphSegment` point into their `FilterGraph`; using them after `graph.free()`, or after the graph was garbage-collected while only the buffer source and sink were kept, crashed the process. They now read their defaults (`name` null), sync frame operations throw and async ones resolve `AVERROR_EINVAL`. `graph.free()` also waits for buffersrc/buffersink operations still running on its contexts.
- **`FilterGraph.parsePtr()` passes whole input/output lists.** It handed FFmpeg only the first entry of each list, so a second labeled input or output stayed unconnected, and leaked the lists. `parse()` and `parsePtr()` now pass copies; the `FilterInOut` lists stay valid and are freed with `free()` (or by GC) as usual.
- **`FilterGraphSegment.apply()` no longer leaks the pad lists it returns**, which cost every `FilterAPI` and `FilterComplexAPI` initialization a few hundred bytes. `free()` on them now releases them.
- **`FilterInOut` nodes no longer use freed memory once the head of their list is freed.** Nodes reached through `next` and lists appended to another read their defaults (`name` null) and ignore writes afterwards.
- **An `IOContext` opened with `open2()` and set as an output's `pb` is closed exactly once.** Both the `IOContext` and the `FormatContext` closed it, so `closep()` followed by `freeContext()` (the order of FFmpeg's `transcode.c`, and of `examples/transcode.ts`) or the reverse freed it twice and crashed the process. Whichever closes it first now clears the other's copy: `closep()` also clears the context's `pb`, as `avio_closep(&ctx->pb)` does in C. An `IOContext` can be the `pb` of only one `FormatContext` at a time; assigning it to a second one throws.
- **`closeOutput()` leaves a callback-backed `pb` to its `IOContext`**, as `closeOutputSync()` already did. It closed it with `avio_closep()`, which treats the callback opaque as a protocol handle.
- **A `Demuxer` opened from a `Readable` and dropped without `close()` no longer leaks its I/O context.** The demuxer itself was garbage collected, but the `IOContext` reading the stream stayed reachable through its own read callback, together with the stream and its buffered data ([#372](https://github.com/seydx/node-av/issues/372)).
- **An `IOContext` that is never freed or closed is released once it is garbage collected.** Its finalizer freed nothing, so its I/O buffer leaked, and an `open2()` context also kept its file or connection open with unwritten data. It now frees it as `freeContext()` does, or closes it (flushing first) as `closep()` does, unless the output whose `pb` it is closes it or threadpool work still uses it.
- **Stream copy into another container resets foreign codec tags** like the ffmpeg CLI. Remuxing MP4 into Matroska kept tags such as `mp4a`, which the Matroska muxer rejects; tags the target format knows for the codec (e.g. `hvc1` in MP4/MOV) are kept.
- **Encoders created from a decoder without a frame rate guess it from the stream** (`av_guess_frame_rate`, e.g. VP9 in WebM). They used the stream time base (often 1/90000) instead, so libx264 picked level 6.2 and the rate control was off.
- **Encoders keep video timestamps strictly increasing**, like the ffmpeg CLI's VFR sync. Frames that rounded onto the same tick of the encoder time base (e.g. a burst from a source timed by wallclock, at 1/25) reached the encoder with duplicate pts (x264: "non-strictly-monotonic PTS"); such a frame now moves to the next tick, or is dropped if it ends before it, and a keyframe requested on a dropped frame goes to the next one.
- **`FMP4Stream` and `RTPStream` scale on hardware without a scaler.** On D3D11VA or MediaCodec the scale filter was skipped and the source size kept; D3D11VA and D3D12VA now scale on the GPU, devices without a scaler on the CPU after the frames leave the GPU.
- **`FilterPreset` scales on D3D11VA and D3D12VA** with `scale_d3d11` and `scale_d3d12`; `scaleFormat()` emitted `scale_d3d11va`, which does not exist.
- **`Scaler` handles hardware frames on D3D11VA, D3D12VA and devices without a GPU scaler.** Every call failed there ("Filter not found"); D3D11VA and D3D12VA now scale on the GPU, and since their scalers ignore the crop, cropped calls download the frame and crop in software, as devices without a scaler (DXVA2, MediaCodec, DRM, VDPAU) now always do.
- **`Decoder.create()`/`Encoder.create()` (and the `Sync` variants) no longer modify the options object passed in**, so one object can be reused, e.g. a shared `hardware` option for an audio and a video decoder.
- **`Muxer` encoders created lazily keep the input stream's metadata, disposition, side data and duration** when the input `Demuxer` is closed before the first packet; they were read from the closed stream and came out empty.
- **`RTPStream` and `FMP4Stream` transcode on the GPU where they used to fail.** The filters between decoder and encoder are chosen from the decoded frames: they stay on the GPU and are converted to NV12 there when the encoder needs it (VAAPI decodes JPEG into surfaces `h264_vaapi` cannot encode, 10-bit sources arrive as P010), software frames are converted and uploaded for the hardware encoder (MJPEG on VideoToolbox and D3D11VA, 4:2:2 JPEG that NVDEC hands back in software), and scaling runs on the GPU where it can.
- **`RTPStream` and `FMP4Stream` fall back to software when the GPU cannot encode.** A hardware encoder has to encode a test frame first (once per process; a failed one is tried again after a minute), so an NVENC whose driver is older than the bundled API, or a GPU without an encoder, encodes with libx264 instead of ending the stream, while decoding and scaling stay on the GPU. A hardware decoder that fails to open or produces no frames decodes in software, and device filters that fail to configure are replaced by a conversion in software. Devices without an encoder of their own (D3D11VA, DXVA2, OpenCL, VDPAU, DRM) try NVENC, QSV and AMF in turn.
- **Transcoded video is 8-bit 4:2:0 in software too.** A 4:2:2 JPEG camera or a 10-bit source was encoded as High 4:2:2 or High 10, which browsers and HomeKit cannot decode.
- **`FMP4Stream` with `video.fps` gives the encoder that frame rate** instead of the source's.
- **Encoders no longer take a stream clock for the frame rate.** After a short probe (`RTPStream` opens RTSP with `analyzeduration 0`), `av_guess_frame_rate` returns the inverse time base for MJPEG, 90000 fps: `h264_vaapi` failed with an internal encoding error, `h264_qsv` with "Function not implemented" and libx264 picked level 6.2. Guesses above 240 fps are ignored, and frames on such a clock with no known rate are encoded as 25 fps, as the ffmpeg CLI does.
- **`RTPStream.requestVideoKeyframe()` works for frame sources.** The encoder cleared the requested picture type, and only libx264 was told to make it an IDR; NVENC, QSV and AMF get their forced-IDR option now.
- **`HardwareContext.testEncoder()` and `getEncoderCodec(…, true)` accept VAAPI, Vulkan and D3D12 encoders.** The test downloaded the frames to the CPU, and encoders that take only device frames rejected them.
- **`HardwareContext.testDecoder()` tests HEVC, AV1 and VP9 in common profiles.** The bundled test bitstreams were HEVC Main Intra, AV1 High 4:4:4 and VP9 Profile 1, which most GPUs cannot decode, so these codecs were reported as unsupported on GPUs that decode them (VAAPI, QSV and Vulkan on Intel, VideoToolbox).
- **`FMP4Stream` encodes at the set bitrate.** `video.bitrate` only capped the encoder's 1 Mbps default target, so a transcode came out at about 1 Mbps whatever was set. The bitrate is now target and cap, and without one the target follows size and frame rate as in `RTPStream`.
- **`FMP4Stream.getVideoInfo()` reports the size the video is encoded at.** With only `video.width` set it gave the source height.

## [6.1.1] - 2026-07-06

### Added

- **`Demuxer.interrupt()`** aborts an in-progress blocking read (e.g. `av_read_frame` on a quiet RTSP/network source) without freeing the demuxer, so an active pipeline can drain and shut down before `close()`. `PipelineControl.stop()` now calls it on the source demuxer(s) automatically.

### Fixed

- **`RTPStream` / `FMP4Stream` / `pipeline().stop()` could hang on teardown of a live source.** `stop()` awaited the pipeline's completion before closing the input, but a blocking read on a quiet RTSP/network source only unblocks when the input is interrupted — so completion waited for the read while the read waited to be unblocked (deadlock). `PipelineControl.stop()` now interrupts the source demuxer's read (via the new `Demuxer.interrupt()`), so the pipeline drains and completion resolves before close. A related teardown deadlock in the per-stream backpressure loop (a full queue whose consumer had already stopped starved the other streams) is fixed too.
- **Aborting a `Demuxer`'s `signal` now cancels an in-progress blocking read.** The abort handler previously only flagged the read loop to stop, leaving the demux thread parked in `av_read_frame()` until data happened to arrive; it now interrupts the read so cancellation takes effect immediately.

## [6.1.0] - 2026-06-27

### Added

- **Typed `context` / `graph` field bags and a `configure` hook on `Encoder`, `Decoder`, `FilterAPI`, `FilterComplexAPI`, `Muxer` and `Demuxer`.** `context` (encoder/decoder/muxer) and `graph` (filters) are typed bags of the writable fields on the underlying native object (e.g. `context: { bitRate: '5M', gopSize: 60, colorPrimaries: AVCOL_PRI_BT2020 }`); rate-control fields still accept `'5M'`-style strings. `configure(ctx | graph | fmt)` is a callback for what the bag cannot express — flags via `setFlags`, methods, or setter-only forms such as a `'hvc1'` FourCC string for `-tag:v hvc1`. Both run right before the object is opened/finalized (`avcodec_open2`, `avfilter_graph_config`, `avformat_write_header`), the bag first; for the muxer after the source metadata/disposition are copied, so values set there take precedence. The `Demuxer` exposes only `configure(fmt)`, called after `avformat_open_input` / `avformat_find_stream_info`.

  ```typescript
  const encoder = await Encoder.create(FF_ENCODER_LIBX265, {
    decoder,
    context: { bitRate: '5M', gopSize: 60 },        // typed, declarative field bag
    configure: (ctx) => { ctx.codecTag = 'hvc1'; }, // imperative escape (-tag:v hvc1)
  });
  ```
- **`HardwareContext.auto()` accepts a `prefer` option** to prioritise specific hardware type(s) over the platform default order, e.g. `auto({ prefer: AV_HWDEVICE_TYPE_VAAPI })` to pick VAAPI ahead of QSV on Intel. Preferred types are tested first (and kept only if available), then the usual platform fallback applies.
- **Bitstream filter extradata is now reflected in the output parameters.** Filters that adapt container framing (`aac_adtstoasc`, `extract_extradata`, `dump_extra`, `*_mp4toannexb`) emit the resulting global headers as packet side data rather than on `par_out`. `BitStreamFilterAPI.outputCodecParameters` now folds that side data in, so a stream copy that relies on it (including `Muxer`'s `bsf` option) writes a header with the correct codec configuration.

### Changed

- Synced FFmpeg with the latest master (~380 upstream commits) — numerous bug fixes, stability and performance improvements. Highlights relevant to node-av users:
  - **Security hardening** — ~29 overflow / bounds fixes across decoders, demuxers and filters
  - **swscale PAL8** — palette video handled by the new ops scaler engine
  - **AMF** — zero-copy host memory mapping, HDR/colour metadata propagation, `high_quality` encoder preset
  - **NVENC** — AV1 hierarchical B-frame reference mode
  - **D3D11VA** — native P016 (10/16-bit YUV 4:2:0) hardware decoding on Windows
  - **ONNX Runtime DNN backend** — GPU inference for ML-driven filters (super-resolution, denoise, …)
  - **Dolby Vision** — RPU detection across all NALs (better DoVi interop)
  - Fragmented-MP4 / DASH / HLS correctness fixes
  - Faster decode/encode on x86 (H.264 AVX2 intra-prediction, me_cmp SSSE3), AArch64 NEON and RISC-V RVV
- Regenerated constants, encoders, and decoders from updated FFmpeg headers

### Deprecated

- **Raw codec/graph field options moved to the `context` / `graph` bag.** `Encoder`'s `bitrate` / `minRate` / `maxRate` / `bufSize` (→ `context: { bitRate, rcMinRate, rcMaxRate, rcBufferSize }`, still accepting `'5M'`-style strings), `gopSize`, `maxBFrames`, `threadCount`, `threadType`; `Decoder`'s `threadCount` / `threadType`; and `FilterAPI` / `FilterComplexAPI`'s `threads` (→ `graph: { nbThreads }`), `scaleSwsOpts`, `audioResampleOpts`. They still work — set them via the bag instead.

### Fixed

- **Rotation / HDR side data was lost when transcoding.** The muxer copied a stream's `coded_side_data` (display matrix / rotation, HDR mastering display & content light level) only on stream copy, not when re-encoding — so a portrait phone video would play sideways and HDR metadata would vanish after a transcode. The encoder output path now copies it too, matching the stream-copy behaviour.
- **Demuxer dropped packets under backpressure in multi-stream pipelines** ([#263](https://github.com/seydx/node-av/issues/263)). When a single demuxer fed two consumers draining at different rates (e.g. a slow video chain alongside a fast audio chain), the demux thread discarded packets for whichever stream's queue was momentarily full instead of waiting for it to drain. This lost video reference frames and corrupted decoding (`missing reference picture`, `mmco: unref short failure`, `co located POCs unavailable`). The read loop now applies per-stream backpressure and is paced by the slowest consumer, so no packet is dropped.
- **worker_threads safety.** Native class constructor references are now `thread_local`, so node-av objects can be created and used across multiple worker threads without crashing.
- **Cross-compiled Windows installs selected the wrong toolchain** ([#260](https://github.com/seydx/node-av/issues/260)). A cross install (`npm install --os=win32 --cpu=x64`) incorrectly picked the MinGW FFmpeg build; it now defaults to the standard MSVC build (pass `--libc=mingw` to override). See the new Cross-Platform Packaging section in the README.
- **`Scaler` failed on QSV hardware frames** (`Scaler: filter produced no frame`). The Intel QSV scaler (`vpp_qsv`) buffers internally and does not emit a frame synchronously after a single input, so the scaler's process-one-receive-one path got nothing back. It now flushes the graph to drain the pending frame and rebuilds it for the next call. Zero-latency hardware scalers (`scale_vaapi`, `scale_vt`) are unaffected.

## [6.0.0] - 2026-06-04

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

#### `Decoder` `hwaccelOutputFormat` replaced by `rescale`

The `hwaccelOutputFormat` decoder option was removed in favor of the new `rescale` option (see Added), which both downloads hardware frames to system memory **and** guarantees the final pixel format/size in one step. Unlike `hwaccelOutputFormat` (whose value had to be a format the hardware could transfer to directly — typically `nv12`), `rescale: { pixelFormat }` accepts any pixel format and converts on the CPU after the download, so it actually delivers the format you ask for across both hardware- and software-decoded streams.

**Migration:**
```typescript
// Before
const decoder = await Decoder.create(stream, { hardware: hw, hwaccelOutputFormat: AV_PIX_FMT_YUV420P });

// After
const decoder = await Decoder.create(stream, { hardware: hw, rescale: { pixelFormat: AV_PIX_FMT_YUV420P } });
```

### Added

#### `Encoder` audio auto-resampling (`autoResample`)

New `autoResample` option (default `false`) on `Encoder.create()`/`createSync()`. When enabled, the encoder transparently converts incoming audio to the nearest codec-supported sample rate, sample format, and channel layout — e.g. a 96 kHz microphone feeding libmp3lame (which only supports up to 48 kHz), or packed `s16` feeding AAC (which needs planar `fltp`). When disabled, an unsupported input now raises a descriptive error naming the mismatch.

#### `Encoder` video auto pixel-format conversion (`autoFormat`)

New `autoFormat` option (default `false`) on `Encoder.create()`/`createSync()` — the video counterpart of `autoResample`. When enabled, the encoder transparently converts incoming video to a codec-supported pixel format via swscale — e.g. `rgb24` or `yuv444p` feeding libx264. The target is chosen with `avcodec_find_best_pix_fmt_of_list`, so it keeps as much of the source as possible (an RGB input picks `yuv444p` over `yuv420p`) instead of always falling back to the codec's first format. Resolution is never changed (the encoder already adopts the frame's dimensions) and hardware frames are left untouched (their format is negotiated through the hardware frames context). When disabled, an unsupported input now raises a descriptive error naming the mismatch. Also adds the `avcodecFindBestPixFmtOfList()` utility.

#### `Decoder` audio output resampling (`resample`)

New `resample` option on `Decoder.create()`/`createSync()` — the audio mirror of the encoder's `autoResample` and of `rescale` for video. When set, decoded audio frames are transparently converted to the requested `{ sampleRate, sampleFormat, channelLayout }` (any omitted field keeps the decoded value, and conversion is skipped when the source already matches). Unspecified PCM channel layouts are normalized to their canonical native layout automatically. Useful when a capture device delivers a rate you cannot control (e.g. avfoundation ignoring a microphone sample-rate request) and every downstream stage should still receive the rate you asked for. Also adds the `avChannelLayoutDefault()` utility.

#### `Decoder` video output rescaling (`rescale`)

New `rescale` option on `Decoder.create()`/`createSync()` — the video mirror of `resample`. When set, decoded video frames are transparently converted to the requested `{ width, height, pixelFormat }` (any omitted field keeps the decoded value, and conversion is skipped when the source already matches). Hardware frames are automatically transferred to a supported software format first and then converted, so a single option normalizes both hardware- and software-decoded streams; software frames are converted directly. Hardware frames are left on the GPU (zero-copy) when `rescale` is not set. This **replaces** the former `hwaccelOutputFormat` (see Breaking Changes) — `rescale: { pixelFormat }` both downloads hardware frames and guarantees the format. Useful to normalize a heterogeneous set of sources (e.g. RTSP cameras each delivering a different pixel format) so every downstream stage receives a uniform format/size.

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

### Performance

#### `Frame.data` / `Frame.extendedData` / `Packet.data` are cached

The `Frame` `data`/`extendedData` getters used to build a fresh array (plus one `Buffer` wrapper per plane) on **every** access, which could dominate per-sample/per-pixel loops — `frame.data[0][i]` re-paid the allocation on each iteration. The plane array is now built once and cached on the native wrapper, and dropped whenever the frame's buffers may have changed (alloc/free/ref/unref/getBuffer/makeWritable/applyCropping/fromBuffer and every native fill site such as decode/filter/scale/resample/hw-transfer). An un-hoisted per-pixel loop over ten RGB frames drops from ~20 s to ~120 ms.

`Packet.data` similarly used to **memcpy the full payload on every access**; the copy is now made once and cached, dropped whenever the payload may have changed (alloc/free/ref/unref/clone/`data=`/side-data ops and native fills such as demuxing). Setting `packet.data = null` now also reconciles the external-memory report immediately (previously left stale until the next buffer operation).

Observable side effect: `frame.data === frame.data` and `packet.data === packet.data` now hold between buffer changes (each access used to return a new array/buffer).

#### `Frame` and `Packet` buffers now report their size to V8's garbage collector

Native frame and packet buffers are reported to V8 via `napi_adjust_external_memory`, so the GC sees the real memory pressure of decoded/filtered/resampled/scaled/transferred/hardware-allocated frames and demuxed/decoded/encoded/filtered packets instead of just the tiny JS wrapper. Objects abandoned without an explicit `close()`/`using`/`free()` are now reclaimed far sooner — in a decode-and-drop loop the steady-state RSS dropped from ~2.7 GB to ~0.6 GB. Explicit disposal remains the deterministic path; this only lowers the watermark when you rely on the GC.

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

- **`Muxer` `startTime` produced a broken edit list when a stream's timestamps did not actually carry the offset.** Forwarding a live device's `startTime` (a large boot-relative clock value, e.g. ~500000 s from avfoundation) subtracted it from streams that were already zero-based — audio encoders re-stamp their output to a 0 baseline — pushing timestamps hugely negative and overflowing the MP4 edit list (`elst`) media time. Lenient players (ffprobe, VLC) ignored it, but strict ones (QuickTime) honored the garbage edit list and showed a 0:00 duration / refused to play. The offset is now decided per stream on its first packet and clamped to what the stream carries (`min(startTime, max(0, firstPts))`): boot-relative streams still normalize to zero, already-zero-based streams are left untouched.
- **`Encoder` failed to open on audio frames with an unspecified channel layout (e.g. raw PCM / WAV).** Such frames carry `order = AV_CHANNEL_ORDER_UNSPEC` with no mask, which `avcodec_open2()` rejects with "Invalid argument", so encoding decoded PCM to AAC/Opus/etc. errored out. The encoder now normalizes an unspecified input layout to its canonical native layout (and applies it to each frame so the codec and resampler accept it).
- **`Packet.data` setter leaked the previous buffer and side data when a packet was reused.** Assigning `packet.data = buffer` called `av_new_packet()` without first releasing the packet's existing payload, so reusing one packet across a decode/encode loop (the common pattern) leaked the prior buffer and any side data every iteration. The setter now unreferences the packet before allocating, so re-assigning `data` cleanly replaces it. Reported via [mediabunny#392](https://github.com/Vanilagy/mediabunny/issues/392).
- **`CodecParameters.addCodedSideData()` corrupted memory by handing FFmpeg a JS-owned buffer.** It passed the `Buffer`'s pointer directly to `av_packet_side_data_add()`, which takes ownership of the pointer (it does not copy) and later `av_free()`s it — freeing non-FFmpeg memory and leaving a dangling read after GC. It now copies the data into FFmpeg-allocated memory first, like `Packet.addSideData()`.
- **`Frame.importDmaBuf()` (Linux) and `Frame.importD3D11Texture()` (Windows) leaked the previous backing on frame reuse.** Importing into a frame that already held an imported descriptor/texture overwrote `buf[0]` without releasing it, leaking the prior DMA-BUF descriptor or D3D11 texture reference. Both now unreference the existing `buf[0]` before re-importing.
- **`Encoder.close()` did not release its audio frame buffer.** Fixed-frame-size audio encoders (AAC, Opus, MP3, …) allocate an internal `AudioFrameBuffer` (a native `Frame` + `AudioFifo`) that `close()` never disposed, leaking it on every such encoder. It is now disposed in `close()`.
- **`FilterAPI` / `FilterComplexAPI` leaked `FilterInOut` structures when graph construction failed.** The `inputs`/`outputs` were freed only on the success path, so a link/apply error left them allocated. They are now freed in `finally`.
- **`Muxer` leaked a dictionary when copying container metadata.** The temporary `Dictionary` built for the format context (which copies it via `av_dict_copy`) was never freed; it now is.
- **High-level pipeline components dropped buffered frames/packets on abort.** `Decoder`, `Encoder`, `FilterAPI`, and `BitStreamFilterAPI` close their internal queues on teardown; any frame/packet still buffered (e.g. a pipeline aborted before draining) was dropped without being freed, pinning hardware/GPU memory until GC. `close()` now frees buffered items deterministically.
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