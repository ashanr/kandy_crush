// Board geometry helpers.
//
// The particle canvas and shatter overlay are absolutely positioned inside
// `.game-grid`, so they share its *padding box* coordinate space. Getting this
// wrong is not hypothetical: the previous code used
// `getBoundingClientRect().width / COLS`, which counted the grid's border and
// padding as playable width and ignored the inter-cell gaps, leaving effects
// several pixels off their candies.

/**
 * Measures a CSS grid element into the coordinate space its absolutely
 * positioned children use. Returns null for a missing element.
 */
export function measureGrid(el, rows, cols) {
  if (!el) return null;
  const style = window.getComputedStyle(el);
  return computeMetrics({
    // clientWidth/Height are the padding box: content + padding, excluding the
    // border. That is exactly the containing block for absolute children.
    width: el.clientWidth,
    height: el.clientHeight,
    padLeft: parseFloat(style.paddingLeft) || 0,
    padTop: parseFloat(style.paddingTop) || 0,
    gapX: parseFloat(style.columnGap) || 0,
    gapY: parseFloat(style.rowGap) || 0,
    rows,
    cols,
  });
}

/** Pure geometry, split out from DOM measurement so it can be tested. */
export function computeMetrics({ width, height, padLeft, padTop, gapX, gapY, rows, cols }) {
  const cellW = (width - padLeft * 2 - gapX * (cols - 1)) / cols;
  const cellH = (height - padTop * 2 - gapY * (rows - 1)) / rows;
  return { width, height, padLeft, padTop, gapX, gapY, rows, cols, cellW, cellH };
}

/** Center of cell (row, col) in grid padding-box coordinates. */
export function cellCenter(metrics, row, col) {
  return {
    x: metrics.padLeft + col * (metrics.cellW + metrics.gapX) + metrics.cellW / 2,
    y: metrics.padTop + row * (metrics.cellH + metrics.gapY) + metrics.cellH / 2,
  };
}
