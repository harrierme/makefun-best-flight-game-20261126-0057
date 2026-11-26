// Skycourier — Island Run: deterministic screenshot states. The screenshots
// the entry is judged by are real frames of the game, taken in a browser
// with ?shot=start|play|end — this module puts the game into a fixed, lively
// pose for each one, with no randomness beyond the mission seed.
import { CONFIG } from './config.js';
import { buildRings } from './missions.js';

// Put the game into the named pose. Returns true when the name is known.
export function applyShot(game, name) {
  const mission = game.missions[0];
  game.mission = mission;
  game.rings = buildRings(mission);
  game.phase = 'flying';
  game.selectedMission = 0;
  if (name === 'start') {
    // On the runway, engines running, HUD lit, first ring ahead.
    game.plane.x = 0;
    game.plane.y = 2;
    game.plane.z = -380;
    game.plane.heading = 0;
    game.plane.pitch = 0;
    game.plane.roll = 0;
    game.plane.speed = 0;
    game.plane.throttle = 0.55;
    game.plane.fuel = 100;
    game.plane.airborne = false;
    game.phase = 'title';
    game.shotTitle = true;
    game.advice = 'Full throttle — rotate at 55 kt and climb away.';
    game.subAdvice = 'Hold the centreline. The sea is not a runway.';
    return true;
  }
  if (name === 'play') {
    // Mid-sortie: climbing past the second ring over the home island, with
    // two rings already banked and the next one glowing ahead.
    game.rings[0].done = true;
    game.rings[1].done = true;
    game.score = 200;
    game.plane.x = 620;
    game.plane.y = 165;
    game.plane.z = 880;
    game.plane.heading = 0.62;
    game.plane.pitch = 0.06;
    game.plane.roll = -0.28;
    game.plane.speed = 44;
    game.plane.throttle = 0.72;
    game.plane.fuel = 74;
    game.plane.verticalSpeed = 2.4;
    game.plane.airborne = true;
    game.elapsed = 96;
    game.message = 'RING 2/6';
    game.messageUntil = 999999;
    game.advice = 'Next ring 340 m — ease right and hold her steady.';
    game.subAdvice = 'Two rings banked. Fuel 74%.';
    return true;
  }
  if (name === 'end') {
    // Mission complete: wheels down on the strip, score tallied.
    game.rings.forEach((r) => {
      r.done = true;
    });
    game.score = 940;
    game.scoreLines = [
      '6 / 6 rings × 100',
      'Landing +250',
      'Centreline +100',
      'Greased it +100',
    ];
    game.plane.x = 2;
    game.plane.y = 2;
    game.plane.z = 120;
    game.plane.heading = 0;
    game.plane.pitch = 0;
    game.plane.roll = 0;
    game.plane.speed = 0;
    game.plane.throttle = 0;
    game.plane.fuel = 61;
    game.plane.airborne = false;
    game.plane.landed = true;
    game.plane.landing = { speed: 28, sink: -1.4, centre: 2, headingError: 0.02 };
    game.elapsed = 212;
    game.phase = 'landed';
    game.bestScore = 940;
    game.advice = 'Wheels down on Runway 18. The courier flies again.';
    game.subAdvice = '';
    return true;
  }
  return false;
}

// The shot poses render one fixed frame; the loop keeps running so a
// headless screenshot taken a second after load still catches the game.
export const SHOT_NAMES = ['start', 'play', 'end'];
