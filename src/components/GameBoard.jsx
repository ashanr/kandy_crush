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
  spawnAndDetonateStriped,
  createBlocker,
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
  playWinVoice,
  playLoseVoice,
} from '../utils/sound.js';
import { getAnnouncement } from '../utils/announcer.js';
import { cellCenter } from '../utils/gridGeometry.js';
import { haptics } from '../utils/haptics.js';
import AnnouncerOverlay from './AnnouncerOverlay.jsx';
import BoosterBar from './BoosterBar.jsx';

import CandySprite from './CandySprite.jsx';
import CandyShatter from './CandyShatter.jsx';
import ParticleCanvas from './ParticleCanvas.jsx';
import DynamicBackground from './DynamicBackground.jsx';
import { globalParticleEngine } from '../utils/particles.js';
import SugarCrush from './SugarCrush.jsx';
import useCountUp from '../hooks/useCountUp.js';
import StarProgress from './StarProgress.jsx';
import ScorePopup from './ScorePopup.jsx';
import ComboLabel from './ComboLabel.jsx';
import CoconutRoll from './CoconutRoll.jsx';
import BlockerSprite from './BlockerSprite.jsx';
import { useTimers } from '../hooks/useTimers.js';
import { useBoardGeometry } from '../hooks/useBoardGeometry.js';
import { useBoardFX } from '../hooks/useBoardFX.js';

const ROWS = 8;
const COLS = 8;

const DEFAULT_BOOSTERS = { hammer: 1, shuffle: 1, bomb: 1 };

// Idle time before the board suggests a move.
const IDLE_HINT_MS = 5000;
// Moves remaining at which the counter starts warning.
const LOW_MOVES = 5;
// Points awarded per unspent move when the objective is cleared early.
const SUGAR_CRUSH_BONUS_PER_MOVE = 300;
// How long a combo banner stays readable. Deliberately independent of the move
// settle time: settle was tightened to ~420ms for a plain match so the board
// unblocks quickly, but the banner was being cleared on that same timer, so the
// text flashed past before it could be read.
const BANNER_MS = 1100;
// Size of the one-time reprieve offered when moves run out.
const EXTRA_MOVES = 5;
// Gap between successive striped-candy detonations in the Sugar Crush cascade.
const SUGAR_CRUSH_STEP_MS = 240;
// How long the Coconut Wheel takes to roll its 3 cells before the lasers fire.
const COCONUT_ROLL_MS = 420;

const SPECIAL_NAMES = {
  [SPECIAL.STRIPED_H]: 'striped horizontal',
  [SPECIAL.STRIPED_V]: 'striped vertical',
  [SPECIAL.WRAPPED]: 'wrapped',
  [SPECIAL.BOMB]: 'colour bomb',
  [SPECIAL.JELLY_FISH]: 'jelly fish',
  [SPECIAL.COCONUT_WHEEL]: 'coconut wheel',
  [SPECIAL.LUCKY]: 'lucky candy',
};

/** Spoken description of a cell, for screen readers. */
function describeCell(cell, jellyLayers, r, c) {
  const where = `row ${r + 1}, column ${c + 1}`;
  if (!cell) return `empty, ${where}`;
  if (cell.blocker) return `${cell.blocker}, blocker, ${where}`;

  const parts = [cell.color];
  if (cell.special && cell.special !== SPECIAL.NONE) parts.push(SPECIAL_NAMES[cell.special] ?? cell.special);
  if (cell.locked) parts.push('locked');
  if (cell.bombTimer !== undefined) parts.push(`bomb, ${cell.bombTimer} moves left`);
  if (jellyLayers > 0) parts.push(`on ${jellyLayers}-layer jelly`);
  return `${parts.join(', ')}, ${where}`;
}

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

export default function GameBoard({ level, startBooster = null, onWin, onLose, onExit }) {
  const [board, setBoard] = useState(null);
  const [jellyGrid, setJellyGrid] = useState(() => createEmptyJellyGrid(ROWS, COLS));
  const [score, setScore] = useState(0);
  // The HUD shows a value travelling toward the score, not the score itself —
  // see useCountUp. The rules always read `score`; only the digits lag.
  const displayScore = useCountUp(score);
  const [movesLeft, setMovesLeft] = useState(level.moveLimit);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [boosterCounts, setBoosterCounts] = useState(DEFAULT_BOOSTERS);
  const [activeBooster, setActiveBooster] = useState(null);
  const gridRef = useRef(null);
  const dragStart = useRef(null);
  const outcomeSignaled = useRef(false);
  const prevScore = useRef(0);

  const { later } = useTimers();
  const { gridMetrics, candySize } = useBoardGeometry(gridRef, ROWS, COLS);
  const fx = useBoardFX({ gridMetrics, rows: ROWS, cols: COLS, later });
  const {
    shatters, popups, comboLabels, boardShaking, comboFlash, scoreBump,
  } = fx;
  const [sugarCrushActive, setSugarCrushActive] = useState(false);
  const [sugarCrushBonus, setSugarCrushBonus] = useState(null);
  const [coconutRoll, setCoconutRoll] = useState(null);
  // One-time "out of moves" reprieve, and the exit guard.
  const [outOfMovesOffer, setOutOfMovesOffer] = useState(false);
  const [pendingLoseScore, setPendingLoseScore] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const extraMovesUsed = useRef(false);
  const pendingWinScore = useRef(null);
  const [hint, setHint] = useState(null);
  const [activityTick, setActivityTick] = useState(0);
  const [rejected, setRejected] = useState(null);
  // Keyboard navigation. The board was pointer-only, so a keyboard or
  // switch-access player could not make a move at all — and the idle hint was
  // highlighting a swap they had no way to perform.
  const [focusCell, setFocusCell] = useState([0, 0]);
  const focusRef = useRef(null);
  const shouldRefocus = useRef(false);


  useEffect(() => {
    const initialJelly = level.jellyLayout ? level.jellyLayout.map((row) => row.slice()) : createEmptyJellyGrid(ROWS, COLS);
    
    let initialBoard = generateBoard(ROWS, COLS);

    // Blockers and locks are stamped onto the generated board by position.
    // `blockerLayout` is a grid of BLOCKER kinds (or null); `lockLayout` marks
    // candies that start caged.
    if (level.blockerLayout || level.lockLayout) {
      initialBoard = initialBoard.map((row, r) => row.map((cell, c) => {
        const kind = level.blockerLayout?.[r]?.[c];
        if (kind) return createBlocker(kind);
        if (level.lockLayout?.[r]?.[c]) return { ...cell, locked: true };
        return cell;
      }));
    }

    // Free special the player armed on the briefing card, dropped onto a plain
    // candy so it's available from the very first move.
    if (startBooster) {
      const plain = [];
      initialBoard.forEach((row, r) => row.forEach((cell, c) => {
        if (cell && !cell.blocker && !cell.locked && cell.special === SPECIAL.NONE) plain.push([r, c]);
      }));
      if (plain.length > 0) {
        const [br, bc] = plain[Math.floor(Math.random() * plain.length)];
        initialBoard = initialBoard.map((row) => row.map((cell) => ({ ...cell })));
        initialBoard[br][bc].special = startBooster;
      }
    }

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
  }, [level, startBooster]);

  // Nudge the player toward a legal move after a spell of inactivity. The
  // search itself already exists for deadlock detection, so this is purely
  // surfacing it. Runs on a timer rather than per-frame — it evaluates every
  // adjacent swap on the board, which is far too heavy to do continuously.
  useEffect(() => {
    setHint(null);
    if (!board || busy || sugarCrushActive || outOfMovesOffer || confirmExit) return undefined;
    const timer = window.setTimeout(() => {
      setHint(findAnyValidMove(board));
    }, IDLE_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [board, busy, sugarCrushActive, outOfMovesOffer, confirmExit, activityTick]);

  const registerActivity = useCallback(() => setActivityTick((t) => t + 1), []);


  const jellyRemaining = jellyGrid.flat().reduce((sum, v) => sum + v, 0);

  const bombDanger = board
    ? board.some((row) => row.some((cell) => cell && cell.bombTimer !== undefined && cell.bombTimer <= 2))
    : false;

  const handleSugarCrushDone = useCallback(() => {
    setSugarCrushActive(false);
    if (pendingWinScore.current !== null) {
      onWin?.(pendingWinScore.current);
      pendingWinScore.current = null;
    }
  }, [onWin]);

  /**
   * Cashes each unspent move in as a striped candy that spawns and detonates on
   * the board, one after another.
   *
   * Scoring stays the flat per-move rate the star thresholds were calibrated
   * against — which is also how the original works, where every leftover move
   * becomes one striped candy worth a fixed amount. The detonations are the
   * spectacle; the board is already won, so the clearing they cause is free.
   */
  const runSugarCrushCascade = useCallback(
    (startBoard, startJelly, startScore, leftover, onDone) => {
      let liveBoard = startBoard;
      let liveJelly = startJelly;
      let liveScore = startScore;
      let remaining = leftover;

      const step = () => {
        if (remaining <= 0) {
          onDone(liveScore);
          return;
        }

        const candidates = [];
        liveBoard.forEach((row, r) => row.forEach((cell, c) => {
          if (cell) candidates.push([r, c]);
        }));

        if (candidates.length > 0) {
          const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
          const horizontal = Math.random() < 0.5;
          const res = spawnAndDetonateStriped(liveBoard, liveJelly, [r, c], horizontal);
          if (res) {
            liveBoard = res.board;
            liveJelly = res.jellyGrid;
            setBoard(liveBoard);
            setJellyGrid(liveJelly);
            if (gridMetrics) {
              const { x, y } = cellCenter(gridMetrics, r, c);
              globalParticleEngine.spawnLaserBeam(
                x, y,
                horizontal ? 'horizontal' : 'vertical',
                gridMetrics.width, gridMetrics.height,
                '#ffd93d',
              );
            }
            playLaser();
            haptics.combo();
          }
        }

        // The score climbs one striped candy at a time, so the bonus is watched
        // being earned rather than appearing as a single jump.
        liveScore += SUGAR_CRUSH_BONUS_PER_MOVE;
        setScore(liveScore);
        fx.bumpScore(200);

        remaining -= 1;
        later(step, SUGAR_CRUSH_STEP_MS);
      };

      step();
    },
    [gridMetrics, later],
  );

  const checkOutcome = useCallback(
    (nextScore, nextMoves, nextJelly, bombExploded = false, nextBoard = null) => {
      if (outcomeSignaled.current) return;
      
      if (bombExploded) {
        outcomeSignaled.current = true;
        playLoseVoice();
        setMessage('Bomb Exploded! 💣');
        // Reason distinguishes this from running out of moves — the result
        // modal would otherwise claim "Out of Moves" on a bomb loss.
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
        playWinVoice();
        const leftover = Math.max(0, movesRemaining);
        const bonus = leftover * SUGAR_CRUSH_BONUS_PER_MOVE;
        setSugarCrushBonus({ moves: leftover, bonus });

        const celebrate = (finalScore) => {
          pendingWinScore.current = finalScore;
          setSugarCrushActive(true);
        };

        if (leftover > 0 && nextBoard) {
          // Hold input while the cascade plays itself out.
          setBusy(true);
          runSugarCrushCascade(nextBoard, nextJelly, nextScore, leftover, celebrate);
        } else {
          setScore(nextScore + bonus);
          celebrate(nextScore + bonus);
        }
      };

      // Jelly levels end the moment the objective is met — that IS the goal.
      if (level.objective.type === 'jelly' && jellyLeft === 0) {
        win(nextMoves);
        return;
      }

      // Score levels end the instant the target is crossed, exactly like the
      // original — and the moves you did not need are the reward.
      //
      // They used to be played out to the last move instead, which meant
      // `leftover` was always 0 on a score level, so every one of them silently
      // skipped the entire Sugar Crush sequence: no striped candies spawning and
      // detonating across the board, no score climbing, no bonus. Five of the
      // eleven levels just cut to the result modal. Finishing in 12 of 20 moves
      // now pays 8 x 300 on top of the spectacle, and that bonus is where the 2-
      // and 3-star tiers come from — which is what playing the moves out was
      // originally trying to achieve.
      if (level.objective.type === 'score' && nextScore >= level.objective.target) {
        win(nextMoves);
        return;
      }

      if (nextMoves <= 0) {
        // Running out of moves used to be an immediate, final loss. Offer a
        // one-time extension first — the beat where a level looks lost and
        // isn't is most of the drama in a match-3. `outcomeSignaled` stays
        // false so a genuine loss can still be signalled once the offer is
        // declined or spent.
        if (!extraMovesUsed.current) {
          setPendingLoseScore(nextScore);
          setOutOfMovesOffer(true);
          return;
        }

        outcomeSignaled.current = true;
        playLoseVoice();
        onLose?.(nextScore);
      }
    },
    [level, onWin, onLose, runSugarCrushCascade],
  );

  const acceptExtraMoves = useCallback(() => {
    extraMovesUsed.current = true;
    setOutOfMovesOffer(false);
    setPendingLoseScore(null);
    setMovesLeft(EXTRA_MOVES);
    setMessage(`+${EXTRA_MOVES} moves!`);
    later(() => setMessage((m) => (m === `+${EXTRA_MOVES} moves!` ? null : m)), BANNER_MS);
    playSpecialCreate();
    haptics.special();
  }, [later]);

  const declineExtraMoves = useCallback(() => {
    setOutOfMovesOffer(false);
    outcomeSignaled.current = true;
    playLoseVoice();
    onLose?.(pendingLoseScore ?? score);
  }, [onLose, pendingLoseScore, score]);


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
        // Compute which direction each cell should slide toward the other.
        const dr = posB[0] - posA[0];
        const dc = posB[1] - posA[1];
        const dirA = dc > 0 ? 'right' : dc < 0 ? 'left' : dr > 0 ? 'down' : 'up';
        const dirB = dc > 0 ? 'left' : dc < 0 ? 'right' : dr > 0 ? 'up' : 'down';
        setRejected([
          { r: posA[0], c: posA[1], dir: dirA },
          { r: posB[0], c: posB[1], dir: dirB },
        ]);
        later(() => setRejected(null), 420);
        return;
      }
      setBusy(true);
      playSwap();
      haptics.swap();

      // A Coconut Wheel resolves its 3-cell travel and its perpendicular lasers
      // in one engine step, so the swap read as an instant board-wide clear with
      // no visible cause. Show the wheel actually rolling first, then let the
      // rest of the move land. Everything below is deferred by the roll, so the
      // lasers fire when the wheel arrives rather than before it sets off.
      const wheelIsA = cellA.special === SPECIAL.COCONUT_WHEEL;
      const wheelIsB = cellB.special === SPECIAL.COCONUT_WHEEL;
      let rollDelay = 0;
      if ((wheelIsA || wheelIsB) && gridMetrics) {
        const posWheel = wheelIsA ? posA : posB;
        const posOther = wheelIsA ? posB : posA;
        const dr = posOther[0] - posWheel[0];
        const dc = posOther[1] - posWheel[1];
        // Engine rolls up to 3 cells past the wheel; clamp to the board edge so
        // the sprite never travels off the grid.
        const endR = Math.max(0, Math.min(ROWS - 1, posWheel[0] + 3 * dr));
        const endC = Math.max(0, Math.min(COLS - 1, posWheel[1] + 3 * dc));
        rollDelay = COCONUT_ROLL_MS;
        setCoconutRoll({
          id: `roll-${Date.now()}`,
          from: cellCenter(gridMetrics, posWheel[0], posWheel[1]),
          to: cellCenter(gridMetrics, endR, endC),
        });
        playLaser();
      }

      const commitMove = () => {
        setCoconutRoll(null);
        fx.spawnMoveParticles(posA, specialTypes);

        fx.spawnShatters(board, result.board);

        // Banner text and the spoken line come from one shared mapping so they
        // can never disagree (see src/utils/announcer.js).
        const { banner, voiceKey } = getAnnouncement({
          specialCount: specialTypes.length,
          cascadeCount: result.cascadeCount,
        });
        setMessage(banner);
        // Banner clears on its own schedule so a fast board doesn't cut the
        // text short. Superseded immediately if the next move sets a new one.
        later(() => setMessage((m) => (m === banner ? null : m)), BANNER_MS);
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

        // Feedback for the move: floating score, combo label, shake/flash and
        // jelly splatter. None of it feeds back into the rules — see useBoardFX.
        fx.spawnScorePopup(posA, result.score);
        fx.spawnComboLabel(posA, result.cascadeCount, specialTypes.length);
        fx.reactToMove(result.cascadeCount, specialTypes);
        fx.spawnJellySplatter(jellyGrid, result.jellyGrid);

        const { board: playableBoard, reshuffled } = ensurePlayable(result.board);
        const nextScore = score + result.score;
        const nextMoves = movesLeft - 1;

        if (nextScore > prevScore.current) {
          fx.bumpScore();
          prevScore.current = nextScore;
        }

        setBoard(playableBoard);
        setJellyGrid(result.jellyGrid);
        setScore(nextScore);
        setMovesLeft(nextMoves);
        setSelected(null);
        if (reshuffled) setMessage('Shuffling...');

        // Input was previously blocked for a flat 550ms on every move, so a plain
        // 3-match felt sluggish while a six-step cascade got cut off partway
        // through its animation. Scale the settle time to how much actually
        // happened: ~420ms for a single match, capped at 1s for long cascades.
        const settleMs = Math.min(1000, 280 + result.cascadeCount * 140);

        // Unblocking input no longer clears the banner — that is BANNER_MS's
        // job, so the board can go fast while the text stays readable.
        later(() => {
          setBusy(false);
          checkOutcome(nextScore, nextMoves, result.jellyGrid, result.bombExploded, playableBoard);
        }, settleMs);
      };

      if (rollDelay > 0) later(commitMove, rollDelay);
      else commitMove();
    },
    [board, jellyGrid, score, movesLeft, busy, checkOutcome, fx, gridMetrics, later],
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
        checkOutcome(nextScore, movesLeft, nextJelly, result.bombExploded, result.board);
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

  // Keyboard play mirrors the tap model exactly: move the cursor with the arrow
  // keys, Enter/Space to pick a candy up, then Enter/Space on an adjacent one to
  // swap. Arrowing *while* a candy is selected performs the swap directly, which
  // is the faster idiom once you know it.
  const handleCellKeyDown = useCallback((e, r, c) => {
    const deltas = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };

    if (deltas[e.key]) {
      e.preventDefault();
      const [dr, dc] = deltas[e.key];
      const nr = Math.max(0, Math.min(ROWS - 1, r + dr));
      const nc = Math.max(0, Math.min(COLS - 1, c + dc));
      if (nr === r && nc === c) return;

      if (selected && selected[0] === r && selected[1] === c && !busy) {
        // Held a candy and pressed a direction — that's the swap.
        setFocusCell([nr, nc]);
        shouldRefocus.current = true;
        performMove([r, c], [nr, nc]);
        return;
      }
      setFocusCell([nr, nc]);
      shouldRefocus.current = true;
      registerActivity();
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      registerActivity();
      handleCellTap(r, c);
      shouldRefocus.current = true;
      return;
    }

    if (e.key === 'Escape' && selected) {
      e.preventDefault();
      setSelected(null);
    }
  }, [selected, busy, performMove, registerActivity]);

  // Move DOM focus to follow the roving tabindex, but only in response to a key
  // press — stealing focus on every board update would fight the pointer.
  useEffect(() => {
    if (!shouldRefocus.current) return;
    shouldRefocus.current = false;
    focusRef.current?.focus({ preventScroll: true });
  }, [focusCell, board]);

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
      {/* Reactivity is painted by this overlay rather than by filtering the
          whole screen — see .board-reactivity-overlay in index.css. */}
      {comboFlash && <div className="board-reactivity-overlay combo" />}
      {bombDanger && <div className="board-reactivity-overlay danger" />}
      <div className="game-hud">
        {/* Exit used to discard a level in progress instantly, with no prompt.
            A fresh board has nothing to lose, so only guard once the player has
            actually invested moves. */}
        <button
          type="button"
          className="hud-btn"
          onClick={() => (movesLeft < level.moveLimit ? setConfirmExit(true) : onExit?.())}
        >
          Exit
        </button>
        <div className="hud-stat">
          Score: <span className={`score-value ${scoreBump ? 'score-bump' : ''}`}>
            {displayScore.toLocaleString()}
          </span>
          {level.objective.type === 'score' ? ` / ${level.objective.target.toLocaleString()}` : ''}
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
          className={`game-grid ${boardShaking ? 'board-shake' : ''}`}
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, position: 'relative' }}
          role="grid"
          aria-label={`Game board, ${ROWS} by ${COLS}. Arrow keys to move, Enter to pick up and swap.`}
          aria-rowcount={ROWS}
          aria-colcount={COLS}
        >
          {gridMetrics && <ParticleCanvas width={gridMetrics.width} height={gridMetrics.height} />}
          <AnimatePresence mode="popLayout">
            {board.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={cell.id}
                  className={`candy-cell ${(r + c) % 2 === 1 ? 'tile-dark' : ''} ${selected && selected[0] === r && selected[1] === c ? 'selected' : ''} ${jellyGrid[r][c] > 0 ? 'has-jelly' : ''} ${hint && hint.some(([hr, hc]) => hr === r && hc === c) ? 'hint' : ''} ${rejected ? (() => { const m = rejected.find((cell) => cell.r === r && cell.c === c); return m ? `rejected-${m.dir}` : ''; })() : ''} ${focusCell[0] === r && focusCell[1] === c ? 'kb-focus' : ''}`}
                  onPointerDown={(e) => handlePointerDown(r, c, e)}
                  onPointerUp={handlePointerUp}
                  // Roving tabindex: the grid is one tab stop, and the arrow
                  // keys move within it. 64 separate tab stops would make the
                  // board impossible to tab past.
                  tabIndex={focusCell[0] === r && focusCell[1] === c ? 0 : -1}
                  ref={focusCell[0] === r && focusCell[1] === c ? focusRef : null}
                  role="gridcell"
                  aria-label={describeCell(cell, jellyGrid[r][c], r, c)}
                  aria-selected={Boolean(selected && selected[0] === r && selected[1] === c)}
                  onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                  onFocus={() => setFocusCell([r, c])}
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
                    {cell.blocker ? (
                      <BlockerSprite kind={cell.blocker} size={candySize} />
                    ) : (
                      <>
                        {/* bombTimer must be forwarded: the engine ticks it down
                            and ends the level at zero, so without it the countdown
                            UI in CandySprite never renders and the loss has no
                            visible cause. */}
                        <CandySprite
                          color={cell.color}
                          special={cell.special}
                          bombTimer={cell.bombTimer}
                          size={candySize}
                        />
                        {cell.locked && <div className="candy-lock" aria-hidden="true">⛓</div>}
                      </>
                    )}
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
                onComplete={() => fx.dismissShatter(s.id)}
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
              onComplete={() => fx.dismissPopup(p.id)}
            />
          ))}

          {comboLabels.map((cl) => (
            <ComboLabel
              key={cl.id}
              x={cl.x}
              y={cl.y}
              tier={cl.tier}
              onComplete={() => fx.dismissComboLabel(cl.id)}
            />
          ))}

          {coconutRoll && (
            <CoconutRoll
              key={coconutRoll.id}
              from={coconutRoll.from}
              to={coconutRoll.to}
              size={candySize}
              durationMs={COCONUT_ROLL_MS}
            />
          )}
        </div>
      </div>

      <BoosterBar
        counts={boosterCounts}
        active={activeBooster}
        onSelect={(key) => setActiveBooster((prev) => (prev === key ? null : key))}
      />

      {/* Score, moves and the combo banner are all conveyed visually only.
          This mirrors them to assistive tech without duplicating them on screen. */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {message ? `${message}. ` : ''}
        Score {score}
        {level.objective.type === 'score' ? ` of ${level.objective.target}` : ''}
        , {movesLeft} moves left
        {level.objective.type === 'jelly' ? `, ${jellyRemaining} jelly remaining` : ''}
      </div>

      <AnnouncerOverlay message={message} />

      {/* Sugar Crush Win Celebration */}
      {sugarCrushActive && (
        <SugarCrush bonus={sugarCrushBonus} onComplete={handleSugarCrushDone} />
      )}

      {outOfMovesOffer && (
        <div className="result-modal">
          <motion.div
            className="result-card second-chance-card"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div className="second-chance-icon">🔄</div>
            <h2>Out of Moves!</h2>
            <p className="second-chance-sub">
              Take {EXTRA_MOVES} more moves and keep going?
            </p>
            <div className="result-actions">
              <button type="button" className="result-retry" onClick={declineExtraMoves}>
                Give Up
              </button>
              <button type="button" onClick={acceptExtraMoves}>
                +{EXTRA_MOVES} Moves
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmExit && (
        <div className="result-modal">
          <motion.div
            className="result-card"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            <h2>Quit Level? 🚪</h2>
            <p>Leaving now loses this attempt.</p>
            <div className="result-actions">
              <button type="button" className="result-retry" onClick={() => setConfirmExit(false)}>
                Keep Playing
              </button>
              <button type="button" onClick={() => { setConfirmExit(false); onExit?.(); }}>
                Exit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

