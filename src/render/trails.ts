/**
 * Per-body motion trails with a speed→hue mapping (REQ-14).
 *
 * The trail store keeps a short ring buffer of recent positions per body id.
 * Trails are a RENDER-layer concern; this module reads body state and never
 * advances the simulation.
 */
import type { Body } from '../physics/index.js';
import { length } from '../physics/index.js';

const MAX_POINTS = 24;

/**
 * Map a body speed to a hue (REQ-14): slow = cool blue (~220°), fast = hot
 * magenta (~320°). The mapping saturates past `fastSpeed` so colors stay in a
 * pleasant band.
 */
export const speedToHue = (speed: number, fastSpeed = 12): number => {
  const t = Math.min(1, speed / fastSpeed);
  return 220 + t * 100; // 220° → 320°
};

export class TrailStore {
  private trails = new Map<string, { x: number; y: number }[]>();

  /** Record the current position of each live body; drop trails for bodies that
   * no longer exist (e.g. after a merge). */
  update(bodies: readonly Body[]): void {
    const live = new Set<string>();
    for (const b of bodies) {
      live.add(b.id);
      let pts = this.trails.get(b.id);
      if (!pts) {
        pts = [];
        this.trails.set(b.id, pts);
      }
      pts.push({ x: b.pos.x, y: b.pos.y });
      if (pts.length > MAX_POINTS) pts.shift();
    }
    for (const id of this.trails.keys()) {
      if (!live.has(id)) this.trails.delete(id);
    }
  }

  /** Draw each body's trail. `toScreen` converts world→screen (CSS px). */
  draw(
    ctx: CanvasRenderingContext2D,
    bodies: readonly Body[],
    toScreen: (x: number, y: number) => { x: number; y: number },
  ): void {
    ctx.save();
    ctx.lineCap = 'round';
    for (const b of bodies) {
      const pts = this.trails.get(b.id);
      if (!pts || pts.length < 2) continue;
      const hue = speedToHue(length(b.vel));
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1]!;
        const p1 = pts[i]!;
        const a = toScreen(p0.x, p0.y);
        const c = toScreen(p1.x, p1.y);
        const frac = i / pts.length; // older → smaller
        ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${frac * 0.5})`;
        ctx.lineWidth = frac * Math.max(1, b.radius * 0.4);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** Forget all trails (used on Clear/Reset). */
  clear(): void {
    this.trails.clear();
  }
}
