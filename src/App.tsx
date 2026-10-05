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
import { useSwipe } from './useSwipe';
import {
  AppShell,
  BottomNav,
  Button,
  Input,
  SectionTitle,
  Card,
} from './ui';

type Tab = 'home' | 'stats' | 'evolution' | 'agenda' | 'profile' | 'new';
type SubView = null | 'history' | 'progress' | 'achievements';

const TABS: Tab[] = ['home', 'stats', 'evolution', 'agenda', 'profile'];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [subView, setSubView] = useState<SubView>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);
  const [inSession, setInSession] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [exerciseName, setExerciseName] = useState('');

  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [editingWorkoutName, setEditingWorkoutName] = useState('');

  const workouts = useLiveQuery(async () => {
    const all = await db.workouts.toArray();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }, []);

  const exercises = useLiveQuery(
    () =>
      selectedWorkout
        ? db.exercises.where('workoutId').equals(selectedWorkout).sortBy('order')
        : [],
    [selectedWorkout]
  );

  const profile = useLiveQuery(() => db.profile.toCollection().first(), []);

  // ───── Swipe entre abas ─────
  const currentIdx = TABS.indexOf(tab === 'new' ? 'home' : tab);

  useSwipe({
    enabled: !inSession && !subView && tab !== 'new',
    onSwipeLeft: () => {
      if (currentIdx < TABS.length - 1) setTab(TABS[currentIdx + 1]);
    },
    onSwipeRight: () => {
      if (currentIdx > 0) setTab(TABS[currentIdx - 1]);
    },
  });

  // ══════════════ AÇÕES ══════════════

  async function createWorkout() {
    if (!workoutName.trim()) return;
    const id = await db.workouts.add({
      name: workoutName.trim(),
      createdAt: Date.now(),
    });
    setWorkoutName('');
    setSelectedWorkout(id);
    setTab('home');
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

  async function duplicateWorkout(id: number) {
    const original = await db.workouts.get(id);
    if (!original) return;

    const originalExercises = await db.exercises
      .where('workoutId')
      .equals(id)
      .sortBy('order');

    const newWorkoutId = await db.workouts.add({
      name: `${original.name} (cópia)`,
      createdAt: Date.now(),
    });

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
    setSelectedWorkout(newWorkoutId);
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

  async function removeExercise(id: number) {
    if (!confirm('Remover esse exercício do treino?')) return;
    await db.exercises.delete(id);
  }

  async function moveExerciseUp(exerciseId: number) {
    if (!exercises) return;
    const idx = exercises.findIndex((e) => e.id === exerciseId);
    if (idx <= 0) return;
    const prev = exercises[idx - 1];
    const current = exercises[idx];
    await db.exercises.update(current.id!, { order: prev.order });
    await db.exercises.update(prev.id!, { order: current.order });
  }

  async function moveExerciseDown(exerciseId: number) {
    if (!exercises) return;
    const idx = exercises.findIndex((e) => e.id === exerciseId);
    if (idx === -1 || idx >= exercises.length - 1) return;
    const next = exercises[idx + 1];
    const current = exercises[idx];
    await db.exercises.update(current.id!, { order: next.order });
    await db.exercises.update(next.id!, { order: current.order });
  }

  // ══════════════ TELA CHEIA (SESSÃO) ══════════════
  if (inSession && selectedWorkout) {
    return (
      <SessionView
        key={sessionKey}
        workoutId={selectedWorkout}
        onFinish={() => {
          setInSession(false);
          setSelectedWorkout(null);
        }}
        onRepeat={() => setSessionKey((k) => k + 1)}
      />
    );
  }

  // ══════════════ SUB-TELAS ══════════════
  if (subView === 'history') return <HistoryView onBack={() => setSubView(null)} />;
  if (subView === 'progress') return <DashboardView onBack={() => setSubView(null)} />;
  if (subView === 'achievements')
    return <AchievementsView onBack={() => setSubView(null)} />;

  // ══════════════ BOTTOM NAV ══════════════
  const bottomNav = (
    <BottomNav
      activeTab={tab}
      onChange={(id) => setTab(id as Tab)}
      tabs={[
        { id: 'home', label: 'Início', icon: 'home' },
        { id: 'stats', label: 'Stats', icon: 'chart' },
        { id: 'evolution', label: 'Evolução', icon: 'trend' },
        { id: 'agenda', label: 'Agenda', icon: 'calendar' },
        { id: 'profile', label: 'Perfil', icon: 'user' },
      ]}
    />
  );

  // ══════════════ TAB: HOME ══════════════
  if (tab === 'home') {
    return (
      <>
        <AppShell
          title={profile?.name ? `Olá, ${profile.name}` : 'Meu Treino'}
          subtitle={new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}
          headerAction={
            <button
              onClick={() => setSubView('achievements')}
              className="w-10 h-10 rounded-xl bg-bg-1 border border-white/[0.06] flex items-center justify-center text-lg active:scale-95 transition-all"
            >
              🏅
            </button>
          }
          bottomNav={bottomNav}
        >
          {/* Atalhos */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <Card interactive onClick={() => setTab('stats')} className="!p-3.5">
              <span className="text-xl">📊</span>
              <div className="text-sm font-semibold text-text-0 mt-1">Stats</div>
              <div className="text-[10px] text-text-3">Estatísticas gerais</div>
            </Card>
            <Card interactive onClick={() => setSubView('history')} className="!p-3.5">
              <span className="text-xl">📜</span>
              <div className="text-sm font-semibold text-text-0 mt-1">Histórico</div>
              <div className="text-[10px] text-text-3">Treinos passados</div>
            </Card>
          </div>

          {/* Meus treinos */}
          <SectionTitle
            action={
              <button
                onClick={() => setTab('new')}
                className="text-xs text-accent font-medium"
              >
                + Novo
              </button>
            }
          >
            Meus treinos
          </SectionTitle>

          {workouts?.length === 0 && (
            <Card variant="subtle">
              <p className="text-text-3 text-sm text-center py-8">
                Nenhum treino ainda
              </p>
            </Card>
          )}

          <div className="space-y-2">
            {workouts?.map((w) => {
              const isSelected = selectedWorkout === w.id;
              const isEditing = editingWorkoutId === w.id;

              if (isEditing) {
                return (
                  <Card key={w.id} variant="accent">
                    <div className="flex gap-2">
                      <Input
                        value={editingWorkoutName}
                        onChange={setEditingWorkoutName}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveWorkoutName(w.id!);
                          if (e.key === 'Escape') setEditingWorkoutId(null);
                        }}
                      />
                      <Button
                        onClick={() => saveWorkoutName(w.id!)}
                        className="flex-shrink-0"
                      >
                        ✓
                      </Button>
                    </div>
                  </Card>
                );
              }

              return (
                <Card
                  key={w.id}
                  variant={isSelected ? 'accent' : 'default'}
                  className="!p-0 overflow-hidden"
                >
                  <button
                    onClick={() => setSelectedWorkout(isSelected ? null : w.id!)}
                    className="w-full text-left px-4 py-3.5 flex items-center justify-between active:scale-[0.99] transition-transform"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-text-0 truncate">
                        {w.name}
                      </div>
                      <div className="text-[11px] text-text-3 mt-0.5">
                        {isSelected
                          ? `${exercises?.length ?? 0} exercícios`
                          : 'Toque para abrir'}
                      </div>
                    </div>
                    <span className="text-text-3 text-lg">
                      {isSelected ? '▾' : '›'}
                    </span>
                  </button>

                  {isSelected && (
                    <div className="px-4 pb-3 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingWorkoutId(w.id!);
                            setEditingWorkoutName(w.name);
                          }}
                        >
                          ✏️ Editar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => duplicateWorkout(w.id!)}
                        >
                          📋 Duplicar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteWorkout(w.id!)}
                        >
                          🗑 Apagar
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={exerciseName}
                          onChange={setExerciseName}
                          placeholder="Adicionar exercício..."
                          onKeyDown={(e) => e.key === 'Enter' && addExercise()}
                        />
                        <Button
                          variant="secondary"
                          onClick={addExercise}
                          disabled={!exerciseName.trim()}
                          className="flex-shrink-0"
                        >
                          +
                        </Button>
                      </div>

                      {exercises?.length === 0 && (
                        <p className="text-text-3 text-xs text-center py-3">
                          Nenhum exercício ainda
                        </p>
                      )}
                      <div className="space-y-2">
                        {exercises?.map((ex, idx) => (
                          <ExerciseItem
                            key={ex.id}
                            ex={ex}
                            isFirst={idx === 0}
                            isLast={idx === exercises.length - 1}
                            onRemove={() => removeExercise(ex.id!)}
                            onMoveUp={() => moveExerciseUp(ex.id!)}
                            onMoveDown={() => moveExerciseDown(ex.id!)}
                          />
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="secondary"
                          onClick={() => setPickerOpen(true)}
                          className="flex-1"
                        >
                          📚 Biblioteca
                        </Button>
                        <Button
                          onClick={() => setInSession(true)}
                          disabled={!exercises || exercises.length === 0}
                          className="flex-1"
                        >
                          ▶ Iniciar
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {pickerOpen && (
            <ExercisePicker
              onAdd={addExerciseFromLibrary}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </AppShell>

        {/* FAB — Novo treino */}
        <button
          onClick={() => setTab('new')}
          aria-label="Novo treino"
          className="fixed z-40 right-4 w-14 h-14 rounded-full bg-accent text-black flex items-center justify-center shadow-[0_8px_24px_rgba(34,211,168,0.4)] active:scale-90 transition-transform"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
        >
          <span className="text-2xl font-bold">+</span>
        </button>
      </>
    );
  }

  // ══════════════ TAB: STATS ══════════════
  if (tab === 'stats') {
    return <DashboardView onBack={() => setTab('home')} />;
  }

  // ══════════════ TAB: EVOLUÇÃO ══════════════
  if (tab === 'evolution') {
    return <ExerciseProgressView onBack={() => setTab('home')} />;
  }

  // ══════════════ TAB: NOVO ══════════════
  if (tab === 'new') {
    return (
      <AppShell title="Novo treino" bottomNav={bottomNav}>
        <Card className="space-y-3">
          <label className="text-xs text-text-3 uppercase tracking-wider font-semibold">
            Nome do treino
          </label>
          <Input
            value={workoutName}
            onChange={setWorkoutName}
            placeholder="Ex: Treino A — Peito e Tríceps"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && createWorkout()}
          />
          <Button
            fullWidth
            onClick={createWorkout}
            disabled={!workoutName.trim()}
          >
            Criar treino
          </Button>
        </Card>

        <div className="mt-6">
          <SectionTitle>Sugestões rápidas</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {[
              { emoji: '💪', name: 'Treino A — Peito' },
              { emoji: '🔙', name: 'Treino B — Costas' },
              { emoji: '🦵', name: 'Treino C — Pernas' },
              { emoji: '🏋️', name: 'Treino D — Ombros' },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => setWorkoutName(item.name)}
                className="bg-bg-1 border border-white/[0.06] rounded-2xl px-3 py-3 text-left hover:bg-bg-2 active:scale-95 transition-all"
              >
                <div className="text-lg">{item.emoji}</div>
                <div className="text-xs text-text-1 mt-1">{item.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Button variant="secondary" fullWidth onClick={() => setTab('home')}>
            ← Voltar
          </Button>
        </div>
      </AppShell>
    );
  }

  // ══════════════ TAB: AGENDA ══════════════
  if (tab === 'agenda') {
    return <CalendarView onBack={() => setTab('home')} />;
  }

  // ══════════════ TAB: PERFIL ══════════════
  if (tab === 'profile') {
    return <ProfileView onBack={() => setTab('home')} />;
  }

  return null;
}

/* ══════════════ COMPONENTES LOCAIS ══════════════ */

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
    <div className="bg-bg-2 rounded-2xl p-3 space-y-2.5 border border-white/[0.04]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="w-5 h-4 flex items-center justify-center rounded text-[9px] text-text-3 hover:text-text-0 hover:bg-white/[0.05] disabled:opacity-20 active:scale-90 transition"
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="w-5 h-4 flex items-center justify-center rounded text-[9px] text-text-3 hover:text-text-0 hover:bg-white/[0.05] disabled:opacity-20 active:scale-90 transition"
            >
              ▼
            </button>
          </div>

          <span className="w-6 h-6 rounded-lg bg-accent-dim text-accent text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            {ex.order}
          </span>
          <span className="font-medium text-sm truncate text-text-0">
            {ex.name}
          </span>
        </div>

        <button
          onClick={onRemove}
          className="text-text-3 hover:text-danger text-sm w-7 h-7 flex items-center justify-center rounded-lg hover:bg-danger/10 active:scale-90 transition-all flex-shrink-0"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-text-3">🎯</span>
        <input
          className="w-12 bg-bg-3 rounded-lg px-2 py-1 outline-none text-center text-xs text-text-0 border border-white/[0.04] focus:border-accent/40"
          inputMode="numeric"
          placeholder="min"
          value={ex.targetRepsMin ?? ''}
          onChange={(e) => {
            const v = e.target.value ? parseInt(e.target.value) : undefined;
            db.exercises.update(ex.id!, { targetRepsMin: v });
          }}
        />
        <span className="text-text-3 text-xs">—</span>
        <input
          className="w-12 bg-bg-3 rounded-lg px-2 py-1 outline-none text-center text-xs text-text-0 border border-white/[0.04] focus:border-accent/40"
          inputMode="numeric"
          placeholder="max"
          value={ex.targetRepsMax ?? ''}
          onChange={(e) => {
            const v = e.target.value ? parseInt(e.target.value) : undefined;
            db.exercises.update(ex.id!, { targetRepsMax: v });
          }}
        />
        <span className="text-text-3 text-[10px]">reps</span>

        <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={ex.useRIR ?? false}
            onChange={(e) =>
              db.exercises.update(ex.id!, { useRIR: e.target.checked })
            }
            className="w-3.5 h-3.5 accent-accent"
          />
          <span className="text-[10px] text-text-2">🧠 RIR</span>
        </label>

        {ex.useRIR && (
          <select
            className="bg-bg-3 rounded-lg px-2 py-0.5 text-[10px] border border-white/[0.04] outline-none text-text-1"
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

      <input
        className="w-full bg-bg-3 rounded-lg px-2.5 py-1.5 outline-none text-[11px] border border-white/[0.04] focus:border-accent/40 text-text-1"
        placeholder="📝 Nota permanente"
        value={ex.note ?? ''}
        onChange={(e) =>
          db.exercises.update(ex.id!, { note: e.target.value || undefined })
        }
      />
    </div>
  );
}