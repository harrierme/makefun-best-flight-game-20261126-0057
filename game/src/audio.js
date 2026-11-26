// Skycourier — Island Run: all sound is synthesised with WebAudio — a
// turboprop hum, wind rush, a chime for each ring, and thuds for touchdown
// and crash. No audio files, no network.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windSource = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      return false;
    }
    // Engine: two detuned saws through a low-pass, the classic prop drone.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 62;
    const engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'sawtooth';
    engineOsc2.frequency.value = 93;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
    engineOsc2.start();
    // Wind: looped noise through a band-pass that opens with speed.
    const len = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    windSource = ctx.createBufferSource();
    windSource.buffer = buffer;
    windSource.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);
    windSource.start();
    return true;
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    // Call from any user gesture (key, click) so the browser unlocks audio.
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      if (windGain) windGain.gain.value = 0;
      return muted;
    },
    // Continuous engine + wind, driven by the flight model each frame.
    update(throttle, speed, airborne) {
      if (!ensure() || muted) return;
      const target = airborne ? 0.05 + throttle * 0.075 : throttle * 0.05;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(58 + throttle * 46 + speed * 0.25, ctx.currentTime, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.12, speed * 0.0016), ctx.currentTime, 0.15);
      windFilter.frequency.setTargetAtTime(500 + speed * 14, ctx.currentTime, 0.15);
    },
    ring() {
      blip(880, 0.35, 'sine', 0.22);
      blip(1318, 0.5, 'sine', 0.18, 0.07);
    },
    touchdown() {
      blip(90, 0.25, 'triangle', 0.3);
    },
    crash() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const noise = ctx.createBufferSource();
      noise.buffer = windSource.buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.8);
      blip(55, 0.6, 'sine', 0.4);
    },
    win() {
      blip(523, 0.3, 'sine', 0.2);
      blip(659, 0.3, 'sine', 0.2, 0.12);
      blip(784, 0.55, 'sine', 0.22, 0.24);
    },
  };
}
