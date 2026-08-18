import { motion } from 'framer-motion';
import { BANNER, getAnnouncement } from '../utils/announcer.js';

// The words come from announcer.js so the floating label and the spoken banner
// cannot say different things about the same move. They used to: the label had
// its own four-word ladder ending in "Sugar Crush!", so a 3-cascade floated
// "Divine!" over the board while the announcer said "Delicious!". Only the
// styling is decided here.
const TIER_CLASS = {
  [BANNER.sweet]: 'sweet',
  [BANNER.tasty]: 'tasty',
  [BANNER.delicious]: 'divine',
  [BANNER.divine]: 'sugar-crush-label',
};

/**
 * Determine the combo tier from cascade depth and special candy involvement.
 * Returns null for plain single matches — only interesting moves get praised.
 */
export function getComboTier(cascadeCount, specialCount) {
  // A plain single match is not worth a label, but it is still worth a voice
  // line, so this threshold lives here rather than in getAnnouncement.
  if (specialCount < 1 && cascadeCount < 2) return null;

  const { banner } = getAnnouncement({ specialCount, cascadeCount });
  return { label: banner, className: TIER_CLASS[banner] };
}

/**
 * Floating combo reaction label ("Sweet!", "Tasty!", "Delicious!", "Divine!").
 *
 * These give the player immediate language-level feedback on how good a move
 * was — a 4-cascade is objectively better than a single match, but without
 * a word on screen both look equally "fine". The escalating labels teach
 * which patterns to chase.
 */
export default function ComboLabel({ x, y, tier, onComplete }) {
  return (
    <motion.div
      className={`combo-label ${tier.className}`}
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.3, y: 0 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.4, 1.1, 0.9], y: -65 }}
      transition={{ duration: 1.3, times: [0, 0.15, 0.55, 1], ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      {tier.label}
    </motion.div>
  );
}
