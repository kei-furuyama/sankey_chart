/**
 * Sankey Chart SVG レンダラー
 *
 * 【SVG vs Canvas の選択理由】
 * SVGを採用する理由:
 * 1. インタラクション: DOM要素として個別にイベントハンドリング可能
 * 2. スタイリング: CSSで柔軟にスタイル適用可能
 * 3. アクセシビリティ: セマンティックな要素、スクリーンリーダー対応
 * 4. デバッグ: DevToolsでの要素検証が容易
 * 5. アニメーション: CSS/SVG transitionとD3 transitionの両方使用可能
 * 6. Power BI互換性: Power BIのビジュアルはSVGベースが標準
 *
 * Canvasが適する場合:
 * - ノード/リンクが数千以上の大規模データ
 * - 60fps以上の高速アニメーションが必要
 * - メモリ制約が厳しい環境
 */

import * as d3 from 'd3';
import type {
  SankeyChartConfig,
  ComputedGraph,
  ComputedNode,
  ComputedLink,
  SankeyEventHandlers,
} from '../types';
import { SankeyLayout } from './SankeyLayout';

// ============================================================
// イージング関数マッピング
// ============================================================

const EASING_MAP = {
  linear: d3.easeLinear,
  easeInOut: d3.easeQuadInOut,
  easeCubic: d3.easeCubicInOut,
  easeElastic: d3.easeElasticOut,
} as const;

// ============================================================
// SankeyRenderer クラス
// ============================================================

export class SankeyRenderer {
  private container: HTMLElement;
  private config: SankeyChartConfig;
  private layout: SankeyLayout;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private graph: ComputedGraph | null = null;
  private eventHandlers: SankeyEventHandlers = {};

  // 選択状態管理
  private selectedNodes: Set<ComputedNode> = new Set();
  private hoveredNode: ComputedNode | null = null;
  private hoveredLink: ComputedLink | null = null;

  constructor(container: HTMLElement, config: SankeyChartConfig) {
    this.container = container;
    this.config = config;
    this.layout = new SankeyLayout(config);
    this.initializeSvg();
  }

  /**
   * SVGコンテナを初期化
   */
  private initializeSvg(): void {
    // 既存のSVGをクリア
    d3.select(this.container).selectAll('svg').remove();

    // SVG要素を作成
    this.svg = d3
      .select(this.container)
      .append('svg')
      .attr('width', this.config.width)
      .attr('height', this.config.height)
      .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('class', 'sankey-chart')
      .attr('role', 'img')
      .attr('aria-label', 'Sankey Diagram');

    // グラデーション定義用のdefs要素
    this.svg.append('defs');

    // レイヤー構造を作成（描画順序を制御）
    this.svg.append('g').attr('class', 'sankey-links');
    this.svg.append('g').attr('class', 'sankey-nodes');
    this.svg.append('g').attr('class', 'sankey-labels');
  }

  /**
   * イベントハンドラを設定
   */
  setEventHandlers(handlers: SankeyEventHandlers): void {
    this.eventHandlers = handlers;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<SankeyChartConfig>): void {
    const oldSize = { width: this.config.width, height: this.config.height };
    this.config = { ...this.config, ...config };
    this.layout.updateConfig(this.config);

    // サイズ変更時はSVGを更新
    if (this.config.width !== oldSize.width || this.config.height !== oldSize.height) {
      this.svg
        ?.attr('width', this.config.width)
        .attr('height', this.config.height)
        .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`);
    }
  }

  /**
   * データを描画
   */
  render(data: { nodes: any[]; links: any[] }): void {
    if (!this.svg) return;

    // レイアウト計算
    this.graph = this.layout.compute(data);

    // 描画実行
    this.renderLinks(this.graph.links);
    this.renderNodes(this.graph.nodes);
    this.renderLabels(this.graph.nodes);
  }

  /**
   * リンク（フロー）を描画
   *
   * 【アニメーション設計】
   * - Enter: strokeDashoffsetを使ったドローイングアニメーション
   * - Update: パス形状とstroke-widthのスムーズな遷移
   * - Exit: フェードアウト
   */
  private renderLinks(links: ComputedLink[]): void {
    const linksGroup = this.svg!.select<SVGGElement>('.sankey-links');
    const pathGenerator = this.layout.getLinkPathGenerator();
    const { animation, style, interaction } = this.config;

    // グラデーション定義を更新
    this.updateLinkGradients(links);

    // Data Join
    const linkSelection = linksGroup
      .selectAll<SVGPathElement, ComputedLink>('.sankey-link')
      .data(links, (d) => `${(d.source as ComputedNode).id}-${(d.target as ComputedNode).id}`);

    // Exit
    linkSelection
      .exit()
      .transition()
      .duration(animation.enabled ? animation.duration : 0)
      .style('opacity', 0)
      .remove();

    // Enter
    const enterLinks = linkSelection
      .enter()
      .append('path')
      .attr('class', 'sankey-link')
      .attr('d', pathGenerator)
      .attr('fill', 'none')
      .attr('stroke-width', (d) => Math.max(1, d.width ?? 0))
      .style('opacity', 0);

    // アニメーション: ドローイング効果
    if (animation.enabled && animation.enterAnimation) {
      enterLinks.each(function () {
        const path = this as SVGPathElement;
        const length = path.getTotalLength();
        d3.select(path)
          .attr('stroke-dasharray', `${length} ${length}`)
          .attr('stroke-dashoffset', length);
      });
    }

    // Enter + Update
    const allLinks = enterLinks.merge(linkSelection);

    // スタイル適用
    allLinks.attr('stroke', (d) => this.getLinkColor(d));

    // インタラクション設定
    if (interaction.enableHover || interaction.enableClick) {
      allLinks
        .style('cursor', 'pointer')
        .on('mouseenter', (event, d) => this.handleLinkHover(d, event))
        .on('mouseleave', (event) => this.handleLinkHover(null, event))
        .on('click', (event, d) => this.handleLinkClick(d, event));
    }

    // トランジション
    const t = d3
      .transition()
      .duration(animation.enabled ? animation.duration : 0)
      .ease(EASING_MAP[animation.easing]);

    allLinks
      .transition(t as any)
      .attr('d', pathGenerator)
      .attr('stroke-width', (d) => Math.max(1, d.width ?? 0))
      .attr('stroke-dashoffset', 0)
      .style('opacity', style.linkOpacity);
  }

  /**
   * ノード（バー）を描画
   */
  private renderNodes(nodes: ComputedNode[]): void {
    const nodesGroup = this.svg!.select<SVGGElement>('.sankey-nodes');
    const { animation, style, interaction } = this.config;

    // Data Join
    const nodeSelection = nodesGroup
      .selectAll<SVGRectElement, ComputedNode>('.sankey-node')
      .data(nodes, (d) => d.id);

    // Exit
    nodeSelection
      .exit()
      .transition()
      .duration(animation.enabled ? animation.duration : 0)
      .style('opacity', 0)
      .attr('height', 0)
      .remove();

    // Enter
    const enterNodes = nodeSelection
      .enter()
      .append('rect')
      .attr('class', 'sankey-node')
      .attr('x', (d) => d.x0 ?? 0)
      .attr('y', (d) => d.y0 ?? 0)
      .attr('width', (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', 0) // アニメーション用: 高さ0から開始
      .attr('rx', 2) // 角丸
      .attr('ry', 2);

    // Enter + Update
    const allNodes = enterNodes.merge(nodeSelection);

    // スタイル適用
    allNodes
      .attr('fill', (d) => d.color ?? style.nodeColor)
      .attr('stroke', style.nodeStroke)
      .attr('stroke-width', style.nodeStrokeWidth);

    // インタラクション設定
    if (interaction.enableHover || interaction.enableClick) {
      allNodes
        .style('cursor', 'pointer')
        .on('mouseenter', (event, d) => this.handleNodeHover(d, event))
        .on('mouseleave', (event) => this.handleNodeHover(null, event))
        .on('click', (event, d) => this.handleNodeClick(d, event));
    }

    // トランジション
    const t = d3
      .transition()
      .duration(animation.enabled ? animation.duration : 0)
      .ease(EASING_MAP[animation.easing]);

    allNodes
      .transition(t as any)
      .attr('x', (d) => d.x0 ?? 0)
      .attr('y', (d) => d.y0 ?? 0)
      .attr('width', (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', (d) => (d.y1 ?? 0) - (d.y0 ?? 0));
  }

  /**
   * ラベルを描画
   */
  private renderLabels(nodes: ComputedNode[]): void {
    const labelsGroup = this.svg!.select<SVGGElement>('.sankey-labels');
    const { animation, style, width, margin } = this.config;

    // Data Join
    const labelSelection = labelsGroup
      .selectAll<SVGTextElement, ComputedNode>('.sankey-label')
      .data(nodes, (d) => d.id);

    // Exit
    labelSelection
      .exit()
      .transition()
      .duration(animation.enabled ? animation.duration : 0)
      .style('opacity', 0)
      .remove();

    // Enter
    const enterLabels = labelSelection
      .enter()
      .append('text')
      .attr('class', 'sankey-label')
      .style('opacity', 0);

    // Enter + Update
    const allLabels = enterLabels.merge(labelSelection);

    // スタイル適用
    allLabels
      .attr('font-size', style.labelFontSize)
      .attr('font-family', style.labelFontFamily)
      .attr('fill', style.labelColor)
      .attr('dy', '0.35em') // 垂直中央揃え
      .text((d) => d.name);

    // 位置計算（左側ノードは右に、右側ノードは左にラベル配置）
    const innerWidth = width - margin.left - margin.right;

    allLabels
      .attr('x', (d) => {
        const nodeX = d.x0 ?? 0;
        const nodeWidth = (d.x1 ?? 0) - nodeX;
        // ノードが左半分にある場合は右側に、右半分にある場合は左側にラベル
        if (nodeX < margin.left + innerWidth / 2) {
          return (d.x1 ?? 0) + 6;
        } else {
          return (d.x0 ?? 0) - 6;
        }
      })
      .attr('text-anchor', (d) => {
        const nodeX = d.x0 ?? 0;
        if (nodeX < margin.left + innerWidth / 2) {
          return 'start';
        } else {
          return 'end';
        }
      })
      .attr('y', (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2);

    // トランジション
    const t = d3
      .transition()
      .duration(animation.enabled ? animation.duration : 0)
      .ease(EASING_MAP[animation.easing]);

    allLabels.transition(t as any).style('opacity', 1);
  }

  /**
   * リンクのグラデーション定義を更新
   */
  private updateLinkGradients(links: ComputedLink[]): void {
    if (this.config.style.linkColorMode !== 'gradient') return;

    const defs = this.svg!.select('defs');

    const gradients = defs
      .selectAll<SVGLinearGradientElement, ComputedLink>('linearGradient')
      .data(links, (d) => `gradient-${(d.source as ComputedNode).id}-${(d.target as ComputedNode).id}`);

    gradients.exit().remove();

    const enterGradients = gradients
      .enter()
      .append('linearGradient')
      .attr('id', (d) => `gradient-${(d.source as ComputedNode).id}-${(d.target as ComputedNode).id}`)
      .attr('gradientUnits', 'userSpaceOnUse');

    const allGradients = enterGradients.merge(gradients);

    allGradients
      .attr('x1', (d) => (d.source as ComputedNode).x1 ?? 0)
      .attr('x2', (d) => (d.target as ComputedNode).x0 ?? 0);

    // ソースカラー
    allGradients
      .selectAll('stop.source')
      .data((d) => [d])
      .join('stop')
      .attr('class', 'source')
      .attr('offset', '0%')
      .attr('stop-color', (d) => (d.source as ComputedNode).color ?? this.config.style.nodeColor);

    // ターゲットカラー
    allGradients
      .selectAll('stop.target')
      .data((d) => [d])
      .join('stop')
      .attr('class', 'target')
      .attr('offset', '100%')
      .attr('stop-color', (d) => (d.target as ComputedNode).color ?? this.config.style.nodeColor);
  }

  /**
   * リンクの色を取得
   */
  private getLinkColor(link: ComputedLink): string {
    const { style } = this.config;

    if (link.color) return link.color;

    switch (style.linkColorMode) {
      case 'source':
        return (link.source as ComputedNode).color ?? style.nodeColor;
      case 'target':
        return (link.target as ComputedNode).color ?? style.nodeColor;
      case 'gradient':
        return `url(#gradient-${(link.source as ComputedNode).id}-${(link.target as ComputedNode).id})`;
      case 'fixed':
      default:
        return style.linkColor;
    }
  }

  // ============================================================
  // インタラクションハンドラー
  // ============================================================

  /**
   * ノードホバー処理
   *
   * 【ハイライト設計】
   * - ホバーしたノードと接続されたリンク/ノードを強調
   * - 非関連要素は透明度を下げる（fadeOpacity）
   */
  private handleNodeHover(node: ComputedNode | null, event: MouseEvent): void {
    this.hoveredNode = node;

    if (this.config.interaction.enableHover) {
      this.updateHighlight();
    }

    this.eventHandlers.onNodeHover?.(node, event);
  }

  /**
   * ノードクリック処理
   */
  private handleNodeClick(node: ComputedNode, event: MouseEvent): void {
    if (!this.config.interaction.enableClick) return;

    // 選択状態をトグル
    if (this.selectedNodes.has(node)) {
      this.selectedNodes.delete(node);
    } else {
      // Shiftキーで複数選択、それ以外は単一選択
      if (!event.shiftKey) {
        this.selectedNodes.clear();
      }
      this.selectedNodes.add(node);
    }

    this.updateHighlight();
    this.eventHandlers.onNodeClick?.(node, event);
    this.notifySelectionChange();
  }

  /**
   * リンクホバー処理
   */
  private handleLinkHover(link: ComputedLink | null, event: MouseEvent): void {
    this.hoveredLink = link;

    if (this.config.interaction.enableHover) {
      this.updateHighlight();
    }

    this.eventHandlers.onLinkHover?.(link, event);
  }

  /**
   * リンククリック処理
   */
  private handleLinkClick(link: ComputedLink, event: MouseEvent): void {
    if (!this.config.interaction.enableClick) return;
    this.eventHandlers.onLinkClick?.(link, event);
  }

  /**
   * ハイライト状態を更新
   */
  private updateHighlight(): void {
    if (!this.graph) return;

    const { fadeOpacity } = this.config.interaction;
    const { linkOpacity } = this.config.style;

    // ハイライト対象を決定
    let highlightedNodes = new Set<ComputedNode>();
    let highlightedLinks = new Set<ComputedLink>();

    // ホバー中のノードがある場合
    if (this.hoveredNode) {
      highlightedNodes = this.layout.getConnectedNodes(this.hoveredNode);
      this.layout.getConnectedLinks(this.hoveredNode).forEach((l) => highlightedLinks.add(l));
    }

    // 選択中のノードがある場合
    this.selectedNodes.forEach((node) => {
      this.layout.getConnectedNodes(node).forEach((n) => highlightedNodes.add(n));
      this.layout.getConnectedLinks(node).forEach((l) => highlightedLinks.add(l));
    });

    // ホバー中のリンクがある場合
    if (this.hoveredLink) {
      highlightedLinks.add(this.hoveredLink);
      highlightedNodes.add(this.hoveredLink.source as ComputedNode);
      highlightedNodes.add(this.hoveredLink.target as ComputedNode);
    }

    const hasHighlight = highlightedNodes.size > 0 || highlightedLinks.size > 0;

    // ノードの透明度を更新
    this.svg!.selectAll<SVGRectElement, ComputedNode>('.sankey-node').style('opacity', (d) => {
      if (!hasHighlight) return 1;
      return highlightedNodes.has(d) ? 1 : fadeOpacity;
    });

    // リンクの透明度を更新
    this.svg!.selectAll<SVGPathElement, ComputedLink>('.sankey-link').style('opacity', (d) => {
      if (!hasHighlight) return linkOpacity;
      return highlightedLinks.has(d) ? linkOpacity : fadeOpacity * linkOpacity;
    });

    // ラベルの透明度を更新
    this.svg!.selectAll<SVGTextElement, ComputedNode>('.sankey-label').style('opacity', (d) => {
      if (!hasHighlight) return 1;
      return highlightedNodes.has(d) ? 1 : fadeOpacity;
    });
  }

  /**
   * 選択変更を通知
   */
  private notifySelectionChange(): void {
    if (!this.graph || !this.eventHandlers.onSelectionChange) return;

    const selectedLinks: ComputedLink[] = [];
    this.selectedNodes.forEach((node) => {
      this.layout.getConnectedLinks(node).forEach((link) => {
        if (!selectedLinks.includes(link)) {
          selectedLinks.push(link);
        }
      });
    });

    this.eventHandlers.onSelectionChange(Array.from(this.selectedNodes), selectedLinks);
  }

  /**
   * 選択をクリア
   */
  clearSelection(): void {
    this.selectedNodes.clear();
    this.updateHighlight();
    this.notifySelectionChange();
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    this.svg?.remove();
    this.svg = null;
    this.graph = null;
  }
}

// ============================================================
// ファクトリー関数
// ============================================================

export function createSankeyRenderer(
  container: HTMLElement,
  config: SankeyChartConfig
): SankeyRenderer {
  return new SankeyRenderer(container, config);
}
