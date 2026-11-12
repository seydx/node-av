import { AV_CODEC_ID_OPUS } from '../../constants/constants.js';
import { FF_DECODER_LIBOPUS } from '../../constants/decoders.js';
import { Codec } from '../../lib/codec.js';
import { Decoder } from '../decoder.js';

import type { Stream } from '../../lib/stream.js';
import type { DecoderOptions } from '../decoder.js';

/**
 * Open the audio decoder of a transcode.
 *
 * Opus is decoded with libopus when the build has it. FFmpeg's own Opus decoder
 * loses sync on in-band FEC (LBRR) frames and turns the rest of the packet into
 * loud noise without reporting an error. Cameras that send SILK with FEC, such as
 * Ring, crackle through it.
 *
 * @param stream - The audio stream
 *
 * @param options - Decoder options
 *
 * @returns The decoder
 *
 * @internal
 */
export async function openAudioDecoder(stream: Stream, options: DecoderOptions): Promise<Decoder> {
  if (stream.codecpar.codecId === AV_CODEC_ID_OPUS && Codec.findDecoderByName(FF_DECODER_LIBOPUS)) {
    return await Decoder.create(stream, FF_DECODER_LIBOPUS, options);
  }
  return await Decoder.create(stream, options);
}
