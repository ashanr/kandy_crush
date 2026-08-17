import { motion } from 'framer-motion';

/**
 * CandyShatter renders animated shatter shard pieces at a given grid position.
 * Each shard is a small colored fragment that bursts outward with random velocity,
 * rotation, and fading opacity — simulating candy breaking apart.
 */
const SHARD_COUNT = 6;

function generateShards(color) {
  const shards = [];
  for (let i = 0; i < SHARD_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / SHARD_COUNT + (Math.random() - 0.5) * 0.5;
    const distance = 30 + Math.random() * 40;
    const size = 4 + Math.random() * 6;
    const rotation = Math.random() * 360;
    shards.push({
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size,
      rotation,
      delay: Math.random() * 0.05,
    });
  }
  return shards;
}

const COLOR_MAP = {
  red: '#ff4d6d',
  orange: '#ff9f43',
  yellow: '#ffd93d',
  green: '#4ade80',
  blue: '#38bdf8',
  purple: '#c084fc',
};

export default function CandyShatter({ color, gridX, gridY, cellW, cellH, onComplete }) {
  const shards = generateShards(color);
  const baseColor = COLOR_MAP[color] || '#ffffff';

  // Position at the center of the cell
  const cx = gridX * cellW + cellW / 2;
  const cy = gridY * cellH + cellH / 2;

  return (
    <div
      style={{
        position: 'absolute',
        left: cx,
        top: cy,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 15,
      }}
    >
      {/* Central flash burst */}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
        style={{
          position: 'absolute',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${baseColor}, transparent)`,
          transform: 'translate(-50%, -50%)',
          filter: `blur(2px)`,
        }}
      />

      {/* Flying shards */}
      {shards.map((shard) => (
        <motion.div
          key={shard.id}
          initial={{
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1.2,
            rotate: 0,
          }}
          animate={{
            x: shard.x,
            y: shard.y,
            opacity: 0,
            scale: 0.2,
            rotate: shard.rotation,
          }}
          transition={{
            duration: 0.4 + Math.random() * 0.15,
            ease: 'easeOut',
            delay: shard.delay,
          }}
          style={{
            position: 'absolute',
            width: shard.size,
            height: shard.size,
            borderRadius: shard.id % 2 === 0 ? '2px' : '50%',
            background: baseColor,
            boxShadow: `0 0 6px ${baseColor}`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}
