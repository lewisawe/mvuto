---
inclusion: always
---

# Physics core must stay pure

Everything under `src/physics/` is the **pure, deterministic core**. It is the
only part of the app we property-test, and the tests only work because the core
has no hidden inputs.

## Rules for `src/physics/`

- **No DOM.** No `document`, `window`, `canvas`, or any browser API.
- **No randomness.** No `Math.random`. Randomness (starfield, galaxy jitter)
  lives in the render and preset layers, seeded where reproducibility matters.
- **No time / no I/O.** No `Date.now`, `performance.now`, timers, fetch, or file
  system.
- **No module-level mutable state.** No singletons, caches, or counters that
  change between calls. Same inputs → same outputs, always.
- **No mutation of inputs.** Operations return new `Vec2`/`Body` values. The
  input arrays and objects of `stepSimulation` must be left untouched (REQ-10).

## Do / Don't

```ts
// ✅ DO — pure: returns a new value, deterministic, no side effects.
export const integrate = (body: Body, force: Vec2, dt: number): Body => {
  const acc = scale(force, 1 / body.mass);
  const vel = add(body.vel, scale(acc, dt));
  const pos = add(body.pos, scale(vel, dt));
  return { ...body, vel, pos };
};

// ❌ DON'T — hidden inputs (random, clock) and in-place mutation.
export const integrateBad = (body: Body): Body => {
  const jitter = Math.random() * 0.1;          // non-deterministic
  const dt = (Date.now() % 16) / 16;            // reads the clock
  (body.pos as { x: number }).x += body.vel.x;  // mutates the input
  return body;
};
```

If a feature needs randomness, the DOM, or the clock, it belongs in
`src/render/`, `src/app/`, or `src/presets/` — not here. A custom review agent
(`.kiro/agents/physics-reviewer.json`) enforces this boundary.
