/**
 * Auto-generated bitstream-filter option types.
 * Generated from FFmpeg libavcodec AVOption sources (see scripts/generate-bsf-options.js).
 * DO NOT EDIT MANUALLY.
 */

export interface BsfOptionsMap {
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#apv_005fmetadata
   */
  apv_metadata: {
    /** Set color primaries (section 5.3.5) */
    color_primaries?: number;
    /** Set transfer characteristics (section 5.3.5) */
    transfer_characteristics?: number;
    /** Set matrix coefficients (section 5.3.5) */
    matrix_coefficients?: number;
    /** Set full range flag flag (section 5.3.5) */
    full_range_flag?: 'tv' | 'pc';
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#av1_005fmetadata
   */
  av1_metadata: {
    /** Temporal Delimiter OBU */
    td?: 'pass' | 'insert' | 'remove';
    /** Set color primaries (section 6.4.2) */
    color_primaries?: number;
    /** Set transfer characteristics (section 6.4.2) */
    transfer_characteristics?: number;
    /** Set matrix coefficients (section 6.4.2) */
    matrix_coefficients?: number;
    /** Set color range flag (section 6.4.2) */
    color_range?: 'tv' | 'pc';
    /** Set chroma sample position (section 6.4.2) */
    chroma_sample_position?: 'unknown' | 'vertical' | 'colocated';
    /** Set display tick rate (time_scale / num_units_in_display_tick) */
    tick_rate?: string | number;
    /** Set display ticks per picture for CFR streams */
    num_ticks_per_picture?: number;
    /** Delete all Padding OBUs */
    delete_padding?: boolean;
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#dovi_005frpu
   */
  dovi_rpu: {
    /** Strip Dolby Vision metadata */
    strip?: boolean;
    /** DV metadata compression mode */
    compression?: 'none' | 'limited' | 'extended';
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#dump_005fextra
   */
  dump_extra: {
    /** When to dump extradata */
    freq?: 'k' | 'keyframe' | 'e' | 'all';
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#dv_005ferror_005fmarker
   */
  dv_error_marker: {
    /** set color */
    color?: string;
    /** specify which error status value to match */
    sta?: 'ok' | 'Aa' | 'Ba' | 'Ca' | 'erri' | 'erru' | 'err' | 'Ab' | 'Bb' | 'Cb' | 'A' | 'B' | 'C' | 'a' | 'b' | 'res' | 'notok' | 'notres' | (string & {});
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#eia608_005fto_005fsmpte436m
   */
  eia608_to_smpte436m: {
    /** line number -- you probably want 9 or 11 */
    line_number?: number;
    /** wrapping type */
    wrapping_type?: 'vanc_frame' | 'vanc_field_1' | 'vanc_field_2' | 'vanc_progressive_frame';
    /** payload sample coding */
    sample_coding?:
      | '8bit_luma'
      | '8bit_color_diff'
      | '8bit_luma_and_color_diff'
      | '10bit_luma'
      | '10bit_color_diff'
      | '10bit_luma_and_color_diff'
      | '8bit_luma_parity_error'
      | '8bit_color_diff_parity_error'
      | '8bit_luma_and_color_diff_parity_error';
    /** initial cdp_*_sequence_cntr value */
    initial_cdp_sequence_cntr?: number;
    /** set the `cdp_frame_rate` fields */
    cdp_frame_rate?: string | number;
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#extract_005fextradata
   */
  extract_extradata: {
    /** remove the extradata from the bitstream */
    remove?: number;
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#filter_005funits
   */
  filter_units: {
    /** List of unit types to pass through the filter. */
    pass_types?: string;
    /** List of unit types to remove in the filter. */
    remove_types?: string;
    /** Remove the selected frames */
    discard?: 'none' | 'default' | 'nonref' | 'bidir' | 'nonintra' | 'nonkey' | 'all';
    /** flags to control the discard frame behavior */
    discard_flags?: 'keep_non_vcl' | (string & {});
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#h264_005fmetadata
   */
  h264_metadata: {
    /** Access Unit Delimiter NAL units */
    aud?: 'pass' | 'insert' | 'remove';
    /** Set sample aspect ratio (table E-1) */
    sample_aspect_ratio?: string | number;
    /** Set VUI overscan appropriate flag */
    overscan_appropriate_flag?: number;
    /** Set video format (table E-2) */
    video_format?: number;
    /** Set video full range flag */
    video_full_range_flag?: number;
    /** Set colour primaries (table E-3) */
    colour_primaries?: number;
    /** Set transfer characteristics (table E-4) */
    transfer_characteristics?: number;
    /** Set matrix coefficients (table E-5) */
    matrix_coefficients?: number;
    /** Set chroma sample location type (figure E-1) */
    chroma_sample_loc_type?: number;
    /** Set VUI tick rate (time_scale / num_units_in_tick) */
    tick_rate?: string | number;
    /** Set VUI fixed frame rate flag */
    fixed_frame_rate_flag?: number;
    /** Set constraint_set4_flag / constraint_set5_flag to zero */
    zero_new_constraint_set_flags?: boolean;
    /** Set left border crop offset */
    crop_left?: number;
    /** Set right border crop offset */
    crop_right?: number;
    /** Set top border crop offset */
    crop_top?: number;
    /** Set bottom border crop offset */
    crop_bottom?: number;
    /** Insert SEI user data (UUID+string) */
    sei_user_data?: string;
    /** Delete all filler (both NAL and SEI) */
    delete_filler?: number;
    /** Display orientation SEI */
    display_orientation?: 'pass' | 'insert' | 'remove' | 'extract';
    /** Set rotation in display orientation SEI (anticlockwise angle in degrees) */
    rotate?: number;
    /** Set flip in display orientation SEI */
    flip?: 'horizontal' | 'vertical' | (string & {});
    /** Set level (table A-1) */
    level?: 'auto' | '1' | '1b' | '1.1' | '1.2' | '1.3' | '2' | '2.1' | '2.2' | '3' | '3.1' | '3.2' | '4' | '4.1' | '4.2' | '5' | '5.1' | '5.2' | '6' | '6.1' | '6.2';
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#hapqa_005fextract
   */
  hapqa_extract: {
    /** texture to keep */
    texture?: 'color' | 'alpha';
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#hevc_005fmetadata
   */
  hevc_metadata: {
    /** Access Unit Delimiter NAL units */
    aud?: 'pass' | 'insert' | 'remove';
    /** Set sample aspect ratio (table E-1) */
    sample_aspect_ratio?: string | number;
    /** Set video format (table E-2) */
    video_format?: number;
    /** Set video full range flag */
    video_full_range_flag?: number;
    /** Set colour primaries (table E-3) */
    colour_primaries?: number;
    /** Set transfer characteristics (table E-4) */
    transfer_characteristics?: number;
    /** Set matrix coefficients (table E-5) */
    matrix_coefficients?: number;
    /** Set chroma sample location type (figure E-1) */
    chroma_sample_loc_type?: number;
    /** Set VPS and VUI tick rate (time_scale / num_units_in_tick) */
    tick_rate?: string | number;
    /** Set VPS and VUI number of ticks per POC increment */
    num_ticks_poc_diff_one?: number;
    /** Set left border crop offset */
    crop_left?: number;
    /** Set right border crop offset */
    crop_right?: number;
    /** Set top border crop offset */
    crop_top?: number;
    /** Set bottom border crop offset */
    crop_bottom?: number;
    /** Set width after crop */
    width?: number;
    /** Set height after crop */
    height?: number;
    /** Set level (tables A.6 and A.7) */
    level?: 'auto' | '1' | '2' | '2.1' | '3' | '3.1' | '4' | '4.1' | '5' | '5.1' | '5.2' | '6' | '6.1' | '6.2' | '8.5';
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#lcevc_005fmetadata
   */
  lcevc_metadata: {
    /** Set VUI overscan appropriate flag */
    overscan_appropriate_flag?: boolean;
    /** Set video format (table E-2) */
    video_format?: number;
    /** Set video full range flag */
    video_full_range_flag?: boolean;
    /** Set colour primaries (table E-3) */
    colour_primaries?: number;
    /** Set transfer characteristics (table E-4) */
    transfer_characteristics?: number;
    /** Set matrix coefficients (table E-5) */
    matrix_coefficients?: number;
    /** Set chroma sample location type (figure E-1) */
    chroma_sample_loc_type?: number;
    /** Delete all filler */
    delete_filler?: boolean;
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#mpeg2_005fmetadata
   */
  mpeg2_metadata: {
    /** Set display aspect ratio (table 6-3) */
    display_aspect_ratio?: string | number;
    /** Set frame rate */
    frame_rate?: string | number;
    /** Set video format (table 6-6) */
    video_format?: number;
    /** Set colour primaries (table 6-7) */
    colour_primaries?: number;
    /** Set transfer characteristics (table 6-8) */
    transfer_characteristics?: number;
    /** Set matrix coefficients (table 6-9) */
    matrix_coefficients?: number;
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#noise
   */
  noise: {
    amount?: string;
    drop?: string;
    dropamount?: number;
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#opus_005fmetadata
   */
  opus_metadata: {
    /** Gain, actual amplification is pow(10, gain/(20.0*256)) */
    gain?: number;
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#pcm_005frechunk
   */
  pcm_rechunk: {
    /** set the number of per-packet output samples */
    nb_out_samples?: number;
    /** set the number of per-packet output samples */
    n?: number;
    /** pad last packet with zeros */
    pad?: boolean;
    /** pad last packet with zeros */
    p?: boolean;
    /** set number of packets per second */
    frame_rate?: string | number;
    /** set number of packets per second */
    r?: string | number;
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#prores_005fmetadata
   */
  prores_metadata: {
    /** select color primaries */
    color_primaries?: 'auto' | 'unknown' | 'bt709' | 'bt470bg' | 'smpte170m' | 'bt2020' | 'smpte431' | 'smpte432';
    /** select color transfer */
    color_trc?: 'auto' | 'unknown' | 'bt709' | 'smpte2084' | 'arib-std-b67';
    /** select colorspace */
    colorspace?: 'auto' | 'unknown' | 'bt709' | 'smpte170m' | 'bt2020nc';
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#remove_005fextra
   */
  remove_extra: {
    freq?: 'k' | 'keyframe' | 'e' | 'all';
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#setts
   */
  setts: {
    /** set expression for packet PTS and DTS */
    ts?: string;
    /** set expression for packet PTS */
    pts?: string;
    /** set expression for packet DTS */
    dts?: string;
    /** set expression for packet duration */
    duration?: string;
    /** set output timebase */
    time_base?: string | number;
    /** convert to output timebase before evaluation */
    prescale?: boolean;
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#vp9_005fmetadata
   */
  vp9_metadata: {
    /** Set colour space (section 7.2.2) */
    color_space?: 'unknown' | 'bt601' | 'bt709' | 'smpte170' | 'smpte240' | 'bt2020' | 'rgb';
    /** Set colour range (section 7.2.2) */
    color_range?: 'tv' | 'pc';
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-bitstream-filters.html#vvc_005fmetadata
   */
  vvc_metadata: {
    /** Access Unit Delimiter NAL units */
    aud?: 'pass' | 'insert' | 'remove';
  };
}

/** Loose option bag for bitstream filters without generated typings. */
export type UnknownBsfOptions = Record<string, string | number | boolean | bigint | undefined | null>;

/**
 * Resolve the options for a bitstream filter. Returns the strongly-typed option
 * set when the filter name is known (autocomplete + validation), otherwise a
 * loose bag.
 */
export type BsfOptionsFor<N> = N extends keyof BsfOptionsMap ? BsfOptionsMap[N] : UnknownBsfOptions;
