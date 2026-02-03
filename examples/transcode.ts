/**
 * Transcode Example - Low Level API
 *
 * This is a direct port showing how the FFmpeg C API maps to our TypeScript bindings.
 * It demonstrates demuxing, decoding, filtering, encoding and muxing.
 *
 * Usage: tsx examples/transcode.ts <input> <output>
 * Example: tsx examples/transcode.ts testdata/video.mp4 examples/.tmp/transcode.mp4
 */

import {
  AVERROR_EAGAIN,
  AVERROR_EOF,
  AVFMT_GLOBALHEADER,
  AVFMT_NOFILE,
  AVIO_FLAG_WRITE,
  AVMEDIA_TYPE_AUDIO,
  AVMEDIA_TYPE_UNKNOWN,
  AVMEDIA_TYPE_VIDEO,
  AV_CHANNEL_LAYOUT_MONO,
  AV_CHANNEL_LAYOUT_STEREO,
  AV_CODEC_FLAG_GLOBAL_HEADER,
  AV_NOPTS_VALUE,
  AV_OPT_TYPE_BINARY_INT_ARRAY,
  AV_PICTURE_TYPE_NONE,
  Codec,
  CodecContext,
  Filter,
  FilterGraph,
  FilterInOut,
  FormatContext,
  Frame,
  IOContext,
  Packet,
  Rational,
  avChannelLayoutDescribe,
  avRescaleQ,
} from '../src/index.js';

import type { AVCodecFlag, FilterContext } from '../src/index.js';

// Global contexts - matching C structure
let ifmt_ctx: FormatContext | null = null;
let ofmt_ctx: FormatContext | null = null;

// FilteringContext - matching C struct
interface FilteringContext {
  buffersink_ctx: FilterContext | null;
  buffersrc_ctx: FilterContext | null;
  filter_graph: FilterGraph | null;
  enc_pkt: Packet | null;
  filtered_frame: Frame | null;
}

// StreamContext - matching C struct
interface StreamContext {
  dec_ctx: CodecContext | null;
  enc_ctx: CodecContext | null;
  dec_frame: Frame | null;
}

let filter_ctx: FilteringContext[] = [];
let stream_ctx: StreamContext[] = [];

async function open_input_file(filename: string): Promise<number> {
  let ret: number;

  ifmt_ctx = new FormatContext();
  ret = await ifmt_ctx.openInput(filename, null, null);
  if (ret < 0) {
    console.error('Cannot open input file');
    return ret;
  }

  ret = await ifmt_ctx.findStreamInfo(null);
  if (ret < 0) {
    console.error('Cannot find stream information');
    return ret;
  }

  const nb_streams = ifmt_ctx.nbStreams;
  stream_ctx = new Array(nb_streams);

  for (let i = 0; i < nb_streams; i++) {
    const stream = ifmt_ctx.streams[i];
    const codecpar = stream.codecpar;
    const dec = Codec.findDecoder(codecpar.codecId);

    if (!dec) {
      console.error(`Failed to find decoder for stream #${i}`);
      return -1;
    }

    const codec_ctx = new CodecContext();
    codec_ctx.allocContext3(dec);

    ret = codec_ctx.parametersToContext(codecpar);
    if (ret < 0) {
      console.error(`Failed to copy decoder parameters to input decoder context for stream #${i}`);
      return ret;
    }

    // Inform the decoder about the timebase for packet timestamps
    codec_ctx.pktTimebase = stream.timeBase;

    // Reencode video & audio and remux subtitles etc.
    if (codec_ctx.codecType === AVMEDIA_TYPE_VIDEO || codec_ctx.codecType === AVMEDIA_TYPE_AUDIO) {
      if (codec_ctx.codecType === AVMEDIA_TYPE_VIDEO) {
        codec_ctx.framerate = stream.rFrameRate || stream.avgFrameRate || new Rational(25, 1);
      }

      // Open decoder
      ret = await codec_ctx.open2(dec, null);
      if (ret < 0) {
        console.error(`Failed to open decoder for stream #${i}`);
        return ret;
      }
    }

    stream_ctx[i] = {
      dec_ctx: codec_ctx,
      enc_ctx: null,
      dec_frame: new Frame(),
    };

    if (stream_ctx[i].dec_frame) {
      stream_ctx[i].dec_frame!.alloc();
    }
  }

  ifmt_ctx.dumpFormat(0, filename, false);
  return 0;
}

async function open_output_file(filename: string): Promise<number> {
  let ret: number;

  ofmt_ctx = new FormatContext();
  ret = ofmt_ctx.allocOutputContext2(null, null, filename);
  if (ret < 0) {
    console.error('Could not create output context');
    return ret;
  }

  for (let i = 0; i < ifmt_ctx!.nbStreams; i++) {
    const out_stream = ofmt_ctx.newStream(null);
    if (!out_stream) {
      console.error('Failed allocating output stream');
      return -1;
    }

    const in_stream = ifmt_ctx!.streams[i];
    const dec_ctx = stream_ctx[i].dec_ctx;

    if (dec_ctx && (dec_ctx.codecType === AVMEDIA_TYPE_VIDEO || dec_ctx.codecType === AVMEDIA_TYPE_AUDIO)) {
      // In this example, we choose transcoding to same codec
      const encoder = Codec.findEncoder(dec_ctx.codecId);
      if (!encoder) {
        console.error('Necessary encoder not found');
        return -1;
      }

      const enc_ctx = new CodecContext();
      enc_ctx.allocContext3(encoder);

      // Transcode to same properties
      if (dec_ctx.codecType === AVMEDIA_TYPE_VIDEO) {
        enc_ctx.height = dec_ctx.height;
        enc_ctx.width = dec_ctx.width;
        enc_ctx.sampleAspectRatio = dec_ctx.sampleAspectRatio;

        // Take first format from list of supported formats
        if (encoder.pixelFormats && encoder.pixelFormats.length > 0) {
          enc_ctx.pixelFormat = encoder.pixelFormats[0];
        } else {
          enc_ctx.pixelFormat = dec_ctx.pixelFormat;
        }

        // Video time_base can be set to whatever is handy
        const framerate = dec_ctx.framerate || new Rational(25, 1);
        enc_ctx.timeBase = new Rational(framerate.den, framerate.num);
      } else {
        // Audio
        enc_ctx.sampleRate = dec_ctx.sampleRate;
        enc_ctx.channelLayout = dec_ctx.channelLayout;

        // Take first format from list of supported formats
        if (encoder.sampleFormats && encoder.sampleFormats.length > 0) {
          enc_ctx.sampleFormat = encoder.sampleFormats[0];
        } else {
          enc_ctx.sampleFormat = dec_ctx.sampleFormat;
        }

        enc_ctx.timeBase = new Rational(1, enc_ctx.sampleRate);
      }

      // Global header flag if needed
      if (ofmt_ctx.oformat && ofmt_ctx.oformat.flags & AVFMT_GLOBALHEADER) {
        const flags = (enc_ctx.flags as unknown as number) || 0;
        enc_ctx.flags = (flags | AV_CODEC_FLAG_GLOBAL_HEADER) as AVCodecFlag;
      }

      // Third parameter can be used to pass settings to encoder
      ret = await enc_ctx.open2(encoder, null);
      if (ret < 0) {
        console.error(`Cannot open ${encoder.name} encoder for stream #${i}`);
        return ret;
      }

      ret = out_stream.codecpar.fromContext(enc_ctx);
      if (ret < 0) {
        console.error(`Failed to copy encoder parameters to output stream #${i}`);
        return ret;
      }

      out_stream.timeBase = enc_ctx.timeBase;
      stream_ctx[i].enc_ctx = enc_ctx;
    } else if (dec_ctx?.codecType === AVMEDIA_TYPE_UNKNOWN) {
      console.error(`Elementary stream #${i} is of unknown type, cannot proceed`);
      return -1;
    } else {
      // If this stream must be remuxed
      ret = in_stream.codecpar.copy(out_stream.codecpar);
      if (ret < 0) {
        console.error(`Copying parameters for stream #${i} failed`);
        return ret;
      }
      out_stream.timeBase = in_stream.timeBase;
    }
  }

  ofmt_ctx.dumpFormat(0, filename, true);

  if (!(ofmt_ctx.oformat!.flags & AVFMT_NOFILE)) {
    const io_ctx = new IOContext();
    ret = await io_ctx.open2(filename, AVIO_FLAG_WRITE);
    if (ret < 0) {
      console.error(`Could not open output file '${filename}'`);
      return ret;
    }
    ofmt_ctx.pb = io_ctx;
  }

  // Init muxer, write output file header
  ret = await ofmt_ctx.writeHeader(null);
  if (ret < 0) {
    console.error('Error occurred when opening output file');
    return ret;
  }

  return 0;
}

async function init_filter(fctx: FilteringContext, dec_ctx: CodecContext, enc_ctx: CodecContext, filter_spec: string): Promise<number> {
  let args: string;
  let ret = 0;
  let buffersrc: Filter | null = null;
  let buffersink: Filter | null = null;
  let buffersrc_ctx: FilterContext | null = null;
  let buffersink_ctx: FilterContext | null = null;
  const outputs = new FilterInOut();
  const inputs = new FilterInOut();
  const filter_graph = new FilterGraph();

  outputs.alloc();
  inputs.alloc();
  filter_graph.alloc();

  if (dec_ctx.codecType === AVMEDIA_TYPE_VIDEO) {
    buffersrc = Filter.getByName('buffer');
    buffersink = Filter.getByName('buffersink');

    if (!buffersrc || !buffersink) {
      console.error('filtering source or sink element not found');
      ret = -1;
      goto_end();
      return ret;
    }

    const sar = dec_ctx.sampleAspectRatio || new Rational(1, 1);
    const tb = dec_ctx.pktTimebase || new Rational(1, 25);

    args = `video_size=${dec_ctx.width}x${dec_ctx.height}:pix_fmt=${dec_ctx.pixelFormat}:` + `time_base=${tb.num}/${tb.den}:pixel_aspect=${sar.num}/${sar.den}`;

    buffersrc_ctx = filter_graph.createFilter(buffersrc, 'in', args);
    if (!buffersrc_ctx) {
      console.error('Cannot create buffer source');
      ret = -1;
      goto_end();
      return ret;
    }

    buffersink_ctx = filter_graph.allocFilter(buffersink, 'out');
    if (!buffersink_ctx) {
      console.error('Cannot create buffer sink');
      ret = -1;
      goto_end();
      return ret;
    }

    ret = buffersink_ctx.setOption('pix_fmts', [enc_ctx.pixelFormat], AV_OPT_TYPE_BINARY_INT_ARRAY);
    if (ret < 0) {
      console.error('Cannot set output pixel format');
      goto_end();
      return ret;
    }

    ret = buffersink_ctx.init(null);
    if (ret < 0) {
      console.error('Cannot initialize buffer sink');
      goto_end();
      return ret;
    }
  } else if (dec_ctx.codecType === AVMEDIA_TYPE_AUDIO) {
    buffersrc = Filter.getByName('abuffer');
    buffersink = Filter.getByName('abuffersink');

    if (!buffersrc || !buffersink) {
      console.error('filtering source or sink element not found');
      ret = -1;
      goto_end();
      return ret;
    }

    const ch_layout = dec_ctx.channelLayout;
    if (ch_layout?.order === undefined) {
      // Default channel layout for mono/stereo
      dec_ctx.channelLayout = ch_layout?.nbChannels === 1 ? AV_CHANNEL_LAYOUT_MONO : AV_CHANNEL_LAYOUT_STEREO;
    }

    const tb = dec_ctx.pktTimebase || new Rational(1, dec_ctx.sampleRate);
    const layout_str = `0x${dec_ctx.channelLayout?.mask?.toString(16) || '3'}`;

    args = `time_base=${tb.num}/${tb.den}:sample_rate=${dec_ctx.sampleRate}:` + `sample_fmt=${dec_ctx.sampleFormat}:channel_layout=${layout_str}`;

    buffersrc_ctx = filter_graph.createFilter(buffersrc, 'in', args);
    if (!buffersrc_ctx) {
      console.error('Cannot create audio buffer source');
      ret = -1;
      goto_end();
      return ret;
    }

    buffersink_ctx = filter_graph.allocFilter(buffersink, 'out');
    if (!buffersink_ctx) {
      console.error('Cannot create audio buffer sink');
      ret = -1;
      goto_end();
      return ret;
    }

    ret = buffersink_ctx.setOption('sample_fmts', [enc_ctx.sampleFormat], AV_OPT_TYPE_BINARY_INT_ARRAY);
    if (ret < 0) {
      console.error('Cannot set output sample format');
      goto_end();
      return ret;
    }

    // Set channel layout using string representation like in FFmpeg
    const encLayoutStr = avChannelLayoutDescribe(enc_ctx.channelLayout);
    if (encLayoutStr) {
      ret = buffersink_ctx.setOption('ch_layouts', encLayoutStr);
      if (ret < 0) {
        console.error('Cannot set output channel layout');
        goto_end();
        return ret;
      }
    }

    ret = buffersink_ctx.setOption('sample_rates', [enc_ctx.sampleRate], AV_OPT_TYPE_BINARY_INT_ARRAY);
    if (ret < 0) {
      console.error('Cannot set output sample rate');
      goto_end();
      return ret;
    }

    // if (enc_ctx.frameSize && enc_ctx.frameSize > 0) {
    //   // NOTE: Skipping buffersinkSetFrameSize as it hangs in current FFmpeg version
    //   // This doesn't affect functionality - frames are still processed correctly
    //   buffersink_ctx.buffersinkSetFrameSize(enc_ctx.frameSize);
    // }

    ret = buffersink_ctx.init(null);
    if (ret < 0) {
      console.error('Cannot initialize audio buffer sink');
      goto_end();
      return ret;
    }
  } else {
    ret = -1;
    goto_end();
    return ret;
  }

  // Endpoints for the filter graph
  outputs.name = 'in';
  outputs.filterCtx = buffersrc_ctx;
  outputs.padIdx = 0;
  outputs.next = null;

  inputs.name = 'out';
  inputs.filterCtx = buffersink_ctx;
  inputs.padIdx = 0;
  inputs.next = null;

  if ((ret = filter_graph.parsePtr(filter_spec, inputs, outputs)) < 0) {
    goto_end();
    return ret;
  }

  if ((ret = await filter_graph.config()) < 0) {
    goto_end();
    return ret;
  }

  // Fill FilteringContext
  fctx.buffersrc_ctx = buffersrc_ctx;
  fctx.buffersink_ctx = buffersink_ctx;
  fctx.filter_graph = filter_graph;

  function goto_end() {
    // parsePtr consumes inputs and outputs, so we don't need to free them
    // The bindings already handle the cleanup internally
  }

  goto_end();
  return ret;
}

async function init_filters(): Promise<number> {
  const filter_spec: string[] = [];
  let ret: number;

  filter_ctx = new Array(ifmt_ctx!.nbStreams);

  for (let i = 0; i < ifmt_ctx!.nbStreams; i++) {
    filter_ctx[i] = {
      buffersrc_ctx: null,
      buffersink_ctx: null,
      filter_graph: null,
      enc_pkt: null,
      filtered_frame: null,
    };

    const codecpar = ifmt_ctx!.streams[i].codecpar;
    if (!(codecpar.codecType === AVMEDIA_TYPE_AUDIO || codecpar.codecType === AVMEDIA_TYPE_VIDEO)) {
      continue;
    }

    if (codecpar.codecType === AVMEDIA_TYPE_VIDEO) {
      filter_spec[i] = 'null'; // passthrough (dummy) filter for video
    } else {
      filter_spec[i] = 'anull'; // passthrough (dummy) filter for audio
    }

    ret = await init_filter(filter_ctx[i], stream_ctx[i].dec_ctx!, stream_ctx[i].enc_ctx!, filter_spec[i]);
    if (ret) {
      console.log(`init_filter failed for stream ${i} with ret ${ret}`);
      return ret;
    }

    filter_ctx[i].enc_pkt = new Packet();
    filter_ctx[i].enc_pkt!.alloc();

    filter_ctx[i].filtered_frame = new Frame();
    filter_ctx[i].filtered_frame!.alloc();
  }

  return 0;
}

async function encode_write_frame(stream_index: number, flush: boolean): Promise<number> {
  const stream = stream_ctx[stream_index];
  const filter = filter_ctx[stream_index];
  const filt_frame = flush ? null : filter.filtered_frame;
  const enc_pkt = filter.enc_pkt!;
  let ret: number;

  // console.log('Encoding frame');

  // Encode filtered frame
  enc_pkt.unref();

  if (filt_frame?.pts !== undefined && filt_frame.pts !== AV_NOPTS_VALUE) {
    filt_frame.pts = avRescaleQ(filt_frame.pts, filt_frame.timeBase || { num: 1, den: 1 }, stream.enc_ctx!.timeBase);
  }

  ret = await stream.enc_ctx!.sendFrame(filt_frame);

  if (ret < 0) {
    return ret;
  }

  while (ret >= 0) {
    ret = await stream.enc_ctx!.receivePacket(enc_pkt);

    if (ret === AVERROR_EAGAIN || ret === AVERROR_EOF) {
      return 0;
    }

    // Prepare packet for muxing
    enc_pkt.streamIndex = stream_index;
    enc_pkt.rescaleTs(stream.enc_ctx!.timeBase, ofmt_ctx!.streams[stream_index].timeBase);

    // console.log('Muxing frame');
    // Mux encoded frame
    ret = await ofmt_ctx!.interleavedWriteFrame(enc_pkt);
  }

  return ret;
}

async function filter_encode_write_frame(frame: Frame | null, stream_index: number): Promise<number> {
  const filter = filter_ctx[stream_index];
  let ret: number;

  // console.log('Pushing decoded frame to filters');
  // Push the decoded frame into the filtergraph
  ret = await filter.buffersrc_ctx!.buffersrcAddFrame(frame);
  if (ret < 0) {
    console.error('Error while feeding the filtergraph');
    return ret;
  }

  // Pull filtered frames from the filtergraph
  while (true) {
    // console.log('Pulling filtered frame from filters');
    ret = await filter.buffersink_ctx!.buffersinkGetFrame(filter.filtered_frame!);
    if (ret < 0) {
      // If no more frames for output - returns AVERROR(EAGAIN)
      // If flushed and no more frames for output - returns AVERROR_EOF
      // Rewrite retcode to 0 to show it as normal procedure completion
      if (ret === AVERROR_EAGAIN || ret === AVERROR_EOF) {
        ret = 0;
      }
      break;
    }

    filter.filtered_frame!.timeBase = filter.buffersink_ctx!.buffersinkGetTimeBase();
    filter.filtered_frame!.pictType = AV_PICTURE_TYPE_NONE;
    ret = await encode_write_frame(stream_index, false);
    filter.filtered_frame!.unref();
    if (ret < 0) {
      break;
    }
  }

  return ret;
}

async function flush_encoder(stream_index: number): Promise<number> {
  const enc_ctx = stream_ctx[stream_index].enc_ctx;

  if (!enc_ctx) {
    return 0;
  }

  // Check if codec supports delayed frames
  // For simplicity, we'll try to flush all codecs
  // console.log(`Flushing stream #${stream_index} encoder`);
  return await encode_write_frame(stream_index, true);
}

async function main(): Promise<void> {
  let ret: number;
  const packet = new Packet();
  packet.alloc();
  let stream_index: number;

  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <input file> <output file>`);
    process.exit(1);
  }

  const [input_file, output_file] = args;

  if ((ret = await open_input_file(input_file)) < 0) {
    await goto_end();
    return;
  }
  if ((ret = await open_output_file(output_file)) < 0) {
    await goto_end();
    return;
  }
  if ((ret = await init_filters()) < 0) {
    await goto_end();
    return;
  }

  // Read all packets
  while (true) {
    if ((ret = await ifmt_ctx!.readFrame(packet)) < 0) {
      break;
    }
    stream_index = packet.streamIndex;
    // console.log(`Demuxer gave frame of stream_index ${stream_index}`);

    if (filter_ctx[stream_index].filter_graph) {
      const stream = stream_ctx[stream_index];

      // console.log('Going to reencode&filter the frame');

      ret = await stream.dec_ctx!.sendPacket(packet);
      if (ret < 0) {
        console.error('Decoding failed');
        break;
      }

      while (ret >= 0) {
        ret = await stream.dec_ctx!.receiveFrame(stream.dec_frame!);
        if (ret === AVERROR_EOF || ret === AVERROR_EAGAIN) {
          break;
        } else if (ret < 0) {
          await goto_end();
          return;
        }

        stream.dec_frame!.pts = stream.dec_frame!.bestEffortTimestamp;
        ret = await filter_encode_write_frame(stream.dec_frame, stream_index);
        if (ret < 0) {
          await goto_end();
          return;
        }
      }
    } else {
      // Remux this frame without reencoding
      packet.rescaleTs(ifmt_ctx!.streams[stream_index].timeBase, ofmt_ctx!.streams[stream_index].timeBase);

      ret = await ofmt_ctx!.interleavedWriteFrame(packet);
      if (ret < 0) {
        await goto_end();
        return;
      }
    }
    packet.unref();
  }

  // Flush decoders, filters and encoders
  for (let i = 0; i < ifmt_ctx!.nbStreams; i++) {
    if (!filter_ctx[i].filter_graph) {
      continue;
    }

    const stream = stream_ctx[i];

    // console.log(`Flushing stream ${i} decoder`);

    // Flush decoder
    ret = await stream.dec_ctx!.sendPacket(null);
    if (ret < 0) {
      console.error('Flushing decoding failed');
      await goto_end();
      return;
    }

    while (ret >= 0) {
      ret = await stream.dec_ctx!.receiveFrame(stream.dec_frame!);
      if (ret === AVERROR_EOF) {
        break;
      } else if (ret < 0) {
        await goto_end();
        return;
      }

      stream.dec_frame!.pts = stream.dec_frame!.bestEffortTimestamp;
      ret = await filter_encode_write_frame(stream.dec_frame, i);
      if (ret < 0) {
        await goto_end();
        return;
      }
    }

    // Flush filter
    ret = await filter_encode_write_frame(null, i);
    if (ret < 0) {
      console.error('Flushing filter failed');
      await goto_end();
      return;
    }

    // Flush encoder
    ret = await flush_encoder(i);
    if (ret < 0) {
      console.error('Flushing encoder failed');
      await goto_end();
      return;
    }
  }

  await ofmt_ctx!.writeTrailer();

  async function goto_end() {
    packet.free();

    for (let i = 0; i < (ifmt_ctx?.nbStreams ?? 0); i++) {
      if (stream_ctx[i]) {
        stream_ctx[i].dec_ctx?.freeContext();
        stream_ctx[i].enc_ctx?.freeContext();
        stream_ctx[i].dec_frame?.free();
      }

      if (filter_ctx[i]?.filter_graph) {
        filter_ctx[i].filter_graph!.free();
        filter_ctx[i].enc_pkt?.free();
        filter_ctx[i].filtered_frame?.free();
      }
    }

    await ifmt_ctx?.closeInput();
    ifmt_ctx?.freeContext();

    if (ofmt_ctx) {
      if (!(ofmt_ctx.oformat && ofmt_ctx.oformat?.flags & AVFMT_NOFILE)) {
        await ofmt_ctx.pb?.closep();
      }
    }

    if (ret < 0 && ret !== AVERROR_EOF) {
      console.error(`Error occurred: ${ret}`);
      process.exit(1);
    }
  }

  await goto_end();
}

// Run main
main();
