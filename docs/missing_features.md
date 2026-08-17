# Missing Features (Single-Player Gameplay)

This document details all single-player mechanics, special candies, blockers, grid hazards, and level modes from official match-3 saga games that are not yet implemented in this project.

---

## 🍬 1. Additional Special Candies & Combos

> **Update:** Jelly Fish (2x2 square match, jelly-seeking detonation) is now implemented — see `docs/implemented_features.md`. The items below are the parts of the original special-candy spec that are still missing.

- **Coconut Wheel**:
  - **Behavior**: When swapped with any adjacent candy, rolls in a straight line across 3 grid spaces, converting each candy it touches into a Striped Candy and instantly detonating them.
- **Lucky Candy**:
  - **Behavior**: Appears as a neutral tick-mark candy. When matched, automatically transforms into whichever candy color or special candy is needed to complete active level objectives.
- **Flavor-Specific Jelly Fish Combos**:
  - Jelly Fish + Striped/Wrapped/Jelly Fish now falls back to each special detonating its own individual effect (a functional but generic combo — see `docs/implemented_features.md`), rather than the bespoke effects originally envisioned:
  - **Jelly Fish + Striped Candy**: Transforms the fish into Striped Fish that detonate full rows/columns upon reaching their targets.
  - **Jelly Fish + Color Bomb**: Currently handled by the generic bomb+special path (converts every same-color candy into a Jelly Fish and detonates them all), not the originally envisioned "swarm of 10+ fish" effect specifically.

---

## 🧱 2. Advanced Blocker Tiles & Dynamic Hazards

> **Update:** Jelly Tiles (single & double layer, cleared by matching on top of them) are already implemented — see `docs/implemented_features.md`. Everything below this note is still missing.

- **Chocolate & Chocolate Spawners**:
  - **Growing Hazard**: If no chocolate block is destroyed during a turn, a chocolate block expands and consumes one adjacent candy.
  - **Chocolate Factory**: Fixed spawner tile that continuously generates new chocolate blocks.
- **Licorice Swirls**:
  - Heavy rubbery blockers that can be swapped but cannot be matched with normal candies.
  - **Beam Absorber**: Completely blocks and absorbs Striped Candy laser blasts, stopping the beam from passing through.
- **Licorice Locks / Sugar Chains**:
  - Metal/sugar cages locking a candy in place.
  - Locked candies cannot be moved or swapped until matched with adjacent candies of the same color.
- **Candy Bombs**:
  - Timed bomb candies featuring a countdown timer (e.g., 10, 8, 5 moves).
  - Countdown decreases by 1 on every turn. If any bomb reaches 0 before being matched, it results in an instant **Level Failed**!
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
