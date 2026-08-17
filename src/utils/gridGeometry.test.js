import { describe, it, expect } from 'vitest';
import { computeMetrics, cellCenter } from './gridGeometry.js';

// Mirrors the real .game-grid: 480px wide (border excluded via clientWidth),
// 8px padding, 2px gap, 8x8.
function realGrid(size = 478) {
  return computeMetrics({
    width: size,
    height: size,
    padLeft: 8,
    padTop: 8,
    gapX: 2,
    gapY: 2,
    rows: 8,
    cols: 8,
  });
}

describe('computeMetrics', () => {
  it('excludes padding and gaps from cell size', () => {
    const m = realGrid();
    // 478 - 16 padding - 14 gaps = 448 across 8 columns
    expect(m.cellW).toBeCloseTo(56, 5);
    expect(m.cellH).toBeCloseTo(56, 5);
  });

  it('is not fooled into the old naive width/cols result', () => {
    const m = realGrid();
    expect(m.cellW).not.toBeCloseTo(478 / 8, 1);
  });
});

describe('cellCenter', () => {
  it('places the first cell inside the padding, not at the origin', () => {
    const m = realGrid();
    const { x, y } = cellCenter(m, 0, 0);
    expect(x).toBeCloseTo(8 + 28, 5);
    expect(y).toBeCloseTo(8 + 28, 5);
  });

  it('keeps every cell center within the canvas bounds', () => {
    const m = realGrid();
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const { x, y } = cellCenter(m, r, c);
        expect(x).toBeGreaterThan(0);
        expect(y).toBeGreaterThan(0);
        expect(x).toBeLessThan(m.width);
        expect(y).toBeLessThan(m.height);
      }
    }
  });

  it('keeps each center inside its own cell box', () => {
    const m = realGrid();
    for (let c = 0; c < 8; c += 1) {
      const left = m.padLeft + c * (m.cellW + m.gapX);
      const { x } = cellCenter(m, 0, c);
      expect(x).toBeGreaterThanOrEqual(left);
      expect(x).toBeLessThanOrEqual(left + m.cellW);
    }
  });

  it('stays symmetric — the board is centered within its padding', () => {
    const m = realGrid();
    const first = cellCenter(m, 0, 0).x;
    const last = cellCenter(m, 0, 7).x;
    expect(first).toBeCloseTo(m.width - last, 5);
  });

  it('scales with the grid instead of assuming a fixed 360px board', () => {
    // The regression this guards: a small phone and a full-width board must
    // both keep their rightmost column on-canvas.
    [320, 400, 478].forEach((size) => {
      const m = realGrid(size);
      const { x } = cellCenter(m, 7, 7);
      expect(x).toBeLessThan(m.width);
      expect(x).toBeGreaterThan(m.width * 0.85);
    });
  });
});
