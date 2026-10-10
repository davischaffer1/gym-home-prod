import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import {
  detectPlateau,
  shouldDeload,
  countEffectiveSetsByGroup,
  countFiberVolumeByGroup,
  extract1RMTimeline,
  forecastPR,
  estimate1RMPrecise,
} from './trainingScience';
import {
  calculateReadiness,
  calculateACWR,
  calculateStrain,
  calculateSessionRPE,
} from './sportsScience';
import { ForceLineChart, ForceBarChart } from './ForceCharts';
import { SubScreen, Card, SectionTitle, Badge } from './ui';
import { StaggerItem } from './Motion';
import { motion } from 'framer-motion';

interface Props {
  onBack: () => void;
}

export default function DashboardView({ onBack }: Props) {
  // ══════════════ TODOS OS HOOKS NO TOPO ══════════════
  const sessions = useLiveQuery(async () => {
    const all = await db.sessions
      .filter((s) => s.finishedAt !== undefined)
      .toArray();
    return all.sort((a, b) => b.startedAt - a.startedAt);
  }, []);

  const sets = useLiveQuery(() => db.sets.toArray(), []);
  const meta = useLiveQuery(() => db.meta.toCollection().first(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

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

  // ══════════════ RETORNO CONDICIONAL ══════════════
  if (!sessions || !sets || !exercises) {
    return (
      <SubScreen title="Análise" onBack={onBack}>
        <div className="flex items-center justify-center py-20">
          <p className="text-text-3 font-mono-ui uppercase tracking-wider text-[11px]">
            Carregando...
          </p>
        </div>
      </SubScreen>
    );
  }

  // ══════════════ CÁLCULOS ══════════════

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

  // Séries efetivas
  const effectiveSets = countEffectiveSetsByGroup(sets, exercises, 1);
  const visibleGroups = effectiveSets.filter(
    (g) => g.count > 0 || g.status === 'baixo'
  );

  // Ativação de fibras
  const fiberVolume = countFiberVolumeByGroup(sets, exercises, 1);
  const visibleFiber = fiberVolume.filter((g) => g.totalEffective > 0);

  // Readiness
  const readiness = (() => {
    if (sessions.length === 0) return null;
    const lastSession = sessions[0];
    const daysSince = Math.floor(
      (Date.now() - lastSession.startedAt) / (24 * 60 * 60 * 1000)
    );
    return calculateReadiness({
      daysSinceLastWorkout: daysSince,
      soreness: 2,
      sleepHours: 7.5,
      stress: 2,
      mood: 4,
    });
  })();

  // Loads (session-RPE)
  const dailyLoads = (() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const key = new Date(s.startedAt).toISOString().slice(0, 10);
      const durationMin = Math.round(
        (s.finishedAt! - s.startedAt - (s.totalPausedMs ?? 0)) / 60000
      );
      const sessSets = sets.filter((x) => x.sessionId === s.id);
      const rpes = sessSets
        .filter((x) => x.rpe !== undefined)
        .map((x) => x.rpe!);
      const avgRPE =
        rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 7;
      const load = calculateSessionRPE(durationMin, avgRPE);
      map.set(key, (map.get(key) ?? 0) + load);
    }
    return Array.from(map.entries()).map(([date, load]) => ({ date, load }));
  })();

  const acwr = dailyLoads.length > 0 ? calculateACWR(dailyLoads) : null;
  const strain = dailyLoads.length > 0 ? calculateStrain(dailyLoads) : null;

  // Gráfico: volume semanal (últimas 8 semanas)
  const weeklyVolume = (() => {
    const data: { label: string; value: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      const sessionIds = new Set(
        sessions
          .filter(
            (s) =>
              s.startedAt >= start.getTime() && s.startedAt < end.getTime()
          )
          .map((s) => s.id)
      );
      const vol = sets
        .filter((x) => sessionIds.has(x.sessionId))
        .reduce((a, x) => a + x.reps * x.weight, 0);

      data.push({
        label: i === 0 ? 'Atual' : `S-${i}`,
        value: Math.round(vol),
      });
    }
    return data;
  })();

  // Gráfico: treinos por semana
  const weeklySessions = (() => {
    const data: { label: string; value: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const count = sessions.filter(
        (s) => s.startedAt >= start.getTime() && s.startedAt < end.getTime()
      ).length;
      data.push({
        label: i === 0 ? 'Atual' : `S-${i}`,
        value: count,
      });
    }
    return data;
  })();

  // Gráfico: carga diária (últimos 14 dias)
  const dailyLoadChart = (() => {
    const data: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const load = dailyLoads.find((l) => l.date === key)?.load ?? 0;
      data.push({
        label: d.getDate().toString().padStart(2, '0'),
        value: load,
      });
    }
    return data;
  })();

  // Deload
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

  // ══════════════ RENDER ══════════════
  return (
    <SubScreen title="Análise" onBack={onBack}>
      {/* Deload banner */}
      {deloadInfo.yes && (
        <StaggerItem delay={0}>
          <Card variant="accent" glow className="mb-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <div className="font-bold text-accent font-display mb-1">
                  Considere deload
                </div>
                <div className="text-xs text-text-2 leading-relaxed">
                  {deloadInfo.reason}. Reduza o volume em ~40-50%.
                </div>
                <div className="text-[9px] text-text-3 mt-2 font-mono-ui uppercase tracking-wider">
                  Bell 2020 · Issurin 2010
                </div>
              </div>
            </div>
            <button
              onClick={markDeloadDone}
              className="w-full bg-accent hover:bg-accent-hover text-black py-2.5 rounded-xl text-xs font-bold font-display active:scale-[0.98] transition-all"
            >
              ✅ Marcar como feito
            </button>
          </Card>
        </StaggerItem>
      )}

      {/* Readiness */}
      {readiness && (
        <StaggerItem delay={0.05}>
          <ReadinessCard data={readiness} />
        </StaggerItem>
      )}

      {/* ACWR */}
      {acwr && (
        <StaggerItem delay={0.1}>
          <ACWRCard data={acwr} />
        </StaggerItem>
      )}

      {/* Strain */}
      {strain && strain.weeklyLoad > 0 && (
        <StaggerItem delay={0.15}>
          <StrainCard data={strain} />
        </StaggerItem>
      )}

      {/* Stats rápidos */}
      <StaggerItem delay={0.2}>
        <div className="grid grid-cols-2 gap-2 mb-4 mt-4">
          <MiniStat
            icon="🔥"
            value={String(streak)}
            label="Streak"
            highlight={streak >= 3}
          />
          <MiniStat
            icon="📅"
            value={String(weekSessions.length)}
            label="Semana"
          />
          <MiniStat
            icon="🗓"
            value={String(monthSessions.length)}
            label="Mês"
          />
          <MiniStat
            icon="⏱"
            value={formatTotalTime(totalMinutes)}
            label="Tempo"
          />
          <MiniStat
            icon="🔁"
            value={String(sets.length)}
            label="Séries"
          />
          <MiniStat
            icon="📦"
            value={`${Math.round(totalVolume / 1000)}t`}
            label="Volume"
          />
        </div>
      </StaggerItem>

      {/* Gráfico: Volume semanal */}
      <StaggerItem delay={0.25}>
        <Card className="mb-4">
          <ForceBarChart
            data={weeklyVolume}
            title="Volume Semanal (kg)"
            color="#06b6d4"
            height={180}
            formatValue={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
        </Card>
      </StaggerItem>

      {/* Gráfico: Carga diária */}
      <StaggerItem delay={0.3}>
        <Card className="mb-4">
          <ForceLineChart
            data={dailyLoadChart}
            title="Carga Diária (sRPE)"
            color="#a78bfa"
            height={180}
          />
        </Card>
      </StaggerItem>

      {/* Gráfico: Treinos por semana */}
      <StaggerItem delay={0.35}>
        <Card className="mb-4">
          <ForceBarChart
            data={weeklySessions}
            title="Treinos / Semana"
            color="#60a5fa"
            height={140}
          />
        </Card>
      </StaggerItem>

      {/* Séries efetivas */}
      {visibleGroups.length > 0 && (
        <StaggerItem delay={0.4}>
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-bold text-text-0 font-display">
                  🎯 Séries Efetivas
                </div>
                <div className="text-[9px] text-text-3 italic mt-0.5 font-mono-ui">
                  Refalo (2021, 2023) · Schoenfeld (2021)
                </div>
              </div>
              <Badge variant="accent">RIR ≤ 3</Badge>
            </div>

            <div className="space-y-3">
              {visibleGroups.map((g) => (
                <EffectiveSetBar key={g.group} group={g} />
              ))}
            </div>
          </Card>
        </StaggerItem>
      )}

      {/* Ativação de fibras */}
      {visibleFiber.length > 0 && (
        <StaggerItem delay={0.45}>
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-bold text-text-0 font-display">
                  🧪 Ativação de Fibras
                </div>
                <div className="text-[9px] text-text-3 italic mt-0.5 font-mono-ui">
                  Henneman (1965) · Grgic (2020)
                </div>
              </div>
              <Badge variant="sci">Tipo I / II</Badge>
            </div>

            <div className="space-y-3">
              {visibleFiber.map((g) => (
                <FiberBar key={g.group} group={g} />
              ))}
            </div>
          </Card>
        </StaggerItem>
      )}

      {/* Próximo PR */}
      {bestForecast?.forecast &&
        bestForecast.forecast.weeksToTarget !== null && (
          <StaggerItem delay={0.5}>
            <Card variant="sci" className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-sci font-display">
                  🔮 PR mais Próximo
                </div>
                <Badge variant="sci">
                  {bestForecast.forecast.rate.confidenceLevel}
                </Badge>
              </div>

              <div className="text-sm text-text-1 mb-3">
                <strong className="font-display">
                  {bestForecast.exerciseName}
                </strong>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-sci font-mono-ui">
                    {bestForecast.forecast.target} kg
                  </div>
                  <div className="text-[10px] text-text-3 font-mono-ui">
                    +{bestForecast.forecast.gap} kg
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono-ui text-text-0">
                    ~{bestForecast.forecast.weeksToTarget} sem
                  </div>
                  <div className="text-[10px] text-text-3 font-mono-ui">
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

              <div className="text-[9px] text-text-3 mt-3 pt-2 border-t border-white/[0.04] italic font-mono-ui">
                {bestForecast.forecast.note}
              </div>
            </Card>
          </StaggerItem>
        )}

      {/* Últimas sessões */}
      <StaggerItem delay={0.55}>
        <Card>
          <div className="text-xs font-bold text-text-0 font-display mb-3">
            Últimas Sessões
          </div>
          <div className="space-y-2">
            {sessions.slice(0, 5).map((s) => {
              const sessSets = sets.filter((x) => x.sessionId === s.id);
              const vol = sessSets.reduce((a, x) => a + x.reps * x.weight, 0);
              const mins = Math.round(
                (s.finishedAt! - s.startedAt - (s.totalPausedMs ?? 0)) / 60000
              );
              return (
                <div
                  key={s.id}
                  className="flex justify-between items-center bg-bg-2 border border-white/[0.04] rounded-xl px-3 py-2"
                >
                  <span className="text-[11px] font-mono-ui text-text-2">
                    {new Date(s.startedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                  <span className="text-[11px] font-mono-ui text-text-3">
                    {sessSets.length}·{Math.round(vol / 1000)}t·{mins}m
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </StaggerItem>

      <div className="text-[9px] text-text-3 text-center mt-6 italic font-mono-ui uppercase tracking-[0.15em]">
        Force Field · Análise Científica
      </div>
    </SubScreen>
  );
}

/* ══════════════ SUB-COMPONENTES ══════════════ */

function ReadinessCard({
  data,
}: {
  data: {
    score: number;
    level: string;
    recommendation: string;
    factors: { name: string; score: number; weight: number }[];
  };
}) {
  const color =
    data.score >= 85
      ? 'text-accent'
      : data.score >= 70
      ? 'text-accent'
      : data.score >= 50
      ? 'text-warn'
      : 'text-danger';

  const bg =
    data.score >= 70
      ? 'bg-accent-dim border-accent/25'
      : data.score >= 50
      ? 'bg-warn/5 border-warn/25'
      : 'bg-danger/5 border-danger/25';

  return (
    <div className={`rounded-2xl border p-4 mb-4 shadow-card ${bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold text-text-0 font-display">
            💤 Prontidão
          </div>
          <div className="text-[9px] text-text-3 italic font-mono-ui mt-0.5">
            Saw (2016) · Bourdon (2017)
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold font-mono-ui ${color}`}>
            {data.score}
          </div>
          <div className="text-[9px] text-text-3 font-mono-ui">/100</div>
        </div>
      </div>

      <div className="text-xs text-text-1 mb-3 font-display">
        {data.recommendation}
      </div>

      <div className="space-y-1.5">
        {data.factors.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className="w-20 text-text-3 font-mono-ui uppercase tracking-wider">
              {f.name}
            </span>
            <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${f.score}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="h-full bg-accent/70 rounded-full"
              />
            </div>
            <span className="w-8 text-right text-text-2 font-mono-ui">
              {Math.round(f.score)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ACWRCard({
  data,
}: {
  data: {
    ratio: number;
    acute: number;
    chronic: number;
    zone: 'destreino' | 'ideal' | 'atenção' | 'risco';
    recommendation: string;
  };
}) {
  const color = {
    destreino: 'text-info',
    ideal: 'text-accent',
    atenção: 'text-warn',
    risco: 'text-danger',
  }[data.zone];

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-bold text-text-0 font-display">
            📉 Carga (ACWR)
          </div>
          <div className="text-[9px] text-text-3 italic font-mono-ui mt-0.5">
            Gabbett (2016)
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-3">
        <span className={`text-3xl font-bold font-mono-ui ${color}`}>
          {data.ratio}
        </span>
        <span className="text-[10px] text-text-3 font-mono-ui">
          {data.acute} / {data.chronic}
        </span>
      </div>

      <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden mb-2 relative">
        <div
          className="absolute inset-y-0 bg-accent/20"
          style={{ left: '40%', width: '25%' }}
        />
        <motion.div
          initial={{ left: 0 }}
          animate={{
            left: `${Math.min(95, (data.ratio / 2) * 100)}%`,
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-y-0 w-1 bg-accent rounded-full shadow-glow-accent"
        />
      </div>

      <p className="text-xs text-text-2">{data.recommendation}</p>
    </Card>
  );
}

function StrainCard({
  data,
}: {
  data: {
    weeklyLoad: number;
    monotony: number;
    strain: number;
    warning: string | null;
  };
}) {
  return (
    <Card className="mb-4">
      <div className="mb-3">
        <div className="text-xs font-bold text-text-0 font-display">
          ⚡ Strain & Monotonia
        </div>
        <div className="text-[9px] text-text-3 italic font-mono-ui mt-0.5">
          Foster (1998, 2001)
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg-2 rounded-xl p-2.5 text-center">
          <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mb-1">
            Carga
          </div>
          <div className="text-base font-bold font-mono-ui text-text-0">
            {data.weeklyLoad}
          </div>
        </div>
        <div className="bg-bg-2 rounded-xl p-2.5 text-center">
          <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mb-1">
            Monotonia
          </div>
          <div
            className={`text-base font-bold font-mono-ui ${
              data.monotony > 2 ? 'text-warn' : 'text-text-0'
            }`}
          >
            {data.monotony}
          </div>
        </div>
        <div className="bg-bg-2 rounded-xl p-2.5 text-center">
          <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mb-1">
            Strain
          </div>
          <div
            className={`text-base font-bold font-mono-ui ${
              data.strain > 6000 ? 'text-danger' : 'text-text-0'
            }`}
          >
            {data.strain}
          </div>
        </div>
      </div>

      {data.warning && (
        <p className="text-xs text-warn mt-3 font-display">{data.warning}</p>
      )}
    </Card>
  );
}

function MiniStat({
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
      className={`rounded-2xl p-3 text-center border ${
        highlight
          ? 'bg-accent-dim border-accent/25 shadow-glow-accent'
          : 'bg-bg-1 border-white/[0.06] shadow-card'
      }`}
    >
      <div className="text-lg mb-1">{icon}</div>
      <div
        className={`text-lg font-bold tracking-tight font-mono-ui ${
          highlight ? 'text-accent' : 'text-text-0'
        }`}
      >
        {value}
      </div>
      <div className="text-[9px] text-text-3 uppercase tracking-[0.15em] font-mono-ui mt-0.5">
        {label}
      </div>
    </div>
  );
}

function EffectiveSetBar({
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

  const colorBar = {
    baixo: 'bg-info',
    ótimo: 'bg-accent',
    alto: 'bg-warn',
  }[status];

  const colorText = {
    baixo: 'text-info',
    ótimo: 'text-accent',
    alto: 'text-warn',
  }[status];

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-0">{group.group}</span>
          <span className={`text-[9px] font-mono-ui uppercase tracking-wider font-bold ${colorText}`}>
            {status === 'baixo' ? '↓ abaixo' : status === 'alto' ? '↑ alto' : '✓ ok'}
          </span>
        </div>
        <span className="text-xs font-mono-ui text-text-2">
          <strong className="text-text-0">{count}</strong>
          <span className="text-text-3">
            {' '}
            / {target.min}–{target.max}
          </span>
        </span>
      </div>
      <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden relative">
        <div
          className="absolute top-0 h-full bg-white/[0.03]"
          style={{
            left: `${(target.min / target.max) * 100}%`,
            width: `${((target.max - target.min) / target.max) * 100}%`,
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
          className={`h-full ${colorBar} rounded-full`}
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
    'pouco-II': 'text-info',
    equilibrado: 'text-accent',
    'muito-II': 'text-warn',
    'sem-dados': 'text-text-3',
  }[group.status];

  const statusLabel = {
    'pouco-II': '↓ pouco II',
    equilibrado: '✓ ok',
    'muito-II': '↑ muito II',
    'sem-dados': '—',
  }[group.status];

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-0">{group.group}</span>
          <span className={`text-[9px] font-mono-ui uppercase tracking-wider font-bold ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <span className="text-[9px] text-text-3 font-mono-ui">
          {group.countTypeII}/{group.countTypeI}
        </span>
      </div>

      <div className="w-full h-2.5 bg-bg-2 rounded-full overflow-hidden relative">
        <div className="absolute inset-0 bg-info/20" />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctII}%` }}
          transition={{ duration: 0.6 }}
          className={`absolute inset-y-0 left-0 rounded-full ${
            group.status === 'pouco-II'
              ? 'bg-info'
              : group.status === 'muito-II'
              ? 'bg-warn'
              : 'bg-gradient-to-r from-info to-accent'
          }`}
        />
      </div>
    </div>
  );
}

function formatTotalTime(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h${m}m`;
}

function computeStreak(timestamps: number[]) {
  const days = new Set(
    timestamps.map((t) => new Date(t).toISOString().slice(0, 10))
  );
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (
      streak === 0 &&
      key === new Date().toISOString().slice(0, 10)
    ) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
  }
  return streak;
}