/**
 * Power BI Module Exports
 *
 * Power BI互換のデータ変換ユーティリティをエクスポート。
 *
 * 注意: 実際のPower BIカスタムビジュアルは powerbi/src/visual.ts を使用します。
 * このモジュールはデータ変換やWeb統合用のヘルパーです。
 */

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

// React Component for Power BI-style integration
export { PowerBISankeyChart, ReactMountManager } from './component';
export type { PowerBISankeyChartProps } from './component';
