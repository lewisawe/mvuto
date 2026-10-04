---
name: Working with Mvuto presets
description: How to add, edit, and export celestial presets for the Mvuto gravity sandbox without breaking the single-source-of-truth guarantee between the MCP server and the app.
---

# Working with Mvuto presets

Mvuto's presets (`solar-system`, `binary-stars`, `galaxy`) have **one** source of
truth: `mcp-server/src/presets-data.ts`. Both the live MCP tools and the app's
committed JSON come from it. This skill explains the data flow and the exact
steps to change presets without the two copies drifting apart.

## The data flow

```
mcp-server/src/presets-data.ts   ← edit presets HERE and only here
          │                 │
          ▼                 ▼
 server.ts (MCP tools)   scripts/export-presets.ts
 list_presets/get_preset  writes src/presets/presets.generated.json
                                      │
                                      ▼
                          src/presets/index.ts → the app
```

The app imports the generated JSON (a browser cannot speak MCP stdio at runtime).
The MCP tools serve the same data live.

## A preset body

```ts
interface PresetBody {
  id: string;
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  mass: number;   // sim-scaled, > 0
  hue: number;    // 0–360 base color
}
```

Radius is intentionally **omitted** — the app derives it from mass via the
physics core's `massToRadius`, so the core stays the single authority on that
rule. Values are **sim-scaled**, not SI units.

## Add a new preset (checklist)

1. **Add the name** to `PRESET_NAMES` in `presets-data.ts`.
2. **Write a builder function** returning `PresetBody[]`. For orbits, use the
   circular-orbit speed `v = sqrt(G · M / r)` around the central mass, with
   `G = 1` to match `DEFAULT_G`. If you need randomness (e.g. a cluster), use the
   **seeded** `mulberry32` PRNG already in the file so exports stay reproducible
   (REQ-25). Never call `Math.random` here.
3. **Wire it into `getPresetData`'s switch.**
4. **Regenerate the JSON:** `npm run generate:presets` from the repo root.
5. **Verify:** the app's preset buttons are built from `listPresets()`, so the
   new preset appears automatically. Run `npm run typecheck` and open the app.

## Tuning tips

- A dominant central mass with much lighter satellites gives clean, stable orbits.
- Keep separations larger than the merged radius if you don't want immediate
  collisions; bodies merge when centers are closer than the sum of radii.
- Hue convention: warm hues (20–60) for stars, blues→magentas (200–320) for
  smaller bodies, matching the speed→hue trail palette.

## Don't

- Don't hand-edit `src/presets/presets.generated.json` — it is overwritten on
  every export.
- Don't put preset data in the app layer; the MCP module is the source of truth.
- Don't introduce unseeded randomness into preset generation.
