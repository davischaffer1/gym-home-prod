import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise, type SetType } from './db';
import RestTimer from './RestTimer';
import SwipeableExerciseView from './SwipeableExerciseView';
import {
  requestNotificationPermission,
  showActiveSessionNotification,
  updateActiveSessionNotification,
  clearActiveSessionNotification,
  showPRNotification,
  showRestStartNotification,
  listenToNotificationActions,
} from './richNotifications';
import {
  analyzeExerciseProgress,
  detectPlateau,
  suggestLoadIncrement,
  analyzeRIRForNextSet,
  predict1RM,
  detectLatentPR,
  classifyFiberActivation,
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
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Cria a sessão + notificação
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

  const exercises = useLiveQuery(
    () => db.exercises.where('workoutId').equals(workoutId).sortBy('order'),
    [workoutId]
  );
  const session = useLiveQuery(
    () => (sessionId ? db.sessions.get(sessionId) : undefined),
    [sessionId]
  );
  const profile = useLiveQuery(() => db.profile.toCollection().first(), []);

  useEffect(() => {
    if (session?.notes !== undefined) {
      setNotesDraft(session.notes);
    }
  }, [session?.notes]);

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

  if (sessionId === null || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center safe-top safe-bottom">
        <p className="text-text-3">Iniciando sessão...</p>
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
        <p className="text-text-3">Carregando exercícios...</p>
      </div>
    );
  }

  const currentEx = exercises[currentExerciseIndex];
  const totalEx = exercises.length;

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom safe-x bg-bg-0">
      {/* ── Header da sessão ── */}
      <div className="max-w-lg mx-auto w-full px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-text-0 truncate">
              Sessão
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
              className="w-9 h-9 rounded-xl bg-bg-1 border border-white/[0.06] active:scale-95 transition-all flex items-center justify-center text-sm"
            >
              📝
            </button>
            <button
              onClick={togglePause}
              className={`w-9 h-9 rounded-xl active:scale-95 transition-all flex items-center justify-center text-sm ${
                session.pausedAt
                  ? 'bg-warn/20 border border-warn/40 text-warn'
                  : 'bg-bg-1 border border-white/[0.06]'
              }`}
            >
              {session.pausedAt ? '▶' : '⏸'}
            </button>
            <button
              onClick={finish}
              className="h-9 px-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-semibold active:scale-95 transition-all"
            >
              Encerrar
            </button>
          </div>
        </div>

        {/* Notas */}
        {showNotes && (
          <div className="mt-3 bg-bg-1 border border-white/[0.06] rounded-2xl p-3 space-y-2 animate-slide-up">
            <textarea
              className="w-full bg-bg-2 border border-white/[0.06] rounded-xl px-3 py-2 outline-none text-sm resize-y min-h-[80px] focus:border-accent/40 text-text-0"
              placeholder="Anotações da sessão..."
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={saveNotes}
                className="flex-1 bg-accent hover:bg-accent-hover text-black py-2 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowNotes(false)}
                className="flex-1 bg-white/[0.05] py-2 rounded-xl text-xs active:scale-[0.98] transition-all text-text-1"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── NAVEGAÇÃO DE EXERCÍCIOS ── */}
      <div className="sticky top-0 z-30 bg-bg-0/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-lg mx-auto px-4 py-2.5">
          {/* Nome + contador + setas */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() =>
                setCurrentExerciseIndex((i) => Math.max(0, i - 1))
              }
              disabled={currentExerciseIndex === 0}
              className="w-8 h-8 rounded-lg hover:bg-white/[0.05] disabled:opacity-25 active:scale-90 transition-all flex items-center justify-center text-text-2"
            >
              ←
            </button>

            <div className="text-center flex-1 min-w-0">
              <div className="text-sm font-semibold text-text-0 truncate">
                {currentEx?.order}. {currentEx?.name}
              </div>
              <div className="text-[10px] text-text-3 mt-0.5">
                Exercício {currentExerciseIndex + 1} de {totalEx}
              </div>
            </div>

            <button
              onClick={() =>
                setCurrentExerciseIndex((i) =>
                  Math.min(totalEx - 1, i + 1)
                )
              }
              disabled={currentExerciseIndex === totalEx - 1}
              className="w-8 h-8 rounded-lg hover:bg-white/[0.05] disabled:opacity-25 active:scale-90 transition-all flex items-center justify-center text-text-2"
            >
              →
            </button>
          </div>

          {/* BARRAS DE PROGRESSO */}
          <div className="flex gap-1 mt-2.5">
            {exercises.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentExerciseIndex(idx)}
                className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                  idx === currentExerciseIndex
                    ? 'bg-accent'
                    : idx < currentExerciseIndex
                    ? 'bg-accent/50'
                    : 'bg-white/[0.08]'
                }`}
                aria-label={`Ir para exercício ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── CARROSSEL DE EXERCÍCIOS ── */}
      <div className="flex-1 overflow-y-auto pb-40">
        <div className="max-w-lg mx-auto pt-4">
          <SwipeableExerciseView
            exercises={exercises}
            activeIndex={currentExerciseIndex}
            onIndexChange={setCurrentExerciseIndex}
          >
            {(ex, idx) => (
              <ExerciseCard
                exercise={ex}
                sessionId={sessionId}
                defaultRest={profile?.restSeconds ?? 90}
                onSetAdded={(sec) => setRestSeconds(sec)}
                isActive={idx === currentExerciseIndex}
              />
            )}
          </SwipeableExerciseView>
        </div>
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
    <p className="text-sm text-accent flex items-center gap-2 mt-0.5">
      <span className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
      {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
      {pausedAt && <span className="text-warn text-xs">⏸</span>}
    </p>
  );
}

/* ---------- Card de exercício ---------- */

function ExerciseCard({
  exercise,
  sessionId,
  defaultRest,
  onSetAdded,
  isActive,
}: {
  exercise: Exercise;
  sessionId: number;
  defaultRest: number;
  onSetAdded: (seconds: number) => void;
  isActive: boolean;
}) {
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [type, setType] = useState<SetType>('normal');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [rpe, setRpe] = useState<number | undefined>(undefined);

  const [tutStart, setTutStart] = useState<number | null>(null);
  const [tutElapsed, setTutElapsed] = useState(0);

  const [editingSetId, setEditingSetId] = useState<number | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editRpe, setEditRpe] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (tutStart === null) return;
    const t = setInterval(() => {
      setTutElapsed(Math.floor((Date.now() - tutStart) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [tutStart]);

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

  const best1RM = useLiveQuery(
    async () => {
      if (allSets.length === 0) return null;
      let best: { set: any; estimate: number } | null = null;

      for (const s of allSets) {
        const pred = predict1RM(s);
        if (!pred) continue;
        if (!best || pred.estimated1RMWithRIR > best.estimate) {
          best = { set: s, estimate: pred.estimated1RMWithRIR };
        }
      }
      return best;
    },
    [allSets.length, exercise.id]
  );

  const latentPR = useLiveQuery(
    async () => {
      const historical = await db.sets
        .where('exerciseId')
        .equals(exercise.id!)
        .toArray();
      const previousSessions = historical.filter(
        (s) => s.sessionId !== sessionId
      );
      return detectLatentPR(previousSessions, allSets);
    },
    [exercise.id, sessionId, allSets.length]
  );

  const rirSuggestion = useLiveQuery(
    async () => {
      if (!exercise.useRIR) return null;
      if (exercise.targetRIR === undefined) return null;
      const sets = await db.sets
        .where('sessionId')
        .equals(sessionId)
        .and((s) => s && s.exerciseId === exercise.id!)
        .sortBy('setNumber');
      const filtered = (sets ?? []).filter(
        (s) => s && typeof s.weight === 'number' && typeof s.reps === 'number'
      );
      if (filtered.length === 0) return null;
      const lastSetOfSession = filtered[filtered.length - 1];
      if (!lastSetOfSession.rpe) return null;
      return analyzeRIRForNextSet(
        lastSetOfSession.weight,
        lastSetOfSession.rpe,
        exercise.targetRIR,
        exercise.name
      );
    },
    [
      exercise.useRIR,
      exercise.targetRIR,
      exercise.id,
      sessionId,
      setsRaw?.length,
    ]
  );

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

    if (type !== 'warmup' && pr && w > pr.weight) {
      if ('vibrate' in navigator) {
        navigator.vibrate?.([100, 50, 100, 50, 200]);
      }
      showPRNotification(exercise.name, w);
    }

    if (
      exercise.useRIR &&
      exercise.targetRIR !== undefined &&
      rpe !== undefined &&
      type !== 'warmup'
    ) {
      const reportedRIR = 10 - rpe;
      if (Math.abs(reportedRIR - exercise.targetRIR) <= 0.5) {
        if ('vibrate' in navigator) navigator.vibrate?.(50);
      }
    }

    await showRestStartNotification(defaultRest, exercise.name);

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
    if (!confirm('Remover essa série?')) return;
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

  function startEditSet(s: {
    id?: number;
    reps: number;
    weight: number;
    rpe?: number;
  }) {
    setEditingSetId(s.id!);
    setEditReps(String(s.reps));
    setEditWeight(String(s.weight));
    setEditRpe(s.rpe);
  }

  async function saveEditSet() {
    if (editingSetId === null) return;
    const r = parseInt(editReps, 10);
    const w = parseFloat(editWeight.replace(',', '.'));
    if (!r || isNaN(r) || isNaN(w)) return;

    await db.sets.update(editingSetId, {
      reps: r,
      weight: w,
      rpe: editRpe,
    });

    setEditingSetId(null);
    setEditReps('');
    setEditWeight('');
    setEditRpe(undefined);
  }

  function cancelEdit() {
    setEditingSetId(null);
    setEditReps('');
    setEditWeight('');
    setEditRpe(undefined);
  }

  const done = allSets.length > 0;
  const sessionMax = allSets.length
    ? Math.max(...allSets.map((s) => s.weight))
    : 0;
  const beatPR = !!pr && sessionMax > pr.weight;
  const newPRValue = beatPR ? sessionMax : null;

  const targetMin = exercise.targetRepsMin;
  const targetMax = exercise.targetRepsMax;

  // Se não é o exercício ativo, não renderiza
  if (!isActive) return null;

  return (
    <div
      className={`rounded-2xl p-4 space-y-3 border transition-all ${
        beatPR
          ? 'bg-warn/5 border-warn/30'
          : done
          ? 'bg-accent-dim border-accent/20'
          : 'bg-bg-1 border-white/[0.06]'
      }`}
    >
      {/* Badges no topo */}
      <div className="flex flex-wrap gap-1.5">
        {beatPR && (
          <span className="text-[10px] bg-warn text-black px-2 py-0.5 rounded-full font-bold">
            🏆 PR {newPRValue} kg
          </span>
        )}
        {pr && !beatPR && (
          <span className="text-[10px] bg-warn/10 text-warn px-2 py-0.5 rounded-full font-medium">
            🏆 {pr.weight} × {pr.reps}
          </span>
        )}
        {targetMin && targetMax && (
          <span className="text-[10px] bg-accent-dim text-accent px-2 py-0.5 rounded-full font-medium">
            🎯 {targetMin}–{targetMax} reps
          </span>
        )}
        {exercise.useRIR && exercise.targetRIR !== undefined && (
          <span className="text-[10px] bg-purple/10 text-purple px-2 py-0.5 rounded-full font-medium">
            🧠 RIR {exercise.targetRIR}
          </span>
        )}
        {done && (
          <span className="text-[10px] bg-white/[0.05] text-text-2 px-2 py-0.5 rounded-full font-medium">
            {allSets.length} séries · {totalTut}s TUT
          </span>
        )}
      </div>

      {/* 1RM */}
      {best1RM && (
        <div className="text-[11px] text-text-2 bg-white/[0.03] rounded-xl px-3 py-1.5">
          📊 1RM estimado:{' '}
          <strong className="text-accent">
            {Math.round(best1RM.estimate * 10) / 10} kg
          </strong>
        </div>
      )}

      {/* PR latente */}
      {latentPR && (
        <div className="bg-purple/10 border border-purple/30 rounded-xl px-3 py-2 text-xs text-purple animate-slide-up">
          <div className="font-semibold mb-0.5">
            🔮 Você tem margem para mais
          </div>
          <div className="text-[11px] opacity-90 leading-relaxed">
            PR: {latentPR.actualPR} kg · 1RM teórico: {latentPR.estimated1RM}{' '}
            kg
            <br />
            👉 Tente{' '}
            <strong>
              {latentPR.nextPRTarget ?? latentPR.actualPR + 5} kg
            </strong>{' '}
            na próxima
          </div>
        </div>
      )}

      {/* Nota permanente */}
      {exercise.note && (
        <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl px-3 py-2 text-xs text-text-2 italic">
          📝 {exercise.note}
        </div>
      )}

      {/* Sugestão RIR */}
      {exercise.useRIR &&
        rirSuggestion &&
        rirSuggestion.direction !== 'keep' && (
          <div
            className={`rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2 animate-slide-up ${
              rirSuggestion.direction === 'up'
                ? 'bg-accent-dim border border-accent/30 text-accent'
                : 'bg-info/10 border border-info/30 text-info'
            }`}
          >
            <div className="flex-1">
              <div className="font-semibold mb-0.5">
                🧠 {rirSuggestion.direction === 'up' ? 'Suba' : 'Reduza'}
              </div>
              <div className="text-[10px] opacity-80">
                Nova: <strong>{rirSuggestion.suggestedWeight} kg</strong>
              </div>
            </div>
            <button
              onClick={() => setWeight(String(rirSuggestion.suggestedWeight))}
              className="bg-accent text-black px-2.5 py-1 rounded-lg text-[10px] font-bold active:scale-95"
            >
              Usar
            </button>
          </div>
        )}

      {/* Sugestão dupla progressão */}
      {analysis?.suggestedWeight && (
        <div className="bg-accent-dim border border-accent/30 rounded-xl px-3 py-2 text-xs text-accent flex items-center justify-between gap-2">
          <span className="text-[11px]">
            💡 Bateu topo 2× seguidas. Suba para{' '}
            <strong>{analysis.suggestedWeight} kg</strong>
          </span>
          <button
            onClick={() => setWeight(String(analysis.suggestedWeight))}
            className="bg-accent text-black px-2.5 py-1 rounded-lg text-[10px] font-bold active:scale-95"
          >
            Usar
          </button>
        </div>
      )}

      {/* Platô */}
      {analysis?.plateau && !analysis.suggestedWeight && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl px-3 py-2 text-xs text-danger">
          📉 <strong>Platô</strong> — 3 sessões sem subir
        </div>
      )}

      {/* Lista de séries */}
      {allSets.length > 0 && (
        <ul className="space-y-1.5">
          {allSets.map((s) => {
            const isEditing = editingSetId === s.id;

            if (isEditing) {
              return (
                <li
                  key={s.id}
                  className="bg-accent-dim border border-accent/30 rounded-xl p-2.5 space-y-2"
                >
                  <div className="text-[10px] text-text-3">
                    Editando série {s.setNumber}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      autoFocus
                      className="flex-1 bg-bg-2 border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs text-center outline-none focus:border-accent/40 text-text-0"
                      inputMode="numeric"
                      placeholder="reps"
                      value={editReps}
                      onChange={(e) => setEditReps(e.target.value)}
                    />
                    <input
                      className="flex-1 bg-bg-2 border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs text-center outline-none focus:border-accent/40 text-text-0"
                      inputMode="decimal"
                      placeholder="kg"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                    />
                    <select
                      className="bg-bg-2 border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs outline-none text-text-0"
                      value={editRpe ?? ''}
                      onChange={(e) =>
                        setEditRpe(
                          e.target.value
                            ? parseInt(e.target.value)
                            : undefined
                        )
                      }
                    >
                      <option value="">RPE</option>
                      {[6, 7, 8, 9, 10].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={saveEditSet}
                      className="flex-1 bg-accent text-black py-1.5 rounded-lg text-xs font-semibold active:scale-95"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-white/[0.05] py-1.5 rounded-lg text-xs active:scale-95 text-text-2"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            }

            const isPRSet =
              !!pr && s.weight > pr.weight && s.type !== 'warmup';
            const t = s.type ?? 'normal';
            const fiber = classifyFiberActivation({
              weight: s.weight,
              reps: s.reps,
              rpe: s.rpe,
              type: s.type,
            });

            return (
              <li
                key={s.id}
                className={`flex justify-between items-center rounded-xl px-3 py-2 text-xs gap-2 ${
                  isPRSet
                    ? 'bg-warn/10 border border-warn/30'
                    : 'bg-bg-2 border border-white/[0.04]'
                }`}
              >
                <span className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {isPRSet && '🏆'}
                  <span className="font-medium text-text-0">
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
                  {s.rpe !== undefined && (
                    <span className="text-[10px] text-text-3">RPE {s.rpe}</span>
                  )}
                  {fiber && (
                    <span
                      className="text-[10px] text-purple"
                      title={`${fiber.intensityPct}% 1RM`}
                    >
                      {fiber.typeII ? '⚡II' : 'I'}
                    </span>
                  )}
                </span>

                <span className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEditSet(s)}
                    className="text-info text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-info/10 active:scale-90"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => removeSet(s.id!)}
                    className="text-danger text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-danger/10 active:scale-90"
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
          onClick={quickAdd}
          className="w-full bg-accent-dim hover:bg-accent/20 border border-accent/30 py-2 rounded-xl text-xs font-medium text-accent active:scale-[0.98] transition-all"
        >
          ⚡ Repetir última ({lastSet.reps} × {lastSet.weight} kg)
        </button>
      )}

      {/* Input principal */}
      <div className="flex gap-2">
        <input
          className="flex-1 min-w-0 bg-bg-2 border border-white/[0.06] rounded-xl px-3 py-3 text-base outline-none focus:border-accent/40 placeholder:text-text-3 text-center text-text-0"
          placeholder={lastSet ? `${lastSet.reps}` : 'reps'}
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
        <input
          className="flex-1 min-w-0 bg-bg-2 border border-white/[0.06] rounded-xl px-3 py-3 text-base outline-none focus:border-accent/40 placeholder:text-text-3 text-center text-text-0"
          placeholder={lastSet ? `${lastSet.weight}` : 'kg'}
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button
          onClick={() => addSet()}
          className="bg-accent hover:bg-accent-hover w-14 rounded-xl font-bold text-xl flex items-center justify-center shadow-glow-accent active:scale-95 transition-all text-black"
        >
          +
        </button>
      </div>

      {/* Extras */}
      <div className="flex gap-1.5 items-center flex-wrap">
        <div className="relative">
          <button
            onClick={() => setShowTypeMenu((v) => !v)}
            className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-medium active:scale-95 ${typeBadgeStyle(
              type
            )}`}
          >
            🏷 {typeLabel(type)}
          </button>
          {showTypeMenu && (
            <div className="absolute bottom-full mb-1 z-20 bg-bg-3 border border-white/[0.08] rounded-xl p-1 shadow-card-lg w-40 animate-scale-in">
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
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-white/[0.05] ${
                    type === t ? 'text-accent' : 'text-text-1'
                  }`}
                >
                  {typeLabel(t)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={toggleTut}
          className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-medium active:scale-95 ${
            tutStart !== null
              ? 'bg-danger/20 border-danger/40 text-danger'
              : 'bg-white/[0.04] border-white/[0.06] text-text-2'
          }`}
        >
          ⏱ {tutStart !== null ? formatTut(tutElapsed) : 'TUT'}
        </button>

        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1.5">
          <span className="text-[10px] text-text-3">RPE</span>
          <select
            value={rpe ?? ''}
            onChange={(e) =>
              setRpe(e.target.value ? parseInt(e.target.value) : undefined)
            }
            className="bg-transparent text-[10px] outline-none text-text-1"
          >
            <option value="">–</option>
            {[6, 7, 8, 9, 10].map((v) => (
              <option key={v} value={v} className="bg-bg-3">
                {v}
              </option>
            ))}
          </select>
          {rpe !== undefined && (
            <span className="text-[10px] text-text-3">RIR {10 - rpe}</span>
          )}
        </div>

        <button
          onClick={() => setShowNote((v) => !v)}
          className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-medium active:scale-95 ${
            note
              ? 'bg-accent-dim border-accent/30 text-accent'
              : 'bg-white/[0.04] border-white/[0.06] text-text-2'
          }`}
        >
          📝
        </button>
      </div>

      {showNote && (
        <input
          className="w-full bg-bg-2 border border-white/[0.06] rounded-xl px-3 py-2 outline-none text-sm focus:border-accent/40 animate-slide-up text-text-0"
          placeholder="Nota da série"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

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
      return 'bg-white/[0.04] border-white/[0.06] text-text-3';
    case 'drop':
      return 'bg-danger/10 border-danger/30 text-danger';
    case 'myo':
      return 'bg-purple/10 border-purple/30 text-purple';
    case 'restpause':
      return 'bg-warn/10 border-warn/30 text-warn';
    case 'cluster':
      return 'bg-info/10 border-info/30 text-info';
    case 'failure':
      return 'bg-warn/15 border-warn/40 text-warn';
    default:
      return 'bg-white/[0.04] border-white/[0.06] text-text-2';
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-3">Calculando...</p>
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
    <div className="min-h-screen safe-top safe-bottom safe-x bg-bg-0 animate-slide-up">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-12 space-y-5">
        <div className="text-center space-y-2">
          <div className="text-6xl mb-2">🏆</div>
          <h1 className="text-3xl font-bold tracking-tight text-text-0">
            Treino concluído!
          </h1>
          <p className="text-text-3 text-sm">
            {new Date(startedAt).toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SummaryCard icon="⏱" value={`${durationMin} min`} label="Duração" />
          <SummaryCard
            icon="🏋️"
            value={String(uniqueExercises)}
            label="Exercícios"
          />
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

        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-text-3 uppercase tracking-wider px-1">
            Detalhes
          </h2>
          {groupByExercise(sets, exercises).map((g) => (
            <div
              key={g.exerciseId}
              className="bg-bg-1 border border-white/[0.06] rounded-2xl p-4"
            >
              <div className="font-medium text-accent mb-2">
                {g.exerciseName}
              </div>
              <ul className="text-xs text-text-2 space-y-1">
                {g.sets.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span>Série {s.setNumber}</span>
                    <span className="font-medium text-text-0">
                      {s.reps} × {s.weight} kg
                      {s.rpe !== undefined && ` · RPE ${s.rpe}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {session.notes && (
          <div className="bg-bg-1 border border-white/[0.06] rounded-2xl p-4">
            <div className="text-xs text-text-3 uppercase tracking-wider font-semibold mb-2">
              📝 Notas
            </div>
            <p className="text-sm italic text-text-1">{session.notes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={onRepeat}
            className="flex-1 bg-accent hover:bg-accent-hover text-black py-4 rounded-2xl font-semibold shadow-glow-accent active:scale-[0.98] transition-all"
          >
            🔄 Refazer
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] py-4 rounded-2xl font-semibold active:scale-[0.98] transition-all text-text-1"
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
      className={`rounded-2xl p-4 text-center border ${
        highlight
          ? 'bg-accent-dim border-accent/30'
          : 'bg-bg-1 border-white/[0.06]'
      }`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div
        className={`text-lg font-bold tracking-tight ${
          highlight ? 'text-accent' : 'text-text-0'
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-text-3 mt-0.5 uppercase tracking-wider">
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
    rpe?: number;
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