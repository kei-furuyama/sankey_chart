/**
 * Core types for Sankey Chart library
 */

/**
 * Represents a node in the Sankey diagram
 */
export interface SankeyNode {
  /** Unique identifier for the node */
  id: string;
  /** Display name for the node */
  name: string;
  /** Optional color for the node */
  color?: string;
  /** Optional category for grouping */
  category?: string;
  /** Custom data attached to the node */
  data?: Record<string, unknown>;
}

/**
 * Represents a link between two nodes
 */
export interface SankeyLink {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Flow value/weight */
  value: number;
  /** Optional color for the link */
  color?: string;
  /** Custom data attached to the link */
  data?: Record<string, unknown>;
}

/**
 * Input data structure for the Sankey chart
 */
export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

/**
 * Computed node with layout information
 */
export interface ComputedNode extends SankeyNode {
  /** X position (left edge) */
  x0: number;
  /** X position (right edge) */
  x1: number;
  /** Y position (top edge) */
  y0: number;
  /** Y position (bottom edge) */
  y1: number;
  /** Computed value (sum of incoming/outgoing links) */
  value: number;
  /** Index in the layout */
  index: number;
  /** Depth/layer in the diagram */
  depth: number;
  /** Height in layers */
  height: number;
  /** Source links connected to this node */
  sourceLinks: ComputedLink[];
  /** Target links connected to this node */
  targetLinks: ComputedLink[];
}

/**
 * Computed link with layout information
 */
export interface ComputedLink extends Omit<SankeyLink, 'source' | 'target'> {
  /** Source node (resolved) */
  source: ComputedNode;
  /** Target node (resolved) */
  target: ComputedNode;
  /** Width of the link */
  width: number;
  /** Y position at source */
  y0: number;
  /** Y position at target */
  y1: number;
  /** Index in the layout */
  index: number;
}

/**
 * Layout configuration options
 */
// Import and re-export LinkSortMode from core types for consistency
import type { LinkSortMode } from '../../types';
export type { LinkSortMode };

export interface SankeyLayoutOptions {
  /** Width of the diagram */
  width: number;
  /** Height of the diagram */
  height: number;
  /** Padding between nodes vertically */
  nodePadding?: number;
  /** Width of node rectangles */
  nodeWidth?: number;
  /** Node alignment strategy */
  nodeAlign?: 'left' | 'right' | 'center' | 'justify';
  /** Number of relaxation iterations */
  iterations?: number;
  /** Link sort mode for controlling link order at nodes (default: 'ascending') */
  linkSort?: LinkSortMode;
  /** Margin around the diagram */
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Style configuration for the Sankey chart
 */
export interface SankeyStyleOptions {
  /** Node styles */
  node?: {
    /** Fill color or color function */
    fill?: string | ((node: ComputedNode) => string);
    /** Stroke color */
    stroke?: string;
    /** Stroke width */
    strokeWidth?: number;
    /** Border radius */
    borderRadius?: number;
    /** Opacity */
    opacity?: number;
    /** Hover opacity */
    hoverOpacity?: number;
  };
  /** Link styles */
  link?: {
    /** Fill color or color function */
    fill?: string | ((link: ComputedLink) => string);
    /** Stroke color */
    stroke?: string;
    /** Opacity */
    opacity?: number;
    /** Hover opacity */
    hoverOpacity?: number;
    /** Gradient mode */
    gradient?: boolean;
    /** Show value label on link */
    showLabel?: boolean;
    /** Label font size */
    labelFontSize?: number;
    /** Label text color */
    labelColor?: string;
    /** Label background color (for readability) */
    labelBackground?: string;
    /** Minimum link width to show label (default: 8) */
    minLabelWidth?: number;
    /** Horizontal padding for label background (default: 4) */
    labelPadding?: number;
    /** Custom value formatter for link labels */
    valueFormatter?: (value: number) => string;
  };
  /** Label styles */
  label?: {
    /** Font size */
    fontSize?: number;
    /** Font family */
    fontFamily?: string;
    /** Font weight */
    fontWeight?: string | number;
    /** Text color */
    fill?: string;
    /** Label position: left, right, outside (auto left/right), inside, or none */
    position?: 'left' | 'right' | 'outside' | 'inside' | 'none';
    /** Padding from node */
    padding?: number;
    /** Whether to show value in label */
    showValue?: boolean;
    /** Value formatter function */
    valueFormatter?: (value: number) => string;
  };
}

/**
 * Event handlers for the Sankey chart
 */
export interface SankeyEventHandlers {
  /** Called when a node is clicked */
  onNodeClick?: (node: ComputedNode, event: React.MouseEvent) => void;
  /** Called when mouse enters a node */
  onNodeMouseEnter?: (node: ComputedNode, event: React.MouseEvent) => void;
  /** Called when mouse leaves a node */
  onNodeMouseLeave?: (node: ComputedNode, event: React.MouseEvent) => void;
  /** Called when a link is clicked */
  onLinkClick?: (link: ComputedLink, event: React.MouseEvent) => void;
  /** Called when mouse enters a link */
  onLinkMouseEnter?: (link: ComputedLink, event: React.MouseEvent) => void;
  /** Called when mouse leaves a link */
  onLinkMouseLeave?: (link: ComputedLink, event: React.MouseEvent) => void;
}

/**
 * Props for the main SankeyChart component
 */
export interface SankeyChartProps {
  /** Input data */
  data: SankeyData;
  /** Width of the chart */
  width: number;
  /** Height of the chart */
  height: number;
  /** Layout options */
  layout?: Partial<SankeyLayoutOptions>;
  /** Style options */
  style?: SankeyStyleOptions;
  /** Event handlers */
  events?: SankeyEventHandlers;
  /** Whether to show node labels */
  showLabels?: boolean;
  /** Whether to show value labels on links */
  showLinkLabels?: boolean;
  /** Whether to show tooltips */
  showTooltips?: boolean;
  /** Custom tooltip renderer */
  renderTooltip?: (data: ComputedNode | ComputedLink) => React.ReactNode;
  /** Animation duration in ms */
  animationDuration?: number;
  /** CSS class name */
  className?: string;
  /** Accessibility label */
  ariaLabel?: string;
}

/**
 * Tooltip data structure
 */
export interface TooltipData {
  type: 'node' | 'link';
  data: ComputedNode | ComputedLink;
  x: number;
  y: number;
}

/**
 * Color scale type
 */
export type ColorScale = (value: string | number) => string;
