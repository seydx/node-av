import type {
  AVAlphaMode,
  AVBufferSrcFlag,
  AVChromaLocation,
  AVCodecCap,
  AVCodecFlag,
  AVCodecFlag2,
  AVCodecID,
  AVCodecProp,
  AVColorPrimaries,
  AVColorRange,
  AVColorSpace,
  AVColorTransferCharacteristic,
  AVDictFlag,
  AVDiscard,
  AVDisposition,
  AVFifoFlag,
  AVFilterCmdFlag,
  AVFilterConstants,
  AVFilterFlag,
  AVFormatFlag,
  AVFrameSideDataType,
  AVHWDeviceType,
  AVHWFrameTransferDirection,
  AVIOFlag,
  AVMediaType,
  AVOptionFlag,
  AVOptionType,
  AVPacketFlag,
  AVPacketSideDataType,
  AVPictureType,
  AVPixelFormat,
  AVProfile,
  AVSampleFormat,
  AVSeekFlag,
  AVSeekWhence,
  AVStreamEventFlag,
  AVThreadType,
  SwsFlags,
} from '../constants/index.js';
import type { CodecProfile } from './codec.js';
import type { FilterPad } from './filter.js';
import type { RTSPStreamInfo } from './format-context.js';
import type { ImageOptions } from './frame-utils.js';
import type { ChannelLayout, IRational } from './types.js';

/**
 * Native AVPacket binding interface
 *
 * Represents compressed audio/video data.
 * Must be allocated before use and properly disposed after.
 *
 * @internal
 */
export interface NativePacket extends Disposable {
  readonly __brand: 'NativePacket';

  readonly size: number;
  streamIndex: number;
  pts: bigint;
  dts: bigint;
  duration: bigint;
  timeBase: IRational;
  pos: bigint;
  flags: AVPacketFlag;
  data: Buffer | null;
  isKeyframe: boolean;

  alloc(): void;
  free(): void;
  ref(src: NativePacket): number;
  unref(): void;
  clone(): NativePacket | null;
  rescaleTs(srcTb: IRational, dstTb: IRational): void;
  makeRefcounted(): number;
  makeWritable(): number;
  getSideData(type: AVPacketSideDataType): Buffer | null;
  addSideData(type: AVPacketSideDataType, data: Buffer): number;
  newSideData(type: AVPacketSideDataType, size: number): Buffer;
  freeSideData(): void;

  [Symbol.dispose](): void;
}

/**
 * Native AVFrame binding interface
 *
 * Represents uncompressed audio/video data.
 * Must be allocated before use and properly disposed after.
 *
 * @internal
 */
export interface NativeFrame extends Disposable {
  readonly __brand: 'NativeFrame';

  readonly channels: number;
  readonly linesize: number[];
  readonly data: Buffer[] | null;
  readonly extendedData: Buffer[] | null;
  readonly isWritable: boolean;
  format: AVPixelFormat | AVSampleFormat;
  width: number;
  height: number;
  nbSamples: number;
  pts: bigint;
  pktDts: bigint;
  bestEffortTimestamp: bigint;
  timeBase: IRational;
  keyFrame: number;
  pictType: AVPictureType;
  quality: number;
  sampleAspectRatio: IRational;
  sampleRate: number;
  channelLayout: ChannelLayout;
  colorRange: AVColorRange;
  colorPrimaries: AVColorPrimaries;
  colorTrc: AVColorTransferCharacteristic;
  colorSpace: AVColorSpace;
  chromaLocation: AVChromaLocation;
  alphaMode: AVAlphaMode;
  hwFramesCtx: NativeHardwareFramesContext | null;
  flags: number;
  decodeErrorFlags: number;
  duration: bigint;
  repeatPict: number;

  alloc(): void;
  free(): void;
  ref(src: NativeFrame): number;
  unref(): void;
  clone(): NativeFrame | null;
  getBuffer(align?: number): number;
  allocBuffer(): number;
  makeWritable(): number;
  copyProps(src: NativeFrame): number;
  copy(src: NativeFrame): number;
  fromBuffer(buffer: Buffer): number;
  toBuffer(): Buffer;
  hwframeTransferData(dst: NativeFrame, flags?: number): Promise<number>;
  hwframeTransferDataSync(dst: NativeFrame, flags?: number): number;
  isHwFrame(): boolean;
  isSwFrame(): boolean;
  getSideData(type: AVFrameSideDataType): Buffer | null;
  newSideData(type: AVFrameSideDataType, size: number): Buffer;
  removeSideData(type: AVFrameSideDataType): void;
  getMetadata(): NativeDictionary;
  applyCropping(flags?: number): number;
  importIOSurface(handleData: Buffer, hwFramesCtx: NativeHardwareFramesContext): number;
  importNSImage(handleData: Buffer): number;
  importD3D11Texture(handleData: Buffer, hwDeviceCtx: NativeHardwareDeviceContext): number;
  importDmaBuf(planes: { fd: number; stride: number; offset: number; size: number }[], width: number, height: number, modifier: bigint, swFormat: AVPixelFormat): number;

  [Symbol.dispose](): void;
}

/**
 * Native AVCodec binding interface
 *
 * Represents a codec (encoder or decoder) definition.
 * This is an immutable descriptor - actual encoding/decoding happens via CodecContext.
 *
 * @internal
 */
export interface NativeCodec {
  readonly __brand: 'NativeCodec';

  readonly name: string | null;
  readonly longName: string | null;
  readonly type: AVMediaType;
  readonly id: AVCodecID;
  readonly capabilities: AVCodecCap;
  readonly maxLowres: number;
  readonly profiles: CodecProfile[] | null;
  readonly wrapper: string | null;
  readonly supportedFramerates: IRational[] | null;
  readonly pixelFormats: AVPixelFormat[] | null;
  readonly supportedSamplerates: number[] | null;
  readonly sampleFormats: AVSampleFormat[] | null;
  readonly channelLayouts: ChannelLayout[] | null;

  isEncoder(): boolean;
  isDecoder(): boolean;
  isExperimental(): boolean;
  getHwConfig(index: number): { pixFmt: AVPixelFormat; methods: number; deviceType: AVHWDeviceType } | null;
}

/**
 * Native AVCodecContext binding interface
 *
 * The main interface for encoding and decoding operations.
 * Must be opened before use and properly disposed after.
 *
 * @internal
 */
export interface NativeCodecContext extends Disposable {
  readonly __brand: 'NativeCodecContext';

  readonly delay: number;
  readonly hasBFrames: number;
  readonly frameNumber: number;
  readonly isOpen: boolean;
  readonly codecTagString: string | null;
  codecType: AVMediaType;
  codecId: AVCodecID;
  codecTag: number;
  bitRate: bigint;
  timeBase: IRational;
  pktTimebase: IRational;
  flags: AVCodecFlag;
  flags2: AVCodecFlag2;
  extraData: Buffer | null;
  profile: AVProfile;
  level: number;
  threadCount: number;
  threadType: AVThreadType;
  width: number;
  height: number;
  gopSize: number;
  pixelFormat: AVPixelFormat;
  maxBFrames: number;
  mbDecision: number;
  sampleAspectRatio: IRational;
  framerate: IRational;
  colorRange: AVColorRange;
  colorPrimaries: AVColorPrimaries;
  colorTrc: AVColorTransferCharacteristic;
  colorSpace: AVColorSpace;
  chromaLocation: AVChromaLocation;
  sampleRate: number;
  channels: number;
  sampleFormat: AVSampleFormat;
  frameSize: number;
  bitsPerCodedSample: number;
  bitsPerRawSample: number;
  channelLayout: ChannelLayout;
  qMin: number;
  qMax: number;
  globalQuality: number;
  rcBufferSize: number;
  rcMaxRate: bigint;
  rcMinRate: bigint;
  hwDeviceCtx: NativeHardwareDeviceContext | null;
  hwFramesCtx: NativeHardwareFramesContext | null;
  extraHWFrames: number;

  allocContext3(codec?: NativeCodec | null): void;
  freeContext(): void;
  open2(codec?: NativeCodec | null, options?: NativeDictionary | null): Promise<number>;
  open2Sync(codec?: NativeCodec | null, options?: NativeDictionary | null): number;
  close(): number;
  parametersToContext(params: NativeCodecParameters): number;
  parametersFromContext(params: NativeCodecParameters): number;
  flushBuffers(): void;
  sendPacket(packet: NativePacket | null): Promise<number>;
  sendPacketSync(packet: NativePacket | null): number;
  receiveFrame(frame: NativeFrame): Promise<number>;
  receiveFrameSync(frame: NativeFrame): number;
  sendFrame(frame: NativeFrame | null): Promise<number>;
  sendFrameSync(frame: NativeFrame | null): number;
  receivePacket(packet: NativePacket): Promise<number>;
  receivePacketSync(packet: NativePacket): number;
  setHardwarePixelFormat(hwFormat: AVPixelFormat, swFormat?: AVPixelFormat): void;

  [Symbol.dispose](): void;
}

/**
 * Native AVCodecParserContext binding interface
 *
 * Parser for splitting elementary streams into frames.
 * Used when decoding raw streams without a container.
 *
 * @internal
 */
export interface NativeCodecParser {
  readonly __brand: 'NativeCodecParser';

  repeatPict: number;

  init(codecId: AVCodecID): void;
  parse2(codecContext: NativeCodecContext, packet: NativePacket, data: Buffer, pts: bigint, dts: bigint, pos: number): number;
  close(): void;
}

/**
 * Native AVCodecParameters binding interface
 *
 * This struct describes the properties of an encoded stream.
 * All fields are read/write.
 *
 * @internal
 */
export interface NativeCodecParameters extends Disposable {
  readonly __brand: 'NativeCodecParameters';

  readonly codecTagString: string | null;
  readonly extradataSize: number;
  readonly nbCodedSideData: number;
  readonly codecProperties: AVCodecProp;
  codecType: AVMediaType;
  codecId: AVCodecID;
  codecTag: number;
  extradata: Buffer | null;
  format: AVPixelFormat | AVSampleFormat;
  bitRate: bigint;
  bitsPerCodedSample: number;
  bitsPerRawSample: number;
  profile: AVProfile;
  level: number;
  width: number;
  height: number;
  sampleAspectRatio: IRational;
  frameRate: IRational;
  colorRange: AVColorRange;
  colorPrimaries: AVColorPrimaries;
  colorTrc: AVColorTransferCharacteristic;
  colorSpace: AVColorSpace;
  chromaLocation: AVChromaLocation;
  channelLayout: ChannelLayout;
  channels: number;
  sampleRate: number;
  frameSize: number;
  initialPadding: number;
  videoDelay: number;

  alloc(): void;
  free(): void;
  copy(dst: NativeCodecParameters): number;
  fromContext(codecContext: NativeCodecContext): number;
  toContext(codecContext: NativeCodecContext): number;
  parseExtradata(): number;
  getCodecString(): string | null;
  getDecoderConfigurationRecord(): Buffer | null;
  getCodedSideData(type: AVPacketSideDataType): Buffer | null;
  addCodedSideData(type: AVPacketSideDataType, data: Buffer): number;
  getAllCodedSideData(): { type: AVPacketSideDataType; data: Buffer }[];
  toJSON(): Record<string, any>;

  // Symbol.dispose for cleanup
  [Symbol.dispose](): void;
}

/**
 * Native AVDictionary binding interface
 *
 * Key-value store for options and metadata.
 * Used throughout FFmpeg for configuration and metadata.
 * Direct mapping to FFmpeg's AVDictionary.
 *
 * @internal
 */
export interface NativeDictionary extends Disposable {
  readonly __brand: 'NativeDictionary';

  alloc(): void;
  free(): void;
  copy(dst: NativeDictionary, flags: AVDictFlag): number;
  set(key: string, value: string, flags: AVDictFlag): number;
  get(key: string, flags: AVDictFlag): string | null;
  count(): number;
  getAll(): Record<string, string>;
  parseString(str: string, keyValSep: string, pairsSep: string, flags: AVDictFlag): number;
  getString(keyValSep: string, pairsSep: string): string | null;

  [Symbol.dispose](): void;
}

/**
 * Native AVIOContext binding interface
 *
 * Bytestream I/O context for custom I/O.
 * Used for reading/writing data from/to files, network, memory, etc.
 *
 * @internal
 */
export interface NativeIOContext extends Disposable, AsyncDisposable {
  readonly __brand: 'NativeIOContext';

  allocContext(bufferSize: number, writeFlag: number): void;
  allocContextWithCallbacks(
    bufferSize: number,
    writeFlag: 0 | 1,
    readCallback?: ((size: number) => Buffer | null | number | Promise<Buffer | null | number>) | null,
    writeCallback?: ((buffer: Buffer) => number | void | Promise<number | void>) | null,
    seekCallback?: ((offset: bigint, whence: AVSeekWhence) => bigint | number | Promise<bigint | number>) | null,
  ): void;
  freeContext(): void;
  open2(url: string, flags: AVIOFlag): Promise<number>;
  open2Sync(url: string, flags: AVIOFlag): number;
  closep(): Promise<number>;
  closepSync(): number;
  read(size: number): Promise<Buffer | number>;
  readSync(size: number): Buffer | number;
  write(buffer: Buffer): Promise<void>;
  writeSync(buffer: Buffer): void;
  seek(offset: bigint, whence: AVSeekWhence): Promise<bigint>;
  seekSync(offset: bigint, whence: AVSeekWhence): bigint;
  size(): Promise<bigint>;
  sizeSync(): bigint;
  flush(): Promise<void>;
  flushSync(): void;
  skip(offset: bigint): Promise<bigint>;
  skipSync(offset: bigint): bigint;
  tell(): bigint;

  // ===== Properties =====
  readonly eof: boolean;
  readonly error: number;
  readonly seekable: number;
  readonly pos: bigint;
  readonly bufferSize: number;
  readonly writeFlag: boolean;
  maxPacketSize: number;
  direct: number;

  [Symbol.dispose](): void;
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * Native AVInputFormat binding interface
 *
 * Demuxer definition.
 * Describes a supported input container format.
 *
 * @internal
 */
export interface NativeInputFormat {
  readonly __brand: 'NativeInputFormat';

  readonly name: string | null;
  readonly longName: string | null;
  readonly extensions: string | null;
  readonly mimeType: string | null;
  readonly flags: AVFormatFlag;
}

/**
 * Native AVOutputFormat binding interface
 *
 * Muxer definition.
 * Describes a supported output container format.
 *
 * @internal
 */
export interface NativeOutputFormat {
  readonly __brand: 'NativeOutputFormat';

  readonly name: string | null;
  readonly longName: string | null;
  readonly extensions: string | null;
  readonly mimeType: string | null;
  readonly audioCodec: AVCodecID;
  readonly videoCodec: AVCodecID;
  readonly subtitleCodec: AVCodecID;
  readonly flags: AVFormatFlag;
}

/**
 * Native AVStream binding interface
 *
 * Stream structure.
 * Contains information about one stream in a format context.
 * Note: Streams are created and managed by FormatContext - no lifecycle methods.
 *
 * @internal
 */
export interface NativeStream {
  readonly __brand: 'NativeStream';

  readonly parser: NativeCodecParser | null;
  readonly index: number;
  readonly attachedPic: NativePacket | null;
  id: number;
  codecpar: NativeCodecParameters;
  timeBase: IRational;
  startTime: bigint;
  duration: bigint;
  nbFrames: bigint;
  disposition: AVDisposition;
  discard: AVDiscard;
  sampleAspectRatio: IRational;
  avgFrameRate: IRational;
  rFrameRate: IRational;
  ptsWrapBits: number;
  metadata: NativeDictionary | null;
  eventFlags: AVStreamEventFlag;
}

/**
 * Native AVFormatContext binding interface
 *
 * Main interface for demuxing and muxing operations.
 * Must be allocated before use and properly disposed after.
 *
 * @internal
 */
export interface NativeFormatContext extends AsyncDisposable {
  readonly __brand: 'NativeFormatContext';

  readonly startTime: bigint;
  readonly duration: bigint;
  readonly bitRate: bigint;
  readonly iformat: NativeInputFormat | null;
  readonly nbStreams: number;
  readonly streams: NativeStream[] | null;
  readonly nbPrograms: number;
  readonly pbBytes: bigint;
  readonly probeScore: number;
  url: string | null;
  flags: AVFormatFlag;
  probesize: bigint;
  maxAnalyzeDuration: bigint;
  maxInterleaveDelta: bigint;
  metadata: NativeDictionary | null;
  oformat: NativeOutputFormat | null;
  pb: NativeIOContext | null; // setter only
  strictStdCompliance: number;
  maxStreams: number;

  allocContext(): void;
  allocOutputContext2(oformat: NativeOutputFormat | null, formatName: string | null, filename: string | null): number;
  freeContext(): void;
  openInput(url: string, fmt: NativeInputFormat | null, options: NativeDictionary | null): Promise<number>;
  openInputSync(url: string, fmt: NativeInputFormat | null, options: NativeDictionary | null): number;
  closeInput(): Promise<void>;
  closeInputSync(): void;
  findStreamInfo(options: NativeDictionary[] | null): Promise<number>;
  findStreamInfoSync(options: NativeDictionary | null): number;
  readFrame(pkt: NativePacket): Promise<number>;
  readFrameSync(pkt: NativePacket): number;
  seekFrame(streamIndex: number, timestamp: bigint, flags: AVSeekFlag): Promise<number>;
  seekFrameSync(streamIndex: number, timestamp: bigint, flags: AVSeekFlag): number;
  seekFile(streamIndex: number, minTs: bigint, ts: bigint, maxTs: bigint, flags: AVSeekFlag): Promise<number>;
  openOutput(): Promise<number>;
  openOutputSync(): number;
  closeOutput(): Promise<void>;
  closeOutputSync(): void;
  writeHeader(options: NativeDictionary | null): Promise<number>;
  writeHeaderSync(options: NativeDictionary | null): number;
  writeFrame(pkt: NativePacket | null): Promise<number>;
  writeFrameSync(pkt: NativePacket | null): number;
  interleavedWriteFrame(pkt: NativePacket | null): Promise<number>;
  interleavedWriteFrameSync(pkt: NativePacket | null): number;
  writeTrailer(): Promise<number>;
  writeTrailerSync(): number;
  flush(): Promise<void>;
  flushSync(): void;
  newStream(c: NativeCodec | null): NativeStream;
  dumpFormat(index: number, url: string, isOutput: boolean): void;
  findBestStream(
    type: AVMediaType,
    wantedStreamNb: number,
    relatedStream: number,
    wantDecoder: boolean,
    flags: number,
  ): number | { streamIndex: number; decoder: NativeCodec | null };
  getRTSPStreamInfo(): RTSPStreamInfo[] | null;
  sendRTSPPacket(streamIndex: number, rtpData: Buffer): Promise<number>;
  sendRTSPPacketSync(streamIndex: number, rtpData: Buffer): number;

  [Symbol.dispose](): void;
}

/**
 * Native FFmpegError binding interface
 *
 * Provides error code translation and string representation.
 * Maps FFmpeg error codes to human-readable messages.
 *
 * @internal
 */
export interface NativeFFmpegError {
  readonly __brand: 'NativeFFmpegError';

  readonly code: number;
  readonly message: string;
}

/**
 * Native AudioFifo binding interface
 *
 * Audio FIFO buffer for sample storage and buffering.
 * Provides thread-safe audio sample buffering with automatic reallocation.
 *
 * @internal
 */
export interface NativeAudioFifo extends Disposable {
  readonly __brand: 'NativeAudioFifo';

  readonly size: number;
  readonly space: number;

  alloc(sampleFmt: AVSampleFormat, channels: number, nbSamples: number): void;
  free(): void;
  write(data: Buffer | Buffer[], nbSamples: number): Promise<number>;
  writeSync(data: Buffer | Buffer[], nbSamples: number): number;
  read(data: Buffer | Buffer[], nbSamples: number): Promise<number>;
  readSync(data: Buffer | Buffer[], nbSamples: number): number;
  peek(data: Buffer | Buffer[], nbSamples: number): Promise<number>;
  peekSync(data: Buffer | Buffer[], nbSamples: number): number;
  drain(nbSamples: number): void;
  reset(): void;
  realloc(nbSamples: number): number;
}

/**
 * Native AVFifo binding interface
 *
 * Generic FIFO buffer for arbitrary data types.
 * Provides queue functionality for any fixed-size elements.
 *
 * @internal
 */
export interface NativeFifo extends Disposable {
  readonly __brand: 'NativeFifo';

  readonly size: number;
  readonly canRead: number;
  readonly canWrite: number;
  readonly elemSize: number;

  alloc(nbElems: number, elemSize: number, flags: AVFifoFlag): void;
  free(): void;
  write(buf: Buffer, nbElems: number): Promise<number>;
  writeSync(buf: Buffer, nbElems: number): number;
  read(buf: Buffer, nbElems: number): Promise<number>;
  readSync(buf: Buffer, nbElems: number): number;
  peek(buf: Buffer, nbElems: number, offset: number): Promise<number>;
  peekSync(buf: Buffer, nbElems: number, offset: number): number;
  grow(inc: number): number;
  reset(): void;
  setAutoGrowLimit(maxElems: number): void;
}

/**
 * Native SwsContext binding interface
 *
 * Software scaling and format conversion context.
 * Provides pixel format conversion and image scaling capabilities.
 *
 * @internal
 */
export interface NativeSoftwareScaleContext extends Disposable {
  readonly __brand: 'NativeSoftwareScaleContext';

  allocContext(): void;
  getContext(srcW: number, srcH: number, srcFormat: AVPixelFormat, dstW: number, dstH: number, dstFormat: AVPixelFormat, flags: SwsFlags): void;
  initContext(): number;
  freeContext(): void;
  scale(srcSlice: Buffer[], srcStride: number[], srcSliceY: number, srcSliceH: number, dst: Buffer[], dstStride: number[]): Promise<number>;
  scaleSync(srcSlice: Buffer[], srcStride: number[], srcSliceY: number, srcSliceH: number, dst: Buffer[], dstStride: number[]): number;
  scaleFrame(dst: NativeFrame, src: NativeFrame): Promise<number>;
  scaleFrameSync(dst: NativeFrame, src: NativeFrame): number;

  [Symbol.dispose](): void;
}

/**
 * Native FrameUtils binding interface
 *
 * Frame processing utilities with persistent frame pools.
 * Provides crop, scale, and format conversion operations.
 *
 * @internal
 */
export interface NativeFrameUtils extends Disposable {
  readonly __brand: 'NativeFrameUtils';
  process(buffer: Buffer, options: ImageOptions): Buffer;
  close(): void;
}

/**
 * Native SwrContext binding interface
 *
 * Audio resampling, sample format conversion and mixing context.
 * Provides audio format conversion, resampling and channel remapping.
 *
 * @internal
 */
export interface NativeSoftwareResampleContext extends Disposable {
  readonly __brand: 'NativeSoftwareResampleContext';

  alloc(): void;
  allocSetOpts2(
    outChLayout: ChannelLayout,
    outSampleFmt: AVSampleFormat,
    outSampleRate: number,
    inChLayout: ChannelLayout,
    inSampleFmt: AVSampleFormat,
    inSampleRate: number,
  ): number;
  init(): number;
  free(): void;
  close(): void;
  convert(outBuffer: Buffer[] | null, outCount: number, inBuffer: Buffer[] | null, inCount: number): Promise<number>;
  convertSync(outBuffer: Buffer[] | null, outCount: number, inBuffer: Buffer[] | null, inCount: number): number;
  convertFrame(outFrame: NativeFrame | null, inFrame: NativeFrame | null): number;
  configFrame(outFrame: NativeFrame | null, inFrame: NativeFrame | null): number;
  isInitialized(): boolean;
  getDelay(base: bigint): bigint;
  getOutSamples(inSamples: number): number;
  nextPts(pts: bigint): bigint;
  setCompensation(sampleDelta: number, compensationDistance: number): number;
  setChannelMapping(channelMap: number[]): number;
  setMatrix(matrix: number[], stride: number): number;
  dropOutput(count: number): number;
  injectSilence(count: number): number;

  [Symbol.dispose](): void;
}

/**
 * Native AVFilter binding interface
 *
 * Represents a filter definition (e.g., "scale", "overlay", etc.).
 * Filters are static definitions - actual processing happens via FilterContext.
 *
 * @internal
 */
export interface NativeFilter {
  readonly __brand: 'NativeFilter';

  readonly name: string | null;
  readonly description: string | null;
  readonly inputs: FilterPad[];
  readonly outputs: FilterPad[];
  readonly flags: AVFilterFlag;
}

/**
 * Native AVFilterContext binding interface
 *
 * An instance of a filter in a filter graph.
 * Must be created through FilterGraph.createFilter() and properly disposed after.
 *
 * @internal
 */
export interface NativeFilterContext extends Disposable {
  readonly __brand: 'NativeFilterContext';

  readonly filter: NativeFilter | null;
  readonly graph: NativeFilterGraph | null;
  readonly nbInputs: number;
  readonly nbOutputs: number;
  name: string | null;
  hwDeviceCtx: NativeHardwareDeviceContext | null;
  extraHWFrames: number;

  init(options?: NativeDictionary | null): number;
  initStr(args?: string | null): number;
  link(srcPad: number, dst: NativeFilterContext, dstPad: number): number;
  unlink(pad: number): void;
  buffersrcAddFrame(frame: NativeFrame | null, flags?: AVBufferSrcFlag): Promise<number>;
  buffersrcAddFrameSync(frame: NativeFrame | null, flags?: AVBufferSrcFlag): number;
  buffersrcParametersSet(params: {
    width?: number;
    height?: number;
    format?: number;
    timeBase?: IRational;
    frameRate?: IRational;
    sampleAspectRatio?: IRational;
    hwFramesCtx?: NativeHardwareFramesContext | null;
    sampleRate?: number;
    channelLayout?: bigint;
  }): number;
  buffersinkGetFrame(frame: NativeFrame): Promise<number>;
  buffersinkGetFrameSync(frame: NativeFrame): number;
  // buffersinkSetFrameSize(frameSize: number): void;
  buffersinkGetWidth(): number;
  buffersinkGetHeight(): number;
  buffersinkGetFormat(): AVPixelFormat | AVSampleFormat;
  buffersinkGetTimeBase(): IRational;
  buffersinkGetFrameRate(): IRational;
  buffersinkGetSampleRate(): number;
  buffersinkGetChannelLayout(): ChannelLayout;
  buffersinkGetSampleAspectRatio(): IRational;
  buffersinkGetColorspace(): AVColorSpace;
  buffersinkGetColorRange(): AVColorRange;
  free(): void;

  [Symbol.dispose](): void;
}

/**
 * Native AVFilterGraph binding interface
 *
 * Container for all filters and their connections.
 * Must be allocated before use and properly disposed after.
 *
 * @internal
 */
export interface NativeFilterGraph extends Disposable {
  readonly __brand: 'NativeFilterGraph';

  readonly nbFilters: number;
  readonly filters: NativeFilterContext[] | null;
  threadType: AVFilterConstants;
  nbThreads: number;
  scaleSwsOpts: string | null;
  aresampleSwrOpts: string | null;

  alloc(): void;
  free(): void;
  createFilter(filter: NativeFilter, name: string, args?: string | null): NativeFilterContext | null;
  allocFilter(filter: NativeFilter, name: string): NativeFilterContext | null;
  getFilter(name: string): NativeFilterContext | null;
  config(): Promise<number>;
  configSync(): number;
  parse(filters: string, inputs: NativeFilterInOut | null, outputs: NativeFilterInOut | null): number;
  parse2(filters: string): number;
  parsePtr(filters: string, inputs?: NativeFilterInOut | null, outputs?: NativeFilterInOut | null): number;
  segmentParse(filters: string, flags?: number): NativeFilterGraphSegment | null;
  validate(): number;
  requestOldest(): Promise<number>;
  requestOldestSync(): number;
  dump(): string | null;
  sendCommand(target: string, cmd: string, arg: string, flags?: AVFilterCmdFlag): number | { response: string | null };
  queueCommand(target: string, cmd: string, arg: string, ts: number, flags?: AVFilterCmdFlag): number;

  [Symbol.dispose](): void;
}

/**
 * Native AVFilterGraphSegment binding interface
 *
 * Represents a parsed filtergraph segment.
 * Separates filter parsing from initialization.
 *
 * @internal
 */
export interface NativeFilterGraphSegment extends Disposable {
  readonly __brand: 'NativeFilterGraphSegment';

  free(): void;
  createFilters(flags?: number): number;
  applyOpts(flags?: number): number;
  apply(inputs: NativeFilterInOut, outputs: NativeFilterInOut, flags?: number): number;

  [Symbol.dispose](): void;
}

/**
 * Native AVFilterInOut binding interface
 *
 * Helper structure for parsing filter graphs.
 * Used with FilterGraph.parse() to define inputs/outputs.
 *
 * @internal
 */
export interface NativeFilterInOut extends Disposable {
  readonly __brand: 'NativeFilterInOut';

  name: string | null;
  filterCtx: NativeFilterContext | null;
  padIdx: number;
  next: NativeFilterInOut | null;

  alloc(): void;
  free(): void;

  [Symbol.dispose](): void;
}

/**
 * Native AVHWDeviceContext binding interface
 *
 * Hardware device context for hardware acceleration.
 * Direct mapping to FFmpeg's AVHWDeviceContext.
 *
 * @internal
 */
export interface NativeHardwareDeviceContext extends Disposable {
  readonly __brand: 'NativeHardwareDeviceContext';

  readonly type: AVHWDeviceType;
  readonly hwctx: bigint | null;

  alloc(type: AVHWDeviceType): void;
  init(): number;
  create(type: AVHWDeviceType, device: string | null, options: any | null): number;
  createDerived(source: NativeHardwareDeviceContext, type: AVHWDeviceType): number;
  hwconfigAlloc(): bigint | null;
  getHwframeConstraints(hwconfig?: bigint): {
    validHwFormats?: AVPixelFormat[];
    validSwFormats?: AVPixelFormat[];
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
  } | null;
  free(): void;

  [Symbol.dispose](): void;
}

/**
 * Native AVHWFramesContext binding interface
 *
 * Hardware frames context for hardware acceleration.
 * Direct mapping to FFmpeg's AVHWFramesContext.
 *
 * @internal
 */
export interface NativeHardwareFramesContext extends Disposable {
  readonly __brand: 'NativeHardwareFramesContext';

  readonly deviceRef: NativeHardwareDeviceContext | null;
  format: AVPixelFormat;
  swFormat: AVPixelFormat;
  width: number;
  height: number;
  initialPoolSize: number;

  alloc(device: NativeHardwareDeviceContext): void;
  init(): number;
  getBuffer(frame: NativeFrame, flags?: number): number;
  transferData(dst: NativeFrame, src: NativeFrame, flags?: number): Promise<number>;
  transferDataSync(dst: NativeFrame, src: NativeFrame, flags?: number): number;
  transferGetFormats(direction: AVHWFrameTransferDirection): AVPixelFormat[] | number;
  map(dst: NativeFrame, src: NativeFrame, flags?: number): number;
  createDerived(format: AVPixelFormat, derivedDevice: NativeHardwareDeviceContext, source: NativeHardwareFramesContext, flags?: number): number;
  free(): void;

  [Symbol.dispose](): void;
}

/**
 * Native AVBitStreamFilter binding interface
 *
 * Represents a bitstream filter definition for modifying packet data.
 * This is an immutable descriptor - actual filtering happens via BitStreamFilterContext.
 * Used for tasks like H.264 annexb conversion, adding/removing metadata, or format adjustments.
 *
 * @internal
 */
export interface NativeBitStreamFilter {
  readonly __brand: 'NativeBitStreamFilter';

  readonly name: string | null;
  readonly codecIds: number[] | null;
}

/**
 * Native AVBSFContext binding interface
 *
 * The main interface for bitstream filtering operations.
 * Processes packets without full decode/encode, modifying headers, metadata, or format.
 * Must be allocated with a filter, initialized, and properly disposed after use.
 *
 * @internal
 */
export interface NativeBitStreamFilterContext extends Disposable {
  readonly __brand: 'NativeBitStreamFilterContext';

  // ===== Properties =====
  readonly inputCodecParameters: NativeCodecParameters | null;
  readonly outputCodecParameters: NativeCodecParameters | null;
  readonly outputTimeBase: IRational | null;
  readonly filter: NativeBitStreamFilter | null;
  inputTimeBase: IRational;

  alloc(filter: NativeBitStreamFilter): number;
  init(): number;
  free(): void;
  flush(): void;
  sendPacket(packet: NativePacket | null): Promise<number>;
  sendPacketSync(packet: NativePacket | null): number;
  receivePacket(packet: NativePacket): Promise<number>;
  receivePacketSync(packet: NativePacket): number;
  isInitialized(): boolean;

  [Symbol.dispose](): void;
}

/**
 * Native Log binding interface
 *
 * Static-only class for controlling FFmpeg's logging.
 * Direct mapping to av_log functions.
 *
 * @internal
 */
export interface NativeLog {
  readonly __brand: 'NativeLog';
}

/**
 * Native AVOption
 *
 * Represents a single option metadata from FFmpeg's AVOption system.
 * Retrieved via Option.next() or Option.find().
 *
 * @internal
 */
export interface NativeOption {
  readonly __brand: 'NativeOption';

  readonly name: string | null;
  readonly help: string | null;
  readonly type: AVOptionType;
  readonly defaultValue: unknown;
  readonly min: number;
  readonly max: number;
  readonly flags: AVOptionFlag;
  readonly unit: string | null;
}

/**
 * Native sync queue interface
 *
 * FFmpeg's native sync_queue from fftools for packet synchronization.
 *
 * @internal
 */
export interface NativeSyncQueue extends Disposable {
  addStream(limiting: number): number;
  send(streamIdx: number, packet: NativePacket | null): number;
  receive(streamIdx: number, packet: NativePacket): number;
  free(): void;
}

/**
 * Device information returned by device enumeration
 *
 * @internal
 */
export interface NativeDeviceInfo {
  name: string;
  description: string;
  type: 'video' | 'audio' | 'screen';
  isDefault: boolean;
  screenX?: number;
  screenY?: number;
  screenWidth?: number;
  screenHeight?: number;
}

/**
 * Device capture mode (resolution + frame rate range)
 *
 * @internal
 */
export interface NativeDeviceMode {
  width: number;
  height: number;
  minFrameRate: number;
  maxFrameRate: number;
  pixelFormat: AVPixelFormat;
}

/**
 * Audio device capture mode (sample rate + channels + sample format)
 *
 * @internal
 */
export interface NativeAudioDeviceMode {
  sampleRate: number;
  channels: number;
  sampleFormat: AVSampleFormat;
}

/**
 * Device module static methods
 *
 * @internal
 */
export interface NativeDeviceModule {
  listDevices(): Promise<NativeDeviceInfo[]>;
  listDevicesSync(): NativeDeviceInfo[];
  listDeviceModes(deviceName: string): Promise<NativeDeviceMode[]>;
  listDeviceModesSync(deviceName: string): NativeDeviceMode[];
  listAudioDeviceModes(deviceName: string): Promise<NativeAudioDeviceMode[]>;
  listAudioDeviceModesSync(deviceName: string): NativeAudioDeviceMode[];
  getVideoFormat(): string;
  getAudioFormat(): string;
  getScreenFormat(): string;
  hasScreenCapturePermission(): boolean;
  requestScreenCaptureAccess(): boolean;
}

/**
 * Interface for classes that wrap native objects
 *
 * @internal
 */
export interface NativeWrapper<T> {
  getNative(): T;
}
