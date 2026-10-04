/**
 * Canvas renderer (REQ-13, REQ-15). Composites the frame in order:
 * starfield → trails → glowing bodies.
 *
 * RENDER-layer only: it reads `Body` state and draws. It never runs physics.
 * The world coordinate system is centered on the canvas (origin at center),
 * matching how presets are authored around (0,0).
 */
import type { Body } from '../physics/index.js';
import { length } from '../physics/index.js';
import { Starfield } from './starfield.js';
import { TrailStore, speedToHue } from './trails.js';

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly starfield = new Starfield();
  private readonly trails = new TrailStore();
  private cssWidth = 0;
  private cssHeight = 0;
  private dpr = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  /** Match the backing store to CSS size × devicePixelRatio for crisp output
   * (REQ-15). Call on construction and on window resize. */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(rect.width || window.innerWidth));
    const cssHeight = Math.max(1, Math.floor(rect.height || window.innerHeight));
    this.dpr = window.devicePixelRatio || 1;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.canvas.width = Math.floor(cssWidth * this.dpr);
    this.canvas.height = Math.floor(cssHeight * this.dpr);
    // Draw in CSS pixels; the context scale absorbs the dpr.
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.starfield.resize(cssWidth, cssHeight);
  }

  /** World→screen: origin at canvas center, +y down (screen convention). */
  private toScreen = (x: number, y: number): { x: number; y: number } => ({
    x: x + this.cssWidth / 2,
    y: y + this.cssHeight / 2,
  });

  /** Record trail samples. Call once per simulation advance (not per redraw)
   * so trail spacing reflects motion, not frame rate. */
  sampleTrails(bodies: readonly Body[]): void {
    this.trails.update(bodies);
  }

  /** Clear trail history (on Clear/Reset). */
  clearTrails(): void {
    this.trails.clear();
  }

  /** Composite one frame. */
  render(bodies: readonly Body[]): void {
    const ctx = this.ctx;
    this.starfield.draw(ctx);
    this.trails.draw(ctx, bodies, this.toScreen);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // additive glow
    for (const b of bodies) {
      const s = this.toScreen(b.pos.x, b.pos.y);
      const hue = b.hue ?? speedToHue(length(b.vel));
      const r = Math.max(1.5, b.radius);
      const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 3);
      glow.addColorStop(0, `hsla(${hue}, 95%, 70%, 0.95)`);
      glow.addColorStop(0.3, `hsla(${hue}, 90%, 60%, 0.55)`);
      glow.addColorStop(1, `hsla(${hue}, 90%, 50%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * 3, 0, Math.PI * 2);
      ctx.fill();

      // Bright core.
      ctx.fillStyle = `hsla(${hue}, 100%, 92%, 1)`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  get width(): number {
    return this.cssWidth;
  }

  get height(): number {
    return this.cssHeight;
  }
}
