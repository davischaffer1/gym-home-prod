import { type ReactNode } from 'react';

/* ══════════════════════════════════════════════════════════
   FORCE FIELD — Componentes visuais
   ══════════════════════════════════════════════════════════ */

/* ────────── LAYOUT ────────── */

export function Container({
  children,
  className = '',
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const maxW = wide ? 'max-w-3xl' : 'max-w-lg';
  return (
    <div
      className={`${maxW} mx-auto px-4 sm:px-5 pt-4 pb-24 safe-top safe-x ${className}`}
    >
      {children}
    </div>
  );
}

export function Screen({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-screen bg-bg-0 safe-top safe-bottom safe-x ${className}`}>
      <div className="max-w-lg mx-auto px-4 sm:px-5 pt-4 pb-12">
        {children}
      </div>
    </div>
  );
}

/* ────────── SURFACES ────────── */

export function Card({
  children,
  className = '',
  variant = 'default',
  glow,
  onClick,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'accent' | 'glass' | 'danger' | 'pr' | 'sci';
  glow?: boolean;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const variants = {
    default:
      'bg-bg-1 border border-white/[0.06]',
    accent:
      'bg-accent-dim border border-accent/25',
    glass:
      'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]',
    danger:
      'bg-danger/5 border border-danger/25',
    pr:
      'bg-pr/5 border border-pr/25',
    sci:
      'bg-sci/5 border border-sci/25',
  };

  const glowClass = glow ? 'shadow-glow-accent' : 'shadow-card';

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 ${variants[variant]} ${glowClass} ${
        interactive || onClick
          ? 'cursor-pointer hover:bg-bg-2 active:scale-[0.99] transition-all'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`gradient-line my-3 ${className}`} />;
}

/* ────────── TYPOGRAPHY ────────── */

export function SectionTitle({
  children,
  action,
  className = '',
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between mb-3 px-1 ${className}`}>
      <h2 className="text-[10px] font-semibold text-text-3 uppercase tracking-[0.15em] font-mono-ui">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
  onBack,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="w-10 h-10 -ml-1 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-text-2 text-lg"
          >
            ←
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold font-display text-text-0 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-text-3 mt-0.5 truncate font-mono-ui uppercase tracking-wider">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ────────── BUTTONS ────────── */

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  type = 'button',
  fullWidth,
  icon,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
  icon?: ReactNode;
}) {
  const variants = {
    primary:
      'bg-accent hover:bg-accent-hover text-black font-bold shadow-glow-accent',
    secondary:
      'bg-white/[0.05] hover:bg-white/[0.08] text-text-1 border border-white/[0.08] font-medium',
    ghost: 'bg-transparent hover:bg-white/[0.04] text-text-2 font-medium',
    danger:
      'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/25 font-semibold',
    icon: 'bg-white/[0.04] hover:bg-white/[0.08] text-text-2',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px] rounded-xl gap-1.5',
    md: 'px-4 py-2.5 text-sm min-h-[44px] rounded-2xl gap-2',
    lg: 'px-5 py-3.5 text-base min-h-[52px] rounded-2xl gap-2',
  };

  const iconSize = 'w-10 h-10 rounded-2xl justify-center p-0';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 font-display ${
        variant === 'icon' ? iconSize : sizes[size]
      } ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

/* ────────── INPUTS ────────── */

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  className = '',
  autoFocus,
  onKeyDown,
  onBlur,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-bg-2 border border-white/[0.06] rounded-2xl px-4 py-3 text-base text-text-0 outline-none focus:border-accent/50 focus:bg-bg-1 focus:shadow-glow-accent transition-all placeholder:text-text-3 disabled:opacity-50 ${className}`}
    />
  );
}

/* ────────── CHIPS / BADGES ────────── */

export function Chip({
  children,
  active,
  onClick,
  size = 'md',
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}) {
  const sizes = {
    sm: 'px-2.5 py-1 text-[10px]',
    md: 'px-3.5 py-1.5 text-xs',
  };

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 font-medium rounded-full transition-all active:scale-95 font-mono-ui uppercase tracking-wider ${
        sizes[size]
      } ${
        active
          ? 'bg-accent text-black shadow-glow-accent font-bold'
          : 'bg-white/[0.05] hover:bg-white/[0.08] text-text-2'
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?:
    | 'default'
    | 'accent'
    | 'sci'
    | 'warn'
    | 'danger'
    | 'info'
    | 'pr'
    | 'success';
}) {
  const variants = {
    default: 'bg-white/[0.05] text-text-2',
    accent: 'bg-accent-dim text-accent',
    sci: 'bg-sci/10 text-sci',
    warn: 'bg-warn/10 text-warn',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
    pr: 'bg-pr/10 text-pr',
    success: 'bg-success/10 text-success',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-ui uppercase tracking-wider ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

/* ────────── STATS ────────── */

export function StatCard({
  icon,
  value,
  label,
  highlight,
  mono,
}: {
  icon?: string;
  value: string;
  label: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-center border transition-all ${
        highlight
          ? 'bg-accent-dim border-accent/25 shadow-glow-accent'
          : 'bg-bg-1 border-white/[0.06] shadow-card'
      }`}
    >
      {icon && <div className="text-xl mb-1.5 opacity-90">{icon}</div>}
      <div
        className={`text-2xl font-bold tracking-tight ${
          mono ? 'font-mono-ui' : 'font-display'
        } ${highlight ? 'text-accent' : 'text-text-0'}`}
      >
        {value}
      </div>
      <div className="text-[9px] text-text-3 mt-1 uppercase tracking-[0.15em] font-mono-ui">
        {label}
      </div>
    </div>
  );
}

/* ────────── MODAL ────────── */

export function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-1 w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col border-t sm:border border-white/[0.08] shadow-card-lg animate-slide-up safe-bottom"
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <h2 className="text-base font-bold font-display text-text-0">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all flex items-center justify-center text-text-2"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ────────── APP SHELL ────────── */

export function AppShell({
  title,
  subtitle,
  headerAction,
  children,
  bottomNav,
  hideNav,
  noPadding,
}: {
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  bottomNav?: ReactNode;
  hideNav?: boolean;
  noPadding?: boolean;
}) {
  return (
    <div className="min-h-screen bg-bg-0 flex flex-col">
      <header className="sticky top-0 z-40 bg-bg-0/85 backdrop-blur-xl border-b border-white/[0.05] safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold font-display tracking-tight text-text-0 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      </header>

      <main
        className={`flex-1 overflow-y-auto no-scrollbar ${
          hideNav ? '' : 'pb-24'
        }`}
      >
        <div
          className={`max-w-lg mx-auto ${noPadding ? '' : 'px-4 py-4'} animate-fade-in`}
        >
          {children}
        </div>
      </main>

      {!hideNav && bottomNav}
    </div>
  );
}

export function SubScreen({
  title,
  onBack,
  action,
  children,
  noPadding,
}: {
  title: string;
  onBack: () => void;
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div className="min-h-screen bg-bg-0 flex flex-col animate-slide-up">
      <header className="sticky top-0 z-40 bg-bg-0/85 backdrop-blur-xl border-b border-white/[0.05] safe-top">
        <div className="max-w-lg mx-auto px-3 py-2 flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/[0.05] active:scale-95 transition-all text-text-1 text-xl"
          >
            ←
          </button>
          <h1 className="text-base font-bold font-display text-text-0 truncate flex-1 text-center">
            {title}
          </h1>
          <div className="w-10 flex justify-end">{action ?? null}</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div
          className={`max-w-lg mx-auto ${
            noPadding ? '' : 'px-4 py-4'
          } pb-8 animate-fade-in`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

/* ────────── NAV ICONS ────────── */

export function NavIcon({
  name,
  active,
}: {
  name: 'home' | 'chart' | 'plus' | 'calendar' | 'user' | 'trend';
  active?: boolean;
}) {
  const size = 24;
  const stroke = active ? 2.4 : 2;

  if (name === 'plus') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  }

  if (name === 'home') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" fill="none" />
      </svg>
    );
  }

  if (name === 'chart') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="6" y1="20" x2="6" y2="12" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="18" y1="20" x2="18" y2="14" />
      </svg>
    );
  }

  if (name === 'trend') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="3 17 9 11 13 15 21 7" />
        <polyline points="14 7 21 7 21 14" />
      </svg>
    );
  }

  if (name === 'calendar') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" fill="none" />
        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" fill="none" />
        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" fill="none" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" fill={active ? 'currentColor' : 'none'} />
    </svg>
  );
}

/* ────────── BOTTOM NAV ────────── */

export function BottomNav({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: {
    id: string;
    label: string;
    icon: 'home' | 'chart' | 'plus' | 'calendar' | 'user' | 'trend';
  }[];
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-0/90 backdrop-blur-2xl border-t border-white/[0.06] safe-bottom">
      <div className="max-w-lg mx-auto grid grid-cols-5 h-[72px] relative">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          // Botão central (FAB)
          if (tab.icon === 'plus') {
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className="relative flex items-center justify-center active:scale-90 transition-transform"
              >
                <div className="w-14 h-14 -mt-7 rounded-full bg-accent text-black flex items-center justify-center shadow-glow-accent animate-pulse-glow">
                  <NavIcon name="plus" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
            >
              {/* Indicador superior */}
              <span
                className={`absolute top-0 h-[2px] rounded-full bg-accent transition-all duration-300 ${
                  active ? 'w-10 opacity-100 shadow-glow-accent' : 'w-0 opacity-0'
                }`}
              />

              <div
                className={`transition-colors duration-200 ${
                  active ? 'text-accent' : 'text-text-3'
                }`}
              >
                <NavIcon name={tab.icon} active={active} />
              </div>
              <span
                className={`text-[9px] font-mono-ui uppercase tracking-[0.12em] transition-colors duration-200 ${
                  active ? 'text-accent font-bold' : 'text-text-3'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}