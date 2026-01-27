# node-av Benchmark Results

> Generated: 2026-01-27T18:12:31.045Z

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
| SW H.264 Transcode | 95.1 fps | 94.5 fps | 18.93s | 19.06s | -0.6% |
| SW H.265 Transcode | 38.9 fps | 40.1 fps | 46.31s | 44.93s | +3.2% |
| HW H.264 Transcode | 54.6 fps | 54.9 fps | 32.98s | 32.79s | +0.6% |
| Stream Copy (Remux) | 50307.7 fps | 29472.5 fps | 36ms | 109ms | -41.4% |

### Input: bbb-4k-h264.mp4

| Test | FFmpeg CLI (FPS) | node-av (FPS) | FFmpeg CLI (Time) | node-av (Time) | Diff |
|------|------------------|---------------|-------------------|----------------|------|
| SW H.264 Transcode | 96.5 fps | 97.2 fps | 18.65s | 18.52s | +0.7% |
| SW H.265 Transcode | 40.0 fps | 39.9 fps | 45.00s | 45.12s | -0.2% |
| HW H.264 Transcode | 54.6 fps | 54.9 fps | 32.98s | 32.83s | +0.5% |
| Stream Copy (Remux) | 38235.1 fps | 30884.8 fps | 48ms | 104ms | -19.2% |

### Input: bbb-4k-hevc.mp4

| Test | FFmpeg CLI (FPS) | node-av (FPS) | FFmpeg CLI (Time) | node-av (Time) | Diff |
|------|------------------|---------------|-------------------|----------------|------|
| SW H.264 Transcode | 96.3 fps | 95.9 fps | 18.70s | 18.78s | -0.4% |
| SW H.265 Transcode | 41.4 fps | 41.8 fps | 43.49s | 43.06s | +1.0% |
| HW H.264 Transcode | 54.5 fps | 54.9 fps | 33.00s | 32.82s | +0.6% |
| Stream Copy (Remux) | 55110.3 fps | 30395.4 fps | 33ms | 106ms | -44.8% |

### Input: bbb-4k-vp9.webm

| Test | FFmpeg CLI (FPS) | node-av (FPS) | FFmpeg CLI (Time) | node-av (Time) | Diff |
|------|------------------|---------------|-------------------|----------------|------|
| SW H.264 Transcode | 96.5 fps | 96.1 fps | 18.66s | 18.75s | -0.4% |
| SW H.265 Transcode | 41.6 fps | 42.0 fps | 43.23s | 42.90s | +0.8% |
| HW H.264 Transcode | 54.6 fps | 54.8 fps | 32.98s | 32.85s | +0.4% |
| Stream Copy (Remux) | 48635.3 fps | 31617.3 fps | 37ms | 105ms | -35.0% |


## Memory Usage

### Input: bbb-4k-av1.mp4

| Test | FFmpeg CLI Peak | node-av Peak | Difference |
|------|----------------|--------------|------------|
| Memory: H.264 Transcode | 3.5 GB | 3.5 GB | -2.0% |
| Memory: Stream Copy | 19.9 MB | 1.1 MB | -94.6% |

### Input: bbb-4k-h264.mp4

| Test | FFmpeg CLI Peak | node-av Peak | Difference |
|------|----------------|--------------|------------|
| Memory: H.264 Transcode | 3.7 GB | 3.4 GB | -6.0% |
| Memory: Stream Copy | 40.7 MB | 1.9 MB | -95.2% |

### Input: bbb-4k-hevc.mp4

| Test | FFmpeg CLI Peak | node-av Peak | Difference |
|------|----------------|--------------|------------|
| Memory: H.264 Transcode | 3.8 GB | 3.5 GB | -5.4% |
| Memory: Stream Copy | 20.5 MB | 320.0 KB | -98.5% |

### Input: bbb-4k-vp9.webm

| Test | FFmpeg CLI Peak | node-av Peak | Difference |
|------|----------------|--------------|------------|
| Memory: H.264 Transcode | 3.5 GB | 3.3 GB | -4.7% |
| Memory: Stream Copy | 30.6 MB | 378.7 KB | -98.8% |

*Note: FFmpeg CLI memory is measured via `/usr/bin/time` (macOS: `-l`, Linux: `-v`).


## Latency

| Metric | Mean | Min | Max | StdDev |
|--------|------|-----|-----|--------|
| Demuxer Open | 466µs | 430µs | 561µs | 41µs |
| First Packet | 530µs | 491µs | 575µs | 30µs |
| First Frame | 11.7ms | 7.2ms | 15.2ms | 2.7ms |
| First Encoded Packet | 25.2ms | 23.9ms | 26.9ms | 856µs |
| Pipeline Total | 25.8ms | 22.5ms | 27.3ms | 1.4ms |

*Note: Each metric is measured independently. "First Encoded Packet" uses default encoder settings while "Pipeline Total" uses `tune=zerolatency` for low-latency output.*

