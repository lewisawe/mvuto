/**
 * Entry point. Composes the renderer, state, loop, input, and controls, loads
 * the default preset, and starts the animation loop. All physics is delegated to
 * the pure core; this file only wires pieces together.
 */
import './styles.css';

import { Renderer } from '../render/renderer.js';
import { SimState } from './state.js';
import { Loop } from './loop.js';
import { bindControls } from './controls.js';
import { attachInput } from './input.js';
import { DEFAULT_PRESET } from '../presets/index.js';

const canvas = document.getElementById('sim');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Canvas #sim not found');
}

const renderer = new Renderer(canvas);
const state = new SimState();
const loop = new Loop(state, renderer);

// Load the default preset and bind the overlay controls.
state.loadPreset(DEFAULT_PRESET);
bindControls(state, renderer);

// Slingshot spawning. Convert a client (CSS px) point into world coords: the
// renderer centers the world origin on the canvas.
const screenToWorld = (clientX: number, clientY: number): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left - renderer.width / 2,
    y: clientY - rect.top - renderer.height / 2,
  };
};

attachInput(canvas, screenToWorld, {
  onSpawn: (body) => state.addBody(body),
});

// Keep the backing store in sync with the window.
window.addEventListener('resize', () => renderer.resize());

loop.start();
