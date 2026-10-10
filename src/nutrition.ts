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

export function calculateMacros(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'M' | 'F',
  activityLevel: 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'atleta',
  goalType: GoalType
): MacroTargets {
  const bmr =
    sex === 'M'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const factors = {
    sedentario: 1.2,
    leve: 1.375,
    moderado: 1.55,
    intenso: 1.725,
    atleta: 1.9,
  };
  const tdee = bmr * factors[activityLevel];

  let targetKcal: number;
  let proteinPerKg: number;

  if (goalType === 'cutting') {
    targetKcal = tdee * 0.8;
    proteinPerKg = 2.2;
  } else if (goalType === 'bulking') {
    targetKcal = tdee * 1.15;
    proteinPerKg = 1.8;
  } else {
    targetKcal = tdee;
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

  const grouped: Partial<
    Record<MealType, { entries: any[]; totals: DaySummary }>
  > = {};

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

/* ────────── 4. Macros por alimento ────────── */

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

/* ══════════════════════════════════════════════════════════
   ANÁLISE HISTÓRICA
   ══════════════════════════════════════════════════════════ */

export async function getDailyHistory(days = 30): Promise<
  { date: string; summary: DaySummary; adherence: number }[]
> {
  const goal = await db.nutritionGoals.toCollection().first();
  const targetKcal = goal?.targetKcal ?? 0;

  const result: {
    date: string;
    summary: DaySummary;
    adherence: number;
  }[] = [];

  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;

    const summary = await getDaySummary(key);

    let adherence = 0;
    if (summary.kcal > 0 && targetKcal > 0) {
      const ratio = summary.kcal / targetKcal;
      adherence =
        ratio >= 0.95 && ratio <= 1.05
          ? 100
          : Math.max(0, 100 - Math.abs(1 - ratio) * 200);
    }

    result.push({ date: key, summary, adherence: Math.round(adherence) });
  }

  return result;
}

export async function getAverageAdherence(days = 30): Promise<{
  adherence: number;
  daysLogged: number;
  daysTotal: number;
}> {
  const history = await getDailyHistory(days);
  const logged = history.filter((d) => d.summary.kcal > 0);

  if (logged.length === 0) {
    return { adherence: 0, daysLogged: 0, daysTotal: days };
  }

  const avgAdherence =
    logged.reduce((a, d) => a + d.adherence, 0) / logged.length;

  return {
    adherence: Math.round(avgAdherence),
    daysLogged: logged.length,
    daysTotal: days,
  };
}

export async function getNutritionPerformanceCorrelation(days = 30) {
  const nutritionHistory = await getDailyHistory(days);
  const sessions = await db.sessions
    .filter((s) => s.finishedAt !== undefined)
    .toArray();
  const sets = await db.sets.toArray();

  const pairs: { kcal: number; protein: number; volume: number }[] = [];

  for (const day of nutritionHistory) {
    if (day.summary.kcal === 0) continue;

    const dayStart = new Date(day.date + 'T00:00:00').getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const daySessions = sessions.filter(
      (s) => s.startedAt >= dayStart && s.startedAt < dayEnd
    );

    if (daySessions.length === 0) continue;

    const sessionIds = new Set(daySessions.map((s) => s.id));
    const daySets = sets.filter((s) => sessionIds.has(s.sessionId));
    const volume = daySets.reduce((a, s) => a + s.reps * s.weight, 0);

    pairs.push({
      kcal: day.summary.kcal,
      protein: day.summary.protein,
      volume,
    });
  }

  if (pairs.length < 5) {
    return null;
  }

  const kcalCorr = pearson(
    pairs.map((p) => p.kcal),
    pairs.map((p) => p.volume)
  );
  const proteinCorr = pearson(
    pairs.map((p) => p.protein),
    pairs.map((p) => p.volume)
  );

  return {
    samples: pairs.length,
    kcalCorrelation: Math.round(kcalCorr * 100) / 100,
    proteinCorrelation: Math.round(proteinCorr * 100) / 100,
  };
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

/* ────────── Água ────────── */

export async function getWaterGoal(weightKg: number): Promise<number> {
  return Math.round(weightKg * 35);
}

export async function addWater(date: string, ml: number) {
  const existing = await db.dailyLogs.where('date').equals(date).first();
  if (existing?.id) {
    await db.dailyLogs.update(existing.id, {
      waterMl: (existing.waterMl ?? 0) + ml,
    });
  } else {
    await db.dailyLogs.add({ date, waterMl: ml });
  }
}

export async function getWater(date: string): Promise<number> {
  const log = await db.dailyLogs.where('date').equals(date).first();
  return log?.waterMl ?? 0;
}

export async function resetWater(date: string) {
  const log = await db.dailyLogs.where('date').equals(date).first();
  if (log?.id) {
    await db.dailyLogs.update(log.id, { waterMl: 0 });
  }
}

/* ────────── Alimentos frequentes ────────── */

export async function getFrequentFoods(limit = 10) {
  const entries = await db.mealEntries.toArray();
  const countMap = new Map<string, number>();

  for (const e of entries) {
    countMap.set(e.foodName, (countMap.get(e.foodName) ?? 0) + 1);
  }

  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

/* ────────── Refeições salvas ────────── */

export async function saveMealAsTemplate(
  name: string,
  mealType: MealType,
  date: string
) {
  const entries = await db.mealEntries
    .where('date')
    .equals(date)
    .filter((e) => e.mealType === mealType)
    .toArray();

  if (entries.length === 0) return null;

  const id = await db.dailyLogs.add({
    date: `TEMPLATE:${name}`,
    proteinG: entries.reduce((a, e) => a + e.protein, 0),
    caloriesKcal: entries.reduce((a, e) => a + e.kcal, 0),
  });

  return id;
}

/* ────────── Comparação com semana passada ────────── */

export async function getWeekComparison() {
  const thisWeek = await getWeekRange(0);
  const lastWeek = await getWeekRange(1);

  return {
    thisWeek,
    lastWeek,
    diffKcal: thisWeek.kcal - lastWeek.kcal,
    diffProtein: thisWeek.protein - lastWeek.protein,
  };
}

async function getWeekRange(weeksAgo: number) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - dayOfWeek - weeksAgo * 7);
  startOfThisWeek.setHours(0, 0, 0, 0);

  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, days: 0 };

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfThisWeek);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;

    const summary = await getDaySummary(key);
    if (summary.kcal > 0) {
      totals.kcal += summary.kcal;
      totals.protein += summary.protein;
      totals.carbs += summary.carbs;
      totals.fat += summary.fat;
      totals.days++;
    }
  }

  return {
    kcal: totals.days > 0 ? Math.round(totals.kcal / totals.days) : 0,
    protein: totals.days > 0 ? Math.round(totals.protein / totals.days) : 0,
    carbs: totals.days > 0 ? Math.round(totals.carbs / totals.days) : 0,
    fat: totals.days > 0 ? Math.round(totals.fat / totals.days) : 0,
    days: totals.days,
  };
}