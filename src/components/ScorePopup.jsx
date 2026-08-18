import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Floating "+240" that drifts up off a cleared match.
 *
 * The board already had particles and a catchphrase banner, but nothing tied a
 * number to the move that earned it — so a 3-match and a wrapped+striped combo
 * looked equally rewarding while differing by an order of magnitude in points.
 * This is the feedback channel that teaches which moves are worth making.
 *
 * Positioned in grid padding-box coordinates, the same space the particle
 * canvas and shatter overlay use (see src/utils/gridGeometry.js).
 */
export default function ScorePopup({ x, y, points, big, onComplete }) {
  // Every popup used the identical straight-up path, so overlapping ones during
  // a cascade stacked into an unreadable column. Each gets its own arc: a
  // sideways drift, a rise height, a slight tilt, and a duration — sampled once
  // per instance so the motion stays stable across re-renders.
  const arc = useMemo(() => {
    const drift = (Math.random() - 0.5) * 56;
    return {
      drift,
      // Peak of the arc leans the way it drifts, so the path curves.
      midDrift: drift * 0.45,
      rise: -(38 + Math.random() * 26),
      peak: -(52 + Math.random() * 22),
      tilt: (Math.random() - 0.5) * 22,
      duration: 0.9 + Math.random() * 0.35,
    };
  }, []);

  return (
    <motion.div
      className={`score-popup ${big ? 'big' : ''}`}
      style={{ left: x, top: y }}
      initial={{ opacity: 0, x: 0, y: 0, scale: 0.5, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        // Overshoot past the resting height and settle back for a lobbed feel.
        x: [0, arc.midDrift, arc.drift],
        y: [0, arc.peak, arc.rise],
        scale: [0.5, 1.15, 1, 0.95],
        rotate: [0, arc.tilt, arc.tilt * 0.6],
      }}
      transition={{ duration: arc.duration, times: [0, 0.2, 0.7, 1], ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      +{points.toLocaleString()}
    </motion.div>
  );
}
