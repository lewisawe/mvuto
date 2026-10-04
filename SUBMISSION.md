# Mvuto — Kiro University Challenge submission

Paste-ready answers for the entry form at https://kiro.dev/2026/university.

- **Repo:** https://github.com/lewisawe/mvuto
- **Live demo:** https://lewisawe.github.io/mvuto/
- **Demo video:** _(add link)_

---

## What you built

Mvuto (Swahili for "gravity/attraction") is an interactive browser physics
sandbox where you slingshot celestial bodies that orbit, collide, and merge under
softened Newtonian gravity, with velocity-colored trails over a starfield. Its
pure, deterministic physics core is validated by property-based tests, and real
scientific preset data (Solar System, binary stars, galaxy clusters, Trojan
asteroids) is served into the app through a custom MCP server. The entire project
was designed and built in Kiro using specs, steering, hooks, a packaged power,
MCP, and a custom agent.

---

## Lessons demonstrated

### 1. Spec-driven development
The app was defined before coding in `.kiro/specs/physics-sandbox/`.
`requirements.md` holds EARS-notation requirements with stable IDs (e.g. REQ-1
"WHEN two bodies with positive masses exist, THE SYSTEM SHALL compute a
gravitational force... softened by a softening length ε"); `design.md` describes
the pure-core architecture and the MCP→app data flow; `tasks.md` is the
implementation breakdown. The REQ-IDs are referenced from the tests, steering,
and the custom agent, so the spec is the backbone of the build.

### 2. Steering documents
Four always-included files in `.kiro/steering/` enforce project standards on every
interaction: `physics-core-purity.md` (the rule that `src/physics/` stays
deterministic — no DOM, randomness, time, or input mutation),
`render-conventions.md`, `typescript-style.md`, and `mvuto-project-context.md`.
They kept Kiro's output consistent with the architecture throughout.

### 3. Hooks
`.kiro/hooks/typecheck-on-save.json` is a `fileEdited` hook matching `**/*.ts`
that runs `npm run typecheck` whenever a TypeScript file is saved. It deliberately
runs the fast typecheck and NOT the test suite, so saving a file gives immediate
type feedback without triggering expensive repeated test runs.

### 4. Property-based testing
`tests/physics.properties.test.ts` uses fast-check + vitest to run 13 property
tests against the pure physics core, each tied to a spec REQ-ID: gravitational
force is symmetric and attractive (Newton's third law, REQ-2); `mergeBodies`
conserves total mass and momentum (REQ-8/9); `stepSimulation` preserves body count
and never mutates its input (REQ-10); zero-force integration leaves velocity
unchanged (REQ-5). `tests/physics.units.test.ts` adds 5 unit tests. 18 tests
total, all passing — enforcing the spec's intent, not hand-picked examples.

### 5. Powers
`.kiro/powers/mvuto-presets/` is a packaged Kiro power: `plugin.json` manifest
plus `skills/presets/SKILL.md`, documenting how Mvuto's celestial presets work —
how the shared MCP preset module, the exporter, and the app adapter fit together,
and how to add a new preset safely. It activates on preset-related keywords.

### 6. Model Context Protocol (MCP)
`mcp-server/` is a standalone stdio MCP server, `mvuto-bodies`, built with
`@modelcontextprotocol/sdk` and registered in `.kiro/settings/mcp.json`. It
exposes tools (`list_presets`, `get_preset`) returning real relative body data
(mass, radius, orbital distance, color). MCP is core, not incidental: the same
shared module (`mcp-server/src/presets-data.ts`) backing the MCP tools also
generates the app's `src/presets/presets.generated.json` via
`npm run generate:presets`, so the physics on screen is driven by MCP data.

### 7. Custom agents
`.kiro/agents/physics-reviewer.json` is a purpose-built review agent guarding the
physics core. Its prompt enforces five purity rules and checks the Newtonian math
(softened inverse-square force, symplectic Euler, mass/momentum-conserving merges)
citing REQ-IDs. It is locked to read-only tools (`readFile`, `listDirectory`,
`search`, `grepSearch`), denies `executeBash`, loads the spec and purity steering
as resources, and bundles the `mvuto-presets` power.

### [Bonus] Kiro Web, cloud sessions, and cloud configuration
The `trojan-asteroids` preset was built entirely in a Kiro cloud session on this
repo, not locally: branch `add-trojan-asteroids-preset`, committed by the Kiro
cloud agent and merged via PR #1
(https://github.com/lewisawe/mvuto/pull/1). The same `.kiro/` steering and the
physics-reviewer agent were active in the cloud (the pure-core rule held — the
change landed in `mcp-server/src/presets-data.ts` and the regenerated
`src/presets/presets.generated.json`, never in `src/physics/`). The demo video
shows the local CLI build vs. this cloud session side by side.

### [Bonus] Package a Kiro power
The `mvuto-presets` power is a fully packaged plugin:
- Manifest: https://github.com/lewisawe/mvuto/blob/main/.kiro/powers/mvuto-presets/plugin.json
- Bundled skill: https://github.com/lewisawe/mvuto/blob/main/.kiro/powers/mvuto-presets/skills/presets/SKILL.md
