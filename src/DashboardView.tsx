import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import {
  detectPlateau,
  shouldDeload,
  countEffectiveSetsByGroup,
  countFiberVolumeByGroup,
  extract1RMTimeline,
  forecastPR,
} from './trainingScience';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface Props {
  onBack: () => void;
}

export default function DashboardView({ onBack }: Props) {
  // 🔝 TODOS os hooks aqui em cima, sem return no meio

  const sessions = useLiveQuery(async () => {
    const all = await db.sessions
      .filter((s) => s.finishedAt !== undefined)
      .toArray();
    return all.sort((a, b) => b.startedAt - a.startedAt);
  }, []);

  const sets = useLiveQuery(() => db.sets.toArray(), []);
  const meta = useLiveQuery(() => db.meta.toCollection().first(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  // 🔮 Previsão de PR (melhor exercício)
  const bestForecast = useLiveQuery(async () => {
    const allExercises = await db.exercises.toArray();
    const allSessions = await db.sessions
      .filter((s) => s.finishedAt !== undefined)
      .toArray();
    const allSets = await db.sets.toArray();

    const byName = new Map<string, { exerciseIds: number[] }>();
    for (const ex of allExercises) {
      if (!byName.has(ex.name)) byName.set(ex.name, { exerciseIds: [] });
      byName.get(ex.name)!.exerciseIds.push(ex.id!);
    }

    let best: {
      exerciseName: string;
      forecast: ReturnType<typeof forecastPR>;
    } | null = null;

    for (const [name, { exerciseIds }] of byName) {
      const exSets = allSets.filter((s) => exerciseIds.includes(s.exerciseId));
      if (exSets.length < 3) continue;

      const timeline = extract1RMTimeline(exSets, allSessions);
      if (timeline.length < 3) continue;

      const currentBest = timeline[timeline.length - 1].oneRM;
      const step = currentBest < 100 ? 5 : 10;
      const nextTarget = Math.ceil((currentBest + 0.1) / step) * step;

      const fc = forecastPR(timeline, nextTarget);
      if (!fc || fc.weeksToTarget === null) continue;

      if (
        !best ||
        (fc.weeksToTarget ?? 999) < (best.forecast?.weeksToTarget ?? 999)
      ) {
        best = { exerciseName: name, forecast: fc };
      }
    }

    return best;
  }, []);

  // ✅ AGORA sim os returns condicionais
  if (!sessions || !sets || !exercises) {
    return <p className="p-4 text-zinc-400">Carregando estatísticas...</p>;
  }

  // ───── Cálculos (sem hooks) ─────

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const weekSessions = sessions.filter(
    (s) => s.startedAt >= startOfWeek.getTime()
  );
  const monthSessions = sessions.filter(
    (s) => s.startedAt >= startOfMonth.getTime()
  );

  const streak = computeStreak(sessions.map((s) => s.startedAt));

  const totalMinutes = sessions.reduce(
    (acc, s) =>
      acc +
      Math.round(
        (s.finishedAt! - s.startedAt - (s.totalPausedMs ?? 0)) / 60000
      ),
    0
  );

  const totalVolume = sets.reduce((acc, s) => acc + s.reps * s.weight, 0);

  const weeklyVolume = computeWeeklyVolume(sessions, sets, 8);
  const weeklySessions = computeWeeklySessions(sessions, 8);

  // 🎯 Séries efetivas por grupo (última semana)
  const effectiveSets = countEffectiveSetsByGroup(sets, exercises, 1);
  const visibleGroups = effectiveSets.filter(
    (g) => g.count > 0 || g.status === 'baixo'
  );

  // 🧪 Ativação de fibras
  const fiberVolume = countFiberVolumeByGroup(sets, exercises, 1);
  const visibleFiber = fiberVolume.filter((g) => g.totalEffective > 0);

  // ─── Deload automático ───
  const deloadInfo = (() => {
    const byExercise = new Map<number, typeof sets>();
    for (const s of sets) {
      if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
      byExercise.get(s.exerciseId)!.push(s);
    }

    let plateauCount = 0;
    for (const [, list] of byExercise) {
      const bySession = new Map<number, typeof list>();
      for (const s of list) {
        if (!bySession.has(s.sessionId)) bySession.set(s.sessionId, []);
        bySession.get(s.sessionId)!.push(s);
      }
      const summaries = Array.from(bySession.entries())
        .map(([sessionId, sl]) => {
          const maxWeight = Math.max(...sl.map((x) => x.weight));
          const topReps = Math.max(
            ...sl.filter((x) => x.weight === maxWeight).map((x) => x.reps)
          );
          return {
            sessionId,
            startedAt: sl[0].createdAt,
            maxWeight,
            topReps,
            allSetsHitTop: false,
          };
        })
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 6);

      if (detectPlateau(summaries)) plateauCount++;
    }

    return shouldDeload(meta?.lastDeloadAt, Date.now(), plateauCount);
  })();

  async function markDeloadDone() {
    const existing = await db.meta.toCollection().first();
    if (existing?.id) {
      await db.meta.update(existing.id, { lastDeloadAt: Date.now() });
    } else {
      await db.meta.add({ lastDeloadAt: Date.now() });
    }
  }

  // ───── JSX ─────

  return (
    <div className="min-h-screen safe-top safe-bottom safe-x">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-12 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            📊 Progresso
          </h1>
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-lg"
          >
            ←
          </button>
        </div>

        {/* Banner de deload */}
        {deloadInfo.yes && (
          <div className="bg-amber-950/50 border border-amber-700/50 rounded-3xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <div className="font-semibold text-amber-300">
                  Considere uma semana de deload
                </div>
                <div className="text-sm text-amber-200/80 mt-1">
                  {deloadInfo.reason}. Reduza o volume em ~40–50% mantendo a
                  intensidade por 1 semana.
                </div>
                <div className="text-xs text-zinc-400 mt-2">
                  Base: Bell et al. (2020), Issurin (2010)
                </div>
              </div>
            </div>
            <button
              onClick={markDeloadDone}
              className="w-full bg-amber-700 hover:bg-amber-600 py-2.5 rounded-2xl text-sm font-medium text-white active:scale-[0.98] transition-all"
            >
              ✅ Marcar deload como feito
            </button>
          </div>
        )}

        {/* 🔮 Próximo PR mais perto */}
        {bestForecast?.forecast &&
          bestForecast.forecast.weeksToTarget !== null && (
            <section className="bg-purple-950/30 border border-purple-800/50 rounded-3xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-purple-200">
                  🔮 PR mais próximo
                </h2>
                <span className="text-[10px] text-purple-400">
                  {bestForecast.forecast.rate.confidenceLevel === 'alta'
                    ? '● alta'
                    : bestForecast.forecast.rate.confidenceLevel === 'média'
                    ? '● média'
                    : '● baixa'}
                </span>
              </div>

              <div className="text-sm text-zinc-300">
                <strong>{bestForecast.exerciseName}</strong>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-300">
                    {bestForecast.forecast.target} kg
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    +{bestForecast.forecast.gap} kg de onde você está
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    ~{bestForecast.forecast.weeksToTarget} sem
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {bestForecast.forecast.estimatedDate
                      ? new Date(
                          bestForecast.forecast.estimatedDate
                        ).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })
                      : '—'}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 pt-2 border-t border-white/5 italic">
                {bestForecast.forecast.note}
              </div>
            </section>
          )}

        {/* Cards de destaque */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Streak atual"
            value={`${streak} dia${streak === 1 ? '' : 's'}`}
            icon="🔥"
            highlight={streak >= 3}
          />
          <StatCard
            label="Treinos na semana"
            value={String(weekSessions.length)}
            icon="📅"
          />
          <StatCard
            label="Treinos no mês"
            value={String(monthSessions.length)}
            icon="🗓"
          />
          <StatCard
            label="Tempo total"
            value={formatTotalTime(totalMinutes)}
            icon="⏱"
          />
          <StatCard
            label="Séries totais"
            value={String(sets.length)}
            icon="🔁"
          />
          <StatCard
            label="Volume total"
            value={`${Math.round(totalVolume).toLocaleString('pt-BR')} kg`}
            icon="📦"
          />
        </div>

        {/* 🎯 Séries efetivas por grupo */}
        {visibleGroups.length > 0 && (
          <section className="bg-bg-surface border border-white/5 rounded-3xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">🎯 Séries efetivas (semana)</h2>
              <span className="text-[10px] text-zinc-500">RIR ≤ 3</span>
            </div>

            <div className="space-y-3">
              {visibleGroups.map((g) => (
                <VolumeBar key={g.group} group={g} />
              ))}
            </div>

            <div className="text-[10px] text-zinc-500 pt-2 border-t border-white/5">
              Base: Refalo et al. (2021, 2023), Schoenfeld et al. (2021)
            </div>
          </section>
        )}

        {/* 🧪 Ativação de fibras */}
        {visibleFiber.length > 0 && (
          <section className="bg-bg-surface border border-white/5 rounded-3xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">🧪 Ativação de fibras</h2>
              <span className="text-[10px] text-zinc-500">
                Tipo I / Tipo II
              </span>
            </div>

            <div className="space-y-3">
              {visibleFiber.map((g) => (
                <FiberBar key={g.group} group={g} />
              ))}
            </div>

            <div className="text-[10px] text-zinc-500 pt-2 border-t border-white/5">
              Base: Henneman (1965), Grgic (2020), Lasevicius (2018, 2022)
            </div>
          </section>
        )}

        {/* Gráfico: volume por semana */}
        <section className="bg-bg-surface border border-white/5 rounded-3xl p-4">
          <h2 className="font-semibold mb-3">Volume semanal (kg)</h2>
          <WeeklyChart data={weeklyVolume} dataKey="volume" color="#10b981" />
        </section>

        {/* Gráfico: sessões por semana */}
        <section className="bg-bg-surface border border-white/5 rounded-3xl p-4">
          <h2 className="font-semibold mb-3">Treinos por semana</h2>
          <WeeklyChart
            data={weeklySessions}
            dataKey="count"
            color="#3b82f6"
          />
        </section>

        {/* Resumo das últimas sessões */}
        <section className="bg-bg-surface border border-white/5 rounded-3xl p-4 space-y-3">
          <h2 className="font-semibold">Últimas sessões</h2>
          {sessions.slice(0, 5).map((s) => {
            const sessSets = sets.filter((x) => x.sessionId === s.id);
            const vol = sessSets.reduce((a, x) => a + x.reps * x.weight, 0);
            const mins = Math.round(
              (s.finishedAt! - s.startedAt - (s.totalPausedMs ?? 0)) / 60000
            );
            return (
              <div
                key={s.id}
                className="flex justify-between bg-bg-elevated border border-white/5 rounded-2xl px-3 py-2 text-xs"
              >
                <span>
                  {new Date(s.startedAt).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-zinc-400">
                  {sessSets.length} séries · {vol.toLocaleString('pt-BR')} kg
                  · {mins} min
                </span>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

/* ---------- Chart ---------- */

function WeeklyChart({
  data,
  dataKey,
  color,
}: {
  data: { label: string; [k: string]: number | string }[];
  dataKey: string;
  color: string;
}) {
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="label" stroke="#a1a1aa" fontSize={11} />
          <YAxis stroke="#a1a1aa" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 8,
              color: '#f4f4f5',
            }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Componentes ---------- */

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-4 text-center border ${
        highlight
          ? 'bg-accent/10 border-accent/30 shadow-glow'
          : 'bg-bg-surface border-white/5'
      }`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-lg font-bold tracking-tight">{value}</div>
      <div className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function VolumeBar({
  group,
}: {
  group: {
    group: string;
    count: number;
    target: { min: number; max: number; optimal: number };
    status: 'baixo' | 'ótimo' | 'alto';
  };
}) {
  const { count, target, status } = group;
  const pct = Math.min(100, (count / target.max) * 100);

  const statusColor = {
    baixo: 'text-blue-400',
    ótimo: 'text-emerald-400',
    alto: 'text-amber-400',
  }[status];

  const barColor = {
    baixo: 'bg-blue-500',
    ótimo: 'bg-emerald-500',
    alto: 'bg-amber-500',
  }[status];

  const statusLabel = {
    baixo: '↓ abaixo',
    ótimo: '✓ ótimo',
    alto: '↑ alto',
  }[status];

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{group.group}</span>
          <span className={`text-[10px] ${statusColor}`}>{statusLabel}</span>
        </div>
        <span className="text-xs text-zinc-400">
          <strong className="text-white">{count}</strong>
          <span className="text-zinc-500">
            {' '}
            / {target.min}–{target.max}
          </span>
        </span>
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
        <div
          className="absolute top-0 h-full bg-white/5"
          style={{
            left: `${(target.min / target.max) * 100}%`,
            width: `${((target.max - target.min) / target.max) * 100}%`,
          }}
        />
        <div
          className={`h-full ${barColor} transition-all duration-500 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function FiberBar({
  group,
}: {
  group: {
    group: string;
    countTypeI: number;
    countTypeII: number;
    ratio: number;
    status: 'pouco-II' | 'equilibrado' | 'muito-II' | 'sem-dados';
  };
}) {
  const pctII = Math.round(group.ratio * 100);

  const statusColor = {
    'pouco-II': 'text-blue-400',
    equilibrado: 'text-emerald-400',
    'muito-II': 'text-amber-400',
    'sem-dados': 'text-zinc-500',
  }[group.status];

  const statusLabel = {
    'pouco-II': '↓ pouco estímulo tipo II',
    equilibrado: '✓ equilibrado',
    'muito-II': '↑ muito tipo II',
    'sem-dados': 'sem dados',
  }[group.status];

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{group.group}</span>
          <span className={`text-[10px] ${statusColor}`}>{statusLabel}</span>
        </div>
        <span className="text-[10px] text-zinc-500">
          {group.countTypeII}/{group.countTypeI} tipo II
        </span>
      </div>

      <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden relative">
        <div className="absolute inset-0 bg-blue-900/40" />
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            group.status === 'pouco-II'
              ? 'bg-blue-500'
              : group.status === 'muito-II'
              ? 'bg-amber-500'
              : 'bg-gradient-to-r from-blue-500 to-emerald-500'
          }`}
          style={{ width: `${pctII}%` }}
        />
      </div>

      <div className="text-[10px] text-zinc-500 mt-1">
        {pctII}% das séries ativaram fibras tipo II
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function formatTotalTime(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}min`;
}

function computeStreak(timestamps: number[]) {
  const days = new Set(
    timestamps.map((t) => new Date(t).toISOString().slice(0, 10))
  );
  if (days.size === 0) return 0;

  const today = new Date();
  let streak = 0;
  const cursor = new Date(today);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0 && key === today.toISOString().slice(0, 10)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function computeWeeklyVolume(
  sessions: { id?: number; startedAt: number }[],
  sets: { sessionId: number; reps: number; weight: number }[],
  weeks: number
) {
  const data: { label: string; volume: number }[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - i * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const sessionIds = new Set(
      sessions
        .filter(
          (s) => s.startedAt >= start.getTime() && s.startedAt < end.getTime()
        )
        .map((s) => s.id)
    );
    const vol = sets
      .filter((x) => sessionIds.has(x.sessionId))
      .reduce((a, x) => a + x.reps * x.weight, 0);

    data.push({
      label: `S${i === 0 ? 'atual' : `-${i}`}`,
      volume: Math.round(vol),
    });
  }
  return data;
}

function computeWeeklySessions(
  sessions: { startedAt: number }[],
  weeks: number
) {
  const data: { label: string; count: number }[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - i * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const count = sessions.filter(
      (s) => s.startedAt >= start.getTime() && s.startedAt < end.getTime()
    ).length;
    data.push({
      label: `S${i === 0 ? 'atual' : `-${i}`}`,
      count,
    });
  }
  return data;
}