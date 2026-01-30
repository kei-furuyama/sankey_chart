/**
 * Link sorting utilities for Sankey diagrams
 * Shared between core and lib modules
 *
 * d3-sankey's linkSort behavior:
 * - undefined: d3-sankey uses its internal algorithm to minimize link crossings
 *              (reorderLinks/reorderNodeLinks are called during layout iterations)
 * - null: No sorting (links remain in input order, internal reordering is skipped)
 * - function: Custom comparator applied during computeNodeLinks (before y0/y1 are calculated)
 *
 * IMPORTANT: At the time linkSort is called, link.y0 and link.y1 are NOT yet computed.
 * Only link.value, link.source, link.target, and link.index are available.
 * Sorting by y0/y1 will NOT work because they are all undefined at sort time.
 */

import type { LinkSortMode } from '../types';

/**
 * Get link sort function based on mode
 * Returns a comparator function for d3-sankey's linkSort()
 *
 * @param mode - The sort mode to use
 * @returns
 *   - undefined: use d3-sankey's internal crossing-minimization algorithm
 *   - null: disable all sorting (links in input order)
 *   - function: custom comparator
 */
export function getLinkSortFunction(
  mode: LinkSortMode
): ((a: { value: number; index?: number }, b: { value: number; index?: number }) => number) | null | undefined {
  switch (mode) {
    case 'ascending':
      // Let d3-sankey use its internal crossing-minimization algorithm
      // This is achieved by returning undefined, which triggers reorderLinks/reorderNodeLinks
      return undefined;
    case 'descending':
      // Sort by value descending (large flows first)
      // Note: y0/y1 are not available at sort time, so we sort by value instead
      return (a, b) => b.value - a.value;
    case 'byValue':
      // Value ascending (thin links on top)
      return (a, b) => a.value - b.value;
    case 'byValueDesc':
      // Value descending (thick links on top)
      return (a, b) => b.value - a.value;
    case 'none':
      // No sorting - return null to disable all link sorting including internal reordering
      return null;
    default:
      return undefined;
  }
}
