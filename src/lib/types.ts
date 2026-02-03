import type { AVChannelOrder } from '../constants/index.js';

/**
 * Rational number (fraction) interface
 * Maps to AVRational in FFmpeg
 */
export interface IRational {
  num: number;
  den: number;
}

/**
 * Video dimension interface
 */
export interface IDimension {
  width: number;
  height: number;
}

/**
 * Audio channel layout description
 * Maps to AVChannelLayout in FFmpeg
 */
export interface ChannelLayout {
  nbChannels: number;
  order: AVChannelOrder;
  mask: bigint;
}

/**
 * DTS prediction state.
 */
export interface DtsPredictState {
  sawFirstTs: boolean;
  dts: bigint;
  nextDts: bigint;
  firstDts: bigint;
}
