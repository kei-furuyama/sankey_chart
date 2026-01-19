'use client';

import { useState, useCallback, useRef } from 'react';
import type { ComputedNode, ComputedLink, TooltipData } from '../types';

export interface UseSankeyTooltipOptions {
  /** Delay before showing tooltip (ms) */
  showDelay?: number;
  /** Delay before hiding tooltip (ms) */
  hideDelay?: number;
  /** Offset from cursor */
  offset?: { x: number; y: number };
}

export interface UseSankeyTooltipResult {
  /** Current tooltip data */
  tooltip: TooltipData | null;
  /** Whether tooltip is visible */
  isVisible: boolean;
  /** Show tooltip for a node */
  showNodeTooltip: (node: ComputedNode, event: React.MouseEvent) => void;
  /** Show tooltip for a link */
  showLinkTooltip: (link: ComputedLink, event: React.MouseEvent) => void;
  /** Hide the tooltip */
  hideTooltip: () => void;
  /** Update tooltip position */
  updatePosition: (event: React.MouseEvent) => void;
}

/**
 * Hook for managing tooltips in Sankey diagrams
 *
 * @example
 * ```tsx
 * const { tooltip, isVisible, showNodeTooltip, hideTooltip } = useSankeyTooltip({
 *   showDelay: 100,
 *   hideDelay: 50,
 * });
 * ```
 */
export function useSankeyTooltip(
  options: UseSankeyTooltipOptions = {}
): UseSankeyTooltipResult {
  const { showDelay = 0, hideDelay = 100, offset = { x: 10, y: 10 } } = options;

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const showTooltip = useCallback(
    (data: TooltipData) => {
      clearTimeouts();

      if (showDelay > 0) {
        showTimeoutRef.current = setTimeout(() => {
          setTooltip(data);
          setIsVisible(true);
        }, showDelay);
      } else {
        setTooltip(data);
        setIsVisible(true);
      }
    },
    [showDelay, clearTimeouts]
  );

  const showNodeTooltip = useCallback(
    (node: ComputedNode, event: React.MouseEvent) => {
      showTooltip({
        type: 'node',
        data: node,
        x: event.clientX + offset.x,
        y: event.clientY + offset.y,
      });
    },
    [showTooltip, offset]
  );

  const showLinkTooltip = useCallback(
    (link: ComputedLink, event: React.MouseEvent) => {
      showTooltip({
        type: 'link',
        data: link,
        x: event.clientX + offset.x,
        y: event.clientY + offset.y,
      });
    },
    [showTooltip, offset]
  );

  const hideTooltip = useCallback(() => {
    clearTimeouts();

    if (hideDelay > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setTooltip(null);
      }, hideDelay);
    } else {
      setIsVisible(false);
      setTooltip(null);
    }
  }, [hideDelay, clearTimeouts]);

  const updatePosition = useCallback(
    (event: React.MouseEvent) => {
      if (tooltip) {
        setTooltip((prev) =>
          prev
            ? {
                ...prev,
                x: event.clientX + offset.x,
                y: event.clientY + offset.y,
              }
            : null
        );
      }
    },
    [tooltip, offset]
  );

  return {
    tooltip,
    isVisible,
    showNodeTooltip,
    showLinkTooltip,
    hideTooltip,
    updatePosition,
  };
}
