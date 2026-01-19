/**
 * useResize Hook
 *
 * コンテナのサイズ変更を検知するユーティリティフック。
 * ResizeObserverを使用してリアクティブにサイズを取得します。
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface Size {
  width: number;
  height: number;
}

export interface UseResizeOptions {
  /** デバウンス時間 (ms) */
  debounce?: number;
  /** 初期サイズ */
  initialSize?: Size;
}

export function useResize(options: UseResizeOptions = {}): {
  ref: React.RefObject<HTMLDivElement>;
  size: Size;
} {
  const { debounce = 100, initialSize = { width: 0, height: 0 } } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>(initialSize);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    }, debounce);
  }, [debounce]);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(handleResize);
    observer.observe(ref.current);

    // 初期サイズを設定
    const { width, height } = ref.current.getBoundingClientRect();
    setSize({ width, height });

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleResize]);

  return { ref, size };
}
