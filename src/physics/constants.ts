/**
 * Default tunables for the simulation. All sim-scaled (not SI units).
 * The UI can override G and the timestep at runtime; these are the defaults.
 */

/** Gravitational constant in sim units (tunable via the G slider). */
export const DEFAULT_G = 1.0;

/**
 * Softening length ε. Prevents the r→0 singularity in the inverse-square law
 * so bodies passing close together don't acquire infinite force.
 */
export const DEFAULT_SOFTENING = 4.0;

/**
 * Mass→radius proportionality constant: `radius = MASS_RADIUS_K · cbrt(mass)`.
 * Models constant density (mass ∝ r³), tuned so sandbox masses render at a
 * pleasant on-screen size.
 */
export const MASS_RADIUS_K = 1.8;
