import { memo, useMemo } from 'react';
import { SPECIAL } from '../game/board.js';

/**
 * Candy silhouettes, one per colour.
 *
 * These were previously a heart, a star, a diamond, a hexagon, a circle and a
 * rounded square — gem and motif shapes, which is why the board read as a jewel
 * game rather than a candy one. The set below is confectionery instead: a jelly
 * bean, a wrapped lozenge, a lemon drop, a square chew, a boiled sweet and a
 * cluster.
 *
 * Shape-coding is the hard constraint. Colour must never be the only channel
 * that separates two candies, so all six outlines stay mutually distinguishable
 * in silhouette alone: elongated-and-tilted, angular-and-wide, asymmetric-point,
 * four-equal-sides, plain-round, scalloped. (The circle moved from purple to
 * blue when purple became the cluster; purple had been given the circle earlier
 * only to stop it duplicating yellow's star, and that star is now gone.)
 *
 * Each is a single path string so the body, the rim shading, the gloss and the
 * stripe overlay can all reuse it — the shading used to be a fixed r=22 circle
 * painted over every shape, which bled outside anything that wasn't round.
 */

// Capsule between two points, so the bean reads as tilted without a transform
// (a transform would have to be repeated on the clipPath to stay in register).
const JELLY_BEAN = 'M27.5 49.5L49.5 27.5A12 12 0 0 0 32.5 10.5L10.5 32.5A12 12 0 0 0 27.5 49.5Z';

// A single closed scalloped outline, not six overlapping circles.
//
// Overlapping circles filled correctly, but the contour stroke follows every
// subpath, so all six internal boundaries showed through and the candy rendered
// as a ring pattern rather than a solid cluster. Tracing only the outer
// silhouette gives one path that both fills and strokes cleanly — and it fills
// the centre for free, which the circle version needed a seventh subpath to do
// (the origin sits outside every petal: centres are 11 out, radius 10).
const CLUSTER = (() => {
  const cx = 30, cy = 30, r = 10, dist = 11;
  // Where two adjacent petals cross, measured out from the centre.
  const R = dist * Math.cos(Math.PI / 6) + Math.sqrt(r * r - (dist / 2) ** 2);
  const vertex = (i) => {
    const a = (Math.PI / 3) * i - Math.PI / 3;
    return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
  };
  const [sx, sy] = vertex(5);
  let d = `M${sx.toFixed(2)} ${sy.toFixed(2)}`;
  for (let i = 0; i < 6; i += 1) {
    const [x, y] = vertex(i);
    d += `A${r} ${r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
})();

const CANDY_SHAPES = {
  red: JELLY_BEAN,
  // Wrapped lozenge — flat top and bottom, points at the sides.
  orange: 'M12 30L21 14L39 14L48 30L39 46L21 46Z',
  // Lemon drop — pinched at the top, round underneath.
  yellow: 'M30 7C36 18 48 24 48 34A18 18 0 1 1 12 34C12 24 24 18 30 7Z',
  // Square chew.
  green: 'M21 12H39A9 9 0 0 1 48 21V39A9 9 0 0 1 39 48H21A9 9 0 0 1 12 39V21A9 9 0 0 1 21 12Z',
  // Boiled sweet.
  blue: 'M9 30A21 21 0 1 1 51 30A21 21 0 1 1 9 30Z',
  purple: CLUSTER,
};

function CandySprite({ color, special, bombTimer, size = 48 }) {
  const isColorBomb = special === SPECIAL.BOMB;
  const isWrapped = special === SPECIAL.WRAPPED;
  const isStripedH = special === SPECIAL.STRIPED_H;
  const isStripedV = special === SPECIAL.STRIPED_V;
  const isJellyFish = special === SPECIAL.JELLY_FISH;
  const isCoconutWheel = special === SPECIAL.COCONUT_WHEEL;
  const isLucky = special === SPECIAL.LUCKY;
  const isSpecial = isColorBomb || isWrapped || isStripedH || isStripedV || isJellyFish || isCoconutWheel || isLucky;

  // Random staggered delay so candies don't all glint at the same time
  const glintDelay = useMemo(() => `${(Math.random() * 6 + 2).toFixed(1)}s`, []);
  const glowColor = isSpecial ? getGlowColor(color, special) : 'transparent';

  return (
    <div
      className={`candy-sprite-container ${isSpecial ? 'candy-special-glow' : 'candy-has-glint'}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '--glint-delay': glintDelay,
        '--glow-color': glowColor,
      }}
    >
      {/* 1. COLOR BOMB SPECIAL CANDY */}
      {isColorBomb ? (
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <defs>
            <radialGradient id="chocoGrad" cx="30" cy="20" r="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5c3d2e" />
              <stop offset="1" stopColor="#2b1810" />
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Main Chocolate Donut Ball */}
          <circle cx="30" cy="30" r="24" fill="url(#chocoGrad)" filter="url(#glow)" />
          {/* Rainbow Sprinkles */}
          <circle cx="20" cy="20" r="3.5" fill="#ff4d6d" />
          <circle cx="38" cy="18" r="3" fill="#ffd93d" />
          <circle cx="30" cy="38" r="3.5" fill="#38bdf8" />
          <circle cx="18" cy="36" r="3" fill="#4ade80" />
          <circle cx="38" cy="36" r="3" fill="#c084fc" />
          <circle cx="30" cy="16" r="2.5" fill="#ffffff" />
          <circle cx="24" cy="28" r="3" fill="#ff9f43" />
        </svg>
      ) : isJellyFish ? (
        /* 2. JELLY FISH CANDY */
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <defs>
            <linearGradient id="fishGrad" x1="10" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="1" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <ellipse cx="30" cy="28" rx="18" ry="14" fill="url(#fishGrad)" />
          {/* Fish Tail */}
          <path d="M45 28 L56 18 L54 28 L56 38 Z" fill="#38bdf8" />
          {/* Eye */}
          <circle cx="20" cy="24" r="3" fill="#ffffff" />
          <circle cx="19" cy="24" r="1.5" fill="#0f172a" />
        </svg>
      ) : isCoconutWheel ? (
        /* 3. COCONUT WHEEL SPECIAL CANDY */
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <defs>
            <radialGradient id="cocoHusk" cx="30" cy="30" r="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8d5b4c" />
              <stop offset="1" stopColor="#4a2e2b" />
            </radialGradient>
            <radialGradient id="cocoFlesh" cx="30" cy="30" r="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset="0.8" stopColor="#f3f4f6" />
              <stop offset="1" stopColor="#d1d5db" />
            </radialGradient>
          </defs>
          {/* Outer Husk Shell */}
          <circle cx="30" cy="30" r="26" fill="url(#cocoHusk)" stroke="#ffb703" strokeWidth="3" />
          {/* Inner White Flesh */}
          <circle cx="30" cy="30" r="18" fill="url(#cocoFlesh)" />
          {/* Center Hole */}
          <circle cx="30" cy="30" r="8" fill="#4a2e2b" />
          {/* Golden Radial Spokes / Speed Lines */}
          <line x1="30" y1="6" x2="30" y2="12" stroke="#ffb703" strokeWidth="3" strokeLinecap="round" />
          <line x1="30" y1="48" x2="30" y2="54" stroke="#ffb703" strokeWidth="3" strokeLinecap="round" />
          <line x1="6" y1="30" x2="12" y2="30" stroke="#ffb703" strokeWidth="3" strokeLinecap="round" />
          <line x1="48" y1="30" x2="54" y2="30" stroke="#ffb703" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : isLucky ? (
        /* 4. LUCKY CANDY SPECIAL ITEM */
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <defs>
            <linearGradient id="luckyGrad" x1="10" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e0f2fe" />
              <stop offset="0.5" stopColor="#38bdf8" />
              <stop offset="1" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          {/* Silver/Blue Holographic Diamond */}
          <polygon points="30,6 52,30 30,54 8,30" fill="url(#luckyGrad)" stroke="#ffffff" strokeWidth="3" />
          {/* Inner Glow Rim */}
          <polygon points="30,12 44,30 30,48 16,30" fill="none" stroke="#e0f2fe" strokeWidth="2" opacity="0.8" />
          {/* Golden Checkmark ✓ */}
          <path d="M22 30 L27 36 L39 20" stroke="#ffd93d" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        /* 5. NORMAL CANDY */
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <defs>
            <radialGradient id={`grad-${color}`} cx="30" cy="20" r="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={getColorLight(color)} />
              <stop offset="50%" stopColor={getColorBase(color)} />
              <stop offset="90%" stopColor={getColorDark(color)} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
            </radialGradient>

            {/* Bright at the top, dark at the bottom — the whole 3D read of a
                hard sweet. Painted through the shape's own clip so it follows
                the silhouette instead of a bounding circle. */}
            <linearGradient id="candy-rim" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="0.42" stopColor="#ffffff" stopOpacity="0.04" />
              <stop offset="0.72" stopColor="#000000" stopOpacity="0.06" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.42" />
            </linearGradient>

            <clipPath id={`clip-${color}`}>
              <path d={CANDY_SHAPES[color]} />
            </clipPath>

            <filter id="candy-shadow" x="-20%" y="-20%" width="140%" height="140%">
              {/* One shadow, not two. Every candy on the board instantiates
                  this filter, and a second chained feDropShadow doubles the
                  offscreen passes for a highlight that is barely perceptible
                  at candy size. */}
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.45" />
            </filter>
          </defs>

          <g filter="url(#candy-shadow)">
            <path d={CANDY_SHAPES[color]} fill={`url(#grad-${color})`} />

            {/* Everything below is clipped to the candy, so a highlight can
                never float outside its own outline. */}
            <g clipPath={`url(#clip-${color})`}>
              <path d={CANDY_SHAPES[color]} fill="url(#candy-rim)" />

              {/* Two-part specular: a soft bloom with a tight hot core sitting
                  inside it. A single ellipse reads as a painted-on white blob. */}
              <ellipse cx="24" cy="17" rx="11" ry="6.5" fill="#ffffff" opacity="0.38" transform="rotate(-22 24 17)" />
              <ellipse cx="22.5" cy="15.5" rx="6" ry="3.1" fill="#ffffff" opacity="0.92" transform="rotate(-22 22.5 15.5)" />

              {/* STRIPED CANDY OVERLAY LINES — inside the clip, so stripes stop
                  at the candy's edge rather than running past it. */}
              {isStripedH && (
                <g stroke="#ffffff" strokeWidth="5" strokeLinecap="butt" opacity="0.9">
                  <line x1="4" y1="20" x2="56" y2="20" />
                  <line x1="4" y1="30" x2="56" y2="30" />
                  <line x1="4" y1="40" x2="56" y2="40" />
                </g>
              )}
              {isStripedV && (
                <g stroke="#ffffff" strokeWidth="5" strokeLinecap="butt" opacity="0.9">
                  <line x1="20" y1="4" x2="20" y2="56" />
                  <line x1="30" y1="4" x2="30" y2="56" />
                  <line x1="40" y1="4" x2="40" y2="56" />
                </g>
              )}
            </g>

            {/* Dark contour. Candy art in this genre is outlined; without it
                adjacent same-hue candies merge into one blob on a busy board. */}
            <path
              d={CANDY_SHAPES[color]}
              fill="none"
              stroke={getColorDark(color)}
              strokeOpacity="0.55"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </g>

          {/* WRAPPED CANDY OVERLAY WRAPPER */}
          {isWrapped && (
            <rect
              x="8"
              y="8"
              width="44"
              height="44"
              rx="8"
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeDasharray="6 4"
              opacity="0.85"
            />
          )}
        </svg>
      )}

      {/* Diagonal Glint Sweep for normal candies */}
      {!isSpecial && (
        <div className="candy-glint-overlay" />
      )}

      {/* Radiant Glow Pulse for special candies */}
      {isSpecial && (
        <div className="candy-glow-ring" />
      )}

      {/* Animated energy shimmer for striped candies */}
      {(isStripedH || isStripedV) && (
        <div className={`candy-stripe-shimmer ${isStripedV ? 'vertical' : ''}`} />
      )}

      {/* Breathing pulse for wrapped candies */}
      {isWrapped && (
        <div className="candy-wrapped-pulse" />
      )}

      {/* CANDY BOMB OVERLAY (Timed Hazard) */}
      {bombTimer !== undefined && (
        <div 
          className={`candy-bomb-overlay ${bombTimer <= 3 ? 'danger-pulse' : ''}`}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 40% 40%, rgba(50,50,50,0.8) 0%, rgba(0,0,0,0.95) 100%)',
            borderRadius: '50%',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)',
            border: bombTimer <= 3 ? '2px solid #ef4444' : '2px solid #333',
            pointerEvents: 'none',
            zIndex: 10,
            animation: bombTimer <= 3 ? 'dangerPulse 0.5s infinite alternate' : 'none',
          }}
        >
          {/* Burning spark fuse effect */}
          <div style={{ position: 'absolute', top: -6, right: 2, fontSize: '14px', animation: 'fuseSpark 0.2s infinite alternate' }}>🔥</div>
          
          {/* Digital Countdown Badge */}
          <div style={{
            background: '#000',
            color: bombTimer <= 3 ? '#ef4444' : '#fff',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: `${size * 0.45}px`,
            padding: '0px 4px',
            borderRadius: '4px',
            border: `1px solid ${bombTimer <= 3 ? '#ef4444' : '#444'}`,
            textShadow: bombTimer <= 3 ? '0 0 5px #ef4444' : 'none',
          }}>
            {bombTimer}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Memoised on purpose. All four props are primitives, and GameBoard holds a lot
 * of frequently-changing state that has nothing to do with the candies —
 * score popups, combo labels, shatter shards, the idle-hint tick. Without this,
 * every one of those updates re-rendered all 64 sprites, each of which builds a
 * sizeable SVG tree with gradients and filters. That work landed squarely on
 * the frames where the player was dragging a candy.
 */
export default memo(CandySprite);

function getColorBase(color) {
  const map = {
    red: '#ff4d6d',
    orange: '#ff9f43',
    yellow: '#ffd93d',
    green: '#4ade80',
    blue: '#38bdf8',
    purple: '#c084fc',
  };
  return map[color] || '#ffffff';
}

function getColorLight(color) {
  const map = {
    red: '#ff758f',
    orange: '#ffb703',
    yellow: '#ffea79',
    green: '#86efac',
    blue: '#7dd3fc',
    purple: '#d8b4fe',
  };
  return map[color] || '#ffffff';
}

function getColorDark(color) {
  const map = {
    red: '#c9184a',
    orange: '#d97706',
    yellow: '#e0a800',
    green: '#16a34a',
    blue: '#0284c7',
    purple: '#9333ea',
  };
  return map[color] || '#000000';
}

function getGlowColor(color, special) {
  if (special === SPECIAL.BOMB) return '#ffd93d';
  if (special === SPECIAL.COCONUT_WHEEL) return '#ffb703';
  if (special === SPECIAL.LUCKY) return '#38bdf8';
  const map = {
    red: '#ff4d6d',
    orange: '#ff9f43',
    yellow: '#ffd93d',
    green: '#4ade80',
    blue: '#38bdf8',
    purple: '#c084fc',
  };
  return map[color] || '#ffffff';
}
