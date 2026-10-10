import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  life: number;
  maxLife: number;
  shape: 'square' | 'circle';
}

const COLORS = ['#06b6d4', '#22d3ee', '#a78bfa', '#f97316', '#10b981', '#60a5fa'];

export default function Confetti({
  active,
  duration = 3000,
}: {
  active: boolean;
  duration?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Cria 120 partículas
    const COUNT = 120;
    const particles: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * width * 0.4,
        y: height * 0.3 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 6,
        size: 4 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife: 2000 + Math.random() * 1000,
        shape: Math.random() > 0.5 ? 'square' : 'circle',
      });
    }
    particlesRef.current = particles;
    startRef.current = performance.now();

    let lastTime = performance.now();

    function animate(time: number) {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const elapsed = time - startRef.current;
      if (elapsed > duration) {
        ctx!.clearRect(0, 0, width, height);
        return;
      }

      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.life += dt * 1000;
        p.vy += 800 * dt; // gravity
        p.vx *= 0.99;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed;

        const lifeRatio = 1 - p.life / p.maxLife;
        if (lifeRatio <= 0) continue;

        ctx!.save();
        ctx!.globalAlpha = lifeRatio;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.fillStyle = p.color;

        if (p.shape === 'square') {
          ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx!.fill();
        }

        ctx!.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, width, height);
    };
  }, [active, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      aria-hidden="true"
    />
  );
}