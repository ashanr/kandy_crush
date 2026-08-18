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

// Targets and star thresholds are calibrated against simulated play through the
// real engine (a greedy, objective- and bomb-aware bot over 250 runs per level),
// so each tier actually falls inside the achievable score band. Thresholds are
// the p15/p50/p85 of winning runs, rounded to the nearest 100:
//
// Measured star distribution over winning runs (300 runs/level):
//
//   lvl  type   win%   1★   2★   3★    thresholds
//   1    score   93%  48%  36%  15%    4000/6500/8500
//   2    score   94%  55%  33%  12%    4800/7400/9600
//   3    jelly   85%  48%  34%  17%    3200/5900/7300
//   4    score   67%  46%  32%  21%    5600/7100/8700
//   5    jelly   84%  43%  42%  14%    1700/3800/4900
//   6    score   76%  56%  37%   7%    5400/7400/9600
//   7    jelly   80%  51%  30%  18%    2200/5000/6100
//   8    score   69%  47%  40%  13%    5600/7400/9200
//   9    jelly   55%  50%  38%  10%    3500/6500/8200
//   10   jelly   65%  57%  35%   8%    2400/5500/6900
//
// The 1-star tier is deliberately set below the win floor on every level, so
// clearing an objective can never award zero stars — score levels pin it to the
// objective target (the target IS the pass line), jelly levels sit under the
// p10 of winning scores. An earlier pass placed it at the p15 and produced
// 0-star wins on 10–16% of every jelly level.
//
// Jelly-level scores are no longer far below score levels — the Sugar Crush
// leftover-moves bonus (300/move) compensates for ending early, which is what
// removed the old incentive to stall on the objective to farm points.
export const LEVELS = [
  {
    id: 1,
    name: 'Sugar Patch',
    objective: { type: 'score', target: 4000 },
    moveLimit: 20,
    jellyLayout: null,
    starThresholds: [4000, 6500, 8500],
  },
  {
    id: 2,
    name: 'Gumdrop Grove',
    objective: { type: 'score', target: 4800 },
    moveLimit: 22,
    jellyLayout: null,
    starThresholds: [4800, 7400, 9600],
  },
  {
    id: 3,
    name: 'Jelly Jungle',
    objective: { type: 'jelly' },
    moveLimit: 24,
    jellyLayout: buildJellyRing(8, 8, 1),
    starThresholds: [3200, 5900, 7300],
  },
  {
    id: 4,
    name: 'Lollipop Lane',
    objective: { type: 'score', target: 5600 },
    moveLimit: 20,
    jellyLayout: null,
    starThresholds: [5600, 7100, 8700],
  },
  {
    id: 5,
    name: 'Chocolate Chasm',
    objective: { type: 'jelly' },
    moveLimit: 15,
    jellyLayout: buildJellyBlock(8, 8, 4, 2),
    initialBombs: 3,
    bombTimer: 12,
    starThresholds: [1700, 3800, 4900],
  },
  {
    id: 6,
    name: 'Peppermint Peaks',
    objective: { type: 'score', target: 5400 },
    moveLimit: 21,
    jellyLayout: null,
    starThresholds: [5400, 7400, 9600],
  },
  {
    id: 7,
    name: 'Bubblegum Bay',
    objective: { type: 'jelly' },
    moveLimit: 19,
    jellyLayout: buildJellyCheckerboard(8, 8, 1),
    starThresholds: [2200, 5000, 6100],
  },
  {
    id: 8,
    name: 'Caramel Canyon',
    objective: { type: 'score', target: 5600 },
    moveLimit: 22,
    jellyLayout: null,
    initialBombs: 2,
    bombTimer: 14,
    starThresholds: [5600, 7400, 9200],
  },
  {
    id: 9,
    name: 'Marshmallow Marsh',
    objective: { type: 'jelly' },
    moveLimit: 26,
    jellyLayout: buildJellyCorners(8, 8, 3, 2),
    // A licorice wall across the middle. It can't be matched or swapped, and it
    // absorbs striped beams, so the two halves of the board have to be worked
    // separately until the wall is chipped away by adjacent matches.
    blockerLayout: blockersAt(8, 8, BLOCKER.LICORICE, [
      [3, 1], [3, 2], [3, 5], [3, 6],
      [4, 1], [4, 2], [4, 5], [4, 6],
    ]),
    starThresholds: [3500, 6500, 8200],
  },
  {
    id: 10,
    name: 'Rainbow Summit',
    objective: { type: 'jelly' },
    moveLimit: 21,
    jellyLayout: buildJellyFull(8, 8, 1),
    initialBombs: 2,
    bombTimer: 16,
    starThresholds: [2400, 5500, 6900],
  },
  {
    id: 11,
    name: 'Cocoa Quarry',
    objective: { type: 'jelly' },
    moveLimit: 28,
    jellyLayout: buildJellyCheckerboard(8, 8, 1),
    // Two chocolate seeds. Leave them alone for a turn and they eat a candy —
    // the level is a race between clearing jelly and containing the spread.
    blockerLayout: blockersAt(8, 8, BLOCKER.CHOCOLATE, [[0, 0], [7, 7]]),
    // Four caged candies to break open along the way.
    lockLayout: locksAt(8, 8, [[2, 2], [2, 5], [5, 2], [5, 5]]),
    starThresholds: [2600, 5200, 6800],
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}
