import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import SessionView from './SessionView';
import HistoryView from './HistoryView';
import ProfileView from './ProfileView';
import DashboardView from './DashboardView';
import ExercisePicker from './ExercisePicker';
import ExerciseProgressView from './ExerciseProgressView';
import AchievementsView from './AchievementsView';
import CalendarView from './CalendarView';

type View =
  | 'home'
  | 'history'
  | 'profile'
  | 'progress'
  | 'exercise'
  | 'achievements'
  | 'calendar';

export default function App() {
  // ---------- Estados ----------
  const [workoutName, setWorkoutName] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [inSession, setInSession] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [view, setView] = useState<View>('home');
  const [pickerOpen, setPickerOpen] = useState(false);

  // ---------- Dados ----------
  const workouts = useLiveQuery(async () => {
    const all = await db.workouts.toArray();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }, []);

  const exercises = useLiveQuery(
    () =>
      selectedWorkout
        ? db.exercises
            .where('workoutId')
            .equals(selectedWorkout)
            .sortBy('order')
        : [],
    [selectedWorkout]
  );

  const profile = useLiveQuery(() => db.profile.toCollection().first(), []);

  // ---------- Ações: treinos ----------
  async function createWorkout() {
    if (!workoutName.trim()) return;
    await db.workouts.add({
      name: workoutName.trim(),
      createdAt: Date.now(),
    });
    setWorkoutName('');
  }

  async function deleteWorkout(id: number) {
    if (!confirm('Apagar esse treino e seus exercícios?')) return;
    await db.exercises.where('workoutId').equals(id).delete();
    await db.workouts.delete(id);
    if (selectedWorkout === id) setSelectedWorkout(null);
  }

  // ---------- Ações: exercícios ----------
  async function addExercise() {
    if (!exerciseName.trim() || !selectedWorkout) return;
    const order = (exercises?.length ?? 0) + 1;
    await db.exercises.add({
      workoutId: selectedWorkout,
      name: exerciseName.trim(),
      order,
    });
    setExerciseName('');
  }

  async function addExerciseFromLibrary(name: string) {
    if (!selectedWorkout) return;
    const order = (exercises?.length ?? 0) + 1;
    await db.exercises.add({
      workoutId: selectedWorkout,
      name,
      order,
    });
    // não fecha o picker — permite adicionar vários seguidos
  }

  async function removeExercise(id: number) {
    await db.exercises.delete(id);
  }

  // ---------- Telas alternativas ----------
  if (view === 'history') {
    return <HistoryView onBack={() => setView('home')} />;
  }

  if (view === 'profile') {
    return <ProfileView onBack={() => setView('home')} />;
  }

  if (view === 'progress') {
    return <DashboardView onBack={() => setView('home')} />;
  }

  if (view === 'exercise') {
    return <ExerciseProgressView onBack={() => setView('home')} />;
  }

  if (view === 'achievements') {
    return <AchievementsView onBack={() => setView('home')} />;
  }

  if (view === 'calendar') {
    return <CalendarView onBack={() => setView('home')} />;
  }

  // ---------- Tela de sessão ----------
  if (inSession && selectedWorkout) {
    return (
      <SessionView
        key={sessionKey}
        workoutId={selectedWorkout}
        onFinish={() => setInSession(false)}
        onRepeat={() => setSessionKey((k) => k + 1)}
      />
    );
  }

  // ---------- Tela principal ----------
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-3xl font-bold">
          💪 {profile?.name ? `Olá, ${profile.name}` : 'Meu Treino'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('progress')}
            className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm"
          >
            📊
          </button>
          <button
            onClick={() => setView('history')}
            className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm"
          >
            📜
          </button>
          <button
            onClick={() => setView('exercise')}
            className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm"
          >
            📈
          </button>
          <button
            onClick={() => setView('profile')}
            className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm"
          >
            👤
          </button>
          <button
            onClick={() => setView('achievements')}
            className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm"
          >
            🏅
          </button>
          <button
            onClick={() => setView('calendar')}
            className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm"
          >
            📅
          </button>
        </div>
      </div>

      {/* Criar treino */}
      <section className="bg-zinc-900 rounded-2xl p-4 space-y-3">
        <h2 className="text-xl font-semibold">Novo treino</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 outline-none"
            placeholder="Ex: Treino A - Peito e Tríceps"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createWorkout()}
          />
          <button
            onClick={createWorkout}
            className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-medium"
          >
            Criar
          </button>
        </div>
      </section>

      {/* Lista de treinos */}
      <section className="bg-zinc-900 rounded-2xl p-4 space-y-3">
        <h2 className="text-xl font-semibold">Meus treinos</h2>
        {workouts?.length === 0 && (
          <p className="text-zinc-500 text-sm">Nenhum treino ainda.</p>
        )}
        <ul className="space-y-2">
          {workouts?.map((w) => (
            <li key={w.id} className="flex gap-2">
              <button
                onClick={() => setSelectedWorkout(w.id!)}
                className={`flex-1 text-left px-4 py-3 rounded-lg transition ${
                  selectedWorkout === w.id
                    ? 'bg-emerald-700'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {w.name}
              </button>
              <button
                onClick={() => deleteWorkout(w.id!)}
                className="bg-zinc-800 hover:bg-red-900 px-3 rounded-lg text-sm"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Exercícios do treino selecionado */}
      {selectedWorkout && (
        <section className="bg-zinc-900 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Exercícios</h2>
            <button
              onClick={() => setPickerOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              📚 Biblioteca
            </button>
          </div>

          {/* Input manual */}
          <div className="flex gap-2">
            <input
              className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 outline-none"
              placeholder="Adicionar manualmente..."
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addExercise()}
            />
            <button
              onClick={addExercise}
              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg font-medium"
            >
              Adicionar
            </button>
          </div>

          {/* Lista de exercícios */}
          {exercises?.length === 0 && (
            <p className="text-zinc-500 text-sm">
              Nenhum exercício. Adicione pela biblioteca ou manualmente.
            </p>
          )}

          <ul className="space-y-2">
            {exercises?.map((ex) => (
              <li
                key={ex.id}
                className="bg-zinc-800 px-3 py-3 rounded-lg space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span>
                    {ex.order}. {ex.name}
                  </span>
                  <button
                    onClick={() => removeExercise(ex.id!)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    remover
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">🎯 Reps alvo:</span>
                  <input
                    className="w-14 bg-zinc-900 rounded px-2 py-1 outline-none text-center"
                    inputMode="numeric"
                    placeholder="min"
                    value={ex.targetRepsMin ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                        ? parseInt(e.target.value)
                        : undefined;
                      db.exercises.update(ex.id!, { targetRepsMin: v });
                    }}
                  />
                  <span className="text-zinc-500">até</span>
                  <input
                    className="w-14 bg-zinc-900 rounded px-2 py-1 outline-none text-center"
                    inputMode="numeric"
                    placeholder="max"
                    value={ex.targetRepsMax ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                        ? parseInt(e.target.value)
                        : undefined;
                      db.exercises.update(ex.id!, { targetRepsMax: v });
                    }}
                  />
                </div>

                {/* 📝 Nota permanente do exercício */}
                <input
                  className="w-full bg-zinc-900 rounded px-2 py-1.5 outline-none text-xs"
                  placeholder="📝 Nota (ex: ombro esquerdo, aumentar carga em 12 reps)"
                  value={ex.note ?? ''}
                  onChange={(e) => {
                    db.exercises.update(ex.id!, {
                      note: e.target.value || undefined,
                    });
                  }}
                />
              </li>
            ))}
          </ul>

          {/* Iniciar treino */}
          <button
            onClick={() => setInSession(true)}
            disabled={!exercises || exercises.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-lg font-semibold"
          >
            ▶️ Iniciar treino
          </button>
        </section>
      )}

      {/* Modal da biblioteca */}
      {pickerOpen && (
        <ExercisePicker
          onAdd={addExerciseFromLibrary}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
