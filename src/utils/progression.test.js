import { describe, it, expect } from 'vitest';
import { computeStars, readEntry, isCompleted, isUnlocked, recordWin } from './progression.js';
import { LEVELS } from '../data/levels.js';

const jellyLevel = LEVELS.find((l) => l.objective.type === 'jelly');
const scoreLevel = LEVELS.find((l) => l.objective.type === 'score');

describe('computeStars', () => {
  it('awards tiers by threshold', () => {
    const level = { starThresholds: [1000, 2000, 3000] };
    expect(computeStars(level, 999)).toBe(0);
    expect(computeStars(level, 1000)).toBe(1);
    expect(computeStars(level, 2500)).toBe(2);
    expect(computeStars(level, 9999)).toBe(3);
  });
});

describe('completion is independent of stars', () => {
  it('unlocks the next level after a zero-star clear', () => {
    // The original bug: clearing a jelly level with a low score awarded zero
    // stars, and unlocking keyed off stars, so the next level stayed locked
    // even though the player had won.
    const progress = recordWin({}, jellyLevel, 0);
    expect(computeStars(jellyLevel, 0)).toBe(0);
    expect(isCompleted(progress, jellyLevel.id)).toBe(true);

    const idx = LEVELS.indexOf(jellyLevel);
    if (idx + 1 < LEVELS.length) {
      expect(isUnlocked(progress, LEVELS, idx + 1)).toBe(true);
    }
  });

  it('still records stars when the score earns them', () => {
    const progress = recordWin({}, scoreLevel, scoreLevel.starThresholds[2]);
    expect(readEntry(progress, scoreLevel.id).stars).toBe(3);
    expect(isCompleted(progress, scoreLevel.id)).toBe(true);
  });
});

describe('isUnlocked', () => {
  it('always opens the first level', () => {
    expect(isUnlocked({}, LEVELS, 0)).toBe(true);
  });

  it('keeps later levels locked until the previous one is cleared', () => {
    expect(isUnlocked({}, LEVELS, 1)).toBe(false);
    const progress = recordWin({}, LEVELS[0], 0);
    expect(isUnlocked(progress, LEVELS, 1)).toBe(true);
  });

  it('does not unlock a level two steps ahead', () => {
    const progress = recordWin({}, LEVELS[0], 99999);
    expect(isUnlocked(progress, LEVELS, 2)).toBe(false);
  });
});

describe('legacy saves', () => {
  it('treats a pre-`completed` entry with stars as cleared', () => {
    const legacy = { [LEVELS[0].id]: { stars: 2, bestScore: 5000 } };
    expect(isCompleted(legacy, LEVELS[0].id)).toBe(true);
    expect(isUnlocked(legacy, LEVELS, 1)).toBe(true);
  });

  it('treats a pre-`completed` entry with no stars as not cleared', () => {
    // Can't distinguish "never played" from "won with 0 stars" in old saves;
    // not-cleared is the safe reading, and the player simply replays it.
    const legacy = { [LEVELS[0].id]: { stars: 0, bestScore: 300 } };
    expect(isCompleted(legacy, LEVELS[0].id)).toBe(false);
  });

  it('handles missing/empty progress without throwing', () => {
    expect(readEntry(undefined, 1)).toEqual({ completed: false, stars: 0, bestScore: 0 });
    expect(isCompleted({}, 99)).toBe(false);
  });
});

describe('recordWin', () => {
  it('keeps the best stars and score across replays', () => {
    let progress = recordWin({}, scoreLevel, scoreLevel.starThresholds[2]);
    progress = recordWin(progress, scoreLevel, 10);
    const entry = readEntry(progress, scoreLevel.id);
    expect(entry.stars).toBe(3);
    expect(entry.bestScore).toBe(scoreLevel.starThresholds[2]);
    expect(entry.completed).toBe(true);
  });
});

describe('level balance invariants', () => {
  it('orders star thresholds ascending', () => {
    LEVELS.forEach((l) => {
      const [s1, s2, s3] = l.starThresholds;
      expect(s1).toBeLessThan(s2);
      expect(s2).toBeLessThan(s3);
    });
  });

  it('makes a score-level win worth at least one star', () => {
    // Score levels pass at their target, so the target must not sit below the
    // 1-star line or a win could still read as zero stars.
    LEVELS.filter((l) => l.objective.type === 'score').forEach((l) => {
      expect(l.objective.target).toBeGreaterThanOrEqual(l.starThresholds[0]);
    });
  });

  it('gives every level a positive move limit and jelly levels a layout', () => {
    LEVELS.forEach((l) => {
      expect(l.moveLimit).toBeGreaterThan(0);
      if (l.objective.type === 'jelly') {
        expect(l.jellyLayout).toBeTruthy();
        expect(l.jellyLayout.flat().some((v) => v > 0)).toBe(true);
      }
    });
  });
});
