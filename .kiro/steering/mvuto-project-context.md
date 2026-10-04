---
inclusion: always
---

# Project context — Mvuto

**Mvuto** is Swahili for *attraction* / *pull* — fitting for a Newtonian gravity
sandbox. The user flings glowing bodies into a dark-space canvas and watches them
attract one another, settle into orbits, and merge on collision.

## What it is

A browser app (Vite + TypeScript, canvas 2D) plus a standalone MCP server that
provides celestial presets. Built as a submission for the Kiro University
Challenge; the `.kiro/` folder demonstrates every required lesson plus bonuses.

## Layer map (dependencies point downward only)

```
src/app/      entry + glue: DOM, rAF loop, slingshot input, control panel
src/render/   canvas drawing: starfield, trails, glowing bodies (NO physics)
src/presets/  reads presets.generated.json → Body objects
src/physics/  PURE CORE: vectors, forces, integration, merges (NO DOM/random)
mcp-server/   MCP 'mvuto-bodies' + the generator of presets.generated.json
```

## Non-negotiables

- `src/physics/` stays pure and deterministic (see physics-core-purity steering).
- Preset data has ONE source of truth: `mcp-server/src/presets-data.ts`, reused
  by both the live MCP tools and the exporter. Never hand-edit
  `src/presets/presets.generated.json`; regenerate with `npm run generate:presets`.
- The MCP server must not print to stdout (stdio is the transport).

## Key commands

```bash
npm install              # root app deps
npm run dev              # start the sandbox (Vite dev server)
npm run generate:presets # regenerate presets from the shared module
npm test                 # run the physics property + unit tests once
npm run build            # typecheck + production build
```
