/**
 * Muxing Example - Low Level API
 *
 * Port of FFmpeg's doc/examples/mux.c
 * Generate a synthetic audio and video signal and mux them to a media file in
 * any supported libavformat format. The default codecs are used.
 *
 * Usage: tsx examples/mux.ts <output_file>
 * Example: tsx examples/mux.ts examples/.tmp/mux.mp4
 */

import {
  AVERROR_EAGAIN,
  AVERROR_EOF,
  AVFLAG_NONE,
  AVFMT_GLOBALHEADER,
  AVFMT_NOFILE,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_VIDEO,
  AV_CHANNEL_LAYOUT_STEREO,
  AV_CODEC_CAP_VARIABLE_FRAME_SIZE,
  AV_CODEC_FLAG_GLOBAL_HEADER,
  AV_CODEC_ID_MPEG1VIDEO,
  AV_CODEC_ID_MPEG2VIDEO,
  AV_CODEC_ID_NONE,
  AV_PIX_FMT_YUV420P,
  AV_SAMPLE_FMT_FLTP,
  AV_SAMPLE_FMT_S16,
  Codec,
  CodecContext,
  Dictionary,
  FFmpegError,
  FormatContext,
  Frame,
  Packet,
  Rational,
  SWS_BICUBIC,
  SoftwareResampleContext,
  SoftwareScaleContext,
  avCompareTs,
  avRescaleQ,
  avTs2Str,
  avTs2TimeStr,
} from '../src/index.js';

import type { AVCodecFlag, AVCodecID, AVPixelFormat, AVSampleFormat, ChannelLayout, Stream } from '../src/index.js';

// Configuration
const STREAM_DURATION = 10.0;
const STREAM_FRAME_RATE = 25; // 25 images/s

// A wrapper around a single output AVStream
interface OutputStream {
  st: Stream | null;
  enc: CodecContext | null;

  // pts of the next frame that will be generated
  nextPts: bigint;
  samplesCount: number;

  frame: Frame | null;
  tmpFrame: Frame | null;

  tmpPkt: Packet | null;

  // Audio sine wave generation
  t: number;
  tincr: number;
  tincr2: number;

  swsCtx: SoftwareScaleContext | null;
  swrCtx: SoftwareResampleContext | null;
}

/**
 * Log packet information
 */
function logPacket(fmtCtx: FormatContext, pkt: Packet): void {
  const streams = fmtCtx.streams;
  if (!streams || pkt.streamIndex >= streams.length) {
    return;
  }
  const timeBase = streams[pkt.streamIndex].timeBase;

  // prettier-ignore
  console.log(
    `pts:${avTs2Str(pkt.pts)} pts_time:${avTs2TimeStr(pkt.pts, timeBase)} ` +
    `dts:${avTs2Str(pkt.dts)} dts_time:${avTs2TimeStr(pkt.dts, timeBase)} ` +
    `duration:${avTs2Str(pkt.duration)} duration_time:${avTs2TimeStr(pkt.duration, timeBase)} ` +
    `stream_index:${pkt.streamIndex}`,
  );
}

/**
 * Encode and write frame
 */
async function writeFrame(fmtCtx: FormatContext, c: CodecContext, st: Stream, frame: Frame | null, pkt: Packet): Promise<number> {
  // Send the frame to the encoder
  let ret = await c.sendFrame(frame);
  FFmpegError.throwIfError(ret, `Error sending a frame to the encoder: ${new FFmpegError(ret).message}`);

  while (ret >= 0) {
    ret = await c.receivePacket(pkt);
    if (ret === AVERROR_EAGAIN || ret === AVERROR_EOF) {
      break;
    } else if (ret < 0) {
      console.error(`Error encoding a frame: ${new FFmpegError(ret).message}`);
      throw new FFmpegError(ret);
    }

    // Rescale output packet timestamp values from codec to stream timebase
    pkt.rescaleTs(c.timeBase, st.timeBase);
    pkt.streamIndex = st.index;

    // Write the compressed frame to the media file
    logPacket(fmtCtx, pkt);
    ret = await fmtCtx.interleavedWriteFrame(pkt);
    // pkt is now blank (interleavedWriteFrame takes ownership)
    FFmpegError.throwIfError(ret, `Error while writing output packet: ${new FFmpegError(ret).message}`);
  }

  return ret === AVERROR_EOF ? 1 : 0;
}

/**
 * Add an output stream
 */
function addStream(ost: OutputStream, oc: FormatContext, codecId: AVCodecID): Codec {
  // Find the encoder
  const codec = Codec.findEncoder(codecId);
  if (!codec) {
    throw new Error(`Could not find encoder for '${codecId}'`);
  }

  ost.tmpPkt = new Packet();
  ost.tmpPkt.alloc();

  ost.st = oc.newStream(null);
  if (!ost.st) {
    throw new Error('Could not allocate stream');
  }
  ost.st.id = (oc.streams.length ?? 1) - 1;

  const c = new CodecContext();
  c.allocContext3(codec);
  ost.enc = c;

  switch (codec.type) {
    case AVMEDIA_TYPE_AUDIO: {
      const sampleFmts = codec.sampleFormats;
      c.sampleFormat = sampleFmts && sampleFmts.length > 0 ? sampleFmts[0] : AV_SAMPLE_FMT_FLTP;
      c.bitRate = 64000n;
      c.sampleRate = 44100;

      const supportedSamplerates = codec.supportedSamplerates;
      if (supportedSamplerates && supportedSamplerates.length > 0) {
        c.sampleRate = supportedSamplerates[0];
        for (const rate of supportedSamplerates) {
          if (rate === 44100) {
            c.sampleRate = 44100;
            break;
          }
        }
      }

      // Set stereo channel layout
      c.channelLayout = AV_CHANNEL_LAYOUT_STEREO;

      ost.st.timeBase = new Rational(1, c.sampleRate);
      break;
    }

    case AVMEDIA_TYPE_VIDEO: {
      c.codecId = codecId;
      c.bitRate = 400000n;

      // Resolution must be a multiple of two
      c.width = 352;
      c.height = 288;

      // timebase: This is the fundamental unit of time (in seconds) in terms
      // of which frame timestamps are represented. For fixed-fps content,
      // timebase should be 1/framerate and timestamp increments should be
      // identical to 1.
      ost.st.timeBase = new Rational(1, STREAM_FRAME_RATE);
      c.timeBase = ost.st.timeBase;

      c.gopSize = 12; // emit one intra frame every twelve frames at most
      c.pixelFormat = AV_PIX_FMT_YUV420P;

      if (c.codecId === AV_CODEC_ID_MPEG2VIDEO) {
        // Just for testing, we also add B-frames
        c.maxBFrames = 2;
      }
      if (c.codecId === AV_CODEC_ID_MPEG1VIDEO) {
        // Needed to avoid using macroblocks in which some coeffs overflow.
        // This does not happen with normal video, it just happens here as
        // the motion of the chroma plane does not match the luma plane.
        c.mbDecision = 2;
      }
      break;
    }

    default:
      break;
  }

  // Some formats want stream headers to be separate
  const oformat = oc.oformat;
  if (oformat && (oformat.flags & AVFMT_GLOBALHEADER) !== 0) {
    c.flags = (c.flags | AV_CODEC_FLAG_GLOBAL_HEADER) as AVCodecFlag;
  }

  return codec;
}

/**
 * Allocate an audio frame
 */
function allocAudioFrame(sampleFmt: AVSampleFormat, channelLayout: ChannelLayout, sampleRate: number, nbSamples: number): Frame {
  const frame = new Frame();
  frame.alloc();

  frame.format = sampleFmt;
  frame.channelLayout = channelLayout;
  frame.sampleRate = sampleRate;
  frame.nbSamples = nbSamples;

  if (nbSamples) {
    const ret = frame.getBuffer(0);
    FFmpegError.throwIfError(ret, `Could not allocate audio frame buffer: ${new FFmpegError(ret).message}`);
  }

  return frame;
}

/**
 * Open audio for encoding
 */
async function openAudio(codec: Codec, ost: OutputStream, optArg: Dictionary | null): Promise<void> {
  const c = ost.enc!;

  // Open the codec
  const ret = await c.open2(codec, optArg);
  FFmpegError.throwIfError(ret, `Could not open audio codec: ${new FFmpegError(ret).message}`);

  // Init signal generator
  ost.t = 0;
  ost.tincr = (2 * Math.PI * 110.0) / c.sampleRate;
  // Increment frequency by 110 Hz per second
  ost.tincr2 = (2 * Math.PI * 110.0) / c.sampleRate / c.sampleRate;

  let nbSamples: number;
  if (codec.capabilities & AV_CODEC_CAP_VARIABLE_FRAME_SIZE) {
    nbSamples = 10000;
  } else {
    nbSamples = c.frameSize;
  }

  ost.frame = allocAudioFrame(c.sampleFormat, c.channelLayout, c.sampleRate, nbSamples);
  ost.tmpFrame = allocAudioFrame(AV_SAMPLE_FMT_S16, c.channelLayout, c.sampleRate, nbSamples);

  // Copy the stream parameters to the muxer
  const ret2 = c.parametersFromContext(ost.st!.codecpar);
  FFmpegError.throwIfError(ret2, `Could not copy the stream parameters: ${new FFmpegError(ret2).message}`);

  // Create resampler context
  ost.swrCtx = new SoftwareResampleContext();

  // Configure the resampler with allocSetOpts2
  const ret3 = ost.swrCtx.allocSetOpts2(
    c.channelLayout, // output channel layout
    c.sampleFormat, // output sample format
    c.sampleRate, // output sample rate
    c.channelLayout, // input channel layout (same as output for this example)
    AV_SAMPLE_FMT_S16, // input sample format (tmpFrame format)
    c.sampleRate, // input sample rate (same as output)
  );
  FFmpegError.throwIfError(ret3, `Failed to allocate resampler: ${new FFmpegError(ret3).message}`);

  // Initialize the resampling context
  const ret4 = ost.swrCtx.init();
  FFmpegError.throwIfError(ret4, `Failed to initialize the resampling context: ${new FFmpegError(ret4).message}`);
}

/**
 * Get an audio frame
 */
function getAudioFrame(ost: OutputStream): Frame | null {
  const frame = ost.tmpFrame!;
  const c = ost.enc!;

  // Check if we want to generate more frames
  const cmp = avCompareTs(ost.nextPts, c.timeBase, STREAM_DURATION * 1000000, new Rational(1, 1000000));
  if (cmp > 0) {
    return null;
  }

  // Generate synthetic audio
  const data = frame.data?.[0];
  if (!data) {
    throw new Error('No frame data');
  }

  const nbChannels = c.channelLayout.nbChannels;
  const view = new Int16Array(data.buffer, data.byteOffset, frame.nbSamples * nbChannels);

  let idx = 0;
  for (let j = 0; j < frame.nbSamples; j++) {
    const v = Math.floor(Math.sin(ost.t) * 10000);
    for (let i = 0; i < nbChannels; i++) {
      view[idx++] = v;
    }
    ost.t += ost.tincr;
    ost.tincr += ost.tincr2;
  }

  frame.pts = ost.nextPts;
  ost.nextPts += BigInt(frame.nbSamples);

  return frame;
}

/**
 * Write one audio frame
 */
async function writeAudioFrame(oc: FormatContext, ost: OutputStream): Promise<number> {
  const c = ost.enc!;
  const frame = getAudioFrame(ost);

  if (frame) {
    // Convert samples from native format to destination codec format
    const dstNbSamples = Number(ost.swrCtx!.getDelay(BigInt(c.sampleRate))) + frame.nbSamples;

    // Make sure we do not overwrite the frame
    const ret = ost.frame!.makeWritable();
    FFmpegError.throwIfError(ret, 'Could not make frame writable');

    // Convert to destination format
    const convertedSamples = await ost.swrCtx!.convert(ost.frame!.extendedData, dstNbSamples, frame.extendedData, frame.nbSamples);
    FFmpegError.throwIfError(convertedSamples, 'Error while converting');

    const outputFrame = ost.frame!;
    outputFrame.pts = avRescaleQ(ost.samplesCount, { num: 1, den: c.sampleRate }, c.timeBase);
    ost.samplesCount += dstNbSamples;

    return writeFrame(oc, c, ost.st!, outputFrame, ost.tmpPkt!);
  }

  return writeFrame(oc, c, ost.st!, null, ost.tmpPkt!);
}

/**
 * Allocate a video frame
 */
function allocVideoFrame(pixFmt: AVPixelFormat, width: number, height: number): Frame {
  const frame = new Frame();
  frame.alloc();

  frame.format = pixFmt;
  frame.width = width;
  frame.height = height;

  // Allocate the buffers for the frame data
  const ret = frame.getBuffer(0);
  FFmpegError.throwIfError(ret, 'Could not allocate frame data');

  return frame;
}

/**
 * Open video for encoding
 */
async function openVideo(codec: Codec, ost: OutputStream, optArg: Dictionary | null): Promise<void> {
  const c = ost.enc!;

  // Open the codec
  const ret = await c.open2(codec, optArg);
  FFmpegError.throwIfError(ret, `Could not open video codec: ${new FFmpegError(ret).message}`);

  // Allocate and init a reusable frame
  ost.frame = allocVideoFrame(c.pixelFormat, c.width, c.height);
  if (!ost.frame) {
    throw new Error('Could not allocate video frame');
  }

  // If the output format is not YUV420P, then a temporary YUV420P
  // picture is needed too. It is then converted to the required
  // output format.
  ost.tmpFrame = null;
  if (c.pixelFormat !== AV_PIX_FMT_YUV420P) {
    ost.tmpFrame = allocVideoFrame(AV_PIX_FMT_YUV420P, c.width, c.height);
    if (!ost.tmpFrame) {
      throw new Error('Could not allocate temporary video frame');
    }
  }

  // Copy the stream parameters to the muxer
  const ret2 = c.parametersFromContext(ost.st!.codecpar);
  FFmpegError.throwIfError(ret2, `Could not copy the stream parameters: ${new FFmpegError(ret2).message}`);
}

/**
 * Fill a YUV image with synthetic data
 */
function fillYuvImage(pict: Frame, frameIndex: number, width: number, height: number): void {
  const i = frameIndex;

  // Y
  const yData = pict.data![0];
  const yLinesize = pict.linesize[0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      yData[y * yLinesize + x] = x + y + i * 3;
    }
  }

  // Cb and Cr
  const cbData = pict.data![1];
  const crData = pict.data![2];
  const cbLinesize = pict.linesize[1];
  const crLinesize = pict.linesize[2];

  for (let y = 0; y < height / 2; y++) {
    for (let x = 0; x < width / 2; x++) {
      cbData[y * cbLinesize + x] = 128 + y + i * 2;
      crData[y * crLinesize + x] = 64 + x + i * 5;
    }
  }
}

/**
 * Get a video frame
 */
async function getVideoFrame(ost: OutputStream): Promise<Frame | null> {
  const c = ost.enc!;

  // Check if we want to generate more frames
  const cmp = avCompareTs(ost.nextPts, c.timeBase, STREAM_DURATION * 1000000, new Rational(1, 1000000));
  if (cmp > 0) {
    return null;
  }

  // Make sure we do not overwrite it
  if (ost.frame!.makeWritable() < 0) {
    throw new Error('Could not make frame writable');
  }

  if (c.pixelFormat !== AV_PIX_FMT_YUV420P) {
    // As we only generate a YUV420P picture, we must convert it
    // to the codec pixel format if needed
    if (!ost.swsCtx) {
      ost.swsCtx = new SoftwareScaleContext();
      ost.swsCtx.getContext(c.width, c.height, AV_PIX_FMT_YUV420P, c.width, c.height, c.pixelFormat, SWS_BICUBIC);
    }
    fillYuvImage(ost.tmpFrame!, Number(ost.nextPts), c.width, c.height);
    await ost.swsCtx.scale(ost.tmpFrame!.data!, ost.tmpFrame!.linesize, 0, c.height, ost.frame!.data!, ost.frame!.linesize);
  } else {
    fillYuvImage(ost.frame!, Number(ost.nextPts), c.width, c.height);
  }

  ost.frame!.pts = ost.nextPts++;

  return ost.frame!;
}

/**
 * Write one video frame
 */
async function writeVideoFrame(oc: FormatContext, ost: OutputStream): Promise<number> {
  return writeFrame(oc, ost.enc!, ost.st!, await getVideoFrame(ost), ost.tmpPkt!);
}

/**
 * Close a stream
 */
function closeStream(_oc: FormatContext, ost: OutputStream): void {
  // Resources will be cleaned up automatically by garbage collection
  // but we can explicitly null them to help
  ost.enc = null;
  ost.frame = null;
  ost.tmpFrame = null;
  ost.tmpPkt = null;
  ost.swsCtx = null;
  ost.swrCtx = null;
}

/**
 * Main muxing function
 */
async function mux(filename: string): Promise<void> {
  const videoSt: OutputStream = {
    st: null,
    enc: null,
    nextPts: 0n,
    samplesCount: 0,
    frame: null,
    tmpFrame: null,
    tmpPkt: null,
    t: 0,
    tincr: 0,
    tincr2: 0,
    swsCtx: null,
    swrCtx: null,
  };

  const audioSt: OutputStream = {
    st: null,
    enc: null,
    nextPts: 0n,
    samplesCount: 0,
    frame: null,
    tmpFrame: null,
    tmpPkt: null,
    t: 0,
    tincr: 0,
    tincr2: 0,
    swsCtx: null,
    swrCtx: null,
  };

  let oc: FormatContext | null = null;
  let audioCodec: Codec | null = null;
  let videoCodec: Codec | null = null;
  let haveVideo = false;
  let haveAudio = false;
  let encodeVideo = false;
  let encodeAudio = false;
  const options: Dictionary | null = null;

  try {
    // Allocate the output media context
    oc = new FormatContext();
    let ret = oc.allocOutputContext2(null, null, filename);
    if (ret < 0) {
      console.log('Could not deduce output format from file extension: using MPEG.');
      ret = oc.allocOutputContext2(null, 'mpeg', filename);
      FFmpegError.throwIfError(ret, `Could not create output context: ${new FFmpegError(ret).message}`);
    }

    const fmt = oc.oformat;
    if (!fmt) {
      throw new Error('No output format');
    }

    // Add the audio and video streams using the default format codecs
    // and initialize the codecs
    if (fmt.videoCodec !== AV_CODEC_ID_NONE) {
      videoCodec = addStream(videoSt, oc, fmt.videoCodec);
      haveVideo = true;
      encodeVideo = true;
    }
    if (fmt.audioCodec !== AV_CODEC_ID_NONE) {
      audioCodec = addStream(audioSt, oc, fmt.audioCodec);
      haveAudio = true;
      encodeAudio = true;
    }

    // Now that all the parameters are set, we can open the audio and
    // video codecs and allocate the necessary encode buffers
    if (haveVideo) {
      await openVideo(videoCodec!, videoSt, options);
    }

    if (haveAudio) {
      await openAudio(audioCodec!, audioSt, options);
    }

    oc.dumpFormat(0, filename, true);

    // Open the output file, if needed
    if ((fmt.flags & AVFMT_NOFILE) === 0) {
      await oc.openOutput();
    }

    // Write the stream header, if any
    ret = await oc.writeHeader(options);
    FFmpegError.throwIfError(ret, `Error occurred when opening output file: ${new FFmpegError(ret).message}`);

    while (encodeVideo || encodeAudio) {
      // Select the stream to encode
      if (encodeVideo && (!encodeAudio || avCompareTs(videoSt.nextPts, videoSt.enc!.timeBase, audioSt.nextPts, audioSt.enc!.timeBase) <= 0)) {
        encodeVideo = (await writeVideoFrame(oc, videoSt)) === 0;
      } else {
        encodeAudio = (await writeAudioFrame(oc, audioSt)) === 0;
      }
    }

    // Write the trailer
    await oc.writeTrailer();

    console.log('Muxing succeeded.');
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  } finally {
    // Close each codec
    if (haveVideo) {
      closeStream(oc!, videoSt);
    }
    if (haveAudio) {
      closeStream(oc!, audioSt);
    }

    if (oc) {
      const fmt = oc.oformat;
      if (fmt && (fmt.flags & AVFMT_NOFILE) === 0) {
        // Close the output file
        await oc.closeOutput();
      }

      // Free the stream
      oc.freeContext();
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('usage: tsx examples/mux.ts output_file');
    console.log('');
    console.log('API example program to output a media file with libavformat.');
    console.log('This program generates a synthetic audio and video stream, encodes and');
    console.log('muxes them into a file named output_file.');
    console.log('The output format is automatically guessed according to the file extension.');
    console.log('Raw images can also be output by using "%d" in the filename.');
    console.log('');
    console.log('Example:');
    console.log('  tsx examples/mux.ts output.mp4');
    process.exit(1);
  }

  const filename = args[0];
  const options = new Dictionary();
  options.alloc();

  // Parse additional options (like -flags or -fflags)
  for (let i = 1; i + 1 < args.length; i += 2) {
    if (args[i] === '-flags' || args[i] === '-fflags') {
      options.set(args[i].substring(1), args[i + 1], AVFLAG_NONE);
    }
  }

  try {
    await mux(filename);
    process.exit(0);
  } catch (error) {
    if (error instanceof FFmpegError) {
      console.error(`FFmpeg Error: ${error.message} (code: ${error.code})`);
    } else {
      console.error('Fatal error:', error);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
