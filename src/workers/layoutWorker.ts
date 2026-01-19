/**
 * Sankey Layout Web Worker
 * 大規模データセットのレイアウト計算をメインスレッドから分離
 *
 * 使用条件:
 * - ノード数 >= 1000（デフォルト閾値）
 * - ユーザーが明示的に有効化
 *
 * 注意:
 * - d3-sankey はWeb Worker内で使用可能
 * - DOM操作は不可
 * - Transferable Objects でパフォーマンス向上
 */

import {
  sankey,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify,
  sankeyLinkHorizontal,
} from 'd3-sankey';
import type {
  SankeyData,
  SankeyNodeDatum,
  SankeyLinkDatum,
  SankeyLayoutConfig,
  NodeAlignment,
  ComputedGraph,
} from '../types';

// ============================================================
// Message Types
// ============================================================

export interface WorkerInputMessage {
  type: 'compute' | 'abort';
  id: string;
  data?: SankeyData;
  width?: number;
  height?: number;
  config?: SankeyLayoutConfig;
}

export interface WorkerOutputMessage {
  type: 'result' | 'error' | 'progress' | 'aborted';
  id: string;
  graph?: ComputedGraph;
  paths?: Map<number, string>;
  error?: string;
  progress?: number;
  computeTime?: number;
}

// ============================================================
// Alignment Map
// ============================================================

const alignmentMap = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify,
};

// ============================================================
// Worker Context
// ============================================================

let currentTaskId: string | null = null;
let aborted = false;

// ============================================================
// Layout Computation
// ============================================================

function computeLayout(
  data: SankeyData,
  width: number,
  height: number,
  config: SankeyLayoutConfig
): ComputedGraph {
  // ノードをIDでマッピング
  const nodeMap = new Map(data.nodes.map((n, i) => [n.id, i]));

  // リンクのsource/targetをインデックスに変換
  const links = data.links.map(link => ({
    ...link,
    source: nodeMap.get(link.source) ?? 0,
    target: nodeMap.get(link.target) ?? 0,
  }));

  // ジェネレーター設定
  const generator = sankey<SankeyNodeDatum, SankeyLinkDatum>()
    .nodeId((d: SankeyNodeDatum) => d.id)
    .nodeWidth(config.nodeWidth)
    .nodePadding(config.nodePadding)
    .nodeAlign(alignmentMap[config.nodeAlignment])
    .extent([[0, 0], [width, height]])
    .iterations(config.iterations);

  // 計算実行
  const graph = generator({
    nodes: data.nodes.map(n => ({ ...n })),
    links: links,
  });

  return graph;
}

/**
 * 全リンクのパスを生成
 */
function generatePaths(graph: ComputedGraph): string[] {
  const pathGenerator = sankeyLinkHorizontal();
  return graph.links.map(link => pathGenerator(link) ?? '');
}

// ============================================================
// Message Handler
// ============================================================

self.onmessage = (event: MessageEvent<WorkerInputMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'compute': {
      currentTaskId = message.id;
      aborted = false;

      const { data, width, height, config } = message;

      if (!data || !width || !height || !config) {
        self.postMessage({
          type: 'error',
          id: message.id,
          error: 'Missing required parameters',
        } as WorkerOutputMessage);
        return;
      }

      try {
        const startTime = performance.now();

        // プログレス報告（開始）
        self.postMessage({
          type: 'progress',
          id: message.id,
          progress: 0.1,
        } as WorkerOutputMessage);

        // レイアウト計算
        const graph = computeLayout(data, width, height, config);

        if (aborted) {
          self.postMessage({
            type: 'aborted',
            id: message.id,
          } as WorkerOutputMessage);
          return;
        }

        // プログレス報告（レイアウト完了）
        self.postMessage({
          type: 'progress',
          id: message.id,
          progress: 0.7,
        } as WorkerOutputMessage);

        // パス生成
        const paths = generatePaths(graph);

        if (aborted) {
          self.postMessage({
            type: 'aborted',
            id: message.id,
          } as WorkerOutputMessage);
          return;
        }

        const computeTime = performance.now() - startTime;

        // 結果送信
        self.postMessage({
          type: 'result',
          id: message.id,
          graph,
          paths: new Map(paths.map((p, i) => [i, p])),
          computeTime,
        } as WorkerOutputMessage);

      } catch (error) {
        self.postMessage({
          type: 'error',
          id: message.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as WorkerOutputMessage);
      }

      currentTaskId = null;
      break;
    }

    case 'abort': {
      if (currentTaskId === message.id) {
        aborted = true;
      }
      break;
    }
  }
};

// Worker として export（TypeScript用）
export {};
