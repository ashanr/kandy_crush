function buildJellyRing(rows, cols) {
  const layout = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) layout[r][c] = 1;
    }
  }
  return layout;
}

function buildJellyBlock(rows, cols) {
  const layout = Array.from({ length: rows }, () => Array(cols).fill(0));
  const rStart = Math.floor(rows / 2) - 1;
  const cStart = Math.floor(cols / 2) - 1;
  for (let r = rStart; r < rStart + 3; r += 1) {
    for (let c = cStart; c < cStart + 3; c += 1) {
      layout[r][c] = 2;
    }
  }
  return layout;
}

export const LEVELS = [
  {
    id: 1,
    name: 'Sugar Patch',
    objective: { type: 'score', target: 1000 },
    moveLimit: 20,
    jellyLayout: null,
    starThresholds: [1000, 2500, 4000],
  },
  {
    id: 2,
    name: 'Gumdrop Grove',
    objective: { type: 'score', target: 2000 },
    moveLimit: 22,
    jellyLayout: null,
    starThresholds: [2000, 4000, 6000],
  },
  {
    id: 3,
    name: 'Jelly Jungle',
    objective: { type: 'jelly' },
    moveLimit: 25,
    jellyLayout: buildJellyRing(8, 8),
    starThresholds: [3000, 5000, 7000],
  },
  {
    id: 4,
    name: 'Lollipop Lane',
    objective: { type: 'score', target: 4000 },
    moveLimit: 20,
    jellyLayout: null,
    starThresholds: [4000, 6500, 9000],
  },
  {
    id: 5,
    name: 'Chocolate Chasm',
    objective: { type: 'jelly' },
    moveLimit: 28,
    jellyLayout: buildJellyBlock(8, 8),
    starThresholds: [4500, 7000, 10000],
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}
