import type { Body } from './types.js';
import { type Vec2, add, scale } from './vec2.js';

/**
 * Advance a body one timestep using semi-implicit (symplectic) Euler
 * (REQ-4, REQ-5):
 *
 *   v' = v + (F / m) · dt
 *   p' = p + v' · dt      ← uses the UPDATED velocity (that's what makes it
 *                            symplectic and keeps orbits stable)
 *
 * Returns a new body; the input is not mutated. Mass, radius, hue, and id carry
 * over unchanged.
 */
export const integrate = (body: Body, force: Vec2, dt: number): Body => {
  const acc = scale(force, 1 / body.mass);
  const vel = add(body.vel, scale(acc, dt));
  const pos = add(body.pos, scale(vel, dt));
  return { ...body, vel, pos };
};
