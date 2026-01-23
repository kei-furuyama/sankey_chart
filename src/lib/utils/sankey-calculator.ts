/**
 * Sankey layout calculation utilities
 */

import {
  sankey,
  sankeyLinkHorizontal,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify,
  type SankeyGraph,
  type SankeyLayout as D3SankeyLayout,
} from 'd3-sankey';
import type {
  SankeyData,
  SankeyLayoutOptions,
  LinkSortMode,
  ComputedNode,
  ComputedLink,
} from '../types';

/**
 * Node alignment functions mapping
 */
const alignmentFunctions = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify,
} as const;

/**
 * Get link sort function based on mode
 */
function getLinkSortFunction(
  mode: LinkSortMode
): ((a: any, b: any) => number) | undefined {
  switch (mode) {
    case 'ascending':
      return (a, b) => {
        const aY = (a.y0 ?? 0) + (a.y1 ?? 0);
        const bY = (b.y0 ?? 0) + (b.y1 ?? 0);
        return aY - bY;
      };
    case 'descending':
      return (a, b) => {
        const aY = (a.y0 ?? 0) + (a.y1 ?? 0);
        const bY = (b.y0 ?? 0) + (b.y1 ?? 0);
        return bY - aY;
      };
    case 'byValue':
      return (a, b) => a.value - b.value;
    case 'byValueDesc':
      return (a, b) => b.value - a.value;
    case 'none':
    default:
      return undefined;
  }
}

/**
 * Default layout options
 */
const defaultLayoutOptions: Required<SankeyLayoutOptions> = {
  width: 800,
  height: 600,
  nodePadding: 10,
  nodeWidth: 24,
  nodeAlign: 'justify',
  iterations: 6,
  linkSort: 'ascending',
  margin: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
  },
};

/**
 * Create a configured Sankey generator
 */
export function createSankeyGenerator(
  options: Partial<SankeyLayoutOptions> = {}
): D3SankeyLayout<SankeyGraph<{}, {}>, {}, {}> {
  const config = { ...defaultLayoutOptions, ...options };
  const { width, height, nodePadding, nodeWidth, nodeAlign, iterations, linkSort, margin } = config;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const generator = sankey()
    .nodeId((d: any) => d.id)
    .nodeWidth(nodeWidth)
    .nodePadding(nodePadding)
    .nodeAlign(alignmentFunctions[nodeAlign])
    .extent([
      [margin.left, margin.top],
      [margin.left + innerWidth, margin.top + innerHeight],
    ])
    .iterations(iterations);

  // Apply link sort if specified
  const linkSortFn = getLinkSortFunction(linkSort);
  if (linkSortFn) {
    generator.linkSort(linkSortFn);
  }

  return generator as D3SankeyLayout<SankeyGraph<{}, {}>, {}, {}>;
}

/**
 * Compute the Sankey layout from input data
 */
export function sankeyLayout(
  data: SankeyData,
  options: Partial<SankeyLayoutOptions> = {}
): { nodes: ComputedNode[]; links: ComputedLink[] } {
  const generator = createSankeyGenerator(options);

  // Create a copy of data to avoid mutation
  const graphData = {
    nodes: data.nodes.map((node) => ({ ...node })),
    links: data.links.map((link) => ({ ...link })),
  };

  // Compute the layout
  const { nodes, links } = generator(graphData as any);

  return {
    nodes: nodes as unknown as ComputedNode[],
    links: links as unknown as ComputedLink[],
  };
}

/**
 * Generate the path for a Sankey link
 */
export function generateLinkPath(link: ComputedLink): string {
  const linkGenerator = sankeyLinkHorizontal();
  return linkGenerator(link as any) || '';
}

/**
 * Calculate total value for a node
 */
export function calculateNodeValue(node: ComputedNode): number {
  const incomingValue = node.targetLinks?.reduce((sum, link) => sum + link.value, 0) || 0;
  const outgoingValue = node.sourceLinks?.reduce((sum, link) => sum + link.value, 0) || 0;
  return Math.max(incomingValue, outgoingValue);
}

/**
 * Get nodes at a specific depth/layer
 */
export function getNodesAtDepth(nodes: ComputedNode[], depth: number): ComputedNode[] {
  return nodes.filter((node) => node.depth === depth);
}

/**
 * Get the maximum depth in the layout
 */
export function getMaxDepth(nodes: ComputedNode[]): number {
  return Math.max(...nodes.map((node) => node.depth), 0);
}

/**
 * Find connected nodes for a given node
 */
export function getConnectedNodes(
  node: ComputedNode
): { sources: ComputedNode[]; targets: ComputedNode[] } {
  const sources = node.targetLinks?.map((link) => link.source) || [];
  const targets = node.sourceLinks?.map((link) => link.target) || [];
  return { sources, targets };
}

/**
 * Calculate the center Y position of a node
 */
export function getNodeCenterY(node: ComputedNode): number {
  return (node.y0 + node.y1) / 2;
}

/**
 * Calculate the center X position of a node
 */
export function getNodeCenterX(node: ComputedNode): number {
  return (node.x0 + node.x1) / 2;
}
