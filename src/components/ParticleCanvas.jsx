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
    // Frames still owed to the trail fade after the engine empties. Without
    // this the loop would park the instant the last particle died and freeze
    // its unfaded trail on screen until the next effect painted over it.
    let fadeFramesLeft = 0;

    const renderLoop = () => {
      // Motion blur: instead of wiping the frame, erase it partially so each
      // particle leaves a decaying trail behind it. `destination-out` subtracts
      // alpha, which is what a transparent overlay canvas needs — painting a
      // translucent black rectangle would tint the board underneath instead.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      globalParticleEngine.update();
      globalParticleEngine.render(ctx);

      if (globalParticleEngine.isIdle()) {
        if (fadeFramesLeft > 0) {
          // Keep fading the leftover trail down to nothing before parking.
          fadeFramesLeft -= 1;
        } else {
          // Fully faded — hard-clear so no faint residue is left behind, then
          // park until something new spawns.
          ctx.clearRect(0, 0, width, height);
          animationFrameId = null;
          return;
        }
      } else {
        // At 0.28 erase per frame the tail is invisible within ~20 frames.
        fadeFramesLeft = 20;
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
