import { useEffect, useRef, useState } from 'react';

/**
 * Tweens a displayed number toward its real value.
 *
 * The HUD score used to snap: 1,240 -> 1,510 in a single frame, which reads as
 * a number changing rather than as points being scored. It matters most during
 * the Sugar Crush cascade, where the whole point is watching the leftover-move
 * bonus stack up — a snap there throws away the payoff of the sequence.
 *
 * Frame-rate independent (drives off elapsed time, not tick count) so a phone
 * dropping to 30fps still takes the same wall-clock duration to arrive.
 *
 * @param {number} value    the true value
 * @param {number} duration ms to travel a full jump
 */
export default function useCountUp(value, duration = 450) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    // Respect a reduced-motion preference, and never animate a reset to 0
    // (level restart) — that should read as a cleared counter, not a countdown.
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || value === 0) {
      fromRef.current = value;
      setDisplay(value);
      return undefined;
    }

    const from = fromRef.current;
    if (from === value) return undefined;

    startRef.current = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      // easeOutCubic: fast off the mark, settling into the final digits.
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (value - from) * eased);
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  // Keep the origin in sync when the tween is skipped entirely.
  useEffect(() => {
    if (display === value) fromRef.current = value;
  }, [display, value]);

  return display;
}
