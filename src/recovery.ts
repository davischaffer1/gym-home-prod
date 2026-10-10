import { db } from './db';
import { guessGroupFromName } from './trainingScience';

/* ══════════════════════════════════════════════════════════
   RECUPERAÇÃO MUSCULAR
   Base: Flann (2011), Damas (2016), Peake (2017), Cheung (2003)
   ══════════════════════════════════════════════════════════ */

export interface MuscleGroupRecovery {
  group: string;
  score: number;              // 0-100 (100 = totalmente recuperado)
  lastTrainedAt: number;      // timestamp
  hoursSince: number;
  estimatedFullRecovery: number; // timestamp
  hoursRemaining: number;
  status: 'recuperando' | 'quase' | 'pronto';
  volumeLast48h: number;
  setsLast48h: number;
  avgRIR: number | null;
}

/* ────────── Recuperação base por grupo muscular ──────────
   Horas base de recuperação (100%):
   - Grupos grandes (pernas, costas, peito): 72h
   - Grupos médios (ombros, core): 48h
   - Grupos pequenos (bíceps, tríceps): 36h
   Base: Schoenfeld 2021, Cheung 2003
*/
const BASE_RECOVERY_HOURS: Record<string, number> = {
  Pernas: 72,
  Costas: 72,
  Peito: 60,
  Ombros: 48,
  Core: 48,
  Bíceps: 36,
  Tríceps: 36,
  Cardio: 24,
};

/* ────────── Fatores de ajuste ──────────
   Volume: mais séries = mais tempo
   Intensidade (RIR): mais perto da falha = mais tempo
   Tipo de série: drop/myo = mais tempo
*/
function calculateRecoveryTime(
  group: string,
  sets: { reps: number; weight: number; rpe?: number; type?: string }[]
): number {
  const base = BASE_RECOVERY_HOURS[group] ?? 48;

  // Conta séries efetivas (RIR <= 3)
  const effectiveSets = sets.filter((s) => {
    if (s.type === 'warmup') return false;
    if (s.rpe !== undefined) return 10 - s.rpe <= 3;
    return true; // assume próximo da falha se não tiver RPE
  });

  const setCount = effectiveSets.length;

  // Fator volume (base: 6 séries = 1.0)
  const volumeFactor = setCount <= 6
    ? 0.7 + (setCount / 6) * 0.3
    : 1.0 + (setCount - 6) * 0.05;

  // Fator intensidade (RIR médio)
  const rpes = effectiveSets
    .filter((s) => s.rpe !== undefined)
    .map((s) => s.rpe!);
  const avgRPE = rpes.length > 0
    ? rpes.reduce((a, b) => a + b, 0) / rpes.length
    : 7;

  // RIR 3 → fator 1.0 | RIR 0 → fator 1.3 | RIR 5 → fator 0.85
  const avgRIR = 10 - avgRPE;
  const intensityFactor = avgRIR <= 3
    ? 1.0 + (3 - avgRIR) * 0.1
    : 1.0 - (avgRIR - 3) * 0.05;

  // Fator tipo de série (drop, myo, rest-pause aumentam)
  const advancedSets = sets.filter(
    (s) => s.type === 'drop' || s.type === 'myo' || s.type === 'restpause'
  ).length;
  const typeFactor = 1 + advancedSets * 0.08;

  // Fórmula final
  const totalHours = base * volumeFactor * intensityFactor * typeFactor;

  return Math.min(totalHours, 120); // máximo 5 dias
}

/* ────────── Calcula recuperação de todos os grupos ────────── */
export async function calculateRecoveryByGroup(): Promise<
  MuscleGroupRecovery[]
> {
  const sessions = await db.sessions
    .filter((s) => s.finishedAt !== undefined)
    .toArray();
  const sets = await db.sets.toArray();
  const exercises = await db.exercises.toArray();

  const now = Date.now();
  const GROUPS = [
    'Peito',
    'Costas',
    'Pernas',
    'Ombros',
    'Bíceps',
    'Tríceps',
    'Core',
  ];

  // 1. Agrupa séries por grupo muscular, com sessão
  const setsByGroup = new Map<
    string,
    {
      sessionId: number;
      startedAt: number;
      sets: { reps: number; weight: number; rpe?: number; type?: string }[];
    }[]
  >();

  for (const group of GROUPS) setsByGroup.set(group, []);

  // Indexa sessions por id
  const sessionById = new Map(sessions.map((s) => [s.id!, s]));

  // Agrupa por sessão + grupo
  const sessionGroupMap = new Map<
    string,
    { reps: number; weight: number; rpe?: number; type?: string }[]
  >();

  for (const s of sets) {
    const ex = exercises.find((e) => e.id === s.exerciseId);
    if (!ex) continue;
    const group = ex.primaryGroup ?? guessGroupFromName(ex.name);
    const session = sessionById.get(s.sessionId);
    if (!session) continue;

    const key = `${session.id}|${group}`;
    if (!sessionGroupMap.has(key)) sessionGroupMap.set(key, []);
    sessionGroupMap.get(key)!.push({
      reps: s.reps,
      weight: s.weight,
      rpe: s.rpe,
      type: s.type,
    });
  }

  // Distribui por grupo
  for (const [key, setList] of sessionGroupMap) {
    const [sessionId, group] = key.split('|');
    const session = sessionById.get(parseInt(sessionId));
    if (!session) continue;

    if (!setsByGroup.has(group)) continue;
    setsByGroup.get(group)!.push({
      sessionId: parseInt(sessionId),
      startedAt: session.startedAt,
      sets: setList,
    });
  }

  // 2. Calcula recuperação para cada grupo
  const results: MuscleGroupRecovery[] = [];

  for (const group of GROUPS) {
    const groupSessions = setsByGroup.get(group) ?? [];

    if (groupSessions.length === 0) {
      // Nunca treinou — 100% recuperado
      results.push({
        group,
        score: 100,
        lastTrainedAt: 0,
        hoursSince: 9999,
        estimatedFullRecovery: now,
        hoursRemaining: 0,
        status: 'pronto',
        volumeLast48h: 0,
        setsLast48h: 0,
        avgRIR: null,
      });
      continue;
    }

    // Pega a sessão mais recente desse grupo
    const lastSession = groupSessions.sort(
      (a, b) => b.startedAt - a.startedAt
    )[0];

    // Calcula tempo de recuperação
    const recoveryHours = calculateRecoveryTime(group, lastSession.sets);

    const hoursSince = (now - lastSession.startedAt) / (60 * 60 * 1000);
    const hoursRemaining = Math.max(0, recoveryHours - hoursSince);

    // Score: 100% quando passou todo o tempo
    const score = Math.min(
      100,
      Math.round((hoursSince / recoveryHours) * 100)
    );

    // Status
    let status: MuscleGroupRecovery['status'];
    if (score >= 90) status = 'pronto';
    else if (score >= 60) status = 'quase';
    else status = 'recuperando';

    // Estatísticas das últimas 48h
    const cutoff48h = now - 48 * 60 * 60 * 1000;
    const recentSessions = groupSessions.filter(
      (s) => s.startedAt >= cutoff48h
    );

    const allRecentSets = recentSessions.flatMap((s) => s.sets);
    const volumeLast48h = allRecentSets.reduce(
      (a, s) => a + s.reps * s.weight,
      0
    );
    const setsLast48h = allRecentSets.filter(
      (s) => s.type !== 'warmup'
    ).length;

    const rpes = allRecentSets
      .filter((s) => s.rpe !== undefined)
      .map((s) => s.rpe!);
    const avgRPE = rpes.length > 0
      ? rpes.reduce((a, b) => a + b, 0) / rpes.length
      : null;
    const avgRIR = avgRPE !== null ? 10 - avgRPE : null;

    results.push({
      group,
      score,
      lastTrainedAt: lastSession.startedAt,
      hoursSince: Math.round(hoursSince),
      estimatedFullRecovery: lastSession.startedAt + recoveryHours * 60 * 60 * 1000,
      hoursRemaining: Math.round(hoursRemaining),
      status,
      volumeLast48h: Math.round(volumeLast48h),
      setsLast48h,
      avgRIR: avgRIR !== null ? Math.round(avgRIR * 10) / 10 : null,
    });
  }

  // Ordena: menor recuperação primeiro
  return results.sort((a, b) => a.score - b.score);
}

/* ────────── Sugere treino do dia ────────── */
export function suggestWorkoutToday(
  recovery: MuscleGroupRecovery[]
): {
  recommended: string[];
  warning: string[];
  avoid: string[];
} {
  const recommended: string[] = [];
  const warning: string[] = [];
  const avoid: string[] = [];

  for (const r of recovery) {
    if (r.score >= 90) recommended.push(r.group);
    else if (r.score >= 60) warning.push(r.group);
    else avoid.push(r.group);
  }

  return { recommended, warning, avoid };
}

/* ────────── Helper de formatação ────────── */
export function formatHoursRemaining(hours: number): string {
  if (hours <= 0) return 'pronto';
  if (hours < 1) return 'menos de 1h';
  if (hours < 24) return `~${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  return `~${days}d`;
}