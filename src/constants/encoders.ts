/**
 * Auto-generated FFmpeg encoder constants
 * Generated from FFmpeg source code (allcodecs.c)
 * DO NOT EDIT MANUALLY
 */

import type { CodecContextOptions, EncoderOptionsMap } from './options.js';

// Brand symbols for type safety
declare const __codec_brand: unique symbol;
declare const __codec_name: unique symbol;

// Base encoder type. The optional name parameter carries the codec's literal
// name as a phantom property, enabling codec-specific option typing
// (see EncoderOptionsMap) while the runtime value stays a plain string.
export type FFEncoderCodec<N extends string = string> = string & { readonly [__codec_brand]: 'encoder'; readonly [__codec_name]: N };

// Specific encoder types by media type
export type FFVideoEncoder<N extends string = string> = FFEncoderCodec<N> & { readonly __type: 'video' };
export type FFAudioEncoder<N extends string = string> = FFEncoderCodec<N> & { readonly __type: 'audio' };
export type FFSubtitleEncoder<N extends string = string> = FFEncoderCodec<N> & { readonly __type: 'subtitle' };

/**
 * Loose option bag for codecs without generated option typings
 * (hardware codecs, codecs passed by AVCodecID/Codec, or plain strings).
 */
export type UnknownEncoderOptions = Record<string, string | number | boolean | undefined | null>;

/** Resolve a codec's literal name from its phantom brand, or `never` if unbranded. */
export type EncoderNameOf<C> = C extends FFEncoderCodec<infer N> ? N : never;

/**
 * Resolve the codec-specific private options for an encoder codec.
 *
 * Returns the strongly-typed option set when the codec name is known
 * (enables autocomplete and rejects invalid keys/values), otherwise falls
 * back to {@link UnknownEncoderOptions}.
 */
export type EncoderOptionsFor<C> = [EncoderNameOf<C>] extends [never]
  ? UnknownEncoderOptions
  : EncoderNameOf<C> extends keyof EncoderOptionsMap
    ? Omit<CodecContextOptions, keyof EncoderOptionsMap[EncoderNameOf<C>]> & EncoderOptionsMap[EncoderNameOf<C>]
    : UnknownEncoderOptions;

// ============================================================================
// VIDEO ENCODERS (137 software, 45 hardware)
// ============================================================================

// Software video encoders
export const FF_ENCODER_A64MULTI = 'a64multi' as FFVideoEncoder<'a64multi'>;
export const FF_ENCODER_A64MULTI5 = 'a64multi5' as FFVideoEncoder<'a64multi5'>;
export const FF_ENCODER_ALIAS_PIX = 'alias_pix' as FFVideoEncoder<'alias_pix'>;
export const FF_ENCODER_AMV = 'amv' as FFVideoEncoder<'amv'>;
export const FF_ENCODER_ANULL = 'anull' as FFVideoEncoder<'anull'>;
export const FF_ENCODER_APNG = 'apng' as FFVideoEncoder<'apng'>;
export const FF_ENCODER_ASV1 = 'asv1' as FFVideoEncoder<'asv1'>;
export const FF_ENCODER_ASV2 = 'asv2' as FFVideoEncoder<'asv2'>;
export const FF_ENCODER_AV1_VULKAN = 'av1_vulkan' as FFVideoEncoder<'av1_vulkan'>;
export const FF_ENCODER_AVRP = 'avrp' as FFVideoEncoder<'avrp'>;
export const FF_ENCODER_AVUI = 'avui' as FFVideoEncoder<'avui'>;
export const FF_ENCODER_BITPACKED = 'bitpacked' as FFVideoEncoder<'bitpacked'>;
export const FF_ENCODER_BMP = 'bmp' as FFVideoEncoder<'bmp'>;
export const FF_ENCODER_CFHD = 'cfhd' as FFVideoEncoder<'cfhd'>;
export const FF_ENCODER_CINEPAK = 'cinepak' as FFVideoEncoder<'cinepak'>;
export const FF_ENCODER_CLJR = 'cljr' as FFVideoEncoder<'cljr'>;
export const FF_ENCODER_DNXHD = 'dnxhd' as FFVideoEncoder<'dnxhd'>;
export const FF_ENCODER_DPX = 'dpx' as FFVideoEncoder<'dpx'>;
export const FF_ENCODER_DVVIDEO = 'dvvideo' as FFVideoEncoder<'dvvideo'>;
export const FF_ENCODER_DXV = 'dxv' as FFVideoEncoder<'dxv'>;
export const FF_ENCODER_EXR = 'exr' as FFVideoEncoder<'exr'>;
export const FF_ENCODER_FFV1 = 'ffv1' as FFVideoEncoder<'ffv1'>;
export const FF_ENCODER_FFV1_VULKAN = 'ffv1_vulkan' as FFVideoEncoder<'ffv1_vulkan'>;
export const FF_ENCODER_FFVHUFF = 'ffvhuff' as FFVideoEncoder<'ffvhuff'>;
export const FF_ENCODER_FITS = 'fits' as FFVideoEncoder<'fits'>;
export const FF_ENCODER_FLASHSV = 'flashsv' as FFVideoEncoder<'flashsv'>;
export const FF_ENCODER_FLASHSV2 = 'flashsv2' as FFVideoEncoder<'flashsv2'>;
export const FF_ENCODER_FLV = 'flv' as FFVideoEncoder<'flv'>;
export const FF_ENCODER_GIF = 'gif' as FFVideoEncoder<'gif'>;
export const FF_ENCODER_H261 = 'h261' as FFVideoEncoder<'h261'>;
export const FF_ENCODER_H263 = 'h263' as FFVideoEncoder<'h263'>;
export const FF_ENCODER_H263P = 'h263p' as FFVideoEncoder<'h263p'>;
export const FF_ENCODER_H264_OH = 'h264_oh' as FFVideoEncoder<'h264_oh'>;
export const FF_ENCODER_H264_VULKAN = 'h264_vulkan' as FFVideoEncoder<'h264_vulkan'>;
export const FF_ENCODER_HAP = 'hap' as FFVideoEncoder<'hap'>;
export const FF_ENCODER_HDR = 'hdr' as FFVideoEncoder<'hdr'>;
export const FF_ENCODER_HEVC_OH = 'hevc_oh' as FFVideoEncoder<'hevc_oh'>;
export const FF_ENCODER_HEVC_VULKAN = 'hevc_vulkan' as FFVideoEncoder<'hevc_vulkan'>;
export const FF_ENCODER_HUFFYUV = 'huffyuv' as FFVideoEncoder<'huffyuv'>;
export const FF_ENCODER_JPEG2000 = 'jpeg2000' as FFVideoEncoder<'jpeg2000'>;
export const FF_ENCODER_JPEGLS = 'jpegls' as FFVideoEncoder<'jpegls'>;
export const FF_ENCODER_LIBAOM_AV1 = 'libaom-av1' as FFVideoEncoder<'libaom-av1'>;
export const FF_ENCODER_LIBCODEC2 = 'libcodec2' as FFVideoEncoder<'libcodec2'>;
export const FF_ENCODER_LIBGSM = 'libgsm' as FFVideoEncoder<'libgsm'>;
export const FF_ENCODER_LIBGSM_MS = 'libgsm_ms' as FFVideoEncoder<'libgsm_ms'>;
export const FF_ENCODER_LIBILBC = 'libilbc' as FFVideoEncoder<'libilbc'>;
export const FF_ENCODER_LIBJXL = 'libjxl' as FFVideoEncoder<'libjxl'>;
export const FF_ENCODER_LIBJXL_ANIM = 'libjxl_anim' as FFVideoEncoder<'libjxl_anim'>;
export const FF_ENCODER_LIBKVAZAAR = 'libkvazaar' as FFVideoEncoder<'libkvazaar'>;
export const FF_ENCODER_LIBLC3 = 'liblc3' as FFVideoEncoder<'liblc3'>;
export const FF_ENCODER_LIBOAPV = 'liboapv' as FFVideoEncoder<'liboapv'>;
export const FF_ENCODER_LIBOPENCORE_AMRNB = 'libopencore_amrnb' as FFVideoEncoder<'libopencore_amrnb'>;
export const FF_ENCODER_LIBOPENH264 = 'libopenh264' as FFVideoEncoder<'libopenh264'>;
export const FF_ENCODER_LIBOPENJPEG = 'libopenjpeg' as FFVideoEncoder<'libopenjpeg'>;
export const FF_ENCODER_LIBRAV1E = 'librav1e' as FFVideoEncoder<'librav1e'>;
export const FF_ENCODER_LIBSHINE = 'libshine' as FFVideoEncoder<'libshine'>;
export const FF_ENCODER_LIBSVTAV1 = 'libsvtav1' as FFVideoEncoder<'libsvtav1'>;
export const FF_ENCODER_LIBSVTJPEGXS = 'libsvtjpegxs' as FFVideoEncoder<'libsvtjpegxs'>;
export const FF_ENCODER_LIBTHEORA = 'libtheora' as FFVideoEncoder<'libtheora'>;
export const FF_ENCODER_LIBTWOLAME = 'libtwolame' as FFVideoEncoder<'libtwolame'>;
export const FF_ENCODER_LIBVO_AMRWBENC = 'libvo_amrwbenc' as FFVideoEncoder<'libvo_amrwbenc'>;
export const FF_ENCODER_LIBVPX_VP8 = 'libvpx' as FFVideoEncoder<'libvpx'>;
export const FF_ENCODER_LIBVPX_VP9 = 'libvpx-vp9' as FFVideoEncoder<'libvpx-vp9'>;
export const FF_ENCODER_LIBVVENC = 'libvvenc' as FFVideoEncoder<'libvvenc'>;
export const FF_ENCODER_LIBWEBP = 'libwebp' as FFVideoEncoder<'libwebp'>;
export const FF_ENCODER_LIBWEBP_ANIM = 'libwebp_anim' as FFVideoEncoder<'libwebp_anim'>;
export const FF_ENCODER_LIBX262 = 'libx262' as FFVideoEncoder<'libx262'>;
export const FF_ENCODER_LIBX264 = 'libx264' as FFVideoEncoder<'libx264'>;
export const FF_ENCODER_LIBX264RGB = 'libx264rgb' as FFVideoEncoder<'libx264rgb'>;
export const FF_ENCODER_LIBX265 = 'libx265' as FFVideoEncoder<'libx265'>;
export const FF_ENCODER_LIBXAVS = 'libxavs' as FFVideoEncoder<'libxavs'>;
export const FF_ENCODER_LIBXAVS2 = 'libxavs2' as FFVideoEncoder<'libxavs2'>;
export const FF_ENCODER_LIBXEVE = 'libxeve' as FFVideoEncoder<'libxeve'>;
export const FF_ENCODER_LIBXVID = 'libxvid' as FFVideoEncoder<'libxvid'>;
export const FF_ENCODER_LJPEG = 'ljpeg' as FFVideoEncoder<'ljpeg'>;
export const FF_ENCODER_MAGICYUV = 'magicyuv' as FFVideoEncoder<'magicyuv'>;
export const FF_ENCODER_MJPEG = 'mjpeg' as FFVideoEncoder<'mjpeg'>;
export const FF_ENCODER_MOVTEXT = 'mov_text' as FFVideoEncoder<'mov_text'>;
export const FF_ENCODER_MPEG1VIDEO = 'mpeg1video' as FFVideoEncoder<'mpeg1video'>;
export const FF_ENCODER_MPEG2VIDEO = 'mpeg2video' as FFVideoEncoder<'mpeg2video'>;
export const FF_ENCODER_MPEG4 = 'mpeg4' as FFVideoEncoder<'mpeg4'>;
export const FF_ENCODER_MSMPEG4V2 = 'msmpeg4v2' as FFVideoEncoder<'msmpeg4v2'>;
export const FF_ENCODER_MSMPEG4V3 = 'msmpeg4' as FFVideoEncoder<'msmpeg4'>;
export const FF_ENCODER_MSRLE = 'msrle' as FFVideoEncoder<'msrle'>;
export const FF_ENCODER_MSVIDEO1 = 'msvideo1' as FFVideoEncoder<'msvideo1'>;
export const FF_ENCODER_PAM = 'pam' as FFVideoEncoder<'pam'>;
export const FF_ENCODER_PBM = 'pbm' as FFVideoEncoder<'pbm'>;
export const FF_ENCODER_PCX = 'pcx' as FFVideoEncoder<'pcx'>;
export const FF_ENCODER_PDV = 'pdv' as FFVideoEncoder<'pdv'>;
export const FF_ENCODER_PFM = 'pfm' as FFVideoEncoder<'pfm'>;
export const FF_ENCODER_PGM = 'pgm' as FFVideoEncoder<'pgm'>;
export const FF_ENCODER_PGMYUV = 'pgmyuv' as FFVideoEncoder<'pgmyuv'>;
export const FF_ENCODER_PHM = 'phm' as FFVideoEncoder<'phm'>;
export const FF_ENCODER_PNG = 'png' as FFVideoEncoder<'png'>;
export const FF_ENCODER_PPM = 'ppm' as FFVideoEncoder<'ppm'>;
export const FF_ENCODER_PRORES = 'prores' as FFVideoEncoder<'prores'>;
export const FF_ENCODER_PRORES_AW = 'prores_aw' as FFVideoEncoder<'prores_aw'>;
export const FF_ENCODER_PRORES_KS = 'prores_ks' as FFVideoEncoder<'prores_ks'>;
export const FF_ENCODER_PRORES_KS_VULKAN = 'prores_ks_vulkan' as FFVideoEncoder<'prores_ks_vulkan'>;
export const FF_ENCODER_QOI = 'qoi' as FFVideoEncoder<'qoi'>;
export const FF_ENCODER_QTRLE = 'qtrle' as FFVideoEncoder<'qtrle'>;
export const FF_ENCODER_R10K = 'r10k' as FFVideoEncoder<'r10k'>;
export const FF_ENCODER_R210 = 'r210' as FFVideoEncoder<'r210'>;
export const FF_ENCODER_RA_144 = 'real_144' as FFVideoEncoder<'real_144'>;
export const FF_ENCODER_RAWVIDEO = 'rawvideo' as FFVideoEncoder<'rawvideo'>;
export const FF_ENCODER_ROQ = 'roqvideo' as FFVideoEncoder<'roqvideo'>;
export const FF_ENCODER_ROQ_DPCM = 'roq_dpcm' as FFVideoEncoder<'roq_dpcm'>;
export const FF_ENCODER_RPZA = 'rpza' as FFVideoEncoder<'rpza'>;
export const FF_ENCODER_RV10 = 'rv10' as FFVideoEncoder<'rv10'>;
export const FF_ENCODER_RV20 = 'rv20' as FFVideoEncoder<'rv20'>;
export const FF_ENCODER_SGI = 'sgi' as FFVideoEncoder<'sgi'>;
export const FF_ENCODER_SMC = 'smc' as FFVideoEncoder<'smc'>;
export const FF_ENCODER_SNOW = 'snow' as FFVideoEncoder<'snow'>;
export const FF_ENCODER_SPEEDHQ = 'speedhq' as FFVideoEncoder<'speedhq'>;
export const FF_ENCODER_SUNRAST = 'sunrast' as FFVideoEncoder<'sunrast'>;
export const FF_ENCODER_SVQ1 = 'svq1' as FFVideoEncoder<'svq1'>;
export const FF_ENCODER_TARGA = 'targa' as FFVideoEncoder<'targa'>;
export const FF_ENCODER_TIFF = 'tiff' as FFVideoEncoder<'tiff'>;
export const FF_ENCODER_UTVIDEO = 'utvideo' as FFVideoEncoder<'utvideo'>;
export const FF_ENCODER_V210 = 'v210' as FFVideoEncoder<'v210'>;
export const FF_ENCODER_V308 = 'v308' as FFVideoEncoder<'v308'>;
export const FF_ENCODER_V408 = 'v408' as FFVideoEncoder<'v408'>;
export const FF_ENCODER_V410 = 'v410' as FFVideoEncoder<'v410'>;
export const FF_ENCODER_VBN = 'vbn' as FFVideoEncoder<'vbn'>;
export const FF_ENCODER_VC2 = 'vc2' as FFVideoEncoder<'vc2'>;
export const FF_ENCODER_VNULL = 'vnull' as FFVideoEncoder<'vnull'>;
export const FF_ENCODER_WBMP = 'wbmp' as FFVideoEncoder<'wbmp'>;
export const FF_ENCODER_WMV1 = 'wmv1' as FFVideoEncoder<'wmv1'>;
export const FF_ENCODER_WMV2 = 'wmv2' as FFVideoEncoder<'wmv2'>;
export const FF_ENCODER_WRAPPED_AVFRAME = 'wrapped_avframe' as FFVideoEncoder<'wrapped_avframe'>;
export const FF_ENCODER_XBM = 'xbm' as FFVideoEncoder<'xbm'>;
export const FF_ENCODER_XFACE = 'xface' as FFVideoEncoder<'xface'>;
export const FF_ENCODER_XWD = 'xwd' as FFVideoEncoder<'xwd'>;
export const FF_ENCODER_Y41P = 'y41p' as FFVideoEncoder<'y41p'>;
export const FF_ENCODER_YUV4 = 'yuv4' as FFVideoEncoder<'yuv4'>;
export const FF_ENCODER_ZLIB = 'zlib' as FFVideoEncoder<'zlib'>;
export const FF_ENCODER_ZMBV = 'zmbv' as FFVideoEncoder<'zmbv'>;

// Hardware video encoders

// AMD AMF
export const FF_ENCODER_AV1_AMF = 'av1_amf' as FFVideoEncoder<'av1_amf'>;
export const FF_ENCODER_H264_AMF = 'h264_amf' as FFVideoEncoder<'h264_amf'>;
export const FF_ENCODER_HEVC_AMF = 'hevc_amf' as FFVideoEncoder<'hevc_amf'>;

// Direct3D 12
export const FF_ENCODER_AV1_D3D12VA = 'av1_d3d12va' as FFVideoEncoder<'av1_d3d12va'>;
export const FF_ENCODER_H264_D3D12VA = 'h264_d3d12va' as FFVideoEncoder<'h264_d3d12va'>;
export const FF_ENCODER_HEVC_D3D12VA = 'hevc_d3d12va' as FFVideoEncoder<'hevc_d3d12va'>;

// Android MediaCodec
export const FF_ENCODER_AV1_MEDIACODEC = 'av1_mediacodec' as FFVideoEncoder<'av1_mediacodec'>;
export const FF_ENCODER_H264_MEDIACODEC = 'h264_mediacodec' as FFVideoEncoder<'h264_mediacodec'>;
export const FF_ENCODER_HEVC_MEDIACODEC = 'hevc_mediacodec' as FFVideoEncoder<'hevc_mediacodec'>;
export const FF_ENCODER_MPEG4_MEDIACODEC = 'mpeg4_mediacodec' as FFVideoEncoder<'mpeg4_mediacodec'>;
export const FF_ENCODER_VP8_MEDIACODEC = 'vp8_mediacodec' as FFVideoEncoder<'vp8_mediacodec'>;
export const FF_ENCODER_VP9_MEDIACODEC = 'vp9_mediacodec' as FFVideoEncoder<'vp9_mediacodec'>;

// Media Foundation
export const FF_ENCODER_AV1_MF = 'av1_mf' as FFVideoEncoder<'av1_mf'>;
export const FF_ENCODER_H264_MF = 'h264_mf' as FFVideoEncoder<'h264_mf'>;
export const FF_ENCODER_HEVC_MF = 'hevc_mf' as FFVideoEncoder<'hevc_mf'>;

// NVIDIA NVENC
export const FF_ENCODER_AV1_NVENC = 'av1_nvenc' as FFVideoEncoder<'av1_nvenc'>;
export const FF_ENCODER_H264_NVENC = 'h264_nvenc' as FFVideoEncoder<'h264_nvenc'>;
export const FF_ENCODER_HEVC_NVENC = 'hevc_nvenc' as FFVideoEncoder<'hevc_nvenc'>;

// Intel Quick Sync
export const FF_ENCODER_AV1_QSV = 'av1_qsv' as FFVideoEncoder<'av1_qsv'>;
export const FF_ENCODER_H264_QSV = 'h264_qsv' as FFVideoEncoder<'h264_qsv'>;
export const FF_ENCODER_HEVC_QSV = 'hevc_qsv' as FFVideoEncoder<'hevc_qsv'>;
export const FF_ENCODER_MJPEG_QSV = 'mjpeg_qsv' as FFVideoEncoder<'mjpeg_qsv'>;
export const FF_ENCODER_MPEG2_QSV = 'mpeg2_qsv' as FFVideoEncoder<'mpeg2_qsv'>;
export const FF_ENCODER_VP9_QSV = 'vp9_qsv' as FFVideoEncoder<'vp9_qsv'>;

// VA-API
export const FF_ENCODER_AV1_VAAPI = 'av1_vaapi' as FFVideoEncoder<'av1_vaapi'>;
export const FF_ENCODER_H264_VAAPI = 'h264_vaapi' as FFVideoEncoder<'h264_vaapi'>;
export const FF_ENCODER_HEVC_VAAPI = 'hevc_vaapi' as FFVideoEncoder<'hevc_vaapi'>;
export const FF_ENCODER_MJPEG_VAAPI = 'mjpeg_vaapi' as FFVideoEncoder<'mjpeg_vaapi'>;
export const FF_ENCODER_MPEG2_VAAPI = 'mpeg2_vaapi' as FFVideoEncoder<'mpeg2_vaapi'>;
export const FF_ENCODER_VP8_VAAPI = 'vp8_vaapi' as FFVideoEncoder<'vp8_vaapi'>;
export const FF_ENCODER_VP9_VAAPI = 'vp9_vaapi' as FFVideoEncoder<'vp9_vaapi'>;

// V4L2 M2M
export const FF_ENCODER_H263_V4L2M2M = 'h263_v4l2m2m' as FFVideoEncoder<'h263_v4l2m2m'>;
export const FF_ENCODER_H264_V4L2M2M = 'h264_v4l2m2m' as FFVideoEncoder<'h264_v4l2m2m'>;
export const FF_ENCODER_HEVC_V4L2M2M = 'hevc_v4l2m2m' as FFVideoEncoder<'hevc_v4l2m2m'>;
export const FF_ENCODER_MPEG4_V4L2M2M = 'mpeg4_v4l2m2m' as FFVideoEncoder<'mpeg4_v4l2m2m'>;
export const FF_ENCODER_VP8_V4L2M2M = 'vp8_v4l2m2m' as FFVideoEncoder<'vp8_v4l2m2m'>;

// OpenMAX
export const FF_ENCODER_H264_OMX = 'h264_omx' as FFVideoEncoder<'h264_omx'>;
export const FF_ENCODER_MPEG4_OMX = 'mpeg4_omx' as FFVideoEncoder<'mpeg4_omx'>;

// Rockchip MPP
export const FF_ENCODER_H264_RKMPP = 'h264_rkmpp' as FFVideoEncoder<'h264_rkmpp'>;
export const FF_ENCODER_HEVC_RKMPP = 'hevc_rkmpp' as FFVideoEncoder<'hevc_rkmpp'>;
export const FF_ENCODER_MJPEG_RKMPP = 'mjpeg_rkmpp' as FFVideoEncoder<'mjpeg_rkmpp'>;

// VideoToolbox (macOS)
export const FF_ENCODER_H264_VIDEOTOOLBOX = 'h264_videotoolbox' as FFVideoEncoder<'h264_videotoolbox'>;
export const FF_ENCODER_HEVC_VIDEOTOOLBOX = 'hevc_videotoolbox' as FFVideoEncoder<'hevc_videotoolbox'>;
export const FF_ENCODER_MJPEG_VIDEOTOOLBOX = 'mjpeg_videotoolbox' as FFVideoEncoder<'mjpeg_videotoolbox'>;
export const FF_ENCODER_PRORES_VIDEOTOOLBOX = 'prores_videotoolbox' as FFVideoEncoder<'prores_videotoolbox'>;

// ============================================================================
// AUDIO ENCODERS (78 software, 8 hardware)
// ============================================================================

// Software audio encoders
export const FF_ENCODER_AAC = 'aac' as FFAudioEncoder<'aac'>;
export const FF_ENCODER_AC3 = 'ac3' as FFAudioEncoder<'ac3'>;
export const FF_ENCODER_AC3_FIXED = 'ac3_fixed' as FFAudioEncoder<'ac3_fixed'>;
export const FF_ENCODER_ADPCM_ADX = 'adpcm_adx' as FFAudioEncoder<'adpcm_adx'>;
export const FF_ENCODER_ADPCM_ARGO = 'adpcm_argo' as FFAudioEncoder<'adpcm_argo'>;
export const FF_ENCODER_ADPCM_G722 = 'g722' as FFAudioEncoder<'g722'>;
export const FF_ENCODER_ADPCM_G726 = 'g726' as FFAudioEncoder<'g726'>;
export const FF_ENCODER_ADPCM_G726LE = 'g726le' as FFAudioEncoder<'g726le'>;
export const FF_ENCODER_ADPCM_IMA_ALP = 'adpcm_ima_alp' as FFAudioEncoder<'adpcm_ima_alp'>;
export const FF_ENCODER_ADPCM_IMA_AMV = 'adpcm_ima_amv' as FFAudioEncoder<'adpcm_ima_amv'>;
export const FF_ENCODER_ADPCM_IMA_APM = 'adpcm_ima_apm' as FFAudioEncoder<'adpcm_ima_apm'>;
export const FF_ENCODER_ADPCM_IMA_QT = 'adpcm_ima_qt' as FFAudioEncoder<'adpcm_ima_qt'>;
export const FF_ENCODER_ADPCM_IMA_SSI = 'adpcm_ima_ssi' as FFAudioEncoder<'adpcm_ima_ssi'>;
export const FF_ENCODER_ADPCM_IMA_WAV = 'adpcm_ima_wav' as FFAudioEncoder<'adpcm_ima_wav'>;
export const FF_ENCODER_ADPCM_IMA_WS = 'adpcm_ima_ws' as FFAudioEncoder<'adpcm_ima_ws'>;
export const FF_ENCODER_ADPCM_MS = 'adpcm_ms' as FFAudioEncoder<'adpcm_ms'>;
export const FF_ENCODER_ADPCM_SWF = 'adpcm_swf' as FFAudioEncoder<'adpcm_swf'>;
export const FF_ENCODER_ADPCM_YAMAHA = 'adpcm_yamaha' as FFAudioEncoder<'adpcm_yamaha'>;
export const FF_ENCODER_ALAC = 'alac' as FFAudioEncoder<'alac'>;
export const FF_ENCODER_APTX = 'aptx' as FFAudioEncoder<'aptx'>;
export const FF_ENCODER_APTX_HD = 'aptx_hd' as FFAudioEncoder<'aptx_hd'>;
export const FF_ENCODER_COMFORTNOISE = 'comfortnoise' as FFAudioEncoder<'comfortnoise'>;
export const FF_ENCODER_DCA = 'dca' as FFAudioEncoder<'dca'>;
export const FF_ENCODER_DFPWM = 'dfpwm' as FFAudioEncoder<'dfpwm'>;
export const FF_ENCODER_EAC3 = 'eac3' as FFAudioEncoder<'eac3'>;
export const FF_ENCODER_FLAC = 'flac' as FFAudioEncoder<'flac'>;
export const FF_ENCODER_G723_1 = 'g723_1' as FFAudioEncoder<'g723_1'>;
export const FF_ENCODER_LIBFDK_AAC = 'libfdk_aac' as FFAudioEncoder<'libfdk_aac'>;
export const FF_ENCODER_LIBMP3LAME = 'libmp3lame' as FFAudioEncoder<'libmp3lame'>;
export const FF_ENCODER_LIBOPUS = 'libopus' as FFAudioEncoder<'libopus'>;
export const FF_ENCODER_LIBSPEEX = 'libspeex' as FFAudioEncoder<'libspeex'>;
export const FF_ENCODER_LIBVORBIS = 'libvorbis' as FFAudioEncoder<'libvorbis'>;
export const FF_ENCODER_MLP = 'mlp' as FFAudioEncoder<'mlp'>;
export const FF_ENCODER_MP2 = 'mp2' as FFAudioEncoder<'mp2'>;
export const FF_ENCODER_MP2FIXED = 'mp2fixed' as FFAudioEncoder<'mp2fixed'>;
export const FF_ENCODER_NELLYMOSER = 'nellymoser' as FFAudioEncoder<'nellymoser'>;
export const FF_ENCODER_OPUS = 'opus' as FFAudioEncoder<'opus'>;
export const FF_ENCODER_PCM_ALAW = 'pcm_alaw' as FFAudioEncoder<'pcm_alaw'>;
export const FF_ENCODER_PCM_BLURAY = 'pcm_bluray' as FFAudioEncoder<'pcm_bluray'>;
export const FF_ENCODER_PCM_DVD = 'pcm_dvd' as FFAudioEncoder<'pcm_dvd'>;
export const FF_ENCODER_PCM_F32BE = 'pcm_f32be' as FFAudioEncoder<'pcm_f32be'>;
export const FF_ENCODER_PCM_F32LE = 'pcm_f32le' as FFAudioEncoder<'pcm_f32le'>;
export const FF_ENCODER_PCM_F64BE = 'pcm_f64be' as FFAudioEncoder<'pcm_f64be'>;
export const FF_ENCODER_PCM_F64LE = 'pcm_f64le' as FFAudioEncoder<'pcm_f64le'>;
export const FF_ENCODER_PCM_MULAW = 'pcm_mulaw' as FFAudioEncoder<'pcm_mulaw'>;
export const FF_ENCODER_PCM_S16BE = 'pcm_s16be' as FFAudioEncoder<'pcm_s16be'>;
export const FF_ENCODER_PCM_S16BE_PLANAR = 'pcm_s16be_planar' as FFAudioEncoder<'pcm_s16be_planar'>;
export const FF_ENCODER_PCM_S16LE = 'pcm_s16le' as FFAudioEncoder<'pcm_s16le'>;
export const FF_ENCODER_PCM_S16LE_PLANAR = 'pcm_s16le_planar' as FFAudioEncoder<'pcm_s16le_planar'>;
export const FF_ENCODER_PCM_S24BE = 'pcm_s24be' as FFAudioEncoder<'pcm_s24be'>;
export const FF_ENCODER_PCM_S24DAUD = 'pcm_s24daud' as FFAudioEncoder<'pcm_s24daud'>;
export const FF_ENCODER_PCM_S24LE = 'pcm_s24le' as FFAudioEncoder<'pcm_s24le'>;
export const FF_ENCODER_PCM_S24LE_PLANAR = 'pcm_s24le_planar' as FFAudioEncoder<'pcm_s24le_planar'>;
export const FF_ENCODER_PCM_S32BE = 'pcm_s32be' as FFAudioEncoder<'pcm_s32be'>;
export const FF_ENCODER_PCM_S32LE = 'pcm_s32le' as FFAudioEncoder<'pcm_s32le'>;
export const FF_ENCODER_PCM_S32LE_PLANAR = 'pcm_s32le_planar' as FFAudioEncoder<'pcm_s32le_planar'>;
export const FF_ENCODER_PCM_S64BE = 'pcm_s64be' as FFAudioEncoder<'pcm_s64be'>;
export const FF_ENCODER_PCM_S64LE = 'pcm_s64le' as FFAudioEncoder<'pcm_s64le'>;
export const FF_ENCODER_PCM_S8 = 'pcm_s8' as FFAudioEncoder<'pcm_s8'>;
export const FF_ENCODER_PCM_S8_PLANAR = 'pcm_s8_planar' as FFAudioEncoder<'pcm_s8_planar'>;
export const FF_ENCODER_PCM_U16BE = 'pcm_u16be' as FFAudioEncoder<'pcm_u16be'>;
export const FF_ENCODER_PCM_U16LE = 'pcm_u16le' as FFAudioEncoder<'pcm_u16le'>;
export const FF_ENCODER_PCM_U24BE = 'pcm_u24be' as FFAudioEncoder<'pcm_u24be'>;
export const FF_ENCODER_PCM_U24LE = 'pcm_u24le' as FFAudioEncoder<'pcm_u24le'>;
export const FF_ENCODER_PCM_U32BE = 'pcm_u32be' as FFAudioEncoder<'pcm_u32be'>;
export const FF_ENCODER_PCM_U32LE = 'pcm_u32le' as FFAudioEncoder<'pcm_u32le'>;
export const FF_ENCODER_PCM_U8 = 'pcm_u8' as FFAudioEncoder<'pcm_u8'>;
export const FF_ENCODER_PCM_VIDC = 'pcm_vidc' as FFAudioEncoder<'pcm_vidc'>;
export const FF_ENCODER_S302M = 's302m' as FFAudioEncoder<'s302m'>;
export const FF_ENCODER_SBC = 'sbc' as FFAudioEncoder<'sbc'>;
export const FF_ENCODER_SONIC = 'sonic' as FFAudioEncoder<'sonic'>;
export const FF_ENCODER_SONIC_LS = 'sonicls' as FFAudioEncoder<'sonicls'>;
export const FF_ENCODER_TRUEHD = 'truehd' as FFAudioEncoder<'truehd'>;
export const FF_ENCODER_TTA = 'tta' as FFAudioEncoder<'tta'>;
export const FF_ENCODER_VORBIS = 'vorbis' as FFAudioEncoder<'vorbis'>;
export const FF_ENCODER_WAVPACK = 'wavpack' as FFAudioEncoder<'wavpack'>;
export const FF_ENCODER_WMAV1 = 'wmav1' as FFAudioEncoder<'wmav1'>;
export const FF_ENCODER_WMAV2 = 'wmav2' as FFAudioEncoder<'wmav2'>;

// Hardware audio encoders
export const FF_ENCODER_AAC_AT = 'aac_at' as FFAudioEncoder<'aac_at'>;
export const FF_ENCODER_AAC_MF = 'aac_mf' as FFAudioEncoder<'aac_mf'>;
export const FF_ENCODER_AC3_MF = 'ac3_mf' as FFAudioEncoder<'ac3_mf'>;
export const FF_ENCODER_ALAC_AT = 'alac_at' as FFAudioEncoder<'alac_at'>;
export const FF_ENCODER_ILBC_AT = 'ilbc_at' as FFAudioEncoder<'ilbc_at'>;
export const FF_ENCODER_MP3_MF = 'mp3_mf' as FFAudioEncoder<'mp3_mf'>;
export const FF_ENCODER_PCM_ALAW_AT = 'pcm_alaw_at' as FFAudioEncoder<'pcm_alaw_at'>;
export const FF_ENCODER_PCM_MULAW_AT = 'pcm_mulaw_at' as FFAudioEncoder<'pcm_mulaw_at'>;

// ============================================================================
// SUBTITLE ENCODERS (10 encoders)
// ============================================================================

export const FF_ENCODER_ASS = 'ass' as FFSubtitleEncoder<'ass'>;
export const FF_ENCODER_DVBSUB = 'dvbsub' as FFSubtitleEncoder<'dvbsub'>;
export const FF_ENCODER_DVDSUB = 'dvdsub' as FFSubtitleEncoder<'dvdsub'>;
export const FF_ENCODER_SRT = 'srt' as FFSubtitleEncoder<'srt'>;
export const FF_ENCODER_SSA = 'ssa' as FFSubtitleEncoder<'ssa'>;
export const FF_ENCODER_SUBRIP = 'subrip' as FFSubtitleEncoder<'subrip'>;
export const FF_ENCODER_TEXT = 'text' as FFSubtitleEncoder<'text'>;
export const FF_ENCODER_TTML = 'ttml' as FFSubtitleEncoder<'ttml'>;
export const FF_ENCODER_WEBVTT = 'webvtt' as FFSubtitleEncoder<'webvtt'>;
export const FF_ENCODER_XSUB = 'xsub' as FFSubtitleEncoder<'xsub'>;
