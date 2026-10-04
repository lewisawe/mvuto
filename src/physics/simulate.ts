import type { Body } from './types.js';
import { type Vec2, add } from './vec2.js';
import { gravitationalForce } from './forces.js';
import { integrate } from './integrate.js';
import { mergeBodies } from './body.js';

/**
 * Advance the whole simulation one step (REQ-7, REQ-10):
 *
 *   1. Accumulate the net gravitational force on each body (sum over others).
 *   2. Integrate each body one symplectic Euler step.
 *   3. Resolve merges: any overlapping pair (|p_i − p_j| < r_i + r_j) is merged.
 *
 * Pure: returns a brand-new array and never mutates the input (REQ-10). The body
 * count is preserved except where merges reduce it.
 */
export const stepSimulation = (
  bodies: readonly Body[],
  G: number,
  dt: number,
  softening: number,
): Body[] => {
  const n = bodies.length;

  // 1. Accumulate net forces (O(n²), fine for sandbox counts).
  const forces: Vec2[] = new Array(n);
  for (let i = 0; i < n; i++) forces[i] = { x: 0, y: 0 };

  for (let i = 0; i < n; i++) {
    const a = bodies[i]!;
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j]!;
      const f = gravitationalForce(a, b, G, softening);
      forces[i] = add(forces[i]!, f);
      // Newton's third law: force on b is the negation.
      forces[j] = add(forces[j]!, { x: -f.x, y: -f.y });
    }
  }

  // 2. Integrate.
  const moved: Body[] = new Array(n);
  for (let i = 0; i < n; i++) {
    moved[i] = integrate(bodies[i]!, forces[i]!, dt);
  }

  // 3. Resolve merges. Single pass; a merged body can cascade next frame.
  return resolveMerges(moved);
};

/**
 * Merge every overlapping pair. Bodies already consumed by a merge are skipped.
 * A fresh array is returned.
 */
const resolveMerges = (bodies: readonly Body[]): Body[] => {
  const n = bodies.length;
  const consumed = new Array<boolean>(n).fill(false);
  const result: Body[] = [];

  for (let i = 0; i < n; i++) {
    if (consumed[i]) continue;
    let current = bodies[i]!;
    for (let j = i + 1; j < n; j++) {
      if (consumed[j]) continue;
      const other = bodies[j]!;
      const dx = current.pos.x - other.pos.x;
      const dy = current.pos.y - other.pos.y;
      const distSq = dx * dx + dy * dy;
      const touch = current.radius + other.radius;
      if (distSq < touch * touch) {
        current = mergeBodies(current, other);
        consumed[j] = true;
      }
    }
    result.push(current);
  }

  return result;
};
