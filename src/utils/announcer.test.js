import { describe, it, expect } from 'vitest';
import { getAnnouncement, BANNER } from './announcer.js';

// The whole point of this module is that the banner and the voice line are
// chosen together, so the central invariant is that they always agree.
const VOICE_FOR_BANNER = {
  [BANNER.niyamai]: 'niyamai',
  [BANNER.patta]: 'patta',
  [BANNER.elakiri]: 'elakiri',
  [BANNER.wedak_na]: 'wedak_na',
};

describe('getAnnouncement', () => {
  it('returns the plain-match line for an ordinary single match', () => {
    expect(getAnnouncement({ specialCount: 0, cascadeCount: 1 })).toEqual({
      banner: BANNER.niyamai,
      voiceKey: 'niyamai',
    });
  });

  it('escalates with plain cascade depth', () => {
    expect(getAnnouncement({ cascadeCount: 2 }).voiceKey).toBe('patta');
    expect(getAnnouncement({ cascadeCount: 3 }).voiceKey).toBe('elakiri');
    expect(getAnnouncement({ cascadeCount: 4 }).voiceKey).toBe('wedak_na');
    expect(getAnnouncement({ cascadeCount: 9 }).voiceKey).toBe('wedak_na');
  });

  it('treats a one-special swap as patta and a two-special combo as the big line', () => {
    expect(getAnnouncement({ specialCount: 1 }).voiceKey).toBe('patta');
    expect(getAnnouncement({ specialCount: 2 }).voiceKey).toBe('wedak_na');
  });

  it('lets a special-candy swap outrank cascade depth', () => {
    // A single special that happens to trigger a long cascade should still be
    // announced as a special swap, not silently upgraded by the chain length.
    expect(getAnnouncement({ specialCount: 1, cascadeCount: 5 }).voiceKey).toBe('patta');
  });

  it('never returns a banner/voice pair that disagree, across the whole input space', () => {
    for (let specialCount = 0; specialCount <= 2; specialCount += 1) {
      for (let cascadeCount = 0; cascadeCount <= 8; cascadeCount += 1) {
        const { banner, voiceKey } = getAnnouncement({ specialCount, cascadeCount });
        expect(VOICE_FOR_BANNER[banner]).toBe(voiceKey);
      }
    }
  });

  it('is safe to call with no arguments', () => {
    expect(getAnnouncement()).toEqual({ banner: BANNER.niyamai, voiceKey: 'niyamai' });
  });
});
