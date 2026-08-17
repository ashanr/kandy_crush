import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  generateBoard,
  createEmptyJellyGrid,
  ensurePlayable,
  attemptMove,
  useHammerBooster,
  useShuffleBooster,
  useColorBombBooster,
} from '../game/board.js';
import { playPop, playSwap, playSpecialCreate, playCombo, playInvalid, unlockAudio } from '../utils/sound.js';
import { haptics } from '../utils/haptics.js';
import AnnouncerOverlay from './AnnouncerOverlay.jsx';
import BoosterBar from './BoosterBar.jsx';

const ROWS = 8;
const COLS = 8;

// Each color also gets a distinct shape so the game stays playable for
// colorblind players (shape + color redundancy, not color alone).
const SHAPE_BY_COLOR = {
  red: 'circle',
  orange: 'square',
  yellow: 'triangle',
  green: 'diamond',
  blue: 'hexagon',
  purple: 'star',
};

const COLOR_HEX = {
  red: '#ff4d6d',
  orange: '#ff9f43',
  yellow: '#ffd93d',
  green: '#4ade80',
  blue: '#38bdf8',
  purple: '#c084fc',
};

const DEFAULT_BOOSTERS = { hammer: 1, shuffle: 1, bomb: 1 };

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
  const dragStart = useRef(null);
  const outcomeSignaled = useRef(false);

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

  const checkOutcome = useCallback(
    (nextScore, nextMoves, nextJelly) => {
      if (outcomeSignaled.current) return;
      const jellyLeft = nextJelly.flat().reduce((sum, v) => sum + v, 0);
      if (level.objective.type === 'score' && nextScore >= level.objective.target) {
        outcomeSignaled.current = true;
        onWin?.(nextScore);
        return;
      }
      if (level.objective.type === 'jelly' && jellyLeft === 0) {
        outcomeSignaled.current = true;
        onWin?.(nextScore);
        return;
      }
      if (nextMoves <= 0) {
        outcomeSignaled.current = true;
        onLose?.(nextScore);
      }
    },
    [level, onWin, onLose],
  );

  const performMove = useCallback(
    (posA, posB) => {
      if (busy || !board) return;
      unlockAudio();
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

      if (result.cascadeCount > 1) {
        window.setTimeout(() => {
          playCombo(result.cascadeCount);
          haptics.combo();
        }, 150);
        setMessage(result.cascadeCount >= 3 ? 'Sugar Crush!' : 'Tasty!');
      } else {
        playPop();
        haptics.match();
        setMessage('Sweet!');
      }

      const { board: playableBoard, reshuffled } = ensurePlayable(result.board);
      const nextScore = score + result.score;
      const nextMoves = movesLeft - 1;

      setBoard(playableBoard);
      setJellyGrid(result.jellyGrid);
      setScore(nextScore);
      setMovesLeft(nextMoves);
      setSelected(null);
      if (reshuffled) setMessage('Shuffling...');

      window.setTimeout(() => {
        setMessage(null);
        setBusy(false);
        checkOutcome(nextScore, nextMoves, result.jellyGrid);
      }, 550);
    },
    [board, jellyGrid, score, movesLeft, busy, checkOutcome],
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
      <div className="game-hud">
        <button type="button" className="hud-btn" onClick={onExit}>Exit</button>
        <div className="hud-stat">
          Score: {score}
          {level.objective.type === 'score' ? ` / ${level.objective.target}` : ''}
        </div>
        <div className="hud-stat">Moves: {movesLeft}</div>
        {level.objective.type === 'jelly' && <div className="hud-stat">Jelly: {jellyRemaining}</div>}
      </div>

      <div className="game-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
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
                className={`candy shape-${SHAPE_BY_COLOR[cell.color]} special-${cell.special}`}
                style={{ backgroundColor: COLOR_HEX[cell.color] }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              />
            </div>
          )),
        )}
      </div>

      <BoosterBar
        counts={boosterCounts}
        active={activeBooster}
        onSelect={(key) => setActiveBooster((prev) => (prev === key ? null : key))}
      />

      <AnnouncerOverlay message={message} />
    </div>
  );
}
