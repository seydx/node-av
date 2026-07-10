import { CodecParameters } from './codec-parameters.js';
import { CodecParser } from './codec-parser.js';
import { Dictionary } from './dictionary.js';
import { Packet } from './packet.js';
import { Rational } from './rational.js';

import type { AVDiscard, AVDisposition, AVStreamEventFlag } from '../constants/constants.js';
import type { NativeStream, NativeWrapper } from './native-types.js';

/**
 * Media stream within a format context.
 *
 * Represents a single stream (video, audio, subtitle, etc.) within a media container.
 * Contains stream-specific information including codec parameters, timing information,
 * metadata, and disposition flags. Each stream in a file has a unique index and may
 * contain packets of compressed data.
 *
 * Direct mapping to FFmpeg's AVStream.
 *
 * @example
 * ```typescript
 * import { FormatContext, FFmpegError } from 'node-av';
 * import { AVMEDIA_TYPE_VIDEO, AVMEDIA_TYPE_AUDIO } from 'node-av/constants';
 *
 * // Access streams from format context
 * const formatContext = new FormatContext();
 * await formatContext.openInput('video.mp4');
 *
 * // Iterate through streams
 * for (let i = 0; i < formatContext.nbStreams; i++) {
 *   const stream = formatContext.streams[i];
 *   const codecpar = stream.codecpar;
 *
 *   if (codecpar.codecType === AVMEDIA_TYPE_VIDEO) {
 *     console.log(`Video stream ${stream.index}:`);
 *     console.log(`  Codec: ${codecpar.codecId}`);
 *     console.log(`  Resolution: ${codecpar.width}x${codecpar.height}`);
 *     console.log(`  Frame rate: ${stream.avgFrameRate.num}/${stream.avgFrameRate.den}`);
 *   } else if (codecpar.codecType === AVMEDIA_TYPE_AUDIO) {
 *     console.log(`Audio stream ${stream.index}:`);
 *     console.log(`  Sample rate: ${codecpar.sampleRate} Hz`);
 *     console.log(`  Channels: ${codecpar.channels}`);
 *   }
 * }
 * ```
 *
 * @see [AVStream](https://ffmpeg.org/doxygen/trunk/structAVStream.html) - FFmpeg Doxygen
 * @see {@link FormatContext} For container operations
 * @see {@link CodecParameters} For codec configuration
 */
export class Stream implements NativeWrapper<NativeStream> {
  private native: NativeStream;
  private _codecpar?: CodecParameters; // Cache the wrapped codecpar

  /**
   * @param native - The native stream instance
   *
   * @internal
   */
  constructor(native: NativeStream) {
    this.native = native;
  }

  /**
   * Stream index.
   *
   * Zero-based index of this stream in the format context.
   * Used to identify packets belonging to this stream.
   *
   * Direct mapping to AVStream->index.
   */
  get index(): number {
    return this.native.index;
  }

  /**
   * Stream ID.
   *
   * Format-specific stream identifier.
   * May be used by some formats for internal stream identification.
   *
   * Direct mapping to AVStream->id.
   */
  get id(): number {
    return this.native.id;
  }

  set id(value: number) {
    this.native.id = value;
  }

  /**
   * Codec parameters.
   *
   * Contains essential codec configuration for this stream.
   * Used to initialize decoders and describe stream properties.
   *
   * Direct mapping to AVStream->codecpar.
   */
  get codecpar(): CodecParameters {
    // Return cached wrapper if we already have one
    if (this._codecpar) {
      return this._codecpar;
    }

    // Create and cache the wrapper
    const params = Object.create(CodecParameters.prototype) as CodecParameters;
    (params as any).native = this.native.codecpar;
    this._codecpar = params;
    return params;
  }

  set codecpar(value: CodecParameters) {
    // Copy codec parameters to the stream
    // The native binding handles the copying
    this.native.codecpar = value.getNative();
    // Clear the cache as the underlying parameters have changed
    this._codecpar = undefined;
  }

  /**
   * Stream time base.
   *
   * Unit of time for timestamps in this stream.
   * All timestamps (PTS/DTS) are in units of this time base.
   *
   * Direct mapping to AVStream->time_base.
   */
  get timeBase(): Rational {
    const tb = this.native.timeBase;
    return new Rational(tb.num, tb.den);
  }

  set timeBase(value: Rational) {
    this.native.timeBase = { num: value.num, den: value.den };
  }

  /**
   * Start time.
   *
   * First timestamp of the stream in stream time base units.
   * AV_NOPTS_VALUE if unknown.
   *
   * Direct mapping to AVStream->start_time.
   */
  get startTime(): bigint {
    return this.native.startTime;
  }

  set startTime(value: bigint) {
    this.native.startTime = value;
  }

  /**
   * Stream duration.
   *
   * Total duration in stream time base units.
   * AV_NOPTS_VALUE if unknown.
   *
   * Direct mapping to AVStream->duration.
   */
  get duration(): bigint {
    return this.native.duration;
  }

  set duration(value: bigint) {
    this.native.duration = value;
  }

  /**
   * Number of frames.
   *
   * Total number of frames in this stream.
   * 0 if unknown.
   *
   * Direct mapping to AVStream->nb_frames.
   */
  get nbFrames(): bigint {
    return this.native.nbFrames;
  }

  set nbFrames(value: bigint) {
    this.native.nbFrames = value;
  }

  /**
   * Stream disposition flags.
   *
   * Combination of AV_DISPOSITION_* flags indicating stream properties
   * (e.g., default, forced subtitles, visual impaired, etc.).
   *
   * Direct mapping to AVStream->disposition.
   */
  get disposition(): AVDisposition {
    return this.native.disposition;
  }

  set disposition(value: AVDisposition) {
    this.native.disposition = value;
  }

  /**
   * Discard setting.
   *
   * Indicates which packets can be discarded during demuxing.
   * Used to skip non-essential packets for performance.
   *
   * Direct mapping to AVStream->discard.
   */
  get discard(): AVDiscard {
    return this.native.discard;
  }

  set discard(value: AVDiscard) {
    this.native.discard = value;
  }

  /**
   * Sample aspect ratio.
   *
   * Pixel aspect ratio for video streams.
   * 0/1 if unknown or not applicable.
   *
   * Direct mapping to AVStream->sample_aspect_ratio.
   */
  get sampleAspectRatio(): Rational {
    const sar = this.native.sampleAspectRatio;
    return new Rational(sar.num || 0, sar.den || 1);
  }

  set sampleAspectRatio(value: Rational) {
    this.native.sampleAspectRatio = { num: value.num, den: value.den };
  }

  /**
   * Average frame rate.
   *
   * Average framerate of the stream.
   * 0/1 if unknown or variable frame rate.
   *
   * Direct mapping to AVStream->avg_frame_rate.
   */
  get avgFrameRate(): Rational {
    const fr = this.native.avgFrameRate;
    // Handle 0/0 case (unknown frame rate in FFmpeg)
    if (fr.den === 0) {
      return new Rational(0, 1);
    }
    return new Rational(fr.num, fr.den);
  }

  set avgFrameRate(value: Rational) {
    this.native.avgFrameRate = { num: value.num, den: value.den };
  }

  /**
   * Real frame rate.
   *
   * Real base frame rate of the stream.
   * This is the lowest common multiple of all frame rates in the stream.
   *
   * Direct mapping to AVStream->r_frame_rate.
   */
  get rFrameRate(): Rational {
    const fr = this.native.rFrameRate;
    // Handle 0/0 case (unknown frame rate in FFmpeg)
    if (fr.den === 0) {
      return new Rational(0, 1);
    }
    return new Rational(fr.num, fr.den);
  }

  set rFrameRate(value: Rational) {
    this.native.rFrameRate = { num: value.num, den: value.den };
  }

  /**
   * Number of bits for PTS wrap-around detection.
   *
   * Used for timestamp wrap-around correction in formats with limited timestamp bits.
   * Common values: 33 (MPEG-TS), 31 (DVB), 64 (no wrapping).
   *
   * Direct mapping to AVStream->pts_wrap_bits.
   */
  get ptsWrapBits(): number {
    return this.native.ptsWrapBits;
  }

  set ptsWrapBits(value: number) {
    this.native.ptsWrapBits = value;
  }

  /**
   * Stream metadata.
   *
   * Dictionary containing stream-specific metadata
   * (e.g., language, title, encoder settings).
   *
   * Returns a copy of AVStream->metadata - mutating the returned Dictionary
   * does not affect the stream. Assign it back to apply changes.
   */
  get metadata(): Dictionary | null {
    const native = this.native.metadata;
    if (!native) {
      return null;
    }

    const dict = Object.create(Dictionary.prototype) as Dictionary;
    (dict as any).native = native;
    return dict;
  }

  set metadata(value: Dictionary | null) {
    this.native.metadata = value?.getNative() ?? null;
  }

  /**
   * Attached picture.
   *
   * For streams with AV_DISPOSITION_ATTACHED_PIC set,
   * contains the attached picture (e.g., album art).
   *
   * Direct mapping to AVStream->attached_pic.
   */
  get attachedPic(): Packet | null {
    const native = this.native.attachedPic;
    if (!native) {
      return null;
    }

    // The native getter refs the picture data into a new packet - the returned
    // wrapper owns that ref (freed on GC, or free() to release earlier)
    const packet = Object.create(Packet.prototype) as Packet;
    (packet as any).native = native;
    return packet;
  }

  /**
   * Event flags.
   *
   * Flags indicating events that happened to the stream.
   * Used for signaling format changes.
   *
   * Direct mapping to AVStream->event_flags.
   */
  get eventFlags(): AVStreamEventFlag {
    return this.native.eventFlags;
  }

  set eventFlags(value: AVStreamEventFlag) {
    this.native.eventFlags = value;
  }

  /**
   * Get the codec parser attached to this stream.
   *
   * Returns the parser context if the stream has an active parser, null otherwise.
   * Parsers are automatically created by FFmpeg for certain formats and codecs.
   * Useful for accessing parser state like repeat_pict for interlaced video.
   *
   * Direct mapping to av_stream_get_parser().
   *
   * @returns Parser context or null if no parser attached
   *
   * @example
   * ```typescript
   * const parser = stream.parser;
   * if (parser) {
   *   const fields = 1 + parser.repeatPict;
   *   console.log(`Frame uses ${fields} fields`);
   * }
   * ```
   *
   * @see {@link CodecParser} For parser details
   */
  get parser(): CodecParser | null {
    // Not cached: the native getter returns a fresh object per access, so an
    // identity-based cache can never hit
    const native = this.native.parser;
    if (!native) {
      return null;
    }

    const parser = Object.create(CodecParser.prototype) as CodecParser;
    (parser as any).native = native;
    return parser;
  }

  /**
   * Set stream event flags.
   *
   * Sets one or more event flags using bitwise OR. Allows setting multiple flags
   * without manually performing bitwise operations.
   *
   * @param flags - One or more event flag values to set
   *
   * @example
   * ```typescript
   * import { AVSTREAM_EVENT_FLAG_METADATA_UPDATED, AVSTREAM_EVENT_FLAG_NEW_PACKETS } from 'node-av/constants';
   *
   * // Set multiple event flags at once
   * stream.setEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED, AVSTREAM_EVENT_FLAG_NEW_PACKETS);
   * ```
   *
   * @see {@link clearEventFlags} To unset event flags
   * @see {@link hasEventFlags} To check event flags
   * @see {@link eventFlags} For direct event flag access
   */
  setEventFlags(...flags: AVStreamEventFlag[]): void {
    for (const flag of flags) {
      this.native.eventFlags = (this.native.eventFlags | flag) as AVStreamEventFlag;
    }
  }

  /**
   * Clear stream event flags.
   *
   * Clears one or more event flags using bitwise AND NOT. Allows clearing multiple
   * flags without manually performing bitwise operations.
   *
   * @param flags - One or more event flag values to clear
   *
   * @example
   * ```typescript
   * import { AVSTREAM_EVENT_FLAG_METADATA_UPDATED } from 'node-av/constants';
   *
   * // Clear specific event flag
   * stream.clearEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED);
   * ```
   *
   * @see {@link setEventFlags} To set event flags
   * @see {@link hasEventFlags} To check event flags
   * @see {@link eventFlags} For direct event flag access
   */
  clearEventFlags(...flags: AVStreamEventFlag[]): void {
    for (const flag of flags) {
      this.native.eventFlags = (this.native.eventFlags & ~flag) as AVStreamEventFlag;
    }
  }

  /**
   * Check if stream has specific event flags.
   *
   * Tests whether all specified event flags are set using bitwise AND.
   *
   * @param flags - One or more event flag values to check
   *
   * @returns true if all specified event flags are set, false otherwise
   *
   * @example
   * ```typescript
   * import { AVSTREAM_EVENT_FLAG_METADATA_UPDATED } from 'node-av/constants';
   *
   * if (stream.hasEventFlags(AVSTREAM_EVENT_FLAG_METADATA_UPDATED)) {
   *   console.log('Stream metadata was updated');
   * }
   * ```
   *
   * @see {@link setEventFlags} To set event flags
   * @see {@link clearEventFlags} To unset event flags
   * @see {@link eventFlags} For direct event flag access
   */
  hasEventFlags(...flags: AVStreamEventFlag[]): boolean {
    for (const flag of flags) {
      if ((this.native.eventFlags & flag) !== flag) {
        return false;
      }
    }
    return true;
  }

  /**
   * Set stream disposition flags.
   *
   * Sets one or more disposition flags using bitwise OR. Allows setting multiple flags
   * without manually performing bitwise operations.
   *
   * @param flags - One or more disposition flag values to set
   *
   * @example
   * ```typescript
   * import { AV_DISPOSITION_DEFAULT, AV_DISPOSITION_FORCED } from 'node-av/constants';
   *
   * // Set multiple disposition flags at once
   * stream.setDisposition(AV_DISPOSITION_DEFAULT, AV_DISPOSITION_FORCED);
   * ```
   *
   * @see {@link clearDisposition} To unset disposition flags
   * @see {@link hasDisposition} To check disposition flags
   * @see {@link disposition} For direct disposition flag access
   */
  setDisposition(...flags: AVDisposition[]): void {
    for (const flag of flags) {
      this.native.disposition = (this.native.disposition | flag) as AVDisposition;
    }
  }

  /**
   * Clear stream disposition flags.
   *
   * Clears one or more disposition flags using bitwise AND NOT. Allows clearing multiple
   * flags without manually performing bitwise operations.
   *
   * @param flags - One or more disposition flag values to clear
   *
   * @example
   * ```typescript
   * import { AV_DISPOSITION_FORCED } from 'node-av/constants';
   *
   * // Clear specific disposition flag
   * stream.clearDisposition(AV_DISPOSITION_FORCED);
   * ```
   *
   * @see {@link setDisposition} To set disposition flags
   * @see {@link hasDisposition} To check disposition flags
   * @see {@link disposition} For direct disposition flag access
   */
  clearDisposition(...flags: AVDisposition[]): void {
    for (const flag of flags) {
      this.native.disposition = (this.native.disposition & ~flag) as AVDisposition;
    }
  }

  /**
   * Check if stream has specific disposition flags.
   *
   * Tests whether all specified disposition flags are set using bitwise AND.
   *
   * @param flags - One or more disposition flag values to check
   *
   * @returns true if all specified disposition flags are set, false otherwise
   *
   * @example
   * ```typescript
   * import { AV_DISPOSITION_DEFAULT } from 'node-av/constants';
   *
   * if (stream.hasDisposition(AV_DISPOSITION_DEFAULT)) {
   *   console.log('Stream is marked as default');
   * }
   * ```
   *
   * @see {@link setDisposition} To set disposition flags
   * @see {@link clearDisposition} To unset disposition flags
   * @see {@link disposition} For direct disposition flag access
   */
  hasDisposition(...flags: AVDisposition[]): boolean {
    for (const flag of flags) {
      if ((this.native.disposition & flag) !== flag) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get the underlying native Stream object.
   *
   * @returns The native Stream binding object
   *
   * @internal
   */
  getNative(): NativeStream {
    return this.native;
  }
}
