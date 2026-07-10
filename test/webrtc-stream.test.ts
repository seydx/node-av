import assert from 'node:assert';
import { describe, it } from 'node:test';

import { getInputFile, prepareTestEnvironment } from './index.js';

import type { RTCPeerConnection } from 'werift';

prepareTestEnvironment();

const weriftAvailable = await import('werift').then(
  () => true,
  () => false,
);
const skipWerift = { skip: weriftAvailable ? false : 'werift not installed (optional dependency)' };

async function createClientOffer(): Promise<{ client: RTCPeerConnection; sdp: string }> {
  const { RTCPeerConnection, RTCRtpCodecParameters } = await import('werift');
  const client = new RTCPeerConnection({
    codecs: {
      video: [new RTCRtpCodecParameters({ mimeType: 'video/H264', clockRate: 90000, payloadType: 96 })],
      audio: [new RTCRtpCodecParameters({ mimeType: 'audio/opus', clockRate: 48000, channels: 2, payloadType: 111 })],
    },
  });
  client.addTransceiver('video', { direction: 'recvonly' });
  client.addTransceiver('audio', { direction: 'recvonly' });
  const offer = await client.createOffer();
  await client.setLocalDescription(offer);
  return { client, sdp: client.localDescription!.sdp };
}

describe('WebRTCStream', skipWerift, () => {
  const inputFile = getInputFile('video.mp4');

  it('answers an offer with a complete SDP', async () => {
    const { WebRTCStream } = await import('../src/webrtc/index.js');
    const session = WebRTCStream.create(inputFile);
    const { client, sdp: offer } = await createClientOffer();

    try {
      const answer = await session.setOffer(offer);
      // setLocalDescription is awaited, so the answer SDP must be complete.
      assert.ok(answer.length > 0, 'answer SDP must not be empty');
      assert.ok(answer.includes('m=video'), 'answer must contain a video section');
      assert.ok(answer.includes('a=candidate') || answer.includes('a=ice-ufrag'), 'answer must contain ICE attributes');
    } finally {
      await session.stop();
      await client.close();
    }
  });

  it('renegotiates on a second setOffer and closes the previous peer connection', async () => {
    const { WebRTCStream } = await import('../src/webrtc/index.js');
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);

    const session = WebRTCStream.create(inputFile);
    const { client: client1, sdp: offer1 } = await createClientOffer();
    const { client: client2, sdp: offer2 } = await createClientOffer();

    try {
      const answer1 = await session.setOffer(offer1);
      assert.ok(answer1.includes('m=video'), 'first answer must contain a video section');

      const pc1 = (session as any).pc as RTCPeerConnection;
      assert.ok(pc1, 'first peer connection must exist');

      const answer2 = await session.setOffer(offer2);
      assert.ok(answer2.includes('m=video'), 'second answer must contain a video section');

      const pc2 = (session as any).pc as RTCPeerConnection;
      assert.ok(pc2, 'second peer connection must exist');
      assert.notStrictEqual(pc2, pc1, 'renegotiation must create a new peer connection');
      assert.strictEqual(pc1.connectionState, 'closed', 'previous peer connection must be closed');

      // The old connection's 'closed'/'failed' events must not tear down the new session.
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.strictEqual((session as any).pc, pc2, 'stale state change must not stop the new session');
      assert.strictEqual(rejections.length, 0, `unhandled rejections during renegotiation: ${String(rejections[0])}`);
    } finally {
      process.off('unhandledRejection', onRejection);
      await session.stop();
      await client1.close();
      await client2.close();
    }
  });

  it('stop() after setOffer produces no unhandled rejections', async () => {
    const { WebRTCStream } = await import('../src/webrtc/index.js');
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);

    const session = WebRTCStream.create(inputFile);
    const { client, sdp: offer } = await createClientOffer();

    try {
      const answer = await session.setOffer(offer);
      assert.ok(answer.includes('m=video'));

      await session.stop();
      await session.stop(); // idempotent

      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.strictEqual(rejections.length, 0, `unhandled rejections after stop: ${String(rejections[0])}`);
    } finally {
      process.off('unhandledRejection', onRejection);
      await session.stop();
      await client.close();
    }
  });
});
