/**
 * Auto-generated FFmpeg encoder constants
 * Generated from FFmpeg source code (allcodecs.c)
 * DO NOT EDIT MANUALLY
 */

// Brand symbol for type safety
const __codec_brand = Symbol('__codec_brand');

// Base encoder type
export type FFEncoderCodec = string & { readonly [__codec_brand]: 'encoder' };

// Specific encoder types by media type
export type FFVideoEncoder = FFEncoderCodec & { readonly __type: 'video' };
export type FFAudioEncoder = FFEncoderCodec & { readonly __type: 'audio' };
export type FFSubtitleEncoder = FFEncoderCodec & { readonly __type: 'subtitle' };

// ============================================================================
// VIDEO ENCODERS (137 software, 45 hardware)
// ============================================================================

// Software video encoders
export const FF_ENCODER_A64MULTI = 'a64multi' as FFVideoEncoder;
export const FF_ENCODER_A64MULTI5 = 'a64multi5' as FFVideoEncoder;
export const FF_ENCODER_ALIAS_PIX = 'alias_pix' as FFVideoEncoder;
export const FF_ENCODER_AMV = 'amv' as FFVideoEncoder;
export const FF_ENCODER_ANULL = 'anull' as FFVideoEncoder;
export const FF_ENCODER_APNG = 'apng' as FFVideoEncoder;
export const FF_ENCODER_ASV1 = 'asv1' as FFVideoEncoder;
export const FF_ENCODER_ASV2 = 'asv2' as FFVideoEncoder;
export const FF_ENCODER_AV1_VULKAN = 'av1_vulkan' as FFVideoEncoder;
export const FF_ENCODER_AVRP = 'avrp' as FFVideoEncoder;
export const FF_ENCODER_AVUI = 'avui' as FFVideoEncoder;
export const FF_ENCODER_BITPACKED = 'bitpacked' as FFVideoEncoder;
export const FF_ENCODER_BMP = 'bmp' as FFVideoEncoder;
export const FF_ENCODER_CFHD = 'cfhd' as FFVideoEncoder;
export const FF_ENCODER_CINEPAK = 'cinepak' as FFVideoEncoder;
export const FF_ENCODER_CLJR = 'cljr' as FFVideoEncoder;
export const FF_ENCODER_DNXHD = 'dnxhd' as FFVideoEncoder;
export const FF_ENCODER_DPX = 'dpx' as FFVideoEncoder;
export const FF_ENCODER_DVVIDEO = 'dvvideo' as FFVideoEncoder;
export const FF_ENCODER_DXV = 'dxv' as FFVideoEncoder;
export const FF_ENCODER_EXR = 'exr' as FFVideoEncoder;
export const FF_ENCODER_FFV1 = 'ffv1' as FFVideoEncoder;
export const FF_ENCODER_FFV1_VULKAN = 'ffv1_vulkan' as FFVideoEncoder;
export const FF_ENCODER_FFVHUFF = 'ffvhuff' as FFVideoEncoder;
export const FF_ENCODER_FITS = 'fits' as FFVideoEncoder;
export const FF_ENCODER_FLASHSV = 'flashsv' as FFVideoEncoder;
export const FF_ENCODER_FLASHSV2 = 'flashsv2' as FFVideoEncoder;
export const FF_ENCODER_FLV = 'flv' as FFVideoEncoder;
export const FF_ENCODER_GIF = 'gif' as FFVideoEncoder;
export const FF_ENCODER_H261 = 'h261' as FFVideoEncoder;
export const FF_ENCODER_H263 = 'h263' as FFVideoEncoder;
export const FF_ENCODER_H263P = 'h263p' as FFVideoEncoder;
export const FF_ENCODER_H264_OH = 'h264_oh' as FFVideoEncoder;
export const FF_ENCODER_H264_VULKAN = 'h264_vulkan' as FFVideoEncoder;
export const FF_ENCODER_HAP = 'hap' as FFVideoEncoder;
export const FF_ENCODER_HDR = 'hdr' as FFVideoEncoder;
export const FF_ENCODER_HEVC_OH = 'hevc_oh' as FFVideoEncoder;
export const FF_ENCODER_HEVC_VULKAN = 'hevc_vulkan' as FFVideoEncoder;
export const FF_ENCODER_HUFFYUV = 'huffyuv' as FFVideoEncoder;
export const FF_ENCODER_JPEG2000 = 'jpeg2000' as FFVideoEncoder;
export const FF_ENCODER_JPEGLS = 'jpegls' as FFVideoEncoder;
export const FF_ENCODER_LIBAOM_AV1 = 'libaom_av1' as FFVideoEncoder;
export const FF_ENCODER_LIBCODEC2 = 'libcodec2' as FFVideoEncoder;
export const FF_ENCODER_LIBGSM = 'libgsm' as FFVideoEncoder;
export const FF_ENCODER_LIBGSM_MS = 'libgsm_ms' as FFVideoEncoder;
export const FF_ENCODER_LIBILBC = 'libilbc' as FFVideoEncoder;
export const FF_ENCODER_LIBJXL = 'libjxl' as FFVideoEncoder;
export const FF_ENCODER_LIBJXL_ANIM = 'libjxl_anim' as FFVideoEncoder;
export const FF_ENCODER_LIBKVAZAAR = 'libkvazaar' as FFVideoEncoder;
export const FF_ENCODER_LIBLC3 = 'liblc3' as FFVideoEncoder;
export const FF_ENCODER_LIBOAPV = 'liboapv' as FFVideoEncoder;
export const FF_ENCODER_LIBOPENCORE_AMRNB = 'libopencore_amrnb' as FFVideoEncoder;
export const FF_ENCODER_LIBOPENH264 = 'libopenh264' as FFVideoEncoder;
export const FF_ENCODER_LIBOPENJPEG = 'libopenjpeg' as FFVideoEncoder;
export const FF_ENCODER_LIBRAV1E = 'librav1e' as FFVideoEncoder;
export const FF_ENCODER_LIBSHINE = 'libshine' as FFVideoEncoder;
export const FF_ENCODER_LIBSVTAV1 = 'libsvtav1' as FFVideoEncoder;
export const FF_ENCODER_LIBSVTJPEGXS = 'libsvtjpegxs' as FFVideoEncoder;
export const FF_ENCODER_LIBTHEORA = 'libtheora' as FFVideoEncoder;
export const FF_ENCODER_LIBTWOLAME = 'libtwolame' as FFVideoEncoder;
export const FF_ENCODER_LIBVO_AMRWBENC = 'libvo_amrwbenc' as FFVideoEncoder;
export const FF_ENCODER_LIBVPX_VP8 = 'libvpx-vp8' as FFVideoEncoder;
export const FF_ENCODER_LIBVPX_VP9 = 'libvpx-vp9' as FFVideoEncoder;
export const FF_ENCODER_LIBVVENC = 'libvvenc' as FFVideoEncoder;
export const FF_ENCODER_LIBWEBP = 'libwebp' as FFVideoEncoder;
export const FF_ENCODER_LIBWEBP_ANIM = 'libwebp_anim' as FFVideoEncoder;
export const FF_ENCODER_LIBX262 = 'libx262' as FFVideoEncoder;
export const FF_ENCODER_LIBX264 = 'libx264' as FFVideoEncoder;
export const FF_ENCODER_LIBX264RGB = 'libx264rgb' as FFVideoEncoder;
export const FF_ENCODER_LIBX265 = 'libx265' as FFVideoEncoder;
export const FF_ENCODER_LIBXAVS = 'libxavs' as FFVideoEncoder;
export const FF_ENCODER_LIBXAVS2 = 'libxavs2' as FFVideoEncoder;
export const FF_ENCODER_LIBXEVE = 'libxeve' as FFVideoEncoder;
export const FF_ENCODER_LIBXVID = 'libxvid' as FFVideoEncoder;
export const FF_ENCODER_LJPEG = 'ljpeg' as FFVideoEncoder;
export const FF_ENCODER_MAGICYUV = 'magicyuv' as FFVideoEncoder;
export const FF_ENCODER_MJPEG = 'mjpeg' as FFVideoEncoder;
export const FF_ENCODER_MOVTEXT = 'movtext' as FFVideoEncoder;
export const FF_ENCODER_MPEG1VIDEO = 'mpeg1video' as FFVideoEncoder;
export const FF_ENCODER_MPEG2VIDEO = 'mpeg2video' as FFVideoEncoder;
export const FF_ENCODER_MPEG4 = 'mpeg4' as FFVideoEncoder;
export const FF_ENCODER_MSMPEG4V2 = 'msmpeg4v2' as FFVideoEncoder;
export const FF_ENCODER_MSMPEG4V3 = 'msmpeg4v3' as FFVideoEncoder;
export const FF_ENCODER_MSRLE = 'msrle' as FFVideoEncoder;
export const FF_ENCODER_MSVIDEO1 = 'msvideo1' as FFVideoEncoder;
export const FF_ENCODER_PAM = 'pam' as FFVideoEncoder;
export const FF_ENCODER_PBM = 'pbm' as FFVideoEncoder;
export const FF_ENCODER_PCX = 'pcx' as FFVideoEncoder;
export const FF_ENCODER_PDV = 'pdv' as FFVideoEncoder;
export const FF_ENCODER_PFM = 'pfm' as FFVideoEncoder;
export const FF_ENCODER_PGM = 'pgm' as FFVideoEncoder;
export const FF_ENCODER_PGMYUV = 'pgmyuv' as FFVideoEncoder;
export const FF_ENCODER_PHM = 'phm' as FFVideoEncoder;
export const FF_ENCODER_PNG = 'png' as FFVideoEncoder;
export const FF_ENCODER_PPM = 'ppm' as FFVideoEncoder;
export const FF_ENCODER_PRORES = 'prores' as FFVideoEncoder;
export const FF_ENCODER_PRORES_AW = 'prores_aw' as FFVideoEncoder;
export const FF_ENCODER_PRORES_KS = 'prores_ks' as FFVideoEncoder;
export const FF_ENCODER_PRORES_KS_VULKAN = 'prores_ks_vulkan' as FFVideoEncoder;
export const FF_ENCODER_QOI = 'qoi' as FFVideoEncoder;
export const FF_ENCODER_QTRLE = 'qtrle' as FFVideoEncoder;
export const FF_ENCODER_R10K = 'r10k' as FFVideoEncoder;
export const FF_ENCODER_R210 = 'r210' as FFVideoEncoder;
export const FF_ENCODER_RA_144 = 'ra_144' as FFVideoEncoder;
export const FF_ENCODER_RAWVIDEO = 'rawvideo' as FFVideoEncoder;
export const FF_ENCODER_ROQ = 'roq' as FFVideoEncoder;
export const FF_ENCODER_ROQ_DPCM = 'roq_dpcm' as FFVideoEncoder;
export const FF_ENCODER_RPZA = 'rpza' as FFVideoEncoder;
export const FF_ENCODER_RV10 = 'rv10' as FFVideoEncoder;
export const FF_ENCODER_RV20 = 'rv20' as FFVideoEncoder;
export const FF_ENCODER_SGI = 'sgi' as FFVideoEncoder;
export const FF_ENCODER_SMC = 'smc' as FFVideoEncoder;
export const FF_ENCODER_SNOW = 'snow' as FFVideoEncoder;
export const FF_ENCODER_SPEEDHQ = 'speedhq' as FFVideoEncoder;
export const FF_ENCODER_SUNRAST = 'sunrast' as FFVideoEncoder;
export const FF_ENCODER_SVQ1 = 'svq1' as FFVideoEncoder;
export const FF_ENCODER_TARGA = 'targa' as FFVideoEncoder;
export const FF_ENCODER_TIFF = 'tiff' as FFVideoEncoder;
export const FF_ENCODER_UTVIDEO = 'utvideo' as FFVideoEncoder;
export const FF_ENCODER_V210 = 'v210' as FFVideoEncoder;
export const FF_ENCODER_V308 = 'v308' as FFVideoEncoder;
export const FF_ENCODER_V408 = 'v408' as FFVideoEncoder;
export const FF_ENCODER_V410 = 'v410' as FFVideoEncoder;
export const FF_ENCODER_VBN = 'vbn' as FFVideoEncoder;
export const FF_ENCODER_VC2 = 'vc2' as FFVideoEncoder;
export const FF_ENCODER_VNULL = 'vnull' as FFVideoEncoder;
export const FF_ENCODER_WBMP = 'wbmp' as FFVideoEncoder;
export const FF_ENCODER_WMV1 = 'wmv1' as FFVideoEncoder;
export const FF_ENCODER_WMV2 = 'wmv2' as FFVideoEncoder;
export const FF_ENCODER_WRAPPED_AVFRAME = 'wrapped_avframe' as FFVideoEncoder;
export const FF_ENCODER_XBM = 'xbm' as FFVideoEncoder;
export const FF_ENCODER_XFACE = 'xface' as FFVideoEncoder;
export const FF_ENCODER_XWD = 'xwd' as FFVideoEncoder;
export const FF_ENCODER_Y41P = 'y41p' as FFVideoEncoder;
export const FF_ENCODER_YUV4 = 'yuv4' as FFVideoEncoder;
export const FF_ENCODER_ZLIB = 'zlib' as FFVideoEncoder;
export const FF_ENCODER_ZMBV = 'zmbv' as FFVideoEncoder;

// Hardware video encoders

// AMD AMF
export const FF_ENCODER_AV1_AMF = 'av1_amf' as FFVideoEncoder;
export const FF_ENCODER_H264_AMF = 'h264_amf' as FFVideoEncoder;
export const FF_ENCODER_HEVC_AMF = 'hevc_amf' as FFVideoEncoder;

// Direct3D 12
export const FF_ENCODER_AV1_D3D12VA = 'av1_d3d12va' as FFVideoEncoder;
export const FF_ENCODER_H264_D3D12VA = 'h264_d3d12va' as FFVideoEncoder;
export const FF_ENCODER_HEVC_D3D12VA = 'hevc_d3d12va' as FFVideoEncoder;

// Android MediaCodec
export const FF_ENCODER_AV1_MEDIACODEC = 'av1_mediacodec' as FFVideoEncoder;
export const FF_ENCODER_H264_MEDIACODEC = 'h264_mediacodec' as FFVideoEncoder;
export const FF_ENCODER_HEVC_MEDIACODEC = 'hevc_mediacodec' as FFVideoEncoder;
export const FF_ENCODER_MPEG4_MEDIACODEC = 'mpeg4_mediacodec' as FFVideoEncoder;
export const FF_ENCODER_VP8_MEDIACODEC = 'vp8_mediacodec' as FFVideoEncoder;
export const FF_ENCODER_VP9_MEDIACODEC = 'vp9_mediacodec' as FFVideoEncoder;

// Media Foundation
export const FF_ENCODER_AV1_MF = 'av1_mf' as FFVideoEncoder;
export const FF_ENCODER_H264_MF = 'h264_mf' as FFVideoEncoder;
export const FF_ENCODER_HEVC_MF = 'hevc_mf' as FFVideoEncoder;

// NVIDIA NVENC
export const FF_ENCODER_AV1_NVENC = 'av1_nvenc' as FFVideoEncoder;
export const FF_ENCODER_H264_NVENC = 'h264_nvenc' as FFVideoEncoder;
export const FF_ENCODER_HEVC_NVENC = 'hevc_nvenc' as FFVideoEncoder;

// Intel Quick Sync
export const FF_ENCODER_AV1_QSV = 'av1_qsv' as FFVideoEncoder;
export const FF_ENCODER_H264_QSV = 'h264_qsv' as FFVideoEncoder;
export const FF_ENCODER_HEVC_QSV = 'hevc_qsv' as FFVideoEncoder;
export const FF_ENCODER_MJPEG_QSV = 'mjpeg_qsv' as FFVideoEncoder;
export const FF_ENCODER_MPEG2_QSV = 'mpeg2_qsv' as FFVideoEncoder;
export const FF_ENCODER_VP9_QSV = 'vp9_qsv' as FFVideoEncoder;

// VA-API
export const FF_ENCODER_AV1_VAAPI = 'av1_vaapi' as FFVideoEncoder;
export const FF_ENCODER_H264_VAAPI = 'h264_vaapi' as FFVideoEncoder;
export const FF_ENCODER_HEVC_VAAPI = 'hevc_vaapi' as FFVideoEncoder;
export const FF_ENCODER_MJPEG_VAAPI = 'mjpeg_vaapi' as FFVideoEncoder;
export const FF_ENCODER_MPEG2_VAAPI = 'mpeg2_vaapi' as FFVideoEncoder;
export const FF_ENCODER_VP8_VAAPI = 'vp8_vaapi' as FFVideoEncoder;
export const FF_ENCODER_VP9_VAAPI = 'vp9_vaapi' as FFVideoEncoder;

// V4L2 M2M
export const FF_ENCODER_H263_V4L2M2M = 'h263_v4l2m2m' as FFVideoEncoder;
export const FF_ENCODER_H264_V4L2M2M = 'h264_v4l2m2m' as FFVideoEncoder;
export const FF_ENCODER_HEVC_V4L2M2M = 'hevc_v4l2m2m' as FFVideoEncoder;
export const FF_ENCODER_MPEG4_V4L2M2M = 'mpeg4_v4l2m2m' as FFVideoEncoder;
export const FF_ENCODER_VP8_V4L2M2M = 'vp8_v4l2m2m' as FFVideoEncoder;

// OpenMAX
export const FF_ENCODER_H264_OMX = 'h264_omx' as FFVideoEncoder;
export const FF_ENCODER_MPEG4_OMX = 'mpeg4_omx' as FFVideoEncoder;

// Rockchip MPP
export const FF_ENCODER_H264_RKMPP = 'h264_rkmpp' as FFVideoEncoder;
export const FF_ENCODER_HEVC_RKMPP = 'hevc_rkmpp' as FFVideoEncoder;
export const FF_ENCODER_MJPEG_RKMPP = 'mjpeg_rkmpp' as FFVideoEncoder;

// VideoToolbox (macOS)
export const FF_ENCODER_H264_VIDEOTOOLBOX = 'h264_videotoolbox' as FFVideoEncoder;
export const FF_ENCODER_HEVC_VIDEOTOOLBOX = 'hevc_videotoolbox' as FFVideoEncoder;
export const FF_ENCODER_MJPEG_VIDEOTOOLBOX = 'mjpeg_videotoolbox' as FFVideoEncoder;
export const FF_ENCODER_PRORES_VIDEOTOOLBOX = 'prores_videotoolbox' as FFVideoEncoder;

// ============================================================================
// AUDIO ENCODERS (78 software, 8 hardware)
// ============================================================================

// Software audio encoders
export const FF_ENCODER_AAC = 'aac' as FFAudioEncoder;
export const FF_ENCODER_AC3 = 'ac3' as FFAudioEncoder;
export const FF_ENCODER_AC3_FIXED = 'ac3_fixed' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_ADX = 'adpcm_adx' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_ARGO = 'adpcm_argo' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_G722 = 'adpcm_g722' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_G726 = 'adpcm_g726' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_G726LE = 'adpcm_g726le' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_IMA_ALP = 'adpcm_ima_alp' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_IMA_AMV = 'adpcm_ima_amv' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_IMA_APM = 'adpcm_ima_apm' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_IMA_QT = 'adpcm_ima_qt' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_IMA_SSI = 'adpcm_ima_ssi' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_IMA_WAV = 'adpcm_ima_wav' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_IMA_WS = 'adpcm_ima_ws' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_MS = 'adpcm_ms' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_SWF = 'adpcm_swf' as FFAudioEncoder;
export const FF_ENCODER_ADPCM_YAMAHA = 'adpcm_yamaha' as FFAudioEncoder;
export const FF_ENCODER_ALAC = 'alac' as FFAudioEncoder;
export const FF_ENCODER_APTX = 'aptx' as FFAudioEncoder;
export const FF_ENCODER_APTX_HD = 'aptx_hd' as FFAudioEncoder;
export const FF_ENCODER_COMFORTNOISE = 'comfortnoise' as FFAudioEncoder;
export const FF_ENCODER_DCA = 'dca' as FFAudioEncoder;
export const FF_ENCODER_DFPWM = 'dfpwm' as FFAudioEncoder;
export const FF_ENCODER_EAC3 = 'eac3' as FFAudioEncoder;
export const FF_ENCODER_FLAC = 'flac' as FFAudioEncoder;
export const FF_ENCODER_G723_1 = 'g723_1' as FFAudioEncoder;
export const FF_ENCODER_LIBFDK_AAC = 'libfdk_aac' as FFAudioEncoder;
export const FF_ENCODER_LIBMP3LAME = 'libmp3lame' as FFAudioEncoder;
export const FF_ENCODER_LIBOPUS = 'libopus' as FFAudioEncoder;
export const FF_ENCODER_LIBSPEEX = 'libspeex' as FFAudioEncoder;
export const FF_ENCODER_LIBVORBIS = 'libvorbis' as FFAudioEncoder;
export const FF_ENCODER_MLP = 'mlp' as FFAudioEncoder;
export const FF_ENCODER_MP2 = 'mp2' as FFAudioEncoder;
export const FF_ENCODER_MP2FIXED = 'mp2fixed' as FFAudioEncoder;
export const FF_ENCODER_NELLYMOSER = 'nellymoser' as FFAudioEncoder;
export const FF_ENCODER_OPUS = 'opus' as FFAudioEncoder;
export const FF_ENCODER_PCM_ALAW = 'pcm_alaw' as FFAudioEncoder;
export const FF_ENCODER_PCM_BLURAY = 'pcm_bluray' as FFAudioEncoder;
export const FF_ENCODER_PCM_DVD = 'pcm_dvd' as FFAudioEncoder;
export const FF_ENCODER_PCM_F32BE = 'pcm_f32be' as FFAudioEncoder;
export const FF_ENCODER_PCM_F32LE = 'pcm_f32le' as FFAudioEncoder;
export const FF_ENCODER_PCM_F64BE = 'pcm_f64be' as FFAudioEncoder;
export const FF_ENCODER_PCM_F64LE = 'pcm_f64le' as FFAudioEncoder;
export const FF_ENCODER_PCM_MULAW = 'pcm_mulaw' as FFAudioEncoder;
export const FF_ENCODER_PCM_S16BE = 'pcm_s16be' as FFAudioEncoder;
export const FF_ENCODER_PCM_S16BE_PLANAR = 'pcm_s16be_planar' as FFAudioEncoder;
export const FF_ENCODER_PCM_S16LE = 'pcm_s16le' as FFAudioEncoder;
export const FF_ENCODER_PCM_S16LE_PLANAR = 'pcm_s16le_planar' as FFAudioEncoder;
export const FF_ENCODER_PCM_S24BE = 'pcm_s24be' as FFAudioEncoder;
export const FF_ENCODER_PCM_S24DAUD = 'pcm_s24daud' as FFAudioEncoder;
export const FF_ENCODER_PCM_S24LE = 'pcm_s24le' as FFAudioEncoder;
export const FF_ENCODER_PCM_S24LE_PLANAR = 'pcm_s24le_planar' as FFAudioEncoder;
export const FF_ENCODER_PCM_S32BE = 'pcm_s32be' as FFAudioEncoder;
export const FF_ENCODER_PCM_S32LE = 'pcm_s32le' as FFAudioEncoder;
export const FF_ENCODER_PCM_S32LE_PLANAR = 'pcm_s32le_planar' as FFAudioEncoder;
export const FF_ENCODER_PCM_S64BE = 'pcm_s64be' as FFAudioEncoder;
export const FF_ENCODER_PCM_S64LE = 'pcm_s64le' as FFAudioEncoder;
export const FF_ENCODER_PCM_S8 = 'pcm_s8' as FFAudioEncoder;
export const FF_ENCODER_PCM_S8_PLANAR = 'pcm_s8_planar' as FFAudioEncoder;
export const FF_ENCODER_PCM_U16BE = 'pcm_u16be' as FFAudioEncoder;
export const FF_ENCODER_PCM_U16LE = 'pcm_u16le' as FFAudioEncoder;
export const FF_ENCODER_PCM_U24BE = 'pcm_u24be' as FFAudioEncoder;
export const FF_ENCODER_PCM_U24LE = 'pcm_u24le' as FFAudioEncoder;
export const FF_ENCODER_PCM_U32BE = 'pcm_u32be' as FFAudioEncoder;
export const FF_ENCODER_PCM_U32LE = 'pcm_u32le' as FFAudioEncoder;
export const FF_ENCODER_PCM_U8 = 'pcm_u8' as FFAudioEncoder;
export const FF_ENCODER_PCM_VIDC = 'pcm_vidc' as FFAudioEncoder;
export const FF_ENCODER_S302M = 's302m' as FFAudioEncoder;
export const FF_ENCODER_SBC = 'sbc' as FFAudioEncoder;
export const FF_ENCODER_SONIC = 'sonic' as FFAudioEncoder;
export const FF_ENCODER_SONIC_LS = 'sonic_ls' as FFAudioEncoder;
export const FF_ENCODER_TRUEHD = 'truehd' as FFAudioEncoder;
export const FF_ENCODER_TTA = 'tta' as FFAudioEncoder;
export const FF_ENCODER_VORBIS = 'vorbis' as FFAudioEncoder;
export const FF_ENCODER_WAVPACK = 'wavpack' as FFAudioEncoder;
export const FF_ENCODER_WMAV1 = 'wmav1' as FFAudioEncoder;
export const FF_ENCODER_WMAV2 = 'wmav2' as FFAudioEncoder;

// Hardware audio encoders
export const FF_ENCODER_AAC_AT = 'aac_at' as FFAudioEncoder;
export const FF_ENCODER_AAC_MF = 'aac_mf' as FFAudioEncoder;
export const FF_ENCODER_AC3_MF = 'ac3_mf' as FFAudioEncoder;
export const FF_ENCODER_ALAC_AT = 'alac_at' as FFAudioEncoder;
export const FF_ENCODER_ILBC_AT = 'ilbc_at' as FFAudioEncoder;
export const FF_ENCODER_MP3_MF = 'mp3_mf' as FFAudioEncoder;
export const FF_ENCODER_PCM_ALAW_AT = 'pcm_alaw_at' as FFAudioEncoder;
export const FF_ENCODER_PCM_MULAW_AT = 'pcm_mulaw_at' as FFAudioEncoder;

// ============================================================================
// SUBTITLE ENCODERS (10 encoders)
// ============================================================================

export const FF_ENCODER_ASS = 'ass' as FFSubtitleEncoder;
export const FF_ENCODER_DVBSUB = 'dvbsub' as FFSubtitleEncoder;
export const FF_ENCODER_DVDSUB = 'dvdsub' as FFSubtitleEncoder;
export const FF_ENCODER_SRT = 'srt' as FFSubtitleEncoder;
export const FF_ENCODER_SSA = 'ssa' as FFSubtitleEncoder;
export const FF_ENCODER_SUBRIP = 'subrip' as FFSubtitleEncoder;
export const FF_ENCODER_TEXT = 'text' as FFSubtitleEncoder;
export const FF_ENCODER_TTML = 'ttml' as FFSubtitleEncoder;
export const FF_ENCODER_WEBVTT = 'webvtt' as FFSubtitleEncoder;
export const FF_ENCODER_XSUB = 'xsub' as FFSubtitleEncoder;
