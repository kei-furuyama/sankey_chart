'use client';

import React, { memo, useMemo } from 'react';
import type { ComputedLink, SankeyStyleOptions } from '../types';
import { generateGradientId, lightenColor } from '../utils/color-utils';

export interface SankeyLinkProps {
  /** Computed link data */
  link: ComputedLink;
  /** Style options */
  style?: SankeyStyleOptions['link'];
  /** Whether the link is highlighted */
  isHighlighted?: boolean;
  /** Whether the link is dimmed */
  isDimmed?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent) => void;
  /** Mouse enter handler */
  onMouseEnter?: (event: React.MouseEvent) => void;
  /** Mouse leave handler */
  onMouseLeave?: (event: React.MouseEvent) => void;
}

/**
 * Generate smooth SVG path for Sankey link with refined curvature
 */
function generateSankeyPath(link: ComputedLink): string {
  const sourceX = link.source.x1;
  const targetX = link.target.x0;
  const sourceY = link.y0;
  const targetY = link.y1;

  // Smoother curvature for more elegant flow
  const curvature = 0.55;
  const xi = (targetX - sourceX) * curvature;

  return `M${sourceX},${sourceY} C${sourceX + xi},${sourceY} ${targetX - xi},${targetY} ${targetX},${targetY}`;
}

/**
 * Renders a single link in the Sankey diagram with refined styling
 */
export const SankeyLink = memo(function SankeyLink({
  link,
  style = {},
  isHighlighted = false,
  isDimmed = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: SankeyLinkProps) {
  const {
    fill,
    opacity = 0.4,
    hoverOpacity = 0.7,
    gradient = true,
  } = style;

  // Generate path
  const path = useMemo(() => generateSankeyPath(link), [link]);

  // Determine colors - lighter for more elegant appearance
  const sourceColor = link.source.color || '#6366F1';
  const targetColor = link.target.color || '#6366F1';

  // Lighten colors for softer flow appearance
  const softSourceColor = useMemo(() => lightenColor(sourceColor, 0.1), [sourceColor]);
  const softTargetColor = useMemo(() => lightenColor(targetColor, 0.1), [targetColor]);

  const linkColor =
    typeof fill === 'function' ? fill(link) : fill || link.color || softSourceColor;

  // Calculate opacity based on state - more subtle transitions
  const currentOpacity = isDimmed ? 0.08 : isHighlighted ? hoverOpacity : opacity;

  // Gradient ID for this link
  const gradientId = generateGradientId(link.source.id, link.target.id);
  const glowId = `glow-${gradientId}`;

  // Stroke width with minimum for visibility
  const strokeWidth = Math.max(2, link.width);

  return (
    <g className="sankey-link">
      {/* Definitions for gradients and effects */}
      <defs>
        {/* Main gradient */}
        {gradient && (
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={link.source.x1}
            y1={link.y0}
            x2={link.target.x0}
            y2={link.y1}
          >
            <stop offset="0%" stopColor={softSourceColor} stopOpacity={currentOpacity} />
            <stop offset="50%" stopColor={lightenColor(softSourceColor, 0.05)} stopOpacity={currentOpacity * 0.9} />
            <stop offset="100%" stopColor={softTargetColor} stopOpacity={currentOpacity} />
          </linearGradient>
        )}

        {/* Subtle glow for highlighted state */}
        {isHighlighted && (
          <filter id={glowId} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Link path with smooth styling */}
      <path
        d={path}
        fill="none"
        stroke={gradient ? `url(#${gradientId})` : linkColor}
        strokeWidth={strokeWidth}
        strokeOpacity={gradient ? 1 : currentOpacity}
        strokeLinecap="round"
        filter={isHighlighted ? `url(#${glowId})` : undefined}
        style={{
          cursor: onClick ? 'pointer' : 'default',
          transition: 'stroke-opacity 0.3s ease, filter 0.3s ease',
        }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    </g>
  );
});
