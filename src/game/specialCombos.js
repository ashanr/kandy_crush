// Special-candy swap resolution: bomb combos, special+special combos, and
// special+normal single detonations. Isolated from board.js so the core
// match/cascade engine stays focused on plain matches — this module owns
// everything that happens when a swap involves at least one special candy.
//
// Imports primitives back from board.js (activateSpecial, clearAndCascade,
// cellKey, parseKey, swapCells, SPECIAL). board.js in turn imports
// handleSpecialSwap from here, which makes this pair circularly dependent.
// That's safe: every cross-module call happens inside a function body
// invoked later by application code, never during either module's own
// top-level evaluation.

import {
  SPECIAL,
  cellKey,
  parseKey,
  activateSpecial,
  clearAndCascade,
  swapCells,
} from './board.js';

// After the geometric blast area for a special+special combo is computed,
// scan every cell it touches for OTHER special candies caught in the blast
// and chain-activate them too (e.g. a striped+striped cross beam that
// happens to pass through a wrapped candy also detonates that wrapped
// candy's 3x3 area, which might catch yet another special, and so on).
function chainDetonateSpecialsInSet(board, explosionCells, ctx) {
  const visited = new Set();
  const processed = new Set();
  let frontier = [...explosionCells];

  while (frontier.length > 0) {
    const next = [];
    frontier.forEach((key) => {
      if (processed.has(key)) return;
      processed.add(key);
      const [r, c] = parseKey(key);
      const cell = board[r][c];
      if (cell && cell.special !== SPECIAL.NONE) {
        const before = explosionCells.size;
        activateSpecial(board, r, c, cell, explosionCells, visited, ctx);
        if (explosionCells.size > before) {
          explosionCells.forEach((k) => {
            if (!processed.has(k)) next.push(k);
          });
        }
      }
    });
    frontier = next;
  }
}

// Bomb + anything: bomb+bomb wipes the whole board; bomb+special converts
// every candy of the other special's color into that special and detonates
// them all at once; bomb+normal just clears every candy of that color. If a
// same-colored cell elsewhere on the board already happens to be its own
// special, that special is honored (chain-detonated) rather than being
// flattened into a plain single-cell clear.
function resolveBombCombo(board, jellyGrid, posBomb, posOther, otherCell, rng) {
  const rows = board.length;
  const cols = board[0].length;
  const explosionCells = new Set();
  const visited = new Set();
  const ctx = { jellyGrid, rng };

  if (otherCell.special === SPECIAL.BOMB) {
    for (let rr = 0; rr < rows; rr += 1) {
      for (let cc = 0; cc < cols; cc += 1) explosionCells.add(cellKey(rr, cc));
    }
  } else {
    for (let rr = 0; rr < rows; rr += 1) {
      for (let cc = 0; cc < cols; cc += 1) {
        const cell = board[rr][cc];
        if (!cell || cell.color !== otherCell.color) continue;
        const effectiveSpecial = otherCell.special !== SPECIAL.NONE ? otherCell.special : cell.special;
        if (effectiveSpecial !== SPECIAL.NONE) {
          activateSpecial(board, rr, cc, { ...cell, special: effectiveSpecial }, explosionCells, visited, ctx);
        } else {
          explosionCells.add(cellKey(rr, cc));
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

// Special + special (non-bomb) combos: geometric blast shapes per the
// combo table, then chain-detonate any other specials caught in the blast.
function resolveSpecialCombo(board, jellyGrid, posA, posB, cellA, cellB, rng) {
  const [r, c] = posB;
  const rows = board.length;
  const cols = board[0].length;
  const explosionCells = new Set();

  const types = [cellA.special, cellB.special];
  const isStriped = (t) => t === SPECIAL.STRIPED_H || t === SPECIAL.STRIPED_V;
  const stripedCount = types.filter(isStriped).length;
  const wrappedCount = types.filter((t) => t === SPECIAL.WRAPPED).length;

  if (stripedCount === 2) {
    // Cross beam: full row + full column, regardless of stripe orientation.
    for (let cc = 0; cc < cols; cc += 1) explosionCells.add(cellKey(r, cc));
    for (let rr = 0; rr < rows; rr += 1) explosionCells.add(cellKey(rr, c));
  } else if (stripedCount === 1 && wrappedCount === 1) {
    // Giant mega beam: 3-wide row band + 3-wide column band.
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
    // Double wrapped: 5x5 area.
    for (let rr = r - 2; rr <= r + 2; rr += 1) {
      for (let cc = c - 2; cc <= c + 2; cc += 1) {
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) explosionCells.add(cellKey(rr, cc));
      }
    }
  } else {
    // No explicit combo shape is defined for this pairing (e.g. Jelly Fish +
    // Striped, Jelly Fish + Wrapped, or Jelly Fish + Jelly Fish) — fall back
    // to each special detonating its own individual effect at its own
    // position, rather than silently wasting the player's move.
    const visited = new Set();
    const ctx = { jellyGrid, rng };
    activateSpecial(board, posA[0], posA[1], cellA, explosionCells, visited, ctx);
    activateSpecial(board, r, c, cellB, explosionCells, visited, ctx);
  }

  chainDetonateSpecialsInSet(board, explosionCells, { jellyGrid, rng });
  return clearAndCascade(board, jellyGrid, explosionCells, rng);
}

// Special + normal: the swap always succeeds (never rejected for lack of a
// conventional 3-match) and the special detonates once at its new position.
function resolveSingleDetonation(board, jellyGrid, posA, posB, cellA, cellB, rng) {
  const swapped = swapCells(board, posA, posB);
  const aIsSpecial = cellA.special !== SPECIAL.NONE;
  const specialPos = aIsSpecial ? posB : posA;
  const specialCell = swapped[specialPos[0]][specialPos[1]];

  const explosionCells = new Set();
  activateSpecial(swapped, specialPos[0], specialPos[1], specialCell, explosionCells, new Set(), { jellyGrid, rng });
  return clearAndCascade(swapped, jellyGrid, explosionCells, rng);
}

export function handleSpecialSwap(board, jellyGrid, posA, posB, cellA, cellB, rng = Math.random) {
  const aSpecial = cellA.special !== SPECIAL.NONE;
  const bSpecial = cellB.special !== SPECIAL.NONE;

  if (cellA.special === SPECIAL.BOMB || cellB.special === SPECIAL.BOMB) {
    const bombIsA = cellA.special === SPECIAL.BOMB;
    const posBomb = bombIsA ? posA : posB;
    const posOther = bombIsA ? posB : posA;
    const otherCell = bombIsA ? cellB : cellA;
    return resolveBombCombo(board, jellyGrid, posBomb, posOther, otherCell, rng);
  }

  if (aSpecial && bSpecial) {
    return resolveSpecialCombo(board, jellyGrid, posA, posB, cellA, cellB, rng);
  }

  return resolveSingleDetonation(board, jellyGrid, posA, posB, cellA, cellB, rng);
}
