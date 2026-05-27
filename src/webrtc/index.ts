// WebRTC Stream
export { WebRTCStream, type WebRTCCodecInfo, type WebRTCStreamOptions } from '../api/webrtc-stream.js';

// RTP Stream
export { RTPStream, type RTPStreamOptions } from '../api/rtp-stream.js';

// Re-export werift primitives used by the WebRTC/RTP APIs
export { MediaStreamTrack, RTCIceCandidate, RTCPeerConnection, RTCRtpCodecParameters, RTCSessionDescription, RtpPacket, type PeerConfig } from 'werift';
