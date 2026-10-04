/**
 * 2D vector algebra for the pure physics core.
 *
 * Every function is pure: it returns a new {@link Vec2} and never mutates its
 * arguments. No DOM, no randomness, no globals (see steering: physics-core-purity).
 */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Construct a vector. */
export const vec2 = (x: number, y: number): Vec2 => ({ x, y });

/** The zero vector. */
export const ZERO: Vec2 = { x: 0, y: 0 };

/** Vector addition. */
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

/** Vector subtraction (a − b). */
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

/** Scalar multiplication. */
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });

/** Euclidean length (uses hypot for numerical stability). */
export const length = (a: Vec2): number => Math.hypot(a.x, a.y);

/** Squared length (cheaper when the actual length is not needed). */
export const lengthSq = (a: Vec2): number => a.x * a.x + a.y * a.y;

/** Dot product. */
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

/**
 * Unit vector in the direction of `a`.
 * Returns the zero vector for a zero-length input (no NaN).
 */
export const normalize = (a: Vec2): Vec2 => {
  const len = length(a);
  if (len === 0) return ZERO;
  return { x: a.x / len, y: a.y / len };
};
