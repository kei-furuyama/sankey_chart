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
} from '../types';
import { tryResolveNodeFromLink } from '../types';
import { getLinkSortFunction } from '../utils/link-sort';

function fnv1aHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const ALIGNMENT_MAP = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify,
} as const;

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

    // リンクソート設定
    // getLinkSortFunction returns:
    // - undefined: use d3-sankey's internal crossing-minimization (don't call linkSort at all)
    // - null: disable all sorting (explicit null)
    // - function: use custom comparator
    const linkSortMode = layout.linkSort ?? 'ascending';
    const linkSortFn = getLinkSortFunction(linkSortMode);
    if (linkSortFn !== undefined) {
      // Only set linkSort if we have a specific value (function or null)
      // Leaving linkSort unset (undefined) lets d3-sankey use its internal algorithm
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
   * 増分更新（ノード位置のみ変更された場合用）
   */
  updateNodePositions(
    graph: ComputedGraph,
    updates: Map<string, { x?: number; y?: number }>
  ): ComputedGraph {
    const updatedNodes = graph.nodes.map((node) => {
      const update = updates.get(node.id);
      if (!update) return node;
      const newNode = { ...node };
      if (update.x !== undefined) {
        const w = (node.x1 ?? 0) - (node.x0 ?? 0);
        newNode.x0 = update.x;
        newNode.x1 = update.x + w;
      }
      if (update.y !== undefined) {
        const h = (node.y1 ?? 0) - (node.y0 ?? 0);
        newNode.y0 = update.y;
        newNode.y1 = update.y + h;
      }
      return newNode;
    });
    return { nodes: updatedNodes, links: graph.links };
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
      const source = tryResolveNodeFromLink(link.source);
      if (source) connected.add(source);
    });

    // 出力側のノード
    node.sourceLinks?.forEach((link) => {
      const target = tryResolveNodeFromLink(link.target);
      if (target) connected.add(target);
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

  private computeDataHash(data: SankeyData): string {
    const { width, height, layout } = this.config;
    const parts: string[] = [];
    for (const n of data.nodes) parts.push(n.id);
    for (const l of data.links) parts.push(`${l.source}-${l.target}-${l.value}`);
    parts.push(`${width}_${height}_${layout.nodeWidth}_${layout.nodePadding}_${layout.nodeAlignment}_${layout.iterations}_${layout.linkSort ?? 'ascending'}`);
    return fnv1aHash(parts.join('\0'));
  }
}

export function createSankeyLayout(config: SankeyChartConfig): SankeyLayout {
  return new SankeyLayout(config);
}
