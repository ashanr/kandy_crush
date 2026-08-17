import { useEffect, useState } from 'react';
import SagaMap from './components/SagaMap.jsx';
import GameBoard from './components/GameBoard.jsx';

const STORAGE_KEY = 'candy-saga-progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function computeStars(level, score) {
  const [s1, s2, s3] = level.starThresholds;
  if (score >= s3) return 3;
  if (score >= s2) return 2;
  if (score >= s1) return 1;
  return 0;
}

export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [activeLevel, setActiveLevel] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const handleWin = (score) => {
    const stars = computeStars(activeLevel, score);
    setProgress((prev) => {
      const existing = prev[activeLevel.id] || { stars: 0, bestScore: 0 };
      return {
        ...prev,
        [activeLevel.id]: {
          stars: Math.max(existing.stars, stars),
          bestScore: Math.max(existing.bestScore, score),
        },
      };
    });
    setResult({ outcome: 'win', score, stars });
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
              <h2>{result.outcome === 'win' ? 'Level Complete!' : 'Out of Moves'}</h2>
              <p>Score: {result.score}</p>
              {result.outcome === 'win' && (
                <div className="result-stars">
                  {'★'.repeat(result.stars)}
                  {'☆'.repeat(3 - result.stars)}
                </div>
              )}
              <button type="button" onClick={closeResult}>Continue</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return <SagaMap progress={progress} onSelectLevel={setActiveLevel} />;
}
