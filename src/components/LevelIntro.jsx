import { useState } from 'react';
import { motion } from 'framer-motion';
import { SPECIAL } from '../game/board.js';

// One free special seeded onto the board before the first move. Kept to a
// single pick: the point is a small opening advantage the player chooses, not
// a stack of freebies that flattens the difficulty curve.
const START_BOOSTERS = [
  { key: SPECIAL.STRIPED_H, icon: '🍬', label: 'Striped', hint: 'Clears a row' },
  { key: SPECIAL.WRAPPED, icon: '🎁', label: 'Wrapped', hint: 'Blows a 3×3' },
  { key: SPECIAL.BOMB, icon: '🍫', label: 'Color Bomb', hint: 'Wipes a colour' },
];

/**
 * Pre-level briefing card.
 *
 * Tapping a map node used to drop the player straight onto a board with no
 * statement of what they were trying to do — you had to infer the objective
 * from the HUD mid-play. Worse on levels carrying candy bombs, where the
 * hazard could end the run before it was ever explained.
 *
 * Shows the objective, the move budget, the star ladder and any hazards, then
 * waits for an explicit Start.
 */

function objectiveSummary(level) {
  if (level.objective.type === 'jelly') {
    const tiles = level.jellyLayout
      ? level.jellyLayout.flat().filter((v) => v > 0).length
      : 0;
    return {
      icon: '🟦',
      title: 'ජෙලි ඉවත් කරන්න',
      detail: `Clear all jelly (${tiles} tiles)`,
    };
  }
  return {
    icon: '🎯',
    title: 'ලකුණු රැස් කරන්න',
    detail: `Reach ${level.objective.target.toLocaleString()} points`,
  };
}

export default function LevelIntro({ level, onStart, onCancel }) {
  const objective = objectiveSummary(level);
  const [startBooster, setStartBooster] = useState(null);

  return (
    <div className="result-modal" onClick={onCancel}>
      <motion.div
        className="result-card level-intro-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div className="level-intro-number">Level {level.id}</div>
        <h2 className="level-intro-name">{level.name}</h2>

        <div className="level-intro-objective">
          <span className="level-intro-icon">{objective.icon}</span>
          <div>
            <div className="level-intro-title">{objective.title}</div>
            <div className="level-intro-detail">{objective.detail}</div>
          </div>
        </div>

        <div className="level-intro-stats">
          <div className="level-intro-stat">
            <span className="level-intro-stat-value">{level.moveLimit}</span>
            <span className="level-intro-stat-label">Moves</span>
          </div>
          <div className="level-intro-stat">
            <span className="level-intro-stat-value">
              {level.starThresholds[level.starThresholds.length - 1].toLocaleString()}
            </span>
            <span className="level-intro-stat-label">★★★ Score</span>
          </div>
        </div>

        {/* Candy bombs end the level instantly at zero, so they are announced
            up front rather than discovered by losing to one. */}
        {level.initialBombs > 0 && (
          <div className="level-intro-hazard">
            💣 {level.initialBombs} Candy Bombs · {level.bombTimer} moves
            <span className="level-intro-hazard-note">
              Match them before the timer hits 0!
            </span>
          </div>
        )}

        {/* Pre-game booster: tap to arm, tap again to clear. */}
        <div className="level-intro-boosters">
          <div className="level-intro-boosters-label">ආරම්භක බූස්ටරය (optional)</div>
          <div className="level-intro-booster-row">
            {START_BOOSTERS.map(({ key, icon, label, hint }) => (
              <button
                key={key}
                type="button"
                className={`start-booster ${startBooster === key ? 'armed' : ''}`}
                aria-pressed={startBooster === key}
                onClick={() => setStartBooster((prev) => (prev === key ? null : key))}
                title={hint}
              >
                <span className="start-booster-icon">{icon}</span>
                <span className="start-booster-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="result-actions">
          <button type="button" className="result-retry" onClick={onCancel}>
            සිතියම (Map)
          </button>
          <button type="button" onClick={() => onStart(startBooster)}>
            පටන් ගන්න (Start)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
