import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { SubScreen, Card, Badge } from './ui';
import { StaggerItem } from './Motion';
import { ForceLineChart } from './ForceCharts';
import {
  estimate1RMPrecise,
  extract1RMTimeline,
  forecastPR,
} from './trainingScience';

interface Props {
  onBack: () => void;
}

export default function ExerciseProgressView({ onBack }: Props) {
  const [exerciseName, setExerciseName] = useState<string | null>(null);

  const exercisesWithData = useLiveQuery(async () => {
    const exercises = await db.exercises.toArray();
    const sets = await db.sets.toArray();

    const withData = new Map<string, { name: string; count: number }>();
    for (const s of sets) {
      const ex = exercises.find((e) => e.id === s.exerciseId);
      if (!ex) continue;
      const entry = withData.get(ex.name) ?? { name: ex.name, count: 0 };
      entry.count++;
      withData.set(ex.name, entry);
    }

    return Array.from(withData.values()).sort((a, b) => b.count - a.count);
  }, []);

  const selected = exerciseName ?? exercisesWithData?.[0]?.name ?? null;

  return (
    <SubScreen title="Evolução" onBack={onBack}>
      {exercisesWithData === undefined && (
        <p className="text-text-3 text-center py-10 font-mono-ui uppercase tracking-wider text-[11px]">
          Carregando...
        </p>
      )}

      {exercisesWithData?.length === 0 && (
        <Card variant="glass">
          <p className="text-text-3 text-sm text-center py-10 font-mono-ui text-[11px] uppercase tracking-wider">
            Nenhum exercício registrado ainda
          </p>
        </Card>
      )}

      {exercisesWithData && exercisesWithData.length > 0 && selected && (
        <>
          <div className="mb-5">
            <label className="text-[10px] text-text-3 uppercase tracking-[0.15em] font-mono-ui font-bold px-1 block mb-2">
              Escolha o exercício
            </label>
            <select
              value={selected}
              onChange={(e) => setExerciseName(e.target.value)}
              className="w-full bg-bg-1 border border-white/[0.06] rounded-2xl px-4 py-3.5 text-base font-display text-text-0 outline-none focus:border-accent/50 focus:shadow-glow-accent transition-all appearance-none cursor-pointer"
            >
              {exercisesWithData.map((e) => (
                <option key={e.name} value={e.name}>
                  {e.name} ({e.count} séries)
                </option>
              ))}
            </select>
          </div>

          <ExerciseChart exerciseName={selected} />
        </>
      )}
    </SubScreen>
  );
}

function ExerciseChart({ exerciseName }: { exerciseName: string }) {
  const data = useLiveQuery(
    async () => {
      const exercises = await db.exercises
        .where('name')
        .equals(exerciseName)
        .toArray();

      if (exercises.length === 0) return null;

      const exerciseIds = exercises.map((e) => e.id!);
      const allSets = await db.sets.toArray();
      const filtered = allSets.filter(
        (s) => exerciseIds.includes(s.exerciseId) && s.type !== 'warmup'
      );

      const sessions = await db.sessions.toArray();
      const sessionMap = new Map(sessions.map((s) => [s.id!, s]));

      const bySession = new Map<number, typeof filtered>();
      for (const s of filtered) {
        if (!bySession.has(s.sessionId)) bySession.set(s.sessionId, []);
        bySession.get(s.sessionId)!.push(s);
      }

      const points = Array.from(bySession.entries())
        .map(([sessionId, list]) => {
          const session = sessionMap.get(sessionId);
          if (!session) return null;
          const maxWeight = Math.max(...list.map((s) => s.weight));
          const topReps = Math.max(
            ...list.filter((s) => s.weight === maxWeight).map((s) => s.reps)
          );
          const oneRM = estimate1RMPrecise(maxWeight, topReps);
          return {
            date: new Date(session.startedAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
            }),
            timestamp: session.startedAt,
            maxWeight,
            topReps,
            oneRM,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => a.timestamp - b.timestamp);

      const exercise = exercises.find(
        (e) => e.targetRepsMin !== undefined || e.targetRepsMax !== undefined
      );

      const timeline = extract1RMTimeline(filtered, sessions);

      return {
        points,
        targetMin: exercise?.targetRepsMin,
        targetMax: exercise?.targetRepsMax,
        timeline,
      };
    },
    [exerciseName]
  );

  if (!data) {
    return (
      <p className="text-text-3 text-center py-10 font-mono-ui uppercase tracking-wider text-[11px]">
        Carregando gráfico...
      </p>
    );
  }

  if (data.points.length === 0) {
    return (
      <Card variant="glass">
        <p className="text-text-3 text-sm text-center py-8 font-mono-ui text-[11px] uppercase tracking-wider">
          Sem séries para esse exercício
        </p>
      </Card>
    );
  }

  const lastPoint = data.points[data.points.length - 1];
  const firstPoint = data.points[0];
  const gain = lastPoint.maxWeight - firstPoint.maxWeight;
  const gainPct =
    firstPoint.maxWeight > 0
      ? Math.round((gain / firstPoint.maxWeight) * 100)
      : 0;

  // Chart data (maxWeight + oneRM)
  const chartData = data.points.map((p) => ({
    label: p.date,
    value: p.maxWeight,
    value2: p.oneRM,
  }));

  // Previsão
  let nextForecast: ReturnType<typeof forecastPR> | null = null;
  let stretchForecast: ReturnType<typeof forecastPR> | null = null;

  if (data.timeline.length >= 3) {
    const currentBest = data.timeline[data.timeline.length - 1].oneRM;
    const step = currentBest < 100 ? 5 : 10;
    const nextTarget = Math.ceil((currentBest + 0.1) / step) * step;
    const stretchTarget = Math.ceil((currentBest * 1.25) / step) * step;

    nextForecast = forecastPR(data.timeline, nextTarget);
    stretchForecast = forecastPR(data.timeline, stretchTarget);
  }

  return (
    <div className="space-y-4">
      {/* Stats principais */}
      <StaggerItem delay={0}>
        <div className="grid grid-cols-2 gap-2">
          <MiniCard
            label="Carga Atual"
            value={`${lastPoint.maxWeight} kg`}
            sub={`${lastPoint.topReps} reps`}
          />
          <MiniCard
            label="1RM Estimado"
            value={`${Math.round(lastPoint.oneRM)} kg`}
            sub="Epley + Brzycki"
            accent
          />
          <MiniCard
            label="Progresso"
            value={`${gain > 0 ? '+' : ''}${gain} kg`}
            sub={`${gainPct > 0 ? '+' : ''}${gainPct}%`}
            positive={gain > 0}
          />
          <MiniCard
            label="Sessões"
            value={String(data.points.length)}
            sub="registradas"
          />
        </div>
      </StaggerItem>

      {/* Gráfico principal */}
      <StaggerItem delay={0.1}>
        <Card>
          <ForceLineChart
            data={chartData}
            title="Evolução de Carga"
            color="#06b6d4"
            colorSecondary="#a78bfa"
            height={240}
            formatValue={(v) => `${Math.round(v)}kg`}
          />

          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] font-mono-ui uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-text-3">
              <span className="w-3 h-0.5 bg-accent rounded-full" />
              Carga
            </span>
            <span className="flex items-center gap-1.5 text-text-3">
              <span className="w-3 h-0.5 bg-sci rounded-full opacity-70" />
              1RM est.
            </span>
          </div>
        </Card>
      </StaggerItem>

      {/* Faixa alvo */}
      {data.targetMin && data.targetMax && (
        <StaggerItem delay={0.15}>
          <div className="text-center text-[11px] text-text-3 font-mono-ui uppercase tracking-wider">
            🎯 Faixa alvo:{' '}
            <strong className="text-text-1">
              {data.targetMin}–{data.targetMax}
            </strong>{' '}
            reps
          </div>
        </StaggerItem>
      )}

      {/* Previsão de PR */}
      {nextForecast && nextForecast.weeksToTarget !== null && (
        <StaggerItem delay={0.2}>
          <Card variant="sci">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-sci font-display">
                🔮 Previsão de PR
              </div>
              <Badge variant="sci">
                {nextForecast.rate.confidenceLevel}
              </Badge>
            </div>

            <ForecastItem
              label="Próximo passo"
              target={nextForecast.target}
              forecast={nextForecast}
              color="accent"
            />

            {stretchForecast && stretchForecast.weeksToTarget !== null && (
              <div className="mt-3">
                <ForecastItem
                  label="Meta esticada"
                  target={stretchForecast.target}
                  forecast={stretchForecast}
                  color="sci"
                />
              </div>
            )}

            <div className="bg-bg-2 rounded-xl px-3 py-2 mt-3 text-[11px] font-mono-ui">
              <div className="flex justify-between">
                <span className="text-text-3 uppercase tracking-wider">
                  Taxa
                </span>
                <span
                  className={`font-bold ${
                    nextForecast.rate.slopePerWeek > 0
                      ? 'text-accent'
                      : 'text-danger'
                  }`}
                >
                  {nextForecast.rate.slopePerWeek > 0 ? '+' : ''}
                  {nextForecast.rate.slopePerWeek} kg/sem
                </span>
              </div>
              <div className="text-[9px] text-text-3 mt-1">
                {nextForecast.rate.dataPoints} sessões
              </div>
            </div>

            <div className="text-[9px] text-text-3 pt-2 mt-3 border-t border-white/[0.04] italic font-mono-ui uppercase tracking-wider">
              Stone (1981) · Rhea (2002) · Helms (2018)
            </div>
          </Card>
        </StaggerItem>
      )}
    </div>
  );
}

function MiniCard({
  label,
  value,
  sub,
  accent,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3.5 border ${
        accent
          ? 'bg-sci/10 border-sci/25 shadow-card'
          : 'bg-bg-1 border-white/[0.06] shadow-card'
      }`}
    >
      <div className="text-[9px] text-text-3 uppercase tracking-[0.15em] font-mono-ui font-bold">
        {label}
      </div>
      <div
        className={`text-xl font-bold tracking-tight mt-1 font-mono-ui ${
          accent
            ? 'text-sci'
            : positive
            ? 'text-accent'
            : 'text-text-0'
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[9px] text-text-3 mt-0.5 font-mono-ui">
          {sub}
        </div>
      )}
    </div>
  );
}

function ForecastItem({
  label,
  target,
  forecast,
  color,
}: {
  label: string;
  target: number;
  forecast: {
    weeksToTarget: number | null;
    estimatedDate: number | null;
    gap: number;
    note: string;
  };
  color: 'accent' | 'sci';
}) {
  const c = color === 'accent' ? 'text-accent' : 'text-sci';

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="bg-bg-2 rounded-xl px-3 py-2.5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui">
          {label}
        </span>
        <span className={`text-sm font-bold font-mono-ui ${c}`}>
          {target} kg
        </span>
      </div>

      {forecast.weeksToTarget !== null ? (
        <>
          <div className="flex justify-between text-[11px] font-mono-ui">
            <span className="text-text-2">
              <strong className="text-text-0">{forecast.gap} kg</strong>
            </span>
            <span className="text-text-2">
              ~<strong className="text-text-0">
                {forecast.weeksToTarget} sem
              </strong>
            </span>
          </div>
          {forecast.estimatedDate && (
            <div className="text-[9px] text-text-3 mt-1 font-mono-ui uppercase tracking-wider">
              📅 {formatDate(forecast.estimatedDate)}
            </div>
          )}
        </>
      ) : (
        <div className="text-[10px] text-text-3 font-mono-ui">
          Sem previsão
        </div>
      )}

      <div className="text-[9px] text-text-3 italic pt-1.5 font-mono-ui">
        {forecast.note}
      </div>
    </div>
  );
}