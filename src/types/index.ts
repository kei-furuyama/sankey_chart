/**
 * Sankey Chart 型定義
 * Power BI互換 + Web汎用
 *
 * This barrel file re-exports all types from focused module files.
 */

// Input data types
export type {
  SankeyInputData,
  DatasetMetadata,
  InputNode,
  InputLink,
  TableRow,
  HierarchicalNode,
  TransformOptions,
} from './input.js';
export { DEFAULT_TRANSFORM_OPTIONS } from './input.js';

// Internal data structures
export type {
  SankeyNodeDatum,
  SankeyLinkDatum,
  FilterCriteria,
  AggregationConfig,
  SankeyData,
  ComputedNode,
  ComputedLink,
  ComputedGraph,
  SankeyNodeWithMeta,
  SankeyLinkWithMeta,
  SankeyInputDataGeneric,
  ComputedGraphGeneric,
} from './internal.js';

// Configuration types and defaults
export type {
  NodeAlignment,
  LinkSortMode,
  SankeyLayoutConfig,
  SankeyInteractionConfig,
  SankeyAnimationConfig,
  SankeyStyleConfig,
  PowerBIConfig,
  RendererType,
  SankeyPerformanceConfig,
  PerformanceMetrics,
  BenchmarkResult,
  LayoutCacheKey,
  LayoutCacheEntry,
  SankeyChartConfig,
  ExportOptions,
} from './config.js';
export { DEFAULT_PERFORMANCE_CONFIG, DEFAULT_CONFIG } from './config.js';

// Event types
export type {
  SankeyBaseEvent,
  SankeyNodeEvent,
  SankeyLinkEvent,
  SankeyBackgroundEvent,
  SankeySelectionEvent,
  SankeyDragEvent,
  SankeyElementEvent,
  SankeyEventHandlers,
  LegacyEventHandlers,
  TooltipRenderer,
  NodeRenderer,
  LinkRenderer,
  LabelRenderer,
  SankeyChartProps,
  SankeyChartRef,
} from './events.js';

// Validation types
export type {
  ValidationSeverity,
  ValidationErrorCode,
  ValidationIssue,
  ValidationResult,
} from './validation.js';

// Power BI types
export type {
  PowerBIColumnMapping,
  PowerBIDataViewSimple,
  PowerBISelectionId,
  PowerBISelectionIdBuilder,
  PowerBIVisualHost,
  PowerBISelectionManager,
  PowerBITooltipService,
  PowerBITooltipShowOptions,
  PowerBITooltipMoveOptions,
  PowerBITooltipHideOptions,
  PowerBISankeyNode,
  PowerBISankeyLink,
  PowerBIDataViewConverter,
  PowerBIVisualSettings,
} from './powerbi.js';

// Utility types and type guards
export type {
  DeepPartial,
  DeepRequired,
  DeepReadonly,
  MergedConfig,
  SankeyConfigBuilder,
} from './utilities.js';
export {
  isNodeEvent,
  isLinkEvent,
  isBackgroundEvent,
  isDragEvent,
  isValidInputLink,
  isValidInputData,
  isComputedNode,
  resolveNodeFromLink,
  tryResolveNodeFromLink,
} from './utilities.js';
