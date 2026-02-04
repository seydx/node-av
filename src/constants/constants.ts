/**
 * Auto-generated FFmpeg constants
 * Generated from FFmpeg headers
 * DO NOT EDIT MANUALLY
 */

import type { IRational } from '../lib/types.js';

// Brand symbol for type safety
const __ffmpeg_brand = Symbol('__ffmpeg_brand');

export const EOF = undefined; // End of File signal
export type EOFSignal = typeof EOF;

// Media types
export type AVMediaType = number & { readonly [__ffmpeg_brand]: 'AVMediaType' };

export const AVMEDIA_TYPE_UNKNOWN = -1 as AVMediaType;
export const AVMEDIA_TYPE_VIDEO = 0 as AVMediaType;
export const AVMEDIA_TYPE_AUDIO = 1 as AVMediaType;
export const AVMEDIA_TYPE_DATA = 2 as AVMediaType;
export const AVMEDIA_TYPE_SUBTITLE = 3 as AVMediaType;
export const AVMEDIA_TYPE_ATTACHMENT = 4 as AVMediaType;
export const AVMEDIA_TYPE_NB = 5 as AVMediaType;

// Standard seek whence constants (from stdio.h)
export type AVSeekWhence = number & { readonly [__ffmpeg_brand]: 'AVSeekWhence' };

export const AVSEEK_SET = 0 as AVSeekWhence; // Seek from beginning of file
export const AVSEEK_CUR = 1 as AVSeekWhence; // Seek from current position
export const AVSEEK_END = 2 as AVSeekWhence; // Seek from end of file
export const AVSEEK_SIZE = 0x10000 as AVSeekWhence; // Get file size without seeking

// Common "no flags" constants for APIs that accept 0 as valid flag value
export const AVFLAG_NONE = 0 as AVSeekFlag &
  AVIOFlag &
  AVFilterFlag &
  AVFilterCmdFlag &
  AVFilterConstants &
  AVCodecFlag2 &
  AVFormatFlag &
  AVDictFlag &
  AVOptionSearchFlags &
  AVPacketFlag &
  AVCodecFlag &
  SWSFlag &
  AVFrameFlag &
  AVFifoFlag &
  AVCodecProp;
// libavcodec/avcodec.h
export type AVCodecConfig = number & { readonly [__ffmpeg_brand]: 'AVCodecConfig' };

export const AV_CODEC_CONFIG_PIX_FORMAT = 0 as AVCodecConfig;
export const AV_CODEC_CONFIG_FRAME_RATE = 1 as AVCodecConfig;
export const AV_CODEC_CONFIG_SAMPLE_RATE = 2 as AVCodecConfig;
export const AV_CODEC_CONFIG_SAMPLE_FORMAT = 3 as AVCodecConfig;
export const AV_CODEC_CONFIG_CHANNEL_LAYOUT = 4 as AVCodecConfig;
export const AV_CODEC_CONFIG_COLOR_RANGE = 5 as AVCodecConfig;
export const AV_CODEC_CONFIG_COLOR_SPACE = 6 as AVCodecConfig;
export const AV_CODEC_CONFIG_ALPHA_MODE = 7 as AVCodecConfig;

// libavcodec/avcodec.h
export type AVPictureStructure = number & { readonly [__ffmpeg_brand]: 'AVPictureStructure' };

export const AV_PICTURE_STRUCTURE_UNKNOWN = 0 as AVPictureStructure;
export const AV_PICTURE_STRUCTURE_TOP_FIELD = 1 as AVPictureStructure;
export const AV_PICTURE_STRUCTURE_BOTTOM_FIELD = 2 as AVPictureStructure;
export const AV_PICTURE_STRUCTURE_FRAME = 3 as AVPictureStructure;

// libavcodec/codec_id.h
export type AVCodecID = number & { readonly [__ffmpeg_brand]: 'AVCodecID' };

export const AV_CODEC_ID_NONE = 0 as AVCodecID;
export const AV_CODEC_ID_MPEG1VIDEO = 1 as AVCodecID;
export const AV_CODEC_ID_MPEG2VIDEO = 2 as AVCodecID;
export const AV_CODEC_ID_H261 = 3 as AVCodecID;
export const AV_CODEC_ID_H263 = 4 as AVCodecID;
export const AV_CODEC_ID_RV10 = 5 as AVCodecID;
export const AV_CODEC_ID_RV20 = 6 as AVCodecID;
export const AV_CODEC_ID_MJPEG = 7 as AVCodecID;
export const AV_CODEC_ID_MJPEGB = 8 as AVCodecID;
export const AV_CODEC_ID_LJPEG = 9 as AVCodecID;
export const AV_CODEC_ID_SP5X = 10 as AVCodecID;
export const AV_CODEC_ID_JPEGLS = 11 as AVCodecID;
export const AV_CODEC_ID_MPEG4 = 12 as AVCodecID;
export const AV_CODEC_ID_RAWVIDEO = 13 as AVCodecID;
export const AV_CODEC_ID_MSMPEG4V1 = 14 as AVCodecID;
export const AV_CODEC_ID_MSMPEG4V2 = 15 as AVCodecID;
export const AV_CODEC_ID_MSMPEG4V3 = 16 as AVCodecID;
export const AV_CODEC_ID_WMV1 = 17 as AVCodecID;
export const AV_CODEC_ID_WMV2 = 18 as AVCodecID;
export const AV_CODEC_ID_H263P = 19 as AVCodecID;
export const AV_CODEC_ID_H263I = 20 as AVCodecID;
export const AV_CODEC_ID_FLV1 = 21 as AVCodecID;
export const AV_CODEC_ID_SVQ1 = 22 as AVCodecID;
export const AV_CODEC_ID_SVQ3 = 23 as AVCodecID;
export const AV_CODEC_ID_DVVIDEO = 24 as AVCodecID;
export const AV_CODEC_ID_HUFFYUV = 25 as AVCodecID;
export const AV_CODEC_ID_CYUV = 26 as AVCodecID;
export const AV_CODEC_ID_H264 = 27 as AVCodecID;
export const AV_CODEC_ID_INDEO3 = 28 as AVCodecID;
export const AV_CODEC_ID_VP3 = 29 as AVCodecID;
export const AV_CODEC_ID_THEORA = 30 as AVCodecID;
export const AV_CODEC_ID_ASV1 = 31 as AVCodecID;
export const AV_CODEC_ID_ASV2 = 32 as AVCodecID;
export const AV_CODEC_ID_FFV1 = 33 as AVCodecID;
export const AV_CODEC_ID_4XM = 34 as AVCodecID;
export const AV_CODEC_ID_VCR1 = 35 as AVCodecID;
export const AV_CODEC_ID_CLJR = 36 as AVCodecID;
export const AV_CODEC_ID_MDEC = 37 as AVCodecID;
export const AV_CODEC_ID_ROQ = 38 as AVCodecID;
export const AV_CODEC_ID_INTERPLAY_VIDEO = 39 as AVCodecID;
export const AV_CODEC_ID_XAN_WC3 = 40 as AVCodecID;
export const AV_CODEC_ID_XAN_WC4 = 41 as AVCodecID;
export const AV_CODEC_ID_RPZA = 42 as AVCodecID;
export const AV_CODEC_ID_CINEPAK = 43 as AVCodecID;
export const AV_CODEC_ID_WS_VQA = 44 as AVCodecID;
export const AV_CODEC_ID_MSRLE = 45 as AVCodecID;
export const AV_CODEC_ID_MSVIDEO1 = 46 as AVCodecID;
export const AV_CODEC_ID_IDCIN = 47 as AVCodecID;
export const AV_CODEC_ID_8BPS = 48 as AVCodecID;
export const AV_CODEC_ID_SMC = 49 as AVCodecID;
export const AV_CODEC_ID_FLIC = 50 as AVCodecID;
export const AV_CODEC_ID_TRUEMOTION1 = 51 as AVCodecID;
export const AV_CODEC_ID_VMDVIDEO = 52 as AVCodecID;
export const AV_CODEC_ID_MSZH = 53 as AVCodecID;
export const AV_CODEC_ID_ZLIB = 54 as AVCodecID;
export const AV_CODEC_ID_QTRLE = 55 as AVCodecID;
export const AV_CODEC_ID_TSCC = 56 as AVCodecID;
export const AV_CODEC_ID_ULTI = 57 as AVCodecID;
export const AV_CODEC_ID_QDRAW = 58 as AVCodecID;
export const AV_CODEC_ID_VIXL = 59 as AVCodecID;
export const AV_CODEC_ID_QPEG = 60 as AVCodecID;
export const AV_CODEC_ID_PNG = 61 as AVCodecID;
export const AV_CODEC_ID_PPM = 62 as AVCodecID;
export const AV_CODEC_ID_PBM = 63 as AVCodecID;
export const AV_CODEC_ID_PGM = 64 as AVCodecID;
export const AV_CODEC_ID_PGMYUV = 65 as AVCodecID;
export const AV_CODEC_ID_PAM = 66 as AVCodecID;
export const AV_CODEC_ID_FFVHUFF = 67 as AVCodecID;
export const AV_CODEC_ID_RV30 = 68 as AVCodecID;
export const AV_CODEC_ID_RV40 = 69 as AVCodecID;
export const AV_CODEC_ID_VC1 = 70 as AVCodecID;
export const AV_CODEC_ID_WMV3 = 71 as AVCodecID;
export const AV_CODEC_ID_LOCO = 72 as AVCodecID;
export const AV_CODEC_ID_WNV1 = 73 as AVCodecID;
export const AV_CODEC_ID_AASC = 74 as AVCodecID;
export const AV_CODEC_ID_INDEO2 = 75 as AVCodecID;
export const AV_CODEC_ID_FRAPS = 76 as AVCodecID;
export const AV_CODEC_ID_TRUEMOTION2 = 77 as AVCodecID;
export const AV_CODEC_ID_BMP = 78 as AVCodecID;
export const AV_CODEC_ID_CSCD = 79 as AVCodecID;
export const AV_CODEC_ID_MMVIDEO = 80 as AVCodecID;
export const AV_CODEC_ID_ZMBV = 81 as AVCodecID;
export const AV_CODEC_ID_AVS = 82 as AVCodecID;
export const AV_CODEC_ID_SMACKVIDEO = 83 as AVCodecID;
export const AV_CODEC_ID_NUV = 84 as AVCodecID;
export const AV_CODEC_ID_KMVC = 85 as AVCodecID;
export const AV_CODEC_ID_FLASHSV = 86 as AVCodecID;
export const AV_CODEC_ID_CAVS = 87 as AVCodecID;
export const AV_CODEC_ID_JPEG2000 = 88 as AVCodecID;
export const AV_CODEC_ID_VMNC = 89 as AVCodecID;
export const AV_CODEC_ID_VP5 = 90 as AVCodecID;
export const AV_CODEC_ID_VP6 = 91 as AVCodecID;
export const AV_CODEC_ID_VP6F = 92 as AVCodecID;
export const AV_CODEC_ID_TARGA = 93 as AVCodecID;
export const AV_CODEC_ID_DSICINVIDEO = 94 as AVCodecID;
export const AV_CODEC_ID_TIERTEXSEQVIDEO = 95 as AVCodecID;
export const AV_CODEC_ID_TIFF = 96 as AVCodecID;
export const AV_CODEC_ID_GIF = 97 as AVCodecID;
export const AV_CODEC_ID_DXA = 98 as AVCodecID;
export const AV_CODEC_ID_DNXHD = 99 as AVCodecID;
export const AV_CODEC_ID_THP = 100 as AVCodecID;
export const AV_CODEC_ID_SGI = 101 as AVCodecID;
export const AV_CODEC_ID_C93 = 102 as AVCodecID;
export const AV_CODEC_ID_BETHSOFTVID = 103 as AVCodecID;
export const AV_CODEC_ID_PTX = 104 as AVCodecID;
export const AV_CODEC_ID_TXD = 105 as AVCodecID;
export const AV_CODEC_ID_VP6A = 106 as AVCodecID;
export const AV_CODEC_ID_AMV = 107 as AVCodecID;
export const AV_CODEC_ID_VB = 108 as AVCodecID;
export const AV_CODEC_ID_PCX = 109 as AVCodecID;
export const AV_CODEC_ID_SUNRAST = 110 as AVCodecID;
export const AV_CODEC_ID_INDEO4 = 111 as AVCodecID;
export const AV_CODEC_ID_INDEO5 = 112 as AVCodecID;
export const AV_CODEC_ID_MIMIC = 113 as AVCodecID;
export const AV_CODEC_ID_RL2 = 114 as AVCodecID;
export const AV_CODEC_ID_ESCAPE124 = 115 as AVCodecID;
export const AV_CODEC_ID_DIRAC = 116 as AVCodecID;
export const AV_CODEC_ID_BFI = 117 as AVCodecID;
export const AV_CODEC_ID_CMV = 118 as AVCodecID;
export const AV_CODEC_ID_MOTIONPIXELS = 119 as AVCodecID;
export const AV_CODEC_ID_TGV = 120 as AVCodecID;
export const AV_CODEC_ID_TGQ = 121 as AVCodecID;
export const AV_CODEC_ID_TQI = 122 as AVCodecID;
export const AV_CODEC_ID_AURA = 123 as AVCodecID;
export const AV_CODEC_ID_AURA2 = 124 as AVCodecID;
export const AV_CODEC_ID_V210X = 125 as AVCodecID;
export const AV_CODEC_ID_TMV = 126 as AVCodecID;
export const AV_CODEC_ID_V210 = 127 as AVCodecID;
export const AV_CODEC_ID_DPX = 128 as AVCodecID;
export const AV_CODEC_ID_MAD = 129 as AVCodecID;
export const AV_CODEC_ID_FRWU = 130 as AVCodecID;
export const AV_CODEC_ID_FLASHSV2 = 131 as AVCodecID;
export const AV_CODEC_ID_CDGRAPHICS = 132 as AVCodecID;
export const AV_CODEC_ID_R210 = 133 as AVCodecID;
export const AV_CODEC_ID_ANM = 134 as AVCodecID;
export const AV_CODEC_ID_BINKVIDEO = 135 as AVCodecID;
export const AV_CODEC_ID_IFF_ILBM = 136 as AVCodecID;
export const AV_CODEC_ID_KGV1 = 137 as AVCodecID;
export const AV_CODEC_ID_YOP = 138 as AVCodecID;
export const AV_CODEC_ID_VP8 = 139 as AVCodecID;
export const AV_CODEC_ID_PICTOR = 140 as AVCodecID;
export const AV_CODEC_ID_ANSI = 141 as AVCodecID;
export const AV_CODEC_ID_A64_MULTI = 142 as AVCodecID;
export const AV_CODEC_ID_A64_MULTI5 = 143 as AVCodecID;
export const AV_CODEC_ID_R10K = 144 as AVCodecID;
export const AV_CODEC_ID_MXPEG = 145 as AVCodecID;
export const AV_CODEC_ID_LAGARITH = 146 as AVCodecID;
export const AV_CODEC_ID_PRORES = 147 as AVCodecID;
export const AV_CODEC_ID_JV = 148 as AVCodecID;
export const AV_CODEC_ID_DFA = 149 as AVCodecID;
export const AV_CODEC_ID_WMV3IMAGE = 150 as AVCodecID;
export const AV_CODEC_ID_VC1IMAGE = 151 as AVCodecID;
export const AV_CODEC_ID_UTVIDEO = 152 as AVCodecID;
export const AV_CODEC_ID_BMV_VIDEO = 153 as AVCodecID;
export const AV_CODEC_ID_VBLE = 154 as AVCodecID;
export const AV_CODEC_ID_DXTORY = 155 as AVCodecID;
export const AV_CODEC_ID_V410 = 156 as AVCodecID;
export const AV_CODEC_ID_XWD = 157 as AVCodecID;
export const AV_CODEC_ID_CDXL = 158 as AVCodecID;
export const AV_CODEC_ID_XBM = 159 as AVCodecID;
export const AV_CODEC_ID_ZEROCODEC = 160 as AVCodecID;
export const AV_CODEC_ID_MSS1 = 161 as AVCodecID;
export const AV_CODEC_ID_MSA1 = 162 as AVCodecID;
export const AV_CODEC_ID_TSCC2 = 163 as AVCodecID;
export const AV_CODEC_ID_MTS2 = 164 as AVCodecID;
export const AV_CODEC_ID_CLLC = 165 as AVCodecID;
export const AV_CODEC_ID_MSS2 = 166 as AVCodecID;
export const AV_CODEC_ID_VP9 = 167 as AVCodecID;
export const AV_CODEC_ID_AIC = 168 as AVCodecID;
export const AV_CODEC_ID_ESCAPE130 = 169 as AVCodecID;
export const AV_CODEC_ID_G2M = 170 as AVCodecID;
export const AV_CODEC_ID_WEBP = 171 as AVCodecID;
export const AV_CODEC_ID_HNM4_VIDEO = 172 as AVCodecID;
export const AV_CODEC_ID_HEVC = 173 as AVCodecID;
export const AV_CODEC_ID_FIC = 174 as AVCodecID;
export const AV_CODEC_ID_ALIAS_PIX = 175 as AVCodecID;
export const AV_CODEC_ID_BRENDER_PIX = 176 as AVCodecID;
export const AV_CODEC_ID_PAF_VIDEO = 177 as AVCodecID;
export const AV_CODEC_ID_EXR = 178 as AVCodecID;
export const AV_CODEC_ID_VP7 = 179 as AVCodecID;
export const AV_CODEC_ID_SANM = 180 as AVCodecID;
export const AV_CODEC_ID_SGIRLE = 181 as AVCodecID;
export const AV_CODEC_ID_MVC1 = 182 as AVCodecID;
export const AV_CODEC_ID_MVC2 = 183 as AVCodecID;
export const AV_CODEC_ID_HQX = 184 as AVCodecID;
export const AV_CODEC_ID_TDSC = 185 as AVCodecID;
export const AV_CODEC_ID_HQ_HQA = 186 as AVCodecID;
export const AV_CODEC_ID_HAP = 187 as AVCodecID;
export const AV_CODEC_ID_DDS = 188 as AVCodecID;
export const AV_CODEC_ID_DXV = 189 as AVCodecID;
export const AV_CODEC_ID_SCREENPRESSO = 190 as AVCodecID;
export const AV_CODEC_ID_RSCC = 191 as AVCodecID;
export const AV_CODEC_ID_AVS2 = 192 as AVCodecID;
export const AV_CODEC_ID_PGX = 193 as AVCodecID;
export const AV_CODEC_ID_AVS3 = 194 as AVCodecID;
export const AV_CODEC_ID_MSP2 = 195 as AVCodecID;
export const AV_CODEC_ID_VVC = 196 as AVCodecID;
export const AV_CODEC_ID_Y41P = 197 as AVCodecID;
export const AV_CODEC_ID_AVRP = 198 as AVCodecID;
export const AV_CODEC_ID_012V = 199 as AVCodecID;
export const AV_CODEC_ID_AVUI = 200 as AVCodecID;
export const AV_CODEC_ID_TARGA_Y216 = 201 as AVCodecID;
export const AV_CODEC_ID_V308 = 202 as AVCodecID;
export const AV_CODEC_ID_V408 = 203 as AVCodecID;
export const AV_CODEC_ID_YUV4 = 204 as AVCodecID;
export const AV_CODEC_ID_AVRN = 205 as AVCodecID;
export const AV_CODEC_ID_CPIA = 206 as AVCodecID;
export const AV_CODEC_ID_XFACE = 207 as AVCodecID;
export const AV_CODEC_ID_SNOW = 208 as AVCodecID;
export const AV_CODEC_ID_SMVJPEG = 209 as AVCodecID;
export const AV_CODEC_ID_APNG = 210 as AVCodecID;
export const AV_CODEC_ID_DAALA = 211 as AVCodecID;
export const AV_CODEC_ID_CFHD = 212 as AVCodecID;
export const AV_CODEC_ID_TRUEMOTION2RT = 213 as AVCodecID;
export const AV_CODEC_ID_M101 = 214 as AVCodecID;
export const AV_CODEC_ID_MAGICYUV = 215 as AVCodecID;
export const AV_CODEC_ID_SHEERVIDEO = 216 as AVCodecID;
export const AV_CODEC_ID_YLC = 217 as AVCodecID;
export const AV_CODEC_ID_PSD = 218 as AVCodecID;
export const AV_CODEC_ID_PIXLET = 219 as AVCodecID;
export const AV_CODEC_ID_SPEEDHQ = 220 as AVCodecID;
export const AV_CODEC_ID_FMVC = 221 as AVCodecID;
export const AV_CODEC_ID_SCPR = 222 as AVCodecID;
export const AV_CODEC_ID_CLEARVIDEO = 223 as AVCodecID;
export const AV_CODEC_ID_XPM = 224 as AVCodecID;
export const AV_CODEC_ID_AV1 = 225 as AVCodecID;
export const AV_CODEC_ID_BITPACKED = 226 as AVCodecID;
export const AV_CODEC_ID_MSCC = 227 as AVCodecID;
export const AV_CODEC_ID_SRGC = 228 as AVCodecID;
export const AV_CODEC_ID_SVG = 229 as AVCodecID;
export const AV_CODEC_ID_GDV = 230 as AVCodecID;
export const AV_CODEC_ID_FITS = 231 as AVCodecID;
export const AV_CODEC_ID_IMM4 = 232 as AVCodecID;
export const AV_CODEC_ID_PROSUMER = 233 as AVCodecID;
export const AV_CODEC_ID_MWSC = 234 as AVCodecID;
export const AV_CODEC_ID_WCMV = 235 as AVCodecID;
export const AV_CODEC_ID_RASC = 236 as AVCodecID;
export const AV_CODEC_ID_HYMT = 237 as AVCodecID;
export const AV_CODEC_ID_ARBC = 238 as AVCodecID;
export const AV_CODEC_ID_AGM = 239 as AVCodecID;
export const AV_CODEC_ID_LSCR = 240 as AVCodecID;
export const AV_CODEC_ID_VP4 = 241 as AVCodecID;
export const AV_CODEC_ID_IMM5 = 242 as AVCodecID;
export const AV_CODEC_ID_MVDV = 243 as AVCodecID;
export const AV_CODEC_ID_MVHA = 244 as AVCodecID;
export const AV_CODEC_ID_CDTOONS = 245 as AVCodecID;
export const AV_CODEC_ID_MV30 = 246 as AVCodecID;
export const AV_CODEC_ID_NOTCHLC = 247 as AVCodecID;
export const AV_CODEC_ID_PFM = 248 as AVCodecID;
export const AV_CODEC_ID_MOBICLIP = 249 as AVCodecID;
export const AV_CODEC_ID_PHOTOCD = 250 as AVCodecID;
export const AV_CODEC_ID_IPU = 251 as AVCodecID;
export const AV_CODEC_ID_ARGO = 252 as AVCodecID;
export const AV_CODEC_ID_CRI = 253 as AVCodecID;
export const AV_CODEC_ID_SIMBIOSIS_IMX = 254 as AVCodecID;
export const AV_CODEC_ID_SGA_VIDEO = 255 as AVCodecID;
export const AV_CODEC_ID_GEM = 256 as AVCodecID;
export const AV_CODEC_ID_VBN = 257 as AVCodecID;
export const AV_CODEC_ID_JPEGXL = 258 as AVCodecID;
export const AV_CODEC_ID_QOI = 259 as AVCodecID;
export const AV_CODEC_ID_PHM = 260 as AVCodecID;
export const AV_CODEC_ID_RADIANCE_HDR = 261 as AVCodecID;
export const AV_CODEC_ID_WBMP = 262 as AVCodecID;
export const AV_CODEC_ID_MEDIA100 = 263 as AVCodecID;
export const AV_CODEC_ID_VQC = 264 as AVCodecID;
export const AV_CODEC_ID_PDV = 265 as AVCodecID;
export const AV_CODEC_ID_EVC = 266 as AVCodecID;
export const AV_CODEC_ID_RTV1 = 267 as AVCodecID;
export const AV_CODEC_ID_VMIX = 268 as AVCodecID;
export const AV_CODEC_ID_LEAD = 269 as AVCodecID;
export const AV_CODEC_ID_DNXUC = 270 as AVCodecID;
export const AV_CODEC_ID_RV60 = 271 as AVCodecID;
export const AV_CODEC_ID_JPEGXL_ANIM = 272 as AVCodecID;
export const AV_CODEC_ID_APV = 273 as AVCodecID;
export const AV_CODEC_ID_PRORES_RAW = 274 as AVCodecID;
export const AV_CODEC_ID_JPEGXS = 275 as AVCodecID;
export const AV_CODEC_ID_FIRST_AUDIO = 65536 as AVCodecID;
export const AV_CODEC_ID_PCM_S16LE = 65536 as AVCodecID;
export const AV_CODEC_ID_PCM_S16BE = 65537 as AVCodecID;
export const AV_CODEC_ID_PCM_U16LE = 65538 as AVCodecID;
export const AV_CODEC_ID_PCM_U16BE = 65539 as AVCodecID;
export const AV_CODEC_ID_PCM_S8 = 65540 as AVCodecID;
export const AV_CODEC_ID_PCM_U8 = 65541 as AVCodecID;
export const AV_CODEC_ID_PCM_MULAW = 65542 as AVCodecID;
export const AV_CODEC_ID_PCM_ALAW = 65543 as AVCodecID;
export const AV_CODEC_ID_PCM_S32LE = 65544 as AVCodecID;
export const AV_CODEC_ID_PCM_S32BE = 65545 as AVCodecID;
export const AV_CODEC_ID_PCM_U32LE = 65546 as AVCodecID;
export const AV_CODEC_ID_PCM_U32BE = 65547 as AVCodecID;
export const AV_CODEC_ID_PCM_S24LE = 65548 as AVCodecID;
export const AV_CODEC_ID_PCM_S24BE = 65549 as AVCodecID;
export const AV_CODEC_ID_PCM_U24LE = 65550 as AVCodecID;
export const AV_CODEC_ID_PCM_U24BE = 65551 as AVCodecID;
export const AV_CODEC_ID_PCM_S24DAUD = 65552 as AVCodecID;
export const AV_CODEC_ID_PCM_ZORK = 65553 as AVCodecID;
export const AV_CODEC_ID_PCM_S16LE_PLANAR = 65554 as AVCodecID;
export const AV_CODEC_ID_PCM_DVD = 65555 as AVCodecID;
export const AV_CODEC_ID_PCM_F32BE = 65556 as AVCodecID;
export const AV_CODEC_ID_PCM_F32LE = 65557 as AVCodecID;
export const AV_CODEC_ID_PCM_F64BE = 65558 as AVCodecID;
export const AV_CODEC_ID_PCM_F64LE = 65559 as AVCodecID;
export const AV_CODEC_ID_PCM_BLURAY = 65560 as AVCodecID;
export const AV_CODEC_ID_PCM_LXF = 65561 as AVCodecID;
export const AV_CODEC_ID_S302M = 65562 as AVCodecID;
export const AV_CODEC_ID_PCM_S8_PLANAR = 65563 as AVCodecID;
export const AV_CODEC_ID_PCM_S24LE_PLANAR = 65564 as AVCodecID;
export const AV_CODEC_ID_PCM_S32LE_PLANAR = 65565 as AVCodecID;
export const AV_CODEC_ID_PCM_S16BE_PLANAR = 65566 as AVCodecID;
export const AV_CODEC_ID_PCM_S64LE = 65567 as AVCodecID;
export const AV_CODEC_ID_PCM_S64BE = 65568 as AVCodecID;
export const AV_CODEC_ID_PCM_F16LE = 65569 as AVCodecID;
export const AV_CODEC_ID_PCM_F24LE = 65570 as AVCodecID;
export const AV_CODEC_ID_PCM_VIDC = 65571 as AVCodecID;
export const AV_CODEC_ID_PCM_SGA = 65572 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_QT = 69632 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_WAV = 69633 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_DK3 = 69634 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_DK4 = 69635 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_WS = 69636 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_SMJPEG = 69637 as AVCodecID;
export const AV_CODEC_ID_ADPCM_MS = 69638 as AVCodecID;
export const AV_CODEC_ID_ADPCM_4XM = 69639 as AVCodecID;
export const AV_CODEC_ID_ADPCM_XA = 69640 as AVCodecID;
export const AV_CODEC_ID_ADPCM_ADX = 69641 as AVCodecID;
export const AV_CODEC_ID_ADPCM_EA = 69642 as AVCodecID;
export const AV_CODEC_ID_ADPCM_G726 = 69643 as AVCodecID;
export const AV_CODEC_ID_ADPCM_CT = 69644 as AVCodecID;
export const AV_CODEC_ID_ADPCM_SWF = 69645 as AVCodecID;
export const AV_CODEC_ID_ADPCM_YAMAHA = 69646 as AVCodecID;
export const AV_CODEC_ID_ADPCM_SBPRO_4 = 69647 as AVCodecID;
export const AV_CODEC_ID_ADPCM_SBPRO_3 = 69648 as AVCodecID;
export const AV_CODEC_ID_ADPCM_SBPRO_2 = 69649 as AVCodecID;
export const AV_CODEC_ID_ADPCM_THP = 69650 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_AMV = 69651 as AVCodecID;
export const AV_CODEC_ID_ADPCM_EA_R1 = 69652 as AVCodecID;
export const AV_CODEC_ID_ADPCM_EA_R3 = 69653 as AVCodecID;
export const AV_CODEC_ID_ADPCM_EA_R2 = 69654 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_EA_SEAD = 69655 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_EA_EACS = 69656 as AVCodecID;
export const AV_CODEC_ID_ADPCM_EA_XAS = 69657 as AVCodecID;
export const AV_CODEC_ID_ADPCM_EA_MAXIS_XA = 69658 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_ISS = 69659 as AVCodecID;
export const AV_CODEC_ID_ADPCM_G722 = 69660 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_APC = 69661 as AVCodecID;
export const AV_CODEC_ID_ADPCM_VIMA = 69662 as AVCodecID;
export const AV_CODEC_ID_ADPCM_AFC = 69663 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_OKI = 69664 as AVCodecID;
export const AV_CODEC_ID_ADPCM_DTK = 69665 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_RAD = 69666 as AVCodecID;
export const AV_CODEC_ID_ADPCM_G726LE = 69667 as AVCodecID;
export const AV_CODEC_ID_ADPCM_THP_LE = 69668 as AVCodecID;
export const AV_CODEC_ID_ADPCM_PSX = 69669 as AVCodecID;
export const AV_CODEC_ID_ADPCM_AICA = 69670 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_DAT4 = 69671 as AVCodecID;
export const AV_CODEC_ID_ADPCM_MTAF = 69672 as AVCodecID;
export const AV_CODEC_ID_ADPCM_AGM = 69673 as AVCodecID;
export const AV_CODEC_ID_ADPCM_ARGO = 69674 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_SSI = 69675 as AVCodecID;
export const AV_CODEC_ID_ADPCM_ZORK = 69676 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_APM = 69677 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_ALP = 69678 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_MTF = 69679 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_CUNNING = 69680 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_MOFLEX = 69681 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_ACORN = 69682 as AVCodecID;
export const AV_CODEC_ID_ADPCM_XMD = 69683 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_XBOX = 69684 as AVCodecID;
export const AV_CODEC_ID_ADPCM_SANYO = 69685 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_HVQM4 = 69686 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_PDA = 69687 as AVCodecID;
export const AV_CODEC_ID_ADPCM_N64 = 69688 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_HVQM2 = 69689 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_MAGIX = 69690 as AVCodecID;
export const AV_CODEC_ID_ADPCM_PSXC = 69691 as AVCodecID;
export const AV_CODEC_ID_ADPCM_CIRCUS = 69692 as AVCodecID;
export const AV_CODEC_ID_ADPCM_IMA_ESCAPE = 69693 as AVCodecID;
export const AV_CODEC_ID_AMR_NB = 73728 as AVCodecID;
export const AV_CODEC_ID_AMR_WB = 73729 as AVCodecID;
export const AV_CODEC_ID_RA_144 = 77824 as AVCodecID;
export const AV_CODEC_ID_RA_288 = 77825 as AVCodecID;
export const AV_CODEC_ID_ROQ_DPCM = 81920 as AVCodecID;
export const AV_CODEC_ID_INTERPLAY_DPCM = 81921 as AVCodecID;
export const AV_CODEC_ID_XAN_DPCM = 81922 as AVCodecID;
export const AV_CODEC_ID_SOL_DPCM = 81923 as AVCodecID;
export const AV_CODEC_ID_SDX2_DPCM = 81924 as AVCodecID;
export const AV_CODEC_ID_GREMLIN_DPCM = 81925 as AVCodecID;
export const AV_CODEC_ID_DERF_DPCM = 81926 as AVCodecID;
export const AV_CODEC_ID_WADY_DPCM = 81927 as AVCodecID;
export const AV_CODEC_ID_CBD2_DPCM = 81928 as AVCodecID;
export const AV_CODEC_ID_MP2 = 86016 as AVCodecID;
export const AV_CODEC_ID_MP3 = 86017 as AVCodecID;
export const AV_CODEC_ID_AAC = 86018 as AVCodecID;
export const AV_CODEC_ID_AC3 = 86019 as AVCodecID;
export const AV_CODEC_ID_DTS = 86020 as AVCodecID;
export const AV_CODEC_ID_VORBIS = 86021 as AVCodecID;
export const AV_CODEC_ID_DVAUDIO = 86022 as AVCodecID;
export const AV_CODEC_ID_WMAV1 = 86023 as AVCodecID;
export const AV_CODEC_ID_WMAV2 = 86024 as AVCodecID;
export const AV_CODEC_ID_MACE3 = 86025 as AVCodecID;
export const AV_CODEC_ID_MACE6 = 86026 as AVCodecID;
export const AV_CODEC_ID_VMDAUDIO = 86027 as AVCodecID;
export const AV_CODEC_ID_FLAC = 86028 as AVCodecID;
export const AV_CODEC_ID_MP3ADU = 86029 as AVCodecID;
export const AV_CODEC_ID_MP3ON4 = 86030 as AVCodecID;
export const AV_CODEC_ID_SHORTEN = 86031 as AVCodecID;
export const AV_CODEC_ID_ALAC = 86032 as AVCodecID;
export const AV_CODEC_ID_WESTWOOD_SND1 = 86033 as AVCodecID;
export const AV_CODEC_ID_GSM = 86034 as AVCodecID;
export const AV_CODEC_ID_QDM2 = 86035 as AVCodecID;
export const AV_CODEC_ID_COOK = 86036 as AVCodecID;
export const AV_CODEC_ID_TRUESPEECH = 86037 as AVCodecID;
export const AV_CODEC_ID_TTA = 86038 as AVCodecID;
export const AV_CODEC_ID_SMACKAUDIO = 86039 as AVCodecID;
export const AV_CODEC_ID_QCELP = 86040 as AVCodecID;
export const AV_CODEC_ID_WAVPACK = 86041 as AVCodecID;
export const AV_CODEC_ID_DSICINAUDIO = 86042 as AVCodecID;
export const AV_CODEC_ID_IMC = 86043 as AVCodecID;
export const AV_CODEC_ID_MUSEPACK7 = 86044 as AVCodecID;
export const AV_CODEC_ID_MLP = 86045 as AVCodecID;
export const AV_CODEC_ID_GSM_MS = 86046 as AVCodecID;
export const AV_CODEC_ID_ATRAC3 = 86047 as AVCodecID;
export const AV_CODEC_ID_APE = 86048 as AVCodecID;
export const AV_CODEC_ID_NELLYMOSER = 86049 as AVCodecID;
export const AV_CODEC_ID_MUSEPACK8 = 86050 as AVCodecID;
export const AV_CODEC_ID_SPEEX = 86051 as AVCodecID;
export const AV_CODEC_ID_WMAVOICE = 86052 as AVCodecID;
export const AV_CODEC_ID_WMAPRO = 86053 as AVCodecID;
export const AV_CODEC_ID_WMALOSSLESS = 86054 as AVCodecID;
export const AV_CODEC_ID_ATRAC3P = 86055 as AVCodecID;
export const AV_CODEC_ID_EAC3 = 86056 as AVCodecID;
export const AV_CODEC_ID_SIPR = 86057 as AVCodecID;
export const AV_CODEC_ID_MP1 = 86058 as AVCodecID;
export const AV_CODEC_ID_TWINVQ = 86059 as AVCodecID;
export const AV_CODEC_ID_TRUEHD = 86060 as AVCodecID;
export const AV_CODEC_ID_MP4ALS = 86061 as AVCodecID;
export const AV_CODEC_ID_ATRAC1 = 86062 as AVCodecID;
export const AV_CODEC_ID_BINKAUDIO_RDFT = 86063 as AVCodecID;
export const AV_CODEC_ID_BINKAUDIO_DCT = 86064 as AVCodecID;
export const AV_CODEC_ID_AAC_LATM = 86065 as AVCodecID;
export const AV_CODEC_ID_QDMC = 86066 as AVCodecID;
export const AV_CODEC_ID_CELT = 86067 as AVCodecID;
export const AV_CODEC_ID_G723_1 = 86068 as AVCodecID;
export const AV_CODEC_ID_G729 = 86069 as AVCodecID;
export const AV_CODEC_ID_8SVX_EXP = 86070 as AVCodecID;
export const AV_CODEC_ID_8SVX_FIB = 86071 as AVCodecID;
export const AV_CODEC_ID_BMV_AUDIO = 86072 as AVCodecID;
export const AV_CODEC_ID_RALF = 86073 as AVCodecID;
export const AV_CODEC_ID_IAC = 86074 as AVCodecID;
export const AV_CODEC_ID_ILBC = 86075 as AVCodecID;
export const AV_CODEC_ID_OPUS = 86076 as AVCodecID;
export const AV_CODEC_ID_COMFORT_NOISE = 86077 as AVCodecID;
export const AV_CODEC_ID_TAK = 86078 as AVCodecID;
export const AV_CODEC_ID_METASOUND = 86079 as AVCodecID;
export const AV_CODEC_ID_PAF_AUDIO = 86080 as AVCodecID;
export const AV_CODEC_ID_ON2AVC = 86081 as AVCodecID;
export const AV_CODEC_ID_DSS_SP = 86082 as AVCodecID;
export const AV_CODEC_ID_CODEC2 = 86083 as AVCodecID;
export const AV_CODEC_ID_FFWAVESYNTH = 86084 as AVCodecID;
export const AV_CODEC_ID_SONIC = 86085 as AVCodecID;
export const AV_CODEC_ID_SONIC_LS = 86086 as AVCodecID;
export const AV_CODEC_ID_EVRC = 86087 as AVCodecID;
export const AV_CODEC_ID_SMV = 86088 as AVCodecID;
export const AV_CODEC_ID_DSD_LSBF = 86089 as AVCodecID;
export const AV_CODEC_ID_DSD_MSBF = 86090 as AVCodecID;
export const AV_CODEC_ID_DSD_LSBF_PLANAR = 86091 as AVCodecID;
export const AV_CODEC_ID_DSD_MSBF_PLANAR = 86092 as AVCodecID;
export const AV_CODEC_ID_4GV = 86093 as AVCodecID;
export const AV_CODEC_ID_INTERPLAY_ACM = 86094 as AVCodecID;
export const AV_CODEC_ID_XMA1 = 86095 as AVCodecID;
export const AV_CODEC_ID_XMA2 = 86096 as AVCodecID;
export const AV_CODEC_ID_DST = 86097 as AVCodecID;
export const AV_CODEC_ID_ATRAC3AL = 86098 as AVCodecID;
export const AV_CODEC_ID_ATRAC3PAL = 86099 as AVCodecID;
export const AV_CODEC_ID_DOLBY_E = 86100 as AVCodecID;
export const AV_CODEC_ID_APTX = 86101 as AVCodecID;
export const AV_CODEC_ID_APTX_HD = 86102 as AVCodecID;
export const AV_CODEC_ID_SBC = 86103 as AVCodecID;
export const AV_CODEC_ID_ATRAC9 = 86104 as AVCodecID;
export const AV_CODEC_ID_HCOM = 86105 as AVCodecID;
export const AV_CODEC_ID_ACELP_KELVIN = 86106 as AVCodecID;
export const AV_CODEC_ID_MPEGH_3D_AUDIO = 86107 as AVCodecID;
export const AV_CODEC_ID_SIREN = 86108 as AVCodecID;
export const AV_CODEC_ID_HCA = 86109 as AVCodecID;
export const AV_CODEC_ID_FASTAUDIO = 86110 as AVCodecID;
export const AV_CODEC_ID_MSNSIREN = 86111 as AVCodecID;
export const AV_CODEC_ID_DFPWM = 86112 as AVCodecID;
export const AV_CODEC_ID_BONK = 86113 as AVCodecID;
export const AV_CODEC_ID_MISC4 = 86114 as AVCodecID;
export const AV_CODEC_ID_APAC = 86115 as AVCodecID;
export const AV_CODEC_ID_FTR = 86116 as AVCodecID;
export const AV_CODEC_ID_WAVARC = 86117 as AVCodecID;
export const AV_CODEC_ID_RKA = 86118 as AVCodecID;
export const AV_CODEC_ID_AC4 = 86119 as AVCodecID;
export const AV_CODEC_ID_OSQ = 86120 as AVCodecID;
export const AV_CODEC_ID_QOA = 86121 as AVCodecID;
export const AV_CODEC_ID_LC3 = 86122 as AVCodecID;
export const AV_CODEC_ID_G728 = 86123 as AVCodecID;
export const AV_CODEC_ID_AHX = 86124 as AVCodecID;
export const AV_CODEC_ID_FIRST_SUBTITLE = 94208 as AVCodecID;
export const AV_CODEC_ID_DVD_SUBTITLE = 94208 as AVCodecID;
export const AV_CODEC_ID_DVB_SUBTITLE = 94209 as AVCodecID;
export const AV_CODEC_ID_TEXT = 94210 as AVCodecID;
export const AV_CODEC_ID_XSUB = 94211 as AVCodecID;
export const AV_CODEC_ID_SSA = 94212 as AVCodecID;
export const AV_CODEC_ID_MOV_TEXT = 94213 as AVCodecID;
export const AV_CODEC_ID_HDMV_PGS_SUBTITLE = 94214 as AVCodecID;
export const AV_CODEC_ID_DVB_TELETEXT = 94215 as AVCodecID;
export const AV_CODEC_ID_SRT = 94216 as AVCodecID;
export const AV_CODEC_ID_MICRODVD = 94217 as AVCodecID;
export const AV_CODEC_ID_EIA_608 = 94218 as AVCodecID;
export const AV_CODEC_ID_JACOSUB = 94219 as AVCodecID;
export const AV_CODEC_ID_SAMI = 94220 as AVCodecID;
export const AV_CODEC_ID_REALTEXT = 94221 as AVCodecID;
export const AV_CODEC_ID_STL = 94222 as AVCodecID;
export const AV_CODEC_ID_SUBVIEWER1 = 94223 as AVCodecID;
export const AV_CODEC_ID_SUBVIEWER = 94224 as AVCodecID;
export const AV_CODEC_ID_SUBRIP = 94225 as AVCodecID;
export const AV_CODEC_ID_WEBVTT = 94226 as AVCodecID;
export const AV_CODEC_ID_MPL2 = 94227 as AVCodecID;
export const AV_CODEC_ID_VPLAYER = 94228 as AVCodecID;
export const AV_CODEC_ID_PJS = 94229 as AVCodecID;
export const AV_CODEC_ID_ASS = 94230 as AVCodecID;
export const AV_CODEC_ID_HDMV_TEXT_SUBTITLE = 94231 as AVCodecID;
export const AV_CODEC_ID_TTML = 94232 as AVCodecID;
export const AV_CODEC_ID_ARIB_CAPTION = 94233 as AVCodecID;
export const AV_CODEC_ID_IVTV_VBI = 94234 as AVCodecID;
export const AV_CODEC_ID_FIRST_UNKNOWN = 98304 as AVCodecID;
export const AV_CODEC_ID_TTF = 98304 as AVCodecID;
export const AV_CODEC_ID_SCTE_35 = 98305 as AVCodecID;
export const AV_CODEC_ID_EPG = 98306 as AVCodecID;
export const AV_CODEC_ID_BINTEXT = 98307 as AVCodecID;
export const AV_CODEC_ID_XBIN = 98308 as AVCodecID;
export const AV_CODEC_ID_IDF = 98309 as AVCodecID;
export const AV_CODEC_ID_OTF = 98310 as AVCodecID;
export const AV_CODEC_ID_SMPTE_KLV = 98311 as AVCodecID;
export const AV_CODEC_ID_DVD_NAV = 98312 as AVCodecID;
export const AV_CODEC_ID_TIMED_ID3 = 98313 as AVCodecID;
export const AV_CODEC_ID_BIN_DATA = 98314 as AVCodecID;
export const AV_CODEC_ID_SMPTE_2038 = 98315 as AVCodecID;
export const AV_CODEC_ID_LCEVC = 98316 as AVCodecID;
export const AV_CODEC_ID_SMPTE_436M_ANC = 98317 as AVCodecID;
export const AV_CODEC_ID_PROBE = 102400 as AVCodecID;
export const AV_CODEC_ID_MPEG2TS = 131072 as AVCodecID;
export const AV_CODEC_ID_MPEG4SYSTEMS = 131073 as AVCodecID;
export const AV_CODEC_ID_FFMETADATA = 135168 as AVCodecID;
export const AV_CODEC_ID_WRAPPED_AVFRAME = 135169 as AVCodecID;
export const AV_CODEC_ID_VNULL = 135170 as AVCodecID;
export const AV_CODEC_ID_ANULL = 135171 as AVCodecID;

// libavcodec/defs.h
export type AVFieldOrder = number & { readonly [__ffmpeg_brand]: 'AVFieldOrder' };

export const AV_FIELD_UNKNOWN = 0 as AVFieldOrder;
export const AV_FIELD_PROGRESSIVE = 1 as AVFieldOrder;
export const AV_FIELD_TT = 2 as AVFieldOrder;
export const AV_FIELD_BB = 3 as AVFieldOrder;
export const AV_FIELD_TB = 4 as AVFieldOrder;
export const AV_FIELD_BT = 5 as AVFieldOrder;

// libavcodec/defs.h
export type AVDiscard = number & { readonly [__ffmpeg_brand]: 'AVDiscard' };

export const AVDISCARD_NONE = -16 as AVDiscard;
export const AVDISCARD_DEFAULT = 0 as AVDiscard;
export const AVDISCARD_NONREF = 8 as AVDiscard;
export const AVDISCARD_BIDIR = 16 as AVDiscard;
export const AVDISCARD_NONINTRA = 24 as AVDiscard;
export const AVDISCARD_NONKEY = 32 as AVDiscard;
export const AVDISCARD_ALL = 48 as AVDiscard;

// libavcodec/defs.h
export type AVAudioServiceType = number & { readonly [__ffmpeg_brand]: 'AVAudioServiceType' };

export const AV_AUDIO_SERVICE_TYPE_MAIN = 0 as AVAudioServiceType;
export const AV_AUDIO_SERVICE_TYPE_EFFECTS = 1 as AVAudioServiceType;
export const AV_AUDIO_SERVICE_TYPE_VISUALLY_IMPAIRED = 2 as AVAudioServiceType;
export const AV_AUDIO_SERVICE_TYPE_HEARING_IMPAIRED = 3 as AVAudioServiceType;
export const AV_AUDIO_SERVICE_TYPE_DIALOGUE = 4 as AVAudioServiceType;
export const AV_AUDIO_SERVICE_TYPE_COMMENTARY = 5 as AVAudioServiceType;
export const AV_AUDIO_SERVICE_TYPE_EMERGENCY = 6 as AVAudioServiceType;
export const AV_AUDIO_SERVICE_TYPE_VOICE_OVER = 7 as AVAudioServiceType;
export const AV_AUDIO_SERVICE_TYPE_KARAOKE = 8 as AVAudioServiceType;
export const AV_AUDIO_SERVICE_TYPE_NB = 9 as AVAudioServiceType;

// libavcodec/exif.h
export type AVTiffDataType = number & { readonly [__ffmpeg_brand]: 'AVTiffDataType' };

export const AV_TIFF_BYTE = 1 as AVTiffDataType;
export const AV_TIFF_STRING = 2 as AVTiffDataType;
export const AV_TIFF_SHORT = 3 as AVTiffDataType;
export const AV_TIFF_LONG = 4 as AVTiffDataType;
export const AV_TIFF_RATIONAL = 5 as AVTiffDataType;
export const AV_TIFF_SBYTE = 6 as AVTiffDataType;
export const AV_TIFF_UNDEFINED = 7 as AVTiffDataType;
export const AV_TIFF_SSHORT = 8 as AVTiffDataType;
export const AV_TIFF_SLONG = 9 as AVTiffDataType;
export const AV_TIFF_SRATIONAL = 10 as AVTiffDataType;
export const AV_TIFF_FLOAT = 11 as AVTiffDataType;
export const AV_TIFF_DOUBLE = 12 as AVTiffDataType;
export const AV_TIFF_IFD = 13 as AVTiffDataType;

// libavcodec/exif.h
export type AVExifHeaderMode = number & { readonly [__ffmpeg_brand]: 'AVExifHeaderMode' };

export const AV_EXIF_TIFF_HEADER = 0 as AVExifHeaderMode;
export const AV_EXIF_ASSUME_LE = 1 as AVExifHeaderMode;
export const AV_EXIF_ASSUME_BE = 2 as AVExifHeaderMode;
export const AV_EXIF_T_OFF = 3 as AVExifHeaderMode;
export const AV_EXIF_EXIF00 = 4 as AVExifHeaderMode;

// libavcodec/packet.h
export type AVPacketSideDataType = number & { readonly [__ffmpeg_brand]: 'AVPacketSideDataType' };

export const AV_PKT_DATA_PALETTE = 0 as AVPacketSideDataType;
export const AV_PKT_DATA_NEW_EXTRADATA = 1 as AVPacketSideDataType;
export const AV_PKT_DATA_PARAM_CHANGE = 2 as AVPacketSideDataType;
export const AV_PKT_DATA_H263_MB_INFO = 3 as AVPacketSideDataType;
export const AV_PKT_DATA_REPLAYGAIN = 4 as AVPacketSideDataType;
export const AV_PKT_DATA_DISPLAYMATRIX = 5 as AVPacketSideDataType;
export const AV_PKT_DATA_STEREO3D = 6 as AVPacketSideDataType;
export const AV_PKT_DATA_AUDIO_SERVICE_TYPE = 7 as AVPacketSideDataType;
export const AV_PKT_DATA_QUALITY_STATS = 8 as AVPacketSideDataType;
export const AV_PKT_DATA_FALLBACK_TRACK = 9 as AVPacketSideDataType;
export const AV_PKT_DATA_CPB_PROPERTIES = 10 as AVPacketSideDataType;
export const AV_PKT_DATA_SKIP_SAMPLES = 11 as AVPacketSideDataType;
export const AV_PKT_DATA_JP_DUALMONO = 12 as AVPacketSideDataType;
export const AV_PKT_DATA_STRINGS_METADATA = 13 as AVPacketSideDataType;
export const AV_PKT_DATA_SUBTITLE_POSITION = 14 as AVPacketSideDataType;
export const AV_PKT_DATA_MATROSKA_BLOCKADDITIONAL = 15 as AVPacketSideDataType;
export const AV_PKT_DATA_WEBVTT_IDENTIFIER = 16 as AVPacketSideDataType;
export const AV_PKT_DATA_WEBVTT_SETTINGS = 17 as AVPacketSideDataType;
export const AV_PKT_DATA_METADATA_UPDATE = 18 as AVPacketSideDataType;
export const AV_PKT_DATA_MPEGTS_STREAM_ID = 19 as AVPacketSideDataType;
export const AV_PKT_DATA_MASTERING_DISPLAY_METADATA = 20 as AVPacketSideDataType;
export const AV_PKT_DATA_SPHERICAL = 21 as AVPacketSideDataType;
export const AV_PKT_DATA_CONTENT_LIGHT_LEVEL = 22 as AVPacketSideDataType;
export const AV_PKT_DATA_A53_CC = 23 as AVPacketSideDataType;
export const AV_PKT_DATA_ENCRYPTION_INIT_INFO = 24 as AVPacketSideDataType;
export const AV_PKT_DATA_ENCRYPTION_INFO = 25 as AVPacketSideDataType;
export const AV_PKT_DATA_AFD = 26 as AVPacketSideDataType;
export const AV_PKT_DATA_PRFT = 27 as AVPacketSideDataType;
export const AV_PKT_DATA_ICC_PROFILE = 28 as AVPacketSideDataType;
export const AV_PKT_DATA_DOVI_CONF = 29 as AVPacketSideDataType;
export const AV_PKT_DATA_S12M_TIMECODE = 30 as AVPacketSideDataType;
export const AV_PKT_DATA_DYNAMIC_HDR10_PLUS = 31 as AVPacketSideDataType;
export const AV_PKT_DATA_IAMF_MIX_GAIN_PARAM = 32 as AVPacketSideDataType;
export const AV_PKT_DATA_IAMF_DEMIXING_INFO_PARAM = 33 as AVPacketSideDataType;
export const AV_PKT_DATA_IAMF_RECON_GAIN_INFO_PARAM = 34 as AVPacketSideDataType;
export const AV_PKT_DATA_AMBIENT_VIEWING_ENVIRONMENT = 35 as AVPacketSideDataType;
export const AV_PKT_DATA_FRAME_CROPPING = 36 as AVPacketSideDataType;
export const AV_PKT_DATA_LCEVC = 37 as AVPacketSideDataType;
export const AV_PKT_DATA_3D_REFERENCE_DISPLAYS = 38 as AVPacketSideDataType;
export const AV_PKT_DATA_RTCP_SR = 39 as AVPacketSideDataType;
export const AV_PKT_DATA_EXIF = 40 as AVPacketSideDataType;
export const AV_PKT_DATA_NB = 41 as AVPacketSideDataType;

// libavcodec/packet.h
export type AVSideDataParamChangeFlags = number & { readonly [__ffmpeg_brand]: 'AVSideDataParamChangeFlags' };

export const AV_SIDE_DATA_PARAM_CHANGE_SAMPLE_RATE = 4 as AVSideDataParamChangeFlags;
export const AV_SIDE_DATA_PARAM_CHANGE_DIMENSIONS = 8 as AVSideDataParamChangeFlags;

// libavcodec/smpte_436m.h
export type AVSmpte436mWrappingType = number & { readonly [__ffmpeg_brand]: 'AVSmpte436mWrappingType' };

export const AV_SMPTE_436M_WRAPPING_TYPE_VANC_FRAME = 1 as AVSmpte436mWrappingType;
export const AV_SMPTE_436M_WRAPPING_TYPE_VANC_FIELD_1 = 2 as AVSmpte436mWrappingType;
export const AV_SMPTE_436M_WRAPPING_TYPE_VANC_FIELD_2 = 3 as AVSmpte436mWrappingType;
export const AV_SMPTE_436M_WRAPPING_TYPE_VANC_PROGRESSIVE_FRAME = 4 as AVSmpte436mWrappingType;
export const AV_SMPTE_436M_WRAPPING_TYPE_HANC_FRAME = 17 as AVSmpte436mWrappingType;
export const AV_SMPTE_436M_WRAPPING_TYPE_HANC_FIELD_1 = 18 as AVSmpte436mWrappingType;
export const AV_SMPTE_436M_WRAPPING_TYPE_HANC_FIELD_2 = 19 as AVSmpte436mWrappingType;
export const AV_SMPTE_436M_WRAPPING_TYPE_HANC_PROGRESSIVE_FRAME = 20 as AVSmpte436mWrappingType;
export const AV_SMPTE_436M_WRAPPING_TYPE_MAX = 255 as AVSmpte436mWrappingType;

// libavcodec/smpte_436m.h
export type AVSmpte436mPayloadSampleCoding = number & { readonly [__ffmpeg_brand]: 'AVSmpte436mPayloadSampleCoding' };

export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_1BIT_LUMA = 1 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_1BIT_COLOR_DIFF = 2 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_1BIT_LUMA_AND_COLOR_DIFF = 3 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_8BIT_LUMA = 4 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_8BIT_COLOR_DIFF = 5 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_8BIT_LUMA_AND_COLOR_DIFF = 6 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_10BIT_LUMA = 7 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_10BIT_COLOR_DIFF = 8 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_10BIT_LUMA_AND_COLOR_DIFF = 9 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_8BIT_LUMA_WITH_PARITY_ERROR = 10 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_8BIT_COLOR_DIFF_WITH_PARITY_ERROR = 11 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_8BIT_LUMA_AND_COLOR_DIFF_WITH_PARITY_ERROR = 12 as AVSmpte436mPayloadSampleCoding;
export const AV_SMPTE_436M_PAYLOAD_SAMPLE_CODING_MAX = 255 as AVSmpte436mPayloadSampleCoding;

// libavformat/avformat.h
export type AVStreamGroupParamsType = number & { readonly [__ffmpeg_brand]: 'AVStreamGroupParamsType' };

export const AV_STREAM_GROUP_PARAMS_NONE = 0 as AVStreamGroupParamsType;
export const AV_STREAM_GROUP_PARAMS_IAMF_AUDIO_ELEMENT = 1 as AVStreamGroupParamsType;
export const AV_STREAM_GROUP_PARAMS_IAMF_MIX_PRESENTATION = 2 as AVStreamGroupParamsType;
export const AV_STREAM_GROUP_PARAMS_TILE_GRID = 3 as AVStreamGroupParamsType;
export const AV_STREAM_GROUP_PARAMS_LCEVC = 4 as AVStreamGroupParamsType;

// libavformat/avlanguage.h
export type AVLangCodespace = number & { readonly [__ffmpeg_brand]: 'AVLangCodespace' };

export const AV_LANG_ISO639_2_BIBL = 0 as AVLangCodespace;
export const AV_LANG_ISO639_2_TERM = 1 as AVLangCodespace;
export const AV_LANG_ISO639_1 = 2 as AVLangCodespace;

// libavformat/mux.h
export type AVWriteUncodedFrameFlags = number & { readonly [__ffmpeg_brand]: 'AVWriteUncodedFrameFlags' };

export const AV_WRITE_UNCODED_FRAME_QUERY = 1 as AVWriteUncodedFrameFlags;

// libavutil/avstring.h
export type AVEscapeMode = number & { readonly [__ffmpeg_brand]: 'AVEscapeMode' };

export const AV_ESCAPE_MODE_AUTO = 0 as AVEscapeMode;
export const AV_ESCAPE_MODE_BACKSLASH = 1 as AVEscapeMode;
export const AV_ESCAPE_MODE_QUOTE = 2 as AVEscapeMode;
export const AV_ESCAPE_MODE_XML = 3 as AVEscapeMode;

// libavutil/avutil.h
export type AVPictureType = number & { readonly [__ffmpeg_brand]: 'AVPictureType' };

export const AV_PICTURE_TYPE_NONE = 0 as AVPictureType;
export const AV_PICTURE_TYPE_I = 1 as AVPictureType;
export const AV_PICTURE_TYPE_P = 2 as AVPictureType;
export const AV_PICTURE_TYPE_B = 3 as AVPictureType;
export const AV_PICTURE_TYPE_S = 4 as AVPictureType;
export const AV_PICTURE_TYPE_SI = 5 as AVPictureType;
export const AV_PICTURE_TYPE_SP = 6 as AVPictureType;
export const AV_PICTURE_TYPE_BI = 7 as AVPictureType;

// libavutil/channel_layout.h
export type AVChannel = number & { readonly [__ffmpeg_brand]: 'AVChannel' };

export const AV_CHAN_NONE = -1 as AVChannel;
export const AV_CHAN_FRONT_LEFT = 0 as AVChannel;
export const AV_CHAN_FRONT_RIGHT = 1 as AVChannel;
export const AV_CHAN_FRONT_CENTER = 2 as AVChannel;
export const AV_CHAN_LOW_FREQUENCY = 3 as AVChannel;
export const AV_CHAN_BACK_LEFT = 4 as AVChannel;
export const AV_CHAN_BACK_RIGHT = 5 as AVChannel;
export const AV_CHAN_FRONT_LEFT_OF_CENTER = 6 as AVChannel;
export const AV_CHAN_FRONT_RIGHT_OF_CENTER = 7 as AVChannel;
export const AV_CHAN_BACK_CENTER = 8 as AVChannel;
export const AV_CHAN_SIDE_LEFT = 9 as AVChannel;
export const AV_CHAN_SIDE_RIGHT = 10 as AVChannel;
export const AV_CHAN_TOP_CENTER = 11 as AVChannel;
export const AV_CHAN_TOP_FRONT_LEFT = 12 as AVChannel;
export const AV_CHAN_TOP_FRONT_CENTER = 13 as AVChannel;
export const AV_CHAN_TOP_FRONT_RIGHT = 14 as AVChannel;
export const AV_CHAN_TOP_BACK_LEFT = 15 as AVChannel;
export const AV_CHAN_TOP_BACK_CENTER = 16 as AVChannel;
export const AV_CHAN_TOP_BACK_RIGHT = 17 as AVChannel;
export const AV_CHAN_STEREO_LEFT = 29 as AVChannel;
export const AV_CHAN_STEREO_RIGHT = 30 as AVChannel;
export const AV_CHAN_WIDE_LEFT = 31 as AVChannel;
export const AV_CHAN_WIDE_RIGHT = 32 as AVChannel;
export const AV_CHAN_SURROUND_DIRECT_LEFT = 33 as AVChannel;
export const AV_CHAN_SURROUND_DIRECT_RIGHT = 34 as AVChannel;
export const AV_CHAN_LOW_FREQUENCY_2 = 35 as AVChannel;
export const AV_CHAN_TOP_SIDE_LEFT = 36 as AVChannel;
export const AV_CHAN_TOP_SIDE_RIGHT = 37 as AVChannel;
export const AV_CHAN_BOTTOM_FRONT_CENTER = 38 as AVChannel;
export const AV_CHAN_BOTTOM_FRONT_LEFT = 39 as AVChannel;
export const AV_CHAN_BOTTOM_FRONT_RIGHT = 40 as AVChannel;
export const AV_CHAN_SIDE_SURROUND_LEFT = 41 as AVChannel;
export const AV_CHAN_SIDE_SURROUND_RIGHT = 42 as AVChannel;
export const AV_CHAN_TOP_SURROUND_LEFT = 43 as AVChannel;
export const AV_CHAN_TOP_SURROUND_RIGHT = 44 as AVChannel;
export const AV_CHAN_BINAURAL_LEFT = 61 as AVChannel;
export const AV_CHAN_BINAURAL_RIGHT = 62 as AVChannel;
export const AV_CHAN_UNUSED = 512 as AVChannel;
export const AV_CHAN_UNKNOWN = 768 as AVChannel;
export const AV_CHAN_AMBISONIC_BASE = 1024 as AVChannel;
export const AV_CHAN_AMBISONIC_END = 2047 as AVChannel;

// libavutil/channel_layout.h
export type AVChannelOrder = number & { readonly [__ffmpeg_brand]: 'AVChannelOrder' };

export const AV_CHANNEL_ORDER_UNSPEC = 0 as AVChannelOrder;
export const AV_CHANNEL_ORDER_NATIVE = 1 as AVChannelOrder;
export const AV_CHANNEL_ORDER_CUSTOM = 2 as AVChannelOrder;
export const AV_CHANNEL_ORDER_AMBISONIC = 3 as AVChannelOrder;

// libavutil/channel_layout.h
export type AVMatrixEncoding = number & { readonly [__ffmpeg_brand]: 'AVMatrixEncoding' };

export const AV_MATRIX_ENCODING_NONE = 0 as AVMatrixEncoding;
export const AV_MATRIX_ENCODING_DOLBY = 1 as AVMatrixEncoding;
export const AV_MATRIX_ENCODING_DPLII = 2 as AVMatrixEncoding;
export const AV_MATRIX_ENCODING_DPLIIX = 3 as AVMatrixEncoding;
export const AV_MATRIX_ENCODING_DPLIIZ = 4 as AVMatrixEncoding;
export const AV_MATRIX_ENCODING_DOLBYEX = 5 as AVMatrixEncoding;
export const AV_MATRIX_ENCODING_DOLBYHEADPHONE = 6 as AVMatrixEncoding;
export const AV_MATRIX_ENCODING_NB = 7 as AVMatrixEncoding;

// libavutil/dovi_meta.h
export type AVDOVICompression = number & { readonly [__ffmpeg_brand]: 'AVDOVICompression' };

export const AV_DOVI_COMPRESSION_NONE = 0 as AVDOVICompression;
export const AV_DOVI_COMPRESSION_LIMITED = 1 as AVDOVICompression;
export const AV_DOVI_COMPRESSION_RESERVED = 2 as AVDOVICompression;
export const AV_DOVI_COMPRESSION_EXTENDED = 3 as AVDOVICompression;

// libavutil/dovi_meta.h
export type AVDOVIMappingMethod = number & { readonly [__ffmpeg_brand]: 'AVDOVIMappingMethod' };

export const AV_DOVI_MAPPING_POLYNOMIAL = 0 as AVDOVIMappingMethod;
export const AV_DOVI_MAPPING_MMR = 1 as AVDOVIMappingMethod;

// libavutil/dovi_meta.h
export type AVDOVINLQMethod = number & { readonly [__ffmpeg_brand]: 'AVDOVINLQMethod' };

export const AV_DOVI_NLQ_NONE = -1 as AVDOVINLQMethod;
export const AV_DOVI_NLQ_LINEAR_DZ = 0 as AVDOVINLQMethod;

// libavutil/downmix_info.h
export type AVDownmixType = number & { readonly [__ffmpeg_brand]: 'AVDownmixType' };

export const AV_DOWNMIX_TYPE_UNKNOWN = 0 as AVDownmixType;
export const AV_DOWNMIX_TYPE_LORO = 1 as AVDownmixType;
export const AV_DOWNMIX_TYPE_LTRT = 2 as AVDownmixType;
export const AV_DOWNMIX_TYPE_DPLII = 3 as AVDownmixType;
export const AV_DOWNMIX_TYPE_NB = 4 as AVDownmixType;

// libavutil/film_grain_params.h
export type AVFilmGrainParamsType = number & { readonly [__ffmpeg_brand]: 'AVFilmGrainParamsType' };

export const AV_FILM_GRAIN_PARAMS_NONE = 0 as AVFilmGrainParamsType;
export const AV_FILM_GRAIN_PARAMS_AV1 = 1 as AVFilmGrainParamsType;
export const AV_FILM_GRAIN_PARAMS_H274 = 2 as AVFilmGrainParamsType;

// libavutil/frame.h
export type AVFrameSideDataType = number & { readonly [__ffmpeg_brand]: 'AVFrameSideDataType' };

export const AV_FRAME_DATA_PANSCAN = 0 as AVFrameSideDataType;
export const AV_FRAME_DATA_A53_CC = 1 as AVFrameSideDataType;
export const AV_FRAME_DATA_STEREO3D = 2 as AVFrameSideDataType;
export const AV_FRAME_DATA_MATRIXENCODING = 3 as AVFrameSideDataType;
export const AV_FRAME_DATA_DOWNMIX_INFO = 4 as AVFrameSideDataType;
export const AV_FRAME_DATA_REPLAYGAIN = 5 as AVFrameSideDataType;
export const AV_FRAME_DATA_DISPLAYMATRIX = 6 as AVFrameSideDataType;
export const AV_FRAME_DATA_AFD = 7 as AVFrameSideDataType;
export const AV_FRAME_DATA_MOTION_VECTORS = 8 as AVFrameSideDataType;
export const AV_FRAME_DATA_SKIP_SAMPLES = 9 as AVFrameSideDataType;
export const AV_FRAME_DATA_AUDIO_SERVICE_TYPE = 10 as AVFrameSideDataType;
export const AV_FRAME_DATA_MASTERING_DISPLAY_METADATA = 11 as AVFrameSideDataType;
export const AV_FRAME_DATA_GOP_TIMECODE = 12 as AVFrameSideDataType;
export const AV_FRAME_DATA_SPHERICAL = 13 as AVFrameSideDataType;
export const AV_FRAME_DATA_CONTENT_LIGHT_LEVEL = 14 as AVFrameSideDataType;
export const AV_FRAME_DATA_ICC_PROFILE = 15 as AVFrameSideDataType;
export const AV_FRAME_DATA_S12M_TIMECODE = 16 as AVFrameSideDataType;
export const AV_FRAME_DATA_DYNAMIC_HDR_PLUS = 17 as AVFrameSideDataType;
export const AV_FRAME_DATA_REGIONS_OF_INTEREST = 18 as AVFrameSideDataType;
export const AV_FRAME_DATA_VIDEO_ENC_PARAMS = 19 as AVFrameSideDataType;
export const AV_FRAME_DATA_SEI_UNREGISTERED = 20 as AVFrameSideDataType;
export const AV_FRAME_DATA_FILM_GRAIN_PARAMS = 21 as AVFrameSideDataType;
export const AV_FRAME_DATA_DETECTION_BBOXES = 22 as AVFrameSideDataType;
export const AV_FRAME_DATA_DOVI_RPU_BUFFER = 23 as AVFrameSideDataType;
export const AV_FRAME_DATA_DOVI_METADATA = 24 as AVFrameSideDataType;
export const AV_FRAME_DATA_DYNAMIC_HDR_VIVID = 25 as AVFrameSideDataType;
export const AV_FRAME_DATA_AMBIENT_VIEWING_ENVIRONMENT = 26 as AVFrameSideDataType;
export const AV_FRAME_DATA_VIDEO_HINT = 27 as AVFrameSideDataType;
export const AV_FRAME_DATA_LCEVC = 28 as AVFrameSideDataType;
export const AV_FRAME_DATA_VIEW_ID = 29 as AVFrameSideDataType;
export const AV_FRAME_DATA_3D_REFERENCE_DISPLAYS = 30 as AVFrameSideDataType;
export const AV_FRAME_DATA_EXIF = 31 as AVFrameSideDataType;

// libavutil/frame.h
export type AVActiveFormatDescription = number & { readonly [__ffmpeg_brand]: 'AVActiveFormatDescription' };

export const AV_AFD_SAME = 8 as AVActiveFormatDescription;
export const AV_AFD_4_3 = 9 as AVActiveFormatDescription;
export const AV_AFD_16_9 = 10 as AVActiveFormatDescription;
export const AV_AFD_14_9 = 11 as AVActiveFormatDescription;
export const AV_AFD_4_3_SP_14_9 = 13 as AVActiveFormatDescription;
export const AV_AFD_16_9_SP_14_9 = 14 as AVActiveFormatDescription;
export const AV_AFD_SP_4_3 = 15 as AVActiveFormatDescription;

// libavutil/hdr_dynamic_metadata.h
export type AVHDRPlusOverlapProcessOption = number & { readonly [__ffmpeg_brand]: 'AVHDRPlusOverlapProcessOption' };

export const AV_HDR_PLUS_OVERLAP_PROCESS_WEIGHTED_AVERAGING = 0 as AVHDRPlusOverlapProcessOption;
export const AV_HDR_PLUS_OVERLAP_PROCESS_LAYERING = 1 as AVHDRPlusOverlapProcessOption;

// libavutil/hmac.h
export type AVHMACType = number & { readonly [__ffmpeg_brand]: 'AVHMACType' };

export const AV_HMAC_MD5 = 0 as AVHMACType;
export const AV_HMAC_SHA1 = 1 as AVHMACType;
export const AV_HMAC_SHA224 = 2 as AVHMACType;
export const AV_HMAC_SHA256 = 3 as AVHMACType;
export const AV_HMAC_SHA384 = 4 as AVHMACType;
export const AV_HMAC_SHA512 = 5 as AVHMACType;

// libavutil/hwcontext.h
export type AVHWDeviceType = number & { readonly [__ffmpeg_brand]: 'AVHWDeviceType' };

export const AV_HWDEVICE_TYPE_NONE = 0 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_VDPAU = 1 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_CUDA = 2 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_VAAPI = 3 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_DXVA2 = 4 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_QSV = 5 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_VIDEOTOOLBOX = 6 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_D3D11VA = 7 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_DRM = 8 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_OPENCL = 9 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_MEDIACODEC = 10 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_VULKAN = 11 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_D3D12VA = 12 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_RKMPP = 13 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_AMF = 14 as AVHWDeviceType;
export const AV_HWDEVICE_TYPE_OHCODEC = 15 as AVHWDeviceType;

// libavutil/hwcontext.h
export type AVHWFrameTransferDirection = number & { readonly [__ffmpeg_brand]: 'AVHWFrameTransferDirection' };

export const AV_HWFRAME_TRANSFER_DIRECTION_FROM = 0 as AVHWFrameTransferDirection;
export const AV_HWFRAME_TRANSFER_DIRECTION_TO = 1 as AVHWFrameTransferDirection;

// libavutil/hwcontext_d3d12va.h
export type AVD3D12VAFrameFlags = number & { readonly [__ffmpeg_brand]: 'AVD3D12VAFrameFlags' };

export const AV_D3D12VA_FRAME_FLAG_NONE = 0 as AVD3D12VAFrameFlags;

// libavutil/iamf.h
export type AVIAMFAnimationType = number & { readonly [__ffmpeg_brand]: 'AVIAMFAnimationType' };

export const AV_IAMF_ANIMATION_TYPE_STEP = 0 as AVIAMFAnimationType;
export const AV_IAMF_ANIMATION_TYPE_LINEAR = 1 as AVIAMFAnimationType;
export const AV_IAMF_ANIMATION_TYPE_BEZIER = 2 as AVIAMFAnimationType;

// libavutil/iamf.h
export type AVIAMFParamDefinitionType = number & { readonly [__ffmpeg_brand]: 'AVIAMFParamDefinitionType' };

export const AV_IAMF_PARAMETER_DEFINITION_MIX_GAIN = 0 as AVIAMFParamDefinitionType;
export const AV_IAMF_PARAMETER_DEFINITION_DEMIXING = 1 as AVIAMFParamDefinitionType;
export const AV_IAMF_PARAMETER_DEFINITION_RECON_GAIN = 2 as AVIAMFParamDefinitionType;

// libavutil/iamf.h
export type AVIAMFAmbisonicsMode = number & { readonly [__ffmpeg_brand]: 'AVIAMFAmbisonicsMode' };

export const AV_IAMF_AMBISONICS_MODE_MONO = 0 as AVIAMFAmbisonicsMode;
export const AV_IAMF_AMBISONICS_MODE_PROJECTION = 1 as AVIAMFAmbisonicsMode;

// libavutil/iamf.h
export type AVIAMFAudioElementType = number & { readonly [__ffmpeg_brand]: 'AVIAMFAudioElementType' };

export const AV_IAMF_AUDIO_ELEMENT_TYPE_CHANNEL = 0 as AVIAMFAudioElementType;
export const AV_IAMF_AUDIO_ELEMENT_TYPE_SCENE = 1 as AVIAMFAudioElementType;

// libavutil/iamf.h
export type AVIAMFHeadphonesMode = number & { readonly [__ffmpeg_brand]: 'AVIAMFHeadphonesMode' };

export const AV_IAMF_HEADPHONES_MODE_STEREO = 0 as AVIAMFHeadphonesMode;
export const AV_IAMF_HEADPHONES_MODE_BINAURAL = 1 as AVIAMFHeadphonesMode;

// libavutil/iamf.h
export type AVIAMFSubmixLayoutType = number & { readonly [__ffmpeg_brand]: 'AVIAMFSubmixLayoutType' };

export const AV_IAMF_SUBMIX_LAYOUT_TYPE_LOUDSPEAKERS = 2 as AVIAMFSubmixLayoutType;
export const AV_IAMF_SUBMIX_LAYOUT_TYPE_BINAURAL = 3 as AVIAMFSubmixLayoutType;

// libavutil/mathematics.h
export type AVRounding = number & { readonly [__ffmpeg_brand]: 'AVRounding' };

export const AV_ROUND_ZERO = 0 as AVRounding;
export const AV_ROUND_INF = 1 as AVRounding;
export const AV_ROUND_DOWN = 2 as AVRounding;
export const AV_ROUND_UP = 3 as AVRounding;
export const AV_ROUND_NEAR_INF = 5 as AVRounding;
export const AV_ROUND_PASS_MINMAX = 8192 as AVRounding;

// libavutil/opt.h
export type AVOptionType = number & { readonly [__ffmpeg_brand]: 'AVOptionType' };
export type AVOptionTypeFlags = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_FLAGS' };
export type AVOptionTypeInt = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_INT' };
export type AVOptionTypeInt64 = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_INT64' };
export type AVOptionTypeDouble = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_DOUBLE' };
export type AVOptionTypeFloat = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_FLOAT' };
export type AVOptionTypeString = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_STRING' };
export type AVOptionTypeRational = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_RATIONAL' };
export type AVOptionTypeBinary = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_BINARY' };
export type AVOptionTypeDict = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_DICT' };
export type AVOptionTypeUint64 = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_UINT64' };
export type AVOptionTypeConst = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_CONST' };
export type AVOptionTypeImageSize = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_IMAGE_SIZE' };
export type AVOptionTypePixelFmt = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_PIXEL_FMT' };
export type AVOptionTypeSampleFmt = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_SAMPLE_FMT' };
export type AVOptionTypeVideoRate = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_VIDEO_RATE' };
export type AVOptionTypeDuration = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_DURATION' };
export type AVOptionTypeColor = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_COLOR' };
export type AVOptionTypeBool = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_BOOL' };
export type AVOptionTypeChLayout = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_CHLAYOUT' };
export type AVOptionTypeUint = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_UINT' };
export type AVOptionTypeBinaryIntArray = AVOptionType & { readonly __optType: 'AV_OPT_TYPE_BINARY_INT_ARRAY' };

export const AV_OPT_TYPE_FLAGS = 1 as AVOptionTypeFlags;
export const AV_OPT_TYPE_INT = 2 as AVOptionTypeInt;
export const AV_OPT_TYPE_INT64 = 3 as AVOptionTypeInt64;
export const AV_OPT_TYPE_DOUBLE = 4 as AVOptionTypeDouble;
export const AV_OPT_TYPE_FLOAT = 5 as AVOptionTypeFloat;
export const AV_OPT_TYPE_STRING = 6 as AVOptionTypeString;
export const AV_OPT_TYPE_RATIONAL = 7 as AVOptionTypeRational;
export const AV_OPT_TYPE_BINARY = 8 as AVOptionTypeBinary;
export const AV_OPT_TYPE_DICT = 9 as AVOptionTypeDict;
export const AV_OPT_TYPE_UINT64 = 10 as AVOptionTypeUint64;
export const AV_OPT_TYPE_CONST = 11 as AVOptionTypeConst;
export const AV_OPT_TYPE_IMAGE_SIZE = 12 as AVOptionTypeImageSize;
export const AV_OPT_TYPE_PIXEL_FMT = 13 as AVOptionTypePixelFmt;
export const AV_OPT_TYPE_SAMPLE_FMT = 14 as AVOptionTypeSampleFmt;
export const AV_OPT_TYPE_VIDEO_RATE = 15 as AVOptionTypeVideoRate;
export const AV_OPT_TYPE_DURATION = 16 as AVOptionTypeDuration;
export const AV_OPT_TYPE_COLOR = 17 as AVOptionTypeColor;
export const AV_OPT_TYPE_BOOL = 18 as AVOptionTypeBool;
export const AV_OPT_TYPE_CHLAYOUT = 19 as AVOptionTypeChLayout;
export const AV_OPT_TYPE_UINT = 20 as AVOptionTypeUint;
export const AV_OPT_TYPE_BINARY_INT_ARRAY = 25 as AVOptionTypeBinaryIntArray; // For int arrays like pix_fmts

// libavutil/pixfmt.h
export type AVPixelFormat = number & { readonly [__ffmpeg_brand]: 'AVPixelFormat' };

export const AV_PIX_FMT_NONE = -1 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P = 0 as AVPixelFormat;
export const AV_PIX_FMT_YUYV422 = 1 as AVPixelFormat;
export const AV_PIX_FMT_RGB24 = 2 as AVPixelFormat;
export const AV_PIX_FMT_BGR24 = 3 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P = 4 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P = 5 as AVPixelFormat;
export const AV_PIX_FMT_YUV410P = 6 as AVPixelFormat;
export const AV_PIX_FMT_YUV411P = 7 as AVPixelFormat;
export const AV_PIX_FMT_GRAY8 = 8 as AVPixelFormat;
export const AV_PIX_FMT_MONOWHITE = 9 as AVPixelFormat;
export const AV_PIX_FMT_MONOBLACK = 10 as AVPixelFormat;
export const AV_PIX_FMT_PAL8 = 11 as AVPixelFormat;
export const AV_PIX_FMT_YUVJ420P = 12 as AVPixelFormat;
export const AV_PIX_FMT_YUVJ422P = 13 as AVPixelFormat;
export const AV_PIX_FMT_YUVJ444P = 14 as AVPixelFormat;
export const AV_PIX_FMT_UYVY422 = 15 as AVPixelFormat;
export const AV_PIX_FMT_UYYVYY411 = 16 as AVPixelFormat;
export const AV_PIX_FMT_BGR8 = 17 as AVPixelFormat;
export const AV_PIX_FMT_BGR4 = 18 as AVPixelFormat;
export const AV_PIX_FMT_BGR4_BYTE = 19 as AVPixelFormat;
export const AV_PIX_FMT_RGB8 = 20 as AVPixelFormat;
export const AV_PIX_FMT_RGB4 = 21 as AVPixelFormat;
export const AV_PIX_FMT_RGB4_BYTE = 22 as AVPixelFormat;
export const AV_PIX_FMT_NV12 = 23 as AVPixelFormat;
export const AV_PIX_FMT_NV21 = 24 as AVPixelFormat;
export const AV_PIX_FMT_ARGB = 25 as AVPixelFormat;
export const AV_PIX_FMT_RGBA = 26 as AVPixelFormat;
export const AV_PIX_FMT_ABGR = 27 as AVPixelFormat;
export const AV_PIX_FMT_BGRA = 28 as AVPixelFormat;
export const AV_PIX_FMT_GRAY16BE = 29 as AVPixelFormat;
export const AV_PIX_FMT_GRAY16LE = 30 as AVPixelFormat;
export const AV_PIX_FMT_YUV440P = 31 as AVPixelFormat;
export const AV_PIX_FMT_YUVJ440P = 32 as AVPixelFormat;
export const AV_PIX_FMT_YUVA420P = 33 as AVPixelFormat;
export const AV_PIX_FMT_RGB48BE = 34 as AVPixelFormat;
export const AV_PIX_FMT_RGB48LE = 35 as AVPixelFormat;
export const AV_PIX_FMT_RGB565BE = 36 as AVPixelFormat;
export const AV_PIX_FMT_RGB565LE = 37 as AVPixelFormat;
export const AV_PIX_FMT_RGB555BE = 38 as AVPixelFormat;
export const AV_PIX_FMT_RGB555LE = 39 as AVPixelFormat;
export const AV_PIX_FMT_BGR565BE = 40 as AVPixelFormat;
export const AV_PIX_FMT_BGR565LE = 41 as AVPixelFormat;
export const AV_PIX_FMT_BGR555BE = 42 as AVPixelFormat;
export const AV_PIX_FMT_BGR555LE = 43 as AVPixelFormat;
export const AV_PIX_FMT_VAAPI = 44 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P16LE = 45 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P16BE = 46 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P16LE = 47 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P16BE = 48 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P16LE = 49 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P16BE = 50 as AVPixelFormat;
export const AV_PIX_FMT_DXVA2_VLD = 51 as AVPixelFormat;
export const AV_PIX_FMT_RGB444LE = 52 as AVPixelFormat;
export const AV_PIX_FMT_RGB444BE = 53 as AVPixelFormat;
export const AV_PIX_FMT_BGR444LE = 54 as AVPixelFormat;
export const AV_PIX_FMT_BGR444BE = 55 as AVPixelFormat;
export const AV_PIX_FMT_YA8 = 56 as AVPixelFormat;
export const AV_PIX_FMT_BGR48BE = 57 as AVPixelFormat;
export const AV_PIX_FMT_BGR48LE = 58 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P9BE = 59 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P9LE = 60 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P10BE = 61 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P10LE = 62 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P10BE = 63 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P10LE = 64 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P9BE = 65 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P9LE = 66 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P10BE = 67 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P10LE = 68 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P9BE = 69 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P9LE = 70 as AVPixelFormat;
export const AV_PIX_FMT_GBRP = 71 as AVPixelFormat;
export const AV_PIX_FMT_GBRP9BE = 72 as AVPixelFormat;
export const AV_PIX_FMT_GBRP9LE = 73 as AVPixelFormat;
export const AV_PIX_FMT_GBRP10BE = 74 as AVPixelFormat;
export const AV_PIX_FMT_GBRP10LE = 75 as AVPixelFormat;
export const AV_PIX_FMT_GBRP16BE = 76 as AVPixelFormat;
export const AV_PIX_FMT_GBRP16LE = 77 as AVPixelFormat;
export const AV_PIX_FMT_YUVA422P = 78 as AVPixelFormat;
export const AV_PIX_FMT_YUVA444P = 79 as AVPixelFormat;
export const AV_PIX_FMT_YUVA420P9BE = 80 as AVPixelFormat;
export const AV_PIX_FMT_YUVA420P9LE = 81 as AVPixelFormat;
export const AV_PIX_FMT_YUVA422P9BE = 82 as AVPixelFormat;
export const AV_PIX_FMT_YUVA422P9LE = 83 as AVPixelFormat;
export const AV_PIX_FMT_YUVA444P9BE = 84 as AVPixelFormat;
export const AV_PIX_FMT_YUVA444P9LE = 85 as AVPixelFormat;
export const AV_PIX_FMT_YUVA420P10BE = 86 as AVPixelFormat;
export const AV_PIX_FMT_YUVA420P10LE = 87 as AVPixelFormat;
export const AV_PIX_FMT_YUVA422P10BE = 88 as AVPixelFormat;
export const AV_PIX_FMT_YUVA422P10LE = 89 as AVPixelFormat;
export const AV_PIX_FMT_YUVA444P10BE = 90 as AVPixelFormat;
export const AV_PIX_FMT_YUVA444P10LE = 91 as AVPixelFormat;
export const AV_PIX_FMT_YUVA420P16BE = 92 as AVPixelFormat;
export const AV_PIX_FMT_YUVA420P16LE = 93 as AVPixelFormat;
export const AV_PIX_FMT_YUVA422P16BE = 94 as AVPixelFormat;
export const AV_PIX_FMT_YUVA422P16LE = 95 as AVPixelFormat;
export const AV_PIX_FMT_YUVA444P16BE = 96 as AVPixelFormat;
export const AV_PIX_FMT_YUVA444P16LE = 97 as AVPixelFormat;
export const AV_PIX_FMT_VDPAU = 98 as AVPixelFormat;
export const AV_PIX_FMT_XYZ12LE = 99 as AVPixelFormat;
export const AV_PIX_FMT_XYZ12BE = 100 as AVPixelFormat;
export const AV_PIX_FMT_NV16 = 101 as AVPixelFormat;
export const AV_PIX_FMT_NV20LE = 102 as AVPixelFormat;
export const AV_PIX_FMT_NV20BE = 103 as AVPixelFormat;
export const AV_PIX_FMT_RGBA64BE = 104 as AVPixelFormat;
export const AV_PIX_FMT_RGBA64LE = 105 as AVPixelFormat;
export const AV_PIX_FMT_BGRA64BE = 106 as AVPixelFormat;
export const AV_PIX_FMT_BGRA64LE = 107 as AVPixelFormat;
export const AV_PIX_FMT_YVYU422 = 108 as AVPixelFormat;
export const AV_PIX_FMT_YA16BE = 109 as AVPixelFormat;
export const AV_PIX_FMT_YA16LE = 110 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP = 111 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP16BE = 112 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP16LE = 113 as AVPixelFormat;
export const AV_PIX_FMT_QSV = 114 as AVPixelFormat;
export const AV_PIX_FMT_MMAL = 115 as AVPixelFormat;
export const AV_PIX_FMT_D3D11VA_VLD = 116 as AVPixelFormat;
export const AV_PIX_FMT_CUDA = 117 as AVPixelFormat;
export const AV_PIX_FMT_0RGB = 118 as AVPixelFormat;
export const AV_PIX_FMT_RGB0 = 119 as AVPixelFormat;
export const AV_PIX_FMT_0BGR = 120 as AVPixelFormat;
export const AV_PIX_FMT_BGR0 = 121 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P12BE = 122 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P12LE = 123 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P14BE = 124 as AVPixelFormat;
export const AV_PIX_FMT_YUV420P14LE = 125 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P12BE = 126 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P12LE = 127 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P14BE = 128 as AVPixelFormat;
export const AV_PIX_FMT_YUV422P14LE = 129 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P12BE = 130 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P12LE = 131 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P14BE = 132 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P14LE = 133 as AVPixelFormat;
export const AV_PIX_FMT_GBRP12BE = 134 as AVPixelFormat;
export const AV_PIX_FMT_GBRP12LE = 135 as AVPixelFormat;
export const AV_PIX_FMT_GBRP14BE = 136 as AVPixelFormat;
export const AV_PIX_FMT_GBRP14LE = 137 as AVPixelFormat;
export const AV_PIX_FMT_YUVJ411P = 138 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_BGGR8 = 139 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_RGGB8 = 140 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_GBRG8 = 141 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_GRBG8 = 142 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_BGGR16LE = 143 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_BGGR16BE = 144 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_RGGB16LE = 145 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_RGGB16BE = 146 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_GBRG16LE = 147 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_GBRG16BE = 148 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_GRBG16LE = 149 as AVPixelFormat;
export const AV_PIX_FMT_BAYER_GRBG16BE = 150 as AVPixelFormat;
export const AV_PIX_FMT_YUV440P10LE = 151 as AVPixelFormat;
export const AV_PIX_FMT_YUV440P10BE = 152 as AVPixelFormat;
export const AV_PIX_FMT_YUV440P12LE = 153 as AVPixelFormat;
export const AV_PIX_FMT_YUV440P12BE = 154 as AVPixelFormat;
export const AV_PIX_FMT_AYUV64LE = 155 as AVPixelFormat;
export const AV_PIX_FMT_AYUV64BE = 156 as AVPixelFormat;
export const AV_PIX_FMT_VIDEOTOOLBOX = 157 as AVPixelFormat;
export const AV_PIX_FMT_P010LE = 158 as AVPixelFormat;
export const AV_PIX_FMT_P010BE = 159 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP12BE = 160 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP12LE = 161 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP10BE = 162 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP10LE = 163 as AVPixelFormat;
export const AV_PIX_FMT_MEDIACODEC = 164 as AVPixelFormat;
export const AV_PIX_FMT_GRAY12BE = 165 as AVPixelFormat;
export const AV_PIX_FMT_GRAY12LE = 166 as AVPixelFormat;
export const AV_PIX_FMT_GRAY10BE = 167 as AVPixelFormat;
export const AV_PIX_FMT_GRAY10LE = 168 as AVPixelFormat;
export const AV_PIX_FMT_P016LE = 169 as AVPixelFormat;
export const AV_PIX_FMT_P016BE = 170 as AVPixelFormat;
export const AV_PIX_FMT_D3D11 = 171 as AVPixelFormat;
export const AV_PIX_FMT_GRAY9BE = 172 as AVPixelFormat;
export const AV_PIX_FMT_GRAY9LE = 173 as AVPixelFormat;
export const AV_PIX_FMT_GBRPF32BE = 174 as AVPixelFormat;
export const AV_PIX_FMT_GBRPF32LE = 175 as AVPixelFormat;
export const AV_PIX_FMT_GBRAPF32BE = 176 as AVPixelFormat;
export const AV_PIX_FMT_GBRAPF32LE = 177 as AVPixelFormat;
export const AV_PIX_FMT_DRM_PRIME = 178 as AVPixelFormat;
export const AV_PIX_FMT_OPENCL = 179 as AVPixelFormat;
export const AV_PIX_FMT_GRAY14BE = 180 as AVPixelFormat;
export const AV_PIX_FMT_GRAY14LE = 181 as AVPixelFormat;
export const AV_PIX_FMT_GRAYF32BE = 182 as AVPixelFormat;
export const AV_PIX_FMT_GRAYF32LE = 183 as AVPixelFormat;
export const AV_PIX_FMT_YUVA422P12BE = 184 as AVPixelFormat;
export const AV_PIX_FMT_YUVA422P12LE = 185 as AVPixelFormat;
export const AV_PIX_FMT_YUVA444P12BE = 186 as AVPixelFormat;
export const AV_PIX_FMT_YUVA444P12LE = 187 as AVPixelFormat;
export const AV_PIX_FMT_NV24 = 188 as AVPixelFormat;
export const AV_PIX_FMT_NV42 = 189 as AVPixelFormat;
export const AV_PIX_FMT_VULKAN = 190 as AVPixelFormat;
export const AV_PIX_FMT_Y210BE = 191 as AVPixelFormat;
export const AV_PIX_FMT_Y210LE = 192 as AVPixelFormat;
export const AV_PIX_FMT_X2RGB10LE = 193 as AVPixelFormat;
export const AV_PIX_FMT_X2RGB10BE = 194 as AVPixelFormat;
export const AV_PIX_FMT_X2BGR10LE = 195 as AVPixelFormat;
export const AV_PIX_FMT_X2BGR10BE = 196 as AVPixelFormat;
export const AV_PIX_FMT_P210BE = 197 as AVPixelFormat;
export const AV_PIX_FMT_P210LE = 198 as AVPixelFormat;
export const AV_PIX_FMT_P410BE = 199 as AVPixelFormat;
export const AV_PIX_FMT_P410LE = 200 as AVPixelFormat;
export const AV_PIX_FMT_P216BE = 201 as AVPixelFormat;
export const AV_PIX_FMT_P216LE = 202 as AVPixelFormat;
export const AV_PIX_FMT_P416BE = 203 as AVPixelFormat;
export const AV_PIX_FMT_P416LE = 204 as AVPixelFormat;
export const AV_PIX_FMT_VUYA = 205 as AVPixelFormat;
export const AV_PIX_FMT_RGBAF16BE = 206 as AVPixelFormat;
export const AV_PIX_FMT_RGBAF16LE = 207 as AVPixelFormat;
export const AV_PIX_FMT_VUYX = 208 as AVPixelFormat;
export const AV_PIX_FMT_P012LE = 209 as AVPixelFormat;
export const AV_PIX_FMT_P012BE = 210 as AVPixelFormat;
export const AV_PIX_FMT_Y212BE = 211 as AVPixelFormat;
export const AV_PIX_FMT_Y212LE = 212 as AVPixelFormat;
export const AV_PIX_FMT_XV30BE = 213 as AVPixelFormat;
export const AV_PIX_FMT_XV30LE = 214 as AVPixelFormat;
export const AV_PIX_FMT_XV36BE = 215 as AVPixelFormat;
export const AV_PIX_FMT_XV36LE = 216 as AVPixelFormat;
export const AV_PIX_FMT_RGBF32BE = 217 as AVPixelFormat;
export const AV_PIX_FMT_RGBF32LE = 218 as AVPixelFormat;
export const AV_PIX_FMT_RGBAF32BE = 219 as AVPixelFormat;
export const AV_PIX_FMT_RGBAF32LE = 220 as AVPixelFormat;
export const AV_PIX_FMT_P212BE = 221 as AVPixelFormat;
export const AV_PIX_FMT_P212LE = 222 as AVPixelFormat;
export const AV_PIX_FMT_P412BE = 223 as AVPixelFormat;
export const AV_PIX_FMT_P412LE = 224 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP14BE = 225 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP14LE = 226 as AVPixelFormat;
export const AV_PIX_FMT_D3D12 = 227 as AVPixelFormat;
export const AV_PIX_FMT_AYUV = 228 as AVPixelFormat;
export const AV_PIX_FMT_UYVA = 229 as AVPixelFormat;
export const AV_PIX_FMT_VYU444 = 230 as AVPixelFormat;
export const AV_PIX_FMT_V30XBE = 231 as AVPixelFormat;
export const AV_PIX_FMT_V30XLE = 232 as AVPixelFormat;
export const AV_PIX_FMT_RGBF16BE = 233 as AVPixelFormat;
export const AV_PIX_FMT_RGBF16LE = 234 as AVPixelFormat;
export const AV_PIX_FMT_RGBA128BE = 235 as AVPixelFormat;
export const AV_PIX_FMT_RGBA128LE = 236 as AVPixelFormat;
export const AV_PIX_FMT_RGB96BE = 237 as AVPixelFormat;
export const AV_PIX_FMT_RGB96LE = 238 as AVPixelFormat;
export const AV_PIX_FMT_Y216BE = 239 as AVPixelFormat;
export const AV_PIX_FMT_Y216LE = 240 as AVPixelFormat;
export const AV_PIX_FMT_XV48BE = 241 as AVPixelFormat;
export const AV_PIX_FMT_XV48LE = 242 as AVPixelFormat;
export const AV_PIX_FMT_GBRPF16BE = 243 as AVPixelFormat;
export const AV_PIX_FMT_GBRPF16LE = 244 as AVPixelFormat;
export const AV_PIX_FMT_GBRAPF16BE = 245 as AVPixelFormat;
export const AV_PIX_FMT_GBRAPF16LE = 246 as AVPixelFormat;
export const AV_PIX_FMT_GRAYF16BE = 247 as AVPixelFormat;
export const AV_PIX_FMT_GRAYF16LE = 248 as AVPixelFormat;
export const AV_PIX_FMT_AMF_SURFACE = 249 as AVPixelFormat;
export const AV_PIX_FMT_GRAY32BE = 250 as AVPixelFormat;
export const AV_PIX_FMT_GRAY32LE = 251 as AVPixelFormat;
export const AV_PIX_FMT_YAF32BE = 252 as AVPixelFormat;
export const AV_PIX_FMT_YAF32LE = 253 as AVPixelFormat;
export const AV_PIX_FMT_YAF16BE = 254 as AVPixelFormat;
export const AV_PIX_FMT_YAF16LE = 255 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP32BE = 256 as AVPixelFormat;
export const AV_PIX_FMT_GBRAP32LE = 257 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P10MSBBE = 258 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P10MSBLE = 259 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P12MSBBE = 260 as AVPixelFormat;
export const AV_PIX_FMT_YUV444P12MSBLE = 261 as AVPixelFormat;
export const AV_PIX_FMT_GBRP10MSBBE = 262 as AVPixelFormat;
export const AV_PIX_FMT_GBRP10MSBLE = 263 as AVPixelFormat;
export const AV_PIX_FMT_GBRP12MSBBE = 264 as AVPixelFormat;
export const AV_PIX_FMT_GBRP12MSBLE = 265 as AVPixelFormat;
export const AV_PIX_FMT_OHCODEC = 266 as AVPixelFormat;
export const AV_PIX_FMT_NV15 = 267 as AVPixelFormat;
export const AV_PIX_FMT_NV20 = 268 as AVPixelFormat;
export const AV_PIX_FMT_NB = 269 as AVPixelFormat;

// libavutil/pixfmt.h
export type AVColorPrimaries = number & { readonly [__ffmpeg_brand]: 'AVColorPrimaries' };

export const AVCOL_PRI_RESERVED0 = 0 as AVColorPrimaries;
export const AVCOL_PRI_BT709 = 1 as AVColorPrimaries;
export const AVCOL_PRI_UNSPECIFIED = 2 as AVColorPrimaries;
export const AVCOL_PRI_RESERVED = 3 as AVColorPrimaries;
export const AVCOL_PRI_BT470M = 4 as AVColorPrimaries;
export const AVCOL_PRI_BT470BG = 5 as AVColorPrimaries;
export const AVCOL_PRI_SMPTE170M = 6 as AVColorPrimaries;
export const AVCOL_PRI_SMPTE240M = 7 as AVColorPrimaries;
export const AVCOL_PRI_FILM = 8 as AVColorPrimaries;
export const AVCOL_PRI_BT2020 = 9 as AVColorPrimaries;
export const AVCOL_PRI_SMPTE428 = 10 as AVColorPrimaries;
export const AVCOL_PRI_SMPTE431 = 11 as AVColorPrimaries;
export const AVCOL_PRI_SMPTE432 = 12 as AVColorPrimaries;
export const AVCOL_PRI_EBU3213 = 22 as AVColorPrimaries;
export const AVCOL_PRI_NB = 23 as AVColorPrimaries;
export const AVCOL_PRI_EXT_BASE = 256 as AVColorPrimaries;
export const AVCOL_PRI_EXT_NB = 257 as AVColorPrimaries;

// libavutil/pixfmt.h
export type AVColorTransferCharacteristic = number & { readonly [__ffmpeg_brand]: 'AVColorTransferCharacteristic' };

export const AVCOL_TRC_RESERVED0 = 0 as AVColorTransferCharacteristic;
export const AVCOL_TRC_BT709 = 1 as AVColorTransferCharacteristic;
export const AVCOL_TRC_UNSPECIFIED = 2 as AVColorTransferCharacteristic;
export const AVCOL_TRC_RESERVED = 3 as AVColorTransferCharacteristic;
export const AVCOL_TRC_GAMMA22 = 4 as AVColorTransferCharacteristic;
export const AVCOL_TRC_GAMMA28 = 5 as AVColorTransferCharacteristic;
export const AVCOL_TRC_SMPTE170M = 6 as AVColorTransferCharacteristic;
export const AVCOL_TRC_SMPTE240M = 7 as AVColorTransferCharacteristic;
export const AVCOL_TRC_LINEAR = 8 as AVColorTransferCharacteristic;
export const AVCOL_TRC_LOG = 9 as AVColorTransferCharacteristic;
export const AVCOL_TRC_LOG_SQRT = 10 as AVColorTransferCharacteristic;
export const AVCOL_TRC_IEC61966_2_4 = 11 as AVColorTransferCharacteristic;
export const AVCOL_TRC_BT1361_ECG = 12 as AVColorTransferCharacteristic;
export const AVCOL_TRC_IEC61966_2_1 = 13 as AVColorTransferCharacteristic;
export const AVCOL_TRC_BT2020_10 = 14 as AVColorTransferCharacteristic;
export const AVCOL_TRC_BT2020_12 = 15 as AVColorTransferCharacteristic;
export const AVCOL_TRC_SMPTE2084 = 16 as AVColorTransferCharacteristic;
export const AVCOL_TRC_SMPTE428 = 17 as AVColorTransferCharacteristic;
export const AVCOL_TRC_ARIB_STD_B67 = 18 as AVColorTransferCharacteristic;
export const AVCOL_TRC_NB = 19 as AVColorTransferCharacteristic;
export const AVCOL_TRC_EXT_BASE = 256 as AVColorTransferCharacteristic;
export const AVCOL_TRC_EXT_NB = 257 as AVColorTransferCharacteristic;

// libavutil/pixfmt.h
export type AVColorSpace = number & { readonly [__ffmpeg_brand]: 'AVColorSpace' };

export const AVCOL_SPC_RGB = 0 as AVColorSpace;
export const AVCOL_SPC_BT709 = 1 as AVColorSpace;
export const AVCOL_SPC_UNSPECIFIED = 2 as AVColorSpace;
export const AVCOL_SPC_RESERVED = 3 as AVColorSpace;
export const AVCOL_SPC_FCC = 4 as AVColorSpace;
export const AVCOL_SPC_BT470BG = 5 as AVColorSpace;
export const AVCOL_SPC_SMPTE170M = 6 as AVColorSpace;
export const AVCOL_SPC_SMPTE240M = 7 as AVColorSpace;
export const AVCOL_SPC_YCGCO = 8 as AVColorSpace;
export const AVCOL_SPC_BT2020_NCL = 9 as AVColorSpace;
export const AVCOL_SPC_BT2020_CL = 10 as AVColorSpace;
export const AVCOL_SPC_SMPTE2085 = 11 as AVColorSpace;
export const AVCOL_SPC_CHROMA_DERIVED_NCL = 12 as AVColorSpace;
export const AVCOL_SPC_CHROMA_DERIVED_CL = 13 as AVColorSpace;
export const AVCOL_SPC_ICTCP = 14 as AVColorSpace;
export const AVCOL_SPC_IPT_C2 = 15 as AVColorSpace;
export const AVCOL_SPC_YCGCO_RE = 16 as AVColorSpace;
export const AVCOL_SPC_YCGCO_RO = 17 as AVColorSpace;
export const AVCOL_SPC_NB = 18 as AVColorSpace;

// libavutil/pixfmt.h
export type AVColorRange = number & { readonly [__ffmpeg_brand]: 'AVColorRange' };

export const AVCOL_RANGE_UNSPECIFIED = 0 as AVColorRange;
export const AVCOL_RANGE_MPEG = 1 as AVColorRange;
export const AVCOL_RANGE_JPEG = 2 as AVColorRange;
export const AVCOL_RANGE_NB = 3 as AVColorRange;

// libavutil/pixfmt.h
export type AVChromaLocation = number & { readonly [__ffmpeg_brand]: 'AVChromaLocation' };

export const AVCHROMA_LOC_UNSPECIFIED = 0 as AVChromaLocation;
export const AVCHROMA_LOC_LEFT = 1 as AVChromaLocation;
export const AVCHROMA_LOC_CENTER = 2 as AVChromaLocation;
export const AVCHROMA_LOC_TOPLEFT = 3 as AVChromaLocation;
export const AVCHROMA_LOC_TOP = 4 as AVChromaLocation;
export const AVCHROMA_LOC_BOTTOMLEFT = 5 as AVChromaLocation;
export const AVCHROMA_LOC_BOTTOM = 6 as AVChromaLocation;
export const AVCHROMA_LOC_NB = 7 as AVChromaLocation;

// libavutil/samplefmt.h
export type AVSampleFormat = number & { readonly [__ffmpeg_brand]: 'AVSampleFormat' };

export const AV_SAMPLE_FMT_NONE = -1 as AVSampleFormat;
export const AV_SAMPLE_FMT_U8 = 0 as AVSampleFormat;
export const AV_SAMPLE_FMT_S16 = 1 as AVSampleFormat;
export const AV_SAMPLE_FMT_S32 = 2 as AVSampleFormat;
export const AV_SAMPLE_FMT_FLT = 3 as AVSampleFormat;
export const AV_SAMPLE_FMT_DBL = 4 as AVSampleFormat;
export const AV_SAMPLE_FMT_U8P = 5 as AVSampleFormat;
export const AV_SAMPLE_FMT_S16P = 6 as AVSampleFormat;
export const AV_SAMPLE_FMT_S32P = 7 as AVSampleFormat;
export const AV_SAMPLE_FMT_FLTP = 8 as AVSampleFormat;
export const AV_SAMPLE_FMT_DBLP = 9 as AVSampleFormat;
export const AV_SAMPLE_FMT_S64 = 10 as AVSampleFormat;
export const AV_SAMPLE_FMT_S64P = 11 as AVSampleFormat;
export const AV_SAMPLE_FMT_NB = 12 as AVSampleFormat;

// libavutil/spherical.h
export type AVSphericalProjection = number & { readonly [__ffmpeg_brand]: 'AVSphericalProjection' };

export const AV_SPHERICAL_EQUIRECTANGULAR = 0 as AVSphericalProjection;
export const AV_SPHERICAL_CUBEMAP = 1 as AVSphericalProjection;
export const AV_SPHERICAL_EQUIRECTANGULAR_TILE = 2 as AVSphericalProjection;
export const AV_SPHERICAL_HALF_EQUIRECTANGULAR = 3 as AVSphericalProjection;
export const AV_SPHERICAL_RECTILINEAR = 4 as AVSphericalProjection;
export const AV_SPHERICAL_FISHEYE = 5 as AVSphericalProjection;
export const AV_SPHERICAL_PARAMETRIC_IMMERSIVE = 6 as AVSphericalProjection;

// libavutil/stereo3d.h
export type AVStereo3DType = number & { readonly [__ffmpeg_brand]: 'AVStereo3DType' };

export const AV_STEREO3D_2D = 0 as AVStereo3DType;
export const AV_STEREO3D_SIDEBYSIDE = 1 as AVStereo3DType;
export const AV_STEREO3D_TOPBOTTOM = 2 as AVStereo3DType;
export const AV_STEREO3D_FRAMESEQUENCE = 3 as AVStereo3DType;
export const AV_STEREO3D_CHECKERBOARD = 4 as AVStereo3DType;
export const AV_STEREO3D_SIDEBYSIDE_QUINCUNX = 5 as AVStereo3DType;
export const AV_STEREO3D_LINES = 6 as AVStereo3DType;
export const AV_STEREO3D_COLUMNS = 7 as AVStereo3DType;
export const AV_STEREO3D_UNSPEC = 8 as AVStereo3DType;

// libavutil/stereo3d.h
export type AVStereo3DView = number & { readonly [__ffmpeg_brand]: 'AVStereo3DView' };

export const AV_STEREO3D_VIEW_PACKED = 0 as AVStereo3DView;
export const AV_STEREO3D_VIEW_LEFT = 1 as AVStereo3DView;
export const AV_STEREO3D_VIEW_RIGHT = 2 as AVStereo3DView;
export const AV_STEREO3D_VIEW_UNSPEC = 3 as AVStereo3DView;

// libavutil/stereo3d.h
export type AVStereo3DPrimaryEye = number & { readonly [__ffmpeg_brand]: 'AVStereo3DPrimaryEye' };

export const AV_PRIMARY_EYE_NONE = 0 as AVStereo3DPrimaryEye;
export const AV_PRIMARY_EYE_LEFT = 1 as AVStereo3DPrimaryEye;
export const AV_PRIMARY_EYE_RIGHT = 2 as AVStereo3DPrimaryEye;

// libavutil/threadmessage.h
export type AVThreadMessageFlags = number & { readonly [__ffmpeg_brand]: 'AVThreadMessageFlags' };

export const AV_THREAD_MESSAGE_NONBLOCK = 1 as AVThreadMessageFlags;

// libavutil/timecode.h
export type AVTimecodeFlag = number & { readonly [__ffmpeg_brand]: 'AVTimecodeFlag' };

export const AV_TIMECODE_FLAG_DROPFRAME = 1 as AVTimecodeFlag;
export const AV_TIMECODE_FLAG_24HOURSMAX = 2 as AVTimecodeFlag;
export const AV_TIMECODE_FLAG_ALLOWNEGATIVE = 4 as AVTimecodeFlag;

// libavutil/tx.h
export type AVTXType = number & { readonly [__ffmpeg_brand]: 'AVTXType' };

export const AV_TX_FLOAT_FFT = 0 as AVTXType;
export const AV_TX_DOUBLE_FFT = 2 as AVTXType;
export const AV_TX_INT32_FFT = 4 as AVTXType;
export const AV_TX_FLOAT_MDCT = 1 as AVTXType;
export const AV_TX_DOUBLE_MDCT = 3 as AVTXType;
export const AV_TX_INT32_MDCT = 5 as AVTXType;
export const AV_TX_FLOAT_RDFT = 6 as AVTXType;
export const AV_TX_DOUBLE_RDFT = 7 as AVTXType;
export const AV_TX_INT32_RDFT = 8 as AVTXType;
export const AV_TX_FLOAT_DCT = 9 as AVTXType;
export const AV_TX_DOUBLE_DCT = 10 as AVTXType;
export const AV_TX_INT32_DCT = 11 as AVTXType;
export const AV_TX_FLOAT_DCT_I = 12 as AVTXType;
export const AV_TX_DOUBLE_DCT_I = 13 as AVTXType;
export const AV_TX_INT32_DCT_I = 14 as AVTXType;
export const AV_TX_FLOAT_DST_I = 15 as AVTXType;
export const AV_TX_DOUBLE_DST_I = 16 as AVTXType;
export const AV_TX_INT32_DST_I = 17 as AVTXType;
export const AV_TX_NB = 18 as AVTXType;

// libavutil/video_enc_params.h
export type AVVideoEncParamsType = number & { readonly [__ffmpeg_brand]: 'AVVideoEncParamsType' };

export const AV_VIDEO_ENC_PARAMS_NONE = -1 as AVVideoEncParamsType;
export const AV_VIDEO_ENC_PARAMS_VP9 = 0 as AVVideoEncParamsType;
export const AV_VIDEO_ENC_PARAMS_H264 = 1 as AVVideoEncParamsType;
export const AV_VIDEO_ENC_PARAMS_MPEG2 = 2 as AVVideoEncParamsType;

// libavutil/video_hint.h
export type AVVideoHintType = number & { readonly [__ffmpeg_brand]: 'AVVideoHintType' };

export const AV_VIDEO_HINT_TYPE_CONSTANT = 0 as AVVideoHintType;
export const AV_VIDEO_HINT_TYPE_CHANGED = 1 as AVVideoHintType;

// libavfilter/buffersrc.h
export type AVBufferSrcFlag = number & { readonly [__ffmpeg_brand]: 'AVBufferSrcFlag' };

export const AV_BUFFERSRC_FLAG_NONE = 0 as AVBufferSrcFlag;
export const AV_BUFFERSRC_FLAG_NO_CHECK_FORMAT = 1 as AVBufferSrcFlag;
export const AV_BUFFERSRC_FLAG_PUSH = 4 as AVBufferSrcFlag;
export const AV_BUFFERSRC_FLAG_KEEP_REF = 8 as AVBufferSrcFlag;

// libswscale/ops.h
export type SwsPixelType = number & { readonly [__ffmpeg_brand]: 'SwsPixelType' };

export const SWS_PIXEL_NONE = 0 as SwsPixelType;
export const SWS_PIXEL_U8 = 1 as SwsPixelType;
export const SWS_PIXEL_U16 = 2 as SwsPixelType;
export const SWS_PIXEL_U32 = 3 as SwsPixelType;
export const SWS_PIXEL_F32 = 4 as SwsPixelType;
export const SWS_PIXEL_TYPE_NB = 5 as SwsPixelType;

// libswscale/ops.h
export type SwsOpType = number & { readonly [__ffmpeg_brand]: 'SwsOpType' };

export const SWS_OP_INVALID = 0 as SwsOpType;
export const SWS_OP_READ = 1 as SwsOpType;
export const SWS_OP_WRITE = 2 as SwsOpType;
export const SWS_OP_SWAP_BYTES = 3 as SwsOpType;
export const SWS_OP_SWIZZLE = 4 as SwsOpType;
export const SWS_OP_UNPACK = 5 as SwsOpType;
export const SWS_OP_PACK = 6 as SwsOpType;
export const SWS_OP_LSHIFT = 7 as SwsOpType;
export const SWS_OP_RSHIFT = 8 as SwsOpType;
export const SWS_OP_CLEAR = 9 as SwsOpType;
export const SWS_OP_CONVERT = 10 as SwsOpType;
export const SWS_OP_MIN = 11 as SwsOpType;
export const SWS_OP_MAX = 12 as SwsOpType;
export const SWS_OP_SCALE = 13 as SwsOpType;
export const SWS_OP_LINEAR = 14 as SwsOpType;
export const SWS_OP_DITHER = 15 as SwsOpType;
export const SWS_OP_TYPE_NB = 16 as SwsOpType;

// libswscale/ops.h
export type SwsCompFlags = number & { readonly [__ffmpeg_brand]: 'SwsCompFlags' };

export const SWS_COMP_GARBAGE = 1 as SwsCompFlags;
export const SWS_COMP_EXACT = 2 as SwsCompFlags;
export const SWS_COMP_ZERO = 4 as SwsCompFlags;
export const SWS_COMP_SWAPPED = 8 as SwsCompFlags;

// libswscale/ops.h
export type SwsOpCompileFlags = number & { readonly [__ffmpeg_brand]: 'SwsOpCompileFlags' };

export const SWS_OP_FLAG_OPTIMIZE = 1 as SwsOpCompileFlags;

// libswscale/swscale.h
export type SwsDither = number & { readonly [__ffmpeg_brand]: 'SwsDither' };

export const SWS_DITHER_NONE = 0 as SwsDither;
export const SWS_DITHER_AUTO = 1 as SwsDither;
export const SWS_DITHER_BAYER = 2 as SwsDither;
export const SWS_DITHER_ED = 3 as SwsDither;
export const SWS_DITHER_A_DITHER = 4 as SwsDither;
export const SWS_DITHER_X_DITHER = 5 as SwsDither;
export const SWS_DITHER_NB = 6 as SwsDither;

// libswscale/swscale.h
export type SwsAlphaBlend = number & { readonly [__ffmpeg_brand]: 'SwsAlphaBlend' };

export const SWS_ALPHA_BLEND_NONE = 0 as SwsAlphaBlend;
export const SWS_ALPHA_BLEND_UNIFORM = 1 as SwsAlphaBlend;
export const SWS_ALPHA_BLEND_CHECKERBOARD = 2 as SwsAlphaBlend;
export const SWS_ALPHA_BLEND_NB = 3 as SwsAlphaBlend;

// libswscale/swscale.h
export type SwsFlags = number & { readonly [__ffmpeg_brand]: 'SwsFlags' };

export const SWS_FAST_BILINEAR = 1 as SwsFlags;
export const SWS_BILINEAR = 2 as SwsFlags;
export const SWS_BICUBIC = 4 as SwsFlags;
export const SWS_X = 8 as SwsFlags;
export const SWS_POINT = 16 as SwsFlags;
export const SWS_AREA = 32 as SwsFlags;
export const SWS_BICUBLIN = 64 as SwsFlags;
export const SWS_GAUSS = 128 as SwsFlags;
export const SWS_SINC = 256 as SwsFlags;
export const SWS_LANCZOS = 512 as SwsFlags;
export const SWS_SPLINE = 1024 as SwsFlags;
export const SWS_STRICT = 2048 as SwsFlags;
export const SWS_PRINT_INFO = 4096 as SwsFlags;
export const SWS_FULL_CHR_H_INT = 8192 as SwsFlags;
export const SWS_FULL_CHR_H_INP = 16384 as SwsFlags;
export const SWS_ACCURATE_RND = 262144 as SwsFlags;
export const SWS_BITEXACT = 524288 as SwsFlags;
export const SWS_UNSTABLE = 1048576 as SwsFlags;
export const SWS_DIRECT_BGR = 32768 as SwsFlags;
export const SWS_ERROR_DIFFUSION = 8388608 as SwsFlags;

// libswscale/swscale.h
export type SwsIntent = number & { readonly [__ffmpeg_brand]: 'SwsIntent' };

export const SWS_INTENT_PERCEPTUAL = 0 as SwsIntent;
export const SWS_INTENT_RELATIVE_COLORIMETRIC = 1 as SwsIntent;
export const SWS_INTENT_SATURATION = 2 as SwsIntent;
export const SWS_INTENT_ABSOLUTE_COLORIMETRIC = 3 as SwsIntent;
export const SWS_INTENT_NB = 4 as SwsIntent;

// AV_CODEC_FLAG constants (from libavcodec/avcodec.h)
export type AVCodecFlag = number & { readonly [__ffmpeg_brand]: 'AVCodecFlag' };

export const AV_CODEC_FLAG_UNALIGNED = 0x1 as AVCodecFlag;
export const AV_CODEC_FLAG_QSCALE = 0x2 as AVCodecFlag;
export const AV_CODEC_FLAG_4MV = 0x4 as AVCodecFlag;
export const AV_CODEC_FLAG_OUTPUT_CORRUPT = 0x8 as AVCodecFlag;
export const AV_CODEC_FLAG_QPEL = 0x10 as AVCodecFlag;
export const AV_CODEC_FLAG_RECON_FRAME = 0x40 as AVCodecFlag;
export const AV_CODEC_FLAG_COPY_OPAQUE = 0x80 as AVCodecFlag;
export const AV_CODEC_FLAG_FRAME_DURATION = 0x100 as AVCodecFlag;
export const AV_CODEC_FLAG_PASS1 = 0x200 as AVCodecFlag;
export const AV_CODEC_FLAG_PASS2 = 0x400 as AVCodecFlag;
export const AV_CODEC_FLAG_LOOP_FILTER = 0x800 as AVCodecFlag;
export const AV_CODEC_FLAG_GRAY = 0x2000 as AVCodecFlag;
export const AV_CODEC_FLAG_PSNR = 0x8000 as AVCodecFlag;
export const AV_CODEC_FLAG_INTERLACED_DCT = 0x40000 as AVCodecFlag;
export const AV_CODEC_FLAG_LOW_DELAY = 0x80000 as AVCodecFlag;
export const AV_CODEC_FLAG_GLOBAL_HEADER = 0x400000 as AVCodecFlag;
export const AV_CODEC_FLAG_BITEXACT = 0x800000 as AVCodecFlag;
export const AV_CODEC_FLAG_AC_PRED = 0x1000000 as AVCodecFlag;
export const AV_CODEC_FLAG_INTERLACED_ME = 0x20000000 as AVCodecFlag;
export const AV_CODEC_FLAG_CLOSED_GOP = 2147483648 as AVCodecFlag;

// AV_CODEC_FLAG2 constants (from libavcodec/avcodec.h)
export type AVCodecFlag2 = number & { readonly [__ffmpeg_brand]: 'AVCodecFlag2' };

export const AV_CODEC_FLAG2_FAST = 0x1 as AVCodecFlag2;
export const AV_CODEC_FLAG2_NO_OUTPUT = 0x4 as AVCodecFlag2;
export const AV_CODEC_FLAG2_LOCAL_HEADER = 0x8 as AVCodecFlag2;
export const AV_CODEC_FLAG2_CHUNKS = 0x8000 as AVCodecFlag2;
export const AV_CODEC_FLAG2_IGNORE_CROP = 0x10000 as AVCodecFlag2;
export const AV_CODEC_FLAG2_SHOW_ALL = 0x400000 as AVCodecFlag2;
export const AV_CODEC_FLAG2_EXPORT_MVS = 0x10000000 as AVCodecFlag2;
export const AV_CODEC_FLAG2_SKIP_MANUAL = 0x20000000 as AVCodecFlag2;
export const AV_CODEC_FLAG2_RO_FLUSH_NOOP = 0x40000000 as AVCodecFlag2;
export const AV_CODEC_FLAG2_ICC_PROFILES = 2147483648 as AVCodecFlag2;

// AV_CODEC_CAP constants (from libavcodec/codec.h)
export type AVCodecCap = number & { readonly [__ffmpeg_brand]: 'AVCodecCap' };

export const AV_CODEC_CAP_DRAW_HORIZ_BAND = 0x1 as AVCodecCap;
export const AV_CODEC_CAP_DR1 = 0x2 as AVCodecCap;
export const AV_CODEC_CAP_DELAY = 0x20 as AVCodecCap;
export const AV_CODEC_CAP_SMALL_LAST_FRAME = 0x40 as AVCodecCap;
export const AV_CODEC_CAP_EXPERIMENTAL = 0x200 as AVCodecCap;
export const AV_CODEC_CAP_CHANNEL_CONF = 0x400 as AVCodecCap;
export const AV_CODEC_CAP_FRAME_THREADS = 0x1000 as AVCodecCap;
export const AV_CODEC_CAP_SLICE_THREADS = 0x2000 as AVCodecCap;
export const AV_CODEC_CAP_PARAM_CHANGE = 0x4000 as AVCodecCap;
export const AV_CODEC_CAP_OTHER_THREADS = 0x8000 as AVCodecCap;
export const AV_CODEC_CAP_VARIABLE_FRAME_SIZE = 0x10000 as AVCodecCap;
export const AV_CODEC_CAP_AVOID_PROBING = 0x20000 as AVCodecCap;
export const AV_CODEC_CAP_HARDWARE = 0x40000 as AVCodecCap;
export const AV_CODEC_CAP_HYBRID = 0x80000 as AVCodecCap;
export const AV_CODEC_CAP_ENCODER_REORDERED_OPAQUE = 0x100000 as AVCodecCap;
export const AV_CODEC_CAP_ENCODER_FLUSH = 0x200000 as AVCodecCap;
export const AV_CODEC_CAP_ENCODER_RECON_FRAME = 0x400000 as AVCodecCap;

// AV_CODEC_PROP constants (from libavcodec/codec_desc.h)
export type AVCodecProp = number & { readonly [__ffmpeg_brand]: 'AVCodecProp' };

export const AV_CODEC_PROP_INTRA_ONLY = 0x1 as AVCodecProp;
export const AV_CODEC_PROP_LOSSY = 0x2 as AVCodecProp;
export const AV_CODEC_PROP_LOSSLESS = 0x4 as AVCodecProp;
export const AV_CODEC_PROP_REORDER = 0x8 as AVCodecProp;
export const AV_CODEC_PROP_FIELDS = 0x10 as AVCodecProp;
export const AV_CODEC_PROP_BITMAP_SUB = 0x10000 as AVCodecProp;
export const AV_CODEC_PROP_TEXT_SUB = 0x20000 as AVCodecProp;

// AV_CODEC_EXPORT constants (from libavcodec/avcodec.h)
export type AVCodecExport = number & { readonly [__ffmpeg_brand]: 'AVCodecExport' };

export const AV_CODEC_EXPORT_DATA_MVS = 0x1 as AVCodecExport;
export const AV_CODEC_EXPORT_DATA_PRFT = 0x2 as AVCodecExport;
export const AV_CODEC_EXPORT_DATA_VIDEO_ENC_PARAMS = 0x4 as AVCodecExport;
export const AV_CODEC_EXPORT_DATA_FILM_GRAIN = 0x8 as AVCodecExport;
export const AV_CODEC_EXPORT_DATA_ENHANCEMENTS = 0x10 as AVCodecExport;

// AV_CODEC_ID constants (from libavcodec/codec_id.h)
export type AVCodecIDConstants = number & { readonly [__ffmpeg_brand]: 'AVCodecIDConstants' };

// AV_PKT_FLAG constants (from libavcodec/packet.h)
export type AVPacketFlag = number & { readonly [__ffmpeg_brand]: 'AVPacketFlag' };

export const AV_PKT_FLAG_KEY = 1 as AVPacketFlag;
export const AV_PKT_FLAG_CORRUPT = 2 as AVPacketFlag;
export const AV_PKT_FLAG_DISCARD = 4 as AVPacketFlag;
export const AV_PKT_FLAG_TRUSTED = 8 as AVPacketFlag;
export const AV_PKT_FLAG_DISPOSABLE = 16 as AVPacketFlag;

// AV_FRAME_FLAG constants (from libavutil/frame.h)
export type AVFrameFlag = number & { readonly [__ffmpeg_brand]: 'AVFrameFlag' };

export const AV_FRAME_FLAG_CORRUPT = 0x1 as AVFrameFlag;
export const AV_FRAME_FLAG_KEY = 0x2 as AVFrameFlag;
export const AV_FRAME_FLAG_DISCARD = 0x4 as AVFrameFlag;
export const AV_FRAME_FLAG_INTERLACED = 0x8 as AVFrameFlag;
export const AV_FRAME_FLAG_TOP_FIELD_FIRST = 0x10 as AVFrameFlag;
export const AV_FRAME_FLAG_LOSSLESS = 0x20 as AVFrameFlag;

// AV_DISPOSITION constants (from libavformat/avformat.h)
export type AVDisposition = number & { readonly [__ffmpeg_brand]: 'AVDisposition' };

export const AV_DISPOSITION_DEFAULT = 0x1 as AVDisposition;
export const AV_DISPOSITION_DUB = 0x2 as AVDisposition;
export const AV_DISPOSITION_ORIGINAL = 0x4 as AVDisposition;
export const AV_DISPOSITION_COMMENT = 0x8 as AVDisposition;
export const AV_DISPOSITION_LYRICS = 0x10 as AVDisposition;
export const AV_DISPOSITION_KARAOKE = 0x20 as AVDisposition;
export const AV_DISPOSITION_FORCED = 0x40 as AVDisposition;
export const AV_DISPOSITION_HEARING_IMPAIRED = 0x80 as AVDisposition;
export const AV_DISPOSITION_VISUAL_IMPAIRED = 0x100 as AVDisposition;
export const AV_DISPOSITION_CLEAN_EFFECTS = 0x200 as AVDisposition;
export const AV_DISPOSITION_ATTACHED_PIC = 0x400 as AVDisposition;
export const AV_DISPOSITION_TIMED_THUMBNAILS = 0x800 as AVDisposition;
export const AV_DISPOSITION_NON_DIEGETIC = 0x1000 as AVDisposition;
export const AV_DISPOSITION_CAPTIONS = 0x10000 as AVDisposition;
export const AV_DISPOSITION_DESCRIPTIONS = 0x20000 as AVDisposition;
export const AV_DISPOSITION_METADATA = 0x40000 as AVDisposition;
export const AV_DISPOSITION_DEPENDENT = 0x80000 as AVDisposition;
export const AV_DISPOSITION_STILL_IMAGE = 0x100000 as AVDisposition;
export const AV_DISPOSITION_MULTILAYER = 0x200000 as AVDisposition;

// AVSEEK_FLAG constants (from libavformat/avformat.h, libavformat/avio.h)
export type AVSeekFlag = number & { readonly [__ffmpeg_brand]: 'AVSeekFlag' };

export const AVSEEK_FLAG_BACKWARD = 1 as AVSeekFlag;
export const AVSEEK_FLAG_BYTE = 2 as AVSeekFlag;
export const AVSEEK_FLAG_ANY = 4 as AVSeekFlag;
export const AVSEEK_FLAG_FRAME = 8 as AVSeekFlag;
export const AVSEEK_FORCE = 131072 as AVSeekFlag;

// AVFMT_FLAG constants (from libavformat/avformat.h)
export type AVFormatFlag = number & { readonly [__ffmpeg_brand]: 'AVFormatFlag' };

export const AVFMT_FLAG_GENPTS = 1 as AVFormatFlag;
export const AVFMT_FLAG_IGNIDX = 2 as AVFormatFlag;
export const AVFMT_FLAG_NONBLOCK = 4 as AVFormatFlag;
export const AVFMT_FLAG_IGNDTS = 8 as AVFormatFlag;
export const AVFMT_FLAG_NOFILLIN = 16 as AVFormatFlag;
export const AVFMT_FLAG_NOPARSE = 32 as AVFormatFlag;
export const AVFMT_FLAG_NOBUFFER = 64 as AVFormatFlag;
export const AVFMT_FLAG_CUSTOM_IO = 128 as AVFormatFlag;
export const AVFMT_FLAG_DISCARD_CORRUPT = 256 as AVFormatFlag;
export const AVFMT_FLAG_FLUSH_PACKETS = 512 as AVFormatFlag;
export const AVFMT_FLAG_BITEXACT = 1024 as AVFormatFlag;
export const AVFMT_FLAG_SORT_DTS = 65536 as AVFormatFlag;
export const AVFMT_FLAG_FAST_SEEK = 524288 as AVFormatFlag;
export const AVFMT_FLAG_AUTO_BSF = 2097152 as AVFormatFlag;

// AVFMT constants (from libavformat/avformat.h)
export type AVFormatConstants = number & { readonly [__ffmpeg_brand]: 'AVFormatConstants' };

export const AVFMT_NOFILE = 1 as AVFormatConstants;
export const AVFMT_NEEDNUMBER = 2 as AVFormatConstants;
export const AVFMT_EXPERIMENTAL = 4 as AVFormatConstants;
export const AVFMT_SHOW_IDS = 8 as AVFormatConstants;
export const AVFMT_GLOBALHEADER = 64 as AVFormatConstants;
export const AVFMT_NOTIMESTAMPS = 128 as AVFormatConstants;
export const AVFMT_GENERIC_INDEX = 256 as AVFormatConstants;
export const AVFMT_TS_DISCONT = 512 as AVFormatConstants;
export const AVFMT_VARIABLE_FPS = 1024 as AVFormatConstants;
export const AVFMT_NODIMENSIONS = 2048 as AVFormatConstants;
export const AVFMT_NOSTREAMS = 4096 as AVFormatConstants;
export const AVFMT_NOBINSEARCH = 8192 as AVFormatConstants;
export const AVFMT_NOGENSEARCH = 16384 as AVFormatConstants;
export const AVFMT_NO_BYTE_SEEK = 32768 as AVFormatConstants;
export const AVFMT_TS_NONSTRICT = 131072 as AVFormatConstants;
export const AVFMT_TS_NEGATIVE = 262144 as AVFormatConstants;
export const AVFMT_SEEK_TO_PTS = 67108864 as AVFormatConstants;
export const AVFMT_EVENT_FLAG_METADATA_UPDATED = 1 as AVFormatConstants;
export const AVFMT_AVOID_NEG_TS_AUTO = -1 as AVFormatConstants;
export const AVFMT_AVOID_NEG_TS_DISABLED = 0 as AVFormatConstants;
export const AVFMT_AVOID_NEG_TS_MAKE_NON_NEGATIVE = 1 as AVFormatConstants;
export const AVFMT_AVOID_NEG_TS_MAKE_ZERO = 2 as AVFormatConstants;

// AVSTREAM_EVENT_FLAG constants (from libavformat/avformat.h)
export type AVStreamEventFlag = number & { readonly [__ffmpeg_brand]: 'AVStreamEventFlag' };

export const AVSTREAM_EVENT_FLAG_METADATA_UPDATED = 1 as AVStreamEventFlag;
export const AVSTREAM_EVENT_FLAG_NEW_PACKETS = 0x2 as AVStreamEventFlag;

// AVSTREAM constants (from libavformat/avformat.h)
export type AVStreamConstants = number & { readonly [__ffmpeg_brand]: 'AVStreamConstants' };

export const AVSTREAM_INIT_IN_WRITE_HEADER = 0 as AVStreamConstants;
export const AVSTREAM_INIT_IN_INIT_OUTPUT = 1 as AVStreamConstants;

// AVIO_FLAG constants (from libavformat/avio.h)
export type AVIOFlag = number & { readonly [__ffmpeg_brand]: 'AVIOFlag' };

export const AVIO_FLAG_READ = 1 as AVIOFlag;
export const AVIO_FLAG_WRITE = 2 as AVIOFlag;
export const AVIO_FLAG_NONBLOCK = 8 as AVIOFlag;
export const AVIO_FLAG_DIRECT = 32768 as AVIOFlag;

// AVIO constants (from libavformat/avio.h)
export type AVIOConstants = number & { readonly [__ffmpeg_brand]: 'AVIOConstants' };

export const AVIO_SEEKABLE_NORMAL = 0x1 as AVIOConstants;
export const AVIO_SEEKABLE_TIME = 0x2 as AVIOConstants;

// AV_PARSER_PTS constants (from libavcodec/avcodec.h)
export type AVParserPts = number & { readonly [__ffmpeg_brand]: 'AVParserPts' };

export const AV_PARSER_PTS_NB = 4 as AVParserPts;

// AV_CHANNEL_LAYOUT constants (from libavutil/channel_layout.h)
export type AVChannelLayout = number & { readonly [__ffmpeg_brand]: 'AVChannelLayout' };

export const AV_CHANNEL_LAYOUT_RETYPE_FLAG_LOSSLESS = 0x1 as AVChannelLayout;
export const AV_CHANNEL_LAYOUT_RETYPE_FLAG_CANONICAL = 0x2 as AVChannelLayout;

// AV_PIX_FMT constants (from libavutil/pixdesc.h, libavutil/pixfmt.h)
export type AVPixelFormatConstants = number & { readonly [__ffmpeg_brand]: 'AVPixelFormatConstants' };

export const AV_PIX_FMT_FLAG_BE = 0x1 as AVPixelFormatConstants;
export const AV_PIX_FMT_FLAG_PAL = 0x2 as AVPixelFormatConstants;
export const AV_PIX_FMT_FLAG_BITSTREAM = 0x4 as AVPixelFormatConstants;
export const AV_PIX_FMT_FLAG_HWACCEL = 0x8 as AVPixelFormatConstants;
export const AV_PIX_FMT_FLAG_PLANAR = 0x10 as AVPixelFormatConstants;
export const AV_PIX_FMT_FLAG_RGB = 0x20 as AVPixelFormatConstants;
export const AV_PIX_FMT_FLAG_ALPHA = 0x80 as AVPixelFormatConstants;
export const AV_PIX_FMT_FLAG_BAYER = 0x100 as AVPixelFormatConstants;
export const AV_PIX_FMT_FLAG_FLOAT = 0x200 as AVPixelFormatConstants;
export const AV_PIX_FMT_FLAG_XYZ = 0x400 as AVPixelFormatConstants;

// AV_PROFILE constants (from libavcodec/defs.h)
export type AVProfile = number & { readonly [__ffmpeg_brand]: 'AVProfile' };

export const AV_PROFILE_UNKNOWN = -99 as AVProfile;
export const AV_PROFILE_RESERVED = -100 as AVProfile;
export const AV_PROFILE_AAC_MAIN = 0 as AVProfile;
export const AV_PROFILE_AAC_LOW = 1 as AVProfile;
export const AV_PROFILE_AAC_SSR = 2 as AVProfile;
export const AV_PROFILE_AAC_LTP = 3 as AVProfile;
export const AV_PROFILE_AAC_HE = 4 as AVProfile;
export const AV_PROFILE_AAC_HE_V2 = 28 as AVProfile;
export const AV_PROFILE_AAC_LD = 22 as AVProfile;
export const AV_PROFILE_AAC_ELD = 38 as AVProfile;
export const AV_PROFILE_AAC_USAC = 41 as AVProfile;
export const AV_PROFILE_MPEG2_AAC_LOW = 128 as AVProfile;
export const AV_PROFILE_MPEG2_AAC_HE = 131 as AVProfile;
export const AV_PROFILE_DNXHD = 0 as AVProfile;
export const AV_PROFILE_DNXHR_LB = 1 as AVProfile;
export const AV_PROFILE_DNXHR_SQ = 2 as AVProfile;
export const AV_PROFILE_DNXHR_HQ = 3 as AVProfile;
export const AV_PROFILE_DNXHR_HQX = 4 as AVProfile;
export const AV_PROFILE_DNXHR_444 = 5 as AVProfile;
export const AV_PROFILE_DTS = 20 as AVProfile;
export const AV_PROFILE_DTS_ES = 30 as AVProfile;
export const AV_PROFILE_DTS_96_24 = 40 as AVProfile;
export const AV_PROFILE_DTS_HD_HRA = 50 as AVProfile;
export const AV_PROFILE_DTS_HD_MA = 60 as AVProfile;
export const AV_PROFILE_DTS_EXPRESS = 70 as AVProfile;
export const AV_PROFILE_DTS_HD_MA_X = 61 as AVProfile;
export const AV_PROFILE_DTS_HD_MA_X_IMAX = 62 as AVProfile;
export const AV_PROFILE_EAC3_DDP_ATMOS = 30 as AVProfile;
export const AV_PROFILE_TRUEHD_ATMOS = 30 as AVProfile;
export const AV_PROFILE_MPEG2_422 = 0 as AVProfile;
export const AV_PROFILE_MPEG2_HIGH = 1 as AVProfile;
export const AV_PROFILE_MPEG2_SS = 2 as AVProfile;
export const AV_PROFILE_MPEG2_SNR_SCALABLE = 3 as AVProfile;
export const AV_PROFILE_MPEG2_MAIN = 4 as AVProfile;
export const AV_PROFILE_MPEG2_SIMPLE = 5 as AVProfile;
export const AV_PROFILE_H264_CONSTRAINED = 0x200 as AVProfile;
export const AV_PROFILE_H264_INTRA = 0x800 as AVProfile;
export const AV_PROFILE_H264_BASELINE = 66 as AVProfile;
export const AV_PROFILE_H264_MAIN = 77 as AVProfile;
export const AV_PROFILE_H264_EXTENDED = 88 as AVProfile;
export const AV_PROFILE_H264_HIGH = 100 as AVProfile;
export const AV_PROFILE_H264_HIGH_10 = 110 as AVProfile;
export const AV_PROFILE_H264_MULTIVIEW_HIGH = 118 as AVProfile;
export const AV_PROFILE_H264_HIGH_422 = 122 as AVProfile;
export const AV_PROFILE_H264_STEREO_HIGH = 128 as AVProfile;
export const AV_PROFILE_H264_HIGH_444 = 144 as AVProfile;
export const AV_PROFILE_H264_HIGH_444_PREDICTIVE = 244 as AVProfile;
export const AV_PROFILE_H264_CAVLC_444 = 44 as AVProfile;
export const AV_PROFILE_VC1_SIMPLE = 0 as AVProfile;
export const AV_PROFILE_VC1_MAIN = 1 as AVProfile;
export const AV_PROFILE_VC1_COMPLEX = 2 as AVProfile;
export const AV_PROFILE_VC1_ADVANCED = 3 as AVProfile;
export const AV_PROFILE_MPEG4_SIMPLE = 0 as AVProfile;
export const AV_PROFILE_MPEG4_SIMPLE_SCALABLE = 1 as AVProfile;
export const AV_PROFILE_MPEG4_CORE = 2 as AVProfile;
export const AV_PROFILE_MPEG4_MAIN = 3 as AVProfile;
export const AV_PROFILE_MPEG4_N_BIT = 4 as AVProfile;
export const AV_PROFILE_MPEG4_SCALABLE_TEXTURE = 5 as AVProfile;
export const AV_PROFILE_MPEG4_SIMPLE_FACE_ANIMATION = 6 as AVProfile;
export const AV_PROFILE_MPEG4_BASIC_ANIMATED_TEXTURE = 7 as AVProfile;
export const AV_PROFILE_MPEG4_HYBRID = 8 as AVProfile;
export const AV_PROFILE_MPEG4_ADVANCED_REAL_TIME = 9 as AVProfile;
export const AV_PROFILE_MPEG4_CORE_SCALABLE = 10 as AVProfile;
export const AV_PROFILE_MPEG4_ADVANCED_CODING = 11 as AVProfile;
export const AV_PROFILE_MPEG4_ADVANCED_CORE = 12 as AVProfile;
export const AV_PROFILE_MPEG4_ADVANCED_SCALABLE_TEXTURE = 13 as AVProfile;
export const AV_PROFILE_MPEG4_SIMPLE_STUDIO = 14 as AVProfile;
export const AV_PROFILE_MPEG4_ADVANCED_SIMPLE = 15 as AVProfile;
export const AV_PROFILE_JPEG2000_CSTREAM_RESTRICTION_0 = 1 as AVProfile;
export const AV_PROFILE_JPEG2000_CSTREAM_RESTRICTION_1 = 2 as AVProfile;
export const AV_PROFILE_JPEG2000_CSTREAM_NO_RESTRICTION = 32768 as AVProfile;
export const AV_PROFILE_JPEG2000_DCINEMA_2K = 3 as AVProfile;
export const AV_PROFILE_JPEG2000_DCINEMA_4K = 4 as AVProfile;
export const AV_PROFILE_VP9_0 = 0 as AVProfile;
export const AV_PROFILE_VP9_1 = 1 as AVProfile;
export const AV_PROFILE_VP9_2 = 2 as AVProfile;
export const AV_PROFILE_VP9_3 = 3 as AVProfile;
export const AV_PROFILE_HEVC_MAIN = 1 as AVProfile;
export const AV_PROFILE_HEVC_MAIN_10 = 2 as AVProfile;
export const AV_PROFILE_HEVC_MAIN_STILL_PICTURE = 3 as AVProfile;
export const AV_PROFILE_HEVC_REXT = 4 as AVProfile;
export const AV_PROFILE_HEVC_MULTIVIEW_MAIN = 6 as AVProfile;
export const AV_PROFILE_HEVC_SCC = 9 as AVProfile;
export const AV_PROFILE_VVC_MAIN_10 = 1 as AVProfile;
export const AV_PROFILE_VVC_MAIN_10_444 = 33 as AVProfile;
export const AV_PROFILE_AV1_MAIN = 0 as AVProfile;
export const AV_PROFILE_AV1_HIGH = 1 as AVProfile;
export const AV_PROFILE_AV1_PROFESSIONAL = 2 as AVProfile;
export const AV_PROFILE_MJPEG_HUFFMAN_BASELINE_DCT = 192 as AVProfile;
export const AV_PROFILE_MJPEG_HUFFMAN_EXTENDED_SEQUENTIAL_DCT = 193 as AVProfile;
export const AV_PROFILE_MJPEG_HUFFMAN_PROGRESSIVE_DCT = 194 as AVProfile;
export const AV_PROFILE_MJPEG_HUFFMAN_LOSSLESS = 195 as AVProfile;
export const AV_PROFILE_MJPEG_JPEG_LS = 247 as AVProfile;
export const AV_PROFILE_SBC_MSBC = 1 as AVProfile;
export const AV_PROFILE_PRORES_PROXY = 0 as AVProfile;
export const AV_PROFILE_PRORES_LT = 1 as AVProfile;
export const AV_PROFILE_PRORES_STANDARD = 2 as AVProfile;
export const AV_PROFILE_PRORES_HQ = 3 as AVProfile;
export const AV_PROFILE_PRORES_4444 = 4 as AVProfile;
export const AV_PROFILE_PRORES_XQ = 5 as AVProfile;
export const AV_PROFILE_PRORES_RAW = 0 as AVProfile;
export const AV_PROFILE_PRORES_RAW_HQ = 1 as AVProfile;
export const AV_PROFILE_ARIB_PROFILE_A = 0 as AVProfile;
export const AV_PROFILE_ARIB_PROFILE_C = 1 as AVProfile;
export const AV_PROFILE_KLVA_SYNC = 0 as AVProfile;
export const AV_PROFILE_KLVA_ASYNC = 1 as AVProfile;
export const AV_PROFILE_EVC_BASELINE = 0 as AVProfile;
export const AV_PROFILE_EVC_MAIN = 1 as AVProfile;
export const AV_PROFILE_APV_422_10 = 33 as AVProfile;
export const AV_PROFILE_APV_422_12 = 44 as AVProfile;
export const AV_PROFILE_APV_444_10 = 55 as AVProfile;
export const AV_PROFILE_APV_444_12 = 66 as AVProfile;
export const AV_PROFILE_APV_4444_10 = 77 as AVProfile;
export const AV_PROFILE_APV_4444_12 = 88 as AVProfile;
export const AV_PROFILE_APV_400_10 = 99 as AVProfile;

// AV_OPT_FLAG constants (from libavutil/opt.h)
export type AVOptionFlag = number & { readonly [__ffmpeg_brand]: 'AVOptionFlag' };

export const AV_OPT_FLAG_ENCODING_PARAM = 0x1 as AVOptionFlag;
export const AV_OPT_FLAG_DECODING_PARAM = 0x2 as AVOptionFlag;
export const AV_OPT_FLAG_AUDIO_PARAM = 0x8 as AVOptionFlag;
export const AV_OPT_FLAG_VIDEO_PARAM = 0x10 as AVOptionFlag;
export const AV_OPT_FLAG_SUBTITLE_PARAM = 0x20 as AVOptionFlag;
export const AV_OPT_FLAG_EXPORT = 0x40 as AVOptionFlag;
export const AV_OPT_FLAG_READONLY = 0x80 as AVOptionFlag;
export const AV_OPT_FLAG_BSF_PARAM = 0x100 as AVOptionFlag;
export const AV_OPT_FLAG_RUNTIME_PARAM = 0x8000 as AVOptionFlag;
export const AV_OPT_FLAG_FILTERING_PARAM = 0x10000 as AVOptionFlag;
export const AV_OPT_FLAG_DEPRECATED = 0x20000 as AVOptionFlag;
export const AV_OPT_FLAG_CHILD_CONSTS = 0x40000 as AVOptionFlag;

// AV_OPT_SERIALIZE constants (from libavutil/opt.h)
export type AVOptionSerialize = number & { readonly [__ffmpeg_brand]: 'AVOptionSerialize' };

export const AV_OPT_SERIALIZE_SKIP_DEFAULTS = 1 as AVOptionSerialize;
export const AV_OPT_SERIALIZE_OPT_FLAGS_EXACT = 2 as AVOptionSerialize;
export const AV_OPT_SERIALIZE_SEARCH_CHILDREN = 4 as AVOptionSerialize;

// AV_OPT_SEARCH constants (from libavutil/opt.h)
export type AVOptionSearchFlags = number & { readonly [__ffmpeg_brand]: 'AVOptionSearchFlags' };

export const AV_OPT_SEARCH_CHILDREN = 0x1 as AVOptionSearchFlags;
export const AV_OPT_SEARCH_FAKE_OBJ = 0x2 as AVOptionSearchFlags;
export const AV_OPT_ALLOW_NULL = 0x4 as AVOptionSearchFlags;
export const AV_OPT_ARRAY_REPLACE = 0x8 as AVOptionSearchFlags;
export const AV_OPT_MULTI_COMPONENT_RANGE = 0x1000 as AVOptionSearchFlags;

// AV_HWACCEL_FLAG constants (from libavcodec/avcodec.h)
export type AVHWAccelFlag = number & { readonly [__ffmpeg_brand]: 'AVHWAccelFlag' };

export const AV_HWACCEL_FLAG_IGNORE_LEVEL = 0x1 as AVHWAccelFlag;
export const AV_HWACCEL_FLAG_ALLOW_HIGH_DEPTH = 0x2 as AVHWAccelFlag;
export const AV_HWACCEL_FLAG_ALLOW_PROFILE_MISMATCH = 0x4 as AVHWAccelFlag;
export const AV_HWACCEL_FLAG_UNSAFE_OUTPUT = 0x8 as AVHWAccelFlag;
export const AV_HWACCEL_FLAG_LOW_PRIORITY = 0x10 as AVHWAccelFlag;

// AV_HWACCEL_CAP constants (from libavcodec/avcodec.h)
export type AVHWAccelCap = number & { readonly [__ffmpeg_brand]: 'AVHWAccelCap' };

export const AV_HWACCEL_CODEC_CAP_EXPERIMENTAL = 512 as AVHWAccelCap;

// AV_LOG constants (from libavutil/log.h)
export type AVLogLevel = number & { readonly [__ffmpeg_brand]: 'AVLogLevel' };

export const AV_LOG_QUIET = -8 as AVLogLevel;
export const AV_LOG_PANIC = 0 as AVLogLevel;
export const AV_LOG_FATAL = 8 as AVLogLevel;
export const AV_LOG_ERROR = 16 as AVLogLevel;
export const AV_LOG_WARNING = 24 as AVLogLevel;
export const AV_LOG_INFO = 32 as AVLogLevel;
export const AV_LOG_VERBOSE = 40 as AVLogLevel;
export const AV_LOG_DEBUG = 48 as AVLogLevel;
export const AV_LOG_TRACE = 56 as AVLogLevel;
export const AV_LOG_SKIP_REPEATED = 1 as AVLogLevel;
export const AV_LOG_PRINT_LEVEL = 2 as AVLogLevel;
export const AV_LOG_PRINT_TIME = 4 as AVLogLevel;
export const AV_LOG_PRINT_DATETIME = 8 as AVLogLevel;

// AV_CPU_FLAG constants (from libavutil/cpu.h)
export type AVCpuFlag = number & { readonly [__ffmpeg_brand]: 'AVCpuFlag' };

export const AV_CPU_FLAG_FORCE = 2147483648 as AVCpuFlag;
export const AV_CPU_FLAG_MMX = 1 as AVCpuFlag;
export const AV_CPU_FLAG_MMXEXT = 2 as AVCpuFlag;
export const AV_CPU_FLAG_MMX2 = 2 as AVCpuFlag;
export const AV_CPU_FLAG_3DNOW = 4 as AVCpuFlag;
export const AV_CPU_FLAG_SSE = 8 as AVCpuFlag;
export const AV_CPU_FLAG_SSE2 = 16 as AVCpuFlag;
export const AV_CPU_FLAG_SSE2SLOW = 1073741824 as AVCpuFlag;
export const AV_CPU_FLAG_3DNOWEXT = 32 as AVCpuFlag;
export const AV_CPU_FLAG_SSE3 = 64 as AVCpuFlag;
export const AV_CPU_FLAG_SSE3SLOW = 536870912 as AVCpuFlag;
export const AV_CPU_FLAG_SSSE3 = 128 as AVCpuFlag;
export const AV_CPU_FLAG_SSSE3SLOW = 67108864 as AVCpuFlag;
export const AV_CPU_FLAG_ATOM = 268435456 as AVCpuFlag;
export const AV_CPU_FLAG_SSE4 = 256 as AVCpuFlag;
export const AV_CPU_FLAG_SSE42 = 512 as AVCpuFlag;
export const AV_CPU_FLAG_AESNI = 524288 as AVCpuFlag;
export const AV_CPU_FLAG_CLMUL = 4194304 as AVCpuFlag;
export const AV_CPU_FLAG_AVX = 16384 as AVCpuFlag;
export const AV_CPU_FLAG_AVXSLOW = 134217728 as AVCpuFlag;
export const AV_CPU_FLAG_XOP = 1024 as AVCpuFlag;
export const AV_CPU_FLAG_FMA4 = 2048 as AVCpuFlag;
export const AV_CPU_FLAG_CMOV = 4096 as AVCpuFlag;
export const AV_CPU_FLAG_AVX2 = 32768 as AVCpuFlag;
export const AV_CPU_FLAG_FMA3 = 65536 as AVCpuFlag;
export const AV_CPU_FLAG_BMI1 = 131072 as AVCpuFlag;
export const AV_CPU_FLAG_BMI2 = 262144 as AVCpuFlag;
export const AV_CPU_FLAG_AVX512 = 1048576 as AVCpuFlag;
export const AV_CPU_FLAG_AVX512ICL = 2097152 as AVCpuFlag;
export const AV_CPU_FLAG_SLOW_GATHER = 33554432 as AVCpuFlag;
export const AV_CPU_FLAG_ALTIVEC = 1 as AVCpuFlag;
export const AV_CPU_FLAG_VSX = 2 as AVCpuFlag;
export const AV_CPU_FLAG_POWER8 = 4 as AVCpuFlag;
export const AV_CPU_FLAG_ARMV5TE = 0x1 as AVCpuFlag;
export const AV_CPU_FLAG_ARMV6 = 0x2 as AVCpuFlag;
export const AV_CPU_FLAG_ARMV6T2 = 0x4 as AVCpuFlag;
export const AV_CPU_FLAG_VFP = 0x8 as AVCpuFlag;
export const AV_CPU_FLAG_VFPV3 = 0x10 as AVCpuFlag;
export const AV_CPU_FLAG_NEON = 0x20 as AVCpuFlag;
export const AV_CPU_FLAG_ARMV8 = 0x40 as AVCpuFlag;
export const AV_CPU_FLAG_VFP_VM = 0x80 as AVCpuFlag;
export const AV_CPU_FLAG_DOTPROD = 0x100 as AVCpuFlag;
export const AV_CPU_FLAG_I8MM = 0x200 as AVCpuFlag;
export const AV_CPU_FLAG_SVE = 0x400 as AVCpuFlag;
export const AV_CPU_FLAG_SVE2 = 0x800 as AVCpuFlag;
export const AV_CPU_FLAG_SME = 0x1000 as AVCpuFlag;
export const AV_CPU_FLAG_ARM_CRC = 0x2000 as AVCpuFlag;
export const AV_CPU_FLAG_SETEND = 0x10000 as AVCpuFlag;
export const AV_CPU_FLAG_MMI = 0x1 as AVCpuFlag;
export const AV_CPU_FLAG_MSA = 0x2 as AVCpuFlag;
export const AV_CPU_FLAG_LSX = 0x1 as AVCpuFlag;
export const AV_CPU_FLAG_LASX = 0x2 as AVCpuFlag;
export const AV_CPU_FLAG_RVI = 0x1 as AVCpuFlag;
export const AV_CPU_FLAG_RVF = 0x2 as AVCpuFlag;
export const AV_CPU_FLAG_RVD = 0x4 as AVCpuFlag;
export const AV_CPU_FLAG_RVV_I32 = 0x8 as AVCpuFlag;
export const AV_CPU_FLAG_RVV_F32 = 0x10 as AVCpuFlag;
export const AV_CPU_FLAG_RVV_I64 = 0x20 as AVCpuFlag;
export const AV_CPU_FLAG_RVV_F64 = 0x40 as AVCpuFlag;
export const AV_CPU_FLAG_RVB_BASIC = 0x80 as AVCpuFlag;
export const AV_CPU_FLAG_RVB_ADDR = 0x100 as AVCpuFlag;
export const AV_CPU_FLAG_RV_ZVBB = 0x200 as AVCpuFlag;
export const AV_CPU_FLAG_RV_MISALIGNED = 0x400 as AVCpuFlag;
export const AV_CPU_FLAG_RVB = 0x800 as AVCpuFlag;
export const AV_CPU_FLAG_SIMD128 = 0x1 as AVCpuFlag;

// AV_DICT constants (from libavutil/dict.h)
export type AVDictFlag = number & { readonly [__ffmpeg_brand]: 'AVDictFlag' };

export const AV_DICT_MATCH_CASE = 1 as AVDictFlag;
export const AV_DICT_IGNORE_SUFFIX = 2 as AVDictFlag;
export const AV_DICT_DONT_STRDUP_KEY = 4 as AVDictFlag;
export const AV_DICT_DONT_STRDUP_VAL = 8 as AVDictFlag;
export const AV_DICT_DONT_OVERWRITE = 16 as AVDictFlag;
export const AV_DICT_APPEND = 32 as AVDictFlag;
export const AV_DICT_MULTIKEY = 64 as AVDictFlag;
export const AV_DICT_DEDUP = 128 as AVDictFlag;

// AV_ESCAPE_FLAG constants (from libavutil/avstring.h)
export type AVEscapeFlag = number & { readonly [__ffmpeg_brand]: 'AVEscapeFlag' };

export const AV_ESCAPE_FLAG_WHITESPACE = 0x1 as AVEscapeFlag;
export const AV_ESCAPE_FLAG_STRICT = 0x2 as AVEscapeFlag;
export const AV_ESCAPE_FLAG_XML_SINGLE_QUOTES = 0x4 as AVEscapeFlag;
export const AV_ESCAPE_FLAG_XML_DOUBLE_QUOTES = 0x8 as AVEscapeFlag;

// AV_BPRINT_SIZE constants (from libavutil/bprint.h)
export type AVBPrintSize = number & { readonly [__ffmpeg_brand]: 'AVBPrintSize' };

export const AV_BPRINT_SIZE_AUTOMATIC = 1 as AVBPrintSize;
export const AV_BPRINT_SIZE_COUNT_ONLY = 0 as AVBPrintSize;

// AV_TIME_BASE constants (from libavutil/avutil.h)
export type AVTimeBase = number & { readonly [__ffmpeg_brand]: 'AVTimeBase' };

export const AV_TIME_BASE = 1000000 as AVTimeBase;

// AV_EF constants (from libavcodec/defs.h)
export type AVErrorFlags = number & { readonly [__ffmpeg_brand]: 'AVErrorFlags' };

export const AV_EF_CRCCHECK = 0x1 as AVErrorFlags;
export const AV_EF_BITSTREAM = 0x2 as AVErrorFlags;
export const AV_EF_BUFFER = 0x4 as AVErrorFlags;
export const AV_EF_EXPLODE = 0x8 as AVErrorFlags;
export const AV_EF_IGNORE_ERR = 0x8000 as AVErrorFlags;
export const AV_EF_CAREFUL = 0x10000 as AVErrorFlags;
export const AV_EF_COMPLIANT = 0x20000 as AVErrorFlags;
export const AV_EF_AGGRESSIVE = 0x40000 as AVErrorFlags;

// AVFILTER_FLAG constants (from libavfilter/avfilter.h)
export type AVFilterFlag = number & { readonly [__ffmpeg_brand]: 'AVFilterFlag' };

export const AVFILTER_FLAG_DYNAMIC_INPUTS = 0x1 as AVFilterFlag;
export const AVFILTER_FLAG_DYNAMIC_OUTPUTS = 0x2 as AVFilterFlag;
export const AVFILTER_FLAG_SLICE_THREADS = 0x4 as AVFilterFlag;
export const AVFILTER_FLAG_METADATA_ONLY = 0x8 as AVFilterFlag;
export const AVFILTER_FLAG_HWDEVICE = 0x10 as AVFilterFlag;
export const AVFILTER_FLAG_SUPPORT_TIMELINE_GENERIC = 0x10000 as AVFilterFlag;
export const AVFILTER_FLAG_SUPPORT_TIMELINE_INTERNAL = 0x20000 as AVFilterFlag;

// AVFILTER_CMD_FLAG constants (from libavfilter/avfilter.h)
export type AVFilterCmdFlag = number & { readonly [__ffmpeg_brand]: 'AVFilterCmdFlag' };

export const AVFILTER_CMD_FLAG_ONE = 1 as AVFilterCmdFlag;
export const AVFILTER_CMD_FLAG_FAST = 2 as AVFilterCmdFlag;

// AVFILTER constants (from libavfilter/avfilter.h, libavfilter/bufferqueue.h, libavfilter/buffersink.h...)
export type AVFilterConstants = number & { readonly [__ffmpeg_brand]: 'AVFilterConstants' };

export const AVFILTER_THREAD_SLICE = 0x1 as AVFilterConstants;

// AV_BUFFERSINK_FLAG constants (from libavfilter/buffersink.h)
export type AVBufferSinkFlag = number & { readonly [__ffmpeg_brand]: 'AVBufferSinkFlag' };

export const AV_BUFFERSINK_FLAG_PEEK = 1 as AVBufferSinkFlag;
export const AV_BUFFERSINK_FLAG_NO_REQUEST = 2 as AVBufferSinkFlag;

// AV_BUFFER_FLAG constants (from libavutil/buffer.h)
export type AVBufferFlag = number & { readonly [__ffmpeg_brand]: 'AVBufferFlag' };

export const AV_BUFFER_FLAG_READONLY = 0x1 as AVBufferFlag;

// AV_GET_BUFFER_FLAG constants (from libavcodec/avcodec.h)
export type AVGetBufferFlag = number & { readonly [__ffmpeg_brand]: 'AVGetBufferFlag' };

export const AV_GET_BUFFER_FLAG_REF = 0x1 as AVGetBufferFlag;

// AV_GET_ENCODE_BUFFER_FLAG constants (from libavcodec/avcodec.h)
export type AVGetEncodeBufferFlag = number & { readonly [__ffmpeg_brand]: 'AVGetEncodeBufferFlag' };

export const AV_GET_ENCODE_BUFFER_FLAG_REF = 0x1 as AVGetEncodeBufferFlag;

// AV_INPUT_BUFFER constants (from libavcodec/defs.h)
export type AVInputBuffer = number & { readonly [__ffmpeg_brand]: 'AVInputBuffer' };

export const AV_INPUT_BUFFER_PADDING_SIZE = 64 as AVInputBuffer;

// AV_FRAME_SIDE_DATA_FLAG constants (from libavutil/frame.h)
export type AVFrameSideDataFlag = number & { readonly [__ffmpeg_brand]: 'AVFrameSideDataFlag' };

export const AV_FRAME_SIDE_DATA_FLAG_UNIQUE = 0x1 as AVFrameSideDataFlag;
export const AV_FRAME_SIDE_DATA_FLAG_REPLACE = 0x2 as AVFrameSideDataFlag;
export const AV_FRAME_SIDE_DATA_FLAG_NEW_REF = 0x4 as AVFrameSideDataFlag;

// AV_FRAME_FILENAME_FLAGS constants (from libavformat/avformat.h)
export type AVFrameFilenameFlags = number & { readonly [__ffmpeg_brand]: 'AVFrameFilenameFlags' };

export const AV_FRAME_FILENAME_FLAGS_MULTIPLE = 1 as AVFrameFilenameFlags;
export const AV_FRAME_FILENAME_FLAGS_IGNORE_TRUNCATION = 2 as AVFrameFilenameFlags;

// AV_CUDA_USE constants (from libavutil/hwcontext_cuda.h)
export type AVCudaContextFlags = number & { readonly [__ffmpeg_brand]: 'AVCudaContextFlags' };

export const AV_CUDA_USE_PRIMARY_CONTEXT = 0x1 as AVCudaContextFlags;
export const AV_CUDA_USE_CURRENT_CONTEXT = 0x2 as AVCudaContextFlags;

// AV_STEREO3D_FLAG constants (from libavutil/stereo3d.h)
export type AVStereo3DFlag = number & { readonly [__ffmpeg_brand]: 'AVStereo3DFlag' };

export const AV_STEREO3D_FLAG_INVERT = 0x1 as AVStereo3DFlag;

// AV_FIFO_FLAG constants (from libavutil/fifo.h)
export type AVFifoFlag = number & { readonly [__ffmpeg_brand]: 'AVFifoFlag' };

export const AV_FIFO_FLAG_AUTO_GROW = 0x1 as AVFifoFlag;

// AV_LZO constants (from libavutil/lzo.h)
export type AVLZOResult = number & { readonly [__ffmpeg_brand]: 'AVLZOResult' };

export const AV_LZO_INPUT_DEPLETED = 1 as AVLZOResult;
export const AV_LZO_OUTPUT_FULL = 2 as AVLZOResult;
export const AV_LZO_INVALID_BACKPTR = 4 as AVLZOResult;
export const AV_LZO_ERROR = 8 as AVLZOResult;
export const AV_LZO_INPUT_PADDING = 8 as AVLZOResult;
export const AV_LZO_OUTPUT_PADDING = 12 as AVLZOResult;

// AV_SUBTITLE_FLAG constants (from libavcodec/avcodec.h)
export type AVSubtitleFlag = number & { readonly [__ffmpeg_brand]: 'AVSubtitleFlag' };

export const AV_SUBTITLE_FLAG_FORCED = 1 as AVSubtitleFlag;

// AV_PTS_WRAP constants (from libavformat/avformat.h)
export type AVPTSWrap = number & { readonly [__ffmpeg_brand]: 'AVPTSWrap' };

export const AV_PTS_WRAP_IGNORE = 0 as AVPTSWrap;
export const AV_PTS_WRAP_ADD_OFFSET = 1 as AVPTSWrap;
export const AV_PTS_WRAP_SUB_OFFSET = -1 as AVPTSWrap;

// AV_HAVE constants (from libavutil/avconfig.h)
export type AVHave = number & { readonly [__ffmpeg_brand]: 'AVHave' };

export const AV_HAVE_BIGENDIAN = 0 as AVHave;

// AV_UTF8_FLAG constants (from libavutil/avstring.h)
export type AVUTF8Flag = number & { readonly [__ffmpeg_brand]: 'AVUTF8Flag' };

export const AV_UTF8_FLAG_ACCEPT_INVALID_BIG_CODES = 1 as AVUTF8Flag;
export const AV_UTF8_FLAG_ACCEPT_NON_CHARACTERS = 2 as AVUTF8Flag;
export const AV_UTF8_FLAG_ACCEPT_SURROGATES = 4 as AVUTF8Flag;
export const AV_UTF8_FLAG_EXCLUDE_XML_INVALID_CONTROL_CODES = 8 as AVUTF8Flag;

// AV_AAC_ADTS constants (from libavcodec/adts_parser.h)
export type AVAACConstants = number & { readonly [__ffmpeg_brand]: 'AVAACConstants' };

export const AV_AAC_ADTS_HEADER_SIZE = 7 as AVAACConstants;

// AV_LEVEL constants (from libavcodec/defs.h)
export type AVLevelConstants = number & { readonly [__ffmpeg_brand]: 'AVLevelConstants' };

export const AV_LEVEL_UNKNOWN = -99 as AVLevelConstants;

// SWS constants (from libswscale/ops_chain.h, libswscale/swscale.h, libswscale/swscale_internal.h)
export type SWSFlag = number & { readonly [__ffmpeg_brand]: 'SWSFlag' };

export const SWS_MAX_OPS = 16 as SWSFlag;
export const SWS_SRC_V_CHR_DROP_MASK = 196608 as SWSFlag;
export const SWS_SRC_V_CHR_DROP_SHIFT = 16 as SWSFlag;
export const SWS_PARAM_DEFAULT = 123456 as SWSFlag;
export const SWS_CS_ITU709 = 1 as SWSFlag;
export const SWS_CS_FCC = 4 as SWSFlag;
export const SWS_CS_ITU601 = 5 as SWSFlag;
export const SWS_CS_ITU624 = 5 as SWSFlag;
export const SWS_CS_SMPTE170M = 5 as SWSFlag;
export const SWS_CS_SMPTE240M = 7 as SWSFlag;
export const SWS_CS_DEFAULT = 5 as SWSFlag;
export const SWS_CS_BT2020 = 9 as SWSFlag;
export const SWS_MAX_THREADS = 8192 as SWSFlag;

// SWR constants (from libswresample/swresample.h, libswresample/swresample_internal.h)
export type SWRFlag = number & { readonly [__ffmpeg_brand]: 'SWRFlag' };

export const SWR_FLAG_RESAMPLE = 1 as SWRFlag;
export const SWR_CH_MAX = 64 as SWRFlag;

// FF_THREAD constants (from libavcodec/avcodec.h)
export type AVThreadType = number & { readonly [__ffmpeg_brand]: 'AVThreadType' };

export const FF_THREAD_FRAME = 1 as AVThreadType;
export const FF_THREAD_SLICE = 2 as AVThreadType;

// ============================================================================
// AV_CODEC_HW_CONFIG_METHOD - Hardware configuration methods
// ============================================================================

export const AV_CODEC_HW_CONFIG_METHOD_HW_DEVICE_CTX = 0x01;
export const AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX = 0x02;
export const AV_CODEC_HW_CONFIG_METHOD_INTERNAL = 0x04;
export const AV_CODEC_HW_CONFIG_METHOD_AD_HOC = 0x08;

// Error codes
export type AVError = number & { readonly [__ffmpeg_brand]: 'AVError' };

export const AVERROR_BSF_NOT_FOUND = -1179861752 as AVError;
export const AVERROR_BUG = -558323010 as AVError;
export const AVERROR_BUFFER_TOO_SMALL = -1397118274 as AVError;
export const AVERROR_DECODER_NOT_FOUND = -1128613112 as AVError;
export const AVERROR_DEMUXER_NOT_FOUND = -1296385272 as AVError;
export const AVERROR_ENCODER_NOT_FOUND = -1129203192 as AVError;
export const AVERROR_EOF = -541478725 as AVError;
export const AVERROR_EXIT = -1414092869 as AVError;
export const AVERROR_EXTERNAL = -542398533 as AVError;
export const AVERROR_FILTER_NOT_FOUND = -1279870712 as AVError;
export const AVERROR_INVALIDDATA = -1094995529 as AVError;
export const AVERROR_MUXER_NOT_FOUND = -1481985528 as AVError;
export const AVERROR_OPTION_NOT_FOUND = -1414549496 as AVError;
export const AVERROR_PATCHWELCOME = -1163346256 as AVError;
export const AVERROR_PROTOCOL_NOT_FOUND = -1330794744 as AVError;
export const AVERROR_STREAM_NOT_FOUND = -1381258232 as AVError;
export const AVERROR_BUG2 = -541545794 as AVError;
export const AVERROR_UNKNOWN = -1313558101 as AVError;
export const AVERROR_HTTP_BAD_REQUEST = -808465656 as AVError;
export const AVERROR_HTTP_UNAUTHORIZED = -825242872 as AVError;
export const AVERROR_HTTP_FORBIDDEN = -858797304 as AVError;
export const AVERROR_HTTP_NOT_FOUND = -875574520 as AVError;
export const AVERROR_HTTP_TOO_MANY_REQUESTS = -959591672 as AVError;
export const AVERROR_HTTP_OTHER_4XX = -1482175736 as AVError;
export const AVERROR_HTTP_SERVER_ERROR = -1482175992 as AVError;
export const AVERROR_EXPERIMENTAL = -733130664 as AVError;
export const AVERROR_INPUT_CHANGED = -1668179713 as AVError;
export const AVERROR_OUTPUT_CHANGED = -1668179714 as AVError;

// Re-exported FFmpeg errors
export {
  AVERROR_EACCES,
  AVERROR_EAGAIN,
  AVERROR_EBUSY,
  AVERROR_EEXIST,
  AVERROR_EINVAL,
  AVERROR_EIO,
  AVERROR_EISDIR,
  AVERROR_EMFILE,
  AVERROR_ENODEV,
  AVERROR_ENOENT,
  AVERROR_ENOMEM,
  AVERROR_ENOSPC,
  AVERROR_ENOTDIR,
  AVERROR_EPERM,
  AVERROR_EPIPE,
  AVERROR_ERANGE,
} from '../lib/error.js';

// Special time constants
export const AV_TIME_BASE_Q: IRational = { num: 1, den: AV_TIME_BASE };
export const AV_NOPTS_VALUE = -9223372036854775808n; // INT64_MIN

// Integer limit constants (from C stdint.h/limits.h)
// These are platform-independent fixed values for standard integer types
export const INT8_MIN = -128; // -(2^7)
export const INT8_MAX = 127; // 2^7 - 1
export const UINT8_MAX = 255; // 2^8 - 1
export const INT16_MIN = -32768; // -(2^15)
export const INT16_MAX = 32767; // 2^15 - 1
export const UINT16_MAX = 65535; // 2^16 - 1
export const INT32_MIN = -2147483648; // -(2^31)
export const INT32_MAX = 2147483647; // 2^31 - 1
export const UINT32_MAX = 4294967295; // 2^32 - 1
export const INT64_MIN = -9223372036854775808n; // -(2^63) as BigInt
export const INT64_MAX = 9223372036854775807n; // 2^63 - 1 as BigInt
export const UINT64_MAX = 18446744073709551615n; // 2^64 - 1 as BigInt

// Legacy C type limits (these map to the above based on typical platform sizes)
export const INT_MIN = INT32_MIN; // Typically 32-bit on modern systems
export const INT_MAX = INT32_MAX; // Typically 32-bit on modern systems
export const UINT_MAX = UINT32_MAX; // Typically 32-bit on modern systems
export const LONG_MIN = INT64_MIN; // 64-bit on 64-bit systems, 32-bit on 32-bit systems
export const LONG_MAX = INT64_MAX; // 64-bit on 64-bit systems, 32-bit on 32-bit systems
export const ULONG_MAX = UINT64_MAX; // 64-bit on 64-bit systems, 32-bit on 32-bit systems

// Helper function to cast numbers to branded types
export function cast<T>(value: number): T {
  return value as T;
}
