// High-performance 2D Canvas Particle Engine

export class ParticleEngine {
  constructor() {
    this.particles = [];
    this.lasers = [];
    this.lightningArcs = [];
    this.shockwaves = [];
    this.vortexes = [];
    this.listeners = new Set();
  }

  // Clear all active effects
  reset() {
    this.particles = [];
    this.lasers = [];
    this.lightningArcs = [];
    this.shockwaves = [];
    this.vortexes = [];
  }

  /** True when there is nothing left to draw. */
  isIdle() {
    return (
      this.particles.length === 0
      && this.lasers.length === 0
      && this.lightningArcs.length === 0
      && this.shockwaves.length === 0
      && this.vortexes.length === 0
    );
  }

  /**
   * Notified whenever effects are spawned, so a renderer can keep its
   * animation loop parked while the engine is idle — which is most of the
   * time, since effects only fire on a match. Returns an unsubscribe fn.
   */
  onActivity(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyActivity() {
    this.listeners.forEach((fn) => fn());
  }

  // 1. Spawn candy shard burst on match
  spawnMatchBurst(x, y, color = '#ffd93d', count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // Slight upward push
        size: 3 + Math.random() * 5,
        color,
        alpha: 1,
        life: 1,
        decay: 0.03 + Math.random() * 0.03,
        gravity: 0.18,
        shape: Math.random() > 0.5 ? 'circle' : 'star',
      });
    }
    this.notifyActivity();
  }

  // 2. Spawn Striped Candy Laser Beam
  spawnLaserBeam(x, y, direction, width, height, color = '#ffffff') {
    this.lasers.push({
      x,
      y,
      direction, // 'horizontal' or 'vertical'
      width,
      height,
      color,
      alpha: 1,
      coreWidth: 12,
      maxCoreWidth: 32,
      life: 1,
      decay: 0.04,
    });

    // Spawn sparks along the laser path
    const sparkCount = 20;
    for (let i = 0; i < sparkCount; i++) {
      const offset = (Math.random() - 0.5) * (direction === 'horizontal' ? width : height);
      const sparkX = direction === 'horizontal' ? x + offset : x;
      const sparkY = direction === 'vertical' ? y + offset : y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x: sparkX,
        y: sparkY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: '#ffffff',
        alpha: 1,
        life: 1,
        decay: 0.05,
        gravity: 0,
        shape: 'spark',
      });
    }
    this.notifyActivity();
  }

  // 3. Spawn Color Bomb Electric Lightning Arcs
  spawnLightningArc(startX, startY, targets, color = '#ffd93d') {
    targets.forEach((target) => {
      this.lightningArcs.push({
        startX,
        startY,
        endX: target.x,
        endY: target.y,
        color,
        alpha: 1,
        life: 1,
        decay: 0.06,
        segments: this.generateLightningPath(startX, startY, target.x, target.y),
      });
    });
    this.notifyActivity();
  }

  // Helper to generate procedural zig-zag lightning points with branching
  generateLightningPath(x1, y1, x2, y2) {
    const points = [{ x: x1, y: y1 }];
    const steps = 8 + Math.floor(Math.random() * 4); // 8-11 steps
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;

    for (let i = 1; i < steps; i++) {
      const jitterX = (Math.random() - 0.5) * 24; // Increased jitter
      const jitterY = (Math.random() - 0.5) * 24;
      points.push({
        x: x1 + dx * i + jitterX,
        y: y1 + dy * i + jitterY,
      });
    }
    points.push({ x: x2, y: y2 });
    return points;
  }

  // 4. Spawn Wrapped Candy Shockwave
  spawnWrappedShockwave(x, y, maxRadius = 120, color = '#c084fc') {
    // Inner shockwave
    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius: maxRadius * 0.8,
      color: '#ffffff',
      alpha: 1,
      decay: 0.08,
      lineWidth: 12,
    });
    // Outer shockwave
    this.shockwaves.push({
      x,
      y,
      radius: 20,
      maxRadius,
      color,
      alpha: 0.8,
      decay: 0.04,
      lineWidth: 6,
    });
    this.spawnMatchBurst(x, y, color, 30); // More particles!
    this.notifyActivity();
  }

  // 5. Jelly clear splatter — translucent cyan glass fragments
  spawnJellySplatter(x, y) {
    const colors = ['#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.6;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.75,
        life: 1,
        decay: 0.04 + Math.random() * 0.02,
        gravity: 0.12,
        shape: Math.random() > 0.4 ? 'star' : 'circle',
      });
    }
    this.notifyActivity();
  }

  // 6. Color Bomb vortex — spiral particles drawing inward
  spawnVortex(cx, cy, duration = 0.4) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dist = 40 + Math.random() * 30;
      this.vortexes.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        cx,
        cy,
        angle,
        dist,
        speed: 0.08 + Math.random() * 0.04,
        size: 2 + Math.random() * 3,
        color: ['#ffd93d', '#ff5da2', '#38bdf8', '#4ade80', '#c084fc'][i % 5],
        alpha: 1,
        life: duration,
        age: 0,
      });
    }
    this.notifyActivity();
  }

  // Update particle physics frame
  update() {
    // Update shards
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    // Update lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.alpha -= l.decay;
      l.coreWidth = Math.min(l.maxCoreWidth, l.coreWidth + 4); // Faster expansion
      if (l.alpha <= 0) this.lasers.splice(i, 1);
    }

    // Update lightning
    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      const arc = this.lightningArcs[i];
      arc.alpha -= arc.decay;
      if (arc.alpha <= 0) this.lightningArcs.splice(i, 1);
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.25;
      sw.alpha -= sw.decay;
      if (sw.alpha <= 0) this.shockwaves.splice(i, 1);
    }

    // Update vortex particles — spiral inward then vanish
    for (let i = this.vortexes.length - 1; i >= 0; i--) {
      const v = this.vortexes[i];
      v.age += 0.016; // ~60fps
      const t = Math.min(1, v.age / v.life);
      v.dist *= (1 - v.speed);
      v.angle += 0.15 + t * 0.3;
      v.x = v.cx + Math.cos(v.angle) * v.dist;
      v.y = v.cy + Math.sin(v.angle) * v.dist;
      v.alpha = 1 - t * 0.5;
      v.size *= 0.985;
      if (v.age >= v.life || v.dist < 2) this.vortexes.splice(i, 1);
    }
  }

  // Render method
  render(ctx) {
    ctx.save();
    
    // Use screen/lighter blend mode for intense glowing effects
    ctx.globalCompositeOperation = 'screen';

    // Render Lasers
    this.lasers.forEach((l) => {
      ctx.globalAlpha = l.alpha;
      
      // Outer glow
      ctx.shadowColor = l.color;
      ctx.shadowBlur = 30;
      ctx.fillStyle = l.color;

      if (l.direction === 'horizontal') {
        // Main colored beam
        ctx.fillRect(0, l.y - l.coreWidth / 2, l.width, l.coreWidth);
        // Inner white hot core
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, l.y - l.coreWidth / 4, l.width, l.coreWidth / 2);
      } else {
        ctx.fillRect(l.x - l.coreWidth / 2, 0, l.coreWidth, l.height);
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(l.x - l.coreWidth / 4, 0, l.coreWidth / 2, l.height);
      }
    });

    // Render Shockwaves
    this.shockwaves.forEach((sw) => {
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Render Lightning Arcs
    this.lightningArcs.forEach((arc) => {
      if (arc.segments.length < 2) return;
      ctx.globalAlpha = arc.alpha;
      
      // Outer colored aura
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 6;
      ctx.shadowColor = arc.color;
      ctx.shadowBlur = 25;
      
      ctx.beginPath();
      ctx.moveTo(arc.segments[0].x, arc.segments[0].y);
      for (let i = 1; i < arc.segments.length; i++) {
        ctx.lineTo(arc.segments[i].x, arc.segments[i].y);
      }
      ctx.stroke();

      // Core white bolt
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.stroke();
    });

    // Render Shard Particles
    ctx.globalCompositeOperation = 'source-over'; // Normal blending for solid shards
    this.particles.forEach((p) => {
      ctx.globalAlpha = p.alpha;
      
      if (p.shape === 'spark') {
        // Sparks glow intensely
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
      } else {
        // Candy shards are solid and cast a small shadow
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = p.color;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
      }

      ctx.beginPath();
      if (p.shape === 'star') {
        ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
      
      // Reset shadows for next loop to avoid carrying over
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    });

    // Render vortex particles
    ctx.globalCompositeOperation = 'screen';
    this.vortexes.forEach((v) => {
      ctx.globalAlpha = v.alpha;
      ctx.fillStyle = v.color;
      ctx.shadowColor = v.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}

export const globalParticleEngine = new ParticleEngine();

