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

export function suggestLoadIncrement(exerciseName: string, currentWeight: number) {
  const lower = exerciseName.toLowerCase();
  const isLower = LOWER_COMPOUNDS.some((k) => lower.includes(k));
  const pct = isLower ? 0.05 : 0.025;
  const step = isLower ? 5 : 2.5;

  // Calcula o próximo múltiplo de step ACIMA de currentWeight
  const raw = currentWeight * (1 + pct);
  let next = Math.round(raw / step) * step;

  // 👇 Garantia: sempre sobe pelo menos 1 step
  if (next <= currentWeight) {
    next = currentWeight + step;
  }

  return next;
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

/* ============================================================
   SÉRIES EFETIVAS
   Base: Refalo et al. (2021, 2023), Baz-Valle et al. (2022)

   Série efetiva = RIR <= 3 OU tipo "failure" / próxima da falha.
   - Aquecimento NUNCA conta
   - RIR 4+ NÃO conta
   - Falha técnica (sem RPE) também não conta como efetiva
   ============================================================ */

   export interface EffectiveSetCount {
    group: string;
    count: number;
    target: { min: number; max: number; optimal: number };
    status: "baixo" | "ótimo" | "alto";
  }
  
  /**
   * Verifica se uma série conta como "efetiva".
   */
  export function isEffectiveSet(set: {
    type?: string;
    rpe?: number;
    reps?: number;
    weight?: number;
  }): boolean {
    // Aquecimento nunca conta
    if (set.type === 'warmup') return false;
  
    // Falha sempre conta
    if (set.type === 'failure') return true;
  
    // Se tem RPE, usar como referência
    if (set.rpe !== undefined && set.rpe !== null) {
      const rir = 10 - set.rpe;
      return rir <= 3;
    }
  
    // Se não tem RPE, não conta (não dá pra saber a proximidade da falha)
    return false;
  }
  
  /**
   * Conta séries efetivas por grupo muscular nas últimas N semanas.
   */
  export function countEffectiveSetsByGroup(
    sets: {
      exerciseId: number;
      type?: string;
      rpe?: number;
      reps?: number;
      weight?: number;
      createdAt: number;
    }[],
    exercises: { id?: number; name: string; primaryGroup?: string }[],
    weeks: number = 1
  ): EffectiveSetCount[] {
    const cutoff = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000;
  
    const byGroup = new Map<string, number>();
  
    for (const s of sets) {
      if (s.createdAt < cutoff) continue;
      if (!isEffectiveSet(s)) continue;
  
      const ex = exercises.find((e) => e.id === s.exerciseId);
      if (!ex) continue;
  
      const group = ex.primaryGroup ?? guessGroupFromName(ex.name);
      byGroup.set(group, (byGroup.get(group) ?? 0) + 1);
    }
  
    const ALL_GROUPS = [
      'Peito',
      'Costas',
      'Pernas',
      'Ombros',
      'Bíceps',
      'Tríceps',
      'Core',
      'Cardio',
    ];
  
    return ALL_GROUPS.map((group) => {
      const count = byGroup.get(group) ?? 0;
      const target = getVolumeTarget(group);
      let status: 'baixo' | 'ótimo' | 'alto' = 'ótimo';
      if (count < target.min) status = 'baixo';
      else if (count > target.max) status = 'alto';
      return { group, count, target, status };
    });
  }
  
  /**
   * Alvo de séries efetivas por grupo (por semana).
   * Base: Schoenfeld 2021, Refalo 2021, Baz-Valle 2022.
   *
   * - Grupos grandes (peito, costas, pernas): 12-18 séries/semana
   * - Grupos médios (ombros): 10-16
   * - Grupos pequenos (bíceps, tríceps, core): 8-12
   */
  export function getVolumeTarget(group: string) {
    const g = group.toLowerCase();
    if (['peito', 'costas', 'pernas'].includes(g)) {
      return { min: 12, max: 18, optimal: 15 };
    }
    if (['ombros', 'core'].includes(g)) {
      return { min: 10, max: 16, optimal: 13 };
    }
    if (['bíceps', 'tríceps'].includes(g)) {
      return { min: 8, max: 12, optimal: 10 };
    }
    return { min: 8, max: 15, optimal: 12 };
  }
  
  /**
   * Tenta adivinhar o grupo muscular pelo nome do exercício
   * (fallback para exercícios sem primaryGroup).
   */
  export function guessGroupFromName(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('supino') || n.includes('crucifixo') || n.includes('peck') || n.includes('crossover') || n.includes('flexão') || n.includes('flexao'))
      return 'Peito';
    if (n.includes('barra fixa') || n.includes('puxada') || n.includes('remada') || n.includes('pulldown') || n.includes('pullover') || n.includes('terra'))
      return 'Costas';
    if (n.includes('agachamento') || n.includes('leg press') || n.includes('cadeira') || n.includes('mesa') || n.includes('stiff') || n.includes('afundo') || n.includes('passada') || n.includes('panturrilha') || n.includes('hack') || n.includes('bulgaro') || n.includes('búlgaro'))
      return 'Pernas';
    if (n.includes('desenvolvimento') || n.includes('elevação lateral') || n.includes('elevacao lateral') || n.includes('elevação frontal') || n.includes('encolhimento') || n.includes('face pull') || n.includes('crucifixo inverso'))
      return 'Ombros';
    if (n.includes('rosca')) return 'Bíceps';
    if (n.includes('tríceps') || n.includes('triceps') || n.includes('testa') || n.includes('francês') || n.includes('frances') || n.includes('mergulho') || n.includes('pulley'))
      return 'Tríceps';
    if (n.includes('prancha') || n.includes('abdominal') || n.includes('crunch') || n.includes('ab wheel') || n.includes('russian') || n.includes('dead bug'))
      return 'Core';
    if (n.includes('esteira') || n.includes('bicicleta') || n.includes('elíptico') || n.includes('eliptico') || n.includes('escada') || n.includes('remo ergômetro') || n.includes('corda') || n.includes('burpee'))
      return 'Cardio';
    return 'Outros';
  }

/* ============================================================
   PREDIÇÃO DE 1RM — múltiplas fórmulas + ajuste por RIR
   Base: Epley 1985, Brzycki 1993, Lombardi 1989, Lander 1985,
         Jovanović & Flanagan 2014, García-Ramos et al. 2018
   ============================================================ */

/**
 * Fórmula de Epley (1985).
 * Boa em 2-10 reps.
 */
export function oneRMEpley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Fórmula de Brzycki (1993).
 * Boa em 1-8 reps.
 */
export function oneRMBrzycki(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps >= 37) return weight * 2;
  return (weight * 36) / (37 - reps);
}

/**
 * Fórmula de Lombardi (1989).
 * Boa em 4-12 reps.
 */
export function oneRMLombardi(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * Math.pow(reps, 0.1);
}

/**
 * Fórmula de Lander (1985).
 * Boa em 1-10 reps.
 */
export function oneRMLander(weight: number, reps: number): number {
  if (reps === 1) return weight;
  const denom = 101.3 - 2.67123 * reps;
  if (denom <= 0) return weight * 2;
  return (100 * weight) / denom;
}

/**
 * Estimativa de 1RM por média ponderada de múltiplas fórmulas.
 *
 * Pesos por faixa de reps (baseado em Jovanović & Flanagan 2014):
 * - 1-3 reps:   Brzycki 40%, Epley 25%, Lander 20%, Lombardi 15%
 * - 4-8 reps:   Epley 35%, Brzycki 30%, Lander 20%, Lombardi 15%
 * - 9-12 reps:  Lombardi 40%, Epley 30%, Lander 15%, Brzycki 15%
 * - 13-20 reps: Lombardi 60%, Epley 25%, Lander 15%
 * - 20+ reps:   Lombardi 100% (outras fórmulas perdem precisão)
 */
export function estimate1RMPrecise(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;

  const epley = oneRMEpley(weight, reps);
  const brzycki = oneRMBrzycki(weight, reps);
  const lombardi = oneRMLombardi(weight, reps);
  const lander = oneRMLander(weight, reps);

  let estimate: number;

  if (reps <= 3) {
    estimate =
      brzycki * 0.4 + epley * 0.25 + lander * 0.2 + lombardi * 0.15;
  } else if (reps <= 8) {
    estimate =
      epley * 0.35 + brzycki * 0.3 + lander * 0.2 + lombardi * 0.15;
  } else if (reps <= 12) {
    estimate =
      lombardi * 0.4 + epley * 0.3 + lander * 0.15 + brzycki * 0.15;
  } else if (reps <= 20) {
    estimate = lombardi * 0.6 + epley * 0.25 + lander * 0.15;
  } else {
    estimate = lombardi;
  }

  return Math.round(estimate * 10) / 10;
}

/**
 * 1RM ajustado por RIR.
 *
 * Se você fez X reps com RIR Y, você CONSEGUIRIA fazer (X + Y) reps
 * até a falha. Estimamos o 1RM com base nas reps totais possíveis.
 *
 * Base: García-Ramos et al. (2018), Zourdos et al. (2016).
 */
export function estimate1RMWithRIR(
  weight: number,
  reps: number,
  rir?: number
): number {
  if (!rir || rir < 0) return estimate1RMPrecise(weight, reps);
  const effectiveReps = reps + rir; // reps que você conseguiria
  return estimate1RMPrecise(weight, effectiveReps);
}

/**
 * Analisa uma série e retorna info completa de predição.
 */
export interface OneRMPrediction {
  weight: number;
  reps: number;
  rir: number;
  estimated1RM: number;        // sem ajuste de RIR
  estimated1RMWithRIR: number; // com ajuste de RIR
  potentialGain: number;       // estimated1RMWithRIR - weight
}

export function predict1RM(set: {
  weight: number;
  reps: number;
  rpe?: number;
  type?: string;
}): OneRMPrediction | null {
  if (set.type === 'warmup') return null;
  if (!set.weight || !set.reps) return null;

  const rir = set.rpe !== undefined ? Math.max(0, 10 - set.rpe) : 0;
  const estimated1RM = estimate1RMPrecise(set.weight, set.reps);
  const estimated1RMWithRIR = estimate1RMWithRIR(set.weight, set.reps, rir);

  return {
    weight: set.weight,
    reps: set.reps,
    rir,
    estimated1RM,
    estimated1RMWithRIR,
    potentialGain: estimated1RMWithRIR - set.weight,
  };
}

/**
 * PR LATENTE
 * Se o 1RM estimado passa do PR real, você provavelmente consegue
 * mais do que já tentou. Mostra o "PR latente".
 */
export interface LatentPR {
  actualPR: number;
  estimated1RM: number;
  latentGain: number;
  sourceSet: { weight: number; reps: number; rir: number };
  nextPRTarget?: number; // 👈 novo
}

export function detectLatentPR(
  historicalSets: { weight: number; reps: number; rpe?: number; type?: string }[],
  currentSessionSets: { weight: number; reps: number; rpe?: number; type?: string }[]
): LatentPR | null {
  const workingSets = historicalSets.filter((s) => s.type !== 'warmup');
  if (workingSets.length === 0) return null;

  const actualPR = Math.max(...workingSets.map((s) => s.weight));

  const allWorking = [...workingSets, ...currentSessionSets].filter(
    (s) => s.type !== 'warmup' && s.weight > 0 && s.reps > 0
  );

  let bestEstimate = 0;
  let bestSource: { weight: number; reps: number; rir: number } | null = null;

  for (const s of allWorking) {
    const rir = s.rpe !== undefined ? Math.max(0, 10 - s.rpe) : 0;
    const est = estimate1RMWithRIR(s.weight, s.reps, rir);
    if (est > bestEstimate) {
      bestEstimate = est;
      bestSource = { weight: s.weight, reps: s.reps, rir };
    }
  }

  if (!bestSource) return null;

  // Só mostra se a série-base NÃO é a série atual (senão tá reclamando de si mesma)
  if (bestSource.weight === actualPR && bestSource.reps <= 12) return null;

  // Só reporta ganho significativo (>= 10% do PR)
  const latentGain = bestEstimate - actualPR;
  if (latentGain < actualPR * 0.1) return null;

  // 👇 NOVO: em vez de "+X kg", mostra um alvo REALISTA
  // O próximo PR sugerido é o próximo múltiplo de step acima do PR atual
  // Ex: PR 50 → sugere tentar 55 kg (não 69)
  const lower = bestSource ? '' : '';
  const step = actualPR < 100 ? 5 : 10;
  const nextPRTarget = Math.round((actualPR + step) / step) * step;

  return {
    actualPR,
    estimated1RM: Math.round(bestEstimate * 10) / 10,
    latentGain: Math.round(latentGain * 10) / 10,
    sourceSet: bestSource,
    nextPRTarget, // 👈 novo campo
  };
}

/**
 * Retorna a melhor série (por 1RM estimado) de uma lista.
 */
export function getBestSetBy1RM<
  T extends { weight: number; reps: number; rpe?: number; type?: string }
>(sets: T[]): { set: T; estimated1RM: number } | null {
  let best: { set: T; estimated1RM: number } | null = null;
  for (const s of sets) {
    if (s.type === 'warmup') continue;
    if (!s.weight || !s.reps) continue;
    const rir = s.rpe !== undefined ? Math.max(0, 10 - s.rpe) : 0;
    const est = estimate1RMWithRIR(s.weight, s.reps, rir);
    if (!best || est > best.estimated1RM) {
      best = { set: s, estimated1RM: est };
    }
  }
  return best;
}