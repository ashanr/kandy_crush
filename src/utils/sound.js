import { readString, writeString } from './storage.js';

let audioCtx = null;
let unlocked = false;

function getContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

// Master bus for background music only. Every BGM generator routes through
// this instead of connecting straight to ctx.destination, so the music can be
// ducked at a single point while an announcer voice is speaking. SFX
// deliberately bypass it — they're short and should stay at full level.
let bgmGain = null;

function getBgmGain() {
  if (!bgmGain) {
    const ctx = getContext();
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 1;
    bgmGain.connect(ctx.destination);
  }
  return bgmGain;
}

// Mobile Chrome/Safari suspend the AudioContext until it's resumed inside a
// user-gesture handler — call this from the first tap/touch, or all
// subsequent playTone() calls will silently produce no sound.
export function unlockAudio() {
  if (unlocked) return;
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();
  unlocked = true;

  // Decoding 36 clips is deferred until here rather than done at module load —
  // constructing/fetching them all up front is a real cost on mobile, and
  // nothing can be played before unlock anyway.
  loadVoiceBuffers();

  if (!isMuted && !bgmInterval) {
    startBGM();
  }
}

// --- Background Music (BGM) Engine ---
let isMuted = readString('bgmMuted') === 'true';
// Default to orchestral theme
let bgmStyle = readString('bgmStyle') || 'orchestral';
let bgmInterval = null;
let nextNoteTime = 0;
let currentBeat = 0;

let bgmScene = 'map';

const SCENE_VOLUME = { map: 1, game: 0.55 };

export function setBGMScene(scene) {
  if (scene !== 'map' && scene !== 'game') return;
  if (bgmScene === scene) return;
  bgmScene = scene;
  if (bgmInterval) {
    stopBGM();
    startBGM();
  }
}

export function getBGMScene() {
  return bgmScene;
}

export function toggleMute() {
  isMuted = !isMuted;
  writeString('bgmMuted', isMuted);
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
  if (['orchestral', 'marimba', 'ambient'].includes(style)) {
    bgmStyle = style;
    writeString('bgmStyle', style);
    if (bgmInterval) {
      stopBGM();
      startBGM();
    }
  }
}

export function getBGMStyle() {
  return bgmStyle;
}

// Bouncy Marimba / Glockenspiel Tone
function playBellTone(time, freq, duration = 0.2, vol = 0.08, type = 'sine') {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const peak = Math.max(0.0002, vol * (SCENE_VOLUME[bgmScene] ?? 1));
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain).connect(getBgmGain());
  osc.start(time);
  osc.stop(time + duration);
}

// Soft Pizzicato / Bass Tone
function playBassNote(time, freq, duration = 0.35, vol = 0.06) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const peak = Math.max(0.0002, vol * (SCENE_VOLUME[bgmScene] ?? 1));
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain).connect(getBgmGain());
  osc.start(time);
  osc.stop(time + duration);
}

// Orchestral C-Major Bouncy Candy Saga Melodies (16-step phrase)
const CANDY_MELODY_MAIN = [
  523.25, 659.25, 783.99, 1046.50,  880.00, 783.99, 659.25, 523.25,
  587.33, 659.25, 698.46, 880.00,   783.99, 659.25, 587.33, 523.25
];

const CANDY_BASS_LINE = [
  261.63, 0, 329.63, 0, 392.00, 0, 329.63, 0,
  220.00, 0, 293.66, 0, 392.00, 0, 261.63, 0
];

const CALM_TEMPO = 96;
const CALM_ARP = [
  261.63, 0, 0, 329.63, 0, 0, 392.00, 0,
  440.00, 0, 0, 392.00, 0, 0, 329.63, 0
];

function scheduleCalmStep(time, step, stepDuration) {
  const note = CALM_ARP[step];
  if (note > 0) {
    playBellTone(time, note, stepDuration * 2.2, 0.045, 'sine');
  }
  if (step === 0 || step === 8) {
    playBassNote(time, step === 0 ? 130.81 : 110.00, stepDuration * 6, 0.03);
  }
}

function scheduleBGM() {
  const ctx = getContext();
  while (nextNoteTime < ctx.currentTime + 0.1) {
    if (bgmScene === 'game') {
      const stepDuration = (60.0 / CALM_TEMPO) / 2;
      scheduleCalmStep(nextNoteTime, currentBeat % CALM_ARP.length, stepDuration);
      nextNoteTime += stepDuration;
      currentBeat += 1;
      continue;
    }

    const step = currentBeat % CANDY_MELODY_MAIN.length;
    let secondsPerStep = (60.0 / 128) / 2; // 128 BPM bouncy theme

    if (bgmStyle === 'orchestral') {
      const note = CANDY_MELODY_MAIN[step];
      const bass = CANDY_BASS_LINE[step];

      if (note > 0) playBellTone(nextNoteTime, note, secondsPerStep * 1.8, 0.07, 'sine');
      if (bass > 0) playBassNote(nextNoteTime, bass, secondsPerStep * 2, 0.05);

      // Sparkling glockenspiel flourish on step 7 & 15
      if (step === 7 || step === 15) {
        playBellTone(nextNoteTime + secondsPerStep * 0.5, 1567.98, secondsPerStep, 0.025, 'triangle');
      }

    } else if (bgmStyle === 'marimba') {
      secondsPerStep = (60.0 / 135) / 2;
      const note = CANDY_MELODY_MAIN[step];
      if (note > 0) playBellTone(nextNoteTime, note * 0.5, secondsPerStep * 1.2, 0.09, 'triangle');
      if (step % 4 === 0) playBassNote(nextNoteTime, 130.81, secondsPerStep * 2, 0.06);

    } else { // Ambient / Chill
      const stepDuration = (60.0 / 100) / 2;
      scheduleCalmStep(nextNoteTime, step % CALM_ARP.length, stepDuration);
      secondsPerStep = stepDuration;
    }

    nextNoteTime += secondsPerStep;
    currentBeat += 1;
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

// ---------------------------------------------------------------------------
// Voice announcer
//
// Clips are decoded into AudioBuffers rather than played as <audio> elements.
// HTMLAudioElement lives outside the Web Audio graph, and bridging it via
// createMediaElementSource() can only be done once per element (it throws
// afterwards) and mutes the element if you forget to reconnect it onward —
// neither of which plays well with per-clip reverb, ducking, or replaying a
// clip while it's already sounding.
// ---------------------------------------------------------------------------

// Keys are the mp3 basenames under public/voices/<gender>/. They are also the
// keys src/utils/announcer.js returns, so a clip that is not listed here simply
// never plays -- add to both or neither.
const VOICE_KEYS = ['sweet', 'tasty', 'delicious', 'divine', 'sugar_crush', 'out_of_moves'];
const VARIANTS_PER_KEY = 3;

// Big moments get reverb so they feel distinct from an ordinary match.
const REVERB_KEYS = new Set(['delicious', 'divine', 'sugar_crush']);

// { male: { sweet: [AudioBuffer|null, ...] }, female: {...} }
const voiceBuffers = { male: {}, female: {} };
let voiceLoadStarted = false;

async function decodeClip(ctx, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const raw = await res.arrayBuffer();
  return ctx.decodeAudioData(raw);
}

// Loads <key>_<n>.mp3, falling back to the legacy un-suffixed <key>.mp3 so a
// partial/failed regeneration can never leave the announcer completely mute.
async function loadOneClip(ctx, gender, key, variant) {
  try {
    return await decodeClip(ctx, `/voices/${gender}/${key}_${variant}.mp3`);
  } catch {
    try {
      return await decodeClip(ctx, `/voices/${gender}/${key}.mp3`);
    } catch {
      return null;
    }
  }
}

function loadVoiceBuffers() {
  if (voiceLoadStarted) return;
  voiceLoadStarted = true;
  const ctx = getContext();

  ['male', 'female'].forEach((gender) => {
    VOICE_KEYS.forEach((key) => {
      voiceBuffers[gender][key] = new Array(VARIANTS_PER_KEY).fill(null);
      for (let v = 1; v <= VARIANTS_PER_KEY; v += 1) {
        loadOneClip(ctx, gender, key, v).then((buf) => {
          voiceBuffers[gender][key][v - 1] = buf;
        });
      }
    });
  });
}

// Short exponential-decay noise burst used as a reverb impulse response —
// generated at runtime so there's no external IR file to ship or precache.
let impulseResponse = null;

function getImpulseResponse(ctx) {
  if (!impulseResponse) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * 1.1));
    impulseResponse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = impulseResponse.getChannelData(ch);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
      }
    }
  }
  return impulseResponse;
}

// --- BGM ducking -----------------------------------------------------------
// Refcounted so two overlapping voice clips don't let the first one to finish
// restore the music while the second is still speaking.
const DUCKED_LEVEL = 0.4;
let activeVoices = 0;

function duckBGM() {
  activeVoices += 1;
  if (activeVoices === 1 && bgmGain) {
    const ctx = getContext();
    bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    bgmGain.gain.setTargetAtTime(DUCKED_LEVEL, ctx.currentTime, 0.05);
  }
}

function unduckBGM() {
  activeVoices = Math.max(0, activeVoices - 1);
  if (activeVoices === 0 && bgmGain) {
    const ctx = getContext();
    bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    bgmGain.gain.setTargetAtTime(1, ctx.currentTime, 0.18);
  }
}

// Default to male voice
let currentVoiceGender = readString('announcerVoice') || 'male';

export function setAnnouncerVoice(gender) {
  if (gender === 'male' || gender === 'female') {
    currentVoiceGender = gender;
    writeString('announcerVoice', gender);
  }
}

export function getAnnouncerVoice() {
  return currentVoiceGender;
}

// The clip currently talking. Announcer lines fire on every move, so at any
// reasonable playing speed a new line used to start while the previous one was
// still going — several voices overlapping at once, which reads as garbled and
// rushed rather than energetic. Only one announcer line is ever audible now:
// starting a new one cuts the old one off.
let activeVoiceSource = null;

export function stopAnnouncerVoice() {
  if (!activeVoiceSource) return;
  try {
    activeVoiceSource.stop();
  } catch {
    // Already finished; onended has cleaned up.
  }
  activeVoiceSource = null;
}

export function playVoiceFile(key) {
  if (!unlocked) return;
  try {
    const clips = (voiceBuffers[currentVoiceGender] || {})[key];
    if (!clips) return;
    // Only pick among variants that actually decoded.
    const available = clips.filter(Boolean);
    if (available.length === 0) return;

    stopAnnouncerVoice();

    const buffer = available[Math.floor(Math.random() * available.length)];
    const ctx = getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    activeVoiceSource = source;

    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(ctx.destination);

    if (REVERB_KEYS.has(key)) {
      // Dry path keeps the line intelligible; wet path adds the stadium tail.
      const dry = ctx.createGain();
      dry.gain.value = 0.85;
      source.connect(dry).connect(out);

      const convolver = ctx.createConvolver();
      convolver.buffer = getImpulseResponse(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      source.connect(convolver).connect(wet).connect(out);
    } else {
      source.connect(out);
    }

    duckBGM();
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      if (activeVoiceSource === source) activeVoiceSource = null;
      unduckBGM();
    };
    source.onended = restore;
    // Belt-and-braces: if onended never fires (tab backgrounded mid-clip, some
    // mobile browsers), don't leave the music permanently ducked.
    window.setTimeout(restore, Math.ceil(buffer.duration * 1000) + 1500);

    source.start();
  } catch {
    // Never let an audio failure interrupt gameplay.
  }
}

// Plays a specific announcer line. Callers pass a voice key rather than a
// combo number so the spoken line can't drift out of sync with the on-screen
// banner — see src/utils/announcer.js for the single source of that mapping.
export function playAnnouncerVoice(voiceKey) {
  if (VOICE_KEYS.includes(voiceKey)) playVoiceFile(voiceKey);
}

export function playWinVoice() {
  playVoiceFile('sugar_crush');
}

export function playLoseVoice() {
  playVoiceFile('out_of_moves');
}



