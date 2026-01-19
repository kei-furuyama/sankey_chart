/**
 * Sankey Chart Accessibility Manager
 *
 * WCAG 2.1 AA準拠のアクセシビリティ機能を管理
 * - キーボードナビゲーション
 * - スクリーンリーダー対応
 * - 色覚多様性対応
 * - 動作軽減設定対応
 */

import * as d3 from 'd3';
import { accessibility, colorPalette } from '../styles/design-tokens';

// =============================================================================
// 型定義
// =============================================================================

export interface AccessibilityOptions {
  enableKeyboardNavigation: boolean;
  enableScreenReaderAnnouncements: boolean;
  enableHighContrastMode: boolean;
  enableReducedMotion: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  announceOnHover: boolean;
  announceOnSelect: boolean;
}

export interface ChartData {
  nodes: Array<{
    id: string;
    name: string;
    value: number;
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
  }>;
}

// =============================================================================
// 色覚シミュレーション行列
// =============================================================================

const colorBlindMatrices = {
  // 1型色覚（赤色弱）
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758],
  ],
  // 2型色覚（緑色弱）
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  // 3型色覚（青色弱）
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525],
  ],
  // 全色盲
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
};

// =============================================================================
// アクセシビリティマネージャー
// =============================================================================

export class AccessibilityManager {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private options: AccessibilityOptions;
  private liveRegion: HTMLElement | null = null;
  private chartData: ChartData | null = null;
  private focusedIndex: number = -1;
  private focusableElements: Array<SVGElement | HTMLElement> = [];

  constructor(
    container: HTMLElement,
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    options: Partial<AccessibilityOptions> = {}
  ) {
    this.container = container;
    this.svg = svg;
    this.options = {
      enableKeyboardNavigation: true,
      enableScreenReaderAnnouncements: true,
      enableHighContrastMode: false,
      enableReducedMotion: this.prefersReducedMotion(),
      colorBlindMode: 'none',
      announceOnHover: true,
      announceOnSelect: true,
      ...options,
    };

    this.initialize();
  }

  // ===========================================================================
  // 初期化
  // ===========================================================================

  private initialize(): void {
    this.setupARIAAttributes();
    this.createLiveRegion();
    this.setupKeyboardNavigation();
    this.detectUserPreferences();
  }

  /**
   * SVGにARIA属性を設定
   */
  private setupARIAAttributes(): void {
    this.svg
      .attr('role', 'img')
      .attr('aria-label', accessibility.ariaLabels.chart)
      .attr('tabindex', 0);

    // desc要素を追加（チャートの説明）
    const desc = this.svg.select('desc');
    if (desc.empty()) {
      this.svg
        .insert('desc', ':first-child')
        .text('Sankey diagram showing flow relationships between categories');
    }

    // title要素を追加
    const title = this.svg.select('title');
    if (title.empty()) {
      this.svg.insert('title', ':first-child').text('Sankey Diagram');
    }
  }

  /**
   * ライブリージョンを作成（スクリーンリーダー通知用）
   */
  private createLiveRegion(): void {
    if (!this.options.enableScreenReaderAnnouncements) return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.classList.add('sankey-sr-only');
    this.container.appendChild(this.liveRegion);
  }

  /**
   * キーボードナビゲーションを設定
   */
  private setupKeyboardNavigation(): void {
    if (!this.options.enableKeyboardNavigation) return;

    this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.svg.node()?.addEventListener('focus', this.handleSvgFocus.bind(this));
  }

  /**
   * ユーザーのシステム設定を検出
   */
  private detectUserPreferences(): void {
    // 動作軽減設定
    if (this.prefersReducedMotion()) {
      this.options.enableReducedMotion = true;
      this.container.classList.add('reduced-motion');
    }

    // ハイコントラスト設定
    if (this.prefersHighContrast()) {
      this.options.enableHighContrastMode = true;
      this.container.classList.add('high-contrast');
    }

    // システム設定の変更を監視
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.options.enableReducedMotion = e.matches;
      this.container.classList.toggle('reduced-motion', e.matches);
    });
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private prefersHighContrast(): boolean {
    return window.matchMedia('(forced-colors: active)').matches;
  }

  // ===========================================================================
  // キーボードナビゲーション
  // ===========================================================================

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) {
      this.updateFocusableElements();
    }

    switch (event.key) {
      case 'Tab':
        // デフォルトのTab動作を許可（チャートから出る）
        break;

      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.moveFocus(1);
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus(-1);
        break;

      case 'Home':
        event.preventDefault();
        this.focusFirst();
        break;

      case 'End':
        event.preventDefault();
        this.focusLast();
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateFocusedElement();
        break;

      case 'Escape':
        event.preventDefault();
        this.clearSelection();
        break;

      case '?':
        // ヘルプを表示
        if (event.shiftKey) {
          event.preventDefault();
          this.showKeyboardShortcuts();
        }
        break;
    }
  }

  private handleSvgFocus(): void {
    if (this.focusedIndex === -1 && this.focusableElements.length > 0) {
      this.focusFirst();
    }
  }

  private updateFocusableElements(): void {
    this.focusableElements = [
      ...Array.from(this.svg.node()?.querySelectorAll('.sankey-node') || []),
      ...Array.from(this.svg.node()?.querySelectorAll('.sankey-link') || []),
    ] as Array<SVGElement | HTMLElement>;
  }

  private moveFocus(direction: number): void {
    const newIndex = this.focusedIndex + direction;
    if (newIndex >= 0 && newIndex < this.focusableElements.length) {
      this.focusedIndex = newIndex;
      this.focusElement(this.focusableElements[this.focusedIndex]);
    } else if (newIndex < 0) {
      this.focusedIndex = this.focusableElements.length - 1;
      this.focusElement(this.focusableElements[this.focusedIndex]);
    } else {
      this.focusedIndex = 0;
      this.focusElement(this.focusableElements[this.focusedIndex]);
    }
  }

  private focusFirst(): void {
    if (this.focusableElements.length > 0) {
      this.focusedIndex = 0;
      this.focusElement(this.focusableElements[0]);
    }
  }

  private focusLast(): void {
    if (this.focusableElements.length > 0) {
      this.focusedIndex = this.focusableElements.length - 1;
      this.focusElement(this.focusableElements[this.focusedIndex]);
    }
  }

  private focusElement(element: SVGElement | HTMLElement): void {
    // 前のフォーカスをクリア
    this.svg.selectAll('[data-focused="true"]').attr('data-focused', null);

    // 新しい要素にフォーカス
    element.setAttribute('data-focused', 'true');
    (element as HTMLElement).focus?.();

    // スクリーンリーダーにアナウンス
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      this.announce(ariaLabel);
    }
  }

  private activateFocusedElement(): void {
    if (this.focusedIndex >= 0 && this.focusableElements[this.focusedIndex]) {
      const element = this.focusableElements[this.focusedIndex];
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  }

  private clearSelection(): void {
    this.svg.selectAll('.selected').classed('selected', false);
    this.announce('Selection cleared');
  }

  // ===========================================================================
  // スクリーンリーダー対応
  // ===========================================================================

  /**
   * スクリーンリーダーにメッセージをアナウンス
   */
  public announce(message: string): void {
    if (!this.liveRegion || !this.options.enableScreenReaderAnnouncements) return;

    // 一度クリアして再設定（確実にアナウンスされるように）
    this.liveRegion.textContent = '';
    requestAnimationFrame(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    });
  }

  /**
   * チャートデータを設定し、サマリーを生成
   */
  public setChartData(data: ChartData): void {
    this.chartData = data;
    this.updateChartDescription();
    this.updateFocusableElements();
  }

  private updateChartDescription(): void {
    if (!this.chartData) return;

    const nodeCount = this.chartData.nodes.length;
    const linkCount = this.chartData.links.length;
    const totalValue = this.chartData.links.reduce((sum, link) => sum + link.value, 0);

    const description = `Sankey diagram with ${nodeCount} nodes and ${linkCount} connections. ` +
      `Total flow value: ${this.formatNumber(totalValue)}. ` +
      `Use arrow keys to navigate between elements.`;

    this.svg.select('desc').text(description);
  }

  /**
   * キーボードショートカットのヘルプを表示
   */
  private showKeyboardShortcuts(): void {
    const shortcuts = [
      'Arrow keys: Navigate between elements',
      'Enter or Space: Select element',
      'Escape: Clear selection',
      'Home: Go to first element',
      'End: Go to last element',
      'Shift+?: Show this help',
    ].join('. ');

    this.announce(`Keyboard shortcuts: ${shortcuts}`);
  }

  // ===========================================================================
  // 色覚多様性対応
  // ===========================================================================

  /**
   * 色覚モードを設定
   */
  public setColorBlindMode(mode: AccessibilityOptions['colorBlindMode']): void {
    this.options.colorBlindMode = mode;

    if (mode === 'none') {
      // フィルターを削除
      this.svg.select('#color-blind-filter').remove();
    } else {
      this.applyColorBlindFilter(mode);
    }
  }

  private applyColorBlindFilter(mode: Exclude<AccessibilityOptions['colorBlindMode'], 'none'>): void {
    // 既存のフィルターを削除
    this.svg.select('#color-blind-filter').remove();

    const matrix = colorBlindMatrices[mode];
    const values = [
      ...matrix[0], 0, 0,
      ...matrix[1], 0, 0,
      ...matrix[2], 0, 0,
      0, 0, 0, 1, 0,
    ].join(' ');

    // defsを取得または作成
    let defs = this.svg.select('defs');
    if (defs.empty()) {
      defs = this.svg.insert('defs', ':first-child');
    }

    // フィルターを追加
    const filter = defs
      .append('filter')
      .attr('id', 'color-blind-filter');

    filter
      .append('feColorMatrix')
      .attr('type', 'matrix')
      .attr('values', values);

    // チャート要素にフィルターを適用
    this.svg.selectAll('.sankey-node, .sankey-link')
      .style('filter', 'url(#color-blind-filter)');
  }

  /**
   * 色覚対応パレットを取得
   */
  public getColorBlindSafePalette(): string[] {
    return [...colorPalette.colorBlindSafe];
  }

  /**
   * 色のコントラスト比を計算
   */
  public getContrastRatio(color1: string, color2: string): number {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  private getRelativeLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  // ===========================================================================
  // パターン生成（色覚対応の代替手段）
  // ===========================================================================

  /**
   * ノード用のパターンを生成
   */
  public createDistinctivePatterns(): void {
    let defs = this.svg.select('defs');
    if (defs.empty()) {
      defs = this.svg.insert('defs', ':first-child');
    }

    const patterns = [
      { id: 'pattern-diagonal', type: 'diagonal' },
      { id: 'pattern-dots', type: 'dots' },
      { id: 'pattern-horizontal', type: 'horizontal' },
      { id: 'pattern-vertical', type: 'vertical' },
      { id: 'pattern-crosshatch', type: 'crosshatch' },
      { id: 'pattern-waves', type: 'waves' },
    ];

    patterns.forEach(({ id, type }) => {
      const pattern = defs
        .append('pattern')
        .attr('id', id)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 8)
        .attr('height', 8);

      switch (type) {
        case 'diagonal':
          pattern
            .append('path')
            .attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4')
            .attr('stroke', 'currentColor')
            .attr('stroke-width', 1.5);
          break;

        case 'dots':
          pattern
            .append('circle')
            .attr('cx', 4)
            .attr('cy', 4)
            .attr('r', 2)
            .attr('fill', 'currentColor');
          break;

        case 'horizontal':
          pattern
            .append('path')
            .attr('d', 'M0,4 h8')
            .attr('stroke', 'currentColor')
            .attr('stroke-width', 2);
          break;

        case 'vertical':
          pattern
            .append('path')
            .attr('d', 'M4,0 v8')
            .attr('stroke', 'currentColor')
            .attr('stroke-width', 2);
          break;

        case 'crosshatch':
          pattern
            .append('path')
            .attr('d', 'M0,0 l8,8 M8,0 l-8,8')
            .attr('stroke', 'currentColor')
            .attr('stroke-width', 1);
          break;

        case 'waves':
          pattern
            .append('path')
            .attr('d', 'M0,4 q2,-4 4,0 t4,0')
            .attr('stroke', 'currentColor')
            .attr('stroke-width', 1.5)
            .attr('fill', 'none');
          break;
      }
    });
  }

  // ===========================================================================
  // ユーティリティ
  // ===========================================================================

  private formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value);
  }

  // ===========================================================================
  // パブリックAPI
  // ===========================================================================

  /**
   * オプションを更新
   */
  public updateOptions(options: Partial<AccessibilityOptions>): void {
    this.options = { ...this.options, ...options };

    if (options.colorBlindMode !== undefined) {
      this.setColorBlindMode(options.colorBlindMode);
    }

    if (options.enableReducedMotion !== undefined) {
      this.container.classList.toggle('reduced-motion', options.enableReducedMotion);
    }

    if (options.enableHighContrastMode !== undefined) {
      this.container.classList.toggle('high-contrast', options.enableHighContrastMode);
    }
  }

  /**
   * フォーカス可能な要素を再スキャン
   */
  public refresh(): void {
    this.updateFocusableElements();
  }

  /**
   * 破棄
   */
  public destroy(): void {
    this.container.removeEventListener('keydown', this.handleKeyDown);

    if (this.liveRegion) {
      this.liveRegion.remove();
      this.liveRegion = null;
    }

    this.focusableElements = [];
  }
}

export default AccessibilityManager;
