/**
 * useSankey Hook
 *
 * SankeyEngineをReactで使用するためのカスタムフック。
 * ライフサイクル管理、データ更新、リサイズ対応を行います。
 */

import { useRef, useEffect, useCallback } from 'react';
import { SankeyEngine, createSankeyEngine } from '../../core';
import type { SankeyData, SankeyChartConfig, SankeyEventHandlers } from '../../types';

export interface UseSankeyOptions {
  config?: Partial<SankeyChartConfig>;
  handlers?: SankeyEventHandlers;
  autoResize?: boolean;
}

export interface UseSankeyReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  engine: SankeyEngine | null;
  render: (data: SankeyData) => void;
  update: (data: SankeyData) => void;
  resize: (width: number, height: number) => void;
  highlight: (nodeIds: string[]) => void;
  clearHighlight: () => void;
  exportSVG: () => string | null;
}

export function useSankey(options: UseSankeyOptions = {}): UseSankeyReturn {
  const { config = {}, handlers = {}, autoResize = true } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SankeyEngine | null>(null);
  const dataRef = useRef<SankeyData | null>(null);

  // Engine初期化
  useEffect(() => {
    if (!containerRef.current) return;

    // エンジン作成とマウント
    const engine = createSankeyEngine(config, handlers);
    engine.mount(containerRef.current);
    engineRef.current = engine;

    // 保存されたデータがあれば描画
    if (dataRef.current) {
      engine.render(dataRef.current);
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []); // 初回のみ

  // 設定変更時の再作成
  useEffect(() => {
    if (!containerRef.current || !engineRef.current) return;

    // 設定が変更されたら再作成
    const engine = createSankeyEngine(config, handlers);
    engineRef.current.destroy();
    engine.mount(containerRef.current);
    engineRef.current = engine;

    if (dataRef.current) {
      engine.render(dataRef.current);
    }
  }, [JSON.stringify(config)]); // config変更時

  // リサイズオブザーバー
  useEffect(() => {
    if (!autoResize || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          engineRef.current?.resize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [autoResize]);

  // API methods
  const render = useCallback((data: SankeyData) => {
    dataRef.current = data;
    engineRef.current?.render(data);
  }, []);

  const update = useCallback((data: SankeyData) => {
    dataRef.current = data;
    engineRef.current?.update(data);
  }, []);

  const resize = useCallback((width: number, height: number) => {
    engineRef.current?.resize(width, height);
  }, []);

  const highlight = useCallback((nodeIds: string[]) => {
    engineRef.current?.highlight(nodeIds);
  }, []);

  const clearHighlight = useCallback(() => {
    engineRef.current?.clearHighlight();
  }, []);

  const exportSVG = useCallback(() => {
    return engineRef.current?.exportSVG() ?? null;
  }, []);

  return {
    containerRef,
    engine: engineRef.current,
    render,
    update,
    resize,
    highlight,
    clearHighlight,
    exportSVG,
  };
}
