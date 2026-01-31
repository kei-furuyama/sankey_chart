import { describe, it, expect } from 'vitest';
import { transformDataView, DataView } from '../dataViewTransformer';

describe('transformDataView', () => {
  it('returns null when dataView is undefined', () => {
    expect(transformDataView(undefined)).toBeNull();
  });

  it('returns null when categorical data is missing', () => {
    const dataView: DataView = {};
    expect(transformDataView(dataView)).toBeNull();
  });

  it('returns null when required columns are missing', () => {
    const dataView: DataView = {
      categorical: {
        categories: [],
        values: [],
      },
    };
    expect(transformDataView(dataView)).toBeNull();
  });

  it('transforms valid DataView to SankeyData', () => {
    const dataView: DataView = {
      categorical: {
        categories: [
          {
            source: { displayName: 'Source', roles: { Source: true } },
            values: ['A', 'A', 'B'],
          },
          {
            source: { displayName: 'Target', roles: { Target: true } },
            values: ['B', 'C', 'C'],
          },
        ],
        values: Object.assign(
          [
            {
              source: { displayName: 'Value', roles: { Value: true } },
              values: [10, 20, 30],
            },
          ],
          { grouped: () => [] }
        ),
      },
    };

    const result = transformDataView(dataView);

    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(3);
    expect(result!.links).toHaveLength(3);

    // Check nodes
    const nodeIds = result!.nodes.map(n => n.id);
    expect(nodeIds).toContain('A');
    expect(nodeIds).toContain('B');
    expect(nodeIds).toContain('C');

    // Check links
    const linkAB = result!.links.find(l => l.source === 'A' && l.target === 'B');
    expect(linkAB?.value).toBe(10);

    const linkAC = result!.links.find(l => l.source === 'A' && l.target === 'C');
    expect(linkAC?.value).toBe(20);

    const linkBC = result!.links.find(l => l.source === 'B' && l.target === 'C');
    expect(linkBC?.value).toBe(30);
  });

  it('aggregates duplicate links with sum by default', () => {
    const dataView: DataView = {
      categorical: {
        categories: [
          {
            source: { displayName: 'Source', roles: { Source: true } },
            values: ['A', 'A'],
          },
          {
            source: { displayName: 'Target', roles: { Target: true } },
            values: ['B', 'B'],
          },
        ],
        values: Object.assign(
          [
            {
              source: { displayName: 'Value', roles: { Value: true } },
              values: [10, 20],
            },
          ],
          { grouped: () => [] }
        ),
      },
    };

    const result = transformDataView(dataView);

    expect(result).not.toBeNull();
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0]!.value).toBe(30);
  });

  it('filters non-positive values by default', () => {
    const dataView: DataView = {
      categorical: {
        categories: [
          {
            source: { displayName: 'Source', roles: { Source: true } },
            values: ['A', 'B', 'C'],
          },
          {
            source: { displayName: 'Target', roles: { Target: true } },
            values: ['B', 'C', 'D'],
          },
        ],
        values: Object.assign(
          [
            {
              source: { displayName: 'Value', roles: { Value: true } },
              values: [10, 0, -5],
            },
          ],
          { grouped: () => [] }
        ),
      },
    };

    const result = transformDataView(dataView);

    expect(result).not.toBeNull();
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0]!.source).toBe('A');
    expect(result!.links[0]!.target).toBe('B');
  });

  it('assigns colors from colorScheme', () => {
    const customColors = ['#ff0000', '#00ff00', '#0000ff'];
    const dataView: DataView = {
      categorical: {
        categories: [
          {
            source: { displayName: 'Source', roles: { Source: true } },
            values: ['A', 'B'],
          },
          {
            source: { displayName: 'Target', roles: { Target: true } },
            values: ['B', 'C'],
          },
        ],
        values: Object.assign(
          [
            {
              source: { displayName: 'Value', roles: { Value: true } },
              values: [10, 20],
            },
          ],
          { grouped: () => [] }
        ),
      },
    };

    const result = transformDataView(dataView, { colorScheme: customColors });

    expect(result).not.toBeNull();
    result!.nodes.forEach(node => {
      expect(customColors).toContain(node.color);
    });
  });

  it('handles empty string sources/targets', () => {
    const dataView: DataView = {
      categorical: {
        categories: [
          {
            source: { displayName: 'Source', roles: { Source: true } },
            values: ['A', '', 'B'],
          },
          {
            source: { displayName: 'Target', roles: { Target: true } },
            values: ['B', 'C', ''],
          },
        ],
        values: Object.assign(
          [
            {
              source: { displayName: 'Value', roles: { Value: true } },
              values: [10, 20, 30],
            },
          ],
          { grouped: () => [] }
        ),
      },
    };

    const result = transformDataView(dataView);

    expect(result).not.toBeNull();
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0]!.source).toBe('A');
    expect(result!.links[0]!.target).toBe('B');
  });
});
