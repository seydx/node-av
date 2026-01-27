/**
 * Regenerate BENCHMARK.md from existing results JSON
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateReport } from './utils/report.js';

import type { BenchmarkReport } from './utils/report.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resultsPath = resolve(__dirname, 'results/benchmark-results.json');
const outputPath = resolve(__dirname, '../BENCHMARK.md');

const report: BenchmarkReport = JSON.parse(readFileSync(resultsPath, 'utf-8'));
report.timestamp = new Date().toISOString();

const markdown = await generateReport(report);
writeFileSync(outputPath, markdown, 'utf-8');

console.log('✓ BENCHMARK.md regenerated');
