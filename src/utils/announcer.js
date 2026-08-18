// Single source of truth for "what the game just did" -> what the player sees
// and hears.
//
// These used to be decided independently at each call site in GameBoard.jsx,
// which let them drift: the plain-cascade branch passed `cascadeCount` straight
// into the voice picker while choosing banner text from different thresholds,
// so a 3-step cascade displayed one word while the audio said another.
// Returning both from one function makes that class of bug impossible.
//
// The keys are the mp3 basenames in public/voices/<gender>/ and must match
// VOICE_KEYS in src/utils/sound.js and PHRASES in scripts/generate_all_voices.py.

export const BANNER = {
  sweet: 'Sweet!',
  tasty: 'Tasty!',
  delicious: 'Delicious!',
  divine: 'Divine!',
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
  if (specialCount >= 2) return { banner: BANNER.divine, voiceKey: 'divine' };
  if (specialCount === 1) return { banner: BANNER.tasty, voiceKey: 'tasty' };

  if (cascadeCount >= 4) return { banner: BANNER.divine, voiceKey: 'divine' };
  if (cascadeCount === 3) return { banner: BANNER.delicious, voiceKey: 'delicious' };
  if (cascadeCount === 2) return { banner: BANNER.tasty, voiceKey: 'tasty' };

  return { banner: BANNER.sweet, voiceKey: 'sweet' };
}
