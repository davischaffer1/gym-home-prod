import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MealType } from './db';
import { MEAL_LABELS } from './foodDatabase';
import {
  todayKey,
  getDaySummary,
  getMealsByType,
  getOrCreateGoal,
  pct,
  getWeeklyAverages,
  getWaterGoal,
  getWater,
  addWater,
  resetWater,
} from './nutrition';
import FoodPicker from './FoodPicker';
import NutritionGoalView from './NutritionGoalView';
import NutritionAnalysisView from './NutritionAnalysisView';
import { SubScreen, Card, Button, Badge } from './ui';
import { StaggerItem, PunchButton } from './Motion';
import { motion } from 'framer-motion';

interface Props {
  onBack: () => void;
}

const MEAL_ORDER: MealType[] = [
  'cafe',
  'lanche1',
  'almoco',
  'lanche2',
  'jantar',
  'ceia',
];

export default function DietView({ onBack }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [pickerMeal, setPickerMeal] = useState<MealType | null>(null);
  const [showGoalView, setShowGoalView] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const profile = useLiveQuery(() => db.profile.toCollection().first(), []);
  const goal = useLiveQuery(() => db.nutritionGoals.toCollection().first(), []);
  const summary = useLiveQuery(() => getDaySummary(selectedDate), [selectedDate]);
  const meals = useLiveQuery(() => getMealsByType(selectedDate), [selectedDate]);
  const weekly = useLiveQuery(() => getWeeklyAverages(7), []);
  const water = useLiveQuery(() => getWater(selectedDate), [selectedDate]);

  useEffect(() => {
    if (
      profile?.weightKg &&
      profile?.heightCm &&
      profile?.age &&
      profile?.sex &&
      !goal
    ) {
      getOrCreateGoal(
        profile.weightKg,
        profile.heightCm,
        profile.age,
        profile.sex
      );
    }
  }, [profile, goal]);

  if (showGoalView) {
    return <NutritionGoalView onBack={() => setShowGoalView(false)} />;
  }

  if (showAnalysis) {
    return <NutritionAnalysisView onBack={() => setShowAnalysis(false)} />;
  }

  async function handleAddEntry(entry: {
    foodId: number;
    foodName: string;
    quantityG: number;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }) {
    if (!pickerMeal) return;
    await db.mealEntries.add({
      date: selectedDate,
      mealType: pickerMeal,
      foodId: entry.foodId,
      foodName: entry.foodName,
      quantityG: entry.quantityG,
      kcal: entry.kcal,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      fiber: entry.fiber,
      createdAt: Date.now(),
    });
  }

  async function removeEntry(id: number) {
    if (!confirm('Remover esse item?')) return;
    await db.mealEntries.delete(id);
  }

  async function changeDate(delta: number) {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  }

  const isToday = selectedDate === todayKey();
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString(
    'pt-BR',
    { weekday: 'short', day: '2-digit', month: 'short' }
  );

  if (!goal) {
    return (
      <SubScreen title="Dieta" onBack={onBack}>
        <Card variant="glass" className="text-center py-12">
          <div className="text-5xl mb-3">🎯</div>
          <div className="text-lg font-bold font-display text-text-0 mb-2">
            Configure suas metas
          </div>
          <p className="text-text-3 text-xs mb-6 font-mono-ui uppercase tracking-wider max-w-[240px] mx-auto">
            Pra começar a registrar sua dieta, precisamos das suas metas
            nutricionais
          </p>
          <Button onClick={() => setShowGoalView(true)}>
            Configurar metas
          </Button>
        </Card>
      </SubScreen>
    );
  }

  const kcalPct = pct(summary?.kcal ?? 0, goal.targetKcal);
  const waterGoal = profile?.weightKg ? profile.weightKg * 35 : 2500;
  const waterPct = pct(water ?? 0, waterGoal);

  return (
    <SubScreen
      title="Dieta"
      onBack={onBack}
      action={
        <div className="flex gap-1">
          <button
            onClick={() => setShowAnalysis(true)}
            className="w-10 h-10 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-text-2"
          >
            📊
          </button>
          <button
            onClick={() => setShowGoalView(true)}
            className="w-10 h-10 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-text-2"
          >
            ⚙️
          </button>
        </div>
      }
    >
      {/* Date selector */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeDate(-1)}
          className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-text-2"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-xs font-bold font-mono-ui uppercase tracking-wider text-text-0">
            {isToday ? 'HOJE' : dateLabel.toUpperCase()}
          </div>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayKey())}
              className="text-[9px] text-accent font-mono-ui uppercase tracking-wider mt-0.5"
            >
              Voltar pra hoje
            </button>
          )}
        </div>
        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 flex items-center justify-center text-text-2"
        >
          →
        </button>
      </div>

      {/* Ring de calorias */}
      <StaggerItem delay={0}>
        <Card className="mb-4">
          <div className="text-center mb-4">
            <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold mb-2">
              🔥 Calorias
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold font-mono-ui text-accent">
                {Math.round(summary?.kcal ?? 0)}
              </span>
              <span className="text-sm text-text-3 font-mono-ui">
                / {goal.targetKcal}
              </span>
            </div>
            <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-wider mt-1">
              {goal.targetKcal - Math.round(summary?.kcal ?? 0) > 0
                ? `Faltam ${goal.targetKcal - Math.round(summary?.kcal ?? 0)} kcal`
                : `${Math.round(summary?.kcal ?? 0) - goal.targetKcal} kcal acima`}
            </div>
          </div>

          <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${kcalPct}%` }}
              transition={{ duration: 0.6 }}
              className={`h-full rounded-full ${
                kcalPct > 100 ? 'bg-warn' : 'bg-accent'
              }`}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/[0.04]">
            <MacroMini
              label="Prot"
              value={summary?.protein ?? 0}
              target={goal.targetProtein}
              color="accent"
            />
            <MacroMini
              label="Carb"
              value={summary?.carbs ?? 0}
              target={goal.targetCarbs}
              color="info"
            />
            <MacroMini
              label="Gord"
              value={summary?.fat ?? 0}
              target={goal.targetFat}
              color="sci"
            />
            <MacroMini
              label="Fibr"
              value={summary?.fiber ?? 0}
              target={goal.targetFiber}
              color="success"
            />
          </div>
        </Card>
      </StaggerItem>

      {/* Água */}
      <StaggerItem delay={0.03}>
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💧</span>
              <div>
                <div className="text-xs font-bold font-display text-text-0">
                  Água
                </div>
                <div className="text-[9px] text-text-3 font-mono-ui uppercase tracking-wider">
                  Meta: {(waterGoal / 1000).toFixed(1)}L
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold font-mono-ui text-info">
                {((water ?? 0) / 1000).toFixed(1)}L
              </div>
            </div>
          </div>

          <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, waterPct)}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-info rounded-full"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[200, 300, 500, 750].map((ml) => (
              <PunchButton
                key={ml}
                onClick={() => addWater(selectedDate, ml)}
                withHaptic
                className="bg-info/10 hover:bg-info/20 border border-info/30 text-info py-2 rounded-xl text-xs font-mono-ui font-bold active:scale-95"
              >
                +{ml}
              </PunchButton>
            ))}
          </div>

          {(water ?? 0) > 0 && (
            <button
              onClick={() => resetWater(selectedDate)}
              className="w-full mt-2 text-[10px] text-text-3 hover:text-danger font-mono-ui uppercase tracking-wider py-1"
            >
              Zerar água
            </button>
          )}
        </Card>
      </StaggerItem>

      {/* Refeições */}
      {MEAL_ORDER.map((mealType, idx) => {
        const info = MEAL_LABELS[mealType];
        const mealData = meals?.[mealType];
        const targetKcal =
          (goal.mealDistribution[
            mealType as keyof typeof goal.mealDistribution
          ] ?? 0) *
          (goal.targetKcal / 100);

        return (
          <StaggerItem key={mealType} delay={0.05 + idx * 0.03}>
            <Card className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{info.icon}</span>
                  <div>
                    <div className="text-sm font-bold font-display text-text-0">
                      {info.label}
                    </div>
                    {targetKcal > 0 && (
                      <div className="text-[9px] text-text-3 font-mono-ui uppercase tracking-wider">
                        Meta: {Math.round(targetKcal)} kcal
                      </div>
                    )}
                  </div>
                </div>
                {mealData && (
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono-ui text-accent">
                      {Math.round(mealData.totals.kcal)}
                    </div>
                    <div className="text-[9px] text-text-3 font-mono-ui">
                      kcal
                    </div>
                  </div>
                )}
              </div>

              {mealData && mealData.entries.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {mealData.entries.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between bg-bg-2 border border-white/[0.04] rounded-xl px-3 py-2 gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-text-0 truncate">
                          {entry.foodName}
                        </div>
                        <div className="text-[9px] text-text-3 font-mono-ui mt-0.5">
                          {entry.quantityG}g · P {entry.protein}g · C{' '}
                          {entry.carbs}g · G {entry.fat}g
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-bold font-mono-ui text-accent">
                          {entry.kcal}
                        </div>
                      </div>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="text-danger text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-danger/10 active:scale-90 flex-shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <PunchButton
                onClick={() => setPickerMeal(mealType)}
                className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] border-dashed py-2.5 rounded-xl text-xs text-text-2 font-mono-ui uppercase tracking-wider active:scale-[0.98]"
              >
                + Adicionar
              </PunchButton>
            </Card>
          </StaggerItem>
        );
      })}

      {/* Média semanal */}
      {weekly && weekly.days > 0 && (
        <StaggerItem delay={0.3}>
          <Card variant="glass" className="mt-4">
            <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold mb-3">
              📊 Média últimos 7 dias
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Calorias" value={`${weekly.kcal}`} />
              <StatBox label="Proteína" value={`${weekly.protein}g`} />
              <StatBox label="Carbo" value={`${weekly.carbs}g`} />
              <StatBox label="Gordura" value={`${weekly.fat}g`} />
            </div>
            <div className="text-[9px] text-text-3 font-mono-ui text-center mt-3 uppercase tracking-wider">
              Baseado em {weekly.days} dia{weekly.days > 1 ? 's' : ''}
            </div>
          </Card>
        </StaggerItem>
      )}

      {pickerMeal && (
        <FoodPicker
          mealType={pickerMeal}
          onAdd={handleAddEntry}
          onClose={() => setPickerMeal(null)}
        />
      )}
    </SubScreen>
  );
}

function MacroMini({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: 'accent' | 'info' | 'sci' | 'success';
}) {
  const p = pct(value, target);
  const textColor = {
    accent: 'text-accent',
    info: 'text-info',
    sci: 'text-sci',
    success: 'text-success',
  }[color];
  const bgColor = {
    accent: 'bg-accent',
    info: 'bg-info',
    sci: 'bg-sci',
    success: 'bg-success',
  }[color];

  return (
    <div className="text-center">
      <div className={`text-xs font-bold font-mono-ui ${textColor}`}>
        {Math.round(value)}
      </div>
      <div className="text-[8px] text-text-3 font-mono-ui uppercase tracking-wider mt-0.5">
        {label}
      </div>
      <div className="w-full h-0.5 bg-white/[0.05] rounded-full overflow-hidden mt-1">
        <div
          className={`h-full ${bgColor}`}
          style={{ width: `${Math.min(100, p)}%` }}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-2 border border-white/[0.04] rounded-xl p-2.5 text-center">
      <div className="text-base font-bold font-mono-ui text-text-0">
        {value}
      </div>
      <div className="text-[9px] text-text-3 font-mono-ui uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}