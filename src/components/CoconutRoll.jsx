import { motion } from 'framer-motion';
import CandySprite from './CandySprite.jsx';
import { SPECIAL } from '../game/board.js';

/**
 * The Coconut Wheel physically rolling across the board.
 *
 * The engine resolves the wheel's 3-cell travel and its perpendicular lasers in
 * a single step, so the swap used to read as an instant board-wide clear with
 * no visible cause. This overlays the travel itself: the wheel rolls from its
 * start cell to the far end of its path, spinning in the direction of motion,
 * and only then do the lasers fire.
 *
 * Positioned in grid padding-box coordinates, the same space the particle
 * canvas and shatter overlay use (see src/utils/gridGeometry.js).
 */
export default function CoconutRoll({ from, to, size, durationMs, onComplete }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Roll direction: a wheel travelling right spins clockwise. Vertical travel
  // is treated the same way so the spin never looks like it is sliding.
  const spin = (dx !== 0 ? Math.sign(dx) : Math.sign(dy)) * 540;

  return (
    <motion.div
      className="coconut-roll"
      style={{ left: from.x, top: from.y, width: size, height: size }}
      initial={{ x: 0, y: 0, rotate: 0, scale: 1 }}
      animate={{ x: dx, y: dy, rotate: spin, scale: [1, 1.15, 1] }}
      transition={{ duration: durationMs / 1000, ease: [0.34, 0.9, 0.5, 1] }}
      onAnimationComplete={onComplete}
      aria-hidden="true"
    >
      <CandySprite color="brown" special={SPECIAL.COCONUT_WHEEL} size={size} />
    </motion.div>
  );
}
