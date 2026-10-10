import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  pulse: number;
}

/**
 * Fundo reativo — partículas sutis que reagem à energia do app.
 * Performance-friendly: 20 partículas, sem overdraw.
 */
export default function ForceFieldBg({
  intensity = 0.5,
  accent = '6, 182, 212',
}: {
  intensity?: number;
  accent?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);

    // Cria 20 partículas
    const PARTICLE_COUNT = 20;
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2.5 + 0.8,
      opacity: Math.random() * 0.4 + 0.15,
      pulse: Math.random() * Math.PI * 2,
    }));

    let lastTime = performance.now();

    function animate(time: number) {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      ctx!.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const intensityMul = 0.5 + intensity * 1.5;

      for (const p of particles) {
        // Movimento
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        // Wrap nas bordas
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Pulse
        p.pulse += dt * 0.8;
        const pulseSize = p.size * (1 + Math.sin(p.pulse) * 0.3);

        // Desenha com glow suave
        const gradient = ctx!.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          pulseSize * 8
        );
        gradient.addColorStop(0, `rgba(${accent}, ${p.opacity * intensityMul})`);
        gradient.addColorStop(1, `rgba(${accent}, 0)`);

        ctx!.fillStyle = gradient;
        ctx!.fillRect(
          p.x - pulseSize * 8,
          p.y - pulseSize * 8,
          pulseSize * 16,
          pulseSize * 16
        );
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [intensity, accent]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
}