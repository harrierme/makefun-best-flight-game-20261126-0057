// Skycourier — Island Run: the HUD and the screens. The glass cockpit at the
// bottom carries lit instruments (attitude, airspeed, altimeter, fuel,
// throttle); the top carries the mission, the compass tape and the digital
// readouts. Title, landing and crash screens are drawn here too.
import { CONFIG } from './config.js';
import { headingDegrees, compassPoint, formatTime, ringsDoneCount } from './missions.js';

const W = CONFIG.viewWidth;
const H = CONFIG.viewHeight;
const FT_PER_M = 3.28084;
const KT_PER_MS = 1.94384;

function panel(ctx, x, y, w, h, r = 12) {
  ctx.fillStyle = 'rgba(8, 18, 30, 0.72)';
  ctx.strokeStyle = 'rgba(140, 200, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
}

function label(ctx, text, x, y, size = 11, color = '#9fc6e8') {
  ctx.fillStyle = color;
  ctx.font = '600 ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function readout(ctx, text, x, y, size = 22, color = '#eaf6ff') {
  ctx.fillStyle = color;
  ctx.font = '700 ' + size + 'px "SF Mono", ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function readoutR(ctx, text, x, y, size = 22, color = '#eaf6ff') {
  ctx.fillStyle = color;
  ctx.font = '700 ' + size + 'px "SF Mono", ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function labelR(ctx, text, x, y, size = 11, color = '#9fc6e8') {
  ctx.fillStyle = color;
  ctx.font = '600 ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

// --- Attitude indicator: a ball with a sky half and a ground half, rolled
// and pitched with the aircraft, plus a fixed wings symbol. ---------------
function drawAttitude(ctx, cx, cy, r, plane) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(plane.roll);
  const pitchPx = Math.max(-r, Math.min(r, plane.pitch * r * 1.6));
  ctx.translate(0, pitchPx);
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2);
  ctx.fillStyle = '#8a5a2e';
  ctx.fillRect(-r * 2, 0, r * 4, r * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 2, 0);
  ctx.lineTo(r * 2, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  for (const p of [-0.35, -0.18, 0.18, 0.35]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, p * r * 1.6);
    ctx.lineTo(r * 0.45, p * r * 1.6);
    ctx.stroke();
  }
  ctx.restore();
  // Fixed aircraft symbol and the bezel.
  ctx.strokeStyle = '#ffd23c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy);
  ctx.lineTo(cx - r * 0.18, cy);
  ctx.moveTo(cx + r * 0.18, cy);
  ctx.lineTo(cx + r * 0.55, cy);
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx, cy + 4);
  ctx.stroke();
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 225, 250, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Roll pointer on top.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.roll);
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.moveTo(0, -r - 2);
  ctx.lineTo(-5, -r - 11);
  ctx.lineTo(5, -r - 11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- A round dial with a needle: airspeed and altimeter share it. ---------
function drawDial(ctx, cx, cy, r, value, max, unit, ticks) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0a1622';
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 205, 245, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const t of ticks) {
    const a = (-Math.PI * 0.75 + (t / max) * Math.PI * 1.5);
    const x1 = cx + Math.cos(a) * (r - 4);
    const y1 = cy + Math.sin(a) * (r - 4);
    const x2 = cx + Math.cos(a) * (r - 12);
    const y2 = cy + Math.sin(a) * (r - 12);
    ctx.strokeStyle = 'rgba(220, 238, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  const angle = -Math.PI * 0.75 + (Math.min(value, max) / max) * Math.PI * 1.5;
  ctx.strokeStyle = '#ff5a3c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * (r - 8), cy + Math.sin(angle) * (r - 8));
  ctx.stroke();
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9fc6e8';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(unit, cx, cy + r * 0.62);
  ctx.restore();
}

export function drawHud(ctx, game) {
  const { plane, mission, rings, phase, score, elapsed, message, messageUntil, time } = game;
  const deg = headingDegrees(plane.heading);

  // --- Top bar: mission, compass tape, digital readouts -------------------
  panel(ctx, 14, 12, 250, 62);
  label(ctx, mission.name.toUpperCase(), 26, 34, 12, '#ffd23c');
  readout(ctx, 'RINGS ' + ringsDoneCount(rings) + '/' + rings.length, 26, 60, 19);
  readout(ctx, 'SCORE ' + score, 150, 60, 19, '#9fe8b0');

  // Compass tape across the top centre.
  const tapeW = 380;
  const tapeX = W / 2 - tapeW / 2;
  panel(ctx, tapeX, 12, tapeW, 62);
  ctx.save();
  ctx.beginPath();
  ctx.rect(tapeX, 12, tapeW, 62);
  ctx.clip();
  ctx.strokeStyle = 'rgba(220, 238, 255, 0.5)';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let d = -60; d <= 60; d += 5) {
    let hd = Math.round(deg + d);
    hd = ((hd % 360) + 360) % 360;
    const x = tapeX + tapeW / 2 + d * 3;
    const major = hd % 30 === 0;
    ctx.beginPath();
    ctx.moveTo(x, 66);
    ctx.lineTo(x, major ? 50 : 58);
    ctx.stroke();
    if (major) {
      const card = hd % 90 === 0 ? ['N', 'E', 'S', 'W'][Math.round(hd / 90) % 4] : String(hd).padStart(3, '0');
      ctx.fillText(card, x, 42);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 7, 14);
  ctx.lineTo(W / 2 + 7, 14);
  ctx.lineTo(W / 2, 26);
  ctx.closePath();
  ctx.fill();
  readout(ctx, String(Math.round(deg)).padStart(3, '0') + '° ' + compassPoint(deg), W / 2 - 34, 60, 15, '#ffd23c');

  // Digital readouts, top right: three columns, right-aligned so the
  // vertical-speed figure never runs off the edge of the screen.
  panel(ctx, W - 316, 12, 302, 62);
  readoutR(ctx, Math.round(plane.y * FT_PER_M) + ' ft', W - 216, 36, 20);
  labelR(ctx, 'ALT', W - 216, 62);
  readoutR(ctx, Math.round(plane.speed * KT_PER_MS) + ' kt', W - 116, 36, 20);
  labelR(ctx, 'SPD', W - 116, 62);
  // On the ground the vertical speed is zero: the wing is not flying.
  const vs = plane.airborne ? plane.verticalSpeed * FT_PER_M * 60 : 0;
  readoutR(ctx, (vs >= 0 ? '+' : '') + Math.round(vs) + ' fpm', W - 26, 36, 20, vs < -600 ? '#ff8a70' : '#eaf6ff');
  labelR(ctx, 'V/S', W - 26, 62);

  // Timer / fuel warning under the top bar.
  if (mission.timeLimit > 0 && phase === 'flying') {
    const left = mission.timeLimit - elapsed;
    ctx.fillStyle = left < 30 ? '#ff8a70' : '#eaf6ff';
    ctx.font = '700 17px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('TIME ' + formatTime(left), W - 16, 104);
  }
  if (plane.fuel < 20 && phase === 'flying') {
    ctx.fillStyle = time % 1 < 0.5 ? '#ff8a70' : '#ffd23c';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('LOW FUEL — ' + Math.round(plane.fuel) + '%', W - 16, 128);
  }

  // --- Next-ring pointer: a chevron at the screen edge ---------------------
  const target = rings.find((r) => !r.done);
  if (target && phase === 'flying') {
    const dx = target.x - plane.x;
    const dz = target.z - plane.z;
    const bearing = Math.atan2(dx, dz);
    let rel = bearing - plane.heading;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    if (Math.abs(rel) > 0.6) {
      const x = W / 2 + Math.sin(rel) * 300;
      ctx.save();
      ctx.translate(Math.max(60, Math.min(W - 60, x)), 130);
      ctx.rotate(Math.max(-1.1, Math.min(1.1, rel)));
      ctx.fillStyle = '#ffb63c';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(12, 10);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd98a';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RING ' + (target.index + 1), Math.max(60, Math.min(W - 60, x)), 162);
    }
  }

  // --- Glass cockpit: the instrument panel ---------------------------------
  const py = H - 128;
  panel(ctx, 14, py, W - 28, 114);
  drawAttitude(ctx, 84, py + 57, 44, plane);
  label(ctx, 'ATTITUDE', 46, py + 108, 10);
  drawDial(ctx, 178, py + 52, 42, plane.speed * KT_PER_MS, 140, 'KNOTS', [0, 20, 40, 60, 80, 100, 120, 140]);
  label(ctx, 'AIRSPEED', 148, py + 108, 10);
  drawDial(ctx, 272, py + 52, 42, (plane.y * FT_PER_M) % 1000, 1000, 'ALT ×100 FT', [0, 250, 500, 750, 1000]);
  label(ctx, 'ALTIMETER', 240, py + 108, 10);
  // Fuel gauge.
  label(ctx, 'FUEL', 348, py + 22, 11);
  ctx.fillStyle = '#12283a';
  ctx.fillRect(348, py + 30, 130, 16);
  ctx.fillStyle = plane.fuel < 20 ? '#ff5a3c' : '#35c46a';
  ctx.fillRect(348, py + 30, 130 * (plane.fuel / 100), 16);
  ctx.strokeStyle = 'rgba(220, 238, 255, 0.5)';
  ctx.strokeRect(348, py + 30, 130, 16);
  readout(ctx, Math.round(plane.fuel) + '%', 484, py + 44, 16);
  // Throttle bar.
  label(ctx, 'THROTTLE', 348, py + 66, 11);
  ctx.fillStyle = '#12283a';
  ctx.fillRect(348, py + 74, 130, 16);
  ctx.fillStyle = '#ffb63c';
  ctx.fillRect(348, py + 74, 130 * plane.throttle, 16);
  ctx.strokeStyle = 'rgba(220, 238, 255, 0.5)';
  ctx.strokeRect(348, py + 74, 130, 16);
  readout(ctx, Math.round(plane.throttle * 100) + '%', 484, py + 88, 16);
  // Flaps of advice: the centre of the panel narrates the sortie.
  const advice = game.advice || '';
  ctx.fillStyle = '#cfe6f7';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(advice, 540, py + 40);
  const sub = game.subAdvice || '';
  ctx.fillStyle = '#9fc6e8';
  ctx.font = '500 13px system-ui, sans-serif';
  ctx.fillText(sub, 540, py + 64);
  // Controls reminder, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8fb8d8';
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.fillText('↑↓ pitch · ←→ bank · Shift/Ctrl throttle · B brake', W - 30, py + 40);
  ctx.fillText('Mouse steers · wheel throttle · P pause · M mute', W - 30, py + 64);
  ctx.fillText('R retry · 1/2/3 mission', W - 30, py + 88);

  // --- Centre flash message --------------------------------------------------
  if (message && time < messageUntil) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (messageUntil - time) * 2);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(8, 18, 30, 0.6)';
    ctx.lineWidth = 6;
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(message, W / 2, H * 0.34);
    ctx.fillText(message, W / 2, H * 0.34);
    ctx.restore();
  }
  // Pull-up warning when the ground rushes up.
  if (phase === 'flying' && plane.airborne && plane.verticalSpeed < -4 && plane.y - 0 < 90) {
    if (time % 0.8 < 0.5) {
      ctx.fillStyle = '#ff5a3c';
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PULL UP', W / 2, H * 0.44);
    }
  }
}

function centred(ctx, text, y, size, color, weight = 700) {
  ctx.fillStyle = color;
  ctx.font = weight + ' ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, y);
}

export function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(6, 16, 28, 0.55)';
  ctx.fillRect(0, 0, W, H);
  centred(ctx, 'SKYCOURIER', 150, 74, '#ffffff', 800);
  centred(ctx, '— Island Run —', 196, 26, '#ffd23c', 600);
  centred(ctx, 'A little turboprop, a whole archipelago, and a runway waiting at home.', 232, 19, '#cfe6f7', 500);
  // Mission cards.
  const cardW = 330;
  const gap = 24;
  const total = game.missions.length * cardW + (game.missions.length - 1) * gap;
  let x = (W - total) / 2;
  game.missions.forEach((m, i) => {
    const selected = game.selectedMission === i;
    ctx.fillStyle = selected ? 'rgba(255, 182, 60, 0.22)' : 'rgba(8, 18, 30, 0.72)';
    ctx.strokeStyle = selected ? '#ffb63c' : 'rgba(140, 200, 255, 0.35)';
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, 270, cardW, 190, 14);
    ctx.fill();
    ctx.stroke();
    centred(ctx, (i + 1) + ' · ' + m.name, 306, 22, '#ffffff', 700);
    ctx.save();
    ctx.fillStyle = '#9fc6e8';
    ctx.font = '500 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, m.brief, x + 18, 336, cardW - 36, 20);
    ctx.restore();
    centred(ctx, m.tagline, 420, 15, '#ffd98a', 600);
    const meta = m.rings + ' rings' + (m.timeLimit ? ' · ' + formatTime(m.timeLimit) + ' limit' : ' · no clock') + (m.wind > 0.5 ? ' · strong wind' : m.wind > 0 ? ' · light wind' : ' · calm');
    centred(ctx, meta, 446, 13, '#8fb8d8', 500);
    x += cardW + gap;
  });
  centred(ctx, 'Press 1 / 2 / 3 to pick a sortie, then ENTER or click to fly.', 510, 20, '#eaf6ff', 600);
  centred(ctx, 'Take off with full throttle, thread every ring, then land gently on Runway 18.', 542, 16, '#9fc6e8', 500);
  centred(ctx, 'Arrows / WASD fly · Shift & Ctrl work the throttle · mouse steers · B brakes', 574, 15, '#8fb8d8', 500);
  centred(ctx, 'Your best score is saved on this machine.', 606, 14, '#8fb8d8', 500);
  if (game.bestScore > 0) {
    centred(ctx, 'Best score so far: ' + game.bestScore, 640, 17, '#9fe8b0', 700);
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x + maxWidth / 2, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x + maxWidth / 2, cy);
}

export function drawEndScreen(ctx, game) {
  const won = game.phase === 'landed';
  ctx.fillStyle = won ? 'rgba(6, 28, 16, 0.55)' : 'rgba(28, 8, 6, 0.55)';
  ctx.fillRect(0, 0, W, H);
  centred(ctx, won ? 'MISSION COMPLETE' : 'SORTIE OVER', 170, 56, won ? '#9fe8b0' : '#ff8a70', 800);
  centred(ctx, won ? 'Wheels down on Runway 18. The courier flies again.' : game.plane.crashReason || 'The sortie ended early.', 214, 22, '#eaf6ff', 600);
  centred(ctx, 'SCORE  ' + game.score, 290, 40, '#ffd23c', 800);
  let y = 340;
  for (const line of game.scoreLines) {
    centred(ctx, line, y, 17, '#cfe6f7', 500);
    y += 26;
  }
  y += 14;
  centred(ctx, 'Rings ' + ringsDoneCount(game.rings) + '/' + game.rings.length + ' · Time ' + formatTime(game.elapsed), y, 17, '#9fc6e8', 600);
  y += 44;
  if (game.score > game.bestScore) {
    centred(ctx, 'NEW BEST SCORE', y, 20, '#9fe8b0', 800);
    y += 34;
  }
  centred(ctx, 'Press R to fly again · 1 / 2 / 3 to change sortie · T for the title screen', y, 17, '#eaf6ff', 600);
}
