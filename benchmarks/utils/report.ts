/* eslint-disable @stylistic/max-len */
/**
 * Markdown Report Generator
 *
 * Generates a formatted BENCHMARK.md report from benchmark results.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { arch, cpus, platform, release, totalmem } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getFFmpegVersion, probeMediaFile } from './ffmpeg-cli.js';
import { formatBytes, formatPercentDiff } from './measure.js';

import type { LatencyMetrics } from '../cases/latency.js';
import type { BenchmarkComparison } from '../runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');

/**
 * System information for the report
 */
export interface SystemInfo {
  os: string;
  osVersion: string;
  arch: string;
  cpu: string;
  cpuCores: number;
  ram: string;
  gpu?: string;
  ffmpegVersion: string;
  nodeAVVersion: string;
  nodeVersion: string;
}

/**
 * Input file information
 */
export interface InputFileInfo {
  path: string;
  duration: number;
  resolution?: string;
  codec?: string;
  fps?: number;
}

/**
 * Complete benchmark report data
 */
export interface BenchmarkReport {
  systemInfo: SystemInfo;
  /** @deprecated Use inputFileInfos instead */
  inputFileInfo?: InputFileInfo;
  inputFileInfos?: InputFileInfo[];
  transcodeResults: BenchmarkComparison[];
  memoryResults: BenchmarkComparison[];
  latencyMetrics?: LatencyMetrics;
  timestamp: string;
}

/**
 * Gather system information
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const cpuInfo = cpus();
  const cpu = cpuInfo[0]?.model ?? 'Unknown';

  // Try to detect GPU
  let gpu: string | undefined;
  try {
    if (platform() === 'darwin') {
      gpu = execSync('system_profiler SPDisplaysDataType 2>/dev/null | grep "Chipset Model" | head -1 | cut -d: -f2', {
        encoding: 'utf-8',
      }).trim();
    } else if (platform() === 'linux') {
      gpu = execSync("lspci 2>/dev/null | grep -i 'vga\\|3d\\|display' | head -1 | cut -d: -f3", { encoding: 'utf-8' }).trim();
    } else if (platform() === 'win32') {
      gpu = execSync('wmic path win32_VideoController get name 2>nul | findstr /v "Name"', { encoding: 'utf-8' }).trim();
    }
  } catch {
    // GPU detection failed, continue without it
  }

  // Get FFmpeg version
  let ffmpegVersion = 'Unknown';
  try {
    ffmpegVersion = await getFFmpegVersion();
  } catch {
    // Continue without version
  }

  // Get node-av version from package.json
  let nodeAVVersion = 'Unknown';
  try {
    const pkgPath = resolve(rootDir, 'package.json');
    const pkgContent = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);
    nodeAVVersion = pkg.version;
  } catch {
    // Continue without version
  }

  return {
    os: platform(),
    osVersion: release(),
    arch: arch(),
    cpu,
    cpuCores: cpuInfo.length,
    ram: formatBytes(totalmem()),
    gpu: gpu ?? undefined,
    ffmpegVersion,
    nodeAVVersion,
    nodeVersion: process.version,
  };
}

/**
 * Format system info section for markdown
 */
function formatSystemInfoSection(info: SystemInfo): string {
  let section = `## System Information

| Property | Value |
|----------|-------|
| **OS** | ${info.os} ${info.osVersion} |
| **Architecture** | ${info.arch} |
| **CPU** | ${info.cpu} |
| **CPU Cores** | ${info.cpuCores} |
| **RAM** | ${info.ram} |`;

  if (info.gpu) {
    section += `\n| **GPU** | ${info.gpu} |`;
  }

  section += `
| **Node.js** | ${info.nodeVersion} |
| **FFmpeg** | ${info.ffmpegVersion} |
| **node-av** | ${info.nodeAVVersion} |
`;

  return section;
}

/**
 * Format input file info section (single file - legacy)
 */
function formatInputFileSection(info: InputFileInfo | undefined): string {
  if (!info) return '';

  return `## Test Input

| Property | Value |
|----------|-------|
| **File** | \`${info.path}\` |
| **Duration** | ${info.duration.toFixed(1)}s |
| **Resolution** | ${info.resolution ?? 'N/A'} |
| **Codec** | ${info.codec ?? 'N/A'} |
| **FPS** | ${info.fps?.toFixed(1) ?? 'N/A'} |
`;
}

/**
 * Format input files info section (multiple files)
 */
function formatInputFilesSection(infos: InputFileInfo[] | undefined): string {
  if (!infos || infos.length === 0) return '';

  let section = `## Test Inputs

| File | Codec | Resolution | FPS | Duration |
|------|-------|------------|-----|----------|
`;

  for (const info of infos) {
    const filename = basename(info.path);
    section += `| ${filename} | ${info.codec ?? 'N/A'} | ${info.resolution ?? 'N/A'} | ${info.fps?.toFixed(0) ?? 'N/A'} | ${info.duration.toFixed(1)}s |\n`;
  }

  return section;
}

/**
 * Format transcode results table
 */
function formatTranscodeSection(results: BenchmarkComparison[]): string {
  if (results.length === 0) return '';

  // Group results by input file
  const grouped = new Map<string, BenchmarkComparison[]>();
  for (const result of results) {
    const inputFile = basename(result.config.inputFile);
    if (!grouped.has(inputFile)) {
      grouped.set(inputFile, []);
    }
    grouped.get(inputFile)!.push(result);
  }

  let section = '## Transcode Speed\n';

  // If only one input file, don't show grouping
  if (grouped.size === 1) {
    const results = [...grouped.values()][0];
    section += formatTranscodeTable(results);
  } else {
    // Multiple input files - show grouped
    for (const [inputFile, groupResults] of grouped) {
      section += '\n### Input: ' + inputFile + '\n';
      section += formatTranscodeTable(groupResults);
    }
  }

  return section;
}

/**
 * Format a single transcode results table
 */
function formatTranscodeTable(results: BenchmarkComparison[]): string {
  let section = `
| Test | FFmpeg CLI (FPS) | node-av (FPS) | FFmpeg CLI (Time) | node-av (Time) | Diff |
|------|------------------|---------------|-------------------|----------------|------|
`;

  for (const result of results) {
    const ffmpegFps = result.ffmpegCLI.fps?.mean.toFixed(1) ?? 'N/A';
    const nodeAVFps = result.nodeAV.fps?.mean.toFixed(1) ?? 'N/A';
    const ffmpegDuration = formatDuration(result.ffmpegCLI.durationMs.mean);
    const nodeAVDuration = formatDuration(result.nodeAV.durationMs.mean);
    const diff = result.comparison.fpsDiffPercent;
    const diffStr = diff !== undefined ? formatPercentDiff(diff) : 'N/A';

    section += `| ${result.config.name} | ${ffmpegFps} fps | ${nodeAVFps} fps | ${ffmpegDuration} | ${nodeAVDuration} | ${diffStr} |\n`;
  }

  return section;
}

/**
 * Format memory results table
 */
function formatMemorySection(results: BenchmarkComparison[]): string {
  if (results.length === 0) return '';

  // Group results by input file
  const grouped = new Map<string, BenchmarkComparison[]>();
  for (const result of results) {
    const inputFile = basename(result.config.inputFile);
    if (!grouped.has(inputFile)) {
      grouped.set(inputFile, []);
    }
    grouped.get(inputFile)!.push(result);
  }

  let section = '## Memory Usage\n';

  // If only one input file, don't show grouping
  if (grouped.size === 1) {
    const results = [...grouped.values()][0];
    section += formatMemoryTable(results);
  } else {
    // Multiple input files - show grouped
    for (const [inputFile, groupResults] of grouped) {
      section += '\n### Input: ' + inputFile + '\n';
      section += formatMemoryTable(groupResults);
    }
  }

  section += `
*Note: FFmpeg CLI memory is measured via \`/usr/bin/time\` (macOS: \`-l\`, Linux: \`-v\`).
`;

  return section;
}

/**
 * Format a single memory results table
 */
function formatMemoryTable(results: BenchmarkComparison[]): string {
  let section = `
| Test | FFmpeg CLI Peak | node-av Peak | Difference |
|------|----------------|--------------|------------|
`;

  for (const result of results) {
    // Note: FFmpeg CLI memory is estimated and may not be accurate
    const ffmpegMem = result.ffmpegCLI.peakMemoryBytes.mean > 0 ? formatBytes(result.ffmpegCLI.peakMemoryBytes.mean) : 'N/A*';
    const nodeAVMem = formatBytes(result.nodeAV.peakMemoryBytes.mean);
    const diffStr = result.ffmpegCLI.peakMemoryBytes.mean > 0 ? formatPercentDiff(result.comparison.memoryDiffPercent) : 'N/A';

    section += `| ${result.config.name} | ${ffmpegMem} | ${nodeAVMem} | ${diffStr} |\n`;
  }

  return section;
}

/**
 * Format latency section
 */
function formatLatencySection(metrics: LatencyMetrics | undefined): string {
  if (!metrics) return '';

  return `## Latency

| Metric | Mean | Min | Max | StdDev |
|--------|------|-----|-----|--------|
| Demuxer Open | ${formatMs(metrics.demuxerOpen.stats.mean)} | ${formatMs(metrics.demuxerOpen.stats.min)} | ${formatMs(metrics.demuxerOpen.stats.max)} | ${formatMs(metrics.demuxerOpen.stats.stdDev)} |
| First Packet | ${formatMs(metrics.firstPacket.stats.mean)} | ${formatMs(metrics.firstPacket.stats.min)} | ${formatMs(metrics.firstPacket.stats.max)} | ${formatMs(metrics.firstPacket.stats.stdDev)} |
| First Frame | ${formatMs(metrics.firstFrame.stats.mean)} | ${formatMs(metrics.firstFrame.stats.min)} | ${formatMs(metrics.firstFrame.stats.max)} | ${formatMs(metrics.firstFrame.stats.stdDev)} |
| First Encoded Packet | ${formatMs(metrics.firstEncodedPacket.stats.mean)} | ${formatMs(metrics.firstEncodedPacket.stats.min)} | ${formatMs(metrics.firstEncodedPacket.stats.max)} | ${formatMs(metrics.firstEncodedPacket.stats.stdDev)} |
| Pipeline Total | ${formatMs(metrics.pipelineTotal.stats.mean)} | ${formatMs(metrics.pipelineTotal.stats.min)} | ${formatMs(metrics.pipelineTotal.stats.max)} | ${formatMs(metrics.pipelineTotal.stats.stdDev)} |

*Note: Each metric is measured independently. "First Encoded Packet" uses default encoder settings while "Pipeline Total" uses \`tune=zerolatency\` for low-latency output.*
`;
}

/**
 * Format milliseconds
 */
function formatMs(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  return `${ms.toFixed(1)}ms`;
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Generate the complete BENCHMARK.md report
 */
export async function generateReport(report: BenchmarkReport): Promise<string> {
  const systemSection = formatSystemInfoSection(report.systemInfo);
  // Support both single file (legacy) and multiple files
  const inputSection = report.inputFileInfos && report.inputFileInfos.length > 0
    ? formatInputFilesSection(report.inputFileInfos)
    : formatInputFileSection(report.inputFileInfo);
  const transcodeSection = formatTranscodeSection(report.transcodeResults);
  const memorySection = formatMemorySection(report.memoryResults);
  const latencySection = formatLatencySection(report.latencyMetrics);

  const markdown = `# node-av Benchmark Results

> Generated: ${report.timestamp}

${systemSection}

${inputSection}

${transcodeSection}

${memorySection}

${latencySection}
`;

  return markdown;
}

/**
 * Write the benchmark report to BENCHMARK.md
 */
export async function writeReport(report: BenchmarkReport): Promise<void> {
  const markdown = await generateReport(report);
  const outputPath = resolve(rootDir, 'BENCHMARK.md');
  writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`\n📄 Report written to: ${outputPath}`);
}

/**
 * Save raw results to JSON for later analysis
 */
export function saveResultsJSON(report: BenchmarkReport): void {
  const outputPath = resolve(__dirname, '../results/benchmark-results.json');
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📊 Raw results saved to: ${outputPath}`);
}

/**
 * Create input file info from probing
 */
export async function createInputFileInfo(filePath: string): Promise<InputFileInfo> {
  try {
    const info = await probeMediaFile(filePath);
    return {
      path: filePath,
      duration: info.duration,
      resolution: info.width && info.height ? `${info.width}x${info.height}` : undefined,
      codec: info.videoCodec,
      fps: info.fps,
    };
  } catch {
    return { path: filePath, duration: 0 };
  }
}
