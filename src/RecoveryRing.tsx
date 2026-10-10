import { useEffect, useState } from 'react';

export default function RecoveryRing({
  score,
  size = 120,
  strokeWidth = 8,
  label,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = animated;
    const to = score;

    function step(time: number) {
      const elapsed = time - start;
      const t = Math.min(1, elapsed / 900);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimated(from + (to - from) * ease);
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;

  const color =
    score >= 90 ? '#10b981' : score >= 60 ? '#f97316' : '#ef4444';
  const glow = `${color}40`;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress com glow */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 8px ${glow})`,
            transition: 'none',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-3xl font-bold font-mono-ui"
          style={{ color }}
        >
          {Math.round(animated)}
        </div>
        {label && (
          <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mt-1">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}