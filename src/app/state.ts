/**
 * Mutable app/sim state container. Thin: it holds the current bodies and the
 * tunables, and delegates all physics to the pure core via the loop. No physics
 * math lives here.
 */
import type { Body } from '../physics/index.js';
import { DEFAULT_G, DEFAULT_SOFTENING } from '../physics/index.js';
import { getPreset, DEFAULT_PRESET } from '../presets/index.js';

export class SimState {
  bodies: Body[] = [];
  G = DEFAULT_G;
  softening = DEFAULT_SOFTENING;
  /** Multiplier applied to the base per-substep dt (driven by the UI slider). */
  dtScale = 1;
  running = true;
  currentPreset = DEFAULT_PRESET;

  /** Load a named preset, replacing the current bodies. */
  loadPreset(name: string): void {
    this.currentPreset = name;
    this.bodies = getPreset(name);
  }

  /** Reload the current preset (Reset). */
  reset(): void {
    this.loadPreset(this.currentPreset);
  }

  /** Remove all bodies (Clear). */
  clear(): void {
    this.bodies = [];
  }

  addBody(body: Body): void {
    this.bodies = [...this.bodies, body];
  }
}
