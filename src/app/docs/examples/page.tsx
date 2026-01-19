'use client';

import Link from 'next/link';
import { SankeyChart } from '@/lib';

// Example data
const basicData = {
  nodes: [
    { id: 'a', name: 'Source A' },
    { id: 'b', name: 'Source B' },
    { id: 'c', name: 'Target C' },
    { id: 'd', name: 'Target D' },
  ],
  links: [
    { source: 'a', target: 'c', value: 50 },
    { source: 'a', target: 'd', value: 30 },
    { source: 'b', target: 'c', value: 40 },
    { source: 'b', target: 'd', value: 20 },
  ],
};

const customColorData = {
  nodes: [
    { id: 'income', name: 'Income', color: '#10b981' },
    { id: 'expenses', name: 'Expenses', color: '#f43f5e' },
    { id: 'savings', name: 'Savings', color: '#0ea5e9' },
    { id: 'rent', name: 'Rent', color: '#f97316' },
    { id: 'food', name: 'Food', color: '#8b5cf6' },
  ],
  links: [
    { source: 'income', target: 'expenses', value: 3000 },
    { source: 'income', target: 'savings', value: 2000 },
    { source: 'expenses', target: 'rent', value: 1500 },
    { source: 'expenses', target: 'food', value: 1500 },
  ],
};

export default function ExamplesPage() {
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
          <span className="font-medium">Examples</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <main className="space-y-16">
          <div>
            <h1 className="text-3xl font-bold">Examples</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Explore different ways to use the Sankey Chart component.
            </p>
          </div>

          {/* Basic Example */}
          <section>
            <h2 className="text-2xl font-bold">Basic Example</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              A simple Sankey diagram with default styling.
            </p>
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-slate-900">
              <SankeyChart
                data={basicData}
                width={600}
                height={300}
                showLabels
                showTooltips
              />
            </div>
            <div className="mt-4 rounded-lg bg-gray-900 p-4">
              <pre className="overflow-x-auto text-sm text-gray-100"><code>{`<SankeyChart
  data={data}
  width={600}
  height={300}
  showLabels
  showTooltips
/>`}</code></pre>
            </div>
          </section>

          {/* Custom Colors */}
          <section id="customization">
            <h2 className="text-2xl font-bold">Custom Colors</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Nodes can have custom colors defined in the data.
            </p>
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-slate-900">
              <SankeyChart
                data={customColorData}
                width={600}
                height={300}
                showLabels
                showTooltips
                style={{
                  link: {
                    gradient: true,
                    opacity: 0.6,
                  },
                }}
              />
            </div>
            <div className="mt-4 rounded-lg bg-gray-900 p-4">
              <pre className="overflow-x-auto text-sm text-gray-100"><code>{`const data = {
  nodes: [
    { id: 'income', name: 'Income', color: '#10b981' },
    { id: 'expenses', name: 'Expenses', color: '#f43f5e' },
    // ...
  ],
  links: [
    { source: 'income', target: 'expenses', value: 3000 },
    // ...
  ],
};

<SankeyChart
  data={data}
  width={600}
  height={300}
  style={{
    link: {
      gradient: true,
      opacity: 0.6,
    },
  }}
/>`}</code></pre>
            </div>
          </section>

          {/* Styled Nodes */}
          <section>
            <h2 className="text-2xl font-bold">Styled Nodes</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Customize node appearance with rounded corners and borders.
            </p>
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-slate-900">
              <SankeyChart
                data={basicData}
                width={600}
                height={300}
                showLabels
                showTooltips
                layout={{
                  nodeWidth: 30,
                  nodePadding: 25,
                }}
                style={{
                  node: {
                    borderRadius: 8,
                    stroke: '#374151',
                    strokeWidth: 1,
                  },
                  link: {
                    opacity: 0.3,
                    hoverOpacity: 0.6,
                  },
                  label: {
                    fontSize: 14,
                    fontWeight: 600,
                  },
                }}
              />
            </div>
            <div className="mt-4 rounded-lg bg-gray-900 p-4">
              <pre className="overflow-x-auto text-sm text-gray-100"><code>{`<SankeyChart
  data={data}
  width={600}
  height={300}
  layout={{
    nodeWidth: 30,
    nodePadding: 25,
  }}
  style={{
    node: {
      borderRadius: 8,
      stroke: '#374151',
      strokeWidth: 1,
    },
    link: {
      opacity: 0.3,
      hoverOpacity: 0.6,
    },
    label: {
      fontSize: 14,
      fontWeight: 600,
    },
  }}
/>`}</code></pre>
            </div>
          </section>

          {/* Event Handling */}
          <section>
            <h2 className="text-2xl font-bold">Event Handling</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Respond to user interactions with event handlers.
            </p>
            <div className="mt-4 rounded-lg bg-gray-900 p-4">
              <pre className="overflow-x-auto text-sm text-gray-100"><code>{`<SankeyChart
  data={data}
  width={600}
  height={300}
  events={{
    onNodeClick: (node, event) => {
      console.log('Node clicked:', node.name);
    },
    onNodeMouseEnter: (node, event) => {
      console.log('Mouse entered node:', node.name);
    },
    onLinkClick: (link, event) => {
      console.log('Link clicked:', link.source.name, '->', link.target.name);
    },
  }}
/>`}</code></pre>
            </div>
          </section>

          {/* Custom Tooltip */}
          <section>
            <h2 className="text-2xl font-bold">Custom Tooltip</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Provide your own tooltip renderer for full control over the tooltip content.
            </p>
            <div className="mt-4 rounded-lg bg-gray-900 p-4">
              <pre className="overflow-x-auto text-sm text-gray-100"><code>{`<SankeyChart
  data={data}
  width={600}
  height={300}
  showTooltips
  renderTooltip={(data, type) => {
    if (type === 'node') {
      const node = data as ComputedNode;
      return (
        <div className="custom-tooltip">
          <strong>{node.name}</strong>
          <p>Value: {node.value.toLocaleString()}</p>
          <p>Layer: {node.depth}</p>
        </div>
      );
    }
    const link = data as ComputedLink;
    return (
      <div className="custom-tooltip">
        <p>{link.source.name} to {link.target.name}</p>
        <p>Flow: {link.value.toLocaleString()}</p>
      </div>
    );
  }}
/>`}</code></pre>
            </div>
          </section>

          {/* Using Hooks */}
          <section>
            <h2 className="text-2xl font-bold">Using Hooks</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Build custom Sankey visualizations using the provided hooks.
            </p>
            <div className="mt-4 rounded-lg bg-gray-900 p-4">
              <pre className="overflow-x-auto text-sm text-gray-100"><code>{`import { useSankeyLayout, SankeyNode, SankeyLink } from '@sankey-chart/react';

function CustomSankey({ data, width, height }) {
  const { nodes, links, isValid } = useSankeyLayout(data, {
    width,
    height,
    nodePadding: 20,
  });

  if (!isValid) return <div>Invalid data</div>;

  return (
    <svg width={width} height={height}>
      <g className="links">
        {links.map((link, i) => (
          <SankeyLink key={i} link={link} />
        ))}
      </g>
      <g className="nodes">
        {nodes.map((node) => (
          <SankeyNode key={node.id} node={node} />
        ))}
      </g>
    </svg>
  );
}`}</code></pre>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
