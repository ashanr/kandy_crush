import { describe, it, expect, vi } from 'vitest';
import { ParticleEngine } from './particles.js';

// The renderer parks its requestAnimationFrame loop whenever the engine is
// idle and restarts it on the activity notification. If either half regresses,
// effects either stop drawing entirely or the loop burns a frame forever —
// neither is visible in a unit-less smoke test, hence these.

describe('ParticleEngine idle gating', () => {
  it('starts idle', () => {
    expect(new ParticleEngine().isIdle()).toBe(true);
  });

  it('is not idle while effects are alive', () => {
    const e = new ParticleEngine();
    e.spawnMatchBurst(10, 10, '#fff', 5);
    expect(e.isIdle()).toBe(false);
  });

  it('returns to idle once every effect has decayed', () => {
    const e = new ParticleEngine();
    e.spawnMatchBurst(10, 10, '#fff', 5);
    for (let i = 0; i < 500 && !e.isIdle(); i += 1) e.update();
    expect(e.isIdle()).toBe(true);
  });

  it.each([
    ['spawnMatchBurst', (e) => e.spawnMatchBurst(1, 1, '#fff', 3)],
    ['spawnLaserBeam', (e) => e.spawnLaserBeam(1, 1, 'horizontal', 100, 100, '#fff')],
    ['spawnLightningArc', (e) => e.spawnLightningArc(1, 1, [{ x: 5, y: 5 }], '#fff')],
    ['spawnWrappedShockwave', (e) => e.spawnWrappedShockwave(1, 1, 50, '#fff')],
  ])('%s notifies listeners so a parked loop restarts', (_name, spawn) => {
    const e = new ParticleEngine();
    const listener = vi.fn();
    e.onActivity(listener);
    spawn(e);
    expect(listener).toHaveBeenCalled();
    expect(e.isIdle()).toBe(false);
  });

  it('unsubscribe stops further notifications', () => {
    const e = new ParticleEngine();
    const listener = vi.fn();
    const off = e.onActivity(listener);
    off();
    e.spawnMatchBurst(1, 1, '#fff', 3);
    expect(listener).not.toHaveBeenCalled();
  });

  // Structural guard: adding a new effect collection without extending isIdle()
  // would park the render loop while that effect is still alive, so it would
  // draw for at most one frame and then vanish. `vortexes` was added after the
  // idle gating landed; this catches the next one automatically.
  it('isIdle accounts for every effect collection the engine holds', () => {
    const collections = Object.entries(new ParticleEngine())
      .filter(([, v]) => Array.isArray(v))
      .map(([k]) => k);
    expect(collections.length).toBeGreaterThan(0);
    collections.forEach((key) => {
      const engine = new ParticleEngine();
      engine[key].push({ alpha: 1 });
      expect(engine.isIdle(), `isIdle() ignores this.${key}`).toBe(false);
    });
  });

  it('reset clears every collection the engine holds', () => {
    const engine = new ParticleEngine();
    Object.entries(engine)
      .filter(([, v]) => Array.isArray(v))
      .forEach(([key]) => engine[key].push({ alpha: 1 }));
    engine.reset();
    expect(engine.isIdle()).toBe(true);
  });

  it('reset clears everything back to idle', () => {
    const e = new ParticleEngine();
    e.spawnLaserBeam(1, 1, 'vertical', 100, 100, '#fff');
    e.spawnWrappedShockwave(1, 1, 50, '#fff');
    expect(e.isIdle()).toBe(false);
    e.reset();
    expect(e.isIdle()).toBe(true);
  });
});
