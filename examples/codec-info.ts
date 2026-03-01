/**
 * Codec Info: Show codec string and decoder configuration record from a media source.
 *
 * Displays WebCodecs-compatible codec strings and decoder configuration records
 * for all streams in a media source.
 *
 * Usage: tsx examples/codec-info.ts <input>
 *
 * Examples:
 *   tsx examples/codec-info.ts rtsp://admin:pass@192.168.1.100/stream
 *   tsx examples/codec-info.ts testdata/video.mp4
 */

import { Demuxer } from '../src/api/demuxer.js';
import { Codec } from '../src/lib/codec.js';

const input = process.argv[2];
if (!input) {
  console.error('Usage: tsx examples/codec-info.ts <input>');
  process.exit(1);
}

function hexDump(buffer: Buffer): string {
  const lines: string[] = [];
  for (let i = 0; i < buffer.length; i += 16) {
    const slice = buffer.subarray(i, Math.min(i + 16, buffer.length));
    const hex = Array.from(slice)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    const ascii = Array.from(slice)
      .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push(`  ${i.toString(16).padStart(6, '0')}  ${hex.padEnd(48)}  ${ascii}`);
  }
  return lines.join('\n');
}

console.log(`\nOpening: ${input}\n`);

const isRtsp = input.toLowerCase().startsWith('rtsp');

await using media = await Demuxer.open(input, {
  options: {
    rtsp_transport: isRtsp ? 'tcp' : undefined,
    timeout: isRtsp ? 10000000 : undefined,
  },
});

for (const stream of media.streams) {
  const codecpar = stream.codecpar;
  const codec = Codec.findDecoder(codecpar.codecId);
  const codecName = codec?.name ?? 'unknown';
  const typeName = codecpar.codecType === 0 ? 'Video' : codecpar.codecType === 1 ? 'Audio' : 'Other';

  console.log(`--- Stream #${stream.index} (${typeName}) ---`);
  console.log(`  Codec: ${codecName} (id=${codecpar.codecId})`);

  if (codecpar.codecType === 0) {
    let w = codecpar.width;
    let h = codecpar.height;

    // Parse extradata if dimensions are missing (common with low probesize on RTSP)
    if ((w === 0 || h === 0) && codecpar.extradata) {
      codecpar.parseExtradata();
      w = codecpar.width;
      h = codecpar.height;
    }

    console.log(`  Resolution: ${w}x${h}`);
    console.log(`  Pixel Format: ${codecpar.format}`);
  } else if (codecpar.codecType === 1) {
    console.log(`  Sample Rate: ${codecpar.sampleRate}`);
    console.log(`  Channels: ${codecpar.channels}`);
    console.log(`  Sample Format: ${codecpar.format}`);
  }

  // Codec String
  const codecString = codecpar.getCodecString();
  if (codecString) {
    console.log(`  Codec String: ${codecString}`);
  } else {
    console.log('  Codec String: (not available)');
  }

  // Decoder Configuration Record
  const dcr = codecpar.getDecoderConfigurationRecord();
  if (dcr) {
    console.log(`  Decoder Configuration Record (${dcr.length} bytes):`);
    console.log(hexDump(dcr));
  } else {
    console.log('  Decoder Configuration Record: (none)');
  }

  console.log('');
}
