# Candy Crush Saga Clone 🇱🇰 (Sinhala Edition)

A high-performance match-3 Web/PWA game built with React, Vite, and Framer Motion, featuring a localized **Sri Lankan / Sinhala Voice Announcer** and packaged for Android via Capacitor.

---

## 🇱🇰 Sinhala Voice & Theme Features

- **High-Energy Offline Sinhala Announcer**:
  - Replaced native Web Speech API with pre-rendered, high-energy `.mp3` voice lines (generated via Microsoft Edge AI TTS) for genuine **offline playability**, zero-latency, and cross-browser consistency. All 36 clips are precached by the service worker.
  - **3 random variants per trigger** so the announcer never repeats the same line twice in a row, in deliberately colloquial Sinhala (*මචං*, *සුපිරි*, *මරු*) rather than formal dictionary phrasing.
  - **Stadium reverb** on big combos and wins, and the background music **automatically ducks** while a voice line plays so it always cuts through.
  - **Male / Female Voice Toggle**: A settings menu on the home page allows players to dynamically switch between an energetic Male (පිරිමි) and Female (ගැහැණු) announcer voice.
- **Procedural Background Music Engine**:
  - Fully synthesized background music using the browser's **Web Audio API** (no external audio files used).
  - Dynamically toggle between 3 distinct **Sri Lankan rhythmic styles**:
    - **Baila**: Bouncy 140 BPM 6/8 rhythm with a sawtooth bassline.
    - **Papare**: Driving 160 BPM beat with trumpet-like square waves and fast snare rolls.
    - **Kandyan (Getabera)**: Heavy 120 BPM traditional drum patterns focusing on low toms and high-pitched strikes.
- **Sinhala Catchphrases** — banner text and the spoken line are chosen together from one shared mapping (`src/utils/announcer.js`), so they always agree:
  - 💥 **Single match, no chain**: *"නියමයි!"* (*Niyamai!* – Awesome!)
  - ⚡ **One special candy, or a 2-step cascade**: *"පට්ට!"* (*Patta!* – Fantastic!)
  - 🔥 **3-step cascade**: *"එළකිරි!"* (*Elakiri!* – Top Class!)
  - 🎆 **Special+special combo, or a 4+ step cascade**: *"වැඩක් නෑ කතා කරලා!"* (*Wedak Na Kathakala!* – Unbelievable!)
  - 🎉 **Level Complete** / 😢 **Out of Moves**: dedicated win/lose voice clips; the result screen headline reads *"දින්නා! 🎉"* / *"අයියෝ! Moves ඉවරයි 😢"*.
- **Localized UI**: On-screen Sinhala combo banners, win/loss modals, and continuation buttons.

---

## 🎨 Premium Visuals & 🎮 Core Game Features

- **Juicy Graphics & Animations**:
  - **Framer Motion Engine**: Exaggerated squash-and-stretch entrance physics, a flash-and-blur exit transition on cleared candies, and smooth tap/hover haptics.
  - **60fps Canvas Particle System**: Intense `screen` blend-mode glowing laser beams, branching lightning arcs, and dual-layer shockwave explosions.
  - **Per-Candy Shatter Effect**: every destroyed candy is diffed out of the board and gets its own central flash + flying colored shard burst at its last position.
  - **3D SVG Candy Sprites**: Sri Lankan motifs (Kavum, Kokis) enhanced with multi-layer inner gloss, drop shadows, and intense sheen reflections.
  - **Per-Level Dynamic Backgrounds**: each level has its own animated canvas backdrop (themed gradient, glow orbs, drifting ambient particles) plus a slow-floating layer of level-themed emoji.
- **8x8 Match-3 Board**: Supports Striped, Wrapped, Color Bomb, Jelly Fish, Coconut Wheel, and Lucky Candy specials with continuous cascading combos.
- **Special Candy Combinations**: Striped+Striped cross beams, Striped+Wrapped 3-row mega beams, Color Bomb board clearers. Any pairing without a bespoke shape falls back to each special detonating individually, so a combo swap never wastes a move.
- **Candy Bombs**: timed countdown hazards with a visible fuse badge that turns red under 3 moves; any bomb reaching zero fails the level instantly.
- **Pre-Level Briefing**: every level opens with a card naming the objective, move budget, 3-star score, and any hazards on the board before you commit to playing.
- **Animated Saga World Map**: Vertically scrolling layout featuring an SVG winding path, animated floating parallax clouds, glowing stars, and a golden pulsing "current level" indicator. Auto-scrolls to the player's current level on every visit instead of always opening at level 1. Level path with 1 to 3 star ratings and progress saved to `localStorage`.
- **10 Levels Across 10 Themed Zones**: score-target and jelly-clearing objectives, five distinct jelly layouts (ring, block, checkerboard, corners, full board), and candy bombs on three levels. Targets, move limits and star thresholds are calibrated by simulating each level 250-300x through the real engine.
- **Sugar Crush Bonus**: clearing an objective early cashes every unspent move in for bonus points, so finishing efficiently is rewarded rather than punished.
- **In-Game Boosters**: Lollipop Hammer, Shuffle Board, and Color Bomb Generator.
- **Shape-Coded Candies**: each color carries its own silhouette (red kavum dome, green dodol diamond, blue hexagon, orange rounded square, yellow kokis star, purple royal star) so color is not the only channel. Note the two star shapes remain close in outline — worth revisiting for full colorblind safety.
- **Offline PWA & Capacitor Android APK**: Instant offline loading via Service Worker and ready for Android Studio APK compilation.

---

## 🚀 Getting Started

```bash
npm install
npm run dev       # Start dev server (add -- --host to test on your phone over Wi-Fi)
```

---

## 📜 Project Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Compile production build to `dist/` and generate PWA service worker |
| `npm run preview` | Preview production build locally |
| `npm test` | Run the 122 unit tests across engine, level data, progression, grid geometry, particles, storage, and announcer (Vitest) |
| `npm run voices` | Regenerate all 36 Sinhala voice clips (needs Python + `pip install edge-tts`) |

---

## 📁 Project Documentation (`docs/`)

- [docs/implemented_features.md](file:///c:/Users/asus/Documents/apps/candy_crush_saga/docs/implemented_features.md): Overview of all current game mechanics, sound engines, and PWA setup.
- [docs/missing_features.md](file:///c:/Users/asus/Documents/apps/candy_crush_saga/docs/missing_features.md): Single-player roadmap (spreading chocolate, Licorice Swirls, Teleporter Portals, ingredient-drop and order modes, the out-of-moves "+5" offer).
- [docs/improvements.md](file:///c:/Users/asus/Documents/apps/candy_crush_saga/docs/improvements.md): Remaining polish and UX ideas (confetti, auto-hint, pre-game booster menu, level editor, APK build script) — most of the original Sri Lankan audio/visual wishlist is now shipped and documented in `implemented_features.md` instead.

---

## 📱 Building the Android APK (Android Studio)

The `android/` native project is pre-configured and Capacitor-synced.

1. Open the `android/` directory in **Android Studio**.
2. Let Gradle finish syncing.
3. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Install the generated `.apk` file directly on your personal Android phone!

After modifying web source code, re-sync Capacitor before rebuilding the APK:

```bash
npm run build
npx cap sync
```
