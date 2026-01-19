/**
 * Web Worker Hook for Sankey Layout
 * React から Web Worker を使用するためのフック
 *
 * 機能:
 * - Worker の自動初期化と破棄
 * - 計算のキャンセル対応
 * - フォールバック（Worker 非対応環境）
 * - プログレス通知
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import type {
  SankeyData,
  SankeyLayoutConfig,
  ComputedGraph,
} from '../types';
import type {
  WorkerInputMessage,
  WorkerOutputMessage,
} from './layoutWorker';

// ============================================================
// Types
// ============================================================

export interface UseLayoutWorkerOptions {
  /** Worker使用を強制的に無効化 */
  disabled?: boolean;
  /** フォールバック関数（Worker非対応時） */
  fallback?: (
    data: SankeyData,
    width: number,
    height: number,
    config: SankeyLayoutConfig
  ) => ComputedGraph;
}

export interface UseLayoutWorkerResult {
  /** 計算実行 */
  compute: (
    data: SankeyData,
    width: number,
    height: number,
    config: SankeyLayoutConfig
  ) => Promise<{ graph: ComputedGraph; paths: Map<number, string>; computeTime: number }>;
  /** 計算キャンセル */
  cancel: () => void;
  /** 計算中かどうか */
  isComputing: boolean;
  /** プログレス (0-1) */
  progress: number;
  /** Worker が利用可能か */
  isWorkerAvailable: boolean;
  /** エラー */
  error: string | null;
}

// ============================================================
// Worker Creation
// ============================================================

function createWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }

  try {
    // Vite/Webpack の Worker import 構文
    // 実際のバンドラー設定に応じて調整が必要
    const workerUrl = new URL('./layoutWorker.ts', import.meta.url);
    return new Worker(workerUrl, { type: 'module' });
  } catch {
    console.warn('Failed to create Web Worker for Sankey layout');
    return null;
  }
}

// ============================================================
// Hook Implementation
// ============================================================

export function useLayoutWorker(
  options: UseLayoutWorkerOptions = {}
): UseLayoutWorkerResult {
  const { disabled = false, fallback } = options;

  const workerRef = useRef<Worker | null>(null);
  const taskIdRef = useRef<string | null>(null);
  const resolveRef = useRef<((value: {
    graph: ComputedGraph;
    paths: Map<number, string>;
    computeTime: number;
  }) => void) | null>(null);
  const rejectRef = useRef<((reason: Error) => void) | null>(null);

  const [isComputing, setIsComputing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isWorkerAvailable, setIsWorkerAvailable] = useState(false);

  // Worker 初期化
  useEffect(() => {
    if (disabled) {
      setIsWorkerAvailable(false);
      return;
    }

    const worker = createWorker();
    if (worker) {
      workerRef.current = worker;
      setIsWorkerAvailable(true);

      worker.onmessage = (event: MessageEvent<WorkerOutputMessage>) => {
        const message = event.data;

        // タスクIDが一致しない場合は無視
        if (message.id !== taskIdRef.current) {
          return;
        }

        switch (message.type) {
          case 'result':
            setIsComputing(false);
            setProgress(1);
            setError(null);
            resolveRef.current?.({
              graph: message.graph!,
              paths: message.paths ?? new Map(),
              computeTime: message.computeTime ?? 0,
            });
            taskIdRef.current = null;
            break;

          case 'error':
            setIsComputing(false);
            setError(message.error ?? 'Unknown error');
            rejectRef.current?.(new Error(message.error));
            taskIdRef.current = null;
            break;

          case 'progress':
            setProgress(message.progress ?? 0);
            break;

          case 'aborted':
            setIsComputing(false);
            setProgress(0);
            rejectRef.current?.(new Error('Computation aborted'));
            taskIdRef.current = null;
            break;
        }
      };

      worker.onerror = (e) => {
        setIsComputing(false);
        setError(e.message);
        rejectRef.current?.(new Error(e.message));
      };
    } else {
      setIsWorkerAvailable(false);
    }

    return () => {
      worker?.terminate();
      workerRef.current = null;
    };
  }, [disabled]);

  // 計算実行
  const compute = useCallback(
    (
      data: SankeyData,
      width: number,
      height: number,
      config: SankeyLayoutConfig
    ): Promise<{ graph: ComputedGraph; paths: Map<number, string>; computeTime: number }> => {
      return new Promise((resolve, reject) => {
        const worker = workerRef.current;

        // Worker が使用できない場合はフォールバック
        if (!worker || !isWorkerAvailable) {
          if (fallback) {
            try {
              const startTime = performance.now();
              const graph = fallback(data, width, height, config);
              const computeTime = performance.now() - startTime;
              resolve({ graph, paths: new Map(), computeTime });
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error('Web Worker is not available and no fallback provided'));
          }
          return;
        }

        // 既存の計算をキャンセル
        if (taskIdRef.current) {
          worker.postMessage({
            type: 'abort',
            id: taskIdRef.current,
          } as WorkerInputMessage);
        }

        // 新しいタスクID
        const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        taskIdRef.current = taskId;
        resolveRef.current = resolve;
        rejectRef.current = reject;

        setIsComputing(true);
        setProgress(0);
        setError(null);

        // Worker に送信
        worker.postMessage({
          type: 'compute',
          id: taskId,
          data,
          width,
          height,
          config,
        } as WorkerInputMessage);
      });
    },
    [isWorkerAvailable, fallback]
  );

  // キャンセル
  const cancel = useCallback(() => {
    const worker = workerRef.current;
    if (worker && taskIdRef.current) {
      worker.postMessage({
        type: 'abort',
        id: taskIdRef.current,
      } as WorkerInputMessage);
      taskIdRef.current = null;
      setIsComputing(false);
      setProgress(0);
    }
  }, []);

  return {
    compute,
    cancel,
    isComputing,
    progress,
    isWorkerAvailable,
    error,
  };
}

// ============================================================
// Standalone Worker Manager (非React用)
// ============================================================

export class LayoutWorkerManager {
  private worker: Worker | null = null;
  private taskId: string | null = null;
  private resolvers = new Map<string, {
    resolve: (value: { graph: ComputedGraph; paths: Map<number, string>; computeTime: number }) => void;
    reject: (reason: Error) => void;
  }>();

  constructor() {
    this.worker = createWorker();

    if (this.worker) {
      this.worker.onmessage = (event: MessageEvent<WorkerOutputMessage>) => {
        const message = event.data;
        const resolver = this.resolvers.get(message.id);

        if (!resolver) return;

        switch (message.type) {
          case 'result':
            resolver.resolve({
              graph: message.graph!,
              paths: message.paths ?? new Map(),
              computeTime: message.computeTime ?? 0,
            });
            this.resolvers.delete(message.id);
            break;

          case 'error':
            resolver.reject(new Error(message.error));
            this.resolvers.delete(message.id);
            break;

          case 'aborted':
            resolver.reject(new Error('Computation aborted'));
            this.resolvers.delete(message.id);
            break;
        }
      };
    }
  }

  get isAvailable(): boolean {
    return this.worker !== null;
  }

  compute(
    data: SankeyData,
    width: number,
    height: number,
    config: SankeyLayoutConfig
  ): Promise<{ graph: ComputedGraph; paths: Map<number, string>; computeTime: number }> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Web Worker is not available'));
        return;
      }

      const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      this.taskId = taskId;
      this.resolvers.set(taskId, { resolve, reject });

      this.worker.postMessage({
        type: 'compute',
        id: taskId,
        data,
        width,
        height,
        config,
      } as WorkerInputMessage);
    });
  }

  cancel(): void {
    if (this.worker && this.taskId) {
      this.worker.postMessage({
        type: 'abort',
        id: this.taskId,
      } as WorkerInputMessage);
    }
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.resolvers.clear();
  }
}
