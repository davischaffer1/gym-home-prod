import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { SubScreen, Card, SectionTitle, Badge } from './ui';
import {
  estimate1RMPrecise,
  extract1RMTimeline,
  forecastPR,
} from './trainingScience';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface Props {
  onBack: () => void;
}

export default function ExerciseProgressView({ onBack }: Props) {
  const [exerciseName, setExerciseName] = useState<string | null>(null);

  // Lista de exercícios únicos que já têm séries registradas
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
        <p className="text-text-3 text-center py-10">Carregando...</p>
      )}

      {exercisesWithData?.length === 0 && (
        <Card variant="subtle">
          <p className="text-text-3 text-sm text-center py-10">
            Nenhum exercício com séries registradas ainda.
            <br />
            Complete algumas sessões primeiro.
          </p>
        </Card>
      )}

      {exercisesWithData && exercisesWithData.length > 0 && selected && (
        <>
          {/* Seletor de exercício */}
          <div className="mb-4">
            <label className="text-xs text-text-3 uppercase tracking-wider font-semibold px-1 block mb-2">
              Escolha o exercício
            </label>
            <select
              value={selected}
              onChange={(e) => setExerciseName(e.target.value)}
              className="w-full bg-bg-1 border border-white/[0.06] rounded-2xl px-4 py-3 text-base text-text-0 outline-none focus:border-accent/40 appearance-none cursor-pointer"
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

/* ══════════════════════════════════════════════════════════
   GRÁFICO + CARDS + PREVISÃO
   ══════════════════════════════════════════════════════════ */

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

      // Agrupa por sessão
      const bySession = new Map<number, typeof filtered>();
      for (const s of filtered) {
        if (!bySession.has(s.sessionId)) bySession.set(s.sessionId, []);
        bySession.get(s.sessionId)!.push(s);
      }

      // Constrói pontos do gráfico
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

      // Faixa alvo (pegando do primeiro exercício com target definido)
      const exercise = exercises.find(
        (e) => e.targetRepsMin !== undefined || e.targetRepsMax !== undefined
      );

      // Timeline para previsão
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
    return <p className="text-text-3 text-center py-10">Carregando gráfico...</p>;
  }

  if (data.points.length === 0) {
    return (
      <Card variant="subtle">
        <p className="text-text-3 text-sm text-center py-8">
          Sem séries registradas para esse exercício.
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

  // 🔮 Previsão de PR
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
      {/* Cards de destaque */}
      <div className="grid grid-cols-2 gap-2">
        <MiniCard
          label="Carga atual"
          value={`${lastPoint.maxWeight} kg`}
          sub={`${lastPoint.topReps} reps`}
        />
        <MiniCard
          label="1RM estimado"
          value={`${lastPoint.oneRM} kg`}
          sub="Epley + Brzycki"
          accent
        />
        <MiniCard
          label="Progresso total"
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

      {/* Gráfico */}
      <Card>
        <h3 className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-3">
          Evolução de carga
        </h3>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={data.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f26" />
              <XAxis
                dataKey="date"
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: '#0f0f12',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  color: '#d4d4d8',
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'oneRM') return [`${value} kg`, '1RM est.'];
                  return [`${value} kg`, 'Carga máx'];
                }}
              />
              <Line
                type="monotone"
                dataKey="maxWeight"
                stroke="#22d3a8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#22d3a8' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="oneRM"
                stroke="#a78bfa"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-text-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-accent rounded-full" /> Carga máx
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-purple rounded-full opacity-70" />{' '}
            1RM est.
          </span>
        </div>
      </Card>

      {/* Faixa alvo */}
      {data.targetMin && data.targetMax && (
        <div className="text-center text-[11px] text-text-3">
          🎯 Faixa alvo: <strong className="text-text-1">{data.targetMin}–{data.targetMax}</strong> reps
        </div>
      )}

      {/* 🔮 Previsão de PR */}
      {nextForecast && nextForecast.weeksToTarget !== null && (
        <section className="bg-purple/5 border border-purple/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-purple">
              🔮 Previsão de PR
            </h3>
            <Badge variant="purple">
              {nextForecast.rate.confidenceLevel === 'alta'
                ? '● alta'
                : nextForecast.rate.confidenceLevel === 'média'
                ? '● média'
                : '● baixa'}
            </Badge>
          </div>

          <ForecastItem
            label="Próximo passo"
            target={nextForecast.target}
            forecast={nextForecast}
            accent="accent"
          />

          {stretchForecast && stretchForecast.weeksToTarget !== null && (
            <ForecastItem
              label="Meta esticada"
              target={stretchForecast.target}
              forecast={stretchForecast}
              accent="purple"
            />
          )}

          {/* Taxa de progresso */}
          <div className="bg-bg-2 rounded-xl px-3 py-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-text-3">Taxa de progresso</span>
              <span
                className={`font-semibold ${
                  nextForecast.rate.slopePerWeek > 0
                    ? 'text-accent'
                    : 'text-danger'
                }`}
              >
                {nextForecast.rate.slopePerWeek > 0 ? '+' : ''}
                {nextForecast.rate.slopePerWeek} kg/semana
              </span>
            </div>
            <div className="text-[10px] text-text-3 mt-1">
              Baseado em {nextForecast.rate.dataPoints} sessões
            </div>
          </div>

          <div className="text-[10px] text-text-3 pt-2 border-t border-white/[0.05]">
            Base: Stone (1981), Rhea (2002), Helms (2018)
          </div>
        </section>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPONENTES
   ══════════════════════════════════════════════════════════ */

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
          ? 'bg-purple/10 border-purple/20'
          : 'bg-bg-1 border-white/[0.06]'
      }`}
    >
      <div className="text-[10px] text-text-3 uppercase tracking-wider font-medium">
        {label}
      </div>
      <div
        className={`text-lg font-bold tracking-tight mt-0.5 ${
          accent
            ? 'text-purple'
            : positive
            ? 'text-accent'
            : 'text-text-0'
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-text-3 mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function ForecastItem({
  label,
  target,
  forecast,
  accent,
}: {
  label: string;
  target: number;
  forecast: {
    weeksToTarget: number | null;
    estimatedDate: number | null;
    gap: number;
    note: string;
  };
  accent: 'accent' | 'purple';
}) {
  const color = accent === 'accent' ? 'text-accent' : 'text-purple';

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="bg-bg-2 rounded-xl px-3 py-2.5 space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-text-3 uppercase tracking-wider">
          {label}
        </span>
        <span className={`text-sm font-bold ${color}`}>{target} kg</span>
      </div>

      {forecast.weeksToTarget !== null ? (
        <>
          <div className="flex justify-between text-[11px]">
            <span className="text-text-2">
              Faltam <strong className="text-text-0">{forecast.gap} kg</strong>
            </span>
            <span className="text-text-2">
              ~
              <strong className="text-text-0">
                {forecast.weeksToTarget} sem
              </strong>
            </span>
          </div>
          {forecast.estimatedDate && (
            <div className="text-[10px] text-text-3">
              📅 {formatDate(forecast.estimatedDate)}
            </div>
          )}
        </>
      ) : (
        <div className="text-[11px] text-text-3">Sem previsão confiável</div>
      )}

      <div className="text-[10px] text-text-3 italic pt-1">
        {forecast.note}
      </div>
    </div>
  );
}