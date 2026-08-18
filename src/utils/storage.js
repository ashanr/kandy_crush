// Guarded localStorage access.
//
// `localStorage.setItem` is not safe to call bare: Safari in private browsing
// throws QuotaExceededError on every write, and any browser throws once the
// origin's quota is full. The read path was already wrapped in a try/catch
// while every write site was not, so a browser that refuses writes would throw
// out of a React effect on each progress change rather than simply not saving.
//
// Persistence is a nice-to-have here — nothing in the game depends on a write
// succeeding — so failures are swallowed and play continues.

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readString(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

export function writeString(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}
