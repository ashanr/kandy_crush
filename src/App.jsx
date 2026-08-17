import { useEffect, useState } from 'react';
import SagaMap from './components/SagaMap.jsx';
import GameBoard from './components/GameBoard.jsx';
import { computeStars, recordWin } from './utils/progression.js';

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

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

  if (activeLevel) {
    return (
      <>
        <GameBoard
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
              <button type="button" onClick={closeResult}>ඉදිරියට (Continue)</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return <SagaMap progress={progress} onSelectLevel={setActiveLevel} />;
}
