import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SugarCrush — The ultimate win celebration sequence.
 * 
 * Phase 1 (0–1.2s):  "SUGAR CRUSH!" text slams in with screen shake
 * Phase 2 (0.8–3s):  Confetti & firework bursts from a canvas
 * Phase 3 (3s+):     Calls onComplete to show the result modal
 */

const CONFETTI_COUNT = 120;
const FIREWORK_COUNT = 5;

const CONFETTI_COLORS = [
  '#ff4d6d', '#ff9f43', '#ffd93d', '#4ade80', '#38bdf8', '#c084fc',
  '#ffffff', '#f472b6', '#a78bfa', '#67e8f9',
];

class ConfettiPiece {
  constructor(w, h) {
    this.x = w / 2 + (Math.random() - 0.5) * w * 0.3;
    this.y = h + 10;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = -(8 + Math.random() * 12);
    this.gravity = 0.15 + Math.random() * 0.08;
    this.rotation = Math.random() * 360;
    this.rotSpeed = (Math.random() - 0.5) * 15;
    this.size = 4 + Math.random() * 6;
    this.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
    this.opacity = 1;
    this.drag = 0.98;
  }

  update() {
    this.vy += this.gravity;
    this.vx *= this.drag;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
    if (this.vy > 0) {
      this.opacity = Math.max(0, this.opacity - 0.008);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    if (this.shape === 'rect') {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class FireworkBurst {
  constructor(w, h, delay) {
    this.x = w * 0.2 + Math.random() * w * 0.6;
    this.y = h * 0.15 + Math.random() * h * 0.35;
    this.delay = delay;
    this.life = 0;
    this.maxLife = 60;
    this.sparks = [];
    const sparkCount = 30 + Math.floor(Math.random() * 20);
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.3;
      const speed = 2 + Math.random() * 4;
      this.sparks.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 1.5 + Math.random() * 2,
      });
    }
  }

  update() {
    if (this.delay > 0) { this.delay--; return; }
    this.life++;
    this.sparks.forEach((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.06;
      s.vx *= 0.98;
      s.size *= 0.985;
    });
  }

  draw(ctx) {
    if (this.delay > 0) return;
    const alpha = Math.max(0, 1 - this.life / this.maxLife);
    this.sparks.forEach((s) => {
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'screen';
      // Glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha * 0.2;
      ctx.fill();
      // Core
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  isDead() {
    return this.delay <= 0 && this.life > this.maxLife;
  }
}

export default function SugarCrush({ bonus, onComplete }) {
  const canvasRef = useRef(null);
  const [showText, setShowText] = useState(true);
  const [shaking, setShaking] = useState(true);

  useEffect(() => {
    // Stop screen-shake after 1s
    const shakeTimer = setTimeout(() => setShaking(false), 1000);
    // Fade text after 2s
    const textTimer = setTimeout(() => setShowText(false), 2200);
    // Signal completion after 3.5s
    const doneTimer = setTimeout(() => onComplete?.(), 3500);

    return () => {
      clearTimeout(shakeTimer);
      clearTimeout(textTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  // Canvas confetti + fireworks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn confetti in 3 staggered bursts
    const confetti = [];
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        for (let i = 0; i < CONFETTI_COUNT / 3; i++) {
          confetti.push(new ConfettiPiece(canvas.width, canvas.height));
        }
      }, wave * 400);
    }

    // Spawn firework bursts
    const fireworks = [];
    for (let i = 0; i < FIREWORK_COUNT; i++) {
      fireworks.push(new FireworkBurst(canvas.width, canvas.height, i * 18));
    }

    let raf;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      confetti.forEach((c) => {
        c.update();
        c.draw(ctx);
      });

      fireworks.forEach((f) => {
        f.update();
        f.draw(ctx);
      });

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`sugar-crush-overlay ${shaking ? 'screen-shake' : ''}`}>
      {/* Confetti + Fireworks Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 50,
        }}
      />

      {/* SUGAR CRUSH! Text */}
      <AnimatePresence>
        {showText && (
          <motion.div
            className="sugar-crush-text"
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1], rotate: [-20, 5, 0], opacity: 1 }}
            exit={{ scale: 2, opacity: 0, filter: 'blur(12px)' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <span className="sugar-line-1">SUGAR</span>
            <span className="sugar-line-2">CRUSH!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leftover moves are cashed in as bonus points. Showing the arithmetic
          is the point — a silently larger score teaches the player nothing
          about why finishing early was worth doing. */}
      {bonus?.moves > 0 && (
        <motion.div
          className="sugar-crush-bonus"
          initial={{ opacity: 0, y: 30, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.9, type: 'spring', stiffness: 220, damping: 18 }}
        >
          <span className="sugar-bonus-moves">
            {bonus.moves} moves left
          </span>
          <span className="sugar-bonus-points">+{bonus.bonus.toLocaleString()}</span>
        </motion.div>
      )}
    </div>
  );
}
