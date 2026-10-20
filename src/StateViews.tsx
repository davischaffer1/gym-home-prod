import type { ReactNode } from 'react';

/* ══════════════════════════════════════════════════════════
   ESTADOS PADRÃO — carregando e vazio

   Antes cada tela inventava o seu: 4 estilos de "Carregando..."
   e 3 de vazio, um deles sem header nem botão de voltar (o
   usuário ficava preso na tela de Conquistas).
   ══════════════════════════════════════════════════════════ */

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-16"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/[0.10] border-t-accent" />
      <span className="font-mono-ui text-[11px] uppercase tracking-[0.15em] text-text-3">
        {label}
      </span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-10 text-center">
      {icon && (
        <div className="mb-3 text-3xl opacity-40" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="font-display text-sm font-semibold text-text-1">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-[26ch] text-[12px] leading-relaxed text-text-3">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
