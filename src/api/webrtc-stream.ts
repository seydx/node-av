import { MediaStreamTrack, RTCIceCandidate, RTCPeerConnection, RTCRtpCodecParameters, RTCSessionDescription } from 'werift';

import {
  AV_CODEC_ID_AV1,
  AV_CODEC_ID_H264,
  AV_CODEC_ID_HEVC,
  AV_CODEC_ID_OPUS,
  AV_CODEC_ID_PCM_ALAW,
  AV_CODEC_ID_PCM_MULAW,
  AV_CODEC_ID_VP8,
  AV_CODEC_ID_VP9,
} from '../constants/constants.js';
import { RTPStream } from './rtp-stream.js';

import type { AVCodecID } from '../constants/index.js';
import type { Demuxer } from './demuxer.js';
import type { RTPStreamOptions } from './rtp-stream.js';

/**
 * Codec information for WebRTC streaming.
 *
 * Contains RTP codec parameters and FFmpeg codec IDs for video and audio streams.
 * Used for codec negotiation in WebRTC peer connections.
 */
export interface WebRTCCodecInfo {
  /**
   * Video codec configuration.
   * Combines RTP parameters (mimeType, clockRate, etc.) with FFmpeg codec ID.
   */
  video?: Partial<RTCRtpCodecParameters> & {
    codecId: AVCodecID;
  };

  /**
   * Optional audio codec configuration.
   * Combines RTP parameters (mimeType, clockRate, channels) with FFmpeg codec ID.
   */
  audio?: Partial<RTCRtpCodecParameters> & {
    codecId: AVCodecID;
  };
}

/**
 * Options for configuring WebRTC session with werift integration.
 */
export interface WebRTCStreamOptions extends Omit<RTPStreamOptions, 'onVideoPacket' | 'onAudioPacket' | 'supportedVideoCodecs' | 'supportedAudioCodecs'> {
  /**
   * ICE servers for NAT traversal and STUN/TURN configuration.
   *
   * @default []
   */
  iceServers?: { urls: string }[];

  /**
   * Callback invoked when a new ICE candidate is discovered.
   * Send this candidate to the remote peer via signaling channel.
   *
   * @param candidate - ICE candidate string to send to remote peer
   */
  onIceCandidate?: (candidate: string) => void;
}

/**
 * Complete WebRTC session management with werift integration.
 *
 * Provides end-to-end WebRTC streaming with automatic SDP negotiation,
 * ICE candidate handling, and peer connection management.
 * Built on top of {@link RTPStream} for generic RTP streaming with WebRTC-specific
 * protocol details handled automatically.
 * Integrates with werift library for RTCPeerConnection and media track handling.
 * Ideal for building complete WebRTC streaming applications with minimal code.
 *
 * @example
 * ```typescript
 * import { WebRTCStream } from 'node-av/api';
 *
 * // Create session from media source
 * const session = await WebRTCStream.create('rtsp://camera.local/stream', {
 *   mtu: 1200,
 *   hardware: 'auto',
 *   iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
 *   onIceCandidate: (candidate) => {
 *     sendToClient({ type: 'candidate', value: candidate });
 *   }
 * });
 *
 * // Process SDP offer from client
 * const answer = await session.setOffer(clientOffer);
 * sendToClient({ type: 'answer', value: answer });
 *
 * // Start streaming
 * await session.start();
 * ```
 *
 * @example
 * ```typescript
 * // Complete WebSocket signaling server
 * import { WebSocket } from 'ws';
 *
 * ws.on('message', async (data) => {
 *   const msg = JSON.parse(data);
 *
 *   if (msg.type === 'offer') {
 *     const session = await WebRTCStream.create(msg.url, {
 *       hardware: 'auto',
 *       onIceCandidate: (candidate) => {
 *         ws.send(JSON.stringify({ type: 'candidate', value: candidate }));
 *       }
 *     });
 *
 *     const answer = await session.setOffer(msg.value);
 *     ws.send(JSON.stringify({ type: 'answer', value: answer }));
 *
 *     await session.start();
 *   } else if (msg.type === 'candidate') {
 *     session.addIceCandidate(msg.value);
 *   }
 * });
 * ```
 *
 * @see {@link RTPStream} For library-agnostic RTP streaming
 * @see {@link Demuxer} For input media handling
 */
export class WebRTCStream {
  private stream!: RTPStream;
  private pc: RTCPeerConnection | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private audioTrack: MediaStreamTrack | null = null;
  private options: WebRTCStreamOptions;
  private pendingIceCandidates: string[] = [];

  /**
   * @param options - Session configuration options
   *
   * Use {@link create} factory method
   *
   * @internal
   */
  private constructor(options: WebRTCStreamOptions) {
    this.options = {
      onIceCandidate: options.onIceCandidate ?? (() => {}),
      onClose: options.onClose ?? (() => {}),
      iceServers: options.iceServers ?? [],
      ...options,
    };
  }

  /**
   * Create a WebRTC session from a media source.
   *
   * Opens the input media, creates internal streaming components, and prepares
   * for WebRTC peer connection negotiation. Does not start streaming yet.
   * Call {@link setOffer} to negotiate SDP and {@link start} to begin streaming.
   *
   * @param input - Media source URL (RTSP, file path, HTTP, etc.) or a pre-opened {@link Demuxer}
   *
   * @param options - Session configuration options
   *
   * @returns Configured WebRTC session instance
   *
   * @example
   * ```typescript
   * const session = WebRTCStream.create('rtsp://camera.local/stream', {
   *   mtu: 1200,
   *   hardware: 'auto',
   *   iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Session from a pre-opened Demuxer (e.g. screen capture)
   * const demuxer = await Device.openScreen({ frameRate: 30 });
   * const session = WebRTCStream.create(demuxer, {
   *   hardware: 'auto'
   * });
   * ```
   */
  static create(input: string | Demuxer, options: WebRTCStreamOptions = {}): WebRTCStream {
    const session = new WebRTCStream(options);

    // Create stream with WebRTC-specific codec support
    session.stream = RTPStream.create(input, {
      video: options.video,
      audio: options.audio,
      hardware: options.hardware,
      inputOptions: options.inputOptions,
      supportedVideoCodecs: [AV_CODEC_ID_H264, AV_CODEC_ID_HEVC, AV_CODEC_ID_VP8, AV_CODEC_ID_VP9, AV_CODEC_ID_AV1],
      supportedAudioCodecs: [AV_CODEC_ID_OPUS, AV_CODEC_ID_PCM_ALAW, AV_CODEC_ID_PCM_MULAW],
      onVideoPacket: (rtp) => {
        session.videoTrack?.writeRtp(rtp);
      },
      onAudioPacket: (rtp) => {
        session.audioTrack?.writeRtp(rtp);
      },
      onClose: (error) => {
        session.options.onClose?.(error);
      },
    });

    return session;
  }

  /**
   * Start streaming media to WebRTC peer connection.
   *
   * Begins the media processing pipeline, reading packets from input,
   * transcoding if necessary, and sending RTP packets to media tracks.
   * Note: The stream is automatically started by {@link setOffer}, so calling
   * this method explicitly is optional. This method is provided for cases where
   * you need explicit control over when streaming begins.
   *
   * @returns Promise that resolves when streaming completes
   *
   * @throws {FFmpegError} If transcoding or muxing fails
   *
   * @example
   * ```typescript
   * const session = await WebRTCStream.create('input.mp4');
   * session.onIceCandidate = (c) => sendToRemote(c);
   *
   * const answer = await session.setOffer(remoteOffer);
   * sendToRemote(answer);
   * // Stream is already started by setOffer
   * ```
   */
  async start(): Promise<void> {
    await this.stream.start();
  }

  /**
   * Stop streaming gracefully and clean up all resources.
   *
   * Stops the stream, closes peer connection, and releases all resources.
   * Safe to call multiple times. After stopping, you can call start() again
   * to restart the session.
   *
   * @example
   * ```typescript
   * const session = await WebRTCStream.create('input.mp4');
   * await session.start();
   *
   * // Stop after 10 seconds
   * setTimeout(async () => await session.stop(), 10000);
   * ```
   */
  async stop(): Promise<void> {
    await this.stream.stop();
    this.pc?.close();
    this.videoTrack = null;
    this.audioTrack = null;
    this.pc = null;
    this.pendingIceCandidates = [];
  }

  /**
   * Get detected codec information.
   *
   * Returns RTP codec parameters and FFmpeg codec IDs for video and audio.
   * Useful for inspecting what codecs will be used in the WebRTC session.
   * The input is automatically opened during {@link create}, so codecs can be
   * detected immediately after session creation.
   *
   * @returns Codec configuration for video and audio streams
   *
   * @example
   * ```typescript
   * const session = await WebRTCStream.create('input.mp4');
   * const codecs = session.getCodecs();
   *
   * console.log('Video:', codecs.video.mimeType);
   * console.log('Audio:', codecs.audio?.mimeType);
   * ```
   */
  getCodecs(): WebRTCCodecInfo {
    const input = this.stream.getInput();
    if (!input) {
      return {
        video: undefined,
        audio: undefined,
      };
    }

    const videoStream = input.video();
    const audioStream = input.audio();

    // Try the input codec first; if unsupported (e.g. rawvideo from device capture),
    // fall back to the first supported video codec (the transcode target)
    let videoConfig = this.getVideoCodecConfig(videoStream?.codecpar.codecId);
    if (!videoConfig && videoStream) {
      const supportedVideoCodecs = [AV_CODEC_ID_H264, AV_CODEC_ID_HEVC, AV_CODEC_ID_VP8, AV_CODEC_ID_VP9, AV_CODEC_ID_AV1];
      for (const codecId of supportedVideoCodecs) {
        videoConfig = this.getVideoCodecConfig(codecId);
        if (videoConfig) break;
      }
    }

    return {
      video: videoConfig,
      audio: this.getAudioCodecConfig(audioStream?.codecpar.codecId),
    };
  }

  /**
   * Process SDP offer from remote peer and generate SDP answer.
   *
   * Creates RTCPeerConnection with detected codecs, sets up media tracks,
   * processes the remote SDP offer, and generates a local SDP answer.
   * Also configures ICE candidate handling via `onIceCandidate` callback in options.
   * Must be called before {@link start}.
   *
   * @param offerSdp - SDP offer string from remote WebRTC peer
   *
   * @returns SDP answer string to send back to remote peer
   *
   * @example
   * ```typescript
   * const session = await WebRTCStream.create('input.mp4');
   *
   * // Setup ICE candidate handler first
   * session.onIceCandidate = (candidate) => {
   *   sendToRemote({ type: 'candidate', value: candidate });
   * };
   *
   * // Process offer and send answer
   * const answer = await session.setOffer(remoteOffer);
   * sendToRemote({ type: 'answer', value: answer });
   *
   * // Start streaming
   * await session.start();
   * ```
   */
  async setOffer(offerSdp: string): Promise<string> {
    const codecs = this.getCodecs();

    const videoConfig: any = codecs.video ?? {
      mimeType: 'video/H264',
      clockRate: 90000,
      payloadType: 96,
    };
    delete videoConfig.codecId;

    const audioConfig: any = codecs.audio ?? {
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
      payloadType: 111,
    };

    delete audioConfig.codecId;

    // Create PeerConnection with detected codecs
    const codecParams: { video: RTCRtpCodecParameters[]; audio: RTCRtpCodecParameters[] } = {
      video: [
        new RTCRtpCodecParameters({
          ...videoConfig,
        }),
      ],
      audio: [
        new RTCRtpCodecParameters({
          ...audioConfig,
        }),
      ],
    };

    this.pc = new RTCPeerConnection({
      codecs: codecParams,
      iceServers: this.options.iceServers,
    });

    // Setup ICE candidate handling
    this.pc.onIceCandidate.subscribe((candidate) => {
      if (candidate?.candidate && this.options.onIceCandidate) {
        this.options.onIceCandidate(candidate.candidate);
      }
    });

    // Setup tracks
    this.pc.onRemoteTransceiverAdded.subscribe(async (transceiver) => {
      if (transceiver.kind === 'video') {
        this.videoTrack = new MediaStreamTrack({ kind: 'video' });
        transceiver.sender.replaceTrack(this.videoTrack);
        transceiver.setDirection('sendonly');
      } else if (transceiver.kind === 'audio' && this.audioTrack === null) {
        this.audioTrack = new MediaStreamTrack({ kind: 'audio' });
        transceiver.sender.replaceTrack(this.audioTrack);
        transceiver.setDirection('sendonly');
      } else if (transceiver.kind === 'audio') {
        // Backchannel
        const [track] = await transceiver.onTrack.asPromise();
        const input = this.stream.getInput();
        const ctx = input?.getFormatContext();
        const streams = ctx?.getRTSPStreamInfo();
        const backchannel = streams?.find((s) => s.direction === 'sendonly' && s.mediaType === 'audio');

        track.onReceiveRtp.subscribe(async (rtp) => {
          if (backchannel && this.stream.isStreamActive) {
            try {
              await ctx?.sendRTSPPacket(backchannel.streamIndex, rtp.serialize());
            } catch {
              // Ignore send errors
            }
          }
        });
      }
    });

    // Set remote description and create answer
    await this.pc.setRemoteDescription(new RTCSessionDescription(offerSdp, 'offer'));
    const answer = await this.pc.createAnswer();
    this.pc.setLocalDescription(answer);

    // Apply any buffered ICE candidates now that remote description is set
    if (this.pendingIceCandidates.length > 0) {
      for (const candidate of this.pendingIceCandidates) {
        this.pc.addIceCandidate(new RTCIceCandidate({ candidate }));
      }
      this.pendingIceCandidates = [];
    }

    return this.pc.localDescription?.sdp ?? '';
  }

  /**
   * Add ICE candidate from remote peer.
   *
   * Processes ICE candidates received from the remote peer via signaling channel.
   * Should be called whenever a new candidate message arrives from remote peer.
   * Can be called multiple times as candidates are discovered.
   *
   * Supports ICE trickling: If called before {@link setOffer}, candidates are buffered
   * and applied automatically once the remote description is set.
   *
   * @param candidate - ICE candidate string from remote peer
   *
   * @example
   * ```typescript
   * // In signaling message handler
   * if (msg.type === 'candidate') {
   *   session.addIceCandidate(msg.value);
   * }
   * ```
   */
  addIceCandidate(candidate: string): void {
    // Buffer candidates if peer connection not ready yet (ICE trickling)
    if (!this.pc?.remoteDescription) {
      this.pendingIceCandidates.push(candidate);
      return;
    }

    // Apply candidate immediately if peer connection is ready
    this.pc.addIceCandidate(new RTCIceCandidate({ candidate }));
  }

  /**
   * Get video codec configuration from input stream.
   *
   * @param codecId - FFmpeg codec ID
   *
   * @returns RTP codec parameters with codec ID or undefined if unsupported
   *
   * @internal
   */
  private getVideoCodecConfig(codecId?: AVCodecID): (Partial<RTCRtpCodecParameters> & { codecId: AVCodecID }) | undefined {
    let mimeType: string;
    const clockRate = 90000;
    let payloadType: number;

    switch (codecId) {
      case AV_CODEC_ID_H264:
        mimeType = 'video/H264';
        payloadType = 96;
        break;
      case AV_CODEC_ID_HEVC:
        mimeType = 'video/H265';
        payloadType = 96;
        break;
      case AV_CODEC_ID_VP8:
        mimeType = 'video/VP8';
        payloadType = 96;
        break;
      case AV_CODEC_ID_VP9:
        mimeType = 'video/VP9';
        payloadType = 98;
        break;
      case AV_CODEC_ID_AV1:
        mimeType = 'video/AV1';
        payloadType = 98;
        break;
      default:
        return undefined;
    }

    return { mimeType, clockRate, payloadType, codecId };
  }

  /**
   * Get audio codec configuration from input stream.
   *
   * @param codecId - FFmpeg codec ID
   *
   * @returns RTP codec parameters with codec ID or undefined if unsupported
   *
   * @internal
   */
  private getAudioCodecConfig(codecId?: AVCodecID): (Partial<RTCRtpCodecParameters> & { codecId: AVCodecID }) | undefined {
    let mimeType: string;
    let clockRate: number;
    let channels: number;
    let payloadType: number;

    switch (codecId) {
      case AV_CODEC_ID_OPUS:
        mimeType = 'audio/opus';
        clockRate = 48000;
        channels = 2;
        payloadType = 111;
        break;
      case AV_CODEC_ID_PCM_ALAW:
        mimeType = 'audio/PCMA';
        clockRate = 8000;
        channels = 1;
        payloadType = 8;
        break;
      case AV_CODEC_ID_PCM_MULAW:
        mimeType = 'audio/PCMU';
        clockRate = 8000;
        channels = 1;
        payloadType = 0;
        break;
      default:
        return undefined;
    }

    return { mimeType, clockRate, channels, payloadType, codecId };
  }
}
