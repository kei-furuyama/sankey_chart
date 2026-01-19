import Link from 'next/link';

export const metadata = {
  title: 'API Reference',
  description: 'Complete API documentation for Sankey Chart components, hooks, and utilities.',
};

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sankey-500 to-sankey-700" />
            <span className="text-xl font-bold">Sankey Chart</span>
          </Link>
          <span className="mx-4 text-gray-400">/</span>
          <Link href="/docs" className="text-gray-600 hover:text-gray-900 dark:text-gray-400">Documentation</Link>
          <span className="mx-4 text-gray-400">/</span>
          <span className="font-medium">API Reference</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <main className="prose prose-gray max-w-none dark:prose-invert">
          <h1>API Reference</h1>
          <p className="lead">
            Complete documentation for all components, hooks, and utilities in the Sankey Chart library.
          </p>

          <nav className="not-prose my-8 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-slate-900">
            <h4 className="mb-2 font-semibold">On this page</h4>
            <ul className="space-y-1 text-sm">
              <li><a href="#sankeychart" className="text-sankey-600 hover:underline">SankeyChart</a></li>
              <li><a href="#hooks" className="text-sankey-600 hover:underline">Hooks</a></li>
              <li><a href="#utilities" className="text-sankey-600 hover:underline">Utilities</a></li>
              <li><a href="#types" className="text-sankey-600 hover:underline">Types</a></li>
            </ul>
          </nav>

          <h2 id="sankeychart">SankeyChart</h2>
          <p>The main component for rendering Sankey diagrams.</p>

          <h3>Props</h3>
          <div className="not-prose overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4 text-left font-semibold">Prop</th>
                  <th className="py-2 pr-4 text-left font-semibold">Type</th>
                  <th className="py-2 pr-4 text-left font-semibold">Default</th>
                  <th className="py-2 text-left font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="py-2 pr-4"><code>data</code></td>
                  <td className="py-2 pr-4"><code>SankeyData</code></td>
                  <td className="py-2 pr-4">Required</td>
                  <td className="py-2">Input data with nodes and links</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>width</code></td>
                  <td className="py-2 pr-4"><code>number</code></td>
                  <td className="py-2 pr-4">Required</td>
                  <td className="py-2">Chart width in pixels</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>height</code></td>
                  <td className="py-2 pr-4"><code>number</code></td>
                  <td className="py-2 pr-4">Required</td>
                  <td className="py-2">Chart height in pixels</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>layout</code></td>
                  <td className="py-2 pr-4"><code>SankeyLayoutOptions</code></td>
                  <td className="py-2 pr-4">{'{}'}</td>
                  <td className="py-2">Layout configuration</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>style</code></td>
                  <td className="py-2 pr-4"><code>SankeyStyleOptions</code></td>
                  <td className="py-2 pr-4">{'{}'}</td>
                  <td className="py-2">Style configuration</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>events</code></td>
                  <td className="py-2 pr-4"><code>SankeyEventHandlers</code></td>
                  <td className="py-2 pr-4">{'{}'}</td>
                  <td className="py-2">Event handlers</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>showLabels</code></td>
                  <td className="py-2 pr-4"><code>boolean</code></td>
                  <td className="py-2 pr-4"><code>true</code></td>
                  <td className="py-2">Show node labels</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>showTooltips</code></td>
                  <td className="py-2 pr-4"><code>boolean</code></td>
                  <td className="py-2 pr-4"><code>true</code></td>
                  <td className="py-2">Show tooltips on hover</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>renderTooltip</code></td>
                  <td className="py-2 pr-4"><code>function</code></td>
                  <td className="py-2 pr-4">-</td>
                  <td className="py-2">Custom tooltip renderer</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>className</code></td>
                  <td className="py-2 pr-4"><code>string</code></td>
                  <td className="py-2 pr-4"><code>&apos;&apos;</code></td>
                  <td className="py-2">CSS class name</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>ariaLabel</code></td>
                  <td className="py-2 pr-4"><code>string</code></td>
                  <td className="py-2 pr-4"><code>&apos;Sankey diagram&apos;</code></td>
                  <td className="py-2">Accessibility label</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Layout Options</h3>
          <div className="not-prose overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4 text-left font-semibold">Option</th>
                  <th className="py-2 pr-4 text-left font-semibold">Type</th>
                  <th className="py-2 pr-4 text-left font-semibold">Default</th>
                  <th className="py-2 text-left font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="py-2 pr-4"><code>nodeWidth</code></td>
                  <td className="py-2 pr-4"><code>number</code></td>
                  <td className="py-2 pr-4"><code>24</code></td>
                  <td className="py-2">Width of node rectangles</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>nodePadding</code></td>
                  <td className="py-2 pr-4"><code>number</code></td>
                  <td className="py-2 pr-4"><code>10</code></td>
                  <td className="py-2">Vertical spacing between nodes</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>nodeAlign</code></td>
                  <td className="py-2 pr-4"><code>&apos;left&apos; | &apos;right&apos; | &apos;center&apos; | &apos;justify&apos;</code></td>
                  <td className="py-2 pr-4"><code>&apos;justify&apos;</code></td>
                  <td className="py-2">Node alignment strategy</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>iterations</code></td>
                  <td className="py-2 pr-4"><code>number</code></td>
                  <td className="py-2 pr-4"><code>6</code></td>
                  <td className="py-2">Layout relaxation iterations</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code>margin</code></td>
                  <td className="py-2 pr-4"><code>{'{ top, right, bottom, left }'}</code></td>
                  <td className="py-2 pr-4"><code>10</code> each</td>
                  <td className="py-2">Chart margins</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 id="hooks">Hooks</h2>

          <h3>useSankeyLayout</h3>
          <p>Compute Sankey layout from data.</p>
          <div className="not-prose">
            <div className="rounded-lg bg-gray-900 p-4">
              <pre className="text-sm text-gray-100"><code>{`import { useSankeyLayout } from '@sankey-chart/react';

const { nodes, links, colorScale, isValid } = useSankeyLayout(data, {
  width: 800,
  height: 600,
  nodePadding: 10,
});`}</code></pre>
            </div>
          </div>

          <h3>useSankeyDrag</h3>
          <p>Handle node dragging interactions.</p>
          <div className="not-prose">
            <div className="rounded-lg bg-gray-900 p-4">
              <pre className="text-sm text-gray-100"><code>{`import { useSankeyDrag } from '@sankey-chart/react';

const {
  dragState,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  getNodeY,
} = useSankeyDrag({
  enabled: true,
  constrainToVertical: true,
  onDragEnd: (node, newY) => {
    // Update node position
  },
});`}</code></pre>
            </div>
          </div>

          <h3>useSankeyTooltip</h3>
          <p>Manage tooltip state and positioning.</p>
          <div className="not-prose">
            <div className="rounded-lg bg-gray-900 p-4">
              <pre className="text-sm text-gray-100"><code>{`import { useSankeyTooltip } from '@sankey-chart/react';

const {
  tooltip,
  isVisible,
  showNodeTooltip,
  showLinkTooltip,
  hideTooltip,
} = useSankeyTooltip({
  showDelay: 100,
  hideDelay: 50,
});`}</code></pre>
            </div>
          </div>

          <h2 id="utilities">Utilities</h2>

          <h3>Color Utilities</h3>
          <div className="not-prose">
            <div className="rounded-lg bg-gray-900 p-4">
              <pre className="text-sm text-gray-100"><code>{`import {
  generateColorScale,
  interpolateColor,
  getContrastColor,
  defaultColorPalette,
} from '@sankey-chart/react';

// Create a color scale
const scale = generateColorScale(['A', 'B', 'C']);

// Get color for a category
const color = scale('A'); // '#0ea5e9'

// Get contrasting text color
const textColor = getContrastColor('#0ea5e9'); // '#ffffff'`}</code></pre>
            </div>
          </div>

          <h3>Layout Utilities</h3>
          <div className="not-prose">
            <div className="rounded-lg bg-gray-900 p-4">
              <pre className="text-sm text-gray-100"><code>{`import {
  sankeyLayout,
  getNodesAtDepth,
  getMaxDepth,
  getConnectedNodes,
} from '@sankey-chart/react';

// Compute layout manually
const { nodes, links } = sankeyLayout(data, { width: 800, height: 600 });

// Get nodes at specific layer
const layer0Nodes = getNodesAtDepth(nodes, 0);

// Get connected nodes
const { sources, targets } = getConnectedNodes(node);`}</code></pre>
            </div>
          </div>

          <h2 id="types">Types</h2>
          <p>All types are exported from the main package:</p>
          <div className="not-prose">
            <div className="rounded-lg bg-gray-900 p-4">
              <pre className="text-sm text-gray-100"><code>{`import type {
  // Data types
  SankeyNode,
  SankeyLink,
  SankeyData,

  // Computed types
  ComputedNode,
  ComputedLink,

  // Options types
  SankeyLayoutOptions,
  SankeyStyleOptions,
  SankeyEventHandlers,

  // Component props
  SankeyChartProps,
  SankeyNodeProps,
  SankeyLinkProps,

  // Other
  TooltipData,
  ColorScale,
} from '@sankey-chart/react';`}</code></pre>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
