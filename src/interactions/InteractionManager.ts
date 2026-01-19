/**
 * Sankey Chart Interaction Manager
 *
 * ホバー、選択、キーボードナビゲーションなどの
 * インタラクションロジックを管理
 */

import * as d3 from 'd3';
import { interactionStates, animation, accessibility, tooltip as tooltipConfig } from '../styles/design-tokens';

// =============================================================================
// 型定義
// =============================================================================

export interface SankeyNode {
  id: string;
  name: string;
  value: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  color?: string;
  sourceLinks?: SankeyLink[];
  targetLinks?: SankeyLink[];
}

export interface SankeyLink {
  source: SankeyNode | string;
  target: SankeyNode | string;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
}

export interface InteractionOptions {
  enableHover: boolean;
  enableClick: boolean;
  enableKeyboard: boolean;
  highlightConnected: boolean;
  multiSelect: boolean;
  tooltipDelay: number;
}

export interface InteractionState {
  hoveredNode: SankeyNode | null;
  hoveredLink: SankeyLink | null;
  selectedNodes: Set<string>;
  selectedLinks: Set<string>;
  focusedElement: HTMLElement | SVGElement | null;
}

// =============================================================================
// インタラクションマネージャークラス
// =============================================================================

export class InteractionManager {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private state: InteractionState;
  private options: InteractionOptions;
  private tooltipElement: HTMLElement | null = null;
  private tooltipTimeout: number | null = null;

  // コールバック
  private onNodeHover?: (node: SankeyNode | null) => void;
  private onNodeSelect?: (nodes: SankeyNode[]) => void;
  private onLinkHover?: (link: SankeyLink | null) => void;
  private onLinkSelect?: (links: SankeyLink[]) => void;

  constructor(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    options: Partial<InteractionOptions> = {}
  ) {
    this.svg = svg;
    this.options = {
      enableHover: true,
      enableClick: true,
      enableKeyboard: true,
      highlightConnected: true,
      multiSelect: false,
      tooltipDelay: tooltipConfig.animation.delay,
      ...options,
    };
    this.state = {
      hoveredNode: null,
      hoveredLink: null,
      selectedNodes: new Set(),
      selectedLinks: new Set(),
      focusedElement: null,
    };

    this.initializeAccessibility();
  }

  // ===========================================================================
  // 初期化
  // ===========================================================================

  private initializeAccessibility(): void {
    // SVGにARIA属性を追加
    this.svg
      .attr('role', 'img')
      .attr('aria-label', accessibility.ariaLabels.chart);

    // キーボードナビゲーション用のイベントリスナーを追加
    if (this.options.enableKeyboard) {
      this.svg.on('keydown', (event: KeyboardEvent) => {
        this.handleKeyboardNavigation(event);
      });
    }
  }

  // ===========================================================================
  // ノードインタラクション
  // ===========================================================================

  /**
   * ノードにインタラクションをバインド
   */
  public bindNodeInteractions(
    nodes: d3.Selection<SVGGElement, SankeyNode, SVGGElement, unknown>
  ): void {
    nodes
      .attr('tabindex', this.options.enableKeyboard ? 0 : -1)
      .attr('role', 'button')
      .attr('aria-label', (d) => accessibility.ariaLabels.node(d.name, d.value))
      .classed('sankey-node', true);

    if (this.options.enableHover) {
      nodes
        .on('mouseenter', (event, d) => this.handleNodeMouseEnter(event, d, nodes))
        .on('mouseleave', (event, d) => this.handleNodeMouseLeave(event, d, nodes))
        .on('mousemove', (event, d) => this.handleNodeMouseMove(event, d));
    }

    if (this.options.enableClick) {
      nodes.on('click', (event, d) => this.handleNodeClick(event, d, nodes));
    }

    if (this.options.enableKeyboard) {
      nodes
        .on('focus', (event, d) => this.handleNodeFocus(event, d, nodes))
        .on('blur', (event, d) => this.handleNodeBlur(event, d, nodes))
        .on('keydown', (event, d) => this.handleNodeKeydown(event, d, nodes));
    }
  }

  private handleNodeMouseEnter(
    event: MouseEvent,
    node: SankeyNode,
    nodes: d3.Selection<SVGGElement, SankeyNode, SVGGElement, unknown>
  ): void {
    this.state.hoveredNode = node;

    // ホバー中のノードをハイライト
    d3.select(event.currentTarget as SVGGElement).classed('highlighted', true);

    // 関連するフローをハイライト
    if (this.options.highlightConnected) {
      this.highlightConnectedElements(node, nodes);
    }

    // ツールチップを表示（遅延付き）
    this.scheduleTooltip(event, this.createNodeTooltipContent(node));

    // コールバック
    this.onNodeHover?.(node);
  }

  private handleNodeMouseLeave(
    event: MouseEvent,
    node: SankeyNode,
    nodes: d3.Selection<SVGGElement, SankeyNode, SVGGElement, unknown>
  ): void {
    this.state.hoveredNode = null;

    // ハイライトをクリア
    d3.select(event.currentTarget as SVGGElement).classed('highlighted', false);

    // 全要素のdimmed状態をクリア
    this.clearHighlights(nodes);

    // ツールチップを非表示
    this.hideTooltip();

    // コールバック
    this.onNodeHover?.(null);
  }

  private handleNodeMouseMove(event: MouseEvent, node: SankeyNode): void {
    this.updateTooltipPosition(event);
  }

  private handleNodeClick(
    event: MouseEvent,
    node: SankeyNode,
    nodes: d3.Selection<SVGGElement, SankeyNode, SVGGElement, unknown>
  ): void {
    event.stopPropagation();

    const nodeId = node.id;
    const isSelected = this.state.selectedNodes.has(nodeId);

    if (this.options.multiSelect && event.ctrlKey) {
      // 複数選択モード
      if (isSelected) {
        this.state.selectedNodes.delete(nodeId);
      } else {
        this.state.selectedNodes.add(nodeId);
      }
    } else {
      // 単一選択モード
      this.state.selectedNodes.clear();
      if (!isSelected) {
        this.state.selectedNodes.add(nodeId);
      }
    }

    // 選択状態を更新
    nodes.classed('selected', (d) => this.state.selectedNodes.has(d.id));

    // コールバック
    const selectedNodes = Array.from(this.state.selectedNodes).map((id) =>
      nodes.data().find((n) => n.id === id)!
    );
    this.onNodeSelect?.(selectedNodes);
  }

  private handleNodeFocus(
    event: FocusEvent,
    node: SankeyNode,
    nodes: d3.Selection<SVGGElement, SankeyNode, SVGGElement, unknown>
  ): void {
    this.state.focusedElement = event.currentTarget as SVGGElement;

    // ホバーと同様の効果
    if (this.options.highlightConnected) {
      this.highlightConnectedElements(node, nodes);
    }
  }

  private handleNodeBlur(
    event: FocusEvent,
    node: SankeyNode,
    nodes: d3.Selection<SVGGElement, SankeyNode, SVGGElement, unknown>
  ): void {
    this.state.focusedElement = null;
    this.clearHighlights(nodes);
  }

  private handleNodeKeydown(
    event: KeyboardEvent,
    node: SankeyNode,
    nodes: d3.Selection<SVGGElement, SankeyNode, SVGGElement, unknown>
  ): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.handleNodeClick(event as unknown as MouseEvent, node, nodes);
        break;
      case 'Escape':
        this.state.selectedNodes.clear();
        nodes.classed('selected', false);
        this.onNodeSelect?.([]);
        break;
    }
  }

  // ===========================================================================
  // リンクインタラクション
  // ===========================================================================

  /**
   * リンクにインタラクションをバインド
   */
  public bindLinkInteractions(
    links: d3.Selection<SVGPathElement, SankeyLink, SVGGElement, unknown>
  ): void {
    links
      .attr('tabindex', this.options.enableKeyboard ? 0 : -1)
      .attr('role', 'img')
      .attr('aria-label', (d) => {
        const sourceName = typeof d.source === 'string' ? d.source : d.source.name;
        const targetName = typeof d.target === 'string' ? d.target : d.target.name;
        return accessibility.ariaLabels.link(sourceName, targetName, d.value);
      })
      .classed('sankey-link', true);

    if (this.options.enableHover) {
      links
        .on('mouseenter', (event, d) => this.handleLinkMouseEnter(event, d, links))
        .on('mouseleave', (event, d) => this.handleLinkMouseLeave(event, d, links))
        .on('mousemove', (event, d) => this.handleLinkMouseMove(event, d));
    }

    if (this.options.enableClick) {
      links.on('click', (event, d) => this.handleLinkClick(event, d, links));
    }
  }

  private handleLinkMouseEnter(
    event: MouseEvent,
    link: SankeyLink,
    links: d3.Selection<SVGPathElement, SankeyLink, SVGGElement, unknown>
  ): void {
    this.state.hoveredLink = link;

    // ホバー中のリンクをハイライト
    d3.select(event.currentTarget as SVGPathElement).classed('highlighted', true);

    // 他のリンクを薄暗く
    links.classed('dimmed', (d) => d !== link);

    // ツールチップを表示
    this.scheduleTooltip(event, this.createLinkTooltipContent(link));

    // コールバック
    this.onLinkHover?.(link);
  }

  private handleLinkMouseLeave(
    event: MouseEvent,
    link: SankeyLink,
    links: d3.Selection<SVGPathElement, SankeyLink, SVGGElement, unknown>
  ): void {
    this.state.hoveredLink = null;

    // ハイライトをクリア
    d3.select(event.currentTarget as SVGPathElement).classed('highlighted', false);
    links.classed('dimmed', false);

    // ツールチップを非表示
    this.hideTooltip();

    // コールバック
    this.onLinkHover?.(null);
  }

  private handleLinkMouseMove(event: MouseEvent, link: SankeyLink): void {
    this.updateTooltipPosition(event);
  }

  private handleLinkClick(
    event: MouseEvent,
    link: SankeyLink,
    links: d3.Selection<SVGPathElement, SankeyLink, SVGGElement, unknown>
  ): void {
    event.stopPropagation();

    const linkId = this.getLinkId(link);
    const isSelected = this.state.selectedLinks.has(linkId);

    if (this.options.multiSelect && event.ctrlKey) {
      if (isSelected) {
        this.state.selectedLinks.delete(linkId);
      } else {
        this.state.selectedLinks.add(linkId);
      }
    } else {
      this.state.selectedLinks.clear();
      if (!isSelected) {
        this.state.selectedLinks.add(linkId);
      }
    }

    // 選択状態を更新
    links.classed('selected', (d) => this.state.selectedLinks.has(this.getLinkId(d)));

    // コールバック
    const selectedLinks = Array.from(this.state.selectedLinks).map((id) =>
      links.data().find((l) => this.getLinkId(l) === id)!
    );
    this.onLinkSelect?.(selectedLinks);
  }

  private getLinkId(link: SankeyLink): string {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    return `${sourceId}->${targetId}`;
  }

  // ===========================================================================
  // ハイライト管理
  // ===========================================================================

  private highlightConnectedElements(
    node: SankeyNode,
    nodes: d3.Selection<SVGGElement, SankeyNode, SVGGElement, unknown>
  ): void {
    // 接続されているノードIDを収集
    const connectedNodeIds = new Set<string>([node.id]);

    // ソースリンク（このノードから出るフロー）
    node.sourceLinks?.forEach((link) => {
      const targetNode = link.target as SankeyNode;
      connectedNodeIds.add(targetNode.id);
    });

    // ターゲットリンク（このノードに入るフロー）
    node.targetLinks?.forEach((link) => {
      const sourceNode = link.source as SankeyNode;
      connectedNodeIds.add(sourceNode.id);
    });

    // 接続されていないノードを薄暗く
    nodes.classed('dimmed', (d) => !connectedNodeIds.has(d.id));

    // リンクもハイライト
    this.svg
      .selectAll<SVGPathElement, SankeyLink>('.sankey-link')
      .classed('dimmed', (d) => {
        const sourceId = typeof d.source === 'string' ? d.source : (d.source as SankeyNode).id;
        const targetId = typeof d.target === 'string' ? d.target : (d.target as SankeyNode).id;
        return sourceId !== node.id && targetId !== node.id;
      })
      .classed('highlighted', (d) => {
        const sourceId = typeof d.source === 'string' ? d.source : (d.source as SankeyNode).id;
        const targetId = typeof d.target === 'string' ? d.target : (d.target as SankeyNode).id;
        return sourceId === node.id || targetId === node.id;
      });
  }

  private clearHighlights(
    nodes: d3.Selection<SVGGElement, SankeyNode, SVGGElement, unknown>
  ): void {
    nodes.classed('dimmed', false).classed('highlighted', false);
    this.svg.selectAll('.sankey-link').classed('dimmed', false).classed('highlighted', false);
  }

  // ===========================================================================
  // ツールチップ管理
  // ===========================================================================

  /**
   * ツールチップコンテナを設定
   */
  public setTooltipContainer(container: HTMLElement): void {
    this.tooltipElement = container;
    this.tooltipElement.classList.add('sankey-tooltip');
    this.tooltipElement.setAttribute('role', 'tooltip');
    this.tooltipElement.setAttribute('aria-hidden', 'true');
  }

  private scheduleTooltip(event: MouseEvent, content: string): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }

    this.tooltipTimeout = window.setTimeout(() => {
      this.showTooltip(event, content);
    }, this.options.tooltipDelay);
  }

  private showTooltip(event: MouseEvent, content: string): void {
    if (!this.tooltipElement) return;

    this.tooltipElement.innerHTML = content;
    this.tooltipElement.classList.add('visible');
    this.tooltipElement.setAttribute('aria-hidden', 'false');
    this.updateTooltipPosition(event);
  }

  private hideTooltip(): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }

    if (!this.tooltipElement) return;

    this.tooltipElement.classList.remove('visible');
    this.tooltipElement.setAttribute('aria-hidden', 'true');
  }

  private updateTooltipPosition(event: MouseEvent): void {
    if (!this.tooltipElement) return;

    const offset = tooltipConfig.offset;
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const containerRect = this.svg.node()?.parentElement?.getBoundingClientRect();

    if (!containerRect) return;

    let x = event.clientX - containerRect.left + offset;
    let y = event.clientY - containerRect.top + offset;

    // 画面外に出ないように調整
    if (x + tooltipRect.width > containerRect.width) {
      x = event.clientX - containerRect.left - tooltipRect.width - offset;
    }
    if (y + tooltipRect.height > containerRect.height) {
      y = event.clientY - containerRect.top - tooltipRect.height - offset;
      this.tooltipElement.classList.add('position-bottom');
      this.tooltipElement.classList.remove('position-top');
    } else {
      this.tooltipElement.classList.add('position-top');
      this.tooltipElement.classList.remove('position-bottom');
    }

    this.tooltipElement.style.left = `${x}px`;
    this.tooltipElement.style.top = `${y}px`;
  }

  private createNodeTooltipContent(node: SankeyNode): string {
    const colorIndicator = node.color
      ? `<span class="sankey-tooltip-color" style="background-color: ${node.color}"></span>`
      : '';

    return `
      <div class="sankey-tooltip-title">${colorIndicator}${this.escapeHtml(node.name)}</div>
      <div class="sankey-tooltip-content">
        <div class="sankey-tooltip-row">
          <span class="sankey-tooltip-label">Value:</span>
          <span class="sankey-tooltip-value">${this.formatNumber(node.value)}</span>
        </div>
      </div>
    `;
  }

  private createLinkTooltipContent(link: SankeyLink): string {
    const sourceName = typeof link.source === 'string' ? link.source : link.source.name;
    const targetName = typeof link.target === 'string' ? link.target : link.target.name;

    return `
      <div class="sankey-tooltip-title">Flow</div>
      <div class="sankey-tooltip-content">
        <div class="sankey-tooltip-row">
          <span class="sankey-tooltip-label">From:</span>
          <span class="sankey-tooltip-value">${this.escapeHtml(sourceName)}</span>
        </div>
        <div class="sankey-tooltip-row">
          <span class="sankey-tooltip-label">To:</span>
          <span class="sankey-tooltip-value">${this.escapeHtml(targetName)}</span>
        </div>
        <div class="sankey-tooltip-row">
          <span class="sankey-tooltip-label">Value:</span>
          <span class="sankey-tooltip-value">${this.formatNumber(link.value)}</span>
        </div>
      </div>
    `;
  }

  // ===========================================================================
  // キーボードナビゲーション
  // ===========================================================================

  private handleKeyboardNavigation(event: KeyboardEvent): void {
    const focusableElements = this.svg
      .selectAll<SVGElement, unknown>('[tabindex="0"]')
      .nodes();

    if (focusableElements.length === 0) return;

    const currentIndex = this.state.focusedElement
      ? focusableElements.indexOf(this.state.focusedElement as SVGElement)
      : -1;

    let nextIndex: number;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        focusableElements[nextIndex].focus();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        focusableElements[nextIndex].focus();
        break;
      case 'Home':
        event.preventDefault();
        focusableElements[0].focus();
        break;
      case 'End':
        event.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
        break;
    }
  }

  // ===========================================================================
  // ユーティリティ
  // ===========================================================================

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value);
  }

  // ===========================================================================
  // パブリックAPI
  // ===========================================================================

  /**
   * イベントハンドラーを設定
   */
  public on(
    event: 'nodeHover',
    handler: (node: SankeyNode | null) => void
  ): this;
  public on(
    event: 'nodeSelect',
    handler: (nodes: SankeyNode[]) => void
  ): this;
  public on(
    event: 'linkHover',
    handler: (link: SankeyLink | null) => void
  ): this;
  public on(
    event: 'linkSelect',
    handler: (links: SankeyLink[]) => void
  ): this;
  public on(event: string, handler: (...args: any[]) => void): this {
    switch (event) {
      case 'nodeHover':
        this.onNodeHover = handler;
        break;
      case 'nodeSelect':
        this.onNodeSelect = handler;
        break;
      case 'linkHover':
        this.onLinkHover = handler;
        break;
      case 'linkSelect':
        this.onLinkSelect = handler;
        break;
    }
    return this;
  }

  /**
   * 現在の状態を取得
   */
  public getState(): Readonly<InteractionState> {
    return { ...this.state };
  }

  /**
   * 選択をクリア
   */
  public clearSelection(): void {
    this.state.selectedNodes.clear();
    this.state.selectedLinks.clear();
    this.svg.selectAll('.sankey-node').classed('selected', false);
    this.svg.selectAll('.sankey-link').classed('selected', false);
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.hideTooltip();
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
  }
}

export default InteractionManager;
