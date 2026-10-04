import type { Body } from './types.js';
import { MASS_RADIUS_K } from './constants.js';
import { add, scale } from './vec2.js';

/**
 * Derive a body's radius from its mass: `k · cbrt(mass)` (constant density).
 * Monotonic increasing in mass (REQ-6).
 */
export const massToRadius = (mass: number): number =>
  MASS_RADIUS_K * Math.cbrt(mass);

/**
 * Merge two overlapping bodies into one (REQ-7, REQ-8, REQ-9).
 *
 * - mass:   a.mass + b.mass                       (mass conservation)
 * - vel:    (a.m·a.v + b.m·b.v) / mass            (momentum conservation)
 * - pos:    mass-weighted centroid                (center of mass)
 * - radius: massToRadius(mass)                    (shared rule, REQ-6)
 * - hue:    inherited from the heavier body
 * - id:     deterministic combination of the two ids
 */
export const mergeBodies = (a: Body, b: Body): Body => {
  const mass = a.mass + b.mass;
  const momentum = add(scale(a.vel, a.mass), scale(b.vel, b.mass));
  const weightedPos = add(scale(a.pos, a.mass), scale(b.pos, b.mass));
  return {
    id: `${a.id}+${b.id}`,
    mass,
    vel: scale(momentum, 1 / mass),
    pos: scale(weightedPos, 1 / mass),
    radius: massToRadius(mass),
    hue: a.mass >= b.mass ? a.hue : b.hue,
  };
};
