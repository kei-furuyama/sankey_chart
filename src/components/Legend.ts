/**
 * Sankey Chart Legend Component
 *
 * インタラクティブな凡例コンポーネント
 * - クリックでフィルタリング
 * - ホバーでハイライト
 * - キーボードアクセシブル
 */

import * as d3 from 'd3';
import { legend as legendConfig, accessibility, animation } from '../styles/design-tokens';

// =============================================================================
// 型定義
// =============================================================================

export interface LegendItem {
  id: string;
  label: string;
  color: string;
  value?: number;
  visible: boolean;
}

export interface LegendOptions {
  position: 'top' | 'bottom' | 'left' | 'right';
  layout: 'horizontal' | 'vertical';
  interactive: boolean;
  showValues: boolean;
  maxItems: number;
  itemWidth: number;
  onToggle?: (item: LegendItem) => void;
  onHover?: (item: LegendItem | null) => void;
}

// =============================================================================
// 凡例コンポーネント
// =============================================================================

export class Legend {
  private container: d3.Selection<HTMLElement, unknown, null, undefined>;
  private items: LegendItem[];
  private options: LegendOptions;

  constructor(
    container: HTMLElement,
    items: LegendItem[],
    options: Partial<LegendOptions> = {}
  ) {
    this.container = d3.select(container);
    this.items = items;
    this.options = {
      position: 'bottom',
      layout: 'horizontal',
      interactive: true,
      showValues: false,
      maxItems: 12,
      itemWidth: 120,
      ...options,
    };

    this.render();
  }

  // ===========================================================================
  // レンダリング
  // ===========================================================================

  private render(): void {
    // コンテナをクリア
    this.container.html('');

    // 凡例コンテナを作成
    const legend = this.container
      .append('div')
      .attr('class', `sankey-legend position-${this.options.position}`)
      .attr('role', 'group')
      .attr('aria-label', accessibility.ariaLabels.legend);

    // レイアウトに応じたスタイル
    if (this.options.layout === 'horizontal') {
      legend.style('flex-direction', 'row');
    } else {
      legend.style('flex-direction', 'column');
    }

    // 表示するアイテムを制限
    const displayItems = this.items.slice(0, this.options.maxItems);
    const hasMore = this.items.length > this.options.maxItems;

    // 凡例アイテムをレンダリング
    const legendItems = legend
      .selectAll('.sankey-legend-item')
      .data(displayItems)
      .enter()
      .append('div')
      .attr('class', (d) => `sankey-legend-item ${d.visible ? '' : 'inactive'}`)
      .attr('tabindex', this.options.interactive ? 0 : -1)
      .attr('role', 'button')
      .attr('aria-pressed', (d) => d.visible.toString())
      .attr('aria-label', (d) => accessibility.ariaLabels.legendItem(d.label))
      .style('max-width', `${this.options.itemWidth}px`);

    // カラーシンボル
    legendItems
      .append('span')
      .attr('class', 'sankey-legend-symbol')
      .attr('aria-hidden', 'true')
      .style('background-color', (d) => d.color);

    // ラベル
    const labelContainer = legendItems
      .append('span')
      .attr('class', 'sankey-legend-label');

    labelContainer.append('span').text((d) => d.label);

    // 値を表示（オプション）
    if (this.options.showValues) {
      labelContainer
        .append('span')
        .attr('class', 'sankey-legend-value')
        .text((d) => (d.value !== undefined ? ` (${this.formatNumber(d.value)})` : ''));
    }

    // インタラクションをバインド
    if (this.options.interactive) {
      this.bindInteractions(legendItems);
    }

    // 「その他」インジケーター
    if (hasMore) {
      legend
        .append('div')
        .attr('class', 'sankey-legend-more')
        .text(`+${this.items.length - this.options.maxItems} more`);
    }
  }

  // ===========================================================================
  // インタラクション
  // ===========================================================================

  private bindInteractions(
    items: d3.Selection<HTMLDivElement, LegendItem, HTMLDivElement, unknown>
  ): void {
    items
      // クリック
      .on('click', (event, d) => {
        this.toggleItem(d);
      })
      // キーボード
      .on('keydown', (event: KeyboardEvent, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.toggleItem(d);
        }
      })
      // ホバー
      .on('mouseenter', (event, d) => {
        this.options.onHover?.(d);
      })
      .on('mouseleave', () => {
        this.options.onHover?.(null);
      });
  }

  private toggleItem(item: LegendItem): void {
    // 状態を更新
    const index = this.items.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      this.items[index].visible = !this.items[index].visible;
    }

    // 表示を更新
    this.container
      .selectAll<HTMLDivElement, LegendItem>('.sankey-legend-item')
      .filter((d) => d.id === item.id)
      .classed('inactive', !this.items[index].visible)
      .attr('aria-pressed', this.items[index].visible.toString());

    // コールバック
    this.options.onToggle?.(this.items[index]);
  }

  // ===========================================================================
  // ユーティリティ
  // ===========================================================================

  private formatNumber(value: number): string {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  }

  // ===========================================================================
  // パブリックAPI
  // ===========================================================================

  /**
   * アイテムを更新
   */
  public update(items: LegendItem[]): void {
    this.items = items;
    this.render();
  }

  /**
   * 特定のアイテムをハイライト
   */
  public highlight(itemId: string | null): void {
    this.container
      .selectAll<HTMLDivElement, LegendItem>('.sankey-legend-item')
      .classed('highlighted', (d) => d.id === itemId);
  }

  /**
   * 全アイテムを表示状態に
   */
  public showAll(): void {
    this.items.forEach((item) => (item.visible = true));
    this.render();
  }

  /**
   * 全アイテムを非表示状態に
   */
  public hideAll(): void {
    this.items.forEach((item) => (item.visible = false));
    this.render();
  }

  /**
   * 表示状態のアイテムを取得
   */
  public getVisibleItems(): LegendItem[] {
    return this.items.filter((item) => item.visible);
  }

  /**
   * 破棄
   */
  public destroy(): void {
    this.container.html('');
  }
}

export default Legend;
