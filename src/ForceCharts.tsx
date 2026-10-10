import { useEffect, useRef } from 'react';

/* ══════════════════════════════════════════════════════════
   FORCE CHARTS — gráficos customizados com canvas
   ══════════════════════════════════════════════════════════ */

interface Point {
  label: string;
  value: number;
}

/* ────────── Sparkline (linha fininha em card) ────────── */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#06b6d4',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return [x, y];
  });

  const pathD = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ────────── Line Chart com gradiente + pulse ────────── */
export function ForceLineChart({
  data,
  height = 220,
  color = '#06b6d4',
  colorSecondary,
  formatValue = (v: number) => String(v),
  title,
}: {
  data: { label: string; value: number; value2?: number }[];
  height?: number;
  color?: string;
  colorSecondary?: string;
  formatValue?: (v: number) => string;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas!.clientWidth;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      if (data.length === 0) return;
      const padding = { top: 20, right: 16, bottom: 32, left: 36 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const values = data.map((d) => d.value);
      const allValues = [
        ...values,
        ...data.filter((d) => d.value2 !== undefined).map((d) => d.value2!),
      ];
      const minV = Math.min(...allValues);
      const maxV = Math.max(...allValues);
      const range = maxV - minV || 1;

      ctx!.clearRect(0, 0, width, height);

      // Grid horizontal
      ctx!.strokeStyle = 'rgba(24, 35, 58, 0.6)';
      ctx!.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx!.beginPath();
        ctx!.moveTo(padding.left, y);
        ctx!.lineTo(width - padding.right, y);
        ctx!.stroke();
      }

      // Converte ponto → coordenada
      function toPoint(i: number, v: number): [number, number] {
        const x =
          padding.left +
          (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
        const y = padding.top + chartH - ((v - minV) / range) * chartH;
        return [x, y];
      }

      // Área com gradiente
      const gradient = ctx!.createLinearGradient(
        0,
        padding.top,
        0,
        padding.top + chartH
      );
      gradient.addColorStop(0, `${color}40`);
      gradient.addColorStop(1, `${color}00`);

      ctx!.beginPath();
      ctx!.moveTo(padding.left, padding.top + chartH);
      data.forEach((d, i) => {
        const [x, y] = toPoint(i, d.value);
        ctx!.lineTo(x, y);
      });
      ctx!.lineTo(width - padding.right, padding.top + chartH);
      ctx!.closePath();
      ctx!.fillStyle = gradient;
      ctx!.fill();

      // Linha principal
      ctx!.beginPath();
      data.forEach((d, i) => {
        const [x, y] = toPoint(i, d.value);
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      });
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 2.5;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.shadowColor = color;
      ctx!.shadowBlur = 8;
      ctx!.stroke();
      ctx!.shadowBlur = 0;

      // Linha secundária (tracejada)
      if (colorSecondary && data.some((d) => d.value2 !== undefined)) {
        ctx!.beginPath();
        ctx!.setLineDash([5, 4]);
        data.forEach((d, i) => {
          if (d.value2 === undefined) return;
          const [x, y] = toPoint(i, d.value2);
          if (i === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        });
        ctx!.strokeStyle = colorSecondary;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
        ctx!.setLineDash([]);
      }

      // Pontos
      data.forEach((d, i) => {
        const [x, y] = toPoint(i, d.value);
        const isLast = i === data.length - 1;
        const isHovered = hoverRef.current === i;

        if (isLast || isHovered) {
          ctx!.beginPath();
          ctx!.arc(x, y, isHovered ? 6 : 4, 0, Math.PI * 2);
          ctx!.fillStyle = color;
          ctx!.fill();

          // Halo
          ctx!.beginPath();
          ctx!.arc(x, y, isHovered ? 12 : 8, 0, Math.PI * 2);
          ctx!.fillStyle = `${color}30`;
          ctx!.fill();
        } else {
          ctx!.beginPath();
          ctx!.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx!.fillStyle = color;
          ctx!.fill();
        }
      });

      // Labels do eixo X (só alguns)
      ctx!.fillStyle = '#475569';
      ctx!.font = '10px "JetBrains Mono", monospace';
      ctx!.textAlign = 'center';
      const step = Math.max(1, Math.ceil(data.length / 6));
      data.forEach((d, i) => {
        if (i % step !== 0 && i !== data.length - 1) return;
        const [x] = toPoint(i, 0);
        ctx!.fillText(d.label, x, height - 10);
      });

      // Labels Y (min e max)
      ctx!.textAlign = 'right';
      ctx!.fillText(formatValue(maxV), padding.left - 6, padding.top + 4);
      ctx!.fillText(
        formatValue(minV),
        padding.left - 6,
        padding.top + chartH + 4
      );
    }

    resize();
    window.addEventListener('resize', resize);

    // Loop de animação (para pulse do último ponto)
    let t = 0;
    function animate() {
      t += 0.016;
      const pulse = 1 + Math.sin(t * 3) * 0.15;
      // Redesenha a cada frame (leve, poucos dados)
      draw();
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [data, height, color, colorSecondary]);

  return (
    <div className="w-full">
      {title && (
        <div className="text-[10px] text-text-3 uppercase tracking-[0.15em] font-mono-ui mb-2 px-1">
          {title}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}

/* ────────── Bar Chart Force Field ────────── */
export function ForceBarChart({
  data,
  height = 200,
  color = '#06b6d4',
  formatValue = (v: number) => String(v),
  title,
}: {
  data: Point[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let animProgress = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas!.clientWidth;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      if (data.length === 0) return;

      const padding = { top: 20, right: 8, bottom: 32, left: 36 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const maxV = Math.max(...data.map((d) => d.value)) || 1;

      ctx!.clearRect(0, 0, width, height);

      // Grid
      ctx!.strokeStyle = 'rgba(24, 35, 58, 0.6)';
      ctx!.lineWidth = 1;
      for (let i = 0; i <= 3; i++) {
        const y = padding.top + (chartH / 3) * i;
        ctx!.beginPath();
        ctx!.moveTo(padding.left, y);
        ctx!.lineTo(width - padding.right, y);
        ctx!.stroke();
      }

      const barGap = 4;
      const barW = (chartW - barGap * (data.length - 1)) / data.length;

      // Barras
      data.forEach((d, i) => {
        const x = padding.left + i * (barW + barGap);
        const fullH = (d.value / maxV) * chartH;
        const barH = fullH * Math.min(1, animProgress);
        const y = padding.top + chartH - barH;

        const gradient = ctx!.createLinearGradient(0, y, 0, y + barH);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, `${color}40`);

        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        const radius = Math.min(6, barW / 2);
        ctx!.moveTo(x, y + barH);
        ctx!.lineTo(x, y + radius);
        ctx!.quadraticCurveTo(x, y, x + radius, y);
        ctx!.lineTo(x + barW - radius, y);
        ctx!.quadraticCurveTo(x + barW, y, x + barW, y + radius);
        ctx!.lineTo(x + barW, y + barH);
        ctx!.closePath();
        ctx!.fill();

        // Glow no topo
        ctx!.shadowColor = color;
        ctx!.shadowBlur = 8;
        ctx!.strokeStyle = color;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(x + 2, y);
        ctx!.lineTo(x + barW - 2, y);
        ctx!.stroke();
        ctx!.shadowBlur = 0;
      });

      // Labels X
      ctx!.fillStyle = '#475569';
      ctx!.font = '10px "JetBrains Mono", monospace';
      ctx!.textAlign = 'center';
      const step = Math.max(1, Math.ceil(data.length / 6));
      data.forEach((d, i) => {
        if (i % step !== 0 && i !== data.length - 1) return;
        const x = padding.left + i * (barW + barGap) + barW / 2;
        ctx!.fillText(d.label, x, height - 10);
      });

      // Labels Y
      ctx!.textAlign = 'right';
      ctx!.fillText(formatValue(maxV), padding.left - 6, padding.top + 4);
      ctx!.fillText('0', padding.left - 6, padding.top + chartH + 4);
    }

    resize();
    window.addEventListener('resize', resize);

    function animate() {
      animProgress = Math.min(1, animProgress + 0.04);
      draw();
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [data, height, color]);

  return (
    <div className="w-full">
      {title && (
        <div className="text-[10px] text-text-3 uppercase tracking-[0.15em] font-mono-ui mb-2 px-1">
          {title}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}