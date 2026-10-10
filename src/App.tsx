import { useState, useEffect } from 'react';
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
import RecoveryView from './RecoveryView';
import DietView from './DietView';
import { useSwipe } from './useSwipe';
import { getActiveSession, clearActiveSession } from './activeSession';
import { StaggerItem, PunchButton } from './Motion';
import { Sparkline } from './ForceCharts';
import RecoveryRing from './RecoveryRing';
import { seedFoodDatabase } from './foodDatabase';
import {
  calculateRecoveryByGroup,
  suggestWorkoutToday,
  formatHoursRemaining,
} from './recovery';
import {
  AppShell,
  BottomNav,
  Button,
  Input,
  SectionTitle,
  Card,
  Badge,
} from './ui';

type Tab =
  | 'home'
  | 'stats'
  | 'evolution'
  | 'diet'
  | 'agenda'
  | 'profile'
  | 'new';
type SubView =
  | null
  | 'history'
  | 'progress'
  | 'achievements'
  | 'recovery';

const TABS: Tab[] = ['home', 'stats', 'evolution', 'diet', 'agenda', 'profile'];

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

  // Seed da base de alimentos
  useEffect(() => {
    seedFoodDatabase(db).then((res) => {
      if (res.seeded) {
        console.log(`🍎 Base de alimentos populada: ${res.count} itens`);
      }
    });
  }, []);

  // Restaura sessão ativa
  useEffect(() => {
    (async () => {
      const activeId = getActiveSession();
      if (!activeId) return;

      const session = await db.sessions.get(activeId);
      if (!session || session.finishedAt) {
        clearActiveSession();
        return;
      }

      setSelectedWorkout(session.workoutId);
      setInSession(true);
    })();
  }, []);

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
  const sessions = useLiveQuery(async () => {
    const all = await db.sessions
      .filter((s) => s.finishedAt !== undefined)
      .toArray();
    return all.sort((a, b) => b.startedAt - a.startedAt);
  }, []);
  const sets = useLiveQuery(() => db.sets.toArray(), []);
  const recovery = useLiveQuery(() => calculateRecoveryByGroup(), []);

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

  // ── Cockpit data ──
  const streak = sessions ? computeStreak(sessions.map((s) => s.startedAt)) : 0;
  const lastSession = sessions?.[0];
  const lastVolume = lastSession
    ? sets
        ?.filter((s) => s.sessionId === lastSession.id)
        .reduce((a, s) => a + s.reps * s.weight, 0) ?? 0
    : 0;

  const volumeSeries = (sessions ?? [])
    .slice(0, 7)
    .map((s) =>
      sets
        ?.filter((x) => x.sessionId === s.id)
        .reduce((a, x) => a + x.reps * x.weight, 0) ?? 0
    )
    .reverse();

  const recentGroups = recovery?.filter((r) => r.hoursSince < 72) ?? [];
  const avgRecovery =
    recentGroups.length > 0
      ? Math.round(
          recentGroups.reduce((a, r) => a + r.score, 0) / recentGroups.length
        )
      : 100;

  const suggestion = recovery ? suggestWorkoutToday(recovery) : null;

  const nextWorkout = (() => {
    if (!suggestion || !workouts || workouts.length === 0) return null;
    const recommended = suggestion.recommended.map((g) => g.toLowerCase());
    const match = workouts.find((w) =>
      recommended.some((g) => w.name.toLowerCase().includes(g))
    );
    return match ?? workouts[0];
  })();

  // ── Ações ──
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

  // Sessão
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

  // Sub-telas
  if (subView === 'history') return <HistoryView onBack={() => setSubView(null)} />;
  if (subView === 'progress') return <DashboardView onBack={() => setSubView(null)} />;
  if (subView === 'achievements')
    return <AchievementsView onBack={() => setSubView(null)} />;
  if (subView === 'recovery')
    return <RecoveryView onBack={() => setSubView(null)} />;

  // Bottom nav
  const bottomNav = (
    <BottomNav
      activeTab={tab}
      onChange={(id) => setTab(id as Tab)}
      tabs={[
        { id: 'home', label: 'Início', icon: 'home' },
        { id: 'stats', label: 'Análise', icon: 'chart' },
        { id: 'evolution', label: 'Evolução', icon: 'trend' },
        { id: 'diet', label: 'Dieta', icon: 'apple' },
        { id: 'agenda', label: 'Agenda', icon: 'calendar' },
        { id: 'profile', label: 'Perfil', icon: 'user' },
      ]}
    />
  );

  // ═══ HOME ═══
  if (tab === 'home') {
    return (
      <>
        <AppShell
          title={profile?.name ? `Olá, ${profile.name}` : 'Meu Treino'}
          subtitle={new Date()
            .toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
            .toUpperCase()}
          headerAction={
            <button
              onClick={() => setSubView('achievements')}
              className="w-10 h-10 rounded-2xl bg-bg-1 border border-white/[0.06] flex items-center justify-center text-lg active:scale-95 transition-all"
            >
              🏅
            </button>
          }
          bottomNav={bottomNav}
        >
          <div className="space-y-4">
            <StaggerItem delay={0}>
              <div className="grid grid-cols-2 gap-3">
                <Card className="!p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] text-text-3 uppercase tracking-[0.15em] font-mono-ui">
                      Streak
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-4xl font-bold font-mono-ui text-text-0 leading-none">
                        {streak}
                      </span>
                      <span className="text-sm">🔥</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-text-3 mt-3 font-mono-ui uppercase tracking-wider">
                    {streak === 0
                      ? 'Comece hoje'
                      : streak === 1
                      ? 'dia seguido'
                      : 'dias seguidos'}
                  </div>
                </Card>

                <Card className="!p-4 flex flex-col items-center justify-center">
                  <RecoveryRing
                    score={avgRecovery}
                    size={82}
                    strokeWidth={6}
                    label="Recovery"
                  />
                </Card>
              </div>
            </StaggerItem>

            {nextWorkout && (
              <StaggerItem delay={0.05}>
                <Card variant="accent" glow className="!p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] text-accent uppercase tracking-[0.2em] font-mono-ui font-bold">
                      ✦ Próximo Treino
                    </span>
                    {suggestion && suggestion.recommended.length > 0 && (
                      <Badge variant="accent">
                        {suggestion.recommended.slice(0, 2).join(' · ')}
                      </Badge>
                    )}
                  </div>

                  <h2 className="text-xl font-bold font-display text-text-0 mb-1 truncate">
                    {nextWorkout.name}
                  </h2>

                  <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-wider mb-4">
                    {(() => {
                      const count = exercises?.length ?? 0;
                      return count > 0
                        ? `${count} exercícios`
                        : 'Pronto pra treinar';
                    })()}
                  </div>

                  <PunchButton
                    onClick={() => {
                      setSelectedWorkout(nextWorkout.id!);
                      setInSession(true);
                    }}
                    className="w-full bg-accent hover:bg-accent-hover text-black py-3.5 rounded-2xl font-bold font-display shadow-glow-accent flex items-center justify-center gap-2"
                  >
                    ▶ Iniciar agora
                  </PunchButton>
                </Card>
              </StaggerItem>
            )}

            {lastSession && (
              <StaggerItem delay={0.1}>
                <Card className="!p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[9px] text-text-3 uppercase tracking-[0.2em] font-mono-ui font-bold">
                      Última Sessão
                    </div>
                    <div className="text-[10px] text-text-3 font-mono-ui">
                      {new Date(lastSession.startedAt).toLocaleDateString(
                        'pt-BR',
                        { day: '2-digit', month: 'short' }
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-2xl font-bold font-mono-ui text-text-0 leading-none">
                        {Math.round(lastVolume / 1000)}t
                      </div>
                      <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mt-1">
                        Volume
                      </div>
                    </div>

                    <div className="flex-1 flex justify-end">
                      {volumeSeries.length >= 2 && (
                        <Sparkline
                          data={volumeSeries}
                          width={100}
                          height={30}
                          color="#06b6d4"
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            )}

            <StaggerItem delay={0.15}>
              <div className="grid grid-cols-4 gap-2">
                <Card interactive onClick={() => setTab('stats')} className="!p-3">
                  <span className="text-lg">📊</span>
                  <div className="text-[9px] font-bold text-text-0 mt-1.5 font-mono-ui uppercase tracking-wider">
                    Análise
                  </div>
                </Card>
                <Card
                  interactive
                  onClick={() => setSubView('recovery')}
                  className="!p-3"
                >
                  <span className="text-lg">🧬</span>
                  <div className="text-[9px] font-bold text-text-0 mt-1.5 font-mono-ui uppercase tracking-wider">
                    Recovery
                  </div>
                </Card>
                <Card
                  interactive
                  onClick={() => setTab('diet')}
                  className="!p-3"
                >
                  <span className="text-lg">🍽️</span>
                  <div className="text-[9px] font-bold text-text-0 mt-1.5 font-mono-ui uppercase tracking-wider">
                    Dieta
                  </div>
                </Card>
                <Card
                  interactive
                  onClick={() => setSubView('history')}
                  className="!p-3"
                >
                  <span className="text-lg">📜</span>
                  <div className="text-[9px] font-bold text-text-0 mt-1.5 font-mono-ui uppercase tracking-wider">
                    Histórico
                  </div>
                </Card>
              </div>
            </StaggerItem>
          </div>

          {/* Meus treinos */}
          <div className="mt-6">
            <SectionTitle
              action={
                <button
                  onClick={() => setTab('new')}
                  className="text-[10px] text-accent hover:text-accent-hover font-mono-ui uppercase tracking-wider font-bold"
                >
                  + Novo
                </button>
              }
            >
              Meus Treinos
            </SectionTitle>

            {workouts?.length === 0 && (
              <Card variant="glass">
                <p className="text-text-3 text-sm text-center py-8 font-mono-ui text-[11px] uppercase tracking-wider">
                  Nenhum treino ainda
                </p>
              </Card>
            )}

            <div className="space-y-2">
              {workouts?.map((w, i) => {
                const isSelected = selectedWorkout === w.id;
                const isEditing = editingWorkoutId === w.id;

                if (isEditing) {
                  return (
                    <Card key={w.id} variant="accent" glow>
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
                        <PunchButton
                          onClick={() => saveWorkoutName(w.id!)}
                          className="flex-shrink-0 bg-accent hover:bg-accent-hover text-black px-4 rounded-2xl font-bold"
                        >
                          ✓
                        </PunchButton>
                      </div>
                    </Card>
                  );
                }

                return (
                  <StaggerItem key={w.id} delay={0.2 + i * 0.04}>
                    <Card
                      variant={isSelected ? 'accent' : 'default'}
                      glow={isSelected}
                      className="!p-0 overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setSelectedWorkout(isSelected ? null : w.id!)
                        }
                        className="w-full text-left px-4 py-3.5 flex items-center justify-between active:scale-[0.99] transition-transform"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-base font-display text-text-0 truncate">
                            {w.name}
                          </div>
                          <div className="text-[10px] text-text-3 mt-0.5 font-mono-ui uppercase tracking-wider">
                            {isSelected
                              ? `${exercises?.length ?? 0} exercícios`
                              : 'Toque para abrir'}
                          </div>
                        </div>
                        <span
                          className={`text-lg transition-transform ${
                            isSelected ? 'rotate-90 text-accent' : 'text-text-3'
                          }`}
                        >
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
                              ✏️
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => duplicateWorkout(w.id!)}
                            >
                              📋
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => deleteWorkout(w.id!)}
                            >
                              🗑
                            </Button>
                          </div>

                          <div className="flex gap-2">
                            <Input
                              value={exerciseName}
                              onChange={setExerciseName}
                              placeholder="Adicionar exercício..."
                              onKeyDown={(e) =>
                                e.key === 'Enter' && addExercise()
                              }
                            />
                            <PunchButton
                              onClick={addExercise}
                              disabled={!exerciseName.trim()}
                              className="flex-shrink-0 bg-white/[0.05] hover:bg-white/[0.08] text-text-1 px-4 rounded-2xl font-bold disabled:opacity-40"
                            >
                              +
                            </PunchButton>
                          </div>

                          {exercises?.length === 0 && (
                            <p className="text-text-3 text-xs text-center py-3 font-mono-ui uppercase tracking-wider">
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
                  </StaggerItem>
                );
              })}
            </div>
          </div>

          {pickerOpen && (
            <ExercisePicker
              onAdd={addExerciseFromLibrary}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </AppShell>

        <button
          onClick={() => setTab('new')}
          aria-label="Novo treino"
          className="fixed z-40 right-4 w-14 h-14 rounded-full bg-accent text-black flex items-center justify-center shadow-glow-accent active:scale-90 transition-transform animate-pulse-glow"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
        >
          <span className="text-2xl font-bold">+</span>
        </button>
      </>
    );
  }

  if (tab === 'stats') return <DashboardView onBack={() => setTab('home')} />;
  if (tab === 'evolution')
    return <ExerciseProgressView onBack={() => setTab('home')} />;
  if (tab === 'diet') return <DietView onBack={() => setTab('home')} />;

  if (tab === 'new') {
    return (
      <AppShell title="Novo Treino" bottomNav={bottomNav}>
        <Card className="space-y-3">
          <label className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold">
            Nome do Treino
          </label>
          <Input
            value={workoutName}
            onChange={setWorkoutName}
            placeholder="Ex: Treino A — Peito"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && createWorkout()}
          />
          <Button
            fullWidth
            size="lg"
            onClick={createWorkout}
            disabled={!workoutName.trim()}
          >
            Criar Treino
          </Button>
        </Card>

        <div className="mt-6">
          <SectionTitle>Sugestões Rápidas</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {[
              { emoji: '💪', name: 'Treino A — Peito' },
              { emoji: '🔙', name: 'Treino B — Costas' },
              { emoji: '🦵', name: 'Treino C — Pernas' },
              { emoji: '🏋️', name: 'Treino D — Ombros' },
            ].map((item, i) => (
              <StaggerItem key={item.name} delay={i * 0.04}>
                <button
                  onClick={() => setWorkoutName(item.name)}
                  className="w-full bg-bg-1 border border-white/[0.06] rounded-2xl px-3 py-3 text-left hover:bg-bg-2 active:scale-95 transition-all"
                >
                  <div className="text-lg">{item.emoji}</div>
                  <div className="text-[11px] font-mono-ui uppercase tracking-wider text-text-1 mt-1">
                    {item.name}
                  </div>
                </button>
              </StaggerItem>
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

  if (tab === 'agenda') return <CalendarView onBack={() => setTab('home')} />;
  if (tab === 'profile') return <ProfileView onBack={() => setTab('home')} />;

  return null;
}

/* ══════════════ HELPERS ══════════════ */

function computeStreak(timestamps: number[]) {
  const days = new Set(
    timestamps.map((t) => new Date(t).toISOString().slice(0, 10))
  );
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (
      streak === 0 &&
      key === new Date().toISOString().slice(0, 10)
    ) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
  }
  return streak;
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
    <div className="bg-bg-2 rounded-2xl p-3 space-y-2.5 border border-white/[0.04]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="w-5 h-4 flex items-center justify-center rounded text-[9px] text-text-3 hover:text-accent hover:bg-accent-dim disabled:opacity-20 active:scale-90 transition"
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="w-5 h-4 flex items-center justify-center rounded text-[9px] text-text-3 hover:text-accent hover:bg-accent-dim disabled:opacity-20 active:scale-90 transition"
            >
              ▼
            </button>
          </div>

          <span className="w-7 h-7 rounded-lg bg-accent-dim text-accent text-[11px] font-bold flex items-center justify-center flex-shrink-0 font-mono-ui">
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
        <span className="text-[10px] text-text-3 font-mono-ui uppercase tracking-wider">
          Alvo
        </span>
        <input
          className="w-12 bg-bg-3 rounded-lg px-2 py-1 outline-none text-center text-xs text-text-0 border border-white/[0.04] focus:border-accent/50 font-mono-ui"
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
          className="w-12 bg-bg-3 rounded-lg px-2 py-1 outline-none text-center text-xs text-text-0 border border-white/[0.04] focus:border-accent/50 font-mono-ui"
          inputMode="numeric"
          placeholder="max"
          value={ex.targetRepsMax ?? ''}
          onChange={(e) => {
            const v = e.target.value ? parseInt(e.target.value) : undefined;
            db.exercises.update(ex.id!, { targetRepsMax: v });
          }}
        />
        <span className="text-text-3 text-[10px] font-mono-ui uppercase tracking-wider">
          reps
        </span>

        <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={ex.useRIR ?? false}
            onChange={(e) =>
              db.exercises.update(ex.id!, { useRIR: e.target.checked })
            }
            className="w-3.5 h-3.5 accent-accent"
          />
          <span className="text-[10px] text-text-2 font-mono-ui uppercase tracking-wider">
            🧠 RIR
          </span>
        </label>

        {ex.useRIR && (
          <select
            className="bg-bg-3 rounded-lg px-2 py-0.5 text-[10px] border border-white/[0.04] outline-none text-text-1 font-mono-ui"
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