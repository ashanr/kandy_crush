import { useEffect, useState } from 'react';
import SagaMap from './components/SagaMap.jsx';
import GameBoard from './components/GameBoard.jsx';
import { computeStars, recordWin } from './utils/progression.js';
import { setBGMScene } from './utils/sound.js';

const STORAGE_KEY = 'candy-saga-progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [activeLevel, setActiveLevel] = useState(null);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
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

  const handleLose = (score) => {
    setResult({ outcome: 'lose', score });
  };

  const closeResult = () => {
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
          onWin={handleWin}
          onLose={handleLose}
          onExit={() => setActiveLevel(null)}
        />
        {result && (
          <div className="result-modal">
            <div className="result-card">
              <h2>{result.outcome === 'win' ? 'දින්නා! 🎉' : 'අයියෝ! Moves ඉවරයි 😢'}</h2>
              <p>ලකුණු (Score): {result.score}</p>
              {result.outcome === 'win' && (
                <div className="result-stars">
                  {'★'.repeat(result.stars)}
                  {'☆'.repeat(3 - result.stars)}
                </div>
              )}
              <div className="result-actions">
                <button type="button" onClick={retryLevel} className="result-retry">
                  නැවත (Retry)
                </button>
                <button type="button" onClick={closeResult}>
                  {result.outcome === 'win' ? 'ඉදිරියට (Continue)' : 'සිතියම (Map)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return <SagaMap progress={progress} onSelectLevel={setActiveLevel} />;
}
