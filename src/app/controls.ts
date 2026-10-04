/**
 * Binds the HTML overlay controls to simulation state (REQ-17..REQ-22).
 * Pure glue: it reads DOM events and writes to SimState / Renderer; no physics.
 */
import type { SimState } from './state.js';
import type { Renderer } from '../render/renderer.js';
import { listPresets } from '../presets/index.js';

const byId = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

export const bindControls = (state: SimState, renderer: Renderer): void => {
  const playBtn = byId<HTMLButtonElement>('btn-play');
  const resetBtn = byId<HTMLButtonElement>('btn-reset');
  const clearBtn = byId<HTMLButtonElement>('btn-clear');
  const dtSlider = byId<HTMLInputElement>('slider-dt');
  const gSlider = byId<HTMLInputElement>('slider-g');
  const dtOut = byId<HTMLOutputElement>('out-dt');
  const gOut = byId<HTMLOutputElement>('out-g');
  const presetHost = byId<HTMLDivElement>('preset-buttons');

  const syncPlayLabel = (): void => {
    playBtn.textContent = state.running ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(state.running));
  };

  // REQ-17 Play/Pause
  playBtn.addEventListener('click', () => {
    state.running = !state.running;
    syncPlayLabel();
  });

  // REQ-18 Reset
  resetBtn.addEventListener('click', () => {
    state.reset();
    renderer.clearTrails();
  });

  // REQ-19 Clear
  clearBtn.addEventListener('click', () => {
    state.clear();
    renderer.clearTrails();
  });

  // REQ-20 Timestep
  const applyDt = (): void => {
    state.dtScale = Number(dtSlider.value);
    dtOut.textContent = state.dtScale.toFixed(2);
  };
  dtSlider.addEventListener('input', applyDt);

  // REQ-21 Gravity
  const applyG = (): void => {
    state.G = Number(gSlider.value);
    gOut.textContent = state.G.toFixed(2);
  };
  gSlider.addEventListener('input', applyG);

  // REQ-22 Presets
  for (const name of listPresets()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--preset';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      state.loadPreset(name);
      renderer.clearTrails();
    });
    presetHost.appendChild(btn);
  }

  // Initialise displayed values from the current state.
  dtSlider.value = String(state.dtScale);
  gSlider.value = String(state.G);
  applyDt();
  applyG();
  syncPlayLabel();
};
