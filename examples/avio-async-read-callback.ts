/**
 * AVIO Async Read Callback Example - Low Level API
 *
 * Demonstrates using async (Promise-returning) callbacks with IOContext
 * for custom I/O operations. This is useful when reading from async sources
 * like network streams, databases, or cloud storage.
 *
 * This example simulates async I/O by reading from a buffer with artificial delays,
 * similar to how you would read from a network or async file API.
 *
 * Usage: tsx examples/avio-async-read-callback.ts <input>
 * Example: tsx examples/avio-async-read-callback.ts testdata/video.mp4
 */

import { existsSync, readFileSync } from 'node:fs';

import { AVERROR_EOF, AVSEEK_CUR, AVSEEK_END, AVSEEK_SET, AVSEEK_SIZE, FFmpegError, FormatContext, IOContext } from '../src/index.js';

import type { AVSeekWhence } from '../src/index.js';

/**
 * Async buffer data structure for reading
 * Simulates an async data source like a network stream
 */
class AsyncBufferData {
  private buffer: Buffer;
  private position = 0;
  private readCount = 0;
  private seekCount = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  /**
   * Async read data from buffer
   * Simulates network latency or async file I/O
   */
  async read(size: number): Promise<Buffer | number> {
    this.readCount++;

    // Simulate async operation (e.g., network fetch, cloud storage read)
    await this.simulateAsyncDelay();

    if (this.position >= this.buffer.length) {
      console.log(`[Async Read #${this.readCount}] EOF reached`);
      return AVERROR_EOF; // Signal EOF
    }

    const bytesToRead = Math.min(size, this.buffer.length - this.position);
    const data = this.buffer.subarray(this.position, this.position + bytesToRead);
    this.position += bytesToRead;

    console.log(`[Async Read #${this.readCount}] Read ${bytesToRead} bytes from position ${this.position - bytesToRead}`);
    return data;
  }

  /**
   * Async seek in buffer
   * Simulates async seek operation
   */
  async seek(offset: bigint, whence: AVSeekWhence): Promise<bigint> {
    this.seekCount++;

    // Simulate async operation
    await this.simulateAsyncDelay();

    // Handle AVSEEK_SIZE
    if (whence === AVSEEK_SIZE) {
      console.log(`[Async Seek #${this.seekCount}] AVSEEK_SIZE -> ${this.buffer.length}`);
      return BigInt(this.buffer.length);
    }

    let newPos: number;
    const offsetNum = Number(offset);

    switch (whence) {
      case AVSEEK_SET:
        newPos = offsetNum;
        break;
      case AVSEEK_CUR:
        newPos = this.position + offsetNum;
        break;
      case AVSEEK_END:
        newPos = this.buffer.length + offsetNum;
        break;
      default:
        return BigInt(-1);
    }

    if (newPos < 0 || newPos > this.buffer.length) {
      return BigInt(-1);
    }

    this.position = newPos;
    console.log(`[Async Seek #${this.seekCount}] Seek to position ${this.position}`);
    return BigInt(this.position);
  }

  /**
   * Simulate async delay (e.g., network latency)
   */
  private async simulateAsyncDelay(): Promise<void> {
    // Small random delay to simulate real-world async behavior
    const delay = Math.random() * 5; // 0-5ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  get stats() {
    return {
      size: this.buffer.length,
      position: this.position,
      remaining: this.buffer.length - this.position,
      readCount: this.readCount,
      seekCount: this.seekCount,
    };
  }
}

/**
 * Main function demonstrating async custom I/O with callbacks
 */
async function asyncCustomIORead(inputFile: string): Promise<void> {
  let fmtCtx: FormatContext | null = null;
  let ioCtx: IOContext | null = null;

  try {
    // Read entire file into memory (in real use, this could be a remote source)
    console.log(`Reading file: ${inputFile}`);
    const fileBuffer = readFileSync(inputFile);
    console.log(`File size: ${fileBuffer.length} bytes`);
    console.log('');

    // Create async buffer data structure
    const asyncData = new AsyncBufferData(fileBuffer);

    console.log('Setting up async I/O callbacks...');
    console.log('(Each read/seek operation will have simulated async delay)');
    console.log('');

    // Create custom I/O context with ASYNC callbacks
    ioCtx = new IOContext();
    ioCtx.allocContextWithCallbacks(
      4096, // Buffer size
      0, // Read mode
      // ASYNC Read callback - returns Promise
      async (size: number): Promise<Buffer | number> => {
        return asyncData.read(size);
      },
      undefined, // No write callback
      // ASYNC Seek callback - returns Promise
      async (offset: bigint, whence: AVSeekWhence): Promise<bigint> => {
        return asyncData.seek(offset, whence);
      },
    );

    // Create format context
    fmtCtx = new FormatContext();
    fmtCtx.allocContext();

    // Assign custom I/O context
    fmtCtx.pb = ioCtx;

    // Open input (with null filename since we're using custom I/O)
    console.log('Opening input with async callbacks...');
    const openRet = await fmtCtx.openInput('dummy', null, null);
    FFmpegError.throwIfError(openRet, 'openInput');

    // Find stream information
    console.log('Finding stream info...');
    const findRet = await fmtCtx.findStreamInfo(null);
    FFmpegError.throwIfError(findRet, 'findStreamInfo');

    // Dump format information
    console.log('\n' + '='.repeat(60));
    console.log('Format information:');
    console.log('='.repeat(60));
    fmtCtx.dumpFormat(0, inputFile, false);

    // Show that we successfully read through our async callbacks
    console.log('\n' + '='.repeat(60));
    console.log('Successfully read format through ASYNC I/O callbacks!');
    console.log('='.repeat(60));
    console.log(`Number of streams: ${fmtCtx.nbStreams}`);

    const streams = fmtCtx.streams;
    if (streams) {
      for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        if (stream?.codecpar) {
          const codecType = stream.codecpar.codecType;
          const typeName = codecType === 0 ? 'Video' : codecType === 1 ? 'Audio' : codecType === 3 ? 'Subtitle' : 'Other';
          console.log(`Stream #${i}: ${typeName}`);

          if (codecType === 0) {
            // Video
            console.log(`  Resolution: ${stream.codecpar.width}x${stream.codecpar.height}`);
          } else if (codecType === 1) {
            // Audio
            console.log(`  Sample rate: ${stream.codecpar.sampleRate} Hz`);
            console.log(`  Channels: ${stream.codecpar.channels}`);
          }
        }
      }
    }

    // Show metadata if available
    const metadata = fmtCtx.metadata;
    if (metadata) {
      console.log('\nFile metadata:');
      const entries = metadata.getAll();
      for (const key of Object.keys(entries)) {
        console.log(`  ${key}: ${entries[key]}`);
      }
      metadata.free();
    }

    // Show async I/O statistics
    const stats = asyncData.stats;
    console.log('\n' + '='.repeat(60));
    console.log('Async I/O Statistics:');
    console.log('='.repeat(60));
    console.log(`Total async read operations: ${stats.readCount}`);
    console.log(`Total async seek operations: ${stats.seekCount}`);
    console.log(`Final buffer position: ${stats.position} / ${stats.size} bytes`);
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  } finally {
    // Cleanup
    if (ioCtx) {
      ioCtx.freeContext();
    }
    if (fmtCtx) {
      await fmtCtx.closeInput();
      fmtCtx.freeContext();
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: tsx examples/avio-async-read-callback.ts <input>');
    console.log('');
    console.log('API example program to show how to read from a custom buffer');
    console.log('using ASYNC AVIOContext callbacks that return Promises.');
    console.log('');
    console.log('This demonstrates that async callbacks are supported, allowing');
    console.log('integration with async data sources like network streams,');
    console.log('databases, or cloud storage.');
    process.exit(1);
  }

  const [inputFile] = args;

  // Check if file exists
  if (!existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }

  try {
    await asyncCustomIORead(inputFile);
    process.exit(0);
  } catch (error) {
    if (error instanceof FFmpegError) {
      console.error(`FFmpeg Error: ${error.message} (code: ${error.code})`);
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);
