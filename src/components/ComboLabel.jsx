import { motion } from 'framer-motion';

const COMBO_TIERS = [
  { min: 1, label: 'Sweet!', className: 'sweet' },
  { min: 2, label: 'Tasty!', className: 'tasty' },
  { min: 3, label: 'Divine!', className: 'divine' },
  { min: 4, label: 'Sugar Crush!', className: 'sugar-crush-label' },
];

/**
 * Determine the combo tier from cascade depth and special candy involvement.
 * Returns null for plain single matches — only interesting moves get praised.
 */
export function getComboTier(cascadeCount, specialCount) {
  if (specialCount >= 2) return COMBO_TIERS[3];
  if (cascadeCount >= 4) return COMBO_TIERS[3];
  if (cascadeCount >= 3) return COMBO_TIERS[2];
  if (cascadeCount >= 2) return COMBO_TIERS[1];
  if (specialCount >= 1) return COMBO_TIERS[0];
  return null;
}

/**
 * Floating combo reaction label ("Sweet!", "Tasty!", "Divine!").
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
