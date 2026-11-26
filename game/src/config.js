// Skycourier — Island Run: tuning constants and mission definitions.
// Every number here is the game's own balance, chosen for a short, readable
// sortie: takeoff, a string of rings, then a landing on the home runway.
export const CONFIG = {
  // Canvas the game draws into (CSS pixels; the page scales it to the window).
  viewWidth: 1280,
  viewHeight: 720,
  // Low-resolution buffer the voxel ground is rendered into, then upscaled.
  groundWidth: 320,
  groundHeight: 180,
  fieldOfView: 78, // horizontal, degrees
  // Flight model.
  maxSpeed: 68, // m/s at full throttle, level flight
  stallSpeed: 17, // m/s: below this the wing stops flying
  minSpeed: 8,
  climbRate: 9, // m/s of vertical speed at full pull and full speed
  gravitySink: 7, // m/s sink when stalled
  rollRate: 1.9, // rad/s at full aileron
  maxRoll: 1.15, // rad of bank
  pitchRate: 0.85, // rad/s at full elevator
  maxPitch: 0.55, // rad nose up / down
  turnRate: 0.55, // rad/s of heading change at full bank
  accelRate: 7, // m/s^2 toward the throttle's target speed
  dragRate: 3.5, // m/s^2 of drag when the throttle is closed
  // Fuel: a full tank lasts a whole sortie with throttle discipline.
  fuelStart: 100,
  fuelBurnCruise: 0.32, // units/s at full throttle
  fuelBurnIdle: 0.05, // units/s at idle
  // Scoring.
  ringPoints: 100,
  landingPoints: 250,
  centerlineBonus: 100,
  smoothBonus: 100,
  // Ring geometry.
  ringRadius: 16, // metres; fly through the middle
  ringGrace: 6, // extra metres of forgiveness on the rim
  // Runway (metres, world space): a strip along the z axis at x = 0.
  runwayHalfWidth: 14,
  runwayHalfLength: 420,
  runwayHeading: 0, // flying +z (south) down the strip
  // Landing judgement.
  landingMaxSpeed: 42,
  landingMaxSink: 4.5,
  landingMaxHeadingError: 0.35, // rad off the runway heading
};

// Three sorties with different goals, ring layouts and weather.
export const MISSIONS = [
  {
    id: 'island-hop',
    name: 'Island Hop',
    tagline: 'Six rings over the islands, then bring her home.',
    rings: 6,
    fuel: 100,
    wind: 0.0,
    timeLimit: 0, // no clock
    seed: 11,
    brief: 'Take off from Runway 18, thread all six courier rings, then land back on the strip. Watch your fuel — full throttle drinks it.',
  },
  {
    id: 'coastal-dash',
    name: 'Coastal Dash',
    tagline: 'Eight rings, one clock. Fly clean, fly fast.',
    rings: 8,
    fuel: 85,
    wind: 0.25,
    timeLimit: 240, // seconds
    seed: 47,
    brief: 'A timed dash along the coast: eight rings in under four minutes. Throttle discipline still matters — the tank is smaller.',
  },
  {
    id: 'storm-run',
    name: 'Storm Run',
    tagline: 'Low over the water, in a gusty crosswind.',
    rings: 7,
    fuel: 100,
    wind: 0.8,
    timeLimit: 0,
    seed: 83,
    brief: 'Rings hung low over the sea while a crosswind shoves the nose around. Stay low, stay smooth, and mind the waves.',
  },
];
