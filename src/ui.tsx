import { type ReactNode } from 'react';

/* ---------- Card com glassmorphism ---------- */
export function Card({
  children,
  className = '',
  variant = 'surface',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  variant?: 'surface' | 'elevated' | 'glass';
  onClick?: () => void;
}) {
  const base =
    'rounded-3xl p-5 transition-all duration-200 border border-white/5';
  const variants = {
    surface: 'bg-bg-surface',
    elevated: 'bg-bg-elevated shadow-card',
    glass:
      'bg-white/5 backdrop-blur-xl border-white/10 shadow-card',
  };

  return (
    <div
      onClick={onClick}
      className={`${base} ${variants[variant]} ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- Botão principal ---------- */
export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  type = 'button',
  fullWidth,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary:
      'bg-accent hover:bg-accent-light text-white shadow-glow',
    secondary: 'bg-white/8 hover:bg-white/12 text-white',
    ghost: 'bg-transparent hover:bg-white/5 text-zinc-300',
    danger: 'bg-danger hover:bg-red-500 text-white',
  };
  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-3 text-base min-h-[44px]',
    lg: 'px-6 py-4 text-lg min-h-[52px]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------- Input estilizado ---------- */
export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  className = '',
  autoFocus,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`w-full bg-bg-elevated border border-white/5 rounded-2xl px-4 py-3 text-base outline-none focus:border-accent/50 focus:bg-bg-overlay transition-all placeholder:text-zinc-500 ${className}`}
    />
  );
}

/* ---------- Título de seção ---------- */
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-1 mb-3">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ---------- Header de tela ---------- */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-lg"
          >
            ←
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-zinc-500 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------- Chip ---------- */
export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
        active
          ? 'bg-accent text-white shadow-glow'
          : 'bg-white/5 hover:bg-white/10 text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Stat card ---------- */
export function StatCard({
  icon,
  value,
  label,
  highlight,
}: {
  icon: string;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-5 text-center border transition-all ${
        highlight
          ? 'bg-accent/10 border-accent/30 shadow-glow'
          : 'bg-bg-surface border-white/5'
      }`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}