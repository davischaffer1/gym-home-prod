import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { detectPlateau, shouldDeload } from './trainingScience';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { countEffectiveSetsByGroup } from './trainingScience';

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

  // ✅ Só depois dos hooks pode ter return
  if (!sessions || !sets) {
    return <p className="p-4 text-zinc-400">Carregando estatísticas...</p>;
  }

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

  // 📊 Séries efetivas por grupo (últimas 1 semana)
const effectiveSets = exercises
? countEffectiveSetsByGroup(sets, exercises, 1)
: [];

// Só mostra grupos com pelo menos 1 série efetiva OU que estejam abaixo do alvo
const visibleGroups = effectiveSets.filter(
(g) => g.count > 0 || g.status === 'baixo'
);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📊 Progresso</h1>
        <button
          onClick={onBack}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg"
        >
          Voltar
        </button>
      </div>

      {/* Banner de deload */}
      {deloadInfo.yes && (
        <div className="bg-amber-950/50 border border-amber-700 rounded-2xl p-4 space-y-3">
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
            className="w-full bg-amber-700 hover:bg-amber-600 py-2 rounded-lg text-sm font-medium text-white"
          >
            ✅ Marcar deload como feito
          </button>
        </div>
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
        <StatCard label="Séries totais" value={String(sets.length)} icon="🔁" />
        <StatCard
          label="Volume total"
          value={`${Math.round(totalVolume).toLocaleString('pt-BR')} kg`}
          icon="📦"
        />
      </div>

      {/* 📊 Séries efetivas por grupo (última semana) */}
{visibleGroups.length > 0 && (
  <section className="bg-bg-surface border border-white/5 rounded-3xl p-4 space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="font-semibold">🎯 Séries efetivas (semana)</h2>
      <span className="text-[10px] text-zinc-500">
        RIR ≤ 3
      </span>
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

      {/* Gráfico: volume por semana */}
      <section className="bg-zinc-900 rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Volume semanal (kg)</h2>
        <WeeklyChart data={weeklyVolume} dataKey="volume" color="#10b981" />
      </section>

      {/* Gráfico: sessões por semana */}
      <section className="bg-zinc-900 rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Treinos por semana</h2>
        <WeeklyChart data={weeklySessions} dataKey="count" color="#3b82f6" />
      </section>

      {/* Resumo das últimas sessões */}
      <section className="bg-zinc-900 rounded-2xl p-4 space-y-3">
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
              className="flex justify-between bg-zinc-800 rounded-lg px-3 py-2 text-sm"
            >
              <span>{new Date(s.startedAt).toLocaleDateString('pt-BR')}</span>
              <span className="text-zinc-400">
                {sessSets.length} séries · {vol.toLocaleString('pt-BR')} kg ·{' '}
                {mins} min
              </span>
            </div>
          );
        })}
      </section>
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

/* ---------- Helpers ---------- */

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
      className={`rounded-2xl p-4 text-center border ${
        highlight
          ? 'bg-emerald-950/50 border-emerald-700'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}

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
          <span className={`text-[10px] ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <span className="text-xs text-zinc-400">
          <strong className="text-white">{count}</strong>
          <span className="text-zinc-500">
            {' '}/ {target.min}–{target.max}
          </span>
        </span>
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
        {/* Faixa ótima (marcador visual) */}
        <div
          className="absolute top-0 h-full bg-white/5"
          style={{
            left: `${(target.min / target.max) * 100}%`,
            width: `${((target.max - target.min) / target.max) * 100}%`,
          }}
        />
        {/* Barra de progresso */}
        <div
          className={`h-full ${barColor} transition-all duration-500 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}