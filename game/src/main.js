// Skycourier — Island Run: the bootstrap and the game loop. This file owns
// the game state, the phase machine (title → flying → landed / crashed),
// the ring pickups, the advice line and the per-frame wiring between the
// flight model, the renderer, the HUD and the sound.
import { CONFIG, MISSIONS } from './config.js';
import { createPlane, stepFlight, scoreSortie } from './physics.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorldRenderer } from './render.js';
import { drawHud, drawTitle, drawEndScreen } from './hud.js';
import { buildRings, nextRing, ringPassed, ringsDoneCount, formatTime, PHASE } from './missions.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.viewWidth;
canvas.height = CONFIG.viewHeight;

const input = createInput(canvas);
const audio = createAudio();
const world = createWorldRenderer(canvas);

const game = {
  missions: MISSIONS,
  selectedMission: 0,
  mission: MISSIONS[0],
  rings: [],
  plane: createPlane(),
  phase: PHASE.TITLE,
  score: 0,
  scoreLines: [],
  elapsed: 0,
  time: 0,
  message: '',
  messageUntil: 0,
  advice: '',
  subAdvice: '',
  bestScore: 0,
  muted: false,
  shot: null,
  shotTitle: false,
};

function loadBest() {
  try {
    game.bestScore = Number(window.localStorage.getItem('skycourier-best') || 0) || 0;
  } catch {
    game.bestScore = 0;
  }
}

function saveBest() {
  if (game.score <= game.bestScore) return;
  game.bestScore = game.score;
  try {
    window.localStorage.setItem('skycourier-best', String(game.bestScore));
  } catch {
    // Storage is a nicety, never a failure.
  }
}

function startMission(index) {
  game.selectedMission = index;
  game.mission = MISSIONS[index];
  game.rings = buildRings(game.mission);
  game.plane = createPlane();
  game.plane.fuel = game.mission.fuel;
  game.phase = PHASE.FLYING;
  game.score = 0;
  game.scoreLines = [];
  game.elapsed = 0;
  game.message = '';
  game.advice = 'Full throttle — rotate at 55 kt and climb away.';
  game.subAdvice = 'Runway 18 is 840 m of asphalt. The sea is not a runway.';
  audio.unlock();
}

function retry() {
  startMission(game.selectedMission);
}

function toTitle() {
  game.plane = createPlane();
  game.rings = buildRings(game.mission);
  game.phase = PHASE.TITLE;
  game.score = 0;
  game.scoreLines = [];
  game.elapsed = 0;
  game.message = '';
}

function flash(message, seconds = 2) {
  game.message = message;
  game.messageUntil = game.time + seconds;
}

function endSortie(won) {
  const result = scoreSortie(
    ringsDoneCount(game.rings),
    game.rings.length,
    game.plane.landing,
    game.elapsed,
    game.mission.timeLimit,
  );
  game.score = result.score;
  game.scoreLines = result.lines;
  game.phase = won ? PHASE.LANDED : PHASE.CRASHED;
  saveBest();
  if (won) audio.win();
  else audio.crash();
}

// The advice line narrates what to do next.
function updateAdvice() {
  const plane = game.plane;
  const target = nextRing(game.rings);
  if (!plane.airborne && game.phase === PHASE.FLYING) {
    game.advice = 'Full throttle — rotate at 55 kt and climb away.';
    game.subAdvice = 'Hold the centreline. The sea is not a runway.';
    return;
  }
  if (target) {
    const dx = target.x - plane.x;
    const dy = target.y - plane.y;
    const dz = target.z - plane.z;
    const dist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
    const dir = dy > 25 ? 'climb a touch' : dy < -25 ? 'ease down a touch' : 'hold her steady';
    game.advice = 'Ring ' + (target.index + 1) + ' of ' + game.rings.length + ' — ' + dist + ' m, ' + dir + '.';
    game.subAdvice = ringsDoneCount(game.rings) + ' banked · Fuel ' + Math.round(plane.fuel) + '% · ' + formatTime(game.elapsed);
    return;
  }
  game.advice = 'All rings done — line up on Runway 18 and bring her home.';
  game.subAdvice = 'Final approach: under 80 kt, gentle sink, wings level.';
}

// One-shot keys are driven by real key events: keydown records the hit,
// handleKeys consumes it, keyup clears it. Nothing here ever fires on its
// own — a key that was never pressed stays unpressed.
const hit = new Set();
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  if (!e.repeat) hit.add(e.code);
});
window.addEventListener('keyup', (e) => hit.delete(e.code));

function keyPressed(code) {
  if (!hit.has(code)) return false;
  hit.delete(code);
  return true;
}

function handleKeys() {
  if (keyPressed('Enter') || keyPressed('Space')) {
    audio.unlock();
    if (game.phase === PHASE.TITLE) startMission(game.selectedMission);
    else if (game.phase === PHASE.LANDED || game.phase === PHASE.CRASHED) retry();
  }
  if (keyPressed('KeyR') && game.phase !== PHASE.TITLE) retry();
  if (keyPressed('KeyT')) toTitle();
  if (keyPressed('KeyM')) {
    game.muted = audio.toggleMute();
  }
  if (game.phase === PHASE.TITLE) {
    if (keyPressed('Digit1')) game.selectedMission = 0;
    if (keyPressed('Digit2')) game.selectedMission = 1;
    if (keyPressed('Digit3')) game.selectedMission = 2;
  }
}

canvas.addEventListener('click', () => {
  audio.unlock();
  if (game.phase === PHASE.TITLE) startMission(game.selectedMission);
});

function step(dt) {
  game.time += dt;
  if (game.phase !== PHASE.FLYING || input.paused) return;
  game.elapsed += dt;
  const event = stepFlight(game.plane, input, game.mission.wind, dt, game.time);
  if (event === 'takeoff') flash('AIRBORNE', 2);
  if (event === 'fuel-empty') flash('FUEL EMPTY — GLIDE HER IN', 3);
  if (event === 'landed') {
    audio.touchdown();
    endSortie(true);
    return;
  }
  if (event === 'crash') {
    endSortie(false);
    return;
  }
  // Ring pickups: only the next ring in the course counts.
  const target = nextRing(game.rings);
  if (target && ringPassed(game.plane, target)) {
    target.done = true;
    game.score += CONFIG.ringPoints;
    audio.ring();
    flash('RING ' + (target.index + 1) + '/' + game.rings.length, 2);
  }
  // The clock runs out on the timed dash.
  if (game.mission.timeLimit > 0 && game.elapsed > game.mission.timeLimit) {
    game.plane.crashed = true;
    game.plane.crashReason = 'Out of time on the Coastal Dash';
    endSortie(false);
    return;
  }
  updateAdvice();
  audio.update(game.plane.throttle, game.plane.speed, game.plane.airborne);
}

function render() {
  ctx.clearRect(0, 0, CONFIG.viewWidth, CONFIG.viewHeight);
  world.renderWorld(game.plane, game.rings, game.time, game.mission, game.phase);
  if (game.phase === PHASE.TITLE && !game.shotTitle) {
    drawTitle(ctx, game);
  } else if (game.phase === PHASE.TITLE && game.shotTitle) {
    // Screenshot pose: the game itself, with a slim banner, HUD lit.
    // The banner sits at y 128+ so the sun (centre h*0.10) stays clear.
    drawHud(ctx, game);
    ctx.fillStyle = 'rgba(8, 18, 30, 0.55)';
    ctx.fillRect(0, 128, CONFIG.viewWidth, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SKYCOURIER — ISLAND RUN', CONFIG.viewWidth / 2, 156);
    ctx.fillStyle = '#ffd23c';
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText('Press ENTER to fly · Island Hop · six rings, then land on Runway 18', CONFIG.viewWidth / 2, 182);
  } else if (game.phase === PHASE.LANDED || game.phase === PHASE.CRASHED) {
    drawHud(ctx, game);
    drawEndScreen(ctx, game);
  } else {
    drawHud(ctx, game);
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleKeys();
  // A screenshot pose is frozen: the frame is the pose, the plane never
  // flies away from it while the browser waits to take the picture.
  if (game.shot) {
    game.time += dt * 0.2;
  } else {
    step(dt);
  }
  render();
  requestAnimationFrame(frame);
}

// --- Boot -----------------------------------------------------------------
loadBest();
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  game.shot = shot;
  applyShot(game, shot);
  // The shot poses are frozen: no simulation, just the frame.
  game.plane.verticalSpeed = game.plane.verticalSpeed || 0;
  if (shot === 'play') {
    // Hold the play pose steady for the screenshot.
    game.time = 12;
  }
} else {
  game.rings = buildRings(game.mission);
  game.advice = 'Pick a sortie, then press ENTER to fly.';
  game.subAdvice = 'Island Hop is the gentle one. Storm Run is not.';
}
// In shot mode the loop still runs so the browser paints the frame.
requestAnimationFrame(frame);
