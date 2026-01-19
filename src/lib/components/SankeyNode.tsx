'use client';

import React, { memo, useMemo } from 'react';
import type { ComputedNode, SankeyStyleOptions } from '../types';
import { darkenColor, lightenColor } from '../utils/color-utils';

export interface SankeyNodeProps {
  /** Computed node data */
  node: ComputedNode;
  /** Style options */
  style?: SankeyStyleOptions['node'];
  /** Whether to show label */
  showLabel?: boolean;
  /** Label style options */
  labelStyle?: SankeyStyleOptions['label'];
  /** Whether the node is highlighted */
  isHighlighted?: boolean;
  /** Whether the node is dimmed */
  isDimmed?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent) => void;
  /** Mouse enter handler */
  onMouseEnter?: (event: React.MouseEvent) => void;
  /** Mouse leave handler */
  onMouseLeave?: (event: React.MouseEvent) => void;
  /** Mouse down handler (for drag) */
  onMouseDown?: (event: React.MouseEvent) => void;
}

/**
 * Renders a single node in the Sankey diagram with refined styling
 */
export const SankeyNode = memo(function SankeyNode({
  node,
  style = {},
  showLabel = true,
  labelStyle = {},
  isHighlighted = false,
  isDimmed = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}: SankeyNodeProps) {
  const {
    fill,
    stroke,
    strokeWidth = 0,
    borderRadius = 3,
    opacity = 0.92,
    hoverOpacity = 1,
  } = style;

  const {
    fontSize = 11,
    fontFamily = 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight = 500,
    fill: labelFill,
    padding = 8,
    position: labelPosition = 'outside',
    showValue = false,
    valueFormatter = (v: number) => v.toLocaleString(),
  } = labelStyle;

  // Calculate node dimensions
  const width = node.x1 - node.x0;
  const height = node.y1 - node.y0;

  // Determine fill color
  const nodeColor =
    typeof fill === 'function' ? fill(node) : fill || node.color || '#6366F1';

  // Generate gradient colors for premium look
  const gradientColors = useMemo(() => ({
    light: lightenColor(nodeColor, 0.15),
    dark: darkenColor(nodeColor, 0.1),
    stroke: darkenColor(nodeColor, 0.2),
  }), [nodeColor]);

  // Unique gradient ID for this node
  const gradientId = `node-gradient-${node.id}`.replace(/[^a-zA-Z0-9-]/g, '-');
  const shadowId = `node-shadow-${node.id}`.replace(/[^a-zA-Z0-9-]/g, '-');

  // Calculate opacity based on state
  const currentOpacity = isDimmed ? 0.25 : isHighlighted ? hoverOpacity : opacity;
  const scale = isHighlighted ? 1.02 : 1;

  // Determine label position based on labelPosition setting
  const labelConfig = useMemo(() => {
    const centerY = (node.y0 + node.y1) / 2;
    const centerX = (node.x0 + node.x1) / 2;
    const isFirstLayer = node.depth === 0;

    switch (labelPosition) {
      case 'left':
        return { x: node.x0 - padding, y: centerY, anchor: 'end' as const };
      case 'right':
        return { x: node.x1 + padding, y: centerY, anchor: 'start' as const };
      case 'inside':
        return { x: centerX, y: centerY, anchor: 'middle' as const };
      case 'outside':
      default:
        // Auto: left side for first layer, right side for others
        return isFirstLayer
          ? { x: node.x0 - padding, y: centerY, anchor: 'end' as const }
          : { x: node.x1 + padding, y: centerY, anchor: 'start' as const };
    }
  }, [node, padding, labelPosition]);

  // Build label text with optional value
  const labelText = useMemo(() => {
    if (showValue && node.value !== undefined) {
      return `${node.name} (${valueFormatter(node.value)})`;
    }
    return node.name;
  }, [node.name, node.value, showValue, valueFormatter]);

  // Label color - darker for better readability, white for inside position
  const textColor = labelPosition === 'inside'
    ? '#FFFFFF'
    : (labelFill || '#1F2937');

  return (
    <g
      className="sankey-node"
      style={{
        cursor: onClick || onMouseDown ? 'pointer' : 'default',
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
    >
      {/* Definitions for gradients and filters */}
      <defs>
        {/* Vertical gradient for depth effect */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={gradientColors.light} />
          <stop offset="100%" stopColor={gradientColors.dark} />
        </linearGradient>

        {/* Subtle drop shadow */}
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor={nodeColor} floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Node rectangle with gradient and shadow */}
      <rect
        x={node.x0}
        y={node.y0}
        width={width}
        height={height}
        fill={`url(#${gradientId})`}
        stroke={stroke || gradientColors.stroke}
        strokeWidth={strokeWidth || 0.5}
        rx={borderRadius}
        ry={borderRadius}
        opacity={currentOpacity}
        filter={isHighlighted ? `url(#${shadowId})` : undefined}
        style={{
          transition: 'opacity 0.25s ease, filter 0.25s ease',
          transform: `scale(${scale})`,
          transformOrigin: `${node.x0 + width / 2}px ${node.y0 + height / 2}px`,
        }}
      />

      {/* Node label with refined typography */}
      {showLabel && labelPosition !== 'none' && (
        <text
          x={labelConfig.x}
          y={labelConfig.y}
          dy="0.35em"
          textAnchor={labelConfig.anchor}
          fontSize={labelPosition === 'inside' ? Math.min(fontSize, height * 0.4) : fontSize}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          fill={textColor}
          opacity={isDimmed ? 0.4 : 0.9}
          letterSpacing="0.01em"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            transition: 'opacity 0.25s ease',
            textShadow: labelPosition === 'inside' ? '0 1px 2px rgba(0,0,0,0.3)' : undefined,
          }}
        >
          {labelText}
        </text>
      )}
    </g>
  );
});
