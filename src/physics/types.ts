import type { Vec2 } from './vec2.js';

/**
 * A simulated celestial body.
 *
 * Immutable: simulation steps return new bodies rather than mutating existing
 * ones. `radius` is always derived from `mass` via the mass→radius rule
 * (see {@link ./body.ts massToRadius}).
 */
export interface Body {
  readonly id: string;
  readonly pos: Vec2;
  readonly vel: Vec2;
  /** Strictly positive. */
  readonly mass: number;
  /** Derived from mass; kept on the body so render/collision avoid recompute. */
  readonly radius: number;
  /** Optional base hue hint (0–360) for presets; render may override. */
  readonly hue?: number;
}
