/**
 * FFmpeg Channel Layout Constants
 * Auto-generated from FFmpeg headers
 * DO NOT EDIT MANUALLY
 */

import { AV_CHANNEL_ORDER_NATIVE } from './constants.js';

import type { ChannelLayout } from '../lib/types.js';

// Channel masks (for legacy API)
export const AV_CH_FRONT_LEFT = 0x1n;
export const AV_CH_FRONT_RIGHT = 0x2n;
export const AV_CH_FRONT_CENTER = 0x4n;
export const AV_CH_LOW_FREQUENCY = 0x8n;
export const AV_CH_BACK_LEFT = 0x10n;
export const AV_CH_BACK_RIGHT = 0x20n;
export const AV_CH_FRONT_LEFT_OF_CENTER = 0x40n;
export const AV_CH_FRONT_RIGHT_OF_CENTER = 0x80n;
export const AV_CH_BACK_CENTER = 0x100n;
export const AV_CH_SIDE_LEFT = 0x200n;
export const AV_CH_SIDE_RIGHT = 0x400n;

// Channel layout bitmasks
export const AV_CH_LAYOUT_MONO = 0x4n;
export const AV_CH_LAYOUT_STEREO = 0x3n;
export const AV_CH_LAYOUT_2POINT1 = 0xbn;
export const AV_CH_LAYOUT_SURROUND = 0x7n;
export const AV_CH_LAYOUT_3POINT1 = 0xfn;
export const AV_CH_LAYOUT_4POINT0 = 0x107n;
export const AV_CH_LAYOUT_4POINT1 = 0x10fn;
export const AV_CH_LAYOUT_QUAD = 0x33n;
export const AV_CH_LAYOUT_5POINT0 = 0x607n;
export const AV_CH_LAYOUT_5POINT1 = 0x60fn;
export const AV_CH_LAYOUT_5POINT0_BACK = 0x37n;
export const AV_CH_LAYOUT_5POINT1_BACK = 0x3fn;
export const AV_CH_LAYOUT_6POINT0 = 0x707n;
export const AV_CH_LAYOUT_6POINT0_FRONT = 0x6c3n;
export const AV_CH_LAYOUT_6POINT1 = 0x70fn;
export const AV_CH_LAYOUT_7POINT0 = 0x637n;
export const AV_CH_LAYOUT_7POINT1 = 0x63fn;
export const AV_CH_LAYOUT_OCTAGONAL = 0x737n;

// Modern AVChannelLayout structures as ChannelLayout objects
export const AV_CHANNEL_LAYOUT_MONO: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 1, mask: AV_CH_LAYOUT_MONO };
export const AV_CHANNEL_LAYOUT_STEREO: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 2, mask: AV_CH_LAYOUT_STEREO };
export const AV_CHANNEL_LAYOUT_2POINT1: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 3, mask: AV_CH_LAYOUT_2POINT1 };
export const AV_CHANNEL_LAYOUT_SURROUND: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 3, mask: AV_CH_LAYOUT_SURROUND };
export const AV_CHANNEL_LAYOUT_3POINT1: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 4, mask: AV_CH_LAYOUT_3POINT1 };
export const AV_CHANNEL_LAYOUT_4POINT0: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 4, mask: AV_CH_LAYOUT_4POINT0 };
export const AV_CHANNEL_LAYOUT_4POINT1: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 5, mask: AV_CH_LAYOUT_4POINT1 };
export const AV_CHANNEL_LAYOUT_QUAD: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 4, mask: AV_CH_LAYOUT_QUAD };
export const AV_CHANNEL_LAYOUT_5POINT0: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 5, mask: AV_CH_LAYOUT_5POINT0 };
export const AV_CHANNEL_LAYOUT_5POINT1: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 6, mask: AV_CH_LAYOUT_5POINT1 };
export const AV_CHANNEL_LAYOUT_5POINT0_BACK: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 5, mask: AV_CH_LAYOUT_5POINT0_BACK };
export const AV_CHANNEL_LAYOUT_5POINT1_BACK: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 6, mask: AV_CH_LAYOUT_5POINT1_BACK };
export const AV_CHANNEL_LAYOUT_6POINT0: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 6, mask: AV_CH_LAYOUT_6POINT0 };
export const AV_CHANNEL_LAYOUT_6POINT0_FRONT: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 6, mask: AV_CH_LAYOUT_6POINT0_FRONT };
export const AV_CHANNEL_LAYOUT_6POINT1: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 7, mask: AV_CH_LAYOUT_6POINT1 };
export const AV_CHANNEL_LAYOUT_7POINT0: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 7, mask: AV_CH_LAYOUT_7POINT0 };
export const AV_CHANNEL_LAYOUT_7POINT1: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 8, mask: AV_CH_LAYOUT_7POINT1 };
export const AV_CHANNEL_LAYOUT_OCTAGONAL: ChannelLayout = { order: AV_CHANNEL_ORDER_NATIVE, nbChannels: 8, mask: AV_CH_LAYOUT_OCTAGONAL };
