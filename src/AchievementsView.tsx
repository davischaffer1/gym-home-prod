import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { ACHIEVEMENTS } from './achievements';
import { computeUserStats } from './achievementEngine';
import { useEffect, useState } from 'react';
import type { UserStats } from './achievements';

interface Props {
  onBack: () => void;
}

export default function AchievementsView({ onBack }: Props) {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    computeUserStats().then(setStats);
  }, []);

  const unlocked = useLiveQuery(() => db.achievements.toArray(), []);

  if (!unlocked || !stats) {
    return <p className="p-4 text-zinc-400">Carregando...</p>;
  }

  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
  const unlockedCount = unlockedIds.size;
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlockedCount / total) * 100);

  // Agrupa por categoria
  const categories = [
    { key: 'inicio', label: 'Início', icon: '🎯' },
    { key: 'consistencia', label: 'Consistência', icon: '🔥' },
    { key: 'volume', label: 'Volume', icon: '📦' },
    { key: 'forca', label: 'Força', icon: '💪' },
    { key: 'variedade', label: 'Variedade', icon: '🧭' },
    { key: 'especial', label: 'Especial', icon: '⭐' },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🏅 Conquistas</h1>
        <button
          onClick={onBack}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg"
        >
          Voltar
        </button>
      </div>

      {/* Barra de progresso geral */}
      <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-zinc-400">
            Desbloqueadas: {unlockedCount} de {total}
          </span>
          <span className="font-bold text-emerald-400">{pct}%</span>
        </div>
        <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {categories.map((cat) => {
        const items = ACHIEVEMENTS.filter((a) => a.category === cat.key);
        return (
          <section key={cat.key} className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
              {cat.icon} {cat.label}
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {items.map((a) => {
                const isUnlocked = unlockedIds.has(a.id);
                const unlockedAt = unlocked.find(
                  (u) => u.achievementId === a.id
                )?.unlockedAt;
                const prog = a.progress?.(stats);

                return (
                  <div
                    key={a.id}
                    className={`rounded-2xl p-4 border flex items-start gap-3 ${
                      isUnlocked
                        ? 'bg-emerald-950/40 border-emerald-800'
                        : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div
                      className={`text-3xl ${
                        isUnlocked ? '' : 'opacity-30 grayscale'
                      }`}
                    >
                      {a.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{a.name}</span>
                        {isUnlocked && (
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {a.description}
                      </p>

                      {/* Progresso */}
                      {!isUnlocked && prog && (
                        <div className="mt-2 space-y-1">
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (prog.current / prog.target) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {formatNumber(prog.current)} /{' '}
                            {formatNumber(prog.target)}
                          </div>
                        </div>
                      )}

                      {isUnlocked && unlockedAt && (
                        <p className="text-[10px] text-emerald-400 mt-1">
                          Desbloqueada em{' '}
                          {new Date(unlockedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function formatNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}
