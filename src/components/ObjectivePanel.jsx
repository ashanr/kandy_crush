/**
 * The level objective, as an icon and a count.
 *
 * It used to be a text pill reading `Jelly: 38` or `Score: 1,240 / 3,000`,
 * which required reading a sentence to answer the only question the player
 * actually has mid-move: how much is left. Both objective types now report the
 * same thing in the same place — the remaining amount, counting down to zero —
 * so "am I close?" is answered by one number regardless of level type.
 *
 * The jelly icon deliberately reuses the exact cyan of `.jelly-overlay` on the
 * board. An icon that doesn't match the tile it represents is just decoration.
 */

const JELLY_FILL = 'rgba(56, 189, 248, 0.45)';
const JELLY_EDGE = 'rgba(56, 189, 248, 0.95)';

function JellyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="objective-icon" aria-hidden="true">
      <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5" fill={JELLY_FILL} stroke={JELLY_EDGE} strokeWidth="2.4" />
      <path d="M6.5 9Q9.5 5.8 13.5 6.6" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="objective-icon" aria-hidden="true">
      <path
        d="M12 2.6l2.9 6.2 6.6.9-4.8 4.7 1.2 6.7L12 17.9 6.1 21.1l1.2-6.7L2.5 9.7l6.6-.9z"
        fill="#ffd93d"
        stroke="#d99e00"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ObjectivePanel({ level, score, jellyRemaining }) {
  const isJelly = level.objective.type === 'jelly';
  // Both types count DOWN to zero, so the number always means "left to do".
  const remaining = isJelly
    ? jellyRemaining
    : Math.max(0, level.objective.target - score);

  return (
    <div className={`hud-panel objective-panel ${remaining === 0 ? 'complete' : ''}`} aria-hidden="true">
      {isJelly ? <JellyIcon /> : <TargetIcon />}
      <span className="hud-panel-value">{remaining.toLocaleString()}</span>
    </div>
  );
}
