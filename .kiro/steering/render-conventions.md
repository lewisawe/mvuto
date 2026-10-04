---
inclusion: always
---

# Render conventions — Mvuto

Rules for `src/render/` (and the drawing parts of `src/app/`).

- **No physics in the render layer.** The renderer reads `Body` state and draws.
  It never calls `stepSimulation`, integrates, or mutates velocities. Speed used
  for the hue mapping is read-only.
- **Handle device pixel ratio.** Size the canvas backing store to
  `cssSize × devicePixelRatio` and scale the 2D context by the ratio, so one
  drawing unit equals one CSS pixel and output stays crisp on HiDPI displays
  (REQ-15). Re-run this on resize.
- **World origin at canvas center.** Presets are authored around (0, 0). The
  world→screen transform adds half the canvas size; `+y` points down (screen
  convention).
- **Seeded, stable starfield.** The backdrop uses a seeded PRNG so stars do not
  jump between frames; regenerate only on resize (REQ-12).
- **Additive glow for bodies.** Draw bodies with `globalCompositeOperation =
  'lighter'` and a radial-gradient halo so overlapping glows add up like light
  (REQ-13). Always `save()`/`restore()` around composite-mode changes.
- **Trails are a render concern.** Trail buffers live in the render layer, keyed
  by body id, and are cleared on Reset/Clear. Sample them once per simulation
  advance (not per redraw) so spacing reflects motion, not frame rate (REQ-14).
- **Draw order is fixed:** starfield → trails → bodies.
