// Level progression rules.
//
// Completion and star count are deliberately SEPARATE concepts. They used to be
// conflated — unlocking the next level required `stars > 0`, but stars are
// awarded purely on score while jelly levels are won by clearing jelly. The two
// were unrelated, so clearing every jelly tile with a modest score awarded zero
// stars and silently left the next level locked. Simulation put that at 84% of
// Jelly Jungle wins and 100% of Chocolate Chasm wins, i.e. it was the normal
// case rather than an edge case.
//
// Clearing a level now always unlocks the next one; stars are purely a
// performance rating on top.

export function computeStars(level, score) {
  const [s1, s2, s3] = level.starThresholds;
  if (score >= s3) return 3;
  if (score >= s2) return 2;
  if (score >= s1) return 1;
  return 0;
}

/**
 * Reads a level's saved entry, tolerating saves written before `completed`
 * existed — for those, any star earned implies the level was cleared.
 */
export function readEntry(progress, levelId) {
  const entry = progress?.[levelId];
  if (!entry) return { completed: false, stars: 0, bestScore: 0 };
  const stars = entry.stars ?? 0;
  return {
    completed: entry.completed ?? stars > 0,
    stars,
    bestScore: entry.bestScore ?? 0,
  };
}

export function isCompleted(progress, levelId) {
  return readEntry(progress, levelId).completed;
}

/** The first level is always open; every other level needs the previous one cleared. */
export function isUnlocked(progress, levels, idx) {
  if (idx <= 0) return true;
  const previous = levels[idx - 1];
  return previous ? isCompleted(progress, previous.id) : false;
}

/**
 * Stars earned across every level, and the maximum obtainable.
 *
 * Per-level stars were shown on each map node but never summed, so the player
 * had no single number for how far along they are — the figure the saga map is
 * ultimately played for.
 */
export function totalStars(progress, levels) {
  return levels.reduce((sum, level) => sum + readEntry(progress, level.id).stars, 0);
}

export function maxStars(levels) {
  return levels.length * 3;
}

/** Merges a win into the saved progress, keeping the player's best result. */
export function recordWin(progress, level, score) {
  const existing = readEntry(progress, level.id);
  return {
    ...progress,
    [level.id]: {
      completed: true,
      stars: Math.max(existing.stars, computeStars(level, score)),
      bestScore: Math.max(existing.bestScore, score),
    },
  };
}
