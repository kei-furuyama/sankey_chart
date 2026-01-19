/**
 * SVG Renderer for Sankey Chart
 * 仮想化対応のSVGレンダラー
 *
 * 特徴:
 * - ビューポート外の要素を描画しない（仮想化）
 * - D3 selection による差分更新
 * - CSS アニメーション対応
 * - アクセシビリティ対応
 */

import * as d3 from 'd3';
import { sankeyLinkHorizontal } from 'd3-sankey';
import type {
  ComputedGraph,
  ComputedNode,
  ComputedLink,
  SankeyStyleConfig,
  SankeyPerformanceConfig,
  SankeyAnimationConfig,
} from '../types';

// ============================================================
// Types
// ============================================================

export interface SVGRendererOptions {
  /** SVGコンテナ要素 */
  container: HTMLElement;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** マージン */
  margin: { top: number; right: number; bottom: number; left: number };
  /** スタイル設定 */
  style: SankeyStyleConfig;
  /** パフォーマンス設定 */
  performance: SankeyPerformanceConfig;
  /** アニメーション設定 */
  animation: SankeyAnimationConfig;
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderStats {
  totalTime: number;
  nodesRendered: number;
  nodesSkipped: number;
  linksRendered: number;
  linksSkipped: number;
}

// ============================================================
// SVG Renderer Class
// ============================================================

export class SVGRenderer {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private defsGroup: d3.Selection<SVGDefsElement, unknown, null, undefined>;
  private linksGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private nodesGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private labelsGroup: d3.Selection<SVGGElement, unknown, null, undefined>;

  private width: number;
  private height: number;
  private margin: { top: number; right: number; bottom: number; left: number };
  private style: SankeyStyleConfig;
  private performance: SankeyPerformanceConfig;
  private animation: SankeyAnimationConfig;

  private viewport: Viewport;
  private currentGraph: ComputedGraph | null = null;
  private pathCache = new Map<number, string>();

  // グラデーション用
  private gradientIds = new Map<string, string>();
  private gradientCounter = 0;

  constructor(options: SVGRendererOptions) {
    this.container = options.container;
    this.width = options.width;
    this.height = options.height;
    this.margin = options.margin;
    this.style = options.style;
    this.performance = options.performance;
    this.animation = options.animation;

    // 初期ビューポート
    this.viewport = {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
    };

    // SVG構築
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('role', 'img')
      .attr('aria-label', 'Sankey Diagram');

    // Defs（グラデーション用）
    this.defsGroup = this.svg.append('defs');

    // メイングループ（マージン適用）
    this.mainGroup = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // レイヤー
    this.linksGroup = this.mainGroup.append('g').attr('class', 'sankey-links');
    this.nodesGroup = this.mainGroup.append('g').attr('class', 'sankey-nodes');
    this.labelsGroup = this.mainGroup.append('g').attr('class', 'sankey-labels');
  }

  /**
   * サイズ変更
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    this.svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    this.viewport = {
      x: 0,
      y: 0,
      width: width - this.margin.left - this.margin.right,
      height: height - this.margin.top - this.margin.bottom,
    };

    this.pathCache.clear();
  }

  /**
   * ビューポート更新（スクロール/ズーム時）
   */
  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
    if (this.currentGraph && this.performance.virtualizationThreshold > 0) {
      this.render(this.currentGraph);
    }
  }

  /**
   * メインレンダリング
   */
  render(graph: ComputedGraph): RenderStats {
    const startTime = performance.now();
    this.currentGraph = graph;

    const shouldVirtualize =
      this.performance.virtualizationThreshold > 0 &&
      graph.nodes.length >= this.performance.virtualizationThreshold;

    // 仮想化：ビューポート内の要素のみフィルタ
    let visibleNodes: ComputedNode[];
    let visibleLinks: ComputedLink[];
    let nodesSkipped = 0;
    let linksSkipped = 0;

    if (shouldVirtualize) {
      const nodeFilter = this.createNodeFilter();
      const linkFilter = this.createLinkFilter();

      visibleNodes = graph.nodes.filter((node, i) => {
        if (nodeFilter(node)) return true;
        nodesSkipped++;
        return false;
      });

      visibleLinks = graph.links.filter((link, i) => {
        if (linkFilter(link)) return true;
        linksSkipped++;
        return false;
      });
    } else {
      visibleNodes = graph.nodes;
      visibleLinks = graph.links;
    }

    // グラデーション生成
    if (this.style.linkColorMode === 'gradient') {
      this.updateGradients(visibleLinks);
    }

    // リンク描画
    this.renderLinks(visibleLinks, graph.links);

    // ノード描画
    this.renderNodes(visibleNodes, graph.nodes);

    // ラベル描画
    this.renderLabels(visibleNodes, graph.nodes);

    return {
      totalTime: performance.now() - startTime,
      nodesRendered: visibleNodes.length,
      nodesSkipped,
      linksRendered: visibleLinks.length,
      linksSkipped,
    };
  }

  /**
   * リンクの描画
   */
  private renderLinks(visibleLinks: ComputedLink[], allLinks: ComputedLink[]): void {
    const pathGenerator = sankeyLinkHorizontal();
    const duration = this.animation.enabled ? this.animation.duration : 0;

    // Data join
    const links = this.linksGroup
      .selectAll<SVGPathElement, ComputedLink>('path.sankey-link')
      .data(visibleLinks, (d, i) => `link-${allLinks.indexOf(d)}`);

    // Exit
    links.exit()
      .transition()
      .duration(duration)
      .style('opacity', 0)
      .remove();

    // Enter
    const linksEnter = links.enter()
      .append('path')
      .attr('class', 'sankey-link')
      .style('fill', 'none')
      .style('stroke-opacity', this.animation.enterAnimation ? 0 : this.style.linkOpacity);

    // Enter + Update
    const linksUpdate = linksEnter.merge(links);

    linksUpdate
      .transition()
      .duration(duration)
      .attr('d', d => {
        const index = allLinks.indexOf(d);
        if (this.performance.enablePathCache) {
          let cached = this.pathCache.get(index);
          if (!cached) {
            cached = pathGenerator(d) ?? '';
            this.pathCache.set(index, cached);
          }
          return cached;
        }
        return pathGenerator(d) ?? '';
      })
      .style('stroke', d => this.getLinkColor(d, allLinks.indexOf(d)))
      .style('stroke-width', d => Math.max(1, d.width ?? 1))
      .style('stroke-opacity', this.style.linkOpacity);
  }

  /**
   * ノードの描画
   */
  private renderNodes(visibleNodes: ComputedNode[], allNodes: ComputedNode[]): void {
    const duration = this.animation.enabled ? this.animation.duration : 0;

    // Data join
    const nodes = this.nodesGroup
      .selectAll<SVGRectElement, ComputedNode>('rect.sankey-node')
      .data(visibleNodes, (d, i) => `node-${d.id ?? allNodes.indexOf(d)}`);

    // Exit
    nodes.exit()
      .transition()
      .duration(duration)
      .style('opacity', 0)
      .remove();

    // Enter
    const nodesEnter = nodes.enter()
      .append('rect')
      .attr('class', 'sankey-node')
      .style('opacity', this.animation.enterAnimation ? 0 : 1);

    // Enter + Update
    const nodesUpdate = nodesEnter.merge(nodes);

    nodesUpdate
      .transition()
      .duration(duration)
      .attr('x', d => d.x0 ?? 0)
      .attr('y', d => d.y0 ?? 0)
      .attr('width', d => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', d => (d.y1 ?? 0) - (d.y0 ?? 0))
      .style('fill', d => d.color ?? this.style.nodeColor)
      .style('stroke', this.style.nodeStroke)
      .style('stroke-width', this.style.nodeStrokeWidth)
      .style('opacity', 1);

    // ARIA属性
    nodesUpdate
      .attr('role', 'listitem')
      .attr('aria-label', d => `${d.name}: ${d.value ?? 0}`);
  }

  /**
   * ラベルの描画
   */
  private renderLabels(visibleNodes: ComputedNode[], allNodes: ComputedNode[]): void {
    const duration = this.animation.enabled ? this.animation.duration : 0;
    const innerWidth = this.width - this.margin.left - this.margin.right;

    // Data join
    const labels = this.labelsGroup
      .selectAll<SVGTextElement, ComputedNode>('text.sankey-label')
      .data(visibleNodes, (d, i) => `label-${d.id ?? allNodes.indexOf(d)}`);

    // Exit
    labels.exit()
      .transition()
      .duration(duration)
      .style('opacity', 0)
      .remove();

    // Enter
    const labelsEnter = labels.enter()
      .append('text')
      .attr('class', 'sankey-label')
      .style('opacity', this.animation.enterAnimation ? 0 : 1);

    // Enter + Update
    const labelsUpdate = labelsEnter.merge(labels);

    labelsUpdate
      .transition()
      .duration(duration)
      .attr('x', d => {
        const x0 = d.x0 ?? 0;
        const x1 = d.x1 ?? 0;
        const isLeft = x0 < innerWidth / 2;
        return isLeft ? x1 + 6 : x0 - 6;
      })
      .attr('y', d => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => {
        const x0 = d.x0 ?? 0;
        return x0 < innerWidth / 2 ? 'start' : 'end';
      })
      .style('font-size', `${this.style.labelFontSize}px`)
      .style('font-family', this.style.labelFontFamily)
      .style('fill', this.style.labelColor)
      .style('opacity', 1)
      .text(d => d.name);
  }

  /**
   * グラデーション定義の更新
   */
  private updateGradients(links: ComputedLink[]): void {
    // 既存のグラデーションをクリア
    this.defsGroup.selectAll('linearGradient').remove();
    this.gradientIds.clear();

    for (const link of links) {
      const sourceNode = link.source as ComputedNode;
      const targetNode = link.target as ComputedNode;
      const sourceColor = sourceNode.color ?? this.style.nodeColor;
      const targetColor = targetNode.color ?? this.style.nodeColor;

      const key = `${sourceColor}-${targetColor}`;
      if (!this.gradientIds.has(key)) {
        const id = `gradient-${this.gradientCounter++}`;
        this.gradientIds.set(key, id);

        const gradient = this.defsGroup.append('linearGradient')
          .attr('id', id)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', sourceNode.x1 ?? 0)
          .attr('x2', targetNode.x0 ?? 0);

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', sourceColor);

        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', targetColor);
      }
    }
  }

  /**
   * リンク色の取得
   */
  private getLinkColor(link: ComputedLink, index: number): string {
    if (link.color) return link.color;

    const sourceNode = link.source as ComputedNode;
    const targetNode = link.target as ComputedNode;

    switch (this.style.linkColorMode) {
      case 'source':
        return sourceNode.color ?? this.style.linkColor;
      case 'target':
        return targetNode.color ?? this.style.linkColor;
      case 'gradient': {
        const sourceColor = sourceNode.color ?? this.style.nodeColor;
        const targetColor = targetNode.color ?? this.style.nodeColor;
        const key = `${sourceColor}-${targetColor}`;
        const gradientId = this.gradientIds.get(key);
        return gradientId ? `url(#${gradientId})` : this.style.linkColor;
      }
      default:
        return this.style.linkColor;
    }
  }

  /**
   * ノードフィルター生成（仮想化用）
   */
  private createNodeFilter(): (node: ComputedNode) => boolean {
    const vp = this.viewport;
    const margin = 50; // バッファ

    return (node: ComputedNode) => {
      const x0 = node.x0 ?? 0;
      const y0 = node.y0 ?? 0;
      const x1 = node.x1 ?? 0;
      const y1 = node.y1 ?? 0;

      return !(
        x1 < vp.x - margin ||
        x0 > vp.x + vp.width + margin ||
        y1 < vp.y - margin ||
        y0 > vp.y + vp.height + margin
      );
    };
  }

  /**
   * リンクフィルター生成（仮想化用）
   */
  private createLinkFilter(): (link: ComputedLink) => boolean {
    const vp = this.viewport;
    const margin = 50;

    return (link: ComputedLink) => {
      const sourceNode = link.source as ComputedNode;
      const targetNode = link.target as ComputedNode;

      const minX = Math.min(sourceNode.x0 ?? 0, targetNode.x0 ?? 0);
      const maxX = Math.max(sourceNode.x1 ?? 0, targetNode.x1 ?? 0);
      const minY = Math.min(
        (link.y0 ?? 0) - (link.width ?? 0) / 2,
        (link.y1 ?? 0) - (link.width ?? 0) / 2
      );
      const maxY = Math.max(
        (link.y0 ?? 0) + (link.width ?? 0) / 2,
        (link.y1 ?? 0) + (link.width ?? 0) / 2
      );

      return !(
        maxX < vp.x - margin ||
        minX > vp.x + vp.width + margin ||
        maxY < vp.y - margin ||
        minY > vp.y + vp.height + margin
      );
    };
  }

  /**
   * ハイライト設定
   */
  highlight(
    nodeIndices: number[],
    linkIndices: number[],
    fadeOthers: boolean,
    fadeOpacity: number
  ): void {
    if (!this.currentGraph) return;

    const duration = this.animation.enabled ? this.animation.duration / 2 : 0;
    const nodeSet = new Set(nodeIndices);
    const linkSet = new Set(linkIndices);

    // ノードのハイライト
    this.nodesGroup.selectAll<SVGRectElement, ComputedNode>('rect.sankey-node')
      .transition()
      .duration(duration)
      .style('opacity', (d, i) => {
        if (!fadeOthers) return 1;
        return nodeSet.has(i) ? 1 : fadeOpacity;
      });

    // リンクのハイライト
    this.linksGroup.selectAll<SVGPathElement, ComputedLink>('path.sankey-link')
      .transition()
      .duration(duration)
      .style('stroke-opacity', (d, i) => {
        if (!fadeOthers) return this.style.linkOpacity;
        return linkSet.has(i) ? this.style.linkOpacity : fadeOpacity * this.style.linkOpacity;
      });

    // ラベルのハイライト
    this.labelsGroup.selectAll<SVGTextElement, ComputedNode>('text.sankey-label')
      .transition()
      .duration(duration)
      .style('opacity', (d, i) => {
        if (!fadeOthers) return 1;
        return nodeSet.has(i) ? 1 : fadeOpacity;
      });
  }

  /**
   * ハイライト解除
   */
  clearHighlight(): void {
    const duration = this.animation.enabled ? this.animation.duration / 2 : 0;

    this.nodesGroup.selectAll('rect.sankey-node')
      .transition()
      .duration(duration)
      .style('opacity', 1);

    this.linksGroup.selectAll('path.sankey-link')
      .transition()
      .duration(duration)
      .style('stroke-opacity', this.style.linkOpacity);

    this.labelsGroup.selectAll('text.sankey-label')
      .transition()
      .duration(duration)
      .style('opacity', 1);
  }

  /**
   * SVG要素を取得
   */
  getSVGElement(): SVGSVGElement {
    return this.svg.node()!;
  }

  /**
   * リソースの解放
   */
  dispose(): void {
    this.svg.remove();
    this.pathCache.clear();
    this.gradientIds.clear();
    this.currentGraph = null;
  }
}
