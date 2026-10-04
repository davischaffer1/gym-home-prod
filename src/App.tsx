import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import SessionView from './SessionView';
import HistoryView from './HistoryView';
import ProfileView from './ProfileView';
import DashboardView from './DashboardView';
import ExercisePicker from './ExercisePicker';
import AchievementsView from './AchievementsView';
import CalendarView from './CalendarView';
import ExerciseProgressView from './ExerciseProgressView';
import { Button, Card, Input, SectionTitle } from './ui';

type View =
  | 'home'
  | 'history'
  | 'profile'
  | 'progress'
  | 'exercise'
  | 'achievements'
  | 'calendar';

export default function App() {

  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
const [editingWorkoutName, setEditingWorkoutName] = useState('');
  const [workoutName, setWorkoutName] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [inSession, setInSession] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [view, setView] = useState<View>('home');
  const [pickerOpen, setPickerOpen] = useState(false);

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

  async function createWorkout() {
    if (!workoutName.trim()) return;
    await db.workouts.add({
      name: workoutName.trim(),
      createdAt: Date.now(),
    });
    setWorkoutName('');
  }

  async function saveWorkoutName(id: number) {
    if (!editingWorkoutName.trim()) {
      setEditingWorkoutId(null);
      return;
    }
    await db.workouts.update(id, { name: editingWorkoutName.trim() });
    setEditingWorkoutId(null);
    setEditingWorkoutName('');
  }

  async function deleteWorkout(id: number) {
    if (!confirm('Apagar esse treino e seus exercícios?')) return;
    await db.exercises.where('workoutId').equals(id).delete();
    await db.workouts.delete(id);
    if (selectedWorkout === id) setSelectedWorkout(null);
  }

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

  async function addExerciseFromLibrary(name: string, group?: string) {
    if (!selectedWorkout) return;
    const order = (exercises?.length ?? 0) + 1;
    await db.exercises.add({
      workoutId: selectedWorkout,
      name,
      order,
      primaryGroup: group,
    });
  }

  async function duplicateWorkout(id: number) {
    const original = await db.workouts.get(id);
    if (!original) return;
  
    const originalExercises = await db.exercises
      .where('workoutId')
      .equals(id)
      .sortBy('order');
  
    // Cria o novo treino
    const newWorkoutId = await db.workouts.add({
      name: `${original.name} (cópia)`,
      createdAt: Date.now(),
    });
  
    // Copia os exercícios
    for (const ex of originalExercises) {
      await db.exercises.add({
        workoutId: newWorkoutId,
        name: ex.name,
        order: ex.order,
        targetRepsMin: ex.targetRepsMin,
        targetRepsMax: ex.targetRepsMax,
        targetSets: ex.targetSets,
        note: ex.note,
        primaryGroup: ex.primaryGroup,
        equipment: ex.equipment,
        targetRIR: ex.targetRIR,
        useRIR: ex.useRIR,
      });
    }
  
    // Seleciona o novo treino automaticamente
    setSelectedWorkout(newWorkoutId);
  }

  async function removeExercise(id: number) {
    if (!confirm('Remover esse exercício do treino?')) return;
    await db.exercises.delete(id);
  }

  async function moveExerciseUp(exerciseId: number) {
    if (!selectedWorkout || !exercises) return;
    const idx = exercises.findIndex((e) => e.id === exerciseId);
    if (idx <= 0) return;
  
    const prev = exercises[idx - 1];
    const current = exercises[idx];
  
    await db.exercises.update(current.id!, { order: prev.order });
    await db.exercises.update(prev.id!, { order: current.order });
  }
  
  async function moveExerciseDown(exerciseId: number) {
    if (!selectedWorkout || !exercises) return;
    const idx = exercises.findIndex((e) => e.id === exerciseId);
    if (idx === -1 || idx >= exercises.length - 1) return;
  
    const next = exercises[idx + 1];
    const current = exercises[idx];
  
    await db.exercises.update(current.id!, { order: next.order });
    await db.exercises.update(next.id!, { order: current.order });
  }

  // ───── Telas alternativas ─────
  if (view === 'history') {
    return (
      <div className="min-h-screen safe-top safe-bottom">
        <HistoryView onBack={() => setView('home')} />
      </div>
    );
  }
  if (view === 'profile') {
    return (
      <div className="min-h-screen safe-top safe-bottom">
        <ProfileView onBack={() => setView('home')} />
      </div>
    );
  }
  if (view === 'progress') {
    return (
      <div className="min-h-screen safe-top safe-bottom">
        <DashboardView onBack={() => setView('home')} />
      </div>
    );
  }
  if (view === 'exercise') {
    return (
      <div className="min-h-screen safe-top safe-bottom">
        <ExerciseProgressView onBack={() => setView('home')} />
      </div>
    );
  }
  if (view === 'achievements') {
    return (
      <div className="min-h-screen safe-top safe-bottom">
        <AchievementsView onBack={() => setView('home')} />
      </div>
    );
  }
  if (view === 'calendar') {
    return (
      <div className="min-h-screen safe-top safe-bottom">
        <CalendarView onBack={() => setView('home')} />
      </div>
    );
  }

  // ───── Sessão ─────
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

  // ───── Tela principal ─────
  return (
    <div className="min-h-screen safe-top safe-bottom safe-x">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-32 space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
              })}
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-0.5 truncate">
              {profile?.name ? `Olá, ${profile.name}` : 'Meu Treino'} 💪
            </h1>
          </div>
          <button
            onClick={() => setView('profile')}
            className="w-12 h-12 rounded-2xl bg-bg-elevated border border-white/5 flex items-center justify-center text-xl active:scale-95 transition-all flex-shrink-0"
          >
            👤
          </button>
        </header>

        {/* Quick actions — grade 2x2 */}
        <div className="grid grid-cols-4 gap-2">
          <QuickAction
            icon="📊"
            label="Progresso"
            onClick={() => setView('progress')}
          />
          <QuickAction
            icon="📈"
            label="Exercícios"
            onClick={() => setView('exercise')}
          />
          <QuickAction
            icon="📅"
            label="Calendário"
            onClick={() => setView('calendar')}
          />
          <QuickAction
            icon="🏅"
            label="Conquistas"
            onClick={() => setView('achievements')}
          />
        </div>

        {/* Criar treino */}
        <section>
          <SectionTitle>Novo treino</SectionTitle>
          <Card>
            <div className="flex gap-2">
              <Input
                value={workoutName}
                onChange={setWorkoutName}
                placeholder="Ex: Treino A - Peito"
                onKeyDown={(e) => e.key === 'Enter' && createWorkout()}
              />
              <Button onClick={createWorkout} className="flex-shrink-0">
                +
              </Button>
            </div>
          </Card>
        </section>

        {/* Lista de treinos */}
        <section>
          <SectionTitle
            action={
              <button
                onClick={() => setView('history')}
                className="text-xs text-accent hover:text-accent-light font-medium"
              >
                Ver histórico
              </button>
            }
          >
            Meus treinos
          </SectionTitle>

          {workouts?.length === 0 && (
            <Card>
              <p className="text-zinc-500 text-sm text-center py-6">
                Nenhum treino ainda. Crie o primeiro acima 👆
              </p>
            </Card>
          )}

          <div className="space-y-2">
          {workouts?.map((w) => {
  const isSelected = selectedWorkout === w.id;
  const isEditing = editingWorkoutId === w.id;
  return (
    <li
      key={w.id}
      className={`group relative rounded-3xl border transition-all duration-200 overflow-hidden ${
        isSelected
          ? 'bg-accent/10 border-accent/40 shadow-glow'
          : 'bg-bg-surface border-white/5'
      }`}
    >
      {isEditing ? (
        // Modo edição
        <div className="p-4 flex gap-2">
          <input
            autoFocus
            value={editingWorkoutName}
            onChange={(e) => setEditingWorkoutName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveWorkoutName(w.id!);
              if (e.key === 'Escape') setEditingWorkoutId(null);
            }}
            className="flex-1 bg-bg-elevated border border-white/5 rounded-2xl px-3 py-2 text-base outline-none focus:border-accent/50"
          />
          <button
            onClick={() => saveWorkoutName(w.id!)}
            className="bg-accent hover:bg-accent-light px-4 rounded-2xl font-medium active:scale-95 transition-all"
          >
            ✓
          </button>
          <button
            onClick={() => setEditingWorkoutId(null)}
            className="bg-white/5 hover:bg-white/10 px-3 rounded-2xl active:scale-95 transition-all"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setSelectedWorkout(isSelected ? null : w.id!)}
            className="w-full text-left px-5 py-4 flex items-center justify-between active:scale-[0.99] transition-transform"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-base truncate">
                {w.name}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {isSelected ? 'Toque para fechar' : 'Toque para abrir'}
              </div>
            </div>
            <div
              className={`text-xl transition-transform ${
                isSelected ? 'rotate-90' : ''
              }`}
            >
              {isSelected ? '▾' : '›'}
            </div>
          </button>

          {isSelected && (
            <div className="px-5 pb-4 -mt-1 animate-fade-in space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setEditingWorkoutId(w.id!);
                    setEditingWorkoutName(w.name);
                  }}
                  className="bg-white/5 hover:bg-white/10 py-2.5 rounded-2xl text-xs font-medium active:scale-95 transition-all"
                >
                  ✏️ Renomear
                </button>
                <button
                  onClick={() => duplicateWorkout(w.id!)}
                  className="bg-white/5 hover:bg-white/10 py-2.5 rounded-2xl text-xs font-medium active:scale-95 transition-all"
                >
                  📋 Duplicar
                </button>
              </div>
              <button
                onClick={() => deleteWorkout(w.id!)}
                className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-300 py-2.5 rounded-2xl text-xs font-medium active:scale-95 transition-all"
              >
                🗑 Apagar treino
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
})}
          </div>
        </section>

        {/* Exercícios do treino selecionado */}
        {selectedWorkout && (
          <section className="animate-slide-up">
            <SectionTitle
              action={
                <button
                  onClick={() => setPickerOpen(true)}
                  className="text-xs text-accent hover:text-accent-light font-medium"
                >
                  📚 Biblioteca
                </button>
              }
            >
              Exercícios
            </SectionTitle>

            <Card className="space-y-3">
              {/* Input manual */}
              <div className="flex gap-2">
                <Input
                  value={exerciseName}
                  onChange={setExerciseName}
                  placeholder="Adicionar exercício..."
                  onKeyDown={(e) => e.key === 'Enter' && addExercise()}
                />
                <Button
                  onClick={addExercise}
                  variant="secondary"
                  className="flex-shrink-0"
                >
                  +
                </Button>
              </div>

              {exercises?.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-4">
                  Nenhum exercício. Adicione pela biblioteca ou manualmente.
                </p>
              )}

              {/* Lista */}
              <div className="space-y-2">
                {exercises?.map((ex) => (
                  <ExerciseItem
                  key={ex.id}
                  ex={ex}
                  isFirst={ex.id === exercises[0]?.id}
                  isLast={ex.id === exercises[exercises.length - 1]?.id}
                  onRemove={() => removeExercise(ex.id!)}
                  onMoveUp={() => moveExerciseUp(ex.id!)}
                  onMoveDown={() => moveExerciseDown(ex.id!)}
                />
                ))}
              </div>
            </Card>

            {/* Botão iniciar */}
            <div className="mt-4">
              <Button
                fullWidth
                size="lg"
                disabled={!exercises || exercises.length === 0}
                onClick={() => setInSession(true)}
              >
                ▶ Iniciar treino
              </Button>
            </div>
          </section>
        )}
      </div>

      {/* Modal biblioteca */}
      {pickerOpen && (
        // No App.tsx, ao renderizar:
<ExercisePicker
  onAdd={(name, group) => addExerciseFromLibrary(name, group)}
  onClose={() => setPickerOpen(false)}
/>
      )}
    </div>
  );
}

/* ---------- Componentes locais ---------- */

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-bg-surface border border-white/5 hover:bg-bg-elevated active:scale-95 transition-all"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
    </button>
  );
}

function ExerciseItem({
  ex,
  isFirst,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  ex: {
    id?: number;
    name: string;
    order: number;
    targetRepsMin?: number;
    targetRepsMax?: number;
    note?: string;
    primaryGroup?: string;
    useRIR?: boolean;
    targetRIR?: number;
  };
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="bg-bg-elevated rounded-2xl p-3 space-y-2 border border-white/5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Botões de reordenação */}
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="w-6 h-5 flex items-center justify-center rounded text-[10px] text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed active:scale-90 transition-all"
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="w-6 h-5 flex items-center justify-center rounded text-[10px] text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed active:scale-90 transition-all"
            >
              ▼
            </button>
          </div>

          <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
            {ex.order}
          </span>
          <span className="font-medium text-sm truncate">{ex.name}</span>
        </div>

        <button
          onClick={onRemove}
          className="text-red-400 hover:text-red-300 text-xs px-2 py-1 active:scale-90 transition flex-shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Faixa de reps */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500">🎯</span>
        <input
          className="w-14 bg-bg-overlay rounded-lg px-2 py-1.5 outline-none text-center text-xs border border-white/5 focus:border-accent/50"
          inputMode="numeric"
          placeholder="min"
          value={ex.targetRepsMin ?? ''}
          onChange={(e) => {
            const v = e.target.value ? parseInt(e.target.value) : undefined;
            db.exercises.update(ex.id!, { targetRepsMin: v });
          }}
        />
        <span className="text-zinc-600">—</span>
        <input
          className="w-14 bg-bg-overlay rounded-lg px-2 py-1.5 outline-none text-center text-xs border border-white/5 focus:border-accent/50"
          inputMode="numeric"
          placeholder="max"
          value={ex.targetRepsMax ?? ''}
          onChange={(e) => {
            const v = e.target.value ? parseInt(e.target.value) : undefined;
            db.exercises.update(ex.id!, { targetRepsMax: v });
          }}
        />
        <span className="text-zinc-600 text-[10px]">reps</span>
      </div>

      {/* RIR */}
      <div className="flex items-center gap-2 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={ex.useRIR ?? false}
            onChange={(e) =>
              db.exercises.update(ex.id!, { useRIR: e.target.checked })
            }
            className="w-3.5 h-3.5 accent-emerald-500"
          />
          <span className="text-zinc-400">🧠 RIR</span>
        </label>

        {ex.useRIR && (
          <select
            className="bg-bg-overlay rounded-lg px-2 py-1 text-xs border border-white/5 outline-none"
            value={ex.targetRIR ?? 2}
            onChange={(e) =>
              db.exercises.update(ex.id!, {
                targetRIR: parseInt(e.target.value),
              })
            }
          >
            {[0, 1, 2, 3, 4].map((v) => (
              <option key={v} value={v}>
                RIR {v}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Nota permanente */}
      <input
        className="w-full bg-bg-overlay rounded-lg px-2 py-1.5 outline-none text-xs border border-white/5 focus:border-accent/50"
        placeholder="📝 Nota permanente"
        value={ex.note ?? ''}
        onChange={(e) =>
          db.exercises.update(ex.id!, {
            note: e.target.value || undefined,
          })
        }
      />
    </div>
  );
}