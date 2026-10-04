# Requirements — Mvuto Physics Sandbox

Requirements are written in EARS form (`WHEN <trigger> THE SYSTEM SHALL <response>`
or `THE SYSTEM SHALL <response>` for invariants). Each has a stable ID so tests
and steering can reference it.

## Physics core (pure, deterministic)

- **REQ-1 — Newtonian attraction.** WHEN two bodies `a` and `b` with positive
  masses exist, THE SYSTEM SHALL compute a gravitational force on `a` due to `b`
  whose magnitude follows an inverse-square law softened by a softening length
  `ε`: `|F| = G·m_a·m_b / (r² + ε²)^{3/2} · r`, and whose direction points from
  `a` toward `b` (attractive).

- **REQ-2 — Newton's third law.** WHEN the force on `a` due to `b` is computed,
  THE SYSTEM SHALL ensure it is equal in magnitude and opposite in direction to
  the force on `b` due to `a` (`F(a,b) = −F(b,a)`).

- **REQ-3 — Force monotonicity.** THE SYSTEM SHALL ensure gravitational force
  magnitude increases monotonically with either mass and decreases monotonically
  as the separation between bodies increases.

- **REQ-4 — Symplectic integration.** WHEN a body is advanced by a timestep `dt`
  under a net force `F`, THE SYSTEM SHALL use semi-implicit (symplectic) Euler:
  `v' = v + (F/m)·dt` then `p' = p + v'·dt`.

- **REQ-5 — Free drift.** WHEN a body is integrated with zero net force, THE
  SYSTEM SHALL leave its velocity unchanged and advance its position by `v·dt`.

- **REQ-6 — Mass→radius rule.** THE SYSTEM SHALL derive a body's radius from its
  mass by `radius = k · cbrt(mass)` (constant density in 3D-mass / 2D-render),
  monotonic increasing in mass.

- **REQ-7 — Merge on overlap.** WHEN two bodies overlap (distance between centers
  `< r_a + r_b`), THE SYSTEM SHALL merge them into a single body.

- **REQ-8 — Mass conservation on merge.** WHEN two bodies merge, THE SYSTEM SHALL
  set the merged mass to the sum of the input masses.

- **REQ-9 — Momentum conservation on merge.** WHEN two bodies merge, THE SYSTEM
  SHALL set the merged velocity so that total linear momentum is conserved:
  `m·v = m_a·v_a + m_b·v_b`.

- **REQ-10 — Step integrity.** WHEN a simulation step runs over a set of bodies
  with no overlapping pairs, THE SYSTEM SHALL return the same number of bodies it
  received, and SHALL NOT mutate the input array.

- **REQ-11 — Vec2 algebra.** THE SYSTEM SHALL provide a 2D vector type with
  addition (commutative, associative), scalar multiplication (distributive over
  addition), length (Euclidean), and normalization (unit length for non-zero
  input, the zero vector for the zero input).

## Rendering & interaction (browser layer)

- **REQ-12 — Starfield backdrop.** WHEN the canvas renders a frame, THE SYSTEM
  SHALL draw a dark-space background with a static (seeded) starfield.

- **REQ-13 — Glowing bodies.** WHEN a body is drawn, THE SYSTEM SHALL render it
  as a glowing disc (radial gradient) sized by its radius.

- **REQ-14 — Speed→hue trails.** WHEN a body moves, THE SYSTEM SHALL draw a
  fading trail whose hue is a function of the body's speed.

- **REQ-15 — High-DPI rendering.** WHEN the device pixel ratio is greater than 1
  or the window resizes, THE SYSTEM SHALL scale the canvas backing store so
  rendering stays crisp.

- **REQ-16 — Slingshot spawn.** WHEN the user presses on the canvas, drags, and
  releases, THE SYSTEM SHALL spawn a new body at the press point with an initial
  velocity proportional to the drag vector.

## Controls (overlay panel)

- **REQ-17 — Play/Pause.** WHEN the user activates the Play/Pause control, THE
  SYSTEM SHALL toggle whether the simulation advances each frame.

- **REQ-18 — Reset.** WHEN the user activates Reset, THE SYSTEM SHALL reload the
  currently selected preset.

- **REQ-19 — Clear.** WHEN the user activates Clear, THE SYSTEM SHALL remove all
  bodies, leaving an empty canvas.

- **REQ-20 — Timestep control.** WHEN the user adjusts the timestep slider, THE
  SYSTEM SHALL scale the per-frame simulation timestep accordingly.

- **REQ-21 — Gravity control.** WHEN the user adjusts the gravity (G) slider, THE
  SYSTEM SHALL use the new value of `G` in subsequent force calculations.

- **REQ-22 — Preset selection.** WHEN the user activates a preset button, THE
  SYSTEM SHALL replace the current bodies with that preset's bodies.

## Presets & MCP (data source of truth)

- **REQ-23 — Shared preset source.** THE SYSTEM SHALL define preset body data in a
  single shared module reused by both the MCP tool handlers and the preset
  exporter, so the live MCP tool and the generated app data cannot diverge.

- **REQ-24 — MCP tools.** THE SYSTEM SHALL expose an MCP server named
  `mvuto-bodies` offering `list_presets` and `get_preset(name)` tools.

- **REQ-25 — Deterministic export.** WHEN the exporter runs, THE SYSTEM SHALL
  write `src/presets/presets.generated.json` deterministically (seeded galaxy
  generator), containing non-empty body arrays for every preset.
