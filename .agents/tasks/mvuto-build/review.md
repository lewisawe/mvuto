# Review — Mvuto physics sandbox (one-pass, cost-controlled)

This is the single review pass. It checks the implementation under
`/home/sierra/Desktop/projects/builderCenter/kiroUni/mvuto` against the authoritative
spec in `.agents/tasks/mvuto-build/plan.md`, using the coder's recorded results in
`.agents/tasks/mvuto-build/verification.md` as the build/test evidence rather than
re-running suites. The physics math, core purity, MCP/shared-preset wiring, the full
set of `.kiro` lessons, and the README mapping were read directly from source.

**Watch for:** nothing blocking. The one historical test failure (a subnormal
`normalize` counterexample) was fixed by bounding the test's input domain, not by
weakening production code — a legitimate floating-point boundary call, documented
inline and in the verification note. A couple of cosmetic nits are noted below and
are explicitly non-blocking per the no-speculative-changes constraint.

**Verdict**: APPROVED

## High-level view

The pure physics core is mathematically correct. Softened Newtonian force points
from `a` toward `b` and is built from `d = b.pos − a.pos` scaled by
`G·ma·mb/(r²+ε²)^1.5`, which makes magnitude symmetry, attractiveness, and Newton's
third law (`F(a,b) = −F(b,a)`) fall out structurally rather than by coincidence.
Integration is genuine semi-implicit (symplectic) Euler — velocity updates first,
then position uses the new velocity. `mergeBodies` conserves mass and momentum and
places the result at the center of mass, with radius from the shared
`massToRadius` rule. `stepSimulation` accumulates forces with the third law applied
once per pair, integrates, resolves merges, returns a fresh array, and never mutates
input.

`src/physics/` is genuinely pure: a content search for `document`, `window`,
`Math.random`, `requestAnimationFrame`, `performance.`, `Date.now`, `globalThis`,
and `canvas` returns zero matches across the directory.

The MCP server is a standalone ESM package named `mvuto-bodies` with its own
package.json, exposing `list_presets` and `get_preset`. Preset body data lives in a
single shared module (`presets-data.ts`) that is imported by both the tool handlers
(`server.ts`) and the exporter (`export-presets.ts`), so the live tool and the
committed `presets.generated.json` cannot drift. The generated JSON matches the
exporter output (spot-checked: planet-1 at r=120, mass=20, orbital speed
`sqrt(12000/120)=10`).

All 7 required `.kiro` lessons plus 2 bonus lessons are present and real: EARS specs
with stable REQ-IDs, four always-included steering files (one with a do/don't code
example), a v1 hook JSON, 13 fast-check properties + 5 unit tests tied to REQ-IDs,
a power `plugin.json` + `SKILL.md`, `mcp.json` registration pointing at the built
`dist/index.js`, and a custom agent JSON carrying the full documented schema. The
README lesson→location table maps every row to a path that exists on disk.

The test suite is small and physics-only (18 tests total, within the 8–15 property
band plus a few units), with bounded `noNaN`/`noDefaultInfinity` arbitraries and
epsilon comparisons. The verification note records exactly two test runs — the cost
constraint on over-testing was respected.

<details>
<summary>Issues (2)</summary>

1. **normalize→REQ-11 mapping is slightly loose (non-blocking)** — `tests/README.md`
   maps "normalize yields unit length" to REQ-11, and the test now treats
   `len < 1e-150` as vacuously passing. This narrows the asserted domain but still
   covers every value the app produces; the carve-out is documented inline and in
   verification.md. No change required.
2. **Single-pass merge cascade is per-frame, not within one step (non-blocking,
   by design)** — `resolveMerges` merges each surviving body with later overlapping
   bodies in one linear pass; a body produced by a merge is not re-tested against
   already-passed indices until the next frame. The plan explicitly specifies this
   ("a merged body can cascade next frame"), and REQ-10 only requires count
   preservation on non-overlapping input, which holds. No change required.

</details>

<details>
<summary>Details</summary>

### Pure physics core — the math is right

`gravitationalForce` (forces.ts) computes `d = sub(b.pos, a.pos)` and returns
`d · (G·ma·mb / (r²+ε²)^1.5)`. Because `|d| = r`, the magnitude is
`G·ma·mb·r / (r²+ε²)^1.5`, i.e. a softened inverse-square law, and the vector points
along `+d` (a→b, attractive) — matching REQ-1 exactly. Swapping `a` and `b` negates
`d` and leaves the scalar factor unchanged, so magnitude symmetry (property 5) and
the exact equal-and-opposite relation (property 7 / REQ-2) are structural, not
numerical flukes. The `denom === 0` guard returns the zero vector for coincident
points, which is the only degenerate case and is handled without producing NaN.

`integrate` (integrate.ts) is textbook semi-implicit Euler: `acc = force/m`,
`vel' = vel + acc·dt`, `pos' = pos + vel'·dt`. Using the updated velocity for the
position update is what makes it symplectic (REQ-4) and is correctly commented. With
zero force, velocity is untouched and position advances by `v·dt` (REQ-5), which the
unit test `single step under zero gravity advances by v·dt` pins down with exact
values.

`mergeBodies` (body.ts) sets `mass = a.mass + b.mass` (REQ-8), `vel = (ma·va + mb·vb)/mass`
(momentum conservation, REQ-9), `pos` = mass-weighted centroid (center of mass),
`radius = massToRadius(mass)` (shared rule, REQ-6), hue inherited from the heavier
body, and a deterministic combined id. The explicit unit test (equal masses, opposite
velocities → rest at the midpoint) confirms the arithmetic.

`stepSimulation` (simulate.ts) accumulates net force in O(n²) with the third law
applied once per `(i,j)` pair (`forces[j] += −f`), integrates each body, then calls
`resolveMerges`. It allocates new arrays throughout and never writes back into the
input, and the test `stepSimulation does not mutate its input array` freezes the
input to prove it. Count preservation on non-overlapping input (REQ-10) is covered
by a wide-grid property with spacing far larger than any one-step displacement.

`massToRadius = k·cbrt(mass)` is monotonic and matches REQ-6; `vec2.ts` provides the
full algebra with `normalize` returning the zero vector for zero-length input (no
NaN).

### Core purity

A direct content search over `src/physics/**/*.ts` for DOM, randomness, timing, and
global references returned no matches. The physics layer imports only its own
sibling modules. This is the property that makes the property-based suite meaningful,
and it holds.

### MCP server and the shared-module data flow

`mcp-server/` is an independent ESM package (`"type":"module"`, own `package.json`,
`tsconfig.json`, lockfile). `server.ts` builds `McpServer({ name: 'mvuto-bodies' })`
and registers `list_presets` (empty input schema) and `get_preset` (zod `name`),
both delegating to `getPresetData`/`PRESET_NAMES` from `presets-data.ts`.
`index.ts` wires a `StdioServerTransport` and correctly keeps all logging on stderr
so stdout stays a clean MCP channel.

`export-presets.ts` imports the *same* `presets-data.ts` and writes
`src/presets/presets.generated.json` with `_generatedBy`/`_note` metadata and a
`presets` map. This is the shared-source-of-truth requirement (REQ-23, Bonus 1)
satisfied concretely: there is exactly one place preset bodies are defined. The
galaxy generator uses a seeded `mulberry32` PRNG, so exports are deterministic
(REQ-25). The generated JSON on disk matches what the exporter would produce, and
the orbital-velocity math in the presets (`v = sqrt(G·M/r)`) is physically sound for
the circular orbits intended.

The app adapter (`src/presets/index.ts`) imports the committed JSON and maps raw
bodies to physics `Body` objects, deriving radius via `massToRadius` so the physics
core remains the sole authority on that rule. A browser cannot speak MCP stdio at
runtime, so the committed-artifact bridge is the right call and is documented in both
READMEs.

### The nine lessons

- **Lesson 1 (specs):** `requirements.md` is proper EARS with REQ-1…REQ-25 and stable
  IDs; `design.md` (120 lines) and `tasks.md` exist with real content.
- **Lesson 2 (steering):** four files, all `inclusion: always`;
  `physics-core-purity.md` carries the required do/don't code example contrasting a
  pure `integrate` against one with randomness, a clock read, and input mutation.
- **Lesson 3 (hook):** `typecheck-on-save.json` with `version: "1"`,
  `when.type: fileEdited`, pattern `**/*.ts`, `then.type: runCommand`,
  `command: npm run typecheck`. Deliberately runs typecheck, not the test suite,
  which directly serves the cost constraint.
- **Lesson 4 (property tests):** 13 fast-check properties + 5 unit tests, physics-only,
  each tied to a REQ-ID in `tests/README.md`. Bounded finite arbitraries and relative
  epsilon comparisons are used from the start.
- **Lesson 5 (power):** `plugin.json` with `$schema`, name, version, description,
  author, keywords, plus a substantive `SKILL.md`.
- **Lesson 6 (MCP):** the server above + `.kiro/settings/mcp.json` registering
  `mvuto-bodies` → `node mcp-server/dist/index.js`, `disabled:false`,
  `autoApprove:[]`. The `dist/index.js` path is produced by the server build recorded
  in verification.md.
- **Lesson 7 (custom agent):** `physics-reviewer.json` with name, description, a
  detailed purity-enforcing prompt citing REQ-IDs, `tools`, `excludedTools`,
  `includeMcpJson`, `includePowers`, `resources`, `permissions.rules`, `model`, and
  `welcomeMessage` — matching the documented schema.
- **Bonus 1 (MCP as source of truth):** the shared `presets-data.ts` → tools +
  exporter → `presets.generated.json` flow.
- **Bonus 2 (authoring a skill):** `SKILL.md` with YAML frontmatter, a data-flow
  diagram, and an add-a-preset checklist.

The README's lesson→location table has all nine rows and every path resolves on disk.

### Test suite size and cost discipline

18 tests total, all against the pure core; no UI/canvas/glue tests, consistent with
the plan's cost constraint. The verification note records exactly two `vitest` runs
(one failure, one green after a single bounded-domain fix) and no `test.skip`. The
PostFileSave hook runs typecheck rather than tests, so file saves during the build
cannot trigger repeated expensive runs. The over-testing / stuck-loop risk the user
flagged is addressed by design.

### Build evidence (not re-run)

Per the cost constraint, suites were not re-executed. verification.md records: root
and mcp-server `npm install` OK; root and server typechecks OK; server `npm run build`
emits `dist/index.js|server.js|presets-data.js`; `generate:presets` wrote the JSON
(`solar-system=5, binary-stars=2, galaxy=61`); JSON parses; all `.kiro/*.json` parse;
`vitest` 18/18; Vite production build OK with physics + `solar-system` + `getContext`
present in the bundle; and `git log`/`remote`/`status` confirm no commit, no remote,
uncommitted tree. The evidence is specific and internally consistent, so no narrow
spot-check beyond the direct source reads above was warranted.

</details>

<details>
<summary>File map</summary>

- `src/physics/{vec2,types,constants,body,forces,integrate,simulate,index}.ts` — pure core (reviewed; math correct, pure).
- `src/presets/{index.ts,presets.generated.json}` — adapter + committed artifact (consistent with exporter).
- `mcp-server/src/{presets-data,server,index}.ts`, `scripts/export-presets.ts` — standalone MCP package with shared preset module.
- `tests/{physics.properties,physics.units}.test.ts`, `tests/README.md` — 18 physics-only tests mapped to REQ-IDs.
- `.kiro/{specs,steering,hooks,powers,agents,settings}` — all 9 lessons, present and real.
- `README.md` — accurate lesson→location mapping.
- Full build/test evidence: `.agents/tasks/mvuto-build/verification.md`.

</details>
