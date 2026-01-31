/**
 * Power BI Module Exports
 *
 * Data conversion utilities and React integration for Power BI visuals.
 * The actual Power BI custom visual entry point is powerbi/src/visual.ts.
 */

// DataView Transformer (standalone, no Power BI host required)
export { transformDataView, getSelectedNodeIds, getHighlightedRows } from './dataViewTransformer';
export type { DataView, DataViewCategorical, TransformOptions } from './dataViewTransformer';

// DataView Converter (uses Power BI host APIs for colors and selection)
export {
  convertDataView,
  aggregateLinks,
  applyHighlights,
  assignColorsByCategory,
  assignColorsByLayer,
  findLinkBySelectionId,
  findNodeBySelectionId,
  getConnectedLinks,
  collectSelectionIds,
} from './dataConverter';
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
