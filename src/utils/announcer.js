// Single source of truth for "what the game just did" -> what the player sees
// and hears.
//
// These used to be decided independently at each call site in GameBoard.jsx,
// which let them drift: the plain-cascade branch passed `cascadeCount` straight
// into the voice picker while choosing banner text from different thresholds,
// so a 3-step cascade displayed "එළකිරි!" while the audio said "පට්ට!".
// Returning both from one function makes that class of bug impossible.

export const BANNER = {
  niyamai: 'Sweet!',
  patta: 'Tasty!',
  elakiri: 'Delicious!',
  wedak_na: 'Unbelievable!',
};

/**
 * @param {object} event
 * @param {number} event.specialCount  specials involved in the swap (0, 1 or 2)
 * @param {number} event.cascadeCount  chain-reaction depth reported by the engine
 * @returns {{ banner: string, voiceKey: string }}
 */
export function getAnnouncement({ specialCount = 0, cascadeCount = 0 } = {}) {
  // Special-candy swaps outrank cascade depth — they're the more dramatic
  // event and the player's deliberate action.
  if (specialCount >= 2) return { banner: BANNER.wedak_na, voiceKey: 'wedak_na' };
  if (specialCount === 1) return { banner: BANNER.patta, voiceKey: 'patta' };

  if (cascadeCount >= 4) return { banner: BANNER.wedak_na, voiceKey: 'wedak_na' };
  if (cascadeCount === 3) return { banner: BANNER.elakiri, voiceKey: 'elakiri' };
  if (cascadeCount === 2) return { banner: BANNER.patta, voiceKey: 'patta' };

  return { banner: BANNER.niyamai, voiceKey: 'niyamai' };
}
