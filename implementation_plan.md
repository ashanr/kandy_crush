# Implementation Plan - Candy Crush Special Candies & Combinations Engine

Expand the Candy Crush Saga clone with a full **Special Candies & Combination System**. This includes creation detection (4-in-a-row, T/L shapes, 5-in-a-line, 2x2 squares), unique tile rendering/animations, detonation mechanics, and explosive special-candy-on-special-candy combo swaps.

---

## Proposed Architecture & Features

```mermaid
graph TD
    A[Swap / Match Detector] -->|4 in a line| B[Striped Candy (Row/Col)]
    A -->|T / L Shape| C[Wrapped Candy (3x3 Explosive)]
    A -->|5 in a line| D[Color Bomb (Choco Donut)]
    A -->|2 x 2 Square| E[Jelly Fish (Target Seeking)]
    
    F[Special Candy Swapped] -->|Special + Normal| G[Single Detonation]
    F -->|Special + Special| H[Combo Explosion Engine]
    
    H -->|Striped + Striped| I[Cross Row+Col Beam]
    H -->|Striped + Wrapped| J[Giant 3-Line Mega Beam]
    H -->|Color Bomb + Striped| K[Board-wide Striped Detonator]
    H -->|Color Bomb + Color Bomb| L[Full Board Wipeout]
```

---

## 🍬 Special Candies Specification

### 1. Special Candy Creation Rules
- **Horizontal 4-Match**: Spawns a **Horizontal Striped Candy** (striped lines going left/right).
- **Vertical 4-Match**: Spawns a **Vertical Striped Candy** (striped lines going up/down).
- **T-Shape or L-Shape (5 Tiles)**: Spawns a **Wrapped Candy** (shiny candy wrapper with inner glow).
- **5-in-a-Line Match**: Spawns a **Color Bomb** (chocolate ball with rainbow sprinkles).
- **2x2 Square Match**: Spawns a **Jelly Fish** (swimming fish tile).

### 2. Individual Detonation Behaviors
- **Striped Candy**: Clears the entire row (Horizontal) or column (Vertical), triggering any secondary special candies in its path.
- **Wrapped Candy**: Explodes all surrounding 3x3 tiles, drops with gravity, and explodes a second 3x3 area!
- **Color Bomb**: Swapping with any normal candy removes ALL candies of that color across the board.
- **Jelly Fish**: Spawns 3 animated fish that swim to target jelly tiles, isolated candies, or level objectives.

### 3. Special Candy Swap Combinations (Swapping 2 Specials)
- ⚡ **Striped + Striped**: Detonates a giant cross-beam clearing the entire row AND column regardless of stripe orientation.
- 💣 **Striped + Wrapped**: Turns into a giant 3-tile wide column and 3-tile wide row mega-beam that destroys 1/3 of the board!
- 💥 **Wrapped + Wrapped**: Giant 5x5 area double explosion.
- 🌈 **Color Bomb + Striped**: Changes **ALL** candies on the board matching the color of the striped candy into striped candies, then detonates every single one simultaneously!
- 🎆 **Color Bomb + Wrapped**: Changes all candies of that color into wrapped candies and detonates them!
- 🌌 **Color Bomb + Color Bomb**: Destroys every single candy and layer of jelly on the entire 8x8 board!

---

## Proposed File Changes

### Core Game Engine Logic

#### [MODIFY] [src/game/board.js](file:///c:/Users/asus/Documents/apps/candy_crush_saga/src/game/board.js)
- Extend match detection logic to detect shape patterns (Line of 4, T/L shape, Line of 5, 2x2 square) before clearing tiles.
- Add special candy creation flags: `type: 'striped-h' | 'striped-v' | 'wrapped' | 'color-bomb' | 'jelly-fish'`.
- Add special candy detonation logic:
  - `detonateStriped(row, col, direction)`
  - `detonateWrapped(row, col)`
  - `detonateColorBomb(color)`
  - `detonateCombo(special1, special2)`
- Implement recursive trigger chain (a striped beam exploding another wrapped candy detonates the wrapped candy).

#### [NEW] [src/game/specialCombos.js](file:///c:/Users/asus/Documents/apps/candy_crush_saga/src/game/specialCombos.js)
- Isolated math & grid state transformations for special-on-special candy swaps (`handleSpecialSwap(tileA, tileB, grid)`).

---

### Rendering & Audio FX

#### [MODIFY] [src/components/GameBoard.jsx](file:///c:/Users/asus/Documents/apps/candy_crush_saga/src/components/GameBoard.jsx)
- Render custom SVG/CSS overlays for special candies:
  - White stripe animations for Striped Candies.
  - Wrapper pulse effect for Wrapped Candies.
  - Rainbow sprinkle particle orbit for Color Bomb.
  - Fish tail animation for Jelly Fish.
- Canvas laser beam effects for Striped beam clears and Color Bomb lightning arcs.

#### [MODIFY] [src/utils/sound.js](file:///c:/Users/asus/Documents/apps/candy_crush_saga/src/utils/sound.js)
- Add distinct synthesized sound effects:
  - Laser zap for Striped Candies.
  - Heavy bass explosion for Wrapped Candies.
  - Electric zap/chime for Color Bomb.
  - Mega combo blast sound for Color Bomb + Striped combination.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure all special candy combo functions compile without syntax or type errors.

### Manual Verification
1. **Creation Testing**:
   - Create 4-in-a-row $\rightarrow$ verify Striped candy spawns at swap position.
   - Create T/L shape $\rightarrow$ verify Wrapped candy spawns.
   - Create 5-in-a-line $\rightarrow$ verify Color Bomb spawns.
2. **Combo Swap Testing**:
   - Swap Striped + Striped $\rightarrow$ verify row and column both clear.
   - Swap Color Bomb + Striped $\rightarrow$ verify board candies turn into striped candies and detonate in cascade.
   - Swap Color Bomb + Color Bomb $\rightarrow$ verify complete board wipeout.
3. **Sound & Haptics**:
   - Verify laser sounds for striped beams and heavy vibration feedback on big combos.
