# Suggested Improvements

This document lists remaining proposed enhancements to elevate the visual aesthetic, audio quality, performance, and overall user experience of the app. Most of the original Sri Lankan / Sinhala theme visual and audio work (particle FX, custom SVG candy art, voice announcer clips, procedural background music) is now **implemented** — see `docs/implemented_features.md`. What's below is what's actually still missing.

---

## 🎨 1. Visual Polish

- **Level-Win Confetti**:
  - `canvas-confetti` is already an installed dependency but isn't imported or called anywhere in `src/` — wire it up to fire on level completion (`App.jsx`'s win result modal) rather than leaving it dead weight in `package.json`.
- **Animated Star Reveal on Victory Modal**:
  - Stars animate in one by one with a celebratory bounce and particle burst as the score counts up, rather than all appearing at once.
- **True Sugar Crush Board Cascade**:
  - Instead of just calculating bonus points mathematically, visually spawn Striped Candies on the board for each remaining move and detonate them sequentially. This is what the real Candy Crush does.
- **Coconut Wheel Rolling Animation**:
  - When activated, the coconut should visually roll 3 cells along its row/column before firing perpendicular lasers.
- **Score Popup Trajectory Variety**:
  - Instead of purely vertical float, add slight horizontal drift and arc randomization so popups feel more organic.
- **Particle Trail Persistence (Motion Blur)**:
  - Use low-alpha canvas clearing (`globalAlpha = 0.15`) to create glowing trails behind fast-moving particles like laser sparks.

---

## 💡 2. Gameplay & UX Improvements

- **Auto-Hint System**:
  - Automatically pulse or highlight a valid potential match if the player remains idle for 5 seconds.
- **Pre-Game Booster Menu**:
  - Allow players to select starting boosters (e.g. Color Bomb, Striped Candy) on the Level Start screen before entering the game board. Boosters are currently only usable in-game via `BoosterBar`.
- **Custom Level Editor**:
  - Build an in-game drag-and-drop Level Editor component allowing players to design, test, and share custom level layouts.

---

## 🛠️ 3. Build & PWA Enhancements

> Offline service worker support is already implemented (`vite-plugin-pwa`, Workbox-generated `dist/sw.js` with precaching) — not listed here.

- **Automated APK Build Script**:
  - Add an npm package script (`npm run build:apk`) to compile web assets and invoke `npx cap sync android` in one command, rather than running both manually.
