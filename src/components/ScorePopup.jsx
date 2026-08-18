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
  return (
    <motion.div
      className={`score-popup ${big ? 'big' : ''}`}
      style={{ left: x, top: y }}
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: -46, scale: [0.5, 1.15, 1, 0.95] }}
      transition={{ duration: 1, times: [0, 0.2, 0.7, 1], ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      +{points.toLocaleString()}
    </motion.div>
  );
}
