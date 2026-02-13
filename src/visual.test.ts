import { describe, it, expect, vi } from 'vitest';

// Mock Power BI formatting modules (not needed for pure function tests)
vi.mock('powerbi-visuals-utils-formattingmodel', () => ({
  formattingSettings: {
    SimpleCard: class {},
    Model: class {},
    NumUpDown: class { constructor() {} },
    ColorPicker: class { constructor() {} },
    Slider: class { constructor() {} },
    ItemDropdown: class { constructor() {} },
    ToggleSwitch: class { constructor() {} },
    FontPicker: class { constructor() {} },
  },
  FormattingSettingsService: class {},
}));

vi.mock('powerbi-visuals-utils-formattingutils', () => ({
  valueFormatter: {
    create: () => ({ format: (v: number) => String(v) }),
  },
}));

import {
  extractDropdownValue,
  extractFillColor,
  extractValidatedDropdown,
  getLinkSortFunction,
  resolveNode,
  parseSettings,
  transformDataView,
  resolveCycles,
  DEFAULT_SETTINGS,
  VALID_LINK_SORT_MODES,
  VALID_NODE_COLOR_MODES,
  VALID_LINK_COLOR_MODES,
  VALID_LABEL_COLOR_MODES,
  VALID_DATA_LABEL_DISPLAY_MODES,
  MAX_LAYER_COLORS,
  DEFAULT_LAYER_PALETTE,
} from './visual';

import type {
  VisualSettings,
  LinkSortMode,
  ComputedNode,
  SankeyNodeDatum,
  SankeyLinkDatum,
} from './visual';

// ---------------------------------------------------------------------------
// extractDropdownValue
// ---------------------------------------------------------------------------

describe('extractDropdownValue', () => {
  it('returns default for null', () => {
    expect(extractDropdownValue(null, 'fallback')).toBe('fallback');
  });

  it('returns default for undefined', () => {
    expect(extractDropdownValue(undefined, 'fallback')).toBe('fallback');
  });

  it('returns string value directly', () => {
    expect(extractDropdownValue('hello', 'fallback')).toBe('hello');
  });

  it('returns value from object with value property', () => {
    expect(extractDropdownValue({ value: 'source', displayName: 'Source' }, 'fallback')).toBe('source');
  });

  it('returns default when object has non-string value', () => {
    expect(extractDropdownValue({ value: 42 }, 'fallback')).toBe('fallback');
  });

  it('returns default for empty object', () => {
    expect(extractDropdownValue({}, 'fallback')).toBe('fallback');
  });

  it('returns default for number input', () => {
    expect(extractDropdownValue(123, 'fallback')).toBe('fallback');
  });

  it('returns default for boolean input', () => {
    expect(extractDropdownValue(true, 'fallback')).toBe('fallback');
  });

  it('returns default when value is null in object', () => {
    expect(extractDropdownValue({ value: null }, 'fallback')).toBe('fallback');
  });
});

// ---------------------------------------------------------------------------
// extractFillColor
// ---------------------------------------------------------------------------

describe('extractFillColor', () => {
  it('returns undefined for undefined input', () => {
    expect(extractFillColor(undefined)).toBeUndefined();
  });

  it('returns undefined for null input', () => {
    expect(extractFillColor(null)).toBeUndefined();
  });

  it('returns undefined for empty object', () => {
    expect(extractFillColor({})).toBeUndefined();
  });

  it('returns undefined for object without solid', () => {
    expect(extractFillColor({ color: '#fff' })).toBeUndefined();
  });

  it('returns undefined for solid without color', () => {
    expect(extractFillColor({ solid: {} })).toBeUndefined();
  });

  it('returns the color when present', () => {
    expect(extractFillColor({ solid: { color: '#ff0000' } })).toBe('#ff0000');
  });

  it('returns undefined for non-object', () => {
    expect(extractFillColor('red')).toBeUndefined();
  });

  it('returns undefined when solid.color is undefined', () => {
    expect(extractFillColor({ solid: { color: undefined } })).toBeUndefined();
  });

  it('returns color string for nested fill structure', () => {
    expect(extractFillColor({ solid: { color: '#1f77b4' } })).toBe('#1f77b4');
  });
});

// ---------------------------------------------------------------------------
// extractValidatedDropdown
// ---------------------------------------------------------------------------

describe('extractValidatedDropdown', () => {
  const validModes = ['a', 'b', 'c'] as const;
  type Mode = (typeof validModes)[number];

  it('returns valid value from string', () => {
    expect(extractValidatedDropdown('b', [...validModes], 'a' as Mode)).toBe('b');
  });

  it('returns valid value from object', () => {
    expect(extractValidatedDropdown({ value: 'c' }, [...validModes], 'a' as Mode)).toBe('c');
  });

  it('returns default for invalid value', () => {
    expect(extractValidatedDropdown('x', [...validModes], 'a' as Mode)).toBe('a');
  });

  it('returns default for null', () => {
    expect(extractValidatedDropdown(null, [...validModes], 'a' as Mode)).toBe('a');
  });

  it('returns default for undefined', () => {
    expect(extractValidatedDropdown(undefined, [...validModes], 'a' as Mode)).toBe('a');
  });

  it('validates against VALID_LINK_SORT_MODES', () => {
    expect(extractValidatedDropdown('ascending', VALID_LINK_SORT_MODES, 'ascending')).toBe('ascending');
    expect(extractValidatedDropdown('invalid', VALID_LINK_SORT_MODES, 'ascending')).toBe('ascending');
  });

  it('validates against VALID_NODE_COLOR_MODES', () => {
    expect(extractValidatedDropdown('layer', VALID_NODE_COLOR_MODES, 'category')).toBe('layer');
  });

  it('validates against VALID_LINK_COLOR_MODES', () => {
    expect(extractValidatedDropdown('gradient', VALID_LINK_COLOR_MODES, 'source')).toBe('gradient');
  });

  it('validates against VALID_LABEL_COLOR_MODES', () => {
    expect(extractValidatedDropdown('layer', VALID_LABEL_COLOR_MODES, 'single')).toBe('layer');
  });

  it('validates against VALID_DATA_LABEL_DISPLAY_MODES', () => {
    expect(extractValidatedDropdown('both', VALID_DATA_LABEL_DISPLAY_MODES, 'value')).toBe('both');
  });
});

// ---------------------------------------------------------------------------
// getLinkSortFunction
// ---------------------------------------------------------------------------

describe('getLinkSortFunction', () => {
  it('returns undefined for ascending', () => {
    expect(getLinkSortFunction('ascending')).toBeUndefined();
  });

  it('returns function for descending', () => {
    expect(typeof getLinkSortFunction('descending')).toBe('function');
  });

  it('returns function for byValue', () => {
    expect(typeof getLinkSortFunction('byValue')).toBe('function');
  });

  it('returns function for byValueDesc', () => {
    expect(typeof getLinkSortFunction('byValueDesc')).toBe('function');
  });

  it('returns null for inputOrder', () => {
    expect(getLinkSortFunction('inputOrder')).toBeNull();
  });

  it('returns null for none', () => {
    expect(getLinkSortFunction('none')).toBeNull();
  });

  it('returns undefined for unknown mode', () => {
    expect(getLinkSortFunction('unknown' as LinkSortMode)).toBeUndefined();
  });

  it('descending sorts larger value first', () => {
    const fn = getLinkSortFunction('descending')!;
    expect(fn({ value: 10 }, { value: 20 })).toBeGreaterThan(0);
    expect(fn({ value: 20 }, { value: 10 })).toBeLessThan(0);
  });

  it('byValue sorts smaller value first', () => {
    const fn = getLinkSortFunction('byValue')!;
    expect(fn({ value: 10 }, { value: 20 })).toBeLessThan(0);
    expect(fn({ value: 20 }, { value: 10 })).toBeGreaterThan(0);
  });

  it('byValueDesc sorts larger value first', () => {
    const fn = getLinkSortFunction('byValueDesc')!;
    expect(fn({ value: 10 }, { value: 20 })).toBeGreaterThan(0);
  });

  it('descending and byValueDesc produce same ordering', () => {
    const desc = getLinkSortFunction('descending')!;
    const byValDesc = getLinkSortFunction('byValueDesc')!;
    const items = [{ value: 5 }, { value: 10 }, { value: 1 }];
    const sorted1 = [...items].sort(desc);
    const sorted2 = [...items].sort(byValDesc);
    expect(sorted1).toEqual(sorted2);
  });

  it('returns 0 for equal values', () => {
    const fn = getLinkSortFunction('byValue')!;
    expect(fn({ value: 5 }, { value: 5 })).toBe(0);
  });

  it('handles zero values', () => {
    const fn = getLinkSortFunction('byValue')!;
    expect(fn({ value: 0 }, { value: 1 })).toBeLessThan(0);
    expect(fn({ value: 1 }, { value: 0 })).toBeGreaterThan(0);
  });

  it('handles negative result for ascending sort', () => {
    const fn = getLinkSortFunction('byValue')!;
    expect(fn({ value: 3 }, { value: 7 })).toBe(-4);
  });
});

// ---------------------------------------------------------------------------
// resolveNode
// ---------------------------------------------------------------------------

describe('resolveNode', () => {
  const mockNode = { id: 'A', name: 'A' } as unknown as ComputedNode;

  it('returns object when it has id property', () => {
    expect(resolveNode(mockNode)).toBe(mockNode);
  });

  it('throws for string', () => {
    expect(() => resolveNode('A' as unknown as ComputedNode)).toThrow();
  });

  it('throws for number', () => {
    expect(() => resolveNode(0 as unknown as ComputedNode)).toThrow();
  });

  it('throws for null', () => {
    expect(() => resolveNode(null as unknown as ComputedNode)).toThrow();
  });

  it('throws for undefined', () => {
    expect(() => resolveNode(undefined as unknown as ComputedNode)).toThrow();
  });

  it('returns node with full properties', () => {
    const full = { id: 'B', name: 'B', x0: 0, x1: 10, y0: 0, y1: 50, depth: 0, value: 100 } as unknown as ComputedNode;
    expect(resolveNode(full)).toBe(full);
  });

  it('throws for object without id', () => {
    expect(() => resolveNode({ name: 'no-id' } as unknown as ComputedNode)).toThrow();
  });

  it('throws for array', () => {
    expect(() => resolveNode([] as unknown as ComputedNode)).toThrow();
  });

  it('returns node with only id property', () => {
    const minimal = { id: 'min' } as unknown as ComputedNode;
    expect(resolveNode(minimal)).toBe(minimal);
  });

  it('error message includes type info', () => {
    expect(() => resolveNode('test' as unknown as ComputedNode)).toThrow('Expected resolved ComputedNode but got string');
  });
});

// ---------------------------------------------------------------------------
// parseSettings
// ---------------------------------------------------------------------------

describe('parseSettings', () => {
  const makeDataView = (objects?: Record<string, Record<string, unknown>>) =>
    ({ metadata: { objects } }) as unknown as Parameters<typeof parseSettings>[0];

  it('returns defaults when no objects', () => {
    const result = parseSettings(makeDataView(undefined));
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults when metadata is undefined', () => {
    const result = parseSettings({ metadata: undefined } as unknown as Parameters<typeof parseSettings>[0]);
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('parses nodeWidth', () => {
    const result = parseSettings(makeDataView({ nodeSettings: { width: 30 } }));
    expect(result.nodeWidth).toBe(30);
  });

  it('parses nodePadding', () => {
    const result = parseSettings(makeDataView({ nodeSettings: { padding: 20 } }));
    expect(result.nodePadding).toBe(20);
  });

  it('parses iterations', () => {
    const result = parseSettings(makeDataView({ nodeSettings: { iterations: 12 } }));
    expect(result.iterations).toBe(12);
  });

  it('parses nodeDefaultColor', () => {
    const result = parseSettings(makeDataView({ nodeSettings: { defaultColor: { solid: { color: '#ff0000' } } } }));
    expect(result.nodeDefaultColor).toBe('#ff0000');
  });

  it('parses nodeColorMode', () => {
    const result = parseSettings(makeDataView({ nodeSettings: { colorMode: 'single' } }));
    expect(result.nodeColorMode).toBe('single');
  });

  it('parses linkOpacity (divides by 100)', () => {
    const result = parseSettings(makeDataView({ linkSettings: { opacity: 70 } }));
    expect(result.linkOpacity).toBe(0.7);
  });

  it('parses linkColorMode', () => {
    const result = parseSettings(makeDataView({ linkSettings: { colorMode: 'gradient' } }));
    expect(result.linkColorMode).toBe('gradient');
  });

  it('parses linkSort', () => {
    const result = parseSettings(makeDataView({ linkSettings: { sortMode: 'byValue' } }));
    expect(result.linkSort).toBe('byValue');
  });

  it('parses showLabels', () => {
    const result = parseSettings(makeDataView({ labelSettings: { show: false } }));
    expect(result.showLabels).toBe(false);
  });

  it('parses labelFontSize', () => {
    const result = parseSettings(makeDataView({ labelSettings: { fontSize: 18 } }));
    expect(result.labelFontSize).toBe(18);
  });

  it('parses marginTop', () => {
    const result = parseSettings(makeDataView({ marginSettings: { top: 50 } }));
    expect(result.marginTop).toBe(50);
  });

  it('parses dataLabelDisplayMode', () => {
    const result = parseSettings(makeDataView({ dataLabelSettings: { displayMode: 'percentage' } }));
    expect(result.dataLabelDisplayMode).toBe('percentage');
  });

  it('returns defaults for partial objects', () => {
    const result = parseSettings(makeDataView({ nodeSettings: { width: 40 } }));
    expect(result.nodeWidth).toBe(40);
    expect(result.nodePadding).toBe(DEFAULT_SETTINGS.nodePadding);
    expect(result.linkOpacity).toBe(DEFAULT_SETTINGS.linkOpacity);
  });

  it('handles all settings together', () => {
    const result = parseSettings(makeDataView({
      nodeSettings: { width: 30, padding: 10, iterations: 8 },
      linkSettings: { opacity: 60, colorMode: 'fixed', defaultColor: { solid: { color: '#ccc' } } },
      marginSettings: { top: 10, right: 10, bottom: 10, left: 10 },
    }));
    expect(result.nodeWidth).toBe(30);
    expect(result.nodePadding).toBe(10);
    expect(result.iterations).toBe(8);
    expect(result.linkOpacity).toBe(0.6);
    expect(result.linkColorMode).toBe('fixed');
    expect(result.linkDefaultColor).toBe('#ccc');
    expect(result.marginTop).toBe(10);
  });

  it('falls back to default for invalid colorMode', () => {
    const result = parseSettings(makeDataView({ nodeSettings: { colorMode: 'invalid' } }));
    expect(result.nodeColorMode).toBe(DEFAULT_SETTINGS.nodeColorMode);
  });
});

// ---------------------------------------------------------------------------
// transformDataView
// ---------------------------------------------------------------------------

describe('transformDataView', () => {
  // Minimal mock for IVisualHost
  const mockSelectionId = { getKey: () => 'mock-key' };
  const mockHost = {
    createSelectionIdBuilder: () => ({
      withCategory: () => ({ createSelectionId: () => ({ ...mockSelectionId }) }),
    }),
    colorPalette: {
      getColor: (id: string) => ({ value: `#color-${id}` }),
    },
  } as unknown as Parameters<typeof transformDataView>[0]['host'];

  const makeDataView = (
    sources: (string | null)[],
    targets: (string | null)[],
    values?: (number | null)[],
  ) => ({
    categorical: {
      categories: [
        { source: { roles: { source: true } }, values: sources },
        { source: { roles: { target: true } }, values: targets },
      ],
      values: values
        ? [{ source: { roles: { value: true }, displayName: 'Amount' }, values }]
        : [],
    },
  }) as unknown as Parameters<typeof transformDataView>[0]['dataView'];

  it('returns null for undefined dataView', () => {
    expect(transformDataView({ dataView: undefined, host: mockHost })).toBeNull();
  });

  it('returns null for dataView without categorical', () => {
    expect(transformDataView({ dataView: {} as never, host: mockHost })).toBeNull();
  });

  it('returns null for missing source column', () => {
    const dv = {
      categorical: {
        categories: [{ source: { roles: { target: true } }, values: ['A'] }],
        values: [],
      },
    };
    expect(transformDataView({ dataView: dv as never, host: mockHost })).toBeNull();
  });

  it('returns null for missing target column', () => {
    const dv = {
      categorical: {
        categories: [{ source: { roles: { source: true } }, values: ['A'] }],
        values: [],
      },
    };
    expect(transformDataView({ dataView: dv as never, host: mockHost })).toBeNull();
  });

  it('creates nodes from source and target', () => {
    const result = transformDataView({
      dataView: makeDataView(['A', 'B'], ['C', 'D'], [10, 20]),
      host: mockHost,
    });
    expect(result).not.toBeNull();
    expect(result!.nodes.map(n => n.id).sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('creates links with values', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [42]),
      host: mockHost,
    });
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0].source).toBe('A');
    expect(result!.links[0].target).toBe('B');
    expect(result!.links[0].value).toBe(42);
  });

  it('defaults value to 1 when no value column', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B']),
      host: mockHost,
    });
    expect(result!.links[0].value).toBe(1);
  });

  it('aggregates duplicate links', () => {
    const result = transformDataView({
      dataView: makeDataView(['A', 'A'], ['B', 'B'], [10, 20]),
      host: mockHost,
    });
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0].value).toBe(30);
  });

  it('skips rows where source equals target', () => {
    const result = transformDataView({
      dataView: makeDataView(['A', 'B'], ['A', 'C'], [10, 20]),
      host: mockHost,
    });
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0].source).toBe('B');
  });

  it('skips rows with negative values', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [-5]),
      host: mockHost,
    });
    expect(result!.nodes).toHaveLength(0);
    expect(result!.links).toHaveLength(0);
  });

  it('skips rows with zero values', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [0]),
      host: mockHost,
    });
    expect(result!.nodes).toHaveLength(0);
    expect(result!.links).toHaveLength(0);
  });

  it('skips rows with non-finite values', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [Infinity]),
      host: mockHost,
    });
    expect(result!.nodes).toHaveLength(0);
    expect(result!.links).toHaveLength(0);
  });

  it('skips rows with empty source', () => {
    const result = transformDataView({
      dataView: makeDataView(['', 'A'], ['B', 'C'], [10, 20]),
      host: mockHost,
    });
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0].source).toBe('A');
  });

  it('skips rows with empty target', () => {
    const result = transformDataView({
      dataView: makeDataView(['A', 'B'], ['', 'C'], [10, 20]),
      host: mockHost,
    });
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0].source).toBe('B');
  });

  it('assigns colors in category mode', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [10]),
      host: mockHost,
      nodeColorMode: 'category',
    });
    const colors = result!.nodes.map(n => n.color);
    expect(colors.every(c => c && c.startsWith('#color-'))).toBe(true);
  });

  it('assigns default color in single mode', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [10]),
      host: mockHost,
      nodeColorMode: 'single',
      nodeDefaultColor: '#123456',
    });
    expect(result!.nodes.every(n => n.color === '#123456')).toBe(true);
  });

  it('assigns default color in layer mode', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [10]),
      host: mockHost,
      nodeColorMode: 'layer',
      nodeDefaultColor: '#abcdef',
    });
    expect(result!.nodes.every(n => n.color === '#abcdef')).toBe(true);
  });

  it('creates selectionIds on links', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [10]),
      host: mockHost,
    });
    expect(result!.links[0].selectionIds).toBeDefined();
    expect(result!.links[0].selectionIds!.length).toBeGreaterThan(0);
  });

  it('creates selectionId on nodes', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [10]),
      host: mockHost,
    });
    expect(result!.nodes.every(n => n.selectionId !== undefined)).toBe(true);
  });

  it('returns valueMeasureName from column', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [10]),
      host: mockHost,
    });
    expect(result!.valueMeasureName).toBe('Amount');
  });

  it('defaults valueMeasureName to Value', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B']),
      host: mockHost,
    });
    expect(result!.valueMeasureName).toBe('Value');
  });

  it('deduplicates nodes', () => {
    const result = transformDataView({
      dataView: makeDataView(['A', 'A'], ['B', 'C'], [10, 20]),
      host: mockHost,
    });
    const nodeIds = result!.nodes.map(n => n.id);
    expect(new Set(nodeIds).size).toBe(nodeIds.length);
  });

  it('handles null values gracefully', () => {
    const result = transformDataView({
      dataView: makeDataView(['A'], ['B'], [null]),
      host: mockHost,
    });
    // null value becomes 0, which is filtered out (value <= 0)
    expect(result!.nodes).toHaveLength(0);
    expect(result!.links).toHaveLength(0);
  });

  it('handles user color overrides from objects', () => {
    const dv = {
      categorical: {
        categories: [
          {
            source: { roles: { source: true } },
            values: ['A'],
            objects: [{ nodeColors: { fill: { solid: { color: '#custom' } } } }],
          },
          {
            source: { roles: { target: true } },
            values: ['B'],
          },
        ],
        values: [{ source: { roles: { value: true }, displayName: 'Val' }, values: [10] }],
      },
    };
    const result = transformDataView({
      dataView: dv as never,
      host: mockHost,
      nodeColorMode: 'category',
    });
    const nodeA = result!.nodes.find(n => n.id === 'A');
    expect(nodeA!.color).toBe('#custom');
  });
});

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

describe('exported constants', () => {
  it('DEFAULT_SETTINGS has all required fields', () => {
    const keys: (keyof VisualSettings)[] = [
      'nodeWidth', 'nodePadding', 'iterations', 'nodeDefaultColor', 'nodeColorMode',
      'linkOpacity', 'linkColorMode', 'linkDefaultColor', 'linkSort',
      'showLinkLabels', 'linkLabelFontSize',
      'labelFontSize', 'labelColor', 'labelColorMode', 'labelFontFamily', 'showLabels',
      'showDataLabels', 'dataLabelFontSize', 'dataLabelColor', 'dataLabelFontFamily',
      'dataLabelDisplayMode', 'displayUnits', 'decimalPlaces', 'percentDecimalPlaces',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    ];
    for (const key of keys) {
      expect(DEFAULT_SETTINGS).toHaveProperty(key);
    }
  });

  it('MAX_LAYER_COLORS is 10', () => {
    expect(MAX_LAYER_COLORS).toBe(10);
  });

  it('DEFAULT_LAYER_PALETTE has MAX_LAYER_COLORS entries', () => {
    expect(DEFAULT_LAYER_PALETTE).toHaveLength(MAX_LAYER_COLORS);
  });

  it('all validation arrays are non-empty', () => {
    expect(VALID_LINK_SORT_MODES.length).toBeGreaterThan(0);
    expect(VALID_NODE_COLOR_MODES.length).toBeGreaterThan(0);
    expect(VALID_LINK_COLOR_MODES.length).toBeGreaterThan(0);
    expect(VALID_LABEL_COLOR_MODES.length).toBeGreaterThan(0);
    expect(VALID_DATA_LABEL_DISPLAY_MODES.length).toBeGreaterThan(0);
  });

  it('DEFAULT_SETTINGS values match expected defaults', () => {
    expect(DEFAULT_SETTINGS.nodeWidth).toBe(24);
    expect(DEFAULT_SETTINGS.linkOpacity).toBe(0.5);
    expect(DEFAULT_SETTINGS.nodeColorMode).toBe('category');
    expect(DEFAULT_SETTINGS.linkSort).toBe('ascending');
  });
});

// ---------------------------------------------------------------------------
// resolveCycles
// ---------------------------------------------------------------------------

describe('resolveCycles', () => {
  const node = (id: string): SankeyNodeDatum => ({ id, name: id });
  const link = (source: string, target: string, value: number): SankeyLinkDatum =>
    ({ source, target, value });

  it('passes through when there are no cycles', () => {
    const nodes = [node('A'), node('B'), node('C')];
    const links = [link('A', 'B', 10), link('B', 'C', 5)];
    const result = resolveCycles(nodes, links);
    expect(result.nodes).toHaveLength(3);
    expect(result.links).toHaveLength(2);
  });

  it('returns empty results for empty input', () => {
    const result = resolveCycles([], []);
    expect(result.nodes).toHaveLength(0);
    expect(result.links).toHaveLength(0);
  });

  it('removes the feedback link in a simple A→B→A cycle', () => {
    const nodes = [node('A'), node('B')];
    const links = [link('A', 'B', 10), link('B', 'A', 3)];
    const result = resolveCycles(nodes, links);
    expect(result.nodes).toHaveLength(2);
    expect(result.links).toHaveLength(1);
    // B→A goes backward (B pos=1 → A pos=0), so A→B survives
    expect(result.links[0].source).toBe('A');
    expect(result.links[0].target).toBe('B');
  });

  it('removes C→A (feedback) in a 3-node cycle, preserving A→B and B→C', () => {
    const nodes = [node('A'), node('B'), node('C')];
    const links = [link('A', 'B', 10), link('B', 'C', 5), link('C', 'A', 2)];
    const result = resolveCycles(nodes, links);
    expect(result.nodes).toHaveLength(3);
    expect(result.links).toHaveLength(2);
    expect(result.links.find(l => l.source === 'A' && l.target === 'B')).toBeDefined();
    expect(result.links.find(l => l.source === 'B' && l.target === 'C')).toBeDefined();
  });

  it('removes feedback link even when it is NOT the weakest', () => {
    const nodes = [node('A'), node('B'), node('C')];
    // B→C (value=2) is weakest, but C→A is the feedback (goes backward)
    const links = [link('A', 'B', 10), link('B', 'C', 2), link('C', 'A', 5)];
    const result = resolveCycles(nodes, links);
    expect(result.links).toHaveLength(2);
    // A→B and B→C preserved, C→A removed
    expect(result.links.find(l => l.source === 'A' && l.target === 'B')).toBeDefined();
    expect(result.links.find(l => l.source === 'B' && l.target === 'C')).toBeDefined();
  });

  it('does not mutate the original arrays', () => {
    const nodes = [node('A'), node('B')];
    const links = [link('A', 'B', 10), link('B', 'A', 3)];
    const origNodes = [...nodes];
    const origLinks = links.map(l => ({ ...l }));
    resolveCycles(nodes, links);
    expect(nodes).toEqual(origNodes);
    expect(links).toEqual(origLinks);
  });

  it('handles multiple independent cycles', () => {
    const nodes = [node('A'), node('B'), node('X'), node('Y')];
    const links = [
      link('A', 'B', 10), link('B', 'A', 2),
      link('X', 'Y', 8), link('Y', 'X', 1),
    ];
    const result = resolveCycles(nodes, links);
    // Nodes unchanged, two back-edges removed
    expect(result.nodes).toHaveLength(4);
    expect(result.links).toHaveLength(2);
  });

  it('preserves non-cyclic links alongside a cycle', () => {
    const nodes = [node('A'), node('B'), node('C'), node('D'), node('E')];
    const links = [
      link('A', 'B', 10),
      link('B', 'C', 5),
      link('C', 'A', 2),  // cycle back-edge
      link('D', 'E', 7),  // unrelated
    ];
    const result = resolveCycles(nodes, links);
    // All nodes preserved, one back-edge removed
    expect(result.nodes).toHaveLength(5);
    expect(result.links).toHaveLength(3);
    expect(result.links.find(l => l.source === 'D' && l.target === 'E')).toBeDefined();
  });

  it('handles a cycle where both links have equal value', () => {
    const nodes = [node('A'), node('B')];
    const links = [link('A', 'B', 5), link('B', 'A', 5)];
    const result = resolveCycles(nodes, links);
    // One back-edge removed
    expect(result.nodes).toHaveLength(2);
    expect(result.links).toHaveLength(1);
  });
});
