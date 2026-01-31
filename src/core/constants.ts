/**
 * Core constants for Sankey Chart rendering
 *
 * Extracted magic numbers, default values, and style constants
 * used across SankeyRenderer, SankeyEngine, and Tooltip.
 */

// Node Rendering

export const NODE_BORDER_RADIUS = 2;
export const MIN_STROKE_WIDTH = 1;

// Label Positioning

export const LABEL_OFFSET_X = 6;
export const LABEL_VERTICAL_ALIGN = '0.35em';

// Tooltip Defaults

export const TOOLTIP_OFFSET_X = 12;
export const TOOLTIP_OFFSET_Y = 12;
export const TOOLTIP_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.85)';
export const TOOLTIP_TEXT_COLOR = '#fff';
export const TOOLTIP_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)';
export const TOOLTIP_FONT_SIZE = 13;
export const TOOLTIP_PADDING = 10;
export const TOOLTIP_BORDER_RADIUS = 4;
export const TOOLTIP_MAX_WIDTH = 300;
export const TOOLTIP_FADE_DURATION = 150;
export const TOOLTIP_BOX_SHADOW = '0 2px 8px rgba(0, 0, 0, 0.3)';
export const TOOLTIP_FONT_FAMILY = "'Segoe UI', system-ui, sans-serif";
export const TOOLTIP_LINE_HEIGHT = '1.4';
export const TOOLTIP_Z_INDEX = 1000;
export const TOOLTIP_HIDE_DELAY = 50;

// Tooltip Formatter Styles

export const TOOLTIP_HEADER_BORDER = '1px solid rgba(255, 255, 255, 0.2)';
export const TOOLTIP_MUTED_OPACITY = 0.8;
export const TOOLTIP_ARROW_OPACITY = 0.6;
export const TOOLTIP_ROW_GAP = '16px';

// Number Formatting Thresholds

export const NUMBER_FORMAT_MILLION = 1_000_000;
export const NUMBER_FORMAT_THOUSAND = 1_000;

// Default Chart Configuration Values

export const DEFAULT_WIDTH = 800;
export const DEFAULT_HEIGHT = 600;

export const DEFAULT_MARGIN = {
  top: 20,
  right: 120,
  bottom: 20,
  left: 120,
} as const;

// Default Layout Values

export const DEFAULT_NODE_WIDTH = 24;
export const DEFAULT_NODE_PADDING = 16;
export const DEFAULT_NODE_ALIGNMENT = 'justify' as const;
export const DEFAULT_LAYOUT_ITERATIONS = 32;

// Default Interaction Values

export const DEFAULT_FADE_OPACITY = 0.2;

// Default Animation Values

export const DEFAULT_ANIMATION_DURATION = 500;
export const DEFAULT_EASING = 'easeCubic' as const;

// Default Style Values

export const DEFAULT_NODE_COLOR = '#1f77b4';
export const DEFAULT_NODE_STROKE = '#000';
export const DEFAULT_NODE_STROKE_WIDTH = 0;
export const DEFAULT_LINK_COLOR = '#aaa';
export const DEFAULT_LINK_OPACITY = 0.5;
export const DEFAULT_LINK_COLOR_MODE = 'source' as const;
export const DEFAULT_LABEL_FONT_SIZE = 12;
export const DEFAULT_LABEL_FONT_FAMILY = 'Segoe UI, sans-serif';
export const DEFAULT_LABEL_COLOR = '#333';

// Performance Thresholds

export const CANVAS_THRESHOLD = 500;
export const VIRTUALIZATION_THRESHOLD = 200;
export const WEB_WORKER_THRESHOLD = 1000;
export const DEBOUNCE_DELAY = 16;
export const TARGET_FPS = 60;
export const PROGRESSIVE_BATCH_SIZE = 50;

// SVG Accessibility

export const SVG_ROLE = 'img';
export const SVG_ARIA_LABEL = 'Sankey Diagram';
export const SVG_CLASS = 'sankey-chart';
export const SVG_PRESERVE_ASPECT_RATIO = 'xMidYMid meet';
