/**
 * Power BI Custom Visual Implementation
 *
 * IVisualインターフェースを実装し、SankeyChartをPower BI環境で動作させます。
 *
 * Power BI Visual ライフサイクル:
 * 1. constructor() - 初期化
 * 2. update() - データ/設定変更時に呼ばれる
 * 3. destroy() - ビジュアル破棄時
 */

import { SankeyChart, createSankeyChart } from '../core';
import { transformDataView } from './dataViewTransformer';
import { VisualSettings, parseSettings } from './settings';
import type { SankeyChartConfig, SankeyData, ComputedNode, ComputedLink } from '../types';

// =============================================================================
// Power BI Visual API Types
// =============================================================================

/**
 * IVisual interface - Power BI Visual の基本インターフェース
 */
export interface IVisual {
  update(options: VisualUpdateOptions): void;
  destroy?(): void;
  getFormattingModel?(): FormattingModel;
}

export interface VisualConstructorOptions {
  element: HTMLElement;
  host: IVisualHost;
}

export interface VisualUpdateOptions {
  dataViews: DataView[];
  viewport: IViewport;
  type: VisualUpdateType;
}

export interface DataView {
  categorical?: DataViewCategorical;
  metadata?: DataViewMetadata;
}

export interface DataViewCategorical {
  categories?: DataViewCategoryColumn[];
  values?: DataViewValueColumn[];
}

export interface DataViewCategoryColumn {
  source: DataViewMetadataColumn;
  values: (string | number | boolean | null)[];
  identity?: unknown[];
}

export interface DataViewValueColumn {
  source: DataViewMetadataColumn;
  values: (number | null)[];
  highlights?: (number | null)[];
}

export interface DataViewMetadata {
  columns: DataViewMetadataColumn[];
  objects?: Record<string, unknown>;
}

export interface DataViewMetadataColumn {
  displayName: string;
  queryName?: string;
  roles?: Record<string, boolean>;
  type?: unknown;
  format?: string;
  objects?: unknown;
}

export interface IVisualHost {
  selectionManager: ISelectionManager;
  colorPalette: IColorPalette;
  tooltipService: ITooltipService;
  createSelectionIdBuilder(): ISelectionIdBuilder;
}

export interface ISelectionManager {
  select(selectionId: ISelectionId, multiSelect?: boolean): Promise<ISelectionId[]>;
  clear(): Promise<void>;
  getSelectionIds(): ISelectionId[];
  hasSelection(): boolean;
}

export interface IColorPalette {
  getColor(key: string): { value: string };
  reset(): void;
}

export interface ITooltipService {
  show(options: TooltipShowOptions): void;
  move(options: TooltipMoveOptions): void;
  hide(options: TooltipHideOptions): void;
}

export interface TooltipShowOptions {
  coordinates: [number, number];
  isTouchEvent: boolean;
  dataItems: TooltipDataItem[];
  identities?: ISelectionId[];
}

export interface TooltipMoveOptions {
  coordinates: [number, number];
  isTouchEvent: boolean;
}

export interface TooltipHideOptions {
  isTouchEvent: boolean;
  immediately: boolean;
}

export interface TooltipDataItem {
  displayName: string;
  value: string;
}

export interface ISelectionId {
  getKey(): string;
  equals(other: ISelectionId): boolean;
}

export interface ISelectionIdBuilder {
  withCategory(categoryColumn: DataViewCategoryColumn, index: number): ISelectionIdBuilder;
  createSelectionId(): ISelectionId;
}

export interface IViewport {
  width: number;
  height: number;
}

export enum VisualUpdateType {
  Data = 1,
  Resize = 2,
  ViewMode = 4,
  Style = 8,
  ResizeEnd = 16,
  All = 31,
}

export interface FormattingModel {
  cards: FormattingCard[];
}

export interface FormattingCard {
  uid: string;
  displayName: string;
  groups: FormattingGroup[];
}

export interface FormattingGroup {
  uid: string;
  displayName: string;
  slices: FormattingSlice[];
}

export interface FormattingSlice {
  uid: string;
  displayName: string;
  control: unknown;
}

// =============================================================================
// Visual Class Implementation
// =============================================================================

export class SankeyVisual implements IVisual {
  private target: HTMLElement;
  private host: IVisualHost;
  private chart: SankeyChart | null = null;
  private settings: VisualSettings;
  private currentData: SankeyData | null = null;
  private selectionManager: ISelectionManager;

  constructor(options: VisualConstructorOptions) {
    this.target = options.element;
    this.host = options.host;
    this.selectionManager = options.host.selectionManager;
    this.settings = new VisualSettings();

    // コンテナスタイル設定
    this.target.style.overflow = 'hidden';
    this.target.classList.add('sankey-visual-container');

    // チャート初期化
    this.initializeChart({ width: 800, height: 600 });
  }

  /**
   * Power BIからのupdate呼び出し
   */
  public update(options: VisualUpdateOptions): void {
    const { viewport, dataViews, type } = options;

    // 設定を解析
    if (dataViews?.[0]) {
      this.settings = parseSettings(dataViews[0]);
    }

    // リサイズのみの場合
    if (type === VisualUpdateType.Resize || type === VisualUpdateType.ResizeEnd) {
      this.handleResize(viewport);
      return;
    }

    // データ変換
    const data = transformDataView(dataViews?.[0], {
      sourceRole: 'source',
      targetRole: 'target',
      valueRole: 'value',
      colorScheme: this.getColorScheme(),
    });

    if (!data) {
      this.showNoDataMessage();
      return;
    }

    this.currentData = data;
    this.hideNoDataMessage();

    // 設定を適用してレンダリング
    this.updateChartConfig(viewport);

    if (this.chart && this.currentData) {
      this.chart.render(this.currentData);
    }
  }

  /**
   * ビジュアル破棄
   */
  public destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  /**
   * フォーマットモデル（Power BI設定パネル用）
   */
  public getFormattingModel(): FormattingModel {
    return this.settings.toFormattingModel();
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private initializeChart(viewport: IViewport): void {
    const config = this.buildConfig(viewport);

    this.chart = createSankeyChart(this.target, {
      config,
      responsive: false, // Power BIが独自にリサイズ管理
      eventHandlers: {
        onNodeClick: (event) => this.handleNodeClick(event.node, event.nativeEvent),
        onNodeHover: (event) => this.handleNodeHover(event?.node ?? null, event?.nativeEvent as MouseEvent),
        onLinkClick: (event) => this.handleLinkClick(event.link, event.nativeEvent),
        onLinkHover: (event) => this.handleLinkHover(event?.link ?? null, event?.nativeEvent as MouseEvent),
      },
    });
  }

  private updateChartConfig(viewport: IViewport): void {
    if (!this.chart) {
      this.initializeChart(viewport);
      return;
    }

    const config = this.buildConfig(viewport);
    this.chart.updateConfig(config);
  }

  private buildConfig(viewport: IViewport): Partial<SankeyChartConfig> {
    const { nodeSettings, linkSettings, labelSettings, animationSettings } = this.settings;

    return {
      width: viewport.width,
      height: viewport.height,
      margin: { top: 20, right: 120, bottom: 20, left: 120 },
      layout: {
        nodeWidth: nodeSettings.width,
        nodePadding: nodeSettings.padding,
        nodeAlignment: 'justify',
        iterations: 32,
      },
      style: {
        nodeColor: nodeSettings.defaultColor,
        nodeStroke: '#000',
        nodeStrokeWidth: 0,
        linkColor: '#aaa',
        linkOpacity: linkSettings.opacity / 100,
        linkColorMode: linkSettings.colorMode,
        labelFontSize: labelSettings.fontSize,
        labelFontFamily: labelSettings.fontFamily,
        labelColor: labelSettings.color,
      },
      animation: {
        enabled: animationSettings.enabled,
        duration: animationSettings.duration,
        easing: 'easeCubic',
        enterAnimation: true,
      },
    };
  }

  private handleResize(viewport: IViewport): void {
    if (this.chart) {
      this.chart.updateConfig({
        width: viewport.width,
        height: viewport.height,
      });

      if (this.currentData) {
        this.chart.render(this.currentData);
      }
    }
  }

  private handleNodeClick(node: ComputedNode, event: MouseEvent | TouchEvent | PointerEvent): void {
    const multiSelect = 'ctrlKey' in event && (event.ctrlKey || event.metaKey);
    console.log('Node clicked:', node.name, 'multiSelect:', multiSelect);
    // Power BI選択APIとの連携は実際のPBI環境で実装
  }

  private handleNodeHover(node: ComputedNode | null, event: MouseEvent): void {
    if (!node) {
      this.host.tooltipService?.hide({
        isTouchEvent: false,
        immediately: true,
      });
      return;
    }

    const tooltipData: TooltipDataItem[] = [
      {
        displayName: node.name,
        value: String(node.value ?? 0),
      },
    ];

    this.host.tooltipService?.show({
      coordinates: [event.clientX, event.clientY],
      dataItems: tooltipData,
      isTouchEvent: false,
    });
  }

  private handleLinkClick(link: ComputedLink, event: MouseEvent | TouchEvent | PointerEvent): void {
    const source = typeof link.source === 'object' ? link.source.name : String(link.source);
    const target = typeof link.target === 'object' ? link.target.name : String(link.target);
    console.log('Link clicked:', source, '→', target);
  }

  private handleLinkHover(link: ComputedLink | null, event: MouseEvent): void {
    if (!link) {
      this.host.tooltipService?.hide({
        isTouchEvent: false,
        immediately: true,
      });
      return;
    }

    const source = typeof link.source === 'object' ? link.source.name : String(link.source);
    const target = typeof link.target === 'object' ? link.target.name : String(link.target);

    const tooltipData: TooltipDataItem[] = [
      { displayName: 'From', value: source },
      { displayName: 'To', value: target },
      { displayName: 'Value', value: String(link.value ?? 0) },
    ];

    this.host.tooltipService?.show({
      coordinates: [event.clientX, event.clientY],
      dataItems: tooltipData,
      isTouchEvent: false,
    });
  }

  private getColorScheme(): string[] {
    const palette = this.host.colorPalette;
    if (!palette) {
      return [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
      ];
    }

    const colors: string[] = [];
    for (let i = 0; i < 20; i++) {
      colors.push(palette.getColor(String(i)).value);
    }
    return colors;
  }

  private showNoDataMessage(): void {
    const existing = this.target.querySelector('.no-data-message');
    if (existing) return;

    const message = document.createElement('div');
    message.className = 'no-data-message';
    message.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      font-family: "Segoe UI", sans-serif;
      font-size: 14px;
    `;
    message.textContent = 'Source、Target、Valueフィールドにデータを追加してください';
    this.target.appendChild(message);
  }

  private hideNoDataMessage(): void {
    const message = this.target.querySelector('.no-data-message');
    if (message) {
      message.remove();
    }
  }
}

// =============================================================================
// Visual Factory Function (Power BI entry point)
// =============================================================================

/**
 * Power BI Visual のエントリーポイント
 */
export function create(options: VisualConstructorOptions): IVisual {
  return new SankeyVisual(options);
}
