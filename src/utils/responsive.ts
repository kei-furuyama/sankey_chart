/**
 * レスポンシブ対応ユーティリティ
 *
 * 【レスポンシブ対応戦略】
 * 1. ResizeObserverでコンテナサイズを監視
 * 2. デバウンスで頻繁な再描画を抑制
 * 3. viewBox + preserveAspectRatioでSVGスケーリング
 * 4. サイズ変更時はレイアウト再計算 + アニメーション
 *
 * 【2つのアプローチ】
 * A) 固定アスペクト比 + スケーリング
 *    - viewBoxを固定し、SVGがコンテナにフィット
 *    - 計算コスト低、ただしノード/ラベルも拡縮
 *
 * B) 動的リレイアウト
 *    - コンテナサイズに応じてレイアウト再計算
 *    - 最適な表示、ただし計算コスト高
 *
 * このモジュールではBを採用（Power BIの動作に近い）
 */

// ============================================================
// 型定義
// ============================================================

export interface ResizeHandler {
  (width: number, height: number): void;
}

export interface ResponsiveOptions {
  /** デバウンス時間 (ms) */
  debounceMs: number;
  /** 最小幅 */
  minWidth: number;
  /** 最小高さ */
  minHeight: number;
  /** 最大幅（0 = 無制限） */
  maxWidth: number;
  /** 最大高さ（0 = 無制限） */
  maxHeight: number;
}

const DEFAULT_OPTIONS: ResponsiveOptions = {
  debounceMs: 150,
  minWidth: 300,
  minHeight: 200,
  maxWidth: 0,
  maxHeight: 0,
};

// ============================================================
// ResizeManager クラス
// ============================================================

export class ResizeManager {
  private container: HTMLElement;
  private options: ResponsiveOptions;
  private resizeObserver: ResizeObserver | null = null;
  private handlers: Set<ResizeHandler> = new Set();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastWidth: number = 0;
  private lastHeight: number = 0;

  constructor(container: HTMLElement, options: Partial<ResponsiveOptions> = {}) {
    this.container = container;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initialize();
  }

  /**
   * 初期化
   */
  private initialize(): void {
    // 初期サイズを取得
    const rect = this.container.getBoundingClientRect();
    this.lastWidth = this.constrainWidth(rect.width);
    this.lastHeight = this.constrainHeight(rect.height);

    // ResizeObserverを設定
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.container) {
          this.handleResize(entry.contentRect.width, entry.contentRect.height);
        }
      }
    });

    this.resizeObserver.observe(this.container);
  }

  /**
   * リサイズハンドラを追加
   */
  addHandler(handler: ResizeHandler): void {
    this.handlers.add(handler);
    // 追加時に現在のサイズで即座に呼び出し
    handler(this.lastWidth, this.lastHeight);
  }

  /**
   * リサイズハンドラを削除
   */
  removeHandler(handler: ResizeHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * 現在のサイズを取得
   */
  getSize(): { width: number; height: number } {
    return { width: this.lastWidth, height: this.lastHeight };
  }

  /**
   * リサイズイベント処理
   */
  private handleResize(rawWidth: number, rawHeight: number): void {
    const width = this.constrainWidth(rawWidth);
    const height = this.constrainHeight(rawHeight);

    // サイズが変わっていなければスキップ
    if (width === this.lastWidth && height === this.lastHeight) {
      return;
    }

    // デバウンス
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.lastWidth = width;
      this.lastHeight = height;
      this.notifyHandlers(width, height);
    }, this.options.debounceMs);
  }

  /**
   * 幅の制約を適用
   */
  private constrainWidth(width: number): number {
    let result = Math.max(width, this.options.minWidth);
    if (this.options.maxWidth > 0) {
      result = Math.min(result, this.options.maxWidth);
    }
    return Math.floor(result);
  }

  /**
   * 高さの制約を適用
   */
  private constrainHeight(height: number): number {
    let result = Math.max(height, this.options.minHeight);
    if (this.options.maxHeight > 0) {
      result = Math.min(result, this.options.maxHeight);
    }
    return Math.floor(result);
  }

  /**
   * ハンドラに通知
   */
  private notifyHandlers(width: number, height: number): void {
    this.handlers.forEach((handler) => {
      try {
        handler(width, height);
      } catch (error) {
        console.error('ResizeHandler error:', error);
      }
    });
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.resizeObserver?.disconnect();
    this.handlers.clear();
  }
}

// ============================================================
// ユーティリティ関数
// ============================================================

/**
 * デバウンス関数
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * スロットル関数
 */
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastRun >= limitMs) {
      lastRun = now;
      fn(...args);
    } else {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        lastRun = Date.now();
        fn(...args);
      }, limitMs - (now - lastRun));
    }
  };
}

/**
 * アスペクト比を維持したサイズ計算
 */
export function fitWithAspectRatio(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number // width / height
): { width: number; height: number } {
  const containerRatio = containerWidth / containerHeight;

  if (containerRatio > aspectRatio) {
    // コンテナが横長 → 高さに合わせる
    return {
      width: containerHeight * aspectRatio,
      height: containerHeight,
    };
  } else {
    // コンテナが縦長 → 幅に合わせる
    return {
      width: containerWidth,
      height: containerWidth / aspectRatio,
    };
  }
}

// ============================================================
// ファクトリー関数
// ============================================================

export function createResizeManager(
  container: HTMLElement,
  options?: Partial<ResponsiveOptions>
): ResizeManager {
  return new ResizeManager(container, options);
}
