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
import {
  AppShell,
  SubScreen,
  BottomNav,
  Button,
  Input,
  SectionTitle,
  Card,
  Badge,
} from './ui';

type Tab = 'home' | 'stats' | 'new' | 'agenda' | 'profile';
type SubView =
  | null
  | 'history'
  | 'progress'
  | 'exercise'
  | 'achievements'
  | 'edit-profile';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [subView, setSubView] = useState<SubView>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);
  const [inSession, setInSession] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [exerciseName, setExerciseName] = useState('');

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

  // ───── Ações ─────
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
    if (!confirm('Remover esse exercício?')) return;
    await db.exercises.delete(id);
  }

  // ───── Sessão em tela cheia ─────
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

  // ───── Sub-telas (empilhadas) ─────
  if (subView === 'history') {
    return <HistoryView onBack={() => setSubView(null)} />;
  }
  if (subView === 'progress') {
    return <DashboardView onBack={() => setSubView(null)} />;
  }
  if (subView === 'exercise') {
    return <ExerciseProgressView onBack={() => setSubView(null)} />;
  }
  if (subView === 'achievements') {
    return <AchievementsView onBack={() => setSubView(null)} />;
  }
  if (subView === 'edit-profile') {
    return <ProfileView onBack={() => setSubView(null)} />;
  }

  // ───── Bottom nav config ─────
  const bottomNav = (
    <BottomNav
      activeTab={tab}
      onChange={(id) => {
        setTab(id as Tab);
        if (id === 'agenda') setSubView(null);
      }}
      tabs={[
        { id: 'home', label: 'Início', icon: '🏠' },
        { id: 'stats', label: 'Stats', icon: '📊' },
        { id: 'new', label: 'Novo', icon: '➕' },
        { id: 'agenda', label: 'Agenda', icon: '📅' },
        { id: 'profile', label: 'Perfil', icon: '👤' },
      ]}
    />
  );

  // ───── TAB: INÍCIO ─────
  if (tab === 'home') {
    return (
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
          <Card
            interactive
            onClick={() => setSubView('progress')}
            className="!p-3.5 flex flex-col gap-1"
          >
            <span className="text-xl">📊</span>
            <span className="text-sm font-semibold text-text-0">Progresso</span>
            <span className="text-[10px] text-text-3">Ver estatísticas</span>
          </Card>
          <Card
            interactive
            onClick={() => setSubView('history')}
            className="!p-3.5 flex flex-col gap-1"
          >
            <span className="text-xl">📜</span>
            <span className="text-sm font-semibold text-text-0">Histórico</span>
            <span className="text-[10px] text-text-3">Treinos passados</span>
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
            return (
              <Card
                key={w.id}
                variant={isSelected ? 'accent' : 'default'}
                className="!p-0 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setSelectedWorkout(isSelected ? null : w.id!)
                  }
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between active:scale-[0.99] transition-transform"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-text-0 truncate">
                      {w.name}
                    </div>
                    <div className="text-[11px] text-text-3 mt-0.5">
                      {isSelected ? 'Aberto' : 'Toque para abrir'}
                    </div>
                  </div>
                  <span className="text-text-3 text-lg">
                    {isSelected ? '▾' : '›'}
                  </span>
                </button>

                {isSelected && (
                  <div className="px-4 pb-3 space-y-2 animate-fade-in">
                    {exercises?.length === 0 && (
                      <p className="text-text-3 text-xs text-center py-2">
                        Nenhum exercício ainda
                      </p>
                    )}
                    {exercises?.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between bg-bg-2 rounded-xl px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-accent-dim text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {ex.order}
                          </span>
                          <span className="text-xs text-text-1 truncate">
                            {ex.name}
                          </span>
                        </div>
                        <button
                          onClick={() => removeExercise(ex.id!)}
                          className="text-text-3 hover:text-danger text-xs w-6 h-6 flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPickerOpen(true)}
                        className="flex-1"
                      >
                        + Exercício
                      </Button>
                      <Button
                        size="sm"
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
    );
  }

  // ───── TAB: STATS ─────
  if (tab === 'stats') {
    return <DashboardView onBack={() => setTab('home')} />;
  }

  // ───── TAB: NOVO ─────
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
          <SectionTitle>Sugestões</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Treino A — Peito',
              'Treino B — Costas',
              'Treino C — Pernas',
              'Treino D — Ombros',
            ].map((name) => (
              <button
                key={name}
                onClick={() => setWorkoutName(name)}
                className="bg-bg-1 border border-white/[0.06] rounded-2xl px-3 py-3 text-left text-xs text-text-1 hover:bg-bg-2 active:scale-95 transition-all"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // ───── TAB: AGENDA ─────
  if (tab === 'agenda') {
    return <CalendarView onBack={() => setTab('home')} />;
  }

  // ───── TAB: PERFIL ─────
  if (tab === 'profile') {
    return <ProfileView onBack={() => setTab('home')} />;
  }

  return null;
}