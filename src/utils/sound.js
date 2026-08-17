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
  
  if (!isMuted && !bgmInterval) {
    startBGM();
  }
}

// --- Background Music (BGM) Engine ---
let isMuted = localStorage.getItem('bgmMuted') === 'true';
let bgmStyle = localStorage.getItem('bgmStyle') || 'baila';
let bgmInterval = null;
let nextNoteTime = 0;
let currentBeat = 0;

export function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('bgmMuted', isMuted);
  if (isMuted) {
    stopBGM();
  } else {
    unlockAudio();
    if (!bgmInterval && unlocked) startBGM();
  }
  return isMuted;
}

export function getMuteState() {
  return isMuted;
}

export function setBGMStyle(style) {
  if (['baila', 'papare', 'kandyan'].includes(style)) {
    bgmStyle = style;
    localStorage.setItem('bgmStyle', style);
    // Restart BGM to immediately apply new tempo/rhythm if playing
    if (bgmInterval) {
      stopBGM();
      startBGM();
    }
  }
}

export function getBGMStyle() {
  return bgmStyle;
}

function playKick(time) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
  gain.gain.setValueAtTime(0.5, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.3);
}

function playSnare(time, pitch = 250, vol = 0.2) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(pitch, time);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.2);
}

function playSynth(time, freq, type = 'sawtooth', duration, vol = 0.08) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, time);
  gain.gain.linearRampToValueAtTime(0.01, time + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration);
}

function scheduleBGM() {
  const ctx = getContext();
  while (nextNoteTime < ctx.currentTime + 0.1) {
    const beat = currentBeat % 8;
    let secondsPerBeat = 60.0 / 140; // Default Baila tempo
    
    if (bgmStyle === 'baila') {
      secondsPerBeat = 60.0 / 140; // 140 BPM
      if (beat === 0 || beat === 3 || beat === 4) playKick(nextNoteTime);
      if (beat === 2 || beat === 6) playSnare(nextNoteTime);
      
      const bassFreq = [130, 0, 196, 130, 130, 0, 146, 196][beat];
      if (bassFreq > 0) playSynth(nextNoteTime, bassFreq, 'sawtooth', secondsPerBeat - 0.05, 0.08);
      
    } else if (bgmStyle === 'papare') {
      secondsPerBeat = 60.0 / 160; // 160 BPM (Faster)
      // Driving 4/4 kick pattern
      if (beat % 2 === 0) playKick(nextNoteTime);
      // Trumpet-like square wave melody
      const melodyFreq = [392, 392, 440, 392, 523, 0, 493, 0][beat];
      if (melodyFreq > 0) playSynth(nextNoteTime, melodyFreq, 'square', secondsPerBeat - 0.02, 0.06);
      // Fast snare rolls
      if (beat === 3 || beat === 7) {
        playSnare(nextNoteTime, 300, 0.15);
        playSnare(nextNoteTime + secondsPerBeat/2, 300, 0.15);
      } else {
        playSnare(nextNoteTime, 250, 0.1);
      }
      
    } else if (bgmStyle === 'kandyan') {
      secondsPerBeat = 60.0 / 120; // 120 BPM (Heavy, rhythmic)
      // Getabera style (heavy toms and high-pitched strikes)
      if (beat === 0 || beat === 4 || beat === 5) playKick(nextNoteTime); // Low dawula/getabera hit
      if (beat === 2 || beat === 3 || beat === 6 || beat === 7) {
        // High pitched thammattama / getabera slap
        playSnare(nextNoteTime, 600, 0.15);
      }
      // Occasional rapid triplet feel on beat 7
      if (beat === 7) {
        playSnare(nextNoteTime + secondsPerBeat/3, 700, 0.1);
        playSnare(nextNoteTime + (secondsPerBeat*2)/3, 600, 0.1);
      }
    }

    nextNoteTime += secondsPerBeat / 2; // 8th notes step length
    currentBeat++;
  }
}

function startBGM() {
  if (bgmInterval || isMuted) return;
  const ctx = getContext();
  nextNoteTime = ctx.currentTime + 0.1;
  currentBeat = 0;
  bgmInterval = setInterval(scheduleBGM, 50);
}

function stopBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
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

export function playLaser() {
  playTone({ frequency: 900, duration: 0.18, type: 'sawtooth', glideTo: 200, volume: 0.16 });
}

export function playHeavyExplosion() {
  playTone({ frequency: 90, duration: 0.35, type: 'square', glideTo: 40, volume: 0.25 });
}

export function playElectricZap() {
  playTone({ frequency: 1400, duration: 0.22, type: 'sawtooth', glideTo: 2200, volume: 0.14 });
}

export function playMegaBlast() {
  playTone({ frequency: 150, duration: 0.4, type: 'square', glideTo: 900, volume: 0.22 });
}

// Pre-loaded Sinhala Voice Audio Objects for zero latency
const voices = {
  male: {
    niyamai: new Audio('/voices/male/niyamai.mp3'),
    patta: new Audio('/voices/male/patta.mp3'),
    elakiri: new Audio('/voices/male/elakiri.mp3'),
    wedak_na: new Audio('/voices/male/wedak_na.mp3'),
    win: new Audio('/voices/male/win.mp3'),
    lose: new Audio('/voices/male/lose.mp3'),
  },
  female: {
    niyamai: new Audio('/voices/female/niyamai.mp3'),
    patta: new Audio('/voices/female/patta.mp3'),
    elakiri: new Audio('/voices/female/elakiri.mp3'),
    wedak_na: new Audio('/voices/female/wedak_na.mp3'),
    win: new Audio('/voices/female/win.mp3'),
    lose: new Audio('/voices/female/lose.mp3'),
  }
};

// Default to male voice
let currentVoiceGender = localStorage.getItem('announcerVoice') || 'male';

export function setAnnouncerVoice(gender) {
  if (gender === 'male' || gender === 'female') {
    currentVoiceGender = gender;
    localStorage.setItem('announcerVoice', gender);
  }
}

export function getAnnouncerVoice() {
  return currentVoiceGender;
}

export function speakSinhalaFile(key) {
  try {
    const audio = voices[currentVoiceGender][key];
    if (audio) {
      audio.currentTime = 0; // Rewind to start
      audio.play().catch(() => {});
    }
  } catch (e) {
    // Silent fail if blocked by browser policy
  }
}

export function playSinhalaAnnouncer(comboCount) {
  if (comboCount === 2) {
    speakSinhalaFile('niyamai');
  } else if (comboCount === 3) {
    speakSinhalaFile('patta');
  } else if (comboCount === 4) {
    speakSinhalaFile('elakiri');
  } else if (comboCount >= 5) {
    speakSinhalaFile('wedak_na');
  }
}

export function playSinhalaWin() {
  speakSinhalaFile('win');
}

export function playSinhalaLose() {
  speakSinhalaFile('lose');
}

