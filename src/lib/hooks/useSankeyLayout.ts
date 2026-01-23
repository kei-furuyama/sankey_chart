'use client';

import { useMemo } from 'react';
import { sankeyLayout } from '../utils/sankey-calculator';
import { generateColorScale, defaultColorPalette } from '../utils/color-utils';
import type {
  SankeyData,
  SankeyLayoutOptions,
  ComputedNode,
  ComputedLink,
} from '../types';

export interface UseSankeyLayoutOptions extends Partial<SankeyLayoutOptions> {
  /** Custom color palette for nodes */
  colors?: string[];
}

export interface UseSankeyLayoutResult {
  /** Computed nodes with layout positions */
  nodes: ComputedNode[];
  /** Computed links with paths */
  links: ComputedLink[];
  /** Color scale function */
  colorScale: (id: string) => string;
  /** Whether the layout is valid */
  isValid: boolean;
}

/**
 * Hook to compute Sankey diagram layout from data
 *
 * @example
 * ```tsx
 * const { nodes, links, colorScale } = useSankeyLayout(data, {
 *   width: 800,
 *   height: 600,
 *   nodePadding: 10,
 * });
 * ```
 */
export function useSankeyLayout(
  data: SankeyData | null | undefined,
  options: UseSankeyLayoutOptions = {}
): UseSankeyLayoutResult {
  const { colors = defaultColorPalette, ...layoutOptions } = options;

  // Extract primitive values for stable dependency tracking
  const width = layoutOptions.width;
  const height = layoutOptions.height;
  const nodePadding = layoutOptions.nodePadding;
  const nodeWidth = layoutOptions.nodeWidth;
  const nodeAlign = layoutOptions.nodeAlign;
  const iterations = layoutOptions.iterations;
  const linkSort = layoutOptions.linkSort;
  const marginTop = layoutOptions.margin?.top;
  const marginRight = layoutOptions.margin?.right;
  const marginBottom = layoutOptions.margin?.bottom;
  const marginLeft = layoutOptions.margin?.left;

  const result = useMemo(() => {
    // Handle empty or invalid data
    if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
      return {
        nodes: [],
        links: [],
        colorScale: () => colors[0] || '#0ea5e9',
        isValid: false,
      };
    }

    try {
      // Validate data
      const nodeIds = new Set(data.nodes.map((n) => n.id));
      const validLinks = data.links.filter(
        (link) => nodeIds.has(link.source) && nodeIds.has(link.target)
      );

      if (validLinks.length === 0) {
        return {
          nodes: [],
          links: [],
          colorScale: () => colors[0] || '#0ea5e9',
          isValid: false,
        };
      }

      // Build layout options with primitive values
      // Only include margin if at least one value is defined
      const hasMargin = marginTop !== undefined || marginRight !== undefined ||
                        marginBottom !== undefined || marginLeft !== undefined;

      const computedLayoutOptions: Partial<SankeyLayoutOptions> = {
        width,
        height,
        nodePadding,
        nodeWidth,
        nodeAlign,
        iterations,
        linkSort,
      };

      if (hasMargin) {
        computedLayoutOptions.margin = {
          top: marginTop ?? 10,
          right: marginRight ?? 10,
          bottom: marginBottom ?? 10,
          left: marginLeft ?? 10,
        };
      }

      // Compute layout
      const { nodes, links } = sankeyLayout(
        { nodes: data.nodes, links: validLinks },
        computedLayoutOptions
      );

      // Generate color scale based on node IDs or categories
      const categories = [...new Set(data.nodes.map((n) => n.category || n.id))];
      const colorScale = generateColorScale(categories, colors);

      // Apply colors to nodes that don't have explicit colors
      const coloredNodes = nodes.map((node) => ({
        ...node,
        color: node.color || colorScale(node.category || node.id),
      }));

      return {
        nodes: coloredNodes,
        links,
        colorScale,
        isValid: true,
      };
    } catch (error) {
      console.error('Error computing Sankey layout:', error);
      return {
        nodes: [],
        links: [],
        colorScale: () => colors[0] || '#0ea5e9',
        isValid: false,
      };
    }
  }, [data, colors, width, height, nodePadding, nodeWidth, nodeAlign, iterations, linkSort, marginTop, marginRight, marginBottom, marginLeft]);

  return result;
}
