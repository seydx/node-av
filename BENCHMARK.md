# node-av Benchmark Results

> Generated: 2026-05-28T14:52:55.753Z

## System Information

| Property | Value |
|----------|-------|
| **OS** | darwin 25.2.0 |
| **Architecture** | arm64 |
| **CPU** | Apple M3 Max |
| **CPU Cores** | 16 |
| **RAM** | 48.0 GB |
| **GPU** | Apple M3 Max |
| **Node.js** | v24.15.0 |
| **FFmpeg** | 8.1-Jellyfin |
| **node-av** | 6.0.0-beta.3 |


## Test Inputs

| File | Codec | Resolution | FPS | Duration |
|------|-------|------------|-----|----------|
| bbb-4k-av1.mp4 | av1 | 3840x2160 | 60 | 30.0s |
| bbb-4k-h264.mp4 | h264 | 3840x2160 | 60 | 30.0s |
| bbb-4k-hevc.mp4 | hevc | 3840x2160 | 60 | 30.0s |
| bbb-4k-vp9.webm | vp9 | 3840x2160 | 60 | 30.0s |


## Transcode Speed

### Input: bbb-4k-av1.mp4

| Test | FFmpeg CLI (FPS) | node-av (FPS) | FFmpeg CLI (Time) | node-av (Time) | Diff |
|------|------------------|---------------|-------------------|----------------|------|
| SW H.264 Transcode | 88.9 fps | 89.2 fps | 20.25s | 20.19s | +0.3% |
| SW H.265 Transcode | 39.4 fps | 40.3 fps | 45.73s | 44.72s | +2.3% |
| HW H.264 Transcode | 54.5 fps | 54.9 fps | 33.02s | 32.80s | +0.7% |
| Stream Copy (Remux) | 49174.8 fps | 33721.4 fps | 37ms | 95ms | -31.4% |

### Input: bbb-4k-h264.mp4

| Test | FFmpeg CLI (FPS) | node-av (FPS) | FFmpeg CLI (Time) | node-av (Time) | Diff |
|------|------------------|---------------|-------------------|----------------|------|
| SW H.264 Transcode | 97.8 fps | 98.4 fps | 18.41s | 18.30s | +0.6% |
| SW H.265 Transcode | 40.7 fps | 40.6 fps | 44.19s | 44.41s | -0.5% |
| HW H.264 Transcode | 54.6 fps | 54.9 fps | 32.99s | 32.83s | +0.6% |
| Stream Copy (Remux) | 47114.9 fps | 32263.5 fps | 39ms | 100ms | -31.5% |

### Input: bbb-4k-hevc.mp4

| Test | FFmpeg CLI (FPS) | node-av (FPS) | FFmpeg CLI (Time) | node-av (Time) | Diff |
|------|------------------|---------------|-------------------|----------------|------|
| SW H.264 Transcode | 98.1 fps | 98.2 fps | 18.36s | 18.34s | +0.2% |
| SW H.265 Transcode | 42.2 fps | 42.4 fps | 42.61s | 42.48s | +0.4% |
| HW H.264 Transcode | 54.5 fps | 54.9 fps | 33.00s | 32.82s | +0.6% |
| Stream Copy (Remux) | 54534.1 fps | 30789.9 fps | 33ms | 104ms | -43.5% |

### Input: bbb-4k-vp9.webm

| Test | FFmpeg CLI (FPS) | node-av (FPS) | FFmpeg CLI (Time) | node-av (Time) | Diff |
|------|------------------|---------------|-------------------|----------------|------|
| SW H.264 Transcode | 96.3 fps | 96.4 fps | 18.69s | 18.67s | +0.1% |
| SW H.265 Transcode | 41.4 fps | 42.2 fps | 43.45s | 42.71s | +1.8% |
| HW H.264 Transcode | 54.6 fps | 54.8 fps | 32.97s | 32.85s | +0.4% |
| Stream Copy (Remux) | 50616.1 fps | 30683.7 fps | 36ms | 108ms | -39.4% |


## Memory Usage

### Input: bbb-4k-av1.mp4

| Test | FFmpeg CLI Peak | node-av Peak | Difference |
|------|----------------|--------------|------------|
| Memory: H.264 Transcode | 3.5 GB | 3.4 GB | -2.5% |
| Memory: Stream Copy | 21.5 MB | 320.0 KB | -98.5% |

### Input: bbb-4k-h264.mp4

| Test | FFmpeg CLI Peak | node-av Peak | Difference |
|------|----------------|--------------|------------|
| Memory: H.264 Transcode | 3.6 GB | 3.3 GB | -8.1% |
| Memory: Stream Copy | 41.0 MB | 3.3 MB | -92.0% |

### Input: bbb-4k-hevc.mp4

| Test | FFmpeg CLI Peak | node-av Peak | Difference |
|------|----------------|--------------|------------|
| Memory: H.264 Transcode | 3.8 GB | 3.5 GB | -5.6% |
| Memory: Stream Copy | 22.1 MB | 1.0 MB | -95.5% |

### Input: bbb-4k-vp9.webm

| Test | FFmpeg CLI Peak | node-av Peak | Difference |
|------|----------------|--------------|------------|
| Memory: H.264 Transcode | 3.5 GB | 3.3 GB | -4.9% |
| Memory: Stream Copy | 32.3 MB | 416.0 KB | -98.7% |

*Note: FFmpeg CLI memory is measured via `/usr/bin/time` (macOS: `-l`, Linux: `-v`).


## Latency

| Metric | Mean | Min | Max | StdDev |
|--------|------|-----|-----|--------|
| Demuxer Open | 426µs | 414µs | 462µs | 14µs |
| First Packet | 533µs | 487µs | 625µs | 41µs |
| First Frame | 14.8ms | 13.8ms | 16.1ms | 650µs |
| First Encoded Packet | 25.9ms | 24.1ms | 27.4ms | 838µs |
| Pipeline Total | 26.0ms | 24.6ms | 27.6ms | 923µs |

*Note: Each metric is measured independently. "First Encoded Packet" uses default encoder settings while "Pipeline Total" uses `tune=zerolatency` for low-latency output.*

