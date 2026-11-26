// Skycourier — Island Run: keyboard and mouse input. The game is played with
// the keyboard (arrows or WASD) and the mouse (steer by moving, wheel for
// throttle); every control also has a key so the game is fully playable
// without a mouse.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    pitchUp: false, // elevator: nose up (ArrowUp / W)
    pitchDown: false,
    rollLeft: false, // aileron: bank left (ArrowLeft / A)
    rollRight: false,
    throttleUp: false, // Shift: more power
    throttleDown: false, // Control: less power
    brake: false, // B: airbrake, sheds speed fast
    mouseX: 0, // -1..1, pointer position across the canvas
    mouseActive: false,
    wheelDelta: 0, // accumulated mouse-wheel throttle steps
    paused: false,
  };

  const keyMap = {
    ArrowUp: 'pitchUp',
    KeyW: 'pitchUp',
    ArrowDown: 'pitchDown',
    KeyS: 'pitchDown',
    ArrowLeft: 'rollLeft',
    KeyA: 'rollLeft',
    ArrowRight: 'rollRight',
    KeyD: 'rollRight',
    ShiftLeft: 'throttleUp',
    ShiftRight: 'throttleUp',
    ControlLeft: 'throttleDown',
    ControlRight: 'throttleDown',
    KeyB: 'brake',
  };

  const down = (e) => {
    if (e.repeat) return; // holding P must not flutter the pause state
    const field = keyMap[e.code];
    if (field) {
      state[field] = true;
      keys.add(e.code);
      e.preventDefault();
    }
    if (e.code === 'KeyP' || e.code === 'Escape') state.paused = !state.paused;
  };
  const up = (e) => {
    const field = keyMap[e.code];
    if (field) {
      state[field] = false;
      keys.delete(e.code);
      e.preventDefault();
    }
  };

  const mouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouseActive = true;
  };
  const mouseLeave = () => {
    state.mouseActive = false;
  };
  const wheel = (e) => {
    state.wheelDelta += e.deltaY < 0 ? 1 : -1;
    e.preventDefault();
  };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mouseleave', mouseLeave);
  canvas.addEventListener('wheel', wheel, { passive: false });

  // The main loop calls this once per frame to consume one-shot input.
  state.consumeWheel = () => {
    const d = state.wheelDelta;
    state.wheelDelta = 0;
    return d;
  };
  return state;
}
