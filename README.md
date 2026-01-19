# @sankey-chart/react

A high-performance, fully customizable Sankey diagram component for React and Next.js applications.

[![npm version](https://img.shields.io/npm/v/@sankey-chart/react.svg)](https://www.npmjs.com/package/@sankey-chart/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- **TypeScript First** - Full type definitions for all components and utilities
- **Tree-Shakable** - Import only what you need for optimal bundle size
- **SSR Compatible** - Works with Next.js App Router and server-side rendering
- **Customizable** - Extensive styling and layout options
- **Interactive** - Built-in hover effects, click handlers, and tooltips
- **Performant** - Optimized with React memo and efficient D3 calculations

## Installation

```bash
npm install @sankey-chart/react
# or
yarn add @sankey-chart/react
# or
pnpm add @sankey-chart/react
```

## Quick Start

```tsx
'use client'; // Required for Next.js App Router

import { SankeyChart } from '@sankey-chart/react';

const data = {
  nodes: [
    { id: 'a', name: 'Source A' },
    { id: 'b', name: 'Source B' },
    { id: 'c', name: 'Target C' },
  ],
  links: [
    { source: 'a', target: 'c', value: 50 },
    { source: 'b', target: 'c', value: 30 },
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
}
```

## API Reference

### SankeyChart Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `SankeyData` | Required | Input data with nodes and links |
| `width` | `number` | Required | Chart width in pixels |
| `height` | `number` | Required | Chart height in pixels |
| `layout` | `SankeyLayoutOptions` | `{}` | Layout configuration |
| `style` | `SankeyStyleOptions` | `{}` | Style configuration |
| `events` | `SankeyEventHandlers` | `{}` | Event handlers |
| `showLabels` | `boolean` | `true` | Show node labels |
| `showTooltips` | `boolean` | `true` | Show tooltips on hover |

### Layout Options

```tsx
<SankeyChart
  data={data}
  width={800}
  height={600}
  layout={{
    nodeWidth: 20,       // Width of node rectangles
    nodePadding: 10,     // Vertical spacing between nodes
    nodeAlign: 'justify', // 'left' | 'right' | 'center' | 'justify'
    iterations: 6,       // Layout relaxation iterations
    margin: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    },
  }}
/>
```

### Style Options

```tsx
<SankeyChart
  data={data}
  width={800}
  height={600}
  style={{
    node: {
      borderRadius: 4,
      opacity: 0.9,
      stroke: '#000',
      strokeWidth: 1,
    },
    link: {
      gradient: true,
      opacity: 0.5,
      hoverOpacity: 0.8,
    },
    label: {
      fontSize: 12,
      fontWeight: 500,
    },
  }}
/>
```

### Event Handlers

```tsx
<SankeyChart
  data={data}
  width={800}
  height={600}
  events={{
    onNodeClick: (node, event) => console.log('Node clicked:', node),
    onNodeMouseEnter: (node, event) => console.log('Mouse enter:', node),
    onNodeMouseLeave: (node, event) => console.log('Mouse leave:', node),
    onLinkClick: (link, event) => console.log('Link clicked:', link),
    onLinkMouseEnter: (link, event) => console.log('Mouse enter:', link),
    onLinkMouseLeave: (link, event) => console.log('Mouse leave:', link),
  }}
/>
```

## Exports

### Components

```tsx
import {
  SankeyChart,    // Main component
  SankeyNode,     // Individual node component
  SankeyLink,     // Individual link component
  SankeyTooltip,  // Tooltip component
} from '@sankey-chart/react';
```

### Hooks

```tsx
import {
  useSankeyLayout,   // Compute layout from data
  useSankeyDrag,     // Handle node dragging
  useSankeyTooltip,  // Manage tooltip state
} from '@sankey-chart/react';
```

### Utilities

```tsx
import {
  generateColorScale,
  interpolateColor,
  getContrastColor,
  defaultColorPalette,
  sankeyLayout,
  getNodesAtDepth,
  getMaxDepth,
} from '@sankey-chart/react';
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build library
npm run build:lib

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## License

MIT
