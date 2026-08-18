import { memo, useMemo } from 'react';
import { SPECIAL } from '../game/board.js';

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
        /* 5. NORMAL CANDY WITH GLOSSY SVG SHAPES */
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <defs>
            {/* Color Gradients */}
            <radialGradient id={`grad-${color}`} cx="30" cy="20" r="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={getColorLight(color)} />
              <stop offset="50%" stopColor={getColorBase(color)} />
              <stop offset="90%" stopColor={getColorDark(color)} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
            </radialGradient>

            {/* Inner Gloss Overlay - Top Highlight */}
            <linearGradient id="gloss-top" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="0.4" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            
            {/* Inner Shadow Overlay - Bottom Edge */}
            <linearGradient id="shadow-bottom" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#000000" stopOpacity="0" />
              <stop offset="0.6" stopColor="#000000" stopOpacity="0.1" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.6" />
            </linearGradient>

            <filter id="candy-shadow" x="-20%" y="-20%" width="140%" height="140%">
              {/* One shadow, not two. Every candy on the board instantiates
                  this filter, and a second chained feDropShadow doubles the
                  offscreen passes for a highlight that is barely perceptible
                  at candy size. */}
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* CANDY SHAPES — one silhouette per colour, see shape-coding note below */}
          <g filter="url(#candy-shadow)">
            {color === 'red' && (
              /* Heart / dome */
              <path
                d="M30 10 C 15 0, 5 20, 30 52 C 55 20, 45 0, 30 10 Z"
                fill={`url(#grad-${color})`}
              />
            )}

            {color === 'yellow' && (
              /* Star */
              <path
                d="M30 6 L36 20 L52 20 L38 30 L44 46 L30 36 L16 46 L22 30 L8 20 L24 20 Z"
                fill={`url(#grad-${color})`}
              />
            )}

            {color === 'green' && (
              /* Diamond */
              <polygon
                points="30,8 50,30 30,52 10,30"
                fill={`url(#grad-${color})`}
              />
            )}

            {color === 'purple' && (
              /* Ball — a round sweet.
                 Purple used to be a 10-vertex "royal star", virtually the same
                 silhouette as yellow's star. Shape-coding only helps
                 colorblind players if the shapes are actually distinguishable,
                 and those two were separable by hue alone — exactly the channel
                 the coding exists to back up. A circle shares its outline with
                 nothing else on the board. */
              <>
                <circle cx="30" cy="30" r="21" fill={`url(#grad-${color})`} />
                {/* Faint swirl so it reads as a sweet rather than a plain dot. */}
                <path
                  d="M20 32 Q 26 20, 34 26 T 41 32"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.35"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </>
            )}

            {color === 'blue' && (
              /* Ocean Hexagon Shape */
              <polygon
                points="30,8 48,18 48,42 30,52 12,42 12,18"
                fill={`url(#grad-${color})`}
              />
            )}

            {color === 'orange' && (
              /* Mango Rounded Square */
              <rect
                x="12"
                y="12"
                width="36"
                height="36"
                rx="10"
                fill={`url(#grad-${color})`}
              />
            )}
            
            {/* Top Highlight & Bottom Shadow Layers (applied to bounding box) */}
            <circle cx="30" cy="30" r="22" fill="url(#shadow-bottom)" />
            <circle cx="30" cy="30" r="22" fill="url(#gloss-top)" style={{ mixBlendMode: 'overlay' }} />
          </g>

          {/* Intense Gloss Sheen Reflection */}
          <ellipse cx="22" cy="16" rx="10" ry="4" fill="#ffffff" opacity="0.8" transform="rotate(-20 22 16)" filter="blur(1px)" />
          <ellipse cx="22" cy="16" rx="6" ry="2" fill="#ffffff" opacity="1" transform="rotate(-20 22 16)" />

          {/* STRIPED CANDY OVERLAY LINES */}
          {isStripedH && (
            <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.9">
              <line x1="12" y1="20" x2="48" y2="20" />
              <line x1="10" y1="30" x2="50" y2="30" />
              <line x1="12" y1="40" x2="48" y2="40" />
            </g>
          )}
          {isStripedV && (
            <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.9">
              <line x1="20" y1="12" x2="20" y2="48" />
              <line x1="30" y1="10" x2="30" y2="50" />
              <line x1="40" y1="12" x2="40" y2="48" />
            </g>
          )}

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
    purple: '#e9d5ff',
  };
  return map[color] || '#ffffff';
}

function getColorDark(color) {
  const map = {
    red: '#c9184a',
    orange: '#e056fd',
    yellow: '#d4a373',
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
