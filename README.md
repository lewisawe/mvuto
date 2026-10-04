# Mvuto

**Mvuto** is Swahili for *attraction* / *pull* — the right name for a Newtonian
gravity sandbox. Fling glowing bodies into a dark-space canvas and watch them
attract one another, fall into orbits, and merge on collision.

Built as a submission for the **Kiro University Challenge**: the `.kiro/` folder
demonstrates all 7 required lessons plus 2 bonus lessons (mapped below), and the
app itself is a working browser toy.

**Live demo:** https://lewisawe.github.io/mvuto/

![starfield canvas with glowing orbiting bodies — run `npm run dev` to see it live]

## What's inside

- A **pure, deterministic physics core** (`src/physics/`): softened Newtonian
  gravity, semi-implicit (symplectic) Euler integration, and merge-on-overlap
  collisions. No DOM, no randomness — which is exactly why it is property-tested.
- A **canvas renderer** (`src/render/`): seeded starfield, speed→hue motion
  trails, and additive-glow bodies, with proper high-DPI handling.
- An **MCP server** (`mcp-server/`, name `mvuto-bodies`) that serves celestial
  presets over stdio **and** generates the app's preset data from the same shared
  module, so the live tool and the app can't drift apart.

## Run it

```bash
npm install          # install app deps
npm run dev          # start the sandbox at the printed localhost URL
```

Then **drag on the canvas and release** to slingshot a new body. Use the panel to
Play/Pause, Reset, Clear, change the timestep and gravity, or load a preset
(solar-system, binary-stars, galaxy).

### Other commands

```bash
npm test                 # run the physics property + unit tests once
npm run build            # typecheck + Vite production build
npm run generate:presets # regenerate src/presets/presets.generated.json
```

## Regenerating presets

Presets live in **one** place: `mcp-server/src/presets-data.ts`. Both the MCP
tools and the exporter read it. To change a preset, edit that module, then:

```bash
npm run generate:presets   # rewrites src/presets/presets.generated.json
```

The generated JSON is committed so a fresh clone runs `npm run dev` without
needing the MCP server first. See `mcp-server/README.md` for the full data flow.

## Lesson → location map

The Kiro University Challenge requires evidence of each lesson. Here is exactly
where each one lives in this repo.

| # | Lesson | Where it lives |
|---|--------|----------------|
| 1 | **Specs (EARS requirements, design, tasks)** | `.kiro/specs/physics-sandbox/requirements.md`, `design.md`, `tasks.md` |
| 2 | **Steering (always-included project rules)** | `.kiro/steering/typescript-style.md`, `physics-core-purity.md`, `render-conventions.md`, `mvuto-project-context.md` |
| 3 | **Agent Hooks** | `.kiro/hooks/typecheck-on-save.json` (typecheck on `**/*.ts` save) |
| 4 | **Property-based testing** | `tests/physics.properties.test.ts`, `tests/physics.units.test.ts`, `tests/README.md` (each property → a REQ-ID) |
| 5 | **Powers (plugin manifest + skill)** | `.kiro/powers/mvuto-presets/plugin.json` and `.kiro/powers/mvuto-presets/skills/presets/SKILL.md` |
| 6 | **MCP server integration** | `mcp-server/` (server `mvuto-bodies`, tools `list_presets`/`get_preset`) + `.kiro/settings/mcp.json` registration |
| 7 | **Custom agents** | `.kiro/agents/physics-reviewer.json` (enforces core purity + reviews the math) |
| Bonus 1 | **Kiro Web / cloud sessions / cloud configuration** | The `trojan-asteroids` preset was added entirely in a Kiro **cloud session** on this repo (branch `add-trojan-asteroids-preset`, merged via PR #1), using the same synced `.kiro/` steering + agents. Lands in `mcp-server/src/presets-data.ts` + regenerated `src/presets/presets.generated.json`. |
| Bonus 2 | **Package a Kiro power** | `.kiro/powers/mvuto-presets/plugin.json` (manifest) bundling the skill `.kiro/powers/mvuto-presets/skills/presets/SKILL.md` |

## Project layout

```
mvuto/
├── index.html                 Vite entry (canvas + control panel markup)
├── src/
│   ├── physics/               PURE core (tested): vec2, forces, integrate, simulate
│   ├── render/                starfield, trails, renderer (canvas, no physics)
│   ├── presets/               adapter + committed presets.generated.json
│   └── app/                   main, loop, state, input (slingshot), controls, styles
├── tests/                     fast-check property tests + unit tests
├── mcp-server/                standalone MCP 'mvuto-bodies' + preset exporter
└── .kiro/                     specs, steering, hooks, powers, agents, settings
```

## Design notes

- **Why symplectic Euler?** It conserves energy far better than explicit Euler
  over long runs, so orbits stay stable instead of spiraling out.
- **Why softening?** The softening length removes the `r → 0` singularity, so two
  bodies passing close don't acquire near-infinite force and fling to infinity.
- **Why sim-scaled presets?** Values are tuned for watchable on-screen dynamics,
  not SI accuracy, while keeping each system's relative structure.

## License

MIT.
