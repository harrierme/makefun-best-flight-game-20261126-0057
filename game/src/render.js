// Skycourier — Island Run: the world renderer. The ground is a voxel
// landscape — one ray per screen column, marching forward over the
// heightfield — so hills, shores and the runway read as real 3D terrain.
// The sky, clouds, rings and the chase-view aircraft are drawn over it.
import { CONFIG } from './config.js';
import { terrainHeight, terrainColor, makeScenery } from './terrain.js';

const DEG = Math.PI / 180;

export function createWorldRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const gw = CONFIG.groundWidth;
  const gh = CONFIG.groundHeight;
  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = gw;
  groundCanvas.height = gh;
  const gctx = groundCanvas.getContext('2d');
  const image = gctx.createImageData(gw, gh);
  const pixels = new Uint32Array(image.data.buffer);
  const color = [0, 0, 0];
  const scenery = makeScenery(7);
  // Vertical field of view, derived from the horizontal one and the aspect.
  const vfov = 2 * Math.atan(Math.tan((CONFIG.fieldOfView / 2) * DEG) * (gh / gw));
  const focal = (gh / 2) / Math.tan(vfov / 2);

  // Camera: a chase camera tucked behind and above the aircraft.
  function cameraFor(plane) {
    const fx = Math.sin(plane.heading);
    const fz = Math.cos(plane.heading);
    return {
      x: plane.x - fx * 13,
      y: plane.y + 4.4,
      z: plane.z - fz * 13,
      heading: plane.heading,
      pitch: plane.pitch * 0.75 - 0.045, // look a touch down the nose
      focal,
    };
  }

  // Project a world point into ground-buffer pixels; null when behind us.
  function project(cam, px, py, pz) {
    const dx = px - cam.x;
    const dy = py - cam.y;
    const dz = pz - cam.z;
    const sin = Math.sin(cam.heading);
    const cos = Math.cos(cam.heading);
    const forward = dx * sin + dz * cos;
    if (forward < 2) return null;
    const right = dx * cos - dz * sin;
    const up = dy;
    const horizon = gh / 2 + Math.tan(cam.pitch) * focal;
    return {
      x: gw / 2 + (right / forward) * focal,
      y: horizon - (up / forward) * focal,
      dist: forward,
      scale: focal / forward,
    };
  }

  function paintSky(plane, time) {
    const w = CONFIG.viewWidth;
    const h = CONFIG.viewHeight;
    const alt = Math.max(0, plane.y);
    const dusk = 0; // midday light; the storm mission darkens it below
    const top = ctx.createLinearGradient(0, 0, 0, h);
    top.addColorStop(0, '#2f6fd0');
    top.addColorStop(0.45, '#7fb2e8');
    top.addColorStop(0.62, '#cfe6f7');
    top.addColorStop(0.63, '#e8f2f8');
    top.addColorStop(1, '#dcebf5');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h);
    // Sun, high and to the right of the nose.
    const sunX = w * 0.72;
    const sunY = h * 0.16;
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 130);
    glow.addColorStop(0, 'rgba(255, 246, 200, 0.95)');
    glow.addColorStop(0.25, 'rgba(255, 238, 170, 0.45)');
    glow.addColorStop(1, 'rgba(255, 238, 170, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
    ctx.fillStyle = '#fff8d8';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
    ctx.fill();
    void alt;
    void dusk;
    void time;
  }

  function paintGround(plane) {
    const cam = cameraFor(plane);
    const horizon = gh / 2 + Math.tan(cam.pitch) * focal;
    // Transparent above the ground: the full-resolution sky shows through.
    for (let i = 0; i < pixels.length; i++) pixels[i] = 0;
    const fogR = 216;
    const fogG = 232;
    const fogB = 247;
    for (let col = 0; col < gw; col++) {
      const angle = cam.heading + Math.atan((col - gw / 2) / focal);
      const dirX = Math.sin(angle);
      const dirZ = Math.cos(angle);
      let maxY = gh;
      let d = 7;
      while (d < 2100) {
        const wx = cam.x + dirX * d;
        const wz = cam.z + dirZ * d;
        const h = terrainHeight(wx, wz);
        const screenY = horizon - ((h - cam.y) / d) * focal;
        if (screenY < maxY && screenY < gh) {
          terrainColor(wx, wz, color);
          // Distance haze: far ground melts into the horizon colour.
          const fog = Math.min(0.85, d / 1700);
          const r = Math.round(color[0] + (fogR - color[0]) * fog);
          const g = Math.round(color[1] + (fogG - color[1]) * fog);
          const b = Math.round(color[2] + (fogB - color[2]) * fog);
          const packed = (255 << 24) | (b << 16) | (g << 8) | r;
          const top = Math.max(0, Math.floor(screenY));
          const bottom = Math.min(gh, Math.ceil(maxY));
          for (let y = top; y < bottom; y++) pixels[y * gw + col] = packed;
          maxY = screenY;
        }
        d = d * 1.028 + 0.6;
      }
    }
    gctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(groundCanvas, 0, 0, CONFIG.viewWidth, CONFIG.viewHeight);
  }

  function paintClouds(plane, time) {
    const cam = cameraFor(plane);
    const w = CONFIG.viewWidth;
    const h = CONFIG.viewHeight;
    const sx = w / gw;
    const sy = h / gh;
    for (const cloud of scenery.clouds) {
      // Clouds drift slowly with the wind.
      const cx = cloud.x + time * 2;
      const p = project(cam, cx, cloud.y, cloud.z);
      if (!p || p.x < -200 || p.x > gw + 200 || p.y < -80 || p.y > gh) continue;
      const s = p.scale * cloud.s * 0.02;
      const px = p.x * sx;
      const py = p.y * sy;
      const r = Math.max(6, s * 60);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      for (const [ox, oy, k] of [[-0.9, 0.15, 0.7], [0, 0, 1], [0.9, 0.18, 0.75], [0.3, -0.35, 0.6]]) {
        ctx.beginPath();
        ctx.ellipse(px + ox * r, py + oy * r, r * k, r * k * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function paintRings(plane, rings, time) {
    const cam = cameraFor(plane);
    const w = CONFIG.viewWidth;
    const h = CONFIG.viewHeight;
    const sx = w / gw;
    const sy = h / gh;
    for (const ring of rings) {
      const p = project(cam, ring.x, ring.y, ring.z);
      if (!p) continue;
      const px = p.x * sx;
      const py = p.y * sy;
      const radius = Math.max(3, (CONFIG.ringRadius * p.scale * sx + CONFIG.ringRadius * p.scale * sy) / 2);
      if (px < -radius * 2 || px > w + radius * 2 || py < -radius * 2 || py > h + radius * 2) continue;
      const pulse = 1 + Math.sin(time * 4 + ring.index) * 0.06;
      const r = radius * pulse;
      if (ring.done) {
        ctx.strokeStyle = 'rgba(80, 220, 120, 0.85)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      const isNext = rings.find((x) => !x.done) === ring;
      const glow = isNext ? 'rgba(255, 190, 60, 0.35)' : 'rgba(120, 200, 255, 0.25)';
      const core = isNext ? '#ffb63c' : '#7fd0ff';
      ctx.strokeStyle = glow;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = core;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      if (p.dist > 30) {
        ctx.fillStyle = isNext ? '#ffd98a' : '#cfeaff';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(p.dist) + ' m', px, py - r - 10);
      }
    }
  }

  function paintPlaneShadow(plane) {
    const cam = cameraFor(plane);
    const ground = terrainHeight(plane.x, plane.z);
    const alt = Math.max(0, plane.y - ground);
    // Only a flying plane casts a readable shadow: on the ground the
    // shadow sits under the aircraft, hidden behind its own sprite.
    if (alt < 4) return;
    const p = project(cam, plane.x, ground + 0.6, plane.z);
    if (!p) return;
    const sx = CONFIG.viewWidth / gw;
    const sy = CONFIG.viewHeight / gh;
    const alpha = Math.max(0.05, 0.30 - alt * 0.001);
    const r = Math.min(110, Math.max(4, p.scale * 9 * sx));
    ctx.fillStyle = 'rgba(10, 25, 40, ' + alpha.toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(p.x * sx, p.y * sy, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The aircraft, chase view: we sit behind the tail and watch it fly.
  function paintPlane(plane, time) {
    const w = CONFIG.viewWidth;
    const h = CONFIG.viewHeight;
    const cx = w / 2;
    const cy = h * 0.60;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(plane.roll);
    ctx.scale(1, 1 - Math.abs(plane.pitch) * 0.12);
    // Propeller disc, spinning.
    const propR = 34;
    ctx.fillStyle = 'rgba(30, 40, 55, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, -118, propR, propR * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240, 244, 248, 0.5)';
    ctx.lineWidth = 3;
    const blade = (time * 40) % Math.PI;
    ctx.beginPath();
    ctx.moveTo(-Math.cos(blade) * propR, -118 - Math.sin(blade) * propR * 0.92);
    ctx.lineTo(Math.cos(blade) * propR, -118 + Math.sin(blade) * propR * 0.92);
    ctx.stroke();
    // Wings: broad, slightly swept, orange tips.
    ctx.fillStyle = '#f4f6f8';
    ctx.strokeStyle = '#22303e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-168, -52);
    ctx.quadraticCurveTo(-120, -78, -18, -66);
    ctx.lineTo(18, -66);
    ctx.quadraticCurveTo(120, -78, 168, -52);
    ctx.quadraticCurveTo(120, -40, 16, -46);
    ctx.lineTo(-16, -46);
    ctx.quadraticCurveTo(-120, -40, -168, -52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(-168, -52);
    ctx.quadraticCurveTo(-150, -62, -132, -60);
    ctx.lineTo(-128, -48);
    ctx.quadraticCurveTo(-148, -46, -168, -52);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(168, -52);
    ctx.quadraticCurveTo(150, -62, 132, -60);
    ctx.lineTo(128, -48);
    ctx.quadraticCurveTo(148, -46, 168, -52);
    ctx.closePath();
    ctx.fill();
    // Fuselage, seen from behind: tapered, white with an orange cheatline.
    const body = ctx.createLinearGradient(-14, -150, 14, 60);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.6, '#e8eef3');
    body.addColorStop(1, '#b9c6d2');
    ctx.fillStyle = body;
    ctx.strokeStyle = '#22303e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, -128);
    ctx.quadraticCurveTo(-20, -30, -13, 58);
    ctx.quadraticCurveTo(0, 68, 13, 58);
    ctx.quadraticCurveTo(20, -30, 15, -128);
    ctx.quadraticCurveTo(0, -140, -15, -128);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff7a1a';
    ctx.fillRect(-14, -96, 28, 7);
    // Tailplane and fin.
    ctx.fillStyle = '#f4f6f8';
    ctx.strokeStyle = '#22303e';
    ctx.beginPath();
    ctx.moveTo(-58, 34);
    ctx.lineTo(58, 34);
    ctx.lineTo(44, 52);
    ctx.lineTo(-44, 52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(-7, -128);
    ctx.quadraticCurveTo(-9, -168, 0, -182);
    ctx.quadraticCurveTo(9, -168, 7, -128);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Navigation lights: red port, green starboard, white tail strobe.
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(-166, -52, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#34d17b';
    ctx.beginPath();
    ctx.arc(166, -52, 5, 0, Math.PI * 2);
    ctx.fill();
    if (Math.floor(time * 1.4) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 62, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return {
    cameraFor,
    project,
    renderWorld(plane, rings, time) {
      paintSky(plane, time);
      paintGround(plane);
      paintClouds(plane, time);
      paintPlaneShadow(plane);
      paintRings(plane, rings, time);
      paintPlane(plane, time);
    },
  };
}
