# Graph Report - candy_crush_saga  (2026-08-18)

## Corpus Check
- Corpus is ~26,706 words - fits in a single context window. You may not need a graph.

## Summary
- 227 nodes · 479 edges · 21 communities (13 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 14,401 input · 1,673 output

## Community Hubs (Navigation)
- GameBoard UI & FX Wiring
- Match-3 Engine Core
- Web Audio Engine
- App State & Level Progression
- Build Tooling (devDependencies)
- Runtime Dependencies
- Sugar Crush Win Celebration
- Particle FX Engine
- Dynamic Background
- Candy Sprite Rendering
- Announcer Banner-Voice Mapping
- Voice Clip Generator Script
- Doc: Home Page Plan
- Doc: Implemented Features
- Doc: Improvements
- Doc: Missing Features
- Doc: Voice Enhancement Plan
- Doc: Implementation Plan

## God Nodes (most connected - your core abstractions)
1. `GameBoard()` - 23 edges
2. `getContext()` - 14 edges
3. `resolveBoard()` - 13 edges
4. `clearAndCascade()` - 11 edges
5. `playTone()` - 11 edges
6. `SagaMap()` - 10 edges
7. `cellKey()` - 10 edges
8. `activateSpecial()` - 10 edges
9. `ParticleEngine` - 10 edges
10. `createCandy()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `setBGMScene()`  [EXTRACTED]
  src/App.jsx → src/utils/sound.js
- `GameBoard()` --calls--> `attemptMove()`  [EXTRACTED]
  src/components/GameBoard.jsx → src/game/board.js
- `GameBoard()` --calls--> `ensurePlayable()`  [EXTRACTED]
  src/components/GameBoard.jsx → src/game/board.js
- `GameBoard()` --calls--> `generateBoard()`  [EXTRACTED]
  src/components/GameBoard.jsx → src/game/board.js
- `GameBoard()` --calls--> `useColorBombBooster()`  [EXTRACTED]
  src/components/GameBoard.jsx → src/game/board.js

## Import Cycles
- None detected.

## Communities (21 total, 8 thin omitted)

### Community 0 - "GameBoard UI & FX Wiring"
Cohesion: 0.09
Nodes (33): AnnouncerOverlay(), BoosterBar(), BOOSTERS, CandyShatter(), COLOR_MAP, generateShards(), DEFAULT_BOOSTERS, GameBoard() (+25 more)

### Community 1 - "Match-3 Engine Core"
Cohesion: 0.16
Nodes (37): activateSpecial(), applyGravity(), attemptMove(), cellKey(), clearAndCascade(), cloneBoard(), COLORS, createCandy() (+29 more)

### Community 2 - "Web Audio Engine"
Cohesion: 0.16
Nodes (27): CALM_ARP, CALM_PAD, decodeClip(), duckBGM(), getBgmGain(), getContext(), getImpulseResponse(), loadOneClip() (+19 more)

### Community 3 - "App State & Level Progression"
Cohesion: 0.18
Nodes (15): App(), loadProgress(), SagaMap(), LEVELS, computeStars(), isCompleted(), isUnlocked(), readEntry() (+7 more)

### Community 4 - "Build Tooling (devDependencies)"
Cohesion: 0.09
Nodes (21): @capacitor/cli, devDependencies, @capacitor/cli, vite, vite-plugin-pwa, @vitejs/plugin-react, vitest, name (+13 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.13
Nodes (15): canvas-confetti, @capacitor/android, @capacitor/core, framer-motion, lucide-react, dependencies, canvas-confetti, @capacitor/android (+7 more)

### Community 6 - "Sugar Crush Win Celebration"
Cohesion: 0.20
Nodes (4): CONFETTI_COLORS, ConfettiPiece, FireworkBurst, SugarCrush()

### Community 8 - "Dynamic Background"
Cohesion: 0.43
Nodes (3): DynamicBackground(), FloatingParticle, THEMES

### Community 9 - "Candy Sprite Rendering"
Cohesion: 0.60
Nodes (5): CandySprite(), getColorBase(), getColorDark(), getColorLight(), getGlowColor()

### Community 10 - "Announcer Banner-Voice Mapping"
Cohesion: 0.60
Nodes (3): BANNER, getAnnouncement(), VOICE_FOR_BANNER

## Knowledge Gaps
- **41 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ParticleEngine` connect `Particle FX Engine` to `GameBoard UI & FX Wiring`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `GameBoard()` connect `GameBoard UI & FX Wiring` to `Web Audio Engine`, `Match-3 Engine Core`, `Announcer Banner-Voice Mapping`, `App State & Level Progression`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GameBoard UI & FX Wiring` be split into smaller, more focused modules?**
  _Cohesion score 0.08562367864693446 - nodes in this community are weakly interconnected._
- **Should `Build Tooling (devDependencies)` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._