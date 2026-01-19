/**
 * Web Module Exports
 *
 * React/Next.js環境で使用するコンポーネントとフックをエクスポート。
 */

// React Components
export {
  SankeyChartReact,
  useSankeyData,
  useSankeyConfig,
} from './SankeyChartReact';
export type { SankeyChartReactProps, SankeyChartReactRef } from './SankeyChartReact';
export { default as SankeyChartComponent } from './SankeyChartReact';

// Re-export core for convenience
export * from '../core';
