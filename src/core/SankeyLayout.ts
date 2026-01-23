/**
 * d3-sankey レイアウト計算エンジン
 *
 * 【設計ポイント】
 * - d3-sankeyの最適な使い方を実装
 * - 入力データの正規化（文字列ID → インデックス変換）
 * - レイアウト計算結果のキャッシュ
 */

import {
  sankey,
  sankeyLinkHorizontal,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify,
} from 'd3-sankey';

import type {
  SankeyData,
  SankeyNodeDatum,
  SankeyLinkDatum,
  SankeyChartConfig,
  ComputedGraph,
  ComputedNode,
  ComputedLink,
  NodeAlignment,
} from '../types';
import { getLinkSortFunction } from '../utils/link-sort';

// ============================================================
// アライメント関数マッピング
// ============================================================

const ALIGNMENT_MAP = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify,
} as const;

// ============================================================
// SankeyLayout クラス
// ============================================================

export class SankeyLayout {
  private config: SankeyChartConfig;
  private cachedGraph: ComputedGraph | null = null;
  private lastDataHash: string = '';

  constructor(config: SankeyChartConfig) {
    this.config = config;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<SankeyChartConfig>): void {
    this.config = { ...this.config, ...config };
    // 設定変更時はキャッシュをクリア
    this.cachedGraph = null;
  }

  /**
   * レイアウト計算を実行
   *
   * 【d3-sankeyの最適な使い方】
   * 1. sankey()でジェネレータを作成
   * 2. 各種設定を適用（nodeWidth, nodePadding, extent, etc.）
   * 3. ノード配置アルゴリズムを指定
   * 4. グラフデータを渡して計算実行
   */
  compute(data: SankeyData): ComputedGraph {
    // データハッシュでキャッシュ判定
    const dataHash = this.computeDataHash(data);
    if (this.cachedGraph && dataHash === this.lastDataHash) {
      return this.cachedGraph;
    }

    // 入力データを正規化（文字列ID → オブジェクト参照）
    const normalizedData = this.normalizeData(data);

    const { width, height, margin, layout } = this.config;

    // d3-sankeyジェネレータの構築
    const sankeyGenerator = sankey<SankeyNodeDatum, SankeyLinkDatum>()
      // ノードの幅（水平方向のバーの太さ）
      .nodeWidth(layout.nodeWidth)
      // ノード間の垂直パディング
      .nodePadding(layout.nodePadding)
      // 描画領域の範囲
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ])
      // ノード配置アルゴリズム
      .nodeAlign(ALIGNMENT_MAP[layout.nodeAlignment])
      // ノードID取得関数（文字列IDを使用）
      .nodeId((d) => d.id)
      // レイアウト反復回数（多いほど最適化されるが計算コスト増）
      .iterations(layout.iterations);

    // リンクソート設定（交差最小化）
    const linkSortMode = layout.linkSort ?? 'ascending';
    const linkSortFn = getLinkSortFunction(linkSortMode);
    if (linkSortFn) {
      sankeyGenerator.linkSort(linkSortFn);
    }

    // レイアウト計算実行
    const graph = sankeyGenerator(normalizedData);

    // キャッシュ更新
    this.cachedGraph = graph;
    this.lastDataHash = dataHash;

    return graph;
  }

  /**
   * リンクパスジェネレータを取得
   *
   * sankeyLinkHorizontal()は水平方向のベジェ曲線を生成
   * これがSankeyチャートの「流れ」を表現する
   */
  getLinkPathGenerator(): (link: ComputedLink) => string | null {
    return sankeyLinkHorizontal<ComputedNode, ComputedLink>();
  }

  /**
   * ノードの矩形を計算
   */
  getNodeRect(node: ComputedNode): { x: number; y: number; width: number; height: number } {
    return {
      x: node.x0 ?? 0,
      y: node.y0 ?? 0,
      width: (node.x1 ?? 0) - (node.x0 ?? 0),
      height: (node.y1 ?? 0) - (node.y0 ?? 0),
    };
  }

  /**
   * 特定ノードに関連するリンクを取得（ハイライト用）
   */
  getConnectedLinks(node: ComputedNode): ComputedLink[] {
    const connected: ComputedLink[] = [];

    // 入力リンク
    if (node.targetLinks) {
      connected.push(...node.targetLinks);
    }

    // 出力リンク
    if (node.sourceLinks) {
      connected.push(...node.sourceLinks);
    }

    return connected;
  }

  /**
   * 特定ノードに接続されているノードを取得（ハイライト用）
   */
  getConnectedNodes(node: ComputedNode): Set<ComputedNode> {
    const connected = new Set<ComputedNode>();
    connected.add(node);

    // 入力側のノード
    node.targetLinks?.forEach((link) => {
      if (typeof link.source === 'object') {
        connected.add(link.source as ComputedNode);
      }
    });

    // 出力側のノード
    node.sourceLinks?.forEach((link) => {
      if (typeof link.target === 'object') {
        connected.add(link.target as ComputedNode);
      }
    });

    return connected;
  }

  /**
   * 入力データの正規化
   * d3-sankeyはリンクのsource/targetにノードオブジェクトまたはインデックスを期待
   * ここでは文字列IDを使用し、nodeId()で解決させる
   */
  private normalizeData(data: SankeyData): { nodes: SankeyNodeDatum[]; links: SankeyLinkDatum[] } {
    // ノードIDの重複チェック
    const nodeIds = new Set<string>();
    const nodes = data.nodes.map((node) => {
      if (nodeIds.has(node.id)) {
        console.warn(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
      return { ...node };
    });

    // リンクのバリデーション
    const links = data.links
      .filter((link) => {
        if (!nodeIds.has(link.source)) {
          console.warn(`Link source not found: ${link.source}`);
          return false;
        }
        if (!nodeIds.has(link.target)) {
          console.warn(`Link target not found: ${link.target}`);
          return false;
        }
        if (link.value <= 0) {
          console.warn(`Invalid link value: ${link.value}`);
          return false;
        }
        return true;
      })
      .map((link) => ({ ...link }));

    return { nodes, links };
  }

  /**
   * データハッシュ計算（キャッシュ用）
   */
  private computeDataHash(data: SankeyData): string {
    // 簡易的なハッシュ（本番では高速なハッシュ関数を使用推奨）
    return JSON.stringify({
      nodes: data.nodes.map((n) => n.id),
      links: data.links.map((l) => `${l.source}-${l.target}-${l.value}`),
      config: {
        width: this.config.width,
        height: this.config.height,
        layout: this.config.layout,
      },
    });
  }
}

// ============================================================
// ファクトリー関数
// ============================================================

export function createSankeyLayout(config: SankeyChartConfig): SankeyLayout {
  return new SankeyLayout(config);
}
