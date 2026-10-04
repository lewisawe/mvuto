---
inclusion: always
---

# TypeScript style — Mvuto

Conventions for all TypeScript in this repo (app and `mcp-server/`).

- **Strict mode, no escapes.** `strict`, `noUncheckedIndexedAccess`, and
  `noImplicitOverride` are on. Do not add `any`, `as any`, or `// @ts-ignore` to
  silence the compiler. If a type is genuinely unknown, model it as `unknown` and
  narrow.
- **Named exports only.** No default exports. This keeps imports greppable and
  rename-safe. (Vite CSS side-effect imports like `import './styles.css'` are the
  one exception — they export nothing.)
- **ESM with explicit extensions.** Both packages are ESM. Intra-repo imports use
  explicit `.js` extensions (`import { add } from './vec2.js'`) because
  `moduleResolution` is bundler/NodeNext.
- **Immutability by default.** Prefer `readonly` fields and `const`. The physics
  types (`Vec2`, `Body`) are fully `readonly`; functions return new values rather
  than mutating inputs.
- **Small pure functions.** Favour short, single-purpose functions with
  descriptive names over large stateful methods.
- **Index access is checked.** Because `noUncheckedIndexedAccess` is on,
  `arr[i]` is `T | undefined`. Use `arr[i]!` only where a preceding bound check
  makes it provably safe, and keep that check adjacent.
- **No console noise in library code.** The MCP server must never write to
  stdout (that is the MCP transport); use `process.stderr` for diagnostics.
