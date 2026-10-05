import { type ReactNode } from 'react';

/* ══════════════════════════════════════════════════════════
   LAYOUT
   ══════════════════════════════════════════════════════════ */

/** Container central — responsivo, com padding seguro */
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

/** Tela cheia — usada em telas que não são a home */
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

/* ══════════════════════════════════════════════════════════
   SUPERFÍCIES
   ══════════════════════════════════════════════════════════ */

/** Card base — 3 variantes */
export function Card({
  children,
  className = '',
  variant = 'default',
  onClick,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'accent' | 'subtle';
  onClick?: () => void;
  interactive?: boolean;
}) {
  const variants = {
    default: 'bg-bg-1 border-white/[0.06] shadow-card-sm',
    accent: 'bg-accent-dim border-accent/20',
    subtle: 'bg-white/[0.02] border-white/[0.04]',
  };

  const base = 'rounded-2xl border';
  const padding = 'p-4';

  return (
    <div
      onClick={onClick}
      className={`${base} ${padding} ${variants[variant]} ${
        interactive || onClick
          ? 'cursor-pointer hover:bg-bg-2 active:scale-[0.99] transition-all'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Divisor sutil */
export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-white/[0.04] ${className}`} />;
}

/* ══════════════════════════════════════════════════════════
   TIPOGRAFIA
   ══════════════════════════════════════════════════════════ */

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
      <h2 className="text-xs font-semibold text-text-3 uppercase tracking-wider">
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
            className="w-9 h-9 -ml-1 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-text-2 text-lg"
          >
            ←
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-0 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-text-2 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   BOTÕES
   ══════════════════════════════════════════════════════════ */

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
      'bg-accent hover:bg-accent-hover text-black font-semibold shadow-glow-accent',
    secondary:
      'bg-white/[0.05] hover:bg-white/[0.08] text-text-1 border border-white/[0.06]',
    ghost: 'bg-transparent hover:bg-white/[0.04] text-text-2',
    danger:
      'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20',
    icon: 'bg-white/[0.04] hover:bg-white/[0.08] text-text-2',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px] rounded-xl gap-1.5',
    md: 'px-4 py-2.5 text-sm min-h-[42px] rounded-2xl gap-2',
    lg: 'px-5 py-3.5 text-base min-h-[50px] rounded-2xl gap-2',
  };

  const iconSize = 'w-10 h-10 rounded-xl justify-center p-0';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${
        variant === 'icon' ? iconSize : `${sizes[size]}`
      } ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   INPUTS
   ══════════════════════════════════════════════════════════ */

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
      className={`w-full bg-bg-2 border border-white/[0.06] rounded-2xl px-4 py-3 text-base text-text-0 outline-none focus:border-accent/40 focus:bg-bg-1 transition-all placeholder:text-text-3 disabled:opacity-50 ${className}`}
    />
  );
}

/* ══════════════════════════════════════════════════════════
   CHIPS / TAGS
   ══════════════════════════════════════════════════════════ */

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
      className={`flex-shrink-0 font-medium rounded-full transition-all active:scale-95 ${
        sizes[size]
      } ${
        active
          ? 'bg-accent text-black shadow-glow-accent'
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
    | 'purple'
    | 'warn'
    | 'danger'
    | 'info';
}) {
  const variants = {
    default: 'bg-white/[0.05] text-text-2',
    accent: 'bg-accent-dim text-accent',
    purple: 'bg-purple/10 text-purple',
    warn: 'bg-warn/10 text-warn',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   STATS
   ══════════════════════════════════════════════════════════ */

export function StatCard({
  icon,
  value,
  label,
  highlight,
}: {
  icon?: string;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-center border transition-all ${
        highlight
          ? 'bg-accent-dim border-accent/20'
          : 'bg-bg-1 border-white/[0.06]'
      }`}
    >
      {icon && <div className="text-xl mb-1.5 opacity-90">{icon}</div>}
      <div
        className={`text-xl font-bold tracking-tight ${
          highlight ? 'text-accent' : 'text-text-0'
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-text-3 mt-1 uppercase tracking-wider font-medium">
        {label}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════════════════════ */

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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-1 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col border-t sm:border border-white/[0.08] shadow-card-lg animate-slide-up safe-bottom"
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <h2 className="text-base font-semibold text-text-0">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all flex items-center justify-center text-text-2"
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

/* ══════════════════════════════════════════════════════════
   APP SHELL — estrutura de app nativo
   ══════════════════════════════════════════════════════════ */

/**
 * Shell principal do app: header fixo + conteúdo scrollável + bottom nav fixa.
 */
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
      {/* Header fixo */}
      <header className="sticky top-0 z-40 bg-bg-0/85 backdrop-blur-xl border-b border-white/[0.05] safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight text-text-0 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-text-3 truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      </header>

      {/* Conteúdo scrollável */}
      <main
        className={`flex-1 overflow-y-auto no-scrollbar ${
          hideNav ? '' : 'pb-24'
        }`}
      >
        <div
          className={`max-w-lg mx-auto ${
            noPadding ? '' : 'px-4 py-4'
          }`}
        >
          {children}
        </div>
      </main>

      {/* Bottom nav fixa */}
      {!hideNav && bottomNav}
    </div>
  );
}

/**
 * Tela interna (sub-tela) — com header de voltar.
 */
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
      {/* Header com voltar */}
      <header className="sticky top-0 z-40 bg-bg-0/85 backdrop-blur-xl border-b border-white/[0.05] safe-top">
        <div className="max-w-lg mx-auto px-3 py-2 flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/[0.05] active:scale-95 transition-all text-text-1 text-xl"
          >
            ←
          </button>
          <h1 className="text-base font-semibold text-text-0 truncate flex-1 text-center">
            {title}
          </h1>
          <div className="w-10 flex justify-end">
            {action ?? null}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div
          className={`max-w-lg mx-auto ${
            noPadding ? '' : 'px-4 py-4'
          } pb-8`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Bottom navigation bar — estilo app profissional.
 */
export function BottomNav({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: {
    id: string;
    label: string;
    icon: string;
    badge?: number;
  }[];
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-0/90 backdrop-blur-xl border-t border-white/[0.05] safe-bottom">
      <div className="max-w-lg mx-auto grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
            >
              <span
                className={`text-xl transition-all ${
                  active ? 'scale-110' : 'opacity-50'
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? 'text-accent' : 'text-text-3'
                }`}
              >
                {tab.label}
              </span>

              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-accent" />
              )}

              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute top-2 right-1/4 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Botão central flutuante (FAB) — como apps de treino.
 */
export function FloatingActionButton({
  onClick,
  icon = '+',
  label,
}: {
  onClick: () => void;
  icon?: string;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label ?? 'Ação'}
      className="fixed z-50 right-4 w-14 h-14 rounded-full bg-accent text-black flex items-center justify-center shadow-[0_8px_24px_rgba(34,211,168,0.4)] active:scale-90 transition-transform"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
    >
      <span className="text-2xl font-bold">{icon}</span>
    </button>
  );
}

/**
 * Item de lista mobile — touch target grande.
 */
export function ListItem({
  icon,
  title,
  subtitle,
  action,
  onClick,
  right,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onClick?: () => void;
  right?: ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 bg-bg-1 border-b border-white/[0.04] ${
        onClick ? 'cursor-pointer hover:bg-bg-2 active:bg-bg-2' : ''
      } transition-colors`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-bg-2 flex items-center justify-center text-lg flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-text-0 truncate">{title}</div>
        {subtitle && (
          <div className="text-xs text-text-3 truncate mt-0.5">{subtitle}</div>
        )}
      </div>
      {right}
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}