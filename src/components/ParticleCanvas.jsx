import { useEffect, useRef } from 'react';
import { globalParticleEngine } from '../utils/particles.js';

export default function ParticleCanvas({ width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const renderLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      globalParticleEngine.update();
      globalParticleEngine.render(ctx);
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
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
