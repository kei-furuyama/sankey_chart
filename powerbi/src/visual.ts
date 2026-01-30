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
import VisualUpdateType = powerbi.VisualUpdateType;

// Types

interface SankeyNodeDatum {
  id: string;
  name: string;
  color?: string;
  selectionId?: ISelectionId;
}

interface SankeyLinkDatum {
  source: string;
  target: string;
  value: number;
  selectionIds?: ISelectionId[];
}

interface SankeyData {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
  valueMeasureName: string;
}

interface TransformDataViewOptions {
  dataView: DataView | undefined;
  host: IVisualHost;
  nodeColorMode?: NodeColorMode;
  nodeDefaultColor?: string;
}

type ComputedNode = SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
type ComputedLink = SankeyLink<SankeyNodeDatum, SankeyLinkDatum>;

// Settings

type LinkSortMode = 'ascending' | 'descending' | 'byValue' | 'byValueDesc' | 'inputOrder' | 'none';
type NodeColorMode = 'single' | 'category';

const VALID_LINK_SORT_MODES: LinkSortMode[] = ['ascending', 'descending', 'byValue', 'byValueDesc', 'inputOrder', 'none'];
const VALID_NODE_COLOR_MODES: NodeColorMode[] = ['single', 'category'];

interface VisualSettings {
  nodeWidth: number;
  nodePadding: number;
  iterations: number;
  nodeDefaultColor: string;
  nodeColorMode: NodeColorMode;
  linkOpacity: number;
  linkColorMode: string;
  linkSort: LinkSortMode;
  showLinkLabels: boolean;
  linkLabelFontSize: number;
  labelFontSize: number;
  labelColor: string;
  labelFontFamily: string;
  showLabels: boolean;
  showDataLabels: boolean;
  dataLabelFontSize: number;
  dataLabelColor: string;
  dataLabelFontFamily: string;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

const DEFAULT_SETTINGS: VisualSettings = {
  nodeWidth: 24,
  nodePadding: 16,
  iterations: 6,
  nodeDefaultColor: '#1f77b4',
  nodeColorMode: 'category',
  linkOpacity: 0.5,
  linkColorMode: 'source',
  linkSort: 'ascending',
  showLinkLabels: false,
  linkLabelFontSize: 10,
  labelFontSize: 12,
  labelColor: '#333333',
  labelFontFamily: "'Segoe UI', sans-serif",
  showLabels: true,
  showDataLabels: false,
  dataLabelFontSize: 10,
  dataLabelColor: '#666666',
  dataLabelFontFamily: "'Segoe UI', sans-serif",
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
  colorMode = new formattingSettings.ItemDropdown({
    name: 'colorMode',
    displayName: 'Color Mode',
    items: [
      { value: 'source', displayName: 'Source' },
      { value: 'target', displayName: 'Target' },
      { value: 'gradient', displayName: 'Gradient' },
      { value: 'fixed', displayName: 'Fixed' },
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
  slices: formattingSettings.Slice[] = [this.colorMode, this.opacity, this.sortMode];
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

  fontFamily = new formattingSettings.FontPicker({
    name: 'fontFamily',
    displayName: 'Font',
    value: DEFAULT_SETTINGS.labelFontFamily,
  });

  name: string = 'labelSettings';
  displayName: string = 'Node Labels';
  topLevelSlice: formattingSettings.ToggleSwitch = this.show;
  slices: formattingSettings.Slice[] = [this.fontFamily, this.fontSize, this.color];
}

class DataLabelSettingsCard extends formattingSettings.SimpleCard {
  show = new formattingSettings.ToggleSwitch({
    name: 'show',
    displayName: 'Show',
    value: DEFAULT_SETTINGS.showDataLabels,
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

  name: string = 'dataLabelSettings';
  displayName: string = 'Node Data Labels';
  topLevelSlice: formattingSettings.ToggleSwitch = this.show;
  slices: formattingSettings.Slice[] = [this.fontFamily, this.fontSize, this.color];
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
function extractDropdownValue(raw: unknown, defaultValue: string): string {
  if (raw === null || raw === undefined) {
    return defaultValue;
  }
  if (typeof raw === 'string') {
    return raw;
  }
  if (typeof raw === 'object' && 'value' in raw) {
    const val = (raw as { value?: string }).value;
    return typeof val === 'string' ? val : defaultValue;
  }
  return defaultValue;
}

/**
 * Extract a solid color value from a Power BI fill object.
 */
function extractFillColor(raw: unknown): string | undefined {
  return (raw as { solid?: { color?: string } } | undefined)?.solid?.color;
}

/**
 * Extract and validate a dropdown value against a list of valid options.
 */
function extractValidatedDropdown<T extends string>(raw: unknown, validValues: T[], defaultValue: T): T {
  const extracted = extractDropdownValue(raw, defaultValue);
  return validValues.includes(extracted as T) ? (extracted as T) : defaultValue;
}

function parseSettings(dataView: DataView): VisualSettings {
  const objects = dataView?.metadata?.objects;
  if (!objects) {
    return { ...DEFAULT_SETTINGS };
  }

  const { nodeSettings, linkSettings, linkLabelSettings, labelSettings, dataLabelSettings, marginSettings } = objects;

  return {
    nodeWidth: (nodeSettings?.width as number) ?? DEFAULT_SETTINGS.nodeWidth,
    nodePadding: (nodeSettings?.padding as number) ?? DEFAULT_SETTINGS.nodePadding,
    iterations: (nodeSettings?.iterations as number) ?? DEFAULT_SETTINGS.iterations,
    nodeDefaultColor: extractFillColor(nodeSettings?.defaultColor) ?? DEFAULT_SETTINGS.nodeDefaultColor,
    nodeColorMode: extractValidatedDropdown(nodeSettings?.colorMode, VALID_NODE_COLOR_MODES, DEFAULT_SETTINGS.nodeColorMode),
    linkOpacity: ((linkSettings?.opacity as number) ?? 50) / 100,
    linkColorMode: extractDropdownValue(linkSettings?.colorMode, DEFAULT_SETTINGS.linkColorMode),
    linkSort: extractValidatedDropdown(linkSettings?.sortMode, VALID_LINK_SORT_MODES, DEFAULT_SETTINGS.linkSort),
    showLinkLabels: (linkLabelSettings?.show as boolean) ?? DEFAULT_SETTINGS.showLinkLabels,
    linkLabelFontSize: (linkLabelSettings?.fontSize as number) ?? DEFAULT_SETTINGS.linkLabelFontSize,
    labelFontSize: (labelSettings?.fontSize as number) ?? DEFAULT_SETTINGS.labelFontSize,
    labelColor: extractFillColor(labelSettings?.color) ?? DEFAULT_SETTINGS.labelColor,
    labelFontFamily: (labelSettings?.fontFamily as string) ?? DEFAULT_SETTINGS.labelFontFamily,
    showLabels: (labelSettings?.show as boolean) ?? DEFAULT_SETTINGS.showLabels,
    showDataLabels: (dataLabelSettings?.show as boolean) ?? DEFAULT_SETTINGS.showDataLabels,
    dataLabelFontSize: (dataLabelSettings?.fontSize as number) ?? DEFAULT_SETTINGS.dataLabelFontSize,
    dataLabelColor: extractFillColor(dataLabelSettings?.color) ?? DEFAULT_SETTINGS.dataLabelColor,
    dataLabelFontFamily: (dataLabelSettings?.fontFamily as string) ?? DEFAULT_SETTINGS.dataLabelFontFamily,
    marginTop: (marginSettings?.top as number) ?? DEFAULT_SETTINGS.marginTop,
    marginRight: (marginSettings?.right as number) ?? DEFAULT_SETTINGS.marginRight,
    marginBottom: (marginSettings?.bottom as number) ?? DEFAULT_SETTINGS.marginBottom,
    marginLeft: (marginSettings?.left as number) ?? DEFAULT_SETTINGS.marginLeft,
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

function getLinkSortFunction(
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
      // Sort by value ascending (small flows first)
      return (a, b) => a.value - b.value;
    case 'byValueDesc':
      // Sort by value descending (large flows first)
      return (a, b) => b.value - a.value;
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

// Data Transformer

function transformDataView(options: TransformDataViewOptions): SankeyData | null {
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

  // Track nodes and their selection IDs
  const nodeMap = new Map<string, { selectionIds: ISelectionId[] }>();
  const linkMap = new Map<string, SankeyLinkDatum>();

  for (let i = 0; i < sourceColumn.values.length; i++) {
    const source = String(sourceColumn.values[i] ?? '');
    const target = String(targetColumn.values[i] ?? '');
    const value = valueColumn ? (valueColumn.values[i] as number) ?? 0 : 1;

    if (!source || !target || value <= 0) {
      continue;
    }

    // Create selection ID for this row
    const selectionId = host.createSelectionIdBuilder()
      .withCategory(sourceColumn, i)
      .createSelectionId();

    // Track source node
    if (!nodeMap.has(source)) {
      nodeMap.set(source, { selectionIds: [] });
    }
    nodeMap.get(source)!.selectionIds.push(selectionId);

    // Track target node
    if (!nodeMap.has(target)) {
      nodeMap.set(target, { selectionIds: [] });
    }
    nodeMap.get(target)!.selectionIds.push(selectionId);

    // Track link with selection IDs
    const key = `${source}||${target}`;
    const existing = linkMap.get(key);
    if (existing) {
      existing.value += value;
      existing.selectionIds?.push(selectionId);
    } else {
      linkMap.set(key, { source, target, value, selectionIds: [selectionId] });
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

  // Create nodes with first selection ID (for cross-filtering by node)
  const nodes: SankeyNodeDatum[] = Array.from(nodeMap.entries()).map(([id, data]) => ({
    id,
    name: id,
    color: colorMode === 'single'
      ? defaultColor
      : userColorMap.get(id) ?? host.colorPalette.getColor(id).value,
    selectionId: data.selectionIds[0], // Use first selectionId for the node
  }));

  return {
    nodes,
    links: Array.from(linkMap.values()),
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

  // Interaction state
  private allowInteractions: boolean = true;

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
    this.allowInteractions = (this.host as unknown as { allowInteractions?: boolean }).allowInteractions ?? true;

    // Create main container with focus support
    this.target.setAttribute('tabindex', '0');
    this.target.style.outline = 'none';

    this.svg = select(this.target)
      .append('svg')
      .classed('sankey-visual', true);

    // Setup keyboard navigation
    this.setupKeyboardNavigation();

    // Register for bookmark state changes
    this.selectionManager.registerOnSelectCallback(
      (ids: ISelectionId[]) => this.onSelectionChanged(ids)
    );

    // Detect high contrast mode
    this.updateHighContrastMode();
  }

  /**
   * Setup keyboard navigation handlers
   */
  private setupKeyboardNavigation(): void {
    this.target.addEventListener('keydown', (event: KeyboardEvent) => {
      if (this.currentNodes.length === 0) return;

      switch (event.key) {
        case 'Tab':
          // Move to next/prev node
          if (event.shiftKey) {
            this.focusedNodeIndex = Math.max(0, this.focusedNodeIndex - 1);
          } else {
            this.focusedNodeIndex = Math.min(
              this.currentNodes.length - 1,
              this.focusedNodeIndex + 1
            );
          }
          this.updateNodeFocus();
          event.preventDefault();
          break;

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
            if (node.selectionId) {
              this.selectionManager.select(node.selectionId, event.ctrlKey || event.metaKey);
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
    });

    this.target.addEventListener('focus', () => {
      if (this.focusedNodeIndex === -1 && this.currentNodes.length > 0) {
        this.focusedNodeIndex = 0;
        this.updateNodeFocus();
      }
    });

    this.target.addEventListener('blur', () => {
      this.clearNodeFocus();
    });
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
        .attr('stroke', this.isHighContrastMode && this.highContrastColors
          ? this.highContrastColors.foregroundSelected
          : '#0078d4')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,2')
        .classed('focused', true);
    }
  }

  /**
   * Clear focus indicator from all nodes
   */
  private clearNodeFocus(): void {
    const isHighContrast = this.isHighContrastMode;
    const hcColors = this.highContrastColors;

    this.svg.selectAll('.nodes g rect')
      .attr('stroke', isHighContrast && hcColors ? hcColors.foreground : 'none')
      .attr('stroke-width', isHighContrast ? 1 : 0)
      .attr('stroke-dasharray', null)
      .classed('focused', false);
  }

  /**
   * Handle selection changes (for bookmarks)
   */
  private onSelectionChanged(ids: ISelectionId[]): void {
    // Update visual state based on selection
    this.updateSelectionState(ids);
  }

  /**
   * Get localized string with fallback
   */
  private getLocalizedString(key: string, fallback: string): string {
    const localized = this.localizationManager.getDisplayName(key);
    return localized !== key ? localized : fallback;
  }

  /**
   * Compare two selection IDs for equality
   */
  private selectionIdEquals(id1: ISelectionId, id2: ISelectionId): boolean {
    // Use getKey() for comparison if available, otherwise JSON comparison
    const key1 = (id1 as powerbi.visuals.ISelectionId).getKey?.() ?? JSON.stringify(id1);
    const key2 = (id2 as powerbi.visuals.ISelectionId).getKey?.() ?? JSON.stringify(id2);
    return key1 === key2;
  }

  /**
   * Check if a selection ID is in the selected list
   */
  private isSelected(id: ISelectionId, selectedIds: ISelectionId[]): boolean {
    return selectedIds.some(sid => this.selectionIdEquals(sid, id));
  }

  /**
   * Update visual state based on current selection
   */
  private updateSelectionState(selectedIds: ISelectionId[]): void {
    const hasSelection = selectedIds.length > 0;
    const { linkOpacity } = this.settings;
    const isHighContrast = this.isHighContrastMode;

    // Update node opacity based on selection
    this.svg.selectAll('.nodes g rect')
      .style('opacity', (d: unknown) => {
        if (!hasSelection) return 1;
        const node = d as ComputedNode;
        return node.selectionId && this.isSelected(node.selectionId, selectedIds)
          ? 1
          : 0.3;
      });

    // Update link opacity based on selection
    this.svg.selectAll('.links path')
      .style('opacity', (d: unknown) => {
        if (!hasSelection) return 1;
        const link = d as ComputedLink;
        const linkSelectionIds = (link as unknown as SankeyLinkDatum).selectionIds ?? [];
        return linkSelectionIds.some(lid => this.isSelected(lid, selectedIds))
          ? 1
          : 0.2;
      })
      .attr('stroke-opacity', (d: unknown) => {
        if (!hasSelection) return isHighContrast ? 0.8 : linkOpacity;
        const link = d as ComputedLink;
        const linkSelectionIds = (link as unknown as SankeyLinkDatum).selectionIds ?? [];
        return linkSelectionIds.some(lid => this.isSelected(lid, selectedIds))
          ? 0.8
          : 0.2;
      });

    // Update label opacity
    this.svg.selectAll('.nodes g text')
      .style('opacity', (d: unknown) => {
        if (!hasSelection) return 1;
        const node = d as ComputedNode;
        return node.selectionId && this.isSelected(node.selectionId, selectedIds)
          ? 1
          : 0.3;
      });
  }

  /**
   * Returns the formatting model for the new Format Pane
   */
  public getFormattingModel(): powerbi.visuals.FormattingModel {
    // Hide defaultColor picker when using category colors
    const isSingle = this.settings.nodeColorMode === 'single';
    const card = this.formattingSettings.nodeSettingsCard;
    card.slices = isSingle
      ? [card.width, card.padding, card.colorMode, card.defaultColor]
      : [card.width, card.padding, card.colorMode];

    const model = this.formattingSettingsService.buildFormattingModel(this.formattingSettings);

    // In category mode, add per-node color pickers
    if (!isSingle && this.currentNodes.length > 0) {
      const nodeColorSlices = this.currentNodes.map(node => ({
        uid: `nodeColors_fill_${node.id}`,
        displayName: node.name,
        control: {
          type: powerbi.visuals.FormattingComponent.ColorPicker,
          properties: {
            descriptor: {
              objectName: 'nodeColors',
              propertyName: 'fill',
              selector: node.selectionId
                ? (node.selectionId as powerbi.visuals.ISelectionId).getSelector()
                : null,
            },
            value: { value: node.color ?? this.host.colorPalette.getColor(node.id).value },
          },
        },
      })) as unknown as powerbi.visuals.FormattingSlice[];

      const nodeColorsCard: powerbi.visuals.FormattingCard = {
        uid: 'nodeColorsCard',
        displayName: 'Node Colors',
        groups: [{
          uid: 'nodeColorsGroup',
          displayName: undefined as unknown as string,
          slices: nodeColorSlices,
        }],
      };

      model.cards.push(nodeColorsCard);
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

  public update(options: VisualUpdateOptions): void {
    // Signal rendering started
    this.eventService.renderingStarted(options);

    try {
      const { viewport, dataViews } = options;
      const dataView = dataViews?.[0];

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
        const { linkSettingsCard, nodeSettingsCard } = this.formattingSettings;
        this.settings.linkSort = extractValidatedDropdown(linkSettingsCard.sortMode.value, VALID_LINK_SORT_MODES, this.settings.linkSort);
        this.settings.linkColorMode = extractDropdownValue(linkSettingsCard.colorMode.value, this.settings.linkColorMode);
        this.settings.nodeColorMode = extractValidatedDropdown(nodeSettingsCard.colorMode.value, VALID_NODE_COLOR_MODES, this.settings.nodeColorMode);
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
      if (!data || data.nodes.length === 0) {
        this.currentNodes = [];
        this.focusedNodeIndex = -1;
        this.showLandingPage(viewport);
        this.target.style.pointerEvents = 'none';
        this.target.removeAttribute('tabindex');
        this.eventService.renderingFinished(options);
        return;
      }

      this.target.style.pointerEvents = '';
      this.target.setAttribute('tabindex', '0');
      this.valueMeasureName = data.valueMeasureName;
      this.renderSankey(data, viewport);

      // Signal rendering finished
      this.eventService.renderingFinished(options);
    } catch (error) {
      // Signal rendering failed
      this.eventService.renderingFailed(options, String(error));
    }
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

    // Store nodes for keyboard navigation
    this.currentNodes = graph.nodes;

    const g = this.svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    this.renderLinks(g, graph.links);
    this.renderNodes(g, graph.nodes, width);
  }

  private renderLinks(
    container: Selection<SVGGElement, unknown, null, undefined>,
    links: ComputedLink[]
  ): void {
    const linkPath = sankeyLinkHorizontal<ComputedNode, ComputedLink>();
    const { linkOpacity, linkColorMode } = this.settings;
    const tooltipService = this.tooltipService;
    const selectionManager = this.selectionManager;
    const isHighContrast = this.isHighContrastMode;
    const hcColors = this.highContrastColors;
    const isGradient = linkColorMode === 'gradient' && !isHighContrast;

    // Add gradient defs if gradient mode
    if (isGradient) {
      const defs = container.append('defs');
      links.forEach((link, i) => {
        const gradient = defs.append('linearGradient')
          .attr('id', `gradient-${i}`)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', (link.source as ComputedNode).x1 ?? 0)
          .attr('y1', 0)
          .attr('x2', (link.target as ComputedNode).x0 ?? 0)
          .attr('y2', 0);
        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', (link.source as ComputedNode).color ?? '#aaa');
        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', (link.target as ComputedNode).color ?? '#aaa');
      });
    }

    const getLinkColor = (d: ComputedLink, i: number): string => {
      if (isHighContrast && hcColors) {
        return hcColors.foreground;
      }
      switch (linkColorMode) {
        case 'gradient':
          return `url(#gradient-${i})`;
        case 'target':
          return (d.target as ComputedNode).color ?? '#aaa';
        case 'fixed':
          return '#aaa';
        case 'source':
        default:
          return (d.source as ComputedNode).color ?? '#aaa';
      }
    };

    const finalOpacity = isHighContrast ? 0.8 : linkOpacity;

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
        const linkData = d as unknown as SankeyLinkDatum;
        const selectionIds = linkData.selectionIds ?? [];
        if (selectionIds.length > 0) {
          selectionManager.select(selectionIds, event.ctrlKey || event.metaKey);
        }
        event.stopPropagation();
      })
      .on('contextmenu', (event: MouseEvent, d: ComputedLink) => {
        // Show context menu for links (only if interactions allowed)
        if (!this.allowInteractions) return;
        const linkData = d as unknown as SankeyLinkDatum;
        const selectionIds = linkData.selectionIds ?? [];
        if (selectionIds.length > 0) {
          selectionManager.showContextMenu(
            selectionIds[0],
            { x: event.clientX, y: event.clientY }
          );
        }
        event.preventDefault();
        event.stopPropagation();
      })
      .on('mouseover', (event: MouseEvent, d: ComputedLink) => {
        select(event.currentTarget as SVGPathElement).attr('stroke-opacity', 0.8);
        const sourceName = (d.source as ComputedNode).name;
        const targetName = (d.target as ComputedNode).name;
        const tooltipData: VisualTooltipDataItem[] = [
          { displayName: this.getLocalizedString('Visual_Tooltip_Flow', 'Flow'), value: `${sourceName} → ${targetName}` },
          { displayName: this.valueMeasureName, value: (d.value ?? 0).toLocaleString() },
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
        select(event.currentTarget as SVGPathElement).attr('stroke-opacity', isHighContrast ? 0.8 : linkOpacity);
        tooltipService.hide({ immediately: true, isTouchEvent: false });
      });

    // Render link labels if enabled
    if (this.settings.showLinkLabels) {
      this.renderLinkLabels(container, links);
    }

    // Allow clicking empty space to clear selection (only if interactions allowed)
    this.svg.on('click', () => {
      if (this.allowInteractions) {
        selectionManager.clear();
      }
    });
  }

  private renderLinkLabels(
    container: Selection<SVGGElement, unknown, null, undefined>,
    links: ComputedLink[]
  ): void {
    const { linkLabelFontSize } = this.settings;
    const isHighContrast = this.isHighContrastMode;
    const hcColors = this.highContrastColors;
    const textColor = isHighContrast && hcColors ? hcColors.foreground : '#374151';
    const bgColor = isHighContrast && hcColors ? hcColors.background : 'rgba(255, 255, 255, 0.85)';
    const minLinkWidth = 8;
    const labelPadding = 4;

    // Filter links that are wide enough for labels
    const labelsToRender = links.filter(d => (d.width ?? 0) >= minLinkWidth);

    const labelGroups = container.append('g')
      .classed('link-labels', true)
      .selectAll('g')
      .data(labelsToRender)
      .enter()
      .append('g')
      .style('pointer-events', 'none');

    // Calculate center position for each link
    const getLinkCenter = (d: ComputedLink): { x: number; y: number } => {
      const source = d.source as ComputedNode;
      const target = d.target as ComputedNode;
      const sourceX = source.x1 ?? 0;
      const targetX = target.x0 ?? 0;
      const sourceY = d.y0 ?? 0;
      const targetY = d.y1 ?? 0;
      return {
        x: (sourceX + targetX) / 2,
        y: (sourceY + targetY) / 2,
      };
    };

    // Add background rectangles for readability
    labelGroups.append('rect')
      .attr('x', d => {
        const center = getLinkCenter(d);
        const text = String(d.value ?? 0);
        const width = text.length * linkLabelFontSize * 0.6 + labelPadding * 2;
        return center.x - width / 2;
      })
      .attr('y', d => {
        const center = getLinkCenter(d);
        const height = linkLabelFontSize * 1.4;
        return center.y - height / 2;
      })
      .attr('width', d => {
        const text = String(d.value ?? 0);
        return text.length * linkLabelFontSize * 0.6 + labelPadding * 2;
      })
      .attr('height', linkLabelFontSize * 1.4)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', bgColor)
      .attr('opacity', 0.9);

    // Add text labels
    labelGroups.append('text')
      .attr('x', d => getLinkCenter(d).x)
      .attr('y', d => getLinkCenter(d).y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', 'Segoe UI, sans-serif')
      .attr('font-size', linkLabelFontSize)
      .attr('font-weight', '500')
      .attr('fill', textColor)
      .text(d => (d.value ?? 0).toLocaleString());
  }

  private renderNodes(
    container: Selection<SVGGElement, unknown, null, undefined>,
    nodes: ComputedNode[],
    chartWidth: number
  ): void {
    const tooltipService = this.tooltipService;
    const selectionManager = this.selectionManager;
    const isHighContrast = this.isHighContrastMode;
    const hcColors = this.highContrastColors;
    const { nodeDefaultColor } = this.settings;

    const getNodeColor = (d: ComputedNode): string => {
      if (isHighContrast && hcColors) {
        return hcColors.foreground;
      }
      return d.color ?? nodeDefaultColor;
    };

    const nodeGroups = container.append('g')
      .classed('nodes', true)
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer');

    nodeGroups.append('rect')
      .attr('x', d => d.x0 ?? 0)
      .attr('y', d => d.y0 ?? 0)
      .attr('width', d => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', d => (d.y1 ?? 0) - (d.y0 ?? 0))
      .attr('fill', getNodeColor)
      .attr('stroke', isHighContrast && hcColors ? hcColors.foreground : 'none')
      .attr('stroke-width', isHighContrast ? 1 : 0)
      .on('click', (event: MouseEvent, d: ComputedNode) => {
        // Handle click selection for nodes (only if interactions allowed)
        if (!this.allowInteractions) return;
        if (d.selectionId) {
          selectionManager.select(d.selectionId, event.ctrlKey || event.metaKey);
        }
        event.stopPropagation();
      })
      .on('contextmenu', (event: MouseEvent, d: ComputedNode) => {
        // Show context menu for nodes (only if interactions allowed)
        if (!this.allowInteractions) return;
        if (d.selectionId) {
          selectionManager.showContextMenu(
            d.selectionId,
            { x: event.clientX, y: event.clientY }
          );
        }
        event.preventDefault();
        event.stopPropagation();
      })
      .on('mouseover', (event: MouseEvent, d: ComputedNode) => {
        const highlightColor = isHighContrast && hcColors
          ? hcColors.foregroundSelected
          : '#000';
        select(event.currentTarget as SVGRectElement).attr('stroke', highlightColor).attr('stroke-width', 2);

        // Calculate total inflow and outflow
        const inflow = (d.targetLinks ?? []).reduce((sum, link) => sum + (link.value ?? 0), 0);
        const outflow = (d.sourceLinks ?? []).reduce((sum, link) => sum + (link.value ?? 0), 0);
        const totalValue = d.value ?? Math.max(inflow, outflow);

        const tooltipData: VisualTooltipDataItem[] = [
          { displayName: this.getLocalizedString('Visual_Tooltip_Node', 'Node'), value: d.name },
          { displayName: `${this.valueMeasureName} (Total)`, value: totalValue.toLocaleString() },
        ];

        if (inflow > 0) {
          tooltipData.push({ displayName: this.getLocalizedString('Visual_Tooltip_Inflow', 'Inflow'), value: inflow.toLocaleString() });
        }
        if (outflow > 0) {
          tooltipData.push({ displayName: this.getLocalizedString('Visual_Tooltip_Outflow', 'Outflow'), value: outflow.toLocaleString() });
        }

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
        const strokeColor = isHighContrast && hcColors ? hcColors.foreground : 'none';
        const strokeWidth = isHighContrast ? 1 : 0;
        select(event.currentTarget as SVGRectElement).attr('stroke', strokeColor).attr('stroke-width', strokeWidth);
        tooltipService.hide({ immediately: true, isTouchEvent: false });
      });

    if (this.settings.showLabels) {
      this.renderLabels(nodeGroups, chartWidth);
    }

    if (this.settings.showDataLabels) {
      this.renderDataLabels(nodeGroups, chartWidth);
    }
  }

  private renderLabels(
    nodeGroups: Selection<SVGGElement, ComputedNode, SVGGElement, unknown>,
    chartWidth: number
  ): void {
    const { labelFontSize, labelColor, labelFontFamily } = this.settings;
    const isHighContrast = this.isHighContrastMode;
    const hcColors = this.highContrastColors;
    const textColor = isHighContrast && hcColors ? hcColors.foreground : labelColor;
    const midPoint = chartWidth / 2;
    const labelOffset = 6;

    nodeGroups.append('text')
      .attr('x', d => {
        const isLeftSide = (d.x0 ?? 0) < midPoint;
        return isLeftSide ? (d.x1 ?? 0) + labelOffset : (d.x0 ?? 0) - labelOffset;
      })
      .attr('y', d => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 ?? 0) < midPoint ? 'start' : 'end')
      .attr('font-family', labelFontFamily)
      .attr('font-size', labelFontSize)
      .attr('fill', textColor)
      .text(d => d.name);
  }

  private renderDataLabels(
    nodeGroups: Selection<SVGGElement, ComputedNode, SVGGElement, unknown>,
    chartWidth: number
  ): void {
    const { dataLabelFontSize, dataLabelColor, dataLabelFontFamily } = this.settings;
    const isHighContrast = this.isHighContrastMode;
    const hcColors = this.highContrastColors;
    const textColor = isHighContrast && hcColors ? hcColors.foreground : dataLabelColor;
    const midPoint = chartWidth / 2;
    const labelOffset = 6;
    const showLabels = this.settings.showLabels;
    // If name labels are also shown, offset the data label below
    const dyValue = showLabels ? '1.5em' : '0.35em';

    nodeGroups.append('text')
      .attr('x', d => {
        const isLeftSide = (d.x0 ?? 0) < midPoint;
        return isLeftSide ? (d.x1 ?? 0) + labelOffset : (d.x0 ?? 0) - labelOffset;
      })
      .attr('y', d => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', dyValue)
      .attr('text-anchor', d => (d.x0 ?? 0) < midPoint ? 'start' : 'end')
      .attr('font-family', dataLabelFontFamily)
      .attr('font-size', dataLabelFontSize)
      .attr('fill', textColor)
      .text(d => (d.value ?? 0).toLocaleString());
  }

  /**
   * Show landing page when no data is available
   */
  private showLandingPage(viewport: IViewport): void {
    const isHighContrast = this.isHighContrastMode;
    const hcColors = this.highContrastColors;
    const textColor = isHighContrast && hcColors ? hcColors.foreground : '#333';
    const subtextColor = isHighContrast && hcColors ? hcColors.foreground : '#666';
    const iconColor = isHighContrast && hcColors ? hcColors.foreground : '#0078d4';

    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;

    const landingGroup = this.svg.append('g')
      .attr('class', 'landing-page')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Sankey diagram icon (simplified flow diagram)
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

    // Title
    landingGroup.append('text')
      .attr('y', 10)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Segoe UI, sans-serif')
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .attr('fill', textColor)
      .text('Sankey Chart');

    // Instructions
    const instructions = [
      'To get started, add data fields:',
      '',
      'Source \u2013 Origin node name',
      'Target \u2013 Destination node name',
      'Value \u2013 Flow quantity (optional)',
    ];

    const instructionGroup = landingGroup.append('g')
      .attr('transform', 'translate(0, 35)');

    instructions.forEach((text, i) => {
      instructionGroup.append('text')
        .attr('y', i * 18)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Segoe UI, sans-serif')
        .attr('font-size', i === 0 ? '13px' : '12px')
        .attr('font-weight', i === 0 ? '500' : '400')
        .attr('fill', i === 0 ? textColor : subtextColor)
        .text(text);
    });
  }
}

export { Visual as SankeyVisual };
