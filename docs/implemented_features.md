# Implemented Features

This document provides a comprehensive overview of all features currently built and fully operational in this Candy Crush Saga clone repository.

---

## 🎮 1. Core Match-3 Game Engine (`src/game/board.js`)

- **Dynamic 8x8 Grid**: Full grid management supporting candy spawning, movement, matching, and falling gravity physics.
- **Touch & Swipe Controls**: Intuitive mobile drag-and-swipe interaction for swapping adjacent tiles.
- **Invalid Swap Rejection**: A swap that creates no match (and involves no special candy) is rejected before any state change — the board never visibly moves, and a rejection sound/haptic plays instead. There is currently no "swap forward then animate back" motion; the board simply doesn't change.
- **Cascading Combo Engine**: Continuous automatic matching of falling candies with increasing score multipliers for multi-stage cascades (capped at 25 iterations as a safety guard against pathological refills).
- **No-Match Detection & Reshuffle**: Automatic detection when no valid moves remain on the board, triggering an automatic board reshuffle.

---

## 🍬 2. Special Candies & Combo System (`src/game/board.js`, `src/game/specialCombos.js`)

- **Striped Candies**:
  - **Horizontal 4-Match**: Creates a **Horizontal Striped Candy** that clears its entire row upon detonation.
  - **Vertical 4-Match**: Creates a **Vertical Striped Candy** that clears its entire column upon detonation.
- **Wrapped Candies**:
  - **T-Shape / L-Shape Match**: Creates a **Wrapped Candy** that explodes a 3x3 area on detonation.
- **Color Bombs**:
  - **5-in-a-Line Match**: Creates a **Color Bomb**. Swapping it with any candy wipes all candies of that color from the board.
- **Jelly Fish**:
  - **2x2 Square Match**: Creates a **Jelly Fish** (yields to any overlapping 3-in-a-row — line matches always take priority over a square).
  - **Detonation**: Targets 3 cells, preferring cells that still carry jelly; falls back to random candies once jelly targets are exhausted.
- **Special + Normal Swap → Single Detonation**: Swapping any special candy with a plain candy always succeeds (even with no incidental 3-match) and detonates the special once at its new position.
- **Special-on-Special Swap Combos** (`src/game/specialCombos.js`):
  - **Striped + Striped**: Cross-beam clearing the entire row AND column.
  - **Striped + Wrapped**: 3-row & 3-column mega beam.
  - **Wrapped + Wrapped**: 5x5 double-explosion area.
  - **Color Bomb + Striped/Wrapped**: Converts every candy of that color into the other special and detonates them all simultaneously.
  - **Color Bomb + Color Bomb**: Clears every tile on the board.
  - **Any other pairing** (e.g. Jelly Fish + Striped, Jelly Fish + Wrapped, Jelly Fish + Jelly Fish): falls back to each special detonating its own individual effect at its own position — the move always does *something*, it just doesn't yet have a bespoke combo shape. See `docs/missing_features.md` for the flavor-specific combos still to design (e.g. "Striped Fish", fish swarms).
- **Chain Reactions**: Any special candy caught inside another special's blast radius (from a match cascade OR a combo swap) also detonates, recursively.

---

## 🗺️ 3. Saga World Map & Progress (`src/components/SagaMap.jsx`, `src/App.jsx`)

- **Scrolling "zone" world map**: `.saga-path` carries a vertical gradient generated from the per-level `THEMES` in `DynamicBackground.jsx`, so each stretch of map previews the backdrop of the level it leads to (and adding a level extends it automatically). Levels are spaced 170px apart to give the map real scroll travel.
- **Parallax depth**: two SVG hill layers translate at 0.28x and 0.14x of the scroll offset (rAF-throttled), plus 4 independently-timed floating cloud emoji with CSS drift.
- **Candy trail**: a dotted SVG polyline connects the nodes, overlaid by a glowing gold ribbon covering the stretch the player has already cleared. Coordinates are computed in measured pixels — SVG's `points` attribute rejects percentage units, which previously prevented the trail from rendering at all.
- **3D stepping-stone nodes**: spherical gradient candy buttons with inner highlight/shadow and a thick base edge that flattens on press for a tactile push; locked nodes render as dimmed grey stones, and the current node glows and pulses.
- **Player marker**: a bouncing 🍬 sits above the current level. It's a sibling of the node rather than a child, so it bobs independently instead of inheriting the node's pulse and hover scaling.
- **Frosted glass header**: absolutely positioned over the scroll region (not a stacked flex sibling) so the map genuinely slides underneath and blurs via `backdrop-filter`, with a bubbly 3D candy text-shadow on the title.
- **Auto-scroll to current level**: on every visit to the home screen, the map automatically centers the player's current (next unlocked, not-yet-starred) level, instead of always opening at level 1.
- **Accessible level nodes**: each node carries an `aria-label` conveying level number, name, star count, and lock state.
- **Level Unlock Progression**: Levels unlock sequentially as previous levels are completed.
- **Star Rating System**: Calculates 1-star, 2-star, or 3-star ratings based on level score thresholds.
- **Settings Menu**: modal with announcer voice gender toggle, background music style toggle, and a mute toggle (see sections 10 & 11).
- **Persistent Progress**: Progress, best scores, and star counts are automatically saved in local browser storage (`localStorage`).
- **Jelly Tiles (Single & Double Layer)** (`src/data/levels.js`, `src/components/GameBoard.jsx`): Translucent background tiles underneath candies, tracked independently of the candy grid so they stay attached to a board position through gravity. Cleared by matching/detonating a candy on top of them — 1 hit for single-layer, 2 for double-layer.
- **Jelly Clearing Mode**: A level objective type (`objective.type === 'jelly'`) that requires clearing all jelly within the move limit, distinct from score-target levels. Used by "Jelly Jungle" (ring layout) and "Chocolate Chasm" (block layout).
- **Completion is separate from stars** (`src/utils/progression.js`): clearing a level always unlocks the next one; stars are purely a performance rating on top. These were previously conflated — unlocking required `stars > 0` while stars are score-based, so clearing a jelly objective with a modest score awarded zero stars and silently left the next level locked (simulation measured this at 84% of Jelly Jungle wins). Legacy saves without a `completed` flag fall back to treating any earned star as a clear.
- **Score levels play out their full move count**: reaching the target no longer ends the level early — the target is a pass line checked when moves run out. Ending on the target capped every run just above it, which made the 2- and 3-star tiers mathematically unreachable (simulated median on level 1 was 1,160 ending early vs 6,770 played out).
- **Simulation-calibrated balance**: level targets, move limits, and star thresholds are tuned against a greedy objective-aware bot run 200× per level, so all three star tiers fall inside the achievable band and the difficulty curve ramps (97% → 90% → 87% → 68% → 86% bot win rate) instead of collapsing to 1% on Lollipop Lane.

---

## 🔨 4. In-Game Boosters (`src/components/BoosterBar.jsx`)

- **Lollipop Hammer**: Allows players to select and instantly smash any single candy on the board (plain clear, no chain detonation even if it hits a special).
- **Shuffle Board**: Manually reshuffles all candies on the board when stuck.
- **Color Bomb Generator**: Instantly spawns a free Color Bomb at a selected tile location.

---

## 🔊 5. Audio & Haptics Engine (`src/utils/sound.js`, `src/utils/haptics.js`)

- **Web Audio API Synthesizer**: Zero external audio downloads required; synthesizes real-time sound effects, unlocked on the first user tap (mobile autoplay policy compliance):
  - Match pop sound, with an ascending-pitch combo sound on multi-cascade streaks.
  - Laser zap sound for Striped Candy detonations.
  - Heavy sub-bass boom for Wrapped Candy explosions.
  - Electric zap/chime for Color Bomb and Jelly Fish detonations.
  - Mega blast sound for any special+special combo swap.
- **Mobile Haptic Feedback**: Triggers native device vibration (`navigator.vibrate`) on matches, special explosions, and big combo streaks.

---

## 📱 6. Mobile & Android Studio PWA Integration

- **Responsive Mobile Layout**: Portrait viewport with `env(safe-area-inset-*)` padding for notched devices.
- **Web App Manifest + Service Worker**: Full PWA configuration via `vite-plugin-pwa` (Workbox-generated service worker, offline precaching) enabling "Add to Home Screen" standalone app mode.
- **Capacitor Android Integration (`capacitor.config.json`, `android/`)**: Native Android project generated and synced; ready to build into a `.apk` in Android Studio via `npx cap open android`.

---

## ✅ 7. Automated Test Coverage (`src/game/board.test.js`)

- 30 Vitest unit tests covering match detection (all shapes), cascade/multiplier resolution, deadlock detection & reshuffle, all combo pairings (including the no-explicit-shape fallback), boosters, and Jelly Fish targeting.

---

## 🎨 8. Visual & Animation Enhancements (`src/utils/particles.js`, `src/components/CandySprite.jsx`, `src/components/CandyShatter.jsx`)

- **HTML5 Canvas Particle Burst System**:
  - Explosive candy fragment particle bursts when tiles match.
  - Glowing laser beam energy blasts (using `screen` blend modes) for Striped Candy clears.
  - Branching, jittering lightning arc effects connecting Color Bombs to matching candies.
  - Dual-layered shockwave ring expansions for Wrapped Candy detonations.
- **Per-Candy Shatter Effect** (`CandyShatter.jsx`): after every move, `GameBoard.jsx` diffs the old board against the new one by candy `id` to find exactly which candies were destroyed, then spawns a shatter burst (central flash + 6 flying, randomly-rotated colored shards) at each one's last known grid position — independent of and layered on top of the general particle burst system above.
- **Physics-Based Animations**:
  - Smooth spring physics for candies spawning, hovering, and tapping using **Framer Motion**.
  - Exaggerated squash-and-stretch entrance animations for a more playful, juicy feel.
  - Candies now animate a bright flash-and-blur **exit** transition (`AnimatePresence`) when cleared, rather than being replaced instantly with no transition.
- **Premium 3D Candy Art**:
  - Glossy SVG candy assets with multi-layered gradients (inner top highlight, inner bottom shadow, and drop shadow).
  - Sri Lankan candy motifs (Kalu Dodol, Kavum, Kokis) built directly into the vector designs.

---

## 🌄 9. Per-Level Dynamic Background (`src/components/DynamicBackground.jsx`)

- Each of the 5 levels has its own themed backdrop, rendered on a full-screen `<canvas>` sitting behind the board (`z-index: -2`): a 3-stop linear gradient, two `screen`-blend accent glow orbs, and ~40 slowly-drifting ambient particles, all colored per level (e.g. pink/magenta for "Sugar Patch," teal/blue for "Jelly Jungle," brown/purple for "Chocolate Chasm").
- A separate CSS-animated layer floats level-themed emoji (🍬🍭✨ for level 1, 🫧💧🪼 for level 3, etc.) slowly upward in the background.
- Falls back to the level 1 theme for any level ID without a defined theme (currently a non-issue since all 5 levels have one).

---

## 🇱🇰 10. Sinhala Voice Announcer & Localization (`src/utils/sound.js`, `public/voices/`)

- **Colloquial Sinhala catchphrases with 3 random variants each**: 36 clips total (3 variants × 6 triggers × 2 genders), so the announcer doesn't repeat itself. Phrasing is deliberately colloquial rather than dictionary Sinhala — e.g. *"නියමයි මචං!"* / *"හොඳයි හොඳයි!"* / *"සුපිරි!"* for a plain match, *"අම්මෝ! වැඩක් නෑ කතා කරලා!"* / *"බලාගෙන! සුපිරිම සුපිරි!"* / *"මචං මේක නම් ලොකු වැඩක්!"* for the biggest combos, plus win/lose sets.
- **Not** the browser's Web Speech API — implementation uses **pre-rendered `.mp3` voice clips** (`public/voices/{male,female}/<key>_<n>.mp3`, generated by `scripts/generate_all_voices.py` via `edge-tts`, run with `npm run voices`).
- **AudioBuffer playback pipeline**: clips are `fetch`ed and `decodeAudioData`'d into `AudioBuffer`s (lazily, on first audio unlock) and played via `AudioBufferSourceNode` rather than `<audio>` elements. This is what makes per-clip reverb, BGM ducking, and overlapping replay possible — `HTMLAudioElement` sits outside the Web Audio graph and can only be bridged once per element.
- **Reverb on big moments**: `elakiri`, `wedak_na`, and `win` route through a `ConvolverNode` fed by a procedurally-generated impulse response (no external IR file to ship), so large combos sound distinctly bigger than an ordinary match.
- **Offline-safe**: the voice clips are included in the service-worker precache via an explicit `workbox.globPatterns` override in `vite.config.js` — the default patterns omit `mp3`, which previously left the clips uncached and the offline guarantee unmet.
- **Graceful degradation**: a missing or undecodable variant falls back to the legacy un-suffixed `<key>.mp3`, and failing that is skipped silently — audio problems never interrupt gameplay.
- **Male / Female voice toggle**: persisted to `localStorage` (`announcerVoice`), switchable from the in-game Settings menu (see section 3).
- **Banner/voice sync**: on-screen banner text and the spoken line both come from a single mapping in `src/utils/announcer.js`, so they cannot drift apart (they previously did — a 3-step cascade showed *එළකිරි!* while the audio said *පට්ට!*). Covered by unit tests.
- **Localized UI Text**: Game UI modals, alerts, and announcer pop-ups fully translated to Sinhala for a consistent thematic experience.

---

## 🎵 11. Procedural Background Music Engine (`src/utils/sound.js`)

- Fully synthesized (no audio files) via Web Audio API oscillators, scheduled with a lookahead loop for drift-free timing.
- **3 selectable rhythmic styles**, switchable live from the Settings menu and persisted to `localStorage` (`bgmStyle`):
  - **Baila**: 140 BPM, sawtooth bassline.
  - **Papare**: 160 BPM, square-wave "trumpet" melody with fast snare rolls.
  - **Kandyan (Getabera)**: 120 BPM, low toms + high-pitched strikes.
- **Mute toggle**: persisted to `localStorage` (`bgmMuted`), accessible from both the Saga Map header button and the Settings menu; BGM auto-starts on the first unlocked user gesture if not muted.
- **Master bus + voice ducking**: all three BGM generators (kick/snare/synth) route through a shared `bgmGain` node instead of connecting straight to `ctx.destination`. While an announcer clip plays, that bus smoothly ducks to 40% and restores afterwards, so the voice always cuts through the Baila/Papare drums. Ducking is refcounted, so overlapping clips can't un-duck the music early, with a timeout backstop in case `onended` never fires (e.g. tab backgrounded mid-clip).
