/**
 * Performance Benchmarking Utilities
 * Sankey Chart のパフォーマンス計測ツール
 *
 * 計測項目:
 * - レイアウト計算時間
 * - レンダリング時間
 * - FPS
 * - メモリ使用量
 * - キャッシュ効率
 */

import type { BenchmarkResult, PerformanceMetrics } from '../types';

// ============================================================
// Statistical Functions
// ============================================================

/**
 * 平均値
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 中央値
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 標準偏差
 */
function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * パーセンタイル
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// ============================================================
// Benchmark Runner
// ============================================================

export interface BenchmarkOptions {
  /** テスト名 */
  name: string;
  /** 実行回数 */
  iterations?: number;
  /** ウォームアップ回数 */
  warmupIterations?: number;
  /** 各実行間の待機時間 (ms) */
  cooldownMs?: number;
  /** GCを促すか */
  forceGC?: boolean;
}

/**
 * ベンチマーク実行
 */
export async function runBenchmark(
  fn: () => void | Promise<void>,
  options: BenchmarkOptions
): Promise<BenchmarkResult> {
  const {
    name,
    iterations = 100,
    warmupIterations = 10,
    cooldownMs = 0,
    forceGC = false,
  } = options;

  const times: number[] = [];

  // ウォームアップ
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // GC促進
  if (forceGC && typeof global !== 'undefined' && (global as any).gc) {
    (global as any).gc();
  }

  // 本計測
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);

    if (cooldownMs > 0) {
      await new Promise(resolve => setTimeout(resolve, cooldownMs));
    }
  }

  return {
    name,
    iterations,
    mean: mean(times),
    median: median(times),
    min: Math.min(...times),
    max: Math.max(...times),
    stdDev: stdDev(times),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
  };
}

// ============================================================
// FPS Monitor
// ============================================================

export class FPSMonitor {
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private animationId: number | null = null;
  private maxSamples: number;
  private onUpdate?: (fps: number) => void;

  constructor(maxSamples = 60, onUpdate?: (fps: number) => void) {
    this.maxSamples = maxSamples;
    this.onUpdate = onUpdate;
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.measure();
  }

  private measure(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameTimes.push(delta);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    const avgDelta = mean(this.frameTimes);
    const fps = avgDelta > 0 ? 1000 / avgDelta : 0;

    this.onUpdate?.(Math.round(fps));

    this.animationId = requestAnimationFrame(() => this.measure());
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getCurrentFPS(): number {
    const avgDelta = mean(this.frameTimes);
    return avgDelta > 0 ? Math.round(1000 / avgDelta) : 0;
  }

  reset(): void {
    this.frameTimes = [];
  }
}

// ============================================================
// Memory Monitor
// ============================================================

export class MemoryMonitor {
  private snapshots: number[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(intervalMs = 1000): void {
    this.snapshots = [];
    this.intervalId = setInterval(() => {
      const memory = this.getCurrentMemory();
      if (memory !== null) {
        this.snapshots.push(memory);
      }
    }, intervalMs);
  }

  stop(): { current: number | null; peak: number | null; average: number | null } {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.snapshots.length === 0) {
      return { current: null, peak: null, average: null };
    }

    return {
      current: this.getCurrentMemory(),
      peak: Math.max(...this.snapshots),
      average: mean(this.snapshots),
    };
  }

  private getCurrentMemory(): number | null {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return null;
  }
}

// ============================================================
// Comprehensive Performance Test
// ============================================================

export interface PerformanceTestConfig {
  /** データセットサイズ（ノード数のリスト） */
  dataSizes: number[];
  /** 各サイズでの実行回数 */
  iterations: number;
  /** テスト対象関数 */
  testFn: (nodeCount: number) => void | Promise<void>;
  /** 結果コールバック */
  onResult?: (size: number, result: BenchmarkResult) => void;
  /** 進捗コールバック */
  onProgress?: (progress: number, message: string) => void;
}

export interface PerformanceTestResult {
  results: Map<number, BenchmarkResult>;
  summary: {
    totalTime: number;
    averageTimePerNode: number;
    scalingFactor: number; // O(n) = 1, O(n^2) = 2, etc.
  };
}

/**
 * 包括的パフォーマンステスト
 */
export async function runPerformanceTest(
  config: PerformanceTestConfig
): Promise<PerformanceTestResult> {
  const { dataSizes, iterations, testFn, onResult, onProgress } = config;

  const results = new Map<number, BenchmarkResult>();
  const startTime = performance.now();
  let totalProgress = 0;
  const progressStep = 1 / dataSizes.length;

  for (const size of dataSizes) {
    onProgress?.(totalProgress, `Testing with ${size} nodes...`);

    const result = await runBenchmark(
      () => testFn(size),
      {
        name: `size-${size}`,
        iterations,
        warmupIterations: Math.min(5, iterations / 10),
      }
    );

    results.set(size, result);
    onResult?.(size, result);

    totalProgress += progressStep;
  }

  const totalTime = performance.now() - startTime;

  // スケーリング係数の推定
  const sizes = Array.from(results.keys()).sort((a, b) => a - b);
  const times = sizes.map(s => results.get(s)!.mean);

  let scalingFactor = 1;
  if (sizes.length >= 2) {
    const ratios: number[] = [];
    for (let i = 1; i < sizes.length; i++) {
      const sizeRatio = sizes[i] / sizes[i - 1];
      const timeRatio = times[i] / times[i - 1];
      if (timeRatio > 0 && sizeRatio > 0) {
        ratios.push(Math.log(timeRatio) / Math.log(sizeRatio));
      }
    }
    scalingFactor = mean(ratios);
  }

  const averageTimePerNode = mean(
    sizes.map((s, i) => times[i] / s)
  );

  onProgress?.(1, 'Test complete');

  return {
    results,
    summary: {
      totalTime,
      averageTimePerNode,
      scalingFactor,
    },
  };
}

// ============================================================
// Performance Report Generator
// ============================================================

export function generatePerformanceReport(
  testResult: PerformanceTestResult,
  metrics?: PerformanceMetrics
): string {
  const lines: string[] = [
    '='.repeat(60),
    'SANKEY CHART PERFORMANCE REPORT',
    '='.repeat(60),
    '',
  ];

  // サマリー
  lines.push('SUMMARY');
  lines.push('-'.repeat(40));
  lines.push(`Total Test Time: ${testResult.summary.totalTime.toFixed(2)}ms`);
  lines.push(`Average Time Per Node: ${(testResult.summary.averageTimePerNode * 1000).toFixed(4)}us`);
  lines.push(`Scaling Factor: O(n^${testResult.summary.scalingFactor.toFixed(2)})`);
  lines.push('');

  // 詳細結果
  lines.push('DETAILED RESULTS');
  lines.push('-'.repeat(40));
  lines.push('Nodes\t| Mean\t\t| Median\t| P95\t\t| P99');
  lines.push('-'.repeat(60));

  const sortedSizes = Array.from(testResult.results.keys()).sort((a, b) => a - b);
  for (const size of sortedSizes) {
    const result = testResult.results.get(size)!;
    lines.push(
      `${size}\t| ${result.mean.toFixed(2)}ms\t| ${result.median.toFixed(2)}ms\t| ${result.p95.toFixed(2)}ms\t| ${result.p99.toFixed(2)}ms`
    );
  }
  lines.push('');

  // 現在のメトリクス（あれば）
  if (metrics) {
    lines.push('CURRENT METRICS');
    lines.push('-'.repeat(40));
    lines.push(`Layout Time: ${metrics.layoutTime.toFixed(2)}ms`);
    lines.push(`Render Time: ${metrics.renderTime.toFixed(2)}ms`);
    lines.push(`Total Time: ${metrics.totalTime.toFixed(2)}ms`);
    lines.push(`FPS: ${metrics.fps}`);
    lines.push(`Cache Hits: ${metrics.cacheHits}`);
    lines.push(`Cache Misses: ${metrics.cacheMisses}`);
    lines.push(`Cache Hit Rate: ${((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses || 1)) * 100).toFixed(1)}%`);
    lines.push(`Renderer: ${metrics.rendererUsed}`);
    lines.push(`Virtualization: ${metrics.virtualizationActive ? 'Active' : 'Inactive'}`);
    lines.push(`Web Worker: ${metrics.webWorkerUsed ? 'Used' : 'Not Used'}`);
    if (metrics.memoryUsage) {
      lines.push(`Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }
    lines.push('');
  }

  // 推奨事項
  lines.push('RECOMMENDATIONS');
  lines.push('-'.repeat(40));

  const largestSize = Math.max(...sortedSizes);
  const largestResult = testResult.results.get(largestSize);

  if (largestResult && largestResult.mean > 100) {
    lines.push('- Consider enabling Web Worker for layout computation');
  }
  if (largestResult && largestResult.mean > 50) {
    lines.push('- Consider using Canvas renderer for better performance');
  }
  if (testResult.summary.scalingFactor > 1.5) {
    lines.push('- Performance scaling is superlinear; consider data sampling for very large datasets');
  }
  if (metrics && metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) < 0.5) {
    lines.push('- Low cache hit rate; review data update patterns');
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

// ============================================================
// Quick Benchmarks
// ============================================================

/**
 * クイックベンチマーク - 即座に結果を返す
 */
export function quickBenchmark(fn: () => void, iterations = 10): number {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  return mean(times);
}

/**
 * 時間計測デコレーター
 */
export function measureTime<T extends (...args: any[]) => any>(
  fn: T,
  label?: string
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    const result = fn(...args);
    const elapsed = performance.now() - start;
    console.log(`${label ?? fn.name}: ${elapsed.toFixed(2)}ms`);
    return result;
  }) as T;
}
