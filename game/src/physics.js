// Skycourier — Island Run: the flight model. A forgiving arcade model with
// real bones — throttle sets speed, pitch trades speed for altitude, bank
// turns the nose, and below stall speed the wing gives up and the plane
// sinks. The ground, the runway and the sea all end a flight differently.
import { CONFIG } from './config.js';
import { terrainHeight, onRunway } from './terrain.js';

export function createPlane() {
  return {
    // World position: x east, z south, y up (metres). Heading 0 = +z (south).
    x: 0,
    y: 2,
    z: -380, // parked at the north end of the runway, facing down the strip
    heading: 0,
    pitch: 0, // rad, nose up positive
    roll: 0, // rad, right wing down positive
    speed: 0, // m/s
    verticalSpeed: 0, // m/s
    throttle: 0,
    fuel: CONFIG.fuelStart,
    airborne: false,
    onGround: true, // resting on the strip; a descent from the air clears it
    crashed: false,
    landed: false,
    crashReason: '',
    // Landing quality, filled in when the wheels touch.
    landing: null,
  };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// One simulation step. input is the frame's control state, wind is the
// mission's crosswind strength (0..1), dt is seconds. Returns an event
// string ('takeoff', 'crash', 'landed', 'fuel-empty') or ''.
export function stepFlight(plane, input, wind, dt, time) {
  if (plane.crashed || plane.landed) return '';

  // --- Throttle -----------------------------------------------------------
  let throttle = plane.throttle;
  if (input.throttleUp) throttle += 0.7 * dt;
  if (input.throttleDown) throttle -= 0.7 * dt;
  throttle += input.consumeWheel() * 0.08;
  throttle = clamp(throttle, 0, 1);
  if (plane.fuel <= 0) throttle = 0;
  plane.throttle = throttle;

  // --- Fuel ----------------------------------------------------------------
  const burn = CONFIG.fuelBurnIdle + (CONFIG.fuelBurnCruise - CONFIG.fuelBurnIdle) * throttle;
  plane.fuel = Math.max(0, plane.fuel - burn * dt);
  const fuelEmpty = plane.fuel <= 0 && throttle === 0 && plane.speed > 0;

  // --- Speed ---------------------------------------------------------------
  // In the air the wing holds a gliding speed even at idle power; on the
  // ground the throttle alone decides how fast the wheels roll.
  const targetSpeed = plane.airborne
    ? Math.max(throttle * CONFIG.maxSpeed, 20)
    : throttle * CONFIG.maxSpeed;
  const speedFloor = plane.airborne ? CONFIG.minSpeed : 0;
  if (plane.speed < targetSpeed) {
    plane.speed = Math.min(targetSpeed, plane.speed + CONFIG.accelRate * dt);
  } else {
    const drag = CONFIG.dragRate * (input.brake ? 4 : 1);
    plane.speed = Math.max(speedFloor, plane.speed - drag * dt * 0.25);
  }
  // Pitch bleeds speed when climbing, adds it when diving.
  plane.speed -= Math.sin(plane.pitch) * 6 * dt;
  plane.speed = clamp(plane.speed, speedFloor, CONFIG.maxSpeed + 12);

  // --- Attitude ------------------------------------------------------------
  const elevator = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0);
  const aileron = (input.rollRight ? 1 : 0) - (input.rollLeft ? 1 : 0);
  // The mouse steers too: pointer position is a gentle bank command.
  let mouseBank = 0;
  if (input.mouseActive) mouseBank = clamp(input.mouseX, -1, 1) * 0.8;
  const rollTarget = clamp(aileron * CONFIG.maxRoll + mouseBank, -CONFIG.maxRoll, CONFIG.maxRoll);
  plane.roll += (rollTarget - plane.roll) * Math.min(1, 6 * dt);
  const pitchTarget = clamp(elevator * CONFIG.maxPitch, -CONFIG.maxPitch, CONFIG.maxPitch);
  plane.pitch += (pitchTarget - plane.pitch) * Math.min(1, 4 * dt);

  // Banked turns: the nose follows the bank, faster at speed.
  const turnAuthority = clamp(plane.speed / CONFIG.maxSpeed, 0.25, 1);
  plane.heading += -plane.roll * CONFIG.turnRate * turnAuthority * dt;

  // --- Gusts ---------------------------------------------------------------
  // A crosswind shoves the nose sideways and rocks the wings a little.
  if (wind > 0) {
    const gust = Math.sin(time * 0.9) * 0.5 + Math.sin(time * 2.3) * 0.5;
    plane.heading += gust * wind * 0.03 * dt;
    plane.roll += gust * wind * 0.02 * dt;
  }

  // --- Vertical ------------------------------------------------------------
  const stalled = plane.speed < CONFIG.stallSpeed;
  let vs;
  if (stalled) {
    vs = -CONFIG.gravitySink;
  } else {
    // Pitch trades speed for altitude; throttle sets the glide: at low
    // power a level plane sinks gently, at full power it climbs a touch.
    vs = Math.sin(plane.pitch) * plane.speed * 0.9 + (throttle - 0.5) * 6;
    vs = clamp(vs, -CONFIG.climbRate * 1.6, CONFIG.climbRate);
  }
  plane.verticalSpeed = vs;
  plane.y += vs * dt;

  // --- Horizontal ----------------------------------------------------------
  const forwardX = Math.sin(plane.heading);
  const forwardZ = Math.cos(plane.heading);
  plane.x += forwardX * plane.speed * dt;
  plane.z += forwardZ * plane.speed * dt;

  // Keep the sortie inside the charted area: a soft turn back at the edge.
  const r = Math.sqrt(plane.x * plane.x + plane.z * plane.z);
  if (r > 2900) {
    plane.heading += (Math.atan2(-plane.x, -plane.z) - plane.heading) * 0.5 * dt;
  }

  // --- Ground --------------------------------------------------------------
  const ground = terrainHeight(plane.x, plane.z);
  const wasAirborne = plane.airborne;
  plane.airborne = plane.y > ground + 3;
  if (!wasAirborne && plane.airborne && plane.speed > CONFIG.stallSpeed) {
    plane.onGround = false;
    return 'takeoff';
  }
  if (plane.y <= ground + 1.2) {
    plane.y = ground + 1.2;
    // Only a descent from the air can end a flight: a plane taxiing along
    // the ground just rolls, it does not "land" every frame.
    if (!plane.onGround) {
      return resolveTouchdown(plane, ground);
    }
  } else if (plane.y > ground + 3) {
    plane.onGround = false;
  }
  if (fuelEmpty) return 'fuel-empty';
  return '';
}

function resolveTouchdown(plane, ground) {
  const onStrip = onRunway(plane.x, plane.z);
  const headingError = Math.abs(wrapAngle(plane.heading - CONFIG.runwayHeading));
  const gentle = plane.verticalSpeed > -CONFIG.landingMaxSink;
  const slow = plane.speed < CONFIG.landingMaxSpeed;
  const aligned = headingError < CONFIG.landingMaxHeadingError;
  const level = Math.abs(plane.roll) < 0.35 && Math.abs(plane.pitch) < 0.3;

  if (!onStrip) {
    plane.crashed = true;
    plane.crashReason = ground <= 0.4 ? 'Ditched in the sea' : 'Crashed into the terrain';
    return 'crash';
  }
  if (!gentle || !slow || !aligned || !level) {
    plane.crashed = true;
    if (!gentle) plane.crashReason = 'Hard landing — the gear collapsed';
    else if (!slow) plane.crashReason = 'Too fast for the strip';
    else if (!aligned) plane.crashReason = 'Landed sideways across the runway';
    else plane.crashReason = 'Wings not level on touchdown';
    return 'crash';
  }
  plane.landed = true;
  plane.landing = {
    speed: plane.speed,
    sink: plane.verticalSpeed,
    centre: Math.abs(plane.x),
    headingError,
  };
  return 'landed';
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Score for a finished sortie: rings, landing quality, and a time bonus.
export function scoreSortie(ringsDone, ringTotal, landing, elapsed, timeLimit) {
  let score = ringsDone * CONFIG.ringPoints;
  let lines = [ringsDone + ' / ' + ringTotal + ' rings × ' + CONFIG.ringPoints];
  if (landing) {
    score += CONFIG.landingPoints;
    lines.push('Landing +' + CONFIG.landingPoints);
    if (landing.centre < 5) {
      score += CONFIG.centerlineBonus;
      lines.push('Centreline +' + CONFIG.centerlineBonus);
    }
    if (landing.sink > -2) {
      score += CONFIG.smoothBonus;
      lines.push('Greased it +' + CONFIG.smoothBonus);
    }
  }
  if (timeLimit > 0 && elapsed < timeLimit) {
    const bonus = Math.round((timeLimit - elapsed) * 2);
    score += bonus;
    lines.push('Time bonus +' + bonus);
  }
  return { score, lines };
}
