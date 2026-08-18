// Match-3 engine: pure functions operating on a 2D array of candy cells.
// Board cells: { id, color, special } — jelly is tracked in a separate
// parallel grid (jellyGrid) so it stays attached to a board position even
// as candies above it move/fall, matching real Candy Crush semantics.

import { handleSpecialSwap } from './specialCombos.js';

export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export const SPECIAL = {
  NONE: 'none',
  STRIPED_H: 'striped-h',
  STRIPED_V: 'striped-v',
  WRAPPED: 'wrapped',
  BOMB: 'bomb',
  JELLY_FISH: 'jelly-fish',
  COCONUT_WHEEL: 'coconut-wheel',
  LUCKY: 'lucky',
};

export const SCORE_PER_CANDY = 10;

/**
 * Blockers occupy a board cell instead of a candy. They carry no `color`, which
 * is what makes them unmatchable for free — `findMatches` keys entirely off
 * `cell?.color`, and a run of colourless cells fails its `prevColor` guard.
 *
 * Deviation from the original worth knowing about: here blockers fall with
 * gravity. Real chocolate is anchored, but anchoring it means candies can no
 * longer refill the column beneath it, which leaves permanent holes in the
 * board — a much larger change to gravity and refill than the hazard is worth.
 */
export const BLOCKER = {
  LICORICE: 'licorice',
  CHOCOLATE: 'chocolate',
};

export function createBlocker(kind) {
  return { id: nextId(), color: undefined, special: SPECIAL.NONE, blocker: kind };
}

export function isBlocker(cell) {
  return Boolean(cell && cell.blocker);
}

/** A cell the player is allowed to pick up and swap. */
export function isSwappable(cell) {
  return Boolean(cell) && !cell.blocker && !cell.locked;
}

let uidCounter = 0;
function nextId() {
  uidCounter += 1;
  return uidCounter;
}

export function randomColor(rng = Math.random) {
  return COLORS[Math.floor(rng() * COLORS.length)];
}

export function createCandy(color, special = SPECIAL.NONE, bombTimer = undefined) {
  return { id: nextId(), color, special, bombTimer };
}

export function createEmptyJellyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

export function cellKey(r, c) {
  return `${r},${c}`;
}

export function parseKey(key) {
  const [r, c] = key.split(',');
  return [Number(r), Number(c)];
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function swapCells(board, [r1, c1], [r2, c2]) {
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
  // 2x2 square (Jelly Fish match): during raster (top-to-bottom,
  // left-to-right) placement, (r,c) can only ever complete a square as its
  // bottom-right corner, since the other 3 cells are always placed first.
  if (r >= 1 && c >= 1) {
    const topLeft = board[r - 1][c - 1];
    const topRight = board[r - 1][c];
    const bottomLeft = row[c - 1];
    if (
      topLeft && topRight && bottomLeft
      && topLeft.color === color && topRight.color === color && bottomLeft.color === color
    ) {
      return true;
    }
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
    // Defense in depth: the per-cell heuristic above should already
    // guarantee zero matches, but re-verify with the full match scanner
    // (which also covers shapes the heuristic doesn't reason about) rather
    // than trusting the heuristic blindly.
  } while ((findMatches(board).length > 0 || !hasValidMove(board)) && guard < 50);
  return board;
}

// ---------------------------------------------------------------------------
// Match detection
// ---------------------------------------------------------------------------

// Returns match groups: { color, cells: [[r,c], ...], shape: 'line-h'|'line-v'|'intersection'|'square' }
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

  // 2x2 square matches are a distinct shape category from lines/T-L shapes.
  // They only claim cells not already part of a line/intersection group, so
  // a 3-in-a-row always takes priority over an incidental 2x2 overlap.
  const claimed = new Set();
  groups.forEach((g) => g.cells.forEach((cell) => claimed.add(cellKey(...cell))));

  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const square = [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]];
      const keys = square.map(([rr, cc]) => cellKey(rr, cc));
      if (keys.some((k) => claimed.has(k))) continue;
      const color = board[r][c]?.color;
      if (color && square.every(([rr, cc]) => board[rr][cc]?.color === color)) {
        groups.push({ color, cells: square, shape: 'square' });
        keys.forEach((k) => claimed.add(k));
      }
    }
  }

  return groups;
}

function specialForGroup(group) {
  if (group.shape === 'square') return SPECIAL.JELLY_FISH;
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

// Jelly Fish targeting: prefers cells that still have jelly on them (so the
// fish actively helps clear jelly objectives); falls back to random other
// candies once jelly targets run out. `explosionCells` is passed in so a
// fish never re-targets a cell that's already part of the same blast.
function pickJellyFishTargets(board, jellyGrid, r, c, explosionCells, rng, count = 3) {
  const rows = board.length;
  const cols = board[0].length;
  const jellyCandidates = [];
  const otherCandidates = [];

  for (let rr = 0; rr < rows; rr += 1) {
    for (let cc = 0; cc < cols; cc += 1) {
      if (rr === r && cc === c) continue;
      if (!board[rr][cc]) continue;
      if (explosionCells.has(cellKey(rr, cc))) continue;
      if (jellyGrid && jellyGrid[rr]?.[cc] > 0) jellyCandidates.push([rr, cc]);
      else otherCandidates.push([rr, cc]);
    }
  }

  const pickRandom = (pool, n) => {
    const remaining = [...pool];
    const picked = [];
    while (picked.length < n && remaining.length > 0) {
      const idx = Math.floor(rng() * remaining.length);
      picked.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
    return picked;
  };

  const picks = pickRandom(jellyCandidates, count);
  if (picks.length < count) {
    picks.push(...pickRandom(otherCandidates, count - picks.length));
  }
  return picks;
}

export function activateSpecial(board, r, c, cell, explosionCells, visited = new Set(), ctx = {}) {
  const key = cellKey(r, c);
  if (visited.has(key)) return;
  visited.add(key);
  explosionCells.add(key);

  const { jellyGrid = null, rng = Math.random } = ctx;
  const rows = board.length;
  const cols = board[0].length;
  const cellsToActivate = [];

  if (cell.special === SPECIAL.STRIPED_H) {
    // Licorice absorbs the beam: it stops at the swirl instead of passing
    // through, so a wall of licorice genuinely shields what is behind it.
    for (let cc = c; cc < cols; cc += 1) {
      cellsToActivate.push([r, cc]);
      if (cc !== c && board[r][cc]?.blocker === BLOCKER.LICORICE) break;
    }
    for (let cc = c - 1; cc >= 0; cc -= 1) {
      cellsToActivate.push([r, cc]);
      if (board[r][cc]?.blocker === BLOCKER.LICORICE) break;
    }
  } else if (cell.special === SPECIAL.STRIPED_V) {
    for (let rr = r; rr < rows; rr += 1) {
      cellsToActivate.push([rr, c]);
      if (rr !== r && board[rr][c]?.blocker === BLOCKER.LICORICE) break;
    }
    for (let rr = r - 1; rr >= 0; rr -= 1) {
      cellsToActivate.push([rr, c]);
      if (board[rr][c]?.blocker === BLOCKER.LICORICE) break;
    }
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
  } else if (cell.special === SPECIAL.JELLY_FISH) {
    cellsToActivate.push(...pickJellyFishTargets(board, jellyGrid, r, c, explosionCells, rng));
  } else if (cell.special === SPECIAL.COCONUT_WHEEL) {
    // Direct activation (e.g. caught in blast): rolls 3 spaces horizontally
    const rollDir = ctx.rollDir || [0, 1]; // [dr, dc]
    const [dr, dc] = rollDir;
    for (let step = 1; step <= 3; step += 1) {
      const rr = r + step * dr;
      const cc = c + step * dc;
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
        explosionCells.add(cellKey(rr, cc));
        // Perpendicular laser beam
        if (dr === 0) {
          for (let rowIdx = 0; rowIdx < rows; rowIdx += 1) cellsToActivate.push([rowIdx, cc]);
        } else {
          for (let colIdx = 0; colIdx < cols; colIdx += 1) cellsToActivate.push([rr, colIdx]);
        }
      }
    }
  } else if (cell.special === SPECIAL.LUCKY) {
    // Lucky Candy Auto-Transformation based on level objective / active jelly
    const hasJelly = jellyGrid && jellyGrid.some((row) => row.some((val) => val > 0));
    if (hasJelly || ctx.objectiveType === 'jelly') {
      // Transform into Jelly Fish
      cellsToActivate.push(...pickJellyFishTargets(board, jellyGrid, r, c, explosionCells, rng));
    } else {
      // Transform into Color Bomb clear for maximum score
      for (let rr = 0; rr < rows; rr += 1) {
        for (let cc = 0; cc < cols; cc += 1) {
          if (board[rr][cc] && board[rr][cc].color === cell.color) cellsToActivate.push([rr, cc]);
        }
      }
    }
  }

  cellsToActivate.forEach(([rr, cc]) => {
    const k = cellKey(rr, cc);
    if (explosionCells.has(k)) return;
    explosionCells.add(k);
    const other = board[rr][cc];
    if (other && other.special && other.special !== SPECIAL.NONE) {
      activateSpecial(board, rr, cc, other, explosionCells, visited, ctx);
    }
  });
}

// ---------------------------------------------------------------------------
// Gravity
// ---------------------------------------------------------------------------

/**
 * Applies the blocker/lock rules to a pending set of cleared cells.
 *
 * Two things happen that a plain clear wouldn't do:
 *  - A **locked** candy caught in a match is freed rather than destroyed. The
 *    lock absorbs the hit, so the candy survives and is playable next move.
 *  - **Blockers** are never matched directly (they have no colour), so the only
 *    way to remove them is collateral damage: any blocker orthogonally adjacent
 *    to a cleared cell is destroyed.
 *
 * Mutates `board` in place and returns the set of cells that should actually be
 * emptied, plus which blocker kinds were destroyed (the chocolate spread rule
 * needs to know whether any chocolate died this move).
 */
function applyClearRules(board, toClear) {
  const rows = board.length;
  const cols = board[0].length;
  const cleared = new Set();
  const destroyedKinds = new Set();

  toClear.forEach((key) => {
    const [r, c] = parseKey(key);
    const cell = board[r][c];
    if (!cell) return;
    if (cell.locked) {
      // The cage takes the hit; the candy stays on the board.
      board[r][c] = { ...cell, locked: false };
      return;
    }
    if (cell.blocker) destroyedKinds.add(cell.blocker);
    cleared.add(key);
  });

  // Collateral damage to adjacent blockers, computed from the cells that are
  // genuinely clearing (a freed lock does not also smash the neighbouring
  // licorice — the hit was spent on the cage).
  const neighbours = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const collateral = new Set();
  cleared.forEach((key) => {
    const [r, c] = parseKey(key);
    neighbours.forEach(([dr, dc]) => {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) return;
      const neighbour = board[rr][cc];
      if (isBlocker(neighbour)) collateral.add(cellKey(rr, cc));
    });
  });
  collateral.forEach((key) => {
    const [r, c] = parseKey(key);
    destroyedKinds.add(board[r][c].blocker);
    cleared.add(key);
  });

  return { cleared, destroyedKinds };
}

/**
 * Chocolate grows when it is left alone: if a move destroys no chocolate, one
 * chocolate block consumes an orthogonally adjacent candy. That "punish
 * inaction" pressure is the whole point of the hazard — without it chocolate is
 * just a wall you can ignore.
 */
export function spreadChocolate(board, rng = Math.random) {
  const rows = board.length;
  const cols = board[0].length;
  const sources = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (board[r][c]?.blocker === BLOCKER.CHOCOLATE) sources.push([r, c]);
    }
  }
  if (sources.length === 0) return { board, spread: null };

  const neighbours = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  // Consider every legal growth site, then pick one, so growth isn't biased
  // toward whichever chocolate happens to sit earliest in scan order.
  const sites = [];
  sources.forEach(([r, c]) => {
    neighbours.forEach(([dr, dc]) => {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) return;
      const target = board[rr][cc];
      if (target && !target.blocker && !target.locked) sites.push([rr, cc]);
    });
  });
  if (sites.length === 0) return { board, spread: null };

  const [gr, gc] = sites[Math.floor(rng() * sites.length)];
  const next = cloneBoard(board);
  next[gr][gc] = createBlocker(BLOCKER.CHOCOLATE);
  return { board: next, spread: [gr, gc] };
}

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
  const blockersDestroyed = new Set();
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
    const ctx = { jellyGrid: jelly, rng };
    toClear.forEach((key) => {
      const [r, c] = parseKey(key);
      const cell = current[r][c];
      if (cell && cell.special !== SPECIAL.NONE) {
        activateSpecial(current, r, c, cell, explosionCells, new Set(), ctx);
      }
    });
    explosionCells.forEach((k) => toClear.add(k));

    // Locked candies are freed instead of cleared, and adjacent blockers are
    // smashed as collateral — see applyClearRules.
    const { cleared, destroyedKinds } = applyClearRules(current, toClear);
    destroyedKinds.forEach((kind) => blockersDestroyed.add(kind));

    totalScore += cleared.size * SCORE_PER_CANDY * multiplier;

    cleared.forEach((key) => {
      const [r, c] = parseKey(key);
      if (jelly[r][c] > 0) jelly[r][c] -= 1;
    });

    const spawnMap = new Map(specialSpawns.map((s) => [cellKey(s.r, s.c), s]));
    cleared.forEach((key) => {
      const [r, c] = parseKey(key);
      const spawn = spawnMap.get(key);
      current[r][c] = spawn ? createCandy(spawn.color, spawn.special) : null;
    });

    cascadeSteps.push({ cleared: [...cleared], level: cascadeLevel });
    current = applyGravity(current, rng);
  }

  return {
    board: current,
    jellyGrid: jelly,
    score: totalScore,
    cascadeSteps,
    cascadeCount: cascadeLevel,
    blockersDestroyed: [...blockersDestroyed],
  };
}

export function clearAndCascade(board, jellyGrid, explosionCells, rng = Math.random) {
  const current = cloneBoard(board);
  const jelly = jellyGrid.map((row) => row.slice());

  const { cleared, destroyedKinds } = applyClearRules(current, explosionCells);
  cleared.forEach((key) => {
    const [r, c] = parseKey(key);
    if (jelly[r][c] > 0) jelly[r][c] -= 1;
    current[r][c] = null;
  });

  const score = cleared.size * SCORE_PER_CANDY;
  const gravBoard = applyGravity(current, rng);
  const cascadeResult = resolveBoard(gravBoard, jelly, { rng });

  return {
    valid: true,
    board: cascadeResult.board,
    jellyGrid: cascadeResult.jellyGrid,
    score: score + cascadeResult.score,
    cascadeSteps: [{ cleared: [...cleared], level: 0 }, ...cascadeResult.cascadeSteps],
    cascadeCount: cascadeResult.cascadeCount,
    blockersDestroyed: [...new Set([...destroyedKinds, ...(cascadeResult.blockersDestroyed || [])])],
  };
}

// ---------------------------------------------------------------------------
// Candy Bomb countdown resolution. Applies at the very end of any valid move.
// ---------------------------------------------------------------------------

export function finalizeMove(result, rng = Math.random) {
  if (!result.valid) return result;

  let bombExploded = false;
  let board = result.board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

  // Chocolate grows unless it was hit this move. Runs before the bomb tick so a
  // freshly-grown block can't consume the cell a bomb is about to vacate.
  let chocolateSpread = null;
  const hitChocolate = (result.blockersDestroyed || []).includes(BLOCKER.CHOCOLATE);
  if (!hitChocolate) {
    const grown = spreadChocolate(board, rng);
    board = grown.board;
    chocolateSpread = grown.spread;
  }
  
  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[r].length; c += 1) {
      const cell = board[r][c];
      if (cell && cell.bombTimer !== undefined) {
        if (cell.bombTimer <= 1) {
          bombExploded = true;
          cell.bombTimer = 0;
        } else {
          cell.bombTimer -= 1;
        }
      }
    }
  }
  return { ...result, board, bombExploded, chocolateSpread };
}

// ---------------------------------------------------------------------------
// Public move API. Special-candy-involved swaps (bomb combos, special+special
// combos, and special+normal single detonations) are delegated to
// specialCombos.js. That module imports primitives back from this file,
// making this a circular import — safe here because handleSpecialSwap is
// only ever invoked at call time (inside attemptMove), never during either
// module's own top-level evaluation.
// ---------------------------------------------------------------------------

export function attemptMove(board, jellyGrid, posA, posB, rng = Math.random) {
  const [r1, c1] = posA;
  const [r2, c2] = posB;
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) {
    return { valid: false };
  }

  const cellA = board[r1][c1];
  const cellB = board[r2][c2];

  // Blockers can't be picked up, and a locked candy is pinned in its cage until
  // a neighbouring match frees it.
  if (!isSwappable(cellA) || !isSwappable(cellB)) {
    return { valid: false };
  }

  if (cellA.special !== SPECIAL.NONE || cellB.special !== SPECIAL.NONE) {
    return finalizeMove(handleSpecialSwap(board, jellyGrid, posA, posB, cellA, cellB, rng));
  }

  const swapped = swapCells(board, posA, posB);
  const matches = findMatches(swapped);
  if (matches.length === 0) {
    return { valid: false };
  }

  const result = resolveBoard(swapped, jellyGrid, { triggerPos: posB, rng });
  return finalizeMove({ valid: true, ...result });
}

// ---------------------------------------------------------------------------
// Deadlock detection & reshuffle
// ---------------------------------------------------------------------------

function swapCreatesMatch(board, posA, posB) {
  // Deadlock detection and the idle hint both run through here, so an
  // unswappable pair must not count as a legal move — otherwise the board can
  // look playable while every "move" it found is actually rejected.
  if (!isSwappable(board[posA[0]][posA[1]]) || !isSwappable(board[posB[0]][posB[1]])) return false;
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
  return finalizeMove(clearAndCascade(board, jellyGrid, new Set([cellKey(...pos)]), rng));
}

export function useShuffleBooster(board, jellyGrid, rng = Math.random) {
  return { valid: true, board: shuffleBoard(board, rng), jellyGrid, score: 0, cascadeSteps: [], cascadeCount: 0 };
}

/**
 * Turns one candy into a Striped and detonates it immediately.
 *
 * Drives the end-of-level Sugar Crush cascade, where each unspent move is
 * cashed in as a striped candy. Scoring for that bonus is a flat per-move rate
 * decided by the caller (and calibrated against it) — the score returned here
 * is incidental board clearing on a level that has already been won, so callers
 * are free to ignore it.
 */
export function spawnAndDetonateStriped(board, jellyGrid, pos, horizontal, rng = Math.random) {
  const [r, c] = pos;
  const source = board[r][c];
  if (!source) return null;

  const next = cloneBoard(board);
  const striped = createCandy(source.color, horizontal ? SPECIAL.STRIPED_H : SPECIAL.STRIPED_V);
  next[r][c] = striped;

  const explosionCells = new Set([cellKey(r, c)]);
  activateSpecial(next, r, c, striped, explosionCells, new Set(), { jellyGrid, rng });
  return clearAndCascade(next, jellyGrid, explosionCells, rng);
}

// Grants a free Color Bomb candy at the chosen position (does not clear the board).
export function useColorBombBooster(board, pos) {
  const [r, c] = pos;
  const next = cloneBoard(board);
  next[r][c] = createCandy(next[r][c].color, SPECIAL.BOMB);
  return finalizeMove({ valid: true, board: next, score: 0 });
}
