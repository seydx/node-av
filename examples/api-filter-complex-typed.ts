/**
 * High-Level API Example: Typed filter_complex graph builder
 *
 * Demonstrates the type-safe `FilterComplexGraph` builder - composing a
 * multi-input/output filter_complex graph with autocomplete and enum validation
 * for every filter and its options, instead of hand-writing the graph string.
 *
 * The builder renders to the same description string `FilterComplexAPI.create()`
 * accepts, and can also be passed to it directly.
 *
 * Usage: tsx examples/api-filter-complex-typed.ts
 */

import { FilterComplexGraph } from '../src/index.js';

// Picture-in-picture: scale the second input, overlay it on the first,
// then tweak the hue of the result.
const graph = FilterComplexGraph.create()
  .chain({ inputs: '1:v', outputs: 'pip' }, (c) => c.filter('scale', { width: 320, height: 240 }))
  .chain({ inputs: ['0:v', 'pip'], outputs: 'mixed' }, (c) => c.filter('overlay', { x: 16, y: 16 }))
  .chain({ inputs: 'mixed', outputs: 'out' }, (c) => c.filter('hue', { s: 0 }));

console.log('Generated filter_complex description:');
console.log(graph.build());
// [1:v]scale=width=320:height=240[pip];[0:v][pip]overlay=x=16:y=16[mixed];[mixed]hue=s=0[out]

// The graph can be passed straight into FilterComplexAPI.create():
//
//   using complex = FilterComplexAPI.create(graph, {
//     inputs: [{ label: '0:v' }, { label: '1:v' }],
//     outputs: [{ label: 'out' }],
//   });
