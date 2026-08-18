# Candy Saga 👑 (Match-3 Adventure)

A high-performance match-3 Web/PWA game built with React, Vite, and Framer Motion, featuring a **Sugar Kingdom** aesthetic and packaged for Android via Capacitor.

**App ID**: `app.kandy.crush`

---

## 🏰 👑 Sugar Kingdom Theme & Visual Features

- **👑 Royal Crown Header Banner**:
  - Main header features **👑 Candy Saga** in 3D candy text shadow, an animated golden crown badge, and a frosted glass banner with a glowing golden bottom border.
- **🏰 Sugar Gem Castle Peak**:
  - A majestic 3D animated **Sugar Gem Castle** (`🏰✨👑`) crowns the top peak of the winding map trail with a pulsing radial gold aura.
- **💎 3D Cut Sugar Gem Level Nodes**:
  - Map level nodes feature cut sugar gem geometry with top crystal shine lines (`::before`), 3D depth, and glowing golden crown current-level auras (`.current-level`).
- **✨ Floating Sugar Kingdom Particles**:
  - Ambient floating sugar crystals, diamonds, crowns, and sparkles (`💎`, `✨`, `👑`, `🍬`, `🔮`, `⭐`) drift continuously across the map backdrop.
- **🚀 Pulsing Royal Play Button**:
  - Bottom `"Play Level"` button features a 3D Royal Gold & Magenta bar with a crown badge, spinning sparkle icon, and shimmering light sweep animations.
- **📜 Royal Level Briefing Modal**:
  - Pre-game briefing card features a **Golden Crown & Gem Crest** (`💎 👑 💎`), parchment frame with gold borders, glowing target badges, and **3D Holographic Booster Selection Cards**.

---

## 🎙️ Voice Announcer & Sound Engine

- **High-Energy Offline Voice Announcer**:
  - Pre-rendered English voice lines (`en-US-GuyNeural` / `en-US-EmmaNeural` via Microsoft Edge TTS) for genuine **offline playability**, zero latency, and cross-browser consistency. All 48 clips are precached by the service worker.
  - The vocabulary is the genre's escalation ladder — **Sweet! → Tasty! → Delicious! → Divine!**, with **Sugar Crush!** on a win. The spoken word, the banner and the floating combo label all come from one mapping (`src/utils/announcer.js`), so they cannot disagree about the same move.
  - **3 variants per trigger** picked at random, so the announcer never repeats the same line twice in a row ("Delicious!" / "Simply delicious!" / "Mouth-watering!").
  - **Stadium reverb** on big combos and wins, and background music **automatically ducks** while a voice line plays so it cuts through clearly.
  - **Male / Female Voice Toggle**: Settings menu on the home page allows players to dynamically switch between Male and Female announcer voices.
- **Procedural Orchestral Music Engine**:
  - Fully synthesized background music using the browser's **Web Audio API** (zero external audio files used, ensuring instant loading and 100% offline playability).
  - Dynamically toggle between 3 distinct **Candy Saga Music Styles**:
    - **Orchestral**: Upbeat 128 BPM C-Major marimba & glockenspiel melody with pizzicato bass accompaniment.
    - **Sweet Marimba**: Light, bouncy wooden bell and percussion theme.
    - **Ambient Chill**: Relaxed 96 BPM pentatonic harp and flute bed for puzzle gameplay.

---

## 🎨 Premium Visuals & 🎮 Core Game Features

- **Juicy Graphics & Animations**:
  - **Framer Motion Engine**: Exaggerated squash-and-stretch entrance physics, a flash-and-blur exit transition on cleared candies, and smooth tap/hover haptics.
  - **60fps Canvas Particle System**: Intense `screen` blend-mode glowing laser beams, branching lightning arcs, and dual-layer shockwave explosions.
  - **Per-Candy Shatter Effect**: every destroyed candy is diffed out of the board and gets its own central flash + flying colored shard burst at its last position.
  - **3D SVG Candy Sprites**: each candy is one path reused four times — body, rim shading, gloss and stripe overlay — so every layer follows the silhouette exactly. A two-part specular highlight (soft bloom plus a tight hot core) and a darker contour keep adjacent same-hue candies from merging on a busy board.
  - **Per-Level Dynamic Backgrounds**: each level has its own animated canvas backdrop (themed gradient, glow orbs, drifting ambient particles) plus a slow-floating layer of level-themed emoji.
  - **Combo Reaction Labels**: Escalating praise text floats on cascades — "Sweet!" (2-cascade), "Tasty!" (3-cascade), "Divine!" (4+), and rainbow "Sugar Crush!" for double-special combos.
  - **Board Camera Shake**: The grid physically shakes on Wrapped detonations, Color Bomb zaps, and 3+ cascades.
  - **Striped Candy Energy Shimmer**: Continuous light beam slides along the stripe direction, making striped candies feel charged. The bands themselves are painted *under* the candy's rim shading and specular, so they curve with the sweet instead of lying flat on top of it.
  - **Wrapped Candy Wrapper**: crimped ends in the candy's own dark tone plus a translucent film with a hard diagonal sheen — previously a white dashed rectangle, which read as a selection marquee rather than cellophane.
  - **Colour Bomb Sphere**: a dark glossy ball whose sprinkles are laid out on a golden-angle spiral and flattened toward the rim to fake foreshortening; that curvature, not the sprinkle colours, is what stops it reading as a flat disc.
  - **Invalid Swap Slide-and-Bounce**: Rejected swaps slide each candy 45% toward the other, "collide", and spring back — much clearer than a shake-in-place.
  - **Star Threshold Burst**: Crossing a star threshold triggers a bouncy scale animation with a golden flash on the earned star marker.
  - **Jelly Clear Splatter**: Translucent cyan glass fragments fly outward when jelly is destroyed.
  - **Color Bomb Vortex**: Spiral energy particles swirl inward before the lightning zap releases.
  - **Score Roll-Up**: HUD score plays a scale-bounce when points are added, and the digits travel to the new value over ~450ms on an easeOutCubic rather than snapping. It is driven off elapsed time, not frame count, so a phone at 30fps takes the same wall-clock time to arrive, and it is skipped entirely under `prefers-reduced-motion`.
  - **Wrapped Candy Pulsing Glow**: Subtle breathing pulse glow that expands outward, hinting at contained energy.
  - **Background Reactivity**: Background flashes brighter on big combos (4+ cascade) and subtly darkens/reddens when a Candy Bomb timer reaches ≤ 2.
  - **Animated Star Reveal**: Victory modal stars spin in one at a time instead of the final tally appearing on the first frame.
  - **True Sugar Crush Board Cascade**: Each leftover move spawns a real Striped Candy on the board and detonates it, one every 240ms, with the score climbing per detonation.
  - **Coconut Wheel Rolling Animation**: The wheel visibly rolls and spins across its 3 cells, and only then do the perpendicular lasers fire.
  - **Score Popup Trajectory Variety**: Each floating score gets its own arc — sideways drift, rise height, tilt and duration — so overlapping popups during a cascade stay readable.
  - **Particle Trail Persistence (Motion Blur)**: The particle canvas erases partially each frame (`destination-out`) so fast particles leave decaying trails.

- **8x8 Match-3 Board**: Supports Striped, Wrapped, Color Bomb, Jelly Fish, Coconut Wheel, and Lucky Candy specials with continuous cascading combos.
- **Special Candy Combinations**: Striped+Striped cross beams, Striped+Wrapped 3-row mega beams, Color Bomb board clearers. Any pairing without a bespoke shape falls back to each special detonating individually, so a combo swap never wastes a move.
- **Blockers**: licorice swirls (unmatchable, unswappable, and they absorb striped beams), spreading chocolate that eats a candy on any turn it survives untouched, and locked candies freed by matching them.
- **Keyboard & Screen Reader Support**: the board is a proper ARIA grid with a roving tabindex — arrow keys to move, Enter to pick up and swap, Escape to cancel — plus a live region announcing score, moves and combos.
- **Pre-Game Booster**: arm one free Striped, Wrapped or Color Bomb on the briefing card and it is seeded onto the board before your first move.
- **Candy Bombs**: timed countdown hazards with a visible fuse badge that turns red under 3 moves; any bomb reaching zero fails the level instantly.
- **Pre-Level Briefing**: every level opens with a card naming the objective, move budget, 3-star score, and any hazards on the board before you commit to playing.
- **Animated Saga World Map**: Vertically scrolling layout featuring an SVG winding path, animated floating parallax clouds, glowing stars, and a golden pulsing "current level" indicator. Auto-scrolls to the player's current level on every visit instead of always opening at level 1. Level path with 1 to 3 star ratings and progress saved to `localStorage`.
- **11 Levels Across 11 Themed Zones**: score-target and jelly-clearing objectives, five distinct jelly layouts (ring, block, checkerboard, corners, full board), and candy bombs on three levels. Targets, move limits and star thresholds are calibrated by simulating each level 120x through the real engine, driven by a player model that ranks candidate swaps by *visible* information only — bombs, jelly, and immediate match size — never by the cascade that follows. Measured clear rate for an attentive player: 94 / 88 / 88 / 90 / 83 / 73 / 90 / 79 / 68 / 69 / 83%.
- **Icon-Based Objective HUD**: the objective is an icon and a count, not a sentence. Both level types count **down to zero** — jelly tiles remaining, or points still needed — so "am I close?" is one number regardless of level type, and the panel turns green when it hits zero. The jelly icon reuses the exact cyan of the board's jelly overlay, since an icon that doesn't match the tile it stands for is just decoration. Moves and score sit beside it as equal panels, each a large value over a small caption.
- **Sugar Crush Bonus**: every level ends the instant its objective is met — including score levels, which end the moment the target is crossed — and each unspent move is then cashed in as a real striped candy that spawns and detonates on the board, worth 300 points. Finishing in 12 of 20 moves pays 2,400 on top of the spectacle, so speed is the route to 3 stars.
- **In-Game Boosters**: Lollipop Hammer, Shuffle Board, and Color Bomb Generator.
- **Shape-Coded Candies**: confectionery silhouettes, one per colour — red jelly bean, orange wrapped lozenge, yellow lemon drop, green square chew, blue boiled sweet, purple cluster. Colour is never the only channel: all six differ in outline alone (elongated-and-tilted, angular-and-wide, asymmetric-point, four-equal-sides, plain-round, scalloped). They were previously a heart, star, diamond, hexagon, circle and rounded square, which read as a jewel game rather than a candy one.
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
| `npm test` | Run the 151 unit tests across engine, level data, progression, grid geometry, particles, storage, and announcer (Vitest) |
| `npm run voices` | Regenerate the 36 announcer voice variants plus 12 fallback clips (needs Python + `pip install edge-tts`) |

---

## 📁 Project Documentation (`docs/`)

- [docs/implemented_features.md](file:///c:/Users/asus/Documents/apps/candy_crush_saga/docs/implemented_features.md): Overview of all current game mechanics, sound engines, and PWA setup.
- [docs/missing_features.md](file:///c:/Users/asus/Documents/apps/candy_crush_saga/docs/missing_features.md): Single-player roadmap (spreading chocolate, Licorice Swirls, Teleporter Portals, ingredient-drop and order modes, the out-of-moves "+5" offer).
- [docs/improvements.md](file:///c:/Users/asus/Documents/apps/candy_crush_saga/docs/improvements.md): Remaining polish and UX ideas (confetti, auto-hint, pre-game booster menu, level editor, APK build script) — most of the original audio/visual wishlist is now shipped and documented in `implemented_features.md` instead.

---

## 📱 Building the Android APK (Android Studio)

The `android/` native project is pre-configured and Capacitor-synced.

1. Open the `android/` directory in **Android Studio**.
2. Let Gradle finish syncing.
3. Click **Build > Generate Signed Bundle / APK...**.
4. Use the keystore credentials from [android_signing_info.md](android_signing_info.md).
5. Install the generated `.apk` file directly on your Android phone!

After modifying web source code, re-sync Capacitor before rebuilding the APK:

```bash
npm run build
npx cap sync
```
