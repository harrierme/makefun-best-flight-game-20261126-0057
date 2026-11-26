// Skycourier — Island Run: the world. A small archipelago in a 6 km square of
// sea, with one home island carrying the runway, a town and a lighthouse, two
// outer islands, and a scatter of islets. Height is a pure function of (x, z)
// so the renderer, the physics and the screenshots all agree about the ground.
import { CONFIG } from './config.js';
import { makeNoise } from './random.js';

const noiseLow = makeNoise(101, 260);
const noiseHigh = makeNoise(202, 90);
const noisePatch = makeNoise(303, 55);

// Each island: centre, radius, peak height, and how steep its shore is.
const ISLANDS = [
  { x: 0, z: 0, r: 1150, h: 150, shore: 1.0 }, // home island, carries the runway
  { x: 1900, z: 1500, r: 620, h: 95, shore: 1.0 },
  { x: -1700, z: 1900, r: 520, h: 80, shore: 1.0 },
  { x: -2300, z: -900, r: 380, h: 60, shore: 1.0 },
  { x: 2400, z: -1400, r: 300, h: 45, shore: 1.0 },
  { x: 700, z: -2100, r: 220, h: 35, shore: 1.0 },
  { x: -900, z: -2400, r: 180, h: 28, shore: 1.0 },
];

function islandHeight(x, z) {
  let h = 0;
  for (const isl of ISLANDS) {
    const dx = x - isl.x;
    const dz = z - isl.z;
    const d = Math.sqrt(dx * dx + dz * dz) / isl.r;
    if (d >= 1) continue;
    // Smooth dome: 1 at the centre, 0 at the shore.
    const dome = Math.pow(Math.cos((d * Math.PI) / 2), 1.35);
    h = Math.max(h, dome * isl.h);
  }
  return h;
}

// The runway is flattened ground: a strip along z at x = 0, |z| < 420.
export function onRunway(x, z) {
  return (
    Math.abs(x) < CONFIG.runwayHalfWidth + 6 &&
    Math.abs(z) < CONFIG.runwayHalfLength + 6
  );
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function terrainHeight(x, z) {
  const base = islandHeight(x, z);
  if (base <= 0) return 0; // open sea
  const hills = noiseLow(x, z) * 14 + noiseHigh(x, z) * 5;
  let h = Math.max(0, base + hills * Math.min(1, base / 40));
  // A proper mountain on the home island's north-west shoulder.
  const mdx = x + 480;
  const mdz = z + 620;
  const md = Math.sqrt(mdx * mdx + mdz * mdz);
  if (md < 420) h = Math.max(h, 190 * Math.cos((md / 420) * (Math.PI / 2)) + 8);
  // A flat valley along the runway's axis, so takeoffs and finals are fair:
  // the strip sits in a corridor of low ground running north-south.
  const kx = smoothstep(90, 240, Math.abs(x));
  const kz = smoothstep(1400, 2100, Math.abs(z));
  const k = 1 - Math.max(kx, kz);
  h = h * (1 - k) + 2.5 * k;
  // Flatten the runway and its apron so landings are fair.
  if (onRunway(x, z)) {
    const edge = Math.min(
      1,
      (CONFIG.runwayHalfWidth + 6 - Math.abs(x)) / 8,
      (CONFIG.runwayHalfLength + 6 - Math.abs(z)) / 20,
    );
    h = h * (1 - edge) + 2 * edge;
  }
  return h;
}

// --- Colour of the ground at a point, as the voxel renderer paints it. ---
// Returns [r, g, b]. The sea is water; the shore is sand; higher ground is
// grass, forest patches and rock, and the runway is asphalt with markings.
export function terrainColor(x, z, out) {
  const h = terrainHeight(x, z);
  if (h <= 0.4) {
    // Sea: deep blue far out, greener and lighter in the shallows.
    const depth = -h;
    const shallow = Math.max(0, 1 - depth / 6);
    const sparkle = noisePatch(x * 0.7, z * 0.7) * 6;
    out[0] = 16 + shallow * 26 + sparkle;
    out[1] = 74 + shallow * 52 + sparkle;
    out[2] = 128 + shallow * 42 + sparkle;
    return out;
  }
  // Runway asphalt, with a centreline and threshold bars. This check comes
  // before the beach: the flattened strip sits at height 2, below the sand.
  if (Math.abs(x) < CONFIG.runwayHalfWidth && Math.abs(z) < CONFIG.runwayHalfLength) {
    const along = Math.abs(z) % 60;
    const centre = Math.abs(x) < 1.6 && along < 34;
    const threshold = Math.abs(z) > CONFIG.runwayHalfLength - 46;
    if (centre || threshold) {
      out[0] = 235;
      out[1] = 235;
      out[2] = 228;
    } else {
      const v = noisePatch(x, z) * 5;
      out[0] = 62 + v;
      out[1] = 64 + v;
      out[2] = 68 + v;
    }
    return out;
  }
  // Apron beside the runway: pale concrete.
  if (Math.abs(x) < CONFIG.runwayHalfWidth + 26 && Math.abs(z) < 200) {
    out[0] = 168;
    out[1] = 166;
    out[2] = 158;
    return out;
  }
  if (h < 3.2) {
    // Beach sand.
    const v = noisePatch(x, z) * 8;
    out[0] = 226 + v;
    out[1] = 203 + v;
    out[2] = 150 + v;
    return out;
  }
  // Town blocks east of the runway: pale streets in a loose grid.
  if (x > 60 && x < 420 && z > -260 && z < 320 && h < 14) {
    const street = (Math.abs(x % 52) < 7 || Math.abs(z % 48) < 7) ? 1 : 0;
    if (street) {
      out[0] = 196;
      out[1] = 190;
      out[2] = 178;
    } else {
      const v = noisePatch(x, z) * 10;
      out[0] = 150 + v;
      out[1] = 118 + v;
      out[2] = 96 + v;
    }
    return out;
  }
  // Grass, forest patches and rock, by height and noise.
  const patch = noisePatch(x, z);
  if (h > 95) {
    const v = patch * 9;
    out[0] = 122 + v;
    out[1] = 110 + v;
    out[2] = 96 + v;
    return out;
  }
  if (patch > 0.35) {
    // Forest.
    const v = patch * 14;
    out[0] = 34 + v;
    out[1] = 84 + v;
    out[2] = 44 + v;
    return out;
  }
  const v = patch * 12;
  out[0] = 96 + v;
  out[1] = 148 + v;
  out[2] = 74 + v;
  return out;
}

// Fixed scenery: clouds and the lighthouse, placed once per mission seed.
export function makeScenery(seed) {
  const rand = (n) => {
    let a = (seed * 2654435761 + n * 40503) >>> 0;
    a = (a ^ (a >>> 15)) >>> 0;
    return ((a * 2246822519) >>> 0) / 4294967296;
  };
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    clouds.push({
      x: (rand(i) - 0.5) * 5200,
      z: (rand(i + 100) - 0.5) * 5200,
      y: 260 + rand(i + 200) * 160,
      s: 90 + rand(i + 300) * 160,
    });
  }
  return { clouds, lighthouse: { x: -1080, z: 240 } };
}
