/**
 * High-Level API Example: context / graph bags + configure hooks
 *
 * Two consistent ways to set anything on the underlying native object, without a
 * dedicated option per field:
 *
 *   - `context` (Encoder/Decoder/Muxer) / `graph` (filters) — a typed,
 *     declarative bag of writable fields. Rate control still accepts '5M'/'128k'
 *     strings.
 *   - `configure(ctx | graph | fmt)` — the imperative escape for what the bag
 *     can't express: flags via `setFlags`, methods, or setter-only forms like a
 *     'hvc1' FourCC string.
 *
 * Here we transcode the video to HEVC/MP4 and tag it `hvc1` so QuickTime / Apple
 * players accept it (the FFmpeg CLI `-tag:v hvc1`), then label the output stream.
 *
 * Usage:
 *   tsx examples/api-context-options.ts                          # testdata/video.mp4
 *   tsx examples/api-context-options.ts testdata/bbb-4k-h264.mp4
 */

import { Decoder, Demuxer, Dictionary, Encoder, FF_ENCODER_LIBX265, Muxer, pipeline } from '../src/index.js';
import { getInputFile, getOutputFile, prepareTestEnvironment } from './index.js';

prepareTestEnvironment();

const inputPath = process.argv[2] ?? getInputFile('video.mp4');

async function main() {
  const outputPath = getOutputFile('api-context-options.mp4');
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}\n`);

  await using input = await Demuxer.open(inputPath);
  const videoStream = input.video();
  if (!videoStream) {
    throw new Error('No video stream in input');
  }

  using decoder = await Decoder.create(videoStream);

  // `context` bag: declarative, typed codec-context fields (no dedicated option
  // needed for each). `configure`: the escape hatch — set the codec tag via its
  // string form so MP4 HEVC plays in QuickTime / Apple players.
  using encoder = await Encoder.create(FF_ENCODER_LIBX265, {
    decoder,
    context: { bitRate: '2M', gopSize: 60 },
    configure: (ctx) => {
      ctx.codecTag = 'hvc1'; // -tag:v hvc1
    },
  });

  // Muxer `configure` runs after the source metadata is copied and before the
  // header is written, so per-stream settings here take precedence.
  await using output = await Muxer.open(outputPath, {
    configure: (fmt) => {
      const video = fmt.streams[0];
      if (video) {
        video.metadata = Dictionary.fromObject({ language: 'eng', title: 'Re-encoded (hvc1)' });
      }
    },
  });

  const control = pipeline(input, decoder, encoder, output);
  await control.completion;
  await output.close();

  // Verify: the output should be HEVC tagged `hvc1`, not the default `hev1`.
  await using check = await Demuxer.open(outputPath);
  const tag = check.video()?.codecpar.codecTagString;
  console.log(`Output video codec tag: ${tag} (expected hvc1)`);
  console.log(tag === 'hvc1' ? 'OK — tagged for QuickTime / Apple playback.' : 'MISMATCH');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
