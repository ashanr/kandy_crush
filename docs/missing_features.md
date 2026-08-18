# Missing Features (Single-Player Gameplay)

This document details all single-player mechanics, special candies, blockers, grid hazards, and level modes from official match-3 saga games that are not yet implemented in this project.

---

## 🍬 1. Additional Special Candies & Combos

> **Update:** Jelly Fish, **Coconut Wheel** (3-space directional rolling), and **Lucky Candy** (objective-based auto-transformation) are now fully implemented — see `docs/implemented_features.md`.

- **Flavor-Specific Jelly Fish Combos**:
  - Jelly Fish + Striped/Wrapped/Jelly Fish falls back to each special detonating its own individual effect (a functional combo), rather than bespoke swarm shapes.

---

## 🧱 2. Advanced Blocker Tiles & Dynamic Hazards

> **Update:** Jelly Tiles (single & double layer, cleared by matching on top of them) and **Candy Bombs** (timed countdown hazard with a visible fuse badge, instant level failure at zero) are already implemented — see `docs/implemented_features.md`.

- **Chocolate & Chocolate Spawners**:
  - **Growing Hazard**: If no chocolate block is destroyed during a turn, a chocolate block expands and consumes one adjacent candy.
  - **Chocolate Factory**: Fixed spawner tile that continuously generates new chocolate blocks.
- **Licorice Swirls**:
  - Heavy rubbery blockers that can be swapped but cannot be matched with normal candies.
  - **Beam Absorber**: Completely blocks and absorbs Striped Candy laser blasts, stopping the beam from passing through.
- **Licorice Locks / Sugar Chains**:
  - Metal/sugar cages locking a candy in place.
  - Locked candies cannot be moved or swapped until matched with adjacent candies of the same color.
- **Candy Bomb spawning during play**: bombs are currently only seeded at level start (`initialBombs`). The original also spawns fresh bombs mid-level from match cascades on later stages.
- **Waffle Layers / Multilayer Layered Cakes**:
  - 1 to 5-layer thick solid blockers occupying grid spaces.
  - Must be damaged by making adjacent matches multiple times to fully break down.

---

## 🌀 3. Advanced Grid Layouts & Gravity Mechanics

- **Teleporter Portals**:
  - Linked entry and exit portal pairs (`Portal In` $\rightarrow$ `Portal Out`).
  - Candies falling out of the bottom of one grid section pass through the portal and drop out of the top of a detached board section.
- **Conveyor Belts**:
  - Moving track rows or columns that automatically shift all candies sitting on the belt by 1 space at the start of every move.
- **Non-Rectangular & Fragmented Grids**:
  - Custom board shapes (L-shaped, Donut-shaped, Cross-shaped) containing empty/dead spaces that candies must fall around.
- **Multi-Board Levels**:
  - Levels split into multiple sub-boards (Board 1 $\rightarrow$ Board 2) unlocked sequentially as objectives are cleared.

---

## 🎯 4. Single-Player Level Objectives & Game Modes

> **Update:** Jelly Clearing Mode (clear all jelly within the move limit) is already implemented — see `docs/implemented_features.md`. Everything below this note is still missing.

- **Ingredient Drop Mode**:
  - Objective: Guide Hazelnuts and Cherries down through obstacles to designated drop-basket tiles at the bottom of the grid.
- **Order Combination Mode**:
  - Objective: Collect exact quotas of candy types and specials (e.g., *"Collect 20 Red Candies, 3 Striped Candies, and 1 Color Bomb"*).
- **Timed Target Mode**:
  - Objective: Reach target score within a fixed time limit (e.g., 60 seconds) with unlimited moves.
- **Chocolate Cleansing Mode**:
  - Objective: Destroy all expanding chocolate structures on the board before running out of moves.

---

## 🎒 5. Single-Player Boosters & Pre-Game Inventory

- **Free Switch (Hand Glove)**:
  - In-game booster allowing the player to swap any two adjacent candies anywhere on the board without spending a move.
- **Color Splash Brush**:
  - In-game booster that paints a selected 3x3 region of candies into a single chosen color to set up easy 5-in-a-row matches.
- **+5 Extra Moves**:
  - Emergency booster offered when move counter reaches 0 to extend play by 5 additional moves.
- **Pre-Game Equipped Boosters**:
  - Toggle menu on the Level Start screen allowing players to start the level with a free Color Bomb, Striped Candy, or Wrapped Candy pre-placed on the board.
  - The Level Start screen itself now exists (`src/components/LevelIntro.jsx`), so this is a matter of adding the toggles and seeding the board — not of building the screen.

---

## 🏆 6. Scoring & End-of-Level Ritual

> **Update:** the **Sugar Crush leftover-moves bonus** (300 points per unspent move, shown as arithmetic in the celebration) and **floating score popups** are now implemented — see `docs/implemented_features.md`.

- **Striped-candy detonation on Sugar Crush**: the bonus is currently awarded as a flat per-move score. The original visibly converts each leftover move into a Striped Candy on the board and detonates them in sequence, which is where the spectacle comes from.
- **Out-of-moves "+5 moves" offer**: hitting zero moves is an immediate loss. The original offers to extend play by 5 moves first.
- **Icon-based objective HUD**: the objective shows as a text pill (`Jelly: 38`) rather than an icon of the collected item with a count.
- **Score-driven star animation**: stars are revealed all at once on the result card rather than filling in as the score counts up.
