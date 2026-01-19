import Link from 'next/link';

export const metadata = {
  title: 'Documentation',
  description: 'Learn how to use the Sankey Chart React component library.',
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sankey-500 to-sankey-700" />
              <span className="text-xl font-bold">Sankey Chart</span>
            </Link>
            <span className="text-gray-400">/</span>
            <span className="font-medium">Documentation</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
          {/* Sidebar */}
          <nav className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Getting Started</h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/docs/getting-started" className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800">
                    Installation
                  </Link>
                </li>
                <li>
                  <Link href="/docs/getting-started#quick-start" className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800">
                    Quick Start
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">API Reference</h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/docs/api" className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800">
                    SankeyChart
                  </Link>
                </li>
                <li>
                  <Link href="/docs/api#hooks" className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800">
                    Hooks
                  </Link>
                </li>
                <li>
                  <Link href="/docs/api#utilities" className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800">
                    Utilities
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Examples</h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/docs/examples" className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800">
                    Basic Example
                  </Link>
                </li>
                <li>
                  <Link href="/docs/examples#customization" className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800">
                    Customization
                  </Link>
                </li>
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="prose prose-gray max-w-none dark:prose-invert">
            <h1>Documentation</h1>
            <p className="lead">
              Learn how to integrate and customize the Sankey Chart component in your React or Next.js application.
            </p>

            <div className="not-prose mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/docs/getting-started"
                className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-slate-900"
              >
                <h3 className="text-lg font-semibold group-hover:text-sankey-500">Getting Started</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Installation, setup, and your first Sankey chart.
                </p>
              </Link>
              <Link
                href="/docs/api"
                className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-slate-900"
              >
                <h3 className="text-lg font-semibold group-hover:text-sankey-500">API Reference</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Complete API documentation for all components and hooks.
                </p>
              </Link>
              <Link
                href="/docs/examples"
                className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-slate-900"
              >
                <h3 className="text-lg font-semibold group-hover:text-sankey-500">Examples</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Real-world examples and use cases.
                </p>
              </Link>
            </div>

            <h2 className="mt-12">Overview</h2>
            <p>
              The <code>@sankey-chart/react</code> library provides a set of components and utilities
              for creating beautiful, interactive Sankey diagrams in your React applications.
            </p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>TypeScript Support</strong> - Full type definitions for all components and utilities</li>
              <li><strong>Tree-Shakable</strong> - Import only what you need for optimal bundle size</li>
              <li><strong>SSR Compatible</strong> - Works with Next.js App Router and server-side rendering</li>
              <li><strong>Customizable</strong> - Extensive styling and layout options</li>
              <li><strong>Accessible</strong> - ARIA labels and keyboard navigation support</li>
              <li><strong>Performant</strong> - Optimized with React memo and efficient D3 calculations</li>
            </ul>

            <h3>Package Structure</h3>
            <p>
              The library is organized into several import paths for better tree-shaking:
            </p>
            <pre><code>{`// Main export
import { SankeyChart } from '@sankey-chart/react';

// Components only
import { SankeyChart, SankeyNode, SankeyLink } from '@sankey-chart/react/components';

// Hooks only
import { useSankeyLayout, useSankeyDrag } from '@sankey-chart/react/hooks';

// Utilities only
import { generateColorScale, sankeyLayout } from '@sankey-chart/react/utils';`}</code></pre>
          </main>
        </div>
      </div>
    </div>
  );
}
