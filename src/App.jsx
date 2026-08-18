import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SagaMap from './components/SagaMap.jsx';
import GameBoard from './components/GameBoard.jsx';
import LevelIntro from './components/LevelIntro.jsx';
import { computeStars, recordWin } from './utils/progression.js';
import { setBGMScene } from './utils/sound.js';
import { readJSON, writeJSON } from './utils/storage.js';

const STORAGE_KEY = 'candy-saga-progress';

function loadProgress() {
  return readJSON(STORAGE_KEY, {});
}

export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [pendingLevel, setPendingLevel] = useState(null);
  const [activeLevel, setActiveLevel] = useState(null);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  // Set when returning to the map after a win, so the map can play the payoff
  // (trail advancing, next level unlocking) instead of just reappearing.
  const [celebration, setCelebration] = useState(null);
  // Optional free special the player armed on the briefing card.
  const [startBooster, setStartBooster] = useState(null);

  useEffect(() => {
    writeJSON(STORAGE_KEY, progress);
  }, [progress]);

  // Energetic percussion belongs to the map; the board gets a quiet melodic
  // bed so it doesn't fight the match/combo effects and announcer voice.
  useEffect(() => {
    setBGMScene(activeLevel ? 'game' : 'map');
  }, [activeLevel]);

  const handleWin = (score) => {
    // Clearing the level always records completion, independent of how many
    // stars the score earned — that separation is what unlocks the next level.
    setProgress((prev) => recordWin(prev, activeLevel, score));
    setResult({ outcome: 'win', score, stars: computeStars(activeLevel, score) });
  };

  const handleLose = (score, reason = 'moves') => {
    setResult({ outcome: 'lose', score, reason });
  };

  // The map hands off to the briefing card, which hands off to the board.
  const startPendingLevel = (booster) => {
    setStartBooster(booster ?? null);
    setActiveLevel(pendingLevel);
    setPendingLevel(null);
  };

  const closeResult = () => {
    // Only a win is worth celebrating on the map. Losing, or exiting mid-level,
    // returns to a quiet map as before.
    if (result?.outcome === 'win' && activeLevel) {
      setCelebration({ levelId: activeLevel.id, stars: result.stars });
    }
    setResult(null);
    setActiveLevel(null);
  };

  // Replay the same level without a round-trip to the map. GameBoard resets its
  // state from the `level` prop, which is unchanged here, so bump a key to force
  // a fresh mount.
  const retryLevel = () => {
    setResult(null);
    setAttempt((n) => n + 1);
  };

  if (activeLevel) {
    return (
      <>
        <GameBoard
          key={`${activeLevel.id}-${attempt}`}
          level={activeLevel}
          startBooster={startBooster}
          onWin={handleWin}
          onLose={handleLose}
          onExit={() => setActiveLevel(null)}
        />
        {result && (
          <div className="result-modal">
            <div className="result-card">
              <h2>
                {result.outcome === 'win'
                  ? 'You Won! 🎉'
                  : result.reason === 'bomb'
                    ? 'Bomb Exploded! 💣'
                    : 'Out of Moves! 😢'}
              </h2>
              <p>Score: {result.score}</p>
              {result.outcome === 'win' && (
                // Stars land one at a time rather than all being present on the
                // first frame — the reveal is the reward, and showing the final
                // tally instantly throws it away.
                <div className="result-stars">
                  {[1, 2, 3].map((s) => {
                    const earned = s <= result.stars;
                    return (
                      <motion.span
                        key={s}
                        className={`result-star ${earned ? 'earned' : ''}`}
                        initial={{ scale: 0, rotate: -180, opacity: 0 }}
                        animate={
                          earned
                            ? { scale: [0, 1.5, 0.9, 1], rotate: 0, opacity: 1 }
                            : { scale: 1, rotate: 0, opacity: 1 }
                        }
                        transition={{
                          delay: 0.25 + (s - 1) * 0.32,
                          duration: earned ? 0.55 : 0.3,
                          ease: 'easeOut',
                        }}
                      >
                        {earned ? '★' : '☆'}
                      </motion.span>
                    );
                  })}
                </div>
              )}
              <div className="result-actions">
                <button type="button" onClick={retryLevel} className="result-retry">
                  Retry
                </button>
                <button type="button" onClick={closeResult}>
                  {result.outcome === 'win' ? 'Continue' : 'Map'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <SagaMap
        progress={progress}
        celebration={celebration}
        onCelebrationDone={() => setCelebration(null)}
        onSelectLevel={setPendingLevel}
      />
      {pendingLevel && (
        <LevelIntro
          level={pendingLevel}
          onStart={startPendingLevel}
          onCancel={() => setPendingLevel(null)}
        />
      )}
    </>
  );
}
