import type { Frame } from '../lib/frame.js';

/**
 * Pre-composited frame sources for the streaming classes (`RTPStream`,
 * `WebRTCStream`, {@link FMP4Stream}).
 *
 * Use this instead of a URL/`Demuxer` to stream already-decoded/filtered frames
 * (e.g. a picture-in-picture composite from `FilterComplexAPI`). Provide a
 * `video` and/or `audio` async iterable of frames; each is encoded and sent to
 * the output. There is no input codec, so the frames are always encoded (no
 * passthrough).
 */
export interface MediaFrameSource {
  /** Video frame source (encoded to the class's video target codec). */
  video?: AsyncIterable<Frame | null>;
  /** Audio frame source (encoded to the class's audio target codec). */
  audio?: AsyncIterable<Frame | null>;
}
