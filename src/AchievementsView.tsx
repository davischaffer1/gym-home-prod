import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { ACHIEVEMENTS } from './achievements';
import { computeUserStats } from './achievementEngine';
import { useEffect, useState } from 'react';
import type { UserStats } from './achievements';
import { Badge, Card, SubScreen } from './ui';
import { EmptyState, LoadingState } from './StateViews';

interface Props {
  onBack: () => void;
}

const CATEGORIES = [
  { key: 'inicio', label: 'Início' },
  { key: 'consistencia', label: 'Consistência' },
  { key: 'volume', label: 'Volume' },
  { key: 'forca', label: 'Força' },
  { key: 'variedade', label: 'Variedade' },
  { key: 'especial', label: 'Especial' },
] as const;

export default function AchievementsView({ onBack }: Props) {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    let alive = true;
    computeUserStats().then((s) => {
      if (alive) setStats(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const unlocked = useLiveQuery(() => db.achievements.toArray(), []);

  const total = ACHIEVEMENTS.length;

  return (
    <SubScreen title="Conquistas" onBack={onBack}>
      {(!unlocked || !stats) && <LoadingState label="Calculando conquistas" />}

      {unlocked && stats && total === 0 && (
        <EmptyState
          title="Nenhuma conquista cadastrada"
          description="A lista de conquistas está vazia neste build."
        />
      )}

      {unlocked && stats && total > 0 && (
        <div className="space-y-5">
          <AchievementsProgress unlocked={unlocked} total={total} />

          {CATEGORIES.map((cat) => {
            const items = ACHIEVEMENTS.filter((a) => a.category === cat.key);
            if (items.length === 0) return null;

            return (
              <section key={cat.key} className="space-y-2">
                <h2 className="px-1 font-mono-ui text-[11px] font-bold uppercase tracking-[0.15em] text-text-3">
                  {cat.label}
                </h2>

                {items.map((a) => {
                  const isUnlocked = unlocked.some(
                    (u) => u.achievementId === a.id
                  );
                  const unlockedAt = unlocked.find(
                    (u) => u.achievementId === a.id
                  )?.unlockedAt;
                  const prog = a.progress?.(stats);
                  const pct =
                    prog && prog.target > 0
                      ? Math.min(100, (prog.current / prog.target) * 100)
                      : 0;

                  return (
                    <Card
                      key={a.id}
                      variant={isUnlocked ? 'default' : 'glass'}
                      className={
                        isUnlocked
                          ? '!border-success/25 !bg-success/[0.05]'
                          : 'opacity-90'
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`text-2xl leading-none ${
                            isUnlocked ? '' : 'opacity-30 grayscale'
                          }`}
                          aria-hidden="true"
                        >
                          {a.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-text-0">
                              {a.name}
                            </span>
                            {isUnlocked && <Badge variant="success">✓</Badge>}
                          </div>

                          <p className="mt-0.5 text-[12px] leading-relaxed text-text-2">
                            {a.description}
                          </p>

                          {!isUnlocked && prog && (
                            <div className="mt-2 space-y-1">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-2">
                                <div
                                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="font-mono-ui text-[11px] text-text-3">
                                {formatNumber(prog.current)} /{' '}
                                {formatNumber(prog.target)}
                              </div>
                            </div>
                          )}

                          {isUnlocked && unlockedAt && (
                            <p className="mt-1 font-mono-ui text-[11px] text-success">
                              {new Date(unlockedAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </SubScreen>
  );
}

/* ────────── progresso geral ────────── */

function AchievementsProgress({
  unlocked,
  total,
}: {
  unlocked: { achievementId: string }[];
  total: number;
}) {
  const unlockedCount = new Set(unlocked.map((u) => u.achievementId)).size;
  const pct = Math.round((unlockedCount / total) * 100);

  return (
    <Card variant="accent">
      <div className="flex items-baseline justify-between">
        <span className="font-mono-ui text-[11px] uppercase tracking-[0.15em] text-text-2">
          Desbloqueadas
        </span>
        <span className="font-mono-ui text-lg font-bold text-accent">
          {pct}%
        </span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 font-mono-ui text-[11px] text-text-2">
        {unlockedCount} de {total}
      </div>
    </Card>
  );
}

function formatNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}
