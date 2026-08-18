import { useEffect, useState } from 'react';
import { measureGrid } from '../utils/gridGeometry.js';

/**
 * Keeps the board's measured geometry in sync with the responsive grid, and
 * derives the candy sprite size from it.
 *
 * Both numbers have caused real bugs when they drifted from the DOM: the
 * particle canvas was once pinned at 360x360 while the grid stretched to 480,
 * so effects on the right and bottom of the board were drawn outside the buffer
 * and silently discarded; and the candy size was a hardcoded 42px while the
 * cell scales with board width, so the proportion changed with screen size.
 * Deriving both from one measurement is what keeps them honest.
 */
export function useBoardGeometry(gridRef, rows, cols) {
  const [gridMetrics, setGridMetrics] = useState(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;
    const sync = () => setGridMetrics(measureGrid(el, rows, cols));
    sync();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', sync);
      return () => window.removeEventListener('resize', sync);
    }
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [gridRef, rows, cols]);

  const candySize = gridMetrics
    ? Math.max(24, Math.round(Math.min(gridMetrics.cellW, gridMetrics.cellH) * 0.96))
    : 42;

  return { gridMetrics, candySize };
}
