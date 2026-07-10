import { AV_SAMPLE_FMT_U8, AV_SAMPLE_FMT_U8P } from '../constants/constants.js';
import { AudioFifo } from '../lib/audio-fifo.js';
import { Frame } from '../lib/frame.js';
import { Rational } from '../lib/rational.js';
import { avGetBytesPerSample, avSampleFmtIsPlanar } from '../lib/utilities.js';

import type { AVSampleFormat } from '../constants/index.js';
import type { ChannelLayout } from '../lib/types.js';

/**
 * Audio frame buffering utility for encoders with fixed frame size requirements.
 *
 * Many audio encoders (Opus, AAC, MP3, etc.) require frames with a specific number
 * of samples (frame_size). This class buffers incoming frames and outputs frames
 * with exactly the required size.
 *
 * Uses FFmpeg's AVAudioFifo internally for efficient sample buffering.
 *
 * @example
 * ```typescript
 * import { AudioFrameBuffer } from 'node-av/api';
 *
 * // Create buffer for 480-sample frames (e.g., Opus at 24kHz)
 * using buffer = AudioFrameBuffer.create(480, AV_SAMPLE_FMT_FLT, 48000, 'mono', 1);
 *
 * // Push variable-sized frames from filter
 * for await (const frame of filterOutput) {
 *   await buffer.push(frame);
 *
 *   // Pull fixed-size frames for encoder
 *   let outputFrame;
 *   while ((outputFrame = await buffer.pull()) !== null) {
 *     await encoder.encode(outputFrame);
 *     outputFrame.free();
 *   }
 * }
 *
 * // Flush remaining samples (final partial frame is padded with silence)
 * let outputFrame;
 * while ((outputFrame = await buffer.pull()) !== null) {
 *   await encoder.encode(outputFrame);
 *   outputFrame.free();
 * }
 * const tail = await buffer.pullPartial();
 * if (tail) {
 *   await encoder.encode(tail);
 *   tail.free();
 * }
 * ```
 */
export class AudioFrameBuffer implements Disposable {
  private fifo: AudioFifo;
  private frame: Frame;
  private frameSize: number;
  private sampleFormat: AVSampleFormat;
  private channels: number;
  private nextPts = 0n;
  private firstFramePts: bigint | null = null;

  /**
   * @param fifo - Underlying AudioFifo instance
   *
   * @param frameSize - Number of samples per output frame
   *
   * @param sampleFormat - Audio sample format
   *
   * @param sampleRate - Sample rate in Hz
   *
   * @param channelLayout - Channel layout
   *
   * @internal
   */
  private constructor(fifo: AudioFifo, frameSize: number, sampleFormat: AVSampleFormat, sampleRate: number, channelLayout: ChannelLayout) {
    this.fifo = fifo;
    this.frameSize = frameSize;
    this.sampleFormat = sampleFormat;
    this.channels = channelLayout.nbChannels;
    this.frame = new Frame();
    this.frame.alloc();
    this.frame.nbSamples = frameSize;
    this.frame.format = sampleFormat;
    this.frame.sampleRate = sampleRate;
    this.frame.channelLayout = channelLayout;
    // Output PTS is a running sample counter, so the matching timebase is
    // 1/sample_rate; pulled frames go to the codec without further rescaling.
    this.frame.timeBase = new Rational(1, sampleRate);
    this.frame.getBuffer(0); // Allocate buffer once
  }

  /**
   * Create an audio frame buffer.
   *
   * @param frameSize - Required frame size in samples
   *
   * @param sampleFormat - Audio sample format
   *
   * @param sampleRate - Sample rate in Hz
   *
   * @param channelLayout - Channel layout (e.g., 'mono', 'stereo')
   *
   * @param channels - Number of audio channels
   *
   * @returns Configured audio frame buffer
   *
   * @example
   * ```typescript
   * // For Opus encoder at 48kHz with 20ms frames
   * const buffer = AudioFrameBuffer.create(960, AV_SAMPLE_FMT_FLT, 48000, 'mono', 1);
   * ```
   */
  static create(frameSize: number, sampleFormat: AVSampleFormat, sampleRate: number, channelLayout: ChannelLayout, channels: number): AudioFrameBuffer {
    const fifo = new AudioFifo();
    // Allocate FIFO with capacity for multiple frames
    fifo.alloc(sampleFormat, channels, frameSize * 4);

    return new AudioFrameBuffer(fifo, frameSize, sampleFormat, sampleRate, channelLayout);
  }

  /**
   * Get number of samples currently in buffer.
   *
   * @returns Number of buffered samples
   *
   * @example
   * ```typescript
   * console.log(`Buffer contains ${buffer.size} samples`);
   * ```
   */
  get size(): number {
    return this.fifo.size;
  }

  /**
   * Check if a complete frame is available.
   *
   * Returns true if the FIFO contains at least frameSize samples.
   *
   * @returns True if a full frame can be pulled
   *
   * @example
   * ```typescript
   * while (buffer.hasFrame()) {
   *   const frame = buffer.pull();
   *   // Process frame...
   * }
   * ```
   */
  hasFrame(): boolean {
    return this.fifo.size >= this.frameSize;
  }

  /**
   * Push an audio frame into the buffer asynchronously.
   *
   * The frame's samples are added to the internal FIFO.
   * Call hasFrame() and pull() to retrieve fixed-size output frames.
   *
   * @param frame - Audio frame to buffer
   *
   * @example
   * ```typescript
   * await buffer.push(filterFrame);
   * ```
   *
   * @see {@link pushSync} For synchronous version
   */
  async push(frame: Frame): Promise<void> {
    if (!frame.isAudio()) {
      throw new Error('AudioFrameBuffer.push() requires an audio frame');
    }

    if (this.firstFramePts === null) {
      // Always start PTS from 0 for encoder frames
      // Input frames may be in different timebase than encoder expects
      this.firstFramePts = 0n;
      this.nextPts = 0n;
    }

    // Write frame data to FIFO
    await this.fifo.write(frame.data as Buffer | Buffer[], frame.nbSamples);
  }

  /**
   * Push an audio frame into the buffer synchronously.
   * Synchronous version of push.
   *
   * The frame's samples are added to the internal FIFO.
   * Call hasFrame() and pullSync() to retrieve fixed-size output frames.
   *
   * @param frame - Audio frame to buffer
   *
   * @example
   * ```typescript
   * buffer.pushSync(filterFrame);
   * ```
   *
   * @see {@link push} For async version
   */
  pushSync(frame: Frame): void {
    if (!frame.isAudio()) {
      throw new Error('AudioFrameBuffer.pushSync() requires an audio frame');
    }

    if (this.firstFramePts === null) {
      // Always start PTS from 0 for encoder frames
      // Input frames may be in different timebase than encoder expects
      this.firstFramePts = 0n;
      this.nextPts = 0n;
    }

    // Write frame data to FIFO
    this.fifo.writeSync(frame.data as Buffer | Buffer[], frame.nbSamples);
  }

  /**
   * Pull a fixed-size audio frame from the buffer asynchronously.
   *
   * Reads exactly frameSize samples from the FIFO and returns a cloned Frame.
   * Returns null if not enough samples are available.
   * Reuses internal frame buffer for efficiency (like Decoder does).
   *
   * @returns Audio frame with exactly frameSize samples, or null if insufficient samples
   *
   * @throws {Error} If frame cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * using frame = await buffer.pull();
   * if (frame) {
   *   await encoder.encode(frame);
   * }
   * ```
   *
   * @see {@link pullSync} For synchronous version
   */
  async pull(): Promise<Frame | null> {
    if (!this.hasFrame()) {
      return null;
    }

    // Update PTS
    this.frame.pts = this.nextPts;

    // Read samples from FIFO into reusable frame
    await this.fifo.read(this.frame.data as Buffer | Buffer[], this.frameSize);

    // Update PTS for next frame
    this.nextPts += BigInt(this.frameSize);

    // Clone frame for user (like Decoder does)
    const cloned = this.frame.clone();
    if (!cloned) {
      throw new Error('Failed to clone frame (out of memory)');
    }
    return cloned;
  }

  /**
   * Pull a fixed-size audio frame from the buffer synchronously.
   * Synchronous version of pull.
   *
   * Reads exactly frameSize samples from the FIFO and returns a cloned Frame.
   * Returns null if not enough samples are available.
   * Reuses internal frame buffer for efficiency (like Decoder does).
   *
   * @returns Audio frame with exactly frameSize samples, or null if insufficient samples
   *
   * @throws {Error} If frame cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * using frame = buffer.pullSync();
   * if (frame) {
   *   encoder.encodeSync(frame);
   * }
   * ```
   *
   * @see {@link pull} For async version
   */
  pullSync(): Frame | null {
    if (!this.hasFrame()) {
      return null;
    }

    // Update PTS
    this.frame.pts = this.nextPts;

    // Read samples from FIFO into reusable frame
    this.fifo.readSync(this.frame.data as Buffer | Buffer[], this.frameSize);

    // Update PTS for next frame
    this.nextPts += BigInt(this.frameSize);

    // Clone frame for user (like Decoder does)
    const cloned = this.frame.clone();
    if (!cloned) {
      throw new Error('Failed to clone frame (out of memory)');
    }
    return cloned;
  }

  /**
   * Pull the final partial frame from the buffer asynchronously.
   *
   * Reads the remaining samples (fewer than frameSize) and pads the tail with
   * silence so the returned frame still carries exactly frameSize samples.
   * Intended for end-of-stream flushing only - without it the tail (up to
   * frameSize - 1 samples) would be dropped. Returns null if the buffer is
   * empty, or while a complete frame is still available (drain those with
   * pull() first).
   *
   * @returns Silence-padded audio frame with frameSize samples, or null if nothing to drain
   *
   * @throws {Error} If frame cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * // At end of stream, after pull() has returned null
   * using tail = await buffer.pullPartial();
   * if (tail) {
   *   await encoder.encode(tail);
   * }
   * ```
   *
   * @see {@link pullPartialSync} For synchronous version
   * @see {@link pull} For pulling complete frames
   */
  async pullPartial(): Promise<Frame | null> {
    const remaining = this.fifo.size;
    if (remaining <= 0 || remaining >= this.frameSize) {
      return null;
    }

    // Update PTS
    this.frame.pts = this.nextPts;

    // Read the remaining samples into the head of the reusable frame
    await this.fifo.read(this.frame.data as Buffer | Buffer[], remaining);

    // Pad the tail with silence up to frameSize
    this.padWithSilence(remaining);

    // Update PTS for next frame
    this.nextPts += BigInt(this.frameSize);

    // Clone frame for user (like Decoder does)
    const cloned = this.frame.clone();
    if (!cloned) {
      throw new Error('Failed to clone frame (out of memory)');
    }
    return cloned;
  }

  /**
   * Pull the final partial frame from the buffer synchronously.
   * Synchronous version of pullPartial.
   *
   * Reads the remaining samples (fewer than frameSize) and pads the tail with
   * silence so the returned frame still carries exactly frameSize samples.
   * Intended for end-of-stream flushing only. Returns null if the buffer is
   * empty, or while a complete frame is still available.
   *
   * @returns Silence-padded audio frame with frameSize samples, or null if nothing to drain
   *
   * @throws {Error} If frame cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * // At end of stream, after pullSync() has returned null
   * using tail = buffer.pullPartialSync();
   * if (tail) {
   *   encoder.encodeSync(tail);
   * }
   * ```
   *
   * @see {@link pullPartial} For async version
   * @see {@link pullSync} For pulling complete frames
   */
  pullPartialSync(): Frame | null {
    const remaining = this.fifo.size;
    if (remaining <= 0 || remaining >= this.frameSize) {
      return null;
    }

    // Update PTS
    this.frame.pts = this.nextPts;

    // Read the remaining samples into the head of the reusable frame
    this.fifo.readSync(this.frame.data as Buffer | Buffer[], remaining);

    // Pad the tail with silence up to frameSize
    this.padWithSilence(remaining);

    // Update PTS for next frame
    this.nextPts += BigInt(this.frameSize);

    // Clone frame for user
    const cloned = this.frame.clone();
    if (!cloned) {
      throw new Error('Failed to clone frame (out of memory)');
    }
    return cloned;
  }

  /**
   * Fill the reusable frame's sample range [fromSample, frameSize) with silence.
   *
   * Follows av_samples_set_silence() semantics: unsigned 8-bit formats use 0x80
   * as the silence value, every other format uses 0. Planar frames carry one
   * channel per plane; packed frames interleave all channels in plane 0.
   *
   * @param fromSample - First sample index to silence
   *
   * @internal
   */
  private padWithSilence(fromSample: number): void {
    const silence = this.sampleFormat === AV_SAMPLE_FMT_U8 || this.sampleFormat === AV_SAMPLE_FMT_U8P ? 0x80 : 0;
    const bytesPerSample = avGetBytesPerSample(this.sampleFormat);
    const stride = avSampleFmtIsPlanar(this.sampleFormat) ? bytesPerSample : bytesPerSample * this.channels;
    const planes = this.frame.data ?? [];
    for (const plane of planes) {
      plane.fill(silence, fromSample * stride, this.frameSize * stride);
    }
  }

  /**
   * Reset the buffer, discarding all buffered samples.
   *
   * @example
   * ```typescript
   * buffer.reset();
   * ```
   */
  reset(): void {
    this.fifo.reset();
    this.nextPts = 0n;
    this.firstFramePts = null;
  }

  /**
   * Free the buffer and all resources.
   *
   * @example
   * ```typescript
   * buffer.free();
   * ```
   */
  [Symbol.dispose](): void {
    this.frame.free();
    this.fifo[Symbol.dispose]();
  }
}
