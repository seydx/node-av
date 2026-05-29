import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  AV_NOPTS_VALUE,
  AV_PKT_DATA_NEW_EXTRADATA,
  AV_PKT_DATA_PALETTE,
  AV_PKT_DATA_STRINGS_METADATA,
  AV_PKT_FLAG_CORRUPT,
  AV_PKT_FLAG_DISCARD,
  AV_PKT_FLAG_KEY,
  AVFLAG_NONE,
  Packet,
  Rational,
} from '../src/index.js';

import type { AVPacketFlag } from '../src/index.js';

describe('Packet', () => {
  let packet: Packet;

  beforeEach(() => {
    packet = new Packet();
  });

  afterEach(() => {
    try {
      packet.free();
    } catch {
      // Packet might already be freed
    }
  });

  describe('Lifecycle', () => {
    it('should create an uninitialized packet', () => {
      assert.ok(packet);
      // Packet should not have data before alloc
      assert.equal(packet.data, null);
    });

    it('should allocate and free a packet', () => {
      packet.alloc();
      // After alloc, packet should still not have data buffers
      assert.equal(packet.data, null);
      assert.equal(packet.size, 0);

      packet.free();
      // After free, we can't test properties as packet is freed
    });

    it('should support using statement for automatic disposal', () => {
      using testPacket = new Packet();
      testPacket.alloc();
      assert.ok(testPacket);
      // testPacket will be automatically disposed when leaving scope
    });
  });

  describe('Properties', () => {
    beforeEach(() => {
      packet.alloc();
    });

    it('should set and get stream index', () => {
      packet.streamIndex = 0;
      assert.equal(packet.streamIndex, 0);

      packet.streamIndex = 5;
      assert.equal(packet.streamIndex, 5);

      packet.streamIndex = -1;
      assert.equal(packet.streamIndex, -1);
    });

    it('should set and get pts', () => {
      packet.pts = 0n;
      assert.equal(packet.pts, 0n);

      packet.pts = 1000n;
      assert.equal(packet.pts, 1000n);

      packet.pts = AV_NOPTS_VALUE;
      assert.equal(packet.pts, AV_NOPTS_VALUE);
    });

    it('should set and get dts', () => {
      packet.dts = 0n;
      assert.equal(packet.dts, 0n);

      packet.dts = 500n;
      assert.equal(packet.dts, 500n);

      packet.dts = AV_NOPTS_VALUE;
      assert.equal(packet.dts, AV_NOPTS_VALUE);
    });

    it('should set and get duration', () => {
      packet.duration = 0n;
      assert.equal(packet.duration, 0n);

      packet.duration = 40n;
      assert.equal(packet.duration, 40n);
    });

    it('should set and get position', () => {
      packet.pos = -1n;
      assert.equal(packet.pos, -1n);

      packet.pos = 12345n;
      assert.equal(packet.pos, 12345n);
    });

    it('should get size', () => {
      // Size is read-only and determined by actual data
      assert.equal(packet.size, 0);

      // Size would be set when packet contains actual data
      // which happens during demuxing/muxing operations
    });

    it('should set and get timeBase', () => {
      // Set timebase to 1/1000 (milliseconds)
      packet.timeBase = new Rational(1, 1000);
      assert.equal(packet.timeBase.num, 1);
      assert.equal(packet.timeBase.den, 1000);

      // Set timebase to 1/25 (25fps)
      packet.timeBase = new Rational(1, 25);
      assert.equal(packet.timeBase.num, 1);
      assert.equal(packet.timeBase.den, 25);

      // Set timebase to 1/90000 (90kHz)
      packet.timeBase = new Rational(1, 90000);
      assert.equal(packet.timeBase.num, 1);
      assert.equal(packet.timeBase.den, 90000);
    });

    it('should set and get flags', () => {
      packet.flags = AVFLAG_NONE;
      assert.equal(packet.flags, AVFLAG_NONE);
      assert.equal(packet.isKeyframe, false);

      packet.flags = AV_PKT_FLAG_KEY;
      assert.equal(packet.flags, AV_PKT_FLAG_KEY);
      assert.equal(packet.isKeyframe, true);

      packet.flags = (AV_PKT_FLAG_KEY | AV_PKT_FLAG_CORRUPT) as AVPacketFlag;
      assert.equal(packet.flags, AV_PKT_FLAG_KEY | AV_PKT_FLAG_CORRUPT);
      assert.equal(packet.isKeyframe, true);

      packet.flags = AV_PKT_FLAG_CORRUPT;
      assert.equal(packet.isKeyframe, false);
    });

    it('should detect keyframe flag', () => {
      packet.flags = AVFLAG_NONE;
      assert.equal(packet.isKeyframe, false);

      packet.flags = AV_PKT_FLAG_KEY;
      assert.equal(packet.isKeyframe, true);

      packet.flags = (AV_PKT_FLAG_KEY | AV_PKT_FLAG_DISCARD) as AVPacketFlag;
      assert.equal(packet.isKeyframe, true);
    });
  });

  describe('Operations', () => {
    let srcPacket: Packet;

    beforeEach(() => {
      packet.alloc();
      srcPacket = new Packet();
      srcPacket.alloc();
    });

    afterEach(() => {
      try {
        srcPacket.free();
      } catch {
        // Might already be freed
      }
    });

    it('should reference another packet', () => {
      // Set up source packet
      srcPacket.streamIndex = 1;
      srcPacket.pts = 1000n;
      srcPacket.dts = 900n;
      srcPacket.duration = 40n;
      srcPacket.flags = AV_PKT_FLAG_KEY;

      // Reference it
      const ret = packet.ref(srcPacket);
      assert.equal(ret, 0);

      // Properties should be copied
      assert.equal(packet.streamIndex, srcPacket.streamIndex);
      assert.equal(packet.pts, srcPacket.pts);
      assert.equal(packet.dts, srcPacket.dts);
      assert.equal(packet.duration, srcPacket.duration);
      assert.equal(packet.flags, srcPacket.flags);
    });

    it('should clone a packet', () => {
      // Set up source packet
      srcPacket.streamIndex = 2;
      srcPacket.pts = 2000n;
      srcPacket.dts = 1900n;
      srcPacket.duration = 50n;
      srcPacket.pos = 10000n;
      srcPacket.flags = AV_PKT_FLAG_KEY;

      // Clone it
      const cloned = srcPacket.clone();
      assert.ok(cloned);

      // Properties should be copied
      assert.equal(cloned.streamIndex, srcPacket.streamIndex);
      assert.equal(cloned.pts, srcPacket.pts);
      assert.equal(cloned.dts, srcPacket.dts);
      assert.equal(cloned.duration, srcPacket.duration);
      assert.equal(cloned.pos, srcPacket.pos);
      assert.equal(cloned.flags, srcPacket.flags);

      // Clean up
      cloned.free();
    });

    it('should unreference a packet', () => {
      // Set up packet with data
      packet.streamIndex = 3;
      packet.pts = 3000n;
      packet.dts = 2900n;
      packet.flags = AV_PKT_FLAG_KEY;

      // Unreference should clear data but keep some properties
      packet.unref();

      // Size should be 0 after unref
      assert.equal(packet.size, 0);
      assert.equal(packet.data, null);
    });

    it('should make packet writable', () => {
      // Set up packet
      packet.streamIndex = 4;
      packet.pts = 4000n;

      // Make writable
      const ret = packet.makeWritable();
      assert.ok(ret >= 0);

      // Packet should still have same properties
      assert.equal(packet.streamIndex, 4);
      assert.equal(packet.pts, 4000n);
    });
  });

  describe('Data Operations', () => {
    beforeEach(() => {
      packet.alloc();
    });

    it('should handle null data correctly', () => {
      // Initially packet has no data
      assert.equal(packet.data, null);
      assert.equal(packet.size, 0);
    });

    it('should handle data property correctly', () => {
      // Without actual data, both data and size should be null/0
      assert.equal(packet.data, null);
      assert.equal(packet.size, 0);
      // Note: Actual data is set during demuxing/encoding operations
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      packet.alloc();
    });

    it('should handle invalid ref operation', () => {
      const invalidPacket = new Packet();
      // Don't allocate invalidPacket

      // Try to ref from unallocated packet - should throw error
      assert.throws(
        () => {
          packet.ref(invalidPacket);
        },
        {
          name: 'TypeError',
          message: 'Invalid source packet',
        },
      );
    });

    it('should handle operations on unallocated packet', () => {
      const unallocated = new Packet();

      // These should not crash - unallocated packets have default values
      assert.equal(unallocated.streamIndex, -1); // Default is -1 for unallocated
      assert.equal(unallocated.pts, AV_NOPTS_VALUE);
      assert.equal(unallocated.dts, AV_NOPTS_VALUE);
      assert.equal(unallocated.size, 0);
      assert.equal(unallocated.data, null);
    });
  });

  describe('Timestamp Operations', () => {
    beforeEach(() => {
      packet.alloc();
    });

    it('should handle timestamp ordering', () => {
      // PTS should be >= DTS
      packet.dts = 1000n;
      packet.pts = 1500n;

      assert.ok(packet.pts >= packet.dts);

      // Equal is also valid
      packet.pts = 2000n;
      packet.dts = 2000n;
      assert.equal(packet.pts, packet.dts);
    });

    it('should handle NOPTS values', () => {
      packet.pts = AV_NOPTS_VALUE;
      packet.dts = AV_NOPTS_VALUE;

      assert.equal(packet.pts, AV_NOPTS_VALUE);
      assert.equal(packet.dts, AV_NOPTS_VALUE);

      // Can still set other properties
      packet.streamIndex = 1;
      packet.duration = 100n;
      assert.equal(packet.streamIndex, 1);
      assert.equal(packet.duration, 100n);
    });

    it('should rescale timestamps', () => {
      // Set initial timestamps with timebase 1/1000 (milliseconds)
      packet.pts = 1000n;
      packet.dts = 900n;
      packet.duration = 40n;

      const srcTimeBase = new Rational(1, 1000); // 1ms units
      const dstTimeBase = new Rational(1, 90000); // 90kHz (common for video)

      // Rescale from 1/1000 to 1/90000
      packet.rescaleTs(srcTimeBase, dstTimeBase);

      // 1000ms * 90000/1000 = 90000
      assert.equal(packet.pts, 90000n);
      // 900ms * 90000/1000 = 81000
      assert.equal(packet.dts, 81000n);
      // 40ms * 90000/1000 = 3600
      assert.equal(packet.duration, 3600n);
    });

    it('should rescale timestamps with different timebases', () => {
      // Set timestamps with timebase 1/25 (25fps)
      packet.pts = 100n;
      packet.dts = 99n;
      packet.duration = 1n;

      const srcTimeBase = new Rational(1, 25); // 25fps
      const dstTimeBase = new Rational(1, 1000); // milliseconds

      // Rescale from 1/25 to 1/1000
      packet.rescaleTs(srcTimeBase, dstTimeBase);

      // 100 * (1/25) * 1000 = 4000ms
      assert.equal(packet.pts, 4000n);
      // 99 * (1/25) * 1000 = 3960ms
      assert.equal(packet.dts, 3960n);
      // 1 * (1/25) * 1000 = 40ms
      assert.equal(packet.duration, 40n);
    });

    it('should handle NOPTS value in rescaleTs', () => {
      packet.pts = AV_NOPTS_VALUE;
      packet.dts = 1000n;
      packet.duration = AV_NOPTS_VALUE;

      const srcTimeBase = new Rational(1, 1000);
      const dstTimeBase = new Rational(1, 90000);

      packet.rescaleTs(srcTimeBase, dstTimeBase);

      // NOPTS values should remain NOPTS
      assert.equal(packet.pts, AV_NOPTS_VALUE);
      assert.equal(packet.duration, AV_NOPTS_VALUE);
      // Regular values should be rescaled
      assert.equal(packet.dts, 90000n);
    });
  });

  describe('Side Data', () => {
    beforeEach(() => {
      packet.alloc();
    });

    it('should get null for non-existent side data', () => {
      const data = packet.getSideData(AV_PKT_DATA_PALETTE);
      assert.equal(data, null);
    });

    it('should add and retrieve side data', () => {
      const testData = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const ret = packet.addSideData(AV_PKT_DATA_NEW_EXTRADATA, testData);
      assert.equal(ret, 0, 'Should successfully add side data');

      const retrieved = packet.getSideData(AV_PKT_DATA_NEW_EXTRADATA);
      assert.ok(retrieved, 'Should retrieve side data');
      assert.ok(Buffer.isBuffer(retrieved), 'Should be a Buffer');
      assert.deepEqual(retrieved, testData, 'Should match original data');
    });

    it('should allocate new side data', () => {
      const size = 256;
      const buffer = packet.newSideData(AV_PKT_DATA_STRINGS_METADATA, size);

      assert.ok(buffer, 'Should allocate side data buffer');
      assert.ok(Buffer.isBuffer(buffer), 'Should be a Buffer');
      assert.equal(buffer.length, size, 'Should have correct size');

      // Write some data to the buffer
      const testString = 'key=value';
      buffer.write(testString, 0, 'utf8');

      // Retrieve and verify
      const retrieved = packet.getSideData(AV_PKT_DATA_STRINGS_METADATA);
      assert.ok(retrieved, 'Should retrieve side data');
      const readString = retrieved.toString('utf8', 0, testString.length);
      assert.equal(readString, testString, 'Should contain written data');
    });

    it('should free all side data', () => {
      // Add some side data
      const testData = Buffer.from([0x01, 0x02, 0x03]);
      packet.addSideData(AV_PKT_DATA_PALETTE, testData);

      // Verify it exists
      let data = packet.getSideData(AV_PKT_DATA_PALETTE);
      assert.ok(data, 'Should have side data before freeing');

      // Free all side data
      packet.freeSideData();

      // Verify it's gone
      data = packet.getSideData(AV_PKT_DATA_PALETTE);
      assert.equal(data, null, 'Should have no side data after freeing');
    });

    it('should handle multiple side data types', () => {
      const paletteData = Buffer.from([0xff, 0x00, 0x00]);
      const extraData = Buffer.from([0x00, 0xff, 0x00]);

      packet.addSideData(AV_PKT_DATA_PALETTE, paletteData);
      packet.addSideData(AV_PKT_DATA_NEW_EXTRADATA, extraData);

      const palette = packet.getSideData(AV_PKT_DATA_PALETTE);
      const extra = packet.getSideData(AV_PKT_DATA_NEW_EXTRADATA);

      assert.ok(palette, 'Should have palette data');
      assert.ok(extra, 'Should have extra data');
      assert.deepEqual(palette, paletteData, 'Palette data should match');
      assert.deepEqual(extra, extraData, 'Extra data should match');
    });
  });

  describe('Flag Operations', () => {
    beforeEach(() => {
      packet.alloc();
    });

    it('should set single flag using setFlags', () => {
      packet.flags = AVFLAG_NONE;
      assert.equal(packet.flags, AVFLAG_NONE);

      packet.setFlags(AV_PKT_FLAG_KEY);
      assert.equal(packet.flags, AV_PKT_FLAG_KEY);
      assert.equal(packet.isKeyframe, true);
    });

    it('should set multiple flags using setFlags', () => {
      packet.flags = AVFLAG_NONE;
      assert.equal(packet.flags, AVFLAG_NONE);

      packet.setFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_CORRUPT);
      assert.equal(packet.flags, AV_PKT_FLAG_KEY | AV_PKT_FLAG_CORRUPT);
      assert.equal(packet.isKeyframe, true);
    });

    it('should clear single flag using clearFlags', () => {
      packet.setFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_CORRUPT);
      assert.equal(packet.flags, AV_PKT_FLAG_KEY | AV_PKT_FLAG_CORRUPT);

      packet.clearFlags(AV_PKT_FLAG_CORRUPT);
      assert.equal(packet.flags, AV_PKT_FLAG_KEY);
      assert.equal(packet.isKeyframe, true);
    });

    it('should clear multiple flags using clearFlags', () => {
      packet.setFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_CORRUPT, AV_PKT_FLAG_DISCARD);
      assert.equal(packet.flags, AV_PKT_FLAG_KEY | AV_PKT_FLAG_CORRUPT | AV_PKT_FLAG_DISCARD);

      packet.clearFlags(AV_PKT_FLAG_CORRUPT, AV_PKT_FLAG_DISCARD);
      assert.equal(packet.flags, AV_PKT_FLAG_KEY);
      assert.equal(packet.isKeyframe, true);
    });

    it('should preserve existing flags when setting new flags', () => {
      packet.setFlags(AV_PKT_FLAG_KEY);
      assert.equal(packet.flags, AV_PKT_FLAG_KEY);

      packet.setFlags(AV_PKT_FLAG_DISCARD);
      assert.equal(packet.flags, AV_PKT_FLAG_KEY | AV_PKT_FLAG_DISCARD);
    });

    it('should support direct flag assignment (backward compatibility)', () => {
      packet.flags = (AV_PKT_FLAG_KEY | AV_PKT_FLAG_CORRUPT) as AVPacketFlag;
      assert.equal(packet.flags, AV_PKT_FLAG_KEY | AV_PKT_FLAG_CORRUPT);

      packet.flags = AVFLAG_NONE;
      assert.equal(packet.flags, AVFLAG_NONE);
    });

    it('should check for single flag using hasFlags', () => {
      packet.flags = AVFLAG_NONE;
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY), false);

      packet.setFlags(AV_PKT_FLAG_KEY);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY), true);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_CORRUPT), false);

      packet.setFlags(AV_PKT_FLAG_CORRUPT);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY), true);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_CORRUPT), true);
    });

    it('should check for multiple flags using hasFlags', () => {
      packet.flags = AVFLAG_NONE;
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_CORRUPT), false);

      packet.setFlags(AV_PKT_FLAG_KEY);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_CORRUPT), false);

      packet.setFlags(AV_PKT_FLAG_CORRUPT);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_CORRUPT), true);

      packet.setFlags(AV_PKT_FLAG_DISCARD);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_CORRUPT), true);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_CORRUPT, AV_PKT_FLAG_DISCARD), true);
    });

    it('should return false when only some flags are set', () => {
      packet.setFlags(AV_PKT_FLAG_KEY);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY), true);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_CORRUPT), false);
      assert.equal(packet.hasFlags(AV_PKT_FLAG_KEY, AV_PKT_FLAG_DISCARD), false);
    });
  });
});
