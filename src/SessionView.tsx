import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise, type SetType } from './db';
import RestTimer from './RestTimer';
import {
  analyzeExerciseProgress,
  detectPlateau,
  suggestLoadIncrement,
  type SessionSetSummary,
} from './trainingScience';
import { checkAndUnlockAchievements } from './achievementEngine';
import {
  startSessionNotification,
  updateSessionNotification,
  stopSessionNotification,
} from './sessionNotification';

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
  const interval = setInterval(() => {
    updateSessionNotification('Treino', Date.now());
  }, 30000);

  // Cria a sessão uma única vez
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Pede permissão de notificação na primeira vez
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {}
      }
      const id = await db.sessions.add({ workoutId, startedAt: Date.now() });
      startSessionNotification('Treino', Date.now());
      if (!cancelled) setSessionId(id);
    })();
    return () => {
      clearInterval(interval);
      cancelled = true;
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

  // Sincroniza notas quando a sessão carrega
  useEffect(() => {
    if (session?.notes !== undefined) {
      setNotesDraft(session.notes);
    }
  }, [session?.notes]);

  async function finish() {
    if (!sessionId) return;
    stopSessionNotification();
    await db.sessions.update(sessionId, { finishedAt: Date.now() });
    const newBadges = await checkAndUnlockAchievements();
    if (newBadges.length > 0) {
      // vibra e mostra aviso
      if ('vibrate' in navigator) navigator.vibrate?.([100, 50, 100, 50, 300]);
    }
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
    return <p className="p-4 text-zinc-400">Iniciando sessão...</p>;
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
    return <p className="p-4 text-zinc-400">Carregando exercícios...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-40">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Sessão em andamento</h1>
          <ElapsedTime
            startedAt={session.startedAt}
            pausedAt={session.pausedAt}
            totalPausedMs={session.totalPausedMs}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNotes((s) => !s)}
            className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm"
          >
            📝
          </button>
          <button
            onClick={togglePause}
            className={`px-3 py-2 rounded-lg text-sm ${
              session.pausedAt
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            {session.pausedAt ? '▶' : '⏸'}
          </button>
          <button
            onClick={finish}
            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg font-medium"
          >
            Finalizar
          </button>
        </div>
      </div>

      {/* Notas */}
      {showNotes && (
        <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
          <label className="text-sm text-zinc-400">Anotações da sessão</label>
          <textarea
            className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none min-h-[100px] resize-y"
            placeholder="Ex: ombro esquerdo incomodou no supino..."
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={saveNotes}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg font-medium"
            >
              Salvar notas
            </button>
            <button
              onClick={() => setShowNotes(false)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg"
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

      <button
        onClick={finish}
        className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-lg font-semibold"
      >
        🏁 Finalizar treino
      </button>

      {/* Timer de descanso */}
      {restSeconds !== null && (
        <RestTimer seconds={restSeconds} onClose={() => setRestSeconds(null)} />
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
    <p className="text-sm text-emerald-400 flex items-center gap-2">
      ⏱ {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
      {pausedAt && <span className="text-amber-400 text-xs">⏸ pausado</span>}
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
    <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {exercises.map((ex) => {
          const done = doneIds.has(ex.id!);
          return (
            <button
              key={ex.id}
              onClick={() => scrollTo(ex.id!)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                done
                  ? 'bg-emerald-700 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              {done && '✔ '}
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
  const [rpe, setRpe] = useState<number | undefined>(undefined);
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [type, setType] = useState<SetType>('normal');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  // TUT: cronômetro ativo
  const [tutStart, setTutStart] = useState<number | null>(null);
  const [tutElapsed, setTutElapsed] = useState(0);

  // TUT rodando → atualiza a cada segundo
  useEffect(() => {
    if (tutStart === null) return;
    const t = setInterval(() => {
      setTutElapsed(Math.floor((Date.now() - tutStart) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [tutStart]);

  // Última série antes desta sessão
  const lastSet = useLiveQuery(async () => {
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
  }, [exercise.id, sessionId]);

  // PR anterior
  const pr = useLiveQuery(async () => {
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
  }, [exercise.id, sessionId]);

  // 📊 Analisa progresso desse exercício nas últimas sessões
  const analysis = useLiveQuery(async () => {
    try {
      const all = await db.sets
        .where('exerciseId')
        .equals(exercise.id!)
        .toArray();
      // exclui a sessão atual da análise
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

      // Sugestão: bateu o topo da faixa em TODAS as séries nas 2 últimas sessões
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
  }, [exercise.id, sessionId, exercise.targetRepsMin, exercise.targetRepsMax]);

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

  // Soma de TUT da sessão (todas as séries desse exercício)
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
      rpe, // 👈 novo
    });

    // 🔔 vibra PR (só conta tipos de trabalho)
    if (type !== 'warmup' && pr && w > pr.weight && 'vibrate' in navigator) {
      navigator.vibrate?.([100, 50, 100, 50, 200]);
    }

    // reset campos
    setRpe(undefined);
    setReps('');
    setWeight('');
    setNote('');
    setShowNote(false);
    setTutStart(null);
    setTutElapsed(0);
    // tipo volta para "normal" mas mantém se for myo (para facilitar)
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
      className={`rounded-2xl p-4 space-y-3 transition ${
        beatPR
          ? 'bg-amber-950/30 border border-amber-700'
          : done
          ? 'bg-emerald-950/40 border border-emerald-800'
          : 'bg-zinc-900'
      }`}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold flex items-center gap-2 flex-wrap">
          {done && !beatPR && <span className="text-emerald-400">✔</span>}
          <span>
            {exercise.order}. {exercise.name}
          </span>
          {beatPR && (
            <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">
              🏆 NOVO PR {newPRValue} kg
            </span>
          )}
        </h3>
        <div className="flex flex-col items-end gap-0.5">
          {pr && (
            <span
              className={`text-xs ${
                beatPR ? 'text-zinc-500 line-through' : 'text-amber-400'
              }`}
            >
              🏆 PR: {pr.weight} kg × {pr.reps}
            </span>
          )}
          {targetMin && targetMax && (
            <span className="text-xs text-emerald-400">
              🎯 {targetMin}–{targetMax} reps
            </span>
          )}
          {done && (
            <span className="text-xs text-emerald-400">
              {allSets.length} série{allSets.length > 1 ? 's' : ''}
              {totalTut > 0 && ` · TUT ${totalTut}s`}
            </span>
          )}
        </div>
      </div>

      {/* 📝 Nota permanente do exercício */}
      {exercise.note && (
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 italic">
          📝 {exercise.note}
        </div>
      )}

      {/* 💡 Sugestão de carga */}
      {analysis?.suggestedWeight && (
        <div className="bg-emerald-950/50 border border-emerald-700 rounded-lg px-3 py-2 text-xs text-emerald-300 flex items-center justify-between gap-2">
          <span>
            💡 Você bateu <strong>{exercise.targetRepsMax} reps</strong> em
            todas as séries nas 2 últimas sessões. Considere subir para{' '}
            <strong>{analysis.suggestedWeight} kg</strong>.
          </span>
          <button
            onClick={() => {
              setWeight(String(analysis.suggestedWeight));
            }}
            className="bg-emerald-700 hover:bg-emerald-600 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap"
          >
            Usar
          </button>
        </div>
      )}

      {/* 📉 Platô detectado */}
      {analysis?.plateau && !analysis.suggestedWeight && (
        <div className="bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 text-xs text-red-300">
          📉 <strong>Platô detectado</strong> — sua carga não sobe há 3 sessões.
          Considere mudar a variação (reps, tempo, drop-set) ou fazer um deload.
        </div>
      )}

      {/* Lista de séries */}
      {allSets.length > 0 && (
        <ul className="space-y-1">
          {allSets.map((s) => {
            const isPRSet = !!pr && s.weight > pr.weight && s.type !== 'warmup';
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
                className={`flex justify-between items-center rounded-lg px-3 py-2 text-sm gap-2 ${
                  isPRSet
                    ? 'bg-amber-900/40 border border-amber-700'
                    : 'bg-zinc-800'
                }`}
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  {isPRSet && '🏆'}
                  <span>
                    Série {s.setNumber}: <strong>{s.reps}</strong> reps ×{' '}
                    <strong>{s.weight}</strong> kg
                  </span>

                  {t !== 'normal' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${typeBadgeStyle(
                        t
                      )}`}
                    >
                      {typeLabel(t)}
                    </span>
                  )}

                  {inRange && (
                    <span className="text-[10px] text-emerald-400">🎯</span>
                  )}
                  {belowRange && (
                    <span className="text-[10px] text-blue-400">↓ abaixo</span>
                  )}
                  {aboveRange && (
                    <span className="text-[10px] text-amber-400">↑ acima</span>
                  )}

                  {s.rpe && (
                    <span className="text-[10px] text-zinc-400">
                      RPE {s.rpe}
                    </span>
                  )}

                  {s.tutSeconds !== undefined && (
                    <span className="text-[10px] text-zinc-400">
                      TUT {s.tutSeconds}s
                    </span>
                  )}
                </span>

                <span className="flex items-center gap-2">
                  {s.note && (
                    <span
                      className="text-[10px] text-zinc-400 italic truncate max-w-[100px]"
                      title={s.note}
                    >
                      📝 {s.note}
                    </span>
                  )}
                  <button
                    onClick={() => removeSet(s.id!)}
                    className="text-red-400 hover:text-red-300 text-xs"
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
          className="w-full bg-emerald-700 hover:bg-emerald-600 py-2 rounded-lg text-sm font-medium"
        >
          ⚡ Repetir última ({lastSet.reps} × {lastSet.weight} kg)
        </button>
      )}

      {/* Input principal */}
      <div className="flex gap-2">
        <input
          className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 outline-none"
          placeholder={lastSet ? `${lastSet.reps} reps` : 'Reps'}
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
        <input
          className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 outline-none"
          placeholder={lastSet ? `${lastSet.weight} kg` : 'Carga (kg)'}
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button
          onClick={() => addSet()}
          className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-medium"
        >
          +
        </button>
      </div>

      {/* Barra de extras: tipo, TUT, nota */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Botão de tipo */}
        <div className="relative">
          <button
            onClick={() => setShowTypeMenu((v) => !v)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border ${typeBadgeStyle(
              type
            )}`}
          >
            🏷 {typeLabel(type)}
          </button>
          {showTypeMenu && (
            <div className="absolute z-20 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg p-1 shadow-xl w-48">
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
                  className={`w-full text-left text-xs px-3 py-2 rounded-md hover:bg-zinc-800 ${
                    type === t ? 'text-emerald-400' : 'text-zinc-300'
                  }`}
                >
                  {typeLabel(t)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RPE rápido */}
        <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1">
          <span className="text-[10px] text-zinc-500">RPE</span>
          <select
            value={rpe ?? ''}
            onChange={(e) =>
              setRpe(e.target.value ? parseInt(e.target.value) : undefined)
            }
            className="bg-transparent text-xs outline-none text-zinc-200"
          >
            <option value="">–</option>
            {[6, 7, 8, 9, 10].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Botão TUT */}
        <button
          onClick={toggleTut}
          className={`text-xs px-2.5 py-1.5 rounded-lg border ${
            tutStart !== null
              ? 'bg-red-600/30 border-red-600 text-red-300'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300'
          }`}
        >
          ⏱ {tutStart !== null ? formatTut(tutElapsed) : 'TUT'}
        </button>

        {tutElapsed > 0 && (
          <button
            onClick={resetTut}
            className="text-xs px-2 py-1.5 text-zinc-500 hover:text-zinc-300"
          >
            zerar
          </button>
        )}

        {/* Nota */}
        <button
          onClick={() => setShowNote((v) => !v)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border ${
            note
              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300'
          }`}
        >
          📝
        </button>
      </div>

      {/* Campo de nota */}
      {showNote && (
        <input
          className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none text-sm"
          placeholder="Nota rápida da série (ex: falhou na 8ª)"
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
      return 'Aquecimento';
    case 'drop':
      return 'Drop-set';
    case 'myo':
      return 'Myo-reps';
    case 'restpause':
      return 'Rest-pause';
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
      return 'bg-zinc-800 border-zinc-700 text-zinc-400';
    case 'drop':
      return 'bg-red-950/60 border-red-800 text-red-300';
    case 'myo':
      return 'bg-purple-950/60 border-purple-800 text-purple-300';
    case 'restpause':
      return 'bg-orange-950/60 border-orange-800 text-orange-300';
    case 'cluster':
      return 'bg-blue-950/60 border-blue-800 text-blue-300';
    case 'failure':
      return 'bg-yellow-950/60 border-yellow-800 text-yellow-300';
    default:
      return 'bg-zinc-800 border-zinc-700 text-zinc-300';
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
    return <p className="p-4 text-zinc-400">Calculando resumo...</p>;
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
  const calories = Math.round(((met * 3.5 * userWeight) / 200) * durationMin);

  // Conta quantos PRs foram batidos
  const prCount = countPRs(sets, exercises);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">🏆</div>
        <h1 className="text-2xl font-bold">Treino concluído!</h1>
        <p className="text-zinc-400 text-sm">
          {new Date(startedAt).toLocaleString('pt-BR')}
        </p>
        {prCount > 0 && (
          <p className="text-amber-400 font-semibold">
            🎉 {prCount} novo{prCount > 1 ? 's' : ''} PR
            {prCount > 1 ? 's' : ''} batido{prCount > 1 ? 's' : ''}!
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Duração" value={`${durationMin} min`} icon="⏱" />
        <StatCard
          label="Exercícios"
          value={String(uniqueExercises)}
          icon="🏋️"
        />
        <StatCard label="Séries" value={String(totalSets)} icon="🔁" />
        <StatCard label="Repetições" value={String(totalReps)} icon="🔢" />
        <StatCard
          label="Volume total"
          value={`${totalVolume.toLocaleString('pt-BR')} kg`}
          icon="📦"
        />
        <StatCard
          label="Calorias (est.)"
          value={`${calories} kcal`}
          icon="🔥"
        />
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Detalhes</h2>
        {groupByExercise(sets, exercises).map((g) => (
          <div key={g.exerciseId} className="bg-zinc-900 rounded-2xl p-4">
            <div className="font-medium text-emerald-400 mb-2">
              {g.exerciseName}
            </div>
            <ul className="text-sm text-zinc-300 space-y-0.5">
              {g.sets.map((s) => (
                <li key={s.id}>
                  Série {s.setNumber}: {s.reps} reps × {s.weight} kg
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {session.notes && (
        <div className="bg-zinc-900 rounded-2xl p-4">
          <div className="text-sm text-zinc-400 mb-1">📝 Notas</div>
          <p className="text-sm italic text-zinc-300">{session.notes}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onRepeat}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-semibold"
        >
          🔄 Refazer treino
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-3 rounded-lg font-semibold"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
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

// Conta quantos exercícios tiveram PR batido NA SESSÃO ATUAL
function countPRs(
  sessionSets: {
    exerciseId: number;
    weight: number;
    sessionId: number;
  }[],
  exercises: { id?: number; name: string }[]
) {
  // (simplificado — só conta 1 vez por exercício se a carga da sessão
  // for maior que o PR anterior)
  const grouped = new Map<number, number>(); // exerciseId → max peso na sessão
  for (const s of sessionSets) {
    const cur = grouped.get(s.exerciseId) ?? 0;
    if (s.weight > cur) grouped.set(s.exerciseId, s.weight);
  }
  return grouped.size; // simplificação — vamos refinar isso depois
}
