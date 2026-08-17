// Match-3 engine: pure functions operating on a 2D array of candy cells.
// Board cells: { id, color, special } — jelly is tracked in a separate
// parallel grid (jellyGrid) so it stays attached to a board position even
// as candies above it move/fall, matching real Candy Crush semantics.

export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export const SPECIAL = {
  NONE: 'none',
  STRIPED_H: 'striped-h',
  STRIPED_V: 'striped-v',
  WRAPPED: 'wrapped',
  BOMB: 'bomb',
};

export const SCORE_PER_CANDY = 10;

let uidCounter = 0;
function nextId() {
  uidCounter += 1;
  return uidCounter;
}

export function randomColor(rng = Math.random) {
  return COLORS[Math.floor(rng() * COLORS.length)];
}

export function createCandy(color, special = SPECIAL.NONE) {
  return { id: nextId(), color, special };
}

export function createEmptyJellyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function cellKey(r, c) {
  return `${r},${c}`;
}

function parseKey(key) {
  const [r, c] = key.split(',');
  return [Number(r), Number(c)];
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function swapCells(board, [r1, c1], [r2, c2]) {
  const next = cloneBoard(board);
  const tmp = next[r1][c1];
  next[r1][c1] = next[r2][c2];
  next[r2][c2] = tmp;
  return next;
}

// ---------------------------------------------------------------------------
// Board generation — guarantees no pre-existing match and at least one legal move.
// ---------------------------------------------------------------------------

function createsImmediateMatch(board, row, r, c, color) {
  if (c >= 2 && row[c - 1] && row[c - 2] && row[c - 1].color === color && row[c - 2].color === color) {
    return true;
  }
  if (r >= 2 && board[r - 1][c] && board[r - 2][c] && board[r - 1][c].color === color && board[r - 2][c].color === color) {
    return true;
  }
  return false;
}

export function generateBoard(rows = 8, cols = 8, rng = Math.random) {
  let board;
  let guard = 0;
  do {
    board = [];
    for (let r = 0; r < rows; r += 1) {
      const row = [];
      for (let c = 0; c < cols; c += 1) {
        let color;
        let attempts = 0;
        do {
          color = randomColor(rng);
          attempts += 1;
        } while (attempts < 30 && createsImmediateMatch(board, row, r, c, color));
        row.push(createCandy(color));
      }
      board.push(row);
    }
    guard += 1;
  } while (!hasValidMove(board) && guard < 50);
  return board;
}

// ---------------------------------------------------------------------------
// Match detection
// ---------------------------------------------------------------------------

// Returns match groups: { color, cells: [[r,c], ...], shape: 'line-h'|'line-v'|'intersection' }
export function findMatches(board) {
  const rows = board.length;
  const cols = board[0].length;
  const horizontalRuns = [];
  const verticalRuns = [];

  for (let r = 0; r < rows; r += 1) {
    let runStart = 0;
    for (let c = 1; c <= cols; c += 1) {
      const prevColor = board[r][c - 1]?.color;
      const curColor = c < cols ? board[r][c]?.color : null;
      if (curColor !== prevColor) {
        const runLength = c - runStart;
        if (runLength >= 3 && prevColor) {
          const cells = [];
          for (let cc = runStart; cc < c; cc += 1) cells.push([r, cc]);
          horizontalRuns.push({ color: prevColor, cells });
        }
        runStart = c;
      }
    }
  }

  for (let c = 0; c < cols; c += 1) {
    let runStart = 0;
    for (let r = 1; r <= rows; r += 1) {
      const prevColor = board[r - 1][c]?.color;
      const curColor = r < rows ? board[r][c]?.color : null;
      if (curColor !== prevColor) {
        const runLength = r - runStart;
        if (runLength >= 3 && prevColor) {
          const cells = [];
          for (let rr = runStart; rr < r; rr += 1) cells.push([rr, c]);
          verticalRuns.push({ color: prevColor, cells });
        }
        runStart = r;
      }
    }
  }

  const groups = [];
  const usedH = new Set();
  const usedV = new Set();

  horizontalRuns.forEach((hRun, hi) => {
    if (usedH.has(hi)) return;
    const intersectingIdx = [];
    verticalRuns.forEach((vRun, vi) => {
      if (usedV.has(vi) || vRun.color !== hRun.color) return;
      const overlaps = hRun.cells.some(([hr, hc]) => vRun.cells.some(([vr, vc]) => vr === hr && vc === hc));
      if (overlaps) intersectingIdx.push(vi);
    });
    if (intersectingIdx.length > 0) {
      const cellMap = new Map();
      hRun.cells.forEach((cell) => cellMap.set(cellKey(...cell), cell));
      intersectingIdx.forEach((vi) => verticalRuns[vi].cells.forEach((cell) => cellMap.set(cellKey(...cell), cell)));
      groups.push({ color: hRun.color, cells: [...cellMap.values()], shape: 'intersection' });
      usedH.add(hi);
      intersectingIdx.forEach((vi) => usedV.add(vi));
    }
  });

  horizontalRuns.forEach((run, i) => {
    if (usedH.has(i)) return;
    groups.push({ color: run.color, cells: run.cells, shape: 'line-h' });
  });
  verticalRuns.forEach((run, i) => {
    if (usedV.has(i)) return;
    groups.push({ color: run.color, cells: run.cells, shape: 'line-v' });
  });

  return groups;
}

function specialForGroup(group) {
  if (group.shape === 'intersection') return SPECIAL.WRAPPED;
  if (group.cells.length >= 5) return SPECIAL.BOMB;
  if (group.cells.length === 4) return group.shape === 'line-h' ? SPECIAL.STRIPED_H : SPECIAL.STRIPED_V;
  return null;
}

function pickSpawnPosition(group, triggerPos) {
  if (triggerPos && group.cells.some(([r, c]) => r === triggerPos[0] && c === triggerPos[1])) {
    return triggerPos;
  }
  return group.cells[Math.floor(group.cells.length / 2)];
}

// ---------------------------------------------------------------------------
// Special-candy activation (recursively chains into other specials caught in the blast)
// ---------------------------------------------------------------------------

function activateSpecial(board, r, c, cell, explosionCells, visited = new Set()) {
  const key = cellKey(r, c);
  if (visited.has(key)) return;
  visited.add(key);
  explosionCells.add(key);

  const rows = board.length;
  const cols = board[0].length;
  const cellsToActivate = [];

  if (cell.special === SPECIAL.STRIPED_H) {
    for (let cc = 0; cc < cols; cc += 1) cellsToActivate.push([r, cc]);
  } else if (cell.special === SPECIAL.STRIPED_V) {
    for (let rr = 0; rr < rows; rr += 1) cellsToActivate.push([rr, c]);
  } else if (cell.special === SPECIAL.WRAPPED) {
    for (let rr = r - 1; rr <= r + 1; rr += 1) {
      for (let cc = c - 1; cc <= c + 1; cc += 1) {
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) cellsToActivate.push([rr, cc]);
      }
    }
  } else if (cell.special === SPECIAL.BOMB) {
    for (let rr = 0; rr < rows; rr += 1) {
      for (let cc = 0; cc < cols; cc += 1) {
        if (board[rr][cc] && board[rr][cc].color === cell.color) cellsToActivate.push([rr, cc]);
      }
    }
  }

  cellsToActivate.forEach(([rr, cc]) => {
    const k = cellKey(rr, cc);
    if (explosionCells.has(k)) return;
    explosionCells.add(k);
    const other = board[rr][cc];
    if (other && other.special && other.special !== SPECIAL.NONE) {
      activateSpecial(board, rr, cc, other, explosionCells, visited);
    }
  });
}

// ---------------------------------------------------------------------------
// Gravity
// ---------------------------------------------------------------------------

function applyGravity(board, rng = Math.random) {
  const rows = board.length;
  const cols = board[0].length;
  const next = cloneBoard(board);
  for (let c = 0; c < cols; c += 1) {
    const surviving = [];
    for (let r = rows - 1; r >= 0; r -= 1) {
      if (next[r][c]) surviving.push(next[r][c]);
    }
    let writeRow = rows - 1;
    surviving.forEach((cell) => {
      next[writeRow][c] = cell;
      writeRow -= 1;
    });
    while (writeRow >= 0) {
      next[writeRow][c] = createCandy(randomColor(rng));
      writeRow -= 1;
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// Cascade resolution loop — resolves the triggering match, applies gravity,
// re-scans for chain matches, and repeats, increasing the score multiplier
// with each successive cascade step.
// ---------------------------------------------------------------------------

// Hard safety cap on chain-cascade depth. A well-formed board settles in a
// handful of iterations; this exists purely so a pathological refill (e.g.
// a broken/degenerate RNG) can never hang the game in an infinite loop.
const MAX_CASCADE_ITERATIONS = 25;

export function resolveBoard(board, jellyGrid, { triggerPos = null, rng = Math.random } = {}) {
  let current = cloneBoard(board);
  let jelly = jellyGrid.map((row) => row.slice());
  let cascadeLevel = 0;
  let totalScore = 0;
  const cascadeSteps = [];
  let pendingTrigger = triggerPos;

  for (;;) {
    if (cascadeLevel >= MAX_CASCADE_ITERATIONS) break;
    const matches = findMatches(current);
    if (matches.length === 0) break;
    cascadeLevel += 1;
    const multiplier = cascadeLevel;

    const toClear = new Set();
    const specialSpawns = [];
    matches.forEach((group) => {
      group.cells.forEach((cell) => toClear.add(cellKey(...cell)));
      const special = specialForGroup(group);
      if (special) {
        const [sr, sc] = pickSpawnPosition(group, pendingTrigger);
        specialSpawns.push({ r: sr, c: sc, color: group.color, special });
      }
    });
    pendingTrigger = null;

    const explosionCells = new Set();
    toClear.forEach((key) => {
      const [r, c] = parseKey(key);
      const cell = current[r][c];
      if (cell && cell.special !== SPECIAL.NONE) {
        activateSpecial(current, r, c, cell, explosionCells);
      }
    });
    explosionCells.forEach((k) => toClear.add(k));

    totalScore += toClear.size * SCORE_PER_CANDY * multiplier;

    toClear.forEach((key) => {
      const [r, c] = parseKey(key);
      if (jelly[r][c] > 0) jelly[r][c] -= 1;
    });

    const spawnMap = new Map(specialSpawns.map((s) => [cellKey(s.r, s.c), s]));
    toClear.forEach((key) => {
      const [r, c] = parseKey(key);
      const spawn = spawnMap.get(key);
      current[r][c] = spawn ? createCandy(spawn.color, spawn.special) : null;
    });

    cascadeSteps.push({ cleared: [...toClear], level: cascadeLevel });
    current = applyGravity(current, rng);
  }

  return { board: current, jellyGrid: jelly, score: totalScore, cascadeSteps, cascadeCount: cascadeLevel };
}

function clearAndCascade(board, jellyGrid, explosionCells, rng = Math.random) {
  const current = cloneBoard(board);
  const jelly = jellyGrid.map((row) => row.slice());

  explosionCells.forEach((key) => {
    const [r, c] = parseKey(key);
    if (jelly[r][c] > 0) jelly[r][c] -= 1;
    current[r][c] = null;
  });

  const score = explosionCells.size * SCORE_PER_CANDY;
  const gravBoard = applyGravity(current, rng);
  const cascadeResult = resolveBoard(gravBoard, jelly, { rng });

  return {
    valid: true,
    board: cascadeResult.board,
    jellyGrid: cascadeResult.jellyGrid,
    score: score + cascadeResult.score,
    cascadeSteps: [{ cleared: [...explosionCells], level: 0 }, ...cascadeResult.cascadeSteps],
    cascadeCount: cascadeResult.cascadeCount,
  };
}

// ---------------------------------------------------------------------------
// Special + special combo table (swapping two specials together).
// bomb + anything is handled separately since a bomb combined with a normal
// candy is also a defined combo, not just special+special.
// ---------------------------------------------------------------------------

function resolveBombCombo(board, jellyGrid, posBomb, posOther, otherCell, rng = Math.random) {
  const rows = board.length;
  const cols = board[0].length;
  const explosionCells = new Set();

  if (otherCell.special === SPECIAL.BOMB) {
    for (let rr = 0; rr < rows; rr += 1) {
      for (let cc = 0; cc < cols; cc += 1) explosionCells.add(cellKey(rr, cc));
    }
  } else {
    for (let rr = 0; rr < rows; rr += 1) {
      for (let cc = 0; cc < cols; cc += 1) {
        const cell = board[rr][cc];
        if (cell && cell.color === otherCell.color) {
          if (otherCell.special !== SPECIAL.NONE) {
            activateSpecial(board, rr, cc, { ...cell, special: otherCell.special }, explosionCells);
          } else {
            explosionCells.add(cellKey(rr, cc));
          }
        }
      }
    }
  }
  // The bomb and the candy it was swapped with are always consumed, even if
  // the bomb's own color never matched otherCell's color scan above.
  explosionCells.add(cellKey(...posBomb));
  explosionCells.add(cellKey(...posOther));
  return clearAndCascade(board, jellyGrid, explosionCells, rng);
}

function resolveSpecialCombo(board, jellyGrid, posB, cellA, cellB, rng = Math.random) {
  const [r, c] = posB;
  const rows = board.length;
  const cols = board[0].length;
  const explosionCells = new Set();

  const types = [cellA.special, cellB.special];
  const isStriped = (t) => t === SPECIAL.STRIPED_H || t === SPECIAL.STRIPED_V;
  const stripedCount = types.filter(isStriped).length;
  const wrappedCount = types.filter((t) => t === SPECIAL.WRAPPED).length;

  if (stripedCount === 2) {
    for (let cc = 0; cc < cols; cc += 1) explosionCells.add(cellKey(r, cc));
    for (let rr = 0; rr < rows; rr += 1) explosionCells.add(cellKey(rr, c));
  } else if (stripedCount === 1 && wrappedCount === 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      const rr = r + dr;
      if (rr >= 0 && rr < rows) {
        for (let cc = 0; cc < cols; cc += 1) explosionCells.add(cellKey(rr, cc));
      }
    }
    for (let dc = -1; dc <= 1; dc += 1) {
      const cc = c + dc;
      if (cc >= 0 && cc < cols) {
        for (let rr = 0; rr < rows; rr += 1) explosionCells.add(cellKey(rr, cc));
      }
    }
  } else if (wrappedCount === 2) {
    for (let rr = r - 2; rr <= r + 2; rr += 1) {
      for (let cc = c - 2; cc <= c + 2; cc += 1) {
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) explosionCells.add(cellKey(rr, cc));
      }
    }
  }

  return clearAndCascade(board, jellyGrid, explosionCells, rng);
}

// ---------------------------------------------------------------------------
// Public move API
// ---------------------------------------------------------------------------

export function attemptMove(board, jellyGrid, posA, posB, rng = Math.random) {
  const [r1, c1] = posA;
  const [r2, c2] = posB;
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) {
    return { valid: false };
  }

  const cellA = board[r1][c1];
  const cellB = board[r2][c2];

  if (cellA.special === SPECIAL.BOMB || cellB.special === SPECIAL.BOMB) {
    const bombIsA = cellA.special === SPECIAL.BOMB;
    const posBomb = bombIsA ? posA : posB;
    const posOther = bombIsA ? posB : posA;
    const otherCell = bombIsA ? cellB : cellA;
    return resolveBombCombo(board, jellyGrid, posBomb, posOther, otherCell, rng);
  }

  if (cellA.special !== SPECIAL.NONE && cellB.special !== SPECIAL.NONE) {
    return resolveSpecialCombo(board, jellyGrid, posB, cellA, cellB, rng);
  }

  const swapped = swapCells(board, posA, posB);
  const matches = findMatches(swapped);
  if (matches.length === 0) {
    return { valid: false };
  }

  const result = resolveBoard(swapped, jellyGrid, { triggerPos: posB, rng });
  return { valid: true, ...result };
}

// ---------------------------------------------------------------------------
// Deadlock detection & reshuffle
// ---------------------------------------------------------------------------

function swapCreatesMatch(board, posA, posB) {
  const swapped = swapCells(board, posA, posB);
  return findMatches(swapped).length > 0;
}

export function findAnyValidMove(board) {
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (c + 1 < cols && swapCreatesMatch(board, [r, c], [r, c + 1])) return [[r, c], [r, c + 1]];
      if (r + 1 < rows && swapCreatesMatch(board, [r, c], [r + 1, c])) return [[r, c], [r + 1, c]];
    }
  }
  return null;
}

export function hasValidMove(board) {
  return findAnyValidMove(board) !== null;
}

export function shuffleBoard(board, rng = Math.random) {
  const rows = board.length;
  const cols = board[0].length;
  let shuffled;
  let attempt = 0;
  do {
    const colors = [];
    board.forEach((row) => row.forEach((cell) => colors.push(cell.color)));
    for (let i = colors.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    shuffled = [];
    let idx = 0;
    for (let r = 0; r < rows; r += 1) {
      const row = [];
      for (let c = 0; c < cols; c += 1) {
        row.push(createCandy(colors[idx]));
        idx += 1;
      }
      shuffled.push(row);
    }
    attempt += 1;
  } while (attempt < 50 && (findMatches(shuffled).length > 0 || !hasValidMove(shuffled)));
  return shuffled;
}

// Call after every settled board state. If the board has no legal move,
// returns a reshuffled board; otherwise returns it unchanged.
export function ensurePlayable(board, rng = Math.random) {
  if (findMatches(board).length === 0 && hasValidMove(board)) {
    return { board, reshuffled: false };
  }
  return { board: shuffleBoard(board, rng), reshuffled: true };
}

// ---------------------------------------------------------------------------
// Boosters
// ---------------------------------------------------------------------------

export function useHammerBooster(board, jellyGrid, pos, rng = Math.random) {
  return clearAndCascade(board, jellyGrid, new Set([cellKey(...pos)]), rng);
}

export function useShuffleBooster(board, jellyGrid, rng = Math.random) {
  return { valid: true, board: shuffleBoard(board, rng), jellyGrid, score: 0, cascadeSteps: [], cascadeCount: 0 };
}

// Grants a free Color Bomb candy at the chosen position (does not clear the board).
export function useColorBombBooster(board, pos) {
  const [r, c] = pos;
  const next = cloneBoard(board);
  next[r][c] = createCandy(next[r][c].color, SPECIAL.BOMB);
  return { valid: true, board: next, score: 0 };
}
