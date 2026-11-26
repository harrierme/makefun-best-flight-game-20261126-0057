// Skycourier — Island Run: missions. Each sortie is a string of glowing
// rings hung over the archipelago, then a landing back on the home strip.
// Ring positions are laid out from the mission seed, so every sortie of a
// mission flies the same course.
import { CONFIG } from './config.js';
import { mulberry32 } from './random.js';
import { terrainHeight } from './terrain.js';

export const PHASE = {
  TITLE: 'title',
  FLYING: 'flying',
  LANDED: 'landed',
  CRASHED: 'crashed',
};

export function buildRings(mission) {
  const rand = mulberry32(mission.seed * 7919 + 13);
  // Waypoints trace a tour of the islands, starting just past the runway.
  const tour = [
    [0, 500],
    [900, 1100],
    [1900, 1500],
    [900, 2100],
    [-900, 2200],
    [-1700, 1900],
    [-2100, 400],
    [-2300, -900],
    [-900, -1400],
    [700, -2100],
    [1500, -900],
    [600, 200],
  ];
  const rings = [];
  const count = mission.rings;
  for (let i = 0; i < count; i++) {
    const leg = Math.floor((i / count) * (tour.length - 1));
    const t = (i / count) * (tour.length - 1) - leg;
    const a = tour[leg];
    const b = tour[Math.min(leg + 1, tour.length - 1)];
    const x = a[0] + (b[0] - a[0]) * t + (rand() - 0.5) * 260;
    const z = a[1] + (b[1] - a[1]) * t + (rand() - 0.5) * 260;
    const ground = terrainHeight(x, z);
    // Storm Run hangs its rings low over the water; the others ride higher.
    const low = mission.id === 'storm-run';
    const alt = low
      ? Math.max(ground + 18, 22 + rand() * 18)
      : Math.max(ground + 55, 70 + rand() * 90);
    rings.push({ x, y: alt, z, done: false, index: i });
  }
  return rings;
}

// Distance from the plane to a ring's centre, in metres.
export function ringDistance(plane, ring) {
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  const dz = plane.z - ring.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// True when the plane has just passed through the ring.
export function ringPassed(plane, ring) {
  return ringDistance(plane, ring) < CONFIG.ringRadius + CONFIG.ringGrace;
}

// The next ring still to fly, or null when the course is complete.
export function nextRing(rings) {
  for (const ring of rings) if (!ring.done) return ring;
  return null;
}

export function ringsDoneCount(rings) {
  let n = 0;
  for (const ring of rings) if (ring.done) n++;
  return n;
}

// Compass heading in degrees, 0 = north, clockwise.
export function headingDegrees(heading) {
  // Heading 0 flies +z, which the chart calls south; rotate so 0 is north.
  const deg = ((-heading * 180) / Math.PI + 180) % 360;
  return (deg + 360) % 360;
}

export function compassPoint(deg) {
  const points = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return points[Math.round(deg / 22.5) % 16];
}

// Human clock: 3:42.
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
