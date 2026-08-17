# Candy Crush Saga Clone 🇱🇰 (Sinhala Edition)

A high-performance match-3 Web/PWA game built with React, Vite, and Framer Motion, featuring a localized **Sri Lankan / Sinhala Voice Announcer** and packaged for Android via Capacitor.

---

## 🇱🇰 Sinhala Voice & Theme Features

- **High-Energy Offline Sinhala Announcer**:
  - Replaced native Web Speech API with pre-rendered, high-energy `.mp3` voice lines (generated via Microsoft Edge AI TTS) for guaranteed **offline playability**, zero-latency, and cross-browser consistency.
  - **Male / Female Voice Toggle**: A settings menu on the home page allows players to dynamically switch between an energetic Male (පිරිමි) and Female (ගැහැණු) announcer voice.
- **Procedural Background Music Engine**:
  - Fully synthesized background music using the browser's **Web Audio API** (no external audio files used).
  - Dynamically toggle between 3 distinct **Sri Lankan rhythmic styles**:
    - **Baila**: Bouncy 140 BPM 6/8 rhythm with a sawtooth bassline.
    - **Papare**: Driving 160 BPM beat with trumpet-like square waves and fast snare rolls.
    - **Kandyan (Getabera)**: Heavy 120 BPM traditional drum patterns focusing on low toms and high-pitched strikes.
- **Sinhala Catchphrases**:
  - 💥 **3-4 Match**: *"නියමයි!"* (*Niyamai!* – Awesome!)
  - ⚡ **Special Match**: *"පට්ට!"* (*Patta!* – Fantastic!)
  - 🔥 **4-Combo Streak**: *"එළකිරි!"* (*Elakiri!* – Top Class!)
  - 🎆 **Sugar Crush / 5-Combo**: *"වැඩක් නෑ කතා කරලා!"* (*Wedak Na Kathakala!* – Unbelievable!)
  - 🎉 **Level Complete**: *"දින්නා! ජයවේවා!"* (*Dinna! Jaya Wewa!* – Victory!)
  - 😢 **Out of Moves**: *"අයියෝ! පරාදයි!"* (*Aiyo! Paraadai!*)
- **Localized UI**: On-screen animated Sinhala combo banners, win/loss modals, and continuation buttons.

---

## 🎨 Premium Visuals & 🎮 Core Game Features

- **Juicy Graphics & Animations**:
  - **Framer Motion Engine**: Exaggerated squash-and-stretch entrance physics and smooth tap/hover haptics.
  - **60fps Canvas Particle System**: Intense `screen` blend-mode glowing laser beams, branching lightning arcs, and dual-layer shockwave explosions.
  - **3D SVG Candy Sprites**: Sri Lankan motifs (Kavum, Kokis) enhanced with multi-layer inner gloss, drop shadows, and intense sheen reflections.
- **8x8 Match-3 Board**: Supports Striped, Wrapped, Color Bomb, and Jelly Fish special candies with continuous cascading combos.
- **Special Candy Combinations**: Striped+Striped cross beams, Striped+Wrapped 3-row mega beams, Color Bomb board clearers.
- **Animated Saga World Map**: Vertically scrolling layout featuring an SVG winding path, animated floating parallax clouds, glowing stars, and a golden pulsing "current level" indicator. Level path with 1 to 3 star ratings and progress saved to `localStorage`.
- **Level Objectives**: Score Targets, Jelly Clearing, and move limits.
- **In-Game Boosters**: Lollipop Hammer, Shuffle Board, and Color Bomb Generator.
- **Colorblind Accessibility**: Shapes assigned to each candy color (red circle, green diamond, etc.).
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
| `npm test` | Run engine unit tests (Vitest) |

---

## 📁 Project Documentation (`docs/`)

- [docs/implemented_features.md](file:///c:/Users/asus/Documents/apps/candy_crush_saga/docs/implemented_features.md): Overview of all current game mechanics, sound engines, and PWA setup.
- [docs/missing_features.md](file:///c:/Users/asus/Documents/apps/candy_crush_saga/docs/missing_features.md): Single-player roadmap (Coconut Wheel, Licorice Swirls, Candy Bombs, Teleporter Portals).
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
