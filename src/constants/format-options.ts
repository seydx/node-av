/**
 * Auto-generated container (de)muxer option types.
 * Generated from FFmpeg libavformat AVOption sources (see scripts/generate-format-options.js).
 * DO NOT EDIT MANUALLY.
 */

export interface FormatContextOptions {
  avioflags?: 'direct' | (string & {}) | number;
  /** set probing size */
  probesize?: number | (string & {});
  /** number of bytes to probe file format */
  formatprobesize?: number | (string & {});
  /** set packet size */
  packetsize?: number | (string & {});
  fflags?:
    | 'flush_packets'
    | 'ignidx'
    | 'genpts'
    | 'nofillin'
    | 'noparse'
    | 'igndts'
    | 'discardcorrupt'
    | 'sortdts'
    | 'fastseek'
    | 'nobuffer'
    | 'bitexact'
    | 'autobsf'
    | (string & {})
    | number;
  /** allow seeking to non-keyframes on demuxer level when supported */
  seek2any?: boolean | (string & {});
  /** specify how many microseconds are analyzed to probe the input */
  analyzeduration?: number | (string & {});
  /** decryption key */
  cryptokey?: string | number;
  /** max memory used for timestamp index (per stream) */
  indexmem?: number | (string & {});
  /** max memory used for buffering real-time frames */
  rtbufsize?: number | (string & {});
  /** print specific debug info */
  fdebug?: 'ts' | 'id3v2' | (string & {}) | number;
  /** maximum muxing or demuxing delay in microseconds */
  max_delay?: number | (string & {});
  /** wall-clock time when stream begins (PTS==0) */
  start_time_realtime?: number | (string & {});
  /** number of frames used to probe fps */
  fpsprobesize?: number | (string & {});
  /** microseconds by which audio packets should be interleaved earlier */
  audio_preload?: number | (string & {});
  /** microseconds for each chunk */
  chunk_duration?: number | (string & {});
  /** size in bytes for each chunk */
  chunk_size?: number | (string & {});
  /** set error detection flags (deprecated; use err_detect, save via avconv) */
  f_err_detect?: 'crccheck' | 'bitstream' | 'buffer' | 'explode' | 'ignore_err' | 'careful' | 'compliant' | 'aggressive' | (string & {}) | number;
  /** set error detection flags */
  err_detect?: 'crccheck' | 'bitstream' | 'buffer' | 'explode' | 'ignore_err' | 'careful' | 'compliant' | 'aggressive' | (string & {}) | number;
  /** use wallclock as timestamps */
  use_wallclock_as_timestamps?: boolean | (string & {});
  /** set number of bytes to skip before reading header and frames */
  skip_initial_bytes?: number | (string & {});
  /** correct single timestamp overflows */
  correct_ts_overflow?: boolean | (string & {});
  /** enable flushing of the I/O context after each packet */
  flush_packets?: number | (string & {});
  /** set number of bytes to be written as padding in a metadata header */
  metadata_header_padding?: number | (string & {});
  /** set output timestamp offset */
  output_ts_offset?: string | number;
  /** maximum buffering duration for interleaving */
  max_interleave_delta?: number | (string & {});
  /** how strictly to follow the standards (deprecated; use strict, save via avconv) */
  f_strict?: 'very' | 'strict' | 'normal' | 'unofficial' | 'experimental' | (string & {}) | number;
  /** how strictly to follow the standards */
  strict?: 'very' | 'strict' | 'normal' | 'unofficial' | 'experimental' | (string & {}) | number;
  /** maximum number of packets to read while waiting for the first timestamp */
  max_ts_probe?: number | (string & {});
  /** shift timestamps so they start at 0 */
  avoid_negative_ts?: 'auto' | 'disabled' | 'make_non_negative' | 'make_zero' | (string & {}) | number;
  /** set information dump field separator */
  dump_separator?: string | number;
  /** List of decoders that are allowed to be used */
  codec_whitelist?: string | number;
  /** List of demuxers that are allowed to be used */
  format_whitelist?: string | number;
  /** List of protocols that are allowed to be used */
  protocol_whitelist?: string | number;
  /** List of protocols that are not allowed to be used */
  protocol_blacklist?: string | number;
  /** maximum number of streams */
  max_streams?: number | (string & {});
  /** skip duration calculation in estimate_timings_from_pts */
  skip_estimate_duration_from_pts?: boolean | (string & {});
  /** Maximum number of packets to probe a codec */
  max_probe_packets?: number | (string & {});
  /** Maximum number of bytes to probe the durations of the streams in estimate_timings_from_pts */
  duration_probesize?: number | (string & {});
}

export interface MuxerPrivateOptionsMap {
  /**
   * 3GP2 (3GPP2 file format)
   * @see https://ffmpeg.org/ffmpeg-formats.html#3g2
   */
  '3g2': {
    /** Override major brand */
    brand?: string | number;
    /** write zero-length name string in hdlr atoms within mdia and minf atoms */
    empty_hdlr_name?: boolean | (string & {});
    /** The media encryption key (hex) */
    encryption_key?: string | number;
    /** The media encryption key identifier (hex) */
    encryption_kid?: string | number;
    /** Configures the encryption scheme, allowed values are none, cenc-aes-ctr */
    encryption_scheme?: string | number;
    /** Maximum fragment duration */
    frag_duration?: number | (string & {});
    /** Interleave samples within fragments (max number of consecutive samples, lower is tighter interleaving, but with more overhead) */
    frag_interleave?: number | (string & {});
    /** Maximum fragment size */
    frag_size?: number | (string & {});
    /** Fragment number of the next fragment */
    fragment_index?: number | (string & {});
    /** iods audio profile atom. */
    iods_audio_profile?: number | (string & {});
    /** iods video profile atom. */
    iods_video_profile?: number | (string & {});
    /** Number of lookahead entries for ISM files */
    ism_lookahead?: number | (string & {});
    /** MOV muxer flags */
    movflags?:
      | 'cmaf'
      | 'dash'
      | 'default_base_moof'
      | 'delay_moov'
      | 'disable_chpl'
      | 'empty_moov'
      | 'faststart'
      | 'frag_custom'
      | 'frag_discont'
      | 'frag_every_frame'
      | 'frag_keyframe'
      | 'global_sidx'
      | 'isml'
      | 'negative_cts_offsets'
      | 'omit_tfhd_offset'
      | 'prefer_icc'
      | 'rtphint'
      | 'separate_moof'
      | 'skip_sidx'
      | 'skip_trailer'
      | 'use_metadata_tags'
      | 'write_colr'
      | 'write_gama'
      | 'hybrid_fragmented'
      | (string & {})
      | number;
    /** maximum moov size so it can be placed at the begin */
    moov_size?: number | (string & {});
    /** Minimum fragment duration */
    min_frag_duration?: number | (string & {});
    /** gamma value for gama atom */
    mov_gamma?: number | (string & {});
    /** set movie timescale */
    movie_timescale?: number | (string & {});
    /** RTP muxer flags */
    rtpflags?: 'latm' | 'rfc2190' | 'skip_rtcp' | 'h264_mode0' | 'send_bye' | (string & {}) | number;
    /** Skip writing iods atom. */
    skip_iods?: boolean | (string & {});
    /** use edit list */
    use_editlist?: boolean | (string & {});
    /** use stream ids as track ids */
    use_stream_ids_as_track_ids?: boolean | (string & {});
    /** set timescale of all video tracks */
    video_track_timescale?: number | (string & {});
    /** force or disable writing btrt */
    write_btrt?: boolean | (string & {});
    /** Write producer reference time box with specified time source */
    write_prft?: 'pts' | 'wallclock' | (string & {}) | number;
    /** force or disable writing tmcd */
    write_tmcd?: boolean | (string & {});
  };
  /**
   * 3GP (3GPP file format)
   * @see https://ffmpeg.org/ffmpeg-formats.html#3gp
   */
  '3gp': {
    /** Override major brand */
    brand?: string | number;
    /** write zero-length name string in hdlr atoms within mdia and minf atoms */
    empty_hdlr_name?: boolean | (string & {});
    /** The media encryption key (hex) */
    encryption_key?: string | number;
    /** The media encryption key identifier (hex) */
    encryption_kid?: string | number;
    /** Configures the encryption scheme, allowed values are none, cenc-aes-ctr */
    encryption_scheme?: string | number;
    /** Maximum fragment duration */
    frag_duration?: number | (string & {});
    /** Interleave samples within fragments (max number of consecutive samples, lower is tighter interleaving, but with more overhead) */
    frag_interleave?: number | (string & {});
    /** Maximum fragment size */
    frag_size?: number | (string & {});
    /** Fragment number of the next fragment */
    fragment_index?: number | (string & {});
    /** iods audio profile atom. */
    iods_audio_profile?: number | (string & {});
    /** iods video profile atom. */
    iods_video_profile?: number | (string & {});
    /** Number of lookahead entries for ISM files */
    ism_lookahead?: number | (string & {});
    /** MOV muxer flags */
    movflags?:
      | 'cmaf'
      | 'dash'
      | 'default_base_moof'
      | 'delay_moov'
      | 'disable_chpl'
      | 'empty_moov'
      | 'faststart'
      | 'frag_custom'
      | 'frag_discont'
      | 'frag_every_frame'
      | 'frag_keyframe'
      | 'global_sidx'
      | 'isml'
      | 'negative_cts_offsets'
      | 'omit_tfhd_offset'
      | 'prefer_icc'
      | 'rtphint'
      | 'separate_moof'
      | 'skip_sidx'
      | 'skip_trailer'
      | 'use_metadata_tags'
      | 'write_colr'
      | 'write_gama'
      | 'hybrid_fragmented'
      | (string & {})
      | number;
    /** maximum moov size so it can be placed at the begin */
    moov_size?: number | (string & {});
    /** Minimum fragment duration */
    min_frag_duration?: number | (string & {});
    /** gamma value for gama atom */
    mov_gamma?: number | (string & {});
    /** set movie timescale */
    movie_timescale?: number | (string & {});
    /** RTP muxer flags */
    rtpflags?: 'latm' | 'rfc2190' | 'skip_rtcp' | 'h264_mode0' | 'send_bye' | (string & {}) | number;
    /** Skip writing iods atom. */
    skip_iods?: boolean | (string & {});
    /** use edit list */
    use_editlist?: boolean | (string & {});
    /** use stream ids as track ids */
    use_stream_ids_as_track_ids?: boolean | (string & {});
    /** set timescale of all video tracks */
    video_track_timescale?: number | (string & {});
    /** force or disable writing btrt */
    write_btrt?: boolean | (string & {});
    /** Write producer reference time box with specified time source */
    write_prft?: 'pts' | 'wallclock' | (string & {}) | number;
    /** force or disable writing tmcd */
    write_tmcd?: boolean | (string & {});
  };
  /**
   * raw AC-4
   * @see https://ffmpeg.org/ffmpeg-formats.html#ac4
   */
  ac4: {
    /** enable checksum */
    write_crc?: boolean | (string & {});
  };
  /**
   * ADTS AAC (Advanced Audio Coding)
   * @see https://ffmpeg.org/ffmpeg-formats.html#adts
   */
  adts: {
    /** Enable ID3v2 tag writing */
    write_id3v2?: boolean | (string & {});
    /** Enable APE tag writing */
    write_apetag?: boolean | (string & {});
    /** Set MPEG version to MPEG-2 */
    write_mpeg2?: boolean | (string & {});
  };
  /**
   * Audio IFF
   * @see https://ffmpeg.org/ffmpeg-formats.html#aiff
   */
  aiff: {
    /** Enable ID3 tags writing. */
    write_id3v2?: boolean | (string & {});
    /** Select ID3v2 version to write. Currently 3 and 4 are supported. */
    id3v2_version?: number | (string & {});
  };
  /**
   * LEGO Racers ALP
   * @see https://ffmpeg.org/ffmpeg-formats.html#alp
   */
  alp: {
    /** set file type */
    type?: 'auto' | 'tun' | 'pcm' | (string & {}) | number;
  };
  /**
   * Animated Portable Network Graphics
   * @see https://ffmpeg.org/ffmpeg-formats.html#apng
   */
  apng: {
    /** Number of times to play the output: 0 - infinite loop, 1 - no loop */
    plays?: number | (string & {});
    /** Force delay after the last frame */
    final_delay?: string | number;
  };
  /**
   * Argonaut Games ASF
   * @see https://ffmpeg.org/ffmpeg-formats.html#argo_005fasf
   */
  argo_asf: {
    /** override file major version */
    version_major?: number | (string & {});
    /** override file minor version */
    version_minor?: number | (string & {});
    /** embedded file name (max 8 characters) */
    name?: string | number;
  };
  /**
   * Argonaut Games CVG
   * @see https://ffmpeg.org/ffmpeg-formats.html#argo_005fcvg
   */
  argo_cvg: {
    /** skip sample rate check */
    skip_rate_check?: boolean | (string & {});
    /** set loop flag */
    loop?: boolean | (string & {});
    /** set reverb flag */
    reverb?: boolean | (string & {});
  };
  /**
   * ASF (Advanced / Active Streaming Format)
   * @see https://ffmpeg.org/ffmpeg-formats.html#asf
   */
  asf: {
    /** Packet size */
    packet_size?: number | (string & {});
  };
  /**
   * ASF (Advanced / Active Streaming Format)
   * @see https://ffmpeg.org/ffmpeg-formats.html#asf_005fstream
   */
  asf_stream: {
    /** Packet size */
    packet_size?: number | (string & {});
  };
  /**
   * SSA (SubStation Alpha) subtitle
   * @see https://ffmpeg.org/ffmpeg-formats.html#ass
   */
  ass: {
    /** write events immediately, even if they're out-of-order */
    ignore_readorder?: boolean | (string & {});
  };
  /**
   * AST (Audio Stream)
   * @see https://ffmpeg.org/ffmpeg-formats.html#ast
   */
  ast: {
    /** Loopstart position in milliseconds. */
    loopstart?: number | (string & {});
    /** Loopend position in milliseconds. */
    loopend?: number | (string & {});
  };
  /**
   * AudioToolbox output device
   * @see https://ffmpeg.org/ffmpeg-formats.html#audiotoolbox
   */
  audiotoolbox: {
    /** list available audio devices */
    list_devices?: boolean | (string & {});
    /** select audio device by index (starts at 0) */
    audio_device_index?: number | (string & {});
  };
  /**
   * AVI (Audio Video Interleaved)
   * @see https://ffmpeg.org/ffmpeg-formats.html#avi
   */
  avi: {
    /** reserve space (in bytes) at the beginning of the file for each stream index */
    reserve_index_space?: number | (string & {});
    /** write channel mask into wave format header */
    write_channel_mask?: boolean | (string & {});
    /** Raw RGB bitmaps are stored bottom-up */
    flipped_raw_rgb?: boolean | (string & {});
  };
  /**
   * AVIF
   * @see https://ffmpeg.org/ffmpeg-formats.html#avif
   */
  avif: {
    /** set movie timescale */
    movie_timescale?: number | (string & {});
    /** Number of times to loop animated AVIF: 0 - infinite loop */
    loop?: number | (string & {});
  };
  /**
   * caca (color ASCII art) output device
   * @see https://ffmpeg.org/ffmpeg-formats.html#caca
   */
  caca: {
    /** set window forced size */
    window_size?: string | number;
    /** set window title */
    window_title?: string | number;
    /** set display driver */
    driver?: string | number;
    /** set dithering algorithm */
    algorithm?: string | number;
    /** set antialias method */
    antialias?: string | number;
    /** set charset used to render output */
    charset?: string | number;
    /** set color used to render output */
    color?: string | number;
    /** list available drivers */
    list_drivers?: boolean | (string & {});
    /** list available dither options */
    list_dither?: 'algorithms' | 'antialiases' | 'charsets' | 'colors' | (string & {}) | number;
  };
  /**
   * Chromaprint
   * @see https://ffmpeg.org/ffmpeg-formats.html#chromaprint
   */
  chromaprint: {
    /** threshold for detecting silence */
    silence_threshold?: number | (string & {});
    /** version of the fingerprint algorithm */
    algorithm?: number | (string & {});
    /** fingerprint format to write */
    fp_format?: 'raw' | 'compressed' | 'base64' | (string & {}) | number;
  };
  /**
   * DASH Muxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#dash
   */
  dash: {
    /** Adaptation sets. Syntax: id=0,streams=0,1,2 id=1,streams=3,4 and so on */
    adaptation_sets?: string | number;
    /** set dash segment files type */
    dash_segment_type?: 'auto' | 'mp4' | 'webm' | (string & {}) | number;
    /** number of segments kept outside of the manifest before removing from disk */
    extra_window_size?: number | (string & {});
    /** set list of options for the container format (mp4/webm) used for dash */
    format_options?: string | number;
    /** fragment duration (in seconds, fractional value can be set) */
    frag_duration?: string | number;
    /** set type of interval for fragments */
    frag_type?: 'none' | 'every_frame' | 'duration' | 'pframes' | (string & {}) | number;
    /** Write global SIDX atom. Applicable only for single file, mp4 output, non-streaming mode */
    global_sidx?: boolean | (string & {});
    /** HLS master playlist name */
    hls_master_name?: string | number;
    /** Generate HLS playlist files(master.m3u8, media_%d.m3u8) */
    hls_playlist?: boolean | (string & {});
    /** HTTP protocol options */
    http_opts?: string | number;
    /** Use persistent HTTP connections */
    http_persistent?: boolean | (string & {});
    /** override User-Agent field in HTTP header */
    http_user_agent?: string | number;
    /** Ignore IO errors during open and write. Useful for long-duration runs with network output */
    ignore_io_errors?: boolean | (string & {});
    /** Enable/Disable segment index correction logic */
    index_correction?: boolean | (string & {});
    /** DASH-templated name to used for the initialization segment */
    init_seg_name?: string | number;
    /** Enable Low-latency dash. Constrains the value of a few elements */
    ldash?: boolean | (string & {});
    /** Enable Low-latency HLS(Experimental). Adds #EXT-X-PREFETCH tag with current segment's URI */
    lhls?: boolean | (string & {});
    /** Publish master playlist every after this many segment intervals */
    master_m3u8_publish_rate?: number | (string & {});
    /** Set desired maximum playback rate */
    max_playback_rate?: string | number;
    /** DASH-templated name to used for the media segments */
    media_seg_name?: string | number;
    /** set the HTTP method */
    method?: string | number;
    /** Set desired minimum playback rate */
    min_playback_rate?: string | number;
    /** Set profiles. Elements and values used in the manifest may be constrained by them */
    mpd_profile?: 'dash' | 'dvb_dash' | (string & {}) | number;
    /** remove all segments when finished */
    remove_at_exit?: boolean | (string & {});
    /** segment duration (in seconds, fractional value can be set) */
    seg_duration?: string | number;
    /** Store all segments in one file, accessed using byte ranges */
    single_file?: boolean | (string & {});
    /** DASH-templated name to be used for baseURL. Implies storing all segments in one file, accessed using byte ranges */
    single_file_name?: string | number;
    /** Enable/Disable streaming mode of output. Each frame will be moof fragment */
    streaming?: boolean | (string & {});
    /** Set desired target latency for Low-latency dash */
    target_latency?: string | number;
    /** set timeout for socket I/O operations */
    timeout?: string | number;
    /** Set the mpd update interval */
    update_period?: number | (string & {});
    /** Use SegmentTemplate instead of SegmentList */
    use_template?: boolean | (string & {});
    /** Use SegmentTimeline in SegmentTemplate */
    use_timeline?: boolean | (string & {});
    /** URL of the page that will return the UTC timestamp in ISO format */
    utc_timing_url?: string | number;
    /** number of segments kept in the manifest */
    window_size?: number | (string & {});
    /** Write producer reference time element */
    write_prft?: boolean | (string & {});
  };
  /**
   * Blackmagic DeckLink output
   * @see https://ffmpeg.org/ffmpeg-formats.html#decklink
   */
  decklink: {
    /** use ffmpeg -sinks decklink instead */
    list_devices?: boolean | (string & {});
    /** list supported formats */
    list_formats?: number | (string & {});
    /** video preroll in seconds */
    preroll?: number | (string & {});
    /** VANC queue buffer size */
    vanc_queue_size?: number | (string & {});
    /** duplex mode */
    duplex_mode?: 'unset' | 'half' | 'full' | 'one_sub_device_full' | 'one_sub_device_half' | 'two_sub_device_full' | 'four_sub_device_half' | (string & {}) | number;
    /** single/dual/quad SDI link configuration */
    link?: 'unset' | 'single' | 'dual' | 'quad' | (string & {}) | number;
    /** set Square Division */
    sqd?: 'unset' | 'false' | 'true' | (string & {}) | number;
    /** set SMPTE LevelA */
    level_a?: 'unset' | 'false' | 'true' | (string & {}) | number;
    /** genlock timing pixel offset */
    timing_offset?: 'unset' | (string & {}) | number;
  };
  /**
   * MPEG-2 PS (DVD VOB)
   * @see https://ffmpeg.org/ffmpeg-formats.html#dvd
   */
  dvd: {
    /** mux rate as bits/s */
    muxrate?: number | (string & {});
    /** initial demux-decode delay in microseconds */
    preload?: number | (string & {});
  };
  /**
   * F4V Adobe Flash Video
   * @see https://ffmpeg.org/ffmpeg-formats.html#f4v
   */
  f4v: {
    /** Override major brand */
    brand?: string | number;
    /** write zero-length name string in hdlr atoms within mdia and minf atoms */
    empty_hdlr_name?: boolean | (string & {});
    /** The media encryption key (hex) */
    encryption_key?: string | number;
    /** The media encryption key identifier (hex) */
    encryption_kid?: string | number;
    /** Configures the encryption scheme, allowed values are none, cenc-aes-ctr */
    encryption_scheme?: string | number;
    /** Maximum fragment duration */
    frag_duration?: number | (string & {});
    /** Interleave samples within fragments (max number of consecutive samples, lower is tighter interleaving, but with more overhead) */
    frag_interleave?: number | (string & {});
    /** Maximum fragment size */
    frag_size?: number | (string & {});
    /** Fragment number of the next fragment */
    fragment_index?: number | (string & {});
    /** iods audio profile atom. */
    iods_audio_profile?: number | (string & {});
    /** iods video profile atom. */
    iods_video_profile?: number | (string & {});
    /** Number of lookahead entries for ISM files */
    ism_lookahead?: number | (string & {});
    /** MOV muxer flags */
    movflags?:
      | 'cmaf'
      | 'dash'
      | 'default_base_moof'
      | 'delay_moov'
      | 'disable_chpl'
      | 'empty_moov'
      | 'faststart'
      | 'frag_custom'
      | 'frag_discont'
      | 'frag_every_frame'
      | 'frag_keyframe'
      | 'global_sidx'
      | 'isml'
      | 'negative_cts_offsets'
      | 'omit_tfhd_offset'
      | 'prefer_icc'
      | 'rtphint'
      | 'separate_moof'
      | 'skip_sidx'
      | 'skip_trailer'
      | 'use_metadata_tags'
      | 'write_colr'
      | 'write_gama'
      | 'hybrid_fragmented'
      | (string & {})
      | number;
    /** maximum moov size so it can be placed at the begin */
    moov_size?: number | (string & {});
    /** Minimum fragment duration */
    min_frag_duration?: number | (string & {});
    /** gamma value for gama atom */
    mov_gamma?: number | (string & {});
    /** set movie timescale */
    movie_timescale?: number | (string & {});
    /** RTP muxer flags */
    rtpflags?: 'latm' | 'rfc2190' | 'skip_rtcp' | 'h264_mode0' | 'send_bye' | (string & {}) | number;
    /** Skip writing iods atom. */
    skip_iods?: boolean | (string & {});
    /** use edit list */
    use_editlist?: boolean | (string & {});
    /** use stream ids as track ids */
    use_stream_ids_as_track_ids?: boolean | (string & {});
    /** set timescale of all video tracks */
    video_track_timescale?: number | (string & {});
    /** force or disable writing btrt */
    write_btrt?: boolean | (string & {});
    /** Write producer reference time box with specified time source */
    write_prft?: 'pts' | 'wallclock' | (string & {}) | number;
    /** force or disable writing tmcd */
    write_tmcd?: boolean | (string & {});
  };
  /**
   * Linux framebuffer
   * @see https://ffmpeg.org/ffmpeg-formats.html#fbdev
   */
  fbdev: {
    /** set x coordinate of top left corner */
    xoffset?: number | (string & {});
    /** set y coordinate of top left corner */
    yoffset?: number | (string & {});
  };
  /**
   * FIFO queue pseudo-muxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#fifo
   */
  fifo: {
    /** Attempt recovery in case of failure */
    attempt_recovery?: boolean | (string & {});
    /** Drop packets on fifo queue overflow not to block encoder */
    drop_pkts_on_overflow?: boolean | (string & {});
    /** Target muxer */
    fifo_format?: string | number;
    /** Options to be passed to underlying muxer */
    format_opts?: string | number;
    /** Maximal number of recovery attempts */
    max_recovery_attempts?: number | (string & {});
    /** Size of fifo queue */
    queue_size?: number | (string & {});
    /** Use stream time instead of real time while waiting for recovery */
    recovery_wait_streamtime?: boolean | (string & {});
    /** Waiting time between recovery attempts */
    recovery_wait_time?: string | number;
    /** Attempt recovery regardless of type of the error */
    recover_any_error?: boolean | (string & {});
    /** Wait for keyframe when restarting output */
    restart_with_keyframe?: boolean | (string & {});
    /** Delay fifo output */
    timeshift?: string | number;
  };
  /**
   * Fifo test muxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#fifo_005ftest
   */
  fifo_test: {
    /** write_header() return value */
    write_header_ret?: number | (string & {});
    /** write_trailer() return value */
    write_trailer_ret?: number | (string & {});
    /** print summary when deinitializing muxer */
    print_deinit_summary?: boolean | (string & {});
  };
  /**
   * raw FLAC
   * @see https://ffmpeg.org/ffmpeg-formats.html#flac
   */
  flac: {
    /** Write the file header */
    write_header?: boolean | (string & {});
  };
  /**
   * FLV (Flash Video)
   * @see https://ffmpeg.org/ffmpeg-formats.html#flv
   */
  flv: {
    /** FLV muxer flags */
    flvflags?: 'aac_seq_header_detect' | 'no_sequence_end' | 'no_metadata' | 'no_duration_filesize' | 'add_keyframe_index' | (string & {}) | number;
  };
  /**
   * Per-frame hash testing
   * @see https://ffmpeg.org/ffmpeg-formats.html#framehash
   */
  framehash: {
    /** set hash to use */
    hash?: string | number;
    /** file format version */
    format_version?: number | (string & {});
  };
  /**
   * Per-frame MD5 testing
   * @see https://ffmpeg.org/ffmpeg-formats.html#framemd5
   */
  framemd5: {
    /** set hash to use */
    hash?: string | number;
    /** file format version */
    format_version?: number | (string & {});
  };
  /**
   * CompuServe Graphics Interchange Format (GIF)
   * @see https://ffmpeg.org/ffmpeg-formats.html#gif
   */
  gif: {
    /** Number of times to loop the output: -1 - no loop, 0 - infinite loop */
    loop?: number | (string & {});
    /** Force delay (in centiseconds) after the last frame */
    final_delay?: number | (string & {});
  };
  /**
   * Hash testing
   * @see https://ffmpeg.org/ffmpeg-formats.html#hash
   */
  hash: {
    /** set hash to use */
    hash?: string | number;
  };
  /**
   * HDS Muxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#hds
   */
  hds: {
    /** number of fragments kept in the manifest */
    window_size?: number | (string & {});
    /** number of fragments kept outside of the manifest before removing from disk */
    extra_window_size?: number | (string & {});
    /** minimum fragment duration (in microseconds) */
    min_frag_duration?: number | (string & {});
    /** remove all fragments when finished */
    remove_at_exit?: boolean | (string & {});
  };
  /**
   * Apple HTTP Live Streaming
   * @see https://ffmpeg.org/ffmpeg-formats.html#hls
   */
  hls: {
    /** set first number in the sequence */
    start_number?: number | (string & {});
    /** set segment length */
    hls_time?: string | number;
    /** set segment length at init list */
    hls_init_time?: string | number;
    /** set maximum number of playlist entries */
    hls_list_size?: number | (string & {});
    /** set number of unreferenced segments to keep before deleting */
    hls_delete_threshold?: number | (string & {});
    /** set hls vtt list of options for the container format used for hls */
    hls_vtt_options?: string | number;
    /** explicitly set whether the client MAY (1) or MUST NOT (0) cache media segments */
    hls_allow_cache?: number | (string & {});
    /** url to prepend to each playlist entry */
    hls_base_url?: string | number;
    /** filename template for segment files */
    hls_segment_filename?: string | number;
    /** set segments files format options of hls */
    hls_segment_options?: string | number;
    /** maximum size per segment file, (in bytes) */
    hls_segment_size?: number | (string & {});
    /** file with key URI and key file path */
    hls_key_info_file?: string | number;
    /** enable AES128 encryption support */
    hls_enc?: boolean | (string & {});
    /** hex-coded 16 byte key to encrypt the segments */
    hls_enc_key?: string | number;
    /** url to access the key to decrypt the segments */
    hls_enc_key_url?: string | number;
    /** hex-coded 16 byte initialization vector */
    hls_enc_iv?: string | number;
    /** set path of hls subtitles */
    hls_subtitle_path?: string | number;
    /** set hls segment files type */
    hls_segment_type?: 'mpegts' | 'fmp4' | (string & {}) | number;
    /** set fragment mp4 file init filename */
    hls_fmp4_init_filename?: string | number;
    /** resend fragment mp4 init file after refresh m3u8 every time */
    hls_fmp4_init_resend?: boolean | (string & {});
    /** set flags affecting HLS playlist and media file generation */
    hls_flags?:
      | 'single_file'
      | 'temp_file'
      | 'delete_segments'
      | 'round_durations'
      | 'discont_start'
      | 'omit_endlist'
      | 'split_by_time'
      | 'append_list'
      | 'program_date_time'
      | 'second_level_segment_index'
      | 'second_level_segment_duration'
      | 'second_level_segment_size'
      | 'periodic_rekey'
      | 'independent_segments'
      | 'iframes_only'
      | (string & {})
      | number;
    /** set filename expansion with strftime at segment creation */
    strftime?: boolean | (string & {});
    /** create last directory component in strftime-generated filename */
    strftime_mkdir?: boolean | (string & {});
    /** set the HLS playlist type */
    hls_playlist_type?: 'event' | 'vod' | (string & {}) | number;
    /** set the HTTP method(default: PUT) */
    method?: string | number;
    /** set source of first number in sequence */
    hls_start_number_source?: 'generic' | 'epoch' | 'epoch_us' | 'datetime' | (string & {}) | number;
    /** override User-Agent field in HTTP header */
    http_user_agent?: string | number;
    /** Variant stream map string */
    var_stream_map?: string | number;
    /** Closed captions stream map string */
    cc_stream_map?: string | number;
    /** Create HLS master playlist with this name */
    master_pl_name?: string | number;
    /** Publish master play list every after this many segment intervals */
    master_pl_publish_rate?: number | (string & {});
    /** Use persistent HTTP connections */
    http_persistent?: boolean | (string & {});
    /** set timeout for socket I/O operations */
    timeout?: string | number;
    /** Ignore IO errors for stable long-duration runs with network output */
    ignore_io_errors?: boolean | (string & {});
    /** set custom HTTP headers, can override built in default headers */
    headers?: string | number;
  };
  /**
   * image2 sequence
   * @see https://ffmpeg.org/ffmpeg-formats.html#image2
   */
  image2: {
    /** continuously overwrite one file */
    update?: boolean | (string & {});
    /** set first number in the sequence */
    start_number?: number | (string & {});
    /** use strftime for filename */
    strftime?: boolean | (string & {});
    /** use current frame pts for filename */
    frame_pts?: boolean | (string & {});
    /** write files atomically (using temporary files and renames) */
    atomic_writing?: boolean | (string & {});
    /** specify protocol options for the opened files */
    protocol_opts?: string | number;
  };
  /**
   * iPod H.264 MP4 (MPEG-4 Part 14)
   * @see https://ffmpeg.org/ffmpeg-formats.html#ipod
   */
  ipod: {
    /** Override major brand */
    brand?: string | number;
    /** write zero-length name string in hdlr atoms within mdia and minf atoms */
    empty_hdlr_name?: boolean | (string & {});
    /** The media encryption key (hex) */
    encryption_key?: string | number;
    /** The media encryption key identifier (hex) */
    encryption_kid?: string | number;
    /** Configures the encryption scheme, allowed values are none, cenc-aes-ctr */
    encryption_scheme?: string | number;
    /** Maximum fragment duration */
    frag_duration?: number | (string & {});
    /** Interleave samples within fragments (max number of consecutive samples, lower is tighter interleaving, but with more overhead) */
    frag_interleave?: number | (string & {});
    /** Maximum fragment size */
    frag_size?: number | (string & {});
    /** Fragment number of the next fragment */
    fragment_index?: number | (string & {});
    /** iods audio profile atom. */
    iods_audio_profile?: number | (string & {});
    /** iods video profile atom. */
    iods_video_profile?: number | (string & {});
    /** Number of lookahead entries for ISM files */
    ism_lookahead?: number | (string & {});
    /** MOV muxer flags */
    movflags?:
      | 'cmaf'
      | 'dash'
      | 'default_base_moof'
      | 'delay_moov'
      | 'disable_chpl'
      | 'empty_moov'
      | 'faststart'
      | 'frag_custom'
      | 'frag_discont'
      | 'frag_every_frame'
      | 'frag_keyframe'
      | 'global_sidx'
      | 'isml'
      | 'negative_cts_offsets'
      | 'omit_tfhd_offset'
      | 'prefer_icc'
      | 'rtphint'
      | 'separate_moof'
      | 'skip_sidx'
      | 'skip_trailer'
      | 'use_metadata_tags'
      | 'write_colr'
      | 'write_gama'
      | 'hybrid_fragmented'
      | (string & {})
      | number;
    /** maximum moov size so it can be placed at the begin */
    moov_size?: number | (string & {});
    /** Minimum fragment duration */
    min_frag_duration?: number | (string & {});
    /** gamma value for gama atom */
    mov_gamma?: number | (string & {});
    /** set movie timescale */
    movie_timescale?: number | (string & {});
    /** RTP muxer flags */
    rtpflags?: 'latm' | 'rfc2190' | 'skip_rtcp' | 'h264_mode0' | 'send_bye' | (string & {}) | number;
    /** Skip writing iods atom. */
    skip_iods?: boolean | (string & {});
    /** use edit list */
    use_editlist?: boolean | (string & {});
    /** use stream ids as track ids */
    use_stream_ids_as_track_ids?: boolean | (string & {});
    /** set timescale of all video tracks */
    video_track_timescale?: number | (string & {});
    /** force or disable writing btrt */
    write_btrt?: boolean | (string & {});
    /** Write producer reference time box with specified time source */
    write_prft?: 'pts' | 'wallclock' | (string & {}) | number;
    /** force or disable writing tmcd */
    write_tmcd?: boolean | (string & {});
  };
  /**
   * ISMV/ISMA (Smooth Streaming)
   * @see https://ffmpeg.org/ffmpeg-formats.html#ismv
   */
  ismv: {
    /** Override major brand */
    brand?: string | number;
    /** write zero-length name string in hdlr atoms within mdia and minf atoms */
    empty_hdlr_name?: boolean | (string & {});
    /** The media encryption key (hex) */
    encryption_key?: string | number;
    /** The media encryption key identifier (hex) */
    encryption_kid?: string | number;
    /** Configures the encryption scheme, allowed values are none, cenc-aes-ctr */
    encryption_scheme?: string | number;
    /** Maximum fragment duration */
    frag_duration?: number | (string & {});
    /** Interleave samples within fragments (max number of consecutive samples, lower is tighter interleaving, but with more overhead) */
    frag_interleave?: number | (string & {});
    /** Maximum fragment size */
    frag_size?: number | (string & {});
    /** Fragment number of the next fragment */
    fragment_index?: number | (string & {});
    /** iods audio profile atom. */
    iods_audio_profile?: number | (string & {});
    /** iods video profile atom. */
    iods_video_profile?: number | (string & {});
    /** Number of lookahead entries for ISM files */
    ism_lookahead?: number | (string & {});
    /** MOV muxer flags */
    movflags?:
      | 'cmaf'
      | 'dash'
      | 'default_base_moof'
      | 'delay_moov'
      | 'disable_chpl'
      | 'empty_moov'
      | 'faststart'
      | 'frag_custom'
      | 'frag_discont'
      | 'frag_every_frame'
      | 'frag_keyframe'
      | 'global_sidx'
      | 'isml'
      | 'negative_cts_offsets'
      | 'omit_tfhd_offset'
      | 'prefer_icc'
      | 'rtphint'
      | 'separate_moof'
      | 'skip_sidx'
      | 'skip_trailer'
      | 'use_metadata_tags'
      | 'write_colr'
      | 'write_gama'
      | 'hybrid_fragmented'
      | (string & {})
      | number;
    /** maximum moov size so it can be placed at the begin */
    moov_size?: number | (string & {});
    /** Minimum fragment duration */
    min_frag_duration?: number | (string & {});
    /** gamma value for gama atom */
    mov_gamma?: number | (string & {});
    /** set movie timescale */
    movie_timescale?: number | (string & {});
    /** RTP muxer flags */
    rtpflags?: 'latm' | 'rfc2190' | 'skip_rtcp' | 'h264_mode0' | 'send_bye' | (string & {}) | number;
    /** Skip writing iods atom. */
    skip_iods?: boolean | (string & {});
    /** use edit list */
    use_editlist?: boolean | (string & {});
    /** use stream ids as track ids */
    use_stream_ids_as_track_ids?: boolean | (string & {});
    /** set timescale of all video tracks */
    video_track_timescale?: number | (string & {});
    /** force or disable writing btrt */
    write_btrt?: boolean | (string & {});
    /** Write producer reference time box with specified time source */
    write_prft?: 'pts' | 'wallclock' | (string & {}) | number;
    /** force or disable writing tmcd */
    write_tmcd?: boolean | (string & {});
  };
  /**
   * LOAS/LATM
   * @see https://ffmpeg.org/ffmpeg-formats.html#latm
   */
  latm: {
    /** StreamMuxConfig interval. */
    'smc-interval'?: number | (string & {});
  };
  /**
   * LRC lyrics
   * @see https://ffmpeg.org/ffmpeg-formats.html#lrc
   */
  lrc: {
    /** precision of the fractional part of the timestamp, 2 for centiseconds */
    precision?: number | (string & {});
  };
  /**
   * Matroska Audio
   * @see https://ffmpeg.org/ffmpeg-formats.html#matroska
   */
  matroska: {
    /** reserve a given amount of space (in bytes) at the beginning of the file for the index (cues) */
    reserve_index_space?: number | (string & {});
    /** move Cues (the index) to the front by shifting data if necessary */
    cues_to_front?: boolean | (string & {});
    /** store at most the provided amount of bytes in a cluster */
    cluster_size_limit?: number | (string & {});
    /** store at most the provided number of milliseconds in a cluster */
    cluster_time_limit?: number | (string & {});
    /** create a WebM file conforming to WebM DASH specification */
    dash?: boolean | (string & {});
    /** track number for the DASH stream */
    dash_track_number?: number | (string & {});
    /** write files assuming it is a live stream */
    live?: boolean | (string & {});
    /** allow raw VFW mode */
    allow_raw_vfw?: boolean | (string & {});
    /** store raw RGB bitmaps in VFW mode in bottom-up mode */
    flipped_raw_rgb?: boolean | (string & {});
    /** write a CRC32 element inside every Level 1 element */
    write_crc32?: boolean | (string & {});
    /** control how a track's FlagDefault is inferred */
    default_mode?: 'infer' | 'infer_no_subs' | 'passthrough' | (string & {}) | number;
  };
  /**
   * MacCaption
   * @see https://ffmpeg.org/ffmpeg-formats.html#mcc
   */
  mcc: {
    /** override the `Time Code Rate` value in the output */
    override_time_code_rate?: string | number;
    /** use the U alias for E1h 00h 00h 00h, disabled by default because some .mcc files disagree on whether it has 2 or 3 zero bytes */
    use_u_alias?: boolean | (string & {});
    /** the mcc file format version */
    mcc_version?: number | (string & {});
    /** the creation program */
    creation_program?: string | number;
    /** the creation time */
    creation_time?: string | number;
  };
  /**
   * MD5 testing
   * @see https://ffmpeg.org/ffmpeg-formats.html#md5
   */
  md5: {
    /** set hash to use */
    hash?: string | number;
  };
  /**
   * QuickTime / MOV
   * @see https://ffmpeg.org/ffmpeg-formats.html#mov
   */
  mov: {
    /** Override major brand */
    brand?: string | number;
    /** write zero-length name string in hdlr atoms within mdia and minf atoms */
    empty_hdlr_name?: boolean | (string & {});
    /** The media encryption key (hex) */
    encryption_key?: string | number;
    /** The media encryption key identifier (hex) */
    encryption_kid?: string | number;
    /** Configures the encryption scheme, allowed values are none, cenc-aes-ctr */
    encryption_scheme?: string | number;
    /** Maximum fragment duration */
    frag_duration?: number | (string & {});
    /** Interleave samples within fragments (max number of consecutive samples, lower is tighter interleaving, but with more overhead) */
    frag_interleave?: number | (string & {});
    /** Maximum fragment size */
    frag_size?: number | (string & {});
    /** Fragment number of the next fragment */
    fragment_index?: number | (string & {});
    /** iods audio profile atom. */
    iods_audio_profile?: number | (string & {});
    /** iods video profile atom. */
    iods_video_profile?: number | (string & {});
    /** Number of lookahead entries for ISM files */
    ism_lookahead?: number | (string & {});
    /** MOV muxer flags */
    movflags?:
      | 'cmaf'
      | 'dash'
      | 'default_base_moof'
      | 'delay_moov'
      | 'disable_chpl'
      | 'empty_moov'
      | 'faststart'
      | 'frag_custom'
      | 'frag_discont'
      | 'frag_every_frame'
      | 'frag_keyframe'
      | 'global_sidx'
      | 'isml'
      | 'negative_cts_offsets'
      | 'omit_tfhd_offset'
      | 'prefer_icc'
      | 'rtphint'
      | 'separate_moof'
      | 'skip_sidx'
      | 'skip_trailer'
      | 'use_metadata_tags'
      | 'write_colr'
      | 'write_gama'
      | 'hybrid_fragmented'
      | (string & {})
      | number;
    /** maximum moov size so it can be placed at the begin */
    moov_size?: number | (string & {});
    /** Minimum fragment duration */
    min_frag_duration?: number | (string & {});
    /** gamma value for gama atom */
    mov_gamma?: number | (string & {});
    /** set movie timescale */
    movie_timescale?: number | (string & {});
    /** RTP muxer flags */
    rtpflags?: 'latm' | 'rfc2190' | 'skip_rtcp' | 'h264_mode0' | 'send_bye' | (string & {}) | number;
    /** Skip writing iods atom. */
    skip_iods?: boolean | (string & {});
    /** use edit list */
    use_editlist?: boolean | (string & {});
    /** use stream ids as track ids */
    use_stream_ids_as_track_ids?: boolean | (string & {});
    /** set timescale of all video tracks */
    video_track_timescale?: number | (string & {});
    /** force or disable writing btrt */
    write_btrt?: boolean | (string & {});
    /** Write producer reference time box with specified time source */
    write_prft?: 'pts' | 'wallclock' | (string & {}) | number;
    /** force or disable writing tmcd */
    write_tmcd?: boolean | (string & {});
  };
  /**
   * MP3 (MPEG audio layer 3)
   * @see https://ffmpeg.org/ffmpeg-formats.html#mp3
   */
  mp3: {
    /** Select ID3v2 version to write. Currently 3 and 4 are supported. */
    id3v2_version?: number | (string & {});
    /** Enable ID3v1 writing. ID3v1 tags are written in UTF-8 which may not be supported by most software. */
    write_id3v1?: boolean | (string & {});
    /** Write the Xing header containing file duration. */
    write_xing?: boolean | (string & {});
  };
  /**
   * MP4 (MPEG-4 Part 14)
   * @see https://ffmpeg.org/ffmpeg-formats.html#mp4
   */
  mp4: {
    /** Override major brand */
    brand?: string | number;
    /** write zero-length name string in hdlr atoms within mdia and minf atoms */
    empty_hdlr_name?: boolean | (string & {});
    /** The media encryption key (hex) */
    encryption_key?: string | number;
    /** The media encryption key identifier (hex) */
    encryption_kid?: string | number;
    /** Configures the encryption scheme, allowed values are none, cenc-aes-ctr */
    encryption_scheme?: string | number;
    /** Maximum fragment duration */
    frag_duration?: number | (string & {});
    /** Interleave samples within fragments (max number of consecutive samples, lower is tighter interleaving, but with more overhead) */
    frag_interleave?: number | (string & {});
    /** Maximum fragment size */
    frag_size?: number | (string & {});
    /** Fragment number of the next fragment */
    fragment_index?: number | (string & {});
    /** iods audio profile atom. */
    iods_audio_profile?: number | (string & {});
    /** iods video profile atom. */
    iods_video_profile?: number | (string & {});
    /** Number of lookahead entries for ISM files */
    ism_lookahead?: number | (string & {});
    /** MOV muxer flags */
    movflags?:
      | 'cmaf'
      | 'dash'
      | 'default_base_moof'
      | 'delay_moov'
      | 'disable_chpl'
      | 'empty_moov'
      | 'faststart'
      | 'frag_custom'
      | 'frag_discont'
      | 'frag_every_frame'
      | 'frag_keyframe'
      | 'global_sidx'
      | 'isml'
      | 'negative_cts_offsets'
      | 'omit_tfhd_offset'
      | 'prefer_icc'
      | 'rtphint'
      | 'separate_moof'
      | 'skip_sidx'
      | 'skip_trailer'
      | 'use_metadata_tags'
      | 'write_colr'
      | 'write_gama'
      | 'hybrid_fragmented'
      | (string & {})
      | number;
    /** maximum moov size so it can be placed at the begin */
    moov_size?: number | (string & {});
    /** Minimum fragment duration */
    min_frag_duration?: number | (string & {});
    /** gamma value for gama atom */
    mov_gamma?: number | (string & {});
    /** set movie timescale */
    movie_timescale?: number | (string & {});
    /** RTP muxer flags */
    rtpflags?: 'latm' | 'rfc2190' | 'skip_rtcp' | 'h264_mode0' | 'send_bye' | (string & {}) | number;
    /** Skip writing iods atom. */
    skip_iods?: boolean | (string & {});
    /** use edit list */
    use_editlist?: boolean | (string & {});
    /** use stream ids as track ids */
    use_stream_ids_as_track_ids?: boolean | (string & {});
    /** set timescale of all video tracks */
    video_track_timescale?: number | (string & {});
    /** force or disable writing btrt */
    write_btrt?: boolean | (string & {});
    /** Write producer reference time box with specified time source */
    write_prft?: 'pts' | 'wallclock' | (string & {}) | number;
    /** force or disable writing tmcd */
    write_tmcd?: boolean | (string & {});
  };
  /**
   * MPEG-1 Systems / MPEG program stream
   * @see https://ffmpeg.org/ffmpeg-formats.html#mpeg
   */
  mpeg: {
    /** mux rate as bits/s */
    muxrate?: number | (string & {});
    /** initial demux-decode delay in microseconds */
    preload?: number | (string & {});
  };
  /**
   * MPEG-TS (MPEG-2 Transport Stream)
   * @see https://ffmpeg.org/ffmpeg-formats.html#mpegts
   */
  mpegts: {
    /** Set transport_stream_id field. */
    mpegts_transport_stream_id?: number | (string & {});
    /** Set original_network_id field. */
    mpegts_original_network_id?: number | (string & {});
    /** Set service_id field. */
    mpegts_service_id?: number | (string & {});
    /** Set service_type field. */
    mpegts_service_type?:
      | 'digital_tv'
      | 'digital_radio'
      | 'teletext'
      | 'advanced_codec_digital_radio'
      | 'mpeg2_digital_hdtv'
      | 'advanced_codec_digital_sdtv'
      | 'advanced_codec_digital_hdtv'
      | 'hevc_digital_hdtv'
      | (string & {})
      | number;
    /** Set the first pid of the PMT. */
    mpegts_pmt_start_pid?: number | (string & {});
    /** Set the first pid. */
    mpegts_start_pid?: number | (string & {});
    /** Enable m2ts mode. */
    mpegts_m2ts_mode?: boolean | (string & {});
    muxrate?: number | (string & {});
    /** Minimum PES packet payload in bytes */
    pes_payload_size?: number | (string & {});
    /** MPEG-TS muxing flags */
    mpegts_flags?: 'resend_headers' | 'latm' | 'pat_pmt_at_frames' | 'system_b' | 'initial_discontinuity' | 'nit' | 'omit_rai' | (string & {}) | number;
    /** don't offset dts/pts */
    mpegts_copyts?: boolean | (string & {});
    /** set PAT, PMT, SDT and NIT version */
    tables_version?: number | (string & {});
    /** Omit the PES packet length for video packets */
    omit_video_pes_length?: boolean | (string & {});
    /** PCR retransmission time in milliseconds */
    pcr_period?: number | (string & {});
    /** PAT/PMT retransmission time limit in seconds */
    pat_period?: string | number;
    /** SDT retransmission time limit in seconds */
    sdt_period?: string | number;
    /** NIT retransmission time limit in seconds */
    nit_period?: string | number;
  };
  /**
   * MIME multipart JPEG
   * @see https://ffmpeg.org/ffmpeg-formats.html#mpjpeg
   */
  mpjpeg: {
    /** Boundary tag */
    boundary_tag?: string | number;
  };
  /**
   * MXF (Material eXchange Format)
   * @see https://ffmpeg.org/ffmpeg-formats.html#mxf
   */
  mxf: {
    /** Force/set Signal Standard */
    signal_standard?: 'bt601' | 'bt1358' | 'smpte347m' | 'smpte274m' | 'smpte296m' | 'smpte349m' | 'smpte428' | (string & {}) | number;
    store_user_comments?: boolean | (string & {});
  };
  /**
   * MXF (Material eXchange Format) D-10 Mapping
   * @see https://ffmpeg.org/ffmpeg-formats.html#mxf_005fd10
   */
  mxf_d10: {
    /** Force/set channelcount in generic sound essence descriptor */
    d10_channelcount?: number | (string & {});
    /** Force/set Signal Standard */
    signal_standard?: 'bt601' | 'bt1358' | 'smpte347m' | 'smpte274m' | 'smpte296m' | 'smpte349m' | 'smpte428' | (string & {}) | number;
    store_user_comments?: boolean | (string & {});
  };
  /**
   * MXF (Material eXchange Format) Operational Pattern Atom
   * @see https://ffmpeg.org/ffmpeg-formats.html#mxf_005fopatom
   */
  mxf_opatom: {
    /** Audio edit rate for timecode */
    mxf_audio_edit_rate?: string | number;
    /** Force/set Signal Standard */
    signal_standard?: 'bt601' | 'bt1358' | 'smpte347m' | 'smpte274m' | 'smpte296m' | 'smpte349m' | 'smpte428' | (string & {}) | number;
    store_user_comments?: boolean | (string & {});
  };
  /**
   * NUT
   * @see https://ffmpeg.org/ffmpeg-formats.html#nut
   */
  nut: {
    /** NUT syncpoint behaviour */
    syncpoints?: 'default' | 'none' | 'timestamped' | (string & {}) | number;
    /** Write index */
    write_index?: boolean | (string & {});
  };
  /**
   * Ogg Audio
   * @see https://ffmpeg.org/ffmpeg-formats.html#oga
   */
  oga: {
    /** serial number offset */
    serial_offset?: number | (string & {});
    /** Set preferred Ogg page size. */
    oggpagesize?: number | (string & {});
    /** preferred page size in bytes */
    pagesize?: number | (string & {});
    /** preferred page duration, in microseconds */
    page_duration?: number | (string & {});
  };
  /**
   * Ogg
   * @see https://ffmpeg.org/ffmpeg-formats.html#ogg
   */
  ogg: {
    /** serial number offset */
    serial_offset?: number | (string & {});
    /** Set preferred Ogg page size. */
    oggpagesize?: number | (string & {});
    /** preferred page size in bytes */
    pagesize?: number | (string & {});
    /** preferred page duration, in microseconds */
    page_duration?: number | (string & {});
  };
  /**
   * Ogg Video
   * @see https://ffmpeg.org/ffmpeg-formats.html#ogv
   */
  ogv: {
    /** serial number offset */
    serial_offset?: number | (string & {});
    /** Set preferred Ogg page size. */
    oggpagesize?: number | (string & {});
    /** preferred page size in bytes */
    pagesize?: number | (string & {});
    /** preferred page duration, in microseconds */
    page_duration?: number | (string & {});
  };
  /**
   * Ogg Opus
   * @see https://ffmpeg.org/ffmpeg-formats.html#opus
   */
  opus: {
    /** serial number offset */
    serial_offset?: number | (string & {});
    /** Set preferred Ogg page size. */
    oggpagesize?: number | (string & {});
    /** preferred page size in bytes */
    pagesize?: number | (string & {});
    /** preferred page duration, in microseconds */
    page_duration?: number | (string & {});
  };
  /**
   * PlayDate Video
   * @see https://ffmpeg.org/ffmpeg-formats.html#pdv
   */
  pdv: {
    /** maximum number of frames reserved in table (mandatory) */
    max_frames?: number | (string & {});
  };
  /**
   * PSP MP4 (MPEG-4 Part 14)
   * @see https://ffmpeg.org/ffmpeg-formats.html#psp
   */
  psp: {
    /** Override major brand */
    brand?: string | number;
    /** write zero-length name string in hdlr atoms within mdia and minf atoms */
    empty_hdlr_name?: boolean | (string & {});
    /** The media encryption key (hex) */
    encryption_key?: string | number;
    /** The media encryption key identifier (hex) */
    encryption_kid?: string | number;
    /** Configures the encryption scheme, allowed values are none, cenc-aes-ctr */
    encryption_scheme?: string | number;
    /** Maximum fragment duration */
    frag_duration?: number | (string & {});
    /** Interleave samples within fragments (max number of consecutive samples, lower is tighter interleaving, but with more overhead) */
    frag_interleave?: number | (string & {});
    /** Maximum fragment size */
    frag_size?: number | (string & {});
    /** Fragment number of the next fragment */
    fragment_index?: number | (string & {});
    /** iods audio profile atom. */
    iods_audio_profile?: number | (string & {});
    /** iods video profile atom. */
    iods_video_profile?: number | (string & {});
    /** Number of lookahead entries for ISM files */
    ism_lookahead?: number | (string & {});
    /** MOV muxer flags */
    movflags?:
      | 'cmaf'
      | 'dash'
      | 'default_base_moof'
      | 'delay_moov'
      | 'disable_chpl'
      | 'empty_moov'
      | 'faststart'
      | 'frag_custom'
      | 'frag_discont'
      | 'frag_every_frame'
      | 'frag_keyframe'
      | 'global_sidx'
      | 'isml'
      | 'negative_cts_offsets'
      | 'omit_tfhd_offset'
      | 'prefer_icc'
      | 'rtphint'
      | 'separate_moof'
      | 'skip_sidx'
      | 'skip_trailer'
      | 'use_metadata_tags'
      | 'write_colr'
      | 'write_gama'
      | 'hybrid_fragmented'
      | (string & {})
      | number;
    /** maximum moov size so it can be placed at the begin */
    moov_size?: number | (string & {});
    /** Minimum fragment duration */
    min_frag_duration?: number | (string & {});
    /** gamma value for gama atom */
    mov_gamma?: number | (string & {});
    /** set movie timescale */
    movie_timescale?: number | (string & {});
    /** RTP muxer flags */
    rtpflags?: 'latm' | 'rfc2190' | 'skip_rtcp' | 'h264_mode0' | 'send_bye' | (string & {}) | number;
    /** Skip writing iods atom. */
    skip_iods?: boolean | (string & {});
    /** use edit list */
    use_editlist?: boolean | (string & {});
    /** use stream ids as track ids */
    use_stream_ids_as_track_ids?: boolean | (string & {});
    /** set timescale of all video tracks */
    video_track_timescale?: number | (string & {});
    /** force or disable writing btrt */
    write_btrt?: boolean | (string & {});
    /** Write producer reference time box with specified time source */
    write_prft?: 'pts' | 'wallclock' | (string & {}) | number;
    /** force or disable writing tmcd */
    write_tmcd?: boolean | (string & {});
  };
  /**
   * Pulse audio output
   * @see https://ffmpeg.org/ffmpeg-formats.html#pulse
   */
  pulse: {
    /** set PulseAudio server */
    server?: string | number;
    /** set application name */
    name?: string | number;
    /** set stream description */
    stream_name?: string | number;
    /** set device name */
    device?: string | number;
    /** set buffer size in bytes */
    buffer_size?: number | (string & {});
    /** set buffer duration in millisecs */
    buffer_duration?: number | (string & {});
    /** set pre-buffering size */
    prebuf?: number | (string & {});
    /** set minimum request size */
    minreq?: number | (string & {});
  };
  /**
   * RTP output
   * @see https://ffmpeg.org/ffmpeg-formats.html#rtp
   */
  rtp: {
    /** RTP muxer flags */
    rtpflags?: 'latm' | 'rfc2190' | 'skip_rtcp' | 'h264_mode0' | 'send_bye' | (string & {}) | number;
    /** Specify RTP payload type */
    payload_type?: number | (string & {});
    /** Stream identifier */
    ssrc?: number | (string & {});
    /** CNAME to include in RTCP SR packets */
    cname?: string | number;
    /** Starting sequence number */
    seq?: number | (string & {});
  };
  /**
   * RTP/mpegts output format
   * @see https://ffmpeg.org/ffmpeg-formats.html#rtp_005fmpegts
   */
  rtp_mpegts: {
    /** set list of options for the MPEG-TS muxer */
    mpegts_muxer_options?: string | number;
    /** set list of options for the RTP muxer */
    rtp_muxer_options?: string | number;
  };
  /**
   * segment
   * @see https://ffmpeg.org/ffmpeg-formats.html#segment
   */
  segment: {
    /** set reference stream */
    reference_stream?: string | number;
    /** set container format used for the segments */
    segment_format?: string | number;
    /** set list of options for the container format used for the segments */
    segment_format_options?: string | number;
    /** set the segment list filename */
    segment_list?: string | number;
    /** write a single file containing the header */
    segment_header_filename?: string | number;
    /** set flags affecting segment list generation */
    segment_list_flags?: 'cache' | 'live' | (string & {}) | number;
    /** set the maximum number of playlist entries */
    segment_list_size?: number | (string & {});
    /** set the segment list type */
    segment_list_type?: 'flat' | 'csv' | 'ext' | 'ffconcat' | 'm3u8' | 'hls' | (string & {}) | number;
    /** set segment to be cut at clocktime */
    segment_atclocktime?: boolean | (string & {});
    /** set segment clocktime offset */
    segment_clocktime_offset?: string | number;
    /** set segment clocktime wrapping duration */
    segment_clocktime_wrap_duration?: string | number;
    /** set segment duration */
    segment_time?: string | number;
    /** set approximation value used for the segment times */
    segment_time_delta?: string | number;
    /** set minimum segment duration */
    min_seg_duration?: string | number;
    /** set segment split time points */
    segment_times?: string | number;
    /** set segment split frame numbers */
    segment_frames?: string | number;
    /** set number after which the index wraps */
    segment_wrap?: number | (string & {});
    /** set base url prefix for segments */
    segment_list_entry_prefix?: string | number;
    /** set the sequence number of the first segment */
    segment_start_number?: number | (string & {});
    /** set the number of wrap before the first segment */
    segment_wrap_number?: number | (string & {});
    /** set filename expansion with strftime at segment creation */
    strftime?: boolean | (string & {});
    /** increment timecode between each segment */
    increment_tc?: boolean | (string & {});
    /** allow breaking segments on non-keyframes */
    break_non_keyframes?: boolean | (string & {});
    /** write header/trailer to each segment */
    individual_header_trailer?: boolean | (string & {});
    /** write a header to the first segment and a trailer to the last one */
    write_header_trailer?: boolean | (string & {});
    /** reset timestamps at the beginning of each segment */
    reset_timestamps?: boolean | (string & {});
    /** set initial timestamp offset */
    initial_offset?: string | number;
    /** allow writing empty 'filler' segments */
    write_empty_segments?: boolean | (string & {});
  };
  /**
   * Smooth Streaming Muxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#smoothstreaming
   */
  smoothstreaming: {
    /** number of fragments kept in the manifest */
    window_size?: number | (string & {});
    /** number of fragments kept outside of the manifest before removing from disk */
    extra_window_size?: number | (string & {});
    /** number of lookahead fragments */
    lookahead_count?: number | (string & {});
    /** minimum fragment duration (in microseconds) */
    min_frag_duration?: number | (string & {});
    /** remove all fragments when finished */
    remove_at_exit?: boolean | (string & {});
  };
  /**
   * IEC 61937 (used on S/PDIF - IEC958)
   * @see https://ffmpeg.org/ffmpeg-formats.html#spdif
   */
  spdif: {
    /** IEC 61937 encapsulation flags */
    spdif_flags?: 'be' | (string & {}) | number;
    /** mux complete DTS frames in HD mode at the specified IEC958 rate (in Hz, default 0=disabled) */
    dtshd_rate?: number | (string & {});
    /** min secs to strip HD for after an overflow (-1: till the end, default 60) */
    dtshd_fallback_time?: number | (string & {});
  };
  /**
   * Ogg Speex
   * @see https://ffmpeg.org/ffmpeg-formats.html#spx
   */
  spx: {
    /** serial number offset */
    serial_offset?: number | (string & {});
    /** Set preferred Ogg page size. */
    oggpagesize?: number | (string & {});
    /** preferred page size in bytes */
    pagesize?: number | (string & {});
    /** preferred page duration, in microseconds */
    page_duration?: number | (string & {});
  };
  /**
   * streaming segment muxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#ssegment
   */
  ssegment: {
    /** set reference stream */
    reference_stream?: string | number;
    /** set container format used for the segments */
    segment_format?: string | number;
    /** set list of options for the container format used for the segments */
    segment_format_options?: string | number;
    /** set the segment list filename */
    segment_list?: string | number;
    /** write a single file containing the header */
    segment_header_filename?: string | number;
    /** set flags affecting segment list generation */
    segment_list_flags?: 'cache' | 'live' | (string & {}) | number;
    /** set the maximum number of playlist entries */
    segment_list_size?: number | (string & {});
    /** set the segment list type */
    segment_list_type?: 'flat' | 'csv' | 'ext' | 'ffconcat' | 'm3u8' | 'hls' | (string & {}) | number;
    /** set segment to be cut at clocktime */
    segment_atclocktime?: boolean | (string & {});
    /** set segment clocktime offset */
    segment_clocktime_offset?: string | number;
    /** set segment clocktime wrapping duration */
    segment_clocktime_wrap_duration?: string | number;
    /** set segment duration */
    segment_time?: string | number;
    /** set approximation value used for the segment times */
    segment_time_delta?: string | number;
    /** set minimum segment duration */
    min_seg_duration?: string | number;
    /** set segment split time points */
    segment_times?: string | number;
    /** set segment split frame numbers */
    segment_frames?: string | number;
    /** set number after which the index wraps */
    segment_wrap?: number | (string & {});
    /** set base url prefix for segments */
    segment_list_entry_prefix?: string | number;
    /** set the sequence number of the first segment */
    segment_start_number?: number | (string & {});
    /** set the number of wrap before the first segment */
    segment_wrap_number?: number | (string & {});
    /** set filename expansion with strftime at segment creation */
    strftime?: boolean | (string & {});
    /** increment timecode between each segment */
    increment_tc?: boolean | (string & {});
    /** allow breaking segments on non-keyframes */
    break_non_keyframes?: boolean | (string & {});
    /** write header/trailer to each segment */
    individual_header_trailer?: boolean | (string & {});
    /** write a header to the first segment and a trailer to the last one */
    write_header_trailer?: boolean | (string & {});
    /** reset timestamps at the beginning of each segment */
    reset_timestamps?: boolean | (string & {});
    /** set initial timestamp offset */
    initial_offset?: string | number;
    /** allow writing empty 'filler' segments */
    write_empty_segments?: boolean | (string & {});
  };
  /**
   * streaming segment muxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#stream_005fsegment
   */
  stream_segment: {
    /** set reference stream */
    reference_stream?: string | number;
    /** set container format used for the segments */
    segment_format?: string | number;
    /** set list of options for the container format used for the segments */
    segment_format_options?: string | number;
    /** set the segment list filename */
    segment_list?: string | number;
    /** write a single file containing the header */
    segment_header_filename?: string | number;
    /** set flags affecting segment list generation */
    segment_list_flags?: 'cache' | 'live' | (string & {}) | number;
    /** set the maximum number of playlist entries */
    segment_list_size?: number | (string & {});
    /** set the segment list type */
    segment_list_type?: 'flat' | 'csv' | 'ext' | 'ffconcat' | 'm3u8' | 'hls' | (string & {}) | number;
    /** set segment to be cut at clocktime */
    segment_atclocktime?: boolean | (string & {});
    /** set segment clocktime offset */
    segment_clocktime_offset?: string | number;
    /** set segment clocktime wrapping duration */
    segment_clocktime_wrap_duration?: string | number;
    /** set segment duration */
    segment_time?: string | number;
    /** set approximation value used for the segment times */
    segment_time_delta?: string | number;
    /** set minimum segment duration */
    min_seg_duration?: string | number;
    /** set segment split time points */
    segment_times?: string | number;
    /** set segment split frame numbers */
    segment_frames?: string | number;
    /** set number after which the index wraps */
    segment_wrap?: number | (string & {});
    /** set base url prefix for segments */
    segment_list_entry_prefix?: string | number;
    /** set the sequence number of the first segment */
    segment_start_number?: number | (string & {});
    /** set the number of wrap before the first segment */
    segment_wrap_number?: number | (string & {});
    /** set filename expansion with strftime at segment creation */
    strftime?: boolean | (string & {});
    /** increment timecode between each segment */
    increment_tc?: boolean | (string & {});
    /** allow breaking segments on non-keyframes */
    break_non_keyframes?: boolean | (string & {});
    /** write header/trailer to each segment */
    individual_header_trailer?: boolean | (string & {});
    /** write a header to the first segment and a trailer to the last one */
    write_header_trailer?: boolean | (string & {});
    /** reset timestamps at the beginning of each segment */
    reset_timestamps?: boolean | (string & {});
    /** set initial timestamp offset */
    initial_offset?: string | number;
    /** allow writing empty 'filler' segments */
    write_empty_segments?: boolean | (string & {});
  };
  /**
   * Per-stream hash testing
   * @see https://ffmpeg.org/ffmpeg-formats.html#streamhash
   */
  streamhash: {
    /** set hash to use */
    hash?: string | number;
  };
  /**
   * MPEG-2 PS (SVCD)
   * @see https://ffmpeg.org/ffmpeg-formats.html#svcd
   */
  svcd: {
    /** mux rate as bits/s */
    muxrate?: number | (string & {});
    /** initial demux-decode delay in microseconds */
    preload?: number | (string & {});
  };
  /**
   * Multiple muxer tee
   * @see https://ffmpeg.org/ffmpeg-formats.html#tee
   */
  tee: {
    /** Use fifo pseudo-muxer to separate actual muxers from encoder */
    use_fifo?: boolean | (string & {});
    /** fifo pseudo-muxer options */
    fifo_options?: string | number;
  };
  /**
   * MPEG-1 Systems / MPEG program stream (VCD)
   * @see https://ffmpeg.org/ffmpeg-formats.html#vcd
   */
  vcd: {
    /** mux rate as bits/s */
    muxrate?: number | (string & {});
    /** initial demux-decode delay in microseconds */
    preload?: number | (string & {});
  };
  /**
   * MPEG-2 PS (VOB)
   * @see https://ffmpeg.org/ffmpeg-formats.html#vob
   */
  vob: {
    /** mux rate as bits/s */
    muxrate?: number | (string & {});
    /** initial demux-decode delay in microseconds */
    preload?: number | (string & {});
  };
  /**
   * WAV / WAVE (Waveform Audio)
   * @see https://ffmpeg.org/ffmpeg-formats.html#wav
   */
  wav: {
    /** Write BEXT chunk. */
    write_bext?: boolean | (string & {});
    /** Write Peak Envelope chunk. */
    write_peak?: 'off' | 'on' | 'only' | (string & {}) | number;
    /** Use RF64 header rather than RIFF for large files. */
    rf64?: 'auto' | 'always' | 'never' | (string & {}) | number;
    /** Number of audio samples used to generate each peak frame. */
    peak_block_size?: number | (string & {});
    /** The format of the peak envelope data (1: uint8, 2: uint16). */
    peak_format?: number | (string & {});
    /** Number of peak points per peak value (1 or 2). */
    peak_ppv?: number | (string & {});
  };
  /**
   * WebM
   * @see https://ffmpeg.org/ffmpeg-formats.html#webm
   */
  webm: {
    /** reserve a given amount of space (in bytes) at the beginning of the file for the index (cues) */
    reserve_index_space?: number | (string & {});
    /** move Cues (the index) to the front by shifting data if necessary */
    cues_to_front?: boolean | (string & {});
    /** store at most the provided amount of bytes in a cluster */
    cluster_size_limit?: number | (string & {});
    /** store at most the provided number of milliseconds in a cluster */
    cluster_time_limit?: number | (string & {});
    /** create a WebM file conforming to WebM DASH specification */
    dash?: boolean | (string & {});
    /** track number for the DASH stream */
    dash_track_number?: number | (string & {});
    /** write files assuming it is a live stream */
    live?: boolean | (string & {});
    /** allow raw VFW mode */
    allow_raw_vfw?: boolean | (string & {});
    /** store raw RGB bitmaps in VFW mode in bottom-up mode */
    flipped_raw_rgb?: boolean | (string & {});
    /** write a CRC32 element inside every Level 1 element */
    write_crc32?: boolean | (string & {});
    /** control how a track's FlagDefault is inferred */
    default_mode?: 'infer' | 'infer_no_subs' | 'passthrough' | (string & {}) | number;
  };
  /**
   * WebM Chunk Muxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#webm_005fchunk
   */
  webm_chunk: {
    /** start index of the chunk */
    chunk_start_index?: number | (string & {});
    /** filename of the header where the initialization data will be written */
    header?: string | number;
    /** duration of each chunk in milliseconds */
    audio_chunk_duration?: number | (string & {});
    /** set the HTTP method */
    method?: string | number;
  };
  /**
   * WebM DASH Manifest
   * @see https://ffmpeg.org/ffmpeg-formats.html#webm_005fdash_005fmanifest
   */
  webm_dash_manifest: {
    /** Adaptation sets. Syntax: id=0,streams=0,1,2 id=1,streams=3,4 and so on */
    adaptation_sets?: string | number;
    /** create a live stream manifest */
    live?: boolean | (string & {});
    /** start index of the chunk */
    chunk_start_index?: number | (string & {});
    /** duration of each chunk (in milliseconds) */
    chunk_duration_ms?: number | (string & {});
    /** URL of the page that will return the UTC timestamp in ISO format */
    utc_timing_url?: string | number;
    /** Smallest time (in seconds) shifting buffer for which any Representation is guaranteed to be available. */
    time_shift_buffer_depth?: number | (string & {});
    /** Minimum Update Period (in seconds) of the manifest. */
    minimum_update_period?: number | (string & {});
  };
  /**
   * WebP
   * @see https://ffmpeg.org/ffmpeg-formats.html#webp
   */
  webp: {
    /** Number of times to loop the output: 0 - infinite loop */
    loop?: number | (string & {});
  };
  /**
   * WHIP(WebRTC-HTTP ingestion protocol) muxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#whip
   */
  whip: {
    /** Timeout in milliseconds for ICE and DTLS handshake. */
    handshake_timeout?: number | (string & {});
    /** Set timeout for socket I/O operations */
    timeout?: string | number;
    /** The maximum size, in bytes, of RTP packets that send out */
    pkt_size?: number | (string & {});
    /** The buffer size, in bytes, of underlying protocol */
    ts_buffer_size?: number | (string & {});
    /** Set flags affecting WHIP connection behavior */
    whip_flags?: 'dtls_active' | (string & {}) | number;
    /** The number of RTP history items to store */
    rtp_history?: number | (string & {});
    /** The optional Bearer token for WHIP Authorization */
    authorization?: string | number;
    /** The optional certificate file path for DTLS */
    cert_file?: string | number;
    /** The optional private key file path for DTLS */
    key_file?: string | number;
  };
  /**
   * XV (XVideo) output device
   * @see https://ffmpeg.org/ffmpeg-formats.html#xv
   */
  xv: {
    /** set display name */
    display_name?: string | number;
    /** set existing window id */
    window_id?: number | (string & {});
    /** set window forced size */
    window_size?: string | number;
    /** set window title */
    window_title?: string | number;
    /** set window x offset */
    window_x?: number | (string & {});
    /** set window y offset */
    window_y?: number | (string & {});
  };
}

export interface DemuxerPrivateOptionsMap {
  /**
   * QuickTime / MOV
   * @see https://ffmpeg.org/ffmpeg-formats.html#3g2
   */
  '3g2': {
    /** allow using absolute path when opening alias, this is a possible security issue */
    use_absolute_path?: boolean | (string & {});
    /** Seek each stream individually to the closest point */
    seek_streams_individually?: boolean | (string & {});
    /** Ignore the edit list atom. */
    ignore_editlist?: boolean | (string & {});
    /** Modify the AVIndex according to the editlists. Use this option to decode in the order specified by the edits. */
    advanced_editlist?: boolean | (string & {});
    ignore_chapters?: boolean | (string & {});
    /** use mfra for fragment timestamps */
    use_mfra_for?: 'auto' | 'dts' | 'pts' | (string & {}) | number;
    /** use tfdt for fragment timestamps */
    use_tfdt?: boolean | (string & {});
    /** Export unrecognized metadata entries */
    export_all?: boolean | (string & {});
    /** Export full XMP metadata */
    export_xmp?: boolean | (string & {});
    /** Secret bytes for Audible AAX files */
    activation_bytes?: string | number;
    /** AES-128 Key for Audible AAXC files */
    audible_key?: string | number;
    /** AES-128 IV for Audible AAXC files */
    audible_iv?: string | number;
    /** Fixed key used for handling Audible AAX files */
    audible_fixed_key?: string | number;
    /** The default media decryption key (hex) */
    decryption_key?: string | number;
    /** The media decryption keys by KID (hex) */
    decryption_keys?: string | number;
    /** Enable external track support. */
    enable_drefs?: boolean | (string & {});
    /** treat offsets above this value as invalid */
    max_stts_delta?: number | (string & {});
    /** Interleave packets from multiple tracks at demuxer level */
    interleaved_read?: boolean | (string & {});
  };
  /**
   * QuickTime / MOV
   * @see https://ffmpeg.org/ffmpeg-formats.html#3gp
   */
  '3gp': {
    /** allow using absolute path when opening alias, this is a possible security issue */
    use_absolute_path?: boolean | (string & {});
    /** Seek each stream individually to the closest point */
    seek_streams_individually?: boolean | (string & {});
    /** Ignore the edit list atom. */
    ignore_editlist?: boolean | (string & {});
    /** Modify the AVIndex according to the editlists. Use this option to decode in the order specified by the edits. */
    advanced_editlist?: boolean | (string & {});
    ignore_chapters?: boolean | (string & {});
    /** use mfra for fragment timestamps */
    use_mfra_for?: 'auto' | 'dts' | 'pts' | (string & {}) | number;
    /** use tfdt for fragment timestamps */
    use_tfdt?: boolean | (string & {});
    /** Export unrecognized metadata entries */
    export_all?: boolean | (string & {});
    /** Export full XMP metadata */
    export_xmp?: boolean | (string & {});
    /** Secret bytes for Audible AAX files */
    activation_bytes?: string | number;
    /** AES-128 Key for Audible AAXC files */
    audible_key?: string | number;
    /** AES-128 IV for Audible AAXC files */
    audible_iv?: string | number;
    /** Fixed key used for handling Audible AAX files */
    audible_fixed_key?: string | number;
    /** The default media decryption key (hex) */
    decryption_key?: string | number;
    /** The media decryption keys by KID (hex) */
    decryption_keys?: string | number;
    /** Enable external track support. */
    enable_drefs?: boolean | (string & {});
    /** treat offsets above this value as invalid */
    max_stts_delta?: number | (string & {});
    /** Interleave packets from multiple tracks at demuxer level */
    interleaved_read?: boolean | (string & {});
  };
  /**
   * Audible AA format files
   * @see https://ffmpeg.org/ffmpeg-formats.html#aa
   */
  aa: {
    /** Fixed key used for handling Audible AA files */
    aa_fixed_key?: string | number;
  };
  /**
   * ALSA audio input
   * @see https://ffmpeg.org/ffmpeg-formats.html#alsa
   */
  alsa: {
    sample_rate?: number | (string & {});
    channels?: number | (string & {});
    ch_layout?: string | number;
  };
  /**
   * Android camera input device
   * @see https://ffmpeg.org/ffmpeg-formats.html#android_005fcamera
   */
  android_camera: {
    /** set video size given as a string such as 640x480 or hd720 */
    video_size?: string | number;
    /** set video frame rate */
    framerate?: string | number;
    /** set index of camera to use */
    camera_index?: number | (string & {});
    /** set maximum number of frames to buffer */
    input_queue_size?: number | (string & {});
  };
  /**
   * Animated Portable Network Graphics
   * @see https://ffmpeg.org/ffmpeg-formats.html#apng
   */
  apng: {
    /** ignore loop setting */
    ignore_loop?: boolean | (string & {});
    /** maximum framerate (0 is no limit) */
    max_fps?: number | (string & {});
    /** default framerate (0 is as fast as possible) */
    default_fps?: number | (string & {});
  };
  /**
   * raw aptX
   * @see https://ffmpeg.org/ffmpeg-formats.html#aptx
   */
  aptx: {
    sample_rate?: number | (string & {});
  };
  /**
   * raw aptX HD
   * @see https://ffmpeg.org/ffmpeg-formats.html#aptx_005fhd
   */
  aptx_hd: {
    sample_rate?: number | (string & {});
  };
  /**
   * APV raw bitstream
   * @see https://ffmpeg.org/ffmpeg-formats.html#apv
   */
  apv: {
    /** set frame rate */
    framerate?: string | number;
  };
  /**
   * AQTitle subtitles
   * @see https://ffmpeg.org/ffmpeg-formats.html#aqtitle
   */
  aqtitle: {
    /** set the movie frame rate */
    subfps?: string | number;
  };
  /**
   * ASF (Advanced / Active Streaming Format)
   * @see https://ffmpeg.org/ffmpeg-formats.html#asf
   */
  asf: {
    /** Don't try to resynchronize by looking for a certain optional start code */
    no_resync_search?: boolean | (string & {});
    /** Export full XMP metadata */
    export_xmp?: boolean | (string & {});
  };
  /**
   * AV1 Annex B
   * @see https://ffmpeg.org/ffmpeg-formats.html#av1
   */
  av1: {
    framerate?: string | number;
  };
  /**
   * AVFoundation input device
   * @see https://ffmpeg.org/ffmpeg-formats.html#avfoundation
   */
  avfoundation: {
    /** list available devices */
    list_devices?: boolean | (string & {});
    /** select video device by index for devices with same name (starts at 0) */
    video_device_index?: number | (string & {});
    /** select audio device by index for devices with same name (starts at 0) */
    audio_device_index?: number | (string & {});
    /** set pixel format */
    pixel_format?: string | number;
    /** set frame rate */
    framerate?: string | number;
    /** set video size */
    video_size?: string | number;
    /** capture the screen cursor */
    capture_cursor?: boolean | (string & {});
    /** capture the screen mouse clicks */
    capture_mouse_clicks?: boolean | (string & {});
    /** capture the raw data from device connection */
    capture_raw_data?: boolean | (string & {});
    /** drop frames that are available later than expected */
    drop_late_frames?: boolean | (string & {});
    /** capture system audio via ScreenCaptureKit (macOS 13.0+) */
    capture_system_audio?: boolean | (string & {});
    /** exclude current process audio from system audio capture */
    exclude_process_audio?: boolean | (string & {});
    /** set system audio sample rate (8000/16000/24000/48000) */
    sck_audio_sample_rate?: number | (string & {});
    /** set system audio channel count (1=mono, 2=stereo) */
    sck_audio_channels?: number | (string & {});
    /** capture a specific window by ID via ScreenCaptureKit (0=disabled) */
    capture_window_id?: number | (string & {});
  };
  /**
   * AVI (Audio Video Interleaved)
   * @see https://ffmpeg.org/ffmpeg-formats.html#avi
   */
  avi: {
    /** use odml index */
    use_odml?: boolean | (string & {});
  };
  /**
   * AviSynth script
   * @see https://ffmpeg.org/ffmpeg-formats.html#avisynth
   */
  avisynth: {
    /** set flags related to reading frame properties from script (AviSynth+ v3.7.1 or higher) */
    avisynth_flags?: 'field_order' | 'range' | 'primaries' | 'transfer' | 'matrix' | 'chroma_location' | 'sar' | (string & {}) | number;
  };
  /**
   * Commodore CDXL video
   * @see https://ffmpeg.org/ffmpeg-formats.html#cdxl
   */
  cdxl: {
    sample_rate?: number | (string & {});
    frame_rate?: string | number;
  };
  /**
   * codec2 .c2 demuxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#codec2
   */
  codec2: {
    /** Number of frames to read at a time. Higher = faster decoding, lower granularity */
    frames_per_packet?: number | (string & {});
  };
  /**
   * raw codec2 demuxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#codec2raw
   */
  codec2raw: {
    /** Number of frames to read at a time. Higher = faster decoding, lower granularity */
    frames_per_packet?: number | (string & {});
  };
  /**
   * Virtual concatenation script
   * @see https://ffmpeg.org/ffmpeg-formats.html#concat
   */
  concat: {
    /** enable safe mode */
    safe?: boolean | (string & {});
    /** automatically convert bitstream format */
    auto_convert?: boolean | (string & {});
    /** output file segment start time and duration as packet metadata */
    segment_time_metadata?: boolean | (string & {});
  };
  /**
   * Dynamic Adaptive Streaming over HTTP
   * @see https://ffmpeg.org/ffmpeg-formats.html#dash
   */
  dash: {
    /** List of file extensions that dash is allowed to access */
    allowed_extensions?: string | number;
    /** Media default decryption key (hex) */
    cenc_decryption_key?: string | number;
    /** Media decryption keys by KID (hex) */
    cenc_decryption_keys?: string | number;
    /** Maximum number of manifest reloads in get_current_fragment() before giving up */
    max_reload?: number | (string & {});
  };
  /**
   * raw data
   * @see https://ffmpeg.org/ffmpeg-formats.html#data
   */
  data: {
    raw_packet_size?: number | (string & {});
  };
  /**
   * Blackmagic DeckLink input
   * @see https://ffmpeg.org/ffmpeg-formats.html#decklink
   */
  decklink: {
    /** use ffmpeg -sources decklink instead */
    list_devices?: boolean | (string & {});
    /** list supported formats */
    list_formats?: number | (string & {});
    /** set format by fourcc */
    format_code?: string | number;
    /** pixel format to be returned by the card when capturing */
    raw_format?: 'auto' | 'uyvy422' | 'yuv422p10' | 'argb' | 'bgra' | 'rgb10' | (string & {}) | number;
    /** output klv if present in vanc */
    enable_klv?: boolean | (string & {});
    /** teletext lines bitmask */
    teletext_lines?: 'standard' | 'all' | (string & {}) | number;
    /** number of audio channels */
    channels?: number | (string & {});
    /** duplex mode */
    duplex_mode?: 'unset' | 'half' | 'full' | 'one_sub_device_full' | 'one_sub_device_half' | 'two_sub_device_full' | 'four_sub_device_half' | (string & {}) | number;
    /** timecode format */
    timecode_format?: 'none' | 'rp188vitc' | 'rp188vitc2' | 'rp188ltc' | 'rp188any' | 'vitc' | 'vitc2' | 'serial' | 'rp188hfr' | (string & {}) | number;
    /** video input */
    video_input?: 'unset' | 'sdi' | 'hdmi' | 'optical_sdi' | 'component' | 'composite' | 's_video' | (string & {}) | number;
    /** audio input */
    audio_input?: 'unset' | 'embedded' | 'aes_ebu' | 'analog' | 'analog_xlr' | 'analog_rca' | 'microphone' | (string & {}) | number;
    /** audio pts source */
    audio_pts?: 'audio' | 'video' | 'reference' | 'wallclock' | 'abs_wallclock' | (string & {}) | number;
    /** video pts source */
    video_pts?: 'audio' | 'video' | 'reference' | 'wallclock' | 'abs_wallclock' | (string & {}) | number;
    /** use option signal_loss_action instead */
    draw_bars?: boolean | (string & {});
    /** input queue buffer size */
    queue_size?: number | (string & {});
    /** audio bitdepth (16 or 32) */
    audio_depth?: number | (string & {});
    /** copy timestamps, do not remove the initial offset */
    decklink_copyts?: boolean | (string & {});
    /** capture start time alignment (in seconds) */
    timestamp_align?: string | number;
    /** drop frames till a frame with timecode is received. TC format must be set */
    wait_for_tc?: boolean | (string & {});
    /** action on signal loss */
    signal_loss_action?: 'none' | 'bars' | 'repeat' | (string & {}) | number;
  };
  /**
   * raw DFPWM1a
   * @see https://ffmpeg.org/ffmpeg-formats.html#dfpwm
   */
  dfpwm: {
    sample_rate?: number | (string & {});
    ch_layout?: string | number;
  };
  /**
   * DirectShow capture
   * @see https://ffmpeg.org/ffmpeg-formats.html#dshow
   */
  dshow: {
    /** set video size given a string such as 640x480 or hd720. */
    video_size?: string | number;
    /** set video pixel format */
    pixel_format?: string | number;
    /** set video frame rate */
    framerate?: string | number;
    /** set audio sample rate */
    sample_rate?: number | (string & {});
    /** set audio sample size */
    sample_size?: number | (string & {});
    /** set number of audio channels, such as 1 or 2 */
    channels?: number | (string & {});
    /** set audio device buffer latency size in milliseconds (default is the device's default) */
    audio_buffer_size?: number | (string & {});
    /** list available devices */
    list_devices?: boolean | (string & {});
    /** list available options for specified device */
    list_options?: boolean | (string & {});
    /** set video device number for devices with same name (starts at 0) */
    video_device_number?: number | (string & {});
    /** set audio device number for devices with same name (starts at 0) */
    audio_device_number?: number | (string & {});
    /** select video capture pin by name */
    video_pin_name?: string | number;
    /** select audio capture pin by name */
    audio_pin_name?: string | number;
    /** set video input pin number for crossbar device */
    crossbar_video_input_pin_number?: number | (string & {});
    /** set audio input pin number for crossbar device */
    crossbar_audio_input_pin_number?: number | (string & {});
    /** display property dialog for video capture device */
    show_video_device_dialog?: boolean | (string & {});
    /** display property dialog for audio capture device */
    show_audio_device_dialog?: boolean | (string & {});
    /** display property dialog for crossbar connecting pins filter on video device */
    show_video_crossbar_connection_dialog?: boolean | (string & {});
    /** display property dialog for crossbar connecting pins filter on audio device */
    show_audio_crossbar_connection_dialog?: boolean | (string & {});
    /** display property dialog for analog tuner filter */
    show_analog_tv_tuner_dialog?: boolean | (string & {});
    /** display property dialog for analog tuner audio filter */
    show_analog_tv_tuner_audio_dialog?: boolean | (string & {});
    /** load audio capture filter device (and properties) from file */
    audio_device_load?: string | number;
    /** save audio capture filter device (and properties) to file */
    audio_device_save?: string | number;
    /** load video capture filter device (and properties) from file */
    video_device_load?: string | number;
    /** save video capture filter device (and properties) to file */
    video_device_save?: string | number;
    /** use device instead of wallclock timestamps for video frames */
    use_video_device_timestamps?: boolean | (string & {});
  };
  /**
   * DVD-Video
   * @see https://ffmpeg.org/ffmpeg-formats.html#dvdvideo
   */
  dvdvideo: {
    /** playback angle number */
    angle?: number | (string & {});
    /** exit chapter (PTT) number (0=end) */
    chapter_end?: number | (string & {});
    /** entry chapter (PTT) number */
    chapter_start?: number | (string & {});
    /** demux menu domain */
    menu?: boolean | (string & {});
    /** menu language unit */
    menu_lu?: number | (string & {});
    /** menu VTS (0=VMG root menu) */
    menu_vts?: number | (string & {});
    /** entry PG number (when paired with PGC number) */
    pg?: number | (string & {});
    /** entry PGC number (0=auto) */
    pgc?: number | (string & {});
    /** enable for accurate chapter markers, slow (2-pass read) */
    preindex?: boolean | (string & {});
    /** playback region number (0=free) */
    region?: number | (string & {});
    /** title number (0=auto) */
    title?: number | (string & {});
    /** trim padding cells from start */
    trim?: boolean | (string & {});
  };
  /**
   * Electronic Arts Multimedia
   * @see https://ffmpeg.org/ffmpeg-formats.html#ea
   */
  ea: {
    /** return VP6 alpha in the main video stream */
    merge_alpha?: boolean | (string & {});
  };
  /**
   * EVC Annex B
   * @see https://ffmpeg.org/ffmpeg-formats.html#evc
   */
  evc: {
    framerate?: string | number;
  };
  /**
   * Linux framebuffer
   * @see https://ffmpeg.org/ffmpeg-formats.html#fbdev
   */
  fbdev: {
    framerate?: string | number;
  };
  /**
   * Flexible Image Transport System
   * @see https://ffmpeg.org/ffmpeg-formats.html#fits
   */
  fits: {
    /** set the framerate */
    framerate?: string | number;
  };
  /**
   * FLV (Flash Video)
   * @see https://ffmpeg.org/ffmpeg-formats.html#flv
   */
  flv: {
    /** Allocate streams according to the onMetaData array */
    flv_metadata?: boolean | (string & {});
    /** Dump full metadata of the onMetadata */
    flv_full_metadata?: boolean | (string & {});
    /** Ignore the Size of previous tag */
    flv_ignore_prevtag?: boolean | (string & {});
  };
  /**
   * raw big-endian G.726 (\"left aligned\")
   * @see https://ffmpeg.org/ffmpeg-formats.html#g726
   */
  g726: {
    /** Bits per G.726 code */
    code_size?: number | (string & {});
    sample_rate?: number | (string & {});
  };
  /**
   * raw little-endian G.726 (\"right aligned\")
   * @see https://ffmpeg.org/ffmpeg-formats.html#g726le
   */
  g726le: {
    /** Bits per G.726 code */
    code_size?: number | (string & {});
    sample_rate?: number | (string & {});
  };
  /**
   * G.729 raw format demuxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#g729
   */
  g729: {
    bit_rate?: number | (string & {});
  };
  /**
   * GDI API Windows frame grabber
   * @see https://ffmpeg.org/ffmpeg-formats.html#gdigrab
   */
  gdigrab: {
    /** draw the mouse pointer */
    draw_mouse?: number | (string & {});
    /** draw border around capture area */
    show_region?: number | (string & {});
    /** set video frame rate */
    framerate?: string | number;
    /** set video frame size */
    video_size?: string | number;
    /** capture area x offset */
    offset_x?: number | (string & {});
    /** capture area y offset */
    offset_y?: number | (string & {});
  };
  /**
   * CompuServe Graphics Interchange Format (GIF)
   * @see https://ffmpeg.org/ffmpeg-formats.html#gif
   */
  gif: {
    /** minimum valid delay between frames (in hundredths of second) */
    min_delay?: number | (string & {});
    /** maximum valid delay between frames (in hundredths of seconds) */
    max_gif_delay?: number | (string & {});
    /** default delay between frames (in hundredths of second) */
    default_delay?: number | (string & {});
    /** ignore loop setting (netscape extension) */
    ignore_loop?: boolean | (string & {});
  };
  /**
   * raw GSM
   * @see https://ffmpeg.org/ffmpeg-formats.html#gsm
   */
  gsm: {
    sample_rate?: number | (string & {});
  };
  /**
   * CRI HCA
   * @see https://ffmpeg.org/ffmpeg-formats.html#hca
   */
  hca: {
    /** Low key used for handling CRI HCA files */
    hca_lowkey?: number | (string & {});
    /** High key used for handling CRI HCA files */
    hca_highkey?: number | (string & {});
    /** Subkey used for handling CRI HCA files */
    hca_subkey?: number | (string & {});
  };
  /**
   * Apple HTTP Live Streaming
   * @see https://ffmpeg.org/ffmpeg-formats.html#hls
   */
  hls: {
    /** segment index to start live streams at (negative values are from the end) */
    live_start_index?: number | (string & {});
    /** prefer to use #EXT-X-START if it's in playlist instead of live_start_index */
    prefer_x_start?: boolean | (string & {});
    /** List of file extensions that hls is allowed to access */
    allowed_extensions?: string | number;
    /** List of file extensions that hls is allowed to access */
    allowed_segment_extensions?: string | number;
    /** Be picky with all extensions matching */
    extension_picky?: boolean | (string & {});
    /** Maximum number of times a insufficient list is attempted to be reloaded */
    max_reload?: number | (string & {});
    /** The maximum number of times to load m3u8 when it refreshes without new segments */
    m3u8_hold_counters?: number | (string & {});
    /** Use persistent HTTP connections */
    http_persistent?: boolean | (string & {});
    /** Use multiple HTTP connections for fetching segments */
    http_multiple?: boolean | (string & {});
    /** Use HTTP partial requests, 0 = disable, 1 = enable, -1 = auto */
    http_seekable?: boolean | (string & {});
    /** Set options for segment demuxer */
    seg_format_options?: string | number;
    /** Maximum number of times to reload a segment on error. */
    seg_max_retry?: number | (string & {});
  };
  /**
   * libiec61883 (new DV1394) A/V input device
   * @see https://ffmpeg.org/ffmpeg-formats.html#iec61883
   */
  iec61883: {
    /** override autodetection of DV/HDV */
    dvtype?: 'auto' | 'dv' | 'hdv' | (string & {}) | number;
    /** set queue buffer size (in packets) */
    dvbuffer?: number | (string & {});
    /** select one of multiple DV devices by its GUID */
    dvguid?: string | number;
  };
  /**
   * image2 sequence
   * @see https://ffmpeg.org/ffmpeg-formats.html#image2
   */
  image2: {
    /** set pattern type */
    pattern_type?: 'glob' | 'sequence' | 'none' | (string & {}) | number;
    /** set first number in the sequence */
    start_number?: number | (string & {});
    /** set range for looking at the first sequence number */
    start_number_range?: number | (string & {});
    /** set frame timestamp from file's one */
    ts_from_file?: 'none' | 'sec' | 'ns' | (string & {}) | number;
    /** enable metadata containing input path information */
    export_path_metadata?: boolean | (string & {});
    /** set the video framerate */
    framerate?: string | number;
    /** set video pixel format */
    pixel_format?: string | number;
    /** set video size */
    video_size?: string | number;
    /** force loop over input file sequence */
    loop?: boolean | (string & {});
  };
  /**
   * piped image2 sequence
   * @see https://ffmpeg.org/ffmpeg-formats.html#image2pipe
   */
  image2pipe: {
    /** force frame size in bytes */
    frame_size?: number | (string & {});
    /** set the video framerate */
    framerate?: string | number;
    /** set video pixel format */
    pixel_format?: string | number;
    /** set video size */
    video_size?: string | number;
    /** force loop over input file sequence */
    loop?: boolean | (string & {});
  };
  /**
   * IMF (Interoperable Master Format)
   * @see https://ffmpeg.org/ffmpeg-formats.html#imf
   */
  imf: {
    /** Comma-separated paths to ASSETMAP files. */
    assetmaps?: string | number;
  };
  /**
   * JACK Audio Connection Kit
   * @see https://ffmpeg.org/ffmpeg-formats.html#jack
   */
  jack: {
    /** Number of audio channels. */
    channels?: number | (string & {});
  };
  /**
   * KMS screen capture
   * @see https://ffmpeg.org/ffmpeg-formats.html#kmsgrab
   */
  kmsgrab: {
    /** DRM device path */
    device?: string | number;
    /** Pixel format for framebuffer */
    format?: string | number;
    /** DRM format modifier for framebuffer */
    format_modifier?: number | (string & {});
    /** CRTC ID to define capture source */
    crtc_id?: number | (string & {});
    /** Plane ID to define capture source */
    plane_id?: number | (string & {});
    /** Framerate to capture at */
    framerate?: string | number;
  };
  /**
   * KUX (YouKu)
   * @see https://ffmpeg.org/ffmpeg-formats.html#kux
   */
  kux: {
    /** Allocate streams according to the onMetaData array */
    flv_metadata?: boolean | (string & {});
    /** Dump full metadata of the onMetadata */
    flv_full_metadata?: boolean | (string & {});
    /** Ignore the Size of previous tag */
    flv_ignore_prevtag?: boolean | (string & {});
  };
  /**
   * Libavfilter virtual input device
   * @see https://ffmpeg.org/ffmpeg-formats.html#lavfi
   */
  lavfi: {
    /** set libavfilter graph */
    graph?: string | number;
    /** set libavfilter graph filename */
    graph_file?: string | number;
    /** dump graph to stderr */
    dumpgraph?: string | number;
  };
  /**
   * @see https://ffmpeg.org/ffmpeg-formats.html#libcdio
   */
  libcdio: {
    /** set drive reading speed */
    speed?: number | (string & {});
    /** set error recovery mode */
    paranoia_mode?: 'disable' | 'verify' | 'overlap' | 'neverskip' | 'full' | (string & {}) | number;
  };
  /**
   * dc1394 v.2 A/V grab
   * @see https://ffmpeg.org/ffmpeg-formats.html#libdc1394
   */
  libdc1394: {
    /** A string describing frame size, such as 640x480 or hd720. */
    video_size?: string | number;
    pixel_format?: string | number;
    framerate?: string | number;
  };
  /**
   * Game Music Emu demuxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#libgme
   */
  libgme: {
    /** set track that should be played */
    track_index?: number | (string & {});
    /** set sample rate */
    sample_rate?: number | (string & {});
    /** set max file size supported (in bytes) */
    max_size?: number | (string & {});
  };
  /**
   * ModPlug demuxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#libmodplug
   */
  libmodplug: {
    /** Enable noise reduction 0(off)-1(on) */
    noise_reduction?: number | (string & {});
    /** Reverb level 0(quiet)-100(loud) */
    reverb_depth?: number | (string & {});
    /** Reverb delay in ms, usually 40-200ms */
    reverb_delay?: number | (string & {});
    /** XBass level 0(quiet)-100(loud) */
    bass_amount?: number | (string & {});
    /** XBass cutoff in Hz 10-100 */
    bass_range?: number | (string & {});
    /** Surround level 0(quiet)-100(heavy) */
    surround_depth?: number | (string & {});
    /** Surround delay in ms, usually 5-40ms */
    surround_delay?: number | (string & {});
    /** Max file size supported (in bytes). Default is 5MB. Set to 0 for no limit (not recommended) */
    max_size?: number | (string & {});
    /** Color formula */
    video_stream_expr?: string | number;
    /** Make demuxer output a video stream */
    video_stream?: number | (string & {});
    /** Video stream width in char (one char = 8x8px) */
    video_stream_w?: number | (string & {});
    /** Video stream height in char (one char = 8x8px) */
    video_stream_h?: number | (string & {});
    /** Print speed, tempo, order, ... in video stream */
    video_stream_ptxt?: number | (string & {});
  };
  /**
   * Tracker formats (libopenmpt)
   * @see https://ffmpeg.org/ffmpeg-formats.html#libopenmpt
   */
  libopenmpt: {
    /** set sample rate */
    sample_rate?: number | (string & {});
    /** set channel layout */
    layout?: string | number;
    /** set subsong */
    subsong?: 'all' | 'auto' | (string & {}) | number;
  };
  /**
   * live RTMP FLV (Flash Video)
   * @see https://ffmpeg.org/ffmpeg-formats.html#live_005fflv
   */
  live_flv: {
    /** Allocate streams according to the onMetaData array */
    flv_metadata?: boolean | (string & {});
    /** Dump full metadata of the onMetadata */
    flv_full_metadata?: boolean | (string & {});
    /** Ignore the Size of previous tag */
    flv_ignore_prevtag?: boolean | (string & {});
  };
  /**
   * QuickTime / MOV
   * @see https://ffmpeg.org/ffmpeg-formats.html#m4a
   */
  m4a: {
    /** allow using absolute path when opening alias, this is a possible security issue */
    use_absolute_path?: boolean | (string & {});
    /** Seek each stream individually to the closest point */
    seek_streams_individually?: boolean | (string & {});
    /** Ignore the edit list atom. */
    ignore_editlist?: boolean | (string & {});
    /** Modify the AVIndex according to the editlists. Use this option to decode in the order specified by the edits. */
    advanced_editlist?: boolean | (string & {});
    ignore_chapters?: boolean | (string & {});
    /** use mfra for fragment timestamps */
    use_mfra_for?: 'auto' | 'dts' | 'pts' | (string & {}) | number;
    /** use tfdt for fragment timestamps */
    use_tfdt?: boolean | (string & {});
    /** Export unrecognized metadata entries */
    export_all?: boolean | (string & {});
    /** Export full XMP metadata */
    export_xmp?: boolean | (string & {});
    /** Secret bytes for Audible AAX files */
    activation_bytes?: string | number;
    /** AES-128 Key for Audible AAXC files */
    audible_key?: string | number;
    /** AES-128 IV for Audible AAXC files */
    audible_iv?: string | number;
    /** Fixed key used for handling Audible AAX files */
    audible_fixed_key?: string | number;
    /** The default media decryption key (hex) */
    decryption_key?: string | number;
    /** The media decryption keys by KID (hex) */
    decryption_keys?: string | number;
    /** Enable external track support. */
    enable_drefs?: boolean | (string & {});
    /** treat offsets above this value as invalid */
    max_stts_delta?: number | (string & {});
    /** Interleave packets from multiple tracks at demuxer level */
    interleaved_read?: boolean | (string & {});
  };
  /**
   * MacCaption
   * @see https://ffmpeg.org/ffmpeg-formats.html#mcc
   */
  mcc: {
    /** extract EIA-608/708 captions from VANC packets */
    eia608_extract?: boolean | (string & {});
  };
  /**
   * MicroDVD subtitle format
   * @see https://ffmpeg.org/ffmpeg-formats.html#microdvd
   */
  microdvd: {
    /** set the movie frame rate fallback */
    subfps?: string | number;
  };
  /**
   * QuickTime / MOV
   * @see https://ffmpeg.org/ffmpeg-formats.html#mj2
   */
  mj2: {
    /** allow using absolute path when opening alias, this is a possible security issue */
    use_absolute_path?: boolean | (string & {});
    /** Seek each stream individually to the closest point */
    seek_streams_individually?: boolean | (string & {});
    /** Ignore the edit list atom. */
    ignore_editlist?: boolean | (string & {});
    /** Modify the AVIndex according to the editlists. Use this option to decode in the order specified by the edits. */
    advanced_editlist?: boolean | (string & {});
    ignore_chapters?: boolean | (string & {});
    /** use mfra for fragment timestamps */
    use_mfra_for?: 'auto' | 'dts' | 'pts' | (string & {}) | number;
    /** use tfdt for fragment timestamps */
    use_tfdt?: boolean | (string & {});
    /** Export unrecognized metadata entries */
    export_all?: boolean | (string & {});
    /** Export full XMP metadata */
    export_xmp?: boolean | (string & {});
    /** Secret bytes for Audible AAX files */
    activation_bytes?: string | number;
    /** AES-128 Key for Audible AAXC files */
    audible_key?: string | number;
    /** AES-128 IV for Audible AAXC files */
    audible_iv?: string | number;
    /** Fixed key used for handling Audible AAX files */
    audible_fixed_key?: string | number;
    /** The default media decryption key (hex) */
    decryption_key?: string | number;
    /** The media decryption keys by KID (hex) */
    decryption_keys?: string | number;
    /** Enable external track support. */
    enable_drefs?: boolean | (string & {});
    /** treat offsets above this value as invalid */
    max_stts_delta?: number | (string & {});
    /** Interleave packets from multiple tracks at demuxer level */
    interleaved_read?: boolean | (string & {});
  };
  /**
   * QuickTime / MOV
   * @see https://ffmpeg.org/ffmpeg-formats.html#mov
   */
  mov: {
    /** allow using absolute path when opening alias, this is a possible security issue */
    use_absolute_path?: boolean | (string & {});
    /** Seek each stream individually to the closest point */
    seek_streams_individually?: boolean | (string & {});
    /** Ignore the edit list atom. */
    ignore_editlist?: boolean | (string & {});
    /** Modify the AVIndex according to the editlists. Use this option to decode in the order specified by the edits. */
    advanced_editlist?: boolean | (string & {});
    ignore_chapters?: boolean | (string & {});
    /** use mfra for fragment timestamps */
    use_mfra_for?: 'auto' | 'dts' | 'pts' | (string & {}) | number;
    /** use tfdt for fragment timestamps */
    use_tfdt?: boolean | (string & {});
    /** Export unrecognized metadata entries */
    export_all?: boolean | (string & {});
    /** Export full XMP metadata */
    export_xmp?: boolean | (string & {});
    /** Secret bytes for Audible AAX files */
    activation_bytes?: string | number;
    /** AES-128 Key for Audible AAXC files */
    audible_key?: string | number;
    /** AES-128 IV for Audible AAXC files */
    audible_iv?: string | number;
    /** Fixed key used for handling Audible AAX files */
    audible_fixed_key?: string | number;
    /** The default media decryption key (hex) */
    decryption_key?: string | number;
    /** The media decryption keys by KID (hex) */
    decryption_keys?: string | number;
    /** Enable external track support. */
    enable_drefs?: boolean | (string & {});
    /** treat offsets above this value as invalid */
    max_stts_delta?: number | (string & {});
    /** Interleave packets from multiple tracks at demuxer level */
    interleaved_read?: boolean | (string & {});
  };
  /**
   * MP2/3 (MPEG audio layer 2/3)
   * @see https://ffmpeg.org/ffmpeg-formats.html#mp3
   */
  mp3: {
    /** use table of contents */
    usetoc?: boolean | (string & {});
  };
  /**
   * QuickTime / MOV
   * @see https://ffmpeg.org/ffmpeg-formats.html#mp4
   */
  mp4: {
    /** allow using absolute path when opening alias, this is a possible security issue */
    use_absolute_path?: boolean | (string & {});
    /** Seek each stream individually to the closest point */
    seek_streams_individually?: boolean | (string & {});
    /** Ignore the edit list atom. */
    ignore_editlist?: boolean | (string & {});
    /** Modify the AVIndex according to the editlists. Use this option to decode in the order specified by the edits. */
    advanced_editlist?: boolean | (string & {});
    ignore_chapters?: boolean | (string & {});
    /** use mfra for fragment timestamps */
    use_mfra_for?: 'auto' | 'dts' | 'pts' | (string & {}) | number;
    /** use tfdt for fragment timestamps */
    use_tfdt?: boolean | (string & {});
    /** Export unrecognized metadata entries */
    export_all?: boolean | (string & {});
    /** Export full XMP metadata */
    export_xmp?: boolean | (string & {});
    /** Secret bytes for Audible AAX files */
    activation_bytes?: string | number;
    /** AES-128 Key for Audible AAXC files */
    audible_key?: string | number;
    /** AES-128 IV for Audible AAXC files */
    audible_iv?: string | number;
    /** Fixed key used for handling Audible AAX files */
    audible_fixed_key?: string | number;
    /** The default media decryption key (hex) */
    decryption_key?: string | number;
    /** The media decryption keys by KID (hex) */
    decryption_keys?: string | number;
    /** Enable external track support. */
    enable_drefs?: boolean | (string & {});
    /** treat offsets above this value as invalid */
    max_stts_delta?: number | (string & {});
    /** Interleave packets from multiple tracks at demuxer level */
    interleaved_read?: boolean | (string & {});
  };
  /**
   * MPEG-TS (MPEG-2 Transport Stream)
   * @see https://ffmpeg.org/ffmpeg-formats.html#mpegts
   */
  mpegts: {
    /** set size limit for looking up a new synchronization */
    resync_size?: number | (string & {});
    /** transport stream id */
    ts_id?: number | (string & {});
    /** output option carrying the raw packet size */
    ts_packetsize?: number | (string & {});
    /** try to fix pts values of dvb teletext streams */
    fix_teletext_pts?: boolean | (string & {});
    /** scan and combine all PMTs */
    scan_all_pmts?: boolean | (string & {});
    /** skip PMTs for programs not advertised in the PAT */
    skip_unknown_pmt?: boolean | (string & {});
    /** reuse streams when PMT's version/pids change */
    merge_pmt_versions?: boolean | (string & {});
    /** skip changing / adding streams / programs */
    skip_changes?: boolean | (string & {});
    /** skip clearing programs */
    skip_clear?: boolean | (string & {});
    /** maximum size of emitted packet */
    max_packet_size?: number | (string & {});
  };
  /**
   * raw MPEG-TS (MPEG-2 Transport Stream)
   * @see https://ffmpeg.org/ffmpeg-formats.html#mpegtsraw
   */
  mpegtsraw: {
    /** set size limit for looking up a new synchronization */
    resync_size?: number | (string & {});
    /** transport stream id */
    ts_id?: number | (string & {});
    /** output option carrying the raw packet size */
    ts_packetsize?: number | (string & {});
    /** compute exact PCR for each transport stream packet */
    compute_pcr?: boolean | (string & {});
  };
  /**
   * MIME multipart JPEG
   * @see https://ffmpeg.org/ffmpeg-formats.html#mpjpeg
   */
  mpjpeg: {
    /** require MIME boundaries match */
    strict_mime_boundary?: boolean | (string & {});
  };
  /**
   * MXF (Material eXchange Format)
   * @see https://ffmpeg.org/ffmpeg-formats.html#mxf
   */
  mxf: {
    /** extract eia 608 captions from s436m track */
    eia608_extract?: boolean | (string & {});
  };
  /**
   * AV1 low overhead OBU
   * @see https://ffmpeg.org/ffmpeg-formats.html#obu
   */
  obu: {
    framerate?: string | number;
  };
  /**
   * OpenAL audio capture device
   * @see https://ffmpeg.org/ffmpeg-formats.html#openal
   */
  openal: {
    /** set number of channels */
    channels?: number | (string & {});
    /** set sample rate */
    sample_rate?: number | (string & {});
    /** set sample size */
    sample_size?: number | (string & {});
    /** list available devices */
    list_devices?: 'true' | 'false' | (string & {}) | number;
  };
  /**
   * OSS (Open Sound System) capture
   * @see https://ffmpeg.org/ffmpeg-formats.html#oss
   */
  oss: {
    sample_rate?: number | (string & {});
    channels?: number | (string & {});
  };
  /**
   * Pulse audio input
   * @see https://ffmpeg.org/ffmpeg-formats.html#pulse
   */
  pulse: {
    /** set PulseAudio server */
    server?: string | number;
    /** set application name */
    name?: string | number;
    /** set stream description */
    stream_name?: string | number;
    /** set sample rate in Hz */
    sample_rate?: number | (string & {});
    /** set number of audio channels */
    channels?: number | (string & {});
    /** set number of bytes per frame */
    frame_size?: number | (string & {});
    /** set buffering size, affects latency and cpu usage */
    fragment_size?: number | (string & {});
    /** set the initial pts using the current time */
    wallclock?: number | (string & {});
  };
  /**
   * raw video
   * @see https://ffmpeg.org/ffmpeg-formats.html#rawvideo
   */
  rawvideo: {
    /** frame line size in bytes */
    stride?: string | number;
    /** set pixel format */
    pixel_format?: string | number;
    /** set frame size */
    video_size?: string | number;
    /** set frame rate */
    framerate?: string | number;
  };
  /**
   * RTP input
   * @see https://ffmpeg.org/ffmpeg-formats.html#rtp
   */
  rtp: {
    /** set RTP flags */
    rtp_flags?: 'filter_src' | (string & {}) | number;
    /** set maximum timeout (in seconds) to wait for incoming connections */
    listen_timeout?: string | number;
    /** local address */
    localaddr?: string | number;
    /** set media types to accept from the server */
    allowed_media_types?: 'video' | 'audio' | 'data' | 'subtitle' | (string & {}) | number;
    /** set number of packets to buffer for handling of reordered packets */
    reorder_queue_size?: number | (string & {});
    /** Underlying protocol send/receive buffer size */
    buffer_size?: number | (string & {});
    /** Underlying protocol send packet size */
    pkt_size?: number | (string & {});
  };
  /**
   * SBaGen binaural beats script
   * @see https://ffmpeg.org/ffmpeg-formats.html#sbg
   */
  sbg: {
    sample_rate?: number | (string & {});
    frame_size?: number | (string & {});
    max_file_size?: number | (string & {});
  };
  /**
   * SDP
   * @see https://ffmpeg.org/ffmpeg-formats.html#sdp
   */
  sdp: {
    /** SDP flags */
    sdp_flags?: 'filter_src' | 'custom_io' | 'rtcp_to_source' | (string & {}) | number;
    /** set maximum timeout (in seconds) to wait for incoming connections */
    listen_timeout?: string | number;
    /** local address */
    localaddr?: string | number;
    /** set media types to accept from the server */
    allowed_media_types?: 'video' | 'audio' | 'data' | 'subtitle' | (string & {}) | number;
    /** set number of packets to buffer for handling of reordered packets */
    reorder_queue_size?: number | (string & {});
    /** Underlying protocol send/receive buffer size */
    buffer_size?: number | (string & {});
    /** Underlying protocol send packet size */
    pkt_size?: number | (string & {});
  };
  /**
   * SER (Simple uncompressed video format for astronomical capturing)
   * @see https://ffmpeg.org/ffmpeg-formats.html#ser
   */
  ser: {
    /** set frame rate */
    framerate?: string | number;
  };
  /**
   * Asterisk raw pcm
   * @see https://ffmpeg.org/ffmpeg-formats.html#sln
   */
  sln: {
    sample_rate?: number | (string & {});
    ch_layout?: string | number;
  };
  /**
   * sndio audio capture
   * @see https://ffmpeg.org/ffmpeg-formats.html#sndio
   */
  sndio: {
    sample_rate?: number | (string & {});
    channels?: number | (string & {});
  };
  /**
   * TED Talks captions
   * @see https://ffmpeg.org/ffmpeg-formats.html#tedcaptions
   */
  tedcaptions: {
    /** set the start time (offset) of the subtitles, in ms */
    start_time?: number | (string & {});
  };
  /**
   * Tele-typewriter
   * @see https://ffmpeg.org/ffmpeg-formats.html#tty
   */
  tty: {
    chars_per_frame?: number | (string & {});
    /** A string describing frame size, such as 640x480 or hd720. */
    video_size?: string | number;
    framerate?: string | number;
  };
  /**
   * Video4Linux2 device grab
   * @see https://ffmpeg.org/ffmpeg-formats.html#v4l2
   */
  v4l2: {
    /** set TV standard, used only by analog frame grabber */
    standard?: string | number;
    /** set TV channel, used only by frame grabber */
    channel?: number | (string & {});
    /** set frame size */
    video_size?: string | number;
    /** set preferred pixel format */
    pixel_format?: string | number;
    /** set preferred pixel format (for raw video) or codec name */
    input_format?: string | number;
    /** set frame rate */
    framerate?: string | number;
    /** list available formats and exit */
    list_formats?: 'all' | 'raw' | 'compressed' | (string & {}) | number;
    /** list supported standards and exit */
    list_standards?: 'all' | (string & {}) | number;
    /** set type of timestamps for grabbed frames */
    timestamps?: 'default' | 'abs' | 'mono2abs' | (string & {}) | number;
    /** set type of timestamps for grabbed frames */
    ts?: 'default' | 'abs' | 'mono2abs' | (string & {}) | number;
    /** use libv4l2 (v4l-utils) conversion functions */
    use_libv4l2?: boolean | (string & {});
  };
  /**
   * VapourSynth demuxer
   * @see https://ffmpeg.org/ffmpeg-formats.html#vapoursynth
   */
  vapoursynth: {
    /** set max file size supported (in bytes) */
    max_script_size?: number | (string & {});
  };
  /**
   * VfW video capture
   * @see https://ffmpeg.org/ffmpeg-formats.html#vfwcap
   */
  vfwcap: {
    /** A string describing frame size, such as 640x480 or hd720. */
    video_size?: string | number;
    framerate?: string | number;
  };
  /**
   * Video4Linux2 device grab
   * @see https://ffmpeg.org/ffmpeg-formats.html#video4linux2
   */
  video4linux2: {
    /** set TV standard, used only by analog frame grabber */
    standard?: string | number;
    /** set TV channel, used only by frame grabber */
    channel?: number | (string & {});
    /** set frame size */
    video_size?: string | number;
    /** set preferred pixel format */
    pixel_format?: string | number;
    /** set preferred pixel format (for raw video) or codec name */
    input_format?: string | number;
    /** set frame rate */
    framerate?: string | number;
    /** list available formats and exit */
    list_formats?: 'all' | 'raw' | 'compressed' | (string & {}) | number;
    /** list supported standards and exit */
    list_standards?: 'all' | (string & {}) | number;
    /** set type of timestamps for grabbed frames */
    timestamps?: 'default' | 'abs' | 'mono2abs' | (string & {}) | number;
    /** set type of timestamps for grabbed frames */
    ts?: 'default' | 'abs' | 'mono2abs' | (string & {}) | number;
    /** use libv4l2 (v4l-utils) conversion functions */
    use_libv4l2?: boolean | (string & {});
  };
  /**
   * VobSub subtitle format
   * @see https://ffmpeg.org/ffmpeg-formats.html#vobsub
   */
  vobsub: {
    /** URI for .sub file */
    sub_name?: string | number;
  };
  /**
   * WAV / WAVE (Waveform Audio)
   * @see https://ffmpeg.org/ffmpeg-formats.html#wav
   */
  wav: {
    /** Ignore length */
    ignore_length?: boolean | (string & {});
    /** max size of single packet */
    max_size?: number | (string & {});
  };
  /**
   * WebM DASH Manifest
   * @see https://ffmpeg.org/ffmpeg-formats.html#webm_005fdash_005fmanifest
   */
  webm_dash_manifest: {
    /** flag indicating that the input is a live file that only has the headers. */
    live?: boolean | (string & {});
    /** bandwidth of this stream to be specified in the DASH manifest. */
    bandwidth?: number | (string & {});
  };
  /**
   * Animated WebP
   * @see https://ffmpeg.org/ffmpeg-formats.html#webp_005fanim
   */
  webp_anim: {
    /** minimum valid delay between frames (in milliseconds) */
    min_delay?: number | (string & {});
    /** maximum valid delay between frames (in milliseconds) */
    max_webp_delay?: number | (string & {});
    /** default delay between frames (in milliseconds) */
    default_delay?: number | (string & {});
    /** ignore loop setting */
    ignore_loop?: boolean | (string & {});
    /** use background color from ANIM chunk */
    usebgcolor?: boolean | (string & {});
  };
  /**
   * WebVTT subtitle
   * @see https://ffmpeg.org/ffmpeg-formats.html#webvtt
   */
  webvtt: {
    /** Set kind of WebVTT track */
    kind?: 'subtitles' | 'captions' | 'descriptions' | 'metadata' | (string & {}) | number;
  };
  /**
   * X11 screen capture, using XCB
   * @see https://ffmpeg.org/ffmpeg-formats.html#x11grab
   */
  x11grab: {
    /** Window to capture. */
    window_id?: number | (string & {});
    /** Initial x coordinate. */
    x?: number | (string & {});
    /** Initial y coordinate. */
    y?: number | (string & {});
    /** Initial x coordinate. */
    grab_x?: number | (string & {});
    /** Initial y coordinate. */
    grab_y?: number | (string & {});
    /** A string describing frame size, such as 640x480 or hd720. */
    video_size?: string | number;
    framerate?: string | number;
    /** Draw the mouse pointer. */
    draw_mouse?: number | (string & {});
    /** Move the grabbing region when the mouse pointer reaches within specified amount of pixels to the edge of region. */
    follow_mouse?: 'centered' | (string & {}) | number;
    /** Show the grabbing region. */
    show_region?: number | (string & {});
    /** Set the region border thickness. */
    region_border?: number | (string & {});
    /** Select the grabbing region graphically using the pointer. */
    select_region?: boolean | (string & {});
  };
}

/**
 * Loose option bag for formats without generated typings, or for protocol/codec
 * options that flow through the same dictionary (e.g. `rtsp_transport`).
 */
export type UnknownFormatOptions = Record<string, string | number | boolean | bigint | undefined | null>;
