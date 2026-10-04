/**
 * Export the shared preset data to the app's committed JSON artifact
 * (REQ-23, REQ-25).
 *
 * Imports the SAME shared module the MCP tools use (`presets-data.ts`), builds a
 * `{ [name]: PresetBody[] }` map for every preset, and writes it to
 * `../src/presets/presets.generated.json`. Because the galaxy generator is
 * seeded, the output is byte-stable across runs.
 *
 * Run via `npm run generate:presets` from the repo root, or
 * `npm run export:presets` from inside mcp-server/.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PRESET_NAMES,
  getPresetData,
  type PresetBody,
} from '../src/presets-data.js';

const here = dirname(fileURLToPath(import.meta.url));
// mcp-server/scripts → repo root is two levels up.
const outPath = resolve(here, '..', '..', 'src', 'presets', 'presets.generated.json');

interface GeneratedPresets {
  readonly _generatedBy: string;
  readonly _note: string;
  readonly presets: Record<string, PresetBody[]>;
}

const presets: Record<string, PresetBody[]> = {};
for (const name of PRESET_NAMES) {
  presets[name] = getPresetData(name);
}

const payload: GeneratedPresets = {
  _generatedBy: 'mvuto-mcp-server/scripts/export-presets.ts (shared presets-data.ts)',
  _note:
    'Generated artifact — do not edit by hand. Regenerate with `npm run generate:presets`. ' +
    'Data is sim-scaled, not SI units.',
  presets,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const counts = PRESET_NAMES.map((n) => `${n}=${presets[n]!.length}`).join(', ');
process.stdout.write(`Wrote ${outPath}\n  presets: ${counts}\n`);
