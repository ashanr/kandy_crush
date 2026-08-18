import { memo } from 'react';
import { BLOCKER } from '../game/board.js';

/**
 * Licorice swirls and chocolate blocks.
 *
 * Deliberately flat and desaturated next to the glossy candies: a blocker is
 * an obstacle, and it should read as "not a candy" at a glance rather than as
 * another colour to try matching. Neither carries the gloss sweep or the
 * special-candy glow.
 */
function BlockerSprite({ kind, size = 48 }) {
  if (kind === BLOCKER.CHOCOLATE) {
    return (
      <div className="blocker-sprite chocolate" style={{ width: size, height: size }} aria-hidden="true">
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <defs>
            <linearGradient id="chocoBlock" x1="10" y1="8" x2="50" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6b4226" />
              <stop offset="0.55" stopColor="#4a2c18" />
              <stop offset="1" stopColor="#2e1a0e" />
            </linearGradient>
          </defs>
          <rect x="5" y="5" width="50" height="50" rx="7" fill="url(#chocoBlock)" />
          {/* Moulded squares — the silhouette that says "chocolate bar". */}
          <g stroke="#241108" strokeWidth="2.5" opacity="0.85">
            <line x1="30" y1="7" x2="30" y2="53" />
            <line x1="7" y1="30" x2="53" y2="30" />
          </g>
          <g fill="#ffffff" opacity="0.12">
            <rect x="9" y="9" width="17" height="17" rx="3" />
            <rect x="34" y="34" width="17" height="17" rx="3" />
          </g>
          <rect x="5" y="5" width="50" height="50" rx="7" fill="none" stroke="#1b0d06" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // Licorice swirl
  return (
    <div className="blocker-sprite licorice" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
        <defs>
          <radialGradient id="licoriceBody" cx="24" cy="22" r="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3f3f46" />
            <stop offset="1" stopColor="#18181b" />
          </radialGradient>
        </defs>
        <circle cx="30" cy="30" r="23" fill="url(#licoriceBody)" />
        {/* Coiled rope, the shape the beam can't get through. */}
        <path
          d="M30 12 A 18 18 0 1 1 29.9 12 M30 19 A 11 11 0 1 0 30.1 19 M30 26 A 4.5 4.5 0 1 1 29.9 26"
          fill="none"
          stroke="#a1a1aa"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.75"
        />
        <circle cx="30" cy="30" r="23" fill="none" stroke="#09090b" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

export default memo(BlockerSprite);
