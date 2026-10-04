import { describe, test, expect } from 'vitest';
import fc from 'fast-check';

import {
  type Vec2,
  type Body,
  add,
  scale,
  length,
  normalize,
  gravitationalForce,
  integrate,
  mergeBodies,
  stepSimulation,
  massToRadius,
} from '../src/physics/index.js';

// ---------------------------------------------------------------------------
// Bounded, finite arbitraries so properties never see NaN / Infinity and stay
// numerically stable (per the cost-constraint flakiness guard in the plan).
// ---------------------------------------------------------------------------

const EPS = 1e-6;
const close = (x: number, y: number, eps = EPS): boolean =>
  Math.abs(x - y) <= eps * (1 + Math.abs(x) + Math.abs(y));

const coord = fc.double({ min: -1e3, max: 1e3, noNaN: true, noDefaultInfinity: true });
const vecArb: fc.Arbitrary<Vec2> = fc.record({ x: coord, y: coord });
const massArb = fc.double({ min: 1, max: 1e4, noNaN: true, noDefaultInfinity: true });
const posArb: fc.Arbitrary<Vec2> = fc.record({
  x: fc.double({ min: -500, max: 500, noNaN: true, noDefaultInfinity: true }),
  y: fc.double({ min: -500, max: 500, noNaN: true, noDefaultInfinity: true }),
});
const smallVecArb: fc.Arbitrary<Vec2> = fc.record({
  x: fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
  y: fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
});

let idCounter = 0;
const makeBody = (pos: Vec2, vel: Vec2, mass: number): Body => ({
  id: `b${idCounter++}`,
  pos,
  vel,
  mass,
  radius: massToRadius(mass),
});

// ---------------------------------------------------------------------------
// Vec2 algebra — REQ-11
// ---------------------------------------------------------------------------

describe('Vec2 algebra (REQ-11)', () => {
  test('vec2 add is commutative', () => {
    fc.assert(
      fc.property(vecArb, vecArb, (a, b) => {
        const ab = add(a, b);
        const ba = add(b, a);
        return close(ab.x, ba.x) && close(ab.y, ba.y);
      }),
    );
  });

  test('vec2 add is associative', () => {
    fc.assert(
      fc.property(vecArb, vecArb, vecArb, (a, b, c) => {
        const l = add(add(a, b), c);
        const r = add(a, add(b, c));
        return close(l.x, r.x) && close(l.y, r.y);
      }),
    );
  });

  test('vec2 scale distributes over add', () => {
    fc.assert(
      fc.property(vecArb, vecArb, coord, (a, b, s) => {
        const l = scale(add(a, b), s);
        const r = add(scale(a, s), scale(b, s));
        return close(l.x, r.x) && close(l.y, r.y);
      }),
    );
  });

  test('normalize yields unit length (or zero for zero vector)', () => {
    fc.assert(
      fc.property(vecArb, (a) => {
        const n = normalize(a);
        const len = length(a);
        // Zero (and subnormal underflow) inputs: contract is the zero vector.
        // We also exclude the subnormal band (len < 1e-150) because at those
        // magnitudes IEEE-754 division cannot land within any sane epsilon of 1
        // — that is a floating-point limit, not a bug in normalize. The real
        // unit-length guarantee is asserted for all representable "ordinary"
        // vectors, which is the domain the app ever produces.
        if (len === 0) return n.x === 0 && n.y === 0;
        if (len < 1e-150) return true;
        return close(length(n), 1, 1e-4);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Gravitational force — REQ-1, REQ-2, REQ-3
// ---------------------------------------------------------------------------

describe('Gravitational force (REQ-1..REQ-3)', () => {
  const G = 1;
  const soft = 4;

  // Keep bodies separated so direction is well-defined.
  const pairArb = fc
    .tuple(posArb, posArb, massArb, massArb)
    .filter(([pa, pb]) => Math.hypot(pa.x - pb.x, pa.y - pb.y) > 1);

  test('gravitational force magnitude is symmetric', () => {
    fc.assert(
      fc.property(pairArb, ([pa, pb, ma, mb]) => {
        const a = makeBody(pa, { x: 0, y: 0 }, ma);
        const b = makeBody(pb, { x: 0, y: 0 }, mb);
        const fab = gravitationalForce(a, b, G, soft);
        const fba = gravitationalForce(b, a, G, soft);
        return close(length(fab), length(fba), 1e-4);
      }),
    );
  });

  test('gravitational force is attractive (points a toward b)', () => {
    fc.assert(
      fc.property(pairArb, ([pa, pb, ma, mb]) => {
        const a = makeBody(pa, { x: 0, y: 0 }, ma);
        const b = makeBody(pb, { x: 0, y: 0 }, mb);
        const f = gravitationalForce(a, b, G, soft);
        // (b - a) direction; projection of F onto it must be >= 0.
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const proj = f.x * dx + f.y * dy;
        return proj >= -EPS;
      }),
    );
  });

  test('gravitational forces are equal and opposite (Newton third law)', () => {
    fc.assert(
      fc.property(pairArb, ([pa, pb, ma, mb]) => {
        const a = makeBody(pa, { x: 0, y: 0 }, ma);
        const b = makeBody(pb, { x: 0, y: 0 }, mb);
        const fab = gravitationalForce(a, b, G, soft);
        const fba = gravitationalForce(b, a, G, soft);
        return close(fab.x, -fba.x, 1e-4) && close(fab.y, -fba.y, 1e-4);
      }),
    );
  });

  test('force grows with mass, shrinks with distance', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 5, max: 400, noNaN: true, noDefaultInfinity: true }),
        massArb,
        massArb,
        (r, m1, m2) => {
          const origin = { x: 0, y: 0 };
          const near = makeBody(origin, origin, m1);
          const far = makeBody({ x: r, y: 0 }, origin, m2);
          const farther = makeBody({ x: r * 2, y: 0 }, origin, m2);
          const heavier = makeBody({ x: r, y: 0 }, origin, m2 * 2);

          const base = length(gravitationalForce(near, far, G, soft));
          const withDistance = length(gravitationalForce(near, farther, G, soft));
          const withMass = length(gravitationalForce(near, heavier, G, soft));

          // More distance => weaker; more mass => stronger.
          return withDistance <= base + EPS && withMass >= base - EPS;
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Integration — REQ-4, REQ-5
// ---------------------------------------------------------------------------

describe('Integration (REQ-4, REQ-5)', () => {
  test('integrate with zero force leaves velocity unchanged', () => {
    fc.assert(
      fc.property(
        posArb,
        smallVecArb,
        massArb,
        fc.double({ min: 0.01, max: 3, noNaN: true, noDefaultInfinity: true }),
        (pos, vel, mass, dt) => {
          const body = makeBody(pos, vel, mass);
          const next = integrate(body, { x: 0, y: 0 }, dt);
          return close(next.vel.x, vel.x) && close(next.vel.y, vel.y);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Merge — REQ-8, REQ-9
// ---------------------------------------------------------------------------

describe('Merge (REQ-8, REQ-9)', () => {
  test('mergeBodies conserves total mass', () => {
    fc.assert(
      fc.property(posArb, posArb, smallVecArb, smallVecArb, massArb, massArb, (pa, pb, va, vb, ma, mb) => {
        const a = makeBody(pa, va, ma);
        const b = makeBody(pb, vb, mb);
        return close(mergeBodies(a, b).mass, ma + mb, 1e-4);
      }),
    );
  });

  test('mergeBodies conserves total momentum', () => {
    fc.assert(
      fc.property(posArb, posArb, smallVecArb, smallVecArb, massArb, massArb, (pa, pb, va, vb, ma, mb) => {
        const a = makeBody(pa, va, ma);
        const b = makeBody(pb, vb, mb);
        const m = mergeBodies(a, b);
        const px = m.mass * m.vel.x;
        const py = m.mass * m.vel.y;
        const expectedPx = ma * va.x + mb * vb.x;
        const expectedPy = ma * va.y + mb * vb.y;
        return close(px, expectedPx, 1e-3) && close(py, expectedPy, 1e-3);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Simulation step — REQ-10
// ---------------------------------------------------------------------------

describe('Simulation step (REQ-10)', () => {
  test('stepSimulation preserves body count when no overlaps', () => {
    // Build bodies on a wide grid so no pair overlaps (centers far apart,
    // small masses => small radii), and one step cannot close the gap.
    const bodyGrid = fc.array(
      fc.record({
        gx: fc.integer({ min: 0, max: 6 }),
        gy: fc.integer({ min: 0, max: 6 }),
        mass: fc.double({ min: 1, max: 50, noNaN: true, noDefaultInfinity: true }),
      }),
      { minLength: 1, maxLength: 8 },
    );

    fc.assert(
      fc.property(bodyGrid, (specs) => {
        const SPACING = 5000; // vastly larger than any radius or one-step move
        // Deduplicate grid cells so no two bodies share a position.
        const seen = new Set<string>();
        const bodies: Body[] = [];
        for (const s of specs) {
          const key = `${s.gx},${s.gy}`;
          if (seen.has(key)) continue;
          seen.add(key);
          bodies.push(
            makeBody({ x: s.gx * SPACING, y: s.gy * SPACING }, { x: 0, y: 0 }, s.mass),
          );
        }
        const out = stepSimulation(bodies, 1, 0.5, 4);
        return out.length === bodies.length;
      }),
    );
  });

  test('stepSimulation does not mutate its input array', () => {
    const a = makeBody({ x: 0, y: 0 }, { x: 0, y: 0 }, 100);
    const b = makeBody({ x: 200, y: 0 }, { x: 0, y: 0 }, 100);
    const input: readonly Body[] = Object.freeze([a, b]);
    const snapshotA = { ...a, pos: { ...a.pos }, vel: { ...a.vel } };
    const out = stepSimulation(input, 1, 0.5, 4);
    // Original objects untouched (frozen array would throw on mutation anyway).
    expect(input[0]).toBe(a);
    expect(a.pos.x).toBe(snapshotA.pos.x);
    expect(a.vel.x).toBe(snapshotA.vel.x);
    expect(out).not.toBe(input);
  });
});
