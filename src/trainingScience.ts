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