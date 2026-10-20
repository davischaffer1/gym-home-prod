/* ══════════════════════════════════════════════════════════
   ÍCONES — SVG de linha, 24×24, currentColor

   O app usava emoji como ícone de sistema (🔥 📊 🏅 🧬 …).
   Cada sistema operacional desenha de um jeito, o tamanho varia,
   a cor não acompanha o token e o leitor de tela anuncia "fogo".
   Aqui tudo herda a cor do texto e o tamanho do contexto.
   ══════════════════════════════════════════════════════════ */

export type IconName =
  | 'home'
  | 'chart'
  | 'trend'
  | 'apple'
  | 'calendar'
  | 'user'
  | 'trophy'
  | 'flame'
  | 'timer'
  | 'weight'
  | 'layers'
  | 'target'
  | 'settings'
  | 'droplet'
  | 'dumbbell'
  | 'pulse'
  | 'list'
  | 'plus'
  | 'chevron-right'
  | 'check';

const PATHS: Record<IconName, string> = {
  home: 'M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  chart: 'M6 20V11M12 20V5M18 20v-6',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  apple: 'M12 8c-1.5-2-4-2.4-5.4-1C5 8.6 5.4 12 6.6 15c1 2.5 2.3 4 3.6 4 1 0 1.3-.5 1.8-.5s.8.5 1.8.5c1.3 0 2.6-1.5 3.6-4 1.2-3 1.6-6.4.1-8-1.4-1.4-3.9-1-5.5 1zM12 8V4',
  calendar:
    'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5zM8 3v4M16 3v4M4 10h16',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  trophy:
    'M8 4h8v4a4 4 0 0 1-8 0zM8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M12 12v4M9 20h6M10 20v-2h4v2',
  flame:
    'M12 22a6 6 0 0 0 6-6c0-3-2-4.6-3.2-6.2C13.6 8.2 13 6.4 13 3c-2.4 1.6-3.4 3.9-3.6 5.9-1.2-.5-1.9-1.4-2.2-2.6C5.6 8 5 10.2 5 12.4A6.6 6.6 0 0 0 12 22z',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v5l3 2M9 2h6',
  weight:
    'M6.5 8h11l1.5 12H5zM9 8V5.5a3 3 0 0 1 6 0V8',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  target:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.4-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.2a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.6 1z',
  droplet: 'M12 3s6 6.2 6 10.2A6 6 0 0 1 6 13.2C6 9.2 12 3 12 3z',
  dumbbell:
    'M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10',
  pulse: 'M3 12h4l2.5-7 4 14L16 12h5',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  plus: 'M12 5v14M5 12h14',
  'chevron-right': 'M9 6l6 6-6 6',
  check: 'M20 6 9 17l-5-5',
};

export function Icon({
  name,
  size = 20,
  className = '',
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
