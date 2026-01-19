'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { SankeyNode } from './SankeyNode';
import { SankeyLink } from './SankeyLink';
import { SankeyTooltip } from './SankeyTooltip';
import { useSankeyLayout } from '../hooks/useSankeyLayout';
import { useSankeyTooltip } from '../hooks/useSankeyTooltip';
import type {
  SankeyChartProps,
  ComputedNode,
  ComputedLink,
} from '../types';

/**
 * Main Sankey Chart component
 *
 * @example
 * ```tsx
 * import { SankeyChart } from '@sankey-chart/react';
 *
 * const data = {
 *   nodes: [
 *     { id: 'a', name: 'Node A' },
 *     { id: 'b', name: 'Node B' },
 *     { id: 'c', name: 'Node C' },
 *   ],
 *   links: [
 *     { source: 'a', target: 'b', value: 10 },
 *     { source: 'a', target: 'c', value: 5 },
 *   ],
 * };
 *
 * <SankeyChart
 *   data={data}
 *   width={800}
 *   height={600}
 *   showLabels
 *   showTooltips
 * />
 * ```
 */
export const SankeyChart = memo(function SankeyChart({
  data,
  width,
  height,
  layout = {},
  style = {},
  events = {},
  showLabels = true,
  showTooltips = true,
  renderTooltip,
  className = '',
  ariaLabel = 'Sankey diagram',
}: SankeyChartProps) {
  // State for hover highlighting
  const [hoveredNode, setHoveredNode] = useState<ComputedNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<ComputedLink | null>(null);

  // Compute layout
  const { nodes, links, isValid } = useSankeyLayout(data, {
    width,
    height,
    ...layout,
  });

  // Tooltip management
  const {
    tooltip,
    isVisible: tooltipVisible,
    showNodeTooltip,
    showLinkTooltip,
    hideTooltip,
    updatePosition,
  } = useSankeyTooltip();

  // Determine which nodes/links should be highlighted or dimmed
  const { highlightedNodes, highlightedLinks } = useMemo(() => {
    if (!hoveredNode && !hoveredLink) {
      return { highlightedNodes: new Set<string>(), highlightedLinks: new Set<number>() };
    }

    const nodeIds = new Set<string>();
    const linkIndices = new Set<number>();

    if (hoveredNode) {
      nodeIds.add(hoveredNode.id);
      hoveredNode.sourceLinks?.forEach((link) => {
        nodeIds.add(link.target.id);
        linkIndices.add(link.index);
      });
      hoveredNode.targetLinks?.forEach((link) => {
        nodeIds.add(link.source.id);
        linkIndices.add(link.index);
      });
    }

    if (hoveredLink) {
      nodeIds.add(hoveredLink.source.id);
      nodeIds.add(hoveredLink.target.id);
      linkIndices.add(hoveredLink.index);
    }

    return { highlightedNodes: nodeIds, highlightedLinks: linkIndices };
  }, [hoveredNode, hoveredLink]);

  const hasHighlight = highlightedNodes.size > 0 || highlightedLinks.size > 0;

  // Event handlers
  const handleNodeMouseEnter = useCallback(
    (node: ComputedNode, event: React.MouseEvent) => {
      setHoveredNode(node);
      if (showTooltips) {
        showNodeTooltip(node, event);
      }
      events.onNodeMouseEnter?.(node, event);
    },
    [showTooltips, showNodeTooltip, events]
  );

  const handleNodeMouseLeave = useCallback(
    (node: ComputedNode, event: React.MouseEvent) => {
      setHoveredNode(null);
      if (showTooltips) {
        hideTooltip();
      }
      events.onNodeMouseLeave?.(node, event);
    },
    [showTooltips, hideTooltip, events]
  );

  const handleNodeClick = useCallback(
    (node: ComputedNode, event: React.MouseEvent) => {
      events.onNodeClick?.(node, event);
    },
    [events]
  );

  const handleLinkMouseEnter = useCallback(
    (link: ComputedLink, event: React.MouseEvent) => {
      setHoveredLink(link);
      if (showTooltips) {
        showLinkTooltip(link, event);
      }
      events.onLinkMouseEnter?.(link, event);
    },
    [showTooltips, showLinkTooltip, events]
  );

  const handleLinkMouseLeave = useCallback(
    (link: ComputedLink, event: React.MouseEvent) => {
      setHoveredLink(null);
      if (showTooltips) {
        hideTooltip();
      }
      events.onLinkMouseLeave?.(link, event);
    },
    [showTooltips, hideTooltip, events]
  );

  const handleLinkClick = useCallback(
    (link: ComputedLink, event: React.MouseEvent) => {
      events.onLinkClick?.(link, event);
    },
    [events]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (showTooltips && tooltipVisible) {
        updatePosition(event);
      }
    },
    [showTooltips, tooltipVisible, updatePosition]
  );

  // Render empty state if no valid data
  if (!isValid || nodes.length === 0) {
    return (
      <div
        className={`sankey-chart sankey-chart--empty ${className}`}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '14px',
        }}
      >
        No data to display
      </div>
    );
  }

  return (
    <div className={`sankey-chart ${className}`} style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={handleMouseMove}
        style={{ overflow: 'visible' }}
      >
        {/* Links layer (rendered first, below nodes) */}
        <g className="sankey-links">
          {links.map((link, index) => (
            <SankeyLink
              key={`link-${link.source.id}-${link.target.id}-${index}`}
              link={link}
              style={style.link}
              isHighlighted={highlightedLinks.has(link.index)}
              isDimmed={hasHighlight && !highlightedLinks.has(link.index)}
              onClick={(e) => handleLinkClick(link, e)}
              onMouseEnter={(e) => handleLinkMouseEnter(link, e)}
              onMouseLeave={(e) => handleLinkMouseLeave(link, e)}
            />
          ))}
        </g>

        {/* Nodes layer */}
        <g className="sankey-nodes">
          {nodes.map((node) => (
            <SankeyNode
              key={`node-${node.id}`}
              node={node}
              style={style.node}
              showLabel={showLabels}
              labelStyle={style.label}
              isHighlighted={highlightedNodes.has(node.id)}
              isDimmed={hasHighlight && !highlightedNodes.has(node.id)}
              onClick={(e) => handleNodeClick(node, e)}
              onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
              onMouseLeave={(e) => handleNodeMouseLeave(node, e)}
            />
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      {showTooltips && (
        <SankeyTooltip
          data={tooltip}
          visible={tooltipVisible}
          render={renderTooltip}
        />
      )}
    </div>
  );
});
