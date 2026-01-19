'use client';

import React, { memo } from 'react';
import type { TooltipData, ComputedNode, ComputedLink } from '../types';

export interface SankeyTooltipProps {
  /** Tooltip data */
  data: TooltipData | null;
  /** Whether tooltip is visible */
  visible: boolean;
  /** Custom render function */
  render?: (data: ComputedNode | ComputedLink, type: 'node' | 'link') => React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

/**
 * Default tooltip content for nodes
 */
function DefaultNodeTooltip({ node }: { node: ComputedNode }) {
  return (
    <div className="sankey-tooltip-content">
      <div className="sankey-tooltip-title">{node.name}</div>
      <div className="sankey-tooltip-value">
        Value: {node.value.toLocaleString()}
      </div>
    </div>
  );
}

/**
 * Default tooltip content for links
 */
function DefaultLinkTooltip({ link }: { link: ComputedLink }) {
  return (
    <div className="sankey-tooltip-content">
      <div className="sankey-tooltip-title">
        {link.source.name} → {link.target.name}
      </div>
      <div className="sankey-tooltip-value">
        Value: {link.value.toLocaleString()}
      </div>
    </div>
  );
}

/**
 * Tooltip component for Sankey diagrams
 */
export const SankeyTooltip = memo(function SankeyTooltip({
  data,
  visible,
  render,
  className = '',
}: SankeyTooltipProps) {
  if (!visible || !data) {
    return null;
  }

  const content = render ? (
    render(data.data, data.type)
  ) : data.type === 'node' ? (
    <DefaultNodeTooltip node={data.data as ComputedNode} />
  ) : (
    <DefaultLinkTooltip link={data.data as ComputedLink} />
  );

  return (
    <div
      className={`sankey-tooltip ${className}`}
      style={{
        position: 'fixed',
        left: data.x,
        top: data.y,
        zIndex: 1000,
        pointerEvents: 'none',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        fontSize: '14px',
        lineHeight: '1.5',
        maxWidth: '250px',
        transform: 'translate(0, -50%)',
      }}
    >
      {content}
    </div>
  );
});

// Export default styles as CSS-in-JS object for users who want to customize
export const tooltipStyles = {
  container: {
    position: 'fixed' as const,
    zIndex: 1000,
    pointerEvents: 'none' as const,
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    fontSize: '14px',
    lineHeight: '1.5',
    maxWidth: '250px',
  },
  title: {
    fontWeight: 600,
    marginBottom: '4px',
    color: '#111827',
  },
  value: {
    color: '#6b7280',
  },
};
