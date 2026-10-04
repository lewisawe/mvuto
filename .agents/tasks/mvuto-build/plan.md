# Implementation Plan — Mvuto (Newtonian Gravity Physics Sandbox)

Target repo: `/home/sierra/Desktop/projects/builderCenter/kiroUni/mvuto` (git initialized, branch `main`, **no commits yet**).

Submission for the Kiro University Challenge. Must demonstrate all 7 required lessons + 2 bonus lessons via a `.kiro` folder, and be a *working* browser app. **Do NOT create a worktree. Do NOT push to any remote. Exactly ONE git commit at the very end — a later workflow step owns that commit; this build does not commit.**

---

## Design decisions (made here, grounded in investigation)

- **Toolchain present:** Node v22.22.2, npm 10.9.7. ESM-capable. (Verified.)
- **Pinned, mutually-compatible versions** (chosen for stability over the brand-new majors, because the test suite runs at most twice and we cannot afford integration surprises):
  - `typescript@5.9.3`, `vite@6.4.3`, `vitest@2.1.9`, `fast-check@3.23.2`, `@types/node@22.20.5`, `tsx@4.x`.
  - MCP server package: `@modelcontextprotocol/sdk@^1.32.0` (API: `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`, `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`, schemas via `zod`). `zod@^3`.
  - Rationale: vitest 2 has no hard vite peer pin (verified), vite 6 + ts 5 + fast-check 3 are a battle-tested set. Keeps installs minimal (no jsdom/happy-dom — the pure core needs no DOM).
- **Module system:** Root app is ESM (`"type":"module"` in root `package.json`). `mcp-server/` is its own package, also ESM, with its own `package.json` and `tsconfig.json`. The two packages are independent installs; the exporter bridges them by importing the MCP server's **shared preset module** directly (relative path) and writing JSON into the app's `src/presets/`.
- **Preset data flow (satisfies Lesson 6 "MCP is source of truth" requirement):** The MCP server defines preset body data in a **shared module** `mcp-server/src/presets-data.ts`. BOTH (a) the MCP tool handlers (`list_presets`, `get_preset`) and (b) the exporter script `mcp-server/scripts/export-presets.ts` import that same module. The exporter writes `src/presets/presets.generated.json`, which the browser app imports at build time (browser cannot speak MCP stdio at runtime). This is documented in `mcp-server/README.md`.
- **Pure core is framework-free and deterministic:** no DOM, no `Math.random` inside `src/physics/`, no globals, no time. All randomness (starfield, galaxy jitter) lives in render/presets layers, seeded where determinism matters.
- **Collisions:** merge-on-overlap (distance between centers < sum of radii) with momentum conservation and mass summation; merged radius from summed mass via the shared mass→radius rule.
- **Testing scope (cost constraint):** property tests + a few unit tests cover ONLY `src/physics/`. No UI/canvas/glue tests. ~12 properties total (within the 8–15 band). The suite is written and then run **once** in the normal verify path (step 17). Typecheck is the primary cheap gate used throughout.

---

## Files to create (complete manifest)

### Root config / tooling
- `package.json` — root app package. `"type":"module"`. Scripts: `dev` (vite), `build` (`tsc --noEmit && vite build`), `preview` (vite preview), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `generate:presets` (`cd mcp-server && npm run export:presets` OR `tsx mcp-server/scripts/export-presets.ts` — see step 11), `mcp:build` (optional, `cd mcp-server && npm run build`). devDeps: typescript, vite, vitest, fast-check, @types/node, tsx.
- `tsconfig.json` — root app TS config: `target ES2022`, `module ESNext`, `moduleResolution bundler`, `strict true`, `noUncheckedIndexedAccess true`, `lib ["ES2022","DOM","DOM.Iterable"]`, `types ["vite/client"]`, `include ["src","tests"]`.
- `tsconfig.node.json` — (optional) for config files; only if `vite.config.ts` typechecking needs it. Keep minimal.
- `vite.config.ts` — Vite config. `root` default, `test` config block for vitest (`environment: 'node'`, `include: ['tests/**/*.test.ts']`). Single config shared by vite + vitest (vitest reads `vite.config.ts`).
- `index.html` — Vite entry. `<canvas id="sim">`, control-panel overlay markup container `<div id="panel">`, `<script type="module" src="/src/app/main.ts">`. Dark background.
- `.gitignore` — `node_modules/`, `dist/`, `mcp-server/node_modules/`, `mcp-server/dist/`, `*.log`, `.DS_Store`, `.vite/`. **Do NOT ignore `src/presets/presets.generated.json`** (committed artifact so the app runs after clone without regen).
- `README.md` — top-level. Project explanation; run instructions (`npm install`, `npm run dev`); how to regenerate presets (`npm run generate:presets`); and an explicit table mapping EACH of the 7 lessons + 2 bonus lessons to the exact path in the repo. (Content detailed in step 16.)

### Pure physics core — `src/physics/`
- `src/physics/vec2.ts` — Vec2 type + pure math.
- `src/physics/types.ts` — `Body` and related types.
- `src/physics/constants.ts` — default `G`, default `softening`, mass→radius rule constant.
- `src/physics/body.ts` — `massToRadius(mass)`, `mergeBodies(a,b)`.
- `src/physics/forces.ts` — `gravitationalForce(a,b,G,softening)`.
- `src/physics/integrate.ts` — `integrate(body, force, dt)` (semi-implicit Euler).
- `src/physics/simulate.ts` — `stepSimulation(bodies, G, dt, softening)` (accumulate forces, integrate, resolve merges).
- `src/physics/index.ts` — barrel re-export of the public pure API.

### Rendering — `src/render/`
- `src/render/starfield.ts` — generate (seeded) + draw a static starfield layer.
- `src/render/trails.ts` — trail buffer per body; speed→hue color mapping (`speedToHue`).
- `src/render/renderer.ts` — `Renderer` class: clears, draws starfield, draws trails, draws glowing bodies (radial-gradient glow) onto the 2D context. Handles devicePixelRatio + resize.

### App wiring — `src/app/`
- `src/app/input.ts` — pointer handlers: press→drag→release spawns a body; drag vector sets initial velocity (slingshot). Returns/emits spawn events; no physics math beyond scaling drag to velocity.
- `src/app/controls.ts` — binds the HTML overlay controls (Play/Pause, Reset, Clear, speed/timestep slider, G slider, preset buttons) to simulation state.
- `src/app/state.ts` — mutable app/sim state container (current bodies array, G, dt scale, running flag). Thin; delegates stepping to pure core.
- `src/app/loop.ts` — requestAnimationFrame main loop: on each frame, when running, call `stepSimulation` N substeps, hand bodies to `Renderer`.
- `src/app/main.ts` — entry: grab canvas, construct Renderer/state/loop, wire input + controls, load initial preset, start loop.
- `src/app/styles.css` — dark-space UI styling for the overlay panel (imported from main.ts).

### Presets — `src/presets/`
- `src/presets/presets.generated.json` — GENERATED by the exporter from the MCP server's shared module. Checked in.
- `src/presets/index.ts` — imports the generated JSON, exposes `listPresets()` and `getPreset(name)` typed against the physics `Body` shape (maps raw preset bodies → initial `Body` objects).

### MCP server — `mcp-server/`
- `mcp-server/package.json` — standalone package. `"type":"module"`. Scripts: `build` (`tsc`), `start` (`node dist/index.js`), `dev` (`tsx src/index.ts`), `export:presets` (`tsx scripts/export-presets.ts`). deps: `@modelcontextprotocol/sdk`, `zod`. devDeps: `typescript`, `tsx`, `@types/node`.
- `mcp-server/tsconfig.json` — ESM, `outDir dist`, `module NodeNext`, `moduleResolution NodeNext`, `strict`.
- `mcp-server/src/presets-data.ts` — **SHARED preset module**. Exports `PRESET_NAMES`, `getPresetData(name)` returning scientifically-plausible, sim-scaled bodies for `solar-system`, `binary-stars`, `galaxy`. Pure data + a seeded generator for the galaxy cluster (deterministic given a fixed seed so exports are reproducible). Also exports the raw body type.
- `mcp-server/src/server.ts` — builds the `McpServer` named `mvuto-bodies`, registers tools `list_presets` and `get_preset` (zod input `{ name }`), both delegating to `presets-data.ts`.
- `mcp-server/src/index.ts` — entry: construct server from `server.ts`, connect `StdioServerTransport`.
- `mcp-server/scripts/export-presets.ts` — imports `presets-data.ts`, builds `{ [name]: Body[] }` for all presets, writes `../src/presets/presets.generated.json` (pretty-printed, with a `// generated` note is not valid JSON — instead include a `"_generatedBy"` metadata key).
- `mcp-server/README.md` — explains the server is BOTH a live MCP tool (registered in `.kiro/settings/mcp.json`) AND the generator of the app's preset data; documents tools, the shared-module pattern, and the dual data-flow.

### Tests — `tests/`
- `tests/physics.properties.test.ts` — all property tests (fast-check), grouped by target function. (~12 properties, listed below.)
- `tests/physics.units.test.ts` — a handful of concrete unit tests (exact-value sanity checks that complement the properties).
- `tests/README.md` — ties each property back to a spec requirement ID in `.kiro/specs/physics-sandbox/requirements.md` (links Lesson 4 ↔ Lesson 1).

### `.kiro/` — all seven lessons + bonus
- `.kiro/specs/physics-sandbox/requirements.md` — EARS requirements (`WHEN … THE SYSTEM SHALL …`) with stable IDs (REQ-1…REQ-N) describing THIS app.
- `.kiro/specs/physics-sandbox/design.md` — architecture: pure-core design, layer boundaries, MCP preset data flow diagram, merge/integration rationale.
- `.kiro/specs/physics-sandbox/tasks.md` — task breakdown mirroring this build.
- `.kiro/steering/typescript-style.md` — always-included: TS style conventions (strict, no `any`, named exports, etc.).
- `.kiro/steering/physics-core-purity.md` — always-included: "physics core must stay pure and framework-free" with a concrete do/don't code example.
- `.kiro/steering/render-conventions.md` — always-included: canvas/render conventions (dpr handling, no physics in render layer).
- `.kiro/steering/mvuto-project-context.md` — always-included: project overview, Swahili name meaning, layer map.
- `.kiro/hooks/typecheck-on-save.json` — v1 hook, `PostFileSave`, matcher `\\.(ts)$`, action command `npm run typecheck` (cheap; NOT a test loop — see cost note).
- `.kiro/powers/mvuto-presets/plugin.json` — power manifest (`$schema`, name `mvuto-presets`, version, description, author, keywords).
- `.kiro/powers/mvuto-presets/skills/presets/SKILL.md` — skill on working with celestial presets / adding new presets (Bonus Lesson 2).
- `.kiro/settings/mcp.json` — registers `mvuto-bodies` (`command: node`, `args: ["mcp-server/dist/index.js"]`, `disabled:false`, `autoApprove: []`). (See step 10 note on dist vs tsx.)
- `.kiro/agents/physics-reviewer.json` — custom agent enforcing pure-core rule + reviewing physics math.

---

## Exact pure-core function signatures (authoritative)

```ts
// src/physics/vec2.ts
export interface Vec2 { readonly x: number; readonly y: number; }
export const vec2 = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ...;
export const sub = (a: Vec2, b: Vec2): Vec2 => ...;
export const scale = (a: Vec2, s: number): Vec2 => ...;
export const length = (a: Vec2): number => ...;      // hypot
export const normalize = (a: Vec2): Vec2 => ...;      // returns {0,0} for zero vector
export const dot = (a: Vec2, b: Vec2): number => ...; // helper (optional)

// src/physics/types.ts
export interface Body {
  readonly id: string;
  readonly pos: Vec2;
  readonly vel: Vec2;
  readonly mass: number;   // > 0
  readonly radius: number; // derived from mass
  readonly hue?: number;   // optional base color hint for presets
}

// src/physics/constants.ts
export const DEFAULT_G = 1.0;          // sim units (tunable via UI)
export const DEFAULT_SOFTENING = 4.0;  // prevents r→0 singularity
export const MASS_RADIUS_K = ...;      // radius = MASS_RADIUS_K * cbrt(mass)

// src/physics/body.ts
export const massToRadius = (mass: number): number => ...;   // MASS_RADIUS_K * Math.cbrt(mass)
export const mergeBodies = (a: Body, b: Body): Body => ...;   // mass=a.mass+b.mass; vel=(a.m*a.v+b.m*b.v)/mass; pos=mass-weighted centroid; radius=massToRadius(mass); id=a or deterministic combine

// src/physics/forces.ts
// Force ON a DUE TO b. Points from a toward b (attractive). Softened: F = G*ma*mb*(b-a)/(r^2+eps^2)^(3/2).
export const gravitationalForce = (a: Body, b: Body, G: number, softening: number): Vec2 => ...;

// src/physics/integrate.ts
// Semi-implicit (symplectic) Euler: v' = v + (F/m)*dt ; p' = p + v'*dt.
export const integrate = (body: Body, force: Vec2, dt: number): Body => ...;

// src/physics/simulate.ts
// 1) accumulate net force per body (sum gravitationalForce over others)
// 2) integrate each
// 3) resolve merges: any overlapping pair (|pos_i - pos_j| < r_i + r_j) merged via mergeBodies
// Returns a NEW array; input not mutated. Body count preserved except where merges reduce it.
export const stepSimulation = (bodies: readonly Body[], G: number, dt: number, softening: number): Body[] => ...;
```

---

## The ~12 property tests (by name, tied to spec requirements)

Each name is a `test(...)` label in `tests/physics.properties.test.ts`. The REQ-IDs reference `.kiro/specs/physics-sandbox/requirements.md` (authored in step 2 so IDs exist before tests reference them).

1. **vec2 add is commutative** — `add(a,b) ≈ add(b,a)` — REQ: Vec2 math.
2. **vec2 add is associative** — `add(add(a,b),c) ≈ add(a,add(b,c))` — REQ: Vec2 math.
3. **vec2 scale distributes over add** — `scale(add(a,b),s) ≈ add(scale(a,s),scale(b,s))` — REQ: Vec2 math.
4. **normalize yields unit length (or zero for zero vector)** — `length(normalize(a)) ≈ 1` when `a≠0`, else `{0,0}` — REQ: Vec2 math.
5. **gravitational force magnitude is symmetric** — `|F(a,b)| ≈ |F(b,a)|` — REQ: Newtonian attraction (Lesson1 REQ for F=G m1 m2 / r^2).
6. **gravitational force is attractive (points a→b)** — direction of `F(a,b)` is parallel to `(b.pos - a.pos)`, non-negative projection — REQ: attraction.
7. **gravitational forces are equal-and-opposite** — `F(a,b) ≈ -F(b,a)` (vector) — REQ: Newton's third law.
8. **force grows with mass, shrinks with distance** — monotonicity: increasing either mass increases `|F|`; increasing separation decreases `|F|` — REQ: inverse-square behavior.
9. **integrate with zero force leaves velocity unchanged** — `integrate(b, {0,0}, dt).vel ≈ b.vel` — REQ: integration.
10. **mergeBodies conserves total mass** — `merge(a,b).mass ≈ a.mass + b.mass` — REQ: collision/merge.
11. **mergeBodies conserves total momentum** — `merge(a,b).mass * merge.vel ≈ a.mass*a.vel + b.mass*b.vel` (both components) — REQ: collision/merge.
12. **stepSimulation preserves body count when no overlaps** — for non-overlapping inputs, `stepSimulation(...).length === bodies.length` — REQ: simulation step integrity.

Unit tests (`tests/physics.units.test.ts`, concrete values): known two-body force magnitude for simple inputs; `massToRadius` monotonic sample; one explicit merge arithmetic example; one explicit single-step position advance under constant velocity (zero G).

**Flaky-test rule (cost constraint):** any property that is numerically fragile gets ONE tolerance/arbitrary-bounds fix. If still flaky, mark `test.skip` with a `// SKIPPED: <reason>, see cost constraints` comment and move on. Use bounded `fc.double({min,max,noNaN:true,noDefaultInfinity:true})` arbitraries and `Math.abs(x-y) < eps` comparisons from the start to avoid flakiness.

---

## Build / verify order (test suite runs AT MOST ONCE in the normal path)

Dependency-ordered. Each step leaves the repo in a typecheckable state. Typecheck (`tsc --noEmit`) is the cheap gate used repeatedly; the **vitest suite is executed only once, at step 17.**

- [ ] 1. **Scaffold root project config.** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`. Pin the versions listed above.
      Files: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`.
      Verify: `npm install` completes without error (installs the pinned set). Do NOT run tests yet.

- [ ] 2. **Author the spec (Lesson 1) first** so requirement IDs exist for tests + steering to reference.
      Files: `.kiro/specs/physics-sandbox/requirements.md` (EARS, REQ-IDs), `.kiro/specs/physics-sandbox/design.md`, `.kiro/specs/physics-sandbox/tasks.md`.
      Verify: files present; each property in the test list maps to a REQ-ID here.

- [ ] 3. **Implement the pure core.** Create `vec2.ts`, `types.ts`, `constants.ts`, `body.ts`, `forces.ts`, `integrate.ts`, `simulate.ts`, `index.ts` with the exact signatures above. No DOM, no randomness, no globals.
      Files: all of `src/physics/`.
      Verify: `npm run typecheck` passes.

- [ ] 4. **Write the test suite (Lesson 4) — but do not run it yet.** Author `tests/physics.properties.test.ts` (12 properties above, bounded arbitraries + epsilon compares), `tests/physics.units.test.ts`, `tests/README.md` (REQ-ID links).
      Files: all of `tests/`.
      Verify: `npm run typecheck` passes (tests compile). Defer `vitest` to step 17.

- [ ] 5. **Build the MCP server package (Lesson 6).** Create `mcp-server/package.json`, `mcp-server/tsconfig.json`. Run its own install.
      Files: `mcp-server/package.json`, `mcp-server/tsconfig.json`.
      Verify: `cd mcp-server && npm install` completes.

- [ ] 6. **Author the shared preset module.** `mcp-server/src/presets-data.ts`: `PRESET_NAMES = ['solar-system','binary-stars','galaxy']`, `getPresetData(name)` returning sim-scaled plausible bodies (seeded deterministic galaxy cluster). Export the raw body type.
      Files: `mcp-server/src/presets-data.ts`.
      Verify: `cd mcp-server && npx tsc --noEmit` passes.

- [ ] 7. **Build the MCP server + tools.** `mcp-server/src/server.ts` (McpServer `mvuto-bodies`, tools `list_presets`, `get_preset` with zod input, delegating to `presets-data.ts`); `mcp-server/src/index.ts` (StdioServerTransport wiring).
      Files: `mcp-server/src/server.ts`, `mcp-server/src/index.ts`.
      Verify: `cd mcp-server && npx tsc --noEmit` passes; `npm run build` emits `dist/index.js`.

- [ ] 8. **Write the exporter + MCP README.** `mcp-server/scripts/export-presets.ts` imports `presets-data.ts`, writes `../src/presets/presets.generated.json` with a `_generatedBy` metadata key. `mcp-server/README.md` documents the dual role (live MCP tool + preset generator) and the shared-module pattern.
      Files: `mcp-server/scripts/export-presets.ts`, `mcp-server/README.md`.
      Verify: `cd mcp-server && npx tsc --noEmit` passes.

- [ ] 9. **Generate the preset JSON.** Run the exporter to create the committed artifact.
      Files: writes `src/presets/presets.generated.json`.
      Verify: `npm run generate:presets` (root script) produces valid JSON with all three presets and non-empty body arrays. `node -e "JSON.parse(require('fs').readFileSync('src/presets/presets.generated.json'))"` succeeds.

- [ ] 10. **Register the MCP server (Lesson 6 config).** `.kiro/settings/mcp.json` with `mvuto-bodies` → `command:"node"`, `args:["mcp-server/dist/index.js"]`, `disabled:false`, `autoApprove:[]`. (dist path requires step 7's build; it already ran.)
      Files: `.kiro/settings/mcp.json`.
      Verify: valid JSON; `args[0]` path `mcp-server/dist/index.js` exists on disk.

- [ ] 11. **App presets adapter.** `src/presets/index.ts`: import generated JSON, expose `listPresets()`/`getPreset(name)` mapping raw preset bodies → physics `Body` objects (compute radius via `massToRadius`).
      Files: `src/presets/index.ts`.
      Verify: `npm run typecheck` passes.

- [ ] 12. **Render layer.** `starfield.ts` (seeded), `trails.ts` (`speedToHue`), `renderer.ts` (dpr/resize, glow via radial gradient, draws starfield→trails→bodies).
      Files: all of `src/render/`.
      Verify: `npm run typecheck` passes.

- [ ] 13. **App wiring.** `state.ts`, `loop.ts` (rAF + substeps calling `stepSimulation`), `input.ts` (slingshot spawn), `controls.ts` (overlay bindings), `styles.css`, `main.ts` (compose everything, load default preset, start loop).
      Files: all of `src/app/`.
      Verify: `npm run typecheck` passes.

- [ ] 14. **Steering (Lesson 2).** Author the four always-included steering files with real, specific content and a code do/don't in the purity file.
      Files: `.kiro/steering/typescript-style.md`, `physics-core-purity.md`, `render-conventions.md`, `mvuto-project-context.md`.
      Verify: files present and specific to Mvuto.

- [ ] 15. **Hooks (Lesson 3), Power (Lesson 5 + Bonus 2), Custom agent (Lesson 7).** Create the hook JSON (v1 schema, PostFileSave `\\.(ts)$` → `npm run typecheck`), the power `plugin.json` + `SKILL.md`, and `physics-reviewer.json` (name, description, tools, excludedTools, includeMcpJson, includePowers, resources, permissions.rules, prompt enforcing purity, model, welcomeMessage).
      Files: `.kiro/hooks/typecheck-on-save.json`, `.kiro/powers/mvuto-presets/plugin.json`, `.kiro/powers/mvuto-presets/skills/presets/SKILL.md`, `.kiro/agents/physics-reviewer.json`.
      Verify: each JSON parses; schemas match the exam.txt examples.

- [ ] 16. **Top-level README.** Project explanation, Swahili meaning, run via `npm install` + `npm run dev`, regenerate presets via `npm run generate:presets`, and a table mapping each of the 7 lessons + 2 bonus lessons to its exact repo path.
      Files: `README.md`.
      Verify: table present with all 9 rows pointing at real paths created above.

- [ ] 17. **Single full verification pass (the ONE allowed test run).** In order:
      (a) `npm run typecheck` — app compiles.
      (b) `cd mcp-server && npx tsc --noEmit && cd ..` — server compiles.
      (c) `npm test` — **vitest runs ONCE**; expect the ~12 properties + unit tests to pass.
      (d) `npm run build` — Vite production build succeeds (proves the app wires up and imports the generated presets).
      Files: none (verification only).
      Verify: all four commands exit 0. If (c) has a single flaky property, apply ONE fix then, per the cost rule, `test.skip` it with a comment — do NOT re-loop the whole suite repeatedly. If any command is blocked after one reasonable fix attempt, STOP and report rather than burning cycles.

- [ ] 18. **Do NOT commit.** Leave the working tree staged-or-unstaged as-is; the later workflow step performs the single final commit. Confirm no `git commit`, no remote push, no worktree was created.
      Verify: `git log --oneline` still shows no commits from this build; `git remote -v` unchanged.

---

## Cost / efficiency guardrails (restated for the implementer)

- Test suite executes **once** (step 17c). Typecheck is the repeated cheap gate everywhere else.
- Property count stays in 8–15 (we have 12 + a few units). Do not add UI/canvas/glue tests.
- Use bounded, `noNaN`/`noDefaultInfinity` fast-check arbitraries and epsilon comparisons from the start to avoid flakiness.
- One flaky-test fix attempt, then skip-with-comment.
- Minimal deps only (the pinned set above). No jsdom/happy-dom, no eslint/prettier runtime, no heavy packages.
- The `PostFileSave` hook runs `npm run typecheck` (fast), deliberately NOT the test suite, so saving files during the build cannot trigger repeated expensive test runs.
- If blocked after one reasonable attempt at any step, stop and report.

## Gaps / assumptions
- `.kiro` schema specifics (power `$schema` URL, agent/hook field names) are taken verbatim from the challenge `exam.txt` examples; if the Kiro IDE rejects a field at review time that is outside this build's ability to verify here, it is acceptable per the "one attempt then report" rule.
- Preset "scientific plausibility" is *relative* and sim-scaled (not real SI units); documented as such in `mcp-server/README.md`.
- `src/presets/presets.generated.json` is intentionally committed so a fresh clone runs `npm run dev` without first running the MCP exporter.
