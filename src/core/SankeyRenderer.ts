import * as d3 from 'd3';
import type {
  SankeyChartConfig,
  ComputedGraph,
  ComputedNode,
  ComputedLink,
  LegacyEventHandlers,
  SankeyData,
} from '../types';
import { resolveNodeFromLink } from '../types';
import { SankeyLayout } from './SankeyLayout';
import {
  LABEL_OFFSET_X,
  LABEL_VERTICAL_ALIGN,
  MIN_STROKE_WIDTH,
  NODE_BORDER_RADIUS,
  SVG_ARIA_LABEL,
  SVG_CLASS,
  SVG_PRESERVE_ASPECT_RATIO,
  SVG_ROLE,
} from './constants';

const EASING_MAP = {
  linear: d3.easeLinear,
  easeInOut: d3.easeQuadInOut,
  easeCubic: d3.easeCubicInOut,
  easeElastic: d3.easeElasticOut,
} as const;

export class SankeyRenderer {
  private container: HTMLElement;
  private config: SankeyChartConfig;
  private layout: SankeyLayout;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private graph: ComputedGraph | null = null;
  private eventHandlers: LegacyEventHandlers = {};

  private selectedNodes: Set<ComputedNode> = new Set();
  private hoveredNode: ComputedNode | null = null;
  private hoveredLink: ComputedLink | null = null;

  constructor(container: HTMLElement, config: SankeyChartConfig) {
    this.container = container;
    this.config = config;
    this.layout = new SankeyLayout(config);
    this.initializeSvg();
  }

  private initializeSvg(): void {
    d3.select(this.container).selectAll('svg').remove();

    this.svg = d3
      .select(this.container)
      .append('svg')
      .attr('width', this.config.width)
      .attr('height', this.config.height)
      .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`)
      .attr('preserveAspectRatio', SVG_PRESERVE_ASPECT_RATIO)
      .attr('class', SVG_CLASS)
      .attr('role', SVG_ROLE)
      .attr('aria-label', SVG_ARIA_LABEL);

    this.svg.append('defs');
    this.svg.append('g').attr('class', 'sankey-links');
    this.svg.append('g').attr('class', 'sankey-nodes');
    this.svg.append('g').attr('class', 'sankey-labels');
  }

  private updateSvgSize(): void {
    if (!this.svg) return;
    this.svg
      .attr('width', this.config.width)
      .attr('height', this.config.height)
      .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`);
  }

  private getLinkKey(link: ComputedLink): string {
    return `${resolveNodeFromLink(link.source).id}-${resolveNodeFromLink(link.target).id}`;
  }

  private getGradientId(link: ComputedLink): string {
    return `gradient-${this.getLinkKey(link)}`;
  }

  private getLinkStrokeWidth(link: ComputedLink): number {
    return Math.max(MIN_STROKE_WIDTH, link.width ?? 0);
  }

  private getNodeWidth(node: ComputedNode): number {
    return (node.x1 ?? 0) - (node.x0 ?? 0);
  }

  private getNodeHeight(node: ComputedNode): number {
    return (node.y1 ?? 0) - (node.y0 ?? 0);
  }

  private getAnimationDuration(): number {
    const { animation } = this.config;
    return animation.enabled ? animation.duration : 0;
  }

  private createTransition(): d3.Transition<d3.BaseType, any, any, any> {
    return d3
      .transition()
      .duration(this.getAnimationDuration())
      .ease(EASING_MAP[this.config.animation.easing]);
  }

  /**
   * Determine whether a node's label should appear on its right side.
   */
  private isLabelOnRight(node: ComputedNode): boolean {
    const { width, margin } = this.config;
    const innerWidth = width - margin.left - margin.right;
    return (node.x0 ?? 0) < margin.left + innerWidth / 2;
  }

  setEventHandlers(handlers: LegacyEventHandlers): void {
    this.eventHandlers = handlers;
  }

  updateConfig(config: Partial<SankeyChartConfig>): void {
    const oldSize = { width: this.config.width, height: this.config.height };
    this.config = { ...this.config, ...config };
    this.layout.updateConfig(this.config);

    if (this.config.width !== oldSize.width || this.config.height !== oldSize.height) {
      this.updateSvgSize();
    }
  }

  render(data: SankeyData): void {
    if (!this.svg) return;

    this.graph = this.layout.compute(data);

    this.renderLinks(this.graph.links);
    this.renderNodes(this.graph.nodes);
    this.renderLabels(this.graph.nodes);
  }

  private renderLinks(links: ComputedLink[]): void {
    const linksGroup = this.svg!.select<SVGGElement>('.sankey-links');
    const pathGenerator = this.layout.getLinkPathGenerator();
    const { animation, style, interaction } = this.config;

    this.updateLinkGradients(links);

    const linkSelection = linksGroup
      .selectAll<SVGPathElement, ComputedLink>('.sankey-link')
      .data(links, (d) => this.getLinkKey(d));

    linkSelection
      .exit()
      .transition()
      .duration(this.getAnimationDuration())
      .style('opacity', 0)
      .remove();

    const enterLinks = linkSelection
      .enter()
      .append('path')
      .attr('class', 'sankey-link')
      .attr('d', pathGenerator)
      .attr('fill', 'none')
      .attr('stroke-width', (d) => this.getLinkStrokeWidth(d))
      .style('opacity', 0);

    if (animation.enabled && animation.enterAnimation) {
      enterLinks.each(function () {
        const path = this as SVGPathElement;
        const length = path.getTotalLength();
        d3.select(path)
          .attr('stroke-dasharray', `${length} ${length}`)
          .attr('stroke-dashoffset', length);
      });
    }

    const allLinks = enterLinks.merge(linkSelection);

    allLinks.attr('stroke', (d) => this.getLinkColor(d));

    if (interaction.enableHover || interaction.enableClick) {
      allLinks
        .style('cursor', 'pointer')
        .on('mouseenter', (event, d) => this.handleLinkHover(d, event))
        .on('mouseleave', (event) => this.handleLinkHover(null, event))
        .on('click', (event, d) => this.handleLinkClick(d, event));
    }

    allLinks
      .transition(this.createTransition())
      .attr('d', pathGenerator)
      .attr('stroke-width', (d) => this.getLinkStrokeWidth(d))
      .attr('stroke-dashoffset', 0)
      .style('opacity', style.linkOpacity);
  }

  private renderNodes(nodes: ComputedNode[]): void {
    const nodesGroup = this.svg!.select<SVGGElement>('.sankey-nodes');
    const { style, interaction } = this.config;

    const nodeSelection = nodesGroup
      .selectAll<SVGRectElement, ComputedNode>('.sankey-node')
      .data(nodes, (d) => d.id);

    nodeSelection
      .exit()
      .transition()
      .duration(this.getAnimationDuration())
      .style('opacity', 0)
      .attr('height', 0)
      .remove();

    const enterNodes = nodeSelection
      .enter()
      .append('rect')
      .attr('class', 'sankey-node')
      .attr('x', (d) => d.x0 ?? 0)
      .attr('y', (d) => d.y0 ?? 0)
      .attr('width', (d) => this.getNodeWidth(d))
      .attr('height', 0)
      .attr('rx', NODE_BORDER_RADIUS)
      .attr('ry', NODE_BORDER_RADIUS);

    const allNodes = enterNodes.merge(nodeSelection);

    allNodes
      .attr('fill', (d) => d.color ?? style.nodeColor)
      .attr('stroke', style.nodeStroke)
      .attr('stroke-width', style.nodeStrokeWidth);

    if (interaction.enableHover || interaction.enableClick) {
      allNodes
        .style('cursor', 'pointer')
        .on('mouseenter', (event, d) => this.handleNodeHover(d, event))
        .on('mouseleave', (event) => this.handleNodeHover(null, event))
        .on('click', (event, d) => this.handleNodeClick(d, event));
    }

    allNodes
      .transition(this.createTransition())
      .attr('x', (d) => d.x0 ?? 0)
      .attr('y', (d) => d.y0 ?? 0)
      .attr('width', (d) => this.getNodeWidth(d))
      .attr('height', (d) => this.getNodeHeight(d));
  }

  private renderLabels(nodes: ComputedNode[]): void {
    const labelsGroup = this.svg!.select<SVGGElement>('.sankey-labels');
    const { style } = this.config;

    const labelSelection = labelsGroup
      .selectAll<SVGTextElement, ComputedNode>('.sankey-label')
      .data(nodes, (d) => d.id);

    labelSelection
      .exit()
      .transition()
      .duration(this.getAnimationDuration())
      .style('opacity', 0)
      .remove();

    const enterLabels = labelSelection
      .enter()
      .append('text')
      .attr('class', 'sankey-label')
      .style('opacity', 0);

    const allLabels = enterLabels.merge(labelSelection);

    allLabels
      .attr('font-size', style.labelFontSize)
      .attr('font-family', style.labelFontFamily)
      .attr('fill', style.labelColor)
      .attr('dy', LABEL_VERTICAL_ALIGN)
      .text((d) => d.name);

    allLabels
      .attr('x', (d) => {
        if (this.isLabelOnRight(d)) {
          return (d.x1 ?? 0) + LABEL_OFFSET_X;
        }
        return (d.x0 ?? 0) - LABEL_OFFSET_X;
      })
      .attr('text-anchor', (d) => (this.isLabelOnRight(d) ? 'start' : 'end'))
      .attr('y', (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2);

    allLabels.transition(this.createTransition()).style('opacity', 1);
  }

  private updateLinkGradients(links: ComputedLink[]): void {
    if (this.config.style.linkColorMode !== 'gradient') return;

    const defs = this.svg!.select('defs');

    const gradients = defs
      .selectAll<SVGLinearGradientElement, ComputedLink>('linearGradient')
      .data(links, (d) => this.getGradientId(d));

    gradients.exit().remove();

    const enterGradients = gradients
      .enter()
      .append('linearGradient')
      .attr('id', (d) => this.getGradientId(d))
      .attr('gradientUnits', 'userSpaceOnUse');

    const allGradients = enterGradients.merge(gradients);

    allGradients
      .attr('x1', (d) => resolveNodeFromLink(d.source).x1 ?? 0)
      .attr('x2', (d) => resolveNodeFromLink(d.target).x0 ?? 0);

    allGradients
      .selectAll('stop.source')
      .data((d) => [d])
      .join('stop')
      .attr('class', 'source')
      .attr('offset', '0%')
      .attr('stop-color', (d) => resolveNodeFromLink(d.source).color ?? this.config.style.nodeColor);

    allGradients
      .selectAll('stop.target')
      .data((d) => [d])
      .join('stop')
      .attr('class', 'target')
      .attr('offset', '100%')
      .attr('stop-color', (d) => resolveNodeFromLink(d.target).color ?? this.config.style.nodeColor);
  }

  private getLinkColor(link: ComputedLink): string {
    const { style } = this.config;

    if (link.color) return link.color;

    switch (style.linkColorMode) {
      case 'source':
        return resolveNodeFromLink(link.source).color ?? style.nodeColor;
      case 'target':
        return resolveNodeFromLink(link.target).color ?? style.nodeColor;
      case 'gradient':
        return `url(#${this.getGradientId(link)})`;
      case 'fixed':
      default:
        return style.linkColor;
    }
  }

  private handleNodeHover(node: ComputedNode | null, event: MouseEvent): void {
    this.hoveredNode = node;

    if (this.config.interaction.enableHover) {
      this.updateHighlight();
    }

    this.eventHandlers.onNodeHover?.(node, event);
  }

  private handleNodeClick(node: ComputedNode, event: MouseEvent): void {
    if (!this.config.interaction.enableClick) return;

    if (this.selectedNodes.has(node)) {
      this.selectedNodes.delete(node);
    } else {
      if (!event.shiftKey) {
        this.selectedNodes.clear();
      }
      this.selectedNodes.add(node);
    }

    this.updateHighlight();
    this.eventHandlers.onNodeClick?.(node, event);
    this.notifySelectionChange();
  }

  private handleLinkHover(link: ComputedLink | null, event: MouseEvent): void {
    this.hoveredLink = link;

    if (this.config.interaction.enableHover) {
      this.updateHighlight();
    }

    this.eventHandlers.onLinkHover?.(link, event);
  }

  private handleLinkClick(link: ComputedLink, event: MouseEvent): void {
    if (!this.config.interaction.enableClick) return;
    this.eventHandlers.onLinkClick?.(link, event);
  }

  /**
   * Collect all nodes and links connected to the current hover/selection state.
   */
  private collectHighlighted(): { nodes: Set<ComputedNode>; links: Set<ComputedLink> } {
    const nodes = new Set<ComputedNode>();
    const links = new Set<ComputedLink>();

    if (this.hoveredNode) {
      this.layout.getConnectedNodes(this.hoveredNode).forEach((n) => nodes.add(n));
      this.layout.getConnectedLinks(this.hoveredNode).forEach((l) => links.add(l));
    }

    this.selectedNodes.forEach((node) => {
      this.layout.getConnectedNodes(node).forEach((n) => nodes.add(n));
      this.layout.getConnectedLinks(node).forEach((l) => links.add(l));
    });

    if (this.hoveredLink) {
      links.add(this.hoveredLink);
      nodes.add(resolveNodeFromLink(this.hoveredLink.source));
      nodes.add(resolveNodeFromLink(this.hoveredLink.target));
    }

    return { nodes, links };
  }

  private updateHighlight(): void {
    if (!this.graph) return;

    const { fadeOpacity } = this.config.interaction;
    const { linkOpacity } = this.config.style;
    const highlighted = this.collectHighlighted();
    const hasHighlight = highlighted.nodes.size > 0 || highlighted.links.size > 0;

    this.svg!.selectAll<SVGRectElement, ComputedNode>('.sankey-node').style('opacity', (d) => {
      if (!hasHighlight) return 1;
      return highlighted.nodes.has(d) ? 1 : fadeOpacity;
    });

    this.svg!.selectAll<SVGPathElement, ComputedLink>('.sankey-link').style('opacity', (d) => {
      if (!hasHighlight) return linkOpacity;
      return highlighted.links.has(d) ? linkOpacity : fadeOpacity * linkOpacity;
    });

    this.svg!.selectAll<SVGTextElement, ComputedNode>('.sankey-label').style('opacity', (d) => {
      if (!hasHighlight) return 1;
      return highlighted.nodes.has(d) ? 1 : fadeOpacity;
    });
  }

  private notifySelectionChange(): void {
    if (!this.graph || !this.eventHandlers.onSelectionChange) return;

    const selectedLinks = new Set<ComputedLink>();
    this.selectedNodes.forEach((node) => {
      this.layout.getConnectedLinks(node).forEach((link) => selectedLinks.add(link));
    });

    this.eventHandlers.onSelectionChange(Array.from(this.selectedNodes), Array.from(selectedLinks));
  }

  clearSelection(): void {
    this.selectedNodes.clear();
    this.updateHighlight();
    this.notifySelectionChange();
  }

  destroy(): void {
    this.svg?.remove();
    this.svg = null;
    this.graph = null;
  }
}

export function createSankeyRenderer(
  container: HTMLElement,
  config: SankeyChartConfig
): SankeyRenderer {
  return new SankeyRenderer(container, config);
}
