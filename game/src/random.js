// Skycourier — Island Run: a small seeded random number generator and the
// smooth value noise the terrain is built from. Everything in the world is a
// pure function of a seed, so a screenshot can be reproduced exactly.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A 2D value-noise field: a grid of seeded values, smoothly interpolated.
export function makeNoise(seed, cellSize) {
  const rand = mulberry32(seed);
  const grid = new Map();
  function cellValue(ix, iz) {
    const key = ix + ',' + iz;
    let v = grid.get(key);
    if (v === undefined) {
      v = rand();
      grid.set(key, v);
    }
    return v;
  }
  function smooth(t) {
    return t * t * (3 - 2 * t);
  }
  return function noise(x, z) {
    const gx = x / cellSize;
    const gz = z / cellSize;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = smooth(gx - ix);
    const fz = smooth(gz - iz);
    const a = cellValue(ix, iz);
    const b = cellValue(ix + 1, iz);
    const c = cellValue(ix, iz + 1);
    const d = cellValue(ix + 1, iz + 1);
    return (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz) * 2 - 1;
  };
}
