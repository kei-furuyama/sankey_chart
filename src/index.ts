/**
 * Sankey Chart ライブラリ
 *
 * Power BI互換のSankey Chart実装
 *
 * @example
 * ```typescript
 * // バニラJS/TypeScript
 * import { createSankeyChart } from 'sankey-chart-powerbi';
 *
 * const chart = createSankeyChart('#container', {
 *   responsive: true,
 *   config: {
 *     style: { linkColorMode: 'gradient' },
 *   },
 * });
 *
 * chart.render({
 *   nodes: [
 *     { id: 'a', name: 'Node A' },
 *     { id: 'b', name: 'Node B' },
 *   ],
 *   links: [
 *     { source: 'a', target: 'b', value: 100 },
 *   ],
 * });
 * ```
 *
 * @example
 * ```tsx
 * // React
 * import { SankeyChartReact } from 'sankey-chart-powerbi/web';
 *
 * function App() {
 *   return (
 *     <SankeyChartReact
 *       data={{ nodes: [...], links: [...] }}
 *       responsive
 *     />
 *   );
 * }
 * ```
 */

// 型定義
export * from './types';

// Core
export {
  SankeyLayout,
  createSankeyLayout,
  SankeyRenderer,
  createSankeyRenderer,
  SankeyChart,
  createSankeyChart,
  Tooltip,
  createTooltip,
} from './core';
export type { SankeyChartOptions, TooltipConfig, TooltipFormatter } from './core';

// Utils
export {
  ResizeManager,
  createResizeManager,
  debounce,
  throttle,
  fitWithAspectRatio,
} from './utils';
export type { ResizeHandler, ResponsiveOptions } from './utils';

// Performance Optimized Components
export { SankeyLayoutEngine, getDefaultLayoutEngine } from './core/SankeyLayoutEngine';
export { CanvasRenderer } from './renderers/CanvasRenderer';
export { SVGRenderer } from './renderers/SVGRenderer';
export { SankeyChart as OptimizedSankeyChart, SankeyNode, SankeyLink } from './components/SankeyChart';
export type { SankeyChartProps, SankeyChartRef } from './components/SankeyChart';

// Hooks
export {
  useSankeyLayout,
  useResizeObserver,
  useRendererSelection,
  usePerformanceMetrics,
  useEventHandlers,
  useDebounce,
  useThrottle,
} from './hooks/useSankeyChart';

// Web Worker
export { useLayoutWorker, LayoutWorkerManager } from './workers/useLayoutWorker';

// Benchmarking
export {
  runBenchmark,
  runPerformanceTest,
  generatePerformanceReport,
  FPSMonitor,
  MemoryMonitor,
  quickBenchmark,
  measureTime,
} from './utils/benchmark';
export type { BenchmarkOptions, PerformanceTestConfig, PerformanceTestResult } from './utils/benchmark';

// Test Data Generation
export {
  generateLayeredSankeyData,
  generateRandomSankeyData,
  generateBusinessFlowData,
  generateBenchmarkDataset,
  BENCHMARK_DATASETS,
} from './utils/dataGenerator';
export type { DataGeneratorOptions } from './utils/dataGenerator';
