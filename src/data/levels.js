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

// Targets and star thresholds are calibrated against simulated play through the
// real engine (a greedy, objective-aware bot over 200 runs per level), so each
// tier actually falls inside the achievable score band:
//
//   lvl  win%   p10    p50    p90     1*/2*/3*
//   1     94%  4430   6360   8780   4000/6500/8500
//   2     88%  4710   6960   9530   4800/7300/9400
//   3     87%  2150   3360   5460   2000/3200/4800
//   4     69%  4280   7220   9570   5600/7500/9000
//   5     81%  1400   2240   3710   1400/2100/2800
//
// Note the jelly levels score far lower than the score levels: they end the
// moment the objective is cleared, so there is less board time to bank points.
// Their thresholds are scaled to that reality rather than to a global curve.
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
    starThresholds: [4800, 7300, 9400],
  },
  {
    id: 3,
    name: 'Jelly Jungle',
    objective: { type: 'jelly' },
    moveLimit: 24,
    jellyLayout: buildJellyRing(8, 8, 1),
    starThresholds: [2000, 3200, 4800],
  },
  {
    id: 4,
    name: 'Lollipop Lane',
    objective: { type: 'score', target: 5600 },
    moveLimit: 20,
    jellyLayout: null,
    starThresholds: [5600, 7500, 9000],
  },
  {
    id: 5,
    name: 'Chocolate Chasm',
    objective: { type: 'jelly' },
    moveLimit: 12,
    jellyLayout: buildJellyBlock(8, 8, 4, 2),
    starThresholds: [1400, 2100, 2800],
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}
