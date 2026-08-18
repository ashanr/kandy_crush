import { useEffect, useRef } from 'react';
import { globalParticleEngine } from '../utils/particles.js';

/**
 * Overlay canvas for the particle engine.
 *
 * `width`/`height` are CSS pixels and must match the padding box of the grid
 * this sits inside (an absolutely-positioned child is laid out against its
 * ancestor's padding box, so `clientWidth`/`clientHeight` are the right
 * source — not `getBoundingClientRect()`, which includes the border).
 *
 * The backing buffer is scaled by devicePixelRatio so particles stay sharp on
 * phone screens; all drawing still happens in CSS-pixel coordinates.
 */
export default function ParticleCanvas({ width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return undefined;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The loop only runs while the engine actually has something to draw.
    // It used to run unconditionally for as long as the board was mounted,
    // clearing and re-rendering an empty canvas 60 times a second — on a 3x
    // DPR phone that is a 1200x1200 buffer being cleared to draw nothing, for
    // the entire time the player is looking at the board. Effects only fire on
    // a match, so the idle case is the common one.
    let animationFrameId = null;

    const renderLoop = () => {
      // Clear in CSS-pixel space — the transform above already maps to the
      // scaled buffer.
      ctx.clearRect(0, 0, width, height);
      globalParticleEngine.update();
      globalParticleEngine.render(ctx);

      if (globalParticleEngine.isIdle()) {
        // Last effect just expired. The clear above already wiped the frame,
        // so park until something new spawns.
        animationFrameId = null;
        return;
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    const start = () => {
      if (animationFrameId === null) animationFrameId = requestAnimationFrame(renderLoop);
    };

    const unsubscribe = globalParticleEngine.onActivity(start);
    if (!globalParticleEngine.isIdle()) start();

    return () => {
      unsubscribe();
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        zIndex: 20,
      }}
    />
  );
}
