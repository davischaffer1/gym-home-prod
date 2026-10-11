import { db } from './db';
import { calculateBMR, calculateTDEE } from './sportsScience';
import { getDaySummary, todayKey } from './nutrition';

/* ══════════════════════════════════════════════════════════
   BALANÇO ENERGÉTICO
   Base: Wishnofsky (1958), Hall & Chow (2020), Hall et al. (2011),
         Thomas et al. (2014), LaForgia et al. (2006), ACSM (2011)
   ══════════════════════════════════════════════════════════ */

/* ────────── Constantes científicas ────────── */

/**
 * 1 kg de gordura corporal = 7.700 kcal
 * Referência: Wishnofsky (1958), revisado por Hall & Chow (2020)
 * (NÃO é 9.000 como muitos apps usam)
 */
export const KCAL_PER_KG_FAT = 7700;

/**
 * EPOC (Excess Post-exercise Oxygen Consumption)
 * Real: 6-15% do gasto do treino.
 * Referência: LaForgia et al. (2006), Borsheim & Bahr (2003)
 * Usamos 10% como estimativa conservadora.
 */
export const EPOC_FACTOR = 0.10;

/**
 * Adaptação metabólica: a cada 1 kg perdido, TDEE cai ~20 kcal/dia
 * Referência: Hall et al. (2011), Thomas et al. (2014)
 */
export const METABOLIC_ADAPTATION_KCAL_PER_KG = 20;

/**
 * MET (Metabolic Equivalent of Task) para musculação
 * Referência: ACSM Compendium of Physical Activities (2011)
 */
export const MET_BY_INTENSITY = {
  leve: 3.5,      // aquecimento, técnica
  moderado: 5.0,  // hipertrofia normal
  intenso: 6.5,   // força, falha
  muito_intenso: 8.0, // circuitos, drop-sets
};

/* ────────── Tipos ────────── */

export interface SessionEnergy {
  sessionId: number;
  workoutId: number;
  startedAt: number;
  durationMin: number;
  volumeKg: number;
  totalSets: number;
  avgRIR: number | null;
  metUsed: number;
  kcalWorkout: number;
  kcalEpoc: number;
  kcalTotal: number;
  intensity: 'leve' | 'moderado' | 'intenso' | 'muito_intenso';
}

export interface DailyEnergyBalance {
  date: string;
  tdeeBase: number;           // TDEE + adaptação metabólica
  kcalFromWorkouts: number;   // soma de todos os treinos do dia
  kcalFromEpoc: number;       // soma EPOC de todos os treinos
  tdeeAjustado: number;       // tdeeBase + workouts + EPOC
  kcalConsumed: number;       // dieta do dia
  balance: number;            // consumed - adjusted (negativo = déficit)
  fatLossGrams: number;       // balance / 7700 * 1000
  fatGainGrams: number;       // se positivo
  metabolicAdaptation: number; // kcal descontadas por perda de peso
  weightCurrent: number;
  weightStart: number;
  goalType: 'cutting' | 'maintenance' | 'bulking';
  goalTargetKcal: number;
  sessions: SessionEnergy[];
}

/* ────────── Cálculo de MET por sessão ────────── */

/**
 * Determina MET da sessão baseado em:
 * - RIR médio (mais perto da falha = mais intenso)
 * - Volume total
 * - Tipos de série (drop, myo = mais intenso)
 */
export function estimateSessionMET(
  sets: { reps: number; weight: number; rpe?: number; type?: string }[]
): { met: number; intensity: SessionEnergy['intensity'] } {
  if (sets.length === 0) return { met: MET_BY_INTENSITY.moderado, intensity: 'moderado' };

  // RIR médio
  const rpes = sets.filter((s) => s.rpe !== undefined).map((s) => s.rpe!);
  const avgRPE =
    rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 7;
  const avgRIR = 10 - avgRPE;

  // Séries avançadas (drop, myo, restpause)
  const advancedSets = sets.filter(
    (s) => s.type === 'drop' || s.type === 'myo' || s.type === 'restpause'
  ).length;
  const advancedRatio = advancedSets / sets.length;

  // Score de intensidade
  let score = 0;
  if (avgRIR <= 1) score += 3;
  else if (avgRIR <= 3) score += 2;
  else if (avgRIR <= 5) score += 1;

  if (advancedRatio > 0.3) score += 2;
  else if (advancedRatio > 0.1) score += 1;

  // Classificação
  let intensity: SessionEnergy['intensity'];
  let met: number;

  if (score >= 5) {
    intensity = 'muito_intenso';
    met = MET_BY_INTENSITY.muito_intenso;
  } else if (score >= 3) {
    intensity = 'intenso';
    met = MET_BY_INTENSITY.intenso;
  } else if (score >= 1) {
    intensity = 'moderado';
    met = MET_BY_INTENSITY.moderado;
  } else {
    intensity = 'leve';
    met = MET_BY_INTENSITY.leve;
  }

  return { met, intensity };
}

/**
 * Calcula kcal do treino.
 * Fórmula: kcal/min = MET × 3.5 × peso_kg / 200
 * Referência: ACSM (2011)
 */
export function calculateWorkoutKcal(
  durationMin: number,
  weightKg: number,
  met: number
): number {
  const kcalPerMin = (met * 3.5 * weightKg) / 200;
  return Math.round(kcalPerMin * durationMin);
}

/* ────────── Análise de sessões do dia ────────── */

export async function getSessionEnergy(
  weightKg: number
): Promise<Map<string, SessionEnergy[]>> {
  const sessions = await db.sessions
    .filter((s) => s.finishedAt !== undefined)
    .toArray();
  const sets = await db.sets.toArray();
  const exercises = await db.exercises.toArray();

  const byDate = new Map<string, SessionEnergy[]>();

  for (const session of sessions) {
    const sessionSets = sets.filter((s) => s.sessionId === session.id);
    if (sessionSets.length === 0) continue;

    const durationMin = Math.max(
      1,
      Math.round(
        (session.finishedAt! - session.startedAt - (session.totalPausedMs ?? 0)) / 60000
      )
    );

    const volumeKg = sessionSets.reduce((a, s) => a + s.reps * s.weight, 0);
    const rpes = sessionSets.filter((s) => s.rpe !== undefined).map((s) => s.rpe!);
    const avgRPE =
      rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
    const avgRIR = avgRPE !== null ? 10 - avgRPE : null;

    const { met, intensity } = estimateSessionMET(sessionSets);
    const kcalWorkout = calculateWorkoutKcal(durationMin, weightKg, met);
    const kcalEpoc = Math.round(kcalWorkout * EPOC_FACTOR);

    const date = new Date(session.startedAt).toISOString().slice(0, 10);

    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push({
      sessionId: session.id!,
      workoutId: session.workoutId,
      startedAt: session.startedAt,
      durationMin,
      volumeKg,
      totalSets: sessionSets.length,
      avgRIR,
      metUsed: met,
      kcalWorkout,
      kcalEpoc,
      kcalTotal: kcalWorkout + kcalEpoc,
      intensity,
    });
  }

  return byDate;
}

/* ────────── Adaptação metabólica ────────── */

/**
 * Calcula adaptação metabólica baseada em peso perdido.
 * Referência: Hall et al. (2011), Thomas et al. (2014)
 */
export async function getMetabolicAdaptation(): Promise<{
  weightStart: number;
  weightCurrent: number;
  kgLost: number;
  adaptationKcal: number;
}> {
  const profile = await db.profile.toCollection().first();
  const measurements = await db.bodyMeasurements
    .orderBy('date')
    .reverse()
    .toArray();

  // Peso atual = média das últimas 4 medições
  const recentWeights = measurements
    .filter((m) => m.weightKg !== undefined)
    .slice(0, 4)
    .map((m) => m.weightKg!);

  const weightCurrent =
    recentWeights.length > 0
      ? recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length
      : profile?.weightKg ?? 75;

  // Peso inicial = primeira medição ou perfil
  const sortedByDate = [...measurements].sort((a, b) => a.date - b.date);
  const firstMeasurement = sortedByDate.find((m) => m.weightKg !== undefined);
  const weightStart = firstMeasurement?.weightKg ?? profile?.weightKg ?? weightCurrent;

  const kgLost = weightStart - weightCurrent;
  const adaptationKcal = Math.round(kgLost * METABOLIC_ADAPTATION_KCAL_PER_KG);

  return {
    weightStart,
    weightCurrent: Math.round(weightCurrent * 10) / 10,
    kgLost: Math.round(kgLost * 10) / 10,
    adaptationKcal,
  };
}

/* ────────── Balanço diário ────────── */

export async function calculateDailyBalance(
  date: string
): Promise<DailyEnergyBalance | null> {
  const profile = await db.profile.toCollection().first();
  const goal = await db.nutritionGoals.toCollection().first();

  if (!profile || !goal) return null;
  if (!profile.weightKg || !profile.heightCm || !profile.age || !profile.sex) {
    return null;
  }

  // Adaptação metabólica
  const adaptation = await getMetabolicAdaptation();

  // TDEE base (Mifflin + atividade + adaptação)
  // Assumimos atividade moderada (o treino já é contado separado)
  const bmr = calculateBMR(
    profile.weightKg,
    profile.heightCm,
    profile.age,
    profile.sex
  );
  const tdeeBase = calculateTDEE(bmr, 'moderado') - adaptation.adaptationKcal;

  // Sessões do dia
  const sessionMap = await getSessionEnergy(adaptation.weightCurrent);
  const sessions = sessionMap.get(date) ?? [];

  const kcalFromWorkouts = sessions.reduce((a, s) => a + s.kcalWorkout, 0);
  const kcalFromEpoc = sessions.reduce((a, s) => a + s.kcalEpoc, 0);

  // TDEE ajustado
  const tdeeAjustado = tdeeBase + kcalFromWorkouts + kcalFromEpoc;

  // Consumo
  const summary = await getDaySummary(date);
  const kcalConsumed = Math.round(summary.kcal);

  // Balanço
  const balance = kcalConsumed - tdeeAjustado;

  // Gordura
  const fatLossGrams = balance < 0 ? Math.round((-balance / KCAL_PER_KG_FAT) * 1000) : 0;
  const fatGainGrams = balance > 0 ? Math.round((balance / KCAL_PER_KG_FAT) * 1000) : 0;

  return {
    date,
    tdeeBase: Math.round(tdeeBase),
    kcalFromWorkouts,
    kcalFromEpoc,
    tdeeAjustado: Math.round(tdeeAjustado),
    kcalConsumed,
    balance: Math.round(balance),
    fatLossGrams,
    fatGainGrams,
    metabolicAdaptation: adaptation.adaptationKcal,
    weightCurrent: adaptation.weightCurrent,
    weightStart: adaptation.weightStart,
    goalType: goal.goalType,
    goalTargetKcal: goal.targetKcal,
    sessions,
  };
}

/* ────────── Histórico ────────── */

export async function getEnergyHistory(days = 30): Promise<
  { date: string; balance: DailyEnergyBalance }[]
> {
  const result: { date: string; balance: DailyEnergyBalance }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;

    const balance = await calculateDailyBalance(key);
    if (balance) {
      result.push({ date: key, balance });
    }
  }

  return result;
}

/**
 * Projeção cumulativa de perda de gordura.
 * Retorna: histórico de déficit acumulado + projeção futura.
 */
export async function getCumulativeFatLoss(days = 30): Promise<{
  history: { date: string; cumulativeFat: number; cumulativeBalance: number }[];
  avgDailyBalance: number;
  projectedWeeklyFatKg: number;
  projectedMonthlyFatKg: number;
  daysWithData: number;
}> {
  const energyHistory = await getEnergyHistory(days);

  // Só conta dias com dieta registrada (>0 kcal consumidas)
  const validDays = energyHistory.filter(
    (e) => e.balance.kcalConsumed > 0
  );

  let cumulativeBalance = 0;
  const history: {
    date: string;
    cumulativeFat: number;
    cumulativeBalance: number;
  }[] = [];

  for (const entry of validDays) {
    cumulativeBalance += entry.balance.balance;
    const cumulativeFat = cumulativeBalance / KCAL_PER_KG_FAT;
    history.push({
      date: entry.date,
      cumulativeFat: Math.round(cumulativeFat * 1000) / 1000,
      cumulativeBalance,
    });
  }

  const avgDailyBalance =
    validDays.length > 0
      ? validDays.reduce((a, e) => a + e.balance.balance, 0) / validDays.length
      : 0;

  // Projeção baseada em déficit médio (mantendo o mesmo)
  const projectedWeeklyFatKg = (avgDailyBalance * 7) / KCAL_PER_KG_FAT;
  const projectedMonthlyFatKg = (avgDailyBalance * 30) / KCAL_PER_KG_FAT;

  return {
    history,
    avgDailyBalance: Math.round(avgDailyBalance),
    projectedWeeklyFatKg: Math.round(projectedWeeklyFatKg * 1000) / 1000,
    projectedMonthlyFatKg: Math.round(projectedMonthlyFatKg * 1000) / 1000,
    daysWithData: validDays.length,
  };
}

/* ────────── Helpers ────────── */

export function formatBalance(kcal: number): string {
  const sign = kcal > 0 ? '+' : '';
  return `${sign}${kcal} kcal`;
}

export function formatFatGrams(grams: number): string {
  if (Math.abs(grams) < 1000) return `${grams}g`;
  return `${(grams / 1000).toFixed(2)}kg`;
}

export function intensityLabel(
  intensity: SessionEnergy['intensity']
): string {
  return {
    leve: 'Leve',
    moderado: 'Moderado',
    intenso: 'Intenso',
    muito_intenso: 'Muito intenso',
  }[intensity];
}

export function intensityColor(
  intensity: SessionEnergy['intensity']
): string {
  return {
    leve: 'text-info',
    moderado: 'text-accent',
    intenso: 'text-warn',
    muito_intenso: 'text-danger',
  }[intensity];
}