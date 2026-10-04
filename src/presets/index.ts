/**
 * Preset adapter. Reads the committed, MCP-generated JSON
 * (`presets.generated.json`) and maps raw preset bodies → physics `Body`
 * objects, deriving the radius from mass via the shared mass→radius rule so the
 * physics core stays the single authority on that relationship (REQ-22).
 */
import type { Body } from '../physics/index.js';
import { massToRadius } from '../physics/index.js';
import generated from './presets.generated.json';

interface RawBody {
  readonly id: string;
  readonly pos: { readonly x: number; readonly y: number };
  readonly vel: { readonly x: number; readonly y: number };
  readonly mass: number;
  readonly hue: number;
}

const presetMap = generated.presets as Record<string, RawBody[]>;

/** The names of the available presets, in display order. */
export const listPresets = (): string[] => Object.keys(presetMap);

const toBody = (raw: RawBody): Body => ({
  id: raw.id,
  pos: { x: raw.pos.x, y: raw.pos.y },
  vel: { x: raw.vel.x, y: raw.vel.y },
  mass: raw.mass,
  radius: massToRadius(raw.mass),
  hue: raw.hue,
});

/**
 * Return a fresh array of `Body` objects for a named preset, or an empty array
 * if the name is unknown.
 */
export const getPreset = (name: string): Body[] => {
  const raw = presetMap[name];
  if (!raw) return [];
  return raw.map(toBody);
};

/** The name used as the default preset on first load. */
export const DEFAULT_PRESET = 'solar-system';
