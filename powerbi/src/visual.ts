/**
 * Power BI Visual Entry Point
 *
 * Standalone entry point referenced by pbiviz at build time.
 * Bundles all required dependencies.
 */

import powerbi from 'powerbi-visuals-api';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { select, Selection } from 'd3';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;
import IViewport = powerbi.IViewport;

// Types

interface SankeyNodeDatum {
  id: string;
  name: string;
  color?: string;
}

interface SankeyLinkDatum {
  source: string;
  target: string;
  value: number;
}

interface SankeyData {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
}

type ComputedNode = SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
type ComputedLink = SankeyLink<SankeyNodeDatum, SankeyLinkDatum>;

// Settings

interface VisualSettings {
  nodeWidth: number;
  nodePadding: number;
  linkOpacity: number;
  labelFontSize: number;
  showLabels: boolean;
}

const DEFAULT_SETTINGS: VisualSettings = {
  nodeWidth: 24,
  nodePadding: 16,
  linkOpacity: 0.5,
  labelFontSize: 12,
  showLabels: true,
};

function parseSettings(dataView: DataView): VisualSettings {
  const objects = dataView?.metadata?.objects;
  if (!objects) {
    return { ...DEFAULT_SETTINGS };
  }

  const nodeSettings = objects.nodeSettings;
  const linkSettings = objects.linkSettings;
  const labelSettings = objects.labelSettings;

  return {
    nodeWidth: (nodeSettings?.width as number) ?? DEFAULT_SETTINGS.nodeWidth,
    nodePadding: (nodeSettings?.padding as number) ?? DEFAULT_SETTINGS.nodePadding,
    linkOpacity: ((linkSettings?.opacity as number) ?? 50) / 100,
    labelFontSize: (labelSettings?.fontSize as number) ?? DEFAULT_SETTINGS.labelFontSize,
    showLabels: (labelSettings?.show as boolean) ?? DEFAULT_SETTINGS.showLabels,
  };
}

// Data Transformer

function transformDataView(dataView: DataView | undefined): SankeyData | null {
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

  const nodeSet = new Set<string>();
  const linkMap = new Map<string, SankeyLinkDatum>();

  for (let i = 0; i < sourceColumn.values.length; i++) {
    const source = String(sourceColumn.values[i] ?? '');
    const target = String(targetColumn.values[i] ?? '');
    const value = valueColumn ? (valueColumn.values[i] as number) ?? 0 : 1;

    if (!source || !target || value <= 0) {
      continue;
    }

    nodeSet.add(source);
    nodeSet.add(target);

    const key = `${source}||${target}`;
    const existing = linkMap.get(key);
    if (existing) {
      existing.value += value;
    } else {
      linkMap.set(key, { source, target, value });
    }
  }

  const colorScale = scaleOrdinal<string>(schemeCategory10);
  const nodes: SankeyNodeDatum[] = Array.from(nodeSet).map(id => ({
    id,
    name: id,
    color: colorScale(id),
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
  private settings: VisualSettings = { ...DEFAULT_SETTINGS };

  constructor(options?: VisualConstructorOptions) {
    if (!options) {
      throw new Error('VisualConstructorOptions is required');
    }

    this.target = options.element;
    this.host = options.host;
    this.svg = select(this.target)
      .append('svg')
      .classed('sankey-visual', true);
  }

  public update(options: VisualUpdateOptions): void {
    const { viewport, dataViews } = options;
    const dataView = dataViews?.[0];

    if (dataView) {
      this.settings = parseSettings(dataView);
    }

    this.svg
      .attr('width', viewport.width)
      .attr('height', viewport.height);

    this.svg.selectAll('*').remove();

    const data = transformDataView(dataView);
    if (!data || data.nodes.length === 0) {
      this.showNoDataMessage(viewport);
      return;
    }

    this.renderSankey(data, viewport);
  }

  private renderSankey(data: SankeyData, viewport: IViewport): void {
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const width = viewport.width - margin.left - margin.right;
    const height = viewport.height - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) {
      return;
    }

    const sankeyGenerator = sankey<SankeyNodeDatum, SankeyLinkDatum>()
      .nodeId(d => d.id)
      .nodeWidth(this.settings.nodeWidth)
      .nodePadding(this.settings.nodePadding)
      .extent([[0, 0], [width, height]]);

    const graph = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d })),
    });

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
    const { linkOpacity } = this.settings;

    container.append('g')
      .classed('links', true)
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', linkPath)
      .attr('fill', 'none')
      .attr('stroke', d => (d.source as ComputedNode).color ?? '#aaa')
      .attr('stroke-width', d => Math.max(1, d.width ?? 1))
      .attr('stroke-opacity', linkOpacity)
      .style('cursor', 'pointer')
      .on('mouseover', function () {
        select(this).attr('stroke-opacity', 0.8);
      })
      .on('mouseout', function () {
        select(this).attr('stroke-opacity', linkOpacity);
      });
  }

  private renderNodes(
    container: Selection<SVGGElement, unknown, null, undefined>,
    nodes: ComputedNode[],
    chartWidth: number
  ): void {
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
      .attr('fill', d => d.color ?? '#1f77b4')
      .on('mouseover', function () {
        select(this).attr('stroke', '#000').attr('stroke-width', 2);
      })
      .on('mouseout', function () {
        select(this).attr('stroke', 'none');
      });

    if (this.settings.showLabels) {
      this.renderLabels(nodeGroups, chartWidth);
    }
  }

  private renderLabels(
    nodeGroups: Selection<SVGGElement, ComputedNode, SVGGElement, unknown>,
    chartWidth: number
  ): void {
    const { labelFontSize } = this.settings;

    nodeGroups.append('text')
      .attr('x', d => {
        const x0 = d.x0 ?? 0;
        const x1 = d.x1 ?? 0;
        return x0 < chartWidth / 2 ? x1 + 6 : x0 - 6;
      })
      .attr('y', d => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 ?? 0) < chartWidth / 2 ? 'start' : 'end')
      .attr('font-family', 'Segoe UI, sans-serif')
      .attr('font-size', labelFontSize)
      .attr('fill', '#333')
      .text(d => d.name);
  }

  private showNoDataMessage(viewport: IViewport): void {
    this.svg
      .append('text')
      .attr('x', viewport.width / 2)
      .attr('y', viewport.height / 2)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Segoe UI, sans-serif')
      .attr('font-size', '14px')
      .attr('fill', '#666')
      .text('Add data to Source, Target, and Value fields');
  }
}

export { Visual as SankeyVisual };
