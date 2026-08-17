import { SPECIAL } from '../game/board.js';

export default function CandySprite({ color, special, size = 48 }) {
  const isColorBomb = special === SPECIAL.BOMB;
  const isWrapped = special === SPECIAL.WRAPPED;
  const isStripedH = special === SPECIAL.STRIPED_H;
  const isStripedV = special === SPECIAL.STRIPED_V;
  const isJellyFish = special === SPECIAL.JELLY_FISH;

  return (
    <div
      className="candy-sprite-container"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
      ) : (
        /* 3. NORMAL CANDY WITH GLOSSY SVG SHAPES */
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
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.4" />
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#ffffff" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* CANDY SHAPES (Sri Lankan / Classic Motifs) */}
          <g filter="url(#candy-shadow)">
            {color === 'red' && (
              /* Kavum Dome / Heart Shape */
              <path
                d="M30 10 C 15 0, 5 20, 30 52 C 55 20, 45 0, 30 10 Z"
                fill={`url(#grad-${color})`}
              />
            )}

            {color === 'yellow' && (
              /* Kokis Star Shape */
              <path
                d="M30 6 L36 20 L52 20 L38 30 L44 46 L30 36 L16 46 L22 30 L8 20 L24 20 Z"
                fill={`url(#grad-${color})`}
              />
            )}

            {color === 'green' && (
              /* Dodol Diamond Shape */
              <polygon
                points="30,8 50,30 30,52 10,30"
                fill={`url(#grad-${color})`}
              />
            )}

            {color === 'purple' && (
              /* Royal Star Shape */
              <path
                d="M30 8 L35 22 L50 22 L37 31 L42 46 L30 37 L18 46 L23 31 L10 22 L25 22 Z"
                fill={`url(#grad-${color})`}
              />
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
    </div>
  );
}

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
