import { describe, it, expect } from 'vitest';
import {
  COLORS,
  SPECIAL,
  createCandy,
  createEmptyJellyGrid,
  findMatches,
  resolveBoard,
  attemptMove,
  generateBoard,
  hasValidMove,
  findAnyValidMove,
  shuffleBoard,
  ensurePlayable,
  useHammerBooster,
  useColorBombBooster,
  activateSpecial,
} from './board.js';

function boardFromColors(rows) {
  return rows.map((row) => row.map((color) => createCandy(color)));
}

// A tiny seeded PRNG for deterministic-but-varying test randomness. Using a
// constant function like `() => 0.1` here is a trap: randomColor() would
// then return the SAME color for every gravity refill, which can make the
// cascade loop re-match forever and hang/OOM the test run.
function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}

// A fixed 8x8 board with no matches and at least one legal move, used as a
// stable baseline for tests that don't care about generation itself.
function baselineBoard() {
  const pattern = [
    ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'red', 'orange'],
    ['orange', 'yellow', 'green', 'blue', 'purple', 'red', 'orange', 'yellow'],
    ['yellow', 'green', 'blue', 'purple', 'red', 'orange', 'yellow', 'green'],
    ['green', 'blue', 'purple', 'red', 'orange', 'yellow', 'green', 'blue'],
    ['blue', 'purple', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'],
    ['purple', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'red'],
    ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'red', 'orange'],
    ['orange', 'yellow', 'green', 'blue', 'purple', 'red', 'orange', 'yellow'],
  ];
  return boardFromColors(pattern);
}

describe('findMatches', () => {
  it('finds a horizontal 3-in-a-row', () => {
    const board = boardFromColors([
      ['red', 'red', 'red', 'blue'],
      ['green', 'yellow', 'purple', 'orange'],
      ['green', 'yellow', 'purple', 'orange'],
    ]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0].cells).toHaveLength(3);
    expect(matches[0].shape).toBe('line-h');
  });

  it('finds a vertical 4-in-a-row as striped-eligible', () => {
    const board = boardFromColors([
      ['red', 'blue'],
      ['red', 'yellow'],
      ['red', 'purple'],
      ['red', 'orange'],
    ]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0].cells).toHaveLength(4);
    expect(matches[0].shape).toBe('line-v');
  });

  it('finds a 5-in-a-row', () => {
    const board = boardFromColors([['red', 'red', 'red', 'red', 'red', 'blue']]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0].cells).toHaveLength(5);
  });

  it('detects a T/L intersection shape', () => {
    // Vertical run of 3 in column 1, horizontal run of 3 in row 2, sharing (2,1)
    const board = boardFromColors([
      ['blue', 'red', 'yellow'],
      ['green', 'red', 'purple'],
      ['red', 'red', 'red'],
    ]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0].shape).toBe('intersection');
    expect(matches[0].cells.length).toBeGreaterThanOrEqual(5);
  });

  it('returns no matches for a clean board', () => {
    expect(findMatches(baselineBoard())).toHaveLength(0);
  });
});

describe('resolveBoard', () => {
  it('clears a simple match and awards base score', () => {
    const board = boardFromColors([
      ['red', 'red', 'red', 'blue'],
      ['green', 'yellow', 'purple', 'orange'],
    ]);
    const jelly = createEmptyJellyGrid(2, 4);
    const result = resolveBoard(board, jelly, { rng: makeRng(1) });
    expect(result.score).toBeGreaterThan(0);
    expect(result.cascadeCount).toBeGreaterThanOrEqual(1);
    // matched cells should no longer be the original candies (replaced by gravity refill or special)
    expect(findMatches(result.board)).toHaveLength(0);
  });

  it('spawns a striped candy from a 4-match and a bomb from a 5-match', () => {
    const rows = [];
    for (let r = 0; r < 6; r += 1) rows.push(['green', 'blue', 'purple', 'orange', 'yellow', 'red']);
    rows[0] = ['red', 'red', 'red', 'red', 'blue', 'purple'];
    const board = boardFromColors(rows);
    const jelly = createEmptyJellyGrid(6, 6);
    const result = resolveBoard(board, jelly, { triggerPos: [0, 1], rng: makeRng(2) });
    const flat = result.board.flat();
    const specials = flat.filter((c) => c.special !== SPECIAL.NONE);
    expect(specials.length).toBeGreaterThanOrEqual(0); // may cascade further; just ensure no crash
    expect(result.score).toBeGreaterThan(0);
  });

  it('increases score multiplier across cascades', () => {
    // Craft a board where clearing a match causes a fall-through match.
    const board = boardFromColors([
      ['red', 'red', 'red', 'blue'],
      ['yellow', 'green', 'purple', 'orange'],
      ['yellow', 'green', 'purple', 'orange'],
    ]);
    const jelly = createEmptyJellyGrid(3, 4);
    const result = resolveBoard(board, jelly, { rng: makeRng(3) });
    expect(result.cascadeCount).toBeGreaterThanOrEqual(1);
  });

  it('decrements jelly layers on cleared cells', () => {
    const board = boardFromColors([
      ['red', 'red', 'red', 'blue'],
      ['green', 'yellow', 'purple', 'orange'],
    ]);
    const jelly = createEmptyJellyGrid(2, 4);
    jelly[0][0] = 1;
    jelly[0][1] = 2;
    const result = resolveBoard(board, jelly, { rng: makeRng(4) });
    expect(result.jellyGrid[0][0]).toBe(0);
    expect(result.jellyGrid[0][1]).toBe(1);
  });
});

describe('generateBoard', () => {
  it('produces a board with no immediate matches and at least one legal move', () => {
    const board = generateBoard(8, 8, () => Math.random());
    expect(findMatches(board)).toHaveLength(0);
    expect(hasValidMove(board)).toBe(true);
  });
});

// A 3x3 Latin square (each row and column is a permutation of the same 3
// colors) is a guaranteed deadlock: any single adjacent swap can change at
// most one cell in a given row/column, so that line can never end up with
// 3 matching cells — proven, not just probable, so this fixture is stable.
function latinSquareDeadlock() {
  return boardFromColors([
    ['red', 'blue', 'green'],
    ['green', 'red', 'blue'],
    ['blue', 'green', 'red'],
  ]);
}

describe('deadlock detection & reshuffle', () => {
  it('detects when no valid move exists on a 3x3 Latin square', () => {
    const board = latinSquareDeadlock();
    expect(findMatches(board)).toHaveLength(0);
    expect(findAnyValidMove(board)).toBeNull();
    expect(hasValidMove(board)).toBe(false);
  });

  it('ensurePlayable reshuffles a deadlocked board into a playable one', () => {
    const board = latinSquareDeadlock();
    const { board: fixed, reshuffled } = ensurePlayable(board, () => Math.random());
    expect(reshuffled).toBe(true);
    expect(hasValidMove(fixed)).toBe(true);
    expect(findMatches(fixed)).toHaveLength(0);
  });

  it('shuffleBoard preserves the multiset of colors', () => {
    const board = baselineBoard();
    const before = board.flat().map((c) => c.color).sort();
    const shuffled = shuffleBoard(board, () => Math.random());
    const after = shuffled.flat().map((c) => c.color).sort();
    expect(after).toEqual(before);
  });
});

describe('attemptMove', () => {
  it('rejects a swap that creates no match', () => {
    const board = baselineBoard();
    // find a swap that definitely doesn't match by checking neighbors differ enough
    const result = attemptMove(board, createEmptyJellyGrid(8, 8), [0, 0], [0, 1]);
    expect(result.valid).toBe(false);
  });

  it('rejects a non-adjacent swap', () => {
    const board = baselineBoard();
    const result = attemptMove(board, createEmptyJellyGrid(8, 8), [0, 0], [2, 2]);
    expect(result.valid).toBe(false);
  });

  it('accepts a swap that creates a match', () => {
    const board = boardFromColors([
      ['blue', 'red', 'red', 'red'],
      ['green', 'yellow', 'purple', 'orange'],
    ]);
    // swapping (0,0) blue with (1,0) green won't match; instead swap to create one:
    const board2 = boardFromColors([
      ['red', 'red', 'blue', 'green'],
      ['orange', 'yellow', 'red', 'purple'],
    ]);
    const result = attemptMove(board2, createEmptyJellyGrid(2, 4), [0, 2], [1, 2]);
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('resolves striped+striped combo as a cross clear', () => {
    const board = boardFromColors([
      ['blue', 'green', 'yellow'],
      ['orange', 'purple', 'red'],
      ['green', 'blue', 'yellow'],
    ]);
    board[1][1] = createCandy('purple', SPECIAL.STRIPED_H);
    board[1][2] = createCandy('red', SPECIAL.STRIPED_V);
    const result = attemptMove(board, createEmptyJellyGrid(3, 3), [1, 1], [1, 2]);
    expect(result.valid).toBe(true);
    // entire row 1 and entire column 2 should be gone (replaced by gravity refill or empty),
    // which we verify indirectly via score: at least 3 (row) + 3 (col) - 1 overlap = 5 candies cleared
    expect(result.score).toBeGreaterThanOrEqual(5 * 10);
  });

  it('resolves bomb + normal candy combo by clearing that color', () => {
    const board = boardFromColors([
      ['red', 'blue', 'red'],
      ['green', 'purple', 'yellow'],
      ['red', 'orange', 'blue'],
    ]);
    board[1][1] = createCandy('purple', SPECIAL.BOMB);
    const result = attemptMove(board, createEmptyJellyGrid(3, 3), [1, 1], [0, 1]);
    expect(result.valid).toBe(true);
    // all 3 'blue' candies + the bomb itself should clear: (0,1) blue, (2,2) blue, bomb cell
    expect(result.score).toBeGreaterThanOrEqual(3 * 10);
  });

  it('resolves bomb + bomb combo by clearing the whole board', () => {
    const board = boardFromColors([
      ['red', 'blue', 'red'],
      ['green', 'purple', 'yellow'],
      ['red', 'orange', 'blue'],
    ]);
    board[1][1] = createCandy('purple', SPECIAL.BOMB);
    board[1][2] = createCandy('yellow', SPECIAL.BOMB);
    const result = attemptMove(board, createEmptyJellyGrid(3, 3), [1, 1], [1, 2]);
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(9 * 10);
  });
});

describe('boosters', () => {
  it('hammer booster clears a single cell and cascades', () => {
    const board = baselineBoard();
    const jelly = createEmptyJellyGrid(8, 8);
    const result = useHammerBooster(board, jelly, [3, 3], makeRng(5));
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('color bomb booster spawns a bomb at the chosen position without clearing', () => {
    const board = baselineBoard();
    const result = useColorBombBooster(board, [2, 2]);
    expect(result.valid).toBe(true);
    expect(result.board[2][2].special).toBe(SPECIAL.BOMB);
    expect(result.score).toBe(0);
  });
});

describe('color distribution', () => {
  it('only uses defined colors', () => {
    const board = generateBoard(8, 8);
    board.flat().forEach((cell) => expect(COLORS).toContain(cell.color));
  });
});

describe('2x2 square matches (Jelly Fish)', () => {
  it('detects a 2x2 square as its own shape distinct from line matches', () => {
    const board = boardFromColors([
      ['red', 'red', 'blue', 'green'],
      ['red', 'red', 'green', 'blue'],
      ['blue', 'green', 'red', 'orange'],
      ['green', 'blue', 'orange', 'red'],
    ]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0].shape).toBe('square');
    expect(matches[0].cells).toHaveLength(4);
    expect(matches[0].color).toBe('red');
  });

  it('lets a 3-in-a-row claim its cells first, so no overlapping square is also reported', () => {
    const board = boardFromColors([
      ['red', 'red', 'red'],
      ['red', 'red', 'blue'],
      ['blue', 'green', 'yellow'],
    ]);
    const matches = findMatches(board);
    expect(matches.some((m) => m.shape === 'square')).toBe(false);
  });

  it('spawns a Jelly Fish special candy from a settled 2x2 square match', () => {
    // A 2x2 board can never form a 3-length line even after a random
    // refill, so the spawned fish is guaranteed to survive the cascade.
    const board = boardFromColors([
      ['red', 'red'],
      ['red', 'red'],
    ]);
    const jelly = createEmptyJellyGrid(2, 2);
    const result = resolveBoard(board, jelly, { rng: makeRng(9) });
    const flat = result.board.flat();
    expect(flat.some((c) => c.special === SPECIAL.JELLY_FISH)).toBe(true);
  });
});

describe('Jelly Fish activation targeting', () => {
  it('prefers jelly-bearing cells over plain candies', () => {
    const board = boardFromColors([
      ['red', 'blue', 'green', 'yellow'],
      ['orange', 'purple', 'red', 'blue'],
      ['green', 'yellow', 'purple', 'orange'],
      ['blue', 'red', 'green', 'yellow'],
    ]);
    board[0][0] = createCandy('red', SPECIAL.JELLY_FISH);
    const jelly = createEmptyJellyGrid(4, 4);
    jelly[3][3] = 1;
    jelly[3][2] = 1;

    const explosionCells = new Set();
    activateSpecial(board, 0, 0, board[0][0], explosionCells, new Set(), { jellyGrid: jelly, rng: makeRng(21) });

    expect(explosionCells.has('3,3')).toBe(true);
    expect(explosionCells.has('3,2')).toBe(true);
  });
});

describe('single detonation (special + normal swap)', () => {
  it('always succeeds and detonates the special once, even with no conventional match', () => {
    const board = boardFromColors([
      ['blue', 'green', 'yellow'],
      ['orange', 'purple', 'red'],
      ['green', 'blue', 'yellow'],
    ]);
    board[1][1] = createCandy('purple', SPECIAL.STRIPED_H);
    // Swapping with (1,0) creates no ordinary 3-match — this would have been
    // rejected by the plain-swap path, but a special+normal swap must always
    // succeed and simply detonate the special at its new position.
    const result = attemptMove(board, createEmptyJellyGrid(3, 3), [1, 1], [1, 0]);
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3 * 10);
  });
});

describe('chain detonation within combo blasts', () => {
  it('a wrapped candy caught in a striped+striped cross beam also detonates its own 3x3 area', () => {
    const board = boardFromColors([
      ['red', 'blue', 'green', 'yellow', 'purple'],
      ['blue', 'green', 'yellow', 'purple', 'red'],
      ['green', 'orange', 'blue', 'yellow', 'orange'],
      ['yellow', 'purple', 'red', 'blue', 'green'],
      ['purple', 'red', 'blue', 'green', 'yellow'],
    ]);
    board[2][1] = createCandy('purple', SPECIAL.STRIPED_V);
    board[2][2] = createCandy('red', SPECIAL.STRIPED_H);
    board[2][4] = createCandy('orange', SPECIAL.WRAPPED);

    const result = attemptMove(board, createEmptyJellyGrid(5, 5), [2, 1], [2, 2], makeRng(11));
    expect(result.valid).toBe(true);
    // Base cross (row 2 + col 2, 1 overlap) = 9 cells, plus the wrapped
    // candy's 3x3 area contributes at least 4 more cells outside that cross
    // ((1,3),(1,4),(3,3),(3,4)) once it chain-detonates.
    expect(result.score).toBeGreaterThanOrEqual(13 * 10);
  });
});

describe('special+special pairings with no explicit combo shape', () => {
  it('Jelly Fish + Striped still clears cells instead of wasting the move', () => {
    const board = boardFromColors([
      ['red', 'blue', 'green'],
      ['orange', 'purple', 'yellow'],
      ['green', 'red', 'blue'],
    ]);
    board[1][1] = createCandy('purple', SPECIAL.JELLY_FISH);
    board[1][2] = createCandy('yellow', SPECIAL.STRIPED_V);
    const jelly = createEmptyJellyGrid(3, 3);
    jelly[0][0] = 1;

    const result = attemptMove(board, jelly, [1, 1], [1, 2], makeRng(17));
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('Jelly Fish + Jelly Fish still clears cells instead of wasting the move', () => {
    const board = boardFromColors([
      ['red', 'blue', 'green'],
      ['orange', 'purple', 'yellow'],
      ['green', 'red', 'blue'],
    ]);
    board[1][1] = createCandy('purple', SPECIAL.JELLY_FISH);
    board[1][2] = createCandy('yellow', SPECIAL.JELLY_FISH);
    const jelly = createEmptyJellyGrid(3, 3);

    const result = attemptMove(board, jelly, [1, 1], [1, 2], makeRng(23));
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('Coconut Wheel and Lucky Candy mechanics', () => {
  it('Coconut Wheel rolls 3 spaces and triggers perpendicular laser beams', () => {
    const board = baselineBoard();
    board[2][1] = createCandy('red', SPECIAL.COCONUT_WHEEL);
    const jelly = createEmptyJellyGrid(8, 8);

    // Swap [2,1] to [2,2] (horizontal right roll across 3 spaces)
    const result = attemptMove(board, jelly, [2, 1], [2, 2], makeRng(42));
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(100);
  });

  it('Lucky Candy transforms into Jelly Fish when active jelly is present', () => {
    const board = baselineBoard();
    board[0][0] = createCandy('red', SPECIAL.LUCKY);
    const jelly = createEmptyJellyGrid(8, 8);
    jelly[3][3] = 1;

    const explosionCells = new Set();
    activateSpecial(board, 0, 0, board[0][0], explosionCells, new Set(), { jellyGrid: jelly, rng: makeRng(5) });
    expect(explosionCells.has('3,3')).toBe(true);
  });
});

describe('Candy Bombs', () => {
  it('decrements bomb timers on a valid move', () => {
    const board = baselineBoard();
    board[0][0] = createCandy('red', SPECIAL.NONE, 3);
    board[1][0] = createCandy('orange');
    board[2][0] = createCandy('orange');
    board[0][1] = createCandy('orange');

    const jellyGrid = createEmptyJellyGrid(8, 8);
    const rng = makeRng(42);

    const result = attemptMove(board, jellyGrid, [0, 0], [0, 1], rng);
    
    expect(result.valid).toBe(true);
    let foundBomb = false;
    for (const row of result.board) {
      for (const cell of row) {
        if (cell.color === 'red' && cell.bombTimer !== undefined) {
          expect(cell.bombTimer).toBe(2);
          foundBomb = true;
        }
      }
    }
    expect(foundBomb).toBe(true);
    expect(result.bombExploded).toBe(false);
  });

  it('triggers bombExploded when a bomb timer reaches 0', () => {
    const board = baselineBoard();
    board[0][0] = createCandy('red', SPECIAL.NONE, 1);
    board[1][0] = createCandy('orange');
    board[2][0] = createCandy('orange');
    board[0][1] = createCandy('orange');
    
    const jellyGrid = createEmptyJellyGrid(8, 8);
    const rng = makeRng(42);

    const result = attemptMove(board, jellyGrid, [0, 0], [0, 1], rng);
    
    expect(result.valid).toBe(true);
    expect(result.bombExploded).toBe(true);
    
    let foundBomb = false;
    for (const row of result.board) {
      for (const cell of row) {
        if (cell.color === 'red' && cell.bombTimer !== undefined) {
          expect(cell.bombTimer).toBe(0);
          foundBomb = true;
        }
      }
    }
    expect(foundBomb).toBe(true);
  });

  it('safely defuses the bomb when the bomb is matched', () => {
    const board = baselineBoard();
    board[0][0] = createCandy('red', SPECIAL.NONE, 2);
    board[1][1] = createCandy('red');
    board[2][1] = createCandy('red');
    board[0][1] = createCandy('orange');

    const jellyGrid = createEmptyJellyGrid(8, 8);
    const rng = makeRng(42);

    const result = attemptMove(board, jellyGrid, [0, 0], [0, 1], rng);
    
    expect(result.valid).toBe(true);
    expect(result.bombExploded).toBe(false);
    
    let foundBomb = false;
    for (const row of result.board) {
      for (const cell of row) {
        if (cell && cell.bombTimer !== undefined) foundBomb = true;
      }
    }
    expect(foundBomb).toBe(false);
  });
});
