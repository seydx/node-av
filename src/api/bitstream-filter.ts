import { AVERROR_BSF_NOT_FOUND, AVERROR_EAGAIN, AVERROR_EOF } from '../constants/constants.js';
import { BitStreamFilterContext } from '../lib/bitstream-filter-context.js';
import { BitStreamFilter } from '../lib/bitstream-filter.js';
import { FFmpegError } from '../lib/error.js';
import { Packet } from '../lib/packet.js';
import { PACKET_THREAD_QUEUE_SIZE } from './constants.js';
import { Muxer } from './muxer.js';
import { AsyncQueue } from './utilities/async-queue.js';
import { Scheduler, SchedulerControl } from './utilities/scheduler.js';

import type { Stream } from '../lib/stream.js';
import type { SchedulableComponent } from './utilities/scheduler.js';

/**
 * Options for bitstream filter creation.
 */
export interface BitstreamFilterOptions {
  /**
   * Filter-specific options.
   *
   * Key-value pairs of FFmpeg bitstream filter options.
   * These are passed directly to the filter via av_opt_set().
   * Available options depend on the specific filter being used.
   */
  options?: Record<string, string | number | boolean | bigint | undefined | null>;

  /**
   * AbortSignal for cancellation.
   *
   * When aborted, async generators stop yielding and async methods throw AbortError.
   */
  signal?: AbortSignal;
}

/**
 * High-level bitstream filter for packet processing.
 *
 * Provides simplified interface for applying bitstream filters to packets.
 * Handles filter initialization, packet processing, and memory management.
 * Supports both synchronous packet-by-packet filtering and async iteration over packets.
 * Supports filters like h264_mp4toannexb, hevc_mp4toannexb, aac_adtstoasc.
 * Essential for format conversion and stream compatibility in transcoding pipelines.
 *
 * @example
 * ```typescript
 * import { BitStreamFilterAPI } from 'node-av/api';
 *
 * // Create H.264 Annex B converter
 * const filter = BitStreamFilterAPI.create('h264_mp4toannexb', stream);
 *
 * // Filter packet
 * const outputPackets = await filter.filterAll(inputPacket);
 * for (const packet of outputPackets) {
 *   await output.writePacket(packet);
 *   packet.free();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Filter packet stream
 * const filter = BitStreamFilterAPI.create('hevc_mp4toannexb', videoStream);
 *
 * for await (const packet of filter.packets(input.packets())) {
 *   await output.writePacket(packet);
 *   packet.free();
 * }
 * ```
 *
 * @see {@link BitStreamFilter} For available filters
 * @see {@link BitStreamFilterContext} For low-level API
 * @see {@link Muxer} For writing filtered packets
 */
export class BitStreamFilterAPI implements Disposable {
  private ctx: BitStreamFilterContext;
  private bsf: BitStreamFilter;
  private stream: Stream;
  private packet: Packet;
  private isClosed = false;

  // Worker pattern for push-based processing
  private inputQueue: AsyncQueue<Packet>;
  private outputQueue: AsyncQueue<Packet>;
  private workerPromise: Promise<void> | null = null;
  private nextComponent: SchedulableComponent<Packet> | null = null;
  private pipeToPromise: Promise<void> | null = null;
  private signal?: AbortSignal;

  /**
   * @param bsf - Bitstream filter
   *
   * @param ctx - Filter context
   *
   * @param stream - Associated stream
   *
   * @internal
   */
  private constructor(bsf: BitStreamFilter, ctx: BitStreamFilterContext, stream: Stream) {
    this.bsf = bsf;
    this.ctx = ctx;
    this.stream = stream;

    this.packet = new Packet();
    this.packet.alloc();

    this.inputQueue = new AsyncQueue<Packet>(PACKET_THREAD_QUEUE_SIZE);
    this.outputQueue = new AsyncQueue<Packet>(PACKET_THREAD_QUEUE_SIZE);
  }

  /**
   * Create a bitstream filter for a stream.
   *
   * Initializes filter with stream codec parameters.
   * Configures time base and prepares for packet processing.
   *
   * Direct mapping to av_bsf_get_by_name() and av_bsf_alloc().
   *
   * @param filterName - Name of the bitstream filter
   *
   * @param stream - Stream to apply filter to
   *
   * @param filterOptions - Optional filter-specific options
   *
   * @returns Configured bitstream filter
   *
   * @throws {Error} If initialization fails
   *
   * @throws {FFmpegError} If allocation or initialization fails
   *
   * @example
   * ```typescript
   * // H.264 MP4 to Annex B conversion
   * const filter = BitStreamFilterAPI.create('h264_mp4toannexb', videoStream);
   * ```
   *
   * @example
   * ```typescript
   * // AAC ADTS to ASC conversion
   * const filter = BitStreamFilterAPI.create('aac_adtstoasc', audioStream);
   * ```
   *
   * @example
   * ```typescript
   * // Remove AUDs from H.264 stream
   * const filter = BitStreamFilterAPI.create('h264_metadata', stream, {
   *   options: { aud: 'remove' }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Set H.264 level
   * const filter = BitStreamFilterAPI.create('h264_metadata', stream, {
   *   options: { level: 51 }
   * });
   * ```
   *
   * @see {@link BitStreamFilter.getByName} For filter discovery
   * @see {@link BitstreamFilterOptions} For available options
   */
  static create(filterName: string, stream: Stream, filterOptions?: BitstreamFilterOptions): BitStreamFilterAPI {
    if (!stream) {
      throw new Error('Stream is required');
    }

    // Find the bitstream filter
    const filter = BitStreamFilter.getByName(filterName);
    if (!filter) {
      throw new FFmpegError(AVERROR_BSF_NOT_FOUND);
    }

    // Create and allocate context
    const ctx = new BitStreamFilterContext();
    const allocRet = ctx.alloc(filter);
    FFmpegError.throwIfError(allocRet, 'Failed to allocate bitstream filter context');

    try {
      // Copy codec parameters from stream
      if (!ctx.inputCodecParameters) {
        throw new Error('Failed to get input codec parameters from filter context');
      }
      stream.codecpar.copy(ctx.inputCodecParameters);

      // Set time base
      ctx.inputTimeBase = stream.timeBase;

      // Apply filter-specific options before init
      if (filterOptions?.options) {
        for (const [key, value] of Object.entries(filterOptions.options)) {
          const ret = ctx.setOption(key, value);
          FFmpegError.throwIfError(ret, `Failed to set bitstream filter option '${key}'`);
        }
      }

      // Initialize the filter
      const initRet = ctx.init();
      FFmpegError.throwIfError(initRet, 'Failed to initialize bitstream filter');

      const bsfApi = new BitStreamFilterAPI(filter, ctx, stream);

      if (filterOptions?.signal) {
        filterOptions.signal.throwIfAborted();
        bsfApi.signal = filterOptions.signal;
      }

      return bsfApi;
    } catch (error) {
      // Clean up on error
      ctx.free();
      throw error;
    }
  }

  /**
   * Get filter name.
   *
   * @example
   * ```typescript
   * console.log(`Using filter: ${filter.name}`);
   * ```
   */
  get name(): string {
    return this.bsf.name ?? 'unknown';
  }

  /**
   * Get output codec parameters.
   *
   * Parameters after filter processing.
   * May differ from input parameters.
   *
   * @example
   * ```typescript
   * const outputParams = filter.outputCodecParameters;
   * console.log(`Output codec: ${outputParams?.codecId}`);
   * ```
   */
  get outputCodecParameters() {
    return this.ctx.outputCodecParameters;
  }

  /**
   * Get output time base.
   *
   * Time base after filter processing.
   *
   * @example
   * ```typescript
   * const tb = filter.outputTimeBase;
   * console.log(`Output timebase: ${tb?.num}/${tb?.den}`);
   * ```
   */
  get outputTimeBase() {
    return this.ctx.outputTimeBase;
  }

  /**
   * Check if filter is open.
   *
   * @example
   * ```typescript
   * if (filter.isBitstreamFilterOpen) {
   *   const packet = await filter.process(frame);
   * }
   * ```
   */
  get isBitstreamFilterOpen(): boolean {
    return !this.isClosed;
  }

  /**
   * Send a packet to the filter.
   *
   * Sends a packet to the filter for processing.
   * Does not return filtered packets - use {@link receive} to retrieve packets.
   * A single packet can produce zero, one, or multiple packets depending on filter.
   *
   * **Important**: This method only SENDS the packet to the filter.
   * You must call {@link receive} separately (potentially multiple times) to get filtered packets.
   *
   * Direct mapping to av_bsf_send_packet().
   *
   * @param packet - Packet to send to filter, or null to flush
   *
   * @throws {FFmpegError} If sending fails
   *
   * @example
   * ```typescript
   * // Send packet and receive filtered packets
   * await filter.filter(inputPacket);
   *
   * // Receive all available filtered packets
   * while (true) {
   *   const outPacket = await filter.receive();
   *   if (!outPacket) break;
   *   console.log(`Filtered packet with PTS: ${outPacket.pts}`);
   *   await output.writePacket(outPacket);
   *   outPacket.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * for await (const packet of input.packets()) {
   *   // packet is null at end of stream - automatically flushes filter
   *   await filter.filter(packet);
   *
   *   // Receive available filtered packets
   *   let outPacket;
   *   while ((outPacket = await filter.receive())) {
   *     await output.writePacket(outPacket);
   *     outPacket.free();
   *   }
   * }
   * ```
   *
   * @see {@link receive} For receiving filtered packets
   * @see {@link filterAll} For combined send+receive operation
   * @see {@link packets} For automatic packet iteration
   * @see {@link flush} For end-of-stream handling
   * @see {@link filterSync} For synchronous version
   */
  async filter(packet: Packet | null): Promise<void> {
    this.signal?.throwIfAborted();

    if (this.isClosed) {
      return;
    }

    // Send packet to filter (null signals EOF/flush)
    const sendRet = await this.ctx.sendPacket(packet);

    if (sendRet < 0 && sendRet !== AVERROR_EOF && sendRet !== AVERROR_EAGAIN) {
      FFmpegError.throwIfError(sendRet, 'Failed to send packet to bitstream filter');
    }
  }

  /**
   * Send a packet to the filter synchronously.
   * Synchronous version of filter.
   *
   * Sends a packet to the filter for processing.
   * Does not return filtered packets - use {@link receiveSync} to retrieve packets.
   * A single packet can produce zero, one, or multiple packets depending on filter.
   *
   * **Important**: This method only SENDS the packet to the filter.
   * You must call {@link receiveSync} separately (potentially multiple times) to get filtered packets.
   *
   * Direct mapping to av_bsf_send_packet().
   *
   * @param packet - Packet to send to filter, or null to flush
   *
   * @throws {FFmpegError} If sending fails
   *
   * @example
   * ```typescript
   * // Send packet and receive filtered packets
   * filter.filterSync(inputPacket);
   *
   * // Receive all available filtered packets
   * while (true) {
   *   const outPacket = filter.receiveSync();
   *   if (!outPacket) break;
   *   console.log(`Filtered packet with PTS: ${outPacket.pts}`);
   *   output.writePacketSync(outPacket);
   *   outPacket.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * for (const packet of packets) {
   *   // packet is null at end of stream - automatically flushes filter
   *   filter.filterSync(packet);
   *
   *   // Receive available filtered packets
   *   let outPacket;
   *   while ((outPacket = filter.receiveSync())) {
   *     output.writePacketSync(outPacket);
   *     outPacket.free();
   *   }
   * }
   * ```
   *
   * @see {@link receiveSync} For receiving filtered packets
   * @see {@link filterAllSync} For combined send+receive operation
   * @see {@link packetsSync} For automatic packet iteration
   * @see {@link flushSync} For end-of-stream handling
   * @see {@link filter} For async version
   */
  filterSync(packet: Packet | null): void {
    if (this.isClosed) {
      return;
    }

    // Send packet to filter (null signals EOF/flush)
    const sendRet = this.ctx.sendPacketSync(packet);

    if (sendRet < 0 && sendRet !== AVERROR_EOF && sendRet !== AVERROR_EAGAIN) {
      FFmpegError.throwIfError(sendRet, 'Failed to send packet to bitstream filter');
    }
  }

  /**
   * Filter a packet to packets.
   *
   * Sends a packet to the filter and receives all available filtered packets.
   * Returns array of packets - may be empty if filter needs more data.
   * One packet can produce zero, one, or multiple packets depending on filter.
   *
   * Direct mapping to av_bsf_send_packet() and av_bsf_receive_packet().
   *
   * @param packet - Packet to filter, or null to flush
   *
   * @returns Array of filtered packets (empty if more data needed or filter is closed)
   *
   * @throws {FFmpegError} If filtering fails
   *
   * @example
   * ```typescript
   * const outputPackets = await filter.filterAll(inputPacket);
   * for (const packet of outputPackets) {
   *   console.log(`Filtered packet: pts=${packet.pts}`);
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Flush remaining packets at end of stream
   * const remaining = await filter.filterAll(null);
   * for (const packet of remaining) {
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link filter} For single packet filtering
   * @see {@link packets} For stream processing
   * @see {@link flush} For end-of-stream handling
   * @see {@link filterAllSync} For synchronous version
   */
  async filterAll(packet: Packet | null): Promise<Packet[]> {
    this.signal?.throwIfAborted();
    await this.filter(packet);

    // Receive all output packets
    const outputPackets: Packet[] = [];
    while (true) {
      const outPacket = await this.receive();
      if (!outPacket) break;
      outputPackets.push(outPacket);
    }

    return outputPackets;
  }

  /**
   * Filter a packet to packets synchronously.
   * Synchronous version of filterAll.
   *
   * Sends a packet to the filter and receives all available filtered packets.
   * Returns array of packets - may be empty if filter needs more data.
   * One packet can produce zero, one, or multiple packets depending on filter.
   *
   * Direct mapping to av_bsf_send_packet() and av_bsf_receive_packet().
   *
   * @param packet - Packet to filter, or null to flush
   *
   * @returns Array of filtered packets (empty if more data needed or filter is closed)
   *
   * @throws {FFmpegError} If filtering fails
   *
   * @example
   * ```typescript
   * const outputPackets = filter.filterAllSync(inputPacket);
   * for (const packet of outputPackets) {
   *   console.log(`Filtered packet: pts=${packet.pts}`);
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Flush remaining packets at end of stream
   * const remaining = filter.filterAllSync(null);
   * for (const packet of remaining) {
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link filterSync} For single packet filtering
   * @see {@link packetsSync} For stream processing
   * @see {@link flushSync} For end-of-stream handling
   * @see {@link filterAll} For async version
   */
  filterAllSync(packet: Packet | null): Packet[] {
    this.filterSync(packet);

    // Receive all output packets
    const outputPackets: Packet[] = [];
    while (true) {
      const outPacket = this.receiveSync();
      if (!outPacket) break;
      outputPackets.push(outPacket);
    }

    return outputPackets;
  }

  /**
   * Filter packet stream to filtered packet stream.
   *
   * High-level async generator for complete filtering pipeline.
   * Filter is only flushed when EOF (null) signal is explicitly received.
   * Primary interface for stream-based filtering.
   *
   * **EOF Handling:**
   * - Send null to flush filter and get remaining buffered packets
   * - Generator yields null after flushing when null is received
   * - No automatic flushing - filter stays open until EOF or close()
   *
   * @param packets - Async iterable of packets, single packet, or null to flush
   *
   * @yields {Packet | null} Filtered packets, followed by null when explicitly flushed
   *
   * @throws {FFmpegError} If filtering fails
   *
   * @example
   * ```typescript
   * // Stream of packets with automatic EOF propagation
   * for await (const packet of filter.packets(input.packets())) {
   *   if (packet === null) {
   *     console.log('Filter flushed');
   *     break;
   *   }
   *   await output.writePacket(packet);
   *   packet.free(); // Must free output packets
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Single packet - no automatic flush
   * for await (const packet of filter.packets(singlePacket)) {
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * // Filter remains open, buffered packets not flushed
   * ```
   *
   * @example
   * ```typescript
   * // Explicit flush with EOF
   * for await (const packet of filter.packets(null)) {
   *   if (packet === null) {
   *     console.log('All buffered packets flushed');
   *     break;
   *   }
   *   console.log('Buffered packet:', packet.pts);
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link filter} For single packet filtering
   * @see {@link Demuxer.packets} For packet source
   * @see {@link packetsSync} For sync version
   */
  async *packets(packets: AsyncIterable<Packet | null> | Packet | null): AsyncGenerator<Packet | null> {
    const self = this;

    const processPacket = async function* (packet: Packet) {
      await self.filter(packet);

      while (true) {
        const outPacket = await self.receive();
        if (!outPacket) break;
        yield outPacket;
      }
    }.bind(this);

    const finalize = async function* () {
      for await (const remaining of self.flushPackets()) {
        yield remaining;
      }
      yield null;
    }.bind(this);

    if (packets === null) {
      yield* finalize();
      return;
    }

    if (packets instanceof Packet) {
      yield* processPacket(packets);
      return;
    }

    for await (using packet of packets) {
      this.signal?.throwIfAborted();

      if (packet === null) {
        yield* finalize();
        return;
      }

      yield* processPacket(packet);
    }
  }

  /**
   * Filter packet stream to filtered packet stream synchronously.
   * Synchronous version of packets.
   *
   * High-level sync generator for complete filtering pipeline.
   * Filter is only flushed when EOF (null) signal is explicitly received.
   * Primary interface for stream-based filtering.
   *
   * **EOF Handling:**
   * - Send null to flush filter and get remaining buffered packets
   * - Generator yields null after flushing when null is received
   * - No automatic flushing - filter stays open until EOF or close()
   *
   * @param packets - Iterable of packets, single packet, or null to flush
   *
   * @yields {Packet | null} Filtered packets, followed by null when explicitly flushed
   *
   * @throws {FFmpegError} If filtering fails
   *
   * @example
   * ```typescript
   * // Stream of packets with automatic EOF propagation
   * for (const packet of filter.packetsSync(inputPackets)) {
   *   if (packet === null) {
   *     console.log('Filter flushed');
   *     break;
   *   }
   *   output.writePacketSync(packet);
   *   packet.free(); // Must free output packets
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Single packet - no automatic flush
   * for (const packet of filter.packetsSync(singlePacket)) {
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * // Filter remains open, buffered packets not flushed
   * ```
   *
   * @example
   * ```typescript
   * // Explicit flush with EOF
   * for (const packet of filter.packetsSync(null)) {
   *   if (packet === null) {
   *     console.log('All buffered packets flushed');
   *     break;
   *   }
   *   console.log('Buffered packet:', packet.pts);
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link filterSync} For single packet filtering
   * @see {@link packets} For async version
   */
  *packetsSync(packets: Iterable<Packet | null> | Packet | null): Generator<Packet | null> {
    const self = this;

    const processPacket = function* (packet: Packet) {
      self.filterSync(packet);

      while (true) {
        const outPacket = self.receiveSync();
        if (!outPacket) break;
        yield outPacket;
      }
    }.bind(this);

    const finalize = function* () {
      for (const remaining of self.flushPacketsSync()) {
        yield remaining;
      }
      yield null;
    }.bind(this);

    if (packets === null) {
      yield* finalize();
      return;
    }

    if (packets instanceof Packet) {
      yield* processPacket(packets);
      return;
    }

    for (using packet of packets) {
      if (packet === null) {
        yield* finalize();
        return;
      }

      yield* processPacket(packet);
    }
  }

  /**
   * Flush filter and signal end-of-stream.
   *
   * Sends null packet to filter to signal end-of-stream.
   * Does nothing if filter is closed.
   * Must call receive() or flushPackets() to get remaining buffered packets.
   *
   * Direct mapping to av_bsf_send_packet(NULL) and av_bsf_flush().
   *
   * @throws {FFmpegError} If flush fails
   *
   * @example
   * ```typescript
   * // Signal end of stream
   * await filter.flush();
   *
   * // Then get remaining packets
   * let packet;
   * while ((packet = await filter.receive()) !== null) {
   *   console.log('Got buffered packet');
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link flushPackets} For async iteration
   * @see {@link receive} For getting buffered packets
   * @see {@link reset} For state reset only
   * @see {@link flushSync} For synchronous version
   */
  async flush(): Promise<void> {
    this.signal?.throwIfAborted();

    if (this.isClosed) {
      return;
    }

    // Send EOF
    const sendRet = await this.ctx.sendPacket(null);
    if (sendRet < 0 && sendRet !== AVERROR_EOF && sendRet !== AVERROR_EAGAIN) {
      FFmpegError.throwIfError(sendRet, 'Failed to flush bitstream filter');
    }

    // Also flush the context to reset internal state
    this.ctx.flush();
  }

  /**
   * Flush filter and signal end-of-stream synchronously.
   * Synchronous version of flush.
   *
   * Sends null packet to filter to signal end-of-stream.
   * Does nothing if filter is closed.
   * Must call receiveSync() or flushPacketsSync() to get remaining buffered packets.
   *
   * Direct mapping to av_bsf_send_packet(NULL) and av_bsf_flush().
   *
   * @throws {FFmpegError} If flush fails
   *
   * @example
   * ```typescript
   * // Signal end of stream
   * filter.flushSync();
   *
   * // Then get remaining packets
   * let packet;
   * while ((packet = filter.receiveSync()) !== null) {
   *   console.log('Got buffered packet');
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link flushPacketsSync} For sync iteration
   * @see {@link receiveSync} For getting buffered packets
   * @see {@link reset} For state reset only
   * @see {@link flush} For async version
   */
  flushSync(): void {
    if (this.isClosed) {
      return;
    }

    // Send EOF
    const sendRet = this.ctx.sendPacketSync(null);
    if (sendRet < 0 && sendRet !== AVERROR_EOF && sendRet !== AVERROR_EAGAIN) {
      FFmpegError.throwIfError(sendRet, 'Failed to flush bitstream filter');
    }

    // Also flush the context to reset internal state
    this.ctx.flush();
  }

  /**
   * Receive packet from filter.
   *
   * Gets filtered packets from the filter's internal buffer.
   * Handles packet allocation and error checking.
   * Returns null if filter is closed or no packets available.
   * Call repeatedly until null to drain all buffered packets.
   *
   * Direct mapping to av_bsf_receive_packet().
   *
   * @returns Cloned packet or null if no packets available
   *
   * @throws {FFmpegError} If receive fails with error other than AVERROR_EAGAIN or AVERROR_EOF
   *
   * @throws {Error} If packet cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * const packet = await filter.receive();
   * if (packet) {
   *   console.log('Got filtered packet');
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Drain all buffered packets
   * let packet;
   * while ((packet = await filter.receive()) !== null) {
   *   console.log(`Packet PTS: ${packet.pts}`);
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link filter} For filtering packets
   * @see {@link flush} For signaling end-of-stream
   * @see {@link receiveSync} For synchronous version
   */
  async receive(): Promise<Packet | null> {
    if (this.isClosed) {
      return null;
    }

    // Clear previous packet data
    this.packet.unref();

    const recvRet = await this.ctx.receivePacket(this.packet);

    if (recvRet === 0) {
      // Got a packet, clone it for the user
      const cloned = this.packet.clone();
      if (!cloned) {
        throw new Error('Failed to clone packet (out of memory)');
      }
      return cloned;
    } else if (recvRet === AVERROR_EAGAIN || recvRet === AVERROR_EOF) {
      // Need more data or end of stream
      return null;
    } else {
      // Error
      FFmpegError.throwIfError(recvRet, 'Failed to receive packet from bitstream filter');
      return null;
    }
  }

  /**
   * Receive packet from filter synchronously.
   * Synchronous version of receive.
   *
   * Gets filtered packets from the filter's internal buffer.
   * Handles packet allocation and error checking.
   * Returns null if filter is closed or no packets available.
   * Call repeatedly until null to drain all buffered packets.
   *
   * Direct mapping to av_bsf_receive_packet().
   *
   * @returns Cloned packet or null if no packets available
   *
   * @throws {FFmpegError} If receive fails with error other than AVERROR_EAGAIN or AVERROR_EOF
   *
   * @throws {Error} If packet cloning fails (out of memory)
   *
   * @example
   * ```typescript
   * const packet = filter.receiveSync();
   * if (packet) {
   *   console.log('Got filtered packet');
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Drain all buffered packets
   * let packet;
   * while ((packet = filter.receiveSync()) !== null) {
   *   console.log(`Packet PTS: ${packet.pts}`);
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link filterSync} For filtering packets
   * @see {@link flushSync} For signaling end-of-stream
   * @see {@link receive} For async version
   */
  receiveSync(): Packet | null {
    if (this.isClosed) {
      return null;
    }

    // Clear previous packet data
    this.packet.unref();

    const recvRet = this.ctx.receivePacketSync(this.packet);

    if (recvRet === 0) {
      // Got a packet, clone it for the user
      const cloned = this.packet.clone();
      if (!cloned) {
        throw new Error('Failed to clone packet (out of memory)');
      }
      return cloned;
    } else if (recvRet === AVERROR_EAGAIN || recvRet === AVERROR_EOF) {
      // Need more data or end of stream
      return null;
    } else {
      // Error
      FFmpegError.throwIfError(recvRet, 'Failed to receive packet from bitstream filter');
      return null;
    }
  }

  /**
   * Flush all buffered packets as async generator.
   *
   * Convenient async iteration over remaining packets.
   * Automatically sends flush signal and retrieves buffered packets.
   * Useful for end-of-stream processing.
   *
   * @yields {Packet} Buffered packets
   *
   * @example
   * ```typescript
   * // Flush at end of filtering
   * for await (const packet of filter.flushPackets()) {
   *   console.log('Processing buffered packet');
   *   await output.writePacket(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link filter} For filtering packets
   * @see {@link flush} For signaling end-of-stream
   * @see {@link flushPacketsSync} For synchronous version
   */
  async *flushPackets(): AsyncGenerator<Packet> {
    while (true) {
      const packet = await this.receive();
      if (!packet) break;
      yield packet;
    }
  }

  /**
   * Flush all buffered packets as generator synchronously.
   * Synchronous version of flushPackets.
   *
   * Convenient sync iteration over remaining packets.
   * Automatically retrieves buffered packets after flush.
   * Useful for end-of-stream processing.
   *
   * @yields {Packet} Buffered packets
   *
   * @example
   * ```typescript
   * // Flush at end of filtering
   * for (const packet of filter.flushPacketsSync()) {
   *   console.log('Processing buffered packet');
   *   output.writePacketSync(packet);
   *   packet.free();
   * }
   * ```
   *
   * @see {@link filterSync} For filtering packets
   * @see {@link flushSync} For signaling end-of-stream
   * @see {@link flushPackets} For async version
   */
  *flushPacketsSync(): Generator<Packet> {
    while (true) {
      const packet = this.receiveSync();
      if (!packet) break;
      yield packet;
    }
  }

  /**
   * Get associated stream.
   *
   * Returns the stream this filter was created for.
   *
   * @returns Associated stream
   *
   * @example
   * ```typescript
   * const stream = filter.getStream();
   * console.log(`Filtering stream ${stream.index}`);
   * ```
   */
  getStream(): Stream {
    return this.stream;
  }

  /**
   * Reset filter state.
   *
   * Clears internal buffers and resets filter.
   * Does not dispose resources.
   *
   * Direct mapping to av_bsf_flush().
   *
   * @example
   * ```typescript
   * // Reset for new segment
   * filter.reset();
   * ```
   *
   * @see {@link flush} For reset with packet retrieval
   */
  reset(): void {
    if (this.isClosed) {
      return;
    }

    this.ctx.flush();
  }

  /**
   * Close filter and free resources.
   *
   * Releases filter context and marks as closed.
   * Safe to call multiple times.
   *
   * @example
   * ```typescript
   * filter.close();
   * ```
   *
   * @see {@link Symbol.dispose} For automatic cleanup
   */
  close(): void {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;

    // Close queues
    this.inputQueue.close();
    this.outputQueue.close();

    this.packet.free();
    this.ctx.free();
  }

  /**
   * Dispose of filter.
   *
   * Implements Disposable interface for automatic cleanup.
   * Equivalent to calling dispose().
   *
   * @example
   * ```typescript
   * {
   *   using filter = BitStreamFilterAPI.create('h264_mp4toannexb', stream);
   *   // Use filter...
   * } // Automatically disposed
   * ```
   *
   * @see {@link close} For manual cleanup
   */
  [Symbol.dispose](): void {
    this.close();
  }

  /**
   * Send packet to input queue or flush the pipeline.
   *
   * When packet is provided, queues it for filtering.
   * When null is provided, triggers flush sequence:
   * - Closes input queue
   * - Waits for worker completion
   * - Closes output queue (no buffering, bitstream filters are stateless)
   * - Waits for pipeTo task completion
   * - Propagates flush to next component (if any)
   *
   * Used by scheduler system for pipeline control.
   *
   * @param packet - Packet to send, or null to flush
   *
   * @internal
   */
  async sendToQueue(packet: Packet | null): Promise<void> {
    if (packet) {
      await this.inputQueue.send(packet);
    } else {
      // Close input queue to signal end of stream to worker
      this.inputQueue.close();

      // Wait for worker to finish processing all packets
      if (this.workerPromise) {
        await this.workerPromise;
      }

      // Close output queue to signal end of stream to pipeTo() task
      this.outputQueue.close();

      // Wait for pipeTo() task to finish processing all packets (if exists)
      if (this.pipeToPromise) {
        await this.pipeToPromise;
      }

      // Then propagate flush to next component
      if (this.nextComponent) {
        await this.nextComponent.sendToQueue(null);
      }
    }
  }

  /**
   * Receive packet from output queue.
   *
   * @returns Packet from queue or null if closed
   *
   * @internal
   */
  async receiveFromQueue(): Promise<Packet | null> {
    return await this.outputQueue.receive();
  }

  /**
   * Worker loop for push-based processing.
   *
   * @internal
   */
  private async runWorker(): Promise<void> {
    try {
      // Outer loop - receive packets
      while (!this.inputQueue.isClosed) {
        using packet = await this.inputQueue.receive();
        if (!packet) break;

        if (this.isClosed) {
          break;
        }

        // Send packet to filter
        const sendRet = await this.ctx.sendPacket(packet);

        // Handle EAGAIN
        if (sendRet === AVERROR_EAGAIN) {
          // Filter buffer full, receive packets first
          while (!this.outputQueue.isClosed) {
            const outPacket = await this.receive();
            if (!outPacket) break;
            await this.outputQueue.send(outPacket);
          }

          // Retry sending
          const retryRet = await this.ctx.sendPacket(packet);
          if (retryRet < 0 && retryRet !== AVERROR_EOF && retryRet !== AVERROR_EAGAIN) {
            FFmpegError.throwIfError(retryRet, 'Failed to send packet to bitstream filter');
          }
        } else if (sendRet < 0 && sendRet !== AVERROR_EOF) {
          FFmpegError.throwIfError(sendRet, 'Failed to send packet to bitstream filter');
        }

        // Receive ALL available packets immediately
        while (!this.outputQueue.isClosed) {
          const outPacket = await this.receive();
          if (!outPacket) break;
          await this.outputQueue.send(outPacket);
        }
      }

      // Flush filter at end
      await this.flush();
      while (!this.outputQueue.isClosed) {
        const outPacket = await this.receive();
        if (!outPacket) break;
        await this.outputQueue.send(outPacket);
      }
    } catch (error) {
      // Propagate error to both queues so upstream and downstream know
      const err = error instanceof Error ? error : new Error(String(error));
      this.inputQueue?.closeWithError(err);
      this.outputQueue?.closeWithError(err);
    } finally {
      // Close output queue when done (if not already closed with error)
      this.outputQueue?.close();
    }
  }

  /**
   * Pipe output to another bitstream filter.
   *
   * Starts background worker for packet processing.
   * Packets flow through: input → this filter → target filter.
   *
   * @param target - Target bitstream filter
   *
   * @returns Scheduler for continued chaining
   *
   * @example
   * ```typescript
   * const filter1 = BitStreamFilterAPI.create('h264_mp4toannexb', stream);
   * const filter2 = BitStreamFilterAPI.create('dump_extra', stream);
   * filter1.pipeTo(filter2).pipeTo(output, 0);
   * ```
   */
  pipeTo(target: BitStreamFilterAPI): Scheduler<Packet>;

  /**
   * Pipe output to muxer.
   *
   * Terminal stage - writes filtered packets to output file.
   *
   * @param output - Muxer to write to
   *
   * @param streamIndex - Stream index in output
   *
   * @returns Control interface for pipeline
   *
   * @example
   * ```typescript
   * const filter = BitStreamFilterAPI.create('h264_mp4toannexb', stream);
   * const control = filter.pipeTo(output, 0);
   * await control.send(packet);
   * ```
   */
  pipeTo(output: Muxer, streamIndex: number): SchedulerControl<Packet>;

  pipeTo(target: BitStreamFilterAPI | Muxer, streamIndex?: number): Scheduler<Packet> | SchedulerControl<Packet> {
    if (target instanceof Muxer) {
      // Start worker if not already running
      this.workerPromise ??= this.runWorker();

      // Start pipe task: filter.outputQueue -> output
      this.pipeToPromise = (async () => {
        while (true) {
          const packet = await this.receiveFromQueue();
          if (!packet) break;
          await target.writePacket(packet, streamIndex!);
        }
      })();

      // Return control without pipeTo (terminal stage)
      return new SchedulerControl<Packet>(this as unknown as SchedulableComponent<Packet>);
    } else {
      // BitStreamFilterAPI
      const t = target as unknown as SchedulableComponent<Packet>;

      // Store reference to next component for flush propagation
      this.nextComponent = t;

      // Start worker if not already running
      this.workerPromise ??= this.runWorker();

      // Start pipe task: filter.outputQueue -> target.inputQueue (via target.send)
      this.pipeToPromise = (async () => {
        while (true) {
          const packet = await this.receiveFromQueue();
          if (!packet) break;
          await t.sendToQueue(packet);
        }
      })();

      // Return scheduler for chaining (target is now the last component)
      return new Scheduler<Packet>(this as unknown as SchedulableComponent<Packet>, t);
    }
  }
}
