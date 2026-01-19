# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A high-performance Sankey Chart visualization library with two targets:
1. **React/Next.js library** (`@sankey-chart/react`) - npm package for web applications
2. **Power BI Custom Visual** (`powerbi/`) - standalone visual for Power BI

Both share core visualization logic using D3.js with a platform-agnostic architecture.

## Common Commands

```bash
# Development (Next.js demo site)
npm run dev              # Start dev server at localhost:3000
npm run build            # Build Next.js site

# Library build
npm run build:lib        # Build npm package with tsup (outputs to dist/)
npm run build:lib:watch  # Watch mode for library development

# Testing
npm test                 # Run vitest tests
npm run test:coverage    # Run tests with coverage

# Linting & Type checking
npm run lint             # ESLint
npm run lint:fix         # ESLint with auto-fix
npm run type-check       # TypeScript check (tsc --noEmit)

# Power BI Visual
npm run pbiviz:install   # Install Power BI dependencies
npm run pbiviz:start     # Start Power BI dev server (https://localhost:8080)
npm run pbiviz:package   # Build .pbiviz file for distribution

# In powerbi/ directory
cd powerbi && npx pbiviz start    # Development server with hot reload
cd powerbi && npx pbiviz package  # Create distributable .pbiviz file
```

## Architecture

```
Application Layer
├── Next.js/React (src/app/, src/web/)
└── Power BI Visual (powerbi/, src/powerbi/)
         │
         ▼
Core Layer (Framework-Agnostic)
├── src/core/       - SankeyChart, SankeyLayout, SankeyRenderer
├── src/types/      - All TypeScript interfaces
└── src/lib/        - React components, hooks, utilities
```

**Key Design Decisions:**
- Pure D3.js for DOM manipulation (avoids React virtual DOM conflicts, enables Power BI compatibility)
- d3-sankey for layout algorithm
- Strict TypeScript throughout
- Platform adapters wrap the core engine

## Directory Structure

| Path | Purpose |
|------|---------|
| `src/core/` | Platform-agnostic Sankey engine (SankeyChart, SankeyLayout, SankeyRenderer) |
| `src/lib/components/` | React components (SankeyChart.tsx, SankeyNode.tsx, SankeyLink.tsx) |
| `src/lib/hooks/` | React hooks (useSankeyLayout, useSankeyDrag, useSankeyTooltip) |
| `src/lib/utils/` | Utilities (sankey-calculator, color-utils) |
| `src/types/index.ts` | All shared type definitions (~1200 lines) |
| `src/powerbi/` | Power BI adapter source (visual.ts, dataConverter, settings) |
| `src/app/` | Next.js demo site and documentation pages |
| `powerbi/` | Power BI build configuration (pbiviz.json, capabilities.json) |

## Key Types (src/types/index.ts)

```typescript
// Input data format
interface SankeyInputData {
  nodes?: InputNode[];
  links: InputLink[];
}

// Computed data after d3-sankey layout
type ComputedNode = SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;
type ComputedLink = SankeyLink<SankeyNodeDatum, SankeyLinkDatum>;

// Full configuration
interface SankeyChartConfig {
  width, height, margin,
  layout: SankeyLayoutConfig,
  style: SankeyStyleConfig,
  animation: SankeyAnimationConfig,
  interaction: SankeyInteractionConfig,
  performance: SankeyPerformanceConfig,
  powerbi?: PowerBIConfig
}
```

## Power BI Data Flow

```
Power BI DataView
    ↓
transformDataView() or convertDataView()  [src/powerbi/dataViewTransformer.ts]
    ↓
SankeyData { nodes[], links[] }
    ↓
parseSettings()  [src/powerbi/settings.ts]
    ↓
Visual.renderSankey()  [powerbi/src/visual.ts]
```

**Data Roles (capabilities.json):**
- `source` (Grouping) - Flow origin node
- `target` (Grouping) - Flow destination node
- `value` (Measure) - Flow quantity

## Path Aliases

Configured in tsconfig.json:
- `@/*` → `./src/*`
- `@/lib/*` → `./src/lib/*`
- `@/components/*` → `./src/lib/components/*`
- `@/hooks/*` → `./src/lib/hooks/*`
- `@/utils/*` → `./src/lib/utils/*`

## React Component Usage

```tsx
'use client'; // Required for Next.js App Router

import { SankeyChart } from '@/lib/components/SankeyChart';

<SankeyChart
  data={{ nodes: [...], links: [...] }}
  width={800}
  height={600}
  layout={{ nodeWidth: 20, nodePadding: 10 }}
  showLabels
  showTooltips
  events={{
    onNodeClick: (node, event) => {...},
    onLinkClick: (link, event) => {...},
  }}
/>
```

## Power BI Visual Development

1. Enable developer visuals in Power BI Desktop: File → Options → Security → Enable developer visual
2. Run `npm run pbiviz:start`
3. Add "Developer visual" from visualization pane
4. Map Source, Target, Value fields

The visual entry point is `powerbi/src/visual.ts` which exports `Visual` and `SankeyVisual` classes implementing Power BI's `IVisual` interface.
