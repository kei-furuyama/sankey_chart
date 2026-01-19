/**
 * @sankey-chart/react
 *
 * High-performance Sankey Chart component for React/Next.js
 *
 * @example
 * ```tsx
 * import { SankeyChart } from '@sankey-chart/react';
 *
 * const data = {
 *   nodes: [
 *     { id: 'a', name: 'Source A' },
 *     { id: 'b', name: 'Target B' },
 *   ],
 *   links: [
 *     { source: 'a', target: 'b', value: 100 },
 *   ],
 * };
 *
 * function App() {
 *   return <SankeyChart data={data} width={800} height={600} />;
 * }
 * ```
 */

// Components
export { SankeyChart } from './components/SankeyChart';
export { SankeyNode } from './components/SankeyNode';
export { SankeyLink } from './components/SankeyLink';
export { SankeyTooltip, tooltipStyles } from './components/SankeyTooltip';

// Hooks
export { useSankeyLayout } from './hooks/useSankeyLayout';
export { useSankeyDrag } from './hooks/useSankeyDrag';
export { useSankeyTooltip } from './hooks/useSankeyTooltip';

// Utilities
export {
  sankeyLayout,
  createSankeyGenerator,
  generateLinkPath,
  calculateNodeValue,
  getNodesAtDepth,
  getMaxDepth,
  getConnectedNodes,
  getNodeCenterX,
  getNodeCenterY,
} from './utils/sankey-calculator';

export {
  generateColorScale,
  generateSequentialScale,
  interpolateColor,
  getContrastColor,
  lightenColor,
  darkenColor,
  generateGradientId,
  hexToRgba,
  defaultColorPalette,
} from './utils/color-utils';

// Types
export type {
  SankeyNode as SankeyNodeData,
  SankeyLink as SankeyLinkData,
  SankeyData,
  ComputedNode,
  ComputedLink,
  SankeyLayoutOptions,
  SankeyStyleOptions,
  SankeyEventHandlers,
  SankeyChartProps,
  TooltipData,
  ColorScale,
} from './types';

// Hook types
export type { UseSankeyLayoutOptions, UseSankeyLayoutResult } from './hooks/useSankeyLayout';
export type { UseSankeyDragOptions, UseSankeyDragResult, DragState } from './hooks/useSankeyDrag';
export type { UseSankeyTooltipOptions, UseSankeyTooltipResult } from './hooks/useSankeyTooltip';

// Component prop types
export type { SankeyNodeProps } from './components/SankeyNode';
export type { SankeyLinkProps } from './components/SankeyLink';
export type { SankeyTooltipProps } from './components/SankeyTooltip';
