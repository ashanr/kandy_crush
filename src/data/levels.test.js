import { describe, it, expect } from 'vitest';
import { LEVELS, getLevel } from './levels.js';
import { THEMES } from '../components/DynamicBackground.jsx';
import { computeStars } from '../utils/progression.js';

const ROWS = 8;
const COLS = 8;

describe('level definitions', () => {
  it('has sequential ids starting at 1', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
  });

  it('getLevel resolves every level', () => {
    for (const level of LEVELS) {
      expect(getLevel(level.id)).toBe(level);
    }
  });

  it.each(LEVELS.map((l) => [l.id, l]))('level %i is well-formed', (_id, level) => {
    expect(level.name).toBeTruthy();
    expect(level.moveLimit).toBeGreaterThan(0);
    expect(['score', 'jelly']).toContain(level.objective.type);
    expect(level.starThresholds).toHaveLength(3);
  });

  it.each(LEVELS.map((l) => [l.id, l]))('level %i star thresholds ascend', (_id, level) => {
    const [one, two, three] = level.starThresholds;
    expect(one).toBeLessThan(two);
    expect(two).toBeLessThan(three);
  });

  // Clearing an objective must always be worth at least one star. On score
  // levels the target IS the pass line, so a 1-star threshold above it would
  // let a player win and be shown zero stars.
  it.each(LEVELS.filter((l) => l.objective.type === 'score').map((l) => [l.id, l]))(
    'score level %i awards a star at its target',
    (_id, level) => {
      expect(level.starThresholds[0]).toBeLessThanOrEqual(level.objective.target);
      expect(computeStars(level, level.objective.target)).toBeGreaterThanOrEqual(1);
    },
  );

  it.each(LEVELS.filter((l) => l.objective.type === 'jelly').map((l) => [l.id, l]))(
    'jelly level %i carries a correctly-sized layout with jelly on it',
    (_id, level) => {
      expect(level.jellyLayout).toHaveLength(ROWS);
      for (const row of level.jellyLayout) expect(row).toHaveLength(COLS);
      expect(level.jellyLayout.flat().some((v) => v > 0)).toBe(true);
    },
  );

  it('score levels carry no jelly layout', () => {
    for (const level of LEVELS.filter((l) => l.objective.type === 'score')) {
      expect(level.jellyLayout).toBeNull();
    }
  });

  // A bomb fuse at least as long as the move limit can never detonate, which
  // silently turns the hazard into decoration.
  it.each(LEVELS.filter((l) => l.initialBombs).map((l) => [l.id, l]))(
    'bomb level %i has a fuse that can actually run out',
    (_id, level) => {
      expect(level.initialBombs).toBeGreaterThan(0);
      expect(level.bombTimer).toBeGreaterThan(0);
      expect(level.bombTimer).toBeLessThan(level.moveLimit);
    },
  );

  // Without a theme a level silently falls back to level 1's backdrop, and the
  // saga map's zone gradient stops tracking the levels it leads to.
  it.each(LEVELS.map((l) => [l.id, l]))('level %i has its own background theme', (id, level) => {
    const theme = THEMES[id];
    expect(theme, `THEMES[${id}] is missing`).toBeDefined();
    expect(theme.name).toBe(level.name);
    expect(theme.gradient).toHaveLength(3);
    expect(theme.floaters.length).toBeGreaterThan(0);
  });
});
