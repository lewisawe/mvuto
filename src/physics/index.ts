/**
 * Public API of the pure physics core.
 *
 * Everything exported here is pure and deterministic: no DOM, no randomness, no
 * globals. This is the surface the browser layers and the test suite depend on.
 */

export type { Vec2 } from './vec2.js';
export {
  vec2,
  ZERO,
  add,
  sub,
  scale,
  length,
  lengthSq,
  dot,
  normalize,
} from './vec2.js';

export type { Body } from './types.js';

export { DEFAULT_G, DEFAULT_SOFTENING, MASS_RADIUS_K } from './constants.js';

export { massToRadius, mergeBodies } from './body.js';
export { gravitationalForce } from './forces.js';
export { integrate } from './integrate.js';
export { stepSimulation } from './simulate.js';
