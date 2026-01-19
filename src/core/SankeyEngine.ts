/**
 * SankeyEngine - Platform-Agnostic Core Engine
 *
 * このクラスはフレームワークに依存しない純粋なSankey描画エンジンです。
 * React/Next.js、Power BI、その他のプラットフォームから利用可能。
 *
 * 設計原則:
 * 1. DOM操作はD3.jsのselectionのみを使用（React仮想DOMと競合しない）
 * 2. 状態管理は外部に委譲（Reactはhooks、Power BIはIVisual）
 * 3. 設定変更に対してイミュータブル（新しいインスタンスを作成）
 */

import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyLeft, sankeyRight, sankeyCenter, sankeyJustify } from 'd3-sankey';
import type {
  SankeyData,
  SankeyNodeDatum,
  SankeyLinkDatum,
  SankeyChartConfig,
  SankeyEventHandlers,
  ComputedGraph,
  ComputedNode,
  ComputedLink,
} from '../types';

// =============================================================================
// Alignment Helper
// =============================================================================

const ALIGNMENT_MAP = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify,
} as const;

// =============================================================================
// SankeyEngine Class
// =============================================================================

export class SankeyEngine {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private container: HTMLElement | null = null;
  private config: SankeyChartConfig;
  private eventHandlers: SankeyEventHandlers;
  private computedGraph: ComputedGraph | null = null;

  // D3 selections for update pattern
  private nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private linkGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private labelGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

  constructor(config: Partial<SankeyChartConfig> = {}, handlers: SankeyEventHandlers = {}) {
    // Deep merge with defaults (実際の実装では lodash.merge などを使用)
    this.config = this.mergeConfig(config);
    this.eventHandlers = handlers;
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * コンテナにマウントしてSVGを初期化
   */
  mount(container: HTMLElement): this {
    this.container = container;
    this.initializeSVG();
    return this;
  }

  /**
   * データを描画
   */
  render(data: SankeyData): this {
    if (!this.svg) {
      throw new Error('SankeyEngine: mount() must be called before render()');
    }

    // 1. データ検証
    this.validateData(data);

    // 2. d3-sankeyでレイアウト計算
    this.computedGraph = this.computeLayout(data);

    // 3. SVG描画
    this.renderLinks(this.computedGraph.links as ComputedLink[]);
    this.renderNodes(this.computedGraph.nodes as ComputedNode[]);
    this.renderLabels(this.computedGraph.nodes as ComputedNode[]);

    return this;
  }

  /**
   * データ更新（トランジション付き）
   */
  update(data: SankeyData): this {
    if (!this.svg || !this.computedGraph) {
      return this.render(data);
    }

    this.validateData(data);
    const newGraph = this.computeLayout(data);

    this.transitionLinks(newGraph.links as ComputedLink[]);
    this.transitionNodes(newGraph.nodes as ComputedNode[]);
    this.transitionLabels(newGraph.nodes as ComputedNode[]);

    this.computedGraph = newGraph;
    return this;
  }

  /**
   * サイズ変更
   */
  resize(width: number, height: number): this {
    this.config = { ...this.config, width, height };

    if (this.svg) {
      this.svg.attr('width', width).attr('height', height);

      if (this.computedGraph) {
        // 再レイアウト
        const data: SankeyData = {
          nodes: this.computedGraph.nodes.map(n => ({ ...n })) as SankeyNodeDatum[],
          links: this.computedGraph.links.map(l => ({
            source: (l.source as ComputedNode).id || '',
            target: (l.target as ComputedNode).id || '',
            value: l.value,
          })) as SankeyLinkDatum[],
        };
        this.render(data);
      }
    }
    return this;
  }

  /**
   * 特定ノードをハイライト
   */
  highlight(nodeIds: string[]): this {
    if (!this.svg || !this.computedGraph) return this;

    const { fadeOpacity } = this.config.interaction;
    const highlightSet = new Set(nodeIds);

    // ノードのハイライト
    this.nodeGroup?.selectAll<SVGRectElement, ComputedNode>('rect')
      .attr('opacity', d => highlightSet.has(d.id || '') ? 1 : fadeOpacity);

    // 関連リンクのハイライト
    this.linkGroup?.selectAll<SVGPathElement, ComputedLink>('path')
      .attr('opacity', d => {
        const sourceId = (d.source as ComputedNode).id || '';
        const targetId = (d.target as ComputedNode).id || '';
        return highlightSet.has(sourceId) || highlightSet.has(targetId)
          ? this.config.style.linkOpacity
          : fadeOpacity * this.config.style.linkOpacity;
      });

    return this;
  }

  /**
   * ハイライト解除
   */
  clearHighlight(): this {
    this.nodeGroup?.selectAll('rect').attr('opacity', 1);
    this.linkGroup?.selectAll('path').attr('opacity', this.config.style.linkOpacity);
    return this;
  }

  /**
   * 破棄
   */
  destroy(): void {
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }
    this.container = null;
    this.computedGraph = null;
    this.nodeGroup = null;
    this.linkGroup = null;
    this.labelGroup = null;
  }

  /**
   * 現在の計算済みグラフを取得
   */
  getComputedGraph(): ComputedGraph | null {
    return this.computedGraph;
  }

  /**
   * SVGを画像としてエクスポート
   */
  exportSVG(): string | null {
    if (!this.svg) return null;
    const svgNode = this.svg.node();
    if (!svgNode) return null;

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgNode);
  }

  // ===========================================================================
  // Private Methods - Initialization
  // ===========================================================================

  private initializeSVG(): void {
    if (!this.container) return;

    // 既存のSVGをクリア
    d3.select(this.container).selectAll('svg').remove();

    const { width, height, margin } = this.config;

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'sankey-chart');

    // グループを作成（描画順序: links -> nodes -> labels）
    const g = this.svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    this.linkGroup = g.append('g').attr('class', 'sankey-links');
    this.nodeGroup = g.append('g').attr('class', 'sankey-nodes');
    this.labelGroup = g.append('g').attr('class', 'sankey-labels');
  }

  // ===========================================================================
  // Private Methods - Layout Calculation
  // ===========================================================================

  private computeLayout(data: SankeyData): ComputedGraph {
    const { width, height, margin, layout } = this.config;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const sankeyGenerator = sankey<SankeyNodeDatum, SankeyLinkDatum>()
      .nodeId(d => d.id)
      .nodeWidth(layout.nodeWidth)
      .nodePadding(layout.nodePadding)
      .nodeAlign(ALIGNMENT_MAP[layout.nodeAlignment])
      .extent([[0, 0], [innerWidth, innerHeight]])
      .iterations(layout.iterations);

    // ノードとリンクをディープコピー（d3-sankeyは元データを変更するため）
    const graph = {
      nodes: data.nodes.map(n => ({ ...n })),
      links: data.links.map(l => ({ ...l })),
    };

    return sankeyGenerator(graph);
  }

  // ===========================================================================
  // Private Methods - Rendering
  // ===========================================================================

  private renderNodes(nodes: ComputedNode[]): void {
    if (!this.nodeGroup) return;

    const { style, animation } = this.config;
    const self = this;

    const nodeSelection = this.nodeGroup
      .selectAll<SVGRectElement, ComputedNode>('rect')
      .data(nodes, d => d.id || '');

    // Enter
    const nodeEnter = nodeSelection.enter()
      .append('rect')
      .attr('x', d => d.x0 || 0)
      .attr('y', d => d.y0 || 0)
      .attr('width', d => (d.x1 || 0) - (d.x0 || 0))
      .attr('height', d => Math.max(1, (d.y1 || 0) - (d.y0 || 0)))
      .attr('fill', d => d.color || style.nodeColor)
      .attr('stroke', style.nodeStroke)
      .attr('stroke-width', style.nodeStrokeWidth)
      .attr('opacity', animation.enterAnimation ? 0 : 1)
      .attr('cursor', 'pointer');

    // Event handlers
    nodeEnter
      .on('mouseenter', function(event, d) {
        self.handleNodeHover(d, event);
      })
      .on('mouseleave', function(event) {
        self.handleNodeHover(null, event);
      })
      .on('click', function(event, d) {
        self.handleNodeClick(d, event);
      });

    // Enter animation
    if (animation.enabled && animation.enterAnimation) {
      nodeEnter
        .transition()
        .duration(animation.duration)
        .attr('opacity', 1);
    }

    // Exit
    nodeSelection.exit().remove();
  }

  private renderLinks(links: ComputedLink[]): void {
    if (!this.linkGroup) return;

    const { style, animation } = this.config;
    const self = this;

    const linkPath = sankeyLinkHorizontal();

    const linkSelection = this.linkGroup
      .selectAll<SVGPathElement, ComputedLink>('path')
      .data(links, d => `${(d.source as ComputedNode).id}-${(d.target as ComputedNode).id}`);

    // Enter
    const linkEnter = linkSelection.enter()
      .append('path')
      .attr('d', linkPath)
      .attr('fill', 'none')
      .attr('stroke', d => this.getLinkColor(d))
      .attr('stroke-width', d => Math.max(1, d.width || 0))
      .attr('stroke-opacity', animation.enterAnimation ? 0 : style.linkOpacity);

    // Event handlers
    linkEnter
      .on('mouseenter', function(event, d) {
        self.handleLinkHover(d, event);
      })
      .on('mouseleave', function(event) {
        self.handleLinkHover(null, event);
      })
      .on('click', function(event, d) {
        self.handleLinkClick(d, event);
      });

    // Enter animation
    if (animation.enabled && animation.enterAnimation) {
      linkEnter
        .transition()
        .duration(animation.duration)
        .attr('stroke-opacity', style.linkOpacity);
    }

    // Exit
    linkSelection.exit().remove();
  }

  private renderLabels(nodes: ComputedNode[]): void {
    if (!this.labelGroup) return;

    const { style, layout, margin, width } = this.config;
    const innerWidth = width - margin.left - margin.right;

    const labelSelection = this.labelGroup
      .selectAll<SVGTextElement, ComputedNode>('text')
      .data(nodes, d => d.id || '');

    // Enter
    labelSelection.enter()
      .append('text')
      .attr('x', d => {
        const x0 = d.x0 || 0;
        const x1 = d.x1 || 0;
        // 左側ノードは右にラベル、右側ノードは左にラベル
        return x0 < innerWidth / 2 ? x1 + 6 : x0 - 6;
      })
      .attr('y', d => ((d.y0 || 0) + (d.y1 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 || 0) < innerWidth / 2 ? 'start' : 'end')
      .attr('font-size', style.labelFontSize)
      .attr('font-family', style.labelFontFamily)
      .attr('fill', style.labelColor)
      .text(d => d.name);

    // Exit
    labelSelection.exit().remove();
  }

  // ===========================================================================
  // Private Methods - Transitions
  // ===========================================================================

  private transitionNodes(nodes: ComputedNode[]): void {
    if (!this.nodeGroup) return;

    const { style, animation } = this.config;
    const duration = animation.enabled ? animation.duration : 0;

    this.nodeGroup
      .selectAll<SVGRectElement, ComputedNode>('rect')
      .data(nodes, d => d.id || '')
      .transition()
      .duration(duration)
      .attr('x', d => d.x0 || 0)
      .attr('y', d => d.y0 || 0)
      .attr('width', d => (d.x1 || 0) - (d.x0 || 0))
      .attr('height', d => Math.max(1, (d.y1 || 0) - (d.y0 || 0)))
      .attr('fill', d => d.color || style.nodeColor);
  }

  private transitionLinks(links: ComputedLink[]): void {
    if (!this.linkGroup) return;

    const { animation } = this.config;
    const duration = animation.enabled ? animation.duration : 0;
    const linkPath = sankeyLinkHorizontal();

    this.linkGroup
      .selectAll<SVGPathElement, ComputedLink>('path')
      .data(links, d => `${(d.source as ComputedNode).id}-${(d.target as ComputedNode).id}`)
      .transition()
      .duration(duration)
      .attr('d', linkPath)
      .attr('stroke', d => this.getLinkColor(d))
      .attr('stroke-width', d => Math.max(1, d.width || 0));
  }

  private transitionLabels(nodes: ComputedNode[]): void {
    if (!this.labelGroup) return;

    const { animation, margin, width } = this.config;
    const duration = animation.enabled ? animation.duration : 0;
    const innerWidth = width - margin.left - margin.right;

    this.labelGroup
      .selectAll<SVGTextElement, ComputedNode>('text')
      .data(nodes, d => d.id || '')
      .transition()
      .duration(duration)
      .attr('x', d => {
        const x0 = d.x0 || 0;
        const x1 = d.x1 || 0;
        return x0 < innerWidth / 2 ? x1 + 6 : x0 - 6;
      })
      .attr('y', d => ((d.y0 || 0) + (d.y1 || 0)) / 2)
      .attr('text-anchor', d => (d.x0 || 0) < innerWidth / 2 ? 'start' : 'end')
      .text(d => d.name);
  }

  // ===========================================================================
  // Private Methods - Event Handling
  // ===========================================================================

  private handleNodeHover(node: ComputedNode | null, event: MouseEvent): void {
    if (!this.config.interaction.enableHover) return;

    if (node) {
      this.highlight([node.id || '']);
    } else {
      this.clearHighlight();
    }

    this.eventHandlers.onNodeHover?.(node, event);
  }

  private handleNodeClick(node: ComputedNode, event: MouseEvent): void {
    if (!this.config.interaction.enableClick) return;
    this.eventHandlers.onNodeClick?.(node, event);
  }

  private handleLinkHover(link: ComputedLink | null, event: MouseEvent): void {
    if (!this.config.interaction.enableHover) return;

    if (link) {
      const sourceId = (link.source as ComputedNode).id || '';
      const targetId = (link.target as ComputedNode).id || '';
      this.highlight([sourceId, targetId]);
    } else {
      this.clearHighlight();
    }

    this.eventHandlers.onLinkHover?.(link, event);
  }

  private handleLinkClick(link: ComputedLink, event: MouseEvent): void {
    if (!this.config.interaction.enableClick) return;
    this.eventHandlers.onLinkClick?.(link, event);
  }

  // ===========================================================================
  // Private Methods - Utilities
  // ===========================================================================

  private getLinkColor(link: ComputedLink): string {
    const { style } = this.config;

    switch (style.linkColorMode) {
      case 'source':
        return (link.source as ComputedNode).color || style.linkColor;
      case 'target':
        return (link.target as ComputedNode).color || style.linkColor;
      case 'gradient':
        // SVGのlinearGradientを使用（実装省略）
        return style.linkColor;
      case 'fixed':
      default:
        return link.color || style.linkColor;
    }
  }

  private validateData(data: SankeyData): void {
    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('SankeyEngine: data.nodes must be an array');
    }
    if (!data.links || !Array.isArray(data.links)) {
      throw new Error('SankeyEngine: data.links must be an array');
    }

    const nodeIds = new Set(data.nodes.map(n => n.id));

    for (const link of data.links) {
      if (!nodeIds.has(link.source)) {
        throw new Error(`SankeyEngine: Link source "${link.source}" not found in nodes`);
      }
      if (!nodeIds.has(link.target)) {
        throw new Error(`SankeyEngine: Link target "${link.target}" not found in nodes`);
      }
      if (link.value <= 0) {
        console.warn(`SankeyEngine: Link value should be positive: ${link.source} -> ${link.target}`);
      }
    }
  }

  private mergeConfig(partial: Partial<SankeyChartConfig>): SankeyChartConfig {
    // 簡易的なディープマージ（実際はlodash.mergeを推奨）
    const defaultConfig: SankeyChartConfig = {
      width: 800,
      height: 600,
      margin: { top: 20, right: 120, bottom: 20, left: 120 },
      layout: {
        nodeWidth: 24,
        nodePadding: 16,
        nodeAlignment: 'justify',
        iterations: 32,
      },
      interaction: {
        enableHover: true,
        enableClick: true,
        enableTooltip: true,
        enableNodeDrag: false,
        fadeOpacity: 0.2,
      },
      animation: {
        enabled: true,
        duration: 500,
        easing: 'easeCubic',
        enterAnimation: true,
      },
      style: {
        nodeColor: '#1f77b4',
        nodeStroke: '#000',
        nodeStrokeWidth: 0,
        linkColor: '#aaa',
        linkOpacity: 0.5,
        linkColorMode: 'source',
        labelFontSize: 12,
        labelFontFamily: 'Segoe UI, sans-serif',
        labelColor: '#333',
      },
    };

    return {
      ...defaultConfig,
      ...partial,
      margin: { ...defaultConfig.margin, ...partial.margin },
      layout: { ...defaultConfig.layout, ...partial.layout },
      interaction: { ...defaultConfig.interaction, ...partial.interaction },
      animation: { ...defaultConfig.animation, ...partial.animation },
      style: { ...defaultConfig.style, ...partial.style },
      powerbi: partial.powerbi,
    };
  }
}

// =============================================================================
// Factory Function (便利なショートカット)
// =============================================================================

export function createSankeyEngine(
  config?: Partial<SankeyChartConfig>,
  handlers?: SankeyEventHandlers
): SankeyEngine {
  return new SankeyEngine(config, handlers);
}
