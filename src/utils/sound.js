let audioCtx = null;
let unlocked = false;

function getContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

// Mobile Chrome/Safari suspend the AudioContext until it's resumed inside a
// user-gesture handler — call this from the first tap/touch, or all
// subsequent playTone() calls will silently produce no sound.
export function unlockAudio() {
  if (unlocked) return;
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();
  unlocked = true;
}

function playTone({ frequency = 440, duration = 0.15, type = 'sine', volume = 0.2, glideTo = null }) {
  if (!unlocked) return;
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (glideTo) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + duration);
  }
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playPop() {
  playTone({ frequency: 520, duration: 0.12, type: 'triangle', glideTo: 880 });
}

export function playSwap() {
  playTone({ frequency: 300, duration: 0.08, type: 'sine' });
}

export function playSpecialCreate() {
  playTone({ frequency: 440, duration: 0.3, type: 'sawtooth', glideTo: 1200, volume: 0.15 });
}

export function playCombo(level = 1) {
  playTone({ frequency: 400 + level * 80, duration: 0.2, type: 'square', volume: 0.18 });
}

export function playInvalid() {
  playTone({ frequency: 180, duration: 0.15, type: 'sawtooth', volume: 0.15 });
}
