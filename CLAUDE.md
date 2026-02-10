# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A high-performance Sankey Chart Power BI Custom Visual built with D3.js and TypeScript.

## Common Commands

```bash
# Type checking
npm run type-check       # TypeScript check (tsc --noEmit)

# Testing
npm test                 # Run vitest tests

# Power BI Visual
npm run start            # Start Power BI dev server (https://localhost:8080)
npm run package          # Build .pbiviz file for distribution
```

## Architecture

The project is a standalone Power BI Custom Visual. All source code lives in a single file:

```
├── src/
│   └── visual.ts          # Visual entry point (all logic in one file)
├── capabilities.json      # Power BI data roles and objects
├── pbiviz.json            # Power BI visual metadata
├── tsconfig.json          # TypeScript config
├── package.json           # Dependencies
├── style/
│   └── visual.less        # Styles
├── assets/                # Visual icon
└── dist/                  # Built .pbiviz package
```

**Key Design Decisions:**
- Pure D3.js for DOM manipulation (Power BI compatibility)
- d3-sankey for layout algorithm
- Strict TypeScript throughout
- Single-file architecture for Power BI build simplicity

## Power BI Data Flow

```
Power BI DataView
    ↓
transformDataView()  [src/visual.ts]
    ↓
SankeyData { nodes[], links[] }
    ↓
parseSettings()  [src/visual.ts]
    ↓
Visual.renderSankey()  [src/visual.ts]
```

**Data Roles (capabilities.json):**
- `source` (Grouping) - Flow origin node
- `target` (Grouping) - Flow destination node
- `value` (Measure) - Flow quantity

## Power BI Visual Development

1. Enable developer visuals in Power BI Desktop: File → Options → Security → Enable developer visual
2. Run `npm run start`
3. Add "Developer visual" from visualization pane
4. Map Source, Target, Value fields

The visual entry point is `src/visual.ts` which exports `Visual` and `SankeyVisual` classes implementing Power BI's `IVisual` interface.
