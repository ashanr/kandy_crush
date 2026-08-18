import { BLOCKER } from '../game/board.js';

function buildJellyRing(rows, cols, layers = 1) {
  const layout = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) layout[r][c] = layers;
    }
  }
  return layout;
}

function buildJellyBlock(rows, cols, size = 3, layers = 2) {
  const layout = Array.from({ length: rows }, () => Array(cols).fill(0));
  const rStart = Math.floor((rows - size) / 2);
  const cStart = Math.floor((cols - size) / 2);
  for (let r = rStart; r < rStart + size; r += 1) {
    for (let c = cStart; c < cStart + size; c += 1) {
      layout[r][c] = layers;
    }
  }
  return layout;
}

// Jelly on alternating tiles. Spreads the objective across the whole board
// rather than concentrating it, so it cannot be cleared by camping one region.
function buildJellyCheckerboard(rows, cols, layers = 1) {
  const layout = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if ((r + c) % 2 === 0) layout[r][c] = layers;
    }
  }
  return layout;
}

// Four square blocks in the corners — the hardest region of the board to reach,
// since gravity refills from the top and edges have fewer adjacent swaps.
function buildJellyCorners(rows, cols, size = 3, layers = 1) {
  const layout = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      layout[r][c] = layers;
      layout[r][cols - 1 - c] = layers;
      layout[rows - 1 - r][c] = layers;
      layout[rows - 1 - r][cols - 1 - c] = layers;
    }
  }
  return layout;
}

// Full-board coverage. Used as the finale.
function buildJellyFull(rows, cols, layers = 1) {
  return Array.from({ length: rows }, () => Array(cols).fill(layers));
}

/** Empty blocker/lock grid to stamp positions onto. */
function emptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

/** Places blockers at explicit [row, col] positions. */
function blockersAt(rows, cols, kind, positions) {
  const layout = emptyGrid(rows, cols);
  positions.forEach(([r, c]) => { layout[r][c] = kind; });
  return layout;
}

/** Marks candies that start locked in a cage. */
function locksAt(rows, cols, positions) {
  const layout = emptyGrid(rows, cols);
  positions.forEach(([r, c]) => { layout[r][c] = true; });
  return layout;
}

// Balance is calibrated against a REALISTIC player, not a solver.
//
// Every earlier pass tuned these numbers against a bot that evaluates all ~112
// legal swaps each move and takes the best one. That is not a player, and
// tuning to it produced a game where level 1 was won 95% of the time by the bot
// and 29% of the time by someone scanning four candidate moves. Level 4 was 5%.
//
// The reference players below only *notice* k candidate swaps before
// committing, which is the real constraint when you look at a board:
//   casual    = sees 4     attentive = sees 8
//
// Measured over 100 runs/level with the shipped values:
//
//   lvl  name                casual  attentive
//   1    Sugar Patch            91%       100%
//   2    Gumdrop Grove          76%        99%
//   3    Jelly Jungle           67%        83%
//   4    Lollipop Lane          64%        96%
//   5    Chocolate Chasm        57%        80%
//   6    Peppermint Peaks       62%        93%
//   7    Bubblegum Bay          72%        88%
//   8    Caramel Canyon         46%        86%
//   9    Marshmallow Marsh      37%        71%   <- hardest by design
//   10   Rainbow Summit         50%        81%
//   11   Cocoa Quarry           60%        78%
//
// Score targets sit BELOW the p20 of what an attentive player actually scores,
// so clearing is the normal outcome rather than the ceiling. Star thresholds
// come from the same realistic distribution (roughly p05/p50/p85 of winning
// runs), and the 1-star tier is pinned at or under the win floor on every
// level — on score levels it equals the target, since the target IS the pass
// line and clearing must always be worth at least one star.
//
// Jelly levels are tuned by move limit rather than by target. The Sugar Crush
// leftover-moves bonus (300/move) is what keeps their scores comparable to
// score levels despite ending the moment the objective is met.

export const LEVELS = [
  {
    id: 1,
    name: 'Sugar Patch',
    objective: { type: 'score', target: 2400 },
    moveLimit: 20,
    jellyLayout: null,
    starThresholds: [2400, 5000, 6500],
  },
  {
    id: 2,
    name: 'Gumdrop Grove',
    objective: { type: 'score', target: 3000 },
    moveLimit: 22,
    jellyLayout: null,
    starThresholds: [3000, 5400, 6700],
  },
  {
    id: 3,
    name: 'Jelly Jungle',
    objective: { type: 'jelly' },
    moveLimit: 27,
    jellyLayout: buildJellyRing(8, 8, 1),
    starThresholds: [3900, 6000, 7200],
  },
  {
    id: 4,
    name: 'Lollipop Lane',
    objective: { type: 'score', target: 3000 },
    moveLimit: 20,
    jellyLayout: null,
    starThresholds: [3000, 5100, 6100],
  },
  {
    id: 5,
    name: 'Chocolate Chasm',
    objective: { type: 'jelly' },
    moveLimit: 20,
    jellyLayout: buildJellyBlock(8, 8, 4, 2),
    initialBombs: 3,
    bombTimer: 12,
    starThresholds: [3000, 4600, 5700],
  },
  {
    id: 6,
    name: 'Peppermint Peaks',
    objective: { type: 'score', target: 3400 },
    moveLimit: 21,
    jellyLayout: null,
    starThresholds: [3400, 5300, 6200],
  },
  {
    id: 7,
    name: 'Bubblegum Bay',
    objective: { type: 'jelly' },
    moveLimit: 23,
    jellyLayout: buildJellyCheckerboard(8, 8, 1),
    starThresholds: [3400, 4600, 5900],
  },
  {
    id: 8,
    name: 'Caramel Canyon',
    objective: { type: 'score', target: 3400 },
    moveLimit: 22,
    jellyLayout: null,
    initialBombs: 2,
    bombTimer: 14,
    starThresholds: [3400, 5200, 6500],
  },
  {
    id: 9,
    name: 'Marshmallow Marsh',
    objective: { type: 'jelly' },
    moveLimit: 38,
    jellyLayout: buildJellyCorners(8, 8, 3, 2),
    // A licorice wall across the middle. It can't be matched or swapped, and it
    // absorbs striped beams, so the two halves of the board have to be worked
    // separately until the wall is chipped away by adjacent matches.
    blockerLayout: blockersAt(8, 8, BLOCKER.LICORICE, [
      [3, 1], [3, 2], [3, 5], [3, 6],
      [4, 1], [4, 6],
    ]),
    starThresholds: [4800, 7100, 8600],
  },
  {
    id: 10,
    name: 'Rainbow Summit',
    objective: { type: 'jelly' },
    moveLimit: 30,
    jellyLayout: buildJellyFull(8, 8, 1),
    initialBombs: 2,
    bombTimer: 16,
    starThresholds: [4100, 6000, 7600],
  },
  {
    id: 11,
    name: 'Cocoa Quarry',
    objective: { type: 'jelly' },
    moveLimit: 26,
    jellyLayout: buildJellyCheckerboard(8, 8, 1),
    // Two chocolate seeds. Leave them alone for a turn and they eat a candy —
    // the level is a race between clearing jelly and containing the spread.
    blockerLayout: blockersAt(8, 8, BLOCKER.CHOCOLATE, [[0, 0], [7, 7]]),
    // Four caged candies to break open along the way.
    lockLayout: locksAt(8, 8, [[2, 2], [2, 5], [5, 2], [5, 5]]),
    starThresholds: [4400, 6100, 7400],
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}
