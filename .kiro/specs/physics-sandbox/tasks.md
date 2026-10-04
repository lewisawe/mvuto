# Tasks — Mvuto Physics Sandbox

Task breakdown for implementing the design. Each task names the requirements it
satisfies.

- [x] 1. Scaffold the root app (package.json, tsconfig, vite config, index.html,
  .gitignore). _Infra._
- [x] 2. Author the spec: requirements (EARS), design, tasks. _REQ-1…REQ-25._
- [x] 3. Implement the pure physics core.
  - [x] 3.1 `vec2.ts` — vector algebra. _REQ-11._
  - [x] 3.2 `types.ts`, `constants.ts` — Body shape + tunables. _REQ-6._
  - [x] 3.3 `body.ts` — massToRadius, mergeBodies. _REQ-6, REQ-8, REQ-9._
  - [x] 3.4 `forces.ts` — softened gravity. _REQ-1, REQ-2, REQ-3._
  - [x] 3.5 `integrate.ts` — symplectic Euler. _REQ-4, REQ-5._
  - [x] 3.6 `simulate.ts` — step: accumulate, integrate, merge. _REQ-7, REQ-10._
- [x] 4. Write the test suite (property + unit) against the core. _Lesson 4._
- [x] 5. Build the MCP server package (deps, tsconfig). _REQ-24._
- [x] 6. Author the shared preset module (seeded galaxy). _REQ-23, REQ-25._
- [x] 7. Build the MCP server + `list_presets`/`get_preset` tools. _REQ-24._
- [x] 8. Write the exporter + MCP README. _REQ-23, REQ-25._
- [x] 9. Generate `presets.generated.json`. _REQ-25._
- [x] 10. Register the MCP server in `.kiro/settings/mcp.json`. _Lesson 6._
- [x] 11. App presets adapter mapping raw bodies → `Body`. _REQ-22._
- [x] 12. Render layer: starfield, trails, renderer. _REQ-12…REQ-15._
- [x] 13. App wiring: state, loop, input, controls, styles, main. _REQ-16…REQ-22._
- [x] 14. Steering files (Lesson 2).
- [x] 15. Hook, power, custom agent (Lessons 3, 5, 7 + Bonus 2).
- [x] 16. Top-level README with lesson→location map.
- [x] 17. Single verification pass (typecheck, server typecheck, test, build).
