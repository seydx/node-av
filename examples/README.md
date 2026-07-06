# Examples

Runnable examples for both API levels of node-av:

- **`api-*`** examples use the **high-level API** (`node-av/api`) — `Demuxer`, `Decoder`, `Encoder`, `Muxer`, `pipeline()`, … Recommended starting point for most use cases.
- The remaining examples use the **low-level API** (`node-av/lib`) — direct FFmpeg bindings. Where an example is a port of an official FFmpeg C example, the **FFmpeg** column links the original source for comparison.
- `browser-*` and `electron-*` are small standalone projects in their own subdirectories.

Some examples expect input/output paths or a stream URL as arguments — check the header comment of each file. Generated output lands in `examples/.tmp/`.

| Example | FFmpeg | Low-Level API | High-Level API |
|---------|--------|---------------|----------------|
| `browser-fmp4` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/browser/fmp4) |
| `browser-webrtc` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/browser/webrtc) |
| `electron-builder` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/electron/builder) |
| `electron-forge` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/electron/forge) |
| `api-abort-signal` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-abort-signal.ts) |
| `api-bitstream-filter` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-bitstream-filter.ts) |
| `api-context-options` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-context-options.ts) |
| `api-dash` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-dash.ts) |
| `api-decoder-resample` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-decoder-resample.ts) |
| `api-device-capture` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-device-capture.ts) |
| `api-encode-decode` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-encode-decode.ts) |
| `api-filter-complex` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-filter-complex.ts) |
| `api-filter-complex-grid` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-filter-complex-grid.ts) |
| `api-filter-complex-typed` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-filter-complex-typed.ts) |
| `api-fmp4` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-fmp4.ts) |
| `api-fmp4-pip` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-fmp4-pip.ts) |
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
| `api-pipeline-progress` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-pipeline-progress.ts) |
| `api-pipeline-raw-muxing` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-pipeline-raw-muxing.ts) |
| `api-probe` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-probe.ts) |
| `api-rtp` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-rtp.ts) |
| `api-rtsp-backchannel` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-rtsp-backchannel.ts) |
| `api-scaler` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-scaler.ts) |
| `api-scaler-hw` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-scaler-hw.ts) |
| `api-sdp-custom` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-sdp-custom.ts) |
| `api-sdp-input` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-sdp-input.ts) |
| `api-snapshot` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-snapshot.ts) |
| `api-stream-input` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-stream-input.ts) |
| `api-sw-decode-hw-encode` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-sw-decode-hw-encode.ts) |
| `api-sw-transcode` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-sw-transcode.ts) |
| `api-webrtc-pip` | | | [✓](https://github.com/seydx/node-av/tree/main/examples/api-webrtc-pip.ts) |
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
