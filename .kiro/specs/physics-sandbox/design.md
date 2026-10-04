# Design — Mvuto Physics Sandbox

## Overview

Mvuto ("attraction" / "pull" in Swahili) is a browser-based Newtonian gravity
sandbox. The user flings glowing bodies into a dark-space canvas and watches them
attract one another, settle into orbits, and merge on collision.

The architecture draws a hard line between a **pure, deterministic physics core**
and everything that touches the browser. The core is the thing we property-test;
the browser layers are thin glue.

## Layer map

```
┌─────────────────────────────────────────────────────────────┐
│ src/app/        entry + glue (DOM, rAF loop, input, controls) │
│   main.ts  loop.ts  state.ts  input.ts  controls.ts  styles   │
├─────────────────────────────────────────────────────────────┤
│ src/render/     canvas drawing (no physics math)              │
│   renderer.ts  starfield.ts  trails.ts                        │
├─────────────────────────────────────────────────────────────┤
│ src/presets/    preset adapter (reads generated JSON)         │
│   index.ts  presets.generated.json                            │
├─────────────────────────────────────────────────────────────┤
│ src/physics/    PURE CORE — no DOM, no random, no globals     │
│   vec2  types  constants  body  forces  integrate  simulate   │
└─────────────────────────────────────────────────────────────┘
```

Dependencies point downward only. `src/physics/` imports nothing from the layers
above it and nothing from the DOM.

## Pure core design

- **Immutability.** `Vec2` and `Body` are `readonly`. Every operation returns a
  new value; nothing is mutated in place. This makes property testing trivial and
  removes a whole class of aliasing bugs. (REQ-10 forbids mutating the input.)
- **Determinism.** The core never calls `Math.random`, never reads the clock, and
  has no module-level mutable state. Given the same inputs it returns the same
  outputs — the precondition for fast-check property tests (Lesson 4).
- **Force model (REQ-1, REQ-2, REQ-3).** Softened inverse-square gravity:
  `F = G·m_a·m_b·(p_b − p_a) / (r² + ε²)^{3/2}`. The softening length `ε` removes
  the `r → 0` singularity so two bodies passing close don't fling to infinity.
- **Integration (REQ-4, REQ-5).** Semi-implicit (symplectic) Euler: update
  velocity from the force first, then update position with the *new* velocity.
  Symplectic integrators conserve energy far better than explicit Euler over long
  runs, which keeps orbits stable instead of spiraling out.
- **Merge model (REQ-7, REQ-8, REQ-9).** When centers are closer than the sum of
  radii, two bodies become one: mass sums, velocity is the momentum-weighted
  average, position is the mass-weighted centroid, and the new radius comes from
  the shared `massToRadius` rule (REQ-6).

## Simulation step

`stepSimulation(bodies, G, dt, softening)`:

1. **Accumulate** net force on each body as the vector sum of pairwise
   gravitational forces from every other body. O(n²); fine for sandbox counts.
2. **Integrate** each body one symplectic Euler step.
3. **Resolve merges** by scanning for overlapping pairs and merging them
   (union-find-free, single pass; a merged body can cascade on the next frame).

Returns a brand-new array. The input is never mutated (REQ-10).

## Render layer

- **No physics.** The renderer reads `Body` positions/velocities and draws; it
  never advances the simulation. Speed used for hue is read-only (REQ-14).
- **High-DPI (REQ-15).** The canvas backing store is sized to
  `cssSize · devicePixelRatio`; the 2D context is scaled by the ratio so one unit
  equals one CSS pixel.
- **Starfield (REQ-12).** A seeded PRNG lays out stars once; redrawing is cheap
  and stable across frames (no twinkling jitter from frame to frame).
- **Trails (REQ-14).** Each body keeps a short ring buffer of recent positions;
  the trail is stroked with a hue derived from current speed (slow = cool blue,
  fast = hot magenta) and fades along its length.

## MCP preset data flow (Lesson 6)

The browser cannot speak MCP stdio at runtime, so presets reach the app through a
**build-time export**, while the same data is also served live over MCP:

```
            mcp-server/src/presets-data.ts   (SHARED source of truth, REQ-23)
                     │                    │
        ┌────────────┘                    └─────────────┐
        ▼                                                ▼
 MCP tool handlers (server.ts)                 export-presets.ts (script)
  list_presets / get_preset  ◀── MCP client     writes JSON ──▶ src/presets/
  (REQ-24, live over stdio)                      presets.generated.json (REQ-25)
                                                        │
                                                        ▼
                                               src/presets/index.ts
                                               listPresets() / getPreset()
                                                        │
                                                        ▼
                                                  the browser app
```

Because both paths import the *same* module, the live MCP tool and the generated
JSON cannot drift apart. The galaxy preset uses a seeded generator so the exported
JSON is reproducible (REQ-25).

## Preset scaling

Presets are **sim-scaled**, not SI units. Masses, distances, and velocities are
chosen so interesting dynamics happen on-screen within a few seconds, while
preserving the *relative* structure of each system (a dominant central mass for
the solar system, two comparable masses for the binary, a heavy core plus many
light satellites for the galaxy).

## Testing strategy (Lesson 4)

Property tests target only `src/physics/` and encode the requirements above:
commutativity/associativity of vector add, force symmetry and Newton's third law,
integration under zero force, mass/momentum conservation on merge, and body-count
integrity of a step. A few concrete unit tests pin exact numeric values. UI,
canvas, and glue are deliberately **not** unit-tested — they are verified by a
clean production build plus manual browser inspection.
