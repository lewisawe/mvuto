import { describe, test, expect } from 'vitest';

import {
  type Body,
  gravitationalForce,
  integrate,
  mergeBodies,
  massToRadius,
  length,
} from '../src/physics/index.js';
import { MASS_RADIUS_K } from '../src/physics/constants.js';

const body = (
  id: string,
  pos: { x: number; y: number },
  vel: { x: number; y: number },
  mass: number,
): Body => ({ id, pos, vel, mass, radius: massToRadius(mass) });

describe('concrete unit checks', () => {
  test('two-body softened force magnitude matches the closed form', () => {
    // a at origin, b at (10,0). m_a = m_b = 1, G = 1, softening = 0 so this is
    // the clean inverse-square case: |F| = G·m·m / r² = 1/100.
    const a = body('a', { x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    const b = body('b', { x: 10, y: 0 }, { x: 0, y: 0 }, 1);
    const f = gravitationalForce(a, b, 1, 0);
    expect(length(f)).toBeCloseTo(0.01, 10);
    // Direction: straight along +x (a toward b).
    expect(f.x).toBeCloseTo(0.01, 10);
    expect(f.y).toBeCloseTo(0, 12);
  });

  test('softening weakens the force relative to the unsoftened case', () => {
    const a = body('a', { x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    const b = body('b', { x: 2, y: 0 }, { x: 0, y: 0 }, 1);
    const hard = length(gravitationalForce(a, b, 1, 0));
    const soft = length(gravitationalForce(a, b, 1, 4));
    expect(soft).toBeLessThan(hard);
  });

  test('massToRadius follows k·cbrt(mass) and is monotonic', () => {
    expect(massToRadius(8)).toBeCloseTo(MASS_RADIUS_K * 2, 12); // cbrt(8)=2
    expect(massToRadius(27)).toBeCloseTo(MASS_RADIUS_K * 3, 12); // cbrt(27)=3
    expect(massToRadius(1000)).toBeGreaterThan(massToRadius(100));
  });

  test('explicit merge arithmetic (equal masses, opposite velocities)', () => {
    // Two equal masses moving toward each other at the same speed merge to rest
    // at the midpoint.
    const a = body('a', { x: -10, y: 0 }, { x: 2, y: 0 }, 5);
    const b = body('b', { x: 10, y: 0 }, { x: -2, y: 0 }, 5);
    const m = mergeBodies(a, b);
    expect(m.mass).toBe(10);
    expect(m.vel.x).toBeCloseTo(0, 12);
    expect(m.vel.y).toBeCloseTo(0, 12);
    expect(m.pos.x).toBeCloseTo(0, 12);
    expect(m.radius).toBeCloseTo(massToRadius(10), 12);
  });

  test('single step under zero gravity advances by v·dt', () => {
    // With no other body there is no force; integrate advances p by v·dt.
    const a = body('a', { x: 0, y: 0 }, { x: 3, y: -1 }, 10);
    const next = integrate(a, { x: 0, y: 0 }, 2);
    expect(next.pos.x).toBeCloseTo(6, 12); // 0 + 3*2
    expect(next.pos.y).toBeCloseTo(-2, 12); // 0 + (-1)*2
    expect(next.vel.x).toBeCloseTo(3, 12);
    expect(next.vel.y).toBeCloseTo(-1, 12);
  });
});
