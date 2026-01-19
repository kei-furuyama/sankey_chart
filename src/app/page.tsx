'use client';

import { SankeyChart } from '@/lib';
import Link from 'next/link';

// Sample data for the hero demo
const sampleData = {
  nodes: [
    { id: 'source1', name: 'Product Sales' },
    { id: 'source2', name: 'Services' },
    { id: 'source3', name: 'Subscriptions' },
    { id: 'middle1', name: 'Revenue' },
    { id: 'middle2', name: 'Operating Costs' },
    { id: 'target1', name: 'Net Profit' },
    { id: 'target2', name: 'Reinvestment' },
    { id: 'target3', name: 'Taxes' },
  ],
  links: [
    { source: 'source1', target: 'middle1', value: 150 },
    { source: 'source2', target: 'middle1', value: 80 },
    { source: 'source3', target: 'middle1', value: 70 },
    { source: 'middle1', target: 'middle2', value: 120 },
    { source: 'middle1', target: 'target1', value: 100 },
    { source: 'middle1', target: 'target3', value: 80 },
    { source: 'middle2', target: 'target2', value: 80 },
    { source: 'middle2', target: 'target1', value: 40 },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sankey-500 to-sankey-700" />
            <span className="text-xl font-bold">Sankey Chart</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Demo
            </Link>
            <Link href="/docs" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Docs
            </Link>
            <a
              href="https://github.com/yourusername/sankey-chart"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Beautiful{' '}
              <span className="bg-gradient-to-r from-sankey-500 to-sankey-700 bg-clip-text text-transparent">
                Sankey Diagrams
              </span>
              <br />
              for React
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              A high-performance, fully customizable Sankey chart component for React and Next.js.
              Built with TypeScript, tree-shakable, and SSR-compatible.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                href="/docs/getting-started"
                className="rounded-lg bg-sankey-500 px-6 py-3 font-semibold text-white hover:bg-sankey-600"
              >
                Get Started
              </Link>
              <Link
                href="/demo"
                className="rounded-lg border border-gray-300 px-6 py-3 font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
              >
                View Demo
              </Link>
            </div>
          </div>

          {/* Demo Chart */}
          <div className="mt-16 flex justify-center">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-slate-900">
              <SankeyChart
                data={sampleData}
                width={800}
                height={400}
                showLabels
                showTooltips
                layout={{
                  nodePadding: 20,
                  nodeWidth: 20,
                }}
                style={{
                  node: {
                    borderRadius: 4,
                  },
                  link: {
                    gradient: true,
                    opacity: 0.5,
                  },
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-gray-200 bg-gray-50 px-4 py-20 dark:border-gray-800 dark:bg-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold">Features</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'TypeScript First',
                description: 'Full TypeScript support with comprehensive type definitions for all props and data structures.',
              },
              {
                title: 'Tree-Shakable',
                description: 'Import only what you need. Each component and utility can be imported separately.',
              },
              {
                title: 'SSR Compatible',
                description: 'Works seamlessly with Next.js App Router and server-side rendering.',
              },
              {
                title: 'Customizable',
                description: 'Extensive styling options for nodes, links, labels, and tooltips.',
              },
              {
                title: 'Interactive',
                description: 'Built-in hover effects, click handlers, and tooltip support.',
              },
              {
                title: 'Performant',
                description: 'Optimized rendering with React memo and efficient D3 calculations.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-slate-800"
              >
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">Quick Start</h2>
          <div className="mt-8 rounded-lg bg-gray-900 p-6 text-left">
            <code className="text-gray-100">
              <span className="text-gray-500"># Install with npm</span>
              <br />
              npm install @sankey-chart/react
              <br />
              <br />
              <span className="text-gray-500"># Or with yarn</span>
              <br />
              yarn add @sankey-chart/react
            </code>
          </div>
          <div className="mt-6 rounded-lg bg-gray-900 p-6 text-left">
            <code className="text-gray-100">
              <span className="text-purple-400">import</span> {'{'} SankeyChart {'}'}{' '}
              <span className="text-purple-400">from</span>{' '}
              <span className="text-green-400">&apos;@sankey-chart/react&apos;</span>;
              <br />
              <br />
              <span className="text-purple-400">export default function</span>{' '}
              <span className="text-yellow-400">App</span>() {'{'}
              <br />
              {'  '}
              <span className="text-purple-400">return</span> (
              <br />
              {'    '}&lt;<span className="text-blue-400">SankeyChart</span>
              <br />
              {'      '}data={'{'}data{'}'}
              <br />
              {'      '}width={'{'}800{'}'}
              <br />
              {'      '}height={'{'}600{'}'}
              <br />
              {'    '}/&gt;
              <br />
              {'  '});
              <br />
              {'}'}
            </code>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 py-8 dark:border-gray-800 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center text-gray-600 dark:text-gray-400">
          <p>
            Built with Next.js and D3.js. Open source under MIT license.
          </p>
        </div>
      </footer>
    </div>
  );
}
