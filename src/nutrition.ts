import { db } from './db';
import type { NutritionGoal, MealType, GoalType } from './db';

/* ══════════════════════════════════════════════════════════
   NUTRIÇÃO — Cálculos
   Base: Mifflin (1990), Morton (2018), Aragon (2020), Helms
   ══════════════════════════════════════════════════════════ */

/* ────────── 1. Cálculo de metas ────────── */

export interface MacroTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/**
 * Calcula metas nutricionais baseadas no perfil + objetivo.
 * Base:
 * - TMB: Mifflin-St Jeor (1990)
 * - TDEE: ajuste por atividade
 * - Ajuste de objetivo: -20% (cutting), 0 (manutenção), +15% (bulking)
 * - Proteína: Morton et al. (2018) — 1.6-2.2 g/kg
 * - Gordura: 0.8-1.2 g/kg (Helms)
 * - Fibra: 14g por 1000 kcal (USDA)
 */
export function calculateMacros(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'M' | 'F',
  activityLevel: 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'atleta',
  goalType: GoalType
): MacroTargets {
  // TMB (Mifflin-St Jeor)
  const bmr = sex === 'M'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  // Fator de atividade
  const factors = {
    sedentario: 1.2,
    leve: 1.375,
    moderado: 1.55,
    intenso: 1.725,
    atleta: 1.9,
  };
  const tdee = bmr * factors[activityLevel];

  // Ajuste pelo objetivo
  let targetKcal: number;
  let proteinPerKg: number;

  if (goalType === 'cutting') {
    targetKcal = tdee * 0.8; // -20%
    proteinPerKg = 2.2; // mais proteína pra preservar massa
  } else if (goalType === 'bulking') {
    targetKcal = tdee * 1.15; // +15%
    proteinPerKg = 1.8;
  } else {
    targetKcal = tdee; // manutenção
    proteinPerKg = 1.8;
  }

  const protein = weightKg * proteinPerKg;
  const fat = weightKg * 1.0;
  const remainingKcal = targetKcal - protein * 4 - fat * 9;
  const carbs = Math.max(0, remainingKcal / 4);
  const fiber = Math.round((targetKcal / 1000) * 14);

  return {
    kcal: Math.round(targetKcal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    fiber: Math.round(fiber),
  };
}

/* ────────── 2. Distribuição por refeição ────────── */

const DEFAULT_DISTRIBUTION = {
  cafe: 25,
  lanche1: 10,
  almoco: 30,
  lanche2: 10,
  jantar: 25,
  ceia: 0,
};

export async function getOrCreateGoal(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'M' | 'F'
): Promise<NutritionGoal> {
  const existing = await db.nutritionGoals.toCollection().first();
  if (existing) return existing;

  const macros = calculateMacros(
    weightKg,
    heightCm,
    age,
    sex,
    'moderado',
    'maintenance'
  );

  const id = await db.nutritionGoals.add({
    goalType: 'maintenance',
    targetKcal: macros.kcal,
    targetProtein: macros.protein,
    targetCarbs: macros.carbs,
    targetFat: macros.fat,
    targetFiber: macros.fiber,
    mealDistribution: DEFAULT_DISTRIBUTION,
    updatedAt: Date.now(),
  });

  return (await db.nutritionGoals.get(id))!;
}

export async function updateGoal(
  id: number,
  updates: Partial<NutritionGoal>
) {
  await db.nutritionGoals.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });
}

/* ────────── 3. Resumo diário ────────── */

export interface DaySummary {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getDaySummary(date: string): Promise<DaySummary> {
  const entries = await db.mealEntries.where('date').equals(date).toArray();

  return entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
      fiber: acc.fiber + (e.fiber ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

export async function getMealsByType(date: string): Promise<{
  [K in MealType]?: { entries: any[]; totals: DaySummary };
}> {
  const entries = await db.mealEntries.where('date').equals(date).toArray();

  const grouped: Partial<Record<MealType, { entries: any[]; totals: DaySummary }>> = {};

  for (const e of entries) {
    if (!grouped[e.mealType]) {
      grouped[e.mealType] = {
        entries: [],
        totals: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      };
    }
    grouped[e.mealType]!.entries.push(e);
    const t = grouped[e.mealType]!.totals;
    t.kcal += e.kcal;
    t.protein += e.protein;
    t.carbs += e.carbs;
    t.fat += e.fat;
    t.fiber += e.fiber ?? 0;
  }

  return grouped;
}

/* ────────── 4. Cálculo de macros por alimento ────────── */

export function calcMacrosForQuantity(
  food: {
    kcalPer100: number;
    proteinPer100: number;
    carbsPer100: number;
    fatPer100: number;
    fiberPer100?: number;
  },
  quantityG: number
) {
  const factor = quantityG / 100;
  return {
    kcal: Math.round(food.kcalPer100 * factor),
    protein: Math.round(food.proteinPer100 * factor * 10) / 10,
    carbs: Math.round(food.carbsPer100 * factor * 10) / 10,
    fat: Math.round(food.fatPer100 * factor * 10) / 10,
    fiber: Math.round((food.fiberPer100 ?? 0) * factor * 10) / 10,
  };
}

/* ────────── 5. Análise semanal ────────── */

export async function getWeeklyAverages(days = 7) {
  const today = new Date();
  const data: { date: string; summary: DaySummary }[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
    const summary = await getDaySummary(key);
    data.push({ date: key, summary });
  }

  const valid = data.filter((d) => d.summary.kcal > 0);
  if (valid.length === 0) {
    return { kcal: 0, protein: 0, carbs: 0, fat: 0, days: 0 };
  }

  const totals = valid.reduce(
    (acc, d) => ({
      kcal: acc.kcal + d.summary.kcal,
      protein: acc.protein + d.summary.protein,
      carbs: acc.carbs + d.summary.carbs,
      fat: acc.fat + d.summary.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    kcal: Math.round(totals.kcal / valid.length),
    protein: Math.round(totals.protein / valid.length),
    carbs: Math.round(totals.carbs / valid.length),
    fat: Math.round(totals.fat / valid.length),
    days: valid.length,
  };
}

/* ────────── 6. Busca de alimentos ────────── */

export async function searchFoods(query: string, limit = 30) {
  if (!query.trim()) {
    return db.foods.orderBy('name').limit(limit).toArray();
  }
  const q = query.toLowerCase();
  const all = await db.foods.toArray();
  return all
    .filter((f) => f.name.toLowerCase().includes(q))
    .sort((a, b) => {
      // Favoritos primeiro, depois alfabético
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export async function toggleFavorite(foodId: number) {
  const food = await db.foods.get(foodId);
  if (!food) return;
  await db.foods.update(foodId, { isFavorite: !food.isFavorite });
}

/* ────────── 7. Formatação ────────── */

export function formatKcal(kcal: number): string {
  return `${Math.round(kcal)} kcal`;
}

export function formatMacro(g: number): string {
  return `${Math.round(g * 10) / 10}g`;
}

export function pct(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}