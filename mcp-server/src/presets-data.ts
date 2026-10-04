/**
 * SHARED preset module — the single source of truth for celestial presets
 * (REQ-23). Both the MCP tool handlers (server.ts) and the export script
 * (scripts/export-presets.ts) import THIS module, so the live MCP tool and the
 * app's generated JSON cannot diverge.
 *
 * Data is sim-scaled (not SI units): masses, distances, and velocities are tuned
 * so interesting dynamics happen on-screen in seconds, while preserving the
 * relative structure of each system. The galaxy preset uses a seeded PRNG so the
 * export is fully deterministic (REQ-25).
 */

/** Raw preset body. `radius` is intentionally omitted — the app derives it from
 * mass via the shared mass→radius rule when loading. */
export interface PresetBody {
  readonly id: string;
  readonly pos: { readonly x: number; readonly y: number };
  readonly vel: { readonly x: number; readonly y: number };
  readonly mass: number;
  readonly hue: number;
}

export const PRESET_NAMES = [
  'solar-system',
  'binary-stars',
  'galaxy',
  'trojan-asteroids',
] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

export const isPresetName = (name: string): name is PresetName =>
  (PRESET_NAMES as readonly string[]).includes(name);

/**
 * Small deterministic PRNG (mulberry32). Seeded so the galaxy preset exports
 * identically every run.
 */
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

/** A central star orbited by a handful of planets (dominant central mass). */
const solarSystem = (): PresetBody[] => {
  const bodies: PresetBody[] = [
    { id: 'sun', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: 12000, hue: 48 },
  ];
  // orbital radius, mass, hue
  const planets: Array<[number, number, number]> = [
    [120, 20, 30],
    [200, 60, 200],
    [300, 80, 120],
    [430, 45, 20],
  ];
  const G = 1; // must match DEFAULT_G for circular-orbit velocity
  const sunMass = bodies[0]!.mass;
  for (let i = 0; i < planets.length; i++) {
    const [r, mass, hue] = planets[i]!;
    // Circular orbit speed v = sqrt(G·M / r).
    const speed = Math.sqrt((G * sunMass) / r);
    bodies.push({
      id: `planet-${i + 1}`,
      pos: { x: r, y: 0 },
      vel: { x: 0, y: speed },
      mass,
      hue,
    });
  }
  return bodies;
};

/** Two comparable masses orbiting their common barycenter. */
const binaryStars = (): PresetBody[] => {
  const m = 6000;
  const sep = 240;
  const r = sep / 2; // each star orbits the midpoint
  const G = 1;
  // For equal masses, each orbits the barycenter at radius sep/2 with speed
  // v = sqrt(G·m / (2·sep)) (reduced two-body result).
  const speed = Math.sqrt((G * m) / (2 * sep));
  return [
    { id: 'star-a', pos: { x: -r, y: 0 }, vel: { x: 0, y: speed }, mass: m, hue: 20 },
    { id: 'star-b', pos: { x: r, y: 0 }, vel: { x: 0, y: -speed }, mass: m, hue: 210 },
  ];
};

/** A heavy core surrounded by many light stars on roughly circular orbits,
 * with small seeded jitter so the disk looks organic but reproducible. */
const galaxy = (): PresetBody[] => {
  const rand = mulberry32(0x6d7675); // "mvu"
  const coreMass = 30000;
  const bodies: PresetBody[] = [
    { id: 'core', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: coreMass, hue: 280 },
  ];
  const G = 1;
  const count = 60;
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 80 + rand() * 360;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    // Circular orbit speed around the core, plus a touch of jitter.
    const base = Math.sqrt((G * coreMass) / radius);
    const speed = base * (0.9 + rand() * 0.2);
    // Tangent direction (perpendicular to radius), counter-clockwise.
    const vx = -Math.sin(angle) * speed;
    const vy = Math.cos(angle) * speed;
    const mass = 2 + rand() * 8;
    const hue = 200 + rand() * 120; // blues → magentas
    bodies.push({
      id: `star-${i + 1}`,
      pos: { x: px, y: py },
      vel: { x: vx, y: vy },
      mass,
      hue,
    });
  }
  return bodies;
};

/**
 * A dominant central star with one large planet on a circular orbit, plus two
 * clusters of small asteroids trapped near the planet's L4 and L5 Lagrange
 * points. In the restricted three-body problem these points sit ±60° from the
 * planet along its orbit, at the same orbital radius, forming equilateral
 * triangles with the star and planet. Each asteroid is given the local circular
 * orbital velocity (perpendicular to its radius vector) so the cluster co-orbits
 * with the planet, with small seeded jitter so the swarm looks organic but the
 * export stays deterministic (REQ-25).
 */
const trojanAsteroids = (): PresetBody[] => {
  const rand = mulberry32(0x74726f); // "tro"
  const G = 1; // must match DEFAULT_G for circular-orbit velocity
  const starMass = 20000;
  const planetMass = 400;
  const orbitR = 320;

  const bodies: PresetBody[] = [
    { id: 'star', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: starMass, hue: 48 },
  ];

  // Circular orbital speed around the (dominant) star at a given radius.
  const circularSpeed = (r: number): number => Math.sqrt((G * starMass) / r);

  // Place a body on a counter-clockwise circular orbit at (angle, radius).
  const orbitingBody = (
    id: string,
    angle: number,
    radius: number,
    mass: number,
    hue: number,
  ): PresetBody => {
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    const speed = circularSpeed(radius);
    // Tangent direction (perpendicular to radius), counter-clockwise.
    const vx = -Math.sin(angle) * speed;
    const vy = Math.cos(angle) * speed;
    return { id, pos: { x: px, y: py }, vel: { x: vx, y: vy }, mass, hue };
  };

  // The large planet, placed along the +x axis.
  const planetAngle = 0;
  bodies.push(orbitingBody('planet', planetAngle, orbitR, planetMass, 200));

  // L4 leads the planet by +60°, L5 trails by −60°.
  const deg60 = Math.PI / 3;
  const clusters: Array<[string, number, number]> = [
    ['l4', planetAngle + deg60, 20], // [id prefix, centre angle, hue]
    ['l5', planetAngle - deg60, 330],
  ];
  const perCluster = 12;
  for (const [prefix, centreAngle, hue] of clusters) {
    for (let i = 0; i < perCluster; i++) {
      // Scatter each asteroid slightly in angle and radius around the point.
      const angle = centreAngle + (rand() - 0.5) * 0.22;
      const radius = orbitR + (rand() - 0.5) * 36;
      const mass = 1 + rand() * 3;
      const hueJitter = hue + (rand() - 0.5) * 30;
      bodies.push(
        orbitingBody(`${prefix}-asteroid-${i + 1}`, angle, radius, mass, hueJitter),
      );
    }
  }

  return bodies;
};

/** Return the bodies for a named preset. Throws on unknown names. */
export const getPresetData = (name: string): PresetBody[] => {
  switch (name) {
    case 'solar-system':
      return solarSystem();
    case 'binary-stars':
      return binaryStars();
    case 'galaxy':
      return galaxy();
    case 'trojan-asteroids':
      return trojanAsteroids();
    default:
      throw new Error(
        `Unknown preset "${name}". Known presets: ${PRESET_NAMES.join(', ')}.`,
      );
  }
};
