import { useCallback, useState } from 'react';
import { cellCenter } from '../utils/gridGeometry.js';
import { globalParticleEngine } from '../utils/particles.js';
import { SPECIAL } from '../game/board.js';
import { getComboTier } from '../components/ComboLabel.jsx';

/**
 * Everything the board draws *about* a move, as opposed to the move itself:
 * particle bursts, shatter shards, floating scores, combo labels, camera shake
 * and the background flash.
 *
 * This was the single largest cluster of state and callbacks inside GameBoard,
 * and none of it feeds back into the rules — the engine neither reads nor cares
 * about any of it. Splitting it out is what lets the move handler read as game
 * logic instead of an animation script.
 */
export function useBoardFX({ gridMetrics, rows, cols, later }) {
  const [shatters, setShatters] = useState([]);
  const [popups, setPopups] = useState([]);
  const [comboLabels, setComboLabels] = useState([]);
  const [boardShaking, setBoardShaking] = useState(false);
  const [comboFlash, setComboFlash] = useState(false);
  const [scoreBump, setScoreBump] = useState(false);

  /** Particle effects keyed to which specials took part in the move. */
  const spawnMoveParticles = useCallback((pos, specialTypes) => {
    if (!gridMetrics) return;
    const { x, y } = cellCenter(gridMetrics, pos[0], pos[1]);

    globalParticleEngine.spawnMatchBurst(x, y, '#ffd93d', 18);

    if (specialTypes.includes(SPECIAL.STRIPED_H)) {
      globalParticleEngine.spawnLaserBeam(x, y, 'horizontal', gridMetrics.width, gridMetrics.height, '#38bdf8');
    }
    if (specialTypes.includes(SPECIAL.STRIPED_V)) {
      globalParticleEngine.spawnLaserBeam(x, y, 'vertical', gridMetrics.width, gridMetrics.height, '#38bdf8');
    }
    if (specialTypes.includes(SPECIAL.WRAPPED)) {
      globalParticleEngine.spawnWrappedShockwave(x, y, 140, '#c084fc');
    }
    if (specialTypes.includes(SPECIAL.BOMB)) {
      globalParticleEngine.spawnVortex(x, y, 0.35);
      const targets = [0, 1, 2].map(() => cellCenter(
        gridMetrics,
        Math.floor(Math.random() * rows),
        Math.floor(Math.random() * cols),
      ));
      globalParticleEngine.spawnLightningArc(x, y, targets, '#ffd93d');
    }
  }, [gridMetrics, rows, cols]);

  /** Splatter on every jelly tile that lost a layer. */
  const spawnJellySplatter = useCallback((oldJelly, newJelly) => {
    if (!gridMetrics) return;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (oldJelly[r][c] > newJelly[r][c]) {
          const { x, y } = cellCenter(gridMetrics, r, c);
          globalParticleEngine.spawnJellySplatter(x, y);
        }
      }
    }
  }, [gridMetrics, rows, cols]);

  /**
   * Per-candy shatter, found by diffing the old and new boards on candy `id`.
   * Identity is the only reliable signal here — positions shift under gravity,
   * so comparing by coordinate would report the wrong cells as destroyed.
   */
  const spawnShatters = useCallback((oldBoard, newBoard) => {
    if (!oldBoard) return;
    const survivors = new Set();
    newBoard.forEach((row) => row.forEach((cell) => cell && survivors.add(cell.id)));

    const destroyed = [];
    oldBoard.forEach((row, r) => row.forEach((cell, c) => {
      if (cell && !survivors.has(cell.id)) {
        destroyed.push({ id: `shatter-${cell.id}-${Date.now()}`, color: cell.color, row: r, col: c });
      }
    }));
    if (destroyed.length > 0) setShatters((prev) => [...prev, ...destroyed]);
  }, []);

  const spawnScorePopup = useCallback((pos, points) => {
    if (!gridMetrics || points <= 0) return;
    const { x, y } = cellCenter(gridMetrics, pos[0], pos[1]);
    setPopups((prev) => [
      ...prev,
      { id: `pop-${Date.now()}-${Math.random()}`, x, y, points, big: points >= 500 },
    ]);
  }, [gridMetrics]);

  const spawnComboLabel = useCallback((pos, cascadeCount, specialCount) => {
    const tier = getComboTier(cascadeCount, specialCount);
    if (!tier || !gridMetrics) return;
    const { x, y } = cellCenter(gridMetrics, pos[0], pos[1]);
    setComboLabels((prev) => [
      ...prev,
      { id: `combo-${Date.now()}-${Math.random()}`, x, y: y - 20, tier },
    ]);
  }, [gridMetrics]);

  /** Screen-level reactions: shake for heavy hits, flash for anything notable. */
  const reactToMove = useCallback((cascadeCount, specialTypes) => {
    const heavy = specialTypes.length >= 2
      || cascadeCount >= 3
      || specialTypes.includes(SPECIAL.WRAPPED)
      || specialTypes.includes(SPECIAL.BOMB);
    if (heavy) {
      setBoardShaking(true);
      later(() => setBoardShaking(false), 350);
    }
    if (cascadeCount >= 2 || specialTypes.length >= 1) {
      setComboFlash(true);
      later(() => setComboFlash(false), 400);
    }
  }, [later]);

  const bumpScore = useCallback((ms = 300) => {
    setScoreBump(true);
    later(() => setScoreBump(false), ms);
  }, [later]);

  const dismissShatter = useCallback((id) => {
    setShatters((prev) => prev.filter((item) => item.id !== id));
  }, []);
  const dismissPopup = useCallback((id) => {
    setPopups((prev) => prev.filter((item) => item.id !== id));
  }, []);
  const dismissComboLabel = useCallback((id) => {
    setComboLabels((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    shatters,
    popups,
    comboLabels,
    boardShaking,
    comboFlash,
    scoreBump,
    spawnMoveParticles,
    spawnJellySplatter,
    spawnShatters,
    spawnScorePopup,
    spawnComboLabel,
    reactToMove,
    bumpScore,
    dismissShatter,
    dismissPopup,
    dismissComboLabel,
  };
}
