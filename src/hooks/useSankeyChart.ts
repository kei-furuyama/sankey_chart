/**
 * Sankey Chart React Hooks
 * パフォーマンス最適化されたカスタムフック集
 *
 * 最適化ポイント:
 * - useMemo による計算結果のメモ化
 * - useCallback によるコールバック安定化
 * - デバウンス/スロットリング
 * - ResizeObserver による効率的なリサイズ検知
 */

import {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
  useLayoutEffect,
} from 'react';
import type {
  SankeyData,
  SankeyChartConfig,
  ComputedGraph,
  ComputedNode,
  ComputedLink,
  PerformanceMetrics,
  RendererType,
} from '../types';
import { SankeyLayoutEngine } from '../core/SankeyLayoutEngine';

// ============================================================
// useDebounce
// ============================================================

/**
 * デバウンスされた値を返す
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================
// useThrottle
// ============================================================

/**
 * スロットリングされたコールバックを返す
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): T {
  const lastRan = useRef(Date.now());
  const lastFunc = useRef<ReturnType<typeof setTimeout>>();

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRan.current >= limit) {
        callback(...args);
        lastRan.current = now;
      } else {
        if (lastFunc.current) {
          clearTimeout(lastFunc.current);
        }
        lastFunc.current = setTimeout(() => {
          callback(...args);
          lastRan.current = Date.now();
        }, limit - (now - lastRan.current));
      }
    }) as T,
    [callback, limit]
  );
}

// ============================================================
// useResizeObserver
// ============================================================

interface Size {
  width: number;
  height: number;
}

/**
 * 要素のサイズ変更を監視
 */
export function useResizeObserver(
  ref: React.RefObject<HTMLElement>,
  debounceMs = 16
): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new ResizeObserver((entries) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          setSize((prev) => {
            // 変化がない場合は更新しない
            if (prev.width === width && prev.height === height) {
              return prev;
            }
            return { width, height };
          });
        }
      }, debounceMs);
    });

    observer.observe(element);

    // 初期サイズ設定
    const rect = element.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      observer.disconnect();
    };
  }, [ref, debounceMs]);

  return size;
}

// ============================================================
// useSankeyLayout
// ============================================================

interface UseSankeyLayoutOptions {
  data: SankeyData;
  config: SankeyChartConfig;
  width: number;
  height: number;
}

interface UseSankeyLayoutResult {
  graph: ComputedGraph | null;
  layoutTime: number;
  fromCache: boolean;
}

/**
 * Sankeyレイアウト計算（メモ化付き）
 */
export function useSankeyLayout(
  options: UseSankeyLayoutOptions
): UseSankeyLayoutResult {
  const { data, config, width, height } = options;
  const engineRef = useRef<SankeyLayoutEngine | null>(null);

  // エンジンの遅延初期化
  if (!engineRef.current) {
    engineRef.current = new SankeyLayoutEngine({
      enableCache: config.performance.enableLayoutCache,
    });
  }

  // 内部幅/高さの計算
  const innerWidth = width - config.margin.left - config.margin.right;
  const innerHeight = height - config.margin.top - config.margin.bottom;

  // レイアウト計算（メモ化）
  const result = useMemo(() => {
    if (innerWidth <= 0 || innerHeight <= 0 || !data.nodes.length) {
      return {
        graph: null,
        layoutTime: 0,
        fromCache: false,
      };
    }

    const layoutResult = engineRef.current!.compute(
      data,
      innerWidth,
      innerHeight,
      config.layout
    );

    return {
      graph: layoutResult.graph,
      layoutTime: layoutResult.computeTime,
      fromCache: layoutResult.fromCache,
    };
  }, [data, innerWidth, innerHeight, config.layout]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      engineRef.current?.clearCache();
    };
  }, []);

  return result;
}

// ============================================================
// useRendererSelection
// ============================================================

/**
 * 最適なレンダラーを自動選択
 */
export function useRendererSelection(
  nodeCount: number,
  config: SankeyChartConfig
): RendererType {
  return useMemo(() => {
    const { renderer, canvasThreshold } = config.performance;

    if (renderer !== 'auto') {
      return renderer;
    }

    // ノード数に基づく自動選択
    return nodeCount >= canvasThreshold ? 'canvas' : 'svg';
  }, [nodeCount, config.performance]);
}

// ============================================================
// usePerformanceMetrics
// ============================================================

interface UsePerformanceMetricsResult {
  metrics: PerformanceMetrics;
  startMeasure: () => void;
  endMeasure: (phase: 'layout' | 'render') => void;
  recordCacheHit: () => void;
  recordCacheMiss: () => void;
  reset: () => void;
}

/**
 * パフォーマンス計測フック
 */
export function usePerformanceMetrics(
  nodeCount: number,
  linkCount: number
): UsePerformanceMetricsResult {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    layoutTime: 0,
    renderTime: 0,
    totalTime: 0,
    nodeCount,
    linkCount,
    fps: 0,
    cacheHits: 0,
    cacheMisses: 0,
    rendererUsed: 'svg',
    virtualizationActive: false,
    webWorkerUsed: false,
  });

  const measureStartRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // FPS計測
  useEffect(() => {
    let animationId: number;

    const measureFps = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      const avgDelta =
        frameTimesRef.current.reduce((a, b) => a + b, 0) /
        frameTimesRef.current.length;

      setMetrics((prev) => ({
        ...prev,
        fps: Math.round(1000 / avgDelta),
        nodeCount,
        linkCount,
      }));

      animationId = requestAnimationFrame(measureFps);
    };

    animationId = requestAnimationFrame(measureFps);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [nodeCount, linkCount]);

  const startMeasure = useCallback(() => {
    measureStartRef.current = performance.now();
  }, []);

  const endMeasure = useCallback((phase: 'layout' | 'render') => {
    const elapsed = performance.now() - measureStartRef.current;
    setMetrics((prev) => ({
      ...prev,
      [phase === 'layout' ? 'layoutTime' : 'renderTime']: elapsed,
      totalTime: prev.layoutTime + (phase === 'render' ? elapsed : prev.renderTime),
    }));
  }, []);

  const recordCacheHit = useCallback(() => {
    setMetrics((prev) => ({
      ...prev,
      cacheHits: prev.cacheHits + 1,
    }));
  }, []);

  const recordCacheMiss = useCallback(() => {
    setMetrics((prev) => ({
      ...prev,
      cacheMisses: prev.cacheMisses + 1,
    }));
  }, []);

  const reset = useCallback(() => {
    setMetrics({
      layoutTime: 0,
      renderTime: 0,
      totalTime: 0,
      nodeCount,
      linkCount,
      fps: 0,
      cacheHits: 0,
      cacheMisses: 0,
      rendererUsed: 'svg',
      virtualizationActive: false,
      webWorkerUsed: false,
    });
  }, [nodeCount, linkCount]);

  return {
    metrics,
    startMeasure,
    endMeasure,
    recordCacheHit,
    recordCacheMiss,
    reset,
  };
}

// ============================================================
// useEventHandlers
// ============================================================

interface UseEventHandlersOptions {
  graph: ComputedGraph | null;
  onNodeHover?: (node: ComputedNode | null, event: MouseEvent) => void;
  onNodeClick?: (node: ComputedNode, event: MouseEvent) => void;
  onLinkHover?: (link: ComputedLink | null, event: MouseEvent) => void;
  onLinkClick?: (link: ComputedLink, event: MouseEvent) => void;
}

/**
 * イベントハンドラーのメモ化
 */
export function useEventHandlers(options: UseEventHandlersOptions) {
  const { graph, onNodeHover, onNodeClick, onLinkHover, onLinkClick } = options;

  // スロットリングされたホバーハンドラー
  const handleNodeHover = useThrottle(
    useCallback(
      (node: ComputedNode | null, event: MouseEvent) => {
        onNodeHover?.(node, event);
      },
      [onNodeHover]
    ),
    16
  );

  const handleLinkHover = useThrottle(
    useCallback(
      (link: ComputedLink | null, event: MouseEvent) => {
        onLinkHover?.(link, event);
      },
      [onLinkHover]
    ),
    16
  );

  // クリックハンドラー（スロットリング不要）
  const handleNodeClick = useCallback(
    (node: ComputedNode, event: MouseEvent) => {
      onNodeClick?.(node, event);
    },
    [onNodeClick]
  );

  const handleLinkClick = useCallback(
    (link: ComputedLink, event: MouseEvent) => {
      onLinkClick?.(link, event);
    },
    [onLinkClick]
  );

  return {
    handleNodeHover,
    handleNodeClick,
    handleLinkHover,
    handleLinkClick,
  };
}

// ============================================================
// useCleanup
// ============================================================

/**
 * イベントリスナーとリソースのクリーンアップ
 */
export function useCleanup(
  cleanup: () => void,
  dependencies: unknown[]
): void {
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, dependencies);
}
