import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  generateBoard,
  createEmptyJellyGrid,
  ensurePlayable,
  attemptMove,
  useHammerBooster,
  useShuffleBooster,
  useColorBombBooster,
  SPECIAL,
} from '../game/board.js';
import {
  playPop,
  playSwap,
  playSpecialCreate,
  playCombo,
  playInvalid,
  playLaser,
  playHeavyExplosion,
  playElectricZap,
  playMegaBlast,
  unlockAudio,
  playAnnouncerVoice,
  playSinhalaWin,
  playSinhalaLose,
} from '../utils/sound.js';
import { getAnnouncement } from '../utils/announcer.js';
import { haptics } from '../utils/haptics.js';
import AnnouncerOverlay from './AnnouncerOverlay.jsx';
import BoosterBar from './BoosterBar.jsx';

import CandySprite from './CandySprite.jsx';
import CandyShatter from './CandyShatter.jsx';
import ParticleCanvas from './ParticleCanvas.jsx';
import DynamicBackground from './DynamicBackground.jsx';
import { globalParticleEngine } from '../utils/particles.js';
import SugarCrush from './SugarCrush.jsx';

const ROWS = 8;
const COLS = 8;

const DEFAULT_BOOSTERS = { hammer: 1, shuffle: 1, bomb: 1 };

function pickComboSound(specialTypes) {
  if (specialTypes.length === 0) return null;
  if (specialTypes.length === 2) return playMegaBlast;
  const [type] = specialTypes;
  if (type === SPECIAL.BOMB) return playElectricZap;
  if (type === SPECIAL.WRAPPED) return playHeavyExplosion;
  if (type === SPECIAL.STRIPED_H || type === SPECIAL.STRIPED_V) return playLaser;
  if (type === SPECIAL.JELLY_FISH) return playElectricZap;
  return null;
}

export default function GameBoard({ level, onWin, onLose, onExit }) {
  const [board, setBoard] = useState(null);
  const [jellyGrid, setJellyGrid] = useState(() => createEmptyJellyGrid(ROWS, COLS));
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(level.moveLimit);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [boosterCounts, setBoosterCounts] = useState(DEFAULT_BOOSTERS);
  const [activeBooster, setActiveBooster] = useState(null);
  const gridRef = useRef(null);
  const dragStart = useRef(null);
  const outcomeSignaled = useRef(false);
  const prevBoardRef = useRef(null);
  const [shatters, setShatters] = useState([]);
  const [sugarCrushActive, setSugarCrushActive] = useState(false);
  const pendingWinScore = useRef(null);

  useEffect(() => {
    const initialJelly = level.jellyLayout ? level.jellyLayout.map((row) => row.slice()) : createEmptyJellyGrid(ROWS, COLS);
    setBoard(generateBoard(ROWS, COLS));
    setJellyGrid(initialJelly);
    setScore(0);
    setMovesLeft(level.moveLimit);
    setSelected(null);
    setBoosterCounts(DEFAULT_BOOSTERS);
    setActiveBooster(null);
    outcomeSignaled.current = false;
  }, [level]);

  const jellyRemaining = jellyGrid.flat().reduce((sum, v) => sum + v, 0);

  const handleSugarCrushDone = useCallback(() => {
    setSugarCrushActive(false);
    if (pendingWinScore.current !== null) {
      onWin?.(pendingWinScore.current);
      pendingWinScore.current = null;
    }
  }, [onWin]);

  const checkOutcome = useCallback(
    (nextScore, nextMoves, nextJelly) => {
      if (outcomeSignaled.current) return;
      const jellyLeft = nextJelly.flat().reduce((sum, v) => sum + v, 0);
      if (level.objective.type === 'score' && nextScore >= level.objective.target) {
        outcomeSignaled.current = true;
        playSinhalaWin();
        pendingWinScore.current = nextScore;
        setSugarCrushActive(true);
        return;
      }
      if (level.objective.type === 'jelly' && jellyLeft === 0) {
        outcomeSignaled.current = true;
        playSinhalaWin();
        pendingWinScore.current = nextScore;
        setSugarCrushActive(true);
        return;
      }
      if (nextMoves <= 0) {
        outcomeSignaled.current = true;
        playSinhalaLose();
        onLose?.(nextScore);
      }
    },
    [level, onWin, onLose],
  );

  const triggerFX = useCallback((posA, posB, result, specialTypes) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;

    const getCenter = ([r, c]) => ({
      x: (c + 0.5) * cellW,
      y: (r + 0.5) * cellH,
    });

    const posACenter = getCenter(posA);

    // Particle Shards
    globalParticleEngine.spawnMatchBurst(posACenter.x, posACenter.y, '#ffd93d', 18);

    // Special FX
    if (specialTypes.includes(SPECIAL.STRIPED_H)) {
      globalParticleEngine.spawnLaserBeam(posACenter.x, posACenter.y, 'horizontal', rect.width, rect.height, '#38bdf8');
    }
    if (specialTypes.includes(SPECIAL.STRIPED_V)) {
      globalParticleEngine.spawnLaserBeam(posACenter.x, posACenter.y, 'vertical', rect.width, rect.height, '#38bdf8');
    }
    if (specialTypes.includes(SPECIAL.WRAPPED)) {
      globalParticleEngine.spawnWrappedShockwave(posACenter.x, posACenter.y, 140, '#c084fc');
    }
    if (specialTypes.includes(SPECIAL.BOMB)) {
      const targets = [
        getCenter([Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)]),
        getCenter([Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)]),
        getCenter([Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)]),
      ];
      globalParticleEngine.spawnLightningArc(posACenter.x, posACenter.y, targets, '#ffd93d');
    }
  }, []);

  const performMove = useCallback(
    (posA, posB) => {
      if (busy || !board) return;
      unlockAudio();
      const cellA = board[posA[0]][posA[1]];
      const cellB = board[posB[0]][posB[1]];
      const specialTypes = [cellA.special, cellB.special].filter((s) => s !== SPECIAL.NONE);

      const result = attemptMove(board, jellyGrid, posA, posB);
      if (!result.valid) {
        playInvalid();
        haptics.invalid();
        setSelected(null);
        return;
      }
      setBusy(true);
      playSwap();
      haptics.swap();

      triggerFX(posA, posB, result, specialTypes);

      // --- Candy Shatter: diff old board vs new board ---
      if (board) {
        const oldIds = new Map();
        board.forEach((row, r) => row.forEach((cell, c) => {
          oldIds.set(cell.id, { r, c, color: cell.color });
        }));
        const newIds = new Set();
        result.board.forEach((row) => row.forEach((cell) => {
          newIds.add(cell.id);
        }));
        const destroyed = [];
        for (const [id, info] of oldIds) {
          if (!newIds.has(id)) {
            destroyed.push({ id: `shatter-${id}-${Date.now()}`, color: info.color, col: info.c, row: info.r });
          }
        }
        if (destroyed.length > 0) {
          setShatters((prev) => [...prev, ...destroyed]);
        }
      }

      // Banner text and the spoken line come from one shared mapping so they
      // can never disagree (see src/utils/announcer.js).
      const { banner, voiceKey } = getAnnouncement({
        specialCount: specialTypes.length,
        cascadeCount: result.cascadeCount,
      });
      setMessage(banner);
      playAnnouncerVoice(voiceKey);

      const comboSound = pickComboSound(specialTypes);
      if (comboSound) {
        window.setTimeout(() => {
          comboSound();
          haptics.combo();
        }, 120);
      } else if (result.cascadeCount > 1) {
        window.setTimeout(() => {
          playCombo(result.cascadeCount);
          haptics.combo();
        }, 150);
      } else {
        playPop();
        haptics.match();
      }

      const { board: playableBoard, reshuffled } = ensurePlayable(result.board);
      const nextScore = score + result.score;
      const nextMoves = movesLeft - 1;

      setBoard(playableBoard);
      setJellyGrid(result.jellyGrid);
      setScore(nextScore);
      setMovesLeft(nextMoves);
      setSelected(null);
      if (reshuffled) setMessage('මාරු වෙනවා...');

      window.setTimeout(() => {
        setMessage(null);
        setBusy(false);
        checkOutcome(nextScore, nextMoves, result.jellyGrid);
      }, 550);
    },
    [board, jellyGrid, score, movesLeft, busy, checkOutcome, triggerFX],
  );

  const applyBooster = useCallback(
    (type, pos) => {
      if (boosterCounts[type] <= 0 || busy) return;
      unlockAudio();
      setBusy(true);
      setActiveBooster(null);

      let result;
      if (type === 'hammer') result = useHammerBooster(board, jellyGrid, pos);
      else if (type === 'bomb') result = useColorBombBooster(board, pos);
      else result = useShuffleBooster(board, jellyGrid);

      setBoosterCounts((prev) => ({ ...prev, [type]: prev[type] - 1 }));
      playSpecialCreate();
      haptics.special();

      const nextScore = score + (result.score || 0);
      const nextJelly = result.jellyGrid || jellyGrid;
      setBoard(result.board);
      if (result.jellyGrid) setJellyGrid(result.jellyGrid);
      setScore(nextScore);

      window.setTimeout(() => {
        setBusy(false);
        checkOutcome(nextScore, movesLeft, nextJelly);
      }, 400);
    },
    [board, jellyGrid, boosterCounts, busy, score, movesLeft, checkOutcome],
  );

  const handleCellTap = (r, c) => {
    if (busy) return;
    unlockAudio();
    if (activeBooster) {
      applyBooster(activeBooster, [r, c]);
      return;
    }
    if (!selected) {
      setSelected([r, c]);
      return;
    }
    const [sr, sc] = selected;
    if (sr === r && sc === c) {
      setSelected(null);
      return;
    }
    const isAdjacent = Math.abs(sr - r) + Math.abs(sc - c) === 1;
    if (isAdjacent) {
      performMove([sr, sc], [r, c]);
    } else {
      setSelected([r, c]);
    }
  };

  const handlePointerDown = (r, c, e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { r, c, x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const threshold = 20;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      handleCellTap(start.r, start.c);
      return;
    }
    if (activeBooster) {
      handleCellTap(start.r, start.c);
      return;
    }
    let target;
    if (Math.abs(dx) > Math.abs(dy)) {
      target = [start.r, start.c + (dx > 0 ? 1 : -1)];
    } else {
      target = [start.r + (dy > 0 ? 1 : -1), start.c];
    }
    if (target[0] < 0 || target[0] >= ROWS || target[1] < 0 || target[1] >= COLS) return;
    performMove([start.r, start.c], target);
  };

  if (!board) return null;

  return (
    <div className="game-board-screen">
      <DynamicBackground levelId={level.id} />
      <div className="game-hud">
        <button type="button" className="hud-btn" onClick={onExit}>Exit</button>
        <div className="hud-stat">
          Score: {score}
          {level.objective.type === 'score' ? ` / ${level.objective.target}` : ''}
        </div>
        <div className="hud-stat">Moves: {movesLeft}</div>
        {level.objective.type === 'jelly' && <div className="hud-stat">Jelly: {jellyRemaining}</div>}
      </div>

      <div
        ref={gridRef}
        className="game-grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, position: 'relative' }}
      >
        <ParticleCanvas width={360} height={360} />
        <AnimatePresence mode="popLayout">
          {board.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={cell.id}
                className={`candy-cell ${selected && selected[0] === r && selected[1] === c ? 'selected' : ''} ${jellyGrid[r][c] > 0 ? 'has-jelly' : ''}`}
                onPointerDown={(e) => handlePointerDown(r, c, e)}
                onPointerUp={handlePointerUp}
              >
                {jellyGrid[r][c] > 0 && <div className={`jelly-overlay layer-${jellyGrid[r][c]}`} />}
                  <motion.div
                    layout
                    layoutId={`candy-${cell.id}`}
                    className="candy-wrapper"
                    initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                    animate={{ scale: [1.2, 0.85, 1.05, 1], opacity: 1, rotate: 0 }}
                    exit={{ scale: 1.6, opacity: 0, filter: 'brightness(2) blur(2px)' }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9, rotate: -5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <CandySprite color={cell.color} special={cell.special} size={42} />
                  </motion.div>
              </div>
            )),
          )}
        </AnimatePresence>

        {/* Shatter Effects Layer */}
        {shatters.map((s) => (
          <CandyShatter
            key={s.id}
            color={s.color}
            gridX={s.col}
            gridY={s.row}
            cellW={gridRef.current ? gridRef.current.getBoundingClientRect().width / COLS : 45}
            cellH={gridRef.current ? gridRef.current.getBoundingClientRect().height / ROWS : 45}
            onComplete={() => setShatters((prev) => prev.filter((x) => x.id !== s.id))}
          />
        ))}
      </div>

      <BoosterBar
        counts={boosterCounts}
        active={activeBooster}
        onSelect={(key) => setActiveBooster((prev) => (prev === key ? null : key))}
      />

      <AnnouncerOverlay message={message} />

      {/* Sugar Crush Win Celebration */}
      {sugarCrushActive && (
        <SugarCrush onComplete={handleSugarCrushDone} />
      )}
    </div>
  );
}

