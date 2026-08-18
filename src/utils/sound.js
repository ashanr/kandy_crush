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
let isMuted = localStorage.getItem('bgmMuted') === 'true';
let bgmStyle = localStorage.getItem('bgmStyle') || 'baila';
let bgmInterval = null;
let nextNoteTime = 0;
let currentBeat = 0;

// Which screen the music is scoring. The map gets the energetic Sri Lankan
// percussion styles; gameplay gets a soft melodic bed instead.
//
// The drum styles are percussion-forward (kick sits at gain 0.5, well above the
// 0.12–0.25 of the sound effects) on a short 8-step loop. On the map nothing
// competes with that and it reads as energetic, but during play it stacks
// underneath pops, lasers, explosions and the announcer voice — one cascade can
// fire all four at once. Real match-3 games keep the drums for menus and put a
// quiet melodic bed under the board, which is what 'game' does here.
let bgmScene = 'map';

// Gameplay music also sits lower in the mix so effects and voice lead.
const SCENE_VOLUME = { map: 1, game: 0.55 };

export function setBGMScene(scene) {
  if (scene !== 'map' && scene !== 'game') return;
  if (bgmScene === scene) return;
  bgmScene = scene;
  // Restart so the new pattern begins on a clean phrase rather than mid-bar.
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
  osc.connect(gain).connect(getBgmGain());
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
  osc.connect(gain).connect(getBgmGain());
  osc.start(time);
  osc.stop(time + 0.2);
}

function playSynth(time, freq, type = 'sawtooth', duration, vol = 0.08) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol * (SCENE_VOLUME[bgmScene] ?? 1), time);
  gain.gain.linearRampToValueAtTime(0.01, time + duration);
  osc.connect(gain).connect(getBgmGain());
  osc.start(time);
  osc.stop(time + duration);
}

// Soft-attack tone for the gameplay bed. The percussion helpers above start at
// full gain instantly, which is what gives them their punch — exactly the wrong
// character for music meant to sit unnoticed behind the board.
function playSoft(time, freq, duration, vol, type = 'sine') {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const peak = Math.max(0.0002, vol * (SCENE_VOLUME[bgmScene] ?? 1));
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  // Exponential ramps can never reach 0, hence the tiny floor values.
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(peak, time + Math.min(0.12, duration * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain).connect(getBgmGain());
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

// 16-step pentatonic phrase at a relaxed tempo. Deliberately sparse and twice
// the length of the drum loops so it reads as ambient rather than looping at
// the player.
const CALM_TEMPO = 96;
const CALM_ARP = [
  261.63, 0, 0, 329.63, 0, 0, 392.00, 0,
  440.00, 0, 0, 392.00, 0, 0, 329.63, 0,
];
// Low pad roots, one per half-phrase.
const CALM_PAD = { 0: 130.81, 8: 110.00 };

function scheduleCalmStep(time, step, stepDuration) {
  const note = CALM_ARP[step];
  if (note > 0) {
    playSoft(time, note, stepDuration * 2.2, 0.045, 'sine');
  }
  const padRoot = CALM_PAD[step];
  if (padRoot) {
    playSoft(time, padRoot, stepDuration * 7, 0.03, 'triangle');
  }
  // A single high shimmer once per phrase keeps it from feeling static.
  if (step === 6) {
    playSoft(time, 1046.50, stepDuration * 3, 0.012, 'sine');
  }
}

function scheduleBGM() {
  const ctx = getContext();
  while (nextNoteTime < ctx.currentTime + 0.1) {
    // Gameplay: quiet melodic bed, no percussion.
    if (bgmScene === 'game') {
      const stepDuration = (60.0 / CALM_TEMPO) / 2;
      scheduleCalmStep(nextNoteTime, currentBeat % CALM_ARP.length, stepDuration);
      nextNoteTime += stepDuration;
      currentBeat += 1;
      continue;
    }

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

// ---------------------------------------------------------------------------
// Sinhala voice announcer
//
// Clips are decoded into AudioBuffers rather than played as <audio> elements.
// HTMLAudioElement lives outside the Web Audio graph, and bridging it via
// createMediaElementSource() can only be done once per element (it throws
// afterwards) and mutes the element if you forget to reconnect it onward —
// neither of which plays well with per-clip reverb, ducking, or replaying a
// clip while it's already sounding.
// ---------------------------------------------------------------------------

const VOICE_KEYS = ['niyamai', 'patta', 'elakiri', 'wedak_na', 'win', 'lose'];
const VARIANTS_PER_KEY = 3;

// Big moments get reverb so they feel distinct from an ordinary match.
const REVERB_KEYS = new Set(['elakiri', 'wedak_na', 'win']);

// { male: { niyamai: [AudioBuffer|null, ...] }, female: {...} }
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
  if (!unlocked) return;
  try {
    const clips = (voiceBuffers[currentVoiceGender] || {})[key];
    if (!clips) return;
    // Only pick among variants that actually decoded.
    const available = clips.filter(Boolean);
    if (available.length === 0) return;

    const buffer = available[Math.floor(Math.random() * available.length)];
    const ctx = getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;

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
  if (VOICE_KEYS.includes(voiceKey)) speakSinhalaFile(voiceKey);
}

export function playSinhalaWin() {
  speakSinhalaFile('win');
}

export function playSinhalaLose() {
  speakSinhalaFile('lose');
}

