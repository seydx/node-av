import { AVMEDIA_TYPE_AUDIO, AVMEDIA_TYPE_VIDEO, type AVMediaType } from '../constants/constants.js';
import { bindings } from './binding.js';

import type { NativeFilter, NativeWrapper } from './native-types.js';

/**
 * Filter pad information
 */
export interface FilterPad {
  name: string | null; // (e.g., "in", "out")
  type: AVMediaType;
}

/**
 * Filter descriptor for video/audio processing.
 *
 * Represents a filter that can be used in filter graphs for processing
 * audio and video frames. Filters can be sources (no inputs), sinks (no outputs),
 * or processors (with both inputs and outputs). Each filter has specific
 * capabilities and pad configurations.
 *
 * Direct mapping to FFmpeg's AVFilter.
 *
 * @example
 * ```typescript
 * import { Filter } from 'node-av';
 *
 * // Get a specific filter
 * const scaleFilter = Filter.getByName('scale');
 * if (scaleFilter) {
 *   console.log(`Filter: ${scaleFilter.name}`);
 *   console.log(`Description: ${scaleFilter.description}`);
 *   console.log(`Inputs: ${scaleFilter.inputs.length}`);
 *   console.log(`Outputs: ${scaleFilter.outputs.length}`);
 * }
 *
 * // List all video filters
 * const filters = Filter.getList();
 * const videoFilters = filters.filter(f => f.isVideo());
 * console.log(`Found ${videoFilters.length} video filters`);
 * ```
 *
 * @see [AVFilter](https://ffmpeg.org/doxygen/trunk/structAVFilter.html) - FFmpeg Doxygen
 * @see {@link FilterContext} For using filters in graphs
 * @see {@link FilterGraph} For building filter pipelines
 */
export class Filter implements NativeWrapper<NativeFilter> {
  private native: NativeFilter;

  /**
   * @param native - The native filter instance
   *
   * @internal
   */
  constructor(native: NativeFilter) {
    this.native = native;
  }

  /**
   * Get a filter by name.
   *
   * Retrieves a specific filter descriptor by its name.
   * Common filter names include 'scale', 'crop', 'overlay', 'aformat', etc.
   *
   * Direct mapping to avfilter_get_by_name().
   *
   * @param name - Name of the filter
   *
   * @returns Filter instance if found, null otherwise
   *
   * @example
   * ```typescript
   * // Get video scaling filter
   * const scale = Filter.getByName('scale');
   * if (!scale) {
   *   throw new Error('Scale filter not available');
   * }
   *
   * // Get audio format filter
   * const aformat = Filter.getByName('aformat');
   * ```
   *
   * @see {@link getList} To list all available filters
   */
  static getByName(name: string): Filter | null {
    const native = bindings.Filter.getByName(name);
    return native ? new Filter(native) : null;
  }

  /**
   * Get list of all available filters.
   *
   * Returns an array of all registered filters in FFmpeg.
   * Useful for discovering available filters or building filter lists.
   *
   * @returns Array of all available filters
   *
   * @example
   * ```typescript
   * // List all filters
   * const filters = Filter.getList();
   * console.log(`Total filters: ${filters.length}`);
   *
   * // Find all source filters (generators)
   * const sources = filters.filter(f => f.isSource());
   * console.log(`Source filters: ${sources.length}`);
   *
   * // Find all sink filters (outputs)
   * const sinks = filters.filter(f => f.isSink());
   * console.log(`Sink filters: ${sinks.length}`);
   * ```
   *
   * @see {@link getByName} To get a specific filter
   */
  static getList(): Filter[] {
    const natives = bindings.Filter.getList();
    return natives.map((native) => new Filter(native));
  }

  /**
   * Filter name.
   *
   * Unique identifier for the filter (e.g., 'scale', 'overlay').
   *
   * Direct mapping to AVFilter->name.
   */
  get name(): string | null {
    return this.native.name;
  }

  /**
   * Filter description.
   *
   * Human-readable description of what the filter does.
   *
   * Direct mapping to AVFilter->description.
   */
  get description(): string | null {
    return this.native.description;
  }

  /**
   * Input pads.
   *
   * Array of input pad descriptors.
   * Empty array for source filters.
   *
   * Direct mapping to AVFilter->inputs.
   */
  get inputs(): FilterPad[] {
    return this.native.inputs;
  }

  /**
   * Output pads.
   *
   * Array of output pad descriptors.
   * Empty array for sink filters.
   *
   * Direct mapping to AVFilter->outputs.
   */
  get outputs(): FilterPad[] {
    return this.native.outputs;
  }

  /**
   * Filter flags.
   *
   * Combination of AVFILTER_FLAG_* values indicating filter capabilities.
   *
   * Direct mapping to AVFilter->flags.
   */
  get flags(): number {
    return this.native.flags;
  }

  /**
   * Check if filter has specific flags.
   *
   * Tests whether all specified flags are set using bitwise AND.
   *
   * @param flags - One or more flag values to check
   *
   * @returns true if all specified flags are set, false otherwise
   *
   * @example
   * ```typescript
   * import { AVFILTER_FLAG_DYNAMIC_INPUTS } from 'node-av/constants';
   *
   * if (filter.hasFlags(AVFILTER_FLAG_DYNAMIC_INPUTS)) {
   *   console.log('This filter supports dynamic inputs');
   * }
   * ```
   *
   * @see {@link flags} For direct flags access
   */
  hasFlags(...flags: number[]): boolean {
    for (const flag of flags) {
      if ((this.native.flags & flag) !== flag) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if filter is a source.
   *
   * Source filters generate frames without input
   * (e.g., 'testsrc', 'color', 'anullsrc').
   *
   * @returns True if filter has no inputs
   *
   * @example
   * ```typescript
   * const filter = Filter.getByName('testsrc');
   * if (filter?.isSource()) {
   *   console.log('This is a source filter');
   * }
   * ```
   *
   * @see {@link isSink} To check for sink filters
   */
  isSource(): boolean {
    return this.inputs.length === 0;
  }

  /**
   * Check if filter is a sink.
   *
   * Sink filters consume frames without output
   * (e.g., 'nullsink', 'buffersink').
   *
   * @returns True if filter has no outputs
   *
   * @example
   * ```typescript
   * const filter = Filter.getByName('nullsink');
   * if (filter?.isSink()) {
   *   console.log('This is a sink filter');
   * }
   * ```
   *
   * @see {@link isSource} To check for source filters
   */
  isSink(): boolean {
    return this.outputs.length === 0;
  }

  /**
   * Check if filter processes video.
   *
   * @returns True if filter has video inputs or outputs
   *
   * @example
   * ```typescript
   * const filters = Filter.getList();
   * const videoFilters = filters.filter(f => f.isVideo());
   * console.log(`Video filters: ${videoFilters.length}`);
   * ```
   *
   * @see {@link isAudio} To check for audio filters
   */
  isVideo(): boolean {
    return this.inputs.some((i) => i.type === AVMEDIA_TYPE_VIDEO) || this.outputs.some((o) => o.type === AVMEDIA_TYPE_VIDEO);
  }

  /**
   * Check if filter processes audio.
   *
   * @returns True if filter has audio inputs or outputs
   *
   * @example
   * ```typescript
   * const filters = Filter.getList();
   * const audioFilters = filters.filter(f => f.isAudio());
   * console.log(`Audio filters: ${audioFilters.length}`);
   * ```
   *
   * @see {@link isVideo} To check for video filters
   */
  isAudio(): boolean {
    return this.inputs.some((i) => i.type === AVMEDIA_TYPE_AUDIO) || this.outputs.some((o) => o.type === AVMEDIA_TYPE_AUDIO);
  }

  /**
   * Get the underlying native Filter object.
   *
   * @returns The native Filter binding object
   *
   * @internal
   */
  getNative(): NativeFilter {
    return this.native;
  }
}
