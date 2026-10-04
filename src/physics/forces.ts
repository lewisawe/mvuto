import type { Body } from './types.js';
import { type Vec2, sub } from './vec2.js';

/**
 * Softened Newtonian gravitational force ON `a` DUE TO `b` (REQ-1, REQ-2, REQ-3).
 *
 *   F = G · m_a · m_b · (p_b − p_a) / (r² + ε²)^{3/2}
 *
 * The vector points from `a` toward `b` (attractive). The softening length ε
 * removes the r→0 singularity. Returns the zero vector when both bodies occupy
 * the exact same point (direction undefined).
 */
export const gravitationalForce = (
  a: Body,
  b: Body,
  G: number,
  softening: number,
): Vec2 => {
  const d = sub(b.pos, a.pos); // a → b
  const r2 = d.x * d.x + d.y * d.y;
  const soft2 = softening * softening;
  const denom = Math.pow(r2 + soft2, 1.5);
  if (denom === 0) return { x: 0, y: 0 };
  const magOverR = (G * a.mass * b.mass) / denom;
  return { x: d.x * magOverR, y: d.y * magOverR };
};
