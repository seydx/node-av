# node-av Benchmark Results

> Generated: 2026-01-27T13:27:30.434Z

## System Information

| Property | Value |
|----------|-------|
| **OS** | darwin 25.1.0 |
| **Architecture** | arm64 |
| **CPU** | Apple M3 Max |
| **CPU Cores** | 16 |
| **RAM** | 48.0 GB |
| **GPU** | Apple M3 Max |
| **Node.js** | v24.8.0 |
| **FFmpeg** | 8.0-Jellyfin |
| **node-av** | 5.0.4 |


## Test Input

| Property | Value |
|----------|-------|
| **File** | `/Users/seydx/Desktop/Projekte/node-av/testdata/bunny-30s.mp4` |
| **Duration** | 30.1s |
| **Resolution** | 1920x1080 |
| **Codec** | h264 |
| **FPS** | 30.0 |


## Transcode Speed

| Test | FFmpeg CLI | node-av | Difference |
|------|-----------|---------|------------|
| SW H.264 Transcode | 295.3 fps | 302.1 fps | +2.3% |
| SW H.265 Transcode | 141.3 fps | 143.6 fps | +1.6% |
| HW H.264 Transcode | 201.0 fps | 206.2 fps | +2.6% |
| Stream Copy (Remux) | 35112.4 fps | 31651.3 fps | -9.9% |

### Duration Comparison

| Test | FFmpeg CLI | node-av | Difference |
|------|-----------|---------|------------|
| SW H.264 Transcode | 3.05s | 2.98s | -2.2% |
| SW H.265 Transcode | 6.37s | 6.27s | -1.5% |
| HW H.264 Transcode | 4.48s | 4.37s | -2.4% |
| Stream Copy (Remux) | 26ms | 73ms | +183.5% |


## Memory Usage

| Test | FFmpeg CLI Peak | node-av Peak | Difference |
|------|----------------|--------------|------------|
| Memory: H.264 Transcode | 1.0 GB | 923.5 MB | -10.1% |
| Memory: Stream Copy | 25.2 MB | 645.3 KB | -97.5% |

*Note: FFmpeg CLI memory is measured via `/usr/bin/time` (macOS: `-l`, Linux: `-v`).


## Latency

| Metric | Mean | Min | Max | StdDev |
|--------|------|-----|-----|--------|
| Demuxer Open | 2.5ms | 2.3ms | 2.8ms | 186µs |
| First Packet | 2.4ms | 2.3ms | 2.7ms | 134µs |
| First Frame | 24.6ms | 13.0ms | 40.5ms | 8.4ms |
| First Encoded Packet | 19.5ms | 15.4ms | 44.4ms | 8.4ms |
| Pipeline Total | 13.3ms | 11.5ms | 14.2ms | 861µs |

*Note: Each metric is measured independently. "First Encoded Packet" uses default encoder settings while "Pipeline Total" uses `tune=zerolatency` for low-latency output.*

