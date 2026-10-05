import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { estimate1RMPrecise } from './trainingScience';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  extract1RMTimeline,
  forecastPR,
} from './trainingScience';
import { SubScreen } from './ui';

interface Props {
  onBack: () => void;
}

export default function ExerciseProgressView({ onBack }: Props) {
  const [exerciseName, setExerciseName] = useState<string | null>(null);

  // Lista todos os exercícios únicos que já têm séries registradas
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

  if (!exercisesWithData) {
    return <p className="p-4 text-text-2">Carregando...</p>;
  }

  if (exercisesWithData.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">📈 Progresso por Exercício</h1>
          <button
            onClick={onBack}
            className="bg-bg-2 hover:bg-zinc-700 px-4 py-2 rounded-lg"
          >
            Voltar
          </button>
        </div>
        <p className="text-text-3 text-sm">
          Nenhum exercício com séries registradas ainda. Complete algumas
          sessões primeiro.
        </p>
      </div>
    );
  }

  const selected = exerciseName ?? exercisesWithData[0].name;

  return (
    <SubScreen title="ExercisioProgressao" onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📈 Progresso</h1>
        <button
          onClick={onBack}
          className="bg-bg-2 hover:bg-zinc-700 px-4 py-2 rounded-lg"
        >
          Voltar
        </button>
      </div>

      {/* Seletor de exercício */}
      <select
        value={selected}
        onChange={(e) => setExerciseName(e.target.value)}
        className="w-full bg-bg-1 rounded-lg px-3 py-2 outline-none border border-zinc-800"
      >
        {exercisesWithData.map((e) => (
          <option key={e.name} value={e.name}>
            {e.name} ({e.count} séries)
          </option>
        ))}
      </select>

      <ExerciseChart exerciseName={selected} />
    </div>
    </SubScreen>
  );

}

function ExerciseChart({ exerciseName }: { exerciseName: string }) {
  const data = useLiveQuery(async () => {
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

    return {
      points,
      targetMin: exercise?.targetRepsMin,
      targetMax: exercise?.targetRepsMax,
    };
  }, [exerciseName]);

  // 🔮 Previsão até próxima PR
const forecast = useLiveQuery(
  async () => {
    const exercises = await db.exercises
      .where('name')
      .equals(exerciseName)
      .toArray();
    if (exercises.length === 0) return null;

    const exerciseIds = exercises.map((e) => e.id!);
    const allSets = await db.sets.toArray();
    const filtered = allSets.filter((s) => exerciseIds.includes(s.exerciseId));
    const sessions = await db.sessions.toArray();

    const timeline = extract1RMTimeline(filtered, sessions);
    if (timeline.length < 3) return null;

    const currentBest = timeline[timeline.length - 1].oneRM;

    // Alvo 1: próximo passo de 5 kg
    const step = currentBest < 100 ? 5 : 10;
    const nextTarget = Math.ceil((currentBest + 0.1) / step) * step;

    // Alvo 2: 25% acima
    const stretchTarget = Math.ceil((currentBest * 1.25) / step) * step;

    return {
      next: forecastPR(timeline, nextTarget),
      stretch: forecastPR(timeline, stretchTarget),
      timeline,
      currentBest,
    };
  },
  [exerciseName]
);

  if (!data) {
    return <p className="p-4 text-text-2">Carregando gráfico...</p>;
  }

  if (data.points.length === 0) {
    return (
      <p className="text-text-3 text-sm">
        Sem séries registradas para esse exercício.
      </p>
    );
  }

  const lastPoint = data.points[data.points.length - 1];
  const firstPoint = data.points[0];
  const gain = lastPoint.maxWeight - firstPoint.maxWeight;
  const gainPct =
    firstPoint.maxWeight > 0
      ? Math.round((gain / firstPoint.maxWeight) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Cards de destaque */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-1 rounded-2xl p-4 text-center">
          <div className="text-xs text-text-2">Carga atual</div>
          <div className="text-xl font-bold">{lastPoint.maxWeight} kg</div>
          <div className="text-xs text-text-3">{lastPoint.topReps} reps</div>
        </div>
        <div className="bg-bg-1 rounded-2xl p-4 text-center">
          <div className="text-xs text-text-2">1RM estimado</div>
          <div className="text-xl font-bold">{lastPoint.oneRM} kg</div>
          <div className="text-xs text-text-3">Epley</div>
        </div>
        <div className="bg-bg-1 rounded-2xl p-4 text-center">
          <div className="text-xs text-text-2">Progresso total</div>
          <div
            className={`text-xl font-bold ${
              gain > 0 ? 'text-accent' : 'text-text-2'
            }`}
          >
            {gain > 0 ? '+' : ''}
            {gain} kg
          </div>
          <div className="text-xs text-text-3">
            {gainPct > 0 ? '+' : ''}
            {gainPct}%
          </div>
        </div>
        <div className="bg-bg-1 rounded-2xl p-4 text-center">
          <div className="text-xs text-text-2">Sessões</div>
          <div className="text-xl font-bold">{data.points.length}</div>
          <div className="text-xs text-text-3">registradas</div>
        </div>
      </div>

      {/* 🔮 Previsão de PR */}
{forecast?.next && (
  <section className="bg-purple-950/30 border border-purple-800/50 rounded-2xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-purple-200">
        🔮 Previsão de PR
      </h3>
      <span className="text-[10px] text-purple-400">
        Confiança: {forecast.next.rate.confidenceLevel}
      </span>
    </div>

    {/* Alvo próximo */}
    <ForecastItem
      label="Próximo passo"
      target={forecast.next.target}
      forecast={forecast.next}
      accent="emerald"
    />

    {/* Alvo esticado */}
    {forecast.stretch && forecast.stretch.weeksToTarget !== null && (
      <ForecastItem
        label="Meta esticada"
        target={forecast.stretch.target}
        forecast={forecast.stretch}
        accent="purple"
      />
    )}

    {/* Taxa atual */}
    <div className="bg-white/5 rounded-2xl px-3 py-2 text-[11px]">
      <div className="flex justify-between">
        <span className="text-text-2">Taxa de progresso</span>
        <span
          className={`font-semibold ${
            forecast.next.rate.slopePerWeek > 0
              ? 'text-accent'
              : 'text-red-400'
          }`}
        >
          {forecast.next.rate.slopePerWeek > 0 ? '+' : ''}
          {forecast.next.rate.slopePerWeek} kg/semana
        </span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-text-3 text-[10px]">
          Baseado em {forecast.next.rate.dataPoints} sessões
        </span>
      </div>
    </div>

    <div className="text-[10px] text-text-3 pt-2 border-t border-white/[0.06]">
      Base: Stone (1981), Rhea (2002), Helms (2018)
    </div>
  </section>
)}

      {/* Gráfico */}
      <div className="bg-bg-1 rounded-2xl p-4">
        <h3 className="font-semibold mb-3 text-sm text-text-1">
          Evolução de carga
        </h3>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={data.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} />
              <YAxis stroke="#a1a1aa" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: 8,
                  color: '#f4f4f5',
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
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="maxWeight"
              />
              <Line
                type="monotone"
                dataKey="oneRM"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="oneRM"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Info sobre a faixa alvo */}
      {data.targetMin && data.targetMax && (
        <p className="text-xs text-text-3 text-center">
          🎯 Faixa alvo: {data.targetMin}–{data.targetMax} reps
        </p>
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
  accent: 'emerald' | 'purple';
}) {
  const accentColor =
    accent === 'emerald' ? 'text-accent' : 'text-purple-400';

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="bg-white/5 rounded-2xl px-3 py-2.5 space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-text-3 uppercase tracking-wider">
          {label}
        </span>
        <span className={`text-sm font-bold ${accentColor}`}>
          {target} kg
        </span>
      </div>

      {forecast.weeksToTarget !== null ? (
        <>
          <div className="flex justify-between text-[11px]">
            <span className="text-text-2">
              Faltam <strong className="text-white">{forecast.gap} kg</strong>
            </span>
            <span className="text-text-2">
              ~
              <strong className="text-white">
                {forecast.weeksToTarget} semana
                {forecast.weeksToTarget > 1 ? 's' : ''}
              </strong>
            </span>
          </div>
          {forecast.estimatedDate && (
            <div className="text-[10px] text-text-3">
              📅 Por volta de {formatDate(forecast.estimatedDate)}
            </div>
          )}
        </>
      ) : (
        <div className="text-[11px] text-text-2">
          Sem previsão confiável ainda
        </div>
      )}

      <div className="text-[10px] text-text-3 italic pt-1">
        {forecast.note}
      </div>
    </div>
  );
}