/**
 * Power BI Visual Entry Point
 *
 * Standalone entry point referenced by pbiviz at build time.
 * Bundles all required dependencies.
 */

import powerbi from 'powerbi-visuals-api';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { select, Selection, pointer } from 'd3';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

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
}

interface TransformDataViewOptions {
  dataView: DataView | undefined;
  host: IVisualHost;
}

type ComputedNode = SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
type ComputedLink = SankeyLink<SankeyNodeDatum, SankeyLinkDatum>;

// Settings

type LinkSortMode = 'ascending' | 'descending' | 'byValue' | 'byValueDesc' | 'none';

interface VisualSettings {
  nodeWidth: number;
  nodePadding: number;
  nodeDefaultColor: string;
  linkOpacity: number;
  linkColorMode: string;
  linkSort: LinkSortMode;
  showLinkLabels: boolean;
  linkLabelFontSize: number;
  labelFontSize: number;
  labelColor: string;
  showLabels: boolean;
}

const DEFAULT_SETTINGS: VisualSettings = {
  nodeWidth: 24,
  nodePadding: 16,
  nodeDefaultColor: '#1f77b4',
  linkOpacity: 0.5,
  linkColorMode: 'source',
  linkSort: 'ascending',
  showLinkLabels: false,
  linkLabelFontSize: 10,
  labelFontSize: 12,
  labelColor: '#333333',
  showLabels: true,
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

  defaultColor = new formattingSettings.ColorPicker({
    name: 'defaultColor',
    displayName: 'Default Color',
    value: { value: DEFAULT_SETTINGS.nodeDefaultColor },
  });

  name: string = 'nodeSettings';
  displayName: string = 'Nodes';
  slices: formattingSettings.Slice[] = [this.width, this.padding, this.defaultColor];
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

  name: string = 'labelSettings';
  displayName: string = 'Node Labels';
  topLevelSlice: formattingSettings.ToggleSwitch = this.show;
  slices: formattingSettings.Slice[] = [this.fontSize, this.color];
}

class VisualFormattingSettingsModel extends formattingSettings.Model {
  nodeSettingsCard = new NodeSettingsCard();
  linkSettingsCard = new LinkSettingsCard();
  linkLabelSettingsCard = new LinkLabelSettingsCard();
  labelSettingsCard = new LabelSettingsCard();

  cards: formattingSettings.SimpleCard[] = [
    this.nodeSettingsCard,
    this.linkSettingsCard,
    this.linkLabelSettingsCard,
    this.labelSettingsCard,
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

function parseSettings(dataView: DataView): VisualSettings {
  const objects = dataView?.metadata?.objects;
  console.log('[parseSettings] objects:', JSON.stringify(objects, null, 2));

  if (!objects) {
    console.log('[parseSettings] No objects, using defaults');
    return { ...DEFAULT_SETTINGS };
  }

  const { nodeSettings, linkSettings, linkLabelSettings, labelSettings } = objects;
  console.log('[parseSettings] linkSettings:', JSON.stringify(linkSettings, null, 2));
  const opacityPercent = (linkSettings?.opacity as number) ?? 50;

  // Extract color from fill object if present
  const nodeColor = (nodeSettings?.defaultColor as { solid?: { color?: string } })?.solid?.color;
  const labelColor = (labelSettings?.color as { solid?: { color?: string } })?.solid?.color;

  // Parse linkSort mode - ItemDropdown values can be objects
  console.log('[parseSettings] sortMode raw:', linkSettings?.sortMode);
  const linkSortValue = extractDropdownValue(linkSettings?.sortMode, DEFAULT_SETTINGS.linkSort);
  console.log('[parseSettings] linkSortValue after extract:', linkSortValue);
  const validLinkSortModes: LinkSortMode[] = ['ascending', 'descending', 'byValue', 'byValueDesc', 'none'];
  const linkSort: LinkSortMode = validLinkSortModes.includes(linkSortValue as LinkSortMode)
    ? (linkSortValue as LinkSortMode)
    : DEFAULT_SETTINGS.linkSort;
  console.log('[parseSettings] final linkSort:', linkSort);

  return {
    nodeWidth: (nodeSettings?.width as number) ?? DEFAULT_SETTINGS.nodeWidth,
    nodePadding: (nodeSettings?.padding as number) ?? DEFAULT_SETTINGS.nodePadding,
    nodeDefaultColor: nodeColor ?? DEFAULT_SETTINGS.nodeDefaultColor,
    linkOpacity: opacityPercent / 100,
    linkColorMode: extractDropdownValue(linkSettings?.colorMode, DEFAULT_SETTINGS.linkColorMode),
    linkSort,
    // Link Labels settings now come from linkLabelSettings object
    showLinkLabels: (linkLabelSettings?.show as boolean) ?? DEFAULT_SETTINGS.showLinkLabels,
    linkLabelFontSize: (linkLabelSettings?.fontSize as number) ?? DEFAULT_SETTINGS.linkLabelFontSize,
    labelFontSize: (labelSettings?.fontSize as number) ?? DEFAULT_SETTINGS.labelFontSize,
    labelColor: labelColor ?? DEFAULT_SETTINGS.labelColor,
    showLabels: (labelSettings?.show as boolean) ?? DEFAULT_SETTINGS.showLabels,
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

  const colorScale = scaleOrdinal<string>(schemeCategory10);

  // Create nodes with first selection ID (for cross-filtering by node)
  const nodes: SankeyNodeDatum[] = Array.from(nodeMap.entries()).map(([id, data]) => ({
    id,
    name: id,
    color: colorScale(id),
    selectionId: data.selectionIds[0], // Use first selectionId for the node
  }));

  return {
    nodes,
    links: Array.from(linkMap.values()),
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
    return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
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

        // Read ItemDropdown values directly from formattingSettings (more reliable)
        const sortModeValue = this.formattingSettings.linkSettingsCard.sortMode.value;
        const colorModeValue = this.formattingSettings.linkSettingsCard.colorMode.value;
        console.log('[update] formattingSettings sortMode.value:', sortModeValue);
        console.log('[update] formattingSettings colorMode.value:', colorModeValue);

        // Override parseSettings values with formattingSettings values
        if (sortModeValue && typeof sortModeValue === 'object' && 'value' in sortModeValue) {
          const sortMode = (sortModeValue as { value: string }).value as LinkSortMode;
          if (['ascending', 'descending', 'byValue', 'byValueDesc', 'none'].includes(sortMode)) {
            this.settings.linkSort = sortMode;
            console.log('[update] Overriding linkSort from formattingSettings:', sortMode);
          }
        }
        if (colorModeValue && typeof colorModeValue === 'object' && 'value' in colorModeValue) {
          this.settings.linkColorMode = (colorModeValue as { value: string }).value;
          console.log('[update] Overriding linkColorMode from formattingSettings:', this.settings.linkColorMode);
        }
      }

      this.svg
        .attr('width', viewport.width)
        .attr('height', viewport.height);

      this.svg.selectAll('*').remove();

      const data = transformDataView({ dataView, host: this.host });
      if (!data || data.nodes.length === 0) {
        this.currentNodes = [];
        this.focusedNodeIndex = -1;
        this.showLandingPage(viewport);
        this.eventService.renderingFinished(options);
        return;
      }

      this.renderSankey(data, viewport);

      // Signal rendering finished
      this.eventService.renderingFinished(options);
    } catch (error) {
      // Signal rendering failed
      this.eventService.renderingFailed(options, String(error));
    }
  }

  private renderSankey(data: SankeyData, viewport: IViewport): void {
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
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
      .extent([[0, 0], [width, height]]);

    // Apply link sort function
    // getLinkSortFunction returns:
    // - undefined: use d3-sankey's internal crossing-minimization (don't call linkSort at all)
    // - null: disable all sorting (explicit null)
    // - function: use custom comparator
    console.log('[renderSankey] this.settings.linkSort:', this.settings.linkSort);
    const linkSortFn = getLinkSortFunction(this.settings.linkSort);
    console.log('[renderSankey] linkSortFn:', linkSortFn);
    if (linkSortFn !== undefined) {
      // Only set linkSort if we have a specific value (function or null)
      // Leaving linkSort unset (undefined) lets d3-sankey use its internal algorithm
      console.log('[renderSankey] Calling sankeyGenerator.linkSort()');
      sankeyGenerator.linkSort(linkSortFn);
    } else {
      console.log('[renderSankey] NOT calling linkSort (using d3 default)');
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

    const getLinkColor = (d: ComputedLink): string => {
      if (isHighContrast && hcColors) {
        return hcColors.foreground;
      }
      switch (linkColorMode) {
        case 'target':
          return (d.target as ComputedNode).color ?? '#aaa';
        case 'fixed':
          return '#aaa';
        case 'source':
        default:
          return (d.source as ComputedNode).color ?? '#aaa';
      }
    };

    container.append('g')
      .classed('links', true)
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', linkPath)
      .attr('fill', 'none')
      .attr('stroke', getLinkColor)
      .attr('stroke-width', d => Math.max(1, d.width ?? 1))
      .attr('stroke-opacity', isHighContrast ? 0.8 : linkOpacity)
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
          { displayName: this.getLocalizedString('Visual_Tooltip_Value', 'Value'), value: String(d.value ?? 0) },
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
          { displayName: this.getLocalizedString('Visual_Tooltip_TotalValue', 'Total Value'), value: String(totalValue) },
        ];

        if (inflow > 0) {
          tooltipData.push({ displayName: this.getLocalizedString('Visual_Tooltip_Inflow', 'Inflow'), value: String(inflow) });
        }
        if (outflow > 0) {
          tooltipData.push({ displayName: this.getLocalizedString('Visual_Tooltip_Outflow', 'Outflow'), value: String(outflow) });
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
  }

  private renderLabels(
    nodeGroups: Selection<SVGGElement, ComputedNode, SVGGElement, unknown>,
    chartWidth: number
  ): void {
    const { labelFontSize, labelColor } = this.settings;
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
      .attr('font-family', 'Segoe UI, sans-serif')
      .attr('font-size', labelFontSize)
      .attr('fill', textColor)
      .text(d => d.name);
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
      .text(this.getLocalizedString('Visual_LandingPage_Title', 'Sankey Chart'));

    // Instructions (localized)
    const instructions = [
      this.getLocalizedString('Visual_LandingPage_Instruction', 'To get started, add data fields:'),
      '',
      this.getLocalizedString('Visual_LandingPage_Source', 'Source - Origin node name'),
      this.getLocalizedString('Visual_LandingPage_Target', 'Target - Destination node name'),
      this.getLocalizedString('Visual_LandingPage_Value', 'Value - Flow quantity (optional)'),
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

    // Keyboard hint (if space permits)
    if (viewport.height > 300) {
      landingGroup.append('text')
        .attr('y', 140)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Segoe UI, sans-serif')
        .attr('font-size', '11px')
        .attr('fill', subtextColor)
        .text(this.getLocalizedString('Visual_LandingPage_Tip', 'Tip: Use Tab/Arrow keys to navigate, Enter to select'));
    }
  }
}

export { Visual as SankeyVisual };
