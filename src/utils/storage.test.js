import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readJSON, writeJSON, readString, writeString } from './storage.js';

// The whole point of this module is surviving a localStorage that throws —
// Safari private browsing rejects every write, and a browser with storage
// blocked throws on read too. A regression here is a crash on a real device
// configuration that never shows up in normal testing.

const store = new Map();
const workingStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
};
const throwingStorage = {
  getItem: () => { throw new DOMException('denied', 'SecurityError'); },
  setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
};

function useStorage(impl) {
  vi.stubGlobal('localStorage', impl);
}

beforeEach(() => store.clear());
afterEach(() => vi.unstubAllGlobals());

describe('storage (working localStorage)', () => {
  beforeEach(() => useStorage(workingStorage));

  it('round-trips JSON', () => {
    expect(writeJSON('k', { a: 1 })).toBe(true);
    expect(readJSON('k', null)).toEqual({ a: 1 });
  });

  it('round-trips strings', () => {
    expect(writeString('s', 'male')).toBe(true);
    expect(readString('s')).toBe('male');
  });

  it('returns the fallback for a missing key', () => {
    expect(readJSON('nope', { d: true })).toEqual({ d: true });
    expect(readString('nope', 'baila')).toBe('baila');
  });

  it('returns the fallback for malformed JSON rather than throwing', () => {
    workingStorage.setItem('bad', '{not json');
    expect(readJSON('bad', {})).toEqual({});
  });
});

describe('storage (localStorage that throws)', () => {
  beforeEach(() => useStorage(throwingStorage));

  it('reads fall back instead of throwing', () => {
    expect(() => readJSON('k', { safe: true })).not.toThrow();
    expect(readJSON('k', { safe: true })).toEqual({ safe: true });
    expect(readString('k', 'male')).toBe('male');
  });

  it('writes report failure instead of throwing', () => {
    expect(() => writeJSON('k', { a: 1 })).not.toThrow();
    expect(writeJSON('k', { a: 1 })).toBe(false);
    expect(writeString('k', 'x')).toBe(false);
  });
});
