# Tests — Mvuto physics core

The suite targets **only** `src/physics/` — the pure, deterministic core. UI,
canvas, and glue are intentionally not unit-tested (see the design doc's testing
strategy and the project's cost constraint); they are covered by a clean
production build plus manual browser inspection.

This is where **Lesson 4 (property-based testing with fast-check)** connects back
to **Lesson 1 (the spec)**: every property encodes a requirement from
`.kiro/specs/physics-sandbox/requirements.md`.

## Property tests → requirement IDs

`tests/physics.properties.test.ts`:

| Property test | Requirement |
|---|---|
| vec2 add is commutative | REQ-11 |
| vec2 add is associative | REQ-11 |
| vec2 scale distributes over add | REQ-11 |
| normalize yields unit length (or zero for zero vector) | REQ-11 |
| gravitational force magnitude is symmetric | REQ-1 |
| gravitational force is attractive (points a toward b) | REQ-1 |
| gravitational forces are equal and opposite (Newton third law) | REQ-2 |
| force grows with mass, shrinks with distance | REQ-3 |
| integrate with zero force leaves velocity unchanged | REQ-5 |
| mergeBodies conserves total mass | REQ-8 |
| mergeBodies conserves total momentum | REQ-9 |
| stepSimulation preserves body count when no overlaps | REQ-10 |
| stepSimulation does not mutate its input array | REQ-10 |

## Unit tests → requirement IDs

`tests/physics.units.test.ts`:

| Unit test | Requirement |
|---|---|
| two-body softened force magnitude matches the closed form | REQ-1 |
| softening weakens the force relative to the unsoftened case | REQ-1 |
| massToRadius follows k·cbrt(mass) and is monotonic | REQ-6 |
| explicit merge arithmetic (equal masses, opposite velocities) | REQ-8, REQ-9 |
| single step under zero gravity advances by v·dt | REQ-4, REQ-5 |

## Running

```bash
npm test        # vitest run (one-shot)
```

All arbitraries are bounded and finite (`noNaN`, `noDefaultInfinity`) and
comparisons use a relative epsilon, so the properties are stable rather than
flaky.
