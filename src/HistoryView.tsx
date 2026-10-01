import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { getBestSetBy1RM } from './trainingScience';

interface Props {
  onBack: () => void;
}

export default function HistoryView({ onBack }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);

  const sessions = useLiveQuery(async () => {
    const all = await db.sessions
      .filter((s) => s.finishedAt !== undefined)
      .toArray();
    return all.sort((a, b) => b.startedAt - a.startedAt);
  }, []);

  const workouts = useLiveQuery(() => db.workouts.toArray(), []);

  function workoutName(id: number) {
    return workouts?.find((w) => w.id === id)?.name ?? 'Treino removido';
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function duration(start: number, end: number, pausedMs = 0) {
    const min = Math.max(1, Math.round((end - start - pausedMs) / 60000));
    return `${min} min`;
  }

  if (!sessions) return <p className="p-4 text-zinc-400">Carregando...</p>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📜 Histórico</h1>
        <button
          onClick={onBack}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg"
        >
          Voltar
        </button>
      </div>

      {sessions.length === 0 && (
        <p className="text-zinc-500">Nenhuma sessão finalizada ainda.</p>
      )}

      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="bg-zinc-900 rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenId(openId === s.id ? null : s.id!)}
              className="w-full text-left px-4 py-3 hover:bg-zinc-800 transition"
            >
              <div className="font-semibold">{workoutName(s.workoutId)}</div>
              <div className="text-sm text-zinc-400">
                {formatDate(s.startedAt)} ·{' '}
                {duration(s.startedAt, s.finishedAt!, s.totalPausedMs)}
              </div>
            </button>

            {openId === s.id && <SessionDetails sessionId={s.id!} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SessionDetails({ sessionId }: { sessionId: number }) {
  // 🔝 TODOS os hooks primeiro, sem return no meio
  const sets = useLiveQuery(
    () => db.sets.where('sessionId').equals(sessionId).sortBy('setNumber'),
    [sessionId]
  );
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);

  // ✅ Agora pode ter return condicional
  if (!sets) return <p className="p-4 text-zinc-400">Carregando...</p>;

  // Agrupa por exercício
  const grouped = sets.reduce<Record<number, typeof sets>>((acc, s) => {
    (acc[s.exerciseId] ||= []).push(s);
    return acc;
  }, {});

// ... dentro do SessionDetails, depois de grouped:
const bestByExercise = new Map<number, number>();
for (const [exId, list] of Object.entries(grouped)) {
  const best = getBestSetBy1RM(list);
  if (best) {
    bestByExercise.set(Number(exId), best.estimated1RM);
  }
}

  return (
    <div className="border-t border-zinc-800 p-4 space-y-3">
      {/* 📝 Notas da sessão (se houver) */}
      {session?.notes && (
        <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-300 italic">
          📝 {session.notes}
        </div>
      )}

      {Object.entries(grouped).length === 0 && (
        <p className="text-sm text-zinc-500">
          Nenhuma série registrada nesta sessão.
        </p>
      )}

{Object.entries(grouped).map(([exId, list]) => {
  const ex = exercises?.find((e) => e.id === Number(exId));
  const best1RM = bestByExercise.get(Number(exId));
  return (
    <div key={exId}>
      <div className="flex items-center justify-between">
        <div className="font-medium text-accent-light">
          {ex?.name ?? 'Exercício removido'}
        </div>
        {best1RM && (
          <div className="text-[10px] text-purple-300">
            📊 1RM est.: <strong>{Math.round(best1RM * 10) / 10} kg</strong>
          </div>
        )}
      </div>
      <ul className="text-xs text-zinc-300 space-y-1 mt-1">
        {list.map((s) => (
          <li key={s.id} className="flex justify-between">
            <span>Série {s.setNumber}</span>
            <span className="font-medium">
              {s.reps} × {s.weight} kg
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
})}

    </div>
  );
}
