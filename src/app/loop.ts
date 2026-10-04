/**
 * requestAnimationFrame main loop. On each frame, when running, it advances the
 * pure simulation a fixed number of substeps and hands the result to the
 * renderer. All physics stays in the pure core; this file is pure glue.
 */
import { stepSimulation } from '../physics/index.js';
import type { Renderer } from '../render/renderer.js';
import type { SimState } from './state.js';

/** Base timestep per substep (sim units). The UI's dtScale multiplies this. */
const BASE_DT = 0.4;
/** Substeps per frame: smaller steps keep orbits stable at higher dtScale. */
const SUBSTEPS = 2;

export class Loop {
  private rafId = 0;
  private running = false;

  constructor(
    private readonly state: SimState,
    private readonly renderer: Renderer,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    const frame = (): void => {
      if (!this.running) return;
      this.tick();
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private tick(): void {
    const { state, renderer } = this;
    if (state.running) {
      const dt = BASE_DT * state.dtScale;
      for (let i = 0; i < SUBSTEPS; i++) {
        state.bodies = stepSimulation(state.bodies, state.G, dt, state.softening);
      }
      renderer.sampleTrails(state.bodies);
    }
    renderer.render(state.bodies);
  }
}
