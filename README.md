# Candy Crush Saga Clone

A match-3 web/PWA game built with React, Vite, and Framer Motion, packaged for Android via Capacitor.

## Features

- 8x8 match-3 board with striped, wrapped, and color bomb special candies
- Chain cascades with an increasing score multiplier
- Special-candy combos (striped+striped, striped+wrapped, color bomb+anything)
- Deadlock detection with automatic reshuffle
- Saga map with star ratings and progress saved to `localStorage`
- Jelly-clear and score-target level objectives
- Boosters: Lollipop Hammer, Shuffle, Color Bomb
- Synthesized Web Audio sound effects + haptic feedback
- Installable PWA (offline-capable via service worker)
- Colorblind-friendly candies (color + shape, not color alone)

## Getting Started

```bash
npm install
npm run dev       # start the dev server (add -- --host to test on your phone)
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the match-3 engine unit tests (Vitest) |

## Project Structure

```
src/
  game/board.js       # match-3 engine (pure functions, unit tested)
  game/board.test.js  # engine tests
  data/levels.js       # level definitions (objectives, move limits, jelly layout)
  utils/sound.js       # synthesized Web Audio sound effects
  utils/haptics.js     # navigator.vibrate helpers
  components/          # GameBoard, SagaMap, BoosterBar, AnnouncerOverlay
  App.jsx              # navigation + progress persistence
```

## Building the Android APK

The `android/` native project is already generated and Capacitor-synced.

1. Open the `android/` folder in Android Studio.
2. Let Gradle sync finish.
3. **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Install the resulting `.apk` on a device or emulator.

After changing any web source code, rebuild and re-sync before rebuilding the APK:

```bash
npm run build
npx cap sync
```

## Installing as a PWA

Run `npm run dev -- --host` (or deploy the `dist/` build), open it in Chrome on your phone, and choose **"Add to Home Screen."**
