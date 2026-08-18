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

// Balance is calibrated against a player who can only see what a player sees.
//
// This has been wrong twice, in the same direction both times, so the failure is
// worth stating plainly. The first pass tuned against a bot that evaluated all
// ~112 legal swaps per move. The second pass "fixed" that by limiting the bot to
// k noticed swaps — but it still ranked those k by the resulting cascade score,
// which is knowledge nobody has while looking at a board. It was a smaller
// solver, not a player, and it reported level 1 at 91% when the real figure was
// 23%. Level 6 measured 1-6%. Five of the eleven levels were close to unwinnable.
//
// The reference player now ranks candidate swaps by VISIBLE information only:
//   1. does it clear a candy bomb I can see
//   2. does it clear jelly I can see
//   3. how many candies does the immediate match remove (3 < 4 < 5)
// Cascades are a pleasant surprise, never a plan — which is what they are in
// practice. k is how many candidates get noticed before committing:
//   k=3 hurried    k=6 attentive (the reference)    k=10 careful
//
// Measured over 120 runs/level with the shipped values:
//
//   lvl  name                 k=3   k=6   k=10
//   1    Sugar Patch          95%   94%    98%   <- tutorial, near-unlosable
//   2    Gumdrop Grove        78%   88%    93%
//   3    Jelly Jungle         68%   88%    92%
//   4    Lollipop Lane        82%   90%    89%
//   5    Chocolate Chasm      50%   83%    93%
//   6    Peppermint Peaks     63%   73%    82%
//   7    Bubblegum Bay        65%   90%    88%
//   8    Caramel Canyon       71%   79%    77%
//   9    Marshmallow Marsh    35%   68%    76%   <- hardest by design
//   10   Rainbow Summit       32%   69%    81%
//   11   Cocoa Quarry         63%   83%    85%
//
// Score targets sit at roughly p08 (level 1) to p28 (level 8) of what the
// reference player scores over the full move budget. They look low — 1,200 on
// level 1 — because SCORE_PER_CANDY is 10 and a plain 3-match is worth 30. The
// score a player actually banks comes from the Sugar Crush bonus: the level ends
// the moment the target is crossed and every unspent move pays 300, so clearing
// level 1 in 12 of 20 moves scores 1,200 + 2,400 = 3,600. That is why the 3-star
// tier sits near 4,800 while the target is 1,200 — the gap is speed.
//
// Jelly levels are tuned by move limit, set near the p85 of moves the reference
// player needs to clear the layout.
//
// Star thresholds come from the same realistic distribution (p05/p50/p85 of
// winning runs). The 1-star tier is pinned at or under the win floor on every
// level — on score levels it equals the target, since the target IS the pass
// line and clearing must always be worth at least one star. Two tests enforce
// this: src/data/levels.test.js and src/utils/progression.test.js.

export const LEVELS = [
  {
    id: 1,
    name: 'Sugar Patch',
    objective: { type: 'score', target: 1200 },
    moveLimit: 20,
    jellyLayout: null,
    starThresholds: [1200, 3300, 4800],
  },
  {
    id: 2,
    name: 'Gumdrop Grove',
    objective: { type: 'score', target: 1500 },
    moveLimit: 22,
    jellyLayout: null,
    starThresholds: [1500, 3400, 4800],
  },
  {
    id: 3,
    name: 'Jelly Jungle',
    objective: { type: 'jelly' },
    moveLimit: 30,
    jellyLayout: buildJellyRing(8, 8, 1),
    starThresholds: [3200, 5900, 7100],
  },
  {
    id: 4,
    name: 'Lollipop Lane',
    objective: { type: 'score', target: 1400 },
    moveLimit: 20,
    jellyLayout: null,
    starThresholds: [1400, 3200, 4200],
  },
  {
    id: 5,
    name: 'Chocolate Chasm',
    objective: { type: 'jelly' },
    moveLimit: 20,
    jellyLayout: buildJellyBlock(8, 8, 4, 2),
    initialBombs: 3,
    bombTimer: 16,
    starThresholds: [2000, 3800, 4900],
  },
  {
    id: 6,
    name: 'Peppermint Peaks',
    objective: { type: 'score', target: 1700 },
    moveLimit: 21,
    jellyLayout: null,
    starThresholds: [1700, 3100, 4600],
  },
  {
    id: 7,
    name: 'Bubblegum Bay',
    objective: { type: 'jelly' },
    moveLimit: 27,
    jellyLayout: buildJellyCheckerboard(8, 8, 1),
    starThresholds: [3200, 5500, 6600],
  },
  {
    id: 8,
    name: 'Caramel Canyon',
    objective: { type: 'score', target: 1600 },
    moveLimit: 22,
    jellyLayout: null,
    initialBombs: 2,
    bombTimer: 14,
    starThresholds: [1600, 3500, 5600],
  },
  {
    id: 9,
    name: 'Marshmallow Marsh',
    objective: { type: 'jelly' },
    moveLimit: 34,
    jellyLayout: buildJellyCorners(8, 8, 2, 2),
    // A licorice wall across the middle. It can't be matched or swapped, and it
    // absorbs striped beams, so the two halves of the board have to be worked
    // separately until the wall is chipped away by adjacent matches.
    blockerLayout: blockersAt(8, 8, BLOCKER.LICORICE, [
      [3, 1], [3, 2], [3, 5], [3, 6],
      [4, 1], [4, 6],
    ]),
    starThresholds: [3600, 5800, 7600],
  },
  {
    id: 10,
    name: 'Rainbow Summit',
    objective: { type: 'jelly' },
    moveLimit: 30,
    jellyLayout: buildJellyFull(8, 8, 1),
    initialBombs: 2,
    bombTimer: 16,
    starThresholds: [3400, 5800, 7400],
  },
  {
    id: 11,
    name: 'Cocoa Quarry',
    objective: { type: 'jelly' },
    moveLimit: 27,
    jellyLayout: buildJellyCheckerboard(8, 8, 1),
    // Two chocolate seeds. Leave them alone for a turn and they eat a candy —
    // the level is a race between clearing jelly and containing the spread.
    blockerLayout: blockersAt(8, 8, BLOCKER.CHOCOLATE, [[0, 0], [7, 7]]),
    // Four caged candies to break open along the way.
    lockLayout: locksAt(8, 8, [[2, 2], [2, 5], [5, 2], [5, 5]]),
    starThresholds: [3100, 5100, 6300],
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}
