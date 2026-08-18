import { useCallback, useEffect, useRef } from 'react';

/**
 * Deferred callbacks that are cancelled when the component unmounts.
 *
 * A move schedules several of these (sound, banner clear, busy release,
 * outcome check, cascade steps). Left bare, exiting to the map mid-cascade
 * leaves them all pending and firing `setState` against a dead component.
 *
 * Returns `later(fn, ms)`, a drop-in replacement for `window.setTimeout`.
 */
export function useTimers() {
  const timers = useRef([]);

  const later = useCallback((fn, ms) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
    return id;
  }, []);

  const clearAll = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => clearAll, [clearAll]);

  return { later, clearAll };
}
