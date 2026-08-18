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
  findAnyValidMove,
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
import { measureGrid, cellCenter } from '../utils/gridGeometry.js';
import { haptics } from '../utils/haptics.js';
import AnnouncerOverlay from './AnnouncerOverlay.jsx';
import BoosterBar from './BoosterBar.jsx';

import CandySprite from './CandySprite.jsx';
import CandyShatter from './CandyShatter.jsx';
import ParticleCanvas from './ParticleCanvas.jsx';
import DynamicBackground from './DynamicBackground.jsx';
import { globalParticleEngine } from '../utils/particles.js';
import SugarCrush from './SugarCrush.jsx';
import StarProgress from './StarProgress.jsx';
import ScorePopup from './ScorePopup.jsx';

const ROWS = 8;
const COLS = 8;

const DEFAULT_BOOSTERS = { hammer: 1, shuffle: 1, bomb: 1 };

// Idle time before the board suggests a move.
const IDLE_HINT_MS = 5000;
// Moves remaining at which the counter starts warning.
const LOW_MOVES = 5;
// Points awarded per unspent move when the objective is cleared early.
const SUGAR_CRUSH_BONUS_PER_MOVE = 300;

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
  const [shatters, setShatters] = useState([]);
  const [popups, setPopups] = useState([]);
  const [gridMetrics, setGridMetrics] = useState(null);

  // Keep board geometry in sync with the responsive grid. Without this the
  // particle canvas was pinned at 360x360 while the grid stretches to 480px,
  // so effects on the right/bottom of the board were drawn outside the buffer
  // and silently discarded on essentially every screen size.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;
    const sync = () => setGridMetrics(measureGrid(el, ROWS, COLS));
    sync();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', sync);
      return () => window.removeEventListener('resize', sync);
    }
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [sugarCrushActive, setSugarCrushActive] = useState(false);
  const [sugarCrushBonus, setSugarCrushBonus] = useState(null);
  const pendingWinScore = useRef(null);
  const [hint, setHint] = useState(null);
  const [activityTick, setActivityTick] = useState(0);
  const [rejected, setRejected] = useState(null);

  // Candies used to be a hardcoded 42px while the cell they sit in is derived
  // from the board width, so they drifted apart: 90% of the tile on a 406px
  // board but only 75% at the old 480px cap, leaving a dead ring around every
  // candy that got worse the bigger the screen. Deriving the sprite from the
  // measured cell keeps the proportion fixed on every device.
  const candySize = gridMetrics
    ? Math.max(24, Math.round(Math.min(gridMetrics.cellW, gridMetrics.cellH) * 0.96))
    : 42;

  useEffect(() => {
    const initialJelly = level.jellyLayout ? level.jellyLayout.map((row) => row.slice()) : createEmptyJellyGrid(ROWS, COLS);
    
    let initialBoard = generateBoard(ROWS, COLS);
    if (level.initialBombs) {
      initialBoard = initialBoard.map((row) => row.map((cell) => ({ ...cell })));
      let bombsToSpawn = level.initialBombs;
      while (bombsToSpawn > 0) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        if (initialBoard[r][c].bombTimer === undefined && initialBoard[r][c].special === SPECIAL.NONE) {
          initialBoard[r][c].bombTimer = level.bombTimer || 9;
          bombsToSpawn -= 1;
        }
      }
    }
    setBoard(initialBoard);
    setJellyGrid(initialJelly);
    setScore(0);
    setMovesLeft(level.moveLimit);
    setSelected(null);
    setBoosterCounts(DEFAULT_BOOSTERS);
    setActiveBooster(null);
    setHint(null);
    outcomeSignaled.current = false;
  }, [level]);

  // Nudge the player toward a legal move after a spell of inactivity. The
  // search itself already exists for deadlock detection, so this is purely
  // surfacing it. Runs on a timer rather than per-frame — it evaluates every
  // adjacent swap on the board, which is far too heavy to do continuously.
  useEffect(() => {
    setHint(null);
    if (!board || busy || sugarCrushActive) return undefined;
    const timer = window.setTimeout(() => {
      setHint(findAnyValidMove(board));
    }, IDLE_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [board, busy, sugarCrushActive, activityTick]);

  const registerActivity = useCallback(() => setActivityTick((t) => t + 1), []);

  // Every deferred callback in a move goes through here so it can be cancelled
  // on unmount. Exiting to the map mid-cascade previously left ~5 pending
  // timers that fired setState against an unmounted component.
  const timers = useRef([]);
  const later = useCallback((fn, ms) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
    return id;
  }, []);

  useEffect(() => () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const jellyRemaining = jellyGrid.flat().reduce((sum, v) => sum + v, 0);

  const handleSugarCrushDone = useCallback(() => {
    setSugarCrushActive(false);
    if (pendingWinScore.current !== null) {
      onWin?.(pendingWinScore.current);
      pendingWinScore.current = null;
    }
  }, [onWin]);

  const checkOutcome = useCallback(
    (nextScore, nextMoves, nextJelly, bombExploded = false) => {
      if (outcomeSignaled.current) return;
      
      if (bombExploded) {
        outcomeSignaled.current = true;
        playSinhalaLose();
        setMessage('Bomb Exploded! 💣');
        // Reason distinguishes this from running out of moves — the result
        // modal would otherwise claim "Moves ඉවරයි" on a bomb loss.
        onLose?.(nextScore, 'bomb');
        return;
      }

      const jellyLeft = nextJelly.flat().reduce((sum, v) => sum + v, 0);

      // Sugar Crush: every unspent move is cashed in, mirroring the original's
      // habit of converting leftover moves into striped candies and detonating
      // them. Without it, jelly levels actively punished good play — clearing
      // the objective early ends the level and starves the score, so the
      // star-maximising strategy was to stall on the objective rather than
      // pursue it. Score levels win with 0 moves left and so bank no bonus.
      const win = (movesRemaining) => {
        outcomeSignaled.current = true;
        playSinhalaWin();
        const leftover = Math.max(0, movesRemaining);
        const bonus = leftover * SUGAR_CRUSH_BONUS_PER_MOVE;
        const finalScore = nextScore + bonus;
        setSugarCrushBonus({ moves: leftover, bonus });
        setScore(finalScore);
        pendingWinScore.current = finalScore;
        setSugarCrushActive(true);
      };

      // Jelly levels end the moment the objective is met — that IS the goal.
      if (level.objective.type === 'jelly' && jellyLeft === 0) {
        win(nextMoves);
        return;
      }

      // Score levels deliberately do NOT end on reaching the target; the player
      // keeps their remaining moves and banks as high a score as they can.
      // Ending early capped every run just above the target, which made the 2-
      // and 3-star tiers mathematically unreachable (simulated median on level 1
      // was 1,160 when it ended early vs 6,360 played out).
      if (nextMoves <= 0) {
        if (level.objective.type === 'score' && nextScore >= level.objective.target) {
          win(nextMoves);
          return;
        }
        outcomeSignaled.current = true;
        playSinhalaLose();
        onLose?.(nextScore);
      }
    },
    [level, onWin, onLose],
  );

  const triggerFX = useCallback((posA, posB, result, specialTypes) => {
    const metrics = gridMetrics;
    if (!metrics) return;

    const posACenter = cellCenter(metrics, posA[0], posA[1]);

    // Particle Shards
    globalParticleEngine.spawnMatchBurst(posACenter.x, posACenter.y, '#ffd93d', 18);

    // Special FX — beams span the full canvas, which now matches the grid.
    if (specialTypes.includes(SPECIAL.STRIPED_H)) {
      globalParticleEngine.spawnLaserBeam(posACenter.x, posACenter.y, 'horizontal', metrics.width, metrics.height, '#38bdf8');
    }
    if (specialTypes.includes(SPECIAL.STRIPED_V)) {
      globalParticleEngine.spawnLaserBeam(posACenter.x, posACenter.y, 'vertical', metrics.width, metrics.height, '#38bdf8');
    }
    if (specialTypes.includes(SPECIAL.WRAPPED)) {
      globalParticleEngine.spawnWrappedShockwave(posACenter.x, posACenter.y, 140, '#c084fc');
    }
    if (specialTypes.includes(SPECIAL.BOMB)) {
      const targets = [0, 1, 2].map(() => cellCenter(
        metrics,
        Math.floor(Math.random() * ROWS),
        Math.floor(Math.random() * COLS),
      ));
      globalParticleEngine.spawnLightningArc(posACenter.x, posACenter.y, targets, '#ffd93d');
    }
  }, [gridMetrics]);

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
        // Shake the pair so a rejected swap reads as "not legal" rather than
        // as a dropped input. Duration matches the reject-shake keyframes.
        setRejected([posA, posB]);
        later(() => setRejected(null), 320);
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
        later(() => {
          comboSound();
          haptics.combo();
        }, 120);
      } else if (result.cascadeCount > 1) {
        later(() => {
          playCombo(result.cascadeCount);
          haptics.combo();
        }, 150);
      } else {
        playPop();
        haptics.match();
      }

      // Float the points earned off the swap so the number is attached to the
      // move that produced it.
      if (result.score > 0 && gridMetrics) {
        const { x, y } = cellCenter(gridMetrics, posA[0], posA[1]);
        setPopups((prev) => [
          ...prev,
          { id: `pop-${Date.now()}-${Math.random()}`, x, y, points: result.score, big: result.score >= 500 },
        ]);
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

      // Input was previously blocked for a flat 550ms on every move, so a plain
      // 3-match felt sluggish while a six-step cascade got cut off partway
      // through its animation. Scale the settle time to how much actually
      // happened: ~420ms for a single match, capped at 1s for long cascades.
      const settleMs = Math.min(1000, 280 + result.cascadeCount * 140);

      later(() => {
        setMessage(null);
        setBusy(false);
        checkOutcome(nextScore, nextMoves, result.jellyGrid, result.bombExploded);
      }, settleMs);
    },
    [board, jellyGrid, score, movesLeft, busy, checkOutcome, triggerFX, gridMetrics, later],
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

      later(() => {
        setBusy(false);
        checkOutcome(nextScore, movesLeft, nextJelly, result.bombExploded);
      }, 400);
    },
    [board, jellyGrid, boosterCounts, busy, score, movesLeft, checkOutcome, later],
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
    // Any touch counts as engagement — restart the idle countdown.
    registerActivity();
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
        <div className={`hud-stat ${movesLeft <= LOW_MOVES ? 'low-moves' : ''}`}>
          Moves: {movesLeft}
        </div>
        {level.objective.type === 'jelly' && <div className="hud-stat">Jelly: {jellyRemaining}</div>}
      </div>

      <StarProgress score={score} thresholds={level.starThresholds} />

      {/* Takes the leftover height so the board sits centred between the HUD
          and the booster bar rather than jammed under the score. */}
      <div className="board-stage">
        <div
          ref={gridRef}
          className="game-grid"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, position: 'relative' }}
        >
          {gridMetrics && <ParticleCanvas width={gridMetrics.width} height={gridMetrics.height} />}
          <AnimatePresence mode="popLayout">
            {board.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={cell.id}
                  className={`candy-cell ${(r + c) % 2 === 1 ? 'tile-dark' : ''} ${selected && selected[0] === r && selected[1] === c ? 'selected' : ''} ${jellyGrid[r][c] > 0 ? 'has-jelly' : ''} ${hint && hint.some(([hr, hc]) => hr === r && hc === c) ? 'hint' : ''} ${rejected && rejected.some(([rr, rc]) => rr === r && rc === c) ? 'rejected' : ''}`}
                  onPointerDown={(e) => handlePointerDown(r, c, e)}
                  onPointerUp={handlePointerUp}
                >
                  {jellyGrid[r][c] > 0 && <div className={`jelly-overlay layer-${jellyGrid[r][c]}`} />}
                  {/* Refills fall in from above the tile instead of popping in
                      place, which is the motion the original is known for. */}
                  <motion.div
                    layout
                    layoutId={`candy-${cell.id}`}
                    className="candy-wrapper"
                    initial={{ y: -46, scale: 0.9, opacity: 0, rotate: -10 }}
                    animate={{ y: 0, scale: [1.14, 0.92, 1.03, 1], opacity: 1, rotate: 0 }}
                    exit={{ scale: 1.6, opacity: 0, filter: 'brightness(2) blur(2px)' }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9, rotate: -5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    {/* bombTimer must be forwarded: the engine ticks it down and
                        ends the level at zero, so without it the countdown UI in
                        CandySprite never renders and the loss has no visible cause. */}
                    <CandySprite
                      color={cell.color}
                      special={cell.special}
                      bombTimer={cell.bombTimer}
                      size={candySize}
                    />
                  </motion.div>
                </div>
              )),
            )}
          </AnimatePresence>

          {/* Shatter Effects Layer — positions come from cached metrics, so this
              no longer forces a synchronous layout read per shard per render. */}
          {gridMetrics && shatters.map((s) => {
            const { x, y } = cellCenter(gridMetrics, s.row, s.col);
            return (
              <CandyShatter
                key={s.id}
                color={s.color}
                x={x}
                y={y}
                onComplete={() => setShatters((prev) => prev.filter((item) => item.id !== s.id))}
              />
            );
          })}

          {popups.map((p) => (
            <ScorePopup
              key={p.id}
              x={p.x}
              y={p.y}
              points={p.points}
              big={p.big}
              onComplete={() => setPopups((prev) => prev.filter((item) => item.id !== p.id))}
            />
          ))}
        </div>
      </div>

      <BoosterBar
        counts={boosterCounts}
        active={activeBooster}
        onSelect={(key) => setActiveBooster((prev) => (prev === key ? null : key))}
      />

      <AnnouncerOverlay message={message} />

      {/* Sugar Crush Win Celebration */}
      {sugarCrushActive && (
        <SugarCrush bonus={sugarCrushBonus} onComplete={handleSugarCrushDone} />
      )}
    </div>
  );
}

