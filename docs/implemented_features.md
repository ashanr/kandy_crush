# Implemented Features

This document provides a comprehensive overview of all features currently built and fully operational in this Candy Crush Saga clone repository.

---

## 🎮 1. Core Match-3 Game Engine (`src/game/board.js`)

- **Dynamic 8x8 Grid**: Full grid management supporting candy spawning, movement, matching, and falling gravity physics.
- **Touch & Swipe Controls**: Intuitive mobile drag-and-swipe interaction for swapping adjacent tiles.
- **Invalid Swap Rejection**: A swap that creates no match (and involves no special candy) is rejected before any state change — the board state never moves. A rejection sound and haptic fire, and both tiles play a 420ms directional slide-and-bounce (`.candy-cell.rejected-{left,right,up,down}`): each candy lunges toward the other, collides, and springs back, so the refusal reads as "that move isn't legal" rather than as a dropped input.
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
- **Coconut Wheel**:
  - **3-Space Directional Roll**: Swapping a Coconut Wheel rolls it **3 grid spaces** in the direction of the swipe.
  - **Perpendicular Laser Detonation**: Converts every tile in its path into a Striped Candy and instantly detonates it, triggering horizontal/vertical laser beams across the board.
- **Lucky Candy**:
  - **Objective-Based Auto-Transformation**: Acts as a neutral special gem (`✓`). When matched or detonated, automatically transforms into whichever item fulfills active level objectives (a **Jelly Fish** on Jelly levels, or a **Color Bomb / Striped Candy** on Score levels).
- **Special + Normal Swap → Single Detonation**: Swapping any special candy with a plain candy always succeeds (even with no incidental 3-match) and detonates the special once at its new position.
- **Special-on-Special Swap Combos** (`src/game/specialCombos.js`):
  - **Striped + Striped**: Cross-beam clearing the entire row AND column.
  - **Striped + Wrapped**: 3-row & 3-column mega beam.
  - **Wrapped + Wrapped**: 5x5 double-explosion area.
  - **Color Bomb + Striped/Wrapped**: Converts every candy of that color into the other special and detonates them all simultaneously.
  - **Color Bomb + Color Bomb**: Clears every tile on the board.
  - **Any other pairing** (e.g. Jelly Fish + Striped, Jelly Fish + Wrapped, Jelly Fish + Jelly Fish): falls back to each special detonating its own individual effect at its own position — the move always does *something*, it just doesn't yet have a bespoke combo shape. See `docs/missing_features.md` for the flavor-specific combos still to design (e.g. "Striped Fish", fish swarms).
- **Chain Reactions**: Any special candy caught inside another special's blast radius (from a match cascade OR a combo swap) also detonates, recursively.

### Blockers

- **Licorice Swirl** (`BLOCKER.LICORICE`): occupies a cell instead of a candy. Carries no `color`, which makes it unmatchable for free — `findMatches` keys entirely off `cell?.color` and a run of colourless cells fails its `prevColor` guard. Cannot be swapped, and **absorbs striped beams**: a horizontal/vertical clear stops at the swirl rather than passing through, so a licorice wall genuinely shields what is behind it. Removed only by collateral damage from an adjacent clear.
- **Chocolate** (`BLOCKER.CHOCOLATE`): same unmatchable/unswappable rules, plus growth. If a move destroys no chocolate, `spreadChocolate()` picks one legal growth site across *all* chocolate blocks (so growth isn't biased toward scan order) and consumes an adjacent candy. It will not eat another blocker or a locked candy. That "punish inaction" pressure is the point of the hazard — without it chocolate is a wall you can ignore.
- **Locked candies** (`cell.locked`): a normal candy in a cage. It cannot be swapped, but it *can* be part of a match — and when it is, the cage takes the hit and the candy survives, freed for the next move. A freed lock does not also smash a neighbouring blocker; the hit was spent on the cage.
- **Deadlock safety**: `swapCreatesMatch` rejects unswappable pairs, so deadlock detection and the idle hint can't report a "legal move" that `attemptMove` would refuse.
- **Deviation from the original**: blockers fall with gravity here. Real chocolate is anchored, but anchoring it means candies can no longer refill the column beneath it, leaving permanent holes — a far larger change to gravity and refill than the hazard warrants.
- Used by **Marshmallow Marsh** (a licorice wall splitting the board) and **Cocoa Quarry** (two chocolate seeds plus four caged candies).

### Candy Bombs (timed hazard)

- **Countdown hazard** (`finalizeMove()` in `board.js`): levels may seed N bombs with a fuse length (`initialBombs` / `bombTimer` in `src/data/levels.js`; currently "Chocolate Chasm" at 3 bombs / 12 moves). Every valid move — including booster uses — decrements every bomb on the board. Any bomb reaching zero ends the level immediately in a loss.
- **Visible countdown** (`CandySprite.jsx`): a bombed candy renders a dark radial overlay with a 🔥 fuse spark and a monospace countdown badge, switching to a red `danger-pulse` at 3 moves or fewer. This overlay existed but was dead code until `GameBoard` was fixed to forward the `bombTimer` prop — bombs previously ticked down and ended the run completely invisibly, which simulation measured as an unexplained instant loss in 16.3% of level-5 runs (always on move 12 of 15).
- **Distinct loss reason**: `onLose` carries a reason so the result modal reads *Bomb Exploded! 💣* on a bomb detonation instead of incorrectly claiming the player ran out of moves.

---

## 🗺️ 3. Saga World Map & Progress (`src/components/SagaMap.jsx`, `src/App.jsx`)

- **Sugar Kingdom Theme**: Main home page title set to **👑 Candy Saga** in 3D candy text shadow with an animated golden crown badge and frosted glass banner featuring a glowing golden bottom border (`border-bottom: 2.5px solid rgba(255, 215, 0, 0.55)`).
- **Sugar Gem Castle Peak**: A 3D animated **Sugar Gem Castle** (`🏰✨👑`) crowns the top peak of the winding map trail with a pulsing radial gold aura.
- **3D Cut Sugar Gem Nodes**: Level nodes styled as 3D cut sugar gem tiles featuring top crystal shine lines (`::before`), 3D depth, and glowing golden crown current-level auras (`.current-level`).
- **Floating Sugar Kingdom Particles**: Ambient floating sugar crystals, diamonds, crowns, and sparkles (`💎`, `✨`, `👑`, `🍬`, `🔮`, `⭐`) drift continuously across the map backdrop.
- **Pulsing Royal Play Button**: Bottom `"Play Level"` button features a 3D Royal Gold & Magenta bar with a crown badge, spinning sparkle icon, and shimmering light sweep animations.
- **Scrolling "zone" world map**: `.saga-path` carries a vertical gradient generated from the per-level `THEMES` in `DynamicBackground.jsx`, so each stretch of map previews the backdrop of the level it leads to. Levels are spaced 170px apart to give the map real scroll travel.
- **Parallax depth**: two SVG hill layers translate at 0.28x and 0.14x of the scroll offset (rAF-throttled), plus 4 independently-timed floating cloud emoji with CSS drift.
- **Candy trail**: a dotted SVG polyline connects the nodes, overlaid by a glowing gold ribbon covering the stretch the player has already cleared. Coordinates are computed in measured pixels — SVG's `points` attribute rejects percentage units, which previously prevented the trail from rendering at all.
- **Player marker**: a bouncing 🍬 sits above the current level. It's a sibling of the node rather than a child, so it bobs independently instead of inheriting the node's pulse and hover scaling.
- **Return-from-win celebration**: beating a level used to produce a map identical to opening the app cold — `SagaMap` fully remounts and every node replayed the same staggered pop-in regardless of what had just happened. `App` now hands the map a `celebration` payload on a win, and the map plays the payoff: the newly-earned stretch of trail draws itself (animated `pathLength`), the stars just earned drop into the beaten node one at a time, and the level it unlocked bursts open with a glow. The view auto-scrolls to the midpoint between the two nodes so the whole sequence happens on screen. Only wins celebrate — losing or exiting mid-level returns to a quiet map.
- **Total star counter**: the header carries a running `★ 14/30`. Per-level stars were shown on every node but never summed, so the player had no single figure for overall progress; it pulses when a win adds to it.
- **Auto-scroll to current level**: on every visit to the home screen, the map automatically centers the player's current (next unlocked, not-yet-starred) level, instead of always opening at level 1.
- **Cleared trail keyed on completion**: the gold ribbon covers levels actually cleared rather than levels that earned a star — a level beaten for zero stars is still behind you, and the ribbon previously stopped short of it.
- **Accessible level nodes**: each node carries an `aria-label` conveying level number, name, star count, and lock state.
- **Level Unlock Progression**: Levels unlock sequentially as previous levels are completed.
- **Star Rating System**: Calculates 1-star, 2-star, or 3-star ratings based on level score thresholds.
- **Settings Menu**: modal with announcer voice gender toggle, background music style toggle, and a mute toggle (see sections 12 & 13).
- **Persistent Progress**: Progress, best scores, and star counts are automatically saved in local browser storage (`localStorage`).
- **Jelly Tiles (Single & Double Layer)** (`src/data/levels.js`, `src/components/GameBoard.jsx`): Translucent background tiles underneath candies, tracked independently of the candy grid so they stay attached to a board position through gravity. Cleared by matching/detonating a candy on top of them — 1 hit for single-layer, 2 for double-layer.
- **Jelly Clearing Mode**: A level objective type (`objective.type === 'jelly'`) that requires clearing all jelly within the move limit, distinct from score-target levels. Used by "Jelly Jungle" (ring layout) and "Chocolate Chasm" (block layout).
- **Completion is separate from stars** (`src/utils/progression.js`): clearing a level always unlocks the next one; stars are purely a performance rating on top. These were previously conflated — unlocking required `stars > 0` while stars are score-based, so clearing a jelly objective with a modest score awarded zero stars and silently left the next level locked (simulation measured this at 84% of Jelly Jungle wins). Legacy saves without a `completed` flag fall back to treating any earned star as a clear.
- **Score levels play out their full move count**: reaching the target no longer ends the level early — the target is a pass line checked when moves run out. Ending on the target capped every run just above it, which made the 2- and 3-star tiers mathematically unreachable (simulated median on level 1 was 1,160 ending early vs 6,770 played out).
- **11 levels across 11 themed zones**: 5 score-target levels and 6 jelly levels, three of which also carry candy bombs. Jelly layouts come from five shape builders — ring, centre block, checkerboard (spread across the board so it can't be cleared by camping one region), corners (the hardest area to reach, since gravity refills from the top), and full coverage for the finale.
- **Simulation-calibrated balance**: level targets, move limits, and star thresholds are tuned against a player model run 120× per level.

  The model matters more than the sample size, and getting it wrong is what made the game unwinnable twice. A bot that evaluates every legal swap and takes the best one is not a player; neither is a bot that notices only a handful of swaps but still ranks them by the *cascade score that results*, because no human can see that while looking at a board. The reference player therefore ranks candidates by visible information only — bombs it can see, jelly it can see, and how many candies the immediate match removes — and treats cascades as luck. Under the previous calibration this model cleared level 1 on 23% of runs and level 6 on 3%, against the solver figures of 91% and 76% that had been used to sign those levels off.

  Measured clear rate with the shipped values, at three attention levels (notices 3 / 6 / 10 candidate swaps): 95·94·98, 78·88·93, 68·88·92, 82·90·89, 50·83·93, 63·73·82, 65·90·88, 71·79·77, 35·68·76, 32·69·81, 63·83·85. The full table and methodology are recorded in the comment block at the top of `src/data/levels.js`.
- **A win always earns at least one star**: the 1-star tier sits below the observed win floor on every level — pinned to the objective target on score levels (the target *is* the pass line), and under the p05 of winning scores on jelly levels. An earlier calibration placed it at the p15 and produced 0-star wins on 10–16% of every jelly level.
- **Level invariants are tested** (`src/data/levels.test.js`, 46 cases): sequential ids, ascending thresholds, a star guaranteed at the score target, correctly-sized jelly layouts that actually contain jelly, bomb fuses shorter than the move limit (a fuse ≥ the limit can never detonate, silently reducing the hazard to decoration), and a matching background theme for every level.

---

## 🧭 4. In-Game UX Aids

- **Royal Level Briefing Modal** (`src/components/LevelIntro.jsx`): selecting a map node opens a briefing before the board mounts, featuring a **Golden Crown & Gem Crest** (`💎 👑 💎`), double-gold border parchment frame (`.royal-briefing-card`), glowing target badges, and **3D Holographic Booster Cards** with pulsing `armedPulse` selection glows. Shows the level number and name, objective as an icon plus Sinhala/English text, move budget, 3-star score, and a red hazard banner naming bomb count and fuse length on levels that carry them.
- **Sugar Crush leftover-moves bonus** (`GameBoard.jsx`, `SugarCrush.jsx`): clearing the objective early cashes every unspent move in at 300 points, mirroring the original's habit of converting leftover moves into striped candies and detonating them. The celebration overlay shows the arithmetic (`N moves left` → `+1,800`) rather than silently inflating the score. This removed a measured perverse incentive: jelly levels end the instant the objective is met, so clearing efficiently used to starve the score and cost stars, making the star-maximising strategy *avoid* the objective.

  Score levels now end the instant the target is crossed too, and take the same bonus. They previously ran to the last move on the theory that ending early would cap scores just above the target — which meant `leftover` was always 0 on a score level, so five of the eleven levels silently skipped the entire Sugar Crush sequence: no striped candies, no climbing score, straight to the result modal. The bonus is what makes ending early pay, so the original concern no longer applies: a level 1 cleared in 12 of 20 moves scores 1,200 + 2,400.
- **Floating score popups** (`src/components/ScorePopup.jsx`): the points earned by a move drift up off the swapped cell, in bigger gold type at 500+. Previously a 3-match and a wrapped+striped combo looked equally rewarding despite differing by an order of magnitude. Positioned in grid padding-box coordinates, the same space the particle canvas and shatter overlay use.
- **Star progress bar** (`src/components/StarProgress.jsx`): a filling score bar with markers at each star threshold that light up as they're passed. The tiers are calibrated to be reachable but were previously invisible — the HUD showed a bare score with no indication of what any tier required.
- **Idle auto-hint**: after 5 seconds without input, a valid move pulses on the board. Reuses the engine's existing `findAnyValidMove()` (already present for deadlock detection); runs on a timer rather than per frame, since it evaluates every adjacent swap. Any touch clears it and restarts the countdown.
- **Low-moves warning**: at 5 moves or fewer the move counter turns red and pulses.
- **Retry without leaving the level**: the result modal offers Retry alongside Continue/Map, remounting the board via an attempt key instead of forcing a round-trip through the saga map.

---

## 🔨 5. In-Game Boosters (`src/components/BoosterBar.jsx`)

- **Lollipop Hammer**: Allows players to select and instantly smash any single candy on the board (plain clear, no chain detonation even if it hits a special).
- **Shuffle Board**: Manually reshuffles all candies on the board when stuck.
- **Color Bomb Generator**: Instantly spawns a free Color Bomb at a selected tile location.

---

## 🔊 6. Audio & Haptics Engine (`src/utils/sound.js`, `src/utils/haptics.js`)

- **Web Audio API Synthesizer**: Zero external audio downloads required; synthesizes real-time sound effects, unlocked on the first user tap (mobile autoplay policy compliance):
  - Match pop sound, with an ascending-pitch combo sound on multi-cascade streaks.
  - Laser zap sound for Striped Candy detonations.
  - Heavy sub-bass boom for Wrapped Candy explosions.
  - Electric zap/chime for Color Bomb and Jelly Fish detonations.
  - Mega blast sound for any special+special combo swap.
- **Mobile Haptic Feedback**: Triggers native device vibration (`navigator.vibrate`) on matches, special explosions, and big combo streaks.

---

## 📱 7. Mobile & Android Studio PWA Integration

- **Responsive Mobile Layout**: Portrait viewport with `env(safe-area-inset-*)` padding for notched devices. The board is sized from `--board-size`, a `min()` of the available width, the available height (`100dvh` minus a fixed chrome allowance, with a `100vh` fallback under `@supports`) and a 560px cap — so it is constrained by whichever axis is tighter. It previously keyed off width alone with a 480px cap and no media queries at all, which stranded ~300px of dead space beneath the booster bar on a 430×932 phone. A `.board-stage` flex region absorbs the remaining height, centring the board and pinning the booster bar to the bottom, and the HUD, star bar and booster bar all track `--board-size` so they align to the board's edges.
- **Web App Manifest + Service Worker**: Full PWA configuration via `vite-plugin-pwa` (Workbox-generated service worker, offline precaching) enabling "Add to Home Screen" standalone app mode.
- **Capacitor Android Integration (`capacitor.config.json`, `android/`)**: Native Android project generated and synced; ready to build into a `.apk` in Android Studio via `npx cap open android`.

---

## ✅ 8. Automated Test Coverage

- **151 Vitest unit tests across 7 files:**
  - `src/data/levels.test.js` (46) — level invariants: ids, thresholds, objective/layout agreement, bomb fuse sanity, theme coverage.
  - `src/utils/particles.test.js` (9) — idle detection and the activity notification that restarts a parked render loop.
  - `src/utils/storage.test.js` (6) — guarded persistence against both a working and a throwing `localStorage`.
  - `src/game/board.test.js` (35) — match detection (all shapes), cascade/multiplier resolution, deadlock detection & reshuffle, all combo pairings (including the no-explicit-shape fallback), boosters, Jelly Fish targeting, and candy-bomb countdown/detonation.
  - `src/utils/progression.test.js` (13) — completion vs. stars, unlock rules, legacy-save fallback.
  - `src/utils/gridGeometry.test.js` (7) — cell measurement and centre math, including a case that fails against naive `width / cols`.
  - `src/utils/announcer.test.js` (6) — banner/voice mapping parity.

---

## ⚙️ 9. Runtime Robustness & Performance

- **Guarded persistence** (`src/utils/storage.js`): every `localStorage` read and write goes through a try/catch wrapper. `setItem` throws on every call in Safari private browsing and once an origin's quota is full, and the progress write sat unguarded inside a React effect, so a browser that refuses writes would throw on each progress change. Reads at module scope in `sound.js` were equally exposed — a browser with storage blocked throws on `getItem` too, which would have failed the module import outright. Persistence is best-effort; a failed write is swallowed and play continues.
- **Idle-gated particle rendering**: the particle canvas parks its `requestAnimationFrame` loop whenever the engine has nothing to draw, and the engine notifies subscribers on spawn to restart it. Previously the loop ran unconditionally for as long as the board was mounted — clearing and re-rendering an empty canvas 60 times a second, which on a 3× DPR phone is a 1200×1200 buffer cleared to draw nothing. Effects only fire on a match, so idle is the common case.
- **Cancellable move timers**: the deferred callbacks in a move (sound, banner clear, busy release, outcome check) are tracked and cleared on unmount. Exiting to the map mid-cascade previously left ~5 pending timers firing `setState` against an unmounted component.
- **Cascade-scaled pacing**: input is blocked for `min(1000, 280 + 140 × cascadeCount)` ms rather than a flat 550ms, so a plain 3-match releases in ~420ms instead of feeling sluggish, while a long cascade gets up to a second to finish animating instead of being cut off partway.
- **No dead dependencies**: `canvas-confetti` was declared and shipped without a single import anywhere in `src/` (`SugarCrush.jsx` hand-rolls its own confetti); it has been removed.

---

## 🎨 10. Visual & Animation Enhancements (`src/utils/particles.js`, `src/components/CandySprite.jsx`, `src/components/CandyShatter.jsx`)

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
  - Sri Lankan candy motifs (Kalu Dodol, Kavum, Kokis, Aggala) built directly into the vector designs.
  - **Six mutually distinguishable silhouettes** — jelly bean, wrapped lozenge, lemon drop, square chew, boiled sweet, cluster. Shape-coding only helps colourblind players when the shapes actually differ, so the set is chosen for contrast in outline alone: elongated-and-tilted, angular-and-wide, asymmetric-point, four-equal-sides, plain-round, scalloped.
  - **Why they changed**: the previous set was a heart, star, diamond, hexagon, circle and rounded square — gem and motif shapes, which is what made the board read as a jewel game rather than a candy one. An earlier pass had given purple the circle purely to stop it duplicating yellow's star; with the star gone the circle moved to blue and purple became the cluster.
  - **One path, four uses**: body fill, rim gradient, gloss highlight and the striped-candy overlay all reference the same path string via a `clipPath`. The shading used to be a fixed `r=22` circle painted over every candy regardless of shape, so it bled outside anything that wasn't round, and striped overlay lines ran past the edges of the star and diamond.
  - **Candy size is derived from the measured cell** (96% of `gridMetrics.cellW/cellH`) rather than a fixed pixel value. It was hardcoded at 42px while the cell scales with board width, so the proportion drifted — 90% of the tile on a 406px board but only 75% at the 480px cap, leaving a dead ring around every candy that widened with screen size.
- **Board surface**:
  - **Checkerboard tile sockets**: alternating light/dark cells with an inset shadow, keyed to `(row + col)` so the pattern stays with the grid slot rather than the candy. The previous 3%-white cell background was effectively invisible, leaving candies reading as loose sprites on frosted glass instead of sitting in a grid.
  - The board panel is a darkened purple gradient rather than 6% white, giving the candies something to read against.
  - **Drop-in refills**: new candies enter from above the tile (`initial={{ y: -46 }}`) instead of popping in place.
  - **FX are no longer clipped by the board**: `.game-grid` is `overflow: visible`. Score popups, combo labels and shatter shards are absolutely-positioned children of the grid that travel outward and upward from their cell, so a "+240" earned on the top row — or shards from any edge cell — used to be sliced off at the panel border. Nothing depended on the clip; the gloss pseudo-element is already inset and the particle canvas is sized exactly to the padding box.
- **Additional Visual Polish**:
  - **Combo Reaction Labels**: Escalating praise text ("Sweet!", "Tasty!", "Divine!", "Sugar Crush!") floats dynamically based on cascade chains.
  - **Board Camera Shake**: Subtle physical screen shaking for high-impact explosions (Wrapped candies, Color Bombs, big cascades).
  - **Striped Candy Energy Shimmer**: Continuous light beams sweep across striped candies in their alignment direction.
  - **Invalid Swap Slide-and-Bounce**: Candies slide toward each other and bounce back when attempting an illegal move, improving tactile feedback.
  - **Star Threshold Burst**: Star markers flash and pulse with particles when specific score tiers are crossed.
  - **Jelly Clear Splatter**: Translucent cyan glass fragments fly outward when a jelly tile is destroyed.
  - **Color Bomb Vortex**: Spiral energy particles swirl inward before the Color Bomb lightning zap fires.
  - **Score Roll-Up** (`src/hooks/useCountUp.js`): the HUD score plays a scale-bounce whenever it increases, and the digits tween to the new value over ~450ms on an easeOutCubic. The tween is driven off elapsed time rather than frame count, so a phone dropping to 30fps still takes the same wall-clock duration; a reset to 0 on restart is not animated, and the whole effect is skipped under `prefers-reduced-motion`. It matters most during the Sugar Crush cascade, where watching the leftover-move bonus stack up *is* the payoff — a snap there discards it.
  - **Wrapped Candy Pulsing Glow**: A breathing pulse overlay visually hints at the contained explosive energy inside wrapped candies.
  - **Background Reactivity**: The board's background dynamically flashes brighter during big combos and subtly darkens with a red pulse when Candy Bomb timers hit critical levels (≤2).

---

## 🌄 11. Per-Level Dynamic Background (`src/components/DynamicBackground.jsx`)

- Each of the 11 levels has its own themed backdrop, rendered on a full-screen `<canvas>` sitting behind the board (`z-index: -2`): a 3-stop linear gradient, two `screen`-blend accent glow orbs, and ~40 slowly-drifting ambient particles, all colored per level (e.g. pink/magenta for "Sugar Patch," teal/blue for "Jelly Jungle," icy cyan for "Peppermint Peaks," prismatic violet for the "Rainbow Summit" finale).
- A separate CSS-animated layer floats level-themed emoji (🍬🍭✨ for level 1, 🫧💧🪼 for level 3, 🌈⭐👑 for level 10, etc.) slowly upward in the background.
- Falls back to the level 1 theme for any level ID without a defined theme. `levels.test.js` asserts every level has its own theme whose name matches the level, so this fallback stays unreachable as levels are added.

---

## 🎙️ 12. Voice Announcer (`src/utils/sound.js`, `public/voices/`)

- **English announcer, 3 random variants per trigger**: the vocabulary is the genre’s escalation ladder — **Sweet! → Tasty! → Delicious! → Divine!**, with **Sugar Crush!** on a win and **Out of moves!** on a loss. Clip basenames are those words, and they are simultaneously the keys returned by `announcer.js`, the `VOICE_KEYS` list in `sound.js`, and the `PHRASES` dict in `scripts/generate_all_voices.py`; a key present in one but not the others silently never plays. Voices are `en-US-GuyNeural` (male) and `en-US-EmmaNeural` (female), chosen for Microsoft’s “Passion” and “Cheerful” personalities — the deeper catalogue voices read as authoritative rather than delighted. Prosody climbs with the tier but is capped at +18% rate; the previous clips ran to +28% and the words ran together, which was reported as the announcer sounding rushed.
- **Clip inventory**: 36 generated clips (3 variants × 6 triggers × 2 genders), so the announcer doesn’t repeat itself. `public/voices/` holds 48 files: the 36 variants plus an un-suffixed clip per trigger per gender, a copy of variant 1 kept as the decode fallback (see “Graceful degradation” below). `VARIANTS_PER_KEY` in `sound.js` is what the playback path actually reads. Variants stay within one register so any of them fits the moment — e.g. *“Delicious!”* / *“Simply delicious!”* / *“Mouth-watering!”* for a 3-cascade, and *“Sugar Crush!”* / *“Level complete!”* / *“Sweet victory!”* on a win.
- **Not** the browser's Web Speech API — implementation uses **pre-rendered `.mp3` voice clips** (`public/voices/{male,female}/<key>_<n>.mp3`, generated by `scripts/generate_all_voices.py` via `edge-tts`, run with `npm run voices`).
- **AudioBuffer playback pipeline**: clips are `fetch`ed and `decodeAudioData`'d into `AudioBuffer`s (lazily, on first audio unlock) and played via `AudioBufferSourceNode` rather than `<audio>` elements. This is what makes per-clip reverb, BGM ducking, and overlapping replay possible — `HTMLAudioElement` sits outside the Web Audio graph and can only be bridged once per element.
- **Reverb on big moments**: `delicious`, `divine`, and `sugar_crush` route through a `ConvolverNode` fed by a procedurally-generated impulse response (no external IR file to ship), so large combos sound distinctly bigger than an ordinary match.
- **Offline-safe**: the voice clips are included in the service-worker precache via an explicit `workbox.globPatterns` override in `vite.config.js` — the default patterns omit `mp3`, which previously left the clips uncached and the offline guarantee unmet.
- **Graceful degradation**: a missing or undecodable variant falls back to the legacy un-suffixed `<key>.mp3`, and failing that is skipped silently — audio problems never interrupt gameplay.
- **Male / Female voice toggle**: persisted to `localStorage` (`announcerVoice`), switchable from the in-game Settings menu (see section 3).
- **Banner/voice sync**: on-screen banner text and the spoken line both come from a single mapping in `src/utils/announcer.js`, so they cannot drift apart (they previously did — a 3-step cascade showed one word while the audio said another). The floating combo label (`ComboLabel.jsx`) now reads its words from the same mapping too; it used to carry its own ladder ending in “Sugar Crush!”, so a 3-cascade floated “Divine!” over the board while the announcer said “Delicious!”. Covered by unit tests.
- **UI language**: all in-game text — modals, banners, buttons, the briefing card and the screen-reader live region — is English. The app previously shipped a Sinhala UI and Sinhala announcer clips; both were replaced wholesale, and `public/voices/` no longer contains the Sinhala mp3s.

---

## 🎵 13. Procedural Background Music Engine (`src/utils/sound.js`)

- Fully synthesized (no audio files) via Web Audio API oscillators, scheduled with a lookahead loop for drift-free timing.
- **3 selectable rhythmic styles**, switchable live from the Settings menu and persisted to `localStorage` (`bgmStyle`):
  - **Baila**: 140 BPM, sawtooth bassline.
  - **Papare**: 160 BPM, square-wave "trumpet" melody with fast snare rolls.
  - **Kandyan (Getabera)**: 120 BPM, low toms + high-pitched strikes.
- **Per-screen scoring (map vs gameplay)**: the map keeps the energetic percussion styles above; the game board switches to a separate quiet melodic bed — a sparse 16-step pentatonic arpeggio with a soft pad, no kick or snare, soft-attack tones, and an overall level of 0.55. The drum styles are percussion-forward (kick sits at gain 0.5 against sound effects at 0.12–0.25) on a short ~2s loop, which reads as energetic on the map where nothing competes, but during play stacked underneath pops, lasers, explosions and the announcer voice all firing at once. Gameplay music now peaks around 0.025, roughly 6–10× *below* the effects, so it sits under them as a bed instead of over them.
- **Mute toggle**: persisted to `localStorage` (`bgmMuted`), accessible from both the Saga Map header button and the Settings menu; BGM auto-starts on the first unlocked user gesture if not muted.
- **Master bus + voice ducking**: all three BGM generators (kick/snare/synth) route through a shared `bgmGain` node instead of connecting straight to `ctx.destination`. While an announcer clip plays, that bus smoothly ducks to 40% and restores afterwards, so the voice always cuts through the Baila/Papare drums. Ducking is refcounted, so overlapping clips can't un-duck the music early, with a timeout backstop in case `onended` never fires (e.g. tab backgrounded mid-clip).
