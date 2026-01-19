/**
 * Sankey Chart ツールチップ
 *
 * 【設計ポイント】
 * - DOM要素として独立（SVG外に配置）
 * - マウス追従でスムーズな表示
 * - 画面端での位置補正
 * - カスタムコンテンツ対応
 */

import type { ComputedNode, ComputedLink } from '../types';

// ============================================================
// 型定義
// ============================================================

export interface TooltipConfig {
  /** オフセット X (px) */
  offsetX: number;
  /** オフセット Y (px) */
  offsetY: number;
  /** 背景色 */
  backgroundColor: string;
  /** テキスト色 */
  textColor: string;
  /** 枠線色 */
  borderColor: string;
  /** フォントサイズ */
  fontSize: number;
  /** パディング */
  padding: number;
  /** 角丸 */
  borderRadius: number;
  /** 最大幅 */
  maxWidth: number;
  /** フェード時間 (ms) */
  fadeDuration: number;
}

export type TooltipFormatter<T> = (data: T) => string | HTMLElement;

// ============================================================
// デフォルト設定
// ============================================================

const DEFAULT_TOOLTIP_CONFIG: TooltipConfig = {
  offsetX: 12,
  offsetY: 12,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  textColor: '#fff',
  borderColor: 'rgba(255, 255, 255, 0.2)',
  fontSize: 13,
  padding: 10,
  borderRadius: 4,
  maxWidth: 300,
  fadeDuration: 150,
};

// ============================================================
// Tooltip クラス
// ============================================================

export class Tooltip {
  private element: HTMLDivElement;
  private config: TooltipConfig;
  private nodeFormatter: TooltipFormatter<ComputedNode>;
  private linkFormatter: TooltipFormatter<ComputedLink>;
  private isVisible: boolean = false;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(container: HTMLElement, config: Partial<TooltipConfig> = {}) {
    this.config = { ...DEFAULT_TOOLTIP_CONFIG, ...config };
    this.element = this.createElement(container);
    this.nodeFormatter = this.defaultNodeFormatter.bind(this);
    this.linkFormatter = this.defaultLinkFormatter.bind(this);
  }

  /**
   * ツールチップ要素を作成
   */
  private createElement(container: HTMLElement): HTMLDivElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'sankey-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      background-color: ${this.config.backgroundColor};
      color: ${this.config.textColor};
      border: 1px solid ${this.config.borderColor};
      font-size: ${this.config.fontSize}px;
      padding: ${this.config.padding}px;
      border-radius: ${this.config.borderRadius}px;
      max-width: ${this.config.maxWidth}px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: opacity ${this.config.fadeDuration}ms ease-out;
      font-family: 'Segoe UI', system-ui, sans-serif;
      line-height: 1.4;
    `;

    // コンテナにポジション設定がない場合は追加
    const containerStyle = getComputedStyle(container);
    if (containerStyle.position === 'static') {
      container.style.position = 'relative';
    }

    container.appendChild(tooltip);
    return tooltip;
  }

  /**
   * ノード用フォーマッタを設定
   */
  setNodeFormatter(formatter: TooltipFormatter<ComputedNode>): void {
    this.nodeFormatter = formatter;
  }

  /**
   * リンク用フォーマッタを設定
   */
  setLinkFormatter(formatter: TooltipFormatter<ComputedLink>): void {
    this.linkFormatter = formatter;
  }

  /**
   * ノードのツールチップを表示
   */
  showForNode(node: ComputedNode, event: MouseEvent): void {
    const content = this.nodeFormatter(node);
    this.show(content, event);
  }

  /**
   * リンクのツールチップを表示
   */
  showForLink(link: ComputedLink, event: MouseEvent): void {
    const content = this.linkFormatter(link);
    this.show(content, event);
  }

  /**
   * ツールチップを表示
   */
  private show(content: string | HTMLElement, event: MouseEvent): void {
    // タイムアウトをクリア
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // コンテンツを設定
    if (typeof content === 'string') {
      this.element.innerHTML = content;
    } else {
      this.element.innerHTML = '';
      this.element.appendChild(content);
    }

    // 位置を計算
    this.updatePosition(event);

    // 表示
    this.element.style.opacity = '1';
    this.isVisible = true;
  }

  /**
   * 位置を更新
   */
  updatePosition(event: MouseEvent): void {
    if (!this.isVisible) return;

    const container = this.element.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const tooltipRect = this.element.getBoundingClientRect();

    // マウス位置（コンテナ相対）
    let x = event.clientX - containerRect.left + this.config.offsetX;
    let y = event.clientY - containerRect.top + this.config.offsetY;

    // 画面端での補正
    // 右端
    if (x + tooltipRect.width > containerRect.width) {
      x = event.clientX - containerRect.left - tooltipRect.width - this.config.offsetX;
    }
    // 下端
    if (y + tooltipRect.height > containerRect.height) {
      y = event.clientY - containerRect.top - tooltipRect.height - this.config.offsetY;
    }
    // 左端
    if (x < 0) {
      x = this.config.offsetX;
    }
    // 上端
    if (y < 0) {
      y = this.config.offsetY;
    }

    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }

  /**
   * ツールチップを非表示
   */
  hide(): void {
    this.hideTimeout = setTimeout(() => {
      this.element.style.opacity = '0';
      this.isVisible = false;
    }, 50); // 少しディレイを入れてちらつきを防止
  }

  /**
   * ノードのデフォルトフォーマッタ
   */
  private defaultNodeFormatter(node: ComputedNode): string {
    const value = node.value ?? 0;
    const formattedValue = this.formatNumber(value);

    return `
      <div style="font-weight: 600; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
        ${this.escapeHtml(node.name)}
      </div>
      <div style="display: flex; justify-content: space-between; gap: 16px;">
        <span style="opacity: 0.8;">Total Flow:</span>
        <span style="font-weight: 500;">${formattedValue}</span>
      </div>
      ${
        node.sourceLinks && node.sourceLinks.length > 0
          ? `<div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="opacity: 0.8;">Outgoing:</span>
              <span>${node.sourceLinks.length} links</span>
            </div>`
          : ''
      }
      ${
        node.targetLinks && node.targetLinks.length > 0
          ? `<div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="opacity: 0.8;">Incoming:</span>
              <span>${node.targetLinks.length} links</span>
            </div>`
          : ''
      }
    `;
  }

  /**
   * リンクのデフォルトフォーマッタ
   */
  private defaultLinkFormatter(link: ComputedLink): string {
    const source = link.source as ComputedNode;
    const target = link.target as ComputedNode;
    const formattedValue = this.formatNumber(link.value);

    return `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="font-weight: 600;">${this.escapeHtml(source.name)}</span>
        <span style="opacity: 0.6;">\u2192</span>
        <span style="font-weight: 600;">${this.escapeHtml(target.name)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 16px;">
        <span style="opacity: 0.8;">Value:</span>
        <span style="font-weight: 500;">${formattedValue}</span>
      </div>
    `;
  }

  /**
   * 数値フォーマット
   */
  private formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toLocaleString();
  }

  /**
   * HTMLエスケープ
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.element.remove();
  }
}

// ============================================================
// ファクトリー関数
// ============================================================

export function createTooltip(
  container: HTMLElement,
  config?: Partial<TooltipConfig>
): Tooltip {
  return new Tooltip(container, config);
}
