import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise, type SetType } from './db';
import RestTimer from './RestTimer';
import {
  requestNotificationPermission,
  showActiveSessionNotification,
  updateActiveSessionNotification,
  clearActiveSessionNotification,
  showPRNotification,
  listenToNotificationActions,
} from './richNotifications';
import {
  analyzeExerciseProgress,
  detectPlateau,
  suggestLoadIncrement,
} from './trainingScience';

interface Props {
  workoutId: number;
  onFinish: () => void;
  onRepeat?: () => void;
}

export default function SessionView({ workoutId, onFinish, onRepeat }: Props) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  // Cria a sessão + registra notificação
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await requestNotificationPermission();

      const id = await db.sessions.add({
        workoutId,
        startedAt: Date.now(),
      });
      if (cancelled) return;
      setSessionId(id);

      await showActiveSessionNotification('Treino', Date.now());
    })();

    const interval = setInterval(() => {
      if (!cancelled) {
        updateActiveSessionNotification('Treino', Date.now());
      }
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [workoutId]);

  // Hooks de leitura
  const exercises = useLiveQuery(
    () => db.exercises.where('workoutId').equals(workoutId).sortBy('order'),
    [workoutId]
  );
  const session = useLiveQuery(
    () => (sessionId ? db.sessions.get(sessionId) : undefined),
    [sessionId]
  );
  const profile = useLiveQuery(() => db.profile.toCollection().first(), []);

  // Sincroniza notas da sessão
  useEffect(() => {
    if (session?.notes !== undefined) {
      setNotesDraft(session.notes);
    }
  }, [session?.notes]);

  // Ouve ações dos botões da notificação
  useEffect(() => {
    const cleanup = listenToNotificationActions(async (action) => {
      if (action === 'finish' || action === 'finish-session') {
        if (sessionId) {
          await clearActiveSessionNotification();
          await db.sessions.update(sessionId, { finishedAt: Date.now() });
          setFinished(true);
        }
      }
      if (action === '+30s') {
        setRestSeconds((r) => (r ?? 0) + 30);
      }
      if (action === 'skip') {
        setRestSeconds(null);
      }
    });
    return cleanup;
  }, [sessionId]);

  async function finish() {
    if (!sessionId) return;
    await clearActiveSessionNotification();
    await db.sessions.update(sessionId, { finishedAt: Date.now() });
    setFinished(true);
  }

  async function togglePause() {
    if (!sessionId || !session) return;
    if (session.pausedAt) {
      const extra = Date.now() - session.pausedAt;
      await db.sessions.update(sessionId, {
        pausedAt: undefined,
        totalPausedMs: (session.totalPausedMs ?? 0) + extra,
      });
    } else {
      await db.sessions.update(sessionId, { pausedAt: Date.now() });
    }
  }

  async function saveNotes() {
    if (!sessionId) return;
    await db.sessions.update(sessionId, { notes: notesDraft });
    setShowNotes(false);
  }

  // Returns condicionais
  if (sessionId === null || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center safe-top safe-bottom">
        <p className="text-zinc-400">Iniciando sessão...</p>
      </div>
    );
  }

  if (finished) {
    return (
      <SessionSummary
        sessionId={sessionId}
        startedAt={session.startedAt}
        onClose={onFinish}
        onRepeat={() => onRepeat?.()}
      />
    );
  }

  if (!exercises) {
    return (
      <div className="min-h-screen flex items-center justify-center safe-top safe-bottom">
        <p className="text-zinc-400">Carregando exercícios...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen safe-top safe-bottom safe-x pb-40">
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">
              Sessão em andamento
            </h1>
            <ElapsedTime
              startedAt={session.startedAt}
              pausedAt={session.pausedAt}
              totalPausedMs={session.totalPausedMs}
            />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowNotes((s) => !s)}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
            >
              📝
            </button>
            <button
              onClick={togglePause}
              className={`w-10 h-10 rounded-2xl active:scale-95 transition-all flex items-center justify-center ${
                session.pausedAt
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {session.pausedAt ? '▶' : '⏸'}
            </button>
          </div>
        </div>

        {/* Notas */}
        {showNotes && (
          <div className="bg-bg-surface border border-white/5 rounded-3xl p-4 space-y-3 animate-slide-up">
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
              Anotações da sessão
            </label>
            <textarea
              className="w-full bg-bg-elevated border border-white/5 rounded-2xl px-4 py-3 outline-none min-h-[100px] resize-y focus:border-accent/50 transition-all"
              placeholder="Ex: ombro esquerdo incomodou no supino..."
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={saveNotes}
                className="flex-1 bg-accent hover:bg-accent-light py-2.5 rounded-2xl font-semibold transition-all active:scale-[0.98]"
              >
                Salvar notas
              </button>
              <button
                onClick={() => setShowNotes(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 py-2.5 rounded-2xl transition-all active:scale-[0.98]"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Navegação entre exercícios */}
        <ExerciseNav exercises={exercises} sessionId={sessionId} />

        {/* Cards de exercício */}
        <div className="space-y-4">
          {exercises.map((ex) => (
            <div key={ex.id} id={`ex-${ex.id}`}>
              <ExerciseCard
                exercise={ex}
                sessionId={sessionId}
                defaultRest={profile?.restSeconds ?? 90}
                onSetAdded={(sec) => setRestSeconds(sec)}
              />
            </div>
          ))}
        </div>

        {/* Finalizar */}
        <button
          onClick={finish}
          className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-2xl font-semibold shadow-lg transition-all active:scale-[0.98] mt-6"
        >
          🏁 Finalizar treino
        </button>
      </div>

      {/* Timer de descanso */}
      {restSeconds !== null && (
        <RestTimer
          seconds={restSeconds}
          onClose={() => setRestSeconds(null)}
        />
      )}
    </div>
  );
}

/* ---------- Cronômetro ---------- */

function ElapsedTime({
  startedAt,
  pausedAt,
  totalPausedMs = 0,
}: {
  startedAt: number;
  pausedAt?: number;
  totalPausedMs?: number;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (pausedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pausedAt]);

  const ref = pausedAt ?? now;
  const elapsedMs = ref - startedAt - totalPausedMs;
  const sec = Math.max(0, Math.floor(elapsedMs / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;

  return (
    <p className="text-sm text-accent-light flex items-center gap-2 mt-0.5">
      <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
      {pausedAt && (
        <span className="text-amber-400 text-xs">⏸ pausado</span>
      )}
    </p>
  );
}

/* ---------- Navegação entre exercícios ---------- */

function ExerciseNav({
  exercises,
  sessionId,
}: {
  exercises: Exercise[];
  sessionId: number;
}) {
  const sets = useLiveQuery(
    () => db.sets.where('sessionId').equals(sessionId).toArray(),
    [sessionId]
  );

  function scrollTo(id: number) {
    document
      .getElementById(`ex-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const doneIds = new Set((sets ?? []).map((s) => s.exerciseId));

  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-bg-base/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {exercises.map((ex) => {
          const done = doneIds.has(ex.id!);
          return (
            <button
              key={ex.id}
              onClick={() => scrollTo(ex.id!)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-all active:scale-95 ${
                done
                  ? 'bg-accent text-white shadow-glow'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300'
              }`}
            >
              {done && '✓ '}
              {ex.order}. {ex.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Card de exercício ---------- */

function ExerciseCard({
  exercise,
  sessionId,
  defaultRest,
  onSetAdded,
}: {
  exercise: Exercise;
  sessionId: number;
  defaultRest: number;
  onSetAdded: (seconds: number) => void;
}) {
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [type, setType] = useState<SetType>('normal');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [rpe, setRpe] = useState<number | undefined>(undefined);

  // TUT
  const [tutStart, setTutStart] = useState<number | null>(null);
  const [tutElapsed, setTutElapsed] = useState(0);

  useEffect(() => {
    if (tutStart === null) return;
    const t = setInterval(() => {
      setTutElapsed(Math.floor((Date.now() - tutStart) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [tutStart]);

  // Última série antes desta sessão
  const lastSet = useLiveQuery(
    async () => {
      try {
        const all = await db.sets
          .where('exerciseId')
          .equals(exercise.id!)
          .reverse()
          .sortBy('createdAt');
        return all.find((s) => s && s.sessionId !== sessionId) ?? null;
      } catch {
        return null;
      }
    },
    [exercise.id, sessionId]
  );

  // PR anterior (excluindo sessão atual)
  const pr = useLiveQuery(
    async () => {
      try {
        const all = await db.sets
          .where('exerciseId')
          .equals(exercise.id!)
          .toArray();
        const previous = all.filter(
          (s) =>
            s &&
            s.sessionId !== sessionId &&
            typeof s.weight === 'number' &&
            !isNaN(s.weight) &&
            s.type !== 'warmup'
        );
        if (previous.length === 0) return null;
        const maxW = Math.max(...previous.map((s) => s.weight));
        const best = previous.filter((s) => s.weight === maxW);
        return {
          weight: maxW,
          reps: Math.max(...best.map((s) => s.reps)),
        };
      } catch {
        return null;
      }
    },
    [exercise.id, sessionId]
  );

  // Análise (sugestão de carga / platô)
  const analysis = useLiveQuery(
    async () => {
      try {
        const all = await db.sets
          .where('exerciseId')
          .equals(exercise.id!)
          .toArray();
        const previous = all.filter((s) => s.sessionId !== sessionId);
        if (previous.length === 0) return null;

        const targetMin = exercise.targetRepsMin ?? 8;
        const targetMax = exercise.targetRepsMax ?? 12;

        const summaries = analyzeExerciseProgress(
          previous,
          exercise.id!,
          targetMin,
          targetMax,
          6
        );

        const plateau = detectPlateau(summaries);
        const lastTwo = summaries.slice(0, 2);
        const hitTopAllTwo =
          lastTwo.length === 2 && lastTwo.every((s) => s.allSetsHitTop);
        const currentWeight = summaries[0]?.maxWeight ?? 0;
        const suggestedWeight =
          hitTopAllTwo && currentWeight > 0
            ? suggestLoadIncrement(exercise.name, currentWeight)
            : null;

        return { summaries, plateau, suggestedWeight, hitTopAllTwo };
      } catch {
        return null;
      }
    },
    [exercise.id, sessionId, exercise.targetRepsMin, exercise.targetRepsMax]
  );

  // Séries da sessão atual
  const setsRaw = useLiveQuery(
    () =>
      db.sets
        .where('sessionId')
        .equals(sessionId)
        .and((s) => s && s.exerciseId === exercise.id!)
        .sortBy('setNumber'),
    [sessionId, exercise.id]
  );

  const allSets = (setsRaw ?? []).filter(
    (s) => s && typeof s.weight === 'number' && typeof s.reps === 'number'
  );

  const totalTut = allSets.reduce((acc, s) => acc + (s.tutSeconds ?? 0), 0);

  async function addSet(customReps?: number, customWeight?: number) {
    const r = customReps ?? parseInt(reps, 10);
    const w = customWeight ?? parseFloat(weight.replace(',', '.'));
    if (!r || isNaN(r) || isNaN(w)) return;

    const nextNumber = allSets.length + 1;
    const tutSeconds = tutElapsed > 0 ? tutElapsed : undefined;

    await db.sets.add({
      sessionId,
      exerciseId: exercise.id!,
      setNumber: nextNumber,
      reps: r,
      weight: w,
      createdAt: Date.now(),
      type,
      tutSeconds,
      note: note.trim() || undefined,
      rpe,
    });

    // 🏆 Notificação de PR + vibração
    if (type !== 'warmup' && pr && w > pr.weight) {
      if ('vibrate' in navigator) {
        navigator.vibrate?.([100, 50, 100, 50, 200]);
      }
      showPRNotification(exercise.name, w);
    }

    // Reset
    setReps('');
    setWeight('');
    setNote('');
    setShowNote(false);
    setRpe(undefined);
    setTutStart(null);
    setTutElapsed(0);
    if (type !== 'myo') setType('normal');

    onSetAdded(defaultRest);
  }

  async function quickAdd() {
    if (!lastSet) return;
    await addSet(lastSet.reps, lastSet.weight);
  }

  async function removeSet(id: number) {
    if (id == null) return;
    await db.sets.delete(id);
  }

  function toggleTut() {
    if (tutStart === null) {
      setTutStart(Date.now());
      setTutElapsed(0);
    } else {
      setTutStart(null);
    }
  }

  function resetTut() {
    setTutStart(null);
    setTutElapsed(0);
  }

  const done = allSets.length > 0;
  const sessionMax = allSets.length
    ? Math.max(...allSets.map((s) => s.weight))
    : 0;
  const beatPR = !!pr && sessionMax > pr.weight;
  const newPRValue = beatPR ? sessionMax : null;

  const targetMin = exercise.targetRepsMin;
  const targetMax = exercise.targetRepsMax;

  return (
    <div
      className={`rounded-3xl p-4 space-y-3 border transition-all ${
        beatPR
          ? 'bg-amber-950/30 border-amber-700/50 shadow-glow'
          : done
          ? 'bg-accent/5 border-accent/30'
          : 'bg-bg-surface border-white/5'
      }`}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <h3 className="text-base font-semibold flex items-center gap-2 flex-wrap">
          {done && !beatPR && (
            <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center">
              ✓
            </span>
          )}
          <span>
            {exercise.order}. {exercise.name}
          </span>
          {beatPR && (
            <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">
              🏆 NOVO PR {newPRValue} kg
            </span>
          )}
        </h3>
        <div className="flex flex-col items-end gap-0.5">
          {pr && (
            <span
              className={`text-[10px] ${
                beatPR ? 'text-zinc-600 line-through' : 'text-amber-400'
              }`}
            >
              🏆 {pr.weight} kg × {pr.reps}
            </span>
          )}
          {targetMin && targetMax && (
            <span className="text-[10px] text-accent-light">
              🎯 {targetMin}–{targetMax} reps
            </span>
          )}
          {done && (
            <span className="text-[10px] text-accent-light">
              {allSets.length} série{allSets.length > 1 ? 's' : ''}
              {totalTut > 0 && ` · TUT ${totalTut}s`}
            </span>
          )}
        </div>
      </div>

      {/* Nota permanente do exercício */}
      {exercise.note && (
        <div className="bg-white/5 border border-white/5 rounded-2xl px-3 py-2 text-xs text-zinc-300 italic">
          📝 {exercise.note}
        </div>
      )}

      {/* Sugestão de carga */}
      {analysis?.suggestedWeight && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl px-3 py-2.5 text-xs text-accent-light flex items-center justify-between gap-2 animate-slide-up">
          <span>
            💡 Bateu {exercise.targetRepsMax} reps em todas as séries nas
            últimas 2 sessões. Suba para{' '}
            <strong>{analysis.suggestedWeight} kg</strong>.
          </span>
          <button
            onClick={() => setWeight(String(analysis.suggestedWeight))}
            className="bg-accent hover:bg-accent-light px-2.5 py-1 rounded-lg text-[10px] font-bold text-white whitespace-nowrap active:scale-95 transition-all"
          >
            Usar
          </button>
        </div>
      )}

      {/* Platô detectado */}
      {analysis?.plateau && !analysis.suggestedWeight && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-2xl px-3 py-2 text-xs text-red-300">
          📉 <strong>Platô detectado</strong> — carga não sobe há 3 sessões.
          Mude a variação ou faça deload.
        </div>
      )}

      {/* Lista de séries */}
      {allSets.length > 0 && (
        <ul className="space-y-1.5">
          {allSets.map((s) => {
            const isPRSet =
              !!pr && s.weight > pr.weight && s.type !== 'warmup';
            const t = s.type ?? 'normal';
            const inRange =
              targetMin &&
              targetMax &&
              s.reps >= targetMin &&
              s.reps <= targetMax;
            const belowRange =
              targetMin && targetMax && s.reps < targetMin && t !== 'warmup';
            const aboveRange =
              targetMin && targetMax && s.reps > targetMax && t !== 'warmup';

            return (
              <li
                key={s.id}
                className={`flex justify-between items-center rounded-2xl px-3 py-2 text-xs gap-2 ${
                  isPRSet
                    ? 'bg-amber-900/30 border border-amber-700/40'
                    : 'bg-bg-elevated border border-white/5'
                }`}
              >
                <span className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {isPRSet && '🏆'}
                  <span className="font-medium">
                    S{s.setNumber}: {s.reps} × {s.weight} kg
                  </span>

                  {t !== 'normal' && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${typeBadgeStyle(
                        t
                      )}`}
                    >
                      {typeLabel(t)}
                    </span>
                  )}

                  {inRange && <span className="text-[10px]">🎯</span>}
                  {belowRange && (
                    <span className="text-[10px] text-blue-400">↓</span>
                  )}
                  {aboveRange && (
                    <span className="text-[10px] text-amber-400">↑</span>
                  )}

                  {s.tutSeconds !== undefined && (
                    <span className="text-[10px] text-zinc-500">
                      {s.tutSeconds}s
                    </span>
                  )}

                  {s.rpe && (
                    <span className="text-[10px] text-zinc-500">
                      RPE {s.rpe}
                    </span>
                  )}
                </span>

                <span className="flex items-center gap-1.5 flex-shrink-0">
                  {s.note && (
                    <span
                      className="text-[10px] text-zinc-500 italic truncate max-w-[80px]"
                      title={s.note}
                    >
                      📝
                    </span>
                  )}
                  <button
                    onClick={() => removeSet(s.id!)}
                    className="text-red-400 hover:text-red-300 text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/10 active:scale-90 transition-all"
                  >
                    ×
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Repetir última */}
      {lastSet && (
        <button
          type="button"
          onClick={quickAdd}
          className="w-full bg-accent/15 hover:bg-accent/25 border border-accent/30 py-2.5 rounded-2xl text-xs font-medium text-accent-light active:scale-[0.98] transition-all"
        >
          ⚡ Repetir última ({lastSet.reps} × {lastSet.weight} kg)
        </button>
      )}

      {/* Input principal */}
      <div className="flex gap-2">
        <input
          className="flex-1 min-w-0 bg-bg-elevated border border-white/5 rounded-2xl px-3 py-3 text-base outline-none focus:border-accent/50 transition-all placeholder:text-zinc-500 text-center"
          placeholder={lastSet ? `${lastSet.reps}` : 'reps'}
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
        <input
          className="flex-1 min-w-0 bg-bg-elevated border border-white/5 rounded-2xl px-3 py-3 text-base outline-none focus:border-accent/50 transition-all placeholder:text-zinc-500 text-center"
          placeholder={lastSet ? `${lastSet.weight}` : 'kg'}
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button
          onClick={() => addSet()}
          className="bg-accent hover:bg-accent-light w-14 rounded-2xl font-bold text-xl flex items-center justify-center shadow-glow active:scale-95 transition-all"
        >
          +
        </button>
      </div>

      {/* Barra de extras: tipo, TUT, RPE, nota */}
      <div className="flex gap-1.5 items-center flex-wrap">
        {/* Tipo */}
        <div className="relative">
          <button
            onClick={() => setShowTypeMenu((v) => !v)}
            className={`text-[10px] px-2.5 py-1.5 rounded-xl border font-medium transition-all active:scale-95 ${typeBadgeStyle(
              type
            )}`}
          >
            🏷 {typeLabel(type)}
          </button>
          {showTypeMenu && (
            <div className="absolute bottom-full mb-1 z-20 bg-bg-overlay border border-white/10 rounded-2xl p-1 shadow-elevated w-44 animate-scale-in">
              {(
                [
                  'normal',
                  'warmup',
                  'failure',
                  'drop',
                  'myo',
                  'restpause',
                  'cluster',
                ] as SetType[]
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setType(t);
                    setShowTypeMenu(false);
                  }}
                  className={`w-full text-left text-xs px-3 py-2 rounded-xl hover:bg-white/5 ${
                    type === t ? 'text-accent-light' : 'text-zinc-300'
                  }`}
                >
                  {typeLabel(t)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TUT */}
        <button
          onClick={toggleTut}
          className={`text-[10px] px-2.5 py-1.5 rounded-xl border font-medium transition-all active:scale-95 ${
            tutStart !== null
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : 'bg-white/5 border-white/5 text-zinc-400'
          }`}
        >
          ⏱ {tutStart !== null ? formatTut(tutElapsed) : 'TUT'}
        </button>

        {tutElapsed > 0 && (
          <button
            onClick={resetTut}
            className="text-[10px] px-2 py-1.5 text-zinc-600 hover:text-zinc-400"
          >
            zerar
          </button>
        )}

        {/* RPE */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-xl px-2 py-1.5">
          <span className="text-[10px] text-zinc-500">RPE</span>
          <select
            value={rpe ?? ''}
            onChange={(e) =>
              setRpe(e.target.value ? parseInt(e.target.value) : undefined)
            }
            className="bg-transparent text-[10px] outline-none text-zinc-200"
          >
            <option value="">–</option>
            {[6, 7, 8, 9, 10].map((v) => (
              <option key={v} value={v} className="bg-bg-overlay">
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Nota */}
        <button
          onClick={() => setShowNote((v) => !v)}
          className={`text-[10px] px-2.5 py-1.5 rounded-xl border font-medium transition-all active:scale-95 ${
            note
              ? 'bg-accent/20 border-accent/40 text-accent-light'
              : 'bg-white/5 border-white/5 text-zinc-400'
          }`}
        >
          📝
        </button>
      </div>

      {/* Campo de nota */}
      {showNote && (
        <input
          className="w-full bg-bg-elevated border border-white/5 rounded-2xl px-3 py-2.5 outline-none text-sm focus:border-accent/50 transition-all animate-slide-up"
          placeholder="Nota da série (ex: falhou na 8ª)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
    </div>
  );
}

/* ---------- Helpers de tipo ---------- */

function typeLabel(t: SetType): string {
  switch (t) {
    case 'warmup':
      return 'Aquec.';
    case 'drop':
      return 'Drop';
    case 'myo':
      return 'Myo';
    case 'restpause':
      return 'R-Pause';
    case 'cluster':
      return 'Cluster';
    case 'failure':
      return 'Falha';
    default:
      return 'Normal';
  }
}

function typeBadgeStyle(t: SetType): string {
  switch (t) {
    case 'warmup':
      return 'bg-white/5 border-white/5 text-zinc-500';
    case 'drop':
      return 'bg-red-500/15 border-red-500/30 text-red-300';
    case 'myo':
      return 'bg-purple-500/15 border-purple-500/30 text-purple-300';
    case 'restpause':
      return 'bg-orange-500/15 border-orange-500/30 text-orange-300';
    case 'cluster':
      return 'bg-blue-500/15 border-blue-500/30 text-blue-300';
    case 'failure':
      return 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300';
    default:
      return 'bg-white/5 border-white/5 text-zinc-400';
  }
}

function formatTut(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ---------- Resumo final ---------- */

function SessionSummary({
  sessionId,
  startedAt,
  onClose,
  onRepeat,
}: {
  sessionId: number;
  startedAt: number;
  onClose: () => void;
  onRepeat: () => void;
}) {
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);
  const sets = useLiveQuery(
    () => db.sets.where('sessionId').equals(sessionId).toArray(),
    [sessionId]
  );
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const profile = useLiveQuery(() => db.profile.toCollection().first(), []);

  if (!session || !sets || !exercises) {
    return (
      <div className="min-h-screen flex items-center justify-center safe-top safe-bottom">
        <p className="text-zinc-400">Calculando resumo...</p>
      </div>
    );
  }

  const finishedAt = session.finishedAt ?? Date.now();
  const rawMs = finishedAt - startedAt - (session.totalPausedMs ?? 0);
  const durationMin = Math.max(1, Math.round(rawMs / 60000));

  const totalReps = sets.reduce((a, s) => a + s.reps, 0);
  const totalVolume = sets.reduce((a, s) => a + s.reps * s.weight, 0);
  const totalSets = sets.length;
  const uniqueExercises = new Set(sets.map((s) => s.exerciseId)).size;

  const userWeight = profile?.weightKg ?? 75;
  const volumePerMin = totalVolume / Math.max(1, durationMin);
  const met = volumePerMin < 2.5 ? 3.5 : volumePerMin < 5 ? 5 : 6.5;
  const calories = Math.round((met * 3.5 * userWeight) / 200 * durationMin);

  return (
    <div className="min-h-screen safe-top safe-bottom safe-x">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-12 space-y-5 animate-slide-up">
        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="text-6xl mb-2">🏆</div>
          <h1 className="text-3xl font-bold tracking-tight">
            Treino concluído!
          </h1>
          <p className="text-zinc-500 text-sm">
            {new Date(startedAt).toLocaleString('pt-BR')}
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard icon="⏱" value={`${durationMin} min`} label="Duração" />
          <SummaryCard icon="🏋️" value={String(uniqueExercises)} label="Exercícios" />
          <SummaryCard icon="🔁" value={String(totalSets)} label="Séries" />
          <SummaryCard icon="🔢" value={String(totalReps)} label="Repetições" />
          <SummaryCard
            icon="📦"
            value={`${totalVolume.toLocaleString('pt-BR')} kg`}
            label="Volume"
          />
          <SummaryCard
            icon="🔥"
            value={`${calories} kcal`}
            label="Calorias"
            highlight
          />
        </div>

        {/* Detalhes */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">
            Detalhes
          </h2>
          {groupByExercise(sets, exercises).map((g) => (
            <div
              key={g.exerciseId}
              className="bg-bg-surface border border-white/5 rounded-3xl p-4"
            >
              <div className="font-medium text-accent-light mb-2">
                {g.exerciseName}
              </div>
              <ul className="text-xs text-zinc-300 space-y-1">
                {g.sets.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span>Série {s.setNumber}</span>
                    <span className="font-medium">
                      {s.reps} × {s.weight} kg
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Notas */}
        {session.notes && (
          <div className="bg-bg-surface border border-white/5 rounded-3xl p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">
              📝 Notas
            </div>
            <p className="text-sm italic text-zinc-300">{session.notes}</p>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onRepeat}
            className="flex-1 bg-accent hover:bg-accent-light py-4 rounded-2xl font-semibold shadow-glow active:scale-[0.98] transition-all"
          >
            🔄 Refazer
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-semibold active:scale-[0.98] transition-all"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
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

function groupByExercise(
  sets: {
    exerciseId: number;
    setNumber: number;
    reps: number;
    weight: number;
    id?: number;
  }[],
  exercises: { id?: number; name: string }[]
) {
  const map = new Map<
    number,
    { exerciseId: number; exerciseName: string; sets: typeof sets }
  >();
  for (const s of sets) {
    if (!map.has(s.exerciseId)) {
      const ex = exercises.find((e) => e.id === s.exerciseId);
      map.set(s.exerciseId, {
        exerciseId: s.exerciseId,
        exerciseName: ex?.name ?? 'Exercício removido',
        sets: [],
      });
    }
    map.get(s.exerciseId)!.sets.push(s);
  }
  return Array.from(map.values());
}