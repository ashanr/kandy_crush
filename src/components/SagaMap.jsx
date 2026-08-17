import { motion } from 'framer-motion';
import { Lock, Star } from 'lucide-react';
import { LEVELS } from '../data/levels.js';

export default function SagaMap({ progress, onSelectLevel }) {
  return (
    <div className="saga-map">
      <h1 className="saga-title">Candy Saga</h1>
      <div className="saga-path">
        {LEVELS.map((level, idx) => {
          const unlocked = idx === 0 || (progress[LEVELS[idx - 1].id]?.stars ?? 0) > 0;
          const stars = progress[level.id]?.stars ?? 0;
          const bestScore = progress[level.id]?.bestScore ?? 0;
          return (
            <motion.button
              key={level.id}
              type="button"
              className={`level-node ${unlocked ? '' : 'locked'}`}
              disabled={!unlocked}
              onClick={() => unlocked && onSelectLevel(level)}
              whileTap={unlocked ? { scale: 0.92 } : {}}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              {unlocked ? (
                <>
                  <span className="level-number">{level.id}</span>
                  <div className="level-stars">
                    {[1, 2, 3].map((s) => (
                      <Star key={s} size={14} fill={s <= stars ? '#ffd93d' : 'none'} stroke="#ffd93d" />
                    ))}
                  </div>
                  {bestScore > 0 && <span className="level-best">{bestScore}</span>}
                </>
              ) : (
                <Lock size={22} />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
