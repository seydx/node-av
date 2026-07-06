import { bindings } from './binding.js';
import { Rational } from './rational.js';

import type { AVPacketFlag, AVPacketSideDataType } from '../constants/constants.js';
import type { NativePacket, NativeWrapper } from './native-types.js';
import type { IRational } from './types.js';

/**
 * Container for compressed audio/video data.
 *
 * Stores encoded data from demuxers or to be sent to muxers. Each packet contains
 * a portion of compressed stream data, typically one video frame or several audio frames.
 * Includes timing information (PTS/DTS), stream index, and flags. Essential for
 * demuxing, muxing, and codec operations.
 *
 * Direct mapping to FFmpeg's AVPacket.
 *
 * @example
 * ```typescript
 * import { Packet, FFmpegError } from 'node-av';
 * import { AV_PKT_FLAG_KEY } from 'node-av/constants';
 *
 * // Create and allocate packet
 * const packet = new Packet();
 * packet.alloc();
 *
 * // Read packet from format context
 * const ret = await formatContext.readFrame(packet);
 * FFmpegError.throwIfError(ret, 'readFrame');
 *
 * // Check packet properties
 * console.log(`Stream: ${packet.streamIndex}`);
 * console.log(`PTS: ${packet.pts}`);
 * console.log(`Size: ${packet.size} bytes`);
 * console.log(`Keyframe: ${packet.isKeyframe}`);
 *
 * // Send to decoder
 * const ret2 = await codecContext.sendPacket(packet);
 * FFmpegError.throwIfError(ret2, 'sendPacket');
 *
 * // Cleanup
 * packet.unref();
 * ```
 *
 * @see [AVPacket](https://ffmpeg.org/doxygen/trunk/structAVPacket.html) - FFmpeg Doxygen
 * @see {@link FormatContext} For reading/writing packets
 * @see {@link CodecContext} For encoding/decoding packets
 */
export class Packet implements Disposable, NativeWrapper<NativePacket> {
  private native: NativePacket;

  constructor() {
    this.native = new bindings.Packet();
  }

  /**
   * Stream index this packet belongs to.
   *
   * Identifies which stream in a format context this packet is from/for.
   * Set automatically when reading, must be set manually when writing.
   *
   * Direct mapping to AVPacket->stream_index.
   */
  get streamIndex(): number {
    return this.native.streamIndex;
  }

  set streamIndex(value: number) {
    this.native.streamIndex = value;
  }

  /**
   * Presentation timestamp.
   *
   * Time when the decompressed packet should be presented to the user.
   * In stream time base units. AV_NOPTS_VALUE if unknown.
   *
   * Direct mapping to AVPacket->pts.
   */
  get pts(): bigint {
    return this.native.pts;
  }

  set pts(value: bigint) {
    this.native.pts = value;
  }

  /**
   * Decompression timestamp.
   *
   * Time when the packet should be decompressed.
   * In stream time base units. AV_NOPTS_VALUE if unknown.
   *
   * Direct mapping to AVPacket->dts.
   */
  get dts(): bigint {
    return this.native.dts;
  }

  set dts(value: bigint) {
    this.native.dts = value;
  }

  /**
   * Duration of this packet.
   *
   * Duration in stream time base units, 0 if unknown.
   * Typically equal to next_pts - this_pts.
   *
   * Direct mapping to AVPacket->duration.
   */
  get duration(): bigint {
    return this.native.duration;
  }

  set duration(value: bigint) {
    this.native.duration = value;
  }

  /**
   * Timebase for timestamps in this packet.
   *
   * Used by av_interleaved_write_frame() to correctly sort packets from different streams.
   * Must be set to the output stream's timebase before calling av_interleaved_write_frame().
   *
   * Direct mapping to AVPacket->time_base.
   */
  get timeBase(): Rational {
    const tb = this.native.timeBase;
    return new Rational(tb.num, tb.den);
  }

  set timeBase(value: IRational) {
    this.native.timeBase = { num: value.num, den: value.den };
  }

  /**
   * Byte position in stream.
   *
   * Byte position of packet data in the input file.
   * -1 if unknown.
   *
   * Direct mapping to AVPacket->pos.
   */
  get pos(): bigint {
    return this.native.pos;
  }

  set pos(value: bigint) {
    this.native.pos = value;
  }

  /**
   * Size of packet data in bytes.
   *
   * Direct mapping to AVPacket->size.
   */
  get size(): number {
    return this.native.size;
  }

  /**
   * Bytes of native payload this packet currently reports to V8's GC via
   * `napi_adjust_external_memory`. Exposed only so the accounting can be
   * asserted in tests; the value is not observable through V8 heap statistics.
   *
   * @internal
   */
  get reportedExternalMemory(): number {
    return this.native.reportedExternalMemory;
  }

  /**
   * Packet flags.
   *
   * Combination of AV_PKT_FLAG values indicating packet properties
   * (e.g., AV_PKT_FLAG_KEY for keyframes).
   *
   * Direct mapping to AVPacket->flags.
   */
  get flags(): AVPacketFlag {
    return this.native.flags;
  }

  set flags(value: AVPacketFlag) {
    this.native.flags = value;
  }

  /**
   * Packet data buffer.
   *
   * Contains the compressed audio/video data.
   * May be null for packets signaling special conditions.
   *
   * Direct mapping to AVPacket->data.
   */
  get data(): Buffer | null {
    return this.native.data;
  }

  set data(value: Buffer | null) {
    this.native.data = value;
  }

  /**
   * Check if packet contains a keyframe.
   *
   * Convenience property that checks AV_PKT_FLAG_KEY flag.
   * Keyframes can be decoded independently without reference frames.
   */
  get isKeyframe(): boolean {
    return this.native.isKeyframe;
  }

  set isKeyframe(value: boolean) {
    this.native.isKeyframe = value;
  }

  /**
   * Allocate a new packet.
   *
   * Allocates the packet structure. Must be called before using the packet
   * unless it was created by another function (e.g., clone()).
   *
   * Direct mapping to av_packet_alloc().
   *
   * @throws {Error} If allocation fails (ENOMEM)
   *
   * @example
   * ```typescript
   * const packet = new Packet();
   * packet.alloc();
   * // Packet is now ready for use
   * ```
   *
   * @see {@link free} To deallocate the packet
   */
  alloc(): void {
    this.native.alloc();
  }

  /**
   * Free the packet.
   *
   * Deallocates the packet and its data. The packet becomes invalid after this.
   *
   * Direct mapping to av_packet_free().
   *
   * @example
   * ```typescript
   * packet.free();
   * // Packet is now invalid
   * ```
   *
   * @see {@link unref} To only free data, keeping structure
   */
  free(): void {
    this.native.free();
  }

  /**
   * Create a reference to another packet.
   *
   * Sets up this packet as a reference to the source packet's data.
   * Both packets will share the same data buffer.
   *
   * Direct mapping to av_packet_ref().
   *
   * IMPORTANT: per FFmpeg's contract, this packet (the destination) is completely
   * overwritten - it MUST be unreferenced or freshly allocated before calling.
   * Re-using a packet as the destination without {@link unref} first leaks its
   * previous buffer and side data. When reusing one packet across a loop, call
   * `packet.unref()` before each `packet.ref(src)`.
   *
   * @param src - Source packet to reference
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *   - AVERROR_EINVAL: Invalid parameters
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Reusing one packet across a loop: unref before re-referencing.
   * packet2.unref();
   * const ret = packet2.ref(packet1);
   * FFmpegError.throwIfError(ret, 'ref');
   * // packet2 now references packet1's data
   * ```
   *
   * @see {@link unref} To remove reference (call before re-referencing a reused packet)
   * @see {@link clone} To create independent copy
   */
  ref(src: Packet): number {
    return this.native.ref(src.getNative());
  }

  /**
   * Unreference the packet.
   *
   * Frees the packet data if this was the last reference.
   * The packet structure remains allocated and can be reused.
   *
   * Direct mapping to av_packet_unref().
   *
   * @example
   * ```typescript
   * packet.unref();
   * // Packet data is freed, structure can be reused
   * ```
   *
   * @see {@link ref} To create reference
   * @see {@link free} To free everything
   */
  unref(): void {
    this.native.unref();
  }

  /**
   * Clone the packet.
   *
   * Creates an independent copy of the packet with its own data buffer.
   * The new packet has the same content but can be modified independently.
   *
   * Direct mapping to av_packet_clone().
   *
   * @returns New packet instance, or null on allocation failure
   *
   * @example
   * ```typescript
   * const copy = packet.clone();
   * if (copy) {
   *   // Modify copy without affecting original
   *   copy.pts = packet.pts + 1000n;
   * }
   * ```
   *
   * @see {@link ref} To create reference instead of copy
   */
  clone(): Packet | null {
    const cloned = this.native.clone();
    if (!cloned) {
      return null;
    }

    // Wrap the native cloned packet
    const packet = Object.create(Packet.prototype) as Packet;
    (packet as any).native = cloned;
    return packet;
  }

  /**
   * Rescale packet timestamps.
   *
   * Converts PTS, DTS, and duration from one time base to another.
   * Essential when moving packets between streams with different time bases.
   *
   * Direct mapping to av_packet_rescale_ts().
   *
   * @param srcTimebase - Source time base
   *
   * @param dstTimebase - Destination time base
   *
   * @example
   * ```typescript
   * import { Rational } from 'node-av';
   *
   * // Convert from 1/25 fps to 1/1000 (milliseconds)
   * const src = new Rational(1, 25);
   * const dst = new Rational(1, 1000);
   * packet.rescaleTs(src, dst);
   * ```
   */
  rescaleTs(srcTimebase: IRational, dstTimebase: IRational): void {
    this.native.rescaleTs({ num: srcTimebase.num, den: srcTimebase.den }, { num: dstTimebase.num, den: dstTimebase.den });
  }

  /**
   * Ensure packet data is reference counted.
   *
   * Makes sure the packet data is stored in a reference-counted buffer.
   * If not already reference-counted, allocates a new buffer and copies data.
   *
   * Direct mapping to av_packet_make_refcounted().
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *   - AVERROR_EINVAL: Invalid packet
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * const ret = packet.makeRefcounted();
   * FFmpegError.throwIfError(ret, 'makeRefcounted');
   * ```
   */
  makeRefcounted(): number {
    return this.native.makeRefcounted();
  }

  /**
   * Ensure packet data is writable.
   *
   * Creates a private copy of the data if it's shared with other packets.
   * Call before modifying packet data to avoid affecting other references.
   *
   * Direct mapping to av_packet_make_writable().
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *   - AVERROR_EINVAL: Invalid packet
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   *
   * // Ensure we can safely modify data
   * const ret = packet.makeWritable();
   * FFmpegError.throwIfError(ret, 'makeWritable');
   * // Now safe to modify packet.data
   * ```
   */
  makeWritable(): number {
    return this.native.makeWritable();
  }

  /**
   * Get packet side data.
   *
   * Retrieves additional data associated with the packet
   * (e.g., palette data, quality stats, encryption info).
   *
   * Direct mapping to av_packet_get_side_data().
   *
   * @param type - Type of side data to retrieve
   *
   * @returns Side data buffer, or null if not present
   *
   * @example
   * ```typescript
   * import { AV_PKT_DATA_PALETTE } from 'node-av/constants';
   *
   * const palette = packet.getSideData(AV_PKT_DATA_PALETTE);
   * if (palette) {
   *   console.log(`Palette size: ${palette.length} bytes`);
   * }
   * ```
   *
   * @see {@link addSideData} To add side data
   * @see {@link newSideData} To allocate new side data
   */
  getSideData(type: AVPacketSideDataType): Buffer | null {
    return this.native.getSideData(type);
  }

  /**
   * Add side data to packet.
   *
   * Attaches additional data to the packet. The data is copied.
   *
   * Direct mapping to av_packet_add_side_data().
   *
   * @param type - Type of side data
   *
   * @param data - Side data buffer
   *
   * @returns 0 on success, negative AVERROR on error:
   *   - AVERROR_ENOMEM: Memory allocation failure
   *   - AVERROR_EINVAL: Invalid parameters
   *
   * @example
   * ```typescript
   * import { FFmpegError } from 'node-av';
   * import { AV_PKT_DATA_NEW_EXTRADATA } from 'node-av/constants';
   *
   * const extradata = Buffer.from([...]);
   * const ret = packet.addSideData(AV_PKT_DATA_NEW_EXTRADATA, extradata);
   * FFmpegError.throwIfError(ret, 'addSideData');
   * ```
   *
   * @see {@link getSideData} To retrieve side data
   * @see {@link newSideData} To allocate in-place
   */
  addSideData(type: AVPacketSideDataType, data: Buffer): number {
    return this.native.addSideData(type, data);
  }

  /**
   * Allocate new side data.
   *
   * Allocates side data buffer attached to the packet.
   * Returns buffer that can be written to directly.
   *
   * Direct mapping to av_packet_new_side_data().
   *
   * @param type - Type of side data
   *
   * @param size - Size in bytes to allocate
   *
   * @returns Allocated buffer for writing
   *
   * @throws {Error} If allocation fails
   *
   * @example
   * ```typescript
   * import { AV_PKT_DATA_NEW_EXTRADATA } from 'node-av/constants';
   *
   * // Allocate and write side data directly
   * const sideData = packet.newSideData(AV_PKT_DATA_NEW_EXTRADATA, 16);
   * sideData.writeUInt32LE(0x12345678, 0);
   * ```
   *
   * @see {@link getSideData} To retrieve side data
   * @see {@link addSideData} To add existing buffer
   */
  newSideData(type: AVPacketSideDataType, size: number): Buffer {
    return this.native.newSideData(type, size);
  }

  /**
   * Free all side data.
   *
   * Removes all side data attached to the packet.
   *
   * Direct mapping to av_packet_free_side_data().
   *
   * @example
   * ```typescript
   * packet.freeSideData();
   * // All side data removed
   * ```
   */
  freeSideData(): void {
    this.native.freeSideData();
  }

  /**
   * Set packet flags.
   *
   * Sets one or more flags using bitwise OR. Allows setting multiple flags
   * without manually performing bitwise operations.
   *
   * @param flags - One or more flag values to set
   *
   * @example
   * ```typescript
   * import { AV_PKT_FLAG_KEY, AV_PKT_FLAG_DISCARD } from 'node-av/constants';
   *
   * // Set multiple flags at once
   * packet.setFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_DISCARD);
   * ```
   *
   * @see {@link clearFlags} To unset flags
   * @see {@link hasFlags} To check flags
   * @see {@link flags} For direct flag access
   */
  setFlags(...flags: AVPacketFlag[]): void {
    for (const flag of flags) {
      this.native.flags = (this.native.flags | flag) as AVPacketFlag;
    }
  }

  /**
   * Clear packet flags.
   *
   * Clears one or more flags using bitwise AND NOT. Allows clearing multiple
   * flags without manually performing bitwise operations.
   *
   * @param flags - One or more flag values to clear
   *
   * @example
   * ```typescript
   * import { AV_PKT_FLAG_DISCARD } from 'node-av/constants';
   *
   * // Clear specific flag
   * packet.clearFlags(AV_PKT_FLAG_DISCARD);
   * ```
   *
   * @see {@link setFlags} To set flags
   * @see {@link hasFlags} To check flags
   * @see {@link flags} For direct flag access
   */
  clearFlags(...flags: AVPacketFlag[]): void {
    for (const flag of flags) {
      this.native.flags = (this.native.flags & ~flag) as AVPacketFlag;
    }
  }

  /**
   * Check if packet has specific flags.
   *
   * Tests whether all specified flags are set using bitwise AND.
   *
   * @param flags - One or more flag values to check
   *
   * @returns true if all specified flags are set, false otherwise
   *
   * @example
   * ```typescript
   * import { AV_PKT_FLAG_KEY } from 'node-av/constants';
   *
   * if (packet.hasFlags(AV_PKT_FLAG_KEY)) {
   *   console.log('This is a keyframe packet');
   * }
   * ```
   *
   * @see {@link setFlags} To set flags
   * @see {@link clearFlags} To unset flags
   * @see {@link flags} For direct flag access
   */
  hasFlags(...flags: AVPacketFlag[]): boolean {
    for (const flag of flags) {
      if ((this.native.flags & flag) !== flag) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get the underlying native Packet object.
   *
   * @returns The native Packet binding object
   *
   * @internal
   */
  getNative(): NativePacket {
    return this.native;
  }

  /**
   * Dispose of the packet.
   *
   * Implements the Disposable interface for automatic cleanup.
   * Equivalent to calling free().
   *
   * @example
   * ```typescript
   * {
   *   using packet = new Packet();
   *   packet.alloc();
   *   // Use packet...
   * } // Automatically freed when leaving scope
   * ```
   */
  [Symbol.dispose](): void {
    this.native[Symbol.dispose]();
  }
}
