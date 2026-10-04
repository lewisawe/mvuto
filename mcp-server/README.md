# mvuto-bodies — MCP server

A standalone [Model Context Protocol](https://modelcontextprotocol.io) server
that serves celestial **presets** for the Mvuto gravity sandbox. It has a dual
role, and that is the whole point of its design:

1. **Live MCP tool.** Over stdio it exposes two tools a Kiro client can call:
   - `list_presets` → the names of the available presets.
   - `get_preset(name)` → the full body list for one preset.
2. **Preset generator.** The same data also feeds the browser app. A script
   exports it to `../src/presets/presets.generated.json`, which the app imports
   at build time (a browser cannot speak MCP stdio at runtime).

## The shared-module pattern (why the two can't drift)

Both roles read from **one** module: [`src/presets-data.ts`](src/presets-data.ts).

```
                 src/presets-data.ts   ← single source of truth
                   │              │
       ┌───────────┘              └───────────┐
       ▼                                       ▼
 src/server.ts tools              scripts/export-presets.ts
 list_presets / get_preset        writes ../src/presets/presets.generated.json
 (live, over stdio)               (committed artifact the app imports)
```

Change a preset in `presets-data.ts` and both the live tool output and the
exported JSON change together. There is no second copy to forget to update.

## Tools

| Tool | Input | Output |
|------|-------|--------|
| `list_presets` | _none_ | `{ "presets": ["solar-system", "binary-stars", "galaxy"] }` |
| `get_preset` | `{ "name": string }` | `{ "name": string, "bodies": PresetBody[] }` |

A `PresetBody` is `{ id, pos:{x,y}, vel:{x,y}, mass, hue }`. Radius is **not**
included — the app derives it from mass via the shared mass→radius rule so the
physics core stays the single authority on that relationship.

## Presets

- **solar-system** — one dominant central star with four planets on circular
  orbits.
- **binary-stars** — two equal masses orbiting their common barycenter.
- **galaxy** — a heavy core surrounded by ~60 light stars on roughly circular
  orbits, laid out by a **seeded** PRNG (mulberry32) so the export is byte-stable.

> Values are **sim-scaled**, not SI units. They are chosen so the dynamics are
> visible on-screen within seconds while preserving each system's relative
> structure.

## Scripts

```bash
npm run build          # tsc → dist/ (used by .kiro/settings/mcp.json)
npm start              # node dist/index.js  (run the built server)
npm run dev            # tsx src/index.ts     (run from source)
npm run export:presets # tsx scripts/export-presets.ts (write the app's JSON)
```

From the repo root, `npm run generate:presets` runs the exporter directly.

## Registering with Kiro

`.kiro/settings/mcp.json` (at the repo root) points Kiro at the **built** server:

```json
{
  "mcpServers": {
    "mvuto-bodies": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Run `npm run build` here first so `dist/index.js` exists.
