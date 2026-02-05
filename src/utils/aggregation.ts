/**
 * Shared numeric aggregation helpers.
 */

export type AggregationMethod = 'sum' | 'average' | 'max' | 'min' | 'first' | 'last';

export function aggregateNumbers(values: number[], method: AggregationMethod): number {
  if (values.length === 0) return 0;

  switch (method) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'average':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    case 'first':
      return values.at(0)!;
    case 'last':
      return values.at(-1)!;
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}
