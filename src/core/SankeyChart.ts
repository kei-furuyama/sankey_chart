/**
 * Sankey Chart メインクラス
 *
 * 全コンポーネントを統合したファサードクラス
 * - SankeyLayout: レイアウト計算
 * - SankeyRenderer: SVG描画
 * - Tooltip: ツールチップ
 * - ResizeManager: レスポンシブ対応
 */

import type {
  SankeyData,
  SankeyChartConfig,
  LegacyEventHandlers,
  ComputedNode,
  ComputedLink,
} from '../types';
import { DEFAULT_CONFIG as defaultConfig } from '../types';
import { SankeyRenderer, createSankeyRenderer } from './SankeyRenderer';
import { Tooltip, createTooltip, TooltipConfig, TooltipFormatter } from './Tooltip';
import { ResizeManager, createResizeManager, ResponsiveOptions } from '../utils/responsive';

export interface SankeyChartOptions {
  config?: Partial<SankeyChartConfig>;
  responsive?: boolean | Partial<ResponsiveOptions>;
  tooltipConfig?: Partial<TooltipConfig>;
  eventHandlers?: LegacyEventHandlers;
}

export class SankeyChart {
  private container: HTMLElement;
  private config: SankeyChartConfig;
  private renderer: SankeyRenderer;
  private tooltip: Tooltip | null = null;
  private resizeManager: ResizeManager | null = null;
  private tooltipMoveHandler: ((event: MouseEvent) => void) | null = null;
  private currentData: SankeyData | null = null;
  private eventHandlers: LegacyEventHandlers = {};

  constructor(container: HTMLElement | string, options: SankeyChartOptions = {}) {
    // コンテナ要素を取得
    this.container = this.resolveContainer(container);

    // 設定をマージ
    this.config = this.mergeConfig(defaultConfig, options.config);

    // レンダラーを初期化
    this.renderer = createSankeyRenderer(this.container, this.config);

    // ツールチップを初期化
    if (this.config.interaction.enableTooltip) {
      this.tooltip = createTooltip(this.container, options.tooltipConfig);
      this.setupTooltipEvents();
    }

    // レスポンシブ対応
    if (options.responsive !== false) {
      const responsiveOptions =
        typeof options.responsive === 'object' ? options.responsive : {};
      this.resizeManager = createResizeManager(this.container, responsiveOptions);
      this.setupResizeHandler();
    }

    // イベントハンドラを設定
    if (options.eventHandlers) {
      this.setEventHandlers(options.eventHandlers);
    }
  }

  /**
   * コンテナ要素を解決
   */
  private resolveContainer(container: HTMLElement | string): HTMLElement {
    if (typeof container === 'string') {
      const element = document.querySelector<HTMLElement>(container);
      if (!element) {
        throw new Error(`Container not found: ${container}`);
      }
      return element;
    }
    return container;
  }

  /**
   * 設定をマージ
   */
  private mergeConfig(
    base: SankeyChartConfig,
    overrides?: Partial<SankeyChartConfig>
  ): SankeyChartConfig {
    if (!overrides) {
      return {
        ...base,
        margin: { ...base.margin },
        layout: { ...base.layout },
        interaction: { ...base.interaction },
        animation: { ...base.animation },
        style: { ...base.style },
        performance: { ...base.performance },
        powerbi: base.powerbi ? { ...base.powerbi } : undefined,
      };
    }

    const powerbi =
      base.powerbi || overrides.powerbi
        ? { ...(base.powerbi ?? {}), ...(overrides.powerbi ?? {}) }
        : undefined;

    return {
      ...base,
      ...overrides,
      margin: { ...base.margin, ...overrides.margin },
      layout: { ...base.layout, ...overrides.layout },
      interaction: { ...base.interaction, ...overrides.interaction },
      animation: { ...base.animation, ...overrides.animation },
      style: { ...base.style, ...overrides.style },
      performance: { ...base.performance, ...overrides.performance },
      powerbi,
    };
  }

  /**
   * ツールチップイベントを設定
   */
  private setupTooltipEvents(): void {
    if (!this.tooltip) return;
    const tooltip = this.tooltip;

    const originalNodeHover = this.eventHandlers.onNodeHover;
    const originalLinkHover = this.eventHandlers.onLinkHover;

    this.renderer.setEventHandlers({
      ...this.eventHandlers,
      onNodeHover: (node, event) => {
        if (node) {
          tooltip.showForNode(node, event);
        } else {
          tooltip.hide();
        }
        originalNodeHover?.(node, event);
      },
      onLinkHover: (link, event) => {
        if (link) {
          tooltip.showForLink(link, event);
        } else {
          tooltip.hide();
        }
        originalLinkHover?.(link, event);
      },
    });

    if (!this.tooltipMoveHandler) {
      this.tooltipMoveHandler = (event: MouseEvent) => {
        tooltip.updatePosition(event);
      };
      this.container.addEventListener('mousemove', this.tooltipMoveHandler);
    }
  }

  /**
   * リサイズハンドラを設定
   */
  private setupResizeHandler(): void {
    if (!this.resizeManager) return;

    this.resizeManager.addHandler((width, height) => {
      this.config.width = width;
      this.config.height = height;
      this.renderer.updateConfig({ width, height });

      // データがある場合は再描画
      this.renderIfData();
    });
  }

  /**
   * イベントハンドラを設定
   */
  setEventHandlers(handlers: LegacyEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };

    // ツールチップ用のラッパーが必要な場合は再設定
    if (this.tooltip) {
      this.setupTooltipEvents();
    } else {
      this.renderer.setEventHandlers(this.eventHandlers);
    }
  }

  /**
   * ノード用ツールチップフォーマッタを設定
   */
  setNodeTooltipFormatter(formatter: TooltipFormatter<ComputedNode>): void {
    this.tooltip?.setNodeFormatter(formatter);
  }

  /**
   * リンク用ツールチップフォーマッタを設定
   */
  setLinkTooltipFormatter(formatter: TooltipFormatter<ComputedLink>): void {
    this.tooltip?.setLinkFormatter(formatter);
  }

  /**
   * データを描画
   */
  render(data: SankeyData): void {
    this.currentData = data;
    this.renderer.render(data);
  }

  /**
   * データを更新（アニメーション付き）
   */
  update(data: SankeyData): void {
    this.render(data);
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<SankeyChartConfig>): void {
    this.config = this.mergeConfig(this.config, config);
    this.renderer.updateConfig(this.config);

    // データがある場合は再描画
    this.renderIfData();
  }

  /**
   * 選択をクリア
   */
  clearSelection(): void {
    this.renderer.clearSelection();
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): SankeyChartConfig {
    return { ...this.config };
  }

  /**
   * コンテナのサイズを取得
   */
  getSize(): { width: number; height: number } {
    if (this.resizeManager) {
      return this.resizeManager.getSize();
    }
    return { width: this.config.width, height: this.config.height };
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    if (this.tooltipMoveHandler) {
      this.container.removeEventListener('mousemove', this.tooltipMoveHandler);
      this.tooltipMoveHandler = null;
    }
    this.renderer.destroy();
    this.tooltip?.destroy();
    this.resizeManager?.destroy();
  }

  private renderIfData(): void {
    if (this.currentData) {
      this.renderer.render(this.currentData);
    }
  }
}

/**
 * Sankey Chart を作成
 *
 * @example
 * ```typescript
 * const chart = createSankeyChart('#chart-container', {
 *   config: {
 *     width: 800,
 *     height: 600,
 *     style: {
 *       linkColorMode: 'gradient',
 *     },
 *   },
 *   responsive: true,
 * });
 *
 * chart.render({
 *   nodes: [
 *     { id: 'a', name: 'Node A' },
 *     { id: 'b', name: 'Node B' },
 *     { id: 'c', name: 'Node C' },
 *   ],
 *   links: [
 *     { source: 'a', target: 'b', value: 10 },
 *     { source: 'b', target: 'c', value: 8 },
 *   ],
 * });
 * ```
 */
export function createSankeyChart(
  container: HTMLElement | string,
  options?: SankeyChartOptions
): SankeyChart {
  return new SankeyChart(container, options);
}
