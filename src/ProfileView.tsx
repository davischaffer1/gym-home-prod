import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { SubScreen, Card, SectionTitle, Button, Input } from './ui';
import {
  calculateISR,
  getStrengthPercentile,
  calculateWaterTarget,
  calculateProteinTarget,
  calculateBMR,
  calculateTDEE,
} from './sportsScience';
import {
  analyzeExerciseProgress,
  estimate1RMPrecise,
} from './trainingScience';

interface Props {
  onBack: () => void;
}

export default function ProfileView({ onBack }: Props) {
  const [tab, setTab] = useState<'perfil' | 'corporal' | 'config'>('perfil');

  const profile = useLiveQuery(() => db.profile.toCollection().first(), []);
  const workouts = useLiveQuery(() => db.workouts.toArray(), []);
  const sessions = useLiveQuery(async () => {
    const all = await db.sessions
      .filter((s) => s.finishedAt !== undefined)
      .toArray();
    return all.sort((a, b) => b.startedAt - a.startedAt);
  }, []);
  const sets = useLiveQuery(() => db.sets.toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  // ══════════════ STATS GERAIS ══════════════

  const now = Date.now();
  const streak = sessions ? computeStreak(sessions.map((s) => s.startedAt)) : 0;
  const totalSessions = sessions?.length ?? 0;
  const totalVolume =
    sets?.reduce((a, s) => a + s.reps * s.weight, 0) ?? 0;
  const totalMinutes =
    sessions?.reduce(
      (a, s) =>
        a +
        Math.round(
          (s.finishedAt! - s.startedAt - (s.totalPausedMs ?? 0)) / 60000
        ),
      0
    ) ?? 0;

  // ══════════════ ISR — ÍNDICE DE FORÇA RELATIVA ══════════════

  const isr = (() => {
    if (!sets || !exercises || !profile?.weightKg) return null;

    const find1RM = (keyword: string) => {
      const ex = exercises.find((e) => e.name.toLowerCase().includes(keyword));
      if (!ex) return 0;
      const exSets = sets.filter((s) => s.exerciseId === ex.id);
      let best = 0;
      for (const s of exSets) {
        const est = estimate1RMPrecise(s.weight, s.reps);
        if (est > best) best = est;
      }
      return best;
    };

    const bench = find1RM('supino');
    const squat = find1RM('agachamento');
    const dead = find1RM('terra');

    if (bench === 0 && squat === 0 && dead === 0) return null;
    return calculateISR(bench, squat, dead, profile.weightKg);
  })();

  // ══════════════ PERCENTIS POR EXERCÍCIO ══════════════

  const percentiles = (() => {
    if (!sets || !exercises || !profile?.weightKg) return [];

    const TOP_EXERCISES = ['supino', 'agachamento', 'terra', 'desenvolvimento'];
    const results: ReturnType<typeof getStrengthPercentile>[] = [];

    for (const keyword of TOP_EXERCISES) {
      const ex = exercises.find((e) =>
        e.name.toLowerCase().includes(keyword)
      );
      if (!ex) continue;

      const exSets = sets.filter((s) => s.exerciseId === ex.id);
      let best = 0;
      for (const s of exSets) {
        const est = estimate1RMPrecise(s.weight, s.reps);
        if (est > best) best = est;
      }
      if (best === 0) continue;

      const p = getStrengthPercentile(ex.name, best, profile.weightKg);
      if (p) results.push(p);
    }

    return results;
  })();

  // ══════════════ METAS DIÁRIAS ══════════════

  const waterTarget = profile?.weightKg
    ? calculateWaterTarget(profile.weightKg)
    : 0;
  const proteinTarget = profile?.weightKg
    ? calculateProteinTarget(profile.weightKg, 'hipertrofia')
    : { min: 0, max: 0 };

  const bmr =
    profile?.weightKg && profile?.heightCm && profile?.age && profile?.sex
      ? calculateBMR(
          profile.weightKg,
          profile.heightCm,
          profile.age,
          profile.sex
        )
      : 0;

  const tdee = bmr ? calculateTDEE(bmr, 'moderado') : 0;

  return (
    <SubScreen title="Perfil" onBack={onBack}>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-bg-1 border border-white/[0.06] rounded-2xl p-1">
        {(['perfil', 'corporal', 'config'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t
                ? 'bg-accent text-black'
                : 'text-text-3 hover:text-text-1'
            }`}
          >
            {t === 'perfil'
              ? '👤 Perfil'
              : t === 'corporal'
              ? '📏 Corporal'
              : '⚙️ Config'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* ABA: PERFIL */}
      {/* ══════════════════════════════════════════ */}
      {tab === 'perfil' && (
        <div className="space-y-5">
          {/* Header pessoal */}
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-accent-dim flex items-center justify-center text-2xl font-bold text-accent flex-shrink-0">
                {profile?.name
                  ? profile.name
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-text-0 truncate">
                  {profile?.name ?? 'Sem nome'}
                </div>
                {isr && (
                  <div className="text-xs text-text-3 mt-0.5">
                    🏅 Nível: {isr.level}
                  </div>
                )}
                {profile?.sex && profile?.age && (
                  <div className="text-[10px] text-text-3 mt-0.5">
                    {profile.sex === 'M' ? 'Masculino' : 'Feminino'} ·{' '}
                    {profile.age} anos
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Stats principais */}
          <div className="grid grid-cols-2 gap-2">
            <MiniStat icon="🔥" value={String(streak)} label="Streak" />
            <MiniStat icon="🏋️" value={String(totalSessions)} label="Treinos" />
            <MiniStat
              icon="📦"
              value={`${Math.round(totalVolume / 1000)}t`}
              label="Volume total"
            />
            <MiniStat
              icon="⏱"
              value={`${Math.floor(totalMinutes / 60)}h`}
              label="Tempo"
            />
          </div>

          {/* ISR */}
          {isr && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-text-3 uppercase tracking-wider font-semibold">
                    🧬 Índice de Força Relativa
                  </div>
                  <div className="text-[10px] text-text-3 mt-0.5">
                    Base: Rikli & Jones (1999), ACSM
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-accent">
                    {isr.isr.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-text-3">× peso</div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm font-semibold text-text-0">
                  {isr.level}
                </div>
                {isr.nextLevel && (
                  <span className="text-[10px] text-text-3">
                    · próximo: {isr.nextLevel.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500 rounded-full"
                  style={{ width: `${isr.percentToNext}%` }}
                />
              </div>

              <div className="text-[10px] text-text-3 mt-2">
                Total dos 3 grandes: {isr.total1RM} kg
              </div>
            </Card>
          )}

          {/* Percentis */}
          {percentiles.length > 0 && (
            <Card>
              <div className="text-xs text-text-3 uppercase tracking-wider font-semibold mb-3">
                💪 Força relativa
              </div>
              <div className="text-[10px] text-text-3 mb-3 -mt-2">
                Base: Strength Level standards
              </div>

              <div className="space-y-3">
                {percentiles.map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-sm text-text-1">{p?.exercise}</div>
                      <div className="text-xs">
                        <span className="font-bold text-accent">
                          {p?.percentile}%
                        </span>
                        <span className="text-text-3 ml-1 text-[10px]">
                          · top {100 - (p?.percentile ?? 0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${p?.percentile ?? 0}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-text-3 mt-0.5">
                      {p?.level} · {p?.ratio}× peso corporal
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Se não tem dados */}
          {!isr && percentiles.length === 0 && (
            <Card variant="subtle">
              <p className="text-text-3 text-sm text-center py-4">
                Complete treinos com supino, agachamento e terra para ver suas
                métricas de força.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ABA: CORPORAL */}
      {/* ══════════════════════════════════════════ */}
      {tab === 'corporal' && (
        <div className="space-y-5">
          {/* Peso atual */}
          {profile?.weightKg && (
            <Card>
              <div className="text-xs text-text-3 uppercase tracking-wider font-semibold mb-2">
                Peso atual
              </div>
              <div className="text-2xl font-bold text-text-0">
                {profile.weightKg} kg
              </div>
            </Card>
          )}

          {/* Metas diárias */}
          <Card>
            <div className="text-xs text-text-3 uppercase tracking-wider font-semibold mb-3">
              🎯 Metas diárias
            </div>

            <div className="space-y-3">
              {/* Hidratação */}
              {waterTarget > 0 && (
                <DailyTarget
                  icon="💧"
                  title="Hidratação"
                  value={`${(waterTarget / 1000).toFixed(1)} L`}
                  reference="ACSM (2007)"
                />
              )}

              {/* Proteína */}
              {proteinTarget.max > 0 && (
                <DailyTarget
                  icon="🥩"
                  title="Proteína"
                  value={`${proteinTarget.min}–${proteinTarget.max} g`}
                  reference="Morton et al. (2018)"
                />
              )}

              {/* Calorias */}
              {tdee > 0 && (
                <DailyTarget
                  icon="🔥"
                  title="Calorias (TDEE)"
                  value={`${tdee} kcal`}
                  reference="Mifflin et al. (1990)"
                  subtitle={`TMB: ${bmr} kcal`}
                />
              )}
            </div>
          </Card>

          {/* Medidas corporais */}
          <BodyMeasurements />

          {/* Somatotipo */}
          <SomatotypeCard />
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ABA: CONFIG */}
      {/* ══════════════════════════════════════════ */}
      {tab === 'config' && (
        <div className="space-y-5">
          <Card>
            <SectionTitle>Dados pessoais</SectionTitle>
            <div className="space-y-3 mt-3">
              <ProfileField
                label="Nome"
                value={profile?.name ?? ''}
                onSave={(v) =>
                  db.profile.toCollection().modify({ name: v })
                }
              />
              <ProfileField
                label="Peso (kg)"
                type="decimal"
                value={String(profile?.weightKg ?? '')}
                onSave={(v) =>
                  db.profile
                    .toCollection()
                    .modify({ weightKg: parseFloat(v) || 0 })
                }
              />
              <ProfileField
                label="Altura (cm)"
                type="numeric"
                value={String(profile?.heightCm ?? '')}
                onSave={(v) =>
                  db.profile
                    .toCollection()
                    .modify({ heightCm: parseInt(v) || 0 })
                }
              />
              <ProfileField
                label="Idade"
                type="numeric"
                value={String(profile?.age ?? '')}
                onSave={(v) =>
                  db.profile
                    .toCollection()
                    .modify({ age: parseInt(v) || 0 })
                }
              />
              <ProfileField
                label="Descanso padrão (s)"
                type="numeric"
                value={String(profile?.restSeconds ?? 90)}
                onSave={(v) =>
                  db.profile
                    .toCollection()
                    .modify({ restSeconds: parseInt(v) || 90 })
                }
              />
            </div>
          </Card>

          <Card>
            <SectionTitle>Sobre</SectionTitle>
            <div className="space-y-2 mt-3 text-xs text-text-3">
              <div className="flex justify-between">
                <span>Versão</span>
                <span className="text-text-1">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Feito com</span>
                <span>💪 e ciência</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </SubScreen>
  );
}

/* ══════════════ COMPONENTES AUXILIARES ══════════════ */

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-bg-1 border border-white/[0.06] rounded-2xl p-3 text-center">
      <div className="text-xl">{icon}</div>
      <div className="text-base font-bold text-text-0 mt-0.5">{value}</div>
      <div className="text-[10px] text-text-3 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}

function DailyTarget({
  icon,
  title,
  value,
  reference,
  subtitle,
}: {
  icon: string;
  title: string;
  value: string;
  reference: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-bg-2 border border-white/[0.04] rounded-xl px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <div className="text-sm font-medium text-text-0">{title}</div>
            <div className="text-[9px] text-text-3 italic">{reference}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-accent">{value}</div>
          {subtitle && (
            <div className="text-[9px] text-text-3">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onSave,
  type = 'text',
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div>
      <label className="text-[10px] text-text-3 uppercase tracking-wider font-semibold">
        {label}
      </label>
      {editing ? (
        <div className="flex gap-2 mt-1">
          <Input
            value={draft}
            onChange={setDraft}
            type={type}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSave(draft);
                setEditing(false);
              }
              if (e.key === 'Escape') {
                setDraft(value);
                setEditing(false);
              }
            }}
          />
          <Button
            onClick={() => {
              onSave(draft);
              setEditing(false);
            }}
            className="flex-shrink-0"
          >
            ✓
          </Button>
        </div>
      ) : (
        <button
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className="w-full mt-1 text-left bg-bg-2 border border-white/[0.04] rounded-xl px-3 py-2.5 hover:bg-bg-3 active:scale-[0.99] transition-all"
        >
          <span className="text-sm text-text-1">
            {value || '—'}
          </span>
          <span className="text-text-3 text-xs float-right">✎</span>
        </button>
      )}
    </div>
  );
}

/* ══════════════ MEDIDAS CORPORAIS ══════════════ */

function BodyMeasurements() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    weightKg: '',
    bodyFatPct: '',
    chestCm: '',
    waistCm: '',
    hipCm: '',
    armCm: '',
    thighCm: '',
    calfCm: '',
    neckCm: '',
  });

  const measurements = useLiveQuery(
    () => db.bodyMeasurements.orderBy('date').reverse().toArray(),
    []
  );

  async function save() {
    const num = (v: string) => (v ? parseFloat(v) : undefined);
    await db.bodyMeasurements.add({
      date: Date.now(),
      weightKg: num(form.weightKg),
      bodyFatPct: num(form.bodyFatPct),
      chestCm: num(form.chestCm),
      waistCm: num(form.waistCm),
      hipCm: num(form.hipCm),
      armCm: num(form.armCm),
      thighCm: num(form.thighCm),
      calfCm: num(form.calfCm),
      neckCm: num(form.neckCm),
    });
    setForm({
      weightKg: '',
      bodyFatPct: '',
      chestCm: '',
      waistCm: '',
      hipCm: '',
      armCm: '',
      thighCm: '',
      calfCm: '',
      neckCm: '',
    });
    setShowForm(false);
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-text-3 uppercase tracking-wider font-semibold">
            📏 Medidas corporais
          </div>
          <div className="text-[10px] text-text-3 italic mt-0.5">
            Base: ISAK
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs text-accent font-medium"
        >
          {showForm ? 'Cancelar' : '+ Nova'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 mb-4 animate-fade-in">
          <MeasureInput
            label="Peso (kg)"
            value={form.weightKg}
            onChange={(v) => setForm({ ...form, weightKg: v })}
          />
          <MeasureInput
            label="% Gordura"
            value={form.bodyFatPct}
            onChange={(v) => setForm({ ...form, bodyFatPct: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <MeasureInput
              label="Peito (cm)"
              value={form.chestCm}
              onChange={(v) => setForm({ ...form, chestCm: v })}
            />
            <MeasureInput
              label="Cintura (cm)"
              value={form.waistCm}
              onChange={(v) => setForm({ ...form, waistCm: v })}
            />
            <MeasureInput
              label="Quadril (cm)"
              value={form.hipCm}
              onChange={(v) => setForm({ ...form, hipCm: v })}
            />
            <MeasureInput
              label="Braço (cm)"
              value={form.armCm}
              onChange={(v) => setForm({ ...form, armCm: v })}
            />
            <MeasureInput
              label="Coxa (cm)"
              value={form.thighCm}
              onChange={(v) => setForm({ ...form, thighCm: v })}
            />
            <MeasureInput
              label="Panturrilha (cm)"
              value={form.calfCm}
              onChange={(v) => setForm({ ...form, calfCm: v })}
            />
            <MeasureInput
              label="Pescoço (cm)"
              value={form.neckCm}
              onChange={(v) => setForm({ ...form, neckCm: v })}
            />
          </div>
          <Button fullWidth onClick={save}>
            Salvar medida
          </Button>
        </div>
      )}

      {measurements?.length === 0 && !showForm && (
        <p className="text-text-3 text-xs text-center py-3">
          Nenhuma medida registrada
        </p>
      )}

      {measurements && measurements.length > 0 && (
        <div className="space-y-2">
          {measurements.slice(0, 3).map((m) => (
            <div
              key={m.id}
              className="bg-bg-2 border border-white/[0.04] rounded-xl px-3 py-2"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-text-1">
                  {new Date(m.date).toLocaleDateString('pt-BR')}
                </span>
                <button
                  onClick={() => db.bodyMeasurements.delete(m.id!)}
                  className="text-danger/70 text-xs"
                >
                  ×
                </button>
              </div>
              <div className="text-[10px] text-text-3 flex flex-wrap gap-2">
                {m.weightKg && <span>⚖️ {m.weightKg} kg</span>}
                {m.bodyFatPct && <span>📊 {m.bodyFatPct}%</span>}
                {m.waistCm && <span>〰️ Cintura {m.waistCm}cm</span>}
                {m.armCm && <span>💪 Braço {m.armCm}cm</span>}
                {m.thighCm && <span>🦵 Coxa {m.thighCm}cm</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MeasureInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-text-3">{label}</label>
      <input
        className="w-full mt-0.5 bg-bg-2 border border-white/[0.04] rounded-xl px-3 py-2 text-sm text-text-0 outline-none focus:border-accent/40"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
    </div>
  );
}

/* ══════════════ SOMATOTIPO ══════════════ */

function SomatotypeCard() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({
    bodyBuild: 4,
    muscle: 4,
    fat: 4,
    shoulders: 4,
    arms: 4,
    legs: 4,
    diet: 4,
    metabolism: 4,
    strength: 4,
    activity: 4,
  });

  const lastResult = useLiveQuery(
    () => db.somatotypes.orderBy('date').reverse().first(),
    []
  );

  async function calculate() {
    const { calculateSomatotype } = await import('./sportsScience');
    const result = calculateSomatotype(answers as any);
    await db.somatotypes.add({
      date: Date.now(),
      endomorphy: result.endomorphy,
      mesomorphy: result.mesomorphy,
      ectomorphy: result.ectomorphy,
    });
    setShowQuiz(false);
  }

  const questions = [
    { key: 'bodyBuild', label: 'Estrutura corporal', min: 'Magra', max: 'Robusta' },
    { key: 'muscle', label: 'Massa muscular', min: 'Pouca', max: 'Muita' },
    { key: 'fat', label: 'Gordura corporal', min: 'Pouca', max: 'Muita' },
    { key: 'shoulders', label: 'Ombros', min: 'Estreitos', max: 'Largos' },
    { key: 'arms', label: 'Braços', min: 'Finos', max: 'Grossos' },
    { key: 'legs', label: 'Pernas', min: 'Finas', max: 'Grossas' },
    { key: 'diet', label: 'Apetite', min: 'Como pouco', max: 'Como muito' },
    { key: 'metabolism', label: 'Metabolismo', min: 'Rápido', max: 'Lento' },
    { key: 'strength', label: 'Força natural', min: 'Fraca', max: 'Forte' },
    { key: 'activity', label: 'Nível de atividade', min: 'Ativo', max: 'Sedentário' },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-text-3 uppercase tracking-wider font-semibold">
            🧬 Somatotipo
          </div>
          <div className="text-[10px] text-text-3 italic mt-0.5">
            Base: Heath-Carter (1990)
          </div>
        </div>
        <button
          onClick={() => setShowQuiz((v) => !v)}
          className="text-xs text-accent font-medium"
        >
          {showQuiz ? 'Cancelar' : 'Fazer teste'}
        </button>
      </div>

      {showQuiz && (
        <div className="space-y-3 mb-4 animate-fade-in">
          {questions.map((q) => (
            <div key={q.key}>
              <div className="flex justify-between text-[10px] text-text-3 mb-1">
                <span>{q.min}</span>
                <span className="font-medium text-text-1">{q.label}</span>
                <span>{q.max}</span>
              </div>
              <input
                type="range"
                min={1}
                max={7}
                step={1}
                value={answers[q.key] ?? 4}
                onChange={(e) =>
                  setAnswers({ ...answers, [q.key]: parseInt(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </div>
          ))}
          <Button fullWidth onClick={calculate}>
            Calcular somatotipo
          </Button>
        </div>
      )}

      {lastResult && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-bg-2 rounded-xl p-2.5 text-center">
              <div className="text-[9px] text-text-3 uppercase">Endo</div>
              <div className="text-lg font-bold text-warn">
                {lastResult.endomorphy}
              </div>
            </div>
            <div className="bg-bg-2 rounded-xl p-2.5 text-center">
              <div className="text-[9px] text-text-3 uppercase">Meso</div>
              <div className="text-lg font-bold text-accent">
                {lastResult.mesomorphy}
              </div>
            </div>
            <div className="bg-bg-2 rounded-xl p-2.5 text-center">
              <div className="text-[9px] text-text-3 uppercase">Ecto</div>
              <div className="text-lg font-bold text-info">
                {lastResult.ectomorphy}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-text-3 italic">
            Última avaliação:{' '}
            {new Date(lastResult.date).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}

      {!lastResult && !showQuiz && (
        <p className="text-text-3 text-xs text-center py-3">
          Faça o teste para descobrir seu tipo corporal
        </p>
      )}
    </Card>
  );
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
    } else if (streak === 0 && key === new Date().toISOString().slice(0, 10)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
  }
  return streak;
}