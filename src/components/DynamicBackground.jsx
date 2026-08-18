import { useEffect, useRef } from 'react';

/**
 * LEVEL THEMES — each level gets a unique background atmosphere.
 * Themes define gradient colors, floating element emojis, and ambient particle colors.
 *
 * Exported so the Saga Map can build its scrolling "zone" gradient from the
 * same palette — each stretch of the world map then previews the backdrop of
 * the level it leads to, and adding a level keeps the two in step for free.
 */
export const THEMES = {
  1: {
    name: 'Sugar Patch',
    gradient: ['#4a1466', '#2b0a3d', '#1a0525'],
    accentGlow: 'rgba(255, 93, 162, 0.15)',
    floaters: ['🍬', '🍭', '✨'],
    particleColor: '#ff5da2',
  },
  2: {
    name: 'Gumdrop Grove',
    gradient: ['#064e3b', '#022c22', '#012018'],
    accentGlow: 'rgba(74, 222, 128, 0.12)',
    floaters: ['🌿', '🍃', '🟢'],
    particleColor: '#4ade80',
  },
  3: {
    name: 'Jelly Jungle',
    gradient: ['#0c4a6e', '#082f49', '#051e31'],
    accentGlow: 'rgba(56, 189, 248, 0.15)',
    floaters: ['🫧', '💧', '🪼'],
    particleColor: '#38bdf8',
  },
  4: {
    name: 'Lollipop Lane',
    gradient: ['#7c2d12', '#431407', '#2a0d05'],
    accentGlow: 'rgba(255, 159, 67, 0.15)',
    floaters: ['🍭', '🍩', '🧁'],
    particleColor: '#ff9f43',
  },
  5: {
    name: 'Chocolate Chasm',
    gradient: ['#44403c', '#292524', '#1c1917'],
    accentGlow: 'rgba(192, 132, 252, 0.12)',
    floaters: ['🍫', '🌑', '💜'],
    particleColor: '#c084fc',
  },
  6: {
    name: 'Peppermint Peaks',
    gradient: ['#155e75', '#0e7490', '#083344'],
    accentGlow: 'rgba(224, 242, 254, 0.16)',
    floaters: ['❄️', '🍬', '🤍'],
    particleColor: '#e0f2fe',
  },
  7: {
    name: 'Bubblegum Bay',
    gradient: ['#9d174d', '#831843', '#500724'],
    accentGlow: 'rgba(244, 114, 182, 0.18)',
    floaters: ['🫧', '💗', '🍥'],
    particleColor: '#f472b6',
  },
  8: {
    name: 'Caramel Canyon',
    gradient: ['#78350f', '#451a03', '#2b1002'],
    accentGlow: 'rgba(251, 191, 36, 0.16)',
    floaters: ['🍯', '🏜️', '🟠'],
    particleColor: '#fbbf24',
  },
  9: {
    name: 'Marshmallow Marsh',
    gradient: ['#3b0764', '#2e1065', '#1a0733'],
    accentGlow: 'rgba(167, 139, 250, 0.16)',
    floaters: ['☁️', '🍡', '🌫️'],
    particleColor: '#a78bfa',
  },
  10: {
    name: 'Rainbow Summit',
    gradient: ['#4c1d95', '#1e1b4b', '#0f0a2e'],
    accentGlow: 'rgba(103, 232, 249, 0.2)',
    floaters: ['🌈', '⭐', '👑'],
    particleColor: '#67e8f9',
  },
};

const DEFAULT_THEME = THEMES[1];

// Ambient floating particle
class FloatingParticle {
  constructor(canvasW, canvasH) {
    this.reset(canvasW, canvasH, true);
  }

  reset(canvasW, canvasH, randomY = false) {
    this.x = Math.random() * canvasW;
    this.y = randomY ? Math.random() * canvasH : canvasH + 10;
    this.size = 1 + Math.random() * 3;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = -(0.2 + Math.random() * 0.5);
    this.opacity = 0.15 + Math.random() * 0.35;
    this.life = 0;
    this.maxLife = 300 + Math.random() * 400;
  }

  update(canvasW, canvasH) {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life++;
    if (this.life > this.maxLife || this.y < -10) {
      this.reset(canvasW, canvasH);
    }
  }
}

export default function DynamicBackground({ levelId }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const themeRef = useRef(THEMES[levelId] || DEFAULT_THEME);

  // Update theme when level changes
  useEffect(() => {
    themeRef.current = THEMES[levelId] || DEFAULT_THEME;
  }, [levelId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize ambient particles
    particlesRef.current = Array.from(
      { length: 40 },
      () => new FloatingParticle(canvas.width, canvas.height)
    );

    let raf;
    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const theme = themeRef.current;

      // --- Draw gradient background ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, theme.gradient[0]);
      grad.addColorStop(0.5, theme.gradient[1]);
      grad.addColorStop(1, theme.gradient[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // --- Accent glow orbs ---
      ctx.globalCompositeOperation = 'screen';

      // Bottom-left glow
      const g1 = ctx.createRadialGradient(w * 0.15, h * 0.85, 0, w * 0.15, h * 0.85, w * 0.45);
      g1.addColorStop(0, theme.accentGlow);
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      // Top-right glow
      const g2 = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, w * 0.4);
      g2.addColorStop(0, theme.accentGlow);
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // --- Floating ambient dots ---
      particlesRef.current.forEach((p) => {
        p.update(w, h);
        const fadeIn = Math.min(p.life / 40, 1);
        const fadeOut = Math.max(1 - p.life / p.maxLife, 0);
        const alpha = p.opacity * fadeIn * fadeOut;

        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = theme.particleColor;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // Soft glow around each dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = theme.particleColor;
        ctx.globalAlpha = alpha * 0.15;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const theme = THEMES[levelId] || DEFAULT_THEME;

  return (
    <>
      {/* Canvas for gradient + ambient particles */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: -2,
          pointerEvents: 'none',
        }}
      />

      {/* Floating emoji elements (CSS animated) */}
      <div className="theme-floaters">
        {theme.floaters.map((emoji, i) =>
          Array.from({ length: 3 }, (_, j) => (
            <span
              key={`${i}-${j}`}
              className="theme-floater"
              style={{
                '--float-delay': `${(i * 3 + j) * 2.5}s`,
                '--float-duration': `${18 + j * 8}s`,
                '--float-x': `${10 + (i * 30 + j * 15) % 80}%`,
                '--float-size': `${1.5 + j * 0.8}rem`,
              }}
            >
              {emoji}
            </span>
          ))
        )}
      </div>
    </>
  );
}
