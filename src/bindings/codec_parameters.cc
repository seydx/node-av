#include "codec_parameters.h"
#include "codec_context.h"

extern "C" {
#include <libavutil/avutil.h>
#include <libavutil/bprint.h>
#include <libavcodec/avcodec.h>
#include <libavcodec/bsf.h>
#include <libavformat/avformat.h>
#include <libavformat/avc.h>
#include <libavformat/hevc.h>

// Internal FFmpeg headers for codec-specific parsing
#define register  // C++17 doesn't support 'register' keyword
#include <get_bits.h>
#include <h264_ps.h>
#include <hevc/ps.h>
#include <av1.h>
#include <av1_parse.h>
#undef register
}

namespace ffmpeg {

Napi::FunctionReference CodecParameters::constructor;

Napi::Object CodecParameters::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(env, "CodecParameters", {
    InstanceMethod<&CodecParameters::Alloc>("alloc"),
    InstanceMethod<&CodecParameters::Free>("free"),
    InstanceMethod<&CodecParameters::Copy>("copy"),
    InstanceMethod<&CodecParameters::FromContext>("fromContext"),
    InstanceMethod<&CodecParameters::ToContext>("toContext"),
    InstanceMethod<&CodecParameters::ParseExtradata>("parseExtradata"),
    InstanceMethod<&CodecParameters::ToJSON>("toJSON"),
    InstanceMethod<&CodecParameters::GetCodedSideData>("getCodedSideData"),
    InstanceMethod<&CodecParameters::AddCodedSideData>("addCodedSideData"),
    InstanceMethod<&CodecParameters::GetAllCodedSideData>("getAllCodedSideData"),
    InstanceMethod<&CodecParameters::GetCodecString>("getCodecString"),
    InstanceMethod<&CodecParameters::GetDecoderConfigurationRecord>("getDecoderConfigurationRecord"),
    InstanceMethod<&CodecParameters::Dispose>(Napi::Symbol::WellKnown(env, "dispose")),

    InstanceAccessor("codecType", &CodecParameters::GetCodecType, &CodecParameters::SetCodecType, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("codecId", &CodecParameters::GetCodecId, &CodecParameters::SetCodecId, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("codecTag", &CodecParameters::GetCodecTag, &CodecParameters::SetCodecTag, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&CodecParameters::GetCodecTagString>("codecTagString"),
    InstanceAccessor("extradata", &CodecParameters::GetExtradata, &CodecParameters::SetExtradata, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&CodecParameters::GetExtradataSize>("extradataSize"),
    InstanceAccessor("format", &CodecParameters::GetFormat, &CodecParameters::SetFormat, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("bitRate", &CodecParameters::GetBitRate, &CodecParameters::SetBitRate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("bitsPerCodedSample", &CodecParameters::GetBitsPerCodedSample, &CodecParameters::SetBitsPerCodedSample, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("bitsPerRawSample", &CodecParameters::GetBitsPerRawSample, &CodecParameters::SetBitsPerRawSample, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("profile", &CodecParameters::GetProfile, &CodecParameters::SetProfile, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("level", &CodecParameters::GetLevel, &CodecParameters::SetLevel, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("width", &CodecParameters::GetWidth, &CodecParameters::SetWidth, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("height", &CodecParameters::GetHeight, &CodecParameters::SetHeight, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("sampleAspectRatio", &CodecParameters::GetSampleAspectRatio, &CodecParameters::SetSampleAspectRatio, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("frameRate", &CodecParameters::GetFrameRate, &CodecParameters::SetFrameRate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorRange", &CodecParameters::GetColorRange, &CodecParameters::SetColorRange, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorPrimaries", &CodecParameters::GetColorPrimaries, &CodecParameters::SetColorPrimaries, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorTrc", &CodecParameters::GetColorTrc, &CodecParameters::SetColorTrc, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("colorSpace", &CodecParameters::GetColorSpace, &CodecParameters::SetColorSpace, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("chromaLocation", &CodecParameters::GetChromaLocation, &CodecParameters::SetChromaLocation, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("channelLayout", &CodecParameters::GetChannelLayout, &CodecParameters::SetChannelLayout, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("channels", &CodecParameters::GetChannels, &CodecParameters::SetChannels, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("sampleRate", &CodecParameters::GetSampleRate, &CodecParameters::SetSampleRate, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("frameSize", &CodecParameters::GetFrameSize, &CodecParameters::SetFrameSize, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("initialPadding", &CodecParameters::GetInitialPadding, &CodecParameters::SetInitialPadding, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor("videoDelay", &CodecParameters::GetVideoDelay, &CodecParameters::SetVideoDelay, static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
    InstanceAccessor<&CodecParameters::GetNbCodedSideData>("nbCodedSideData"),
    InstanceAccessor<&CodecParameters::GetCodecProperties>("codecProperties"),
  });
  
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  
  exports.Set("CodecParameters", func);
  return exports;
}

CodecParameters::CodecParameters(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<CodecParameters>(info) {
  // Constructor does nothing - user must explicitly call alloc()
}

CodecParameters::~CodecParameters() {
  // Only free if we own the params
  if (is_owned_) {
    avcodec_parameters_free(&params_);
  }
}

Napi::Value CodecParameters::Alloc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  AVCodecParameters* params = avcodec_parameters_alloc();
  if (!params) {
    Napi::Error::New(env, "Failed to allocate codec parameters (ENOMEM)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Free old params if we owned them
  if (is_owned_) {
    avcodec_parameters_free(&params_);
  }

  params_ = params;
  is_owned_ = true;  // When we alloc, we own it
  return env.Undefined();
}

Napi::Value CodecParameters::Free(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Only free if we own the params
  if (is_owned_) {
    avcodec_parameters_free(&params_);
  }

  return env.Undefined();
}

Napi::Value CodecParameters::Copy(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!params_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Destination CodecParameters required").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  CodecParameters* dst = UnwrapNativeObject<CodecParameters>(env, info[0], "CodecParameters");
  if (!dst || !dst->Get()) {
    Napi::TypeError::New(env, "Invalid destination CodecParameters").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = avcodec_parameters_copy(dst->Get(), params_);
  return Napi::Number::New(env, ret);
}

Napi::Value CodecParameters::FromContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!params_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "CodecContext required").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  CodecContext* ctx = UnwrapNativeObject<CodecContext>(env, info[0], "CodecContext");
  if (!ctx || !ctx->Get()) {
    Napi::TypeError::New(env, "Invalid CodecContext").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }
  
  int ret = avcodec_parameters_from_context(params_, ctx->Get());
  return Napi::Number::New(env, ret);
}

Napi::Value CodecParameters::ToContext(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!params_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "CodecContext required").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  CodecContext* ctx = UnwrapNativeObject<CodecContext>(env, info[0], "CodecContext");
  if (!ctx || !ctx->Get()) {
    Napi::TypeError::New(env, "Invalid CodecContext").ThrowAsJavaScriptException();
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  int ret = avcodec_parameters_to_context(ctx->Get(), params_);
  return Napi::Number::New(env, ret);
}

// Structure to hold all parsed codec parameters from SPS
struct ParsedParams {
  int width = 0;
  int height = 0;
  int pix_fmt = -1;
  int profile = -1;
  int level = -1;
  AVRational sar = {0, 1};
  AVRational framerate = {0, 1};
  int color_primaries = -1;
  int color_trc = -1;
  int color_space = -1;
  int color_range = -1;
  int chroma_location = -1;
  int64_t bit_rate = 0;
};

// Parse H.264 SPS using FFmpeg internal API
static int parse_h264_sps(const uint8_t* sps_data, int sps_size, ParsedParams* params) {
  if (sps_size < 4) return -1;

  // Skip NAL header (1 byte)
  const uint8_t* sps_payload = sps_data + 1;
  int payload_size = sps_size - 1;

  GetBitContext gb;
  int ret = init_get_bits8(&gb, sps_payload, payload_size);
  if (ret < 0) return ret;

  // Allocate dummy AVCodecContext (required by parser)
  AVCodecContext* avctx = avcodec_alloc_context3(nullptr);
  if (!avctx) return AVERROR(ENOMEM);

  H264ParamSets ps;
  memset(&ps, 0, sizeof(ps));

  // Use FFmpeg's internal H.264 SPS parser
  ret = ff_h264_decode_seq_parameter_set(&gb, avctx, &ps, 0);
  if (ret < 0) {
    ff_h264_ps_uninit(&ps);
    avcodec_free_context(&avctx);
    return ret;
  }

  // Extract all parameters from parsed SPS
  const SPS* sps = ps.sps_list[0];
  if (sps) {
    // Dimensions
    params->width = sps->mb_width * 16;
    params->height = sps->mb_height * 16;

    // Apply cropping
    if (sps->crop) {
      params->width -= sps->crop_left + sps->crop_right;
      params->height -= sps->crop_top + sps->crop_bottom;
    }

    // Pixel format
    if (sps->chroma_format_idc == 0) {
      params->pix_fmt = AV_PIX_FMT_GRAY8;
    } else if (sps->bit_depth_luma == 8) {
      params->pix_fmt = AV_PIX_FMT_YUV420P;
    } else if (sps->bit_depth_luma == 10) {
      params->pix_fmt = AV_PIX_FMT_YUV420P10;
    }

    // Profile and level
    params->profile = sps->profile_idc;
    params->level = sps->level_idc;

    // VUI parameters (if present)
    if (sps->vui_parameters_present_flag) {
      // Sample aspect ratio
      if (sps->vui.sar.num && sps->vui.sar.den) {
        params->sar = sps->vui.sar;
      }

      // Color information
      if (sps->vui.colour_description_present_flag) {
        params->color_primaries = sps->vui.colour_primaries;
        params->color_trc = sps->vui.transfer_characteristics;
        params->color_space = sps->vui.matrix_coeffs;
      }

      // Color range
      if (sps->vui.video_signal_type_present_flag) {
        params->color_range = sps->vui.video_full_range_flag ? AVCOL_RANGE_JPEG : AVCOL_RANGE_MPEG;
      }

      // Chroma location
      if (sps->vui.chroma_loc_info_present_flag) {
        params->chroma_location = sps->vui.chroma_sample_loc_type_top_field;
      }
    }

    // Frame rate (from timing info - directly in SPS, not in VUI)
    if (sps->timing_info_present_flag && sps->num_units_in_tick && sps->time_scale) {
      params->framerate.num = sps->time_scale;
      params->framerate.den = sps->num_units_in_tick * 2; // *2 for field-based timing
    }

    // Bit rate (from HRD parameters - directly in SPS)
    if (sps->nal_hrd_parameters_present_flag || sps->vcl_hrd_parameters_present_flag) {
      if (sps->bit_rate_value[0] > 0) {
        params->bit_rate = sps->bit_rate_value[0];
      }
    }
  }

  ff_h264_ps_uninit(&ps);
  avcodec_free_context(&avctx);
  return sps ? 0 : -1;
}

// Parse HEVC/H.265 SPS using FFmpeg internal API
static int parse_hevc_sps(const uint8_t* sps_data, int sps_size, ParsedParams* params) {
  if (sps_size < 4) return -1;

  // Skip NAL header (2 bytes for HEVC)
  const uint8_t* sps_payload = sps_data + 2;
  int payload_size = sps_size - 2;

  GetBitContext gb;
  int ret = init_get_bits8(&gb, sps_payload, payload_size);
  if (ret < 0) return ret;

  // Allocate dummy AVCodecContext (required by parser)
  AVCodecContext* avctx = avcodec_alloc_context3(nullptr);
  if (!avctx) return AVERROR(ENOMEM);

  HEVCParamSets ps;
  memset(&ps, 0, sizeof(ps));

  // Use FFmpeg's internal HEVC SPS parser
  // nuh_layer_id = 0, apply_defdispwin = 1
  ret = ff_hevc_decode_nal_sps(&gb, avctx, &ps, 0, 1);
  if (ret < 0) {
    ff_hevc_ps_uninit(&ps);
    avcodec_free_context(&avctx);
    return ret;
  }

  // Extract all parameters from parsed SPS
  const HEVCSPS* sps = (const HEVCSPS*)ps.sps_list[0];
  if (sps) {
    // Dimensions
    params->width = sps->width;
    params->height = sps->height;

    // Pixel format
    if (sps->pix_fmt != AV_PIX_FMT_NONE) {
      params->pix_fmt = sps->pix_fmt;
    } else if (sps->bit_depth == 8) {
      params->pix_fmt = AV_PIX_FMT_YUV420P;
    } else if (sps->bit_depth == 10) {
      params->pix_fmt = AV_PIX_FMT_YUV420P10;
    } else if (sps->bit_depth == 12) {
      params->pix_fmt = AV_PIX_FMT_YUV420P12;
    }

    // Profile and level
    params->profile = sps->ptl.general_ptl.profile_idc;
    params->level = sps->ptl.general_ptl.level_idc;

    // VUI parameters (if present)
    if (sps->vui_present) {
      // Sample aspect ratio (from common H2645VUI)
      if (sps->vui.common.sar.num && sps->vui.common.sar.den) {
        params->sar = sps->vui.common.sar;
      }

      // Frame rate (from HEVC-specific timing info)
      if (sps->vui.vui_timing_info_present_flag && sps->vui.vui_num_units_in_tick && sps->vui.vui_time_scale) {
        params->framerate.num = sps->vui.vui_time_scale;
        params->framerate.den = sps->vui.vui_num_units_in_tick;
      }

      // Color information (from common H2645VUI)
      if (sps->vui.common.colour_description_present_flag) {
        params->color_primaries = sps->vui.common.colour_primaries;
        params->color_trc = sps->vui.common.transfer_characteristics;
        params->color_space = sps->vui.common.matrix_coeffs;
      }

      // Color range (from common H2645VUI)
      if (sps->vui.common.video_signal_type_present_flag) {
        params->color_range = sps->vui.common.video_full_range_flag ? AVCOL_RANGE_JPEG : AVCOL_RANGE_MPEG;
      }

      // Chroma location (from common H2645VUI)
      if (sps->vui.common.chroma_loc_info_present_flag) {
        params->chroma_location = sps->vui.common.chroma_sample_loc_type_top_field;
      }
    }
  }

  ff_hevc_ps_uninit(&ps);
  avcodec_free_context(&avctx);
  return sps ? 0 : -1;
}

// Parse VP8 keyframe header
// VP8 frame header: https://datatracker.ietf.org/doc/html/rfc6386#section-9.1
static int parse_vp8_keyframe(const uint8_t* data, int size, ParsedParams* params) {
  if (size < 10) return -1;

  // Check if it's a keyframe (bit 0 of first byte should be 0)
  uint8_t frame_tag = data[0];
  uint8_t frame_type = frame_tag & 1;

  if (frame_type != 0) {
    // Not a keyframe, dimensions not in header
    return AVERROR(EAGAIN);
  }

  // Check sync code (bytes 3-5 should be 0x9d 0x01 0x2a)
  if (data[3] != 0x9d || data[4] != 0x01 || data[5] != 0x2a) {
    return AVERROR_INVALIDDATA;
  }

  // Read width and height (14 bits each, little endian)
  // VP8 stores dimensions as (width-1) and (height-1)
  params->width = ((data[6] | (data[7] << 8)) & 0x3FFF) + 1;
  params->height = ((data[8] | (data[9] << 8)) & 0x3FFF) + 1;

  // VP8 is always YUV420P
  params->pix_fmt = AV_PIX_FMT_YUV420P;

  return (params->width > 0 && params->height > 0) ? 0 : -1;
}

// Parse VP9 superframe or frame header
// VP9 doesn't have dimensions in extradata typically, but can parse from frame
static int parse_vp9_frame(const uint8_t* data, int size, ParsedParams* params) {
  if (size < 10) return -1;

  GetBitContext gb;
  int ret = init_get_bits8(&gb, data, size > 32 ? 32 : size);
  if (ret < 0) return ret;

  // Frame marker (2 bits, should be 0b10)
  if (get_bits(&gb, 2) != 2) {
    return AVERROR_INVALIDDATA;
  }

  // Profile (2 bits)
  params->profile = get_bits(&gb, 2);

  // Show existing frame (1 bit)
  if (get_bits1(&gb)) {
    // Show existing frame, dimensions not in header
    return AVERROR(EAGAIN);
  }

  // Frame type (1 bit): 0 = keyframe, 1 = inter frame
  int frame_type = get_bits1(&gb);

  // Show frame (1 bit)
  get_bits1(&gb);

  // Error resilient (1 bit)
  get_bits1(&gb);

  if (frame_type != 0) {
    // Not a keyframe, dimensions not in header
    return AVERROR(EAGAIN);
  }

  // Sync code (24 bits, should be 0x498342)
  if (get_bits(&gb, 24) != 0x498342) {
    return AVERROR_INVALIDDATA;
  }

  // Color space and range
  int color_space = get_bits(&gb, 3);
  params->color_space = color_space;  // VP9 color space mapping

  if (color_space != 7) {  // CS_RGB
    int color_range = get_bits1(&gb);
    params->color_range = color_range ? AVCOL_RANGE_JPEG : AVCOL_RANGE_MPEG;
  } else {
    // RGB has different format
    return AVERROR(ENOSYS);
  }

  // Refresh frame flags (8 bits)
  get_bits(&gb, 8);

  // Width and height
  params->width = get_bits(&gb, 16) + 1;
  params->height = get_bits(&gb, 16) + 1;

  // VP9 pixel format depends on profile and bit depth
  // For simplicity, assume 8-bit YUV420P
  params->pix_fmt = AV_PIX_FMT_YUV420P;

  return (params->width > 0 && params->height > 0) ? 0 : -1;
}

// Parse AV1 sequence header from OBU
// AV1 spec: https://aomediacodec.github.io/av1-spec/av1-spec.pdf
static int parse_av1_sequence_header(const uint8_t* data, int size, ParsedParams* params) {
  if (size < 10) return -1;

  GetBitContext gb;
  int ret = init_get_bits8(&gb, data, size > 128 ? 128 : size);
  if (ret < 0) return ret;

  // seq_profile (3 bits)
  params->profile = get_bits(&gb, 3);

  // still_picture (1 bit)
  get_bits1(&gb);

  // reduced_still_picture_header (1 bit)
  int reduced_still = get_bits1(&gb);

  if (!reduced_still) {
    // timing_info_present_flag (1 bit)
    if (get_bits1(&gb)) {
      // Skip timing info (varies, complex to parse)
      return AVERROR(ENOSYS);
    }

    // decoder_model_info_present_flag (1 bit)
    if (get_bits1(&gb)) {
      // Skip decoder model info
      return AVERROR(ENOSYS);
    }

    // initial_display_delay_present_flag (1 bit)
    get_bits1(&gb);

    // operating_points_cnt_minus_1 (5 bits)
    int op_pts = get_bits(&gb, 5) + 1;

    // Skip operating points
    for (int i = 0; i < op_pts; i++) {
      get_bits(&gb, 12);  // operating_point_idc
      get_bits(&gb, 5);   // seq_level_idx

      if (get_bits(&gb, 5) > 7) {  // seq_tier
        get_bits1(&gb);  // seq_tier bit
      }
      // More fields depend on previous flags - skip for simplicity
    }
  }

  // frame_width_bits_minus_1 (4 bits)
  int width_bits = get_bits(&gb, 4) + 1;

  // frame_height_bits_minus_1 (4 bits)
  int height_bits = get_bits(&gb, 4) + 1;

  // max_frame_width_minus_1 (width_bits bits)
  params->width = get_bits(&gb, width_bits) + 1;

  // max_frame_height_minus_1 (height_bits bits)
  params->height = get_bits(&gb, height_bits) + 1;

  // Skip frame_id_numbers_present_flag
  if (!reduced_still) {
    get_bits1(&gb);
  }

  // use_128x128_superblock (1 bit)
  get_bits1(&gb);

  // enable_filter_intra (1 bit)
  get_bits1(&gb);

  // enable_intra_edge_filter (1 bit)
  get_bits1(&gb);

  if (!reduced_still) {
    // enable_interintra_compound (1 bit)
    get_bits1(&gb);
    // enable_masked_compound (1 bit)
    get_bits1(&gb);
    // enable_warped_motion (1 bit)
    get_bits1(&gb);
    // enable_dual_filter (1 bit)
    get_bits1(&gb);
    // enable_order_hint (1 bit)
    get_bits1(&gb);
    // enable_jnt_comp (1 bit)
    get_bits1(&gb);
    // enable_ref_frame_mvs (1 bit)
    get_bits1(&gb);

    // seq_choose_screen_content_tools (1 bit)
    if (get_bits1(&gb)) {
      get_bits1(&gb);  // seq_force_screen_content_tools
    }

    // seq_choose_integer_mv (1 bit)
    if (get_bits1(&gb)) {
      get_bits1(&gb);  // seq_force_integer_mv
    }

    // enable_superres (1 bit)
    get_bits1(&gb);
    // enable_cdef (1 bit)
    get_bits1(&gb);
    // enable_restoration (1 bit)
    get_bits1(&gb);
  }

  // color_config - simplified
  // For now, assume 8-bit YUV420P
  params->pix_fmt = AV_PIX_FMT_YUV420P;

  return (params->width > 0 && params->height > 0) ? 0 : -1;
}

Napi::Value CodecParameters::ParseExtradata(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!params_) {
    return Napi::Number::New(env, AVERROR(EINVAL));
  }

  // Only parse if extradata exists and dimensions are missing
  if (!params_->extradata || params_->extradata_size == 0) {
    return Napi::Number::New(env, 0); // Nothing to parse
  }

  // Check if we already have codec parameters (width for video, sample_rate for audio)
  if (params_->codec_type == AVMEDIA_TYPE_VIDEO && params_->width > 0) {
    return Napi::Number::New(env, 0); // Already have parameters
  }
  if (params_->codec_type == AVMEDIA_TYPE_AUDIO && params_->sample_rate > 0) {
    return Napi::Number::New(env, 0); // Already have parameters
  }

  ParsedParams parsed = {};
  int ret = AVERROR(ENOSYS);

  // Parse based on codec type
  if (params_->codec_id == AV_CODEC_ID_H264 || params_->codec_id == AV_CODEC_ID_HEVC) {
    // H.264/H.265: Requires Annex B format (00 00 00 01)
    bool is_annexb = (params_->extradata_size >= 4 &&
                      params_->extradata[0] == 0 && params_->extradata[1] == 0 &&
                      params_->extradata[2] == 0 && params_->extradata[3] == 1);

    if (!is_annexb) {
      // avcC/hvcC format not supported yet (would need different parsing)
      return Napi::Number::New(env, AVERROR(ENOSYS));
    }

    // Find first NAL unit
    uint8_t* nal_start = params_->extradata + 4;  // Skip start code
    int nal_size = 0;

    // Find NAL size (search for next start code)
    for (int i = 4; i < params_->extradata_size - 3; i++) {
      if (params_->extradata[i] == 0 && params_->extradata[i+1] == 0 &&
          params_->extradata[i+2] == 0 && params_->extradata[i+3] == 1) {
        nal_size = i - 4;
        break;
      }
    }
    if (nal_size == 0) {
      nal_size = params_->extradata_size - 4;  // Last NAL unit
    }

    if (nal_size <= 0) {
      return Napi::Number::New(env, AVERROR(EINVAL));
    }

    if (params_->codec_id == AV_CODEC_ID_H264) {
      // H.264: NAL type 7 = SPS
      if ((nal_start[0] & 0x1F) == 7) {
        ret = parse_h264_sps(nal_start, nal_size, &parsed);
      }
    } else if (params_->codec_id == AV_CODEC_ID_HEVC) {
      // HEVC: NAL type 33 = SPS
      if (((nal_start[0] >> 1) & 0x3F) == 33) {
        ret = parse_hevc_sps(nal_start, nal_size, &parsed);
      }
    }
  } else if (params_->codec_id == AV_CODEC_ID_VP8) {
    // VP8: Parse keyframe header directly from extradata
    ret = parse_vp8_keyframe(params_->extradata, params_->extradata_size, &parsed);
  } else if (params_->codec_id == AV_CODEC_ID_VP9) {
    // VP9: Parse frame header directly from extradata
    ret = parse_vp9_frame(params_->extradata, params_->extradata_size, &parsed);
  } else if (params_->codec_id == AV_CODEC_ID_AV1) {
    // AV1: Parse sequence header OBU
    // AV1 extradata can be in different formats:
    // 1. Raw OBU (starts with OBU header)
    // 2. AV1CodecConfigurationRecord (MP4/WebM container format)

    // Check if it's AV1CodecConfigurationRecord (MP4 format)
    if (params_->extradata_size > 4 && (params_->extradata[0] & 0x80)) {
      // Version 1 of AV1CodecConfigurationRecord
      // Format: marker(1) + version(7) + seq_profile(3) + seq_level_idx(5) + ...
      // Skip first 4 bytes of config header
      int offset = 4;

      // Find sequence header OBU (type 1)
      while (offset < params_->extradata_size - 2) {
        uint8_t obu_header = params_->extradata[offset];
        uint8_t obu_type = (obu_header >> 3) & 0x0F;
        uint8_t has_size_field = (obu_header >> 1) & 1;

        int header_size = 1;
        int payload_offset = header_size;

        // If has_size_field, read LEB128 size
        if (has_size_field && offset + 1 < params_->extradata_size) {
          // Read simple LEB128 (assuming size < 128 for extradata)
          uint8_t size_byte = params_->extradata[offset + header_size];
          payload_offset = header_size + 1;

          if (obu_type == 1) {  // OBU_SEQUENCE_HEADER
            // Found sequence header, parse it
            ret = parse_av1_sequence_header(params_->extradata + offset + payload_offset,
                                            params_->extradata_size - offset - payload_offset,
                                            &parsed);
            break;
          }

          // Skip to next OBU (header + size + payload)
          offset += payload_offset + size_byte;
        } else {
          // No size field, can't parse
          break;
        }
      }
    } else {
      // Try parsing as raw OBU
      if (params_->extradata_size > 1) {
        uint8_t obu_header = params_->extradata[0];
        uint8_t obu_type = (obu_header >> 3) & 0x0F;
        uint8_t has_size_field = (obu_header >> 1) & 1;

        if (obu_type == 1) {  // OBU_SEQUENCE_HEADER
          int payload_offset = 1;
          if (has_size_field && params_->extradata_size > 2) {
            payload_offset = 2;  // Skip header + size byte
          }
          ret = parse_av1_sequence_header(params_->extradata + payload_offset,
                                         params_->extradata_size - payload_offset,
                                         &parsed);
        }
      }
    }
  }

  if (ret == 0 && parsed.width > 0 && parsed.height > 0) {
    // Set dimensions
    params_->width = parsed.width;
    params_->height = parsed.height;

    // Set pixel format
    if (parsed.pix_fmt != -1) {
      params_->format = parsed.pix_fmt;
    }

    // Set profile and level
    if (parsed.profile != -1) {
      params_->profile = parsed.profile;
    }
    if (parsed.level != -1) {
      params_->level = parsed.level;
    }

    // Set sample aspect ratio
    if (parsed.sar.num && parsed.sar.den) {
      params_->sample_aspect_ratio = parsed.sar;
    }

    // Set frame rate
    if (parsed.framerate.num && parsed.framerate.den) {
      params_->framerate = parsed.framerate;
    }

    // Set color information
    if (parsed.color_primaries != -1) {
      params_->color_primaries = (AVColorPrimaries)parsed.color_primaries;
    }
    if (parsed.color_trc != -1) {
      params_->color_trc = (AVColorTransferCharacteristic)parsed.color_trc;
    }
    if (parsed.color_space != -1) {
      params_->color_space = (AVColorSpace)parsed.color_space;
    }
    if (parsed.color_range != -1) {
      params_->color_range = (AVColorRange)parsed.color_range;
    }

    // Set chroma location
    if (parsed.chroma_location != -1) {
      params_->chroma_location = (AVChromaLocation)parsed.chroma_location;
    }

    // Set bit rate
    if (parsed.bit_rate > 0) {
      params_->bit_rate = parsed.bit_rate;
    }

    return Napi::Number::New(env, 0);
  }

  // Codec not supported or parsing failed
  return Napi::Number::New(env, ret < 0 ? ret : AVERROR(ENOSYS));
}

Napi::Value CodecParameters::ToJSON(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Object json = Napi::Object::New(env);
  
  if (!params_) {
    return json;  // Return empty object if not allocated
  }
  
  // Basic parameters
  json.Set("codecType", Napi::Number::New(env, params_->codec_type));
  json.Set("codecId", Napi::Number::New(env, params_->codec_id));
  json.Set("codecTag", Napi::Number::New(env, params_->codec_tag));
  
  // Extradata
  if (params_->extradata && params_->extradata_size > 0) {
    Napi::Buffer<uint8_t> extradata = Napi::Buffer<uint8_t>::Copy(env, params_->extradata, params_->extradata_size);
    json.Set("extradata", extradata);
    json.Set("extradataSize", Napi::Number::New(env, params_->extradata_size));
  } else {
    json.Set("extradata", env.Null());
    json.Set("extradataSize", Napi::Number::New(env, 0));
  }
  
  // Format (pixel format for video, sample format for audio)
  json.Set("format", Napi::Number::New(env, params_->format));
  
  // Bitrate and sample info
  json.Set("bitRate", Napi::BigInt::New(env, params_->bit_rate));
  json.Set("bitsPerCodedSample", Napi::Number::New(env, params_->bits_per_coded_sample));
  json.Set("bitsPerRawSample", Napi::Number::New(env, params_->bits_per_raw_sample));
  
  // Profile and level
  json.Set("profile", Napi::Number::New(env, params_->profile));
  json.Set("level", Napi::Number::New(env, params_->level));
  
  // Video parameters
  if (params_->codec_type == AVMEDIA_TYPE_VIDEO) {
    json.Set("width", Napi::Number::New(env, params_->width));
    json.Set("height", Napi::Number::New(env, params_->height));
    
    // Sample aspect ratio
    Napi::Object sar = Napi::Object::New(env);
    sar.Set("num", Napi::Number::New(env, params_->sample_aspect_ratio.num));
    sar.Set("den", Napi::Number::New(env, params_->sample_aspect_ratio.den));
    json.Set("sampleAspectRatio", sar);
    
    // Framerate
    if (params_->framerate.num != 0 || params_->framerate.den != 0) {
      Napi::Object framerate = Napi::Object::New(env);
      framerate.Set("num", Napi::Number::New(env, params_->framerate.num));
      framerate.Set("den", Napi::Number::New(env, params_->framerate.den));
      json.Set("framerate", framerate);
    } else {
      json.Set("framerate", env.Null());
    }
    
    // Color properties
    json.Set("fieldOrder", Napi::Number::New(env, params_->field_order));
    json.Set("colorRange", Napi::Number::New(env, params_->color_range));
    json.Set("colorPrimaries", Napi::Number::New(env, params_->color_primaries));
    json.Set("colorTrc", Napi::Number::New(env, params_->color_trc));
    json.Set("colorSpace", Napi::Number::New(env, params_->color_space));
    json.Set("chromaLocation", Napi::Number::New(env, params_->chroma_location));
    json.Set("videoDelay", Napi::Number::New(env, params_->video_delay));
  }
  
  // Audio parameters
  if (params_->codec_type == AVMEDIA_TYPE_AUDIO) {
#if LIBAVUTIL_VERSION_INT >= AV_VERSION_INT(57, 24, 100)
    json.Set("chLayout", Napi::BigInt::New(env, params_->ch_layout.u.mask));
    json.Set("channels", Napi::Number::New(env, params_->ch_layout.nb_channels));
#else
    json.Set("channelLayout", Napi::BigInt::New(env, params_->channel_layout));
    json.Set("channels", Napi::Number::New(env, params_->channels));
#endif
    json.Set("sampleRate", Napi::Number::New(env, params_->sample_rate));
    json.Set("blockAlign", Napi::Number::New(env, params_->block_align));
    json.Set("frameSize", Napi::Number::New(env, params_->frame_size));
    json.Set("initialPadding", Napi::Number::New(env, params_->initial_padding));
    json.Set("trailingPadding", Napi::Number::New(env, params_->trailing_padding));
    json.Set("seekPreroll", Napi::Number::New(env, params_->seek_preroll));
  }
  
  // Subtitle parameters
  if (params_->codec_type == AVMEDIA_TYPE_SUBTITLE) {
    json.Set("width", Napi::Number::New(env, params_->width));
    json.Set("height", Napi::Number::New(env, params_->height));
  }
  
  return json;
}

Napi::Value CodecParameters::GetCodecType(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, AVMEDIA_TYPE_UNKNOWN);
  }
  return Napi::Number::New(env, params_->codec_type);
}

void CodecParameters::SetCodecType(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->codec_type = static_cast<AVMediaType>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecParameters::GetCodecId(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, AV_CODEC_ID_NONE);
  }
  return Napi::Number::New(env, params_->codec_id);
}

void CodecParameters::SetCodecId(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->codec_id = static_cast<AVCodecID>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecParameters::GetCodecTag(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, params_->codec_tag);
}

void CodecParameters::SetCodecTag(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->codec_tag = value.As<Napi::Number>().Uint32Value();
  }
}

Napi::Value CodecParameters::GetCodecTagString(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return env.Null();
  }

  char buf[AV_FOURCC_MAX_STRING_SIZE] = {0};
  av_fourcc_make_string(buf, params_->codec_tag);

  return Napi::String::New(env, buf);
}

Napi::Value CodecParameters::GetExtradata(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (!params_ || !params_->extradata || params_->extradata_size <= 0) {
    return env.Null();
  }
  
  return Napi::Buffer<uint8_t>::Copy(env, params_->extradata, params_->extradata_size);
}

void CodecParameters::SetExtradata(const Napi::CallbackInfo& info, const Napi::Value& value) {
  Napi::Env env = info.Env();
  
  if (!params_) {
    return;
  }
  
  // Free existing extradata
  if (params_->extradata) {
    av_freep(&params_->extradata);
    params_->extradata_size = 0;
  }
  
  if (value.IsNull() || value.IsUndefined()) {
    return;
  }
  
  if (!value.IsBuffer()) {
    Napi::TypeError::New(env, "Extradata must be a Buffer").ThrowAsJavaScriptException();
    return;
  }
  
  Napi::Buffer<uint8_t> buffer = value.As<Napi::Buffer<uint8_t>>();
  size_t size = buffer.Length();
  
  params_->extradata = static_cast<uint8_t*>(av_mallocz(size + AV_INPUT_BUFFER_PADDING_SIZE));
  if (!params_->extradata) {
    Napi::Error::New(env, "Failed to allocate extradata").ThrowAsJavaScriptException();
    return;
  }
  
  memcpy(params_->extradata, buffer.Data(), size);
  params_->extradata_size = size;
}

Napi::Value CodecParameters::GetExtradataSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, params_->extradata_size);
}

Napi::Value CodecParameters::GetFormat(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, -1);
  }
  return Napi::Number::New(env, params_->format);
}

void CodecParameters::SetFormat(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->format = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetBitRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::BigInt::New(env, static_cast<int64_t>(0));
  }
  return Napi::BigInt::New(env, params_->bit_rate);
}

void CodecParameters::SetBitRate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    bool lossless;
    params_->bit_rate = value.As<Napi::BigInt>().Int64Value(&lossless);
  }
}

Napi::Value CodecParameters::GetBitsPerCodedSample(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, params_->bits_per_coded_sample);
}

void CodecParameters::SetBitsPerCodedSample(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->bits_per_coded_sample = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetBitsPerRawSample(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, params_->bits_per_raw_sample);
}

void CodecParameters::SetBitsPerRawSample(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->bits_per_raw_sample = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetProfile(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, AV_PROFILE_UNKNOWN);
  }
  return Napi::Number::New(env, params_->profile);
}

void CodecParameters::SetProfile(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->profile = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetLevel(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, AV_LEVEL_UNKNOWN);
  }
  return Napi::Number::New(env, params_->level);
}

void CodecParameters::SetLevel(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->level = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetWidth(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, params_->width);
}

void CodecParameters::SetWidth(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->width = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetHeight(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, params_->height);
}

void CodecParameters::SetHeight(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->height = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetSampleAspectRatio(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return RationalToJS(env, {0, 1});
  }
  return RationalToJS(env, params_->sample_aspect_ratio);
}

void CodecParameters::SetSampleAspectRatio(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_ && value.IsObject()) {
    params_->sample_aspect_ratio = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value CodecParameters::GetFrameRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return RationalToJS(env, {0, 1});
  }
  return RationalToJS(env, params_->framerate);
}

void CodecParameters::SetFrameRate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_ && value.IsObject()) {
    params_->framerate = JSToRational(value.As<Napi::Object>());
  }
}

Napi::Value CodecParameters::GetColorRange(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, AVCOL_RANGE_UNSPECIFIED);
  }
  return Napi::Number::New(env, params_->color_range);
}

void CodecParameters::SetColorRange(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->color_range = static_cast<AVColorRange>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecParameters::GetColorPrimaries(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, AVCOL_PRI_UNSPECIFIED);
  }
  return Napi::Number::New(env, params_->color_primaries);
}

void CodecParameters::SetColorPrimaries(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->color_primaries = static_cast<AVColorPrimaries>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecParameters::GetColorTrc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, AVCOL_TRC_UNSPECIFIED);
  }
  return Napi::Number::New(env, params_->color_trc);
}

void CodecParameters::SetColorTrc(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->color_trc = static_cast<AVColorTransferCharacteristic>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecParameters::GetColorSpace(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, AVCOL_SPC_UNSPECIFIED);
  }
  return Napi::Number::New(env, params_->color_space);
}

void CodecParameters::SetColorSpace(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->color_space = static_cast<AVColorSpace>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecParameters::GetChromaLocation(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, AVCHROMA_LOC_UNSPECIFIED);
  }
  return Napi::Number::New(env, params_->chroma_location);
}

void CodecParameters::SetChromaLocation(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->chroma_location = static_cast<AVChromaLocation>(value.As<Napi::Number>().Int32Value());
  }
}

Napi::Value CodecParameters::GetChannelLayout(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("nbChannels", Napi::Number::New(env, 0));
    obj.Set("order", Napi::Number::New(env, 0));
    obj.Set("mask", Napi::BigInt::New(env, static_cast<uint64_t>(0)));
    return obj;
  }
  
  // Return AVChannelLayout as object
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("nbChannels", Napi::Number::New(env, params_->ch_layout.nb_channels));
  obj.Set("order", Napi::Number::New(env, params_->ch_layout.order));
  obj.Set("mask", Napi::BigInt::New(env, params_->ch_layout.u.mask));
  return obj;
}

void CodecParameters::SetChannelLayout(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_ && value.IsObject()) {
    Napi::Object obj = value.As<Napi::Object>();
    
    // Set AVChannelLayout from object
    if (obj.Has("nbChannels")) {
      params_->ch_layout.nb_channels = obj.Get("nbChannels").As<Napi::Number>().Int32Value();
    }
    if (obj.Has("order")) {
      params_->ch_layout.order = static_cast<AVChannelOrder>(obj.Get("order").As<Napi::Number>().Int32Value());
    }
    if (obj.Has("mask")) {
      bool lossless;
      params_->ch_layout.u.mask = obj.Get("mask").As<Napi::BigInt>().Uint64Value(&lossless);
    }
  }
}

Napi::Value CodecParameters::GetChannels(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  // channels is now derived from ch_layout
  return Napi::Number::New(env, params_->ch_layout.nb_channels);
}

void CodecParameters::SetChannels(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    // Set nb_channels in ch_layout
    params_->ch_layout.nb_channels = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetSampleRate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, params_->sample_rate);
}

void CodecParameters::SetSampleRate(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->sample_rate = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetFrameSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, params_->frame_size);
}

void CodecParameters::SetFrameSize(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->frame_size = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetInitialPadding(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, params_->initial_padding);
}

void CodecParameters::SetInitialPadding(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->initial_padding = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetVideoDelay(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!params_) {
    return Napi::Number::New(env, 0);
  }
  return Napi::Number::New(env, params_->video_delay);
}

void CodecParameters::SetVideoDelay(const Napi::CallbackInfo& info, const Napi::Value& value) {
  if (params_) {
    params_->video_delay = value.As<Napi::Number>().Int32Value();
  }
}

Napi::Value CodecParameters::GetCodedSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!params_) {
    Napi::TypeError::New(env, "Invalid codec parameters").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected side data type as number").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  enum AVPacketSideDataType type = static_cast<AVPacketSideDataType>(info[0].As<Napi::Number>().Int32Value());

  // Search for side data of this type
  for (int i = 0; i < params_->nb_coded_side_data; i++) {
    if (params_->coded_side_data[i].type == type) {
      const AVPacketSideData* sd = &params_->coded_side_data[i];
      return Napi::Buffer<uint8_t>::Copy(env, sd->data, sd->size);
    }
  }

  return env.Null();
}

Napi::Value CodecParameters::AddCodedSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!params_) {
    Napi::TypeError::New(env, "Invalid codec parameters").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsBuffer()) {
    Napi::TypeError::New(env, "Expected (type: number, data: Buffer)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  enum AVPacketSideDataType type = static_cast<AVPacketSideDataType>(info[0].As<Napi::Number>().Int32Value());
  Napi::Buffer<uint8_t> buffer = info[1].As<Napi::Buffer<uint8_t>>();

  // Use av_packet_side_data_add to add the side data
  AVPacketSideData* sd = av_packet_side_data_add(
    &params_->coded_side_data,
    &params_->nb_coded_side_data,
    type,
    buffer.Data(),
    buffer.Length(),
    0  // flags - 0 means copy the data
  );

  if (!sd) {
    Napi::Error::New(env, "Failed to add coded side data (ENOMEM)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  return Napi::Number::New(env, 0);
}

Napi::Value CodecParameters::GetNbCodedSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!params_) {
    return Napi::Number::New(env, 0);
  }

  return Napi::Number::New(env, params_->nb_coded_side_data);
}

Napi::Value CodecParameters::GetAllCodedSideData(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!params_) {
    return Napi::Array::New(env, 0);
  }

  Napi::Array result = Napi::Array::New(env, params_->nb_coded_side_data);

  for (int i = 0; i < params_->nb_coded_side_data; i++) {
    const AVPacketSideData* sd = &params_->coded_side_data[i];

    Napi::Object entry = Napi::Object::New(env);
    entry.Set("type", Napi::Number::New(env, sd->type));
    entry.Set("data", Napi::Buffer<uint8_t>::Copy(env, sd->data, sd->size));

    result[i] = entry;
  }

  return result;
}

Napi::Value CodecParameters::GetCodecProperties(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!params_) {
    return Napi::Number::New(env, 0);
  }

  // Get codec descriptor for the codec_id
  const AVCodecDescriptor* desc = avcodec_descriptor_get(params_->codec_id);
  if (!desc) {
    return Napi::Number::New(env, 0);
  }

  // Return the props field from descriptor
  return Napi::Number::New(env, desc->props);
}

Napi::Value CodecParameters::GetCodecString(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!params_) {
    return env.Null();
  }

  // Try av_mime_codec_str first (handles all codecs)
  AVBPrint bp;
  av_bprint_init(&bp, 0, AV_BPRINT_SIZE_AUTOMATIC);

  AVRational framerate = {0, 1};
  int ret = av_mime_codec_str(params_, framerate, &bp);

  if (ret >= 0 && av_bprint_is_complete(&bp) && bp.len > 0) {
    Napi::Value result = Napi::String::New(env, bp.str, bp.len);
    av_bprint_finalize(&bp, NULL);
    return result;
  }
  av_bprint_finalize(&bp, NULL);

  // Fallback: build codec string from extradata for H.264/HEVC
  // av_mime_codec_str fails when profile/level are not set in codecpar
  // (common with RTSP streams using low probesize)
  if (!params_->extradata || params_->extradata_size <= 0) {
    return env.Null();
  }

  if (params_->codec_id == AV_CODEC_ID_H264) {
    // Convert to avcC format if needed, then read profile/constraints/level
    AVIOContext *pb = NULL;
    uint8_t *buf = NULL;

    ret = avio_open_dyn_buf(&pb);
    if (ret < 0) return env.Null();

    ret = ff_isom_write_avcc(pb, params_->extradata, params_->extradata_size);
    int size = avio_close_dyn_buf(pb, &buf);

    if (ret < 0 || size < 4) {
      av_free(buf);
      return env.Null();
    }

    // avcC: byte 1 = profile_idc, byte 2 = constraint_set_flags, byte 3 = level_idc
    char str[32];
    snprintf(str, sizeof(str), "avc1.%02x%02x%02x", buf[1], buf[2], buf[3]);
    av_free(buf);
    return Napi::String::New(env, str);
  }

  if (params_->codec_id == AV_CODEC_ID_HEVC) {
    // Convert to hvcC format if needed, then parse header fields
    AVIOContext *pb = NULL;
    uint8_t *buf = NULL;

    ret = avio_open_dyn_buf(&pb);
    if (ret < 0) return env.Null();

    ret = ff_isom_write_hvcc(pb, params_->extradata, params_->extradata_size, 1, NULL);
    int size = avio_close_dyn_buf(pb, &buf);

    if (ret < 0 || size < 13) {
      av_free(buf);
      return env.Null();
    }

    // hvcC header:
    // byte 1: (profile_space << 6) | (tier_flag << 5) | profile_idc
    // bytes 2-5: profile_compatibility_flags (32-bit BE)
    // bytes 6-11: constraint_indicator_flags (6 bytes)
    // byte 12: level_idc
    int profile_space = (buf[1] >> 6) & 0x03;
    int tier_flag = (buf[1] >> 5) & 0x01;
    int profile_idc = buf[1] & 0x1f;
    uint32_t compat = ((uint32_t)buf[2] << 24) | ((uint32_t)buf[3] << 16) |
                      ((uint32_t)buf[4] << 8) | buf[5];
    int level_idc = buf[12];

    const char *prefix = "";
    if (profile_space == 1) prefix = "A";
    else if (profile_space == 2) prefix = "B";
    else if (profile_space == 3) prefix = "C";

    char tier = tier_flag ? 'H' : 'L';

    // Find last non-zero constraint byte
    int last_non_zero = -1;
    for (int i = 5; i >= 0; i--) {
      if (buf[6 + i] != 0) {
        last_non_zero = i;
        break;
      }
    }

    // Use hvc1 if codec_tag matches, otherwise hev1
    const char *tag = (params_->codec_tag == MKTAG('h','v','c','1')) ? "hvc1" : "hev1";

    char str[128];
    int pos = snprintf(str, sizeof(str), "%s.%s%d.%X.%c%d",
                       tag, prefix, profile_idc, compat, tier, level_idc);

    for (int i = 0; i <= last_non_zero; i++) {
      pos += snprintf(str + pos, sizeof(str) - pos, ".%02X", buf[6 + i]);
    }

    av_free(buf);
    return Napi::String::New(env, str);
  }

  return env.Null();
}

Napi::Value CodecParameters::GetDecoderConfigurationRecord(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!params_ || !params_->extradata || params_->extradata_size <= 0) {
    return env.Null();
  }

  AVIOContext *pb = NULL;
  uint8_t *buf = NULL;
  int ret;

  ret = avio_open_dyn_buf(&pb);
  if (ret < 0) {
    return env.Null();
  }

  if (params_->codec_id == AV_CODEC_ID_H264) {
    ret = ff_isom_write_avcc(pb, params_->extradata, params_->extradata_size);
  } else if (params_->codec_id == AV_CODEC_ID_HEVC) {
    ret = ff_isom_write_hvcc(pb, params_->extradata, params_->extradata_size, 1, NULL);
  } else {
    // For other codecs (AV1, VP9, etc.), extradata is already in the correct format
    avio_write(pb, params_->extradata, params_->extradata_size);
    ret = 0;
  }

  int size = avio_close_dyn_buf(pb, &buf);

  if (ret < 0 || size <= 0) {
    av_free(buf);
    return env.Null();
  }

  Napi::Buffer<uint8_t> result = Napi::Buffer<uint8_t>::Copy(env, buf, size);
  av_free(buf);
  return result;
}

Napi::Value CodecParameters::Dispose(const Napi::CallbackInfo& info) {
  return Free(info);
}


} // namespace ffmpeg