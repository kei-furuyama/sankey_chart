/**
 * Link sorting utilities for Sankey diagrams
 * Shared between core and lib modules
 */

import type { LinkSortMode } from '../types';

/**
 * Get link sort function based on mode
 * Returns a comparator function for d3-sankey's linkSort()
 *
 * @param mode - The sort mode to use
 * @returns A comparator function or undefined for no sorting
 */
export function getLinkSortFunction(
  mode: LinkSortMode
): ((a: { y0?: number; y1?: number; value: number }, b: { y0?: number; y1?: number; value: number }) => number) | undefined {
  switch (mode) {
    case 'ascending':
      // Y-position ascending (minimizes crossing)
      return (a, b) => {
        const aY = (a.y0 ?? 0) + (a.y1 ?? 0);
        const bY = (b.y0 ?? 0) + (b.y1 ?? 0);
        return aY - bY;
      };
    case 'descending':
      // Y-position descending
      return (a, b) => {
        const aY = (a.y0 ?? 0) + (a.y1 ?? 0);
        const bY = (b.y0 ?? 0) + (b.y1 ?? 0);
        return bY - aY;
      };
    case 'byValue':
      // Value ascending (thin links on top)
      return (a, b) => a.value - b.value;
    case 'byValueDesc':
      // Value descending (thick links on top)
      return (a, b) => b.value - a.value;
    case 'none':
    default:
      // No sorting (undefined tells d3-sankey to skip sorting)
      return undefined;
  }
}
