# Authentic Sri Lankan Voice Announcer — Enhanced Plan (Revised)

> **Revision note:** this plan was revised after auditing it against the codebase. Two sections
> (prosody tuning, "current flat phrases") described work that was already done or misdescribed
> the current state; two more (ducking, reverb) had unmet prerequisites that would have made them
> non-functional as written. Corrections are marked inline.

## Problem

The current voice clips are too formal/dictionary-style and lack the natural colloquial energy of
how Sri Lankans actually speak when excited. The announcer also repeats the exact same line every
time a trigger fires, which gets stale fast.

---

## 0. Prerequisites (must land first)

These are blockers discovered during the audit. Nothing below works properly without them.

### 0a. Voice MP3s are not precached — offline playback is currently broken

The whole reason this project pre-renders MP3s instead of using the Web Speech API is *guaranteed
offline playback* (claimed in `README.md` and `docs/implemented_features.md`). That guarantee does
not currently hold: `vite-plugin-pwa`'s default `globPatterns` covers `js,css,html,ico,png,svg` and
**not `mp3`**, and `vite.config.js` never overrides it. Verified against a real build — `dist/sw.js`
contained exactly 6 precache entries and zero `.mp3`.

Fix in `vite.config.js`:

```js
VitePWA({
  workbox: { globPatterns: ['**/*.{js,css,html,svg,mp3}'] },
  // ...
})
```

Going from 12 → 36 assets makes this more urgent, not less.

### 0b. BGM has no master gain node — ducking (§5) is impossible without one

`playKick`, `playSnare`, and `playSynth` each connect their own gain node **directly to
`ctx.destination`**, so there is no single point at which to duck the music. Compounding it, BGM
notes are scheduled ~100 ms ahead with their gain envelopes baked in via `setValueAtTime` at
schedule time, so already-queued notes cannot be retroactively attenuated.

Fix: introduce a shared `bgmGain` GainNode, route all three generators through it, and ramp that
node for ducking.

---

## 1. Authentic Colloquial Phrases (Multiple Variants)

> **Correction:** the original plan's "Current (Flat)" column described the *older* generation
> scripts, not the live one. `scripts/generate_all_voices.py` already ships
> `"අම්මෝ, වැඩක් නෑ කතා කරලා!"` (already carries the *අම්මෝ* interjection the plan proposed as new),
> `"එළකිරි ආ!"`, and `"නියමයි! දින්නා, ජයවේවා!"`. The genuinely new value here is the
> *machang / supiri / maru* colloquialisms and the **3-variant randomization** — which is the
> strongest idea in this document and is kept in full.

Three variants per trigger; the game picks one at random each time.

| Trigger key | Variant ① | Variant ② | Variant ③ |
|---|---|---|---|
| `niyamai` | *"නියමයි මචං!"* | *"හොඳයි හොඳයි!"* | *"සුපිරි!"* |
| `patta` | *"පට්ට මචං!"* | *"මරු මරු!"* | *"අනේ පට්ටයි!"* |
| `elakiri` | *"එළකිරි ආආ!"* | *"අම්මෝ පට්ටයි!"* | *"මෙන්න ගේම!"* |
| `wedak_na` | *"අම්මෝ! වැඩක් නෑ කතා කරලා!"* | *"බලාගෙන! සුපිරිම සුපිරි!"* | *"මචං මේක නම් ලොකු වැඩක්!"* |
| `win` | *"දින්නා මචං! ජයවේවා!"* | *"චැම්පියන්! නියමයි!"* | *"ගේම ඔබේ! සුපිරි!"* |
| `lose` | *"අයියෝ... පරාදයි මචං!"* | *"අනේ! ඊළඟ පාර හරි!"* | *"කමක් නෑ, නැවත උත්සාහ කරමු!"* |

---

## 2. Per-Phrase Prosody Tuning

> **Correction:** this was presented as new work, but **every pitch value in the original table
> already existed verbatim** in `scripts/generate_all_voices.py` — male `+4/+6/+8/+10/+6/-6` and
> female `+6/+8/+10/+12/+8/-4`, all twelve identical. Only the rate percentages differed, by 2–3
> points. Scope reduced accordingly: keep the existing pitch ladder, apply the modest rate bumps,
> and raise volume `+20% → +25%`.

| Trigger | Male pitch | Male rate | Female pitch | Female rate | Intent |
|---|---|---|---|---|---|
| `niyamai` | +4Hz | +12% | +6Hz | +12% | Warm, encouraging |
| `patta` | +6Hz | +18% | +8Hz | +16% | Pumped, fast |
| `elakiri` | +8Hz | +22% | +10Hz | +20% | Peak energy |
| `wedak_na` | +10Hz | +28% | +12Hz | +25% | Maximum hype |
| `win` | +6Hz | +15% | +8Hz | +15% | Triumphant |
| `lose` | -6Hz | -12% | -4Hz | -10% | Dramatic disappointment |

All clips generated at `volume="+25%"` so they cut through the BGM.

---

## 3. Voice Playback Rearchitecture (AudioBuffer)

> **Correction to §4 of the original plan:** the original proposed adding a `ConvolverNode` to
> voices that are played as `new Audio(...)` HTMLAudioElements — which live *outside* the Web Audio
> graph. Bridging them requires `ctx.createMediaElementSource(el)`, which can only be called **once
> per element, ever** (throws afterward), and which silently mutes the element if you forget to
> connect it onward to `destination`. It also cannot overlap a clip with itself.

Replace the 36 eager `new Audio()` elements with a decoded-buffer pipeline:

- `fetch` + `decodeAudioData` each clip into an `AudioBuffer`, **lazily on first audio unlock**
  (36 eagerly-constructed media elements at module scope is a real mobile page-load cost).
- Play via `AudioBufferSourceNode`.
- This gives reverb routing, ducking on a shared bus, and overlapping playback for free, and
  removes the current `audio.currentTime = 0` cut-off-on-rapid-replay behavior.
- Decode failures degrade silently — a missing clip must never break gameplay.

---

## 4. Reverb for Big Combos

Route `elakiri` / `wedak_na` / `win` through a `ConvolverNode` fed by a procedurally-generated
impulse response (short exponential-decay noise buffer — no external IR file to ship or precache).
Smaller matches stay dry, so big combos feel distinctly *massive*.

---

## 5. BGM Ducking

While a voice clip plays, ramp `bgmGain` (from §0b) down to ~40% and restore it when the clip ends,
using `setTargetAtTime` for a smooth transition rather than an audible step. Overlapping voice
clips must refcount so an early-finishing clip doesn't un-duck while another is still speaking.

---

## 6. Fix the Trigger → Phrase Mapping

> **Added during revision.** The original plan's row labels ("3-Match", "Special", "4-Combo",
> "5-Combo") do not correspond to the code's real triggers, and there is a live bug worth fixing
> while the table is being rewritten anyway.

`GameBoard.jsx` currently passes `result.cascadeCount` straight into `playSinhalaAnnouncer`, so on
the plain-cascade path the **on-screen banner sits one tier ahead of the spoken line** (a 3-step
cascade shows *එළකිරි!* while the audio says *patta*). Introduce a single shared helper that maps a
game event to `{ bannerText, voiceKey }` so the two can never drift apart again, and use it on all
three branches (special combo swap, plain cascade, single match).

---

## 7. Asset Generation

- `scripts/generate_all_voices.py` regenerates all **36** files
  (3 variants × 6 triggers × 2 genders) as `<key>_<n>.mp3`:

  ```
  public/voices/male/niyamai_1.mp3 … niyamai_3.mp3
  public/voices/female/wedak_na_1.mp3 … wedak_na_3.mp3
  ```

- **Delete the three stale scripts** — `generate_voices.js` (unofficial Google `translate_tts`
  endpoint, liable to break), `generate_edge_voices.js` (male-only, no per-phrase tuning), and
  `generate_edge_voices.py` (female-only, flat phrases). They still contain the *old* flat phrasing
  and were the likely source of the original plan's confusion about current state.
  `generate_all_voices.py` is the single canonical generator.
- Legacy un-suffixed files (`niyamai.mp3` etc.) are superseded; `sound.js` falls back to them if a
  variant is missing so a partial regeneration can never leave the announcer mute.
