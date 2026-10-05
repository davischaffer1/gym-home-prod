import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { useState } from 'react';
import {
  SubScreen,
  Card,
  SectionTitle,
  Badge,
  StatCard,
} from './ui';
import {
  getBestSetBy1RM,
  estimate1RMPrecise,
  rpeToRIR,
} from './trainingScience';

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

  async function deleteSession(sessionId: number) {
    if (!confirm('Apagar essa sessão? As séries também serão apagadas.'))
      return;
    await db.sets.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  }

  return (
    <SubScreen title="Histórico" onBack={onBack}>
      {sessions === undefined && (
        <p className="text-text-3 text-center py-10">Carregando...</p>
      )}

      {sessions?.length === 0 && (
        <Card variant="subtle">
          <p className="text-text-3 text-sm text-center py-10">
            Nenhuma sessão finalizada ainda
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {sessions?.map((s) => {
          const isOpen = openId === s.id;
          return (
            <Card key={s.id} className="!p-0 overflow-hidden">
              {/* Cabeçalho da sessão */}
              <div className="flex items-stretch">
                <button
                  onClick={() => setOpenId(isOpen ? null : s.id!)}
                  className="flex-1 text-left px-4 py-3 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-text-0">
                      {workoutName(s.workoutId)}
                    </div>
                    {isOpen && <Badge variant="accent">aberto</Badge>}
                  </div>
                  <div className="text-xs text-text-3 mt-0.5">
                    {formatDate(s.startedAt)} ·{' '}
                    {duration(s.startedAt, s.finishedAt!, s.totalPausedMs)}
                  </div>
                </button>
                <button
                  onClick={() => deleteSession(s.id!)}
                  className="px-4 text-danger/70 hover:text-danger hover:bg-danger/10 active:scale-90 transition-all flex items-center justify-center"
                  title="Apagar sessão"
                >
                  🗑
                </button>
              </div>

              {/* Detalhes expandidos */}
              {isOpen && <SessionDetails sessionId={s.id!} />}
            </Card>
          );
        })}
      </div>
    </SubScreen>
  );
}

/* ══════════════════════════════════════════
   DETALHES DA SESSÃO — resumo por exercício
   ══════════════════════════════════════════ */

function SessionDetails({ sessionId }: { sessionId: number }) {
  // Todos os hooks no topo
  const sets = useLiveQuery(
    () => db.sets.where('sessionId').equals(sessionId).sortBy('setNumber'),
    [sessionId]
  );
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);

  if (!sets) return <p className="p-4 text-text-3 text-sm">Carregando...</p>;

  // Agrupa por exercício
  const grouped = sets.reduce<Record<number, typeof sets>>((acc, s) => {
    (acc[s.exerciseId] ||= []).push(s);
    return acc;
  }, {});

  // Métricas gerais
  const totalVolume = sets.reduce((a, s) => a + s.reps * s.weight, 0);
  const totalReps = sets.reduce((a, s) => a + s.reps, 0);
  const uniqueExercises = Object.keys(grouped).length;

  return (
    <div className="border-t border-white/[0.05] p-4 space-y-4 bg-bg-1/50">
      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat value={String(uniqueExercises)} label="Exercícios" />
        <MiniStat value={String(sets.length)} label="Séries" />
        <MiniStat
          value={`${Math.round(totalVolume).toLocaleString('pt-BR')}`}
          label="Volume (kg)"
        />
      </div>

      {/* Notas da sessão */}
      {session?.notes && (
        <div className="bg-bg-2 border border-white/[0.06] rounded-xl p-3">
          <div className="text-[10px] text-text-3 uppercase tracking-wider font-semibold mb-1">
            📝 Notas
          </div>
          <p className="text-xs italic text-text-1">{session.notes}</p>
        </div>
      )}

      {/* Resumo por exercício */}
      <div className="space-y-3">
        {Object.entries(grouped).length === 0 && (
          <p className="text-xs text-text-3 text-center py-3">
            Nenhuma série registrada
          </p>
        )}

        {Object.entries(grouped).map(([exId, list]) => {
          const ex = exercises?.find((e) => e.id === Number(exId));
          const exVolume = list.reduce(
            (a, s) => a + s.reps * s.weight,
            0
          );
          const bestSet = getBestSetBy1RM(list);
          const best1RM = bestSet?.estimated1RM ?? 0;
          const maxWeight = Math.max(...list.map((s) => s.weight));

          return (
            <div
              key={exId}
              className="bg-bg-2 border border-white/[0.06] rounded-2xl overflow-hidden"
            >
              {/* Cabeçalho do exercício */}
              <div className="px-3 py-2.5 bg-accent/[0.06] border-b border-white/[0.04]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-accent truncate">
                      {ex?.name ?? 'Exercício removido'}
                    </div>
                    <div className="text-[10px] text-text-3 mt-0.5">
                      {list.length} série{list.length > 1 ? 's' : ''} ·{' '}
                      {Math.round(exVolume).toLocaleString('pt-BR')} kg de
                      volume
                    </div>
                  </div>
                  {best1RM > 0 && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-text-3 uppercase tracking-wider">
                        1RM est.
                      </div>
                      <div className="text-sm font-bold text-purple">
                        {Math.round(best1RM * 10) / 10} kg
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de séries */}
              <ul className="divide-y divide-white/[0.04]">
                {list.map((s) => {
                  const isPRSet = s.weight === maxWeight;
                  const rir =
                    s.rpe !== undefined ? rpeToRIR(s.rpe) : undefined;

                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-white/[0.05] text-text-2 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {s.setNumber}
                        </span>
                        {isPRSet && list.length > 1 && (
                          <span className="text-[10px]">🏆</span>
                        )}
                        <span className="text-text-1">
                          {s.reps} reps × {s.weight} kg
                        </span>
                        {s.type && s.type !== 'normal' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-text-3">
                            {s.type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-text-3 flex-shrink-0">
                        {rir !== undefined && <span>RIR {rir}</span>}
                        {s.tutSeconds && <span>{s.tutSeconds}s</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-bg-2 border border-white/[0.06] rounded-xl p-2.5 text-center">
      <div className="text-base font-bold text-text-0">{value}</div>
      <div className="text-[9px] text-text-3 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}