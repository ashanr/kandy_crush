import { motion } from 'framer-motion';

/**
 * Score bar with star-tier markers.
 *
 * The star thresholds are calibrated so all three tiers are reachable, but
 * nothing in the UI communicated them — the HUD showed a bare "Score: 1234"
 * and the player had no way to know that, say, 6500 is two stars. This makes
 * the tiers visible while playing, which is what makes chasing them meaningful.
 */
export default function StarProgress({ score, thresholds }) {
  const max = thresholds[thresholds.length - 1];
  const fillPct = Math.min(100, (score / max) * 100);

  return (
    <div className="star-progress" aria-hidden="true">
      <div className="star-progress-track">
        <motion.div
          className="star-progress-fill"
          animate={{ width: `${fillPct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        {thresholds.map((threshold, i) => {
          const earned = score >= threshold;
          return (
            <div
              key={threshold}
              className={`star-marker ${earned ? 'earned' : ''}`}
              // Last marker sits exactly at 100%, so nudge it inside the track.
              style={{ left: `calc(${(threshold / max) * 100}% - ${i === thresholds.length - 1 ? 16 : 8}px)` }}
            >
              ★
            </div>
          );
        })}
      </div>
    </div>
  );
}
