/**
 * Static starfield backdrop (REQ-12). Star positions are laid out once by a
 * seeded PRNG so the field is stable from frame to frame (no twinkling jitter),
 * and regenerated only on resize.
 *
 * This is a RENDER-layer concern: it uses randomness (seeded) and the canvas 2D
 * context. The physics core never touches any of this.
 */

interface Star {
  readonly x: number; // in CSS pixels
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
}

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export class Starfield {
  private stars: Star[] = [];
  private width = 0;
  private height = 0;

  /** Regenerate the field for a new CSS-pixel size. */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const rand = mulberry32(0x5713f00d);
    const area = width * height;
    const count = Math.min(1200, Math.max(120, Math.floor(area / 2600)));
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rand() * width,
        y: rand() * height,
        r: rand() * 1.2 + 0.2,
        alpha: rand() * 0.6 + 0.15,
      });
    }
    this.stars = stars;
  }

  /** Draw the backdrop fill plus stars. Expects a context already scaled to CSS
   * pixels (see Renderer's dpr handling). */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#05060d';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    for (const s of this.stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#dfe6ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
