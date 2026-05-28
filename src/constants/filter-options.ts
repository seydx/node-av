/**
 * Auto-generated FFmpeg filter option types.
 * Generated from FFmpeg libavfilter AVOption sources (see scripts/generate-filter-options.js).
 * DO NOT EDIT MANUALLY.
 */

export interface FilterOptionsMap {
  /**
   * Convert input audio to 3d scope video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#a3dscope
   */
  a3dscope: {
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set camera FoV */
    fov?: number;
    /** set camera roll */
    roll?: number;
    /** set camera pitch */
    pitch?: number;
    /** set camera yaw */
    yaw?: number;
    /** set camera zoom */
    xzoom?: number;
    /** set camera zoom */
    yzoom?: number;
    /** set camera zoom */
    zzoom?: number;
    /** set camera position */
    xpos?: number;
    /** set camera position */
    ypos?: number;
    /** set camera position */
    zpos?: number;
    /** set length */
    length?: number;
  };
  /**
   * Apply Affine Projection algorithm to first audio stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aap
   */
  aap: {
    /** set the filter order */
    order?: number;
    /** set the filter projection */
    projection?: number;
    /** set the filter mu */
    mu?: number;
    /** set the filter delta */
    delta?: number;
    /** set output mode */
    out_mode?: 'i' | 'd' | 'o' | 'n' | 'e';
    /** set processing precision */
    precision?: 'auto' | 'float' | 'double';
  };
  /**
   * Benchmark part of a filtergraph.
   * @see https://ffmpeg.org/ffmpeg-filters.html#abench
   */
  abench: {
    /** set action */
    action?: 'start' | 'stop';
  };
  /**
   * Convert input audio to audio bit scope video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#abitscope
   */
  abitscope: {
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set channels colors */
    colors?: string | number;
    /** set output mode */
    mode?: 'bars' | 'trace';
    /** set output mode */
    m?: 'bars' | 'trace';
  };
  /**
   * Buffer audio frames, and make them accessible to the filterchain.
   * @see https://ffmpeg.org/ffmpeg-filters.html#abuffer
   */
  abuffer: {
    time_base?: string | number;
    sample_rate?: number;
    sample_fmt?: string | number;
    channel_layout?: string | number;
    channels?: number;
  };
  /**
   * Buffer audio frames, and make them available to the end of the filter graph.
   * @see https://ffmpeg.org/ffmpeg-filters.html#abuffersink
   */
  abuffersink: {
    /** set the supported sample formats */
    sample_fmts?: string | number;
    /** set the supported sample rates */
    sample_rates?: string | number;
    /** set a '|'-separated list of supported channel layouts */
    ch_layouts?: string | number;
    /** accept all channel counts */
    all_channel_counts?: boolean;
    /** array of supported sample formats */
    sample_formats?: string | number;
    /** array of supported sample formats */
    samplerates?: string | number;
    /** array of supported channel layouts */
    channel_layouts?: string | number;
  };
  /**
   * Audio compressor.
   * @see https://ffmpeg.org/ffmpeg-filters.html#acompressor
   */
  acompressor: {
    /** set input gain */
    level_in?: number;
    /** set mode */
    mode?: 'downward' | 'upward';
    /** set threshold */
    threshold?: number;
    /** set ratio */
    ratio?: number;
    /** set attack */
    attack?: number;
    /** set release */
    release?: number;
    /** set make up gain */
    makeup?: number;
    /** set knee */
    knee?: number;
    /** set link type */
    link?: 'average' | 'maximum';
    /** set detection */
    detection?: 'peak' | 'rms';
    /** set sidechain gain */
    level_sc?: number;
    /** set mix */
    mix?: number;
  };
  /**
   * Simple audio dynamic range compression/expansion filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#acontrast
   */
  acontrast: {
    /** set contrast */
    contrast?: number;
  };
  /**
   * Copy the input audio unchanged to the output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#acopy
   */
  acopy: {};
  /**
   * Cross fade two input audio streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#acrossfade
   */
  acrossfade: {
    /** set number of input files to cross fade */
    inputs?: number;
    /** set number of input files to cross fade */
    n?: number;
    /** set number of samples for cross fade duration */
    nb_samples?: number;
    /** set number of samples for cross fade duration */
    ns?: number;
    /** set cross fade duration */
    duration?: string | number;
    /** set cross fade duration */
    d?: string | number;
    /** overlap 1st stream end with 2nd stream start */
    overlap?: boolean;
    /** overlap 1st stream end with 2nd stream start */
    o?: boolean;
    /** set fade curve type for 1st stream */
    curve1?:
      | 'nofade'
      | 'tri'
      | 'qsin'
      | 'esin'
      | 'hsin'
      | 'log'
      | 'ipar'
      | 'qua'
      | 'cub'
      | 'squ'
      | 'cbr'
      | 'par'
      | 'exp'
      | 'iqsin'
      | 'ihsin'
      | 'dese'
      | 'desi'
      | 'losi'
      | 'sinc'
      | 'isinc'
      | 'quat'
      | 'quatr'
      | 'qsin2'
      | 'hsin2';
    /** set fade curve type for 1st stream */
    c1?:
      | 'nofade'
      | 'tri'
      | 'qsin'
      | 'esin'
      | 'hsin'
      | 'log'
      | 'ipar'
      | 'qua'
      | 'cub'
      | 'squ'
      | 'cbr'
      | 'par'
      | 'exp'
      | 'iqsin'
      | 'ihsin'
      | 'dese'
      | 'desi'
      | 'losi'
      | 'sinc'
      | 'isinc'
      | 'quat'
      | 'quatr'
      | 'qsin2'
      | 'hsin2';
    /** set fade curve type for 2nd stream */
    curve2?:
      | 'nofade'
      | 'tri'
      | 'qsin'
      | 'esin'
      | 'hsin'
      | 'log'
      | 'ipar'
      | 'qua'
      | 'cub'
      | 'squ'
      | 'cbr'
      | 'par'
      | 'exp'
      | 'iqsin'
      | 'ihsin'
      | 'dese'
      | 'desi'
      | 'losi'
      | 'sinc'
      | 'isinc'
      | 'quat'
      | 'quatr'
      | 'qsin2'
      | 'hsin2';
    /** set fade curve type for 2nd stream */
    c2?:
      | 'nofade'
      | 'tri'
      | 'qsin'
      | 'esin'
      | 'hsin'
      | 'log'
      | 'ipar'
      | 'qua'
      | 'cub'
      | 'squ'
      | 'cbr'
      | 'par'
      | 'exp'
      | 'iqsin'
      | 'ihsin'
      | 'dese'
      | 'desi'
      | 'losi'
      | 'sinc'
      | 'isinc'
      | 'quat'
      | 'quatr'
      | 'qsin2'
      | 'hsin2';
  };
  /**
   * Split audio into per-bands streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#acrossover
   */
  acrossover: {
    /** set split frequencies */
    split?: string | number;
    /** set filter order */
    order?: '2nd' | '4th' | '6th' | '8th' | '10th' | '12th' | '14th' | '16th' | '18th' | '20th';
    /** set input gain */
    level?: number;
    /** set output bands gain */
    gain?: string | number;
    /** set processing precision */
    precision?: 'auto' | 'float' | 'double';
  };
  /**
   * Reduce audio bit resolution.
   * @see https://ffmpeg.org/ffmpeg-filters.html#acrusher
   */
  acrusher: {
    /** set level in */
    level_in?: number;
    /** set level out */
    level_out?: number;
    /** set bit reduction */
    bits?: number;
    /** set mix */
    mix?: number;
    /** set mode */
    mode?: 'lin' | 'log';
    /** set DC */
    dc?: number;
    /** set anti-aliasing */
    aa?: number;
    /** set sample reduction */
    samples?: number;
    /** enable LFO */
    lfo?: boolean;
    /** set LFO depth */
    lforange?: number;
    /** set LFO rate */
    lforate?: number;
  };
  /**
   * Delay filtering to match a cue.
   * @see https://ffmpeg.org/ffmpeg-filters.html#acue
   */
  acue: {
    /** cue unix timestamp in microseconds */
    cue?: number;
    /** preroll duration in seconds */
    preroll?: string | number;
    /** buffer duration in seconds */
    buffer?: string | number;
  };
  /**
   * Add region of interest to frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#addroi
   */
  addroi: {
    /** Region distance from left edge of frame. */
    x?: string | number;
    /** Region distance from top edge of frame. */
    y?: string | number;
    /** Region width. */
    w?: string | number;
    /** Region height. */
    h?: string | number;
    /** Quantisation offset to apply in the region. */
    qoffset?: string | number;
    /** Remove any existing regions of interest before adding the new one. */
    clear?: boolean;
  };
  /**
   * Remove impulsive noise from input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#adeclick
   */
  adeclick: {
    /** set window size */
    window?: number;
    /** set window size */
    w?: number;
    /** set window overlap */
    overlap?: number;
    /** set window overlap */
    o?: number;
    /** set autoregression order */
    arorder?: number;
    /** set autoregression order */
    a?: number;
    /** set threshold */
    threshold?: number;
    /** set threshold */
    t?: number;
    /** set burst fusion */
    burst?: number;
    /** set burst fusion */
    b?: number;
    /** set overlap method */
    method?: 'add' | 'a' | 'save' | 's';
    /** set overlap method */
    m?: 'add' | 'a' | 'save' | 's';
  };
  /**
   * Remove clipping from input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#adeclip
   */
  adeclip: {
    /** set window size */
    window?: number;
    /** set window size */
    w?: number;
    /** set window overlap */
    overlap?: number;
    /** set window overlap */
    o?: number;
    /** set autoregression order */
    arorder?: number;
    /** set autoregression order */
    a?: number;
    /** set threshold */
    threshold?: number;
    /** set threshold */
    t?: number;
    /** set histogram size */
    hsize?: number;
    /** set histogram size */
    n?: number;
    /** set overlap method */
    method?: 'add' | 'a' | 'save' | 's';
    /** set overlap method */
    m?: 'add' | 'a' | 'save' | 's';
  };
  /**
   * Apply decorrelation to input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#adecorrelate
   */
  adecorrelate: {
    /** set filtering stages */
    stages?: number;
    /** set random seed */
    seed?: number;
  };
  /**
   * Delay one or more audio channels.
   * @see https://ffmpeg.org/ffmpeg-filters.html#adelay
   */
  adelay: {
    /** set list of delays for each channel */
    delays?: string | number;
    /** use last available delay for remained channels */
    all?: boolean;
  };
  /**
   * Remedy denormals by adding extremely low-level noise.
   * @see https://ffmpeg.org/ffmpeg-filters.html#adenorm
   */
  adenorm: {
    /** set level */
    level?: number;
    /** set type */
    type?: 'dc' | 'ac' | 'square' | 'pulse';
  };
  /**
   * Compute derivative of input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aderivative
   */
  aderivative: {};
  /**
   * Draw a graph using input audio metadata.
   * @see https://ffmpeg.org/ffmpeg-filters.html#adrawgraph
   */
  adrawgraph: {
    /** set 1st metadata key */
    m1?: string | number;
    /** set 1st foreground color expression */
    fg1?: string | number;
    /** set 2nd metadata key */
    m2?: string | number;
    /** set 2nd foreground color expression */
    fg2?: string | number;
    /** set 3rd metadata key */
    m3?: string | number;
    /** set 3rd foreground color expression */
    fg3?: string | number;
    /** set 4th metadata key */
    m4?: string | number;
    /** set 4th foreground color expression */
    fg4?: string | number;
    /** set background color */
    bg?: string | number;
    /** set minimal value */
    min?: number;
    /** set maximal value */
    max?: number;
    /** set graph mode */
    mode?: 'bar' | 'dot' | 'line';
    /** set slide mode */
    slide?: 'frame' | 'replace' | 'scroll' | 'rscroll' | 'picture';
    /** set graph size */
    size?: string | number;
    /** set graph size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
  };
  /**
   * Audio Spectral Dynamic Range Controller.
   * @see https://ffmpeg.org/ffmpeg-filters.html#adrc
   */
  adrc: {
    /** set the transfer expression */
    transfer?: string | number;
    /** set the attack */
    attack?: number;
    /** set the release */
    release?: number;
    /** set channels to filter */
    channels?: string | number;
  };
  /**
   * Apply Dynamic Equalization of input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#adynamicequalizer
   */
  adynamicequalizer: {
    /** set detection threshold */
    threshold?: number;
    /** set detection frequency */
    dfrequency?: number;
    /** set detection Q factor */
    dqfactor?: number;
    /** set target frequency */
    tfrequency?: number;
    /** set target Q factor */
    tqfactor?: number;
    /** set detection attack duration */
    attack?: number;
    /** set detection release duration */
    release?: number;
    /** set ratio factor */
    ratio?: number;
    /** set makeup gain */
    makeup?: number;
    /** set max gain */
    range?: number;
    /** set mode */
    mode?: 'listen' | 'cutbelow' | 'cutabove' | 'boostbelow' | 'boostabove';
    /** set detection filter type */
    dftype?: 'bandpass' | 'lowpass' | 'highpass' | 'peak';
    /** set target filter type */
    tftype?: 'bell' | 'lowshelf' | 'highshelf';
    /** set auto threshold */
    auto?: 'disabled' | 'off' | 'on' | 'adaptive';
    /** set processing precision */
    precision?: 'auto' | 'float' | 'double';
  };
  /**
   * Apply Dynamic Smoothing of input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#adynamicsmooth
   */
  adynamicsmooth: {
    /** set smooth sensitivity */
    sensitivity?: number;
    /** set base frequency */
    basefreq?: number;
  };
  /**
   * Add echoing to the audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aecho
   */
  aecho: {
    /** set signal input gain */
    in_gain?: number;
    /** set signal output gain */
    out_gain?: number;
    /** set list of signal delays */
    delays?: string | number;
    /** set list of signal decays */
    decays?: string | number;
  };
  /**
   * Audio emphasis.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aemphasis
   */
  aemphasis: {
    /** set input gain */
    level_in?: number;
    /** set output gain */
    level_out?: number;
    /** set filter mode */
    mode?: 'reproduction' | 'production';
    /** set filter type */
    type?: 'col' | 'emi' | 'bsi' | 'riaa' | 'cd' | '50fm' | '75fm' | '50kf' | '75kf';
  };
  /**
   * Filter audio signal according to a specified expression.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aeval
   */
  aeval: {
    /** set the '|'-separated list of channels expressions */
    exprs?: string | number;
    /** set channel layout */
    channel_layout?: string | number;
    /** set channel layout */
    c?: string | number;
  };
  /**
   * Generate an audio signal generated by an expression.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aevalsrc
   */
  aevalsrc: {
    /** set the '|'-separated list of channels expressions */
    exprs?: string | number;
    /** set the number of samples per requested frame */
    nb_samples?: number;
    /** set the number of samples per requested frame */
    n?: number;
    /** set the sample rate */
    sample_rate?: string | number;
    /** set the sample rate */
    s?: string | number;
    /** set audio duration */
    duration?: string | number;
    /** set audio duration */
    d?: string | number;
    /** set channel layout */
    channel_layout?: string | number;
    /** set channel layout */
    c?: string | number;
  };
  /**
   * Enhance high frequency part of audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aexciter
   */
  aexciter: {
    /** set level in */
    level_in?: number;
    /** set level out */
    level_out?: number;
    /** set amount */
    amount?: number;
    /** set harmonics */
    drive?: number;
    /** set blend harmonics */
    blend?: number;
    /** set scope */
    freq?: number;
    /** set ceiling */
    ceil?: number;
    /** enable listen mode */
    listen?: boolean;
  };
  /**
   * Fade in/out input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#afade
   */
  afade: {
    /** set the fade direction */
    type?: 'in' | 'out';
    /** set the fade direction */
    t?: 'in' | 'out';
    /** set number of first sample to start fading */
    start_sample?: number;
    /** set number of first sample to start fading */
    ss?: number;
    /** set number of samples for fade duration */
    nb_samples?: number;
    /** set number of samples for fade duration */
    ns?: number;
    /** set time to start fading */
    start_time?: string | number;
    /** set time to start fading */
    st?: string | number;
    /** set fade duration */
    duration?: string | number;
    /** set fade duration */
    d?: string | number;
    /** set fade curve type */
    curve?:
      | 'nofade'
      | 'tri'
      | 'qsin'
      | 'esin'
      | 'hsin'
      | 'log'
      | 'ipar'
      | 'qua'
      | 'cub'
      | 'squ'
      | 'cbr'
      | 'par'
      | 'exp'
      | 'iqsin'
      | 'ihsin'
      | 'dese'
      | 'desi'
      | 'losi'
      | 'sinc'
      | 'isinc'
      | 'quat'
      | 'quatr'
      | 'qsin2'
      | 'hsin2';
    /** set fade curve type */
    c?:
      | 'nofade'
      | 'tri'
      | 'qsin'
      | 'esin'
      | 'hsin'
      | 'log'
      | 'ipar'
      | 'qua'
      | 'cub'
      | 'squ'
      | 'cbr'
      | 'par'
      | 'exp'
      | 'iqsin'
      | 'ihsin'
      | 'dese'
      | 'desi'
      | 'losi'
      | 'sinc'
      | 'isinc'
      | 'quat'
      | 'quatr'
      | 'qsin2'
      | 'hsin2';
    /** set the silence gain */
    silence?: number;
    /** set the unity gain */
    unity?: number;
  };
  /**
   * Generate a Fractional delay FIR coefficients.
   * @see https://ffmpeg.org/ffmpeg-filters.html#afdelaysrc
   */
  afdelaysrc: {
    /** set fractional delay */
    delay?: number;
    /** set fractional delay */
    d?: number;
    /** set sample rate */
    sample_rate?: number;
    /** set sample rate */
    r?: number;
    /** set the number of samples per requested frame */
    nb_samples?: number;
    /** set the number of samples per requested frame */
    n?: number;
    /** set number of taps for delay filter */
    taps?: number;
    /** set number of taps for delay filter */
    t?: number;
    /** set channel layout */
    channel_layout?: string | number;
    /** set channel layout */
    c?: string | number;
  };
  /**
   * Denoise audio samples using FFT.
   * @see https://ffmpeg.org/ffmpeg-filters.html#afftdn
   */
  afftdn: {
    /** set the noise reduction */
    noise_reduction?: number;
    /** set the noise reduction */
    nr?: number;
    /** set the noise floor */
    noise_floor?: number;
    /** set the noise floor */
    nf?: number;
    /** set the noise type */
    noise_type?: 'white' | 'w' | 'vinyl' | 'v' | 'shellac' | 's' | 'custom' | 'c';
    /** set the noise type */
    nt?: 'white' | 'w' | 'vinyl' | 'v' | 'shellac' | 's' | 'custom' | 'c';
    /** set the custom bands noise */
    band_noise?: string | number;
    /** set the custom bands noise */
    bn?: string | number;
    /** set the residual floor */
    residual_floor?: number;
    /** set the residual floor */
    rf?: number;
    /** track noise */
    track_noise?: boolean;
    /** track noise */
    tn?: boolean;
    /** track residual */
    track_residual?: boolean;
    /** track residual */
    tr?: boolean;
    /** set output mode */
    output_mode?: 'input' | 'i' | 'output' | 'o' | 'noise' | 'n';
    /** set output mode */
    om?: 'input' | 'i' | 'output' | 'o' | 'noise' | 'n';
    /** set adaptivity factor */
    adaptivity?: number;
    /** set adaptivity factor */
    ad?: number;
    /** set noise floor offset factor */
    floor_offset?: number;
    /** set noise floor offset factor */
    fo?: number;
    /** set the noise floor link */
    noise_link?: 'none' | 'min' | 'max' | 'average';
    /** set the noise floor link */
    nl?: 'none' | 'min' | 'max' | 'average';
    /** set band multiplier */
    band_multiplier?: number;
    /** set band multiplier */
    bm?: number;
    /** set sample noise mode */
    sample_noise?: 'none' | 'start' | 'begin' | 'stop' | 'end';
    /** set sample noise mode */
    sn?: 'none' | 'start' | 'begin' | 'stop' | 'end';
    /** set gain smooth radius */
    gain_smooth?: number;
    /** set gain smooth radius */
    gs?: number;
  };
  /**
   * Apply arbitrary expressions to samples in frequency domain.
   * @see https://ffmpeg.org/ffmpeg-filters.html#afftfilt
   */
  afftfilt: {
    /** set channels real expressions */
    real?: string | number;
    /** set channels imaginary expressions */
    imag?: string | number;
    /** set window size */
    win_size?: number;
    /** set window function */
    win_func?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
    /** set window overlap */
    overlap?: number;
  };
  /**
   * Apply Finite Impulse Response filter with supplied coefficients in additional stream(s).
   * @see https://ffmpeg.org/ffmpeg-filters.html#afir
   */
  afir: {
    /** set dry gain */
    dry?: number;
    /** set wet gain */
    wet?: number;
    /** set IR length */
    length?: number;
    /** set IR auto gain type */
    gtype?: 'none' | 'peak' | 'dc' | 'gn' | 'ac' | 'rms';
    /** set IR norm */
    irnorm?: number;
    /** set IR link */
    irlink?: boolean;
    /** set IR gain */
    irgain?: number;
    /** set IR format */
    irfmt?: 'mono' | 'input';
    /** set max IR length */
    maxir?: number;
    /** show IR frequency response */
    response?: boolean;
    /** set IR channel to display frequency response */
    channel?: number;
    /** set video size */
    size?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set min partition size */
    minp?: number;
    /** set max partition size */
    maxp?: number;
    /** set number of input IRs */
    nbirs?: number;
    /** select IR */
    ir?: number;
    /** set processing precision */
    precision?: 'auto' | 'float' | 'double';
    /** set IR loading type */
    irload?: 'init' | 'access';
  };
  /**
   * Generate a FIR equalizer coefficients audio stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#afireqsrc
   */
  afireqsrc: {
    /** set equalizer preset */
    preset?: 'custom';
    /** set equalizer preset */
    p?: 'custom';
    /** set gain values per band */
    gains?: string | number;
    /** set gain values per band */
    g?: string | number;
    /** set central frequency values per band */
    bands?: string | number;
    /** set central frequency values per band */
    b?: string | number;
    /** set number of taps */
    taps?: number;
    /** set number of taps */
    t?: number;
    /** set sample rate */
    sample_rate?: number;
    /** set sample rate */
    r?: number;
    /** set the number of samples per requested frame */
    nb_samples?: number;
    /** set the number of samples per requested frame */
    n?: number;
    /** set the interpolation */
    interp?: 'linear' | 'cubic';
    /** set the interpolation */
    i?: 'linear' | 'cubic';
    /** set the phase */
    phase?: 'linear' | 'min';
    /** set the phase */
    h?: 'linear' | 'min';
  };
  /**
   * Generate a FIR coefficients audio stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#afirsrc
   */
  afirsrc: {
    /** set number of taps */
    taps?: number;
    /** set number of taps */
    t?: number;
    /** set frequency points */
    frequency?: string | number;
    /** set frequency points */
    f?: string | number;
    /** set magnitude values */
    magnitude?: string | number;
    /** set magnitude values */
    m?: string | number;
    /** set phase values */
    phase?: string | number;
    /** set phase values */
    p?: string | number;
    /** set sample rate */
    sample_rate?: number;
    /** set sample rate */
    r?: number;
    /** set the number of samples per requested frame */
    nb_samples?: number;
    /** set the number of samples per requested frame */
    n?: number;
    /** set window function */
    win_func?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
    /** set window function */
    w?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
  };
  /**
   * Convert the input audio to one of the specified formats.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aformat
   */
  aformat: {
    /** A '|'-separated list of sample formats. */
    sample_fmts?: string | number;
    /** A '|'-separated list of sample formats. */
    f?: string | number;
    /** A '|'-separated list of sample rates. */
    sample_rates?: string | number;
    /** A '|'-separated list of sample rates. */
    r?: string | number;
    /** A '|'-separated list of channel layouts. */
    channel_layouts?: string | number;
    /** A '|'-separated list of channel layouts. */
    cl?: string | number;
  };
  /**
   * Apply frequency shifting to input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#afreqshift
   */
  afreqshift: {
    /** set frequency shift */
    shift?: number;
    /** set output level */
    level?: number;
    /** set filter order */
    order?: number;
  };
  /**
   * Denoise audio stream using Wavelets.
   * @see https://ffmpeg.org/ffmpeg-filters.html#afwtdn
   */
  afwtdn: {
    /** set noise sigma */
    sigma?: number;
    /** set number of wavelet levels */
    levels?: number;
    /** set wavelet type */
    wavet?: 'sym2' | 'sym4' | 'rbior68' | 'deb10' | 'sym10' | 'coif5' | 'bl3';
    /** set percent of full denoising */
    percent?: number;
    /** profile noise */
    profile?: boolean;
    /** adaptive profiling of noise */
    adaptive?: boolean;
    /** set frame size in number of samples */
    samples?: number;
    /** set thresholding softness */
    softness?: number;
  };
  /**
   * Audio gate.
   * @see https://ffmpeg.org/ffmpeg-filters.html#agate
   */
  agate: {
    /** set input level */
    level_in?: number;
    /** set mode */
    mode?: 'downward' | 'upward';
    /** set max gain reduction */
    range?: number;
    /** set threshold */
    threshold?: number;
    /** set ratio */
    ratio?: number;
    /** set attack */
    attack?: number;
    /** set release */
    release?: number;
    /** set makeup gain */
    makeup?: number;
    /** set knee */
    knee?: number;
    /** set detection */
    detection?: 'peak' | 'rms';
    /** set link */
    link?: 'average' | 'maximum';
    /** set sidechain gain */
    level_sc?: number;
  };
  /**
   * Show various filtergraph stats.
   * @see https://ffmpeg.org/ffmpeg-filters.html#agraphmonitor
   */
  agraphmonitor: {
    /** set monitor size */
    size?: string | number;
    /** set monitor size */
    s?: string | number;
    /** set video opacity */
    opacity?: number;
    /** set video opacity */
    o?: number;
    /** set mode */
    mode?: 'full' | 'compact' | 'nozero' | 'noeof' | 'nodisabled' | (string & {});
    /** set mode */
    m?: 'full' | 'compact' | 'nozero' | 'noeof' | 'nodisabled' | (string & {});
    /** set flags */
    flags?:
      | 'none'
      | 'all'
      | 'queue'
      | 'frame_count_in'
      | 'frame_count_out'
      | 'frame_count_delta'
      | 'pts'
      | 'pts_delta'
      | 'time'
      | 'time_delta'
      | 'timebase'
      | 'format'
      | 'size'
      | 'rate'
      | 'eof'
      | 'sample_count_in'
      | 'sample_count_out'
      | 'sample_count_delta'
      | 'disabled'
      | (string & {});
    /** set flags */
    f?:
      | 'none'
      | 'all'
      | 'queue'
      | 'frame_count_in'
      | 'frame_count_out'
      | 'frame_count_delta'
      | 'pts'
      | 'pts_delta'
      | 'time'
      | 'time_delta'
      | 'timebase'
      | 'format'
      | 'size'
      | 'rate'
      | 'eof'
      | 'sample_count_in'
      | 'sample_count_out'
      | 'sample_count_delta'
      | 'disabled'
      | (string & {});
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
  };
  /**
   * Convert input audio to histogram video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ahistogram
   */
  ahistogram: {
    /** set method to display channels */
    dmode?: 'single' | 'separate';
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set display scale */
    scale?: 'log' | 'sqrt' | 'cbrt' | 'lin' | 'rlog';
    /** set amplitude scale */
    ascale?: 'log' | 'lin';
    /** how much frames to accumulate */
    acount?: number;
    /** set histogram ratio of window height */
    rheight?: number;
    /** set sonogram sliding */
    slide?: 'replace' | 'scroll';
    /** set histograms mode */
    hmode?: 'abs' | 'sign';
  };
  /**
   * Apply Infinite Impulse Response filter with supplied coefficients.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aiir
   */
  aiir: {
    /** set B/numerator/zeros/reflection coefficients */
    zeros?: string | number;
    /** set B/numerator/zeros/reflection coefficients */
    z?: string | number;
    /** set A/denominator/poles/ladder coefficients */
    poles?: string | number;
    /** set A/denominator/poles/ladder coefficients */
    p?: string | number;
    /** set channels gains */
    gains?: string | number;
    /** set channels gains */
    k?: string | number;
    /** set dry gain */
    dry?: number;
    /** set wet gain */
    wet?: number;
    /** set coefficients format */
    format?: 'll' | 'sf' | 'tf' | 'zp' | 'pr' | 'pd' | 'sp';
    /** set coefficients format */
    f?: 'll' | 'sf' | 'tf' | 'zp' | 'pr' | 'pd' | 'sp';
    /** set kind of processing */
    process?: 'd' | 's' | 'p';
    /** set kind of processing */
    r?: 'd' | 's' | 'p';
    /** set filtering precision */
    precision?: 'dbl' | 'flt' | 'i32' | 'i16';
    /** set precision */
    e?: 'dbl' | 'flt' | 'i32' | 'i16';
    /** normalize coefficients */
    normalize?: boolean;
    /** normalize coefficients */
    n?: boolean;
    /** set mix */
    mix?: number;
    /** show IR frequency response */
    response?: boolean;
    /** set IR channel to display frequency response */
    channel?: number;
    /** set video size */
    size?: string | number;
    /** set video rate */
    rate?: string | number;
  };
  /**
   * Compute integral of input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aintegral
   */
  aintegral: {};
  /**
   * Temporally interleave audio inputs.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ainterleave
   */
  ainterleave: {
    /** set number of inputs */
    nb_inputs?: number;
    /** set number of inputs */
    n?: number;
    /** how to determine the end-of-stream */
    duration?: 'longest' | 'shortest' | 'first';
  };
  /**
   * Report audio filtering latency.
   * @see https://ffmpeg.org/ffmpeg-filters.html#alatency
   */
  alatency: {};
  /**
   * Audio lookahead limiter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#alimiter
   */
  alimiter: {
    /** set input level */
    level_in?: number;
    /** set output level */
    level_out?: number;
    /** set limit */
    limit?: number;
    /** set attack */
    attack?: number;
    /** set release */
    release?: number;
    /** enable asc */
    asc?: boolean;
    /** set asc level */
    asc_level?: number;
    /** auto level */
    level?: boolean;
    /** compensate delay */
    latency?: boolean;
  };
  /**
   * Generate all RGB colors.
   * @see https://ffmpeg.org/ffmpeg-filters.html#allrgb
   */
  allrgb: {
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
  };
  /**
   * Generate all yuv colors.
   * @see https://ffmpeg.org/ffmpeg-filters.html#allyuv
   */
  allyuv: {
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
  };
  /**
   * Loop audio samples.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aloop
   */
  aloop: {
    /** number of loops */
    loop?: number;
    /** max number of samples to loop */
    size?: number;
    /** set the loop start sample */
    start?: number;
    /** set the loop start time */
    time?: string | number;
  };
  /**
   * Extract an alpha channel as a
   * @see https://ffmpeg.org/ffmpeg-filters.html#alphaextract
   */
  alphaextract: {};
  /**
   * Copy the luma value of the second
   * @see https://ffmpeg.org/ffmpeg-filters.html#alphamerge
   */
  alphamerge: {
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Provide a blank video input with alpha channel.
   * @see https://ffmpeg.org/ffmpeg-filters.html#alphasrc
   */
  alphasrc: {
    /** set the duration of the video */
    duration?: string | number;
    /** set the duration of the video */
    d?: string | number;
    /** set the start timestamp of the video */
    start?: string | number;
    /** set the frame rate of the video */
    rate?: string | number;
    /** set the frame rate of the video */
    r?: string | number;
    /** set the size of the video */
    size?: string | number;
    /** set the size of the video */
    s?: string | number;
  };
  /**
   * Merge two or more audio streams into
   * @see https://ffmpeg.org/ffmpeg-filters.html#amerge
   */
  amerge: {
    /** specify the number of inputs */
    inputs?: number;
    /** method used to determine the output channel layout */
    layout_mode?: 'legacy' | 'reset' | 'normal';
  };
  /**
   * Manipulate audio frame metadata.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ametadata
   */
  ametadata: {
    /** set a mode of operation */
    mode?: 'select' | 'add' | 'modify' | 'delete' | 'print';
    /** set metadata key */
    key?: string | number;
    /** set metadata value */
    value?: string | number;
    /** function for comparing values */
    function?: 'same_str' | 'starts_with' | 'less' | 'equal' | 'greater' | 'expr' | 'ends_with';
    /** set expression for expr function */
    expr?: string | number;
    /** set file where to print metadata information */
    file?: string | number;
    /** reduce buffering when printing to user-set file or pipe */
    direct?: boolean;
  };
  /**
   * Audio mixing.
   * @see https://ffmpeg.org/ffmpeg-filters.html#amix
   */
  amix: {
    /** Number of inputs. */
    inputs?: number;
    /** How to determine the end-of-stream. */
    duration?: 'longest' | 'shortest' | 'first';
    /** Transition time, in seconds, for volume  */
    dropout_transition?: number;
    /** Set weight for each input. */
    weights?: string | number;
    /** Scale inputs */
    normalize?: boolean;
  };
  /**
   * Read audio from a movie source.
   * @see https://ffmpeg.org/ffmpeg-filters.html#amovie
   */
  amovie: {
    filename?: string | number;
    /** set format name */
    format_name?: string | number;
    /** set format name */
    f?: string | number;
    /** set stream index */
    stream_index?: number;
    /** set stream index */
    si?: number;
    /** set seekpoint (seconds) */
    seek_point?: number;
    /** set seekpoint (seconds) */
    sp?: number;
    /** set streams */
    streams?: string | number;
    /** set streams */
    s?: string | number;
    /** set loop count */
    loop?: number;
    /** set discontinuity threshold */
    discontinuity?: string | number;
    /** set the number of threads for decoding */
    dec_threads?: number;
    /** set format options for the opened file */
    format_opts?: string | number;
  };
  /**
   * Amplify changes between successive video frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#amplify
   */
  amplify: {
    /** set radius */
    radius?: number;
    /** set factor */
    factor?: number;
    /** set threshold */
    threshold?: number;
    /** set tolerance */
    tolerance?: number;
    /** set low limit for amplification */
    low?: number;
    /** set high limit for amplification */
    high?: number;
    /** set what planes to filter */
    planes?: string;
  };
  /**
   * Multiply two audio streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#amultiply
   */
  amultiply: {};
  /**
   * Apply high-order audio parametric multi band equalizer.
   * @see https://ffmpeg.org/ffmpeg-filters.html#anequalizer
   */
  anequalizer: {
    params?: string | number;
    /** draw frequency response curves */
    curves?: boolean;
    /** set video size */
    size?: string | number;
    /** set max gain */
    mgain?: number;
    /** set frequency scale */
    fscale?: 'lin' | 'log';
    /** set channels curves colors */
    colors?: string | number;
  };
  /**
   * Reduce broadband noise from stream using Non-Local Means.
   * @see https://ffmpeg.org/ffmpeg-filters.html#anlmdn
   */
  anlmdn: {
    /** set denoising strength */
    strength?: number;
    /** set denoising strength */
    s?: number;
    /** set patch duration */
    patch?: string | number;
    /** set patch duration */
    p?: string | number;
    /** set research duration */
    research?: string | number;
    /** set research duration */
    r?: string | number;
    /** set output mode */
    output?: 'i' | 'o' | 'n';
    /** set output mode */
    o?: 'i' | 'o' | 'n';
    /** set smooth factor */
    smooth?: number;
    /** set smooth factor */
    m?: number;
  };
  /**
   * Apply Normalized Least-Mean-Fourth algorithm to first audio stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#anlmf
   */
  anlmf: {
    /** set the filter order */
    order?: number;
    /** set the filter mu */
    mu?: number;
    /** set the filter eps */
    eps?: number;
    /** set the filter leakage */
    leakage?: number;
    /** set output mode */
    out_mode?: 'i' | 'd' | 'o' | 'n' | 'e';
    /** set processing precision */
    precision?: 'auto' | 'float' | 'double';
  };
  /**
   * Apply Normalized Least-Mean-Squares algorithm to first audio stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#anlms
   */
  anlms: {
    /** set the filter order */
    order?: number;
    /** set the filter mu */
    mu?: number;
    /** set the filter eps */
    eps?: number;
    /** set the filter leakage */
    leakage?: number;
    /** set output mode */
    out_mode?: 'i' | 'd' | 'o' | 'n' | 'e';
    /** set processing precision */
    precision?: 'auto' | 'float' | 'double';
  };
  /**
   * Generate a noise audio signal.
   * @see https://ffmpeg.org/ffmpeg-filters.html#anoisesrc
   */
  anoisesrc: {
    /** set sample rate */
    sample_rate?: number;
    /** set sample rate */
    r?: number;
    /** set amplitude */
    amplitude?: number;
    /** set amplitude */
    a?: number;
    /** set duration */
    duration?: string | number;
    /** set duration */
    d?: string | number;
    /** set noise color */
    color?: 'white' | 'pink' | 'brown' | 'blue' | 'violet' | 'velvet';
    /** set noise color */
    colour?: 'white' | 'pink' | 'brown' | 'blue' | 'violet' | 'velvet';
    /** set noise color */
    c?: 'white' | 'pink' | 'brown' | 'blue' | 'violet' | 'velvet';
    /** set random seed */
    seed?: number;
    /** set random seed */
    s?: number;
    /** set the number of samples per requested frame */
    nb_samples?: number;
    /** set the number of samples per requested frame */
    n?: number;
    /** set density */
    density?: number;
  };
  /**
   * Pass the source unchanged to the output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#anull
   */
  anull: {};
  /**
   * Do absolutely nothing with the input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#anullsink
   */
  anullsink: {};
  /**
   * Null audio source, return empty audio frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#anullsrc
   */
  anullsrc: {
    /** set channel_layout */
    channel_layout?: string | number;
    /** set channel_layout */
    cl?: string | number;
    /** set sample rate */
    sample_rate?: number;
    /** set sample rate */
    r?: number;
    /** set the number of samples per requested frame */
    nb_samples?: number;
    /** set the number of samples per requested frame */
    n?: number;
    /** set the audio duration */
    duration?: string | number;
    /** set the audio duration */
    d?: string | number;
  };
  /**
   * Pad audio with silence.
   * @see https://ffmpeg.org/ffmpeg-filters.html#apad
   */
  apad: {
    /** set silence packet size */
    packet_size?: number;
    /** set number of samples of silence to add */
    pad_len?: number;
    /** set minimum target number of samples in the audio stream */
    whole_len?: number;
    /** set duration of silence to add */
    pad_dur?: string | number;
    /** set minimum target duration in the audio stream */
    whole_dur?: string | number;
  };
  /**
   * Set permissions for the output audio frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aperms
   */
  aperms: {
    /** select permissions mode */
    mode?: 'none' | 'ro' | 'rw' | 'toggle' | 'random';
    /** set the seed for the random mode */
    seed?: number;
  };
  /**
   * Convert input audio to phase meter video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aphasemeter
   */
  aphasemeter: {
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set red contrast */
    rc?: number;
    /** set green contrast */
    gc?: number;
    /** set blue contrast */
    bc?: number;
    /** set median phase color */
    mpc?: string | number;
    /** set video output */
    video?: boolean;
    /** set mono and out-of-phase detection output */
    phasing?: boolean;
    /** set phase tolerance for mono detection */
    tolerance?: number;
    /** set phase tolerance for mono detection */
    t?: number;
    /** set angle threshold for out-of-phase detection */
    angle?: number;
    /** set angle threshold for out-of-phase detection */
    a?: number;
    /** set minimum mono or out-of-phase duration in seconds */
    duration?: string | number;
    /** set minimum mono or out-of-phase duration in seconds */
    d?: string | number;
  };
  /**
   * Add a phasing effect to the audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aphaser
   */
  aphaser: {
    /** set input gain */
    in_gain?: number;
    /** set output gain */
    out_gain?: number;
    /** set delay in milliseconds */
    delay?: number;
    /** set decay */
    decay?: number;
    /** set modulation speed */
    speed?: number;
    /** set modulation type */
    type?: 'triangular' | 't' | 'sinusoidal' | 's';
  };
  /**
   * Apply phase shifting to input audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aphaseshift
   */
  aphaseshift: {
    /** set phase shift */
    shift?: number;
    /** set output level */
    level?: number;
    /** set filter order */
    order?: number;
  };
  /**
   * Measure Audio Peak Signal-to-Noise Ratio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#apsnr
   */
  apsnr: {};
  /**
   * Audio Psychoacoustic Clipper.
   * @see https://ffmpeg.org/ffmpeg-filters.html#apsyclip
   */
  apsyclip: {
    /** set input level */
    level_in?: number;
    /** set output level */
    level_out?: number;
    /** set clip level */
    clip?: number;
    /** enable difference */
    diff?: boolean;
    /** set adaptive distortion */
    adaptive?: number;
    /** set iterations */
    iterations?: number;
    /** set auto level */
    level?: boolean;
  };
  /**
   * Audio pulsator.
   * @see https://ffmpeg.org/ffmpeg-filters.html#apulsator
   */
  apulsator: {
    /** set input gain */
    level_in?: number;
    /** set output gain */
    level_out?: number;
    /** set mode */
    mode?: 'sine' | 'triangle' | 'square' | 'sawup' | 'sawdown';
    /** set modulation */
    amount?: number;
    /** set offset L */
    offset_l?: number;
    /** set offset R */
    offset_r?: number;
    /** set pulse width */
    width?: number;
    /** set timing */
    timing?: 'bpm' | 'ms' | 'hz';
    /** set BPM */
    bpm?: number;
    /** set ms */
    ms?: number;
    /** set frequency */
    hz?: number;
  };
  /**
   * Slow down filtering to match realtime.
   * @see https://ffmpeg.org/ffmpeg-filters.html#arealtime
   */
  arealtime: {
    /** sleep time limit */
    limit?: string | number;
    /** speed factor */
    speed?: number;
  };
  /**
   * Resample audio data.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aresample
   */
  aresample: {
    sample_rate?: number;
  };
  /**
   * Reverse an audio clip.
   * @see https://ffmpeg.org/ffmpeg-filters.html#areverse
   */
  areverse: {};
  /**
   * Apply Recursive Least Squares algorithm to first audio stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#arls
   */
  arls: {
    /** set the filter order */
    order?: number;
    /** set the filter lambda */
    lambda?: number;
    /** set the filter delta */
    delta?: number;
    /** set output mode */
    out_mode?: 'i' | 'd' | 'o' | 'n' | 'e';
    /** set processing precision */
    precision?: 'auto' | 'float' | 'double';
  };
  /**
   * Reduce noise from speech using Recurrent Neural Networks.
   * @see https://ffmpeg.org/ffmpeg-filters.html#arnndn
   */
  arnndn: {
    /** set model name */
    model?: string | number;
    /** set model name */
    m?: string | number;
    /** set output vs input mix */
    mix?: number;
  };
  /**
   * Measure Audio Signal-to-Distortion Ratio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asdr
   */
  asdr: {};
  /**
   * Segment audio stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asegment
   */
  asegment: {
    /** timestamps of input at which to split input */
    timestamps?: string | number;
    /** samples at which to split input */
    samples?: string | number;
  };
  /**
   * Select audio frames to pass in output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aselect
   */
  aselect: {
    /** set an expression to use for selecting frames */
    expr?: string | number;
    /** set an expression to use for selecting frames */
    e?: string | number;
    /** set the number of outputs */
    outputs?: number;
    /** set the number of outputs */
    n?: number;
  };
  /**
   * Send commands to filters.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asendcmd
   */
  asendcmd: {
    /** set commands */
    commands?: string | number;
    /** set commands */
    c?: string | number;
    /** set commands file */
    filename?: string | number;
    /** set commands file */
    f?: string | number;
  };
  /**
   * Set the number of samples for each output audio frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asetnsamples
   */
  asetnsamples: {
    /** set the number of per-frame output samples */
    nb_out_samples?: number;
    /** set the number of per-frame output samples */
    n?: number;
    /** pad last frame with zeros */
    pad?: boolean;
    /** pad last frame with zeros */
    p?: boolean;
  };
  /**
   * Set PTS for the output audio frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asetpts
   */
  asetpts: {
    /** Expression determining the frame timestamp */
    expr?: string | number;
  };
  /**
   * Change the sample rate without
   * @see https://ffmpeg.org/ffmpeg-filters.html#asetrate
   */
  asetrate: {};
  /**
   * Set timebase for the audio output link.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asettb
   */
  asettb: {
    /** set expression determining the output timebase */
    expr?: string | number;
    /** set expression determining the output timebase */
    tb?: string | number;
  };
  /**
   * Show textual information for each audio frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ashowinfo
   */
  ashowinfo: {};
  /**
   * Manipulate audio frame side data.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asidedata
   */
  asidedata: {
    /** set a mode of operation */
    mode?: 'select' | 'delete';
    /** set side data type */
    type?:
      | 'PANSCAN'
      | 'A53_CC'
      | 'STEREO3D'
      | 'MATRIXENCODING'
      | 'DOWNMIX_INFO'
      | 'REPLAYGAIN'
      | 'DISPLAYMATRIX'
      | 'AFD'
      | 'MOTION_VECTORS'
      | 'SKIP_SAMPLES'
      | 'AUDIO_SERVICE_TYPE'
      | 'MASTERING_DISPLAY_METADATA'
      | 'GOP_TIMECODE'
      | 'SPHERICAL'
      | 'CONTENT_LIGHT_LEVEL'
      | 'ICC_PROFILE'
      | 'S12M_TIMECOD'
      | 'S12M_TIMECODE'
      | 'DYNAMIC_HDR_PLUS'
      | 'REGIONS_OF_INTEREST'
      | 'VIDEO_ENC_PARAMS'
      | 'SEI_UNREGISTERED'
      | 'FILM_GRAIN_PARAMS'
      | 'DETECTION_BOUNDING_BOXES'
      | 'DETECTION_BBOXES'
      | 'DOVI_RPU_BUFFER'
      | 'DOVI_METADATA'
      | 'DYNAMIC_HDR_VIVID'
      | 'AMBIENT_VIEWING_ENVIRONMENT'
      | 'VIDEO_HINT';
  };
  /**
   * Measure Audio Scale-Invariant Signal-to-Distortion Ratio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asisdr
   */
  asisdr: {};
  /**
   * Audio Soft Clipper.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asoftclip
   */
  asoftclip: {
    /** set softclip type */
    type?: 'hard' | 'tanh' | 'atan' | 'cubic' | 'exp' | 'alg' | 'quintic' | 'sin' | 'erf';
    /** set softclip threshold */
    threshold?: number;
    /** set softclip output gain */
    output?: number;
    /** set softclip parameter */
    param?: number;
    /** set oversample factor */
    oversample?: number;
  };
  /**
   * Show frequency domain statistics about audio frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#aspectralstats
   */
  aspectralstats: {
    /** set the window size */
    win_size?: number;
    /** set window function */
    win_func?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
    /** set window overlap */
    overlap?: number;
    /** select the parameters which are measured */
    measure?:
      | 'none'
      | 'all'
      | 'mean'
      | 'variance'
      | 'centroid'
      | 'spread'
      | 'skewness'
      | 'kurtosis'
      | 'entropy'
      | 'flatness'
      | 'crest'
      | 'flux'
      | 'slope'
      | 'decrease'
      | 'rolloff'
      | (string & {});
  };
  /**
   * Pass on the audio input to N audio outputs.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asplit
   */
  asplit: {
    /** set number of outputs */
    outputs?: number;
  };
  /**
   * Automatic Speech Recognition.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asr
   */
  asr: {
    /** set sampling rate */
    rate?: number;
    /** set directory containing acoustic model files */
    hmm?: string | number;
    /** set pronunciation dictionary */
    dict?: string | number;
    /** set language model file */
    lm?: string | number;
    /** set language model set */
    lmctl?: string | number;
    /** set which language model to use */
    lmname?: string | number;
    /** set output for log messages */
    logfn?: string | number;
  };
  /**
   * Render ASS subtitles onto input video using the libass library.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ass
   */
  ass: {
    /** set the filename of file to read */
    filename?: string | number;
    /** set the filename of file to read */
    f?: string | number;
    /** set the size of the original video (used to scale fonts) */
    original_size?: string | number;
    /** set the directory containing the fonts to read */
    fontsdir?: string | number;
    /** enable processing of alpha channel */
    alpha?: boolean;
    /** enable textual subtitle to video mode */
    sub2video?: boolean;
    /** set shaping engine */
    shaping?: 'auto' | 'simple' | 'complex';
  };
  /**
   * Show time domain statistics about audio frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#astats
   */
  astats: {
    /** set the window length */
    length?: number;
    /** inject metadata in the filtergraph */
    metadata?: boolean;
    /** Set the number of frames over which cumulative stats are calculated before being reset */
    reset?: number;
    /** Select the parameters which are measured per channel */
    measure_perchannel?:
      | 'none'
      | 'all'
      | 'Bit_depth'
      | 'Crest_factor'
      | 'DC_offset'
      | 'Dynamic_range'
      | 'Entropy'
      | 'Flat_factor'
      | 'Max_difference'
      | 'Max_level'
      | 'Mean_difference'
      | 'Min_difference'
      | 'Min_level'
      | 'Noise_floor'
      | 'Noise_floor_count'
      | 'Number_of_Infs'
      | 'Number_of_NaNs'
      | 'Number_of_denormals'
      | 'Number_of_samples'
      | 'Peak_count'
      | 'Peak_level'
      | 'RMS_difference'
      | 'RMS_level'
      | 'RMS_peak'
      | 'RMS_trough'
      | 'Zero_crossings'
      | 'Zero_crossings_rate'
      | 'Abs_Peak_count'
      | (string & {});
    /** Select the parameters which are measured overall */
    measure_overall?:
      | 'none'
      | 'all'
      | 'Bit_depth'
      | 'Crest_factor'
      | 'DC_offset'
      | 'Dynamic_range'
      | 'Entropy'
      | 'Flat_factor'
      | 'Max_difference'
      | 'Max_level'
      | 'Mean_difference'
      | 'Min_difference'
      | 'Min_level'
      | 'Noise_floor'
      | 'Noise_floor_count'
      | 'Number_of_Infs'
      | 'Number_of_NaNs'
      | 'Number_of_denormals'
      | 'Number_of_samples'
      | 'Peak_count'
      | 'Peak_level'
      | 'RMS_difference'
      | 'RMS_level'
      | 'RMS_peak'
      | 'RMS_trough'
      | 'Zero_crossings'
      | 'Zero_crossings_rate'
      | 'Abs_Peak_count'
      | (string & {});
  };
  /**
   * Select audio streams
   * @see https://ffmpeg.org/ffmpeg-filters.html#astreamselect
   */
  astreamselect: {
    /** number of input streams */
    inputs?: number;
    /** input indexes to remap to outputs */
    map?: string | number;
  };
  /**
   * Boost subwoofer frequencies.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asubboost
   */
  asubboost: {
    /** set dry gain */
    dry?: number;
    /** set wet gain */
    wet?: number;
    /** set max boost */
    boost?: number;
    /** set decay */
    decay?: number;
    /** set feedback */
    feedback?: number;
    /** set cutoff */
    cutoff?: number;
    /** set slope */
    slope?: number;
    /** set delay */
    delay?: number;
    /** set channels to filter */
    channels?: string | number;
  };
  /**
   * Cut subwoofer frequencies.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asubcut
   */
  asubcut: {
    /** set cutoff frequency */
    cutoff?: number;
    /** set filter order */
    order?: number;
    /** set input level */
    level?: number;
  };
  /**
   * Cut super frequencies.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asupercut
   */
  asupercut: {
    /** set cutoff frequency */
    cutoff?: number;
    /** set filter order */
    order?: number;
    /** set input level */
    level?: number;
  };
  /**
   * Apply high order Butterworth band-pass filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asuperpass
   */
  asuperpass: {
    /** set center frequency */
    centerf?: number;
    /** set filter order */
    order?: number;
    /** set Q-factor */
    qfactor?: number;
    /** set input level */
    level?: number;
  };
  /**
   * Apply high order Butterworth band-stop filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#asuperstop
   */
  asuperstop: {
    /** set center frequency */
    centerf?: number;
    /** set filter order */
    order?: number;
    /** set Q-factor */
    qfactor?: number;
    /** set input level */
    level?: number;
  };
  /**
   * Apply an Adaptive Temporal Averaging Denoiser.
   * @see https://ffmpeg.org/ffmpeg-filters.html#atadenoise
   */
  atadenoise: {
    /** set threshold A for 1st plane */
    '0a'?: number;
    /** set threshold B for 1st plane */
    '0b'?: number;
    /** set threshold A for 2nd plane */
    '1a'?: number;
    /** set threshold B for 2nd plane */
    '1b'?: number;
    /** set threshold A for 3rd plane */
    '2a'?: number;
    /** set threshold B for 3rd plane */
    '2b'?: number;
    /** set how many frames to use */
    s?: number;
    /** set what planes to filter */
    p?: string;
    /** set variant of algorithm */
    a?: 'p' | 's';
    /** set sigma for 1st plane */
    '0s'?: number;
    /** set sigma for 2nd plane */
    '1s'?: number;
    /** set sigma for 3rd plane */
    '2s'?: number;
  };
  /**
   * Adjust audio tempo.
   * @see https://ffmpeg.org/ffmpeg-filters.html#atempo
   */
  atempo: {
    /** set tempo scale factor */
    tempo?: number;
  };
  /**
   * Apply spectral tilt to audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#atilt
   */
  atilt: {
    /** set central frequency */
    freq?: number;
    /** set filter slope */
    slope?: number;
    /** set filter width */
    width?: number;
    /** set filter order */
    order?: number;
    /** set input level */
    level?: number;
  };
  /**
   * Pick one continuous section from the input, drop the rest.
   * @see https://ffmpeg.org/ffmpeg-filters.html#atrim
   */
  atrim: {
    /** Timestamp of the first frame that  */
    start?: string | number;
    /** Timestamp of the first frame that  */
    starti?: string | number;
    /** Timestamp of the first frame that  */
    end?: string | number;
    /** Timestamp of the first frame that  */
    endi?: string | number;
    /** Timestamp of the first frame that should be  */
    start_pts?: number;
    /** Timestamp of the first frame that should be  */
    end_pts?: number;
    /** Maximum duration of the output */
    duration?: string | number;
    /** Maximum duration of the output */
    durationi?: string | number;
    /** Number of the first audio sample that should be  */
    start_sample?: number;
    /** Number of the first audio sample that should be  */
    end_sample?: number;
  };
  /**
   * Convert input audio to vectorscope video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#avectorscope
   */
  avectorscope: {
    /** set mode */
    mode?: 'lissajous' | 'lissajous_xy' | 'polar';
    /** set mode */
    m?: 'lissajous' | 'lissajous_xy' | 'polar';
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set red contrast */
    rc?: number;
    /** set green contrast */
    gc?: number;
    /** set blue contrast */
    bc?: number;
    /** set alpha contrast */
    ac?: number;
    /** set red fade */
    rf?: number;
    /** set green fade */
    gf?: number;
    /** set blue fade */
    bf?: number;
    /** set alpha fade */
    af?: number;
    /** set zoom factor */
    zoom?: number;
    /** set draw mode */
    draw?: 'dot' | 'line' | 'aaline';
    /** set amplitude scale mode */
    scale?: 'lin' | 'sqrt' | 'cbrt' | 'log';
    /** swap x axis with y axis */
    swap?: boolean;
    /** mirror axis */
    mirror?: 'none' | 'x' | 'y' | 'xy';
  };
  /**
   * Apply Average Blur filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#avgblur
   */
  avgblur: {
    /** set horizontal size */
    sizeX?: number;
    /** set planes to filter */
    planes?: number;
    /** set vertical size */
    sizeY?: number;
  };
  /**
   * Apply average blur filter
   * @see https://ffmpeg.org/ffmpeg-filters.html#avgblur_005fopencl
   */
  avgblur_opencl: {
    /** set horizontal size */
    sizeX?: number;
    /** set planes to filter */
    planes?: number;
    /** set vertical size */
    sizeY?: number;
  };
  /**
   * Apply avgblur mask to input video
   * @see https://ffmpeg.org/ffmpeg-filters.html#avgblur_005fvulkan
   */
  avgblur_vulkan: {
    /** Set horizontal radius */
    sizeX?: number;
    /** Set vertical radius */
    sizeY?: number;
    /** Set planes to filter (bitmask) */
    planes?: number;
  };
  /**
   * Generate an Audio Video Sync Test.
   * @see https://ffmpeg.org/ffmpeg-filters.html#avsynctest
   */
  avsynctest: {
    /** set frame size */
    size?: string | number;
    /** set frame size */
    s?: string | number;
    /** set frame rate */
    framerate?: string | number;
    /** set frame rate */
    fr?: string | number;
    /** set sample rate */
    samplerate?: number;
    /** set sample rate */
    sr?: number;
    /** set beep amplitude */
    amplitude?: number;
    /** set beep amplitude */
    a?: number;
    /** set beep period */
    period?: number;
    /** set beep period */
    p?: number;
    /** set flash delay */
    delay?: number;
    /** set flash delay */
    dl?: number;
    /** set delay cycle */
    cycle?: boolean;
    /** set delay cycle */
    c?: boolean;
    /** set duration */
    duration?: string | number;
    /** set duration */
    d?: string | number;
    /** set foreground color */
    fg?: string | number;
    /** set background color */
    bg?: string | number;
    /** set additional color */
    ag?: string | number;
  };
  /**
   * Cross-correlate two audio streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#axcorrelate
   */
  axcorrelate: {
    /** set the segment size */
    size?: number;
    /** set the algorithm */
    algo?: 'slow' | 'fast' | 'best';
  };
  /**
   * Receive commands through ZMQ and broker them to filters.
   * @see https://ffmpeg.org/ffmpeg-filters.html#azmq
   */
  azmq: {
    /** set bind address */
    bind_address?: string | number;
    /** set bind address */
    b?: string | number;
  };
  /**
   * Turns a static background into transparency.
   * @see https://ffmpeg.org/ffmpeg-filters.html#backgroundkey
   */
  backgroundkey: {
    /** set the scene change threshold */
    threshold?: number;
    /** set the similarity */
    similarity?: number;
    /** set the blend value */
    blend?: number;
  };
  /**
   * Compute bounding box for each frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#bbox
   */
  bbox: {
    /** set minimum luminance value for bounding box */
    min_val?: number;
  };
  /**
   * Benchmark part of a filtergraph.
   * @see https://ffmpeg.org/ffmpeg-filters.html#bench
   */
  bench: {
    /** set action */
    action?: 'start' | 'stop';
  };
  /**
   * Apply Bilateral filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#bilateral
   */
  bilateral: {
    /** set spatial sigma */
    sigmaS?: number;
    /** set range sigma */
    sigmaR?: number;
    /** set planes to filter */
    planes?: number;
  };
  /**
   * GPU accelerated bilateral filter
   * @see https://ffmpeg.org/ffmpeg-filters.html#bilateral_005fcuda
   */
  bilateral_cuda: {
    /** set spatial sigma */
    sigmaS?: number;
    /** set range sigma */
    sigmaR?: number;
    /** set neighbours window_size */
    window_size?: number;
  };
  /**
   * Measure bit plane noise.
   * @see https://ffmpeg.org/ffmpeg-filters.html#bitplanenoise
   */
  bitplanenoise: {
    /** set bit plane to use for measuring noise */
    bitplane?: number;
    /** show noisy pixels */
    filter?: boolean;
  };
  /**
   * Detect video intervals that are (almost) black.
   * @see https://ffmpeg.org/ffmpeg-filters.html#blackdetect
   */
  blackdetect: {
    /** set minimum detected black duration in seconds */
    d?: number;
    /** set minimum detected black duration in seconds */
    black_min_duration?: number;
    /** set the picture black ratio threshold */
    picture_black_ratio_th?: number;
    /** set the picture black ratio threshold */
    pic_th?: number;
    /** set the pixel black threshold */
    pixel_black_th?: number;
    /** set the pixel black threshold */
    pix_th?: number;
    /** check alpha instead of luma */
    alpha?: boolean;
  };
  /**
   * Detect video intervals that are (almost) black.
   * @see https://ffmpeg.org/ffmpeg-filters.html#blackdetect_005fvulkan
   */
  blackdetect_vulkan: {
    /** set minimum detected black duration in seconds */
    d?: number;
    /** set minimum detected black duration in seconds */
    black_min_duration?: number;
    /** set the picture black ratio threshold */
    picture_black_ratio_th?: number;
    /** set the picture black ratio threshold */
    pic_th?: number;
    /** set the pixel black threshold */
    pixel_black_th?: number;
    /** set the pixel black threshold */
    pix_th?: number;
    /** check alpha instead of luma */
    alpha?: boolean;
  };
  /**
   * Detect frames that are (almost) black.
   * @see https://ffmpeg.org/ffmpeg-filters.html#blackframe
   */
  blackframe: {
    /** percentage of the pixels that have to be below the threshold  */
    amount?: number;
    /** threshold below which a pixel value is considered black */
    threshold?: number;
    /** threshold below which a pixel value is considered black */
    thresh?: number;
  };
  /**
   * Blend two video frames into each other.
   * @see https://ffmpeg.org/ffmpeg-filters.html#blend
   */
  blend: {
    /** set component #0 blend mode */
    c0_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set component #1 blend mode */
    c1_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set component #2 blend mode */
    c2_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set component #3 blend mode */
    c3_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set blend mode for all components */
    all_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set color component #0 expression */
    c0_expr?: string | number;
    /** set color component #1 expression */
    c1_expr?: string | number;
    /** set color component #2 expression */
    c2_expr?: string | number;
    /** set color component #3 expression */
    c3_expr?: string | number;
    /** set expression for all color components */
    all_expr?: string | number;
    /** set color component #0 opacity */
    c0_opacity?: number;
    /** set color component #1 opacity */
    c1_opacity?: number;
    /** set color component #2 opacity */
    c2_opacity?: number;
    /** set color component #3 opacity */
    c3_opacity?: number;
    /** set opacity for all color components */
    all_opacity?: number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Blend two video frames in Vulkan
   * @see https://ffmpeg.org/ffmpeg-filters.html#blend_005fvulkan
   */
  blend_vulkan: {
    /** set component #0 blend mode */
    c0_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set component #1 blend mode */
    c1_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set component #2 blend mode */
    c2_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set component #3 blend mode */
    c3_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set blend mode for all components */
    all_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set color component #0 opacity */
    c0_opacity?: number;
    /** set color component #1 opacity */
    c1_opacity?: number;
    /** set color component #2 opacity */
    c2_opacity?: number;
    /** set color component #3 opacity */
    c3_opacity?: number;
    /** set opacity for all color components */
    all_opacity?: number;
  };
  /**
   * Blockdetect filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#blockdetect
   */
  blockdetect: {
    /** Minimum period to search for */
    period_min?: number;
    /** Maximum period to search for */
    period_max?: number;
    /** set planes to filter */
    planes?: number;
  };
  /**
   * Blurdetect filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#blurdetect
   */
  blurdetect: {
    /** set high threshold */
    high?: number;
    /** set low threshold */
    low?: number;
    /** search radius for maxima detection */
    radius?: number;
    /** block pooling threshold when calculating blurriness */
    block_pct?: number;
    /** block size for block-based abbreviation of blurriness */
    block_width?: number;
    /** block size for block-based abbreviation of blurriness */
    block_height?: number;
    /** set planes to filter */
    planes?: number;
  };
  /**
   * Block-Matching 3D denoiser.
   * @see https://ffmpeg.org/ffmpeg-filters.html#bm3d
   */
  bm3d: {
    /** set denoising strength */
    sigma?: number;
    /** set size of local patch */
    block?: number;
    /** set sliding step for processing blocks */
    bstep?: number;
    /** set maximal number of similar blocks */
    group?: number;
    /** set block matching range */
    range?: number;
    /** set step for block matching */
    mstep?: number;
    /** set threshold of mean square error for block matching */
    thmse?: number;
    /** set hard threshold for 3D transfer domain */
    hdthr?: number;
    /** set filtering estimation mode */
    estim?: 'basic' | 'final';
    /** have reference stream */
    ref?: boolean;
    /** set planes to filter */
    planes?: number;
  };
  /**
   * Blur the input.
   * @see https://ffmpeg.org/ffmpeg-filters.html#boxblur
   */
  boxblur: {
    /** Radius of the luma blurring box */
    luma_radius?: string | number;
    /** Radius of the luma blurring box */
    lr?: string | number;
    /** How many times should the boxblur be applied to luma */
    luma_power?: number;
    /** How many times should the boxblur be applied to luma */
    lp?: number;
    /** Radius of the chroma blurring box */
    chroma_radius?: string | number;
    /** Radius of the chroma blurring box */
    cr?: string | number;
    /** How many times should the boxblur be applied to chroma */
    chroma_power?: number;
    /** How many times should the boxblur be applied to chroma */
    cp?: number;
    /** Radius of the alpha blurring box */
    alpha_radius?: string | number;
    /** Radius of the alpha blurring box */
    ar?: string | number;
    /** How many times should the boxblur be applied to alpha */
    alpha_power?: number;
    /** How many times should the boxblur be applied to alpha */
    ap?: number;
  };
  /**
   * Apply boxblur filter to input video
   * @see https://ffmpeg.org/ffmpeg-filters.html#boxblur_005fopencl
   */
  boxblur_opencl: {
    /** Radius of the luma blurring box */
    luma_radius?: string | number;
    /** Radius of the luma blurring box */
    lr?: string | number;
    /** How many times should the boxblur be applied to luma */
    luma_power?: number;
    /** How many times should the boxblur be applied to luma */
    lp?: number;
    /** Radius of the chroma blurring box */
    chroma_radius?: string | number;
    /** Radius of the chroma blurring box */
    cr?: string | number;
    /** How many times should the boxblur be applied to chroma */
    chroma_power?: number;
    /** How many times should the boxblur be applied to chroma */
    cp?: number;
    /** Radius of the alpha blurring box */
    alpha_radius?: string | number;
    /** Radius of the alpha blurring box */
    ar?: string | number;
    /** How many times should the boxblur be applied to alpha */
    alpha_power?: number;
    /** How many times should the boxblur be applied to alpha */
    ap?: number;
  };
  /**
   * Bauer stereo-to-binaural filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#bs2b
   */
  bs2b: {
    /** Apply a pre-defined crossfeed level */
    profile?: 'default' | 'cmoy' | 'jmeier';
    /** Set cut frequency (in Hz) */
    fcut?: number;
    /** Set feed level (in Hz) */
    feed?: number;
  };
  /**
   * Buffer video frames, and make them accessible to the filterchain.
   * @see https://ffmpeg.org/ffmpeg-filters.html#buffer
   */
  buffer: {
    width?: number;
    video_size?: string | number;
    height?: number;
    pix_fmt?: string | number;
    /** sample aspect ratio */
    sar?: string | number;
    /** sample aspect ratio */
    pixel_aspect?: string | number;
    time_base?: string | number;
    frame_rate?: string | number;
    /** select colorspace */
    colorspace?:
      | 'gbr'
      | 'bt709'
      | 'unknown'
      | 'fcc'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'ycgco'
      | 'ycgco-re'
      | 'ycgco-ro'
      | 'bt2020nc'
      | 'bt2020c'
      | 'smpte2085'
      | 'chroma-derived-nc'
      | 'chroma-derived-c'
      | 'ictcp'
      | 'ipt-c2';
    /** select color range */
    range?: 'unspecified' | 'unknown' | 'limited' | 'tv' | 'mpeg' | 'full' | 'pc' | 'jpeg';
    /** select alpha mode */
    alpha_mode?: 'unspecified' | 'unknown' | 'straight' | 'premultiplied';
  };
  /**
   * Buffer video frames, and make them available to the end of the filter graph.
   * @see https://ffmpeg.org/ffmpeg-filters.html#buffersink
   */
  buffersink: {
    /** set the supported pixel formats */
    pix_fmts?: string | number;
    /** set the supported color spaces */
    color_spaces?: string | number;
    /** set the supported color ranges */
    color_ranges?: string | number;
    /** array of supported pixel formats */
    pixel_formats?: string | number;
    /** array of supported color spaces */
    colorspaces?: string | number;
    /** array of supported color ranges */
    colorranges?: string | number;
    /** array of supported color ranges */
    alphamodes?: string | number;
  };
  /**
   * Deinterlace the input image.
   * @see https://ffmpeg.org/ffmpeg-filters.html#bwdif
   */
  bwdif: {
    /** specify the interlacing mode */
    mode?: 'send_frame' | 'send_field';
    /** specify the assumed picture field parity */
    parity?: 'tff' | 'bff' | 'auto';
    /** specify which frames to deinterlace */
    deint?: 'all' | 'interlaced';
  };
  /**
   * Deinterlace CUDA frames
   * @see https://ffmpeg.org/ffmpeg-filters.html#bwdif_005fcuda
   */
  bwdif_cuda: {};
  /**
   * Deinterlace (BWDIF) the video through OpenCL.
   * @see https://ffmpeg.org/ffmpeg-filters.html#bwdif_005fopencl
   */
  bwdif_opencl: {
    /** specify the interlacing mode */
    mode?: 'send_frame' | 'send_field';
    /** specify the assumed picture field parity */
    parity?: 'tff' | 'bff' | 'auto';
    /** specify which frames to deinterlace */
    deint?: 'all' | 'interlaced';
  };
  /**
   * Deinterlace Vulkan frames via bwdif
   * @see https://ffmpeg.org/ffmpeg-filters.html#bwdif_005fvulkan
   */
  bwdif_vulkan: {};
  /**
   * Contrast Adaptive Sharpen.
   * @see https://ffmpeg.org/ffmpeg-filters.html#cas
   */
  cas: {
    /** set the sharpening strength */
    strength?: number;
    /** set what planes to filter */
    planes?: string;
  };
  /**
   * Repack CEA-708 closed caption metadata
   * @see https://ffmpeg.org/ffmpeg-filters.html#ccrepack
   */
  ccrepack: {};
  /**
   * Create pattern generated by an elementary cellular automaton.
   * @see https://ffmpeg.org/ffmpeg-filters.html#cellauto
   */
  cellauto: {
    /** read initial pattern from file */
    filename?: string | number;
    /** read initial pattern from file */
    f?: string | number;
    /** set initial pattern */
    pattern?: string | number;
    /** set initial pattern */
    p?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set rule */
    rule?: number;
    /** set fill ratio for filling initial grid randomly */
    random_fill_ratio?: number;
    /** set fill ratio for filling initial grid randomly */
    ratio?: number;
    /** set the seed for filling the initial grid randomly */
    random_seed?: number;
    /** set the seed for filling the initial grid randomly */
    seed?: number;
    /** scroll pattern downward */
    scroll?: boolean;
    /** start filling the whole video */
    start_full?: boolean;
    /** start filling the whole video */
    full?: boolean;
    /** stitch boundaries */
    stitch?: boolean;
  };
  /**
   * Remap audio channels.
   * @see https://ffmpeg.org/ffmpeg-filters.html#channelmap
   */
  channelmap: {
    /** A comma-separated list of input channel numbers in output order. */
    map?: string | number;
    /** Output channel layout. */
    channel_layout?: string | number;
  };
  /**
   * Split audio into per-channel streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#channelsplit
   */
  channelsplit: {
    /** Input channel layout. */
    channel_layout?: string | number;
    /** Channels to extract. */
    channels?: string | number;
  };
  /**
   * Add a chorus effect to the audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#chorus
   */
  chorus: {
    /** set input gain */
    in_gain?: number;
    /** set output gain */
    out_gain?: number;
    /** set delays */
    delays?: string | number;
    /** set decays */
    decays?: string | number;
    /** set speeds */
    speeds?: string | number;
    /** set depths */
    depths?: string | number;
  };
  /**
   * Offset chroma of input video (chromatic aberration)
   * @see https://ffmpeg.org/ffmpeg-filters.html#chromaber_005fvulkan
   */
  chromaber_vulkan: {
    /** Set horizontal distortion amount */
    dist_x?: number;
    /** Set vertical distortion amount */
    dist_y?: number;
  };
  /**
   * Turns a certain color range into gray.
   * @see https://ffmpeg.org/ffmpeg-filters.html#chromahold
   */
  chromahold: {
    /** set the chromahold key color */
    color?: string | number;
    /** set the chromahold similarity value */
    similarity?: number;
    /** set the chromahold blend value */
    blend?: number;
    /** color parameter is in yuv instead of rgb */
    yuv?: boolean;
  };
  /**
   * Turns a certain color into transparency. Operates on YUV colors.
   * @see https://ffmpeg.org/ffmpeg-filters.html#chromakey
   */
  chromakey: {
    /** set the chromakey key color */
    color?: string | number;
    /** set the chromakey similarity value */
    similarity?: number;
    /** set the chromakey key blend value */
    blend?: number;
    /** color parameter is in yuv instead of rgb */
    yuv?: boolean;
  };
  /**
   * GPU accelerated chromakey filter
   * @see https://ffmpeg.org/ffmpeg-filters.html#chromakey_005fcuda
   */
  chromakey_cuda: {
    /** set the chromakey key color */
    color?: string | number;
    /** set the chromakey similarity value */
    similarity?: number;
    /** set the chromakey key blend value */
    blend?: number;
    /** color parameter is in yuv instead of rgb */
    yuv?: boolean;
  };
  /**
   * Reduce chrominance noise.
   * @see https://ffmpeg.org/ffmpeg-filters.html#chromanr
   */
  chromanr: {
    /** set y+u+v threshold */
    thres?: number;
    /** set horizontal patch size */
    sizew?: number;
    /** set vertical patch size */
    sizeh?: number;
    /** set horizontal step */
    stepw?: number;
    /** set vertical step */
    steph?: number;
    /** set y threshold */
    threy?: number;
    /** set u threshold */
    threu?: number;
    /** set v threshold */
    threv?: number;
    /** set distance type */
    distance?: 'manhattan' | 'euclidean';
  };
  /**
   * Shift chroma.
   * @see https://ffmpeg.org/ffmpeg-filters.html#chromashift
   */
  chromashift: {
    /** shift chroma-blue horizontally */
    cbh?: number;
    /** shift chroma-blue vertically */
    cbv?: number;
    /** shift chroma-red horizontally */
    crh?: number;
    /** shift chroma-red vertically */
    crv?: number;
    /** set edge operation */
    edge?: 'smear' | 'wrap';
  };
  /**
   * Video CIE scope.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ciescope
   */
  ciescope: {
    /** set color system */
    system?: 'ntsc' | '470m' | 'ebu' | '470bg' | 'smpte' | '240m' | 'apple' | 'widergb' | 'cie1931' | 'hdtv' | 'rec709' | 'uhdtv' | 'rec2020' | 'dcip3';
    /** set cie system */
    cie?: 'xyy' | 'ucs' | 'luv';
    /** set what gamuts to draw */
    gamuts?: 'ntsc' | '470m' | 'ebu' | '470bg' | 'smpte' | '240m' | 'apple' | 'widergb' | 'cie1931' | 'hdtv' | 'rec709' | 'uhdtv' | 'rec2020' | 'dcip3' | (string & {});
    /** set ciescope size */
    size?: number;
    /** set ciescope size */
    s?: number;
    /** set ciescope intensity */
    intensity?: number;
    /** set ciescope intensity */
    i?: number;
    contrast?: number;
    corrgamma?: boolean;
    showwhite?: boolean;
    gamma?: number;
    /** fill with CIE colors */
    fill?: boolean;
  };
  /**
   * Visualize information about some codecs.
   * @see https://ffmpeg.org/ffmpeg-filters.html#codecview
   */
  codecview: {
    /** set motion vectors to visualize */
    mv?: 'pf' | 'bf' | 'bb' | (string & {});
    qp?: boolean;
    /** set motion vectors type */
    mv_type?: 'fp' | 'bp' | (string & {});
    /** set motion vectors type */
    mvt?: 'fp' | 'bp' | (string & {});
    /** set frame types to visualize motion vectors of */
    frame_type?: 'if' | 'pf' | 'bf' | (string & {});
    /** set frame types to visualize motion vectors of */
    ft?: 'if' | 'pf' | 'bf' | (string & {});
    /** set block partitioning structure to visualize */
    block?: boolean;
  };
  /**
   * Provide an uniformly colored input.
   * @see https://ffmpeg.org/ffmpeg-filters.html#color
   */
  color: {
    /** set color */
    color?: string | number;
    /** set color */
    c?: string | number;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
  };
  /**
   * Generate a constant color (Vulkan)
   * @see https://ffmpeg.org/ffmpeg-filters.html#color_005fvulkan
   */
  color_vulkan: {
    /** set color */
    color?: string | number;
    /** set color */
    c?: string | number;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
    /** Output video format (software format of hardware frames) */
    format?: string | number;
    /** Output colour range (from 0 to 2) (default 0) */
    out_range?: 'full' | 'limited' | 'jpeg' | 'mpeg' | 'tv' | 'pc';
  };
  /**
   * Adjust the color balance.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorbalance
   */
  colorbalance: {
    /** set red shadows */
    rs?: number;
    /** set green shadows */
    gs?: number;
    /** set blue shadows */
    bs?: number;
    /** set red midtones */
    rm?: number;
    /** set green midtones */
    gm?: number;
    /** set blue midtones */
    bm?: number;
    /** set red highlights */
    rh?: number;
    /** set green highlights */
    gh?: number;
    /** set blue highlights */
    bh?: number;
    /** preserve lightness */
    pl?: boolean;
  };
  /**
   * Adjust colors by mixing color channels.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorchannelmixer
   */
  colorchannelmixer: {
    /** set the red gain for the red channel */
    rr?: number;
    /** set the green gain for the red channel */
    rg?: number;
    /** set the blue gain for the red channel */
    rb?: number;
    /** set the alpha gain for the red channel */
    ra?: number;
    /** set the red gain for the green channel */
    gr?: number;
    /** set the green gain for the green channel */
    gg?: number;
    /** set the blue gain for the green channel */
    gb?: number;
    /** set the alpha gain for the green channel */
    ga?: number;
    /** set the red gain for the blue channel */
    br?: number;
    /** set the green gain for the blue channel */
    bg?: number;
    /** set the blue gain for the blue channel */
    bb?: number;
    /** set the alpha gain for the blue channel */
    ba?: number;
    /** set the red gain for the alpha channel */
    ar?: number;
    /** set the green gain for the alpha channel */
    ag?: number;
    /** set the blue gain for the alpha channel */
    ab?: number;
    /** set the alpha gain for the alpha channel */
    aa?: number;
    /** set the preserve color mode */
    pc?: 'none' | 'lum' | 'max' | 'avg' | 'sum' | 'nrm' | 'pwr';
    /** set the preserve color amount */
    pa?: number;
  };
  /**
   * Generate color checker chart.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorchart
   */
  colorchart: {
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
    /** set the single patch size */
    patch_size?: string | number;
    /** set the color checker chart preset */
    preset?: 'reference' | 'skintones';
  };
  /**
   * Adjust color contrast between RGB components.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorcontrast
   */
  colorcontrast: {
    /** set the red-cyan contrast */
    rc?: number;
    /** set the green-magenta contrast */
    gm?: number;
    /** set the blue-yellow contrast */
    by?: number;
    /** set the red-cyan weight */
    rcw?: number;
    /** set the green-magenta weight */
    gmw?: number;
    /** set the blue-yellow weight */
    byw?: number;
    /** set the amount of preserving lightness */
    pl?: number;
  };
  /**
   * Adjust color white balance selectively for blacks and whites.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorcorrect
   */
  colorcorrect: {
    /** set the red shadow spot */
    rl?: number;
    /** set the blue shadow spot */
    bl?: number;
    /** set the red highlight spot */
    rh?: number;
    /** set the blue highlight spot */
    bh?: number;
    /** set the amount of saturation */
    saturation?: number;
    /** set the analyze mode */
    analyze?: 'manual' | 'average' | 'minmax' | 'median';
  };
  /**
   * Detect video color properties.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colordetect
   */
  colordetect: {
    /** Image properties to detect */
    mode?: 'color_range' | 'alpha_mode' | 'all' | (string & {});
  };
  /**
   * Turns a certain color range into gray. Operates on RGB colors.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorhold
   */
  colorhold: {
    /** set the colorhold key color */
    color?: string | number;
    /** set the colorhold similarity value */
    similarity?: number;
    /** set the colorhold blend value */
    blend?: number;
  };
  /**
   * Overlay a solid color on the video stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorize
   */
  colorize: {
    /** set the hue */
    hue?: number;
    /** set the saturation */
    saturation?: number;
    /** set the lightness */
    lightness?: number;
    /** set the mix of source lightness */
    mix?: number;
  };
  /**
   * Turns a certain color into transparency. Operates on RGB colors.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorkey
   */
  colorkey: {
    /** set the colorkey key color */
    color?: string | number;
    /** set the colorkey similarity value */
    similarity?: number;
    /** set the colorkey key blend value */
    blend?: number;
  };
  /**
   * Turns a certain color into transparency. Operates on RGB colors.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorkey_005fopencl
   */
  colorkey_opencl: {
    /** set the colorkey key color */
    color?: string | number;
    /** set the colorkey similarity value */
    similarity?: number;
    /** set the colorkey key blend value */
    blend?: number;
  };
  /**
   * Adjust the color levels.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorlevels
   */
  colorlevels: {
    /** set input red black point */
    rimin?: number;
    /** set input green black point */
    gimin?: number;
    /** set input blue black point */
    bimin?: number;
    /** set input alpha black point */
    aimin?: number;
    /** set input red white point */
    rimax?: number;
    /** set input green white point */
    gimax?: number;
    /** set input blue white point */
    bimax?: number;
    /** set input alpha white point */
    aimax?: number;
    /** set output red black point */
    romin?: number;
    /** set output green black point */
    gomin?: number;
    /** set output blue black point */
    bomin?: number;
    /** set output alpha black point */
    aomin?: number;
    /** set output red white point */
    romax?: number;
    /** set output green white point */
    gomax?: number;
    /** set output blue white point */
    bomax?: number;
    /** set output alpha white point */
    aomax?: number;
    /** set preserve color mode */
    preserve?: 'none' | 'lum' | 'max' | 'avg' | 'sum' | 'nrm' | 'pwr';
  };
  /**
   * Apply custom Color Maps to video stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colormap
   */
  colormap: {
    /** set patch size */
    patch_size?: string | number;
    /** set number of patches */
    nb_patches?: number;
    /** set the target type used */
    type?: 'relative' | 'absolute';
    /** set the kernel used for measuring color difference */
    kernel?: 'euclidean' | 'weuclidean';
  };
  /**
   * Convert color matrix.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colormatrix
   */
  colormatrix: {
    /** set source color matrix */
    src?: 'bt709' | 'fcc' | 'bt601' | 'bt470' | 'bt470bg' | 'smpte170m' | 'smpte240m' | 'bt2020';
    /** set destination color matrix */
    dst?: 'bt709' | 'fcc' | 'bt601' | 'bt470' | 'bt470bg' | 'smpte170m' | 'smpte240m' | 'bt2020';
  };
  /**
   * Convert between colorspaces.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorspace
   */
  colorspace: {
    /** Set all color properties together */
    all?: 'bt470m' | 'bt470bg' | 'bt601-6-525' | 'bt601-6-625' | 'bt709' | 'smpte170m' | 'smpte240m' | 'bt2020';
    /** Output colorspace */
    space?: 'bt709' | 'fcc' | 'bt470bg' | 'smpte170m' | 'smpte240m' | 'ycgco' | 'gbr' | 'bt2020nc' | 'bt2020ncl';
    /** Output color range */
    range?: 'tv' | 'mpeg' | 'pc' | 'jpeg';
    /** Output color primaries */
    primaries?:
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'smpte428'
      | 'film'
      | 'smpte431'
      | 'smpte432'
      | 'bt2020'
      | 'jedec-p22'
      | 'ebu3213'
      | 'vgamut';
    /** Output transfer characteristics */
    trc?:
      | 'bt709'
      | 'bt470m'
      | 'gamma22'
      | 'bt470bg'
      | 'gamma28'
      | 'smpte170m'
      | 'smpte240m'
      | 'linear'
      | 'srgb'
      | 'iec61966-2-1'
      | 'xvycc'
      | 'iec61966-2-4'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'vlog';
    /** Output pixel format */
    format?: 'yuv420p' | 'yuv420p10' | 'yuv420p12' | 'yuv422p' | 'yuv422p10' | 'yuv422p12' | 'yuv444p' | 'yuv444p10' | 'yuv444p12';
    /** Ignore primary chromaticity and gamma correction */
    fast?: boolean;
    /** Dithering mode */
    dither?: 'none' | 'fsb';
    /** Whitepoint adaptation method */
    wpadapt?: 'bradford' | 'vonkries' | 'identity';
    /** Controls how to clip out-of-gamut colors that arise as a result of colorspace conversion. */
    clipgamut?: 'none' | 'rgb';
    /** Set all input color properties together */
    iall?: 'bt470m' | 'bt470bg' | 'bt601-6-525' | 'bt601-6-625' | 'bt709' | 'smpte170m' | 'smpte240m' | 'bt2020';
    /** Input colorspace */
    ispace?: 'bt709' | 'fcc' | 'bt470bg' | 'smpte170m' | 'smpte240m' | 'ycgco' | 'gbr' | 'bt2020nc' | 'bt2020ncl';
    /** Input color range */
    irange?: 'tv' | 'mpeg' | 'pc' | 'jpeg';
    /** Input color primaries */
    iprimaries?:
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'smpte428'
      | 'film'
      | 'smpte431'
      | 'smpte432'
      | 'bt2020'
      | 'jedec-p22'
      | 'ebu3213'
      | 'vgamut';
    /** Input transfer characteristics */
    itrc?:
      | 'bt709'
      | 'bt470m'
      | 'gamma22'
      | 'bt470bg'
      | 'gamma28'
      | 'smpte170m'
      | 'smpte240m'
      | 'linear'
      | 'srgb'
      | 'iec61966-2-1'
      | 'xvycc'
      | 'iec61966-2-4'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'vlog';
  };
  /**
   * CUDA accelerated video color converter
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorspace_005fcuda
   */
  colorspace_cuda: {
    /** Output video range */
    range?: 'tv' | 'mpeg' | 'pc' | 'jpeg';
  };
  /**
   * Generate colors spectrum.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colorspectrum
   */
  colorspectrum: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
    /** set the color spectrum type */
    type?: 'black' | 'white' | 'all';
  };
  /**
   * Adjust color temperature of video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#colortemperature
   */
  colortemperature: {
    /** set the temperature in Kelvin */
    temperature?: number;
    /** set the mix with filtered output */
    mix?: number;
    /** set the amount of preserving lightness */
    pl?: number;
  };
  /**
   * Compress or expand audio dynamic range.
   * @see https://ffmpeg.org/ffmpeg-filters.html#compand
   */
  compand: {
    /** set time over which increase of volume is determined */
    attacks?: string | number;
    /** set time over which decrease of volume is determined */
    decays?: string | number;
    /** set points of transfer function */
    points?: string | number;
    /** set soft-knee */
    'soft-knee'?: number;
    /** set output gain */
    gain?: number;
    /** set initial volume */
    volume?: number;
    /** set delay for samples before sending them to volume adjuster */
    delay?: number;
  };
  /**
   * Audio Compensation Delay Line.
   * @see https://ffmpeg.org/ffmpeg-filters.html#compensationdelay
   */
  compensationdelay: {
    /** set mm distance */
    mm?: number;
    /** set cm distance */
    cm?: number;
    /** set meter distance */
    m?: number;
    /** set dry amount */
    dry?: number;
    /** set wet amount */
    wet?: number;
    /** set temperature °C */
    temp?: number;
  };
  /**
   * Concatenate audio and video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#concat
   */
  concat: {
    /** specify the number of segments */
    n?: number;
    /** specify the number of video streams */
    v?: number;
    /** specify the number of audio streams */
    a?: number;
    /** enable unsafe mode */
    unsafe?: boolean;
  };
  /**
   * Apply convolution filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#convolution
   */
  convolution: {
    /** set matrix for 1st plane */
    '0m'?: string | number;
    /** set matrix for 2nd plane */
    '1m'?: string | number;
    /** set matrix for 3rd plane */
    '2m'?: string | number;
    /** set matrix for 4th plane */
    '3m'?: string | number;
    /** set rdiv for 1st plane */
    '0rdiv'?: number;
    /** set rdiv for 2nd plane */
    '1rdiv'?: number;
    /** set rdiv for 3rd plane */
    '2rdiv'?: number;
    /** set rdiv for 4th plane */
    '3rdiv'?: number;
    /** set bias for 1st plane */
    '0bias'?: number;
    /** set bias for 2nd plane */
    '1bias'?: number;
    /** set bias for 3rd plane */
    '2bias'?: number;
    /** set bias for 4th plane */
    '3bias'?: number;
    /** set matrix mode for 1st plane */
    '0mode'?: 'square' | 'row' | 'column';
    /** set matrix mode for 2nd plane */
    '1mode'?: 'square' | 'row' | 'column';
    /** set matrix mode for 3rd plane */
    '2mode'?: 'square' | 'row' | 'column';
    /** set matrix mode for 4th plane */
    '3mode'?: 'square' | 'row' | 'column';
  };
  /**
   * Apply convolution mask to input video
   * @see https://ffmpeg.org/ffmpeg-filters.html#convolution_005fopencl
   */
  convolution_opencl: {
    /** set matrix for 2nd plane */
    '0m'?: string | number;
    /** set matrix for 2nd plane */
    '1m'?: string | number;
    /** set matrix for 3rd plane */
    '2m'?: string | number;
    /** set matrix for 4th plane */
    '3m'?: string | number;
    /** set rdiv for 1st plane */
    '0rdiv'?: number;
    /** set rdiv for 2nd plane */
    '1rdiv'?: number;
    /** set rdiv for 3rd plane */
    '2rdiv'?: number;
    /** set rdiv for 4th plane */
    '3rdiv'?: number;
    /** set bias for 1st plane */
    '0bias'?: number;
    /** set bias for 2nd plane */
    '1bias'?: number;
    /** set bias for 3rd plane */
    '2bias'?: number;
    /** set bias for 4th plane */
    '3bias'?: number;
  };
  /**
   * Convolve first video stream with second video stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#convolve
   */
  convolve: {};
  /**
   * Copy the input video unchanged to the output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#copy
   */
  copy: {};
  /**
   * Calculate the correlation between two video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#corr
   */
  corr: {
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Find and cover a user specified object.
   * @see https://ffmpeg.org/ffmpeg-filters.html#cover_005frect
   */
  cover_rect: {
    /** cover bitmap filename */
    cover?: string | number;
    /** set removal mode */
    mode?: 'cover' | 'blur';
  };
  /**
   * Crop the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#crop
   */
  crop: {
    /** set the width crop area expression */
    out_w?: string | number;
    /** set the width crop area expression */
    w?: string | number;
    /** set the height crop area expression */
    out_h?: string | number;
    /** set the height crop area expression */
    h?: string | number;
    /** set the x crop area expression */
    x?: string | number;
    /** set the y crop area expression */
    y?: string | number;
    /** keep aspect ratio */
    keep_aspect?: boolean;
    /** do exact cropping */
    exact?: boolean;
  };
  /**
   * Auto-detect crop size.
   * @see https://ffmpeg.org/ffmpeg-filters.html#cropdetect
   */
  cropdetect: {
    /** Threshold below which the pixel is considered black */
    limit?: number;
    /** Value by which the width/height should be divisible */
    round?: number;
    /** Recalculate the crop area after this many frames */
    reset?: number;
    /** Number of initial frames to skip */
    skip?: number;
    /** Recalculate the crop area after this many frames */
    reset_count?: number;
    /** Threshold count of outliers */
    max_outliers?: number;
    /** set mode */
    mode?: 'black' | 'mvedges';
    /** Set high threshold for edge detection */
    high?: number;
    /** Set low threshold for edge detection */
    low?: number;
    /** motion vector threshold when estimating video window size */
    mv_threshold?: number;
  };
  /**
   * Apply headphone crossfeed filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#crossfeed
   */
  crossfeed: {
    /** set crossfeed strength */
    strength?: number;
    /** set soundstage wideness */
    range?: number;
    /** set curve slope */
    slope?: number;
    /** set level in */
    level_in?: number;
    /** set level out */
    level_out?: number;
    /** set the block size */
    block_size?: number;
  };
  /**
   * Simple audio noise sharpening filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#crystalizer
   */
  crystalizer: {
    /** set intensity */
    i?: number;
    /** enable clipping */
    c?: boolean;
  };
  /**
   * Delay filtering to match a cue.
   * @see https://ffmpeg.org/ffmpeg-filters.html#cue
   */
  cue: {
    /** cue unix timestamp in microseconds */
    cue?: number;
    /** preroll duration in seconds */
    preroll?: string | number;
    /** buffer duration in seconds */
    buffer?: string | number;
  };
  /**
   * Adjust components curves.
   * @see https://ffmpeg.org/ffmpeg-filters.html#curves
   */
  curves: {
    /** select a color curves preset */
    preset?:
      | 'none'
      | 'color_negative'
      | 'cross_process'
      | 'darker'
      | 'increase_contrast'
      | 'lighter'
      | 'linear_contrast'
      | 'medium_contrast'
      | 'negative'
      | 'strong_contrast'
      | 'vintage';
    /** set master points coordinates */
    master?: string | number;
    /** set master points coordinates */
    m?: string | number;
    /** set red points coordinates */
    red?: string | number;
    /** set red points coordinates */
    r?: string | number;
    /** set green points coordinates */
    green?: string | number;
    /** set green points coordinates */
    g?: string | number;
    /** set blue points coordinates */
    blue?: string | number;
    /** set blue points coordinates */
    b?: string | number;
    /** set points coordinates for all components */
    all?: string | number;
    /** set Photoshop curves file name */
    psfile?: string | number;
    /** save Gnuplot script of the curves in specified file */
    plot?: string | number;
    /** specify the kind of interpolation */
    interp?: 'natural' | 'pchip';
  };
  /**
   * Video data analysis.
   * @see https://ffmpeg.org/ffmpeg-filters.html#datascope
   */
  datascope: {
    /** set output size */
    size?: string | number;
    /** set output size */
    s?: string | number;
    /** set x offset */
    x?: number;
    /** set y offset */
    y?: number;
    /** set scope mode */
    mode?: 'mono' | 'color' | 'color2';
    /** draw column/row numbers */
    axis?: boolean;
    /** set background opacity */
    opacity?: number;
    /** set display number format */
    format?: 'hex' | 'dec';
    /** set components to display */
    components?: number;
  };
  /**
   * Apply Directional Blur filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#dblur
   */
  dblur: {
    /** set angle */
    angle?: number;
    /** set radius */
    radius?: number;
    /** set planes to filter */
    planes?: number;
  };
  /**
   * Apply a DC shift to the audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#dcshift
   */
  dcshift: {
    /** set DC shift */
    shift?: number;
    /** set limiter gain */
    limitergain?: number;
  };
  /**
   * Denoise frames using 2D DCT.
   * @see https://ffmpeg.org/ffmpeg-filters.html#dctdnoiz
   */
  dctdnoiz: {
    /** set noise sigma constant */
    sigma?: number;
    /** set noise sigma constant */
    s?: number;
    /** set number of block overlapping pixels */
    overlap?: number;
    /** set coefficient factor expression */
    expr?: string | number;
    /** set coefficient factor expression */
    e?: string | number;
    /** set the block size, expressed in bits */
    n?: number;
  };
  /**
   * Grab Windows Desktop images using Desktop Duplication API
   * @see https://ffmpeg.org/ffmpeg-filters.html#ddagrab
   */
  ddagrab: {
    /** dda output index to capture */
    output_idx?: number;
    /** draw the mouse pointer */
    draw_mouse?: boolean;
    /** set video frame rate */
    framerate?: string | number;
    /** set video frame size */
    video_size?: string | number;
    /** capture area x offset */
    offset_x?: number;
    /** capture area y offset */
    offset_y?: number;
    /** desired output format */
    output_fmt?: 'auto' | '8bit' | 'bgra' | '10bit' | 'x2bgr10' | '16bit' | 'rgbaf16';
    /** don't error on fallback to default 8 Bit format */
    allow_fallback?: boolean;
    /** exclude BGRA from format list (experimental, discouraged by Microsoft) */
    force_fmt?: boolean;
    /** duplicate frames to maintain framerate */
    dup_frames?: boolean;
  };
  /**
   * Debands video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#deband
   */
  deband: {
    /** set 1st plane threshold */
    '1thr'?: number;
    /** set 2nd plane threshold */
    '2thr'?: number;
    /** set 3rd plane threshold */
    '3thr'?: number;
    /** set 4th plane threshold */
    '4thr'?: number;
    /** set range */
    range?: number;
    /** set range */
    r?: number;
    /** set direction */
    direction?: number;
    /** set direction */
    d?: number;
    /** set blur */
    blur?: boolean;
    /** set blur */
    b?: boolean;
    /** set plane coupling */
    coupling?: boolean;
    /** set plane coupling */
    c?: boolean;
  };
  /**
   * Deblock video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#deblock
   */
  deblock: {
    /** set type of filter */
    filter?: 'weak' | 'strong';
    /** set size of block */
    block?: number;
    /** set 1st detection threshold */
    alpha?: number;
    /** set 2nd detection threshold */
    beta?: number;
    /** set 3rd detection threshold */
    gamma?: number;
    /** set 4th detection threshold */
    delta?: number;
    /** set planes to filter */
    planes?: number;
  };
  /**
   * Decimate frames (post field matching filter).
   * @see https://ffmpeg.org/ffmpeg-filters.html#decimate
   */
  decimate: {
    /** set the number of frame from which one will be dropped */
    cycle?: number;
    /** set duplicate threshold */
    dupthresh?: number;
    /** set scene change threshold */
    scthresh?: number;
    /** set the size of the x-axis blocks used during metric calculations */
    blockx?: number;
    /** set the size of the y-axis blocks used during metric calculations */
    blocky?: number;
    /** mark main input as a pre-processed input and activate clean source input stream */
    ppsrc?: boolean;
    /** set whether or not chroma is considered in the metric calculations */
    chroma?: boolean;
    /** set whether or not the input only partially contains content to be decimated */
    mixed?: boolean;
  };
  /**
   * Deconvolve first video stream with second video stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#deconvolve
   */
  deconvolve: {};
  /**
   * Reduce cross-luminance and cross-color.
   * @see https://ffmpeg.org/ffmpeg-filters.html#dedot
   */
  dedot: {
    /** set filtering mode */
    m?: 'dotcrawl' | 'rainbows' | (string & {});
    /** set spatial luma threshold */
    lt?: number;
    /** set tolerance for temporal luma */
    tl?: number;
    /** set tolerance for chroma temporal variation */
    tc?: number;
    /** set temporal chroma threshold */
    ct?: number;
  };
  /**
   * Apply de-essing to the audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#deesser
   */
  deesser: {
    /** set intensity */
    i?: number;
    /** set max deessing */
    m?: number;
    /** set frequency */
    f?: number;
    /** set output mode */
    s?: 'i' | 'o' | 'e';
  };
  /**
   * Remove temporal frame luminance variations.
   * @see https://ffmpeg.org/ffmpeg-filters.html#deflicker
   */
  deflicker: {
    /** set how many frames to use */
    size?: number;
    /** set how many frames to use */
    s?: number;
    /** set how to smooth luminance */
    mode?: 'am' | 'gm' | 'hm' | 'qm' | 'cm' | 'pm' | 'median';
    /** set how to smooth luminance */
    m?: 'am' | 'gm' | 'hm' | 'qm' | 'cm' | 'pm' | 'median';
    /** leave frames unchanged */
    bypass?: boolean;
  };
  /**
   * Deinterlacing using Direct3D12 Video Processor
   * @see https://ffmpeg.org/ffmpeg-filters.html#deinterlace_005fd3d12
   */
  deinterlace_d3d12: {
    /** Deinterlacing method */
    method?: 'default' | 'bob' | 'custom';
    /** Specify the interlacing mode */
    mode?: 'frame' | 'field';
    /** Specify which frames to deinterlace */
    deint?: 'all' | 'interlaced';
  };
  /**
   * Deinterlacing of VAAPI surfaces
   * @see https://ffmpeg.org/ffmpeg-filters.html#deinterlace_005fvaapi
   */
  deinterlace_vaapi: {
    /** Deinterlacing mode */
    mode?: 'default' | 'bob' | 'weave' | 'motion_adaptive' | 'motion_compensated';
    /** Generate output at frame rate or field rate */
    rate?: 'frame' | 'field';
    /** Only deinterlace fields, passing frames through unchanged */
    auto?: number;
  };
  /**
   * Remove judder produced by pullup.
   * @see https://ffmpeg.org/ffmpeg-filters.html#dejudder
   */
  dejudder: {
    /** set the length of the cycle to use for dejuddering */
    cycle?: number;
  };
  /**
   * Remove logo from input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#delogo
   */
  delogo: {
    /** set logo x position */
    x?: string | number;
    /** set logo y position */
    y?: string | number;
    /** set logo width */
    w?: string | number;
    /** set logo height */
    h?: string | number;
    /** show delogo area */
    show?: boolean;
  };
  /**
   * VAAPI VPP for de-noise
   * @see https://ffmpeg.org/ffmpeg-filters.html#denoise_005fvaapi
   */
  denoise_vaapi: {
    /** denoise level */
    denoise?: number;
  };
  /**
   * Apply derain filter to the input.
   * @see https://ffmpeg.org/ffmpeg-filters.html#derain
   */
  derain: {};
  /**
   * Stabilize shaky video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#deshake
   */
  deshake: {
    /** set x for the rectangular search area */
    x?: number;
    /** set y for the rectangular search area */
    y?: number;
    /** set width for the rectangular search area */
    w?: number;
    /** set height for the rectangular search area */
    h?: number;
    /** set x for the rectangular search area */
    rx?: number;
    /** set y for the rectangular search area */
    ry?: number;
    /** set edge mode */
    edge?: 'blank' | 'original' | 'clamp' | 'mirror';
    /** set motion search blocksize */
    blocksize?: number;
    /** set contrast threshold for blocks */
    contrast?: number;
    /** set search strategy */
    search?: 'exhaustive' | 'less';
    /** set motion search detailed log file name */
    filename?: string | number;
    /** ignored */
    opencl?: boolean;
  };
  /**
   * Feature-point based video stabilization filter
   * @see https://ffmpeg.org/ffmpeg-filters.html#deshake_005fopencl
   */
  deshake_opencl: {
    /** simulates a tripod by preventing any camera movement whatsoever  */
    tripod?: boolean;
    /** turn on additional debugging information */
    debug?: boolean;
    /** attempt to subtly crop borders to reduce mirrored content */
    adaptive_crop?: boolean;
    /** refine feature point locations at a sub-pixel level */
    refine_features?: boolean;
    /** smoothing strength (0 attempts to adaptively determine optimal strength) */
    smooth_strength?: number;
    /** multiplier for number of frames to buffer for motion data */
    smooth_window_multiplier?: number;
  };
  /**
   * Despill video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#despill
   */
  despill: {
    /** set the screen type */
    type?: 'green' | 'blue';
    /** set the spillmap mix */
    mix?: number;
    /** set the spillmap expand */
    expand?: number;
    /** set red scale */
    red?: number;
    /** set green scale */
    green?: number;
    /** set blue scale */
    blue?: number;
    /** set brightness */
    brightness?: number;
    /** change alpha component */
    alpha?: boolean;
  };
  /**
   * Apply an inverse telecine pattern.
   * @see https://ffmpeg.org/ffmpeg-filters.html#detelecine
   */
  detelecine: {
    /** select first field */
    first_field?: 'top' | 't' | 'bottom' | 'b';
    /** pattern that describe for how many fields a frame is to be displayed */
    pattern?: string | number;
    /** position of first frame with respect to the pattern if stream is cut */
    start_frame?: number;
  };
  /**
   * Audio Dialogue Enhancement.
   * @see https://ffmpeg.org/ffmpeg-filters.html#dialoguenhance
   */
  dialoguenhance: {
    /** set original center factor */
    original?: number;
    /** set dialogue enhance factor */
    enhance?: number;
    /** set voice detection factor */
    voice?: number;
  };
  /**
   * Apply dilation effect
   * @see https://ffmpeg.org/ffmpeg-filters.html#dilation_005fopencl
   */
  dilation_opencl: {
    /** set threshold for 1st plane */
    threshold0?: number;
    /** set threshold for 2nd plane */
    threshold1?: number;
    /** set threshold for 3rd plane */
    threshold2?: number;
    /** set threshold for 4th plane */
    threshold3?: number;
    /** set coordinates */
    coordinates?: number;
  };
  /**
   * Displace pixels.
   * @see https://ffmpeg.org/ffmpeg-filters.html#displace
   */
  displace: {
    /** set edge mode */
    edge?: 'blank' | 'smear' | 'wrap' | 'mirror';
  };
  /**
   * Apply DNN classify filter to the input.
   * @see https://ffmpeg.org/ffmpeg-filters.html#dnn_005fclassify
   */
  dnn_classify: {};
  /**
   * Apply DNN detect filter to the input.
   * @see https://ffmpeg.org/ffmpeg-filters.html#dnn_005fdetect
   */
  dnn_detect: {};
  /**
   * Apply DNN processing filter to the input.
   * @see https://ffmpeg.org/ffmpeg-filters.html#dnn_005fprocessing
   */
  dnn_processing: {};
  /**
   * Weave input video fields into double number of frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#doubleweave
   */
  doubleweave: {
    /** set first field */
    first_field?: 'top' | 't' | 'bottom' | 'b';
  };
  /**
   * Draw a colored box on the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#drawbox
   */
  drawbox: {
    /** set horizontal position of the left box edge */
    x?: string | number;
    /** set vertical position of the top box edge */
    y?: string | number;
    /** set width of the box */
    width?: string | number;
    /** set width of the box */
    w?: string | number;
    /** set height of the box */
    height?: string | number;
    /** set height of the box */
    h?: string | number;
    /** set color of the box */
    color?: string | number;
    /** set color of the box */
    c?: string | number;
    /** set the box thickness */
    thickness?: string | number;
    /** set the box thickness */
    t?: string | number;
    /** replace color &amp; alpha */
    replace?: boolean;
    /** use data from bounding box in side data */
    box_source?: string | number;
  };
  /**
   * Draw a colored box on the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#drawbox_005fvaapi
   */
  drawbox_vaapi: {
    /** set horizontal position of the left box edge */
    x?: string | number;
    /** set vertical position of the top box edge */
    y?: string | number;
    /** set width of the box */
    width?: string | number;
    /** set width of the box */
    w?: string | number;
    /** set height of the box */
    height?: string | number;
    /** set height of the box */
    h?: string | number;
    /** set color of the box */
    color?: string | number;
    /** set color of the box */
    c?: string | number;
    /** set the box thickness */
    thickness?: string | number;
    /** set the box thickness */
    t?: string | number;
    /** replace color */
    replace?: boolean;
  };
  /**
   * Draw a graph using input video metadata.
   * @see https://ffmpeg.org/ffmpeg-filters.html#drawgraph
   */
  drawgraph: {
    /** set 1st metadata key */
    m1?: string | number;
    /** set 1st foreground color expression */
    fg1?: string | number;
    /** set 2nd metadata key */
    m2?: string | number;
    /** set 2nd foreground color expression */
    fg2?: string | number;
    /** set 3rd metadata key */
    m3?: string | number;
    /** set 3rd foreground color expression */
    fg3?: string | number;
    /** set 4th metadata key */
    m4?: string | number;
    /** set 4th foreground color expression */
    fg4?: string | number;
    /** set background color */
    bg?: string | number;
    /** set minimal value */
    min?: number;
    /** set maximal value */
    max?: number;
    /** set graph mode */
    mode?: 'bar' | 'dot' | 'line';
    /** set slide mode */
    slide?: 'frame' | 'replace' | 'scroll' | 'rscroll' | 'picture';
    /** set graph size */
    size?: string | number;
    /** set graph size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
  };
  /**
   * Draw a colored grid on the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#drawgrid
   */
  drawgrid: {
    /** set horizontal offset */
    x?: string | number;
    /** set vertical offset */
    y?: string | number;
    /** set width of grid cell */
    width?: string | number;
    /** set width of grid cell */
    w?: string | number;
    /** set height of grid cell */
    height?: string | number;
    /** set height of grid cell */
    h?: string | number;
    /** set color of the grid */
    color?: string | number;
    /** set color of the grid */
    c?: string | number;
    /** set grid line thickness */
    thickness?: string | number;
    /** set grid line thickness */
    t?: string | number;
    /** replace color &amp; alpha */
    replace?: boolean;
  };
  /**
   * Draw text on top of video frames using libfreetype library.
   * @see https://ffmpeg.org/ffmpeg-filters.html#drawtext
   */
  drawtext: {
    /** set font file */
    fontfile?: string | number;
    /** set text */
    text?: string | number;
    /** set text file */
    textfile?: string | number;
    /** set foreground color */
    fontcolor?: string | number;
    /** set foreground color expression */
    fontcolor_expr?: string | number;
    /** set box color */
    boxcolor?: string | number;
    /** set border color */
    bordercolor?: string | number;
    /** set shadow color */
    shadowcolor?: string | number;
    /** set box */
    box?: boolean;
    /** set box borders width */
    boxborderw?: string | number;
    /** set line spacing in pixels */
    line_spacing?: number;
    /** set font size */
    fontsize?: string | number;
    /** set text alignment */
    text_align?: 'left' | 'L' | 'right' | 'R' | 'center' | 'C' | 'top' | 'T' | 'bottom' | 'B' | 'middle' | 'M' | (string & {});
    /** set x expression */
    x?: string | number;
    /** set y expression */
    y?: string | number;
    /** set box width */
    boxw?: number;
    /** set box height */
    boxh?: number;
    /** set shadow x offset */
    shadowx?: number;
    /** set shadow y offset */
    shadowy?: number;
    /** set border width */
    borderw?: number;
    /** set tab size */
    tabsize?: number;
    /** set base time */
    basetime?: number;
    /** Font name */
    font?: string | number;
    /** set the expansion mode */
    expansion?: 'none' | 'normal' | 'strftime';
    /** set the y alignment */
    y_align?: 'text' | 'baseline' | 'font';
    /** set initial timecode */
    timecode?: string | number;
    /** set 24 hours max (timecode only) */
    tc24hmax?: boolean;
    /** set rate (timecode only) */
    timecode_rate?: string | number;
    /** set rate (timecode only) */
    r?: string | number;
    /** set rate (timecode only) */
    rate?: string | number;
    /** reload text file at specified frame interval */
    reload?: number;
    /** apply alpha while rendering */
    alpha?: string | number;
    /** check and fix text coords to avoid clipping */
    fix_bounds?: boolean;
    /** start frame number for n/frame_num variable */
    start_number?: number;
    /** the source of text */
    text_source?: string | number;
    /** attempt to shape text before drawing */
    text_shaping?: boolean;
    /** set font loading flags for libfreetype */
    ft_load_flags?:
      | 'default'
      | 'no_scale'
      | 'no_hinting'
      | 'render'
      | 'no_bitmap'
      | 'vertical_layout'
      | 'force_autohint'
      | 'crop_bitmap'
      | 'pedantic'
      | 'ignore_global_advance_width'
      | 'no_recurse'
      | 'ignore_transform'
      | 'monochrome'
      | 'linear_design'
      | 'no_autohint'
      | (string & {});
  };
  /**
   * Draw vector graphics on top of video frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#drawvg
   */
  drawvg: {
    /** script source to draw the graphics */
    script?: string | number;
    /** script source to draw the graphics */
    s?: string | number;
    /** file to load the script source */
    file?: string | number;
  };
  /**
   * Measure audio dynamic range.
   * @see https://ffmpeg.org/ffmpeg-filters.html#drmeter
   */
  drmeter: {
    /** set the window length */
    length?: number;
  };
  /**
   * Dynamic Audio Normalizer.
   * @see https://ffmpeg.org/ffmpeg-filters.html#dynaudnorm
   */
  dynaudnorm: {
    /** set the frame length in msec */
    framelen?: number;
    /** set the frame length in msec */
    f?: number;
    /** set the filter size */
    gausssize?: number;
    /** set the filter size */
    g?: number;
    /** set the peak value */
    peak?: number;
    /** set the peak value */
    p?: number;
    /** set the max amplification */
    maxgain?: number;
    /** set the max amplification */
    m?: number;
    /** set the target RMS */
    targetrms?: number;
    /** set the target RMS */
    r?: number;
    /** set channel coupling */
    coupling?: boolean;
    /** set channel coupling */
    n?: boolean;
    /** set DC correction */
    correctdc?: boolean;
    /** set DC correction */
    c?: boolean;
    /** set alternative boundary mode */
    altboundary?: boolean;
    /** set alternative boundary mode */
    b?: boolean;
    /** set the compress factor */
    compress?: number;
    /** set the compress factor */
    s?: number;
    /** set the threshold value */
    threshold?: number;
    /** set the threshold value */
    t?: number;
    /** set channels to filter */
    channels?: string | number;
    /** set channels to filter */
    h?: string | number;
    /** set the frame overlap */
    overlap?: number;
    /** set the frame overlap */
    o?: number;
    /** set the custom peak mapping curve */
    curve?: string | number;
    /** set the custom peak mapping curve */
    v?: string | number;
  };
  /**
   * Widen the stereo image.
   * @see https://ffmpeg.org/ffmpeg-filters.html#earwax
   */
  earwax: {};
  /**
   * EBU R128 scanner.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ebur128
   */
  ebur128: {
    /** set video output */
    video?: boolean;
    /** set video size */
    size?: string | number;
    /** set scale meter (+9 to +18) */
    meter?: number;
    /** force frame logging level */
    framelog?: 'quiet' | 'info' | 'verbose';
    /** inject metadata in the filtergraph */
    metadata?: boolean;
    /** set peak mode */
    peak?: 'none' | 'sample' | 'true' | (string & {});
    /** treat mono input files as dual-mono */
    dualmono?: boolean;
    /** set a specific pan law for dual-mono files */
    panlaw?: number;
    /** set a specific target level in LUFS (-23 to 0) */
    target?: number;
    /** set gauge display type */
    gauge?: 'momentary' | 'm' | 'shortterm' | 's';
    /** sets display method for the stats */
    scale?: 'absolute' | 'LUFS' | 'relative' | 'LU';
    /** integrated loudness (LUFS) */
    integrated?: number;
    /** loudness range (LU) */
    range?: number;
    /** LRA low (LUFS) */
    lra_low?: number;
    /** LRA high (LUFS) */
    lra_high?: number;
    /** sample peak (dBFS) */
    sample_peak?: number;
    /** true peak (dBFS) */
    true_peak?: number;
  };
  /**
   * Detect and draw edge.
   * @see https://ffmpeg.org/ffmpeg-filters.html#edgedetect
   */
  edgedetect: {
    /** set high threshold */
    high?: number;
    /** set low threshold */
    low?: number;
    /** set mode */
    mode?: 'wires' | 'colormix' | 'canny';
    /** set planes to filter */
    planes?: 'y' | 'u' | 'v' | 'r' | 'g' | 'b' | (string & {});
  };
  /**
   * Apply posterize effect, using the ELBG algorithm.
   * @see https://ffmpeg.org/ffmpeg-filters.html#elbg
   */
  elbg: {
    /** set codebook length */
    codebook_length?: number;
    /** set codebook length */
    l?: number;
    /** set max number of steps used to compute the mapping */
    nb_steps?: number;
    /** set max number of steps used to compute the mapping */
    n?: number;
    /** set the random seed */
    seed?: number;
    /** set the random seed */
    s?: number;
    /** set the pal8 output */
    pal8?: boolean;
    /** use alpha channel for mapping */
    use_alpha?: boolean;
  };
  /**
   * Measure video frames entropy.
   * @see https://ffmpeg.org/ffmpeg-filters.html#entropy
   */
  entropy: {
    /** set kind of histogram entropy measurement */
    mode?: 'normal' | 'diff';
  };
  /**
   * Scale the input using EPX algorithm.
   * @see https://ffmpeg.org/ffmpeg-filters.html#epx
   */
  epx: {
    /** set scale factor */
    n?: number;
  };
  /**
   * Adjust brightness, contrast, gamma, and saturation.
   * @see https://ffmpeg.org/ffmpeg-filters.html#eq
   */
  eq: {
    /** set the contrast adjustment, negative values give a negative image */
    contrast?: string | number;
    /** set the brightness adjustment */
    brightness?: string | number;
    /** set the saturation adjustment */
    saturation?: string | number;
    /** set the initial gamma value */
    gamma?: string | number;
    /** gamma value for red */
    gamma_r?: string | number;
    /** gamma value for green */
    gamma_g?: string | number;
    /** gamma value for blue */
    gamma_b?: string | number;
    /** set the gamma weight which reduces the effect of gamma on bright areas */
    gamma_weight?: string | number;
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
  };
  /**
   * Apply erosion effect
   * @see https://ffmpeg.org/ffmpeg-filters.html#erosion_005fopencl
   */
  erosion_opencl: {
    /** set threshold for 1st plane */
    threshold0?: number;
    /** set threshold for 2nd plane */
    threshold1?: number;
    /** set threshold for 3rd plane */
    threshold2?: number;
    /** set threshold for 4th plane */
    threshold3?: number;
    /** set coordinates */
    coordinates?: number;
  };
  /**
   * Apply Edge Slope Tracing deinterlace.
   * @see https://ffmpeg.org/ffmpeg-filters.html#estdif
   */
  estdif: {
    /** specify the mode */
    mode?: 'frame' | 'field';
    /** specify the assumed picture field parity */
    parity?: 'tff' | 'bff' | 'auto';
    /** specify which frames to deinterlace */
    deint?: 'all' | 'interlaced';
    /** specify the search radius for edge slope tracing */
    rslope?: number;
    /** specify the search radius for best edge matching */
    redge?: number;
    /** specify the edge cost for edge matching */
    ecost?: number;
    /** specify the middle cost for edge matching */
    mcost?: number;
    /** specify the distance cost for edge matching */
    dcost?: number;
    /** specify the type of interpolation */
    interp?: '2p' | '4p' | '6p';
  };
  /**
   * Adjust exposure of the video stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#exposure
   */
  exposure: {
    /** set the exposure correction */
    exposure?: number;
    /** set the black level correction */
    black?: number;
  };
  /**
   * Extract planes as grayscale frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#extractplanes
   */
  extractplanes: {
    /** set planes */
    planes?: 'y' | 'u' | 'v' | 'r' | 'g' | 'b' | 'a' | (string & {});
  };
  /**
   * Increase difference between stereo audio channels.
   * @see https://ffmpeg.org/ffmpeg-filters.html#extrastereo
   */
  extrastereo: {
    /** set the difference coefficient */
    m?: number;
    /** enable clipping */
    c?: boolean;
  };
  /**
   * Fade in/out input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#fade
   */
  fade: {
    /** set the fade direction */
    type?: 'in' | 'out';
    /** set the fade direction */
    t?: 'in' | 'out';
    /** Number of the first frame to which to apply the effect. */
    start_frame?: number;
    /** Number of the first frame to which to apply the effect. */
    s?: number;
    /** Number of frames to which the effect should be applied. */
    nb_frames?: number;
    /** Number of frames to which the effect should be applied. */
    n?: number;
    /** fade alpha if it is available on the input */
    alpha?: boolean;
    /** Number of seconds of the beginning of the effect. */
    start_time?: string | number;
    /** Number of seconds of the beginning of the effect. */
    st?: string | number;
    /** Duration of the effect in seconds. */
    duration?: string | number;
    /** Duration of the effect in seconds. */
    d?: string | number;
    /** set color */
    color?: string | number;
    /** set color */
    c?: string | number;
  };
  /**
   * Apply feedback video filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#feedback
   */
  feedback: {
    /** set top left crop position */
    x?: number;
    /** set top left crop position */
    y?: number;
    /** set crop size */
    w?: number;
    /** set crop size */
    h?: number;
  };
  /**
   * Denoise frames using 3D FFT.
   * @see https://ffmpeg.org/ffmpeg-filters.html#fftdnoiz
   */
  fftdnoiz: {
    /** set denoise strength */
    sigma?: number;
    /** set amount of denoising */
    amount?: number;
    /** set block size */
    block?: number;
    /** set block overlap */
    overlap?: number;
    /** set method of denoising */
    method?: 'wiener' | 'hard';
    /** set number of previous frames for temporal denoising */
    prev?: number;
    /** set number of next frames for temporal denoising */
    next?: number;
    /** set planes to filter */
    planes?: number;
    /** set window function */
    window?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
  };
  /**
   * Apply arbitrary expressions to pixels in frequency domain.
   * @see https://ffmpeg.org/ffmpeg-filters.html#fftfilt
   */
  fftfilt: {
    /** adjust gain in Y plane */
    dc_Y?: number;
    /** adjust gain in U plane */
    dc_U?: number;
    /** adjust gain in V plane */
    dc_V?: number;
    /** set luminance expression in Y plane */
    weight_Y?: string | number;
    /** set chrominance expression in U plane */
    weight_U?: string | number;
    /** set chrominance expression in V plane */
    weight_V?: string | number;
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
  };
  /**
   * Extract a field from the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#field
   */
  field: {
    /** set field type (top or bottom) */
    type?: 'top' | 'bottom';
  };
  /**
   * Field matching using hints.
   * @see https://ffmpeg.org/ffmpeg-filters.html#fieldhint
   */
  fieldhint: {
    /** set hint file */
    hint?: string | number;
    /** set hint mode */
    mode?: 'absolute' | 'relative' | 'pattern';
  };
  /**
   * Field matching for inverse telecine.
   * @see https://ffmpeg.org/ffmpeg-filters.html#fieldmatch
   */
  fieldmatch: {
    /** specify the assumed field order */
    order?: 'auto' | 'bff' | 'tff';
    /** set the matching mode or strategy to use */
    mode?: 'pc' | 'pc_n' | 'pc_u' | 'pc_n_ub' | 'pcn' | 'pcn_ub';
    /** mark main input as a pre-processed input and activate clean source input stream */
    ppsrc?: boolean;
    /** set the field to match from */
    field?: 'auto' | 'bottom' | 'top';
    /** set whether or not chroma is included during the match comparisons */
    mchroma?: boolean;
    /** define an exclusion band which excludes the lines between y0 and y1 from the field matching decision */
    y0?: number;
    /** define an exclusion band which excludes the lines between y0 and y1 from the field matching decision */
    y1?: number;
    /** set scene change detection threshold */
    scthresh?: number;
    /** set combmatching mode */
    combmatch?: 'none' | 'sc' | 'full';
    /** enable comb debug */
    combdbg?: 'none' | 'pcn' | 'pcnub';
    /** set the area combing threshold used for combed frame detection */
    cthresh?: number;
    /** set whether or not chroma is considered in the combed frame decision */
    chroma?: boolean;
    /** set the x-axis size of the window used during combed frame detection */
    blockx?: number;
    /** set the y-axis size of the window used during combed frame detection */
    blocky?: number;
    /** set the number of combed pixels inside any of the blocky by blockx size blocks on the frame for the frame to be detected as combed */
    combpel?: number;
  };
  /**
   * Set the field order.
   * @see https://ffmpeg.org/ffmpeg-filters.html#fieldorder
   */
  fieldorder: {
    /** output field order */
    order?: 'bff' | 'tff';
  };
  /**
   * Fill borders of the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#fillborders
   */
  fillborders: {
    /** set the left fill border */
    left?: number;
    /** set the right fill border */
    right?: number;
    /** set the top fill border */
    top?: number;
    /** set the bottom fill border */
    bottom?: number;
    /** set the fill borders mode */
    mode?: 'smear' | 'mirror' | 'fixed' | 'reflect' | 'wrap' | 'fade' | 'margins';
    /** set the color for the fixed/fade mode */
    color?: string | number;
  };
  /**
   * Find a user specified object.
   * @see https://ffmpeg.org/ffmpeg-filters.html#find_005frect
   */
  find_rect: {
    /** object bitmap filename */
    object?: string | number;
    /** set threshold */
    threshold?: number;
    /** set mipmaps */
    mipmaps?: number;
    xmin?: number;
    ymin?: number;
    xmax?: number;
    ymax?: number;
    discard?: boolean;
  };
  /**
   * Finite Impulse Response Equalizer.
   * @see https://ffmpeg.org/ffmpeg-filters.html#firequalizer
   */
  firequalizer: {
    /** set gain curve */
    gain?: string | number;
    /** set gain entry */
    gain_entry?: string | number;
    /** set delay */
    delay?: number;
    /** set accuracy */
    accuracy?: number;
    /** set window function */
    wfunc?: 'rectangular' | 'hann' | 'hamming' | 'blackman' | 'nuttall3' | 'mnuttall3' | 'nuttall' | 'bnuttall' | 'bharris' | 'tukey';
    /** set fixed frame samples */
    fixed?: boolean;
    /** set multi channels mode */
    multi?: boolean;
    /** set zero phase mode */
    zero_phase?: boolean;
    /** set gain scale */
    scale?: 'linlin' | 'linlog' | 'loglin' | 'loglog';
    /** set dump file */
    dumpfile?: string | number;
    /** set dump scale */
    dumpscale?: 'linlin' | 'linlog' | 'loglin' | 'loglog';
    /** set 2-channels fft */
    fft2?: boolean;
    /** set minimum phase mode */
    min_phase?: boolean;
  };
  /**
   * Apply a flanging effect to the audio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#flanger
   */
  flanger: {
    /** base delay in milliseconds */
    delay?: number;
    /** added swept delay in milliseconds */
    depth?: number;
    /** percentage regeneration (delayed signal feedback) */
    regen?: number;
    /** percentage of delayed signal mixed with original */
    width?: number;
    /** sweeps per second (Hz) */
    speed?: number;
    /** swept wave shape */
    shape?: 'triangular' | 't' | 'sinusoidal' | 's';
    /** swept wave percentage phase-shift for multi-channel */
    phase?: number;
    /** delay-line interpolation */
    interp?: 'linear' | 'quadratic';
  };
  /**
   * Flip both horizontally and vertically
   * @see https://ffmpeg.org/ffmpeg-filters.html#flip_005fvulkan
   */
  flip_vulkan: {};
  /**
   * Synthesize voice from text using libflite.
   * @see https://ffmpeg.org/ffmpeg-filters.html#flite
   */
  flite: {
    /** list voices and exit */
    list_voices?: boolean;
    /** set number of samples per frame */
    nb_samples?: number;
    /** set number of samples per frame */
    n?: number;
    /** set text to speak */
    text?: string | number;
    /** set filename of the text to speak */
    textfile?: string | number;
    /** set voice */
    v?: string | number;
    /** set voice */
    voice?: string | number;
  };
  /**
   * Fill area with same color with another color.
   * @see https://ffmpeg.org/ffmpeg-filters.html#floodfill
   */
  floodfill: {
    /** set pixel x coordinate */
    x?: number;
    /** set pixel y coordinate */
    y?: number;
    /** set source #0 component value */
    s0?: number;
    /** set source #1 component value */
    s1?: number;
    /** set source #2 component value */
    s2?: number;
    /** set source #3 component value */
    s3?: number;
    /** set destination #0 component value */
    d0?: number;
    /** set destination #1 component value */
    d1?: number;
    /** set destination #2 component value */
    d2?: number;
    /** set destination #3 component value */
    d3?: number;
  };
  /**
   * Convert the input video to one of the specified pixel formats.
   * @see https://ffmpeg.org/ffmpeg-filters.html#format
   */
  format: {
    /** A '|'-separated list of pixel formats */
    pix_fmts?: string | number;
    /** A '|'-separated list of color spaces */
    color_spaces?: string | number;
    /** A '|'-separated list of color ranges */
    color_ranges?: string | number;
    /** A '|'-separated list of alpha modes */
    alpha_modes?: string | number;
  };
  /**
   * Force constant framerate.
   * @see https://ffmpeg.org/ffmpeg-filters.html#fps
   */
  fps: {
    /** A string describing desired output framerate */
    fps?: string | number;
    /** Assume the first PTS should be this value. */
    start_time?: number;
    /** set rounding method for timestamps */
    round?: 'zero' | 'inf' | 'down' | 'up' | 'near';
    /** action performed for last frame */
    eof_action?: 'round' | 'pass';
  };
  /**
   * Generate a frame packed stereoscopic video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#framepack
   */
  framepack: {
    /** Frame pack output format */
    format?: 'sbs' | 'tab' | 'frameseq' | 'lines' | 'columns';
  };
  /**
   * Upsamples or downsamples progressive source between specified frame rates.
   * @see https://ffmpeg.org/ffmpeg-filters.html#framerate
   */
  framerate: {
    /** required output frames per second rate */
    fps?: string | number;
    /** point to start linear interpolation */
    interp_start?: number;
    /** point to end linear interpolation */
    interp_end?: number;
    /** scene change level */
    scene?: number;
    /** set flags */
    flags?: 'scene_change_detect' | 'scd' | (string & {});
  };
  /**
   * Select one frame every N frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#framestep
   */
  framestep: {
    /** set frame step */
    step?: number;
  };
  /**
   * AMF video Frame Rate Converter
   * @see https://ffmpeg.org/ffmpeg-filters.html#frc_005famf
   */
  frc_amf: {
    /** Engine type */
    engine_type?: number;
    /** Enable FRC */
    enable?: boolean;
    /** Fallback behavior in case of low interpolation confidence */
    fallback_mode?: number;
    /** Show FRC indicator square in the top left corner of the video. */
    indicator?: boolean;
    /** Level of hierarchical motion search */
    profile?: number;
    /** Performance mode of the motion search */
    mv_search_mode?: number;
    /** Enable dependency on future frame, improves quality for the cost of latency */
    use_future_frame?: boolean;
  };
  /**
   * Detects frozen video input.
   * @see https://ffmpeg.org/ffmpeg-filters.html#freezedetect
   */
  freezedetect: {
    /** set noise tolerance */
    n?: number;
    /** set noise tolerance */
    noise?: number;
    /** set minimum duration in seconds */
    d?: string | number;
    /** set minimum duration in seconds */
    duration?: string | number;
  };
  /**
   * Freeze video frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#freezeframes
   */
  freezeframes: {
    /** set first frame to freeze */
    first?: number;
    /** set last frame to freeze */
    last?: number;
    /** set frame to replace */
    replace?: number;
  };
  /**
   * Apply a frei0r effect.
   * @see https://ffmpeg.org/ffmpeg-filters.html#frei0r
   */
  frei0r: {
    filter_name?: string | number;
    filter_params?: string | number;
  };
  /**
   * Generate a frei0r source.
   * @see https://ffmpeg.org/ffmpeg-filters.html#frei0r_005fsrc
   */
  frei0r_src: {
    /** Dimensions of the generated video. */
    size?: string | number;
    framerate?: string | number;
    filter_name?: string | number;
    filter_params?: string | number;
  };
  /**
   * Apply Fast Simple Post-processing filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#fspp
   */
  fspp: {
    /** set quality */
    quality?: number;
    /** force a constant quantizer parameter */
    qp?: number;
    /** set filter strength */
    strength?: number;
    /** use B-frames' QP */
    use_bframe_qp?: boolean;
  };
  /**
   * Synchronize video frames from external source.
   * @see https://ffmpeg.org/ffmpeg-filters.html#fsync
   */
  fsync: {
    /** set the file name to use for frame sync */
    file?: string | number;
    /** set the file name to use for frame sync */
    f?: string | number;
  };
  /**
   * Apply Gaussian Blur filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#gblur
   */
  gblur: {
    /** set sigma */
    sigma?: number;
    /** set number of steps */
    steps?: number;
    /** set planes to filter */
    planes?: number;
    /** set vertical sigma */
    sigmaV?: number;
  };
  /**
   * Gaussian Blur in Vulkan
   * @see https://ffmpeg.org/ffmpeg-filters.html#gblur_005fvulkan
   */
  gblur_vulkan: {
    /** Set sigma */
    sigma?: number;
    /** Set vertical sigma */
    sigmaV?: number;
    /** Set planes to filter */
    planes?: number;
    /** Set kernel size */
    size?: number;
    /** Set vertical kernel size */
    sizeV?: number;
  };
  /**
   * Apply generic equation to each pixel.
   * @see https://ffmpeg.org/ffmpeg-filters.html#geq
   */
  geq: {
    /** set luminance expression */
    lum_expr?: string | number;
    /** set luminance expression */
    lum?: string | number;
    /** set chroma blue expression */
    cb_expr?: string | number;
    /** set chroma blue expression */
    cb?: string | number;
    /** set chroma red expression */
    cr_expr?: string | number;
    /** set chroma red expression */
    cr?: string | number;
    /** set alpha expression */
    alpha_expr?: string | number;
    /** set alpha expression */
    a?: string | number;
    /** set red expression */
    red_expr?: string | number;
    /** set red expression */
    r?: string | number;
    /** set green expression */
    green_expr?: string | number;
    /** set green expression */
    g?: string | number;
    /** set blue expression */
    blue_expr?: string | number;
    /** set blue expression */
    b?: string | number;
    /** set interpolation method */
    interpolation?: 'nearest' | 'n' | 'bilinear' | 'b';
    /** set interpolation method */
    i?: 'nearest' | 'n' | 'bilinear' | 'b';
  };
  /**
   * Capture graphics/screen content as a video source
   * @see https://ffmpeg.org/ffmpeg-filters.html#gfxcapture
   */
  gfxcapture: {
    /** ECMAScript regular expression to match against the window title.  */
    window_title?: string | number;
    /** as window_title, but against the window class */
    window_class?: string | number;
    /** as window_title, but against the windows executable name */
    window_exe?: string | number;
    /** index of the monitor to capture */
    monitor_idx?: 'window';
    /** capture mouse cursor */
    capture_cursor?: boolean;
    /** capture full window border */
    capture_border?: boolean;
    /** display yellow border around captured window */
    display_border?: boolean;
    /** set maximum capture frame rate */
    max_framerate?: string | number;
    /** pre-existing HWND handle */
    hwnd?: number;
    /** pre-existing HMONITOR handle */
    hmonitor?: number;
    /** force width of the output frames, negative values round down the width to the nearest multiple of that number */
    width?: number;
    /** force height of the output frames, negative values round down the height to the nearest multiple of that number */
    height?: number;
    /** number of pixels to crop from the left of the captured area */
    crop_left?: number;
    /** number of pixels to crop from the top of the captured area */
    crop_top?: number;
    /** number of pixels to crop from the right of the captured area */
    crop_right?: number;
    /** number of pixels to crop from the bottom of the captured area */
    crop_bottom?: number;
    /** return premultiplied alpha frames */
    premultiplied?: boolean;
    /** capture source resize behavior */
    resize_mode?: 'crop' | 'scale' | 'scale_aspect';
    /** scaling algorithm */
    scale_mode?: 'point' | 'bilinear' | 'bicubic';
    /** desired output format */
    output_fmt?: '8bit' | 'bgra' | '10bit' | 'x2bgr10' | '16bit' | 'rgbaf16';
  };
  /**
   * Debands video quickly using gradients.
   * @see https://ffmpeg.org/ffmpeg-filters.html#gradfun
   */
  gradfun: {
    /** The maximum amount by which the filter will change any one pixel. */
    strength?: number;
    /** The neighborhood to fit the gradient to. */
    radius?: number;
  };
  /**
   * Draw a gradients.
   * @see https://ffmpeg.org/ffmpeg-filters.html#gradients
   */
  gradients: {
    /** set frame size */
    size?: string | number;
    /** set frame size */
    s?: string | number;
    /** set frame rate */
    rate?: string | number;
    /** set frame rate */
    r?: string | number;
    /** set 1st color */
    c0?: string | number;
    /** set 2nd color */
    c1?: string | number;
    /** set 3rd color */
    c2?: string | number;
    /** set 4th color */
    c3?: string | number;
    /** set 5th color */
    c4?: string | number;
    /** set 6th color */
    c5?: string | number;
    /** set 7th color */
    c6?: string | number;
    /** set 8th color */
    c7?: string | number;
    /** set gradient line source x0 */
    x0?: number;
    /** set gradient line source y0 */
    y0?: number;
    /** set gradient line destination x1 */
    x1?: number;
    /** set gradient line destination y1 */
    y1?: number;
    /** set the number of colors */
    nb_colors?: number;
    /** set the number of colors */
    n?: number;
    /** set the seed */
    seed?: number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set gradients rotation speed */
    speed?: number;
    /** set gradient type */
    type?: 'linear' | 'radial' | 'circular' | 'spiral' | 'square';
    /** set gradient type */
    t?: 'linear' | 'radial' | 'circular' | 'spiral' | 'square';
  };
  /**
   * Show various filtergraph stats.
   * @see https://ffmpeg.org/ffmpeg-filters.html#graphmonitor
   */
  graphmonitor: {
    /** set monitor size */
    size?: string | number;
    /** set monitor size */
    s?: string | number;
    /** set video opacity */
    opacity?: number;
    /** set video opacity */
    o?: number;
    /** set mode */
    mode?: 'full' | 'compact' | 'nozero' | 'noeof' | 'nodisabled' | (string & {});
    /** set mode */
    m?: 'full' | 'compact' | 'nozero' | 'noeof' | 'nodisabled' | (string & {});
    /** set flags */
    flags?:
      | 'none'
      | 'all'
      | 'queue'
      | 'frame_count_in'
      | 'frame_count_out'
      | 'frame_count_delta'
      | 'pts'
      | 'pts_delta'
      | 'time'
      | 'time_delta'
      | 'timebase'
      | 'format'
      | 'size'
      | 'rate'
      | 'eof'
      | 'sample_count_in'
      | 'sample_count_out'
      | 'sample_count_delta'
      | 'disabled'
      | (string & {});
    /** set flags */
    f?:
      | 'none'
      | 'all'
      | 'queue'
      | 'frame_count_in'
      | 'frame_count_out'
      | 'frame_count_delta'
      | 'pts'
      | 'pts_delta'
      | 'time'
      | 'time_delta'
      | 'timebase'
      | 'format'
      | 'size'
      | 'rate'
      | 'eof'
      | 'sample_count_in'
      | 'sample_count_out'
      | 'sample_count_delta'
      | 'disabled'
      | (string & {});
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
  };
  /**
   * Adjust white balance using LAB gray world algorithm
   * @see https://ffmpeg.org/ffmpeg-filters.html#grayworld
   */
  grayworld: {};
  /**
   * Apply Guided filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#guided
   */
  guided: {
    /** set the box radius */
    radius?: number;
    /** set the regularization parameter (with square) */
    eps?: number;
    /** set filtering mode (0: basic mode; 1: fast mode) */
    mode?: 'basic' | 'fast';
    /** subsampling ratio for fast mode */
    sub?: number;
    /** set guidance mode (0: off mode; 1: on mode) */
    guidance?: 'off' | 'on';
    /** set planes to filter */
    planes?: number;
  };
  /**
   * Apply Haas Stereo Enhancer.
   * @see https://ffmpeg.org/ffmpeg-filters.html#haas
   */
  haas: {
    /** set level in */
    level_in?: number;
    /** set level out */
    level_out?: number;
    /** set side gain */
    side_gain?: number;
    /** set middle source */
    middle_source?: 'left' | 'right' | 'mid' | 'side';
    /** set middle phase */
    middle_phase?: boolean;
    /** set left delay */
    left_delay?: number;
    /** set left balance */
    left_balance?: number;
    /** set left gain */
    left_gain?: number;
    /** set left phase */
    left_phase?: boolean;
    /** set right delay */
    right_delay?: number;
    /** set right balance */
    right_balance?: number;
    /** set right gain */
    right_gain?: number;
    /** set right phase */
    right_phase?: boolean;
  };
  /**
   * Adjust colors using a Hald CLUT.
   * @see https://ffmpeg.org/ffmpeg-filters.html#haldclut
   */
  haldclut: {
    /** set 3D LUT file name */
    file?: string | number;
    /** when to process CLUT */
    clut?: 'first' | 'all';
    /** select interpolation mode */
    interp?: 'nearest' | 'trilinear' | 'tetrahedral' | 'pyramid' | 'prism';
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Provide an identity Hald CLUT.
   * @see https://ffmpeg.org/ffmpeg-filters.html#haldclutsrc
   */
  haldclutsrc: {
    /** set level */
    level?: number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
  };
  /**
   * Apply High Definition Compatible Digital (HDCD) decoding.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hdcd
   */
  hdcd: {
    /** Disable any format conversion or resampling in the filter graph. */
    disable_autoconvert?: boolean;
    /** Process stereo channels together. Only apply target_gain when both channels match. */
    process_stereo?: boolean;
    /** Code detect timer period in ms. */
    cdt_ms?: number;
    /** Always extend peaks above -3dBFS even when PE is not signaled. */
    force_pe?: boolean;
    /** Replace audio with solid tone and signal some processing aspect in the amplitude. */
    analyze_mode?: 'off' | 'lle' | 'pe' | 'cdt' | 'tgm';
    /** Valid bits per sample (location of the true LSB). */
    bits_per_sample?: '16' | '20' | '24';
  };
  /**
   * Apply headphone binaural spatialization with HRTFs in additional streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#headphone
   */
  headphone: {
    /** set channels convolution mappings */
    map?: string | number;
    /** set gain in dB */
    gain?: number;
    /** set lfe gain in dB */
    lfe?: number;
    /** set processing */
    type?: 'time' | 'freq';
    /** set frame size */
    size?: number;
    /** set hrir format */
    hrir?: 'stereo' | 'multich';
  };
  /**
   * Horizontally flip the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hflip
   */
  hflip: {};
  /**
   * Horizontally flip the input video in Vulkan
   * @see https://ffmpeg.org/ffmpeg-filters.html#hflip_005fvulkan
   */
  hflip_vulkan: {};
  /**
   * Generate a Hilbert transform FIR coefficients.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hilbert
   */
  hilbert: {
    /** set sample rate */
    sample_rate?: number;
    /** set sample rate */
    r?: number;
    /** set number of taps */
    taps?: number;
    /** set number of taps */
    t?: number;
    /** set the number of samples per requested frame */
    nb_samples?: number;
    /** set the number of samples per requested frame */
    n?: number;
    /** set window function */
    win_func?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
    /** set window function */
    w?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
  };
  /**
   * Apply global color histogram equalization.
   * @see https://ffmpeg.org/ffmpeg-filters.html#histeq
   */
  histeq: {
    /** set the strength */
    strength?: number;
    /** set the intensity */
    intensity?: number;
    /** set the antibanding level */
    antibanding?: 'none' | 'weak' | 'strong';
  };
  /**
   * Compute and draw a histogram.
   * @see https://ffmpeg.org/ffmpeg-filters.html#histogram
   */
  histogram: {
    /** set level height */
    level_height?: number;
    /** set scale height */
    scale_height?: number;
    /** set display mode */
    display_mode?: 'overlay' | 'parade' | 'stack';
    /** set display mode */
    d?: 'overlay' | 'parade' | 'stack';
    /** set levels mode */
    levels_mode?: 'linear' | 'logarithmic';
    /** set levels mode */
    m?: 'linear' | 'logarithmic';
    /** set color components to display */
    components?: number;
    /** set color components to display */
    c?: number;
    /** set foreground opacity */
    fgopacity?: number;
    /** set foreground opacity */
    f?: number;
    /** set background opacity */
    bgopacity?: number;
    /** set background opacity */
    b?: number;
    /** set colors mode */
    colors_mode?:
      | 'whiteonblack'
      | 'blackonwhite'
      | 'whiteongray'
      | 'blackongray'
      | 'coloronblack'
      | 'coloronwhite'
      | 'colorongray'
      | 'blackoncolor'
      | 'whiteoncolor'
      | 'grayoncolor';
    /** set colors mode */
    l?:
      | 'whiteonblack'
      | 'blackonwhite'
      | 'whiteongray'
      | 'blackongray'
      | 'coloronblack'
      | 'coloronwhite'
      | 'colorongray'
      | 'blackoncolor'
      | 'whiteoncolor'
      | 'grayoncolor';
  };
  /**
   * Apply a High Quality 3D Denoiser.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hqdn3d
   */
  hqdn3d: {
    /** spatial luma strength */
    luma_spatial?: number;
    /** spatial chroma strength */
    chroma_spatial?: number;
    /** temporal luma strength */
    luma_tmp?: number;
    /** temporal chroma strength */
    chroma_tmp?: number;
  };
  /**
   * Scale the input by 2, 3 or 4 using the hq*x magnification algorithm.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hqx
   */
  hqx: {
    /** set scale factor */
    n?: number;
  };
  /**
   * Stack video inputs horizontally.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hstack
   */
  hstack: {
    /** set number of inputs */
    inputs?: number;
    /** force termination when the shortest input terminates */
    shortest?: boolean;
  };
  /**
   * Turns a certain HSV range into gray.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hsvhold
   */
  hsvhold: {
    /** set the hue value */
    hue?: number;
    /** set the saturation value */
    sat?: number;
    /** set the value value */
    val?: number;
    /** set the hsvhold similarity value */
    similarity?: number;
    /** set the hsvhold blend value */
    blend?: number;
  };
  /**
   * Turns a certain HSV range into transparency. Operates on YUV colors.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hsvkey
   */
  hsvkey: {
    /** set the hue value */
    hue?: number;
    /** set the saturation value */
    sat?: number;
    /** set the value value */
    val?: number;
    /** set the hsvkey similarity value */
    similarity?: number;
    /** set the hsvkey blend value */
    blend?: number;
  };
  /**
   * Adjust the hue and saturation of the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hue
   */
  hue: {
    /** set the hue angle degrees expression */
    h?: string | number;
    /** set the saturation expression */
    s?: string | number;
    /** set the hue angle radians expression */
    H?: string | number;
    /** set the brightness expression */
    b?: string | number;
  };
  /**
   * Apply hue-saturation-intensity adjustments.
   * @see https://ffmpeg.org/ffmpeg-filters.html#huesaturation
   */
  huesaturation: {
    /** set the hue shift */
    hue?: number;
    /** set the saturation shift */
    saturation?: number;
    /** set the intensity shift */
    intensity?: number;
    /** set colors range */
    colors?: 'r' | 'y' | 'g' | 'c' | 'b' | 'm' | 'a' | (string & {});
    /** set the filtering strength */
    strength?: number;
    /** set the red weight */
    rw?: number;
    /** set the green weight */
    gw?: number;
    /** set the blue weight */
    bw?: number;
    /** set the preserve lightness */
    lightness?: boolean;
  };
  /**
   * Download a hardware frame to a normal frame
   * @see https://ffmpeg.org/ffmpeg-filters.html#hwdownload
   */
  hwdownload: {};
  /**
   * Map hardware frames
   * @see https://ffmpeg.org/ffmpeg-filters.html#hwmap
   */
  hwmap: {
    /** Frame mapping mode */
    mode?: 'read' | 'write' | 'overwrite' | 'direct' | (string & {});
    /** Derive a new device of this type */
    derive_device?: string | number;
    /** Map in reverse (create and allocate in the sink) */
    reverse?: number;
  };
  /**
   * Upload a normal frame to a hardware frame
   * @see https://ffmpeg.org/ffmpeg-filters.html#hwupload
   */
  hwupload: {
    /** Derive a new device of this type */
    derive_device?: string | number;
  };
  /**
   * Upload a system memory frame to a CUDA device.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hwupload_005fcuda
   */
  hwupload_cuda: {
    /** Number of the device to use */
    device?: number;
  };
  /**
   * Upload a system memory frame to a VAAPI device.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hwupload_005fvaapi
   */
  hwupload_vaapi: {};
  /**
   * Grow first stream into second stream by connecting components.
   * @see https://ffmpeg.org/ffmpeg-filters.html#hysteresis
   */
  hysteresis: {
    /** set planes */
    planes?: number;
    /** set threshold */
    threshold?: number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Detect and parse ICC profiles.
   * @see https://ffmpeg.org/ffmpeg-filters.html#iccdetect
   */
  iccdetect: {
    /** overwrite existing tags */
    force?: boolean;
  };
  /**
   * Generate and attach ICC profiles.
   * @see https://ffmpeg.org/ffmpeg-filters.html#iccgen
   */
  iccgen: {
    /** select color primaries */
    color_primaries?:
      | 'auto'
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213';
    /** select color transfer */
    color_trc?:
      | 'auto'
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'linear'
      | 'iec61966-2-4'
      | 'bt1361e'
      | 'iec61966-2-1'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'smpte2084'
      | 'arib-std-b67';
    /** overwrite existing ICC profile */
    force?: boolean;
  };
  /**
   * Calculate the Identity between two video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#identity
   */
  identity: {
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Interlace detect Filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#idet
   */
  idet: {
    /** set interlacing threshold */
    intl_thres?: number;
    /** set progressive threshold */
    prog_thres?: number;
    /** set repeat threshold */
    rep_thres?: number;
    /** half life of cumulative statistics */
    half_life?: number;
    /** set number of frames to use to determine if the interlace flag is accurate */
    analyze_interlaced_flag?: number;
  };
  /**
   * Deinterleave or interleave fields.
   * @see https://ffmpeg.org/ffmpeg-filters.html#il
   */
  il: {
    /** select luma mode */
    luma_mode?: 'none' | 'interleave' | 'i' | 'deinterleave' | 'd';
    /** select luma mode */
    l?: 'none' | 'interleave' | 'i' | 'deinterleave' | 'd';
    /** select chroma mode */
    chroma_mode?: 'none' | 'interleave' | 'i' | 'deinterleave' | 'd';
    /** select chroma mode */
    c?: 'none' | 'interleave' | 'i' | 'deinterleave' | 'd';
    /** select alpha mode */
    alpha_mode?: 'none' | 'interleave' | 'i' | 'deinterleave' | 'd';
    /** select alpha mode */
    a?: 'none' | 'interleave' | 'i' | 'deinterleave' | 'd';
    /** swap luma fields */
    luma_swap?: boolean;
    /** swap luma fields */
    ls?: boolean;
    /** swap chroma fields */
    chroma_swap?: boolean;
    /** swap chroma fields */
    cs?: boolean;
    /** swap alpha fields */
    alpha_swap?: boolean;
    /** swap alpha fields */
    as?: boolean;
  };
  /**
   * Convert progressive video into interlaced.
   * @see https://ffmpeg.org/ffmpeg-filters.html#interlace
   */
  interlace: {
    /** scanning mode */
    scan?: 'tff' | 'bff';
    /** set vertical low-pass filter */
    lowpass?: 'off' | 'linear' | 'complex';
  };
  /**
   * Convert progressive video into interlaced.
   * @see https://ffmpeg.org/ffmpeg-filters.html#interlace_005fvulkan
   */
  interlace_vulkan: {
    /** scanning mode */
    scan?: 'tff' | 'bff';
    /** set vertical low-pass filter */
    lowpass?: 'off' | 'linear' | 'complex';
  };
  /**
   * Temporally interleave video inputs.
   * @see https://ffmpeg.org/ffmpeg-filters.html#interleave
   */
  interleave: {
    /** set number of inputs */
    nb_inputs?: number;
    /** set number of inputs */
    n?: number;
    /** how to determine the end-of-stream */
    duration?: 'longest' | 'shortest' | 'first';
  };
  /**
   * Join multiple audio streams into
   * @see https://ffmpeg.org/ffmpeg-filters.html#join
   */
  join: {
    /** Number of input streams. */
    inputs?: number;
    /** Channel layout of the  */
    channel_layout?: string | number;
    /** A comma-separated list of channels maps in the format  */
    map?: string | number;
  };
  /**
   * Apply kernel deinterlacing to the input.
   * @see https://ffmpeg.org/ffmpeg-filters.html#kerndeint
   */
  kerndeint: {
    /** set the threshold */
    thresh?: number;
    /** set the map */
    map?: boolean;
    /** set the order */
    order?: boolean;
    /** set sharpening */
    sharp?: boolean;
    /** set twoway */
    twoway?: boolean;
  };
  /**
   * Apply kirsch operator.
   * @see https://ffmpeg.org/ffmpeg-filters.html#kirsch
   */
  kirsch: {
    /** set planes to filter */
    planes?: number;
    /** set scale */
    scale?: number;
    /** set delta */
    delta?: number;
  };
  /**
   * Apply LADSPA effect.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ladspa
   */
  ladspa: {
    /** set library name or full path */
    file?: string | number;
    /** set library name or full path */
    f?: string | number;
    /** set plugin name */
    plugin?: string | number;
    /** set plugin name */
    p?: string | number;
    /** set plugin options */
    controls?: string | number;
    /** set plugin options */
    c?: string | number;
    /** set sample rate */
    sample_rate?: number;
    /** set sample rate */
    s?: number;
    /** set the number of samples per requested frame */
    nb_samples?: number;
    /** set the number of samples per requested frame */
    n?: number;
    /** set audio duration */
    duration?: string | number;
    /** set audio duration */
    d?: string | number;
    /** enable latency compensation */
    latency?: boolean;
    /** enable latency compensation */
    l?: boolean;
  };
  /**
   * Slowly update darker pixels.
   * @see https://ffmpeg.org/ffmpeg-filters.html#lagfun
   */
  lagfun: {
    /** set decay */
    decay?: number;
    /** set what planes to filter */
    planes?: string;
  };
  /**
   * Report video filtering latency.
   * @see https://ffmpeg.org/ffmpeg-filters.html#latency
   */
  latency: {};
  /**
   * LCEVC
   * @see https://ffmpeg.org/ffmpeg-filters.html#lcevc
   */
  lcevc: {};
  /**
   * Rectify the image by correcting for lens distortion.
   * @see https://ffmpeg.org/ffmpeg-filters.html#lenscorrection
   */
  lenscorrection: {
    /** set relative center x */
    cx?: number;
    /** set relative center y */
    cy?: number;
    /** set quadratic distortion factor */
    k1?: number;
    /** set double quadratic distortion factor */
    k2?: number;
    /** set interpolation type */
    i?: 'nearest' | 'bilinear';
    /** set the color of the unmapped pixels */
    fc?: string | number;
  };
  /**
   * Apply correction to an image based on info derived from the lensfun database.
   * @see https://ffmpeg.org/ffmpeg-filters.html#lensfun
   */
  lensfun: {
    /** set camera maker */
    make?: string | number;
    /** set camera model */
    model?: string | number;
    /** set lens model */
    lens_model?: string | number;
    /** set path to database */
    db_path?: string | number;
    /** set mode */
    mode?: 'vignetting' | 'geometry' | 'subpixel' | 'vig_geo' | 'vig_subpixel' | 'distortion' | 'all';
    /** focal length of video (zoom; constant for the duration of the use of this filter) */
    focal_length?: number;
    /** aperture (constant for the duration of the use of this filter) */
    aperture?: number;
    /** focus distance (constant for the duration of the use of this filter) */
    focus_distance?: number;
    /** scale factor applied after corrections (0.0 means automatic scaling) */
    scale?: number;
    /** target geometry of the lens correction (only when geometry correction is enabled) */
    target_geometry?:
      | 'rectilinear'
      | 'fisheye'
      | 'panoramic'
      | 'equirectangular'
      | 'fisheye_orthographic'
      | 'fisheye_stereographic'
      | 'fisheye_equisolid'
      | 'fisheye_thoby';
    /** Does reverse correction (regular image to lens distorted) */
    reverse?: boolean;
    /** Type of interpolation */
    interpolation?: 'nearest' | 'linear' | 'lanczos';
  };
  /**
   * Apply various GPU filters from libplacebo
   * @see https://ffmpeg.org/ffmpeg-filters.html#libplacebo
   */
  libplacebo: {
    /** Number of inputs */
    inputs?: number;
    /** Output video frame width */
    w?: string | number;
    /** Output video frame height */
    h?: string | number;
    /** Output video frame rate */
    fps?: string | number;
    /** Input video crop x */
    crop_x?: string | number;
    /** Input video crop y */
    crop_y?: string | number;
    /** Input video crop w */
    crop_w?: string | number;
    /** Input video crop h */
    crop_h?: string | number;
    /** Output video placement x */
    pos_x?: string | number;
    /** Output video placement y */
    pos_y?: string | number;
    /** Output video placement w */
    pos_w?: string | number;
    /** Output video placement h */
    pos_h?: string | number;
    /** Output video format */
    format?: string | number;
    /** decrease or increase w/h if necessary to keep the original AR */
    force_original_aspect_ratio?: 'disable' | 'decrease' | 'increase';
    /** enforce that the output resolution is divisible by a defined integer when force_original_aspect_ratio is used */
    force_divisible_by?: number;
    /** force SAR normalization to 1:1 by adjusting pos_x/y/w/h */
    reset_sar?: boolean;
    /** like reset_sar, but pad/crop instead of stretching the video */
    normalize_sar?: boolean;
    /** ratio between padding and cropping when normalizing SAR (0=pad, 1=crop) */
    pad_crop_ratio?: number;
    /** Content fit strategy for placing input layers in the output */
    fit_mode?: 'fill' | 'contain' | 'cover' | 'none' | 'place' | 'scale_down';
    /** Output size strategy (for the base layer only) */
    fit_sense?: 'target' | 'constraint';
    /** Background fill color */
    fillcolor?: string | number;
    /** Corner rounding radius */
    corner_rounding?: number;
    /** Path to custom LUT file to apply */
    lut?: string | number;
    /** Application mode of the custom LUT */
    lut_type?: 'auto' | 'native' | 'normalized' | 'conversion';
    /** Pass extra libplacebo-specific options using a :-separated list of key=value pairs */
    extra_opts?: string | number;
    /** Set shader cache path */
    shader_cache?: string | number;
    /** select colorspace */
    colorspace?: 'auto' | 'gbr' | 'bt709' | 'unknown' | 'bt470bg' | 'smpte170m' | 'smpte240m' | 'ycgco' | 'bt2020nc' | 'bt2020c' | 'ictcp';
    /** select color range */
    range?: 'auto' | 'unspecified' | 'unknown' | 'limited' | 'tv' | 'mpeg' | 'full' | 'pc' | 'jpeg';
    /** select color primaries */
    color_primaries?:
      | 'auto'
      | 'bt709'
      | 'unknown'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213'
      | 'vgamut';
    /** select color transfer */
    color_trc?:
      | 'auto'
      | 'bt709'
      | 'unknown'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'linear'
      | 'iec61966-2-4'
      | 'bt1361e'
      | 'iec61966-2-1'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'smpte2084'
      | 'arib-std-b67'
      | 'vlog';
    /** select chroma location */
    chroma_location?: 'auto' | 'unspecified' | 'unknown' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom';
    /** rotate the input clockwise */
    rotate?: '0' | '90' | '180' | '270' | '360';
    /** select alpha moda */
    alpha_mode?: 'auto' | 'unspecified' | 'unknown' | 'premultiplied' | 'straight';
    /** Upscaler function */
    upscaler?: string | number;
    /** Downscaler function */
    downscaler?: string | number;
    /** Frame mixing function */
    frame_mixer?: string | number;
    /** Antiringing strength (for non-EWA filters) */
    antiringing?: number;
    /** Enable sigmoid upscaling */
    sigmoid?: boolean;
    /** Apply film grain metadata */
    apply_filmgrain?: boolean;
    /** Apply Dolby Vision metadata */
    apply_dolbyvision?: boolean;
    /** Deinterlacing mode */
    deinterlace?: 'weave' | 'bob' | 'yadif' | 'bwdif';
    /** Skip yadif spatial check */
    skip_spatial_check?: boolean;
    /** Output a frame for each field */
    send_fields?: boolean;
    /** Enable debanding */
    deband?: boolean;
    /** Deband iterations */
    deband_iterations?: number;
    /** Deband threshold */
    deband_threshold?: number;
    /** Deband radius */
    deband_radius?: number;
    /** Deband grain */
    deband_grain?: number;
    /** Brightness boost */
    brightness?: number;
    /** Contrast gain */
    contrast?: number;
    /** Saturation gain */
    saturation?: number;
    /** Hue shift */
    hue?: number;
    /** Gamma adjustment */
    gamma?: number;
    /** Color temperature adjustment (kelvin) */
    temperature?: number;
    /** Enable dynamic peak detection for HDR tone-mapping */
    peak_detect?: boolean;
    /** Peak detection smoothing period */
    smoothing_period?: number;
    /** Scene change low threshold */
    scene_threshold_low?: number;
    /** Scene change high threshold */
    scene_threshold_high?: number;
    /** Peak detection percentile */
    percentile?: number;
    /** Gamut-mapping mode */
    gamut_mode?: 'clip' | 'perceptual' | 'relative' | 'saturation' | 'absolute' | 'desaturate' | 'darken' | 'warn' | 'linear';
    /** Tone-mapping algorithm */
    tonemapping?: 'auto' | 'clip' | 'st2094-40' | 'st2094-10' | 'bt.2390' | 'bt.2446a' | 'spline' | 'reinhard' | 'mobius' | 'hable' | 'gamma' | 'linear';
    /** Tunable parameter for some tone-mapping functions */
    tonemapping_param?: number;
    /** Inverse tone mapping (range expansion) */
    inverse_tonemapping?: boolean;
    /** Tone-mapping LUT size */
    tonemapping_lut_size?: number;
    /** HDR contrast recovery strength */
    contrast_recovery?: number;
    /** HDR contrast recovery smoothness */
    contrast_smoothness?: number;
    /** Dither method to use */
    dithering?: 'none' | 'blue' | 'ordered' | 'ordered_fixed' | 'white';
    /** Dithering LUT size */
    dither_lut_size?: number;
    /** Enable temporal dithering */
    dither_temporal?: boolean;
    /** Colorblindness adaptation model */
    cones?: 'l' | 'm' | 's' | (string & {});
    /** Colorblindness adaptation strength */
    'cone-strength'?: number;
    /** Path to custom user shader (mpv .hook format) */
    custom_shader_path?: string | number;
    /** Custom user shader as binary (mpv .hook format) */
    custom_shader_bin?: string | number;
    /** Skip anti-aliasing */
    skip_aa?: boolean;
    /** Disable linear scaling */
    disable_linear?: boolean;
    /** Disable built-in scalers */
    disable_builtin?: boolean;
    /** Force dithering */
    force_dither?: boolean;
    /** Force-disable FBOs */
    disable_fbos?: boolean;
  };
  /**
   * Calculate the VMAF between two video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#libvmaf
   */
  libvmaf: {
    /** Set the file path to be used to write log. */
    log_path?: string | number;
    /** Set the format of the log (csv, json, xml, or sub). */
    log_fmt?: string | number;
    /** Set the pool method to be used for computing vmaf. */
    pool?: string | number;
    /** Set number of threads to be used when computing vmaf. */
    n_threads?: number;
    /** Set interval for frame subsampling used when computing vmaf. */
    n_subsample?: number;
    /** Set the model to be used for computing vmaf. */
    model?: string | number;
    /** Set the feature to be used for computing vmaf. */
    feature?: string | number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Calculate the VMAF between two video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#libvmaf_005fcuda
   */
  libvmaf_cuda: {
    /** Set the file path to be used to write log. */
    log_path?: string | number;
    /** Set the format of the log (csv, json, xml, or sub). */
    log_fmt?: string | number;
    /** Set the pool method to be used for computing vmaf. */
    pool?: string | number;
    /** Set number of threads to be used when computing vmaf. */
    n_threads?: number;
    /** Set interval for frame subsampling used when computing vmaf. */
    n_subsample?: number;
    /** Set the model to be used for computing vmaf. */
    model?: string | number;
    /** Set the feature to be used for computing vmaf. */
    feature?: string | number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Create life.
   * @see https://ffmpeg.org/ffmpeg-filters.html#life
   */
  life: {
    /** set source file */
    filename?: string | number;
    /** set source file */
    f?: string | number;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set rule */
    rule?: string | number;
    /** set fill ratio for filling initial grid randomly */
    random_fill_ratio?: number;
    /** set fill ratio for filling initial grid randomly */
    ratio?: number;
    /** set the seed for filling the initial grid randomly */
    random_seed?: number;
    /** set the seed for filling the initial grid randomly */
    seed?: number;
    /** stitch boundaries */
    stitch?: boolean;
    /** set mold speed for dead cells */
    mold?: number;
    /** set life color */
    life_color?: string | number;
    /** set death color */
    death_color?: string | number;
    /** set mold color */
    mold_color?: string | number;
  };
  /**
   * Apply filtering with limiting difference.
   * @see https://ffmpeg.org/ffmpeg-filters.html#limitdiff
   */
  limitdiff: {
    /** set the threshold */
    threshold?: number;
    /** set the elasticity */
    elasticity?: number;
    /** enable reference stream */
    reference?: boolean;
    /** set the planes to filter */
    planes?: number;
  };
  /**
   * Limit pixels components to the specified range.
   * @see https://ffmpeg.org/ffmpeg-filters.html#limiter
   */
  limiter: {
    /** set min value */
    min?: number;
    /** set max value */
    max?: number;
    /** set planes */
    planes?: number;
  };
  /**
   * Loop video frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#loop
   */
  loop: {
    /** number of loops */
    loop?: number;
    /** max number of frames to loop */
    size?: number;
    /** set the loop start frame */
    start?: number;
    /** set the loop start time */
    time?: string | number;
  };
  /**
   * EBU R128 loudness normalization
   * @see https://ffmpeg.org/ffmpeg-filters.html#loudnorm
   */
  loudnorm: {
    /** set integrated loudness target */
    I?: number;
    /** set integrated loudness target */
    i?: number;
    /** set loudness range target */
    LRA?: number;
    /** set loudness range target */
    lra?: number;
    /** set maximum true peak */
    TP?: number;
    /** set maximum true peak */
    tp?: number;
    /** measured IL of input file */
    measured_I?: number;
    /** measured IL of input file */
    measured_i?: number;
    /** measured LRA of input file */
    measured_LRA?: number;
    /** measured LRA of input file */
    measured_lra?: number;
    /** measured true peak of input file */
    measured_TP?: number;
    /** measured true peak of input file */
    measured_tp?: number;
    /** measured threshold of input file */
    measured_thresh?: number;
    /** set offset gain */
    offset?: number;
    /** normalize linearly if possible */
    linear?: boolean;
    /** treat mono input as dual-mono */
    dual_mono?: boolean;
    /** set print format for stats */
    print_format?: 'none' | 'json' | 'summary';
    /** set stats output file */
    stats_file?: string | number;
  };
  /**
   * Turns a certain luma into transparency.
   * @see https://ffmpeg.org/ffmpeg-filters.html#lumakey
   */
  lumakey: {
    /** set the threshold value */
    threshold?: number;
    /** set the tolerance value */
    tolerance?: number;
    /** set the softness value */
    softness?: number;
  };
  /**
   * Adjust colors using a 1D LUT.
   * @see https://ffmpeg.org/ffmpeg-filters.html#lut1d
   */
  lut1d: {
    /** set 1D LUT file name */
    file?: string | number;
    /** select interpolation mode */
    interp?: 'nearest' | 'linear' | 'cosine' | 'cubic' | 'spline';
  };
  /**
   * Compute and apply a lookup table from two video inputs.
   * @see https://ffmpeg.org/ffmpeg-filters.html#lut2
   */
  lut2: {
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Adjust colors using a 3D LUT.
   * @see https://ffmpeg.org/ffmpeg-filters.html#lut3d
   */
  lut3d: {
    /** set 3D LUT file name */
    file?: string | number;
    /** when to process CLUT */
    clut?: 'first' | 'all';
    /** select interpolation mode */
    interp?: 'nearest' | 'trilinear' | 'tetrahedral' | 'pyramid' | 'prism';
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Apply LV2 effect.
   * @see https://ffmpeg.org/ffmpeg-filters.html#lv2
   */
  lv2: {
    /** set plugin uri */
    plugin?: string | number;
    /** set plugin uri */
    p?: string | number;
    /** set plugin options */
    controls?: string | number;
    /** set plugin options */
    c?: string | number;
    /** set sample rate */
    sample_rate?: number;
    /** set sample rate */
    s?: number;
    /** set the number of samples per requested frame */
    nb_samples?: number;
    /** set the number of samples per requested frame */
    n?: number;
    /** set audio duration */
    duration?: string | number;
    /** set audio duration */
    d?: string | number;
  };
  /**
   * Render a Mandelbrot fractal.
   * @see https://ffmpeg.org/ffmpeg-filters.html#mandelbrot
   */
  mandelbrot: {
    /** set frame size */
    size?: string | number;
    /** set frame size */
    s?: string | number;
    /** set frame rate */
    rate?: string | number;
    /** set frame rate */
    r?: string | number;
    /** set max iterations number */
    maxiter?: number;
    /** set the initial x position */
    start_x?: number;
    /** set the initial y position */
    start_y?: number;
    /** set the initial scale value */
    start_scale?: number;
    /** set the terminal scale value */
    end_scale?: number;
    /** set the terminal pts value */
    end_pts?: number;
    /** set the bailout value */
    bailout?: number;
    /** set morph x frequency */
    morphxf?: number;
    /** set morph y frequency */
    morphyf?: number;
    /** set morph amplitude */
    morphamp?: number;
    /** set outer coloring mode */
    outer?: 'iteration_count' | 'normalized_iteration_count' | 'white' | 'outz';
    /** set inner coloring mode */
    inner?: 'black' | 'period' | 'convergence' | 'mincol';
  };
  /**
   * Clamp first stream with second stream and third stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#maskedclamp
   */
  maskedclamp: {
    /** set undershoot */
    undershoot?: number;
    /** set overshoot */
    overshoot?: number;
    /** set planes */
    planes?: number;
  };
  /**
   * Apply filtering with maximum difference of two streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#maskedmax
   */
  maskedmax: {
    /** set planes */
    planes?: number;
  };
  /**
   * Merge first stream with second stream using third stream as mask.
   * @see https://ffmpeg.org/ffmpeg-filters.html#maskedmerge
   */
  maskedmerge: {
    /** set planes */
    planes?: number;
  };
  /**
   * Apply filtering with minimum difference of two streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#maskedmin
   */
  maskedmin: {
    /** set planes */
    planes?: number;
  };
  /**
   * Pick pixels comparing absolute difference of two streams with threshold.
   * @see https://ffmpeg.org/ffmpeg-filters.html#maskedthreshold
   */
  maskedthreshold: {
    /** set threshold */
    threshold?: number;
    /** set planes */
    planes?: number;
    /** set mode */
    mode?: 'abs' | 'diff';
  };
  /**
   * Create Mask.
   * @see https://ffmpeg.org/ffmpeg-filters.html#maskfun
   */
  maskfun: {
    /** set low threshold */
    low?: number;
    /** set high threshold */
    high?: number;
    /** set planes */
    planes?: number;
    /** set fill value */
    fill?: number;
    /** set sum value */
    sum?: number;
  };
  /**
   * Apply motion compensating deinterlacing.
   * @see https://ffmpeg.org/ffmpeg-filters.html#mcdeint
   */
  mcdeint: {
    /** set mode */
    mode?: 'fast' | 'medium' | 'slow' | 'extra_slow';
    /** set the assumed picture field parity */
    parity?: 'tff' | 'bff';
    /** set qp */
    qp?: number;
  };
  /**
   * Multiband Compress or expand audio dynamic range.
   * @see https://ffmpeg.org/ffmpeg-filters.html#mcompand
   */
  mcompand: {
    /** set parameters for each band */
    args?: string | number;
  };
  /**
   * Apply Median filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#median
   */
  median: {
    /** set median radius */
    radius?: number;
    /** set planes to filter */
    planes?: number;
    /** set median vertical radius */
    radiusV?: number;
    /** set median percentile */
    percentile?: number;
  };
  /**
   * Merge planes.
   * @see https://ffmpeg.org/ffmpeg-filters.html#mergeplanes
   */
  mergeplanes: {
    /** set input to output plane mapping */
    mapping?: number;
    /** set output pixel format */
    format?: string | number;
    /** set 1st input to output stream mapping */
    map0s?: number;
    /** set 1st input to output plane mapping */
    map0p?: number;
    /** set 2nd input to output stream mapping */
    map1s?: number;
    /** set 2nd input to output plane mapping */
    map1p?: number;
    /** set 3rd input to output stream mapping */
    map2s?: number;
    /** set 3rd input to output plane mapping */
    map2p?: number;
    /** set 4th input to output stream mapping */
    map3s?: number;
    /** set 4th input to output plane mapping */
    map3p?: number;
  };
  /**
   * Generate motion vectors.
   * @see https://ffmpeg.org/ffmpeg-filters.html#mestimate
   */
  mestimate: {
    /** motion estimation method */
    method?: 'esa' | 'tss' | 'tdls' | 'ntss' | 'fss' | 'ds' | 'hexbs' | 'epzs' | 'umh';
    /** macroblock size */
    mb_size?: number;
    /** search parameter */
    search_param?: number;
  };
  /**
   * Generate motion vectors using D3D12 hardware acceleration.
   * @see https://ffmpeg.org/ffmpeg-filters.html#mestimate_005fd3d12
   */
  mestimate_d3d12: {
    /** macroblock size, only 8 and 16 are supported */
    mb_size?: number;
  };
  /**
   * Manipulate video frame metadata.
   * @see https://ffmpeg.org/ffmpeg-filters.html#metadata
   */
  metadata: {
    /** set a mode of operation */
    mode?: 'select' | 'add' | 'modify' | 'delete' | 'print';
    /** set metadata key */
    key?: string | number;
    /** set metadata value */
    value?: string | number;
    /** function for comparing values */
    function?: 'same_str' | 'starts_with' | 'less' | 'equal' | 'greater' | 'expr' | 'ends_with';
    /** set expression for expr function */
    expr?: string | number;
    /** set file where to print metadata information */
    file?: string | number;
    /** reduce buffering when printing to user-set file or pipe */
    direct?: boolean;
  };
  /**
   * Apply Midway Equalization.
   * @see https://ffmpeg.org/ffmpeg-filters.html#midequalizer
   */
  midequalizer: {
    /** set planes */
    planes?: number;
  };
  /**
   * Frame rate conversion using Motion Interpolation.
   * @see https://ffmpeg.org/ffmpeg-filters.html#minterpolate
   */
  minterpolate: {
    /** output's frame rate */
    fps?: string | number;
    /** motion interpolation mode */
    mi_mode?: 'dup' | 'blend' | 'mci';
    /** motion compensation mode */
    mc_mode?: 'obmc' | 'aobmc';
    /** motion estimation mode */
    me_mode?: 'bidir' | 'bilat';
    /** motion estimation method */
    me?: 'esa' | 'tss' | 'tdls' | 'ntss' | 'fss' | 'ds' | 'hexbs' | 'epzs' | 'umh';
    /** macroblock size */
    mb_size?: number;
    /** search parameter */
    search_param?: number;
    /** variable-size block motion compensation */
    vsbmc?: number;
    /** scene change detection method */
    scd?: 'none' | 'fdiff';
    /** scene change threshold */
    scd_threshold?: number;
  };
  /**
   * Mix video inputs.
   * @see https://ffmpeg.org/ffmpeg-filters.html#mix
   */
  mix: {
    /** set number of inputs */
    inputs?: number;
    /** set weight for each input */
    weights?: string | number;
    /** set scale */
    scale?: number;
    /** set what planes to filter */
    planes?: string;
    /** how to determine end of stream */
    duration?: 'longest' | 'shortest' | 'first';
  };
  /**
   * Convert video to gray using custom color filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#monochrome
   */
  monochrome: {
    /** set the chroma blue spot */
    cb?: number;
    /** set the chroma red spot */
    cr?: number;
    /** set the color filter size */
    size?: number;
    /** set the highlights strength */
    high?: number;
  };
  /**
   * Apply Morphological filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#morpho
   */
  morpho: {
    /** set morphological transform */
    mode?: 'erode' | 'dilate' | 'open' | 'close' | 'gradient' | 'tophat' | 'blackhat';
    /** set planes to filter */
    planes?: number;
    /** when to process structures */
    structure?: 'first' | 'all';
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Read from a movie source.
   * @see https://ffmpeg.org/ffmpeg-filters.html#movie
   */
  movie: {
    filename?: string | number;
    /** set format name */
    format_name?: string | number;
    /** set format name */
    f?: string | number;
    /** set stream index */
    stream_index?: number;
    /** set stream index */
    si?: number;
    /** set seekpoint (seconds) */
    seek_point?: number;
    /** set seekpoint (seconds) */
    sp?: number;
    /** set streams */
    streams?: string | number;
    /** set streams */
    s?: string | number;
    /** set loop count */
    loop?: number;
    /** set discontinuity threshold */
    discontinuity?: string | number;
    /** set the number of threads for decoding */
    dec_threads?: number;
    /** set format options for the opened file */
    format_opts?: string | number;
  };
  /**
   * Remove near-duplicate frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#mpdecimate
   */
  mpdecimate: {
    /** set the maximum number of consecutive dropped frames (positive), or the minimum interval between dropped frames (negative) */
    max?: number;
    /** set the number of similar consecutive frames to be kept before starting to drop similar frames */
    keep?: number;
    /** set high dropping threshold */
    hi?: number;
    /** set low dropping threshold */
    lo?: number;
    /** set fraction dropping threshold */
    frac?: number;
  };
  /**
   * Generate various test pattern.
   * @see https://ffmpeg.org/ffmpeg-filters.html#mptestsrc
   */
  mptestsrc: {
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set test to perform */
    test?: 'dc_luma' | 'dc_chroma' | 'freq_luma' | 'freq_chroma' | 'amp_luma' | 'amp_chroma' | 'cbp' | 'mv' | 'ring1' | 'ring2' | 'all';
    /** set test to perform */
    t?: 'dc_luma' | 'dc_chroma' | 'freq_luma' | 'freq_chroma' | 'amp_luma' | 'amp_chroma' | 'cbp' | 'mv' | 'ring1' | 'ring2' | 'all';
    /** Set the maximum number of frames generated for each test */
    max_frames?: number;
    /** Set the maximum number of frames generated for each test */
    m?: number;
  };
  /**
   * Calculate the MSAD between two video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#msad
   */
  msad: {
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Multiply first video stream with second video stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#multiply
   */
  multiply: {
    /** set scale */
    scale?: number;
    /** set offset */
    offset?: number;
    /** set planes */
    planes?: string;
  };
  /**
   * Negate input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#negate
   */
  negate: {
    /** set components to negate */
    components?: 'y' | 'u' | 'v' | 'r' | 'g' | 'b' | 'a' | (string & {});
    negate_alpha?: boolean;
  };
  /**
   * Non-local means denoiser.
   * @see https://ffmpeg.org/ffmpeg-filters.html#nlmeans
   */
  nlmeans: {
    /** denoising strength */
    s?: number;
    /** patch size */
    p?: number;
    /** patch size for chroma planes */
    pc?: number;
    /** research window */
    r?: number;
    /** research window for chroma planes */
    rc?: number;
  };
  /**
   * Non-local means denoiser through OpenCL
   * @see https://ffmpeg.org/ffmpeg-filters.html#nlmeans_005fopencl
   */
  nlmeans_opencl: {
    /** denoising strength */
    s?: number;
    /** patch size */
    p?: number;
    /** patch size for chroma planes */
    pc?: number;
    /** research window */
    r?: number;
    /** research window for chroma planes */
    rc?: number;
  };
  /**
   * Non-local means denoiser (Vulkan)
   * @see https://ffmpeg.org/ffmpeg-filters.html#nlmeans_005fvulkan
   */
  nlmeans_vulkan: {
    /** denoising strength for all components */
    s?: number;
    /** patch size for all components */
    p?: number;
    /** research window size */
    r?: number;
    /** parallelism */
    t?: number;
    /** denoising strength for component 1 */
    s1?: number;
    /** denoising strength for component 2 */
    s2?: number;
    /** denoising strength for component 3 */
    s3?: number;
    /** denoising strength for component 4 */
    s4?: number;
    /** patch size for component 1 */
    p1?: number;
    /** patch size for component 2 */
    p2?: number;
    /** patch size for component 3 */
    p3?: number;
    /** patch size for component 4 */
    p4?: number;
  };
  /**
   * Apply neural network edge directed interpolation intra-only deinterlacer.
   * @see https://ffmpeg.org/ffmpeg-filters.html#nnedi
   */
  nnedi: {
    /** set weights file */
    weights?: string | number;
    /** set which frames to deinterlace */
    deint?: 'all' | 'interlaced';
    /** set mode of operation */
    field?: 'af' | 'a' | 't' | 'b' | 'tf' | 'bf';
    /** set which planes to process */
    planes?: number;
    /** set size of local neighborhood around each pixel, used by the predictor neural network */
    nsize?: 's8x6' | 's16x6' | 's32x6' | 's48x6' | 's8x4' | 's16x4' | 's32x4';
    /** set number of neurons in predictor neural network */
    nns?: 'n16' | 'n32' | 'n64' | 'n128' | 'n256';
    /** set quality */
    qual?: 'fast' | 'slow';
    /** set which set of weights to use in the predictor */
    etype?: 'a' | 'abs' | 's' | 'mse';
    /** set prescreening */
    pscrn?: 'none' | 'original' | 'new' | 'new2' | 'new3';
  };
  /**
   * Force libavfilter not to use any of the specified pixel formats for the input to the next filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#noformat
   */
  noformat: {
    /** A '|'-separated list of pixel formats */
    pix_fmts?: string | number;
    /** A '|'-separated list of color spaces */
    color_spaces?: string | number;
    /** A '|'-separated list of color ranges */
    color_ranges?: string | number;
    /** A '|'-separated list of alpha modes */
    alpha_modes?: string | number;
  };
  /**
   * Add noise.
   * @see https://ffmpeg.org/ffmpeg-filters.html#noise
   */
  noise: {
    /** _seed */
    all?: number;
    /** _seed */
    c0?: number;
    /** _seed */
    c1?: number;
    /** _seed */
    c2?: number;
    /** _seed */
    c3?: number;
  };
  /**
   * Normalize RGB video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#normalize
   */
  normalize: {
    /** output color to which darkest input color is mapped */
    blackpt?: string | number;
    /** output color to which brightest input color is mapped */
    whitept?: string | number;
    /** amount of temporal smoothing of the input range, to reduce flicker */
    smoothing?: number;
    /** proportion of independent to linked channel normalization */
    independence?: number;
    /** strength of filter, from no effect to full normalization */
    strength?: number;
  };
  /**
   * Pass the source unchanged to the output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#null
   */
  null: {};
  /**
   * Do absolutely nothing with the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#nullsink
   */
  nullsink: {};
  /**
   * Null video source, return unprocessed video frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#nullsrc
   */
  nullsrc: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
  };
  /**
   * Optical Character Recognition.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ocr
   */
  ocr: {
    /** set datapath */
    datapath?: string | number;
    /** set language */
    language?: string | number;
    /** set character whitelist */
    whitelist?: string | number;
    /** set character blacklist */
    blacklist?: string | number;
  };
  /**
   * Apply transform using libopencv.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ocv
   */
  ocv: {
    filter_name?: string | number;
    filter_params?: string | number;
  };
  /**
   * Generate video using an OpenCL program
   * @see https://ffmpeg.org/ffmpeg-filters.html#openclsrc
   */
  openclsrc: {
    /** OpenCL program source file */
    source?: string | number;
    /** Kernel name in program */
    kernel?: string | number;
    /** Video size */
    size?: string | number;
    /** Video size */
    s?: string | number;
    /** Video format */
    format?: string | number;
    /** Video frame rate */
    rate?: string | number;
    /** Video frame rate */
    r?: string | number;
  };
  /**
   * 2D Video Oscilloscope.
   * @see https://ffmpeg.org/ffmpeg-filters.html#oscilloscope
   */
  oscilloscope: {
    /** set scope x position */
    x?: number;
    /** set scope y position */
    y?: number;
    /** set scope size */
    s?: number;
    /** set scope tilt */
    t?: number;
    /** set trace opacity */
    o?: number;
    /** set trace x position */
    tx?: number;
    /** set trace y position */
    ty?: number;
    /** set trace width */
    tw?: number;
    /** set trace height */
    th?: number;
    /** set components to trace */
    c?: number;
    /** draw trace grid */
    g?: boolean;
    /** draw statistics */
    st?: boolean;
    /** draw scope */
    sc?: boolean;
  };
  /**
   * Overlay a video source on top of the input.
   * @see https://ffmpeg.org/ffmpeg-filters.html#overlay
   */
  overlay: {
    /** set the x expression */
    x?: string | number;
    /** set the y expression */
    y?: string | number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** set output format */
    format?: 'yuv420' | 'yuv420p10' | 'yuv422' | 'yuv422p10' | 'yuv444' | 'yuv444p10' | 'rgb' | 'gbrp' | 'auto';
    /** repeat overlay of the last overlay frame */
    repeatlast?: boolean;
    /** alpha format */
    alpha?: 'auto' | 'unknown' | 'straight' | 'premultiplied';
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Overlay one video on top of another using CUDA
   * @see https://ffmpeg.org/ffmpeg-filters.html#overlay_005fcuda
   */
  overlay_cuda: {
    /** set the x expression of overlay */
    x?: string | number;
    /** set the y expression of overlay */
    y?: string | number;
    /** alpha format */
    alpha_format?: 'straight' | 'premultiplied';
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** repeat overlay of the last overlay frame */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Overlay one video on top of another
   * @see https://ffmpeg.org/ffmpeg-filters.html#overlay_005fopencl
   */
  overlay_opencl: {
    /** Overlay x position */
    x?: number;
    /** Overlay y position */
    y?: number;
    /** alpha format */
    alpha_format?: 'straight' | 'premultiplied';
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** repeat overlay of the last overlay frame */
    repeatlast?: boolean;
  };
  /**
   * Quick Sync Video overlay.
   * @see https://ffmpeg.org/ffmpeg-filters.html#overlay_005fqsv
   */
  overlay_qsv: {
    /** Overlay x position */
    x?: string | number;
    /** Overlay y position */
    y?: string | number;
    /** Overlay width */
    w?: string | number;
    /** Overlay height */
    h?: string | number;
    /** Overlay global alpha */
    alpha?: number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** repeat overlay of the last overlay frame */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Rockchip RGA (2D Raster Graphic Acceleration) video compositor
   * @see https://ffmpeg.org/ffmpeg-filters.html#overlay_005frkrga
   */
  overlay_rkrga: {
    /** Overlay x position */
    x?: string | number;
    /** Overlay y position */
    y?: string | number;
    /** Overlay global alpha */
    alpha?: number;
    /** alpha format */
    alpha_format?: 'straight' | 'premultiplied';
    /** Output video pixel format */
    format?: string | number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** Force termination when the shortest input terminates */
    shortest?: boolean;
    /** Repeat overlay of the last overlay frame */
    repeatlast?: boolean;
    /** Set multicore RGA scheduler core [use with caution] */
    core?: 'default' | 'rga3_core0' | 'rga3_core1' | 'rga2_core0' | 'rga2_core1' | (string & {});
    /** Set the internal parallelization depth */
    async_depth?: number;
    /** Enable AFBC (Arm Frame Buffer Compression) to save bandwidth */
    afbc?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Overlay one video on top of another
   * @see https://ffmpeg.org/ffmpeg-filters.html#overlay_005fvaapi
   */
  overlay_vaapi: {
    /** Overlay x position */
    x?: string | number;
    /** Overlay y position */
    y?: string | number;
    /** Overlay width */
    w?: string | number;
    /** Overlay height */
    h?: string | number;
    /** Overlay global alpha */
    alpha?: number;
    /** alpha format */
    alpha_format?: 'straight' | 'premultiplied';
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** repeat overlay of the last overlay frame */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Overlay a source on top of another
   * @see https://ffmpeg.org/ffmpeg-filters.html#overlay_005fvulkan
   */
  overlay_vulkan: {
    /** Set horizontal offset */
    x?: number;
    /** Set vertical offset */
    y?: number;
  };
  /**
   * Denoise using wavelets.
   * @see https://ffmpeg.org/ffmpeg-filters.html#owdenoise
   */
  owdenoise: {
    /** set depth */
    depth?: number;
    /** set luma strength */
    luma_strength?: number;
    /** set luma strength */
    ls?: number;
    /** set chroma strength */
    chroma_strength?: number;
    /** set chroma strength */
    cs?: number;
  };
  /**
   * Pad the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pad
   */
  pad: {
    /** set the pad area width expression */
    width?: string | number;
    /** set the pad area width expression */
    w?: string | number;
    /** set the pad area height expression */
    height?: string | number;
    /** set the pad area height expression */
    h?: string | number;
    /** set the x offset expression for the input image position */
    x?: string | number;
    /** set the y offset expression for the input image position */
    y?: string | number;
    /** set the color of the padded area border */
    color?: string | number;
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
    /** pad to fit an aspect instead of a resolution */
    aspect?: string | number;
  };
  /**
   * CUDA-based GPU padding filter
   * @see https://ffmpeg.org/ffmpeg-filters.html#pad_005fcuda
   */
  pad_cuda: {
    /** set the pad area width expression */
    width?: string | number;
    /** set the pad area width expression */
    w?: string | number;
    /** set the pad area height expression */
    height?: string | number;
    /** set the pad area height expression */
    h?: string | number;
    /** set the x offset expression for the input image position */
    x?: string | number;
    /** set the y offset expression for the input image position */
    y?: string | number;
    /** set the color of the padded area border */
    color?: string | number;
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
    /** pad to fit an aspect instead of a resolution */
    aspect?: string | number;
  };
  /**
   * Pad the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pad_005fopencl
   */
  pad_opencl: {
    /** set the pad area width */
    width?: string | number;
    /** set the pad area width */
    w?: string | number;
    /** set the pad area height */
    height?: string | number;
    /** set the pad area height */
    h?: string | number;
    /** set the x offset for the input image position */
    x?: string | number;
    /** set the y offset for the input image position */
    y?: string | number;
    /** set the color of the padded area border */
    color?: string | number;
    /** pad to fit an aspect instead of a resolution */
    aspect?: string | number;
  };
  /**
   * Pad the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pad_005fvaapi
   */
  pad_vaapi: {
    /** set the pad area width */
    width?: string | number;
    /** set the pad area width */
    w?: string | number;
    /** set the pad area height */
    height?: string | number;
    /** set the pad area height */
    h?: string | number;
    /** set the x offset for the input image position */
    x?: string | number;
    /** set the y offset for the input image position */
    y?: string | number;
    /** set the color of the padded area border */
    color?: string | number;
    /** pad to fit an aspect instead of a resolution */
    aspect?: string | number;
  };
  /**
   * Generate PAL 100% color bars.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pal100bars
   */
  pal100bars: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
  };
  /**
   * Generate PAL 75% color bars.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pal75bars
   */
  pal75bars: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
  };
  /**
   * Find the optimal palette for a given stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#palettegen
   */
  palettegen: {
    /** set the maximum number of colors to use in the palette */
    max_colors?: number;
    /** reserve a palette entry for transparency */
    reserve_transparent?: boolean;
    /** set a background color for transparency */
    transparency_color?: string | number;
    /** set statistics mode */
    stats_mode?: 'full' | 'diff' | 'single';
  };
  /**
   * Use a palette to downsample an input video stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#paletteuse
   */
  paletteuse: {
    /** select dithering mode */
    dither?: 'bayer' | 'heckbert' | 'floyd_steinberg' | 'sierra2' | 'sierra2_4a' | 'sierra3' | 'burkes' | 'atkinson';
    /** set scale for bayer dithering */
    bayer_scale?: number;
    /** set frame difference mode */
    diff_mode?: 'rectangle';
    /** take new palette for each output frame */
    new?: boolean;
    /** set the alpha threshold for transparency */
    alpha_threshold?: number;
    /** save Graphviz graph of the kdtree in specified file */
    debug_kdtree?: string | number;
  };
  /**
   * Remix channels with coefficients (panning).
   * @see https://ffmpeg.org/ffmpeg-filters.html#pan
   */
  pan: {
    args?: string | number;
  };
  /**
   * Generate Perlin noise
   * @see https://ffmpeg.org/ffmpeg-filters.html#perlin
   */
  perlin: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set the number of components to use to generate the noise */
    octaves?: number;
    /** set the octaves persistence */
    persistence?: number;
    /** set x-scale factor */
    xscale?: number;
    /** set y-scale factor */
    yscale?: number;
    /** set t-scale factor */
    tscale?: number;
    /** set random mode used to compute initial pattern */
    random_mode?: 'random' | 'ken' | 'seed';
    /** set the seed for filling the initial pattern */
    random_seed?: number;
    /** set the seed for filling the initial pattern */
    seed?: number;
  };
  /**
   * Set permissions for the output video frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#perms
   */
  perms: {
    /** select permissions mode */
    mode?: 'none' | 'ro' | 'rw' | 'toggle' | 'random';
    /** set the seed for the random mode */
    seed?: number;
  };
  /**
   * Correct the perspective of video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#perspective
   */
  perspective: {
    /** set top left x coordinate */
    x0?: string | number;
    /** set top left y coordinate */
    y0?: string | number;
    /** set top right x coordinate */
    x1?: string | number;
    /** set top right y coordinate */
    y1?: string | number;
    /** set bottom left x coordinate */
    x2?: string | number;
    /** set bottom left y coordinate */
    y2?: string | number;
    /** set bottom right x coordinate */
    x3?: string | number;
    /** set bottom right y coordinate */
    y3?: string | number;
    /** set interpolation */
    interpolation?: 'linear' | 'cubic';
    /** specify the sense of the coordinates */
    sense?: 'source' | 'destination';
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
  };
  /**
   * Phase shift fields.
   * @see https://ffmpeg.org/ffmpeg-filters.html#phase
   */
  phase: {
    /** set phase mode */
    mode?: 'p' | 't' | 'b' | 'T' | 'B' | 'U' | 'a' | 'A';
  };
  /**
   * Filter out photosensitive epilepsy seizure-inducing flashes.
   * @see https://ffmpeg.org/ffmpeg-filters.html#photosensitivity
   */
  photosensitivity: {
    /** set how many frames to use */
    frames?: number;
    /** set how many frames to use */
    f?: number;
    /** set detection threshold factor (lower is stricter) */
    threshold?: number;
    /** set detection threshold factor (lower is stricter) */
    t?: number;
    /** set pixels to skip when sampling frames */
    skip?: number;
    /** leave frames unchanged */
    bypass?: boolean;
  };
  /**
   * Test pixel format definitions.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pixdesctest
   */
  pixdesctest: {};
  /**
   * Pixelize video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pixelize
   */
  pixelize: {
    /** set block width */
    width?: number;
    /** set block width */
    w?: number;
    /** set block height */
    height?: number;
    /** set block height */
    h?: number;
    /** set the pixelize mode */
    mode?: 'avg' | 'min' | 'max';
    /** set the pixelize mode */
    m?: 'avg' | 'min' | 'max';
    /** set what planes to filter */
    planes?: string;
    /** set what planes to filter */
    p?: string;
  };
  /**
   * Pixel data analysis.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pixscope
   */
  pixscope: {
    /** set scope x offset */
    x?: number;
    /** set scope y offset */
    y?: number;
    /** set scope width */
    w?: number;
    /** set scope height */
    h?: number;
    /** set window opacity */
    o?: number;
    /** set window x offset */
    wx?: number;
    /** set window y offset */
    wy?: number;
  };
  /**
   * Apply Postprocessing 7 filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pp7
   */
  pp7: {
    /** force a constant quantizer parameter */
    qp?: number;
    /** set thresholding mode */
    mode?: 'hard' | 'soft' | 'medium';
  };
  /**
   * PreMultiply first stream with first plane of second stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#premultiply
   */
  premultiply: {
    /** set planes */
    planes?: number;
    /** enable inplace mode */
    inplace?: boolean;
  };
  /**
   * Premultiply or unpremultiply an image in-place, as needed.
   * @see https://ffmpeg.org/ffmpeg-filters.html#premultiply_005fdynamic
   */
  premultiply_dynamic: {
    /** set planes */
    planes?: number;
    /** enable inplace mode */
    inplace?: boolean;
  };
  /**
   * Apply prewitt operator.
   * @see https://ffmpeg.org/ffmpeg-filters.html#prewitt
   */
  prewitt: {
    /** set planes to filter */
    planes?: number;
    /** set scale */
    scale?: number;
    /** set delta */
    delta?: number;
  };
  /**
   * Apply prewitt operator
   * @see https://ffmpeg.org/ffmpeg-filters.html#prewitt_005fopencl
   */
  prewitt_opencl: {
    /** set planes to filter */
    planes?: number;
    /** set scale */
    scale?: number;
    /** set delta */
    delta?: number;
  };
  /**
   * ProcAmp (color balance) adjustments for hue, saturation, brightness, contrast
   * @see https://ffmpeg.org/ffmpeg-filters.html#procamp_005fvaapi
   */
  procamp_vaapi: {
    /** Output video brightness */
    b?: number;
    /** Output video brightness */
    brightness?: number;
    /** Output video saturation */
    s?: number;
    /** Output video saturation */
    saturatio?: number;
    /** Output video contrast */
    c?: number;
    /** Output video contrast */
    contrast?: number;
    /** Output video hue */
    h?: number;
    /** Output video hue */
    hue?: number;
  };
  /**
   * Filter video using an OpenCL program
   * @see https://ffmpeg.org/ffmpeg-filters.html#program_005fopencl
   */
  program_opencl: {
    /** OpenCL program source file */
    source?: string | number;
    /** Kernel name in program */
    kernel?: string | number;
    /** Number of inputs */
    inputs?: number;
    /** Video size */
    size?: string | number;
    /** Video size */
    s?: string | number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Make pseudocolored video frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pseudocolor
   */
  pseudocolor: {
    /** set component #0 expression */
    c0?: string | number;
    /** set component #1 expression */
    c1?: string | number;
    /** set component #2 expression */
    c2?: string | number;
    /** set component #3 expression */
    c3?: string | number;
    /** set component as base */
    index?: number;
    /** set component as base */
    i?: number;
    /** set preset */
    preset?:
      | 'none'
      | 'magma'
      | 'inferno'
      | 'plasma'
      | 'viridis'
      | 'turbo'
      | 'cividis'
      | 'range1'
      | 'range2'
      | 'shadows'
      | 'highlights'
      | 'solar'
      | 'nominal'
      | 'preferred'
      | 'total'
      | 'spectral'
      | 'cool'
      | 'heat'
      | 'fiery'
      | 'blues'
      | 'green'
      | 'helix';
    /** set preset */
    p?:
      | 'none'
      | 'magma'
      | 'inferno'
      | 'plasma'
      | 'viridis'
      | 'turbo'
      | 'cividis'
      | 'range1'
      | 'range2'
      | 'shadows'
      | 'highlights'
      | 'solar'
      | 'nominal'
      | 'preferred'
      | 'total'
      | 'spectral'
      | 'cool'
      | 'heat'
      | 'fiery'
      | 'blues'
      | 'green'
      | 'helix';
    /** set pseudocolor opacity */
    opacity?: number;
  };
  /**
   * Calculate the PSNR between two video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#psnr
   */
  psnr: {
    /** Set file where to store per-frame difference information */
    stats_file?: string | number;
    /** Set file where to store per-frame difference information */
    f?: string | number;
    /** Set the format version for the stats file. */
    stats_version?: number;
    /** Add raw stats (max values) to the output log. */
    output_max?: boolean;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Pullup from field sequence to frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#pullup
   */
  pullup: {
    /** set left junk size */
    jl?: number;
    /** set right junk size */
    jr?: number;
    /** set top junk size */
    jt?: number;
    /** set bottom junk size */
    jb?: number;
    /** set strict breaks */
    sb?: boolean;
    /** set metric plane */
    mp?: 'y' | 'u' | 'v';
  };
  /**
   * Change video quantization parameters.
   * @see https://ffmpeg.org/ffmpeg-filters.html#qp
   */
  qp: {
    /** set qp expression */
    qp?: string | number;
  };
  /**
   * Draw a QR code on top of video frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#qrencode
   */
  qrencode: {
    /** set rendered QR code width expression */
    qrcode_width?: string | number;
    /** set rendered QR code width expression */
    q?: string | number;
    /** set rendered padded QR code width expression */
    padded_qrcode_width?: string | number;
    /** set rendered padded QR code width expression */
    Q?: string | number;
    /** generate code which is case sensitive */
    case_sensitive?: boolean;
    /** generate code which is case sensitive */
    cs?: boolean;
    /** error correction level, lowest is L */
    level?: 'L' | 'M' | 'Q' | 'H';
    /** error correction level, lowest is L */
    l?: 'L' | 'M' | 'Q' | 'H';
    /** set the expansion mode */
    expansion?: 'none' | 'normal';
    /** set QR foreground color */
    foreground_color?: string | number;
    /** set QR foreground color */
    fc?: string | number;
    /** set QR background color */
    background_color?: string | number;
    /** set QR background color */
    bc?: string | number;
    /** set text to encode */
    text?: string | number;
    /** set text file to encode */
    textfile?: string | number;
    /** set x expression */
    x?: string | number;
    /** set y expression */
    y?: string | number;
  };
  /**
   * Generate a QR code.
   * @see https://ffmpeg.org/ffmpeg-filters.html#qrencodesrc
   */
  qrencodesrc: {
    /** set rendered QR code width expression */
    qrcode_width?: string | number;
    /** set rendered QR code width expression */
    q?: string | number;
    /** set rendered padded QR code width expression */
    padded_qrcode_width?: string | number;
    /** set rendered padded QR code width expression */
    Q?: string | number;
    /** generate code which is case sensitive */
    case_sensitive?: boolean;
    /** generate code which is case sensitive */
    cs?: boolean;
    /** error correction level, lowest is L */
    level?: 'L' | 'M' | 'Q' | 'H';
    /** error correction level, lowest is L */
    l?: 'L' | 'M' | 'Q' | 'H';
    /** set the expansion mode */
    expansion?: 'none' | 'normal';
    /** set QR foreground color */
    foreground_color?: string | number;
    /** set QR foreground color */
    fc?: string | number;
    /** set QR background color */
    background_color?: string | number;
    /** set QR background color */
    bc?: string | number;
    /** set text to encode */
    text?: string | number;
    /** set text file to encode */
    textfile?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
  };
  /**
   * Decode and show QR codes content.
   * @see https://ffmpeg.org/ffmpeg-filters.html#quirc
   */
  quirc: {};
  /**
   * Return random frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#random
   */
  random: {
    /** set number of frames in cache */
    frames?: number;
    /** set the seed */
    seed?: number;
  };
  /**
   * Read EIA-608 Closed Caption codes from input video and write them to frame metadata.
   * @see https://ffmpeg.org/ffmpeg-filters.html#readeia608
   */
  readeia608: {
    /** set from which line to scan for codes */
    scan_min?: number;
    /** set to which line to scan for codes */
    scan_max?: number;
    /** set ratio of width reserved for sync code detection */
    spw?: number;
    /** check and apply parity bit */
    chp?: boolean;
    /** lowpass line prior to processing */
    lp?: boolean;
  };
  /**
   * Read vertical interval timecode and write it to frame metadata.
   * @see https://ffmpeg.org/ffmpeg-filters.html#readvitc
   */
  readvitc: {
    /** maximum line numbers to scan for VITC data */
    scan_max?: number;
    /** black color threshold */
    thr_b?: number;
    /** white color threshold */
    thr_w?: number;
  };
  /**
   * Slow down filtering to match realtime.
   * @see https://ffmpeg.org/ffmpeg-filters.html#realtime
   */
  realtime: {
    /** sleep time limit */
    limit?: string | number;
    /** speed factor */
    speed?: number;
  };
  /**
   * Remap pixels.
   * @see https://ffmpeg.org/ffmpeg-filters.html#remap
   */
  remap: {
    /** set output format */
    format?: 'color' | 'gray';
    /** set the color of the unmapped pixels */
    fill?: string | number;
  };
  /**
   * Remap pixels using OpenCL.
   * @see https://ffmpeg.org/ffmpeg-filters.html#remap_005fopencl
   */
  remap_opencl: {
    /** set interpolation method */
    interp?: 'near' | 'linear';
    /** set the color of the unmapped pixels */
    fill?: string | number;
  };
  /**
   * Remove grain.
   * @see https://ffmpeg.org/ffmpeg-filters.html#removegrain
   */
  removegrain: {
    /** set mode for 1st plane */
    m0?: number;
    /** set mode for 2nd plane */
    m1?: number;
    /** set mode for 3rd plane */
    m2?: number;
    /** set mode for 4th plane */
    m3?: number;
  };
  /**
   * Remove a TV logo based on a mask image.
   * @see https://ffmpeg.org/ffmpeg-filters.html#removelogo
   */
  removelogo: {
    /** set bitmap filename */
    filename?: string | number;
    /** set bitmap filename */
    f?: string | number;
  };
  /**
   * Hard repeat fields based on MPEG repeat field flag.
   * @see https://ffmpeg.org/ffmpeg-filters.html#repeatfields
   */
  repeatfields: {};
  /**
   * ReplayGain scanner.
   * @see https://ffmpeg.org/ffmpeg-filters.html#replaygain
   */
  replaygain: {
    /** track gain (dB) */
    track_gain?: number;
    /** track peak */
    track_peak?: number;
  };
  /**
   * Reverse a clip.
   * @see https://ffmpeg.org/ffmpeg-filters.html#reverse
   */
  reverse: {};
  /**
   * Shift RGBA.
   * @see https://ffmpeg.org/ffmpeg-filters.html#rgbashift
   */
  rgbashift: {
    /** shift red horizontally */
    rh?: number;
    /** shift red vertically */
    rv?: number;
    /** shift green horizontally */
    gh?: number;
    /** shift green vertically */
    gv?: number;
    /** shift blue horizontally */
    bh?: number;
    /** shift blue vertically */
    bv?: number;
    /** shift alpha horizontally */
    ah?: number;
    /** shift alpha vertically */
    av?: number;
    /** set edge operation */
    edge?: 'smear' | 'wrap';
  };
  /**
   * Generate RGB test pattern.
   * @see https://ffmpeg.org/ffmpeg-filters.html#rgbtestsrc
   */
  rgbtestsrc: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
    /** set complement colors */
    complement?: boolean;
    /** set complement colors */
    co?: boolean;
  };
  /**
   * Apply roberts cross operator.
   * @see https://ffmpeg.org/ffmpeg-filters.html#roberts
   */
  roberts: {
    /** set planes to filter */
    planes?: number;
    /** set scale */
    scale?: number;
    /** set delta */
    delta?: number;
  };
  /**
   * Apply roberts operator
   * @see https://ffmpeg.org/ffmpeg-filters.html#roberts_005fopencl
   */
  roberts_opencl: {
    /** set planes to filter */
    planes?: number;
    /** set scale */
    scale?: number;
    /** set delta */
    delta?: number;
  };
  /**
   * Rotate the input image.
   * @see https://ffmpeg.org/ffmpeg-filters.html#rotate
   */
  rotate: {
    /** set angle (in radians) */
    angle?: string | number;
    /** set angle (in radians) */
    a?: string | number;
    /** set output width expression */
    out_w?: string | number;
    /** set output width expression */
    ow?: string | number;
    /** set output height expression */
    out_h?: string | number;
    /** set output height expression */
    oh?: string | number;
    /** set background fill color */
    fillcolor?: string | number;
    /** set background fill color */
    c?: string | number;
    /** use bilinear interpolation */
    bilinear?: boolean;
  };
  /**
   * Apply time-stretching and pitch-shifting.
   * @see https://ffmpeg.org/ffmpeg-filters.html#rubberband
   */
  rubberband: {
    /** set tempo scale factor */
    tempo?: number;
    /** set pitch scale factor */
    pitch?: number;
    /** set transients */
    transients?: 'crisp' | 'mixed' | 'smooth';
    /** set detector */
    detector?: 'compound' | 'percussive' | 'soft';
    /** set phase */
    phase?: 'laminar' | 'independent';
    /** set window */
    window?: 'standard' | 'short' | 'long';
    /** set smoothing */
    smoothing?: 'off' | 'on';
    /** set formant */
    formant?: 'shifted' | 'preserved';
    /** set pitch quality */
    pitchq?: 'quality' | 'speed' | 'consistency';
    /** set channels */
    channels?: 'apart' | 'together';
  };
  /**
   * Apply shape adaptive blur.
   * @see https://ffmpeg.org/ffmpeg-filters.html#sab
   */
  sab: {
    /** set luma radius */
    luma_radius?: number;
    /** set luma radius */
    lr?: number;
    /** set luma pre-filter radius */
    luma_pre_filter_radius?: number;
    /** set luma pre-filter radius */
    lpfr?: number;
    /** set luma strength */
    luma_strength?: number;
    /** set luma strength */
    ls?: number;
    /** set chroma radius */
    chroma_radius?: number;
    /** set chroma radius */
    cr?: number;
    /** set chroma pre-filter radius */
    chroma_pre_filter_radius?: number;
    /** set chroma pre-filter radius */
    cpfr?: number;
    /** set chroma strength */
    chroma_strength?: number;
    /** set chroma strength */
    cs?: number;
  };
  /**
   * Scale the input video size and/or convert the image format.
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale
   */
  scale: {
    /** Output video width */
    w?: string | number;
    /** Output video width */
    width?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output video height */
    height?: string | number;
    /** Flags to pass to libswscale */
    flags?: string | number;
    /** set interlacing */
    interl?: boolean;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set input YCbCr type */
    in_color_matrix?: 'auto' | 'bt601' | 'bt470' | 'smpte170m' | 'bt470bg' | 'bt709' | 'fcc' | 'smpte240m' | 'bt2020' | 'bt2020nc';
    /** set output YCbCr type */
    out_color_matrix?: 'auto' | 'bt601' | 'bt470' | 'smpte170m' | 'bt470bg' | 'bt709' | 'fcc' | 'smpte240m' | 'bt2020' | 'bt2020nc';
    /** set input color range */
    in_range?: 'auto' | 'unknown' | 'full' | 'limited' | 'jpeg' | 'mpeg' | 'tv' | 'pc';
    /** set output color range */
    out_range?: 'auto' | 'unknown' | 'full' | 'limited' | 'jpeg' | 'mpeg' | 'tv' | 'pc';
    /** set input chroma sample location */
    in_chroma_loc?: 'auto' | 'unknown' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom';
    /** set output chroma sample location */
    out_chroma_loc?: 'auto' | 'unknown' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom';
    /** set input primaries */
    in_primaries?:
      | 'auto'
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213';
    /** set output primaries */
    out_primaries?:
      | 'auto'
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213';
    /** set output color transfer */
    in_transfer?:
      | 'auto'
      | 'bt709'
      | 'bt470m'
      | 'gamma22'
      | 'bt470bg'
      | 'gamma28'
      | 'smpte170m'
      | 'smpte240m'
      | 'linear'
      | 'iec61966-2-1'
      | 'srgb'
      | 'iec61966-2-4'
      | 'xvycc'
      | 'bt1361e'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'smpte2084'
      | 'smpte428'
      | 'arib-std-b67';
    /** set output color transfer */
    out_transfer?:
      | 'auto'
      | 'bt709'
      | 'bt470m'
      | 'gamma22'
      | 'bt470bg'
      | 'gamma28'
      | 'smpte170m'
      | 'smpte240m'
      | 'linear'
      | 'iec61966-2-1'
      | 'srgb'
      | 'iec61966-2-4'
      | 'xvycc'
      | 'bt1361e'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'smpte2084'
      | 'smpte428'
      | 'arib-std-b67';
    /** input vertical chroma position in luma grid/256 */
    in_v_chr_pos?: number;
    /** input horizontal chroma position in luma grid/256 */
    in_h_chr_pos?: number;
    /** output vertical chroma position in luma grid/256 */
    out_v_chr_pos?: number;
    /** output horizontal chroma position in luma grid/256 */
    out_h_chr_pos?: number;
    /** decrease or increase w/h if necessary to keep the original AR */
    force_original_aspect_ratio?: 'disable' | 'decrease' | 'increase';
    /** enforce that the output resolution is divisible by a defined integer when force_original_aspect_ratio is used */
    force_divisible_by?: number;
    /** reset SAR to 1 and scale to square pixels if scaling proportionally */
    reset_sar?: boolean;
    /** Scaler param 0 */
    param0?: number;
    /** Scaler param 1 */
    param1?: number;
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
  };
  /**
   * Scale the input video size and/or convert the image format to the given reference.
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale2ref
   */
  scale2ref: {
    /** Output video width */
    w?: string | number;
    /** Output video width */
    width?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output video height */
    height?: string | number;
    /** Flags to pass to libswscale */
    flags?: string | number;
    /** set interlacing */
    interl?: boolean;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set input YCbCr type */
    in_color_matrix?: 'auto' | 'bt601' | 'bt470' | 'smpte170m' | 'bt470bg' | 'bt709' | 'fcc' | 'smpte240m' | 'bt2020' | 'bt2020nc';
    /** set output YCbCr type */
    out_color_matrix?: 'auto' | 'bt601' | 'bt470' | 'smpte170m' | 'bt470bg' | 'bt709' | 'fcc' | 'smpte240m' | 'bt2020' | 'bt2020nc';
    /** set input color range */
    in_range?: 'auto' | 'unknown' | 'full' | 'limited' | 'jpeg' | 'mpeg' | 'tv' | 'pc';
    /** set output color range */
    out_range?: 'auto' | 'unknown' | 'full' | 'limited' | 'jpeg' | 'mpeg' | 'tv' | 'pc';
    /** set input chroma sample location */
    in_chroma_loc?: 'auto' | 'unknown' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom';
    /** set output chroma sample location */
    out_chroma_loc?: 'auto' | 'unknown' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom';
    /** set input primaries */
    in_primaries?:
      | 'auto'
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213';
    /** set output primaries */
    out_primaries?:
      | 'auto'
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213';
    /** set output color transfer */
    in_transfer?:
      | 'auto'
      | 'bt709'
      | 'bt470m'
      | 'gamma22'
      | 'bt470bg'
      | 'gamma28'
      | 'smpte170m'
      | 'smpte240m'
      | 'linear'
      | 'iec61966-2-1'
      | 'srgb'
      | 'iec61966-2-4'
      | 'xvycc'
      | 'bt1361e'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'smpte2084'
      | 'smpte428'
      | 'arib-std-b67';
    /** set output color transfer */
    out_transfer?:
      | 'auto'
      | 'bt709'
      | 'bt470m'
      | 'gamma22'
      | 'bt470bg'
      | 'gamma28'
      | 'smpte170m'
      | 'smpte240m'
      | 'linear'
      | 'iec61966-2-1'
      | 'srgb'
      | 'iec61966-2-4'
      | 'xvycc'
      | 'bt1361e'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'smpte2084'
      | 'smpte428'
      | 'arib-std-b67';
    /** input vertical chroma position in luma grid/256 */
    in_v_chr_pos?: number;
    /** input horizontal chroma position in luma grid/256 */
    in_h_chr_pos?: number;
    /** output vertical chroma position in luma grid/256 */
    out_v_chr_pos?: number;
    /** output horizontal chroma position in luma grid/256 */
    out_h_chr_pos?: number;
    /** decrease or increase w/h if necessary to keep the original AR */
    force_original_aspect_ratio?: 'disable' | 'decrease' | 'increase';
    /** enforce that the output resolution is divisible by a defined integer when force_original_aspect_ratio is used */
    force_divisible_by?: number;
    /** reset SAR to 1 and scale to square pixels if scaling proportionally */
    reset_sar?: boolean;
    /** Scaler param 0 */
    param0?: number;
    /** Scaler param 1 */
    param1?: number;
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
  };
  /**
   * NVIDIA Performance Primitives video
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale2ref_005fnpp
   */
  scale2ref_npp: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output pixel format */
    format?: string | number;
    /** Output video size */
    s?: string | number;
    /** Interpolation algorithm used for resizing */
    interp_algo?: 'nn' | 'linear' | 'cubic' | 'cubic2p_bspline' | 'cubic2p_catmullrom' | 'cubic2p_b05c03' | 'super' | 'lanczos';
    /** decrease or increase w/h if necessary to keep the original AR */
    force_original_aspect_ratio?: 'disable' | 'decrease' | 'increase';
    /** enforce that the output resolution is divisible by a defined integer when force_original_aspect_ratio is used */
    force_divisible_by?: number;
    /** reset SAR to 1 and scale to square pixels if scaling proportionally */
    reset_sar?: boolean;
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
  };
  /**
   * GPU accelerated video resizer
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale_005fcuda
   */
  scale_cuda: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Interpolation algorithm used for resizing */
    interp_algo?: 'nearest' | 'bilinear' | 'bicubic' | 'lanczos';
    /** Output video pixel format */
    format?: string | number;
    /** Do not process frames at all if parameters match */
    passthrough?: boolean;
    /** Algorithm-Specific parameter */
    param?: number;
    /** decrease or increase w/h if necessary to keep the original AR */
    force_original_aspect_ratio?: 'disable' | 'decrease' | 'increase';
    /** enforce that the output resolution is divisible by a defined integer when force_original_aspect_ratio is used */
    force_divisible_by?: number;
    /** reset SAR to 1 and scale to square pixels if scaling proportionally */
    reset_sar?: boolean;
  };
  /**
   * Scale video using Direct3D11
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale_005fd3d11
   */
  scale_d3d11: {
    /** Output video width */
    width?: string | number;
    /** Output video height */
    height?: string | number;
    /** Output video pixel format */
    format?: string | number;
  };
  /**
   * Scale video using Direct3D12
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale_005fd3d12
   */
  scale_d3d12: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output video pixel format */
    format?: string | number;
  };
  /**
   * NVIDIA Performance Primitives video
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale_005fnpp
   */
  scale_npp: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output pixel format */
    format?: string | number;
    /** Output video size */
    s?: string | number;
    /** Interpolation algorithm used for resizing */
    interp_algo?: 'nn' | 'linear' | 'cubic' | 'cubic2p_bspline' | 'cubic2p_catmullrom' | 'cubic2p_b05c03' | 'super' | 'lanczos';
    /** decrease or increase w/h if necessary to keep the original AR */
    force_original_aspect_ratio?: 'disable' | 'decrease' | 'increase';
    /** enforce that the output resolution is divisible by a defined integer when force_original_aspect_ratio is used */
    force_divisible_by?: number;
    /** reset SAR to 1 and scale to square pixels if scaling proportionally */
    reset_sar?: boolean;
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
  };
  /**
   * Scale the input video size through OpenCL.
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale_005fopencl
   */
  scale_opencl: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output pixel format */
    format?: string | number;
    /** Do not process frames at all if parameters match */
    passthrough?: boolean;
    /** Scaling algorithm */
    algo?: 'area' | 'bicubic' | 'bilinear' | 'gauss' | 'lanczos' | 'neighbor' | 'sinc' | 'spline' | 'experimental';
    /** Decrease or increase w/h if necessary to keep the original AR */
    force_original_aspect_ratio?: 'disable' | 'decrease' | 'increase';
    /** Enforce that the output resolution is divisible by a defined integer when force_original_aspect_ratio is used */
    force_divisible_by?: number;
    /** Crop offset X */
    cx?: number;
    /** Crop offset Y */
    cy?: number;
    /** Crop width */
    cw?: number;
    /** Crop height */
    ch?: number;
  };
  /**
   * Rockchip RGA (2D Raster Graphic Acceleration) video resizer and format converter
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale_005frkrga
   */
  scale_rkrga: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output video pixel format */
    format?: string | number;
    /** Decrease or increase w/h if necessary to keep the original AR */
    force_original_aspect_ratio?: 'disable' | 'decrease' | 'increase';
    /** Enforce that the output resolution is divisible by a defined integer when force_original_aspect_ratio is used */
    force_divisible_by?: number;
    /** Enforce planar YUV format output */
    force_yuv?: 'disable' | 'auto' | '8bit' | '10bit';
    /** Enforce chroma of planar YUV format output */
    force_chroma?: 'auto' | '420sp' | '420p' | '422sp' | '422p';
    /** Set multicore RGA scheduler core [use with caution] */
    core?: 'default' | 'rga3_core0' | 'rga3_core1' | 'rga2_core0' | 'rga2_core1' | (string & {});
    /** Set the internal parallelization depth */
    async_depth?: number;
    /** Enable AFBC (Arm Frame Buffer Compression) to save bandwidth */
    afbc?: boolean;
  };
  /**
   * Scale to/from VAAPI surfaces.
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale_005fvaapi
   */
  scale_vaapi: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output video format (software format of hardware frames) */
    format?: string | number;
    /** Scaling mode */
    mode?: 'default' | 'fast' | 'hq' | 'nl_anamorphic';
    /** Output colour matrix coefficient set */
    out_color_matrix?: string | number;
    /** Output colour range */
    out_range?: 'full' | 'limited' | 'jpeg' | 'mpeg' | 'tv' | 'pc';
    /** Output colour primaries */
    out_color_primaries?: string | number;
    /** Output colour transfer characteristics */
    out_color_transfer?: string | number;
    /** Output chroma sample location */
    out_chroma_location?: string | number;
    /** decrease or increase w/h if necessary to keep the original AR */
    force_original_aspect_ratio?: 'disable' | 'decrease' | 'increase';
    /** enforce that the output resolution is divisible by a defined integer when force_original_aspect_ratio is used */
    force_divisible_by?: number;
    /** reset SAR to 1 and scale to square pixels if scaling proportionally */
    reset_sar?: boolean;
  };
  /**
   * Scale Videotoolbox frames
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale_005fvt
   */
  scale_vt: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output colour matrix coefficient set */
    color_matrix?: string | number;
    /** Output colour primaries */
    color_primaries?: string | number;
    /** Output colour transfer characteristics */
    color_transfer?: string | number;
    /** Output pixel format */
    format?: string | number;
  };
  /**
   * Scale Vulkan frames
   * @see https://ffmpeg.org/ffmpeg-filters.html#scale_005fvulkan
   */
  scale_vulkan: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Scaler function */
    scaler?: 'bilinear' | 'nearest';
    /** Debayer algorithm to use */
    debayer?: 'bilinear' | 'bilinear_hq';
    /** Output video format (software format of hardware frames) */
    format?: string | number;
    /** Output colour range (from 0 to 2) (default 0) */
    out_range?: 'full' | 'limited' | 'jpeg' | 'mpeg' | 'tv' | 'pc';
  };
  /**
   * Detect video scene change
   * @see https://ffmpeg.org/ffmpeg-filters.html#scdet
   */
  scdet: {
    /** set scene change detect threshold */
    threshold?: number;
    /** set scene change detect threshold */
    t?: number;
    /** Set the flag to pass scene change frames */
    sc_pass?: boolean;
    /** Set the flag to pass scene change frames */
    s?: boolean;
  };
  /**
   * Detect video scene change
   * @see https://ffmpeg.org/ffmpeg-filters.html#scdet_005fvulkan
   */
  scdet_vulkan: {
    /** set scene change detect threshold */
    threshold?: number;
    /** set scene change detect threshold */
    t?: number;
    /** Set the flag to pass scene change frames */
    sc_pass?: boolean;
    /** Set the flag to pass scene change frames */
    s?: boolean;
  };
  /**
   * Apply scharr operator.
   * @see https://ffmpeg.org/ffmpeg-filters.html#scharr
   */
  scharr: {
    /** set planes to filter */
    planes?: number;
    /** set scale */
    scale?: number;
    /** set delta */
    delta?: number;
  };
  /**
   * Scroll input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#scroll
   */
  scroll: {
    /** set the horizontal scrolling speed */
    horizontal?: number;
    /** set the horizontal scrolling speed */
    h?: number;
    /** set the vertical scrolling speed */
    vertical?: number;
    /** set the vertical scrolling speed */
    v?: number;
    /** set initial horizontal position */
    hpos?: number;
    /** set initial vertical position */
    vpos?: number;
  };
  /**
   * Segment video stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#segment
   */
  segment: {
    /** timestamps of input at which to split input */
    timestamps?: string | number;
    /** frames at which to split input */
    frames?: string | number;
  };
  /**
   * Select video frames to pass in output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#select
   */
  select: {
    /** set an expression to use for selecting frames */
    expr?: string | number;
    /** set an expression to use for selecting frames */
    e?: string | number;
    /** set the number of outputs */
    outputs?: number;
    /** set the number of outputs */
    n?: number;
  };
  /**
   * Apply CMYK adjustments to specific color ranges.
   * @see https://ffmpeg.org/ffmpeg-filters.html#selectivecolor
   */
  selectivecolor: {
    /** select correction method */
    correction_method?: 'absolute' | 'relative';
    /** s */
    red?: string | number;
    /** s */
    yellow?: string | number;
    /** s */
    green?: string | number;
    /** s */
    cyan?: string | number;
    /** s */
    blue?: string | number;
    /** s */
    magenta?: string | number;
    /** s */
    white?: string | number;
    /** s */
    neutral?: string | number;
    /** s */
    black?: string | number;
    /** set Photoshop selectivecolor file name */
    psfile?: string | number;
  };
  /**
   * Send commands to filters.
   * @see https://ffmpeg.org/ffmpeg-filters.html#sendcmd
   */
  sendcmd: {
    /** set commands */
    commands?: string | number;
    /** set commands */
    c?: string | number;
    /** set commands file */
    filename?: string | number;
    /** set commands file */
    f?: string | number;
  };
  /**
   * Split input video frames into fields.
   * @see https://ffmpeg.org/ffmpeg-filters.html#separatefields
   */
  separatefields: {};
  /**
   * Set the frame display aspect ratio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#setdar
   */
  setdar: {
    /** set display aspect ratio */
    dar?: string | number;
    /** set display aspect ratio */
    ratio?: string | number;
    /** set display aspect ratio */
    r?: string | number;
    /** set max value for nominator or denominator in the ratio */
    max?: number;
  };
  /**
   * Force field for the output video frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#setfield
   */
  setfield: {
    /** select interlace mode */
    mode?: 'auto' | 'bff' | 'tff' | 'prog';
  };
  /**
   * Force field, or color property for the output video frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#setparams
   */
  setparams: {
    /** select interlace mode */
    field_mode?: 'auto' | 'bff' | 'tff' | 'prog';
    /** select color range */
    range?: 'auto' | 'unspecified' | 'unknown' | 'limited' | 'tv' | 'mpeg' | 'full' | 'pc' | 'jpeg';
    /** select color primaries */
    color_primaries?:
      | 'auto'
      | 'bt709'
      | 'unknown'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213'
      | 'vgamut';
    /** select color transfer */
    color_trc?:
      | 'auto'
      | 'bt709'
      | 'unknown'
      | 'bt470m'
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
      | 'vlog';
    /** select colorspace */
    colorspace?:
      | 'auto'
      | 'gbr'
      | 'bt709'
      | 'unknown'
      | 'fcc'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'ycgco'
      | 'ycgco-re'
      | 'ycgco-ro'
      | 'bt2020nc'
      | 'bt2020c'
      | 'smpte2085'
      | 'chroma-derived-nc'
      | 'chroma-derived-c'
      | 'ictcp'
      | 'ipt-c2';
    /** select chroma sample location */
    chroma_location?: 'auto' | 'unspecified' | 'unknown' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom';
    /** select alpha moda */
    alpha_mode?: 'auto' | 'unspecified' | 'unknown' | 'premultiplied' | 'straight';
  };
  /**
   * Set PTS for the output video frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#setpts
   */
  setpts: {
    /** Expression determining the frame timestamp */
    expr?: string | number;
    /** Unset framerate metadata */
    strip_fps?: boolean;
  };
  /**
   * Force color range for the output video frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#setrange
   */
  setrange: {
    /** select color range */
    range?: 'auto' | 'unspecified' | 'unknown' | 'limited' | 'tv' | 'mpeg' | 'full' | 'pc' | 'jpeg';
  };
  /**
   * Set the pixel sample aspect ratio.
   * @see https://ffmpeg.org/ffmpeg-filters.html#setsar
   */
  setsar: {
    /** set sample (pixel) aspect ratio */
    sar?: string | number;
    /** set sample (pixel) aspect ratio */
    ratio?: string | number;
    /** set sample (pixel) aspect ratio */
    r?: string | number;
    /** set max value for nominator or denominator in the ratio */
    max?: number;
  };
  /**
   * Set timebase for the video output link.
   * @see https://ffmpeg.org/ffmpeg-filters.html#settb
   */
  settb: {
    /** set expression determining the output timebase */
    expr?: string | number;
    /** set expression determining the output timebase */
    tb?: string | number;
  };
  /**
   * NVIDIA Performance Primitives video
   * @see https://ffmpeg.org/ffmpeg-filters.html#sharpen_005fnpp
   */
  sharpen_npp: {
    /** Type of operation to be performed on image border */
    border_type?: 'replicate';
  };
  /**
   * VAAPI VPP for sharpness
   * @see https://ffmpeg.org/ffmpeg-filters.html#sharpness_005fvaapi
   */
  sharpness_vaapi: {
    /** sharpness level */
    sharpness?: number;
  };
  /**
   * Shear transform the input image.
   * @see https://ffmpeg.org/ffmpeg-filters.html#shear
   */
  shear: {
    /** set x shear factor */
    shx?: number;
    /** set y shear factor */
    shy?: number;
    /** set background fill color */
    fillcolor?: string | number;
    /** set background fill color */
    c?: string | number;
    /** set interpolation */
    interp?: 'nearest' | 'bilinear';
  };
  /**
   * Convert input audio to a CQT (Constant/Clamped Q Transform) spectrum video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showcqt
   */
  showcqt: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    fps?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set bargraph height */
    bar_h?: number;
    /** set axis height */
    axis_h?: number;
    /** set sonogram height */
    sono_h?: number;
    /** set fullhd size */
    fullhd?: boolean;
    /** set sonogram volume */
    sono_v?: string | number;
    /** set sonogram volume */
    volume?: string | number;
    /** set bargraph volume */
    bar_v?: string | number;
    /** set bargraph volume */
    volume2?: string | number;
    /** set sonogram gamma */
    sono_g?: number;
    /** set sonogram gamma */
    gamma?: number;
    /** set bargraph gamma */
    bar_g?: number;
    /** set bargraph gamma */
    gamma2?: number;
    /** set bar transparency */
    bar_t?: number;
    /** set timeclamp */
    timeclamp?: number;
    /** set timeclamp */
    tc?: number;
    /** set attack time */
    attack?: number;
    /** set base frequency */
    basefreq?: number;
    /** set end frequency */
    endfreq?: number;
    /** set coeffclamp */
    coeffclamp?: number;
    /** set tlength */
    tlength?: string | number;
    /** set transform count */
    count?: number;
    /** set frequency count */
    fcount?: number;
    /** set axis font file */
    fontfile?: string | number;
    /** set axis font */
    font?: string | number;
    /** set font color */
    fontcolor?: string | number;
    /** set axis image */
    axisfile?: string | number;
    /** draw axis */
    axis?: boolean;
    /** draw axis */
    text?: boolean;
    /** set color space */
    csp?: 'unspecified' | 'bt709' | 'fcc' | 'bt470bg' | 'smpte170m' | 'smpte240m' | 'bt2020ncl';
    /** set color scheme */
    cscheme?: string | number;
  };
  /**
   * Convert input audio to a CWT (Continuous Wavelet Transform) spectrum video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showcwt
   */
  showcwt: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set frequency scale */
    scale?: 'linear' | 'log' | 'bark' | 'mel' | 'erbs' | 'sqrt' | 'cbrt' | 'qdrt' | 'fm';
    /** set intensity scale */
    iscale?: 'linear' | 'log' | 'sqrt' | 'cbrt' | 'qdrt';
    /** set minimum frequency */
    min?: number;
    /** set maximum frequency */
    max?: number;
    /** set minimum intensity */
    imin?: number;
    /** set maximum intensity */
    imax?: number;
    /** set logarithmic basis */
    logb?: number;
    /** set frequency deviation */
    deviation?: number;
    /** set pixels per second */
    pps?: number;
    /** set output mode */
    mode?: 'magnitude' | 'phase' | 'magphase' | 'channel' | 'stereo';
    /** set slide mode */
    slide?: 'replace' | 'scroll' | 'frame';
    /** set direction mode */
    direction?: 'lr' | 'rl' | 'ud' | 'du';
    /** set bargraph ratio */
    bar?: number;
    /** set color rotation */
    rotation?: number;
  };
  /**
   * Convert input audio to a frequencies video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showfreqs
   */
  showfreqs: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set display mode */
    mode?: 'line' | 'bar' | 'dot';
    /** set amplitude scale */
    ascale?: 'lin' | 'sqrt' | 'cbrt' | 'log';
    /** set frequency scale */
    fscale?: 'lin' | 'log' | 'rlog';
    /** set window size */
    win_size?: number;
    /** set window function */
    win_func?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
    /** set window overlap */
    overlap?: number;
    /** set time averaging */
    averaging?: number;
    /** set channels colors */
    colors?: string | number;
    /** set channel mode */
    cmode?: 'combined' | 'separate';
    /** set minimum amplitude */
    minamp?: number;
    /** set data mode */
    data?: 'magnitude' | 'phase' | 'delay';
    /** set channels to draw */
    channels?: string | number;
  };
  /**
   * Show textual information for each video frame.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showinfo
   */
  showinfo: {
    /** calculate checksums */
    checksum?: boolean;
    /** try to print user data unregistered SEI as ascii character when possible */
    udu_sei_as_ascii?: boolean;
  };
  /**
   * Display frame palette.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showpalette
   */
  showpalette: {
    /** set pixel box size */
    s?: number;
  };
  /**
   * Convert input audio to a spatial video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showspatial
   */
  showspatial: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set window size */
    win_size?: number;
    /** set window function */
    win_func?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
  };
  /**
   * Convert input audio to a spectrum video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showspectrum
   */
  showspectrum: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set sliding mode */
    slide?: 'replace' | 'scroll' | 'fullframe' | 'rscroll' | 'lreplace';
    /** set channel display mode */
    mode?: 'combined' | 'separate';
    /** set channel coloring */
    color?:
      | 'channel'
      | 'intensity'
      | 'rainbow'
      | 'moreland'
      | 'nebulae'
      | 'fire'
      | 'fiery'
      | 'fruit'
      | 'cool'
      | 'magma'
      | 'green'
      | 'viridis'
      | 'plasma'
      | 'cividis'
      | 'terrain';
    /** set display scale */
    scale?: 'lin' | 'sqrt' | 'cbrt' | 'log' | '4thrt' | '5thrt';
    /** set frequency scale */
    fscale?: 'lin' | 'log';
    /** color saturation multiplier */
    saturation?: number;
    /** set window function */
    win_func?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
    /** set orientation */
    orientation?: 'vertical' | 'horizontal';
    /** set window overlap */
    overlap?: number;
    /** set scale gain */
    gain?: number;
    /** set data mode */
    data?: 'magnitude' | 'phase' | 'uphase';
    /** color rotation */
    rotation?: number;
    /** start frequency */
    start?: number;
    /** stop frequency */
    stop?: number;
    /** set video rate */
    fps?: string | number;
    /** draw legend */
    legend?: boolean;
    /** set dynamic range in dBFS */
    drange?: number;
    /** set upper limit in dBFS */
    limit?: number;
    /** set opacity strength */
    opacity?: number;
  };
  /**
   * Convert input audio to a spectrum video output single picture.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showspectrumpic
   */
  showspectrumpic: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set channel display mode */
    mode?: 'combined' | 'separate';
    /** set channel coloring */
    color?:
      | 'channel'
      | 'intensity'
      | 'rainbow'
      | 'moreland'
      | 'nebulae'
      | 'fire'
      | 'fiery'
      | 'fruit'
      | 'cool'
      | 'magma'
      | 'green'
      | 'viridis'
      | 'plasma'
      | 'cividis'
      | 'terrain';
    /** set display scale */
    scale?: 'lin' | 'sqrt' | 'cbrt' | 'log' | '4thrt' | '5thrt';
    /** set frequency scale */
    fscale?: 'lin' | 'log';
    /** color saturation multiplier */
    saturation?: number;
    /** set window function */
    win_func?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
    /** set orientation */
    orientation?: 'vertical' | 'horizontal';
    /** set scale gain */
    gain?: number;
    /** draw legend */
    legend?: boolean;
    /** color rotation */
    rotation?: number;
    /** start frequency */
    start?: number;
    /** stop frequency */
    stop?: number;
    /** set dynamic range in dBFS */
    drange?: number;
    /** set upper limit in dBFS */
    limit?: number;
    /** set opacity strength */
    opacity?: number;
  };
  /**
   * Convert input audio volume to video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showvolume
   */
  showvolume: {
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set border width */
    b?: number;
    /** set channel width */
    w?: number;
    /** set channel height */
    h?: number;
    /** set fade */
    f?: number;
    /** set volume color expression */
    c?: string | number;
    /** display channel names */
    t?: boolean;
    /** display volume value */
    v?: boolean;
    /** duration for max value display */
    dm?: number;
    /** set color of the max value line */
    dmc?: string | number;
    /** set orientation */
    o?: 'h' | 'v';
    /** set step size */
    s?: number;
    /** set background opacity */
    p?: number;
    /** set mode */
    m?: 'p' | 'r';
    /** set display scale */
    ds?: 'lin' | 'log';
  };
  /**
   * Convert input audio to a video output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showwaves
   */
  showwaves: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** select display mode */
    mode?: 'point' | 'line' | 'p2p' | 'cline';
    /** set how many samples to show in the same point */
    n?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** draw channels separately */
    split_channels?: boolean;
    /** set channels colors */
    colors?: string | number;
    /** set amplitude scale */
    scale?: 'lin' | 'log' | 'sqrt' | 'cbrt';
    /** set draw mode */
    draw?: 'scale' | 'full';
  };
  /**
   * Convert input audio to a video output single picture.
   * @see https://ffmpeg.org/ffmpeg-filters.html#showwavespic
   */
  showwavespic: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** draw channels separately */
    split_channels?: boolean;
    /** set channels colors */
    colors?: string | number;
    /** set amplitude scale */
    scale?: 'lin' | 'log' | 'sqrt' | 'cbrt';
    /** set draw mode */
    draw?: 'scale' | 'full';
    /** set filter mode */
    filter?: 'average' | 'peak';
  };
  /**
   * Shuffle video frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#shuffleframes
   */
  shuffleframes: {
    /** set destination indexes of input frames */
    mapping?: string | number;
  };
  /**
   * Shuffle video pixels.
   * @see https://ffmpeg.org/ffmpeg-filters.html#shufflepixels
   */
  shufflepixels: {
    /** set shuffle direction */
    direction?: 'forward' | 'inverse';
    /** set shuffle direction */
    d?: 'forward' | 'inverse';
    /** set shuffle mode */
    mode?: 'horizontal' | 'vertical' | 'block';
    /** set shuffle mode */
    m?: 'horizontal' | 'vertical' | 'block';
    /** set block width */
    width?: number;
    /** set block width */
    w?: number;
    /** set block height */
    height?: number;
    /** set block height */
    h?: number;
    /** set random seed */
    seed?: number;
    /** set random seed */
    s?: number;
  };
  /**
   * Shuffle video planes.
   * @see https://ffmpeg.org/ffmpeg-filters.html#shuffleplanes
   */
  shuffleplanes: {
    /** Index of the input plane to be used as the first output plane  */
    map0?: number;
    /** Index of the input plane to be used as the second output plane  */
    map1?: number;
    /** Index of the input plane to be used as the third output plane  */
    map2?: number;
    /** Index of the input plane to be used as the fourth output plane  */
    map3?: number;
  };
  /**
   * Sidechain compressor.
   * @see https://ffmpeg.org/ffmpeg-filters.html#sidechaincompress
   */
  sidechaincompress: {
    /** set input gain */
    level_in?: number;
    /** set mode */
    mode?: 'downward' | 'upward';
    /** set threshold */
    threshold?: number;
    /** set ratio */
    ratio?: number;
    /** set attack */
    attack?: number;
    /** set release */
    release?: number;
    /** set make up gain */
    makeup?: number;
    /** set knee */
    knee?: number;
    /** set link type */
    link?: 'average' | 'maximum';
    /** set detection */
    detection?: 'peak' | 'rms';
    /** set sidechain gain */
    level_sc?: number;
    /** set mix */
    mix?: number;
  };
  /**
   * Audio sidechain gate.
   * @see https://ffmpeg.org/ffmpeg-filters.html#sidechaingate
   */
  sidechaingate: {
    /** set input level */
    level_in?: number;
    /** set mode */
    mode?: 'downward' | 'upward';
    /** set max gain reduction */
    range?: number;
    /** set threshold */
    threshold?: number;
    /** set ratio */
    ratio?: number;
    /** set attack */
    attack?: number;
    /** set release */
    release?: number;
    /** set makeup gain */
    makeup?: number;
    /** set knee */
    knee?: number;
    /** set detection */
    detection?: 'peak' | 'rms';
    /** set link */
    link?: 'average' | 'maximum';
    /** set sidechain gain */
    level_sc?: number;
  };
  /**
   * Manipulate video frame side data.
   * @see https://ffmpeg.org/ffmpeg-filters.html#sidedata
   */
  sidedata: {
    /** set a mode of operation */
    mode?: 'select' | 'delete';
    /** set side data type */
    type?:
      | 'PANSCAN'
      | 'A53_CC'
      | 'STEREO3D'
      | 'MATRIXENCODING'
      | 'DOWNMIX_INFO'
      | 'REPLAYGAIN'
      | 'DISPLAYMATRIX'
      | 'AFD'
      | 'MOTION_VECTORS'
      | 'SKIP_SAMPLES'
      | 'AUDIO_SERVICE_TYPE'
      | 'MASTERING_DISPLAY_METADATA'
      | 'GOP_TIMECODE'
      | 'SPHERICAL'
      | 'CONTENT_LIGHT_LEVEL'
      | 'ICC_PROFILE'
      | 'S12M_TIMECOD'
      | 'S12M_TIMECODE'
      | 'DYNAMIC_HDR_PLUS'
      | 'REGIONS_OF_INTEREST'
      | 'VIDEO_ENC_PARAMS'
      | 'SEI_UNREGISTERED'
      | 'FILM_GRAIN_PARAMS'
      | 'DETECTION_BOUNDING_BOXES'
      | 'DETECTION_BBOXES'
      | 'DOVI_RPU_BUFFER'
      | 'DOVI_METADATA'
      | 'DYNAMIC_HDR_VIVID'
      | 'AMBIENT_VIEWING_ENVIRONMENT'
      | 'VIDEO_HINT';
  };
  /**
   * Render a Sierpinski fractal.
   * @see https://ffmpeg.org/ffmpeg-filters.html#sierpinski
   */
  sierpinski: {
    /** set frame size */
    size?: string | number;
    /** set frame size */
    s?: string | number;
    /** set frame rate */
    rate?: string | number;
    /** set frame rate */
    r?: string | number;
    /** set the seed */
    seed?: number;
    /** set the jump */
    jump?: number;
    /** set fractal type */
    type?: 'carpet' | 'triangle';
  };
  /**
   * Generate statistics from video analysis.
   * @see https://ffmpeg.org/ffmpeg-filters.html#signalstats
   */
  signalstats: {
    /** set statistics filters */
    stat?: 'tout' | 'vrep' | 'brng' | (string & {});
    /** set video filter */
    out?: 'tout' | 'vrep' | 'brng';
    /** set highlight color */
    c?: string | number;
    /** set highlight color */
    color?: string | number;
  };
  /**
   * Calculate the MPEG-7 video signature
   * @see https://ffmpeg.org/ffmpeg-filters.html#signature
   */
  signature: {
    /** set the detectmode */
    detectmode?: 'off' | 'full' | 'fast';
    /** number of inputs */
    nb_inputs?: number;
    /** filename for output files */
    filename?: string | number;
    /** set output format */
    format?: 'binary' | 'xml';
    /** threshold to detect one word as similar */
    th_d?: number;
    /** threshold to detect all words as similar */
    th_dc?: number;
    /** threshold to detect frames as similar */
    th_xh?: number;
    /** minimum length of matching sequence in frames */
    th_di?: number;
    /** threshold for relation of good to all frames */
    th_it?: number;
  };
  /**
   * Detect silence.
   * @see https://ffmpeg.org/ffmpeg-filters.html#silencedetect
   */
  silencedetect: {
    /** set noise tolerance */
    n?: number;
    /** set noise tolerance */
    noise?: number;
    /** set minimum duration in seconds */
    d?: string | number;
    /** set minimum duration in seconds */
    duration?: string | number;
    /** check each channel separately */
    mono?: boolean;
    /** check each channel separately */
    m?: boolean;
  };
  /**
   * Remove silence.
   * @see https://ffmpeg.org/ffmpeg-filters.html#silenceremove
   */
  silenceremove: {
    /** set periods of silence parts to skip from start */
    start_periods?: number;
    /** set start duration of non-silence part */
    start_duration?: string | number;
    /** set threshold for start silence detection */
    start_threshold?: number;
    /** set start duration of silence part to keep */
    start_silence?: string | number;
    /** set which channel will trigger trimming from start */
    start_mode?: 'any' | 'all';
    /** set periods of silence parts to skip from end */
    stop_periods?: number;
    /** set stop duration of silence part */
    stop_duration?: string | number;
    /** set threshold for stop silence detection */
    stop_threshold?: number;
    /** set stop duration of silence part to keep */
    stop_silence?: string | number;
    /** set which channel will trigger trimming from end */
    stop_mode?: 'any' | 'all';
    /** set how silence is detected */
    detection?: 'avg' | 'rms' | 'peak' | 'median' | 'ptp' | 'dev';
    /** set duration of window for silence detection */
    window?: string | number;
    /** set how every output frame timestamp is processed */
    timestamp?: 'write' | 'copy';
  };
  /**
   * Generate a sinc kaiser-windowed low-pass, high-pass, band-pass, or band-reject FIR coefficients.
   * @see https://ffmpeg.org/ffmpeg-filters.html#sinc
   */
  sinc: {
    /** set sample rate */
    sample_rate?: number;
    /** set sample rate */
    r?: number;
    /** set the number of samples per requested frame */
    nb_samples?: number;
    /** set the number of samples per requested frame */
    n?: number;
    /** set high-pass filter frequency */
    hp?: number;
    /** set low-pass filter frequency */
    lp?: number;
    /** set filter phase response */
    phase?: number;
    /** set kaiser window beta */
    beta?: number;
    /** set stop-band attenuation */
    att?: number;
    /** enable rounding */
    round?: boolean;
    /** set number of taps for high-pass filter */
    hptaps?: number;
    /** set number of taps for low-pass filter */
    lptaps?: number;
  };
  /**
   * Generate sine wave audio signal.
   * @see https://ffmpeg.org/ffmpeg-filters.html#sine
   */
  sine: {};
  /**
   * Calculate spatial information (SI) and temporal information (TI).
   * @see https://ffmpeg.org/ffmpeg-filters.html#siti
   */
  siti: {
    /** Print summary showing average values */
    print_summary?: boolean;
  };
  /**
   * Blur the input video without impacting the outlines.
   * @see https://ffmpeg.org/ffmpeg-filters.html#smartblur
   */
  smartblur: {
    /** set luma radius */
    luma_radius?: number;
    /** set luma radius */
    lr?: number;
    /** set luma strength */
    luma_strength?: number;
    /** set luma strength */
    ls?: number;
    /** set luma threshold */
    luma_threshold?: number;
    /** set luma threshold */
    lt?: number;
    /** set chroma radius */
    chroma_radius?: number;
    /** set chroma radius */
    cr?: number;
    /** set chroma strength */
    chroma_strength?: number;
    /** set chroma strength */
    cs?: number;
    /** set chroma threshold */
    chroma_threshold?: number;
    /** set chroma threshold */
    ct?: number;
    /** set alpha radius */
    alpha_radius?: number;
    /** set alpha radius */
    ar?: number;
    /** set alpha strength */
    alpha_strength?: number;
    /** set alpha strength */
    as?: number;
    /** set alpha threshold */
    alpha_threshold?: number;
    /** set alpha threshold */
    at?: number;
  };
  /**
   * Generate SMPTE color bars.
   * @see https://ffmpeg.org/ffmpeg-filters.html#smptebars
   */
  smptebars: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
  };
  /**
   * Generate SMPTE HD color bars.
   * @see https://ffmpeg.org/ffmpeg-filters.html#smptehdbars
   */
  smptehdbars: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
  };
  /**
   * Apply sobel operator.
   * @see https://ffmpeg.org/ffmpeg-filters.html#sobel
   */
  sobel: {
    /** set planes to filter */
    planes?: number;
    /** set scale */
    scale?: number;
    /** set delta */
    delta?: number;
  };
  /**
   * Apply sobel operator
   * @see https://ffmpeg.org/ffmpeg-filters.html#sobel_005fopencl
   */
  sobel_opencl: {
    /** set planes to filter */
    planes?: number;
    /** set scale */
    scale?: number;
    /** set delta */
    delta?: number;
  };
  /**
   * SOFAlizer (Spatially Oriented Format for Acoustics).
   * @see https://ffmpeg.org/ffmpeg-filters.html#sofalizer
   */
  sofalizer: {
    /** sofa filename */
    sofa?: string | number;
    /** set gain in dB */
    gain?: number;
    /** set rotation */
    rotation?: number;
    /** set elevation */
    elevation?: number;
    /** set radius */
    radius?: number;
    /** set processing */
    type?: 'time' | 'freq';
    /** set speaker custom positions */
    speakers?: string | number;
    /** set lfe gain */
    lfegain?: number;
    /** set frame size */
    framesize?: number;
    /** normalize IRs */
    normalize?: boolean;
    /** interpolate IRs from neighbors */
    interpolate?: boolean;
    /** minphase IRs */
    minphase?: boolean;
    /** set neighbor search angle step */
    anglestep?: number;
    /** set neighbor search radius step */
    radstep?: number;
  };
  /**
   * Convert input spectrum videos to audio output.
   * @see https://ffmpeg.org/ffmpeg-filters.html#spectrumsynth
   */
  spectrumsynth: {
    /** set sample rate */
    sample_rate?: number;
    /** set channels */
    channels?: number;
    /** set input amplitude scale */
    scale?: 'lin' | 'log';
    /** set input sliding mode */
    slide?: 'replace' | 'scroll' | 'fullframe' | 'rscroll';
    /** set window function */
    win_func?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
    /** set window overlap */
    overlap?: number;
    /** set orientation */
    orientation?: 'vertical' | 'horizontal';
  };
  /**
   * Speech Normalizer.
   * @see https://ffmpeg.org/ffmpeg-filters.html#speechnorm
   */
  speechnorm: {
    /** set the peak value */
    peak?: number;
    /** set the peak value */
    p?: number;
    /** set the max expansion factor */
    expansion?: number;
    /** set the max expansion factor */
    e?: number;
    /** set the max compression factor */
    compression?: number;
    /** set the max compression factor */
    c?: number;
    /** set the threshold value */
    threshold?: number;
    /** set the threshold value */
    t?: number;
    /** set the expansion raising amount */
    raise?: number;
    /** set the expansion raising amount */
    r?: number;
    /** set the compression raising amount */
    fall?: number;
    /** set the compression raising amount */
    f?: number;
    /** set channels to filter */
    channels?: string | number;
    /** set channels to filter */
    h?: string | number;
    /** set inverted filtering */
    invert?: boolean;
    /** set inverted filtering */
    i?: boolean;
    /** set linked channels filtering */
    link?: boolean;
    /** set linked channels filtering */
    l?: boolean;
    /** set the RMS value */
    rms?: number;
    /** set the RMS value */
    m?: number;
  };
  /**
   * Pass on the input to N video outputs.
   * @see https://ffmpeg.org/ffmpeg-filters.html#split
   */
  split: {
    /** set number of outputs */
    outputs?: number;
  };
  /**
   * Apply a simple post processing filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#spp
   */
  spp: {
    /** set quality */
    quality?: number;
    /** force a constant quantizer parameter */
    qp?: number;
    /** set thresholding mode */
    mode?: 'hard' | 'soft';
    /** use B-frames' QP */
    use_bframe_qp?: boolean;
  };
  /**
   * Apply DNN-based image super resolution to the input.
   * @see https://ffmpeg.org/ffmpeg-filters.html#sr
   */
  sr: {};
  /**
   * AMF HQ video upscaling
   * @see https://ffmpeg.org/ffmpeg-filters.html#sr_005famf
   */
  sr_amf: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output pixel format */
    format?: string | number;
    /** Sharpness */
    sharpness?: number;
    /** Keep aspect ratio */
    'keep-ratio'?: boolean;
    /** Fill */
    fill?: boolean;
    /** Scaling algorithm */
    algorithm?: number;
  };
  /**
   * Calculate the SSIM between two video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ssim
   */
  ssim: {
    /** Set file where to store per-frame difference information */
    stats_file?: string | number;
    /** Set file where to store per-frame difference information */
    f?: string | number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Calculate the SSIM between two 360 video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#ssim360
   */
  ssim360: {
    /** Set file where to store per-frame difference information */
    stats_file?: string | number;
    /** Set file where to store per-frame difference information */
    f?: string | number;
    /** Specifies if non-luma channels must be computed */
    compute_chroma?: number;
    /** Specifies the number of frames to be skipped from evaluation, for every evaluated frame */
    frame_skip_ratio?: number;
    /** projection of the reference video */
    ref_projection?: 'e' | 'equirect' | 'c3x2' | 'c2x3' | 'barrel' | 'barrelsplit';
    /** projection of the main video */
    main_projection?: 'e' | 'equirect' | 'c3x2' | 'c2x3' | 'barrel' | 'barrelsplit';
    /** stereo format of the reference video */
    ref_stereo?: 'mono' | 'tb' | 'lr';
    /** stereo format of main video */
    main_stereo?: 'mono' | 'tb' | 'lr';
    /** Expansion (padding) coefficient for each cube face of the reference video */
    ref_pad?: number;
    /** Expansion (padding) coefficient for each cube face of the main video */
    main_pad?: number;
    /** Specifies if the tape based SSIM 360 algorithm must be used independent of the input video types */
    use_tape?: number;
    /** Heatmap data for view-based evaluation. For heatmap file format, please refer to EntSphericalVideoHeatmapData. */
    heatmap_str?: string | number;
    /** Default heatmap dimension. Will be used when dimension is not specified in heatmap data. */
    default_heatmap_width?: number;
    /** Default heatmap dimension. Will be used when dimension is not specified in heatmap data. */
    default_heatmap_height?: number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Convert video stereoscopic 3D view.
   * @see https://ffmpeg.org/ffmpeg-filters.html#stereo3d
   */
  stereo3d: {
    /** set input format */
    in?: 'ab2l' | 'tb2l' | 'ab2r' | 'tb2r' | 'abl' | 'tbl' | 'abr' | 'tbr' | 'al' | 'ar' | 'sbs2l' | 'sbs2r' | 'sbsl' | 'sbsr' | 'irl' | 'irr' | 'icl' | 'icr';
    /** set output format */
    out?:
      | 'ab2l'
      | 'tb2l'
      | 'ab2r'
      | 'tb2r'
      | 'abl'
      | 'tbl'
      | 'abr'
      | 'tbr'
      | 'agmc'
      | 'agmd'
      | 'agmg'
      | 'agmh'
      | 'al'
      | 'ar'
      | 'arbg'
      | 'arcc'
      | 'arcd'
      | 'arcg'
      | 'arch'
      | 'argg'
      | 'aybc'
      | 'aybd'
      | 'aybg'
      | 'aybh'
      | 'irl'
      | 'irr'
      | 'ml'
      | 'mr'
      | 'sbs2l'
      | 'sbs2r'
      | 'sbsl'
      | 'sbsr'
      | 'chl'
      | 'chr'
      | 'icl'
      | 'icr'
      | 'hdmi';
  };
  /**
   * Apply various stereo tools.
   * @see https://ffmpeg.org/ffmpeg-filters.html#stereotools
   */
  stereotools: {
    /** set level in */
    level_in?: number;
    /** set level out */
    level_out?: number;
    /** set balance in */
    balance_in?: number;
    /** set balance out */
    balance_out?: number;
    /** enable softclip */
    softclip?: boolean;
    /** mute L */
    mutel?: boolean;
    /** mute R */
    muter?: boolean;
    /** phase L */
    phasel?: boolean;
    /** phase R */
    phaser?: boolean;
    /** set stereo mode */
    mode?: 'lr>lr' | 'lr>ms' | 'ms>lr' | 'lr>ll' | 'lr>rr' | 'lr>l+r' | 'lr>rl' | 'ms>ll' | 'ms>rr' | 'ms>rl' | 'lr>l-r';
    /** set side level */
    slev?: number;
    /** set side balance */
    sbal?: number;
    /** set middle level */
    mlev?: number;
    /** set middle pan */
    mpan?: number;
    /** set stereo base */
    base?: number;
    /** set delay */
    delay?: number;
    /** set S/C level */
    sclevel?: number;
    /** set stereo phase */
    phase?: number;
    /** set balance in mode */
    bmode_in?: 'balance' | 'amplitude' | 'power';
    /** set balance out mode */
    bmode_out?: 'balance' | 'amplitude' | 'power';
  };
  /**
   * Apply stereo widening effect.
   * @see https://ffmpeg.org/ffmpeg-filters.html#stereowiden
   */
  stereowiden: {
    /** set delay time */
    delay?: number;
    /** set feedback gain */
    feedback?: number;
    /** set cross feed */
    crossfeed?: number;
    /** set dry-mix */
    drymix?: number;
  };
  /**
   * Select video streams
   * @see https://ffmpeg.org/ffmpeg-filters.html#streamselect
   */
  streamselect: {
    /** number of input streams */
    inputs?: number;
    /** input indexes to remap to outputs */
    map?: string | number;
  };
  /**
   * Render text subtitles onto input video using the libass library.
   * @see https://ffmpeg.org/ffmpeg-filters.html#subtitles
   */
  subtitles: {
    /** set the filename of file to read */
    filename?: string | number;
    /** set the filename of file to read */
    f?: string | number;
    /** set the size of the original video (used to scale fonts) */
    original_size?: string | number;
    /** set the directory containing the fonts to read */
    fontsdir?: string | number;
    /** enable processing of alpha channel */
    alpha?: boolean;
    /** enable textual subtitle to video mode */
    sub2video?: boolean;
    /** set shaping engine */
    shaping?: 'auto' | 'simple' | 'complex';
    /** set input character encoding */
    charenc?: string | number;
    /** set stream index */
    stream_index?: number;
    /** set stream index */
    si?: number;
    /** force subtitle style */
    force_style?: string | number;
    /** break lines according to the Unicode Line Breaking Algorithm */
    wrap_unicode?: boolean;
  };
  /**
   * Scale the input by 2x using the Super2xSaI pixel art algorithm.
   * @see https://ffmpeg.org/ffmpeg-filters.html#super2xsai
   */
  super2xsai: {};
  /**
   * Apply 18 band equalization filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#superequalizer
   */
  superequalizer: {
    /** set 65Hz band gain */
    '1b'?: number;
    /** set 92Hz band gain */
    '2b'?: number;
    /** set 131Hz band gain */
    '3b'?: number;
    /** set 185Hz band gain */
    '4b'?: number;
    /** set 262Hz band gain */
    '5b'?: number;
    /** set 370Hz band gain */
    '6b'?: number;
    /** set 523Hz band gain */
    '7b'?: number;
    /** set 740Hz band gain */
    '8b'?: number;
    /** set 1047Hz band gain */
    '9b'?: number;
    /** set 1480Hz band gain */
    '10b'?: number;
    /** set 2093Hz band gain */
    '11b'?: number;
    /** set 2960Hz band gain */
    '12b'?: number;
    /** set 4186Hz band gain */
    '13b'?: number;
    /** set 5920Hz band gain */
    '14b'?: number;
    /** set 8372Hz band gain */
    '15b'?: number;
    /** set 11840Hz band gain */
    '16b'?: number;
    /** set 16744Hz band gain */
    '17b'?: number;
    /** set 20000Hz band gain */
    '18b'?: number;
  };
  /**
   * Apply audio surround upmix filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#surround
   */
  surround: {
    /** set output channel layout */
    chl_out?: string | number;
    /** set input channel layout */
    chl_in?: string | number;
    /** set input level */
    level_in?: number;
    /** set output level */
    level_out?: number;
    /** output LFE */
    lfe?: boolean;
    /** LFE low cut off */
    lfe_low?: number;
    /** LFE high cut off */
    lfe_high?: number;
    /** set LFE channel mode */
    lfe_mode?: 'add' | 'sub';
    /** set temporal smoothness strength */
    smooth?: number;
    /** set soundfield transform angle */
    angle?: number;
    /** set soundfield transform focus */
    focus?: number;
    /** set front center channel input level */
    fc_in?: number;
    /** set front center channel output level */
    fc_out?: number;
    /** set front left channel input level */
    fl_in?: number;
    /** set front left channel output level */
    fl_out?: number;
    /** set front right channel input level */
    fr_in?: number;
    /** set front right channel output level */
    fr_out?: number;
    /** set side left channel input level */
    sl_in?: number;
    /** set side left channel output level */
    sl_out?: number;
    /** set side right channel input level */
    sr_in?: number;
    /** set side right channel output level */
    sr_out?: number;
    /** set back left channel input level */
    bl_in?: number;
    /** set back left channel output level */
    bl_out?: number;
    /** set back right channel input level */
    br_in?: number;
    /** set back right channel output level */
    br_out?: number;
    /** set back center channel input level */
    bc_in?: number;
    /** set back center channel output level */
    bc_out?: number;
    /** set lfe channel input level */
    lfe_in?: number;
    /** set lfe channel output level */
    lfe_out?: number;
    /** set all channel's x spread */
    allx?: number;
    /** set all channel's y spread */
    ally?: number;
    /** set front center channel x spread */
    fcx?: number;
    /** set front left channel x spread */
    flx?: number;
    /** set front right channel x spread */
    frx?: number;
    /** set back left channel x spread */
    blx?: number;
    /** set back right channel x spread */
    brx?: number;
    /** set side left channel x spread */
    slx?: number;
    /** set side right channel x spread */
    srx?: number;
    /** set back center channel x spread */
    bcx?: number;
    /** set front center channel y spread */
    fcy?: number;
    /** set front left channel y spread */
    fly?: number;
    /** set front right channel y spread */
    fry?: number;
    /** set back left channel y spread */
    bly?: number;
    /** set back right channel y spread */
    bry?: number;
    /** set side left channel y spread */
    sly?: number;
    /** set side right channel y spread */
    sry?: number;
    /** set back center channel y spread */
    bcy?: number;
    /** set window size */
    win_size?: number;
    /** set window function */
    win_func?:
      | 'rect'
      | 'bartlett'
      | 'hann'
      | 'hanning'
      | 'hamming'
      | 'blackman'
      | 'welch'
      | 'flattop'
      | 'bharris'
      | 'bnuttall'
      | 'bhann'
      | 'sine'
      | 'nuttall'
      | 'lanczos'
      | 'gauss'
      | 'tukey'
      | 'dolph'
      | 'cauchy'
      | 'parzen'
      | 'poisson'
      | 'bohman'
      | 'kaiser';
    /** set window overlap */
    overlap?: number;
  };
  /**
   * Swap 2 rectangular objects in video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#swaprect
   */
  swaprect: {
    /** set rect width */
    w?: string | number;
    /** set rect height */
    h?: string | number;
    /** set 1st rect x top left coordinate */
    x1?: string | number;
    /** set 1st rect y top left coordinate */
    y1?: string | number;
    /** set 2nd rect x top left coordinate */
    x2?: string | number;
    /** set 2nd rect y top left coordinate */
    y2?: string | number;
  };
  /**
   * Swap U and V components.
   * @see https://ffmpeg.org/ffmpeg-filters.html#swapuv
   */
  swapuv: {};
  /**
   * Blend successive frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tblend
   */
  tblend: {
    /** set component #0 blend mode */
    c0_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set component #1 blend mode */
    c1_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set component #2 blend mode */
    c2_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set component #3 blend mode */
    c3_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set blend mode for all components */
    all_mode?:
      | 'addition'
      | 'addition128'
      | 'grainmerge'
      | 'and'
      | 'average'
      | 'burn'
      | 'darken'
      | 'difference'
      | 'difference128'
      | 'grainextract'
      | 'divide'
      | 'dodge'
      | 'exclusion'
      | 'extremity'
      | 'freeze'
      | 'glow'
      | 'hardlight'
      | 'hardmix'
      | 'heat'
      | 'lighten'
      | 'linearlight'
      | 'multiply'
      | 'multiply128'
      | 'negation'
      | 'normal'
      | 'or'
      | 'overlay'
      | 'phoenix'
      | 'pinlight'
      | 'reflect'
      | 'screen'
      | 'softlight'
      | 'subtract'
      | 'vividlight'
      | 'xor'
      | 'softdifference'
      | 'geometric'
      | 'harmonic'
      | 'bleach'
      | 'stain'
      | 'interpolate'
      | 'hardoverlay';
    /** set color component #0 expression */
    c0_expr?: string | number;
    /** set color component #1 expression */
    c1_expr?: string | number;
    /** set color component #2 expression */
    c2_expr?: string | number;
    /** set color component #3 expression */
    c3_expr?: string | number;
    /** set expression for all color components */
    all_expr?: string | number;
    /** set color component #0 opacity */
    c0_opacity?: number;
    /** set color component #1 opacity */
    c1_opacity?: number;
    /** set color component #2 opacity */
    c2_opacity?: number;
    /** set color component #3 opacity */
    c3_opacity?: number;
    /** set opacity for all color components */
    all_opacity?: number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Apply a telecine pattern.
   * @see https://ffmpeg.org/ffmpeg-filters.html#telecine
   */
  telecine: {
    /** select first field */
    first_field?: 'top' | 't' | 'bottom' | 'b';
    /** pattern that describe for how many fields a frame is to be displayed */
    pattern?: string | number;
  };
  /**
   * Generate test pattern.
   * @see https://ffmpeg.org/ffmpeg-filters.html#testsrc
   */
  testsrc: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
    /** set number of decimals to show */
    decimals?: number;
    /** set number of decimals to show */
    n?: number;
  };
  /**
   * Generate another test pattern.
   * @see https://ffmpeg.org/ffmpeg-filters.html#testsrc2
   */
  testsrc2: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
    /** set global alpha (opacity) */
    alpha?: number;
  };
  /**
   * Compute and draw a temporal histogram.
   * @see https://ffmpeg.org/ffmpeg-filters.html#thistogram
   */
  thistogram: {
    /** set width */
    width?: number;
    /** set width */
    w?: number;
    /** set display mode */
    display_mode?: 'overlay' | 'parade' | 'stack';
    /** set display mode */
    d?: 'overlay' | 'parade' | 'stack';
    /** set levels mode */
    levels_mode?: 'linear' | 'logarithmic';
    /** set levels mode */
    m?: 'linear' | 'logarithmic';
    /** set color components to display */
    components?: number;
    /** set color components to display */
    c?: number;
    /** set background opacity */
    bgopacity?: number;
    /** set background opacity */
    b?: number;
    /** display envelope */
    envelope?: boolean;
    /** display envelope */
    e?: boolean;
    /** set envelope color */
    ecolor?: string | number;
    /** set envelope color */
    ec?: string | number;
    /** set slide mode */
    slide?: 'frame' | 'replace' | 'scroll' | 'rscroll' | 'picture';
  };
  /**
   * Threshold first video stream using other video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#threshold
   */
  threshold: {
    /** set planes to filter */
    planes?: number;
  };
  /**
   * Select the most representative frame in a given sequence of consecutive frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#thumbnail
   */
  thumbnail: {
    /** set the frames batch size */
    n?: number;
    /** force stats logging level */
    log?: 'quiet' | 'info' | 'verbose';
  };
  /**
   * Select the most representative frame in a given sequence of consecutive frames using CUDA.
   * @see https://ffmpeg.org/ffmpeg-filters.html#thumbnail_005fcuda
   */
  thumbnail_cuda: {
    /** set the frames batch size */
    n?: number;
  };
  /**
   * Tile several successive frames together.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tile
   */
  tile: {
    /** set grid size */
    layout?: string | number;
    /** set maximum number of frame to render */
    nb_frames?: number;
    /** set outer border margin in pixels */
    margin?: number;
    /** set inner border thickness in pixels */
    padding?: number;
    /** set the color of the unused area */
    color?: string | number;
    /** set how many frames to overlap for each render */
    overlap?: number;
    /** set how many frames to initially pad */
    init_padding?: number;
  };
  /**
   * Generate a tilt-and-shift'd video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tiltandshift
   */
  tiltandshift: {
    /** Tilt the video horizontally while shifting */
    tilt?: number;
    /** Action at the start of input */
    start?: 'none' | 'frame' | 'black';
    /** Action at the end of input */
    end?: 'none' | 'frame' | 'black';
    /** Number of columns to hold at the start of the video */
    hold?: number;
    /** Number of columns to pad at the end of the video */
    pad?: number;
  };
  /**
   * Perform temporal field interlacing.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tinterlace
   */
  tinterlace: {
    /** select interlace mode */
    mode?: 'merge' | 'drop_even' | 'drop_odd' | 'pad' | 'interleave_top' | 'interleave_bottom' | 'interlacex2' | 'mergex2';
    /** set flags */
    flags?: 'low_pass_filter' | 'vlpf' | 'complex_filter' | 'cvlpf' | 'exact_tb' | 'bypass_il' | (string & {});
  };
  /**
   * Compute and apply a lookup table from two successive frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tlut2
   */
  tlut2: {
    /** set component #0 expression */
    c0?: string | number;
    /** set component #1 expression */
    c1?: string | number;
    /** set component #2 expression */
    c2?: string | number;
    /** set component #3 expression */
    c3?: string | number;
  };
  /**
   * Pick median pixels from successive frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tmedian
   */
  tmedian: {
    /** set median filter radius */
    radius?: number;
    /** set planes to filter */
    planes?: number;
    /** set percentile */
    percentile?: number;
  };
  /**
   * Apply Temporal Midway Equalization.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tmidequalizer
   */
  tmidequalizer: {
    /** set radius */
    radius?: number;
    /** set sigma */
    sigma?: number;
    /** set planes */
    planes?: number;
  };
  /**
   * Mix successive video frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tmix
   */
  tmix: {
    /** set number of successive frames to mix */
    frames?: number;
    /** set weight for each frame */
    weights?: string | number;
    /** set scale */
    scale?: number;
    /** set what planes to filter */
    planes?: string;
  };
  /**
   * Conversion to/from different dynamic ranges.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tonemap
   */
  tonemap: {
    /** tonemap algorithm selection */
    tonemap?: 'none' | 'linear' | 'gamma' | 'clip' | 'reinhard' | 'hable' | 'mobius';
    /** tonemap parameter */
    param?: number;
    /** desaturation strength */
    desat?: number;
    /** signal peak override */
    peak?: number;
  };
  /**
   * GPU accelerated HDR to SDR tonemapping
   * @see https://ffmpeg.org/ffmpeg-filters.html#tonemap_005fcuda
   */
  tonemap_cuda: {
    /** Tonemap algorithm selection */
    tonemap?: 'none' | 'linear' | 'gamma' | 'clip' | 'reinhard' | 'hable' | 'mobius' | 'bt2390';
    /** Tonemap mode selection */
    tonemap_mode?: 'max' | 'rgb' | 'lum' | 'itp' | 'auto';
    /** Set transfer characteristic */
    transfer?: 'bt709' | 'bt2020' | 'smpte2084';
    /** Set transfer characteristic */
    t?: 'bt709' | 'bt2020' | 'smpte2084';
    /** Set colorspace matrix */
    matrix?: 'bt709' | 'bt2020';
    /** Set colorspace matrix */
    m?: 'bt709' | 'bt2020';
    /** Set color primaries */
    primaries?: 'bt709' | 'bt2020';
    /** Set color primaries */
    p?: 'bt709' | 'bt2020';
    /** Set color range */
    range?: 'tv' | 'pc' | 'limited' | 'full';
    /** Set color range */
    r?: 'tv' | 'pc' | 'limited' | 'full';
    /** Output format */
    format?: string | number;
    /** Apply Dolby Vision metadata if possible */
    apply_dovi?: boolean;
    /** Apply tradeoffs to offload computing */
    tradeoff?: 'auto' | 'disabled' | 'enabled';
    /** Signal peak override */
    peak?: number;
    /** Tonemap parameter */
    param?: number;
    /** Desaturation parameter */
    desat?: number;
    /** Scene detection threshold */
    threshold?: number;
  };
  /**
   * Perform HDR to SDR conversion with tonemapping.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tonemap_005fopencl
   */
  tonemap_opencl: {
    /** tonemap algorithm selection */
    tonemap?: 'none' | 'linear' | 'gamma' | 'clip' | 'reinhard' | 'hable' | 'mobius';
    /** set transfer characteristic */
    transfer?: 'bt709' | 'bt2020';
    /** set transfer characteristic */
    t?: 'bt709' | 'bt2020';
    /** set colorspace matrix */
    matrix?: 'bt709' | 'bt2020';
    /** set colorspace matrix */
    m?: 'bt709' | 'bt2020';
    /** set color primaries */
    primaries?: 'bt709' | 'bt2020';
    /** set color primaries */
    p?: 'bt709' | 'bt2020';
    /** set color range */
    range?: 'tv' | 'pc' | 'limited' | 'full';
    /** set color range */
    r?: 'tv' | 'pc' | 'limited' | 'full';
    /** output pixel format */
    format?: string | number;
    /** signal peak override */
    peak?: number;
    /** tonemap parameter */
    param?: number;
    /** desaturation parameter */
    desat?: number;
    /** scene detection threshold */
    threshold?: number;
  };
  /**
   * VAAPI VPP for tone-mapping
   * @see https://ffmpeg.org/ffmpeg-filters.html#tonemap_005fvaapi
   */
  tonemap_vaapi: {
    /** Output pixel format set */
    format?: string | number;
    /** Output color matrix coefficient set */
    matrix?: string | number;
    /** Output color matrix coefficient set */
    m?: string | number;
    /** Output color primaries set */
    primaries?: string | number;
    /** Output color primaries set */
    p?: string | number;
    /** Output color transfer characteristics set */
    transfer?: string | number;
    /** Output color transfer characteristics set */
    t?: string | number;
    /** set mastering display colour volume */
    display?: string | number;
    /** set content light level information */
    light?: string | number;
  };
  /**
   * SIMD optimized HDR to SDR tonemapping
   * @see https://ffmpeg.org/ffmpeg-filters.html#tonemapx
   */
  tonemapx: {
    /** tonemap algorithm selection */
    tonemap?: 'none' | 'linear' | 'gamma' | 'clip' | 'reinhard' | 'hable' | 'mobius' | 'bt2390';
    /** set transfer characteristic */
    transfer?: 'bt709' | 'bt2020' | 'smpte2084';
    /** set transfer characteristic */
    t?: 'bt709' | 'bt2020' | 'smpte2084';
    /** set colorspace matrix */
    matrix?: 'bt709' | 'bt2020';
    /** set colorspace matrix */
    m?: 'bt709' | 'bt2020';
    /** set color primaries */
    primaries?: 'bt709' | 'bt2020';
    /** set color primaries */
    p?: 'bt709' | 'bt2020';
    /** set color range */
    range?: 'tv' | 'pc' | 'limited' | 'full';
    /** set color range */
    r?: 'tv' | 'pc' | 'limited' | 'full';
    /** output format */
    format?: string | number;
    /** tonemap parameter */
    param?: number;
    /** desaturation strength */
    desat?: number;
    /** signal peak override */
    peak?: number;
    /** Apply Dolby Vision metadata if possible */
    apply_dovi?: boolean;
  };
  /**
   * Temporarily pad video frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tpad
   */
  tpad: {
    /** set the number of frames to delay input */
    start?: number;
    /** set the number of frames to add after input finished */
    stop?: number;
    /** set the mode of added frames to start */
    start_mode?: 'add' | 'clone';
    /** set the mode of added frames to end */
    stop_mode?: 'add' | 'clone';
    /** set the duration to delay input */
    start_duration?: string | number;
    /** set the duration to pad input */
    stop_duration?: string | number;
    /** set the color of the added frames */
    color?: string | number;
  };
  /**
   * Transpose input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#transpose
   */
  transpose: {
    /** set transpose direction */
    dir?: 'cclock_flip' | 'clock' | 'cclock' | 'clock_flip';
    /** do not apply transposition if the input matches the specified geometry */
    passthrough?: 'none' | 'portrait' | 'landscape';
  };
  /**
   * Transpose input video using CUDA
   * @see https://ffmpeg.org/ffmpeg-filters.html#transpose_005fcuda
   */
  transpose_cuda: {
    /** set transpose direction */
    dir?: 'cclock_flip' | 'clock' | 'cclock' | 'clock_flip' | 'reversal' | 'hflip' | 'vflip';
    /** do not apply transposition if the input matches the specified geometry */
    passthrough?: 'none' | 'landscape' | 'portrait';
  };
  /**
   * NVIDIA Performance Primitives video transpose
   * @see https://ffmpeg.org/ffmpeg-filters.html#transpose_005fnpp
   */
  transpose_npp: {
    /** set transpose direction */
    dir?: 'cclock_flip' | 'clock' | 'cclock' | 'clock_flip';
    /** do not apply transposition if the input matches the specified geometry */
    passthrough?: 'none' | 'landscape' | 'portrait';
  };
  /**
   * Transpose input video
   * @see https://ffmpeg.org/ffmpeg-filters.html#transpose_005fopencl
   */
  transpose_opencl: {
    /** set transpose direction */
    dir?: 'cclock_flip' | 'clock' | 'cclock' | 'clock_flip' | 'reversal' | 'hflip' | 'vflip';
    /** do not apply transposition if the input matches the specified geometry */
    passthrough?: 'none' | 'portrait' | 'landscape';
  };
  /**
   * VAAPI VPP for transpose
   * @see https://ffmpeg.org/ffmpeg-filters.html#transpose_005fvaapi
   */
  transpose_vaapi: {
    /** set transpose direction */
    dir?: 'cclock_flip' | 'clock' | 'cclock' | 'clock_flip' | 'reversal' | 'hflip' | 'vflip';
    /** do not apply transposition if the input matches the specified geometry */
    passthrough?: 'none' | 'portrait' | 'landscape';
  };
  /**
   * Transpose Vulkan Filter
   * @see https://ffmpeg.org/ffmpeg-filters.html#transpose_005fvulkan
   */
  transpose_vulkan: {
    /** set transpose direction */
    dir?: 'cclock_flip' | 'clock' | 'cclock' | 'clock_flip';
    /** do not apply transposition if the input matches the specified geometry */
    passthrough?: 'none' | 'portrait' | 'landscape';
  };
  /**
   * Apply tremolo effect.
   * @see https://ffmpeg.org/ffmpeg-filters.html#tremolo
   */
  tremolo: {
    /** set frequency in hertz */
    f?: number;
    /** set depth as percentage */
    d?: number;
  };
  /**
   * Pick one continuous section from the input, drop the rest.
   * @see https://ffmpeg.org/ffmpeg-filters.html#trim
   */
  trim: {
    /** Timestamp of the first frame that  */
    start?: string | number;
    /** Timestamp of the first frame that  */
    starti?: string | number;
    /** Timestamp of the first frame that  */
    end?: string | number;
    /** Timestamp of the first frame that  */
    endi?: string | number;
    /** Timestamp of the first frame that should be  */
    start_pts?: number;
    /** Timestamp of the first frame that should be  */
    end_pts?: number;
    /** Maximum duration of the output */
    duration?: string | number;
    /** Maximum duration of the output */
    durationi?: string | number;
    /** Number of the first frame that should be passed  */
    start_frame?: number;
    /** Number of the first frame that should be dropped  */
    end_frame?: number;
  };
  /**
   * UnPreMultiply first stream with first plane of second stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#unpremultiply
   */
  unpremultiply: {
    /** set planes */
    planes?: number;
    /** enable inplace mode */
    inplace?: boolean;
  };
  /**
   * Sharpen or blur the input video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#unsharp
   */
  unsharp: {
    /** set luma matrix horizontal size */
    luma_msize_x?: number;
    /** set luma matrix horizontal size */
    lx?: number;
    /** set luma matrix vertical size */
    luma_msize_y?: number;
    /** set luma matrix vertical size */
    ly?: number;
    /** set luma effect strength */
    luma_amount?: number;
    /** set luma effect strength */
    la?: number;
    /** set chroma matrix horizontal size */
    chroma_msize_x?: number;
    /** set chroma matrix horizontal size */
    cx?: number;
    /** set chroma matrix vertical size */
    chroma_msize_y?: number;
    /** set chroma matrix vertical size */
    cy?: number;
    /** set chroma effect strength */
    chroma_amount?: number;
    /** set chroma effect strength */
    ca?: number;
    /** set alpha matrix horizontal size */
    alpha_msize_x?: number;
    /** set alpha matrix horizontal size */
    ax?: number;
    /** set alpha matrix vertical size */
    alpha_msize_y?: number;
    /** set alpha matrix vertical size */
    ay?: number;
    /** set alpha effect strength */
    alpha_amount?: number;
    /** set alpha effect strength */
    aa?: number;
  };
  /**
   * Apply unsharp mask to input video
   * @see https://ffmpeg.org/ffmpeg-filters.html#unsharp_005fopencl
   */
  unsharp_opencl: {
    /** Set luma mask horizontal diameter (pixels) */
    luma_msize_x?: number;
    /** Set luma mask horizontal diameter (pixels) */
    lx?: number;
    /** Set luma mask vertical diameter (pixels) */
    luma_msize_y?: number;
    /** Set luma mask vertical diameter (pixels) */
    ly?: number;
    /** Set luma amount (multiplier) */
    luma_amount?: number;
    /** Set luma amount (multiplier) */
    la?: number;
    /** Set chroma mask horizontal diameter (pixels after subsampling) */
    chroma_msize_x?: number;
    /** Set chroma mask horizontal diameter (pixels after subsampling) */
    cx?: number;
    /** Set chroma mask vertical diameter (pixels after subsampling) */
    chroma_msize_y?: number;
    /** Set chroma mask vertical diameter (pixels after subsampling) */
    cy?: number;
    /** Set chroma amount (multiplier) */
    chroma_amount?: number;
    /** Set chroma amount (multiplier) */
    ca?: number;
  };
  /**
   * Untile a frame into a sequence of frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#untile
   */
  untile: {
    /** set grid size */
    layout?: string | number;
  };
  /**
   * Apply Ultra Simple / Slow Post-processing filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#uspp
   */
  uspp: {
    /** set quality */
    quality?: number;
    /** force a constant quantizer parameter */
    qp?: number;
    /** use B-frames' QP */
    use_bframe_qp?: boolean;
    /** Codec name */
    codec?: string | number;
  };
  /**
   * Convert 360 projection of video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#v360
   */
  v360: {
    /** set input projection */
    input?:
      | 'e'
      | 'equirect'
      | 'c3x2'
      | 'c6x1'
      | 'eac'
      | 'dfisheye'
      | 'flat'
      | 'rectilinear'
      | 'gnomonic'
      | 'barrel'
      | 'fb'
      | 'c1x6'
      | 'sg'
      | 'mercator'
      | 'ball'
      | 'hammer'
      | 'sinusoidal'
      | 'fisheye'
      | 'pannini'
      | 'cylindrical'
      | 'tetrahedron'
      | 'barrelsplit'
      | 'tsp'
      | 'hequirect'
      | 'he'
      | 'equisolid'
      | 'og'
      | 'octahedron'
      | 'cylindricalea';
    /** set output projection */
    output?:
      | 'e'
      | 'equirect'
      | 'c3x2'
      | 'c6x1'
      | 'eac'
      | 'dfisheye'
      | 'flat'
      | 'rectilinear'
      | 'gnomonic'
      | 'barrel'
      | 'fb'
      | 'c1x6'
      | 'sg'
      | 'mercator'
      | 'ball'
      | 'hammer'
      | 'sinusoidal'
      | 'fisheye'
      | 'pannini'
      | 'cylindrical'
      | 'perspective'
      | 'tetrahedron'
      | 'barrelsplit'
      | 'tsp'
      | 'hequirect'
      | 'he'
      | 'equisolid'
      | 'og'
      | 'octahedron'
      | 'cylindricalea';
    /** set interpolation method */
    interp?: 'near' | 'nearest' | 'line' | 'linear' | 'lagrange9' | 'cube' | 'cubic' | 'lanc' | 'lanczos' | 'sp16' | 'spline16' | 'gauss' | 'gaussian' | 'mitchell';
    /** output width */
    w?: number;
    /** output height */
    h?: number;
    /** input stereo format */
    in_stereo?: '2d' | 'sbs' | 'tb';
    /** output stereo format */
    out_stereo?: '2d' | 'sbs' | 'tb';
    /** input cubemap face order */
    in_forder?: string | number;
    /** output cubemap face order */
    out_forder?: string | number;
    /** input cubemap face rotation */
    in_frot?: string | number;
    /** output cubemap face rotation */
    out_frot?: string | number;
    /** percent input cubemap pads */
    in_pad?: number;
    /** percent output cubemap pads */
    out_pad?: number;
    /** fixed input cubemap pads */
    fin_pad?: number;
    /** fixed output cubemap pads */
    fout_pad?: number;
    /** yaw rotation */
    yaw?: number;
    /** pitch rotation */
    pitch?: number;
    /** roll rotation */
    roll?: number;
    /** rotation order */
    rorder?: string | number;
    /** output horizontal field of view */
    h_fov?: number;
    /** output vertical field of view */
    v_fov?: number;
    /** output diagonal field of view */
    d_fov?: number;
    /** flip out video horizontally */
    h_flip?: boolean;
    /** flip out video vertically */
    v_flip?: boolean;
    /** flip out video indepth */
    d_flip?: boolean;
    /** flip in video horizontally */
    ih_flip?: boolean;
    /** flip in video vertically */
    iv_flip?: boolean;
    /** transpose video input */
    in_trans?: boolean;
    /** transpose video output */
    out_trans?: boolean;
    /** input horizontal field of view */
    ih_fov?: number;
    /** input vertical field of view */
    iv_fov?: number;
    /** input diagonal field of view */
    id_fov?: number;
    /** output horizontal off-axis offset */
    h_offset?: number;
    /** output vertical off-axis offset */
    v_offset?: number;
    /** build mask in alpha plane */
    alpha_mask?: boolean;
    /** reset rotation */
    reset_rot?: boolean;
  };
  /**
   * Convert 360 projection of video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#v360_005fvulkan
   */
  v360_vulkan: {
    /** set input projection */
    input?: number;
    /** set output projection */
    output?: number;
    /** output width */
    w?: number;
    /** output height */
    h?: number;
    /** yaw rotation */
    yaw?: number;
    /** pitch rotation */
    pitch?: number;
    /** roll rotation */
    roll?: number;
    /** rotation order */
    rorder?: string | number;
    /** set output horizontal FOV angle */
    h_fov?: number;
    /** set output vertical FOV angle */
    v_fov?: number;
    /** set input horizontal FOV angle */
    ih_fov?: number;
    /** set input vertical FOV angle */
    iv_fov?: number;
  };
  /**
   * Apply a Wavelet based Denoiser.
   * @see https://ffmpeg.org/ffmpeg-filters.html#vaguedenoiser
   */
  vaguedenoiser: {
    /** set filtering strength */
    threshold?: number;
    /** set filtering method */
    method?: 'hard' | 'soft' | 'garrote';
    /** set number of steps */
    nsteps?: number;
    /** set percent of full denoising */
    percent?: number;
    /** set planes to filter */
    planes?: number;
    /** set threshold type */
    type?: 'universal' | 'bayes';
  };
  /**
   * Apply Variable Blur filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#varblur
   */
  varblur: {
    /** set min blur radius */
    min_r?: number;
    /** set max blur radius */
    max_r?: number;
    /** set planes to filter */
    planes?: number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Video vectorscope.
   * @see https://ffmpeg.org/ffmpeg-filters.html#vectorscope
   */
  vectorscope: {
    /** set vectorscope mode */
    mode?: 'gray' | 'tint' | 'color' | 'color2' | 'color3' | 'color4' | 'color5';
    /** set vectorscope mode */
    m?: 'gray' | 'tint' | 'color' | 'color2' | 'color3' | 'color4' | 'color5';
    /** set color component on X axis */
    x?: number;
    /** set color component on Y axis */
    y?: number;
    /** set intensity */
    intensity?: number;
    /** set intensity */
    i?: number;
    /** set envelope */
    envelope?: 'none' | 'instant' | 'peak' | 'peak+instant';
    /** set envelope */
    e?: 'none' | 'instant' | 'peak' | 'peak+instant';
    /** set graticule */
    graticule?: 'none' | 'green' | 'color' | 'invert';
    /** set graticule */
    g?: 'none' | 'green' | 'color' | 'invert';
    /** set graticule opacity */
    opacity?: number;
    /** set graticule opacity */
    o?: number;
    /** set graticule flags */
    flags?: 'white' | 'black' | 'name' | (string & {});
    /** set graticule flags */
    f?: 'white' | 'black' | 'name' | (string & {});
    /** set background opacity */
    bgopacity?: number;
    /** set background opacity */
    b?: number;
    /** set low threshold */
    lthreshold?: number;
    /** set low threshold */
    l?: number;
    /** set high threshold */
    hthreshold?: number;
    /** set high threshold */
    h?: number;
    /** set colorspace */
    colorspace?: 'auto' | '601' | '709';
    /** set colorspace */
    c?: 'auto' | '601' | '709';
    /** set 1st tint */
    tint0?: number;
    /** set 1st tint */
    t0?: number;
    /** set 2nd tint */
    tint1?: number;
    /** set 2nd tint */
    t1?: number;
  };
  /**
   * Flip the input video vertically.
   * @see https://ffmpeg.org/ffmpeg-filters.html#vflip
   */
  vflip: {};
  /**
   * Vertically flip the input video in Vulkan
   * @see https://ffmpeg.org/ffmpeg-filters.html#vflip_005fvulkan
   */
  vflip_vulkan: {};
  /**
   * Variable frame rate detect filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#vfrdet
   */
  vfrdet: {};
  /**
   * Boost or alter saturation.
   * @see https://ffmpeg.org/ffmpeg-filters.html#vibrance
   */
  vibrance: {
    /** set the intensity value */
    intensity?: number;
    /** set the red balance value */
    rbal?: number;
    /** set the green balance value */
    gbal?: number;
    /** set the blue balance value */
    bbal?: number;
    /** set the red luma coefficient */
    rlum?: number;
    /** set the green luma coefficient */
    glum?: number;
    /** set the blue luma coefficient */
    blum?: number;
    /** use alternate colors */
    alternate?: boolean;
  };
  /**
   * Apply vibrato effect.
   * @see https://ffmpeg.org/ffmpeg-filters.html#vibrato
   */
  vibrato: {
    /** set frequency in hertz */
    f?: number;
    /** set depth as percentage */
    d?: number;
  };
  /**
   * Extract relative transformations,
   * @see https://ffmpeg.org/ffmpeg-filters.html#vidstabdetect
   */
  vidstabdetect: {
    /** path to the file used to write the transforms */
    result?: string | number;
    /** how shaky is the video and how quick is the camera? */
    shakiness?: number;
    /** (&gt;=shakiness) 1: low 15: high (slow) */
    accuracy?: number;
    /** region around minimum is scanned with 1 pixel resolution */
    stepsize?: number;
    /** below this contrast a field is discarded (0-1) */
    mincontrast?: number;
    /** 0: draw nothing; 1,2: show fields and transforms */
    show?: number;
    /** virtual tripod mode (if &gt;0): motion is compared to a reference */
    tripod?: number;
    /** transforms data file format */
    fileformat?: 'ascii' | 'binary';
  };
  /**
   * Transform the frames,
   * @see https://ffmpeg.org/ffmpeg-filters.html#vidstabtransform
   */
  vidstabtransform: {
    /** set path to the file storing the transforms */
    input?: string | number;
    /** set number of frames*2 + 1 used for lowpass filtering */
    smoothing?: number;
    /** set camera path optimization algo */
    optalgo?: 'opt' | 'gauss' | 'avg';
    /** set maximal number of pixels to translate image */
    maxshift?: number;
    /** set maximal angle in rad to rotate image */
    maxangle?: number;
    /** set cropping mode */
    crop?: 'keep' | 'black';
    /** invert transforms */
    invert?: number;
    /** consider transforms as relative */
    relative?: number;
    /** set percentage to zoom (&gt;0: zoom in, &lt;0: zoom out */
    zoom?: number;
    /** set optimal zoom (0: nothing, 1: optimal static zoom, 2: optimal dynamic zoom) */
    optzoom?: number;
    /** for adative zoom: percent to zoom maximally each frame */
    zoomspeed?: number;
    /** set type of interpolation */
    interpol?: 'no' | 'linear' | 'bilinear' | 'bicubic';
    /** enable virtual tripod mode (same as relative=0:smoothing=0) */
    tripod?: boolean;
    /** enable debug mode and writer global motions information to file */
    debug?: boolean;
  };
  /**
   * Calculate the VIF between two video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#vif
   */
  vif: {
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Make or reverse a vignette effect.
   * @see https://ffmpeg.org/ffmpeg-filters.html#vignette
   */
  vignette: {
    /** set lens angle */
    angle?: string | number;
    /** set lens angle */
    a?: string | number;
    /** set circle center position on x-axis */
    x0?: string | number;
    /** set circle center position on y-axis */
    y0?: string | number;
    /** set forward/backward mode */
    mode?: 'forward' | 'backward';
    /** specify when to evaluate expressions */
    eval?: 'init' | 'frame';
    /** set dithering */
    dither?: boolean;
    /** set aspect ratio */
    aspect?: string | number;
  };
  /**
   * Audio Virtual Bass.
   * @see https://ffmpeg.org/ffmpeg-filters.html#virtualbass
   */
  virtualbass: {
    /** set virtual bass cutoff */
    cutoff?: number;
    /** set virtual bass strength */
    strength?: number;
  };
  /**
   * Calculate the VMAF Motion score.
   * @see https://ffmpeg.org/ffmpeg-filters.html#vmafmotion
   */
  vmafmotion: {
    /** Set file where to store per-frame difference information */
    stats_file?: string | number;
  };
  /**
   * Change input volume.
   * @see https://ffmpeg.org/ffmpeg-filters.html#volume
   */
  volume: {
    /** set volume adjustment expression */
    volume?: string | number;
    /** select mathematical precision */
    precision?: 'fixed' | 'float' | 'double';
    /** specify when to evaluate expressions */
    eval?: 'once' | 'frame';
    /** Apply replaygain side data when present */
    replaygain?: 'drop' | 'ignore' | 'track' | 'album';
    /** Apply replaygain pre-amplification */
    replaygain_preamp?: number;
    /** Apply replaygain clipping prevention */
    replaygain_noclip?: boolean;
  };
  /**
   * Detect audio volume.
   * @see https://ffmpeg.org/ffmpeg-filters.html#volumedetect
   */
  volumedetect: {};
  /**
   * AMF video scaling and format conversion
   * @see https://ffmpeg.org/ffmpeg-filters.html#vpp_005famf
   */
  vpp_amf: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output pixel format */
    format?: string | number;
    /** Scale type */
    scale_type?: number;
    /** Color profile */
    color_profile?: number;
    /** Input color range */
    in_color_range?: number;
    /** Output color range */
    out_color_range?: number;
    /** Input color primaries */
    in_primaries?: number;
    /** Output color primaries */
    out_primaries?: number;
    /** Input transfer characteristics */
    in_trc?: number;
    /** Output transfer characteristics */
    out_trc?: number;
    /** decrease or increase w/h if necessary to keep the original AR */
    force_original_aspect_ratio?: number;
    /** enforce that the output resolution is divisible by a defined integer when force_original_aspect_ratio is used */
    force_divisible_by?: number;
    /** reset SAR to 1 and scale to square pixels if scaling proportionally */
    reset_sar?: boolean;
  };
  /**
   * Rockchip RGA (2D Raster Graphic Acceleration) video post-process (scale/crop/transpose)
   * @see https://ffmpeg.org/ffmpeg-filters.html#vpp_005frkrga
   */
  vpp_rkrga: {
    /** Output video width */
    w?: string | number;
    /** Output video height */
    h?: string | number;
    /** Set the width crop area expression */
    cw?: string | number;
    /** Set the height crop area expression */
    ch?: string | number;
    /** Set the x crop area expression */
    cx?: string | number;
    /** Set the y crop area expression */
    cy?: string | number;
    /** Output video pixel format */
    format?: string | number;
    /** Set transpose direction */
    transpose?: 'cclock_hflip' | 'clock' | 'cclock' | 'clock_hflip' | 'reversal' | 'hflip' | 'vflip';
    /** Enforce planar YUV format output */
    force_yuv?: 'disable' | 'auto' | '8bit' | '10bit';
    /** Enforce chroma of planar YUV format output */
    force_chroma?: 'auto' | '420sp' | '420p' | '422sp' | '422p';
    /** Set multicore RGA scheduler core [use with caution] */
    core?: 'default' | 'rga3_core0' | 'rga3_core1' | 'rga2_core0' | 'rga2_core1' | (string & {});
    /** Set the internal parallelization depth */
    async_depth?: number;
    /** Enable AFBC (Arm Frame Buffer Compression) to save bandwidth */
    afbc?: boolean;
  };
  /**
   * AMD AMF screen capture
   * @see https://ffmpeg.org/ffmpeg-filters.html#vsrc_005famf
   */
  vsrc_amf: {
    /** Index of display monitor to capture */
    monitor_index?: number;
    /** Capture framerate */
    framerate?: string | number;
    /** Use display output duplication for screen capture */
    duplicate_output?: boolean;
    /** Capture synchronization mode */
    capture_mode?: number;
  };
  /**
   * Stack video inputs vertically.
   * @see https://ffmpeg.org/ffmpeg-filters.html#vstack
   */
  vstack: {
    /** set number of inputs */
    inputs?: number;
    /** force termination when the shortest input terminates */
    shortest?: boolean;
  };
  /**
   * Apply Martin Weston three field deinterlace.
   * @see https://ffmpeg.org/ffmpeg-filters.html#w3fdif
   */
  w3fdif: {
    /** specify the filter */
    filter?: 'simple' | 'complex';
    /** specify the interlacing mode */
    mode?: 'frame' | 'field';
    /** specify the assumed picture field parity */
    parity?: 'tff' | 'bff' | 'auto';
    /** specify which frames to deinterlace */
    deint?: 'all' | 'interlaced';
  };
  /**
   * Video waveform monitor.
   * @see https://ffmpeg.org/ffmpeg-filters.html#waveform
   */
  waveform: {
    /** set mode */
    mode?: 'row' | 'column';
    /** set mode */
    m?: 'row' | 'column';
    /** set intensity */
    intensity?: number;
    /** set intensity */
    i?: number;
    /** set mirroring */
    mirror?: boolean;
    /** set mirroring */
    r?: boolean;
    /** set display mode */
    display?: 'overlay' | 'stack' | 'parade';
    /** set display mode */
    d?: 'overlay' | 'stack' | 'parade';
    /** set components to display */
    components?: number;
    /** set components to display */
    c?: number;
    /** set envelope to display */
    envelope?: 'none' | 'instant' | 'peak' | 'peak+instant';
    /** set envelope to display */
    e?: 'none' | 'instant' | 'peak' | 'peak+instant';
    /** set filter */
    filter?: 'lowpass' | 'flat' | 'aflat' | 'chroma' | 'color' | 'acolor' | 'xflat' | 'yflat';
    /** set filter */
    f?: 'lowpass' | 'flat' | 'aflat' | 'chroma' | 'color' | 'acolor' | 'xflat' | 'yflat';
    /** set graticule */
    graticule?: 'none' | 'green' | 'orange' | 'invert';
    /** set graticule */
    g?: 'none' | 'green' | 'orange' | 'invert';
    /** set graticule opacity */
    opacity?: number;
    /** set graticule opacity */
    o?: number;
    /** set graticule flags */
    flags?: 'numbers' | 'dots' | (string & {});
    /** set graticule flags */
    fl?: 'numbers' | 'dots' | (string & {});
    /** set scale */
    scale?: 'digital' | 'millivolts' | 'ire';
    /** set scale */
    s?: 'digital' | 'millivolts' | 'ire';
    /** set background opacity */
    bgopacity?: number;
    /** set background opacity */
    b?: number;
    /** set 1st tint */
    tint0?: number;
    /** set 1st tint */
    t0?: number;
    /** set 2nd tint */
    tint1?: number;
    /** set 2nd tint */
    t1?: number;
    /** set fit mode */
    fitmode?: 'none' | 'size';
    /** set fit mode */
    fm?: 'none' | 'size';
    /** set input formats selection */
    input?: 'all' | 'first';
  };
  /**
   * Weave input video fields into frames.
   * @see https://ffmpeg.org/ffmpeg-filters.html#weave
   */
  weave: {
    /** set first field */
    first_field?: 'top' | 't' | 'bottom' | 'b';
  };
  /**
   * Transcribe audio using whisper.cpp.
   * @see https://ffmpeg.org/ffmpeg-filters.html#whisper
   */
  whisper: {
    /** Path to the whisper.cpp model file */
    model?: string | number;
    /** Language for transcription ('auto' for auto-detect) */
    language?: string | number;
    /** Translate from source language to English */
    translate?: boolean;
    /** Audio queue size */
    queue?: string | number;
    /** Use GPU for processing */
    use_gpu?: boolean;
    /** GPU device to use */
    gpu_device?: number;
    /** Output destination */
    destination?: string | number;
    /** Output format (text|srt|json) */
    format?: string | number;
    /** Max segment length in characters */
    max_len?: number;
    /** Path to the VAD model file */
    vad_model?: string | number;
    /** VAD threshold */
    vad_threshold?: number;
    /** Minimum speech duration for VAD */
    vad_min_speech_duration?: string | number;
    /** Minimum silence duration for VAD */
    vad_min_silence_duration?: string | number;
  };
  /**
   * Scale the input using xBR algorithm.
   * @see https://ffmpeg.org/ffmpeg-filters.html#xbr
   */
  xbr: {
    /** set scale factor */
    n?: number;
  };
  /**
   * Cross-correlate first video stream with second video stream.
   * @see https://ffmpeg.org/ffmpeg-filters.html#xcorrelate
   */
  xcorrelate: {};
  /**
   * Cross fade one video with another video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#xfade
   */
  xfade: {
    /** set cross fade transition */
    transition?:
      | 'custom'
      | 'fade'
      | 'wipeleft'
      | 'wiperight'
      | 'wipeup'
      | 'wipedown'
      | 'slideleft'
      | 'slideright'
      | 'slideup'
      | 'slidedown'
      | 'circlecrop'
      | 'rectcrop'
      | 'distance'
      | 'fadeblack'
      | 'fadewhite'
      | 'radial'
      | 'smoothleft'
      | 'smoothright'
      | 'smoothup'
      | 'smoothdown'
      | 'circleopen'
      | 'circleclose'
      | 'vertopen'
      | 'vertclose'
      | 'horzopen'
      | 'horzclose'
      | 'dissolve'
      | 'pixelize'
      | 'diagtl'
      | 'diagtr'
      | 'diagbl'
      | 'diagbr'
      | 'hlslice'
      | 'hrslice'
      | 'vuslice'
      | 'vdslice'
      | 'hblur'
      | 'fadegrays'
      | 'wipetl'
      | 'wipetr'
      | 'wipebl'
      | 'wipebr'
      | 'squeezeh'
      | 'squeezev'
      | 'zoomin'
      | 'fadefast'
      | 'fadeslow'
      | 'hlwind'
      | 'hrwind'
      | 'vuwind'
      | 'vdwind'
      | 'coverleft'
      | 'coverright'
      | 'coverup'
      | 'coverdown'
      | 'revealleft'
      | 'revealright'
      | 'revealup'
      | 'revealdown';
    /** set cross fade duration */
    duration?: string | number;
    /** set cross fade start relative to first input stream */
    offset?: string | number;
    /** set expression for custom transition */
    expr?: string | number;
  };
  /**
   * Cross fade one video with another video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#xfade_005fopencl
   */
  xfade_opencl: {
    /** set cross fade transition */
    transition?: 'custom' | 'fade' | 'wipeleft' | 'wiperight' | 'wipeup' | 'wipedown' | 'slideleft' | 'slideright' | 'slideup' | 'slidedown';
    /** set OpenCL program source file for custom transition */
    source?: string | number;
    /** set kernel name in program file for custom transition */
    kernel?: string | number;
    /** set cross fade duration */
    duration?: string | number;
    /** set cross fade start relative to first input stream */
    offset?: string | number;
  };
  /**
   * Cross fade one video with another video.
   * @see https://ffmpeg.org/ffmpeg-filters.html#xfade_005fvulkan
   */
  xfade_vulkan: {
    /** set cross fade transition */
    transition?:
      | 'fade'
      | 'wipeleft'
      | 'wiperight'
      | 'wipeup'
      | 'wipedown'
      | 'slidedown'
      | 'slideup'
      | 'slideleft'
      | 'slideright'
      | 'circleopen'
      | 'circleclose'
      | 'dissolve'
      | 'pixelize'
      | 'wipetl'
      | 'wipetr'
      | 'wipebl'
      | 'wipebr';
    /** set cross fade duration */
    duration?: string | number;
    /** set cross fade start relative to first input stream */
    offset?: string | number;
  };
  /**
   * Pick median pixels from several video inputs.
   * @see https://ffmpeg.org/ffmpeg-filters.html#xmedian
   */
  xmedian: {
    /** set number of inputs */
    inputs?: number;
    /** set planes to filter */
    planes?: number;
    /** set percentile */
    percentile?: number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Calculate the extended perceptually weighted peak signal-to-noise ratio (XPSNR) between two video streams.
   * @see https://ffmpeg.org/ffmpeg-filters.html#xpsnr
   */
  xpsnr: {
    /** Set file where to store per-frame XPSNR information */
    stats_file?: string | number;
    /** Set file where to store per-frame XPSNR information */
    f?: string | number;
    /** Action to take when encountering EOF from secondary input  */
    eof_action?: 'repeat' | 'endall' | 'pass';
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** extend last frame of secondary streams beyond EOF */
    repeatlast?: boolean;
    /** How strictly to sync streams based on secondary input timestamps */
    ts_sync_mode?: 'default' | 'nearest';
  };
  /**
   * Stack video inputs into custom layout.
   * @see https://ffmpeg.org/ffmpeg-filters.html#xstack
   */
  xstack: {
    /** set number of inputs */
    inputs?: number;
    /** set custom layout */
    layout?: string | number;
    /** set fixed size grid layout */
    grid?: string | number;
    /** force termination when the shortest input terminates */
    shortest?: boolean;
    /** set the color for unused pixels */
    fill?: string | number;
  };
  /**
   * Deinterlace the input image.
   * @see https://ffmpeg.org/ffmpeg-filters.html#yadif
   */
  yadif: {};
  /**
   * Deinterlace CUDA frames
   * @see https://ffmpeg.org/ffmpeg-filters.html#yadif_005fcuda
   */
  yadif_cuda: {};
  /**
   * Deinterlace (YADIF) the video through OpenCL.
   * @see https://ffmpeg.org/ffmpeg-filters.html#yadif_005fopencl
   */
  yadif_opencl: {
    /** specify the interlacing mode */
    mode?: 'send_frame' | 'send_field' | 'send_frame_nospatial' | 'send_field_nospatial';
    /** specify the assumed picture field parity */
    parity?: 'tff' | 'bff' | 'auto';
    /** specify which frames to deinterlace */
    deint?: 'all' | 'interlaced';
  };
  /**
   * Yet another edge preserving blur filter.
   * @see https://ffmpeg.org/ffmpeg-filters.html#yaepblur
   */
  yaepblur: {
    /** set window radius */
    radius?: number;
    /** set window radius */
    r?: number;
    /** set planes to filter */
    planes?: number;
    /** set planes to filter */
    p?: number;
    /** set blur strength */
    sigma?: number;
    /** set blur strength */
    s?: number;
  };
  /**
   * Generate YUV test pattern.
   * @see https://ffmpeg.org/ffmpeg-filters.html#yuvtestsrc
   */
  yuvtestsrc: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
  };
  /**
   * Receive commands through ZMQ and broker them to filters.
   * @see https://ffmpeg.org/ffmpeg-filters.html#zmq
   */
  zmq: {
    /** set bind address */
    bind_address?: string | number;
    /** set bind address */
    b?: string | number;
  };
  /**
   * Generate zone-plate.
   * @see https://ffmpeg.org/ffmpeg-filters.html#zoneplate
   */
  zoneplate: {
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set video rate */
    rate?: string | number;
    /** set video rate */
    r?: string | number;
    /** set video duration */
    duration?: string | number;
    /** set video duration */
    d?: string | number;
    /** set video sample aspect ratio */
    sar?: string | number;
    /** set LUT precision */
    precision?: number;
    /** set X-axis offset */
    xo?: number;
    /** set Y-axis offset */
    yo?: number;
    /** set T-axis offset */
    to?: number;
    /** set 0-order phase */
    k0?: number;
    /** set 1-order X-axis phase */
    kx?: number;
    /** set 1-order Y-axis phase */
    ky?: number;
    /** set 1-order T-axis phase */
    kt?: number;
    /** set X-axis*T-axis product phase */
    kxt?: number;
    /** set Y-axis*T-axis product phase */
    kyt?: number;
    /** set X-axis*Y-axis product phase */
    kxy?: number;
    /** set 2-order X-axis phase */
    kx2?: number;
    /** set 2-order Y-axis phase */
    ky2?: number;
    /** set 2-order T-axis phase */
    kt2?: number;
    /** set 0-order U-color phase */
    ku?: number;
    /** set 0-order V-color phase */
    kv?: number;
  };
  /**
   * Apply Zoom &amp; Pan effect.
   * @see https://ffmpeg.org/ffmpeg-filters.html#zoompan
   */
  zoompan: {
    /** set the zoom expression */
    zoom?: string | number;
    /** set the zoom expression */
    z?: string | number;
    /** set the x expression */
    x?: string | number;
    /** set the y expression */
    y?: string | number;
    /** set the duration expression */
    d?: string | number;
    /** set the output image size */
    s?: string | number;
    /** set the output framerate */
    fps?: string | number;
  };
  /**
   * Apply resizing, colorspace and bit depth conversion.
   * @see https://ffmpeg.org/ffmpeg-filters.html#zscale
   */
  zscale: {
    /** Output video width */
    w?: string | number;
    /** Output video width */
    width?: string | number;
    /** Output video height */
    h?: string | number;
    /** Output video height */
    height?: string | number;
    /** set video size */
    size?: string | number;
    /** set video size */
    s?: string | number;
    /** set dither type */
    dither?: 'none' | 'ordered' | 'random' | 'error_diffusion';
    /** set dither type */
    d?: 'none' | 'ordered' | 'random' | 'error_diffusion';
    /** set filter type */
    filter?: 'point' | 'bilinear' | 'bicubic' | 'spline16' | 'spline36' | 'spline64' | 'lanczos';
    /** set filter type */
    f?: 'point' | 'bilinear' | 'bicubic' | 'spline16' | 'spline36' | 'spline64' | 'lanczos';
    /** set color range */
    out_range?: 'input' | 'limited' | 'full' | 'unknown' | 'tv' | 'pc';
    /** set color range */
    range?: 'input' | 'limited' | 'full' | 'unknown' | 'tv' | 'pc';
    /** set color range */
    r?: 'input' | 'limited' | 'full' | 'unknown' | 'tv' | 'pc';
    /** set color primaries */
    primaries?:
      | 'input'
      | '709'
      | 'unspecified'
      | '170m'
      | '240m'
      | '2020'
      | 'unknown'
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213';
    /** set color primaries */
    p?:
      | 'input'
      | '709'
      | 'unspecified'
      | '170m'
      | '240m'
      | '2020'
      | 'unknown'
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213';
    /** set transfer characteristic */
    transfer?:
      | 'input'
      | '709'
      | 'unspecified'
      | '601'
      | 'linear'
      | '2020_10'
      | '2020_12'
      | 'unknown'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'bt709'
      | 'log100'
      | 'log316'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'smpte2084'
      | 'iec61966-2-4'
      | 'iec61966-2-1'
      | 'arib-std-b67';
    /** set transfer characteristic */
    t?:
      | 'input'
      | '709'
      | 'unspecified'
      | '601'
      | 'linear'
      | '2020_10'
      | '2020_12'
      | 'unknown'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'bt709'
      | 'log100'
      | 'log316'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'smpte2084'
      | 'iec61966-2-4'
      | 'iec61966-2-1'
      | 'arib-std-b67';
    /** set colorspace matrix */
    matrix?:
      | 'input'
      | '709'
      | 'unspecified'
      | '470bg'
      | '170m'
      | '2020_ncl'
      | '2020_cl'
      | 'unknown'
      | 'gbr'
      | 'bt709'
      | 'fcc'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'ycgco'
      | 'bt2020nc'
      | 'bt2020c'
      | 'chroma-derived-nc'
      | 'chroma-derived-c'
      | 'ictcp';
    /** set colorspace matrix */
    m?:
      | 'input'
      | '709'
      | 'unspecified'
      | '470bg'
      | '170m'
      | '2020_ncl'
      | '2020_cl'
      | 'unknown'
      | 'gbr'
      | 'bt709'
      | 'fcc'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'ycgco'
      | 'bt2020nc'
      | 'bt2020c'
      | 'chroma-derived-nc'
      | 'chroma-derived-c'
      | 'ictcp';
    /** set input color range */
    in_range?: 'input' | 'limited' | 'full' | 'unknown' | 'tv' | 'pc';
    /** set input color range */
    rangein?: 'input' | 'limited' | 'full' | 'unknown' | 'tv' | 'pc';
    /** set input color range */
    rin?: 'input' | 'limited' | 'full' | 'unknown' | 'tv' | 'pc';
    /** set input color primaries */
    primariesin?:
      | 'input'
      | '709'
      | 'unspecified'
      | '170m'
      | '240m'
      | '2020'
      | 'unknown'
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213';
    /** set input color primaries */
    pin?:
      | 'input'
      | '709'
      | 'unspecified'
      | '170m'
      | '240m'
      | '2020'
      | 'unknown'
      | 'bt709'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'film'
      | 'bt2020'
      | 'smpte428'
      | 'smpte431'
      | 'smpte432'
      | 'jedec-p22'
      | 'ebu3213';
    /** set input transfer characteristic */
    transferin?:
      | 'input'
      | '709'
      | 'unspecified'
      | '601'
      | 'linear'
      | '2020_10'
      | '2020_12'
      | 'unknown'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'bt709'
      | 'log100'
      | 'log316'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'smpte2084'
      | 'iec61966-2-4'
      | 'iec61966-2-1'
      | 'arib-std-b67';
    /** set input transfer characteristic */
    tin?:
      | 'input'
      | '709'
      | 'unspecified'
      | '601'
      | 'linear'
      | '2020_10'
      | '2020_12'
      | 'unknown'
      | 'bt470m'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'bt709'
      | 'log100'
      | 'log316'
      | 'bt2020-10'
      | 'bt2020-12'
      | 'smpte2084'
      | 'iec61966-2-4'
      | 'iec61966-2-1'
      | 'arib-std-b67';
    /** set input colorspace matrix */
    matrixin?:
      | 'input'
      | '709'
      | 'unspecified'
      | '470bg'
      | '170m'
      | '2020_ncl'
      | '2020_cl'
      | 'unknown'
      | 'gbr'
      | 'bt709'
      | 'fcc'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'ycgco'
      | 'bt2020nc'
      | 'bt2020c'
      | 'chroma-derived-nc'
      | 'chroma-derived-c'
      | 'ictcp';
    /** set input colorspace matrix */
    min?:
      | 'input'
      | '709'
      | 'unspecified'
      | '470bg'
      | '170m'
      | '2020_ncl'
      | '2020_cl'
      | 'unknown'
      | 'gbr'
      | 'bt709'
      | 'fcc'
      | 'bt470bg'
      | 'smpte170m'
      | 'smpte240m'
      | 'ycgco'
      | 'bt2020nc'
      | 'bt2020c'
      | 'chroma-derived-nc'
      | 'chroma-derived-c'
      | 'ictcp';
    /** set output chroma location */
    chromal?: 'input' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom';
    /** set output chroma location */
    c?: 'input' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom';
    /** set input chroma location */
    chromalin?: 'input' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom';
    /** set input chroma location */
    cin?: 'input' | 'left' | 'center' | 'topleft' | 'top' | 'bottomleft' | 'bottom';
    /** set nominal peak luminance */
    npl?: number;
    /** allow approximate gamma */
    agamma?: boolean;
    /** parameter A, which is parameter \"b\" for bicubic,  */
    param_a?: number;
    /** parameter B, which is parameter \"c\" for bicubic */
    param_b?: number;
  };
}

/** Loose option bag for filters without generated typings. */
export type UnknownFilterOptions = Record<string, string | number | boolean | undefined | null>;

/**
 * Resolve the options for a filter. Returns the strongly-typed option set when
 * the filter name is known (autocomplete + validation), otherwise a loose bag.
 */
export type FilterOptionsFor<N> = N extends keyof FilterOptionsMap ? FilterOptionsMap[N] : UnknownFilterOptions;
