import Link from 'next/link';

export const metadata = {
  title: 'Getting Started',
  description: 'Learn how to install and set up the Sankey Chart component.',
};

export default function GettingStartedPage() {
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
          <span className="font-medium">Getting Started</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <main className="prose prose-gray max-w-none dark:prose-invert">
          <h1>Getting Started</h1>
          <p className="lead">
            Get up and running with Sankey Chart in your React or Next.js project in just a few minutes.
          </p>

          <h2>Installation</h2>
          <p>Install the package using your preferred package manager:</p>

          <div className="not-prose">
            <div className="rounded-lg bg-gray-900 p-4">
              <code className="text-gray-100">
                <span className="text-gray-500"># npm</span><br />
                npm install @sankey-chart/react<br /><br />
                <span className="text-gray-500"># yarn</span><br />
                yarn add @sankey-chart/react<br /><br />
                <span className="text-gray-500"># pnpm</span><br />
                pnpm add @sankey-chart/react
              </code>
            </div>
          </div>

          <h2 id="quick-start">Quick Start</h2>
          <p>Here is a minimal example to get you started:</p>

          <div className="not-prose">
            <div className="rounded-lg bg-gray-900 p-4">
              <pre className="text-sm text-gray-100"><code>{`'use client'; // Required for Next.js App Router

import { SankeyChart } from '@sankey-chart/react';

const data = {
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

export default function MyChart() {
  return (
    <SankeyChart
      data={data}
      width={800}
      height={600}
      showLabels
      showTooltips
    />
  );
}`}</code></pre>
            </div>
          </div>

          <h2>Data Format</h2>
          <p>
            The Sankey Chart component expects data in a specific format with <code>nodes</code> and <code>links</code>:
          </p>

          <h3>Nodes</h3>
          <p>Each node requires:</p>
          <ul>
            <li><code>id</code> - Unique identifier (string)</li>
            <li><code>name</code> - Display label (string)</li>
          </ul>
          <p>Optional properties:</p>
          <ul>
            <li><code>color</code> - Custom color for the node</li>
            <li><code>category</code> - Group identifier for color scaling</li>
            <li><code>data</code> - Custom data object</li>
          </ul>

          <h3>Links</h3>
          <p>Each link requires:</p>
          <ul>
            <li><code>source</code> - ID of the source node</li>
            <li><code>target</code> - ID of the target node</li>
            <li><code>value</code> - Numeric flow value</li>
          </ul>

          <h2>TypeScript</h2>
          <p>The library is written in TypeScript and includes full type definitions:</p>

          <div className="not-prose">
            <div className="rounded-lg bg-gray-900 p-4">
              <pre className="text-sm text-gray-100"><code>{`import type {
  SankeyData,
  SankeyNode,
  SankeyLink,
  SankeyChartProps,
} from '@sankey-chart/react';

const data: SankeyData = {
  nodes: [
    { id: 'a', name: 'Node A' },
    { id: 'b', name: 'Node B' },
  ],
  links: [
    { source: 'a', target: 'b', value: 100 },
  ],
};`}</code></pre>
            </div>
          </div>

          <h2>Next Steps</h2>
          <ul>
            <li><Link href="/docs/api">API Reference</Link> - Explore all available props and options</li>
            <li><Link href="/docs/examples">Examples</Link> - See real-world usage patterns</li>
            <li><Link href="/demo">Interactive Demo</Link> - Try different configurations</li>
          </ul>
        </main>
      </div>
    </div>
  );
}
