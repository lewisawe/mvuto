/**
 * Pointer input: press → drag → release spawns a new body at the press point
 * with an initial velocity proportional to the drag vector (slingshot, REQ-16).
 *
 * The only math here is scaling a screen-space drag into a world velocity. No
 * gravity, no integration — that is the pure core's job.
 */
import type { Body } from '../physics/index.js';
import { massToRadius } from '../physics/index.js';

/** Mass of a slingshot-spawned body (sim units). */
const SPAWN_MASS = 120;
/** Drag pixels → velocity scale. Larger = flick harder. */
const VELOCITY_SCALE = 0.06;

interface Drag {
  startX: number; // world coords
  startY: number;
  curX: number;
  curY: number;
}

export interface InputCallbacks {
  /** Called on release with a fully-formed Body ready to add to the sim. */
  onSpawn: (body: Body) => void;
  /** Called during drag so the UI can draw an aiming line (screen coords). */
  onDragUpdate?: (drag: { startX: number; startY: number; curX: number; curY: number } | null) => void;
}

let spawnCounter = 0;

/**
 * Attach slingshot handlers to a canvas. `screenToWorld` converts a client
 * (CSS px) point into the renderer's world coordinates (origin at center).
 */
export const attachInput = (
  canvas: HTMLCanvasElement,
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number },
  callbacks: InputCallbacks,
): void => {
  let drag: Drag | null = null;

  const begin = (clientX: number, clientY: number): void => {
    const w = screenToWorld(clientX, clientY);
    drag = { startX: w.x, startY: w.y, curX: w.x, curY: w.y };
    callbacks.onDragUpdate?.({ ...drag });
  };

  const move = (clientX: number, clientY: number): void => {
    if (!drag) return;
    const w = screenToWorld(clientX, clientY);
    drag.curX = w.x;
    drag.curY = w.y;
    callbacks.onDragUpdate?.({ ...drag });
  };

  const end = (): void => {
    if (!drag) return;
    // Release vector points from the current position back to the start, so you
    // "pull back" and the body flings forward (classic slingshot).
    const vx = (drag.startX - drag.curX) * VELOCITY_SCALE;
    const vy = (drag.startY - drag.curY) * VELOCITY_SCALE;
    const body: Body = {
      id: `spawn-${spawnCounter++}`,
      pos: { x: drag.startX, y: drag.startY },
      vel: { x: vx, y: vy },
      mass: SPAWN_MASS,
      radius: massToRadius(SPAWN_MASS),
      hue: 50,
    };
    callbacks.onSpawn(body);
    drag = null;
    callbacks.onDragUpdate?.(null);
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    begin(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', () => end());
  canvas.addEventListener('pointercancel', () => {
    drag = null;
    callbacks.onDragUpdate?.(null);
  });
};
