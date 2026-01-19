'use client';

import { useState, useCallback, useRef } from 'react';
import type { ComputedNode } from '../types';

export interface DragState {
  /** Whether dragging is active */
  isDragging: boolean;
  /** Currently dragged node */
  draggedNode: ComputedNode | null;
  /** Current drag offset */
  offset: { x: number; y: number };
}

export interface UseSankeyDragOptions {
  /** Whether drag is enabled */
  enabled?: boolean;
  /** Constrain drag to vertical movement only */
  constrainToVertical?: boolean;
  /** Minimum Y position */
  minY?: number;
  /** Maximum Y position */
  maxY?: number;
  /** Callback when drag starts */
  onDragStart?: (node: ComputedNode) => void;
  /** Callback during drag */
  onDrag?: (node: ComputedNode, newY: number) => void;
  /** Callback when drag ends */
  onDragEnd?: (node: ComputedNode, finalY: number) => void;
}

export interface UseSankeyDragResult {
  /** Current drag state */
  dragState: DragState;
  /** Handler for mouse down on a node */
  handleMouseDown: (node: ComputedNode, event: React.MouseEvent) => void;
  /** Handler for mouse move */
  handleMouseMove: (event: React.MouseEvent) => void;
  /** Handler for mouse up */
  handleMouseUp: () => void;
  /** Get adjusted Y position for a node during drag */
  getNodeY: (node: ComputedNode) => { y0: number; y1: number };
}

/**
 * Hook for handling node dragging in Sankey diagrams
 *
 * @example
 * ```tsx
 * const { dragState, handleMouseDown, handleMouseMove, handleMouseUp, getNodeY } = useSankeyDrag({
 *   enabled: true,
 *   constrainToVertical: true,
 *   onDragEnd: (node, newY) => {
 *     // Update node position in your data
 *   },
 * });
 * ```
 */
export function useSankeyDrag(
  options: UseSankeyDragOptions = {}
): UseSankeyDragResult {
  const {
    enabled = true,
    constrainToVertical = true,
    minY = 0,
    maxY = Infinity,
    onDragStart,
    onDrag,
    onDragEnd,
  } = options;

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedNode: null,
    offset: { x: 0, y: 0 },
  });

  const startPos = useRef<{ x: number; y: number; nodeY0: number; nodeY1: number } | null>(
    null
  );

  const handleMouseDown = useCallback(
    (node: ComputedNode, event: React.MouseEvent) => {
      if (!enabled) return;

      event.preventDefault();
      event.stopPropagation();

      startPos.current = {
        x: event.clientX,
        y: event.clientY,
        nodeY0: node.y0,
        nodeY1: node.y1,
      };

      setDragState({
        isDragging: true,
        draggedNode: node,
        offset: { x: 0, y: 0 },
      });

      onDragStart?.(node);
    },
    [enabled, onDragStart]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!dragState.isDragging || !dragState.draggedNode || !startPos.current) {
        return;
      }

      const deltaY = event.clientY - startPos.current.y;
      const deltaX = constrainToVertical ? 0 : event.clientX - startPos.current.x;

      // Calculate new Y position with constraints
      const nodeHeight = startPos.current.nodeY1 - startPos.current.nodeY0;
      let newY0 = startPos.current.nodeY0 + deltaY;
      newY0 = Math.max(minY, Math.min(maxY - nodeHeight, newY0));

      setDragState((prev) => ({
        ...prev,
        offset: { x: deltaX, y: newY0 - startPos.current!.nodeY0 },
      }));

      onDrag?.(dragState.draggedNode, newY0);
    },
    [dragState.isDragging, dragState.draggedNode, constrainToVertical, minY, maxY, onDrag]
  );

  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging && dragState.draggedNode && startPos.current) {
      const finalY = startPos.current.nodeY0 + dragState.offset.y;
      onDragEnd?.(dragState.draggedNode, finalY);
    }

    setDragState({
      isDragging: false,
      draggedNode: null,
      offset: { x: 0, y: 0 },
    });
    startPos.current = null;
  }, [dragState, onDragEnd]);

  const getNodeY = useCallback(
    (node: ComputedNode): { y0: number; y1: number } => {
      if (
        dragState.isDragging &&
        dragState.draggedNode &&
        dragState.draggedNode.id === node.id
      ) {
        return {
          y0: node.y0 + dragState.offset.y,
          y1: node.y1 + dragState.offset.y,
        };
      }
      return { y0: node.y0, y1: node.y1 };
    },
    [dragState]
  );

  return {
    dragState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getNodeY,
  };
}
