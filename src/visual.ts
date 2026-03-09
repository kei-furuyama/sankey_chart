/**
 * Power BI Visual Entry Point
 *
 * Standalone entry point referenced by pbiviz at build time.
 * Bundles all required dependencies.
 */

import powerbi from 'powerbi-visuals-api';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { select, Selection } from 'd3';

import {
  formattingSettings,
  FormattingSettingsService,
} from 'powerbi-visuals-utils-formattingmodel';

import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;
import IViewport = powerbi.IViewport;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ITooltipService = powerbi.extensibility.ITooltipService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.extensibility.ISelectionId;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

// Types

export interface SankeyNodeDatum {
  id: string;
  name: string;
  color?: string;
  selectionIds?: ISelectionId[];
  highlightValue?: number;
  originalId?: string;
}

export interface SankeyLinkDatum {
  source: string;
  target: string;
  value: number;
  selectionIds?: ISelectionId[];
  highlightValue?: number;
}

export interface SankeyData {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
  valueMeasureName: string;
}

export interface TransformDataViewOptions {
  dataView: DataView | undefined;
  host: IVisualHost;
  nodeColorMode?: NodeColorMode;
  nodeDefaultColor?: string;
}

export type ComputedNode = SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
export type ComputedLink = SankeyLink<SankeyNodeDatum, SankeyLinkDatum>;

// Settings

export type LinkSortMode = 'ascending' | 'descending' | 'byValue' | 'byValueDesc' | 'inputOrder' | 'none';
export type NodeColorMode = 'single' | 'category' | 'layer';
export type LinkColorMode = 'source' | 'target' | 'gradient' | 'fixed' | 'layer';
export type LabelColorMode = 'single' | 'layer';
export type DataLabelDisplayMode = 'value' | 'percentage' | 'both';

export const VALID_LINK_SORT_MODES: LinkSortMode[] = ['ascending', 'descending', 'byValue', 'byValueDesc', 'inputOrder', 'none'];
export const VALID_NODE_COLOR_MODES: NodeColorMode[] = ['single', 'category', 'layer'];
export const VALID_LINK_COLOR_MODES: LinkColorMode[] = ['source', 'target', 'gradient', 'fixed', 'layer'];
export const VALID_LABEL_COLOR_MODES: LabelColorMode[] = ['single', 'layer'];

/** Gap in px between a node rect edge and its label text */
const LABEL_OFFSET = 6;
/** Minimum link width (px) to render a link label */
const MIN_LINK_WIDTH_FOR_LABEL = 8;
/** Padding (px) inside link label backgrounds */
const LINK_LABEL_PADDING = 4;
/** Approximate character width as a ratio of font size */
const CHAR_WIDTH_RATIO = 0.6;
/** Line height multiplier for text elements */
const TEXT_LINE_HEIGHT = 1.4;
/** Border radius (px) for link label backgrounds */
const BG_LABEL_BORDER_RADIUS = 3;
/** Opacity for link label backgrounds */
const BG_LABEL_OPACITY = 0.9;
/** Stroke width (px) for keyboard focus indicators */
const FOCUS_STROKE_WIDTH = 2;
/** Dash pattern for keyboard focus indicators */
const FOCUS_DASH_ARRAY = '4,2';
/** Opacity for selected elements */
const SELECTED_OPACITY = 1;
/** Opacity for unselected nodes/labels when selection is active */
const UNSELECTED_NODE_OPACITY = 0.3;
/** Opacity for unselected links when selection is active */
const UNSELECTED_LINK_OPACITY = 0.2;
/** Opacity for highlighted/selected links */
const HIGHLIGHTED_LINK_OPACITY = 0.8;
/** Maximum number of layers with individually configurable colors */
export const MAX_LAYER_COLORS = 10;
/** Fixed default colours for layer modes so that changing one layer does not shift others */
export const DEFAULT_LAYER_PALETTE = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
];
export const VALID_DATA_LABEL_DISPLAY_MODES: DataLabelDisplayMode[] = ['value', 'percentage', 'both'];

/** Extract a stable string key from a Power BI selection ID for deduplication/comparison */
export function getSelectionKey(id: ISelectionId): string {
  return (id as powerbi.visuals.ISelectionId).getKey?.() ?? JSON.stringify(id);
}

export interface VisualSettings {
  nodeWidth: number;
  nodePadding: number;
  iterations: number;
  nodeDefaultColor: string;
  nodeColorMode: NodeColorMode;
  linkOpacity: number;
  linkColorMode: LinkColorMode;
  linkDefaultColor: string;
  linkSort: LinkSortMode;
  showLinkLabels: boolean;
  linkLabelFontSize: number;
  labelFontSize: number;
  labelColor: string;
  labelColorMode: LabelColorMode;
  labelFontFamily: string;
  showLabels: boolean;
  showDataLabels: boolean;
  dataLabelFontSize: number;
  dataLabelColor: string;
  dataLabelFontFamily: string;
  dataLabelDisplayMode: DataLabelDisplayMode;
  displayUnits: number;
  decimalPlaces: number;
  percentDecimalPlaces: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

export const DEFAULT_SETTINGS: VisualSettings = {
  nodeWidth: 24,
  nodePadding: 16,
  iterations: 6,
  nodeDefaultColor: '#1f77b4',
  nodeColorMode: 'category',
  linkOpacity: 0.5,
  linkColorMode: 'source',
  linkDefaultColor: '#aaa',
  linkSort: 'ascending',
  showLinkLabels: false,
  linkLabelFontSize: 10,
  labelFontSize: 12,
  labelColor: '#333333',
  labelColorMode: 'single',
  labelFontFamily: "'Segoe UI', sans-serif",
  showLabels: true,
  showDataLabels: false,
  dataLabelFontSize: 10,
  dataLabelColor: '#666666',
  dataLabelFontFamily: "'Segoe UI', sans-serif",
  dataLabelDisplayMode: 'value',
  displayUnits: 0,
  decimalPlaces: 1,
  percentDecimalPlaces: 1,
  marginTop: 20,
  marginRight: 120,
  marginBottom: 20,
  marginLeft: 120,
};

// =============================================================================
// Formatting Settings Model (for new Format Pane API)
// =============================================================================

class NodeSettingsCard extends formattingSettings.SimpleCard {
  width = new formattingSettings.NumUpDown({
    name: 'width',
    displayName: 'Node Width',
    value: DEFAULT_SETTINGS.nodeWidth,
    options: {
      minValue: { value: 5, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  padding = new formattingSettings.NumUpDown({
    name: 'padding',
    displayName: 'Node Padding',
    value: DEFAULT_SETTINGS.nodePadding,
    options: {
      minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  iterations = new formattingSettings.NumUpDown({
    name: 'iterations',
    displayName: 'Layout Iterations',
    value: DEFAULT_SETTINGS.iterations,
    options: {
      minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 32, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  colorMode = new formattingSettings.ItemDropdown({
    name: 'colorMode',
    displayName: 'Color Mode',
    items: [
      { value: 'category', displayName: 'Category Colors' },
      { value: 'single', displayName: 'Single Color' },
      { value: 'layer', displayName: 'By Layer' },
    ],
    value: { value: 'category', displayName: 'Category Colors' },
  });

  defaultColor = new formattingSettings.ColorPicker({
    name: 'defaultColor',
    displayName: 'Default Color',
    value: { value: DEFAULT_SETTINGS.nodeDefaultColor },
  });

  name: string = 'nodeSettings';
  displayName: string = 'Nodes';
  slices: formattingSettings.Slice[] = [this.width, this.padding, this.iterations, this.colorMode, this.defaultColor];
}

class LinkSettingsCard extends formattingSettings.SimpleCard {
  defaultColor = new formattingSettings.ColorPicker({
    name: 'defaultColor',
    displayName: 'Default Color',
    value: { value: DEFAULT_SETTINGS.linkDefaultColor },
  });

  colorMode = new formattingSettings.ItemDropdown({
    name: 'colorMode',
    displayName: 'Color Mode',
    items: [
      { value: 'source', displayName: 'Source' },
      { value: 'target', displayName: 'Target' },
      { value: 'gradient', displayName: 'Gradient' },
      { value: 'fixed', displayName: 'Fixed' },
      { value: 'layer', displayName: 'By Layer' },
    ],
    value: { value: 'source', displayName: 'Source' },
  });

  opacity = new formattingSettings.Slider({
    name: 'opacity',
    displayName: 'Opacity (%)',
    value: 50,
    options: {
      minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  sortMode = new formattingSettings.ItemDropdown({
    name: 'sortMode',
    displayName: 'Link Sort',
    items: [
      { value: 'ascending', displayName: 'Ascending (minimize crossing)' },
      { value: 'descending', displayName: 'Descending' },
      { value: 'byValue', displayName: 'By Value (small to large)' },
      { value: 'byValueDesc', displayName: 'By Value (large to small)' },
      { value: 'inputOrder', displayName: 'Input Order (data sort)' },
      { value: 'none', displayName: 'None' },
    ],
    value: { value: 'ascending', displayName: 'Ascending (minimize crossing)' },
  });

  name: string = 'linkSettings';
  displayName: string = 'Links';
  slices: formattingSettings.Slice[] = [this.defaultColor, this.colorMode, this.opacity, this.sortMode];
}

/**
 * Link Labels settings card with topLevelSlice for show toggle.
 * When topLevelSlice is set, the toggle appears in the card header and controls
 * whether the card's slices are shown/enabled.
 * @see https://learn.microsoft.com/en-us/power-bi/developer/visuals/formatting-model-card
 */
class LinkLabelSettingsCard extends formattingSettings.SimpleCard {
  show = new formattingSettings.ToggleSwitch({
    name: 'show',
    displayName: 'Show',
    value: DEFAULT_SETTINGS.showLinkLabels,
  });

  fontSize = new formattingSettings.NumUpDown({
    name: 'fontSize',
    displayName: 'Font Size',
    value: DEFAULT_SETTINGS.linkLabelFontSize,
    options: {
      minValue: { value: 6, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 24, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  name: string = 'linkLabelSettings';
  displayName: string = 'Link Labels';
  topLevelSlice: formattingSettings.ToggleSwitch = this.show;
  slices: formattingSettings.Slice[] = [this.fontSize];
}

/**
 * Node Labels settings card with topLevelSlice for show toggle.
 * When topLevelSlice is set, the toggle appears in the card header and controls
 * whether the card's slices are shown/enabled.
 * @see https://learn.microsoft.com/en-us/power-bi/developer/visuals/formatting-model-card
 */
class LabelSettingsCard extends formattingSettings.SimpleCard {
  show = new formattingSettings.ToggleSwitch({
    name: 'show',
    displayName: 'Show',
    value: DEFAULT_SETTINGS.showLabels,
  });

  fontSize = new formattingSettings.NumUpDown({
    name: 'fontSize',
    displayName: 'Font Size',
    value: DEFAULT_SETTINGS.labelFontSize,
    options: {
      minValue: { value: 6, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 48, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  color = new formattingSettings.ColorPicker({
    name: 'color',
    displayName: 'Color',
    value: { value: DEFAULT_SETTINGS.labelColor },
  });

  colorMode = new formattingSettings.ItemDropdown({
    name: 'colorMode',
    displayName: 'Color Mode',
    items: [
      { value: 'single', displayName: 'Single Color' },
      { value: 'layer', displayName: 'By Layer' },
    ],
    value: { value: 'single', displayName: 'Single Color' },
  });

  fontFamily = new formattingSettings.FontPicker({
    name: 'fontFamily',
    displayName: 'Font',
    value: DEFAULT_SETTINGS.labelFontFamily,
  });

  name: string = 'labelSettings';
  displayName: string = 'Node Labels';
  topLevelSlice: formattingSettings.ToggleSwitch = this.show;
  slices: formattingSettings.Slice[] = [this.fontFamily, this.fontSize, this.colorMode, this.color];
}

class DataLabelSettingsCard extends formattingSettings.SimpleCard {
  show = new formattingSettings.ToggleSwitch({
    name: 'show',
    displayName: 'Show',
    value: DEFAULT_SETTINGS.showDataLabels,
  });

  displayMode = new formattingSettings.ItemDropdown({
    name: 'displayMode',
    displayName: 'Display Mode',
    items: [
      { value: 'value', displayName: 'Value' },
      { value: 'percentage', displayName: 'Percentage' },
      { value: 'both', displayName: 'Value & Percentage' },
    ],
    value: { value: 'value', displayName: 'Value' },
  });

  fontSize = new formattingSettings.NumUpDown({
    name: 'fontSize',
    displayName: 'Font Size',
    value: DEFAULT_SETTINGS.dataLabelFontSize,
    options: {
      minValue: { value: 6, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 48, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  color = new formattingSettings.ColorPicker({
    name: 'color',
    displayName: 'Color',
    value: { value: DEFAULT_SETTINGS.dataLabelColor },
  });

  fontFamily = new formattingSettings.FontPicker({
    name: 'fontFamily',
    displayName: 'Font',
    value: DEFAULT_SETTINGS.dataLabelFontFamily,
  });

  displayUnits = new formattingSettings.ItemDropdown({
    name: 'displayUnits',
    displayName: 'Display Units',
    items: [
      { value: '0', displayName: 'Auto' },
      { value: '1', displayName: 'None' },
      { value: '1000', displayName: 'Thousands' },
      { value: '1000000', displayName: 'Millions' },
      { value: '1000000000', displayName: 'Billions' },
    ],
    value: { value: '0', displayName: 'Auto' },
  });

  decimalPlaces = new formattingSettings.NumUpDown({
    name: 'decimalPlaces',
    displayName: 'Value Decimal Places',
    value: DEFAULT_SETTINGS.decimalPlaces,
    options: {
      minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 10, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  percentDecimalPlaces = new formattingSettings.NumUpDown({
    name: 'percentDecimalPlaces',
    displayName: 'Percentage Decimal Places',
    value: DEFAULT_SETTINGS.percentDecimalPlaces,
    options: {
      minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 10, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  name: string = 'dataLabelSettings';
  displayName: string = 'Node Data Labels';
  topLevelSlice: formattingSettings.ToggleSwitch = this.show;
  slices: formattingSettings.Slice[] = [this.displayMode, this.fontFamily, this.fontSize, this.color, this.displayUnits, this.decimalPlaces, this.percentDecimalPlaces];
}

class MarginSettingsCard extends formattingSettings.SimpleCard {
  top = new formattingSettings.NumUpDown({
    name: 'top',
    displayName: 'Top',
    value: DEFAULT_SETTINGS.marginTop,
    options: {
      minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 300, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  right = new formattingSettings.NumUpDown({
    name: 'right',
    displayName: 'Right',
    value: DEFAULT_SETTINGS.marginRight,
    options: {
      minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 300, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  bottom = new formattingSettings.NumUpDown({
    name: 'bottom',
    displayName: 'Bottom',
    value: DEFAULT_SETTINGS.marginBottom,
    options: {
      minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 300, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  left = new formattingSettings.NumUpDown({
    name: 'left',
    displayName: 'Left',
    value: DEFAULT_SETTINGS.marginLeft,
    options: {
      minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
      maxValue: { value: 300, type: powerbi.visuals.ValidatorType.Max },
    },
  });

  name: string = 'marginSettings';
  displayName: string = 'Margins';
  slices: formattingSettings.Slice[] = [this.top, this.right, this.bottom, this.left];
}

class VisualFormattingSettingsModel extends formattingSettings.Model {
  nodeSettingsCard = new NodeSettingsCard();
  linkSettingsCard = new LinkSettingsCard();
  linkLabelSettingsCard = new LinkLabelSettingsCard();
  labelSettingsCard = new LabelSettingsCard();
  dataLabelSettingsCard = new DataLabelSettingsCard();
  marginSettingsCard = new MarginSettingsCard();

  cards: formattingSettings.SimpleCard[] = [
    this.nodeSettingsCard,
    this.linkSettingsCard,
    this.linkLabelSettingsCard,
    this.labelSettingsCard,
    this.dataLabelSettingsCard,
    this.marginSettingsCard,
  ];
}

/**
 * Extract value from ItemDropdown which can be either:
 * - string (direct value)
 * - object { value: string, displayName?: string }
 */
export function extractDropdownValue(raw: unknown, defaultValue: string): string {
  if (raw === null || raw === undefined) {
    return defaultValue;
  }
  if (typeof raw === 'string') {
    return raw;
  }
  if (typeof raw === 'object' && 'value' in raw) {
    return typeof raw.value === 'string' ? raw.value : defaultValue;
  }
  return defaultValue;
}

export function extractNumber(raw: unknown, defaultValue: number): number {
  return typeof raw === 'number' ? raw : defaultValue;
}
export function extractBoolean(raw: unknown, defaultValue: boolean): boolean {
  return typeof raw === 'boolean' ? raw : defaultValue;
}
export function extractString(raw: unknown, defaultValue: string): string {
  return typeof raw === 'string' ? raw : defaultValue;
}

/**
 * Extract a solid color value from a Power BI fill object.
 */
export function extractFillColor(raw: unknown): string | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  if (!('solid' in raw)) return undefined;
  const solid = (raw as Record<string, unknown>).solid;
  if (typeof solid !== 'object' || solid === null) return undefined;
  const color = (solid as Record<string, unknown>).color;
  return typeof color === 'string' ? color : undefined;
}

/**
 * Extract and validate a dropdown value against a list of valid options.
 */
export function extractValidatedDropdown<T extends string>(raw: unknown, validValues: T[], defaultValue: T): T {
  const extracted = extractDropdownValue(raw, defaultValue);
  return validValues.includes(extracted as T) ? (extracted as T) : defaultValue;
}

export function parseSettings(dataView: DataView): VisualSettings {
  const objects = dataView?.metadata?.objects;
  if (!objects) {
    return { ...DEFAULT_SETTINGS };
  }

  const { nodeSettings, linkSettings, linkLabelSettings, labelSettings, dataLabelSettings, marginSettings } = objects;

  return {
    nodeWidth: extractNumber(nodeSettings?.width, DEFAULT_SETTINGS.nodeWidth),
    nodePadding: extractNumber(nodeSettings?.padding, DEFAULT_SETTINGS.nodePadding),
    iterations: extractNumber(nodeSettings?.iterations, DEFAULT_SETTINGS.iterations),
    nodeDefaultColor: extractFillColor(nodeSettings?.defaultColor) ?? DEFAULT_SETTINGS.nodeDefaultColor,
    nodeColorMode: extractValidatedDropdown(nodeSettings?.colorMode, VALID_NODE_COLOR_MODES, DEFAULT_SETTINGS.nodeColorMode),
    linkOpacity: extractNumber(linkSettings?.opacity, 50) / 100,
    linkColorMode: extractValidatedDropdown(linkSettings?.colorMode, VALID_LINK_COLOR_MODES, DEFAULT_SETTINGS.linkColorMode),
    linkDefaultColor: extractFillColor(linkSettings?.defaultColor) ?? DEFAULT_SETTINGS.linkDefaultColor,
    linkSort: extractValidatedDropdown(linkSettings?.sortMode, VALID_LINK_SORT_MODES, DEFAULT_SETTINGS.linkSort),
    showLinkLabels: extractBoolean(linkLabelSettings?.show, DEFAULT_SETTINGS.showLinkLabels),
    linkLabelFontSize: extractNumber(linkLabelSettings?.fontSize, DEFAULT_SETTINGS.linkLabelFontSize),
    labelFontSize: extractNumber(labelSettings?.fontSize, DEFAULT_SETTINGS.labelFontSize),
    labelColor: extractFillColor(labelSettings?.color) ?? DEFAULT_SETTINGS.labelColor,
    labelColorMode: extractValidatedDropdown(labelSettings?.colorMode, VALID_LABEL_COLOR_MODES, DEFAULT_SETTINGS.labelColorMode),
    labelFontFamily: extractString(labelSettings?.fontFamily, DEFAULT_SETTINGS.labelFontFamily),
    showLabels: extractBoolean(labelSettings?.show, DEFAULT_SETTINGS.showLabels),
    showDataLabels: extractBoolean(dataLabelSettings?.show, DEFAULT_SETTINGS.showDataLabels),
    dataLabelFontSize: extractNumber(dataLabelSettings?.fontSize, DEFAULT_SETTINGS.dataLabelFontSize),
    dataLabelColor: extractFillColor(dataLabelSettings?.color) ?? DEFAULT_SETTINGS.dataLabelColor,
    dataLabelFontFamily: extractString(dataLabelSettings?.fontFamily, DEFAULT_SETTINGS.dataLabelFontFamily),
    dataLabelDisplayMode: extractValidatedDropdown(dataLabelSettings?.displayMode, VALID_DATA_LABEL_DISPLAY_MODES, DEFAULT_SETTINGS.dataLabelDisplayMode),
    displayUnits: Number(extractDropdownValue(dataLabelSettings?.displayUnits, String(DEFAULT_SETTINGS.displayUnits))) || 0,
    decimalPlaces: extractNumber(dataLabelSettings?.decimalPlaces, DEFAULT_SETTINGS.decimalPlaces),
    percentDecimalPlaces: extractNumber(dataLabelSettings?.percentDecimalPlaces, DEFAULT_SETTINGS.percentDecimalPlaces),
    marginTop: extractNumber(marginSettings?.top, DEFAULT_SETTINGS.marginTop),
    marginRight: extractNumber(marginSettings?.right, DEFAULT_SETTINGS.marginRight),
    marginBottom: extractNumber(marginSettings?.bottom, DEFAULT_SETTINGS.marginBottom),
    marginLeft: extractNumber(marginSettings?.left, DEFAULT_SETTINGS.marginLeft),
  };
}

// Link Sort Function
//
// d3-sankey's linkSort behavior:
// - undefined: d3-sankey uses its internal algorithm to minimize link crossings
//              (reorderLinks/reorderNodeLinks are called during layout iterations)
// - null: No sorting (links remain in input order, internal reordering is skipped)
// - function: Custom comparator applied during computeNodeLinks (before y0/y1 are calculated)
//
// IMPORTANT: At the time linkSort is called, link.y0 and link.y1 are NOT yet computed.
// Only link.value, link.source, link.target, and link.index are available.
// Sorting by y0/y1 will NOT work because they are all undefined at sort time.

export function getLinkSortFunction(
  mode: LinkSortMode
): ((a: { value: number; index?: number }, b: { value: number; index?: number }) => number) | null | undefined {
  switch (mode) {
    case 'ascending':
      // Let d3-sankey use its internal crossing-minimization algorithm
      // This is achieved by returning undefined, which triggers reorderLinks/reorderNodeLinks
      return undefined;
    case 'descending':
    case 'byValueDesc':
      // Both sort by value descending (large flows first).
      // 'descending' is the opposite of 'ascending' in the UI;
      // 'byValueDesc' pairs with 'byValue' for explicit value-based ordering.
      return (a, b) => b.value - a.value;
    case 'byValue':
      // Sort by value ascending (small flows first)
      return (a, b) => a.value - b.value;
    case 'inputOrder':
      // Preserve input order - return null to disable all sorting
      // Combined with nodeSort(null), this keeps the data order from Power BI
      return null;
    case 'none':
      // No sorting - return null to disable all link sorting including internal reordering
      return null;
    default:
      return undefined;
  }
}

export function resolveNode(endpoint: string | number | ComputedNode): ComputedNode {
  if (typeof endpoint === 'object' && endpoint !== null && 'id' in endpoint) {
    return endpoint;
  }
  throw new Error(`Expected resolved ComputedNode but got ${typeof endpoint}`);
}

/** Access the original SankeyLinkDatum properties on a computed link. */
export function linkDatum(link: ComputedLink): SankeyLinkDatum {
  return link as unknown as SankeyLinkDatum;
}

// Cycle Resolution

/**
 * Run DFS on the link graph to find a cycle and return the index of the
 * feedback link — the one going furthest backward in node position order.
 * Returns -1 if no cycle is found.
 */
function findCycleFeedback(
  remaining: SankeyLinkDatum[],
  nodePos: ReadonlyMap<string, number>,
): number {
  const adj = new Map<string, number[]>();
  for (let i = 0; i < remaining.length; i++) {
    const source = remaining[i].source;
    if (!adj.has(source)) adj.set(source, []);
    adj.get(source)!.push(i);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const link of remaining) {
    color.set(link.source, WHITE);
    color.set(link.target, WHITE);
  }

  const parentLink = new Map<string, number>();
  let feedbackIdx = -1;

  const dfs = (currentNodeId: string): boolean => {
    color.set(currentNodeId, GRAY);
    for (const idx of adj.get(currentNodeId) ?? []) {
      const neighborId = remaining[idx].target;
      const nodeColor = color.get(neighborId) ?? BLACK;
      if (nodeColor === GRAY) {
        // Cycle found — collect all links in the cycle and pick
        // the one going furthest backward in node position order.
        const cycleIndices: number[] = [idx];
        let cur = currentNodeId;
        while (cur !== neighborId) {
          const pIdx = parentLink.get(cur)!;
          cycleIndices.push(pIdx);
          cur = remaining[pIdx].source;
        }

        let bestDist = -Infinity;
        let bestValue = Infinity;
        for (const ci of cycleIndices) {
          const link = remaining[ci];
          const dist = (nodePos.get(link.source) ?? 0) - (nodePos.get(link.target) ?? 0);
          if (dist > bestDist || (dist === bestDist && link.value < bestValue)) {
            bestDist = dist;
            bestValue = link.value;
            feedbackIdx = ci;
          }
        }
        return true;
      }
      if (nodeColor === WHITE) {
        parentLink.set(neighborId, idx);
        if (dfs(neighborId)) return true;
      }
    }
    color.set(currentNodeId, BLACK);
    return false;
  };

  for (const nodeId of color.keys()) {
    if (color.get(nodeId) === WHITE) {
      if (dfs(nodeId)) break;
    }
  }

  return feedbackIdx;
}

/**
 * Break cycles in the link graph so that d3-sankey receives a DAG.
 *
 * Each node is assigned a position based on when it first appears as a
 * source in the link list (reflecting the user's data row order).
 * In each cycle the link whose source position is highest and target
 * position is lowest (i.e. biggest "jump back") is the feedback link.
 *
 * The feedback link's target node is **duplicated** (e.g. C→A becomes
 * C→A') so all links are preserved as normal Sankey paths.  No links
 * are ever removed — this avoids the problem where a heuristic picks
 * the wrong link to delete.
 *
 * Ties are broken by smallest value.  The inputs are never mutated.
 */
export function resolveCycles(
  nodes: SankeyNodeDatum[],
  links: SankeyLinkDatum[],
): { nodes: SankeyNodeDatum[]; links: SankeyLinkDatum[] } {
  if (links.length === 0) return { nodes: [...nodes], links: [...links] };

  // Assign node positions by first appearance as source in the original
  // link order — this reflects the user's intended flow direction.
  const nodePos = new Map<string, number>();
  let pos = 0;
  for (const link of links) {
    if (!nodePos.has(link.source)) nodePos.set(link.source, pos++);
  }
  for (const link of links) {
    if (!nodePos.has(link.target)) nodePos.set(link.target, pos++);
  }

  const remaining = links.map(l => ({
    ...l,
    selectionIds: l.selectionIds ? [...l.selectionIds] : undefined,
  }));
  const newNodes = nodes.map(n => ({ ...n }));
  let dupeCounter = 0;

  for (;;) {
    const feedbackIdx = findCycleFeedback(remaining, nodePos);
    if (feedbackIdx < 0) break;

    // Duplicate the feedback link's target node so all links are
    // preserved as normal Sankey paths (no links are ever removed).
    const feedbackLink = remaining[feedbackIdx];
    const targetId = feedbackLink.target;
    const originalNode = newNodes.find(n => n.id === targetId);
    if (originalNode) {
      const dupeId = `${targetId}\0dup${dupeCounter++}`;
      newNodes.push({
        ...originalNode,
        id: dupeId,
        originalId: originalNode.originalId ?? targetId,
        // Deep-copy arrays to avoid shared references with the original node
        selectionIds: originalNode.selectionIds ? [...originalNode.selectionIds] : undefined,
      });
      feedbackLink.target = dupeId;
      // Assign a position to the new node so further iterations work
      nodePos.set(dupeId, pos++);
    } else {
      // Fallback: remove the link if the target node is missing
      remaining.splice(feedbackIdx, 1);
    }
  }

  return { nodes: newNodes, links: remaining };
}

// Data Transformer

export function transformDataView(options: TransformDataViewOptions): SankeyData | null {
  const { dataView, host } = options;

  if (!dataView?.categorical) {
    return null;
  }

  const { categories = [], values = [] } = dataView.categorical;

  const sourceColumn = categories.find(c => c.source.roles?.['source']);
  const targetColumn = categories.find(c => c.source.roles?.['target']);
  const valueColumn = values.find(v => v.source.roles?.['value']);

  if (!sourceColumn || !targetColumn) {
    return null;
  }

  const dedupeSelectionIds = (ids: ISelectionId[]): ISelectionId[] => {
    const unique = new Map<string, ISelectionId>();
    for (const id of ids) {
      unique.set(getSelectionKey(id), id);
    }
    return [...unique.values()];
  };

  // Track nodes and their selection IDs
  const nodeMap = new Map<string, { selectionIds: ISelectionId[]; highlightValue: number }>();
  const linkMap = new Map<string, SankeyLinkDatum>();

  for (let i = 0; i < sourceColumn.values.length; i++) {
    const source = String(sourceColumn.values[i] ?? '');
    const target = String(targetColumn.values[i] ?? '');
    const value = valueColumn ? (valueColumn.values[i] as number) ?? 0 : 1;

    if (!source || !target || source === target || !Number.isFinite(value) || value <= 0) {
      continue;
    }

    // Create selection ID for this row using sourceColumn only.
    // Power BI's withCategory chaining overwrites earlier calls, so we cannot
    // combine source + target into one ID. This means cross-filtering operates
    // at source-node granularity (clicking link A->B also highlights A->C).
    const selectionId = host.createSelectionIdBuilder()
      .withCategory(sourceColumn, i)
      .createSelectionId();
    const rawHighlight = valueColumn?.highlights?.[i];
    const highlightValue = typeof rawHighlight === 'number' && Number.isFinite(rawHighlight) && rawHighlight > 0
      ? rawHighlight
      : 0;

    // Track source node (use max to avoid double-counting when a node
    // appears as both source and target across different rows)
    if (!nodeMap.has(source)) {
      nodeMap.set(source, { selectionIds: [], highlightValue: 0 });
    }
    nodeMap.get(source)!.selectionIds.push(selectionId);
    nodeMap.get(source)!.highlightValue = Math.max(nodeMap.get(source)!.highlightValue, highlightValue);

    // Track target node
    if (!nodeMap.has(target)) {
      nodeMap.set(target, { selectionIds: [], highlightValue: 0 });
    }
    nodeMap.get(target)!.selectionIds.push(selectionId);
    nodeMap.get(target)!.highlightValue = Math.max(nodeMap.get(target)!.highlightValue, highlightValue);

    // Track link with selection IDs
    const key = `${source}\0${target}`;
    const existing = linkMap.get(key);
    if (existing) {
      existing.value += value;
      existing.selectionIds?.push(selectionId);
      existing.highlightValue = (existing.highlightValue ?? 0) + highlightValue;
    } else {
      linkMap.set(key, { source, target, value, selectionIds: [selectionId], highlightValue });
    }
  }

  const colorMode = options.nodeColorMode ?? 'category';
  const defaultColor = options.nodeDefaultColor ?? '#1f77b4';

  // Build a map of node id -> user-specified color from per-row objects (nodeColors.fill)
  const userColorMap = new Map<string, string>();
  for (const col of [sourceColumn, targetColumn]) {
    if (!col?.objects) continue;
    for (let i = 0; i < col.values.length; i++) {
      const fill = extractFillColor(col.objects[i]?.['nodeColors']?.fill);
      const nodeId = String(col.values[i] ?? '');
      if (fill && nodeId) {
        userColorMap.set(nodeId, fill);
      }
    }
  }

  const nodes: SankeyNodeDatum[] = Array.from(nodeMap.entries()).map(([id, data]) => ({
    id,
    name: id,
    // In layer mode, use defaultColor as placeholder; renderSankey() overrides by depth
    color: colorMode === 'single' || colorMode === 'layer'
      ? defaultColor
      : userColorMap.get(id) ?? host.colorPalette.getColor(id).value,
    selectionIds: dedupeSelectionIds(data.selectionIds),
    highlightValue: data.highlightValue,
  }));

  return {
    nodes,
    links: Array.from(linkMap.values()).map(link => ({
      ...link,
      selectionIds: dedupeSelectionIds(link.selectionIds ?? []),
    })),
    valueMeasureName: valueColumn?.source.displayName ?? 'Value',
  };
}

// Visual Implementation

export class Visual implements IVisual {
  private readonly target: HTMLElement;
  private readonly host: IVisualHost;
  private readonly svg: Selection<SVGSVGElement, unknown, null, undefined>;
  private readonly tooltipService: ITooltipService;
  private readonly selectionManager: ISelectionManager;
  private readonly eventService: IVisualEventService;
  private readonly localizationManager: ILocalizationManager;
  private readonly formattingSettingsService: FormattingSettingsService;
  private formattingSettings: VisualFormattingSettingsModel;
  private settings: VisualSettings = { ...DEFAULT_SETTINGS };
  private isHighContrastMode: boolean = false;
  private highContrastColors: {
    foreground: string;
    background: string;
    foregroundSelected: string;
  } | null = null;

  // Keyboard navigation state
  private focusedNodeIndex: number = -1;
  private currentNodes: ComputedNode[] = [];
  private valueMeasureName: string = 'Value';
  private valueFormat: string = '';
  private cachedFormatter: valueFormatter.IValueFormatter | null = null;

  // Link layer color state
  private userLayerColors = new Map<number, string>();
  private currentLayerDepths: number[] = [];

  // Node layer color state
  private userNodeLayerColors = new Map<number, string>();
  private currentNodeLayerDepths: number[] = [];

  // Label layer color state
  private userLabelLayerColors = new Map<number, string>();
  private currentLabelLayerDepths: number[] = [];

  // Interaction state
  private allowInteractions: boolean = true;
  private cachedSelectedKeySet: Set<string> = new Set();
  private hasHighlights: boolean = false;
  private readonly instanceId: string;
  private readonly abortController = new AbortController();

  constructor(options?: VisualConstructorOptions) {
    if (!options) {
      throw new Error('VisualConstructorOptions is required');
    }

    this.target = options.element;
    this.host = options.host;
    this.tooltipService = this.host.tooltipService;
    this.selectionManager = this.host.createSelectionManager();
    this.eventService = this.host.eventService;
    this.localizationManager = this.host.createLocalizationManager();
    this.formattingSettingsService = new FormattingSettingsService(this.localizationManager);
    this.formattingSettings = new VisualFormattingSettingsModel();
    this.allowInteractions = this.readAllowInteractions();
    this.instanceId = `sankey-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Create main container with focus support
    this.target.setAttribute('tabindex', '0');
    this.target.style.outline = 'none';

    this.svg = select(this.target)
      .append('svg')
      .classed('sankey-visual', true)
      .attr('role', 'img')
      .attr('aria-label', 'Sankey Chart');

    // Allow clicking empty space to clear selection (only if interactions allowed)
    this.svg.on('click', () => {
      if (this.allowInteractions) {
        this.selectionManager.clear();
      }
    });

    // Setup keyboard navigation
    this.setupKeyboardNavigation();

    // Register for bookmark state changes
    this.selectionManager.registerOnSelectCallback(
      (ids: ISelectionId[]) => this.updateSelectionState(ids)
    );

    // Detect high contrast mode
    this.updateHighContrastMode();
  }

  /**
   * Setup keyboard navigation handlers
   */
  private setupKeyboardNavigation(): void {
    const signal = this.abortController.signal;

    this.target.addEventListener('keydown', (event: KeyboardEvent) => {
      if (this.currentNodes.length === 0) return;

      switch (event.key) {
        case 'Tab': {
          // Move to next/prev node; allow Tab to escape at boundaries
          const atStart = this.focusedNodeIndex <= 0;
          const atEnd = this.focusedNodeIndex >= this.currentNodes.length - 1;
          if (event.shiftKey && atStart) {
            // At first node + Shift+Tab: let focus leave the visual
            this.clearNodeFocus();
            return;
          }
          if (!event.shiftKey && atEnd) {
            // At last node + Tab: let focus leave the visual
            this.clearNodeFocus();
            return;
          }
          if (event.shiftKey) {
            this.focusedNodeIndex--;
          } else {
            this.focusedNodeIndex++;
          }
          this.updateNodeFocus();
          event.preventDefault();
          break;
        }

        case 'ArrowRight':
        case 'ArrowDown':
          this.focusedNodeIndex = Math.min(
            this.currentNodes.length - 1,
            this.focusedNodeIndex + 1
          );
          this.updateNodeFocus();
          event.preventDefault();
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          this.focusedNodeIndex = Math.max(0, this.focusedNodeIndex - 1);
          this.updateNodeFocus();
          event.preventDefault();
          break;

        case 'Enter':
        case ' ':
          // Select focused node (only if interactions allowed)
          if (this.allowInteractions && this.focusedNodeIndex >= 0 && this.focusedNodeIndex < this.currentNodes.length) {
            const node = this.currentNodes[this.focusedNodeIndex];
            const selectionIds = node.selectionIds ?? [];
            if (selectionIds.length > 0) {
              this.selectionManager.select(selectionIds, event.ctrlKey || event.metaKey);
            }
          }
          event.preventDefault();
          break;

        case 'Escape':
          // Clear selection (only if interactions allowed)
          if (this.allowInteractions) {
            this.selectionManager.clear();
          }
          this.focusedNodeIndex = -1;
          this.updateNodeFocus();
          event.preventDefault();
          break;
      }
    }, { signal });

    this.target.addEventListener('focus', () => {
      if (this.focusedNodeIndex === -1 && this.currentNodes.length > 0) {
        this.focusedNodeIndex = 0;
        this.updateNodeFocus();
      }
    }, { signal });

    this.target.addEventListener('blur', () => {
      this.clearNodeFocus();
    }, { signal });
  }

  /**
   * Update visual focus indicator on nodes
   */
  private updateNodeFocus(): void {
    this.svg.selectAll('.nodes g rect')
      .attr('stroke-dasharray', null)
      .classed('focused', false);

    if (this.focusedNodeIndex >= 0 && this.focusedNodeIndex < this.currentNodes.length) {
      this.svg.selectAll('.nodes g')
        .filter((_: unknown, i: number) => i === this.focusedNodeIndex)
        .select('rect')
        .attr('stroke', this.hcForegroundSelected('#0078d4'))
        .attr('stroke-width', FOCUS_STROKE_WIDTH)
        .attr('stroke-dasharray', FOCUS_DASH_ARRAY)
        .classed('focused', true);

      const node = this.currentNodes[this.focusedNodeIndex];
      const rect = this.svg.select('.nodes g:nth-child(' + (this.focusedNodeIndex + 1) + ') rect').node() as SVGRectElement | null;
      if (rect) {
        const bbox = rect.getBoundingClientRect();
        const tooltipData: VisualTooltipDataItem[] = [
          { displayName: this.getLocalizedString('Visual_Tooltip_Node', 'Node'), value: node.name },
          { displayName: this.valueMeasureName, value: this.getValueFormatter().format(node.value ?? 0) },
        ];
        this.tooltipService.show({
          dataItems: tooltipData,
          identities: [],
          coordinates: [bbox.left + bbox.width / 2, bbox.top],
          isTouchEvent: false,
        });
      }
    } else {
      this.tooltipService.hide({ immediately: true, isTouchEvent: false });
    }
  }

  /**
   * Clear focus indicator from all nodes
   */
  private clearNodeFocus(): void {
    this.svg.selectAll('.nodes g rect')
      .attr('stroke', this.hcForeground('none'))
      .attr('stroke-width', this.isHighContrastMode ? 1 : 0)
      .attr('stroke-dasharray', null)
      .classed('focused', false);
  }

  private getLocalizedString(key: string, fallback: string): string {
    const localized = this.localizationManager.getDisplayName(key);
    return localized !== key ? localized : fallback;
  }

  private getValueFormatter(): valueFormatter.IValueFormatter {
    if (!this.cachedFormatter) {
      this.cachedFormatter = valueFormatter.create({
        format: this.valueFormat,
        value: this.settings.displayUnits,
        precision: this.settings.decimalPlaces,
        cultureSelector: this.host.locale,
      });
    }
    return this.cachedFormatter;
  }

  private getSelectionKey(id: ISelectionId): string {
    return getSelectionKey(id);
  }

  /** Single source of truth for link opacity values — used by both
   *  updateSelectionState (bulk) and mouseout (single element). */
  private computeLinkOpacities(link: ComputedLink): { opacity: number; strokeOpacity: number } {
    const isLinkActive = (): boolean =>
      (linkDatum(link).selectionIds ?? []).some(
        id => this.cachedSelectedKeySet.has(this.getSelectionKey(id)),
      );

    if (this.cachedSelectedKeySet.size > 0) {
      const active = isLinkActive();
      return {
        opacity: active ? SELECTED_OPACITY : UNSELECTED_LINK_OPACITY,
        strokeOpacity: active ? HIGHLIGHTED_LINK_OPACITY : UNSELECTED_LINK_OPACITY,
      };
    }
    if (this.hasHighlights) {
      const highlighted = (linkDatum(link).highlightValue ?? 0) > 0;
      return {
        opacity: highlighted ? SELECTED_OPACITY : UNSELECTED_LINK_OPACITY,
        strokeOpacity: highlighted ? HIGHLIGHTED_LINK_OPACITY : UNSELECTED_LINK_OPACITY,
      };
    }
    return {
      opacity: SELECTED_OPACITY,
      strokeOpacity: this.isHighContrastMode ? HIGHLIGHTED_LINK_OPACITY : this.settings.linkOpacity,
    };
  }

  /**
   * Update visual state based on current selection
   */
  private updateSelectionState(selectedIds: ISelectionId[]): void {
    // Cache the key set so computeLinkOpacities
    // can use it without rebuilding on every mouseout event
    this.cachedSelectedKeySet = new Set(selectedIds.map(id => this.getSelectionKey(id)));

    const hasSelection = this.cachedSelectedKeySet.size > 0;

    const isNodeSelected = (node: ComputedNode): boolean =>
      (node.selectionIds ?? []).some(id => this.cachedSelectedKeySet.has(this.getSelectionKey(id)));
    const hasNodeHighlight = (node: ComputedNode): boolean =>
      (node.highlightValue ?? 0) > 0;

    const computeNodeOpacity = (node: ComputedNode): number => {
      if (hasSelection) {
        return isNodeSelected(node) ? SELECTED_OPACITY : UNSELECTED_NODE_OPACITY;
      }
      if (this.hasHighlights) {
        return hasNodeHighlight(node) ? SELECTED_OPACITY : UNSELECTED_NODE_OPACITY;
      }
      return SELECTED_OPACITY;
    };

    // Update node opacity based on selection
    this.svg.selectAll('.nodes g rect')
      .style('opacity', (d: unknown) => computeNodeOpacity(d as ComputedNode));

    // Update link opacity + stroke-opacity using single-source-of-truth helpers
    this.svg.selectAll('.links path')
      .style('opacity', (d: unknown) => this.computeLinkOpacities(d as ComputedLink).opacity)
      .attr('stroke-opacity', (d: unknown) => this.computeLinkOpacities(d as ComputedLink).strokeOpacity);

    // Update label opacity
    this.svg.selectAll('.nodes g text')
      .style('opacity', (d: unknown) => computeNodeOpacity(d as ComputedNode));
  }

  /**
   * Returns the formatting model for the new Format Pane
   */
  public getFormattingModel(): powerbi.visuals.FormattingModel {
    // Hide defaultColor picker when using category colors
    const isSingle = this.settings.nodeColorMode === 'single';
    const card = this.formattingSettings.nodeSettingsCard;
    card.slices = isSingle
      ? [card.width, card.padding, card.iterations, card.colorMode, card.defaultColor]
      : [card.width, card.padding, card.iterations, card.colorMode];

    // Show/hide decimal places slices based on display mode
    const displayMode = this.settings.dataLabelDisplayMode;
    const dlCard = this.formattingSettings.dataLabelSettingsCard;
    const baseSlices: formattingSettings.Slice[] = [dlCard.displayMode, dlCard.fontFamily, dlCard.fontSize, dlCard.color];
    if (displayMode === 'value') {
      dlCard.slices = [...baseSlices, dlCard.displayUnits, dlCard.decimalPlaces];
    } else if (displayMode === 'percentage') {
      dlCard.slices = [...baseSlices, dlCard.percentDecimalPlaces];
    } else {
      // 'both'
      dlCard.slices = [...baseSlices, dlCard.displayUnits, dlCard.decimalPlaces, dlCard.percentDecimalPlaces];
    }

    // Show/hide label color picker based on label color mode
    const lblCard = this.formattingSettings.labelSettingsCard;
    lblCard.slices = this.settings.labelColorMode === 'single'
      ? [lblCard.fontFamily, lblCard.fontSize, lblCard.colorMode, lblCard.color]
      : [lblCard.fontFamily, lblCard.fontSize, lblCard.colorMode];

    // Show link defaultColor only in fixed mode
    const isFixed = this.settings.linkColorMode === 'fixed';
    const linkCard = this.formattingSettings.linkSettingsCard;
    linkCard.slices = isFixed
      ? [linkCard.defaultColor, linkCard.colorMode, linkCard.opacity, linkCard.sortMode]
      : [linkCard.colorMode, linkCard.opacity, linkCard.sortMode];

    const model = this.formattingSettingsService.buildFormattingModel(this.formattingSettings);

    // Helper to find a card by uid (with displayName fallback)
    const formattingCards = model.cards.filter(
      (c): c is powerbi.visuals.FormattingCard => 'groups' in c,
    );
    const findCard = (uid: string, displayName: string) =>
      formattingCards.find(c => c.uid === uid)
      ?? formattingCards.find(c => c.displayName === displayName);

    // In category mode, add per-node color pickers into Nodes card
    if (this.settings.nodeColorMode === 'category' && this.currentNodes.length > 0) {
      // Filter out duplicate nodes created by cycle resolution
      const uniqueNodes = this.currentNodes.filter(n => !n.originalId);
      const nodeColorSlices = uniqueNodes.map(node => {
        const firstId = (node.selectionIds ?? [])[0];
        return {
          uid: `nodeColors_fill_${node.id}`,
          displayName: node.name,
          control: {
            type: powerbi.visuals.FormattingComponent.ColorPicker,
            properties: {
              descriptor: {
                objectName: 'nodeColors',
                propertyName: 'fill',
                selector: firstId
                  ? (firstId as powerbi.visuals.ISelectionId).getSelector()
                  : null,
              },
              value: { value: node.color ?? this.host.colorPalette.getColor(node.id).value },
            },
          },
        };
      }) as unknown as powerbi.visuals.FormattingSlice[];

      const nodesCard = findCard('nodeSettings_card', 'Nodes');
      if (nodesCard) {
        nodesCard.groups.push({
          uid: 'nodeColorsGroup',
          displayName: 'Node Colors',
          slices: nodeColorSlices,
        });
      }
    }

    // Helper to build per-layer color picker slices and append as a group to a parent card
    // Cast required: Power BI FormattingSlice type doesn't expose the control shape we build dynamically
    const addLayerColorGroup = (
      depths: number[],
      colorMap: Map<number, string>,
      objectName: string,
      groupUid: string,
      cardUid: string,
      cardDisplayName: string,
    ) => {
      const slices = depths
        .filter(d => d < MAX_LAYER_COLORS)
        .map(depth => ({
          uid: `${objectName}_layer${depth}`,
          displayName: `Layer ${depth + 1}`,
          control: {
            type: powerbi.visuals.FormattingComponent.ColorPicker,
            properties: {
              descriptor: { objectName, propertyName: `layer${depth}`, selector: null },
              value: { value: colorMap.get(depth) ?? DEFAULT_LAYER_PALETTE[depth % DEFAULT_LAYER_PALETTE.length] },
            },
          },
        })) as unknown as powerbi.visuals.FormattingSlice[];

      const card = findCard(cardUid, cardDisplayName);
      if (card) {
        card.groups.push({ uid: groupUid, displayName: 'Layer Colors', slices });
      }
    };

    if (this.settings.linkColorMode === 'layer' && this.currentLayerDepths.length > 0) {
      addLayerColorGroup(this.currentLayerDepths, this.userLayerColors, 'layerColors', 'layerColorsGroup', 'linkSettings_card', 'Links');
    }
    if (this.settings.nodeColorMode === 'layer' && this.currentNodeLayerDepths.length > 0) {
      addLayerColorGroup(this.currentNodeLayerDepths, this.userNodeLayerColors, 'nodeLayerColors', 'nodeLayerColorsGroup', 'nodeSettings_card', 'Nodes');
    }
    if (this.settings.labelColorMode === 'layer' && this.currentLabelLayerDepths.length > 0) {
      addLayerColorGroup(this.currentLabelLayerDepths, this.userLabelLayerColors, 'labelLayerColors', 'labelLayerColorsGroup', 'labelSettings_card', 'Node Labels');
    }

    return model;
  }

  /**
   * Update high contrast mode detection
   */
  private updateHighContrastMode(): void {
    const colorPalette = this.host.colorPalette;
    this.isHighContrastMode = colorPalette.isHighContrast ?? false;

    if (this.isHighContrastMode) {
      this.highContrastColors = {
        foreground: colorPalette.foreground?.value ?? '#ffffff',
        background: colorPalette.background?.value ?? '#000000',
        foregroundSelected: colorPalette.foregroundSelected?.value ?? '#00ffff',
      };
    } else {
      this.highContrastColors = null;
    }
  }

  private hcForeground(fallback: string): string {
    return this.isHighContrastMode && this.highContrastColors
      ? this.highContrastColors.foreground
      : fallback;
  }

  private hcBackground(fallback: string): string {
    return this.isHighContrastMode && this.highContrastColors
      ? this.highContrastColors.background
      : fallback;
  }

  private hcForegroundSelected(fallback: string): string {
    return this.isHighContrastMode && this.highContrastColors
      ? this.highContrastColors.foregroundSelected
      : fallback;
  }

  private populateLayerColorMap(
    targetMap: Map<number, string>,
    isLayerMode: boolean,
    metadataObjects: Record<string, unknown> | undefined,
  ): void {
    targetMap.clear();
    if (!isLayerMode || !metadataObjects) return;
    for (let i = 0; i < MAX_LAYER_COLORS; i++) {
      const color = extractFillColor(metadataObjects[`layer${i}`]);
      if (color) {
        targetMap.set(i, color);
      }
    }
  }

  public update(options: VisualUpdateOptions): void {
    // Signal rendering started
    this.eventService.renderingStarted(options);

    try {
      const { viewport, dataViews } = options;
      const dataView = dataViews?.[0];

      // Re-read interaction permission (can change between pinned/live modes)
      this.allowInteractions = this.readAllowInteractions();

      // Update high contrast mode
      this.updateHighContrastMode();

      if (dataView) {
        this.settings = parseSettings(dataView);
        // Populate formatting settings from dataView
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
          VisualFormattingSettingsModel,
          dataView
        );

        // Override dropdown values from formattingSettings (more reliable than dataView objects)
        const { linkSettingsCard, nodeSettingsCard, dataLabelSettingsCard, labelSettingsCard } = this.formattingSettings;
        this.settings.linkSort = extractValidatedDropdown(linkSettingsCard.sortMode.value, VALID_LINK_SORT_MODES, this.settings.linkSort);
        this.settings.linkColorMode = extractValidatedDropdown(linkSettingsCard.colorMode.value, VALID_LINK_COLOR_MODES, this.settings.linkColorMode);
        this.settings.nodeColorMode = extractValidatedDropdown(nodeSettingsCard.colorMode.value, VALID_NODE_COLOR_MODES, this.settings.nodeColorMode);
        this.settings.labelColorMode = extractValidatedDropdown(labelSettingsCard.colorMode.value, VALID_LABEL_COLOR_MODES, this.settings.labelColorMode);
        this.settings.displayUnits = Number(extractDropdownValue(dataLabelSettingsCard.displayUnits.value, '0')) || 0;
        this.settings.decimalPlaces = dataLabelSettingsCard.decimalPlaces.value ?? this.settings.decimalPlaces;
        this.settings.percentDecimalPlaces = dataLabelSettingsCard.percentDecimalPlaces.value ?? this.settings.percentDecimalPlaces;
        this.settings.dataLabelDisplayMode = extractValidatedDropdown(dataLabelSettingsCard.displayMode.value, VALID_DATA_LABEL_DISPLAY_MODES, this.settings.dataLabelDisplayMode);

        // Extract value format string from the measure column
        const valueCol = dataView.categorical?.values?.find(v => v.source.roles?.['value']);
        this.valueFormat = valueCol?.source.format ?? '';

        // Invalidate cached formatter since settings may have changed
        this.cachedFormatter = null;

        // Extract user layer colors from metadata objects
        const metaObjects = dataView.metadata?.objects;
        this.populateLayerColorMap(this.userLayerColors, this.settings.linkColorMode === 'layer', metaObjects?.layerColors);
        this.populateLayerColorMap(this.userNodeLayerColors, this.settings.nodeColorMode === 'layer', metaObjects?.nodeLayerColors);
        this.populateLayerColorMap(this.userLabelLayerColors, this.settings.labelColorMode === 'layer', metaObjects?.labelLayerColors);
      }

      this.svg
        .attr('width', viewport.width)
        .attr('height', viewport.height);

      this.svg.selectAll('*').remove();

      const data = transformDataView({
        dataView,
        host: this.host,
        nodeColorMode: this.settings.nodeColorMode,
        nodeDefaultColor: this.settings.nodeDefaultColor,
      });
      if (data) {
        // Resolve cycles by duplicating back-edge target nodes so all
        // flows are visible as normal Sankey links.
        const resolved = resolveCycles(data.nodes, data.links);
        data.nodes = resolved.nodes;
        data.links = resolved.links;
      }
      if (!data || data.nodes.length === 0) {
        this.currentNodes = [];
        this.currentLayerDepths = [];
        this.currentNodeLayerDepths = [];
        this.currentLabelLayerDepths = [];
        this.hasHighlights = false;
        this.focusedNodeIndex = -1;
        this.svg.attr('aria-label', 'Sankey Chart: No data');
        this.showLandingPage(viewport);
        this.target.style.pointerEvents = 'none';
        this.target.removeAttribute('tabindex');
        this.eventService.renderingFinished(options);
        return;
      }

      this.target.style.pointerEvents = '';
      this.target.setAttribute('tabindex', '0');
      this.valueMeasureName = data.valueMeasureName;
      this.hasHighlights = data.links.some(link => (link.highlightValue ?? 0) > 0);
      this.renderSankey(data, viewport);
      this.updateSelectionState(this.selectionManager.getSelectionIds());

      // Signal rendering finished
      this.eventService.renderingFinished(options);
    } catch (error) {
      console.error('Sankey visual render error:', error);
      this.eventService.renderingFailed(options, String(error));
    }
  }

  /**
   * Group nodes by depth (column) and return the total value per column.
   */
  private calculateLayerTotals(nodes: ComputedNode[]): Map<number, number> {
    const totals = new Map<number, number>();
    for (const node of nodes) {
      const depth = node.depth ?? 0;
      totals.set(depth, (totals.get(depth) ?? 0) + (node.value ?? 0));
    }
    return totals;
  }

  private renderSankey(data: SankeyData, viewport: IViewport): void {
    const margin = {
      top: this.settings.marginTop,
      right: this.settings.marginRight,
      bottom: this.settings.marginBottom,
      left: this.settings.marginLeft,
    };
    const width = viewport.width - margin.left - margin.right;
    const height = viewport.height - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) {
      this.currentNodes = [];
      return;
    }

    const sankeyGenerator = sankey<SankeyNodeDatum, SankeyLinkDatum>()
      .nodeId(d => d.id)
      .nodeWidth(this.settings.nodeWidth)
      .nodePadding(this.settings.nodePadding)
      .iterations(this.settings.iterations)
      .extent([[0, 0], [width, height]]);

    // Apply link sort function
    // getLinkSortFunction returns:
    // - undefined: use d3-sankey's internal crossing-minimization (don't call linkSort at all)
    // - null: disable all sorting (explicit null)
    // - function: use custom comparator
    const linkSortFn = getLinkSortFunction(this.settings.linkSort);
    if (linkSortFn !== undefined) {
      sankeyGenerator.linkSort(linkSortFn);
    }

    // inputOrder: preserve data order for nodes by disabling d3's node reordering
    if (this.settings.linkSort === 'inputOrder') {
      sankeyGenerator.nodeSort(null);
    }

    const graph = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d })),
    });

    // Store nodes for keyboard navigation; clamp stale focus index
    this.currentNodes = graph.nodes;
    this.svg.attr('aria-label', `Sankey Chart: ${graph.nodes.length} nodes, ${graph.links.length} flows`);
    if (this.focusedNodeIndex >= graph.nodes.length) {
      this.focusedNodeIndex = graph.nodes.length - 1;
    }

    // Collect unique depths once, shared by node layer colors and label layer colors
    const needNodeLayer = this.settings.nodeColorMode === 'layer';
    const needLabelLayer = this.settings.labelColorMode === 'layer';
    if (needNodeLayer || needLabelLayer) {
      const depths = new Set<number>();
      for (const node of graph.nodes) {
        const depth = node.depth ?? 0;
        depths.add(depth);
        if (needNodeLayer) {
          node.color = this.userNodeLayerColors.get(depth)
            ?? DEFAULT_LAYER_PALETTE[depth % DEFAULT_LAYER_PALETTE.length];
        }
      }
      const sorted = [...depths].sort((a, b) => a - b);
      this.currentNodeLayerDepths = needNodeLayer ? sorted : [];
      this.currentLabelLayerDepths = needLabelLayer ? sorted : [];
    } else {
      this.currentNodeLayerDepths = [];
      this.currentLabelLayerDepths = [];
    }

    const layerTotals = this.calculateLayerTotals(graph.nodes);

    const g = this.svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    this.renderLinks(g, graph.links);
    this.renderNodes(g, graph.nodes, width, layerTotals);
  }

  private renderLinks(
    container: Selection<SVGGElement, unknown, null, undefined>,
    links: ComputedLink[]
  ): void {
    const linkPath = sankeyLinkHorizontal<ComputedNode, ComputedLink>();
    const { linkOpacity, linkColorMode, linkDefaultColor } = this.settings;
    const formatter = this.getValueFormatter();
    const tooltipService = this.tooltipService;
    const selectionManager = this.selectionManager;
    const isGradient = linkColorMode === 'gradient' && !this.isHighContrastMode;

    // Build layer color map if layer mode
    const layerColorMap = new Map<number, string>();
    if (linkColorMode === 'layer') {
      const depths = new Set<number>();
      for (const l of links) {
        depths.add(resolveNode(l.source).depth ?? 0);
      }
      for (const depth of depths) {
        layerColorMap.set(depth,
          this.userLayerColors.get(depth) ?? DEFAULT_LAYER_PALETTE[depth % DEFAULT_LAYER_PALETTE.length]
        );
      }
      this.currentLayerDepths = [...depths].sort((a, b) => a - b);
    } else {
      this.currentLayerDepths = [];
    }

    // Add gradient defs if gradient mode (namespace with instanceId to avoid collision)
    const gradientPrefix = this.instanceId;
    if (isGradient) {
      const defs = container.append('defs');
      links.forEach((link, i) => {
        const gradient = defs.append('linearGradient')
          .attr('id', `${gradientPrefix}-${i}`)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', resolveNode(link.source).x1 ?? 0)
          .attr('y1', 0)
          .attr('x2', resolveNode(link.target).x0 ?? 0)
          .attr('y2', 0);
        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', resolveNode(link.source).color ?? '#aaa');
        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', resolveNode(link.target).color ?? '#aaa');
      });
    }

    const getLinkColor = (d: ComputedLink, i: number): string => {
      if (this.isHighContrastMode) {
        return this.hcForeground('#aaa');
      }
      switch (linkColorMode) {
        case 'gradient':
          return `url(#${gradientPrefix}-${i})`;
        case 'target':
          return resolveNode(d.target).color ?? '#aaa';
        case 'fixed':
          return linkDefaultColor;
        case 'layer': {
          const depth = resolveNode(d.source).depth ?? 0;
          return layerColorMap.get(depth) ?? '#aaa';
        }
        case 'source':
        default:
          return resolveNode(d.source).color ?? '#aaa';
      }
    };

    const finalOpacity = this.isHighContrastMode ? HIGHLIGHTED_LINK_OPACITY : linkOpacity;

    container.append('g')
      .classed('links', true)
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', linkPath)
      .attr('fill', 'none')
      .attr('stroke', (d, i) => getLinkColor(d, i))
      .attr('stroke-width', d => Math.max(1, d.width ?? 1))
      .attr('stroke-opacity', finalOpacity)
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent, d: ComputedLink) => {
        // Handle click selection for links (only if interactions allowed)
        if (!this.allowInteractions) return;
        const linkData = linkDatum(d);
        const selectionIds = linkData.selectionIds ?? [];
        if (selectionIds.length > 0) {
          selectionManager.select(selectionIds, event.ctrlKey || event.metaKey);
        }
        event.stopPropagation();
      })
      .on('contextmenu', (event: MouseEvent, d: ComputedLink) => {
        // Show context menu for links (only if interactions allowed)
        if (!this.allowInteractions) return;
        const linkData = linkDatum(d);
        const selectionIds = linkData.selectionIds ?? [];
        if (selectionIds.length > 0) {
          // showContextMenu accepts a single ISelectionId only
          selectionManager.showContextMenu(
            selectionIds[0],
            { x: event.clientX, y: event.clientY }
          );
        }
        event.preventDefault();
        event.stopPropagation();
      })
      .on('mouseover', (event: MouseEvent, d: ComputedLink) => {
        const el = select(event.currentTarget as SVGPathElement);
        el.attr('stroke-opacity', HIGHLIGHTED_LINK_OPACITY)
          .style('opacity', SELECTED_OPACITY);
        const sourceName = resolveNode(d.source).name;
        const targetName = resolveNode(d.target).name;
        const tooltipData: VisualTooltipDataItem[] = [
          { displayName: this.getLocalizedString('Visual_Tooltip_Flow', 'Flow'), value: `${sourceName} → ${targetName}` },
          { displayName: this.valueMeasureName, value: formatter.format(d.value ?? 0) },
        ];
        tooltipService.show({
          dataItems: tooltipData,
          identities: [],
          coordinates: [event.clientX, event.clientY],
          isTouchEvent: false,
        });
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltipService.move({
          coordinates: [event.clientX, event.clientY],
          identities: [],
          isTouchEvent: false,
        });
      })
      .on('mouseout', (event: MouseEvent, d: ComputedLink) => {
        // Restore only the hovered link's opacity instead of
        // recalculating all elements for better performance
        const { opacity, strokeOpacity } = this.computeLinkOpacities(d);
        select(event.currentTarget as SVGPathElement)
          .attr('stroke-opacity', strokeOpacity)
          .style('opacity', opacity);
        tooltipService.hide({ immediately: true, isTouchEvent: false });
      });

    // Render link labels if enabled
    if (this.settings.showLinkLabels) {
      this.renderLinkLabels(container, links);
    }
  }

  private renderLinkLabels(
    container: Selection<SVGGElement, unknown, null, undefined>,
    links: ComputedLink[]
  ): void {
    const { linkLabelFontSize } = this.settings;
    const formatter = this.getValueFormatter();
    const textColor = this.hcForeground('#374151');
    const bgColor = this.hcBackground('rgba(255, 255, 255, 0.85)');
    // Filter links that are wide enough for labels
    const labelsToRender = links.filter(d => (d.width ?? 0) >= MIN_LINK_WIDTH_FOR_LABEL);

    const labelGroups = container.append('g')
      .classed('link-labels', true)
      .selectAll('g')
      .data(labelsToRender)
      .enter()
      .append('g')
      .style('pointer-events', 'none');

    // Pre-compute label positions and formatted text to avoid redundant calls
    const labelDataMap = new Map<ComputedLink, { cx: number; cy: number; text: string; width: number; height: number }>();
    for (const link of labelsToRender) {
      const source = resolveNode(link.source);
      const target = resolveNode(link.target);
      const cx = ((source.x1 ?? 0) + (target.x0 ?? 0)) / 2;
      const cy = ((link.y0 ?? 0) + (link.y1 ?? 0)) / 2;
      const text = formatter.format(link.value ?? 0);
      const width = text.length * linkLabelFontSize * CHAR_WIDTH_RATIO + LINK_LABEL_PADDING * 2;
      const height = linkLabelFontSize * TEXT_LINE_HEIGHT;
      labelDataMap.set(link, { cx, cy, text, width, height });
    }

    const getLabelData = (d: ComputedLink) => labelDataMap.get(d)!;

    // Add background rectangles for readability
    labelGroups.append('rect')
      .attr('x', d => getLabelData(d).cx - getLabelData(d).width / 2)
      .attr('y', d => getLabelData(d).cy - getLabelData(d).height / 2)
      .attr('width', d => getLabelData(d).width)
      .attr('height', d => getLabelData(d).height)
      .attr('rx', BG_LABEL_BORDER_RADIUS)
      .attr('ry', BG_LABEL_BORDER_RADIUS)
      .attr('fill', bgColor)
      .attr('opacity', BG_LABEL_OPACITY);

    // Add text labels
    labelGroups.append('text')
      .attr('x', d => getLabelData(d).cx)
      .attr('y', d => getLabelData(d).cy)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', this.settings.labelFontFamily)
      .attr('font-size', linkLabelFontSize)
      .attr('font-weight', '500')
      .attr('fill', textColor)
      .text(d => getLabelData(d).text);
  }

  private renderNodes(
    container: Selection<SVGGElement, unknown, null, undefined>,
    nodes: ComputedNode[],
    chartWidth: number,
    layerTotals: Map<number, number>
  ): void {
    const tooltipService = this.tooltipService;
    const selectionManager = this.selectionManager;
    const { nodeDefaultColor } = this.settings;

    const getNodeColor = (d: ComputedNode): string => {
      return this.hcForeground(d.color ?? nodeDefaultColor);
    };

    const nodeGroups = container.append('g')
      .classed('nodes', true)
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .attr('role', 'button')
      .attr('aria-label', (d: ComputedNode) => `${d.name}: ${this.getValueFormatter().format(d.value ?? 0)}`);

    nodeGroups.append('rect')
      .attr('x', d => d.x0 ?? 0)
      .attr('y', d => d.y0 ?? 0)
      .attr('width', d => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', d => (d.y1 ?? 0) - (d.y0 ?? 0))
      .attr('fill', getNodeColor)
      .attr('stroke', this.hcForeground('none'))
      .attr('stroke-width', this.isHighContrastMode ? 1 : 0)
      .on('click', (event: MouseEvent, d: ComputedNode) => {
        // Handle click selection for nodes (only if interactions allowed)
        if (!this.allowInteractions) return;
        const selectionIds = d.selectionIds ?? [];
        if (selectionIds.length > 0) {
          selectionManager.select(selectionIds, event.ctrlKey || event.metaKey);
        }
        event.stopPropagation();
      })
      .on('contextmenu', (event: MouseEvent, d: ComputedNode) => {
        // Show context menu for nodes (only if interactions allowed)
        if (!this.allowInteractions) return;
        const selectionIds = d.selectionIds ?? [];
        if (selectionIds.length > 0) {
          // showContextMenu accepts a single ISelectionId; use the first one.
          // This means drill-down targets the first associated row only.
          selectionManager.showContextMenu(
            selectionIds[0],
            { x: event.clientX, y: event.clientY }
          );
        }
        event.preventDefault();
        event.stopPropagation();
      })
      .on('mouseover', (event: MouseEvent, d: ComputedNode) => {
        const highlightColor = this.hcForegroundSelected('#000');
        select(event.currentTarget as SVGRectElement).attr('stroke', highlightColor).attr('stroke-width', 2);

        const totalValue = d.value ?? 0;

        const tooltipData: VisualTooltipDataItem[] = [
          { displayName: this.getLocalizedString('Visual_Tooltip_Node', 'Node'), value: d.name },
          { displayName: this.valueMeasureName, value: this.getValueFormatter().format(totalValue) },
        ];

        tooltipService.show({
          dataItems: tooltipData,
          identities: [],
          coordinates: [event.clientX, event.clientY],
          isTouchEvent: false,
        });
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltipService.move({
          coordinates: [event.clientX, event.clientY],
          identities: [],
          isTouchEvent: false,
        });
      })
      .on('mouseout', (event: MouseEvent) => {
        const el = select(event.currentTarget as SVGRectElement);
        // Preserve keyboard focus ring when mouse leaves
        if (!el.classed('focused')) {
          const strokeColor = this.hcForeground('none');
          const strokeWidth = this.isHighContrastMode ? 1 : 0;
          el.attr('stroke', strokeColor).attr('stroke-width', strokeWidth);
        }
        tooltipService.hide({ immediately: true, isTouchEvent: false });
      });

    if (this.settings.showLabels) {
      this.renderLabels(nodeGroups, chartWidth);
    }

    if (this.settings.showDataLabels) {
      this.renderDataLabels(nodeGroups, chartWidth, layerTotals);
    }
  }

  private renderLabels(
    nodeGroups: Selection<SVGGElement, ComputedNode, SVGGElement, unknown>,
    chartWidth: number
  ): void {
    const { labelFontSize, labelColor, labelColorMode, labelFontFamily } = this.settings;
    const useLayerColor = !this.isHighContrastMode && labelColorMode === 'layer';
    const textColor = this.hcForeground(labelColor);
    const midPoint = chartWidth / 2;

    nodeGroups.append('text')
      .attr('x', d => {
        const isLeftSide = (d.x0 ?? 0) < midPoint;
        return isLeftSide ? (d.x1 ?? 0) + LABEL_OFFSET : (d.x0 ?? 0) - LABEL_OFFSET;
      })
      .attr('y', d => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 ?? 0) < midPoint ? 'start' : 'end')
      .attr('font-family', labelFontFamily)
      .attr('font-size', labelFontSize)
      .attr('fill', d => {
        if (!useLayerColor) return textColor;
        const depth = d.depth ?? 0;
        return this.userLabelLayerColors.get(depth)
          ?? DEFAULT_LAYER_PALETTE[depth % DEFAULT_LAYER_PALETTE.length];
      })
      .text(d => d.name);
  }

  private renderDataLabels(
    nodeGroups: Selection<SVGGElement, ComputedNode, SVGGElement, unknown>,
    chartWidth: number,
    layerTotals: Map<number, number>
  ): void {
    const { dataLabelFontSize, dataLabelColor, dataLabelFontFamily, dataLabelDisplayMode, percentDecimalPlaces } = this.settings;
    const textColor = this.hcForeground(dataLabelColor);
    const midPoint = chartWidth / 2;
    // If name labels are also shown, offset the data label below
    const dyValue = this.settings.showLabels ? '1.5em' : '0.35em';
    const formatter = this.getValueFormatter();

    nodeGroups.append('text')
      .attr('x', d => {
        const isLeftSide = (d.x0 ?? 0) < midPoint;
        return isLeftSide ? (d.x1 ?? 0) + LABEL_OFFSET : (d.x0 ?? 0) - LABEL_OFFSET;
      })
      .attr('y', d => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', dyValue)
      .attr('text-anchor', d => (d.x0 ?? 0) < midPoint ? 'start' : 'end')
      .attr('font-family', dataLabelFontFamily)
      .attr('font-size', dataLabelFontSize)
      .attr('fill', textColor)
      .text(d => {
        const value = d.value ?? 0;
        const layerTotal = layerTotals.get(d.depth ?? 0) ?? 0;
        const pct = layerTotal > 0 ? (value / layerTotal) * 100 : 0;

        switch (dataLabelDisplayMode) {
          case 'percentage':
            return `${pct.toFixed(percentDecimalPlaces)}%`;
          case 'both':
            return `${formatter.format(value)} (${pct.toFixed(percentDecimalPlaces)}%)`;
          case 'value':
          default:
            return formatter.format(value);
        }
      });
  }

  /**
   * Show landing page when no data is available
   */
  private showLandingPage(viewport: IViewport): void {
    const subtextColor = this.hcForeground('#555');
    const iconColor = this.hcForeground('#0078d4');

    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;

    const landingGroup = this.svg.append('g')
      .attr('class', 'landing-page')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Sankey diagram icon — hardcoded coordinates form a simplified flow
    // diagram centered at (0, 0) within this group
    const iconGroup = landingGroup.append('g')
      .attr('transform', 'translate(0, -60)');

    // Left nodes
    iconGroup.append('rect')
      .attr('x', -40).attr('y', -20).attr('width', 8).attr('height', 15)
      .attr('fill', iconColor).attr('rx', 2);
    iconGroup.append('rect')
      .attr('x', -40).attr('y', 5).attr('width', 8).attr('height', 15)
      .attr('fill', iconColor).attr('rx', 2);

    // Right node
    iconGroup.append('rect')
      .attr('x', 32).attr('y', -10).attr('width', 8).attr('height', 20)
      .attr('fill', iconColor).attr('rx', 2);

    // Flow paths
    iconGroup.append('path')
      .attr('d', 'M-30,-12 C0,-12 0,0 30,0')
      .attr('fill', 'none')
      .attr('stroke', iconColor)
      .attr('stroke-width', 6)
      .attr('stroke-opacity', 0.4);

    iconGroup.append('path')
      .attr('d', 'M-30,12 C0,12 0,0 30,0')
      .attr('fill', 'none')
      .attr('stroke', iconColor)
      .attr('stroke-width', 4)
      .attr('stroke-opacity', 0.4);

    // Instruction
    landingGroup.append('text')
      .attr('y', 10)
      .attr('text-anchor', 'middle')
      .attr('font-family', this.settings.labelFontFamily)
      .attr('font-size', '14px')
      .attr('font-weight', '500')
      .attr('fill', subtextColor)
      .text('市区町村を選択してください');
  }

  private readAllowInteractions(): boolean {
    return 'allowInteractions' in this.host
      ? (this.host as unknown as { allowInteractions: boolean }).allowInteractions
      : true;
  }

  public destroy(): void {
    // Power BI calls this when the visual is removed.
    // Abort all event listeners registered via setupKeyboardNavigation.
    this.abortController.abort();
    this.svg.selectAll('*').remove();
    this.currentNodes = [];
    this.currentLayerDepths = [];
    this.userLayerColors.clear();
    this.currentNodeLayerDepths = [];
    this.userNodeLayerColors.clear();
    this.currentLabelLayerDepths = [];
    this.userLabelLayerColors.clear();
  }
}

export { Visual as SankeyVisual };
