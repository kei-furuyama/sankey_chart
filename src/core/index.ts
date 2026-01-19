/**
 * Core Module Exports
 *
 * このモジュールはプラットフォーム非依存のコア機能を提供します。
 * Web版、Power BI版の両方からインポートして使用します。
 */

// Layout Engine
export { SankeyLayout, createSankeyLayout } from './SankeyLayout';

// SVG Renderer
export { SankeyRenderer, createSankeyRenderer } from './SankeyRenderer';

// Main Chart Class
export { SankeyChart, createSankeyChart } from './SankeyChart';
export type { SankeyChartOptions } from './SankeyChart';

// Tooltip
export { Tooltip, createTooltip } from './Tooltip';
export type { TooltipConfig, TooltipFormatter } from './Tooltip';

// Re-export types for convenience
export type {
  SankeyData,
  SankeyNodeDatum,
  SankeyLinkDatum,
  SankeyChartConfig,
  SankeyEventHandlers,
  ComputedNode,
  ComputedLink,
  ComputedGraph,
  NodeAlignment,
  SankeyLayoutConfig,
  SankeyStyleConfig,
  SankeyInteractionConfig,
  SankeyAnimationConfig,
  PowerBIConfig,
} from '../types';

export { DEFAULT_CONFIG } from '../types';
