/**
 * Canvas Renderer for Sankey Chart
 * 大量ノード/リンク時のパフォーマンス最適化
 *
 * 特徴:
 * - 500ノード以上で自動選択（SVGより高速）
 * - ダブルバッファリングによるちらつき防止
 * - プログレッシブレンダリング対応
 * - ヒットテスト用の別キャンバス
 */

import { sankeyLinkHorizontal } from 'd3-sankey';
import type {
  ComputedGraph,
  ComputedNode,
  ComputedLink,
  SankeyStyleConfig,
  SankeyPerformanceConfig,
} from '../types';

// ============================================================
// Types
// ============================================================

export interface CanvasRendererOptions {
  /** メインキャンバス要素 */
  canvas: HTMLCanvasElement;
  /** デバイスピクセル比 */
  pixelRatio?: number;
  /** スタイル設定 */
  style: SankeyStyleConfig;
  /** パフォーマンス設定 */
  performance: SankeyPerformanceConfig;
}

export interface RenderStats {
  totalTime: number;
  nodeTime: number;
  linkTime: number;
  labelTime: number;
  nodeCount: number;
  linkCount: number;
}

interface HitTestResult {
  type: 'node' | 'link' | null;
  index: number;
  data: ComputedNode | ComputedLink | null;
}

// ============================================================
// Canvas Renderer Class
// ============================================================

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: OffscreenCanvas | HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private hitCanvas: HTMLCanvasElement;
  private hitCtx: CanvasRenderingContext2D;

  private pixelRatio: number;
  private style: SankeyStyleConfig;
  private performance: SankeyPerformanceConfig;

  private width = 0;
  private height = 0;

  // ヒットテスト用のカラーマップ
  private colorToElement = new Map<string, { type: 'node' | 'link'; index: number }>();
  private nextColorIndex = 1;

  // キャッシュ
  private pathCache = new Map<number, Path2D>();
  private currentGraph: ComputedGraph | null = null;

  // プログレッシブレンダリング用
  private renderQueue: (() => void)[] = [];
  private isRendering = false;
  private animationFrameId: number | null = null;

  constructor(options: CanvasRendererOptions) {
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.pixelRatio = options.pixelRatio ?? window.devicePixelRatio ?? 1;
    this.style = options.style;
    this.performance = options.performance;

    // オフスクリーンキャンバス（ダブルバッファリング）
    if (typeof OffscreenCanvas !== 'undefined') {
      this.offscreenCanvas = new OffscreenCanvas(1, 1);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    } else {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    }

    // ヒットテスト用キャンバス
    this.hitCanvas = document.createElement('canvas');
    this.hitCtx = this.hitCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  /**
   * キャンバスサイズ設定
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // メインキャンバス
    this.canvas.width = width * this.pixelRatio;
    this.canvas.height = height * this.pixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(this.pixelRatio, this.pixelRatio);

    // オフスクリーンキャンバス
    if (this.offscreenCanvas instanceof OffscreenCanvas) {
      this.offscreenCanvas = new OffscreenCanvas(
        width * this.pixelRatio,
        height * this.pixelRatio
      );
      this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    } else {
      this.offscreenCanvas.width = width * this.pixelRatio;
      this.offscreenCanvas.height = height * this.pixelRatio;
    }
    this.offscreenCtx.scale(this.pixelRatio, this.pixelRatio);

    // ヒットテストキャンバス
    this.hitCanvas.width = width;
    this.hitCanvas.height = height;

    // キャッシュクリア
    this.pathCache.clear();
  }

  /**
   * メインレンダリング関数
   */
  render(graph: ComputedGraph): RenderStats {
    const startTime = performance.now();
    this.currentGraph = graph;

    // ヒットテストマップをリセット
    this.colorToElement.clear();
    this.nextColorIndex = 1;

    // オフスクリーンに描画
    this.clearCanvas(this.offscreenCtx);
    this.clearCanvas(this.hitCtx);

    // リンク描画
    const linkStart = performance.now();
    this.renderLinks(graph.links);
    const linkTime = performance.now() - linkStart;

    // ノード描画
    const nodeStart = performance.now();
    this.renderNodes(graph.nodes);
    const nodeTime = performance.now() - nodeStart;

    // ラベル描画
    const labelStart = performance.now();
    this.renderLabels(graph.nodes);
    const labelTime = performance.now() - labelStart;

    // メインキャンバスに転送
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(
      this.offscreenCanvas as HTMLCanvasElement,
      0, 0,
      this.width * this.pixelRatio,
      this.height * this.pixelRatio,
      0, 0,
      this.width,
      this.height
    );

    return {
      totalTime: performance.now() - startTime,
      nodeTime,
      linkTime,
      labelTime,
      nodeCount: graph.nodes.length,
      linkCount: graph.links.length,
    };
  }

  /**
   * プログレッシブレンダリング
   * 大量データ時にフレームを分割して描画
   */
  renderProgressive(
    graph: ComputedGraph,
    onProgress?: (progress: number) => void,
    onComplete?: (stats: RenderStats) => void
  ): void {
    if (this.isRendering) {
      this.cancelProgressiveRender();
    }

    this.currentGraph = graph;
    this.isRendering = true;
    this.colorToElement.clear();
    this.nextColorIndex = 1;

    const batchSize = this.performance.progressiveBatchSize;
    const totalItems = graph.links.length + graph.nodes.length;
    let processedItems = 0;

    const startTime = performance.now();
    let linkTime = 0;
    let nodeTime = 0;
    let labelTime = 0;

    // クリア
    this.clearCanvas(this.offscreenCtx);
    this.clearCanvas(this.hitCtx);

    // リンクバッチ
    for (let i = 0; i < graph.links.length; i += batchSize) {
      const batch = graph.links.slice(i, i + batchSize);
      this.renderQueue.push(() => {
        const start = performance.now();
        this.renderLinksBatch(batch, i);
        linkTime += performance.now() - start;
        processedItems += batch.length;
        onProgress?.(processedItems / totalItems);
      });
    }

    // ノードバッチ
    for (let i = 0; i < graph.nodes.length; i += batchSize) {
      const batch = graph.nodes.slice(i, i + batchSize);
      this.renderQueue.push(() => {
        const start = performance.now();
        this.renderNodesBatch(batch, i);
        nodeTime += performance.now() - start;
        processedItems += batch.length;
        onProgress?.(processedItems / totalItems);
      });
    }

    // ラベル（最後に一括）
    this.renderQueue.push(() => {
      const start = performance.now();
      this.renderLabels(graph.nodes);
      labelTime = performance.now() - start;
    });

    // 最終転送
    this.renderQueue.push(() => {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.drawImage(
        this.offscreenCanvas as HTMLCanvasElement,
        0, 0,
        this.width * this.pixelRatio,
        this.height * this.pixelRatio,
        0, 0,
        this.width,
        this.height
      );

      this.isRendering = false;
      onComplete?.({
        totalTime: performance.now() - startTime,
        nodeTime,
        linkTime,
        labelTime,
        nodeCount: graph.nodes.length,
        linkCount: graph.links.length,
      });
    });

    this.processRenderQueue();
  }

  /**
   * レンダーキューの処理
   */
  private processRenderQueue(): void {
    if (this.renderQueue.length === 0) {
      return;
    }

    const task = this.renderQueue.shift()!;
    task();

    if (this.renderQueue.length > 0) {
      this.animationFrameId = requestAnimationFrame(() => this.processRenderQueue());
    }
  }

  /**
   * プログレッシブレンダリングをキャンセル
   */
  cancelProgressiveRender(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.renderQueue = [];
    this.isRendering = false;
  }

  /**
   * リンクの描画
   */
  private renderLinks(links: ComputedLink[]): void {
    const ctx = this.offscreenCtx;
    const hitCtx = this.hitCtx;
    const pathGenerator = sankeyLinkHorizontal();

    ctx.globalAlpha = this.style.linkOpacity;

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      this.renderSingleLink(ctx, hitCtx, link, i, pathGenerator);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * リンクのバッチ描画
   */
  private renderLinksBatch(links: ComputedLink[], startIndex: number): void {
    const ctx = this.offscreenCtx;
    const hitCtx = this.hitCtx;
    const pathGenerator = sankeyLinkHorizontal();

    ctx.globalAlpha = this.style.linkOpacity;

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      this.renderSingleLink(ctx, hitCtx, link, startIndex + i, pathGenerator);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * 単一リンクの描画
   */
  private renderSingleLink(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    hitCtx: CanvasRenderingContext2D,
    link: ComputedLink,
    index: number,
    pathGenerator: ReturnType<typeof sankeyLinkHorizontal>
  ): void {
    // パスのキャッシュ取得または生成
    let path = this.pathCache.get(index);
    if (!path) {
      const pathStr = pathGenerator(link);
      if (pathStr) {
        path = new Path2D(pathStr);
        if (this.performance.enablePathCache) {
          this.pathCache.set(index, path);
        }
      }
    }

    if (!path) return;

    // 色の取得
    const color = this.getLinkColor(link);

    // メイン描画
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, link.width ?? 1);
    ctx.lineCap = 'butt';
    ctx.stroke(path);

    // ヒットテスト用描画
    const hitColor = this.getHitColor('link', index);
    hitCtx.strokeStyle = hitColor;
    hitCtx.lineWidth = Math.max(5, (link.width ?? 1) + 4); // ヒットエリアを少し大きく
    hitCtx.stroke(path);
  }

  /**
   * ノードの描画
   */
  private renderNodes(nodes: ComputedNode[]): void {
    const ctx = this.offscreenCtx;
    const hitCtx = this.hitCtx;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      this.renderSingleNode(ctx, hitCtx, node, i);
    }
  }

  /**
   * ノードのバッチ描画
   */
  private renderNodesBatch(nodes: ComputedNode[], startIndex: number): void {
    const ctx = this.offscreenCtx;
    const hitCtx = this.hitCtx;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      this.renderSingleNode(ctx, hitCtx, node, startIndex + i);
    }
  }

  /**
   * 単一ノードの描画
   */
  private renderSingleNode(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    hitCtx: CanvasRenderingContext2D,
    node: ComputedNode,
    index: number
  ): void {
    const x = node.x0 ?? 0;
    const y = node.y0 ?? 0;
    const width = (node.x1 ?? 0) - x;
    const height = (node.y1 ?? 0) - y;

    // メイン描画
    const color = node.color ?? this.style.nodeColor;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);

    if (this.style.nodeStrokeWidth > 0) {
      ctx.strokeStyle = this.style.nodeStroke;
      ctx.lineWidth = this.style.nodeStrokeWidth;
      ctx.strokeRect(x, y, width, height);
    }

    // ヒットテスト用描画
    const hitColor = this.getHitColor('node', index);
    hitCtx.fillStyle = hitColor;
    hitCtx.fillRect(x, y, width, height);
  }

  /**
   * ラベルの描画
   */
  private renderLabels(nodes: ComputedNode[]): void {
    const ctx = this.offscreenCtx;

    ctx.font = `${this.style.labelFontSize}px ${this.style.labelFontFamily}`;
    ctx.fillStyle = this.style.labelColor;
    ctx.textBaseline = 'middle';

    for (const node of nodes) {
      const x0 = node.x0 ?? 0;
      const x1 = node.x1 ?? 0;
      const y0 = node.y0 ?? 0;
      const y1 = node.y1 ?? 0;

      const isLeftSide = x0 < this.width / 2;
      const textX = isLeftSide ? x1 + 6 : x0 - 6;
      const textY = (y0 + y1) / 2;

      ctx.textAlign = isLeftSide ? 'left' : 'right';
      ctx.fillText(node.name, textX, textY);
    }
  }

  /**
   * リンク色の取得
   */
  private getLinkColor(link: ComputedLink): string {
    if (link.color) return link.color;

    switch (this.style.linkColorMode) {
      case 'source':
        return (link.source as ComputedNode).color ?? this.style.linkColor;
      case 'target':
        return (link.target as ComputedNode).color ?? this.style.linkColor;
      case 'gradient':
        // Canvas でのグラデーションはコストが高いので単色で代用
        return (link.source as ComputedNode).color ?? this.style.linkColor;
      default:
        return this.style.linkColor;
    }
  }

  /**
   * ヒットテスト用のユニーク色を生成
   */
  private getHitColor(type: 'node' | 'link', index: number): string {
    const colorIndex = this.nextColorIndex++;
    const r = (colorIndex & 0xFF0000) >> 16;
    const g = (colorIndex & 0x00FF00) >> 8;
    const b = colorIndex & 0x0000FF;
    const color = `rgb(${r},${g},${b})`;

    this.colorToElement.set(color, { type, index });

    return color;
  }

  /**
   * ヒットテスト（マウス位置から要素を特定）
   */
  hitTest(x: number, y: number): HitTestResult {
    const pixel = this.hitCtx.getImageData(x, y, 1, 1).data;
    const color = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;

    const element = this.colorToElement.get(color);
    if (!element || !this.currentGraph) {
      return { type: null, index: -1, data: null };
    }

    const data = element.type === 'node'
      ? this.currentGraph.nodes[element.index]
      : this.currentGraph.links[element.index];

    return {
      type: element.type,
      index: element.index,
      data,
    };
  }

  /**
   * 特定要素のハイライト
   */
  highlightElement(type: 'node' | 'link', index: number, highlight: boolean): void {
    if (!this.currentGraph) return;

    // 簡易実装：全体を再描画
    // より最適化する場合は差分描画を実装
    this.render(this.currentGraph);

    if (highlight) {
      const ctx = this.ctx;
      if (type === 'node') {
        const node = this.currentGraph.nodes[index];
        const x = node.x0 ?? 0;
        const y = node.y0 ?? 0;
        const width = (node.x1 ?? 0) - x;
        const height = (node.y1 ?? 0) - y;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
      }
    }
  }

  /**
   * キャンバスをクリア
   */
  private clearCanvas(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * リソースの解放
   */
  dispose(): void {
    this.cancelProgressiveRender();
    this.pathCache.clear();
    this.colorToElement.clear();
    this.currentGraph = null;
  }
}
