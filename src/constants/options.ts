/**
 * Auto-generated codec private-option types.
 * Generated from FFmpeg codec AVOption sources (see scripts/generate-options-source.js).
 * DO NOT EDIT MANUALLY.
 */

export interface CodecContextOptions {
  /** set bitrate (in bits/s) */
  b?: number;
  /** set bitrate (in bits/s) */
  ab?: number;
  /** Set video bitrate tolerance (in bits/s). In 1-pass mode, bitrate tolerance specifies how far  */
  bt?: number;
  flags?:
    | 'unaligned'
    | 'mv4'
    | 'qpel'
    | 'loop'
    | 'qscale'
    | 'recon_frame'
    | 'copy_opaque'
    | 'frame_duration'
    | 'pass1'
    | 'pass2'
    | 'gray'
    | 'psnr'
    | 'ildct'
    | 'low_delay'
    | 'global_header'
    | 'bitexact'
    | 'aic'
    | 'ilme'
    | 'cgop'
    | 'output_corrupt'
    | (string & {});
  flags2?:
    | 'fast'
    | 'noout'
    | 'ignorecrop'
    | 'local_header'
    | 'chunks'
    | 'showall'
    | 'export_mvs'
    | 'skip_manual'
    | 'ass_ro_flush_noop'
    | 'icc_profiles'
    | 'fixed_frame_size'
    | (string & {});
  /** Export metadata as side data */
  export_side_data?: 'mvs' | 'prft' | 'venc_params' | 'film_grain' | 'enhancements' | (string & {});
  time_base?: string | number;
  /** set the group of picture (GOP) size */
  g?: number;
  /** set audio sampling rate (in Hz) */
  ar?: number;
  /** set cutoff bandwidth */
  cutoff?: number;
  frame_size?: number;
  frame_number?: number;
  delay?: number;
  /** video quantizer scale compression (VBR). Constant of ratecontrol equation.  */
  qcomp?: number;
  /** video quantizer scale blur (VBR) */
  qblur?: number;
  /** minimum video quantizer scale (VBR) */
  qmin?: number;
  /** maximum video quantizer scale (VBR) */
  qmax?: number;
  /** maximum difference between the quantizer scales (VBR) */
  qdiff?: number;
  /** set maximum number of B-frames between non-B-frames */
  bf?: number;
  /** QP factor between P- and B-frames */
  b_qfactor?: number;
  codec_tag?: number;
  /** work around not autodetected encoder bugs */
  bug?:
    | 'autodetect'
    | 'xvid_ilace'
    | 'ump4'
    | 'no_padding'
    | 'amv'
    | 'qpel_chroma'
    | 'std_qpel'
    | 'qpel_chroma2'
    | 'direct_blocksize'
    | 'edge'
    | 'hpel_chroma'
    | 'dc_clip'
    | 'ms'
    | 'trunc'
    | 'iedge'
    | (string & {});
  /** how strictly to follow the standards */
  strict?: 'very' | 'strict' | 'normal' | 'unofficial' | 'experimental';
  /** QP offset between P- and B-frames */
  b_qoffset?: number;
  /** set error detection flags */
  err_detect?: 'crccheck' | 'bitstream' | 'buffer' | 'explode' | 'ignore_err' | 'careful' | 'compliant' | 'aggressive' | (string & {});
  has_b_frames?: number;
  block_align?: number;
  rc_override_count?: number;
  /** maximum bitrate (in bits/s). Used for VBV together with bufsize. */
  maxrate?: number;
  /** minimum bitrate (in bits/s). Most useful in setting up a CBR encode. It is of little use otherwise. */
  minrate?: number;
  /** set ratecontrol buffer size (in bits) */
  bufsize?: number;
  /** QP factor between P- and I-frames */
  i_qfactor?: number;
  /** QP offset between P- and I-frames */
  i_qoffset?: number;
  /** DCT algorithm */
  dct?: 'auto' | 'fastint' | 'int' | 'mmx' | 'altivec' | 'faan' | 'neon';
  /** compresses bright areas stronger than medium ones */
  lumi_mask?: number;
  /** temporal complexity masking */
  tcplx_mask?: number;
  /** spatial complexity masking */
  scplx_mask?: number;
  /** inter masking */
  p_mask?: number;
  /** compresses dark areas stronger than medium ones */
  dark_mask?: number;
  /** select IDCT implementation */
  idct?:
    | 'auto'
    | 'int'
    | 'simple'
    | 'simplemmx'
    | 'arm'
    | 'altivec'
    | 'simplearm'
    | 'simplearmv5te'
    | 'simplearmv6'
    | 'simpleneon'
    | 'xvid'
    | 'xvidmmx'
    | 'faani'
    | 'simpleauto';
  /** set error concealment strategy */
  ec?: 'guess_mvs' | 'deblock' | 'favor_inter' | (string & {});
  bits_per_coded_sample?: number;
  /** sample aspect ratio */
  aspect?: string | number;
  /** sample aspect ratio */
  sar?: string | number;
  /** print specific debug info */
  debug?:
    | 'pict'
    | 'rc'
    | 'bitstream'
    | 'mb_type'
    | 'qp'
    | 'dct_coeff'
    | 'green_metadata'
    | 'skip'
    | 'startcode'
    | 'er'
    | 'mmco'
    | 'bugs'
    | 'buffers'
    | 'thread_ops'
    | 'nomc'
    | (string & {});
  /** diamond type &amp; size for motion estimation */
  dia_size?: number;
  /** amount of motion predictors from the previous frame */
  last_pred?: number;
  /** diamond type &amp; size for motion estimation pre-pass */
  pre_dia_size?: number;
  /** sub-pel motion estimation quality */
  subq?: number;
  /** limit motion vectors range (1023 for DivX player) */
  me_range?: number;
  global_quality?: number;
  slice_flags?: number;
  /** macroblock decision algorithm (high quality mode) */
  mbd?: 'simple' | 'bits' | 'rd';
  /** number of bits which should be loaded into the rc buffer before decoding starts */
  rc_init_occupancy?: number;
  /** set the number of threads */
  threads?: 'auto';
  /** deprecated; use intra_dc_precision for MPEG-2 instead */
  dc?: number;
  /** nsse weight */
  nssew?: number;
  /** number of macroblock rows at the top which are skipped */
  skip_top?: number;
  /** number of macroblock rows at the bottom which are skipped */
  skip_bottom?: number;
  profile?: 'unknown' | 'main10';
  /** encoding level, usually corresponding to the profile level, codec-specific */
  level?: 'unknown';
  /** decode at 1= 1/2, 2=1/4, 3=1/8 resolutions */
  lowres?: number;
  /** full-pel ME compare function */
  cmp?: 'sad' | 'sse' | 'satd' | 'dct' | 'psnr' | 'bit' | 'rd' | 'zero' | 'vsad' | 'vsse' | 'nsse' | 'w53' | 'w97' | 'dctmax' | 'chroma' | 'msad';
  /** sub-pel ME compare function */
  subcmp?: 'sad' | 'sse' | 'satd' | 'dct' | 'psnr' | 'bit' | 'rd' | 'zero' | 'vsad' | 'vsse' | 'nsse' | 'w53' | 'w97' | 'dctmax' | 'chroma' | 'msad';
  /** macroblock compare function */
  mbcmp?: 'sad' | 'sse' | 'satd' | 'dct' | 'psnr' | 'bit' | 'rd' | 'zero' | 'vsad' | 'vsse' | 'nsse' | 'w53' | 'w97' | 'dctmax' | 'chroma' | 'msad';
  /** interlaced DCT compare function */
  ildctcmp?: 'sad' | 'sse' | 'satd' | 'dct' | 'psnr' | 'bit' | 'rd' | 'zero' | 'vsad' | 'vsse' | 'nsse' | 'w53' | 'w97' | 'dctmax' | 'chroma' | 'msad';
  /** pre motion estimation compare function */
  precmp?: 'sad' | 'sse' | 'satd' | 'dct' | 'psnr' | 'bit' | 'rd' | 'zero' | 'vsad' | 'vsse' | 'nsse' | 'w53' | 'w97' | 'dctmax' | 'chroma' | 'msad';
  /** minimum macroblock Lagrange factor (VBR) */
  mblmin?: number;
  /** maximum macroblock Lagrange factor (VBR) */
  mblmax?: number;
  /** skip loop filtering process for the selected frames */
  skip_loop_filter?: 'none' | 'default' | 'noref' | 'bidir' | 'nointra' | 'nokey' | 'all';
  /** skip IDCT/dequantization for the selected frames */
  skip_idct?: 'none' | 'default' | 'noref' | 'bidir' | 'nointra' | 'nokey' | 'all';
  /** skip decoding for the selected frames */
  skip_frame?: 'none' | 'default' | 'noref' | 'bidir' | 'nointra' | 'nokey' | 'all';
  /** refine the two motion vectors used in bidirectional macroblocks */
  bidir_refine?: number;
  /** minimum interval between IDR-frames */
  keyint_min?: number;
  /** reference frames to consider for motion compensation */
  refs?: number;
  /** rate-distortion optimal quantization */
  trellis?: number;
  mv0_threshold?: number;
  compression_level?: number;
  bits_per_raw_sample?: number;
  ch_layout?: string;
  rc_max_vbv_use?: number;
  rc_min_vbv_use?: number;
  /** color primaries */
  color_primaries?:
    | 'bt709'
    | 'unknown'
    | 'bt470m'
    | 'bt470bg'
    | 'smpte170m'
    | 'smpte240m'
    | 'film'
    | 'bt2020'
    | 'smpte428'
    | 'smpte428_1'
    | 'smpte431'
    | 'smpte432'
    | 'jedec-p22'
    | 'ebu3213'
    | 'unspecified';
  /** color transfer characteristics */
  color_trc?:
    | 'bt709'
    | 'unknown'
    | 'gamma22'
    | 'bt470m'
    | 'gamma28'
    | 'bt470bg'
    | 'smpte170m'
    | 'smpte240m'
    | 'linear'
    | 'log100'
    | 'log316'
    | 'iec61966-2-4'
    | 'bt1361e'
    | 'iec61966-2-1'
    | 'bt2020-10'
    | 'bt2020-12'
    | 'smpte2084'
    | 'smpte428'
    | 'arib-std-b67'
    | 'unspecified'
    | 'log'
    | 'log_sqrt'
    | 'iec61966_2_4'
    | 'bt1361'
    | 'iec61966_2_1'
    | 'bt2020_10bit'
    | 'bt2020_12bit'
    | 'smpte428_1';
  /** color space */
  colorspace?:
    | 'rgb'
    | 'bt709'
    | 'unknown'
    | 'fcc'
    | 'bt470bg'
    | 'smpte170m'
    | 'smpte240m'
    | 'ycgco'
    | 'bt2020nc'
    | 'bt2020c'
    | 'smpte2085'
    | 'chroma-derived-nc'
    | 'chroma-derived-c'
    | 'ictcp'
    | 'ipt-c2'
    | 'unspecified'
    | 'ycocg'
    | 'ycgco-re'
    | 'ycgco-ro'
    | 'bt2020_ncl'
    | 'bt2020_cl';
  /** color range */
  color_range?: 'unknown' | 'tv' | 'pc' | 'unspecified' | 'mpeg' | 'jpeg' | 'limited' | 'full';
  /** chroma sample location */
  chroma_sample_location?: 'unknown' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom' | 'unspecified';
  /** alpha mode */
  alpha_mode?: 'unknown' | 'unspecified' | 'premultiplied' | 'straight';
  /** set the log level offset */
  log_level_offset?: number;
  /** set the number of slices, used in parallelized encoding */
  slices?: number;
  /** select multithreading type */
  thread_type?: 'slice' | 'frame' | (string & {});
  /** audio service type */
  audio_service_type?: 'ma' | 'ef' | 'vi' | 'hi' | 'di' | 'co' | 'em' | 'vo' | 'ka';
  /** sample format audio decoders should prefer */
  request_sample_fmt?: string;
  pkt_timebase?: string | number;
  /** set input text subtitles character encoding */
  sub_charenc?: string;
  /** set input text subtitles character encoding mode */
  sub_charenc_mode?: 'do_nothing' | 'auto' | 'pre_decoder' | 'ignore' | (string & {});
  apply_cropping?: boolean;
  /** Skip processing alpha */
  skip_alpha?: boolean;
  /** Field order */
  field_order?: 'progressive' | 'tt' | 'bb' | 'tb' | 'bt';
  /** set information dump field separator */
  dump_separator?: string;
  /** List of decoders that are allowed to be used */
  codec_whitelist?: string;
  /** set pixel format */
  pixel_format?: string;
  /** set video size */
  video_size?: string;
  /** Maximum number of pixels */
  max_pixels?: number;
  /** Maximum number of samples */
  max_samples?: number;
  hwaccel_flags?: 'ignore_level' | 'allow_high_depth' | 'allow_profile_mismatch' | 'unsafe_output' | 'low_priority' | (string & {});
  /** Number of extra hardware frames to allocate for the user */
  extra_hw_frames?: number;
  /** Percentage of damaged samples to discard a frame */
  discard_damaged_percentage?: number;
  /** Comma-separated list of side data types for which user-supplied (container) data is preferred over coded bytestream */
  side_data_prefer_packet?:
    | 'replaygain'
    | 'displaymatrix'
    | 'spherical'
    | 'stereo3d'
    | 'audio_service_type'
    | 'mastering_display_metadata'
    | 'content_light_level'
    | 'icc_profile'
    | 'exif';
}

export interface EncoderOptionsMap {
  /**
   * AAC (Advanced Audio Coding)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#aac
   */
  aac: {
    /** Coding algorithm */
    aac_coder?: 'twoloop' | 'fast';
    /** Force M/S stereo coding */
    aac_ms?: boolean;
    /** Intensity stereo coding */
    aac_is?: boolean;
    /** Perceptual noise substitution */
    aac_pns?: boolean;
    /** Temporal noise shaping */
    aac_tns?: boolean;
    /** Forces the use of PCEs */
    aac_pce?: boolean;
  };
  /**
   * ALAC (Apple Lossless Audio Codec)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#alac
   */
  alac: {
    min_prediction_order?: number;
    max_prediction_order?: number;
  };
  /**
   * AMV Video
   * @see https://ffmpeg.org/ffmpeg-codecs.html#amv
   */
  amv: {
    /** Flags common for all mpegvideo-based encoders. */
    mpv_flags?: 'skip_rd' | 'strict_gop' | 'qp_rd' | 'cbp_rd' | 'naq' | (string & {});
    /** single coefficient elimination threshold for luminance (negative values also consider dc coefficient) */
    luma_elim_threshold?: number;
    /** single coefficient elimination threshold for chrominance (negative values also consider dc coefficient) */
    chroma_elim_threshold?: number;
    quantizer_noise_shaping?: number;
    /** Simulate errors in the bitstream to test error concealment. */
    error_rate?: number;
    /** how to keep quantizer between qmin and qmax (0 = clip, 1 = use differentiable function) */
    qsquish?: number;
    /** experimental quantizer modulation */
    rc_qmod_amp?: number;
    /** experimental quantizer modulation */
    rc_qmod_freq?: number;
    /** Set rate control equation. When computing the expression, besides the standard functions  */
    rc_eq?: string;
    /** initial complexity for 1-pass encoding */
    rc_init_cplx?: number;
    /** currently useless */
    rc_buf_aggressivity?: number;
    /** increase the quantizer for macroblocks close to borders */
    border_mask?: number;
    /** minimum Lagrange factor (VBR) */
    lmin?: number;
    /** maximum Lagrange factor (VBR) */
    lmax?: number;
    /** Frame skip threshold */
    skip_threshold?: number;
    /** Frame skip factor */
    skip_factor?: number;
    /** Frame skip exponent */
    skip_exp?: number;
    /** Frame skip compare function */
    skip_cmp?: 'sad' | 'sse' | 'satd' | 'dct' | 'psnr' | 'bit' | 'rd' | 'zero' | 'vsad' | 'vsse' | 'nsse' | 'dct264' | 'dctmax' | 'chroma' | 'msad';
    /** Noise reduction */
    noise_reduction?: number;
    /** RTP payload size in bytes */
    ps?: number;
  };
  /**
   * APNG (Animated Portable Network Graphics) image
   * @see https://ffmpeg.org/ffmpeg-codecs.html#apng
   */
  apng: {
    /** Set image resolution (in dots per inch) */
    dpi?: number;
    /** Set image resolution (in dots per meter) */
    dpm?: number;
    /** Prediction method */
    pred?: 'none' | 'sub' | 'up' | 'avg' | 'paeth' | 'mixed';
  };
  /**
   * AMD AMF AV1 encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#av1_005famf
   */
  av1_amf: {
    /** Set the encoding usage */
    usage?: 'transcoding' | 'ultralowlatency' | 'lowlatency' | 'webcam' | 'high_quality' | 'lowlatency_high_quality';
    /** Set color bit deph */
    bitdepth?: '8' | '10';
    /** Set the profile */
    profile?: 'main';
    /** Set the encoding level (default auto) */
    level?:
      | 'auto'
      | '2.0'
      | '2.1'
      | '2.2'
      | '2.3'
      | '3.0'
      | '3.1'
      | '3.2'
      | '3.3'
      | '4.0'
      | '4.1'
      | '4.2'
      | '4.3'
      | '5.0'
      | '5.1'
      | '5.2'
      | '5.3'
      | '6.0'
      | '6.1'
      | '6.2'
      | '6.3'
      | '7.0'
      | '7.1'
      | '7.2'
      | '7.3';
    /** Set the encoding quality preset */
    quality?: 'high_quality' | 'quality' | 'balanced' | 'speed';
    /** Set the encoding quality preset */
    preset?: 'high_quality' | 'quality' | 'balanced' | 'speed';
    /** Set the encoding latency mode */
    latency?: 'none' | 'power_saving_real_time' | 'real_time' | 'lowest_latency';
    /** Set the rate control mode */
    rc?: 'cqp' | 'vbr_latency' | 'vbr_peak' | 'cbr' | 'qvbr' | 'hqvbr' | 'hqcbr';
    /** Sets the QVBR quality level */
    qvbr_quality_level?: number;
    /** Set header insertion mode */
    header_insertion_mode?: 'none' | 'gop' | 'frame';
    /** Set maximum encoding parallelism. Higher values increase output latency. */
    async_depth?: number;
    /** Enable preencode */
    preencode?: boolean;
    /** Enforce HRD */
    enforce_hrd?: boolean;
    /** Filler Data Enable */
    filler_data?: boolean;
    /** Maximum number of consecutive B Pictures */
    max_b_frames?: number;
    /** B Picture Pattern */
    bf?: number;
    /** Enable High motion quality boost mode */
    high_motion_quality_boost_enable?: boolean;
    /** min quantization parameter for I-frame */
    min_qp_i?: number;
    /** max quantization parameter for I-frame */
    max_qp_i?: number;
    /** min quantization parameter for P-frame */
    min_qp_p?: number;
    /** max quantization parameter for P-frame */
    max_qp_p?: number;
    /** min quantization parameter for B-frame */
    min_qp_b?: number;
    /** max quantization parameter for B-frame */
    max_qp_b?: number;
    /** quantization parameter for P-frame */
    qp_p?: number;
    /** quantization parameter for I-frame */
    qp_i?: number;
    /** quantization parameter for B-frame */
    qp_b?: number;
    /** Rate Control Based Frame Skip */
    skip_frame?: boolean;
    /** adaptive quantization mode */
    aq_mode?: 'none' | 'caq';
    /** Force I frames to be IDR frames */
    forced_idr?: boolean;
    /** alignment mode */
    align?: '64x16' | '1080p' | 'none';
    /** Enable Smart Access Video to enhance  performance by utilizing both APU and dGPU memory access */
    smart_access_video?: boolean;
    /** Enable preanalysis */
    preanalysis?: boolean;
    /** Set the type of activity analysis */
    pa_activity_type?: 'y' | 'yuv';
    /** Enable scene change detection */
    pa_scene_change_detection_enable?: boolean;
    /** Set the sensitivity of scene change detection */
    pa_scene_change_detection_sensitivity?: 'low' | 'medium' | 'high';
    /** Enable static scene detection */
    pa_static_scene_detection_enable?: boolean;
    /** Set the sensitivity of static scene detection */
    pa_static_scene_detection_sensitivity?: 'low' | 'medium' | 'high';
    /** The QP value that is used immediately after a scene change */
    pa_initial_qp_after_scene_change?: number;
    /** The QP threshold to allow a skip frame */
    pa_max_qp_before_force_skip?: number;
    /** Content Adaptive Quantization strength */
    pa_caq_strength?: 'low' | 'medium' | 'high';
    /** Enable Frame SAD algorithm */
    pa_frame_sad_enable?: boolean;
    /** Enable long term reference frame management */
    pa_ltr_enable?: boolean;
    /** Sets the PA lookahead buffer size */
    pa_lookahead_buffer_depth?: number;
    /** Sets the perceptual adaptive quantization mode */
    pa_paq_mode?: 'none' | 'caq';
    /** Sets the temporal adaptive quantization mode */
    pa_taq_mode?: 'none' | '1' | '2';
    /** Sets the PA high motion quality boost mode */
    pa_high_motion_quality_boost_mode?: 'none' | 'auto';
    /** Enable Adaptive B-frame */
    pa_adaptive_mini_gop?: boolean;
  };
  /**
   * D3D12VA av1 encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#av1_005fd3d12va
   */
  av1_d3d12va: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Maximum frame size (in bytes) */
    max_frame_size?: number;
    /** Set intra refresh mode */
    intra_refresh_mode?: 'none' | 'row_based';
    /** Number of frames over which to spread intra refresh (0 = GOP size) */
    intra_refresh_duration?: number;
    /** Motion estimation precision mode */
    me_precision?: 'maximum' | 'full_pixel' | 'half_pixel' | 'quarter_pixel' | 'eighth_pixel';
    /** Set rate control mode */
    rc_mode?: 'auto' | 'CQP' | 'CBR' | 'VBR' | 'QVBR';
    /** Constant QP (for P-frames; scaled by qfactor/qoffset for I/B) */
    qp?: number;
    /** Set profile (general_profile_idc) */
    profile?: number;
    /** Set tier (general_tier_flag) */
    tier?: number;
    /** Set level (general_level_idc) */
    level?: number;
  };
  /**
   * NVIDIA NVENC av1 encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#av1_005fnvenc
   */
  av1_nvenc: {
    /** Set the encoding preset */
    preset?: 'default' | 'slow' | 'medium' | 'fast' | 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7';
    /** Set the encoding tuning info */
    tune?: 'hq' | 'uhq' | 'll' | 'ull' | 'lossless';
    /** Set the encoding level restriction */
    level?:
      | 'auto'
      | '2'
      | '2.0'
      | '2.1'
      | '2.2'
      | '2.3'
      | '3'
      | '3.0'
      | '3.1'
      | '3.2'
      | '3.3'
      | '4'
      | '4.0'
      | '4.1'
      | '4.2'
      | '4.3'
      | '5'
      | '5.0'
      | '5.1'
      | '5.2'
      | '5.3'
      | '6'
      | '6.0'
      | '6.1'
      | '6.2'
      | '6.3'
      | '7'
      | '7.0'
      | '7.1'
      | '7.2'
      | '7.3';
    /** Set the encoding tier */
    tier?: '0' | '1';
    /** Override the preset rate-control */
    rc?: 'constqp' | 'vbr' | 'cbr';
    /** Set the multipass encoding */
    multipass?: 'disabled' | 'qres' | 'fullres';
    /** Enable 10 bit encode for 8 bit input */
    highbitdepth?: boolean;
    /** Number of tile rows to encode with */
    'tile-rows'?: number;
    /** Number of tile columns to encode with */
    'tile-columns'?: number;
    /** Number of concurrent surfaces */
    surfaces?: number;
    /** Selects which NVENC capable GPU to use. First GPU is 0, second is 1, and so on. */
    gpu?: 'any' | 'list';
    /** Configure how nvenc handles packed RGB input. */
    rgb_mode?: 'yuv420' | 'yuv444' | 'disabled';
    /** Delay frame output by the given amount of frames */
    delay?: number;
    /** Number of frames to look ahead for rate-control */
    'rc-lookahead'?: number;
    /** Set target quality level (0 to 63, 0 means automatic) for constant quality mode in VBR rate control */
    cq?: number;
    /** Initial QP value for P frame */
    init_qpP?: number;
    /** Initial QP value for B frame */
    init_qpB?: number;
    /** Initial QP value for I frame */
    init_qpI?: number;
    /** Constant quantization parameter rate control method */
    qp?: number;
    /** Quantization parameter offset for cb channel */
    qp_cb_offset?: number;
    /** Quantization parameter offset for cr channel */
    qp_cr_offset?: number;
    /** Specifies the minimum QP used for rate control */
    qmin?: number;
    /** Specifies the maximum QP used for rate control */
    qmax?: number;
    /** When lookahead is enabled, set this to 1 to disable adaptive I-frame insertion at scene cuts */
    'no-scenecut'?: boolean;
    /** If forcing keyframes, force them as IDR frames. */
    'forced-idr'?: boolean;
    /** When lookahead is enabled, set this to 0 to disable adaptive B-frame decision */
    b_adapt?: boolean;
    /** set to 1 to enable Spatial AQ */
    'spatial-aq'?: boolean;
    /** set to 1 to enable Temporal AQ */
    'temporal-aq'?: boolean;
    /** Set 1 to indicate zero latency operation (no reordering delay) */
    zerolatency?: boolean;
    /** Set this to 1 to enable automatic insertion of non-reference P-frames */
    nonref_p?: boolean;
    /** Set 1 to minimize GOP-to-GOP rate fluctuations */
    strict_gop?: boolean;
    /** When Spatial AQ is enabled, this field is used to specify AQ strength. AQ strength scale is from 1 (low) - 15 (aggressive) */
    'aq-strength'?: number;
    /** Enable weighted prediction */
    weighted_pred?: boolean;
    /** Use B frames as references */
    b_ref_mode?: 'disabled' | 'each' | 'middle' | 'hierarchical';
    /** Specifies the DPB size used for encoding (0 means automatic) */
    dpb_size?: number;
    /** Low delay key frame scale; Specifies the Scene Change frame size increase allowed in case of single frame VBV and CBR */
    ldkfs?: number;
    /** Use Periodic Intra Refresh instead of IDR frames */
    'intra-refresh'?: boolean;
    /** Include timing info in sequence/frame headers */
    'timing-info'?: boolean;
    /** Pass on extra SEI data (e.g. a53 cc) to be included in the bitstream */
    extra_sei?: boolean;
    /** Use A53 Closed Captions (if available) */
    a53cc?: boolean;
    /** Use timecode (if available) */
    s12m_tc?: boolean;
    /** Pad the bitstream to ensure bitrate does not drop below the target in CBR mode */
    cbr_padding?: boolean;
    /** Specifies the strength of the temporal filtering */
    tf_level?: '0' | '4';
    /** Specifies the lookahead level. Higher level may improve quality at the expense of performance. */
    lookahead_level?: 'auto' | '0' | '1' | '2' | '3';
    /** Specifies the split encoding mode */
    split_encode_mode?: 'disabled' | 'auto' | 'forced' | '2' | '3' | '4';
  };
  /**
   * AV1 (Intel Quick Sync Video acceleration)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#av1_005fqsv
   */
  av1_qsv: {
    /** Maximum processing parallelism */
    async_depth?: number;
    preset?: 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
    /** Forcing I frames as IDR frames */
    forced_idr?: boolean;
    /** enable low power mode(experimental: many limitations by mfx version, BRC modes, etc.) */
    low_power?: boolean;
    /** Set QSV encoder parameters as key1=value1:key2=value2:... */
    qsv_params?: string;
    /** Strategy to choose between I/P/B-frames */
    b_strategy?: number;
    /** Adaptive I-frame placement */
    adaptive_i?: number;
    /** Adaptive B-frame placement */
    adaptive_b?: number;
    /** Extended bitrate control */
    extbrc?: number;
    /** Allow to strictly obey avg frame size */
    low_delay_brc?: boolean;
    /** Maximum encoded frame size in bytes */
    max_frame_size?: number;
    /** Maximum encoded I frame size in bytes */
    max_frame_size_i?: number;
    /** Maximum encoded P frame size in bytes */
    max_frame_size_p?: number;
    profile?: 'unknown' | 'main';
    /** Number of columns for tiled encoding */
    tile_cols?: number;
    /** Number of rows for tiled encoding */
    tile_rows?: number;
    /** Depth of look ahead in number frames, available when extbrc option is enabled */
    look_ahead_depth?: number;
  };
  /**
   * AV1 (VAAPI)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#av1_005fvaapi
   */
  av1_vaapi: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Use low-power encoding mode (only available on some platforms;  */
    low_power?: boolean;
    /** Maximum frame size (in bytes) */
    max_frame_size?: number;
    /** Set rate control mode */
    rc_mode?: 'auto' | 'CQP' | 'CBR' | 'VBR' | 'ICQ' | 'QVBR' | 'AVBR';
    /** Block level based bitrate control */
    blbrc?: boolean;
    /** Set profile (seq_profile) */
    profile?: 'main' | 'high' | 'professional';
    /** Set tier (seq_tier) */
    tier?: 'main' | 'high';
    /** Set level (seq_level_idx) */
    level?: '2.0' | '2.1' | '3.0' | '3.1' | '4.0' | '4.1' | '5.0' | '5.1' | '5.2' | '5.3' | '6.0' | '6.1' | '6.2' | '6.3';
    /** Tile columns x rows (Use minimal tile column/row number automatically by default) */
    tiles?: string;
    /** Number of tile groups for encoding */
    tile_groups?: number;
  };
  /**
   * AV1 (Vulkan)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#av1_005fvulkan
   */
  av1_vulkan: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Use an explicit constant quantizer for the whole stream */
    qp?: number;
    /** Set encode quality (trades off against speed, higher is slower) */
    quality?: number;
    /** Select rate control type */
    rc_mode?: number;
    /** Select tuning type */
    tune?: number;
    /** Select usage type */
    usage?: string;
    /** Select content type */
    content?: string;
    /** Set profile */
    profile?: 'main' | 'high' | 'professional';
    /** Set tier (seq_tier) */
    tier?: 'main' | 'high';
    /** Set level (level_idc) */
    level?:
      | '20'
      | '21'
      | '22'
      | '23'
      | '30'
      | '31'
      | '32'
      | '33'
      | '40'
      | '41'
      | '42'
      | '43'
      | '50'
      | '51'
      | '52'
      | '53'
      | '60'
      | '61'
      | '62'
      | '63'
      | '70'
      | '71'
      | '72'
      | '73';
    /** Set units to include */
    units?: string;
  };
  /**
   * GoPro CineForm HD
   * @see https://ffmpeg.org/ffmpeg-codecs.html#cfhd
   */
  cfhd: {
    /** set quality */
    quality?: 'film3+' | 'film3' | 'film2+' | 'film2' | 'film1.5' | 'film1+' | 'film1' | 'high+' | 'high' | 'medium+' | 'medium' | 'low+' | 'low';
  };
  /**
   * Cinepak
   * @see https://ffmpeg.org/ffmpeg-codecs.html#cinepak
   */
  cinepak: {
    /** Max extra codebook recalculation passes, more is better and slower */
    max_extra_cb_iterations?: number;
    /** Avoid wasting bytes, ignore vintage MacOS decoder */
    skip_empty_cb?: boolean;
    /** Limit strips/frame, vintage compatible is 1..3, otherwise the more the better */
    max_strips?: number;
    /** Enforce min strips/frame, more is worse and faster, must be &lt;= max_strips */
    min_strips?: number;
    /** How fast the strip number adapts, more is slightly better, much slower */
    strip_number_adaptivity?: number;
  };
  /**
   * Cirrus Logic AccuPak
   * @see https://ffmpeg.org/ffmpeg-codecs.html#cljr
   */
  cljr: {
    /** Dither type */
    dither_type?: number;
  };
  /**
   * DCA (DTS Coherent Acoustics)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#dca
   */
  dca: {
    /** Use ADPCM encoding */
    dca_adpcm?: boolean;
  };
  /**
   * VC3/DNxHD
   * @see https://ffmpeg.org/ffmpeg-codecs.html#dnxhd
   */
  dnxhd: {
    /** encode with Avid Nitris compatibility */
    nitris_compat?: boolean;
    /** intra quant bias */
    ibias?: number;
    profile?: 'dnxhd' | 'dnxhr_444' | 'dnxhr_hqx' | 'dnxhr_hq' | 'dnxhr_sq' | 'dnxhr_lb';
  };
  /**
   * DVB subtitles
   * @see https://ffmpeg.org/ffmpeg-codecs.html#dvbsub
   */
  dvbsub: {
    /** minimum bits-per-pixel for subtitle colors (2, 4 or 8) */
    min_bpp?: number;
  };
  /**
   * DVD subtitles
   * @see https://ffmpeg.org/ffmpeg-codecs.html#dvdsub
   */
  dvdsub: {
    /** set the global palette */
    palette?: string;
    /** Make number of rows even (workaround for some players) */
    even_rows_fix?: boolean;
  };
  /**
   * DV (Digital Video)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#dvvideo
   */
  dvvideo: {
    /** Quantizer dead zone */
    quant_deadzone?: number;
  };
  /**
   * Resolume DXV
   * @see https://ffmpeg.org/ffmpeg-codecs.html#dxv
   */
  dxv: {
    format?: 'dxt1';
  };
  /**
   * OpenEXR image
   * @see https://ffmpeg.org/ffmpeg-codecs.html#exr
   */
  exr: {
    /** set compression type */
    compression?: 'none' | 'rle' | 'zip1' | 'zip16';
    /** set pixel type */
    format?: 'half' | 'float';
    /** set gamma */
    gamma?: number;
  };
  /**
   * FFmpeg video codec #1
   * @see https://ffmpeg.org/ffmpeg-codecs.html#ffv1
   */
  ffv1: {
    /** Protect slices with CRCs */
    slicecrc?: number;
    /** Coder type */
    coder?: 'rice' | 'range_def' | 'range_tab' | 'ac';
    /** Context model */
    context?: number;
    /** Quantization table */
    qtable?: 'default' | '8bit' | 'greater8bit';
    /** Remap Mode */
    remap_mode?: 'auto' | 'off' | 'dualrle' | 'flipdualrle';
    /** Remap Optimizer */
    remap_optimizer?: number;
  };
  /**
   * FFmpeg video codec #1 (Vulkan)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#ffv1_005fvulkan
   */
  ffv1_vulkan: {
    /** Protect slices with CRCs */
    slicecrc?: number;
    /** Context model */
    context?: number;
    /** Coder type */
    coder?: 'rice' | 'range_def' | 'range_tab';
    /** Quantization table */
    qtable?: 'default' | '8bit' | 'greater8bit';
    /** Number of horizontal slices */
    slices_h?: number;
    /** Number of vertical slices */
    slices_v?: number;
    /** Code all slices with no prediction */
    force_pcm?: boolean;
    /** Run a search for RCT parameters (level 4 only) */
    rct_search?: boolean;
    /** Internal parallelization depth */
    async_depth?: number;
    /** Remap Mode */
    remap_mode?: 'auto' | 'off' | 'dualrle' | 'flipdualrle';
  };
  /**
   * Huffyuv FFmpeg variant
   * @see https://ffmpeg.org/ffmpeg-codecs.html#ffvhuff
   */
  ffvhuff: {
    /** Set per-frame huffman tables */
    context?: number;
    /** Allow multithreading for e.g. context=1 at the expense of determinism */
    non_deterministic?: boolean;
    /** Prediction method */
    pred?: 'left' | 'plane' | 'median';
  };
  /**
   * FLAC (Free Lossless Audio Codec)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#flac
   */
  flac: {
    /** LPC coefficient precision */
    lpc_coeff_precision?: number;
    /** LPC algorithm */
    lpc_type?: 'none' | 'fixed' | 'levinson' | 'cholesky';
    /** Number of passes to use for Cholesky factorization during LPC analysis */
    lpc_passes?: number;
    min_partition_order?: number;
    max_partition_order?: number;
    /** Search method for selecting prediction order */
    prediction_order_method?: 'estimation' | '2level' | '4level' | '8level' | 'search' | 'log';
    /** Stereo decorrelation mode */
    ch_mode?: 'auto' | 'indep' | 'left_side' | 'right_side' | 'mid_side';
    /** Calculate rice parameters exactly */
    exact_rice_parameters?: boolean;
    /** Multi-dimensional quantization */
    multi_dim_quant?: boolean;
    min_prediction_order?: number;
    max_prediction_order?: number;
  };
  /**
   * G.726 ADPCM
   * @see https://ffmpeg.org/ffmpeg-codecs.html#g726
   */
  g726: {
    /** Bits per code */
    code_size?: number;
  };
  /**
   * G.726 little endian ADPCM (\"right-justified\")
   * @see https://ffmpeg.org/ffmpeg-codecs.html#g726le
   */
  g726le: {
    /** Bits per code */
    code_size?: number;
  };
  /**
   * GIF (Graphics Interchange Format)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#gif
   */
  gif: {
    /** set GIF flags */
    gifflags?: 'offsetting' | 'transdiff' | (string & {});
    /** enable encoding only images per frame */
    gifimage?: boolean;
    /** write a palette to the global gif header where feasible */
    global_palette?: boolean;
  };
  /**
   * H.263 / H.263-1996
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h263
   */
  h263: {
    /** use overlapped block motion compensation. */
    obmc?: boolean;
    /** emit macroblock info for RFC 2190 packetization, the parameter value is the maximum payload size */
    mb_info?: number;
    /** Flags common for all mpegvideo-based encoders. */
    mpv_flags?: 'skip_rd' | 'strict_gop' | 'qp_rd' | 'cbp_rd' | 'naq' | 'mv0' | (string & {});
    /** single coefficient elimination threshold for luminance (negative values also consider dc coefficient) */
    luma_elim_threshold?: number;
    /** single coefficient elimination threshold for chrominance (negative values also consider dc coefficient) */
    chroma_elim_threshold?: number;
    quantizer_noise_shaping?: number;
    /** Simulate errors in the bitstream to test error concealment. */
    error_rate?: number;
    /** how to keep quantizer between qmin and qmax (0 = clip, 1 = use differentiable function) */
    qsquish?: number;
    /** experimental quantizer modulation */
    rc_qmod_amp?: number;
    /** experimental quantizer modulation */
    rc_qmod_freq?: number;
    /** Set rate control equation. When computing the expression, besides the standard functions  */
    rc_eq?: string;
    /** initial complexity for 1-pass encoding */
    rc_init_cplx?: number;
    /** currently useless */
    rc_buf_aggressivity?: number;
    /** increase the quantizer for macroblocks close to borders */
    border_mask?: number;
    /** minimum Lagrange factor (VBR) */
    lmin?: number;
    /** maximum Lagrange factor (VBR) */
    lmax?: number;
    /** Frame skip threshold */
    skip_threshold?: number;
    /** Frame skip factor */
    skip_factor?: number;
    /** Frame skip exponent */
    skip_exp?: number;
    /** Frame skip compare function */
    skip_cmp?: 'sad' | 'sse' | 'satd' | 'dct' | 'psnr' | 'bit' | 'rd' | 'zero' | 'vsad' | 'vsse' | 'nsse' | 'dct264' | 'dctmax' | 'chroma' | 'msad';
    /** Noise reduction */
    noise_reduction?: number;
    /** RTP payload size in bytes */
    ps?: number;
    /** motion estimation algorithm */
    motion_est?: 'zero' | 'epzs' | 'xone';
    /** Motion estimation bitrate penalty compensation (1.0 = 256) */
    mepc?: number;
    /** pre motion estimation */
    mepre?: number;
    /** Penalty for intra blocks in block decision */
    intra_penalty?: number;
    /** Scene change threshold */
    sc_threshold?: number;
  };
  /**
   * H.263+ / H.263-1998 / H.263 version 2
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h263p
   */
  h263p: {
    /** Use unlimited motion vectors. */
    umv?: boolean;
    /** Use alternative inter VLC. */
    aiv?: boolean;
    /** use overlapped block motion compensation. */
    obmc?: boolean;
    /** Write slice start position at every GOB header instead of just GOB number. */
    structured_slices?: boolean;
    /** Flags common for all mpegvideo-based encoders. */
    mpv_flags?: 'skip_rd' | 'strict_gop' | 'qp_rd' | 'cbp_rd' | 'naq' | 'mv0' | (string & {});
    /** single coefficient elimination threshold for luminance (negative values also consider dc coefficient) */
    luma_elim_threshold?: number;
    /** single coefficient elimination threshold for chrominance (negative values also consider dc coefficient) */
    chroma_elim_threshold?: number;
    quantizer_noise_shaping?: number;
    /** Simulate errors in the bitstream to test error concealment. */
    error_rate?: number;
    /** how to keep quantizer between qmin and qmax (0 = clip, 1 = use differentiable function) */
    qsquish?: number;
    /** experimental quantizer modulation */
    rc_qmod_amp?: number;
    /** experimental quantizer modulation */
    rc_qmod_freq?: number;
    /** Set rate control equation. When computing the expression, besides the standard functions  */
    rc_eq?: string;
    /** initial complexity for 1-pass encoding */
    rc_init_cplx?: number;
    /** currently useless */
    rc_buf_aggressivity?: number;
    /** increase the quantizer for macroblocks close to borders */
    border_mask?: number;
    /** minimum Lagrange factor (VBR) */
    lmin?: number;
    /** maximum Lagrange factor (VBR) */
    lmax?: number;
    /** Frame skip threshold */
    skip_threshold?: number;
    /** Frame skip factor */
    skip_factor?: number;
    /** Frame skip exponent */
    skip_exp?: number;
    /** Frame skip compare function */
    skip_cmp?: 'sad' | 'sse' | 'satd' | 'dct' | 'psnr' | 'bit' | 'rd' | 'zero' | 'vsad' | 'vsse' | 'nsse' | 'dct264' | 'dctmax' | 'chroma' | 'msad';
    /** Noise reduction */
    noise_reduction?: number;
    /** RTP payload size in bytes */
    ps?: number;
    /** motion estimation algorithm */
    motion_est?: 'zero' | 'epzs' | 'xone';
    /** Motion estimation bitrate penalty compensation (1.0 = 256) */
    mepc?: number;
    /** pre motion estimation */
    mepre?: number;
    /** Penalty for intra blocks in block decision */
    intra_penalty?: number;
    /** Scene change threshold */
    sc_threshold?: number;
  };
  /**
   * AMD AMF H.264 Encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h264_005famf
   */
  h264_amf: {
    /** Encoder Usage */
    usage?: 'transcoding' | 'ultralowlatency' | 'lowlatency' | 'webcam' | 'high_quality' | 'lowlatency_high_quality';
    /** Profile */
    profile?: 'main' | 'high' | 'constrained_baseline' | 'constrained_high';
    /** Profile Level */
    level?:
      | 'auto'
      | '1.0'
      | '1.1'
      | '1.2'
      | '1.3'
      | '2.0'
      | '2.1'
      | '2.2'
      | '3.0'
      | '3.1'
      | '3.2'
      | '4.0'
      | '4.1'
      | '4.2'
      | '5.0'
      | '5.1'
      | '5.2'
      | '6.0'
      | '6.1'
      | '6.2';
    /** enables low latency mode */
    latency?: boolean;
    /** Set the encoding quality preset */
    quality?: 'balanced' | 'speed' | 'quality' | 'high_quality';
    /** Set the encoding quality preset */
    preset?: 'balanced' | 'speed' | 'quality' | 'high_quality';
    /** Rate Control Method */
    rc?: 'cqp' | 'cbr' | 'vbr_peak' | 'vbr_latency' | 'qvbr' | 'hqvbr' | 'hqcbr';
    /** Sets the QVBR quality level */
    qvbr_quality_level?: number;
    /** Enforce HRD */
    enforce_hrd?: boolean;
    /** Filler Data Enable */
    filler_data?: boolean;
    /** Enable VBAQ */
    vbaq?: boolean;
    /** Rate Control Based Frame Skip */
    frame_skipping?: boolean;
    /** Quantization Parameter for I-Frame */
    qp_i?: number;
    /** Quantization Parameter for P-Frame */
    qp_p?: number;
    /** Quantization Parameter for B-Frame */
    qp_b?: number;
    /** Pre-encode assisted rate control */
    preencode?: boolean;
    /** Maximum Access Unit Size for rate control (in bits) */
    max_au_size?: number;
    /** Header Insertion Spacing */
    header_spacing?: number;
    /** Set maximum encoding parallelism. Higher values increase output latency. */
    async_depth?: number;
    /** B-Picture Delta QP */
    bf_delta_qp?: number;
    /** Enable Reference to B-Frames */
    bf_ref?: boolean;
    /** Reference B-Picture Delta QP */
    bf_ref_delta_qp?: number;
    /** Maximum number of consecutive B Pictures */
    max_b_frames?: number;
    /** B Picture Pattern */
    bf?: number;
    /** Intra Refresh MBs Number Per Slot in Macroblocks */
    intra_refresh_mb?: number;
    /** Coding Type */
    coder?: 'auto' | 'cavlc' | 'cabac';
    /** Enable High motion quality boost mode */
    high_motion_quality_boost_enable?: boolean;
    /** Enable ME Half Pixel */
    me_half_pel?: boolean;
    /** Enable ME Quarter Pixel */
    me_quarter_pel?: boolean;
    /** Force I frames to be IDR frames */
    forced_idr?: boolean;
    /** Inserts AU Delimiter NAL unit */
    aud?: boolean;
    /** Enable Smart Access Video to enhance  performance by utilizing both APU and dGPU memory access */
    smart_access_video?: boolean;
    /** Enable preanalysis */
    preanalysis?: boolean;
    /** Set the type of activity analysis */
    pa_activity_type?: 'y' | 'yuv';
    /** Enable scene change detection */
    pa_scene_change_detection_enable?: boolean;
    /** Set the sensitivity of scene change detection */
    pa_scene_change_detection_sensitivity?: 'low' | 'medium' | 'high';
    /** Enable static scene detection */
    pa_static_scene_detection_enable?: boolean;
    /** Set the sensitivity of static scene detection */
    pa_static_scene_detection_sensitivity?: 'low' | 'medium' | 'high';
    /** The QP value that is used immediately after a scene change */
    pa_initial_qp_after_scene_change?: number;
    /** The QP threshold to allow a skip frame */
    pa_max_qp_before_force_skip?: number;
    /** Content Adaptive Quantization strength */
    pa_caq_strength?: 'low' | 'medium' | 'high';
    /** Enable Frame SAD algorithm */
    pa_frame_sad_enable?: boolean;
    /** Enable long term reference frame management */
    pa_ltr_enable?: boolean;
    /** Sets the PA lookahead buffer size */
    pa_lookahead_buffer_depth?: number;
    /** Sets the perceptual adaptive quantization mode */
    pa_paq_mode?: 'none' | 'caq';
    /** Sets the temporal adaptive quantization mode */
    pa_taq_mode?: 'none' | '1' | '2';
    /** Sets the PA high motion quality boost mode */
    pa_high_motion_quality_boost_mode?: 'none' | 'auto';
    /** Enable Adaptive MiniGOP */
    pa_adaptive_mini_gop?: boolean;
  };
  /**
   * D3D12VA h264 encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h264_005fd3d12va
   */
  h264_d3d12va: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Maximum frame size (in bytes) */
    max_frame_size?: number;
    /** Set intra refresh mode */
    intra_refresh_mode?: 'none' | 'row_based';
    /** Number of frames over which to spread intra refresh (0 = GOP size) */
    intra_refresh_duration?: number;
    /** Motion estimation precision mode */
    me_precision?: 'maximum' | 'full_pixel' | 'half_pixel' | 'quarter_pixel' | 'eighth_pixel';
    /** Set rate control mode */
    rc_mode?: 'auto' | 'CQP' | 'CBR' | 'VBR' | 'QVBR';
    /** Constant QP (for P-frames; scaled by qfactor/qoffset for I/B) */
    qp?: number;
    /** Set profile (general_profile_idc) */
    profile?: number;
    /** Set level (general_level_idc) */
    level?: number;
    /** Deblocking filter mode */
    deblock?: boolean;
    /** Entropy coder type */
    coder?: number;
    /** Constrained intra prediction (constrained_intra_pred_flag) */
    constrained_intra_pred?: boolean;
  };
  /**
   * NVIDIA NVENC H.264 encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h264_005fnvenc
   */
  h264_nvenc: {
    /** Set the encoding preset */
    preset?:
      | 'default'
      | 'slow'
      | 'medium'
      | 'fast'
      | 'hp'
      | 'hq'
      | 'bd'
      | 'll'
      | 'llhq'
      | 'llhp'
      | 'lossless'
      | 'losslesshp'
      | 'p1'
      | 'p2'
      | 'p3'
      | 'p4'
      | 'p5'
      | 'p6'
      | 'p7';
    /** Set the encoding tuning info */
    tune?: 'hq' | 'll' | 'ull' | 'lossless';
    /** Set the encoding profile */
    profile?: 'baseline' | 'main' | 'high' | 'high10' | 'high422' | 'high444p';
    /** Set the encoding level restriction */
    level?:
      | 'auto'
      | '1'
      | '1.0'
      | '1b'
      | '1.0b'
      | '1.1'
      | '1.2'
      | '1.3'
      | '2'
      | '2.0'
      | '2.1'
      | '2.2'
      | '3'
      | '3.0'
      | '3.1'
      | '3.2'
      | '4'
      | '4.0'
      | '4.1'
      | '4.2'
      | '5'
      | '5.0'
      | '5.1'
      | '5.2'
      | '6.0'
      | '6.1'
      | '6.2';
    /** Override the preset rate-control */
    rc?: 'constqp' | 'vbr' | 'cbr' | 'vbr_minqp' | 'll_2pass_quality' | 'll_2pass_size' | 'vbr_2pass' | 'cbr_ld_hq' | 'cbr_hq' | 'vbr_hq';
    /** Number of frames to look ahead for rate-control */
    'rc-lookahead'?: number;
    /** Number of concurrent surfaces */
    surfaces?: number;
    /** Use cbr encoding mode */
    cbr?: boolean;
    /** Use 2pass encoding mode */
    '2pass'?: boolean;
    /** Selects which NVENC capable GPU to use. First GPU is 0, second is 1, and so on. */
    gpu?: 'any' | 'list';
    /** Configure how nvenc handles packed RGB input. */
    rgb_mode?: 'yuv420' | 'yuv444' | 'disabled';
    /** Delay frame output by the given amount of frames */
    delay?: number;
    /** When lookahead is enabled, set this to 1 to disable adaptive I-frame insertion at scene cuts */
    'no-scenecut'?: boolean;
    /** If forcing keyframes, force them as IDR frames. */
    'forced-idr'?: boolean;
    /** When lookahead is enabled, set this to 0 to disable adaptive B-frame decision */
    b_adapt?: boolean;
    /** set to 1 to enable Spatial AQ */
    'spatial-aq'?: boolean;
    /** set to 1 to enable Spatial AQ */
    spatial_aq?: boolean;
    /** set to 1 to enable Temporal AQ */
    'temporal-aq'?: boolean;
    /** set to 1 to enable Temporal AQ */
    temporal_aq?: boolean;
    /** Set 1 to indicate zero latency operation (no reordering delay) */
    zerolatency?: boolean;
    /** Set this to 1 to enable automatic insertion of non-reference P-frames */
    nonref_p?: boolean;
    /** Set 1 to minimize GOP-to-GOP rate fluctuations */
    strict_gop?: boolean;
    /** When Spatial AQ is enabled, this field is used to specify AQ strength. AQ strength scale is from 1 (low) - 15 (aggressive) */
    'aq-strength'?: number;
    /** Set target quality level (0 to 51, 0 means automatic) for constant quality mode in VBR rate control */
    cq?: number;
    /** Use access unit delimiters */
    aud?: boolean;
    /** Bluray compatibility workarounds */
    'bluray-compat'?: boolean;
    /** Initial QP value for P frame */
    init_qpP?: number;
    /** Initial QP value for B frame */
    init_qpB?: number;
    /** Initial QP value for I frame */
    init_qpI?: number;
    /** Constant quantization parameter rate control method */
    qp?: number;
    /** Quantization parameter offset for cb channel */
    qp_cb_offset?: number;
    /** Quantization parameter offset for cr channel */
    qp_cr_offset?: number;
    /** Specifies the minimum QP used for rate control */
    qmin?: number;
    /** Specifies the maximum QP used for rate control */
    qmax?: number;
    /** Set 1 to enable weighted prediction */
    weighted_pred?: number;
    /** Coder type */
    coder?: 'default' | 'auto' | 'cabac' | 'cavlc' | 'ac' | 'vlc';
    /** Use B frames as references */
    b_ref_mode?: 'disabled' | 'each' | 'middle';
    /** Use A53 Closed Captions (if available) */
    a53cc?: boolean;
    /** Use timecode (if available) */
    s12m_tc?: boolean;
    /** Specifies the DPB size used for encoding (0 means automatic) */
    dpb_size?: number;
    /** Set the multipass encoding */
    multipass?: 'disabled' | 'qres' | 'fullres';
    /** Enable 10 bit encode for 8 bit input */
    highbitdepth?: boolean;
    /** Low delay key frame scale; Specifies the Scene Change frame size increase allowed in case of single frame VBV and CBR */
    ldkfs?: number;
    /** Pass on extra SEI data (e.g. a53 cc) to be included in the bitstream */
    extra_sei?: boolean;
    /** Pass on user data unregistered SEI if available */
    udu_sei?: boolean;
    /** Use Periodic Intra Refresh instead of IDR frames */
    'intra-refresh'?: boolean;
    /** Use single slice intra refresh */
    'single-slice-intra-refresh'?: boolean;
    /** Maximum encoded slice size in bytes */
    max_slice_size?: number;
    /** Enable constrainedFrame encoding where each slice in the constrained picture is independent of other slices */
    'constrained-encoding'?: boolean;
    /** Pad the bitstream to ensure bitrate does not drop below the target in CBR mode */
    cbr_padding?: boolean;
    /** Specifies the strength of the temporal filtering */
    tf_level?: '0' | '4';
    /** Specifies the lookahead level. Higher level may improve quality at the expense of performance. */
    lookahead_level?: 'auto' | '0' | '1' | '2' | '3';
  };
  /**
   * OpenMAX IL H.264 video encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h264_005fomx
   */
  h264_omx: {
    /** OpenMAX library name */
    omx_libname?: string;
    /** OpenMAX library prefix */
    omx_libprefix?: string;
    /** Try to avoid copying input frames if possible */
    zerocopy?: number;
    /** Set the encoding profile */
    profile?: 'baseline' | 'main' | 'high';
  };
  /**
   * H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 (Intel Quick Sync Video acceleration)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h264_005fqsv
   */
  h264_qsv: {
    /** Maximum processing parallelism */
    async_depth?: number;
    preset?: 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
    /** Forcing I frames as IDR frames */
    forced_idr?: boolean;
    /** enable low power mode(experimental: many limitations by mfx version, BRC modes, etc.) */
    low_power?: boolean;
    /** Set QSV encoder parameters as key1=value1:key2=value2:... */
    qsv_params?: string;
    /** Enable rate distortion optimization */
    rdo?: number;
    /** Maximum encoded frame size in bytes */
    max_frame_size?: number;
    /** Maximum encoded I frame size in bytes */
    max_frame_size_i?: number;
    /** Maximum encoded P frame size in bytes */
    max_frame_size_p?: number;
    /** Maximum encoded slice size in bytes */
    max_slice_size?: number;
    /** Toggle bitrate limitations */
    bitrate_limit?: number;
    /** MB level bitrate control */
    mbbrc?: number;
    /** Extended bitrate control */
    extbrc?: number;
    /** Adaptive I-frame placement */
    adaptive_i?: number;
    /** Adaptive B-frame placement */
    adaptive_b?: number;
    /** Enable P-pyramid: 0-default 1-simple 2-pyramid(bf need to be set to 0). */
    p_strategy?: number;
    /** Strategy to choose between I/P/B-frames */
    b_strategy?: number;
    /** This option disable deblocking. It has value in range 0~2. */
    dblk_idc?: number;
    /** Allow to strictly obey avg frame size */
    low_delay_brc?: boolean;
    /** Maximum video quantizer scale for I frame */
    max_qp_i?: number;
    /** Minimum video quantizer scale for I frame */
    min_qp_i?: number;
    /** Maximum video quantizer scale for P frame */
    max_qp_p?: number;
    /** Minimum video quantizer scale for P frame */
    min_qp_p?: number;
    /** Maximum video quantizer scale for B frame */
    max_qp_b?: number;
    /** Minimum video quantizer scale for B frame */
    min_qp_b?: number;
    /** A hint to encoder about the scenario for the encoding session */
    scenario?: 'unknown' | 'displayremoting' | 'videoconference' | 'archive' | 'livestreaming' | 'cameracapture' | 'videosurveillance' | 'gamestreaming' | 'remotegaming';
    /** Accuracy of the AVBR ratecontrol (unit of tenth of percent) */
    avbr_accuracy?: number;
    /** Convergence of the AVBR ratecontrol (unit of 100 frames) */
    avbr_convergence?: number;
    /** Allow frame skipping */
    skip_frame?: 'no_skip' | 'insert_dummy' | 'insert_nothing' | 'brc_only';
    /** Prefer processing on both iGfx and dGfx simultaneously */
    dual_gfx?: 'off' | 'on' | 'adaptive';
    /** Enable CAVLC */
    cavlc?: boolean;
    /** Use the video conferencing mode ratecontrol */
    vcm?: boolean;
    /** Distance (in I-frames) between IDR frames */
    idr_interval?: number;
    /** Insert picture timing SEI with pic_struct_syntax element */
    pic_timing_sei?: boolean;
    /** Put all the SEI messages into one NALU */
    single_sei_nal_unit?: number;
    /** Maximum number of frames buffered in the DPB */
    max_dec_frame_buffering?: number;
    /** Use VBR algorithm with look ahead */
    look_ahead?: boolean;
    /** Depth of look ahead in number frames */
    look_ahead_depth?: number;
    /** Downscaling factor for the frames saved for the lookahead analysis */
    look_ahead_downsampling?: 'unknown' | 'auto' | 'off' | '2x' | '4x';
    /** Intra refresh type. B frames should be set to 0. */
    int_ref_type?: 'none' | 'vertical' | 'horizontal' | 'slice';
    /** Number of frames in the intra refresh cycle */
    int_ref_cycle_size?: number;
    /** QP difference for the refresh MBs */
    int_ref_qp_delta?: number;
    /** Insert recovery point SEI messages */
    recovery_point_sei?: number;
    /** Distance between the beginnings of the intra-refresh cycles in frames */
    int_ref_cycle_dist?: number;
    profile?: 'unknown' | 'baseline' | 'main' | 'high';
    /** Use A53 Closed Captions (if available) */
    a53cc?: boolean;
    /** Insert the Access Unit Delimiter NAL */
    aud?: boolean;
    /** Multi-Frame Mode */
    mfmode?: 'off' | 'auto';
    /** repeat pps for every frame */
    repeat_pps?: boolean;
  };
  /**
   * H.264/AVC (VAAPI)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h264_005fvaapi
   */
  h264_vaapi: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Use low-power encoding mode (only available on some platforms;  */
    low_power?: boolean;
    /** Maximum frame size (in bytes) */
    max_frame_size?: number;
    /** Set rate control mode */
    rc_mode?: 'auto' | 'CQP' | 'CBR' | 'VBR' | 'ICQ' | 'QVBR' | 'AVBR';
    /** Block level based bitrate control */
    blbrc?: boolean;
    /** Constant QP (for P-frames; scaled by qfactor/qoffset for I/B) */
    qp?: number;
    /** Set encode quality (trades off against speed, higher is faster) */
    quality?: number;
    /** Entropy coder type */
    coder?: 'cavlc' | 'cabac' | 'vlc' | 'ac';
    /** Include AUD */
    aud?: boolean;
    /** Set SEI to include */
    sei?: 'identifier' | 'timing' | 'recovery_point' | 'a53_cc' | (string & {});
    /** Set profile (profile_idc and constraint_set*_flag) */
    profile?: 'constrained_baseline' | 'main' | 'high' | 'high10';
    /** Set level (level_idc) */
    level?: '1' | '1.1' | '1.2' | '1.3' | '2' | '2.1' | '2.2' | '3' | '3.1' | '3.2' | '4' | '4.1' | '4.2' | '5' | '5.1' | '5.2' | '6' | '6.1' | '6.2';
  };
  /**
   * VideoToolbox H.264 Encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h264_005fvideotoolbox
   */
  h264_videotoolbox: {
    /** Profile */
    profile?: 'baseline' | 'constrained_baseline' | 'main' | 'high' | 'constrained_high' | 'extended';
    /** Level */
    level?: '1.3' | '3.0' | '3.1' | '3.2' | '4.0' | '4.1' | '4.2' | '5.0' | '5.1' | '5.2';
    /** Entropy coding */
    coder?: 'cavlc' | 'vlc' | 'cabac' | 'ac';
    /** Use A53 Closed Captions (if available) */
    a53cc?: boolean;
    /** Require constant bit rate (macOS 13 or newer) */
    constant_bit_rate?: boolean;
    /** Set the maximum number of bytes in an H.264 slice. */
    max_slice_bytes?: number;
    /** Allow software encoding */
    allow_sw?: boolean;
    /** Require software encoding */
    require_sw?: boolean;
    /** Hint that encoding should happen in real-time if not faster (e.g. capturing from camera). */
    realtime?: boolean;
    /** Other frames will come before the frames in this session. This helps smooth concatenation issues. */
    frames_before?: boolean;
    /** Other frames will come after the frames in this session. This helps smooth concatenation issues. */
    frames_after?: boolean;
    /** prioritize encoding speed */
    prio_speed?: boolean;
    /** Set to 1 to enable more power-efficient encoding if supported. */
    power_efficient?: number;
    /** Set to 1 to enable spatial AQ if supported. */
    spatial_aq?: number;
    /** Sets the maximum number of reference frames. This only has an effect when the value is less than the maximum allowed by the profile/level. */
    max_ref_frames?: number;
  };
  /**
   * H.264/AVC (Vulkan)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h264_005fvulkan
   */
  h264_vulkan: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Use an explicit constant quantizer for the whole stream */
    qp?: number;
    /** Set encode quality (trades off against speed, higher is slower) */
    quality?: number;
    /** Select rate control type */
    rc_mode?: number;
    /** Select tuning type */
    tune?: number;
    /** Select usage type */
    usage?: string;
    /** Select content type */
    content?: string;
    /** Set profile (profile_idc and constraint_set*_flag) */
    profile?: 'constrained_baseline' | 'main' | 'high' | 'high444p';
    /** Set level (level_idc) */
    level?: '1' | '1.1' | '1.2' | '1.3' | '2' | '2.1' | '2.2' | '3' | '3.1' | '3.2' | '4' | '4.1' | '4.2' | '5' | '5.1' | '5.2' | '6' | '6.1' | '6.2';
    /** Entropy coder type */
    coder?: number;
    /** Set units to include */
    units?: string;
  };
  /**
   * Vidvox Hap
   * @see https://ffmpeg.org/ffmpeg-codecs.html#hap
   */
  hap: {
    format?: 'hap' | 'hap_alpha' | 'hap_q';
    /** chunk count */
    chunks?: number;
    /** second-stage compressor */
    compressor?: 'none' | 'snappy';
  };
  /**
   * AMD AMF HEVC encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#hevc_005famf
   */
  hevc_amf: {
    /** Set the encoding usage */
    usage?: 'transcoding' | 'ultralowlatency' | 'lowlatency' | 'webcam' | 'high_quality' | 'lowlatency_high_quality';
    /** Set color bit deph */
    bitdepth?: '8' | '10';
    /** Set the profile */
    profile?: 'main' | 'main10';
    /** Set the profile tier (default main) */
    profile_tier?: 'main' | 'high';
    /** Set the encoding level (default auto) */
    level?: 'auto' | '1.0' | '2.0' | '2.1' | '3.0' | '3.1' | '4.0' | '4.1' | '5.0' | '5.1' | '5.2' | '6.0' | '6.1' | '6.2';
    /** Set the encoding quality preset */
    quality?: 'quality' | 'balanced' | 'speed' | 'high_quality';
    /** Set the encoding quality preset */
    preset?: 'quality' | 'balanced' | 'speed' | 'high_quality';
    /** enables low latency mode */
    latency?: boolean;
    /** Set the rate control mode */
    rc?: 'cqp' | 'cbr' | 'vbr_peak' | 'vbr_latency' | 'qvbr' | 'hqvbr' | 'hqcbr';
    /** Sets the QVBR quality level */
    qvbr_quality_level?: number;
    /** Set header insertion mode */
    header_insertion_mode?: 'none' | 'gop' | 'idr';
    /** Set maximum encoding parallelism. Higher values increase output latency. */
    async_depth?: number;
    /** Enable High motion quality boost mode */
    high_motion_quality_boost_enable?: boolean;
    /** GOPs per IDR 0-no IDR will be inserted */
    gops_per_idr?: number;
    /** Enable preencode */
    preencode?: boolean;
    /** Enable VBAQ */
    vbaq?: boolean;
    /** Enforce HRD */
    enforce_hrd?: boolean;
    /** Filler Data Enable */
    filler_data?: boolean;
    /** Maximum Access Unit Size for rate control (in bits) */
    max_au_size?: number;
    /** min quantization parameter for I-frame */
    min_qp_i?: number;
    /** max quantization parameter for I-frame */
    max_qp_i?: number;
    /** min quantization parameter for P-frame */
    min_qp_p?: number;
    /** max quantization parameter for P-frame */
    max_qp_p?: number;
    /** quantization parameter for P-frame */
    qp_p?: number;
    /** quantization parameter for I-frame */
    qp_i?: number;
    /** Rate Control Based Frame Skip */
    skip_frame?: boolean;
    /** Enable ME Half Pixel */
    me_half_pel?: boolean;
    /** Enable ME Quarter Pixel  */
    me_quarter_pel?: boolean;
    /** Force I frames to be IDR frames */
    forced_idr?: boolean;
    /** Inserts AU Delimiter NAL unit */
    aud?: boolean;
    /** Enable Smart Access Video to enhance  performance by utilizing both APU and dGPU memory access */
    smart_access_video?: boolean;
    /** Enable preanalysis */
    preanalysis?: boolean;
    /** Set the type of activity analysis */
    pa_activity_type?: 'y' | 'yuv';
    /** Enable scene change detection */
    pa_scene_change_detection_enable?: boolean;
    /** Set the sensitivity of scene change detection */
    pa_scene_change_detection_sensitivity?: 'low' | 'medium' | 'high';
    /** Enable static scene detection */
    pa_static_scene_detection_enable?: boolean;
    /** Set the sensitivity of static scene detection */
    pa_static_scene_detection_sensitivity?: 'low' | 'medium' | 'high';
    /** The QP value that is used immediately after a scene change */
    pa_initial_qp_after_scene_change?: number;
    /** The QP threshold to allow a skip frame */
    pa_max_qp_before_force_skip?: number;
    /** Content Adaptive Quantization strength */
    pa_caq_strength?: 'low' | 'medium' | 'high';
    /** Enable Frame SAD algorithm */
    pa_frame_sad_enable?: boolean;
    /** Enable long term reference frame management */
    pa_ltr_enable?: boolean;
    /** Sets the PA lookahead buffer size */
    pa_lookahead_buffer_depth?: number;
    /** Sets the perceptual adaptive quantization mode */
    pa_paq_mode?: 'none' | 'caq';
    /** Sets the temporal adaptive quantization mode */
    pa_taq_mode?: 'none' | '1' | '2';
    /** Sets the PA high motion quality boost mode */
    pa_high_motion_quality_boost_mode?: 'none' | 'auto';
  };
  /**
   * D3D12VA hevc encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#hevc_005fd3d12va
   */
  hevc_d3d12va: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Maximum frame size (in bytes) */
    max_frame_size?: number;
    /** Set intra refresh mode */
    intra_refresh_mode?: 'none' | 'row_based';
    /** Number of frames over which to spread intra refresh (0 = GOP size) */
    intra_refresh_duration?: number;
    /** Motion estimation precision mode */
    me_precision?: 'maximum' | 'full_pixel' | 'half_pixel' | 'quarter_pixel' | 'eighth_pixel';
    /** Set rate control mode */
    rc_mode?: 'auto' | 'CQP' | 'CBR' | 'VBR' | 'QVBR';
    /** Constant QP (for P-frames; scaled by qfactor/qoffset for I/B) */
    qp?: number;
    /** Set profile (general_profile_idc) */
    profile?: number;
    /** Set tier (general_tier_flag) */
    tier?: number;
    /** Set level (general_level_idc) */
    level?: number;
    /** Constrained intra prediction (constrained_intra_pred_flag) */
    constrained_intra_pred?: boolean;
  };
  /**
   * NVIDIA NVENC hevc encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#hevc_005fnvenc
   */
  hevc_nvenc: {
    /** Set the encoding preset */
    preset?:
      | 'default'
      | 'slow'
      | 'medium'
      | 'fast'
      | 'hp'
      | 'hq'
      | 'bd'
      | 'll'
      | 'llhq'
      | 'llhp'
      | 'lossless'
      | 'losslesshp'
      | 'p1'
      | 'p2'
      | 'p3'
      | 'p4'
      | 'p5'
      | 'p6'
      | 'p7';
    /** Set the encoding tuning info */
    tune?: 'hq' | 'uhq' | 'll' | 'ull' | 'lossless';
    /** Set the encoding profile */
    profile?: 'main' | 'main10' | 'rext' | 'mv';
    /** Set the encoding level restriction */
    level?: 'auto' | '1' | '1.0' | '2' | '2.0' | '2.1' | '3' | '3.0' | '3.1' | '4' | '4.0' | '4.1' | '5' | '5.0' | '5.1' | '5.2' | '6' | '6.0' | '6.1' | '6.2';
    /** Set the encoding tier */
    tier?: 'main' | 'high';
    /** Override the preset rate-control */
    rc?: 'constqp' | 'vbr' | 'cbr' | 'vbr_minqp' | 'll_2pass_quality' | 'll_2pass_size' | 'vbr_2pass' | 'cbr_ld_hq' | 'cbr_hq' | 'vbr_hq';
    /** Number of frames to look ahead for rate-control */
    'rc-lookahead'?: number;
    /** Number of concurrent surfaces */
    surfaces?: number;
    /** Use cbr encoding mode */
    cbr?: boolean;
    /** Use 2pass encoding mode */
    '2pass'?: boolean;
    /** Selects which NVENC capable GPU to use. First GPU is 0, second is 1, and so on. */
    gpu?: 'any' | 'list';
    /** Configure how nvenc handles packed RGB input. */
    rgb_mode?: 'yuv420' | 'yuv444' | 'disabled';
    /** Delay frame output by the given amount of frames */
    delay?: number;
    /** When lookahead is enabled, set this to 1 to disable adaptive I-frame insertion at scene cuts */
    'no-scenecut'?: boolean;
    /** If forcing keyframes, force them as IDR frames. */
    'forced-idr'?: boolean;
    /** When lookahead is enabled, set this to 0 to disable adaptive B-frame decision */
    b_adapt?: boolean;
    /** set to 1 to enable Spatial AQ */
    spatial_aq?: boolean;
    /** set to 1 to enable Spatial AQ */
    'spatial-aq'?: boolean;
    /** set to 1 to enable Temporal AQ */
    temporal_aq?: boolean;
    /** set to 1 to enable Temporal AQ */
    'temporal-aq'?: boolean;
    /** Set 1 to indicate zero latency operation (no reordering delay) */
    zerolatency?: boolean;
    /** Set this to 1 to enable automatic insertion of non-reference P-frames */
    nonref_p?: boolean;
    /** Set 1 to minimize GOP-to-GOP rate fluctuations */
    strict_gop?: boolean;
    /** When Spatial AQ is enabled, this field is used to specify AQ strength. AQ strength scale is from 1 (low) - 15 (aggressive) */
    'aq-strength'?: number;
    /** Set target quality level (0 to 51, 0 means automatic) for constant quality mode in VBR rate control */
    cq?: number;
    /** Use access unit delimiters */
    aud?: boolean;
    /** Bluray compatibility workarounds */
    'bluray-compat'?: boolean;
    /** Initial QP value for P frame */
    init_qpP?: number;
    /** Initial QP value for B frame */
    init_qpB?: number;
    /** Initial QP value for I frame */
    init_qpI?: number;
    /** Constant quantization parameter rate control method */
    qp?: number;
    /** Quantization parameter offset for cb channel */
    qp_cb_offset?: number;
    /** Quantization parameter offset for cr channel */
    qp_cr_offset?: number;
    /** Specifies the minimum QP used for rate control */
    qmin?: number;
    /** Specifies the maximum QP used for rate control */
    qmax?: number;
    /** Set 1 to enable weighted prediction */
    weighted_pred?: number;
    /** Use B frames as references */
    b_ref_mode?: 'disabled' | 'each' | 'middle';
    /** Use A53 Closed Captions (if available) */
    a53cc?: boolean;
    /** Use timecode (if available) */
    s12m_tc?: boolean;
    /** Specifies the DPB size used for encoding (0 means automatic) */
    dpb_size?: number;
    /** Set the multipass encoding */
    multipass?: 'disabled' | 'qres' | 'fullres';
    /** Enable 10 bit encode for 8 bit input */
    highbitdepth?: boolean;
    /** Low delay key frame scale; Specifies the Scene Change frame size increase allowed in case of single frame VBV and CBR */
    ldkfs?: number;
    /** Pass on extra SEI data (e.g. a53 cc) to be included in the bitstream */
    extra_sei?: boolean;
    /** Pass on user data unregistered SEI if available */
    udu_sei?: boolean;
    /** Use Periodic Intra Refresh instead of IDR frames */
    'intra-refresh'?: boolean;
    /** Use single slice intra refresh */
    'single-slice-intra-refresh'?: boolean;
    /** Maximum encoded slice size in bytes */
    max_slice_size?: number;
    /** Enable constrainedFrame encoding where each slice in the constrained picture is independent of other slices */
    'constrained-encoding'?: boolean;
    /** Pad the bitstream to ensure bitrate does not drop below the target in CBR mode */
    cbr_padding?: boolean;
    /** Specifies the strength of the temporal filtering */
    tf_level?: '0' | '4';
    /** Specifies the lookahead level. Higher level may improve quality at the expense of performance. */
    lookahead_level?: 'auto' | '0' | '1' | '2' | '3';
    /** Enable use of unidirectional B-Frames. */
    unidir_b?: boolean;
    /** Specifies the split encoding mode */
    split_encode_mode?: 'disabled' | 'auto' | 'forced' | '2' | '3' | '4';
  };
  /**
   * HEVC (Intel Quick Sync Video acceleration)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#hevc_005fqsv
   */
  hevc_qsv: {
    /** Maximum processing parallelism */
    async_depth?: number;
    preset?: 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
    /** Forcing I frames as IDR frames */
    forced_idr?: boolean;
    /** enable low power mode(experimental: many limitations by mfx version, BRC modes, etc.) */
    low_power?: boolean;
    /** Set QSV encoder parameters as key1=value1:key2=value2:... */
    qsv_params?: string;
    /** Enable rate distortion optimization */
    rdo?: number;
    /** Maximum encoded frame size in bytes */
    max_frame_size?: number;
    /** Maximum encoded I frame size in bytes */
    max_frame_size_i?: number;
    /** Maximum encoded P frame size in bytes */
    max_frame_size_p?: number;
    /** Maximum encoded slice size in bytes */
    max_slice_size?: number;
    /** MB level bitrate control */
    mbbrc?: number;
    /** Extended bitrate control */
    extbrc?: number;
    /** Enable P-pyramid: 0-default 1-simple 2-pyramid(bf need to be set to 0). */
    p_strategy?: number;
    /** Strategy to choose between I/P/B-frames */
    b_strategy?: number;
    /** This option disable deblocking. It has value in range 0~2. */
    dblk_idc?: number;
    /** Allow to strictly obey avg frame size */
    low_delay_brc?: boolean;
    /** Maximum video quantizer scale for I frame */
    max_qp_i?: number;
    /** Minimum video quantizer scale for I frame */
    min_qp_i?: number;
    /** Maximum video quantizer scale for P frame */
    max_qp_p?: number;
    /** Minimum video quantizer scale for P frame */
    min_qp_p?: number;
    /** Maximum video quantizer scale for B frame */
    max_qp_b?: number;
    /** Minimum video quantizer scale for B frame */
    min_qp_b?: number;
    /** Adaptive I-frame placement */
    adaptive_i?: number;
    /** Adaptive B-frame placement */
    adaptive_b?: number;
    /** A hint to encoder about the scenario for the encoding session */
    scenario?: 'unknown' | 'displayremoting' | 'videoconference' | 'archive' | 'livestreaming' | 'cameracapture' | 'videosurveillance' | 'gamestreaming' | 'remotegaming';
    /** Accuracy of the AVBR ratecontrol (unit of tenth of percent) */
    avbr_accuracy?: number;
    /** Convergence of the AVBR ratecontrol (unit of 100 frames) */
    avbr_convergence?: number;
    /** Allow frame skipping */
    skip_frame?: 'no_skip' | 'insert_dummy' | 'insert_nothing' | 'brc_only';
    /** Prefer processing on both iGfx and dGfx simultaneously */
    dual_gfx?: 'off' | 'on' | 'adaptive';
    /** Distance (in I-frames) between IDR frames */
    idr_interval?: 'begin_only';
    /** A user plugin to load in an internal session */
    load_plugin?: 'none' | 'hevc_sw' | 'hevc_hw';
    /** A :-separate list of hexadecimal plugin UIDs to load in an internal session */
    load_plugins?: string;
    /** Depth of look ahead in number frames, available when extbrc option is enabled */
    look_ahead_depth?: number;
    profile?: 'unknown' | 'main' | 'main10' | 'mainsp' | 'rext' | 'scc';
    /** Set the encoding tier (only level &gt;= 4 can support high tier) */
    tier?: 'main' | 'high';
    /** 1: GPB (generalized P/B frame); 0: regular P frame */
    gpb?: boolean;
    /** Number of columns for tiled encoding */
    tile_cols?: number;
    /** Number of rows for tiled encoding */
    tile_rows?: number;
    /** Insert recovery point SEI messages */
    recovery_point_sei?: number;
    /** Insert the Access Unit Delimiter NAL */
    aud?: boolean;
    /** Insert picture timing SEI with pic_struct_syntax element */
    pic_timing_sei?: boolean;
    /** Turn this option ON to enable transformskip */
    transform_skip?: number;
    /** Intra refresh type. B frames should be set to 0 */
    int_ref_type?: 'none' | 'vertical' | 'horizontal' | 'slice';
    /** Number of frames in the intra refresh cycle */
    int_ref_cycle_size?: number;
    /** QP difference for the refresh MBs */
    int_ref_qp_delta?: number;
    /** Distance between the beginnings of the intra-refresh cycles in frames */
    int_ref_cycle_dist?: number;
    /** This profile allow to encode 10 bit single still picture */
    main10sp?: boolean;
  };
  /**
   * H.265/HEVC (VAAPI)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#hevc_005fvaapi
   */
  hevc_vaapi: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Use low-power encoding mode (only available on some platforms;  */
    low_power?: boolean;
    /** Maximum frame size (in bytes) */
    max_frame_size?: number;
    /** Set rate control mode */
    rc_mode?: 'auto' | 'CQP' | 'CBR' | 'VBR' | 'ICQ' | 'QVBR' | 'AVBR';
    /** Block level based bitrate control */
    blbrc?: boolean;
    /** Constant QP (for P-frames; scaled by qfactor/qoffset for I/B) */
    qp?: number;
    /** Include AUD */
    aud?: boolean;
    /** Set profile (general_profile_idc) */
    profile?: 'main' | 'main10' | 'rext';
    /** Set tier (general_tier_flag) */
    tier?: 'main' | 'high';
    /** Set level (general_level_idc) */
    level?: '1' | '2' | '2.1' | '3' | '3.1' | '4' | '4.1' | '5' | '5.1' | '5.2' | '6' | '6.1' | '6.2';
    /** Set SEI to include */
    sei?: 'hdr' | 'a53_cc' | (string & {});
    /** Tile columns x rows */
    tiles?: string;
  };
  /**
   * VideoToolbox H.265 Encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#hevc_005fvideotoolbox
   */
  hevc_videotoolbox: {
    /** Profile */
    profile?: 'main' | 'main10' | 'main42210' | 'rext';
    /** Compression quality for the alpha channel */
    alpha_quality?: number;
    /** Require constant bit rate (macOS 13 or newer) */
    constant_bit_rate?: boolean;
    /** Allow software encoding */
    allow_sw?: boolean;
    /** Require software encoding */
    require_sw?: boolean;
    /** Hint that encoding should happen in real-time if not faster (e.g. capturing from camera). */
    realtime?: boolean;
    /** Other frames will come before the frames in this session. This helps smooth concatenation issues. */
    frames_before?: boolean;
    /** Other frames will come after the frames in this session. This helps smooth concatenation issues. */
    frames_after?: boolean;
    /** prioritize encoding speed */
    prio_speed?: boolean;
    /** Set to 1 to enable more power-efficient encoding if supported. */
    power_efficient?: number;
    /** Set to 1 to enable spatial AQ if supported. */
    spatial_aq?: number;
    /** Sets the maximum number of reference frames. This only has an effect when the value is less than the maximum allowed by the profile/level. */
    max_ref_frames?: number;
  };
  /**
   * H.265/HEVC (Vulkan)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#hevc_005fvulkan
   */
  hevc_vulkan: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Use an explicit constant quantizer for the whole stream */
    qp?: number;
    /** Set encode quality (trades off against speed, higher is slower) */
    quality?: number;
    /** Select rate control type */
    rc_mode?: number;
    /** Select tuning type */
    tune?: number;
    /** Select usage type */
    usage?: string;
    /** Select content type */
    content?: string;
    /** Set profile (profile_idc and constraint_set*_flag) */
    profile?: 'main' | 'main10' | 'rext';
    /** Set tier (general_tier_flag) */
    tier?: 'main' | 'high';
    /** Set level (general_level_idc) */
    level?: '1' | '2' | '2.1' | '3' | '3.1' | '4' | '4.1' | '5' | '5.1' | '5.2' | '6' | '6.1' | '6.2';
    /** Set units to include */
    units?: string;
  };
  /**
   * Huffyuv / HuffYUV
   * @see https://ffmpeg.org/ffmpeg-codecs.html#huffyuv
   */
  huffyuv: {
    /** Allow multithreading for e.g. context=1 at the expense of determinism */
    non_deterministic?: boolean;
    /** Prediction method */
    pred?: 'left' | 'plane' | 'median';
  };
  /**
   * JPEG 2000
   * @see https://ffmpeg.org/ffmpeg-codecs.html#jpeg2000
   */
  jpeg2000: {
    /** Codec Format */
    format?: 'j2k' | 'jp2';
    /** Tile Width */
    tile_width?: number;
    /** Tile Height */
    tile_height?: number;
    /** DWT Type */
    pred?: 'dwt97int' | 'dwt53';
    /** SOP marker */
    sop?: number;
    /** EPH marker */
    eph?: number;
    /** Progression Order */
    prog?: 'lrcp' | 'rlcp' | 'rpcl' | 'pcrl' | 'cprl';
    /** Layer Rates */
    layer_rates?: string;
  };
  /**
   * JPEG-LS
   * @see https://ffmpeg.org/ffmpeg-codecs.html#jpegls
   */
  jpegls: {
    /** Prediction method */
    pred?: 'left' | 'plane' | 'median';
  };
  /**
   * libaom AV1
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libaom_002dav1
   */
  'libaom-av1': {
    /** Quality/Speed ratio modifier */
    'cpu-used'?: number;
    /** Enable use of alternate reference  */
    'auto-alt-ref'?: number;
    /** Number of frames to look ahead at for  */
    'lag-in-frames'?: number;
    /** altref noise reduction max frame count */
    'arnr-max-frames'?: number;
    /** altref noise reduction filter strength */
    'arnr-strength'?: number;
    /** adaptive quantization mode */
    'aq-mode'?: 'none' | 'variance' | 'complexity' | 'cyclic';
    /** Error resilience configuration */
    'error-resilience'?: 'default' | (string & {});
    /** Select the quality for constant quality mode */
    crf?: number;
    /** A change threshold on blocks below which they will be skipped by the encoder */
    'static-thresh'?: number;
    /** Frame drop threshold */
    'drop-threshold'?: number;
    /** Amount of noise to be removed */
    'denoise-noise-level'?: number;
    /** Denoise block size  */
    'denoise-block-size'?: number;
    /** Datarate undershoot (min) target (%) */
    'undershoot-pct'?: number;
    /** Datarate overshoot (max) target (%) */
    'overshoot-pct'?: number;
    /** GOP min bitrate (% of target) */
    'minsection-pct'?: number;
    /** GOP max bitrate (% of target) */
    'maxsection-pct'?: number;
    /** Enable frame parallel decodability features */
    'frame-parallel'?: boolean;
    /** Tile columns x rows */
    tiles?: string;
    /** Log2 of number of tile columns to use */
    'tile-columns'?: number;
    /** Log2 of number of tile rows to use */
    'tile-rows'?: number;
    /** Enable row based multi-threading */
    'row-mt'?: boolean;
    /** Enable CDEF filtering */
    'enable-cdef'?: boolean;
    /** Enable global motion */
    'enable-global-motion'?: boolean;
    /** Enable intra block copy prediction mode */
    'enable-intrabc'?: boolean;
    /** Enable Loop Restoration filtering */
    'enable-restoration'?: boolean;
    /** Quality and compression efficiency vs speed trade-off */
    usage?: 'good' | 'realtime' | 'allintra';
    /** The metric that the encoder tunes for. Automatically chosen by the encoder by default */
    tune?: 'psnr' | 'ssim';
    /** Encode in single frame mode (typically used for still AVIF images). */
    'still-picture'?: boolean;
    /** Enable Dolby Vision RPU coding */
    dolbyvision?: 'auto';
    /** Enable rectangular partitions */
    'enable-rect-partitions'?: boolean;
    /** Enable 1:4/4:1 partitions */
    'enable-1to4-partitions'?: boolean;
    /** Enable ab shape partitions */
    'enable-ab-partitions'?: boolean;
    /** Enable angle delta intra prediction */
    'enable-angle-delta'?: boolean;
    /** Enable chroma predicted from luma intra prediction */
    'enable-cfl-intra'?: boolean;
    /** Enable filter intra predictor */
    'enable-filter-intra'?: boolean;
    /** Enable intra edge filter */
    'enable-intra-edge-filter'?: boolean;
    /** Enable smooth intra prediction mode */
    'enable-smooth-intra'?: boolean;
    /** Enable paeth predictor in intra prediction */
    'enable-paeth-intra'?: boolean;
    /** Enable palette prediction mode */
    'enable-palette'?: boolean;
    /** Enable extended transform type */
    'enable-flip-idtx'?: boolean;
    /** Enable 64-pt transform */
    'enable-tx64'?: boolean;
    /** Use reduced set of transform types */
    'reduced-tx-type-set'?: boolean;
    /** Use DCT only for INTRA modes */
    'use-intra-dct-only'?: boolean;
    /** Use DCT only for INTER modes */
    'use-inter-dct-only'?: boolean;
    /** Use default-transform only for INTRA modes */
    'use-intra-default-tx-only'?: boolean;
    /** Enable temporal mv prediction */
    'enable-ref-frame-mvs'?: boolean;
    /** Use reduced set of single and compound references */
    'enable-reduced-reference-set'?: boolean;
    /** Enable obmc */
    'enable-obmc'?: boolean;
    /** Enable dual filter */
    'enable-dual-filter'?: boolean;
    /** Enable difference-weighted compound */
    'enable-diff-wtd-comp'?: boolean;
    /** Enable distance-weighted compound */
    'enable-dist-wtd-comp'?: boolean;
    /** Enable one sided compound */
    'enable-onesided-comp'?: boolean;
    /** Enable interinter wedge compound */
    'enable-interinter-wedge'?: boolean;
    /** Enable interintra wedge compound */
    'enable-interintra-wedge'?: boolean;
    /** Enable masked compound */
    'enable-masked-comp'?: boolean;
    /** Enable interintra compound */
    'enable-interintra-comp'?: boolean;
    /** Enable smooth interintra mode */
    'enable-smooth-interintra'?: boolean;
    /** Set libaom options using a :-separated list of key=value pairs */
    'aom-params'?: string;
  };
  /**
   * codec2 encoder using libcodec2
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libcodec2
   */
  libcodec2: {
    /** codec2 mode */
    mode?: '3200' | '2400' | '1600' | '1400' | '1300' | '1200' | '700' | '700B' | '700C';
  };
  /**
   * Fraunhofer FDK AAC
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libfdk_005faac
   */
  libfdk_aac: {
    /** Afterburner (improved quality) */
    afterburner?: number;
    /** Enable SBR for ELD (for SBR in other configurations, use the -profile parameter) */
    eld_sbr?: number;
    /** Enable ELDv2 (LD-MPS extension for ELD stereo signals) */
    eld_v2?: number;
    /** SBR/PS signaling style */
    signaling?: 'default' | 'implicit' | 'explicit_sbr' | 'explicit_hierarchical';
    /** Output LATM/LOAS encapsulated data */
    latm?: number;
    /** StreamMuxConfig and PCE repetition period (in frames) */
    header_period?: number;
    /** VBR mode (1-5) */
    vbr?: number;
    /** The desired compression profile for AAC DRC */
    drc_profile?: number;
    /** Expected target reference level at decoder side in dB (for clipping prevention/limiter) */
    drc_target_ref?: number;
    /** The desired compression profile for AAC DRC */
    comp_profile?: number;
    /** Expected target reference level at decoder side in dB (for clipping prevention/limiter) */
    comp_target_ref?: number;
    /** The program reference level or dialog level in dB */
    prog_ref?: number;
    /** The desired frame length */
    frame_length?: number;
  };
  /**
   * iLBC (Internet Low Bitrate Codec)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libilbc
   */
  libilbc: {
    /** iLBC mode (20 or 30 ms frames) */
    mode?: number;
  };
  /**
   * libjxl JPEG XL
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libjxl
   */
  libjxl: {
    /** Encoding effort */
    effort?: number;
    /** Maximum Butteraugli distance (quality setting,  */
    distance?: number;
    /** Force modular mode */
    modular?: number;
    /** Use XYB-encoding for lossy images */
    xyb?: number;
  };
  /**
   * libjxl JPEG XL animated
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libjxl_005fanim
   */
  libjxl_anim: {
    /** Encoding effort */
    effort?: number;
    /** Maximum Butteraugli distance (quality setting,  */
    distance?: number;
    /** Force modular mode */
    modular?: number;
    /** Use XYB-encoding for lossy images */
    xyb?: number;
  };
  /**
   * libkvazaar H.265 / HEVC
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libkvazaar
   */
  libkvazaar: {
    /** Set kvazaar parameters as a comma-separated list of key=value pairs. */
    'kvazaar-params'?: string;
  };
  /**
   * LC3 (Low Complexity Communication Codec)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#liblc3
   */
  liblc3: {
    /** Duration of a frame in milliseconds */
    frame_duration?: number;
    /** Enable High-Resolution mode (48 KHz or 96 KHz) */
    high_resolution?: boolean;
  };
  /**
   * libmp3lame MP3 (MPEG audio layer 3)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libmp3lame
   */
  libmp3lame: {
    /** use bit reservoir */
    reservoir?: boolean;
    /** use joint stereo */
    joint_stereo?: boolean;
    /** use ABR */
    abr?: boolean;
    /** set copyright flag */
    copyright?: boolean;
    /** set original flag */
    original?: boolean;
  };
  /**
   * liboapv APV
   * @see https://ffmpeg.org/ffmpeg-codecs.html#liboapv
   */
  liboapv: {
    /** Encoding preset for setting encoding speed (optimization level control) */
    preset?: 'fastest' | 'fast' | 'medium' | 'slow' | 'placebo' | 'default';
    /** Quantization parameter value for CQP rate control mode */
    qp?: number;
    /** Override the apv configuration using a :-separated list of key=value parameters */
    'oapv-params'?: string;
  };
  /**
   * OpenCORE AMR-NB (Adaptive Multi-Rate Narrow-Band)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libopencore_005famrnb
   */
  libopencore_amrnb: {
    /** Allow DTX (generate comfort noise) */
    dtx?: number;
  };
  /**
   * OpenH264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libopenh264
   */
  libopenh264: {
    /** enable loop filter */
    loopfilter?: number;
    /** set profile restrictions */
    profile?: 'constrained_baseline' | 'main' | 'high';
    /** set maximum NAL size in bytes */
    max_nal_size?: number;
    /** allow skipping frames to hit the target bitrate */
    allow_skip_frames?: boolean;
    /** Coder type */
    coder?: 'default' | 'cavlc' | 'cabac' | 'vlc' | 'ac';
    /** Select rate control mode */
    rc_mode?: 'off' | 'quality' | 'bitrate' | 'buffer' | 'timestamp';
  };
  /**
   * OpenJPEG JPEG 2000
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libopenjpeg
   */
  libopenjpeg: {
    /** Codec Format */
    format?: 'j2k' | 'jp2';
    profile?: 'jpeg2000' | 'cinema2k' | 'cinema4k';
    /** Digital Cinema */
    cinema_mode?: 'off' | '2k_24' | '2k_48' | '4k_24';
    /** Progression Order */
    prog_order?: 'lrcp' | 'rlcp' | 'rpcl' | 'pcrl' | 'cprl';
    numresolution?: number;
    irreversible?: number;
    disto_alloc?: number;
    fixed_quality?: number;
  };
  /**
   * libopus Opus
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libopus
   */
  libopus: {
    /** Intended application type */
    application?: 'voip' | 'audio' | 'lowdelay';
    /** Duration of a frame in milliseconds */
    frame_duration?: number;
    /** Expected packet loss percentage */
    packet_loss?: number;
    /** Enable inband FEC. Expected packet loss must be non-zero */
    fec?: boolean;
    /** Variable bit rate mode */
    vbr?: 'off' | 'on' | 'constrained';
    /** Channel Mapping Family */
    mapping_family?: number;
    /** Enable DTX (Discontinuous transmission) */
    dtx?: boolean;
    /** Apply intensity stereo phase inversion */
    apply_phase_inv?: boolean;
  };
  /**
   * librav1e AV1
   * @see https://ffmpeg.org/ffmpeg-codecs.html#librav1e
   */
  librav1e: {
    /** use constant quantizer mode */
    qp?: number;
    /** what speed preset to use */
    speed?: number;
    /** number of tiles encode with */
    tiles?: number;
    /** number of tiles rows to encode with */
    'tile-rows'?: number;
    /** number of tiles columns to encode with */
    'tile-columns'?: number;
    /** set the rav1e configuration using a :-separated list of key=value parameters */
    'rav1e-params'?: string;
  };
  /**
   * libspeex Speex
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libspeex
   */
  libspeex: {
    /** Use average bit rate */
    abr?: number;
    /** Set quality value (0 to 10) for CBR */
    cbr_quality?: number;
    /** Number of frames to encode in each packet */
    frames_per_packet?: number;
    /** Voice Activity Detection */
    vad?: number;
    /** Discontinuous Transmission */
    dtx?: number;
  };
  /**
   * SVT-AV1(Scalable Video Technology for AV1) encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libsvtav1
   */
  libsvtav1: {
    /** Encoding preset */
    preset?: number;
    /** Constant Rate Factor value */
    crf?: number;
    /** Initial Quantizer level value */
    qp?: number;
    /** Set the SVT-AV1 configuration using a :-separated list of key=value parameters */
    'svtav1-params'?: string;
    /** Enable Dolby Vision RPU coding */
    dolbyvision?: 'auto';
  };
  /**
   * SVT JPEG XS(Scalable Video Technology for JPEG XS) encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libsvtjpegxs
   */
  libsvtjpegxs: {
    /** vertical decomposition level */
    decomp_v?: number;
    /** horizontal decomposition level */
    decomp_h?: number;
    /** Quantization algorithm */
    quantization?: 'deadzone' | 'uniform';
    /** Enable Signs handling strategy */
    'coding-signs'?: 'disable' | 'fast' | 'full';
    /** Enable Significance coding */
    'coding-sigf'?: boolean;
    /** Enable Vertical Prediction coding */
    'coding-vpred'?: 'disable' | 'no_residuals' | 'no_coeffs';
  };
  /**
   * libtheora Theora
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libtheora
   */
  libtheora: {
    /** Sets the encoding speed level */
    speed_level?: number;
  };
  /**
   * libtwolame MP2 (MPEG audio layer 2)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libtwolame
   */
  libtwolame: {
    /** Mpeg Mode */
    mode?: 'auto' | 'stereo' | 'joint_stereo' | 'dual_channel' | 'mono';
    /** Psychoacoustic Model */
    psymodel?: number;
    /** enable energy levels */
    energy_levels?: number;
    /** enable CRC error protection */
    error_protection?: number;
    /** set MPEG Audio Copyright flag */
    copyright?: number;
    /** set MPEG Audio Original flag */
    original?: number;
    /** set library optput level (0-10) */
    verbosity?: number;
  };
  /**
   * Android VisualOn AMR-WB (Adaptive Multi-Rate Wide-Band)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libvo_005famrwbenc
   */
  libvo_amrwbenc: {
    /** Allow DTX (generate comfort noise) */
    dtx?: number;
  };
  /**
   * libvorbis
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libvorbis
   */
  libvorbis: {
    /** Sets the impulse block bias */
    iblock?: number;
  };
  /**
   * libvpx VP8
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libvpx
   */
  libvpx: {
    /** Number of frames to look ahead for  */
    'lag-in-frames'?: number;
    /** altref noise reduction max frame count */
    'arnr-maxframes'?: number;
    /** altref noise reduction filter strength */
    'arnr-strength'?: number;
    /** altref noise reduction filter type */
    'arnr-type'?: 'backward' | 'forward' | 'centered';
    /** Tune the encoding to a specific scenario */
    tune?: 'psnr' | 'ssim';
    /** Time to spend encoding, in microseconds. */
    deadline?: 'best' | 'good' | 'realtime';
    /** Error resilience configuration */
    'error-resilient'?: 'default' | 'partitions' | (string & {});
    /** Maximum I-frame bitrate (pct) 0=unlimited */
    'max-intra-rate'?: number;
    /** Select the quality for constant quality mode */
    crf?: number;
    /** A change threshold on blocks below which they will be skipped by the encoder */
    'static-thresh'?: number;
    /** Frame drop threshold */
    'drop-threshold'?: number;
    /** Noise sensitivity */
    'noise-sensitivity'?: number;
    /** Datarate undershoot (min) target (%) */
    'undershoot-pct'?: number;
    /** Datarate overshoot (max) target (%) */
    'overshoot-pct'?: number;
    /** Temporal scaling configuration using a :-separated list of key=value parameters */
    'ts-parameters'?: string;
    /** Enable use of alternate reference  */
    'auto-alt-ref'?: number;
    /** Quality/Speed ratio modifier */
    'cpu-used'?: number;
    /** Encoder screen content mode */
    'screen-content-mode'?: number;
    speed?: number;
    quality?: 'best' | 'good' | 'realtime';
    vp8flags?: 'error_resilient' | 'altref' | (string & {});
    /** altref noise reduction max frame count */
    arnr_max_frames?: number;
    /** altref noise reduction filter strength */
    arnr_strength?: number;
    /** altref noise reduction filter type */
    arnr_type?: number;
    /** Number of frames to look ahead for alternate reference frame selection */
    rc_lookahead?: number;
    /** Increase sharpness at the expense of lower PSNR */
    sharpness?: number;
  };
  /**
   * libvpx VP9
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libvpx_002dvp9
   */
  'libvpx-vp9': {
    /** Number of frames to look ahead for  */
    'lag-in-frames'?: number;
    /** altref noise reduction max frame count */
    'arnr-maxframes'?: number;
    /** altref noise reduction filter strength */
    'arnr-strength'?: number;
    /** altref noise reduction filter type */
    'arnr-type'?: 'backward' | 'forward' | 'centered';
    /** Tune the encoding to a specific scenario */
    tune?: 'psnr' | 'ssim';
    /** Time to spend encoding, in microseconds. */
    deadline?: 'best' | 'good' | 'realtime';
    /** Error resilience configuration */
    'error-resilient'?: 'default' | 'partitions' | (string & {});
    /** Maximum I-frame bitrate (pct) 0=unlimited */
    'max-intra-rate'?: number;
    /** Select the quality for constant quality mode */
    crf?: number;
    /** A change threshold on blocks below which they will be skipped by the encoder */
    'static-thresh'?: number;
    /** Frame drop threshold */
    'drop-threshold'?: number;
    /** Noise sensitivity */
    'noise-sensitivity'?: number;
    /** Datarate undershoot (min) target (%) */
    'undershoot-pct'?: number;
    /** Datarate overshoot (max) target (%) */
    'overshoot-pct'?: number;
    /** Temporal scaling configuration using a :-separated list of key=value parameters */
    'ts-parameters'?: string;
    /** Enable use of alternate reference  */
    'auto-alt-ref'?: number;
    /** Quality/Speed ratio modifier */
    'cpu-used'?: number;
    /** Lossless mode */
    lossless?: number;
    /** Number of tile columns to use, log2 */
    'tile-columns'?: number;
    /** Number of tile rows to use, log2 */
    'tile-rows'?: number;
    /** Enable frame parallel decodability features */
    'frame-parallel'?: boolean;
    /** adaptive quantization mode */
    'aq-mode'?: 'none' | 'variance' | 'complexity' | 'cyclic' | 'equator360';
    /** Specify level */
    level?: number;
    /** Row based multi-threading */
    'row-mt'?: boolean;
    /** Tune content type */
    'tune-content'?: 'default' | 'screen' | 'film';
    /** corpus vbr complexity midpoint */
    'corpus-complexity'?: number;
    /** Enable temporal dependency model */
    'enable-tpl'?: boolean;
    /** Minimum golden/alternate reference frame interval */
    'min-gf-interval'?: number;
    speed?: number;
    quality?: 'best' | 'good' | 'realtime';
    vp8flags?: 'error_resilient' | 'altref' | (string & {});
    /** altref noise reduction max frame count */
    arnr_max_frames?: number;
    /** altref noise reduction filter strength */
    arnr_strength?: number;
    /** altref noise reduction filter type */
    arnr_type?: number;
    /** Number of frames to look ahead for alternate reference frame selection */
    rc_lookahead?: number;
    /** Increase sharpness at the expense of lower PSNR */
    sharpness?: number;
  };
  /**
   * libvvenc H.266 / VVC
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libvvenc
   */
  libvvenc: {
    /** set encoding preset */
    preset?: number;
    /** set quantization */
    qp?: number;
    /** set subjective (perceptually motivated) optimization */
    qpa?: boolean;
    /** Filename for 2 pass stats */
    passlogfile?: string;
    /** Filename for 2 pass stats */
    stats?: string;
    /** set (intra) refresh period in seconds */
    period?: number;
    /** set the vvenc configuration using a :-separated list of key=value parameters */
    'vvenc-params'?: string;
    /** Specify level (as defined by Annex A) */
    level?: string;
    /** set vvc tier */
    tier?: number;
  };
  /**
   * libx262 MPEG2VIDEO
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libx262
   */
  libx262: {
    /** Set the encoding preset (cf. x264 --fullhelp) */
    preset?: string;
    /** Tune the encoding params (cf. x264 --fullhelp) */
    tune?: string;
    /** Set profile restrictions (cf. x264 --fullhelp) */
    profile?: string;
    /** Use fast settings when encoding first pass */
    fastfirstpass?: boolean;
    /** Specify level (as defined by Annex A) */
    level?: string;
    /** Filename for 2 pass stats */
    passlogfile?: string;
    /** Weighted prediction for P-frames */
    wpredp?: string;
    /** Use A53 Closed Captions (if available) */
    a53cc?: boolean;
    /** x264 options */
    x264opts?: string;
    /** Select the quality for constant quality mode */
    crf?: number;
    /** In CRF mode, prevents VBV from lowering quality beyond this point. */
    crf_max?: number;
    /** Constant quantization parameter rate control method */
    qp?: number;
    /** AQ method */
    'aq-mode'?: 'none' | 'variance' | 'autovariance' | 'autovariance-biased';
    /** AQ strength. Reduces blocking and blurring in flat and textured areas. */
    'aq-strength'?: number;
    /** Use psychovisual optimizations. */
    psy?: boolean;
    /** Strength of psychovisual optimization, in &lt;psy-rd&gt;:&lt;psy-trellis&gt; format. */
    'psy-rd'?: string;
    /** Number of frames to look ahead for frametype and ratecontrol */
    'rc-lookahead'?: number;
    /** Weighted prediction for B-frames. */
    weightb?: boolean;
    /** Weighted prediction analysis method. */
    weightp?: 'none' | 'simple' | 'smart';
    /** Calculate and print SSIM stats. */
    ssim?: boolean;
    /** Use Periodic Intra Refresh instead of IDR frames. */
    'intra-refresh'?: boolean;
    /** Bluray compatibility workarounds. */
    'bluray-compat'?: boolean;
    /** Influences how often B-frames are used */
    'b-bias'?: number;
    /** Keep some B-frames as references. */
    'b-pyramid'?: 'none' | 'strict' | 'normal';
    /** One reference per partition, as opposed to one reference per macroblock */
    'mixed-refs'?: boolean;
    /** High profile 8x8 transform. */
    '8x8dct'?: boolean;
    'fast-pskip'?: boolean;
    /** Use access unit delimiters. */
    aud?: boolean;
    /** Use macroblock tree ratecontrol. */
    mbtree?: boolean;
    /** Loop filter parameters, in &lt;alpha:beta&gt; form. */
    deblock?: string;
    /** Reduce fluctuations in QP (before curve compression) */
    cplxblur?: number;
    /** A comma-separated list of partitions to consider.  */
    partitions?: string;
    /** Direct MV prediction mode */
    'direct-pred'?: 'none' | 'spatial' | 'temporal' | 'auto';
    /** Limit the size of each slice in bytes */
    'slice-max-size'?: number;
    /** Filename for 2 pass stats */
    stats?: string;
    /** Signal HRD information (requires vbv-bufsize;  */
    'nal-hrd'?: 'none' | 'vbr' | 'cbr';
    /** AVC-Intra class 50/100/200/300/480 */
    'avcintra-class'?: number;
    /** Set motion estimation method */
    me_method?: 'dia' | 'hex' | 'umh' | 'esa' | 'tesa';
    /** Set motion estimation method */
    'motion-est'?: 'dia' | 'hex' | 'umh' | 'esa' | 'tesa';
    /** If forcing keyframes, force them as IDR frames. */
    'forced-idr'?: boolean;
    /** Coder type */
    coder?: 'default' | 'cavlc' | 'cabac' | 'vlc' | 'ac';
    /** Strategy to choose between I/P/B-frames */
    b_strategy?: number;
    /** QP difference between chroma and luma */
    chromaoffset?: number;
    /** Scene change threshold */
    sc_threshold?: number;
    /** Noise reduction */
    noise_reduction?: number;
    /** Use user data unregistered SEI if available */
    udu_sei?: boolean;
    /** Override the x264 configuration using a :-separated list of key=value parameters */
    'x264-params'?: string;
    /** Set mb_info data through AVSideData, only useful when used from the API */
    mb_info?: boolean;
  };
  /**
   * libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libx264
   */
  libx264: {
    /** Set the encoding preset (cf. x264 --fullhelp) */
    preset?: string;
    /** Tune the encoding params (cf. x264 --fullhelp) */
    tune?: string;
    /** Set profile restrictions (cf. x264 --fullhelp) */
    profile?: string;
    /** Use fast settings when encoding first pass */
    fastfirstpass?: boolean;
    /** Specify level (as defined by Annex A) */
    level?: string;
    /** Filename for 2 pass stats */
    passlogfile?: string;
    /** Weighted prediction for P-frames */
    wpredp?: string;
    /** Use A53 Closed Captions (if available) */
    a53cc?: boolean;
    /** x264 options */
    x264opts?: string;
    /** Select the quality for constant quality mode */
    crf?: number;
    /** In CRF mode, prevents VBV from lowering quality beyond this point. */
    crf_max?: number;
    /** Constant quantization parameter rate control method */
    qp?: number;
    /** AQ method */
    'aq-mode'?: 'none' | 'variance' | 'autovariance' | 'autovariance-biased';
    /** AQ strength. Reduces blocking and blurring in flat and textured areas. */
    'aq-strength'?: number;
    /** Use psychovisual optimizations. */
    psy?: boolean;
    /** Strength of psychovisual optimization, in &lt;psy-rd&gt;:&lt;psy-trellis&gt; format. */
    'psy-rd'?: string;
    /** Number of frames to look ahead for frametype and ratecontrol */
    'rc-lookahead'?: number;
    /** Weighted prediction for B-frames. */
    weightb?: boolean;
    /** Weighted prediction analysis method. */
    weightp?: 'none' | 'simple' | 'smart';
    /** Calculate and print SSIM stats. */
    ssim?: boolean;
    /** Use Periodic Intra Refresh instead of IDR frames. */
    'intra-refresh'?: boolean;
    /** Bluray compatibility workarounds. */
    'bluray-compat'?: boolean;
    /** Influences how often B-frames are used */
    'b-bias'?: number;
    /** Keep some B-frames as references. */
    'b-pyramid'?: 'none' | 'strict' | 'normal';
    /** One reference per partition, as opposed to one reference per macroblock */
    'mixed-refs'?: boolean;
    /** High profile 8x8 transform. */
    '8x8dct'?: boolean;
    'fast-pskip'?: boolean;
    /** Use access unit delimiters. */
    aud?: boolean;
    /** Use macroblock tree ratecontrol. */
    mbtree?: boolean;
    /** Loop filter parameters, in &lt;alpha:beta&gt; form. */
    deblock?: string;
    /** Reduce fluctuations in QP (before curve compression) */
    cplxblur?: number;
    /** A comma-separated list of partitions to consider.  */
    partitions?: string;
    /** Direct MV prediction mode */
    'direct-pred'?: 'none' | 'spatial' | 'temporal' | 'auto';
    /** Limit the size of each slice in bytes */
    'slice-max-size'?: number;
    /** Filename for 2 pass stats */
    stats?: string;
    /** Signal HRD information (requires vbv-bufsize;  */
    'nal-hrd'?: 'none' | 'vbr' | 'cbr';
    /** AVC-Intra class 50/100/200/300/480 */
    'avcintra-class'?: number;
    /** Set motion estimation method */
    me_method?: 'dia' | 'hex' | 'umh' | 'esa' | 'tesa';
    /** Set motion estimation method */
    'motion-est'?: 'dia' | 'hex' | 'umh' | 'esa' | 'tesa';
    /** If forcing keyframes, force them as IDR frames. */
    'forced-idr'?: boolean;
    /** Coder type */
    coder?: 'default' | 'cavlc' | 'cabac' | 'vlc' | 'ac';
    /** Strategy to choose between I/P/B-frames */
    b_strategy?: number;
    /** QP difference between chroma and luma */
    chromaoffset?: number;
    /** Scene change threshold */
    sc_threshold?: number;
    /** Noise reduction */
    noise_reduction?: number;
    /** Use user data unregistered SEI if available */
    udu_sei?: boolean;
    /** Override the x264 configuration using a :-separated list of key=value parameters */
    'x264-params'?: string;
    /** Set mb_info data through AVSideData, only useful when used from the API */
    mb_info?: boolean;
  };
  /**
   * libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 RGB
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libx264rgb
   */
  libx264rgb: {
    /** Set the encoding preset (cf. x264 --fullhelp) */
    preset?: string;
    /** Tune the encoding params (cf. x264 --fullhelp) */
    tune?: string;
    /** Set profile restrictions (cf. x264 --fullhelp) */
    profile?: string;
    /** Use fast settings when encoding first pass */
    fastfirstpass?: boolean;
    /** Specify level (as defined by Annex A) */
    level?: string;
    /** Filename for 2 pass stats */
    passlogfile?: string;
    /** Weighted prediction for P-frames */
    wpredp?: string;
    /** Use A53 Closed Captions (if available) */
    a53cc?: boolean;
    /** x264 options */
    x264opts?: string;
    /** Select the quality for constant quality mode */
    crf?: number;
    /** In CRF mode, prevents VBV from lowering quality beyond this point. */
    crf_max?: number;
    /** Constant quantization parameter rate control method */
    qp?: number;
    /** AQ method */
    'aq-mode'?: 'none' | 'variance' | 'autovariance' | 'autovariance-biased';
    /** AQ strength. Reduces blocking and blurring in flat and textured areas. */
    'aq-strength'?: number;
    /** Use psychovisual optimizations. */
    psy?: boolean;
    /** Strength of psychovisual optimization, in &lt;psy-rd&gt;:&lt;psy-trellis&gt; format. */
    'psy-rd'?: string;
    /** Number of frames to look ahead for frametype and ratecontrol */
    'rc-lookahead'?: number;
    /** Weighted prediction for B-frames. */
    weightb?: boolean;
    /** Weighted prediction analysis method. */
    weightp?: 'none' | 'simple' | 'smart';
    /** Calculate and print SSIM stats. */
    ssim?: boolean;
    /** Use Periodic Intra Refresh instead of IDR frames. */
    'intra-refresh'?: boolean;
    /** Bluray compatibility workarounds. */
    'bluray-compat'?: boolean;
    /** Influences how often B-frames are used */
    'b-bias'?: number;
    /** Keep some B-frames as references. */
    'b-pyramid'?: 'none' | 'strict' | 'normal';
    /** One reference per partition, as opposed to one reference per macroblock */
    'mixed-refs'?: boolean;
    /** High profile 8x8 transform. */
    '8x8dct'?: boolean;
    'fast-pskip'?: boolean;
    /** Use access unit delimiters. */
    aud?: boolean;
    /** Use macroblock tree ratecontrol. */
    mbtree?: boolean;
    /** Loop filter parameters, in &lt;alpha:beta&gt; form. */
    deblock?: string;
    /** Reduce fluctuations in QP (before curve compression) */
    cplxblur?: number;
    /** A comma-separated list of partitions to consider.  */
    partitions?: string;
    /** Direct MV prediction mode */
    'direct-pred'?: 'none' | 'spatial' | 'temporal' | 'auto';
    /** Limit the size of each slice in bytes */
    'slice-max-size'?: number;
    /** Filename for 2 pass stats */
    stats?: string;
    /** Signal HRD information (requires vbv-bufsize;  */
    'nal-hrd'?: 'none' | 'vbr' | 'cbr';
    /** AVC-Intra class 50/100/200/300/480 */
    'avcintra-class'?: number;
    /** Set motion estimation method */
    me_method?: 'dia' | 'hex' | 'umh' | 'esa' | 'tesa';
    /** Set motion estimation method */
    'motion-est'?: 'dia' | 'hex' | 'umh' | 'esa' | 'tesa';
    /** If forcing keyframes, force them as IDR frames. */
    'forced-idr'?: boolean;
    /** Coder type */
    coder?: 'default' | 'cavlc' | 'cabac' | 'vlc' | 'ac';
    /** Strategy to choose between I/P/B-frames */
    b_strategy?: number;
    /** QP difference between chroma and luma */
    chromaoffset?: number;
    /** Scene change threshold */
    sc_threshold?: number;
    /** Noise reduction */
    noise_reduction?: number;
    /** Use user data unregistered SEI if available */
    udu_sei?: boolean;
    /** Override the x264 configuration using a :-separated list of key=value parameters */
    'x264-params'?: string;
    /** Set mb_info data through AVSideData, only useful when used from the API */
    mb_info?: boolean;
  };
  /**
   * libx265 H.265 / HEVC
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libx265
   */
  libx265: {
    /** set the x265 crf */
    crf?: number;
    /** set the x265 qp */
    qp?: number;
    /** if forcing keyframes, force them as IDR frames */
    'forced-idr'?: boolean;
    /** set the x265 preset */
    preset?: string;
    /** set the x265 tune parameter */
    tune?: string;
    /** set the x265 profile */
    profile?: string;
    /** Filename for 2 pass stats */
    'x265-stats'?: string;
    /** Use user data unregistered SEI if available */
    udu_sei?: boolean;
    /** Use A53 Closed Captions (if available) */
    a53cc?: boolean;
    /** set the x265 configuration using a :-separated list of key=value parameters */
    'x265-params'?: string;
    /** Enable Dolby Vision RPU coding */
    dolbyvision?: 'auto';
  };
  /**
   * libxavs Chinese AVS (Audio Video Standard)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libxavs
   */
  libxavs: {
    /** Select the quality for constant quality mode */
    crf?: number;
    /** Constant quantization parameter rate control method */
    qp?: number;
    /** Influences how often B-frames are used */
    'b-bias'?: number;
    /** Reduce fluctuations in QP (before curve compression) */
    cplxblur?: number;
    /** Direct MV prediction mode */
    'direct-pred'?: 'none' | 'spatial' | 'temporal' | 'auto';
    /** Use access unit delimiters. */
    aud?: boolean;
    /** Use macroblock tree ratecontrol. */
    mbtree?: boolean;
    /** One reference per partition, as opposed to one reference per macroblock */
    'mixed-refs'?: boolean;
    'fast-pskip'?: boolean;
    /** Set motion estimation method */
    'motion-est'?: 'dia' | 'hex' | 'umh' | 'esa' | 'tesa';
    /** Strategy to choose between I/P/B-frames */
    b_strategy?: number;
    /** QP difference between chroma and luma */
    chromaoffset?: number;
    /** Scene change threshold */
    sc_threshold?: number;
    /** Noise reduction */
    noise_reduction?: number;
  };
  /**
   * libxavs2 AVS2-P2/IEEE1857.4
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libxavs2
   */
  libxavs2: {
    /** number of parallel threads for rows */
    lcu_row_threads?: number;
    /** Quantization initial parameter */
    initial_qp?: number;
    /** Quantization parameter */
    qp?: number;
    /** max qp for rate control */
    max_qp?: number;
    /** min qp for rate control */
    min_qp?: number;
    /** Speed level, higher is better but slower */
    speed_level?: number;
    /** log level: -1: none, 0: error, 1: warning, 2: info, 3: debug */
    log_level?: number;
    /** set the xavs2 configuration using a :-separated list of key=value parameters */
    'xavs2-params'?: string;
  };
  /**
   * libxeve MPEG-5 EVC
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libxeve
   */
  libxeve: {
    /** Encoding preset for setting encoding speed */
    preset?: 'default' | 'fast' | 'medium' | 'slow' | 'placebo';
    /** Tuning parameter for special purpose operation */
    tune?: 'none' | 'zerolatency' | 'psnr';
    /** Encoding profile */
    profile?: 'baseline' | 'main';
    /** Rate control mode */
    rc_mode?: 'CQP' | 'ABR' | 'CRF';
    /** Quantization parameter value for CQP rate control mode */
    qp?: number;
    /** Constant rate factor value for CRF rate control mode */
    crf?: number;
    /** Embed picture signature (HASH) for conformance checking in decoding */
    hash?: number;
    /** Embed SEI messages identifying encoder parameters and command line arguments */
    sei_info?: number;
    /** Override the xeve configuration using a :-separated list of key=value parameters */
    'xeve-params'?: string;
  };
  /**
   * libxvidcore MPEG-4 part 2
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libxvid
   */
  libxvid: {
    /** Luminance masking AQ */
    lumi_aq?: number;
    /** Variance AQ */
    variance_aq?: number;
    /** Show SSIM information to stdout */
    ssim?: 'off' | 'avg' | 'frame';
    /** SSIM accuracy */
    ssim_acc?: number;
    /** use GMC */
    gmc?: number;
    /** Motion estimation quality */
    me_quality?: number;
    /** Use MPEG quantizers instead of H.263 */
    mpeg_quant?: number;
  };
  /**
   * Lossless JPEG
   * @see https://ffmpeg.org/ffmpeg-codecs.html#ljpeg
   */
  ljpeg: {
    /** Prediction method */
    pred?: 'left' | 'plane' | 'median';
  };
  /**
   * MagicYUV video
   * @see https://ffmpeg.org/ffmpeg-codecs.html#magicyuv
   */
  magicyuv: {
    /** Prediction method */
    pred?: 'left' | 'gradient' | 'median';
  };
  /**
   * MJPEG (Motion JPEG)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mjpeg
   */
  mjpeg: {
    /** Huffman table strategy */
    huffman?: 'default' | 'optimal';
    /** Always write luma and chroma matrix for mjpeg, useful for rtp streaming. */
    force_duplicated_matrix?: boolean;
    /** Flags common for all mpegvideo-based encoders. */
    mpv_flags?: 'skip_rd' | 'strict_gop' | 'qp_rd' | 'cbp_rd' | 'naq' | (string & {});
    /** single coefficient elimination threshold for luminance (negative values also consider dc coefficient) */
    luma_elim_threshold?: number;
    /** single coefficient elimination threshold for chrominance (negative values also consider dc coefficient) */
    chroma_elim_threshold?: number;
    quantizer_noise_shaping?: number;
    /** Simulate errors in the bitstream to test error concealment. */
    error_rate?: number;
    /** how to keep quantizer between qmin and qmax (0 = clip, 1 = use differentiable function) */
    qsquish?: number;
    /** experimental quantizer modulation */
    rc_qmod_amp?: number;
    /** experimental quantizer modulation */
    rc_qmod_freq?: number;
    /** Set rate control equation. When computing the expression, besides the standard functions  */
    rc_eq?: string;
    /** initial complexity for 1-pass encoding */
    rc_init_cplx?: number;
    /** currently useless */
    rc_buf_aggressivity?: number;
    /** increase the quantizer for macroblocks close to borders */
    border_mask?: number;
    /** minimum Lagrange factor (VBR) */
    lmin?: number;
    /** maximum Lagrange factor (VBR) */
    lmax?: number;
    /** Frame skip threshold */
    skip_threshold?: number;
    /** Frame skip factor */
    skip_factor?: number;
    /** Frame skip exponent */
    skip_exp?: number;
    /** Frame skip compare function */
    skip_cmp?: 'sad' | 'sse' | 'satd' | 'dct' | 'psnr' | 'bit' | 'rd' | 'zero' | 'vsad' | 'vsse' | 'nsse' | 'dct264' | 'dctmax' | 'chroma' | 'msad';
    /** Noise reduction */
    noise_reduction?: number;
    /** RTP payload size in bytes */
    ps?: number;
  };
  /**
   * MJPEG (Intel Quick Sync Video acceleration)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mjpeg_005fqsv
   */
  mjpeg_qsv: {
    /** Maximum processing parallelism */
    async_depth?: number;
  };
  /**
   * MJPEG (VAAPI)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mjpeg_005fvaapi
   */
  mjpeg_vaapi: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Use low-power encoding mode (only available on some platforms;  */
    low_power?: boolean;
    /** Maximum frame size (in bytes) */
    max_frame_size?: number;
    /** Include JFIF header */
    jfif?: boolean;
    /** Include huffman tables */
    huffman?: boolean;
  };
  /**
   * VideoToolbox MJPEG Encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mjpeg_005fvideotoolbox
   */
  mjpeg_videotoolbox: {
    /** Allow software encoding */
    allow_sw?: boolean;
  };
  /**
   * MLP (Meridian Lossless Packing)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mlp
   */
  mlp: {
    /** Max number of frames between each new header */
    max_interval?: number;
    /** LPC coefficient precision */
    lpc_coeff_precision?: number;
    /** LPC algorithm */
    lpc_type?: 'levinson' | 'cholesky';
    /** Number of passes to use for Cholesky factorization during LPC analysis */
    lpc_passes?: number;
    /** Max number of codebook searches */
    codebook_search?: number;
    /** Search method for selecting prediction order */
    prediction_order?: 'estimation' | 'search';
    /** Rematrix coefficient precision */
    rematrix_precision?: number;
  };
  /**
   * 3GPP Timed Text subtitle
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mov_005ftext
   */
  mov_text: {
    /** Frame height, usually video height */
    height?: number;
  };
  /**
   * MPEG-2 video (Intel Quick Sync Video acceleration)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mpeg2_005fqsv
   */
  mpeg2_qsv: {
    /** Maximum processing parallelism */
    async_depth?: number;
    preset?: 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
    /** Forcing I frames as IDR frames */
    forced_idr?: boolean;
    /** enable low power mode(experimental: many limitations by mfx version, BRC modes, etc.) */
    low_power?: boolean;
    /** Set QSV encoder parameters as key1=value1:key2=value2:... */
    qsv_params?: string;
    /** Enable rate distortion optimization */
    rdo?: number;
    profile?: 'unknown' | 'simple' | 'main' | 'high';
  };
  /**
   * MPEG-2 (VAAPI)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mpeg2_005fvaapi
   */
  mpeg2_vaapi: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Use low-power encoding mode (only available on some platforms;  */
    low_power?: boolean;
    /** Maximum frame size (in bytes) */
    max_frame_size?: number;
    /** Set rate control mode */
    rc_mode?: 'auto' | 'CQP' | 'CBR' | 'VBR' | 'ICQ' | 'QVBR' | 'AVBR';
    /** Block level based bitrate control */
    blbrc?: boolean;
    /** Set profile (in profile_and_level_indication) */
    profile?: 'simple' | 'main';
    /** Set level (in profile_and_level_indication) */
    level?: 'low' | 'main' | 'high_1440' | 'high';
  };
  /**
   * MPEG-4 part 2
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mpeg4
   */
  mpeg4: {
    /** Use data partitioning. */
    data_partitioning?: boolean;
    /** Enable alternate scantable. */
    alternate_scan?: boolean;
    /** Use MPEG quantizers instead of H.263 */
    mpeg_quant?: number;
    /** Strategy to choose between I/P/B-frames */
    b_strategy?: number;
    /** Adjust sensitivity of b_frame_strategy 1 */
    b_sensitivity?: number;
    /** Downscale frames for dynamic B-frame decision */
    brd_scale?: number;
    /** Flags common for all mpegvideo-based encoders. */
    mpv_flags?: 'skip_rd' | 'strict_gop' | 'qp_rd' | 'cbp_rd' | 'naq' | 'mv0' | (string & {});
    /** single coefficient elimination threshold for luminance (negative values also consider dc coefficient) */
    luma_elim_threshold?: number;
    /** single coefficient elimination threshold for chrominance (negative values also consider dc coefficient) */
    chroma_elim_threshold?: number;
    quantizer_noise_shaping?: number;
    /** Simulate errors in the bitstream to test error concealment. */
    error_rate?: number;
    /** how to keep quantizer between qmin and qmax (0 = clip, 1 = use differentiable function) */
    qsquish?: number;
    /** experimental quantizer modulation */
    rc_qmod_amp?: number;
    /** experimental quantizer modulation */
    rc_qmod_freq?: number;
    /** Set rate control equation. When computing the expression, besides the standard functions  */
    rc_eq?: string;
    /** initial complexity for 1-pass encoding */
    rc_init_cplx?: number;
    /** currently useless */
    rc_buf_aggressivity?: number;
    /** increase the quantizer for macroblocks close to borders */
    border_mask?: number;
    /** minimum Lagrange factor (VBR) */
    lmin?: number;
    /** maximum Lagrange factor (VBR) */
    lmax?: number;
    /** Frame skip threshold */
    skip_threshold?: number;
    /** Frame skip factor */
    skip_factor?: number;
    /** Frame skip exponent */
    skip_exp?: number;
    /** Frame skip compare function */
    skip_cmp?: 'sad' | 'sse' | 'satd' | 'dct' | 'psnr' | 'bit' | 'rd' | 'zero' | 'vsad' | 'vsse' | 'nsse' | 'dct264' | 'dctmax' | 'chroma' | 'msad';
    /** Noise reduction */
    noise_reduction?: number;
    /** RTP payload size in bytes */
    ps?: number;
    /** motion estimation algorithm */
    motion_est?: 'zero' | 'epzs' | 'xone';
    /** Motion estimation bitrate penalty compensation (1.0 = 256) */
    mepc?: number;
    /** pre motion estimation */
    mepre?: number;
    /** Penalty for intra blocks in block decision */
    intra_penalty?: number;
    /** Scene change threshold */
    sc_threshold?: number;
  };
  /**
   * OpenMAX IL MPEG-4 video encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mpeg4_005fomx
   */
  mpeg4_omx: {
    /** OpenMAX library name */
    omx_libname?: string;
    /** OpenMAX library prefix */
    omx_libprefix?: string;
    /** Try to avoid copying input frames if possible */
    zerocopy?: number;
    /** Set the encoding profile */
    profile?: 'baseline' | 'main' | 'high';
  };
  /**
   * Opus
   * @see https://ffmpeg.org/ffmpeg-codecs.html#opus
   */
  opus: {
    /** Maximum delay in milliseconds */
    opus_delay?: number;
    /** Apply intensity stereo phase inversion */
    apply_phase_inv?: boolean;
  };
  /**
   * PNG (Portable Network Graphics) image
   * @see https://ffmpeg.org/ffmpeg-codecs.html#png
   */
  png: {
    /** Set image resolution (in dots per inch) */
    dpi?: number;
    /** Set image resolution (in dots per meter) */
    dpm?: number;
    /** Prediction method */
    pred?: 'none' | 'sub' | 'up' | 'avg' | 'paeth' | 'mixed';
  };
  /**
   * Apple ProRes
   * @see https://ffmpeg.org/ffmpeg-codecs.html#prores
   */
  prores: {
    /** vendor ID */
    vendor?: string;
  };
  /**
   * Apple ProRes
   * @see https://ffmpeg.org/ffmpeg-codecs.html#prores_005faw
   */
  prores_aw: {
    /** vendor ID */
    vendor?: string;
  };
  /**
   * Apple ProRes (iCodec Pro)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#prores_005fks
   */
  prores_ks: {
    /** macroblocks per slice */
    mbs_per_slice?: number;
    profile?: 'auto' | 'proxy' | 'lt' | 'standard' | 'hq' | '4444' | '4444xq';
    /** vendor ID */
    vendor?: string;
    /** desired bits per macroblock */
    bits_per_mb?: number;
    /** quantiser matrix */
    quant_mat?: 'auto' | 'proxy' | 'lt' | 'standard' | 'hq' | 'default';
    /** bits for alpha plane */
    alpha_bits?: number;
  };
  /**
   * Apple ProRes (iCodec Pro)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#prores_005fks_005fvulkan
   */
  prores_ks_vulkan: {
    /** macroblocks per slice */
    mbs_per_slice?: number;
    profile?: 'auto' | 'proxy' | 'lt' | 'standard' | 'hq' | '4444' | '4444xq';
    /** vendor ID */
    vendor?: string;
    /** desired bits per macroblock */
    bits_per_mb?: number;
    /** quantiser matrix */
    quant_mat?: 'auto' | 'proxy' | 'lt' | 'standard' | 'hq' | 'default';
    /** bits for alpha plane */
    alpha_bits?: number;
    /** Internal parallelization depth */
    async_depth?: number;
  };
  /**
   * VideoToolbox ProRes Encoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#prores_005fvideotoolbox
   */
  prores_videotoolbox: {
    /** Profile */
    profile?: 'auto' | 'proxy' | 'lt' | 'standard' | 'hq' | '4444' | 'xq';
    /** Allow software encoding */
    allow_sw?: boolean;
    /** Require software encoding */
    require_sw?: boolean;
    /** Hint that encoding should happen in real-time if not faster (e.g. capturing from camera). */
    realtime?: boolean;
    /** Other frames will come before the frames in this session. This helps smooth concatenation issues. */
    frames_before?: boolean;
    /** Other frames will come after the frames in this session. This helps smooth concatenation issues. */
    frames_after?: boolean;
    /** prioritize encoding speed */
    prio_speed?: boolean;
    /** Set to 1 to enable more power-efficient encoding if supported. */
    power_efficient?: number;
    /** Set to 1 to enable spatial AQ if supported. */
    spatial_aq?: number;
    /** Sets the maximum number of reference frames. This only has an effect when the value is less than the maximum allowed by the profile/level. */
    max_ref_frames?: number;
  };
  /**
   * id RoQ video
   * @see https://ffmpeg.org/ffmpeg-codecs.html#roqvideo
   */
  roqvideo: {
    /** Whether to respect known limitations in Quake 3 decoder */
    quake3_compat?: boolean;
  };
  /**
   * QuickTime video (RPZA)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#rpza
   */
  rpza: {
    skip_frame_thresh?: number;
    start_one_color_thresh?: number;
    continue_one_color_thresh?: number;
    sixteen_color_thresh?: number;
  };
  /**
   * SBC (low-complexity subband codec)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#sbc
   */
  sbc: {
    /** set maximum algorithmic latency */
    sbc_delay?: string;
    /** use mSBC mode (wideband speech mono SBC) */
    msbc?: boolean;
  };
  /**
   * SGI image
   * @see https://ffmpeg.org/ffmpeg-codecs.html#sgi
   */
  sgi: {
    /** Use run-length compression */
    rle?: number;
  };
  /**
   * Snow
   * @see https://ffmpeg.org/ffmpeg-codecs.html#snow
   */
  snow: {
    /** motion estimation algorithm */
    motion_est?: 'zero' | 'epzs' | 'xone' | 'iter';
    /** Only do ME/MC (I frames -&gt; ref, P frame -&gt; ME+MC). */
    memc_only?: boolean;
    /** Skip final bitstream writeout. */
    no_bitstream?: boolean;
    /** Penalty for intra blocks in block decision */
    intra_penalty?: number;
    /** Dia size for the iterative ME */
    iterative_dia_size?: number;
    /** Scene change threshold */
    sc_threshold?: number;
    /** Spatial decomposition type */
    pred?: 'dwt97' | 'dwt53';
    /** Set rate control equation. When computing the expression, besides the standard functions  */
    rc_eq?: string;
  };
  /**
   * Sun Rasterfile image
   * @see https://ffmpeg.org/ffmpeg-codecs.html#sunrast
   */
  sunrast: {
    /** Use run-length compression */
    rle?: number;
  };
  /**
   * Sorenson Vector Quantizer 1 / Sorenson Video 1 / SVQ1
   * @see https://ffmpeg.org/ffmpeg-codecs.html#svq1
   */
  svq1: {
    /** Motion estimation algorithm */
    'motion-est'?: 'zero' | 'epzs' | 'xone';
  };
  /**
   * Truevision Targa image
   * @see https://ffmpeg.org/ffmpeg-codecs.html#targa
   */
  targa: {
    /** Use run-length compression */
    rle?: number;
  };
  /**
   * TIFF image
   * @see https://ffmpeg.org/ffmpeg-codecs.html#tiff
   */
  tiff: {
    /** set the image resolution (in dpi) */
    dpi?: number;
    compression_algo?: 'packbits' | 'raw' | 'lzw' | 'deflate';
  };
  /**
   * TrueHD
   * @see https://ffmpeg.org/ffmpeg-codecs.html#truehd
   */
  truehd: {
    /** Max number of frames between each new header */
    max_interval?: number;
    /** LPC coefficient precision */
    lpc_coeff_precision?: number;
    /** LPC algorithm */
    lpc_type?: 'levinson' | 'cholesky';
    /** Number of passes to use for Cholesky factorization during LPC analysis */
    lpc_passes?: number;
    /** Max number of codebook searches */
    codebook_search?: number;
    /** Search method for selecting prediction order */
    prediction_order?: 'estimation' | 'search';
    /** Rematrix coefficient precision */
    rematrix_precision?: number;
  };
  /**
   * Ut Video
   * @see https://ffmpeg.org/ffmpeg-codecs.html#utvideo
   */
  utvideo: {
    /** Prediction method */
    pred?: 'none' | 'left' | 'median';
  };
  /**
   * Vizrt Binary Image
   * @see https://ffmpeg.org/ffmpeg-codecs.html#vbn
   */
  vbn: {
    /** Texture format */
    format?: 'raw' | 'dxt1' | 'dxt5';
  };
  /**
   * SMPTE VC-2
   * @see https://ffmpeg.org/ffmpeg-codecs.html#vc2
   */
  vc2: {
    /** Max undershoot in percent */
    tolerance?: number;
    /** Slice width */
    slice_width?: number;
    /** Slice height */
    slice_height?: number;
    /** Transform depth */
    wavelet_depth?: number;
    /** Transform type */
    wavelet_type?: '9_7' | '5_3' | 'haar' | 'haar_noshift';
    /** Custom quantization matrix */
    qm?: 'default' | 'color' | 'flat';
  };
  /**
   * VP8 (VAAPI)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#vp8_005fvaapi
   */
  vp8_vaapi: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Use low-power encoding mode (only available on some platforms;  */
    low_power?: boolean;
    /** Maximum frame size (in bytes) */
    max_frame_size?: number;
    /** Set rate control mode */
    rc_mode?: 'auto' | 'CQP' | 'CBR' | 'VBR' | 'ICQ' | 'QVBR' | 'AVBR';
    /** Block level based bitrate control */
    blbrc?: boolean;
    /** Loop filter level */
    loop_filter_level?: number;
    /** Loop filter sharpness */
    loop_filter_sharpness?: number;
  };
  /**
   * VP9 video (Intel Quick Sync Video acceleration)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#vp9_005fqsv
   */
  vp9_qsv: {
    /** Maximum processing parallelism */
    async_depth?: number;
    preset?: 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
    /** Forcing I frames as IDR frames */
    forced_idr?: boolean;
    /** enable low power mode(experimental: many limitations by mfx version, BRC modes, etc.) */
    low_power?: boolean;
    /** Set QSV encoder parameters as key1=value1:key2=value2:... */
    qsv_params?: string;
    profile?: 'unknown' | 'profile0' | 'profile1' | 'profile2' | 'profile3';
    /** Number of columns for tiled encoding */
    tile_cols?: number;
    /** Number of rows for tiled encoding */
    tile_rows?: number;
  };
  /**
   * VP9 (VAAPI)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#vp9_005fvaapi
   */
  vp9_vaapi: {
    /** Distance (in I-frames) between key frames */
    idr_interval?: number;
    /** Maximum B-frame reference depth */
    b_depth?: number;
    /** Maximum processing parallelism.  */
    async_depth?: number;
    /** Use low-power encoding mode (only available on some platforms;  */
    low_power?: boolean;
    /** Maximum frame size (in bytes) */
    max_frame_size?: number;
    /** Set rate control mode */
    rc_mode?: 'auto' | 'CQP' | 'CBR' | 'VBR' | 'ICQ' | 'QVBR' | 'AVBR';
    /** Block level based bitrate control */
    blbrc?: boolean;
    /** Loop filter level */
    loop_filter_level?: number;
    /** Loop filter sharpness */
    loop_filter_sharpness?: number;
  };
  /**
   * WavPack
   * @see https://ffmpeg.org/ffmpeg-codecs.html#wavpack
   */
  wavpack: {
    joint_stereo?: boolean;
    optimize_mono?: boolean;
  };
}

export interface DecoderOptionsMap {
  /**
   * AAC (Advanced Audio Coding)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#aac
   */
  aac: {
    /** Select the channel to decode for dual mono */
    dual_mono_mode?: 'auto' | 'main' | 'sub' | 'both';
    /** Order in which the channels are to be exported */
    channel_order?: 'default' | 'coded';
    /** Target output loudness in dBFS for xHE-AAC normalization (0 = disabled) */
    target_level?: number;
  };
  /**
   * AAC (Advanced Audio Coding)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#aac_005ffixed
   */
  aac_fixed: {
    /** Select the channel to decode for dual mono */
    dual_mono_mode?: 'auto' | 'main' | 'sub' | 'both';
    /** Order in which the channels are to be exported */
    channel_order?: 'default' | 'coded';
    /** Target output loudness in dBFS for xHE-AAC normalization (0 = disabled) */
    target_level?: number;
  };
  /**
   * ATSC A/52A (AC-3)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#ac3
   */
  ac3: {
    /** enable consistent noise generation */
    cons_noisegen?: boolean;
    /** percentage of dynamic range compression to apply */
    drc_scale?: number;
    /** enable heavy dynamic range compression */
    heavy_compr?: boolean;
    /** target level in -dBFS (0 not applied) */
    target_level?: number;
    /** Preferred Stereo Downmix Mode */
    dmix_mode?: number;
    /** Lt/Rt Center Mix Level */
    ltrt_cmixlev?: number;
    /** Lt/Rt Surround Mix Level */
    ltrt_surmixlev?: number;
    /** Lo/Ro Center Mix Level */
    loro_cmixlev?: number;
    /** Lo/Ro Surround Mix Level */
    loro_surmixlev?: number;
    /** Request a specific channel layout from the decoder */
    downmix?: string;
  };
  /**
   * ATSC A/52A (AC-3)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#ac3_005ffixed
   */
  ac3_fixed: {
    /** enable consistent noise generation */
    cons_noisegen?: boolean;
    /** percentage of dynamic range compression to apply */
    drc_scale?: number;
    /** enable heavy dynamic range compression */
    heavy_compr?: boolean;
    /** Request a specific channel layout from the decoder */
    downmix?: string;
  };
  /**
   * Dolby AC-4
   * @see https://ffmpeg.org/ffmpeg-codecs.html#ac4
   */
  ac4: {
    /** select presentation */
    presentation?: number;
  };
  /**
   * ALAC (Apple Lossless Audio Codec)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#alac
   */
  alac: {
    /** Force non-standard decoding process */
    extra_bits_bug?: boolean;
  };
  /**
   * MPEG-4 Audio Lossless Coding (ALS)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#als
   */
  als: {
    /** Sets the maximum order (ALS simple profile allows max 15) */
    max_order?: number;
  };
  /**
   * Monkey's Audio
   * @see https://ffmpeg.org/ffmpeg-codecs.html#ape
   */
  ape: {
    /** maximum number of samples decoded per call */
    max_samples?: 'all';
  };
  /**
   * Alliance for Open Media AV1
   * @see https://ffmpeg.org/ffmpeg-codecs.html#av1
   */
  av1: {
    /** Select an operating point of the scalable bitstream */
    operating_point?: number;
  };
  /**
   * Closed Captions (EIA-608 / CEA-708)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#cc_005fdec
   */
  cc_dec: {
    /** emit subtitle events as they are decoded for real-time display */
    real_time?: boolean;
    /** minimum elapsed time between emitting real-time subtitle events */
    real_time_latency_msec?: number;
    /** select data field */
    data_field?: 'auto' | 'first' | 'second';
  };
  /**
   * DCA (DTS Coherent Acoustics)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#dca
   */
  dca: {
    /** Decode core only without extensions */
    core_only?: boolean;
    /** Order in which the channels are to be exported */
    channel_order?: 'default' | 'coded';
    /** Request a specific channel layout from the decoder */
    downmix?: string;
  };
  /**
   * Dolby E
   * @see https://ffmpeg.org/ffmpeg-codecs.html#dolby_005fe
   */
  dolby_e: {
    /** Order in which the channels are to be exported */
    channel_order?: 'default' | 'coded';
  };
  /**
   * DVB subtitles
   * @see https://ffmpeg.org/ffmpeg-codecs.html#dvbsub
   */
  dvbsub: {
    /** compute end of time using pts or timeout */
    compute_edt?: boolean;
    /** compute clut when not available(-1) or only once (-2) or always(1) or never(0) */
    compute_clut?: boolean;
    dvb_substream?: number;
  };
  /**
   * DVD subtitles
   * @see https://ffmpeg.org/ffmpeg-codecs.html#dvdsub
   */
  dvdsub: {
    /** set the global palette */
    palette?: string;
    /** obtain the global palette from .IFO file */
    ifo_palette?: string;
    /** Only show forced subtitles */
    forced_subs_only?: boolean;
  };
  /**
   * ATSC A/52B (AC-3, E-AC-3)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#eac3
   */
  eac3: {
    /** enable consistent noise generation */
    cons_noisegen?: boolean;
    /** percentage of dynamic range compression to apply */
    drc_scale?: number;
    /** enable heavy dynamic range compression */
    heavy_compr?: boolean;
    /** target level in -dBFS (0 not applied) */
    target_level?: number;
    /** Preferred Stereo Downmix Mode */
    dmix_mode?: number;
    /** Lt/Rt Center Mix Level */
    ltrt_cmixlev?: number;
    /** Lt/Rt Surround Mix Level */
    ltrt_surmixlev?: number;
    /** Lo/Ro Center Mix Level */
    loro_cmixlev?: number;
    /** Lo/Ro Surround Mix Level */
    loro_surmixlev?: number;
    /** Request a specific channel layout from the decoder */
    downmix?: string;
  };
  /**
   * EVRC (Enhanced Variable Rate Codec)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#evrc
   */
  evrc: {
    /** enable postfilter */
    postfilter?: boolean;
  };
  /**
   * OpenEXR image
   * @see https://ffmpeg.org/ffmpeg-codecs.html#exr
   */
  exr: {
    /** Set the decoding layer */
    layer?: string;
    /** Set the decoding part */
    part?: number;
    /** Set the float gamma value when decoding (deprecated, use a scaler) */
    gamma?: number;
    /** color transfer characteristics to apply to EXR linear input (deprecated, use a scaler) */
    apply_trc?:
      | 'bt709'
      | 'gamma'
      | 'gamma22'
      | 'gamma28'
      | 'smpte170m'
      | 'smpte240m'
      | 'linear'
      | 'log'
      | 'log_sqrt'
      | 'iec61966_2_4'
      | 'bt1361'
      | 'iec61966_2_1'
      | 'bt2020_10bit'
      | 'bt2020_12bit'
      | 'smpte2084'
      | 'smpte428_1';
  };
  /**
   * Mirillis FIC
   * @see https://ffmpeg.org/ffmpeg-codecs.html#fic
   */
  fic: {
    /** skip the cursor */
    skip_cursor?: boolean;
  };
  /**
   * Flexible Image Transport System
   * @see https://ffmpeg.org/ffmpeg-codecs.html#fits
   */
  fits: {
    /** value that is used to replace BLANK pixels in data array */
    blank_value?: number;
  };
  /**
   * FLAC (Free Lossless Audio Codec)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#flac
   */
  flac: {
    /** emulate old buggy lavc behavior */
    use_buggy_lpc?: boolean;
  };
  /**
   * Forward Uncompressed
   * @see https://ffmpeg.org/ffmpeg-codecs.html#frwu
   */
  frwu: {
    /** Change field order */
    change_field_order?: boolean;
  };
  /**
   * G.722 ADPCM
   * @see https://ffmpeg.org/ffmpeg-codecs.html#g722
   */
  g722: {
    /** Bits per G722 codeword */
    bits_per_codeword?: number;
  };
  /**
   * G.723.1
   * @see https://ffmpeg.org/ffmpeg-codecs.html#g723_005f1
   */
  g723_1: {
    /** enable postfilter */
    postfilter?: boolean;
  };
  /**
   * GIF (Graphics Interchange Format)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#gif
   */
  gif: {
    /** color value (ARGB) that is used instead of transparent color */
    trans_color?: number;
  };
  /**
   * H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
   * @see https://ffmpeg.org/ffmpeg-codecs.html#h264
   */
  h264: {
    /** is avc */
    is_avc?: boolean;
    /** nal_length_size */
    nal_length_size?: number;
    /** Enable error resilience on damaged frames (unsafe) */
    enable_er?: boolean;
    /** Assume this x264 version if no x264 version found in any SEI */
    x264_build?: number;
    /** Do not return gray gap frames */
    skip_gray?: boolean;
    /** Avoid using gray gap frames as references */
    noref_gray?: boolean;
  };
  /**
   * HEVC (High Efficiency Video Coding)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#hevc
   */
  hevc: {
    /** Apply default display window from VUI */
    apply_defdispwin?: boolean;
    /** strictly apply default display window size */
    'strict-displaywin'?: boolean;
    /** Array of view IDs that should be decoded and output; a single -1 to decode all views */
    view_ids?: string;
    /** Array of available view IDs is exported here */
    view_ids_available?: string;
    /** Array of view positions for view_ids_available is exported here, as AVStereo3DView */
    view_pos_available?: 'unspecified' | 'left' | 'right';
  };
  /**
   * JPEG 2000
   * @see https://ffmpeg.org/ffmpeg-codecs.html#jpeg2000
   */
  jpeg2000: {
    /** Lower the decoding resolution by a power of two */
    lowres?: number;
  };
  /**
   * libaribb24 ARIB STD-B24 caption decoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libaribb24
   */
  libaribb24: {
    /** set the base path for the libaribb24 library */
    'aribb24-base-path'?: string;
    /** skip ruby text blocks during decoding */
    'aribb24-skip-ruby-text'?: boolean;
    /** default profile to use if not specified in the stream parameters */
    default_profile?: 'a' | 'c';
  };
  /**
   * ARIB STD-B24 caption decoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libaribcaption
   */
  libaribcaption: {
    /** subtitle rendering type */
    sub_type?: 'none' | 'bitmap' | 'text' | 'ass';
    /** encoding scheme of subtitle text */
    caption_encoding?: 'auto' | 'jis' | 'utf8' | 'latin';
    /** workaround of ASS subtitle for players which can't handle multi-rectangle [ass] */
    ass_single_rect?: boolean;
    /** comma-separated font family [ass, bitmap] */
    font?: string;
    /** always render characters with outline [(ass), bitmap] */
    force_outline_text?: boolean;
    /** ignore rendering caption background [(ass), bitmap] */
    ignore_background?: boolean;
    /** ignore ruby-like characters [ass, bitmap] */
    ignore_ruby?: boolean;
    /** outline width of text [(ass), bitmap] */
    outline_width?: number;
    /** replace known DRCS [bitmap] */
    replace_drcs?: boolean;
    /** replace MSZ fullwidth alphanumerics with halfwidth alphanumerics [ass, bitmap] */
    replace_msz_ascii?: boolean;
    /** replace MSZ fullwidth Japanese with halfwidth [ass, bitmap] */
    replace_msz_japanese?: boolean;
    /** replace MSZ characters with halfwidth glyphs [bitmap] */
    replace_msz_glyph?: boolean;
    /** set input video size (WxH or abbreviation) [bitmap] */
    canvas_size?: string;
  };
  /**
   * dav1d AV1 decoder by VideoLAN
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libdav1d
   */
  libdav1d: {
    /** Max frame delay */
    max_frame_delay?: number;
    /** Apply Film Grain */
    filmgrain?: boolean;
    /** Select an operating point of the scalable bitstream */
    oppoint?: number;
    /** Output all spatial layers */
    alllayers?: boolean;
  };
  /**
   * Fraunhofer FDK AAC
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libfdk_005faac
   */
  libfdk_aac: {
    /** Error concealment method */
    conceal?: 'spectral' | 'noise' | 'energy';
    /** Dynamic Range Control: boost, where [0] is none and [127] is max boost */
    drc_boost?: number;
    /** Dynamic Range Control: attenuation factor, where [0] is none and [127] is max compression */
    drc_cut?: number;
    /** Dynamic Range Control: reference level, quantized to 0.25dB steps where [0] is 0dB and [127] is -31.75dB, -1 for auto, and -2 for disabled */
    drc_level?: number;
    /** Dynamic Range Control: heavy compression, where [1] is on (RF mode) and [0] is off */
    drc_heavy?: number;
    /** Signal level limiting */
    level_limit?: boolean;
    /** Dynamic Range Control: effect type, where e.g. [0] is none and [6] is general */
    drc_effect?: number;
    /** Dynamic Range Control: album mode, where [0] is off and [1] is on */
    album_mode?: number;
    /** Request a specific channel layout from the decoder */
    downmix?: string;
  };
  /**
   * iLBC (Internet Low Bitrate Codec)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libilbc
   */
  libilbc: {
    /** Enhance the decoded audio (adds delay) */
    enhance?: number;
  };
  /**
   * libopus Opus
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libopus
   */
  libopus: {
    /** Apply intensity stereo phase inversion */
    apply_phase_inv?: boolean;
  };
  /**
   * Librsvg rasterizer
   * @see https://ffmpeg.org/ffmpeg-codecs.html#librsvg
   */
  librsvg: {
    /** Width to render to (0 for default) */
    width?: number;
    /** Height to render to (0 for default) */
    height?: number;
    /** Keep aspect ratio with custom width/height */
    keep_ar?: boolean;
  };
  /**
   * Libzvbi DVB teletext decoder
   * @see https://ffmpeg.org/ffmpeg-codecs.html#libzvbi_005fteletextdec
   */
  libzvbi_teletextdec: {
    /** page numbers to decode, subtitle for subtitles, * for all */
    txt_page?: string;
    /** default G0 character set used for decoding */
    txt_default_region?: number;
    /** discards the top teletext line */
    txt_chop_top?: number;
    /** format of the subtitles (bitmap or text or ass) */
    txt_format?: 'bitmap' | 'text' | 'ass';
    /** x offset of generated bitmaps */
    txt_left?: number;
    /** y offset of generated bitmaps */
    txt_top?: number;
    /** chops leading and trailing spaces from text */
    txt_chop_spaces?: number;
    /** display duration of teletext pages in msecs */
    txt_duration?: number;
    /** force transparent background of the teletext */
    txt_transparent?: number;
    /** set opacity of the transparent background */
    txt_opacity?: number;
  };
  /**
   * MJPEG (Motion JPEG)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mjpeg
   */
  mjpeg: {
    /** Use external huffman table. */
    extern_huff?: boolean;
  };
  /**
   * MLP (Meridian Lossless Packing)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mlp
   */
  mlp: {
    /** Request a specific channel layout from the decoder */
    downmix?: string;
  };
  /**
   * 3GPP Timed Text subtitle
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mov_005ftext
   */
  mov_text: {
    /** Frame width, usually video width */
    width?: number;
    /** Frame height, usually video height */
    height?: number;
  };
  /**
   * MPEG-2 video
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mpeg2video
   */
  mpeg2video: {
    /** extract a specific Closed Captions format */
    cc_format?: 'auto' | 'a53' | 'scte20' | 'dvd' | 'dish';
  };
  /**
   * MPEG-4 part 2
   * @see https://ffmpeg.org/ffmpeg-codecs.html#mpeg4
   */
  mpeg4: {
    /** 1/4 subpel MC */
    quarter_sample?: boolean;
    /** divx style packed b frames */
    divx_packed?: boolean;
  };
  /**
   * Opus
   * @see https://ffmpeg.org/ffmpeg-codecs.html#opus
   */
  opus: {
    /** Apply intensity stereo phase inversion */
    apply_phase_inv?: boolean;
  };
  /**
   * HDMV Presentation Graphic Stream subtitles
   * @see https://ffmpeg.org/ffmpeg-codecs.html#pgssub
   */
  pgssub: {
    /** Only show forced subtitles */
    forced_subs_only?: boolean;
  };
  /**
   * Kodak Photo CD
   * @see https://ffmpeg.org/ffmpeg-codecs.html#photocd
   */
  photocd: {
    /** Lower the decoding resolution by a power of two */
    lowres?: number;
  };
  /**
   * PJS subtitle
   * @see https://ffmpeg.org/ffmpeg-codecs.html#pjs
   */
  pjs: {
    /** Set if ASS tags must be escaped */
    keep_ass_markup?: boolean;
  };
  /**
   * RemotelyAnywhere Screen Capture
   * @see https://ffmpeg.org/ffmpeg-codecs.html#rasc
   */
  rasc: {
    /** skip the cursor */
    skip_cursor?: boolean;
  };
  /**
   * raw video
   * @see https://ffmpeg.org/ffmpeg-codecs.html#rawvideo
   */
  rawvideo: {
    /** top field first */
    top?: boolean;
  };
  /**
   * SMPTE 302M
   * @see https://ffmpeg.org/ffmpeg-codecs.html#s302m
   */
  s302m: {
    /** Chooses what to do with NON-PCM */
    non_pcm_mode?: 'copy' | 'drop' | 'decode_copy' | 'decode_drop';
  };
  /**
   * Spruce subtitle format
   * @see https://ffmpeg.org/ffmpeg-codecs.html#stl
   */
  stl: {
    /** Set if ASS tags must be escaped */
    keep_ass_markup?: boolean;
  };
  /**
   * SubViewer1 subtitle
   * @see https://ffmpeg.org/ffmpeg-codecs.html#subviewer1
   */
  subviewer1: {
    /** Set if ASS tags must be escaped */
    keep_ass_markup?: boolean;
  };
  /**
   * Raw text subtitle
   * @see https://ffmpeg.org/ffmpeg-codecs.html#text
   */
  text: {
    /** Set if ASS tags must be escaped */
    keep_ass_markup?: boolean;
  };
  /**
   * TIFF image
   * @see https://ffmpeg.org/ffmpeg-codecs.html#tiff
   */
  tiff: {
    /** decode subimage instead if available */
    subimage?: boolean;
    /** decode embedded thumbnail subimage instead if available */
    thumbnail?: boolean;
    /** page number of multi-page image to decode (starting from 1) */
    page?: number;
  };
  /**
   * TrueHD
   * @see https://ffmpeg.org/ffmpeg-codecs.html#truehd
   */
  truehd: {
    /** Request a specific channel layout from the decoder */
    downmix?: string;
  };
  /**
   * TTA (True Audio)
   * @see https://ffmpeg.org/ffmpeg-codecs.html#tta
   */
  tta: {
    /** Set decoding password */
    password?: string;
  };
  /**
   * Uncompressed 4:2:2 10-bit
   * @see https://ffmpeg.org/ffmpeg-codecs.html#v210
   */
  v210: {
    /** Custom V210 stride */
    custom_stride?: number;
  };
  /**
   * VPlayer subtitle
   * @see https://ffmpeg.org/ffmpeg-codecs.html#vplayer
   */
  vplayer: {
    /** Set if ASS tags must be escaped */
    keep_ass_markup?: boolean;
  };
}
