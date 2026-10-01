import type { SetLog } from './db';

/* ============================================================
   1RM estimado — fórmula de Epley (1985)
   Base: Epley, B. (1985). Poundage chart. Boyd Epley Workout.
   Precisão cai acima de ~10 reps, mas é a mais usada em prática.
   ============================================================ */
export function estimate1RM(weight: number, reps: number) {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/* ============================================================
   TUT ideal por objetivo (base Schoenfeld 2015, 2021)
   - Força: 20-40s por série (cargas altas, reps baixas)
   - Hipertrofia: 30-60s por série
   - Resistência: 60-90s por série
   ============================================================ */
export function tutRange(target: 'strength' | 'hypertrophy' | 'endurance') {
  if (target === 'strength') return { min: 20, max: 40 };
  if (target === 'hypertrophy') return { min: 30, max: 60 };
  return { min: 60, max: 90 };
}

/* ============================================================
   Classificação de RPE (Zourdos et al., 2016)
   Escala 1-10. RPE 10 = falha. RIR (reps in reserve) = 10 - RPE.
   ============================================================ */
export function rpeToRIR(rpe: number) {
  return Math.max(0, 10 - rpe);
}

/* ============================================================
   Sugestão de carga por dupla progressão
   Base: Helms et al. (2018) — The Muscle & Strength Pyramid
   Regra: se bateu o topo da faixa em TODAS as séries nas
   últimas 2 sessões → sobe carga.
   Incremento:
     - Compostos lower (agachamento, terra, leg press): +5%
     - Compostos upper (supino, remada, desenvolvimento): +2.5%
     - Isoladores (rosca, tríceps, elevação): +2.5% (ou +1-2 kg)
   ============================================================ */
const LOWER_COMPOUNDS = [
  'agachamento',
  'leg press',
  'terra',
  'stiff',
  'afundo',
  'passada',
  'hack',
  'bulgaro',
  'búlgaro',
  'hip thrust',
  'elevacao pelvica',
  'elevação pélvica',
];

export function suggestLoadIncrement(
  exerciseName: string,
  currentWeight: number
) {
  const lower = exerciseName.toLowerCase();
  const isLower = LOWER_COMPOUNDS.some((k) => lower.includes(k));
  const pct = isLower ? 0.05 : 0.025;
  const step = isLower ? 5 : 2.5;
  // Arredonda para múltiplo de step
  const raw = currentWeight * (1 + pct);
  return Math.round(raw / step) * step;
}

/* ============================================================
   Analisa as últimas N sessões de um exercício e diz se deve
   subir carga (dupla progressão).
   ============================================================ */
export interface SessionSetSummary {
  sessionId: number;
  startedAt: number;
  maxWeight: number;
  topReps: number; // maior rep feita com maxWeight
  allSetsHitTop: boolean; // bateu topo da faixa em TODAS as séries
}

export function analyzeExerciseProgress(
  sets: SetLog[],
  exerciseId: number,
  targetMin: number,
  targetMax: number,
  limit = 6
): SessionSetSummary[] {
  const filtered = sets.filter((s) => s.exerciseId === exerciseId);
  const bySession = new Map<number, SetLog[]>();
  for (const s of filtered) {
    if (!bySession.has(s.sessionId)) bySession.set(s.sessionId, []);
    bySession.get(s.sessionId)!.push(s);
  }

  const summaries: SessionSetSummary[] = [];
  for (const [sessionId, list] of bySession) {
    const maxWeight = Math.max(...list.map((s) => s.weight));
    const topReps = Math.max(
      ...list.filter((s) => s.weight === maxWeight).map((s) => s.reps)
    );
    const workingSets = list.filter((s) => s.type !== 'warmup');
    const allSetsHitTop =
      workingSets.length > 0 && workingSets.every((s) => s.reps >= targetMax);
    summaries.push({
      sessionId,
      startedAt: list[0].createdAt,
      maxWeight,
      topReps,
      allSetsHitTop,
    });
  }

  return summaries.sort((a, b) => b.startedAt - a.startedAt).slice(0, limit);
}

/* ============================================================
   Detecção de platô
   Base: Issurin (2010), Bell et al. (2020)
   Platô = carga máxima não sobe em ≥3 sessões consecutivas.
   ============================================================ */
export function detectPlateau(summaries: SessionSetSummary[]): boolean {
  if (summaries.length < 3) return false;
  const last3 = summaries.slice(0, 3);
  const maxFirst = last3[last3.length - 1].maxWeight;
  const maxLast = last3[0].maxWeight;
  return maxLast <= maxFirst;
}

/* ============================================================
   Deload automático
   Base: Bell et al. (2020) — deload a cada 4-8 semanas.
   Aqui: 6 semanas OU 3+ platôs simultâneos.
   ============================================================ */
export function shouldDeload(
  lastDeloadAt: number | undefined,
  now: number,
  plateauCount: number
) {
  const weeksSince = lastDeloadAt
    ? (now - lastDeloadAt) / (7 * 24 * 60 * 60 * 1000)
    : 999;
  if (plateauCount >= 3) return { yes: true, reason: '3+ platôs detectados' };
  if (weeksSince >= 6)
    return {
      yes: true,
      reason: `${Math.floor(weeksSince)} semanas desde o último deload`,
    };
  return { yes: false, reason: '' };
}

/**
 * Converte RIR em RPE.
 */
export function rirToRPE(rir: number): number {
  return Math.min(10, 10 - rir);
}

/**
 * Sugere ajuste de carga baseado no RIR reportado vs RIR alvo.
 *
 * Regra (Helms 2018, Pareja-Blanco 2020):
 * - Se RIR reportado > RIR alvo → sobra "espaço" → SUGERE SUBIR carga
 * - Se RIR reportado < RIR alvo → foi muito perto da falha → SUGERE DESCER
 * - Se RIR reportado == RIR alvo → manter
 *
 * Incremento proporcional à diferença:
 * - Diferença 1 → ajuste leve (~1.25%)
 * - Diferença 2 → ajuste médio (~2.5%)
 * - Diferença >= 3 → ajuste forte (~5%)
 */
export function suggestLoadByRIR(
  currentWeight: number,
  reportedRIR: number,
  targetRIR: number,
  exerciseName: string
): { newWeight: number; direction: "up" | "down" | "keep"; delta: number } {
  const diff = reportedRIR - targetRIR;

  if (Math.abs(diff) < 1) {
    return { newWeight: currentWeight, direction: "keep", delta: 0 };
  }

  // Define step base (menor para isoladores)
  const lower = exerciseName.toLowerCase();
  const isLower = LOWER_COMPOUNDS.some((k) => lower.includes(k));
  const step = isLower ? 5 : 2.5;

  // Ajuste proporcional
  const pct = Math.min(0.05, Math.abs(diff) * 0.0125);
  const raw = currentWeight * (1 + (diff > 0 ? pct : -pct));
  const newWeight = Math.round(raw / step) * step;

  return {
    newWeight,
    direction: diff > 0 ? "up" : "down",
    delta: newWeight - currentWeight,
  };
}

/**
 * Analisa as últimas séries de um exercício e retorna
 * a sugestão de ajuste para a PRÓXIMA série.
 */
export interface RIRSuggestion {
  direction: "up" | "down" | "keep";
  currentWeight: number;
  suggestedWeight: number;
  delta: number;
  reason: string;
  reportedRIR: number;
  targetRIR: number;
}

export function analyzeRIRForNextSet(
  currentSetWeight: number,
  currentSetRPE: number | undefined,
  targetRIR: number,
  exerciseName: string
): RIRSuggestion | null {
  if (currentSetRPE === undefined) return null;

  const reportedRIR = rpeToRIR(currentSetRPE);
  const suggestion = suggestLoadByRIR(
    currentSetWeight,
    reportedRIR,
    targetRIR,
    exerciseName
  );

  let reason = "";
  if (suggestion.direction === "up") {
    reason = `Você ficou ${reportedRIR - targetRIR} RIR acima do alvo — dá pra subir.`;
  } else if (suggestion.direction === "down") {
    reason = `Você ficou ${targetRIR - reportedRIR} RIR abaixo do alvo — considere reduzir.`;
  } else {
    reason = "RIR no alvo. Mantenha a carga.";
  }

  return {
    ...suggestion,
    reason,
    reportedRIR,
    targetRIR,
  };
}