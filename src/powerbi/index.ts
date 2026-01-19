/**
 * Power BI Module Exports
 *
 * Power BI Custom Visual開発で使用するコンポーネントをエクスポート。
 * pbivizプロジェクトではこのモジュールをインポートします。
 */

// Visual Implementation
export { SankeyVisual, create } from './visual';
export type {
  IVisual,
  VisualConstructorOptions,
  VisualUpdateOptions,
  IVisualHost,
  IViewport,
  VisualUpdateType,
  FormattingModel,
} from './visual';

// DataView Transformer
export { transformDataView, getSelectedNodeIds, getHighlightedRows } from './dataViewTransformer';
export type { DataView, DataViewCategorical, TransformOptions } from './dataViewTransformer';

// DataView Converter (alternative API)
export { convertDataView, aggregateLinks, applyHighlights } from './dataConverter';
export type { DataViewConverterOptions } from './dataConverter';

// Settings
export {
  VisualSettings,
  NodeSettings,
  LinkSettings,
  LabelSettings,
  AnimationSettings,
  parseSettings,
} from './settings';

// React Component
export { PowerBISankeyChart, ReactMountManager } from './component';
export type { PowerBISankeyChartProps } from './component';

// Re-export core for convenience
export * from '../core';
