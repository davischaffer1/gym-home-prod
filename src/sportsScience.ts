/* ══════════════════════════════════════════════════════════
   SPORTS SCIENCE — fórmulas com base científica
   ══════════════════════════════════════════════════════════ */

/* ─────────────── 1. ÍNDICE DE FORÇA RELATIVA (ISR) ───────────────
   Base: Rikli & Jones (1999), ACSM Guidelines (2009)
   Calculado por: 1RM total (supino + agachamento + terra) / peso corporal
*/
export interface StrengthIndex {
    total1RM: number;
    bodyWeight: number;
    isr: number;
    level: 'Iniciante' | 'Novato' | 'Intermediário' | 'Avançado' | 'Elite';
    nextLevel: number | null;
    percentToNext: number;
  }
  
  export function calculateISR(
    bench1RM: number,
    squat1RM: number,
    deadlift1RM: number,
    bodyWeight: number
  ): StrengthIndex {
    const total = bench1RM + squat1RM + deadlift1RM;
    const isr = bodyWeight > 0 ? total / bodyWeight : 0;
  
    // Faixas baseadas em Kilgore & Rippetoe (2006) — atualizadas com ACSM 2009
    // (para homens; mulheres podem multiplicar por 0.7 como fator de ajuste)
    let level: StrengthIndex['level'];
    let nextLevel: number | null;
  
    if (isr < 2.0) {
      level = 'Iniciante';
      nextLevel = 2.0;
    } else if (isr < 3.0) {
      level = 'Novato';
      nextLevel = 3.0;
    } else if (isr < 4.0) {
      level = 'Intermediário';
      nextLevel = 4.0;
    } else if (isr < 5.5) {
      level = 'Avançado';
      nextLevel = 5.5;
    } else {
      level = 'Elite';
      nextLevel = null;
    }
  
    const prevLevel =
      level === 'Iniciante'
        ? 0
        : level === 'Novato'
        ? 2.0
        : level === 'Intermediário'
        ? 3.0
        : level === 'Avançado'
        ? 4.0
        : 5.5;
  
    const percentToNext =
      nextLevel !== null
        ? Math.round(((isr - prevLevel) / (nextLevel - prevLevel)) * 100)
        : 100;
  
    return {
      total1RM: Math.round(total),
      bodyWeight,
      isr: Math.round(isr * 100) / 100,
      level,
      nextLevel,
      percentToNext: Math.max(0, Math.min(100, percentToNext)),
    };
  }
  
  /* ─────────────── 2. PERCENTIL POR EXERCÍCIO ───────────────
     Base: Strength Level standards (milhões de dados)
     Fórmula simplificada para classificar carga relativa.
  */
  export interface StrengthPercentile {
    exercise: string;
    ratio: number;      // 1RM / peso corporal
    percentile: number; // 0-100
    level: string;
  }
  
  const BENCH_STANDARDS = [
    { ratio: 0.5, pct: 5, level: 'Iniciante' },
    { ratio: 0.75, pct: 30, level: 'Novato' },
    { ratio: 1.0, pct: 55, level: 'Intermediário' },
    { ratio: 1.25, pct: 75, level: 'Avançado' },
    { ratio: 1.5, pct: 90, level: 'Elite' },
    { ratio: 1.75, pct: 97, level: 'World-class' },
  ];
  
  const SQUAT_STANDARDS = [
    { ratio: 0.75, pct: 5, level: 'Iniciante' },
    { ratio: 1.0, pct: 25, level: 'Novato' },
    { ratio: 1.5, pct: 50, level: 'Intermediário' },
    { ratio: 2.0, pct: 75, level: 'Avançado' },
    { ratio: 2.5, pct: 90, level: 'Elite' },
    { ratio: 3.0, pct: 97, level: 'World-class' },
  ];
  
  const DEADLIFT_STANDARDS = [
    { ratio: 1.0, pct: 5, level: 'Iniciante' },
    { ratio: 1.25, pct: 25, level: 'Novato' },
    { ratio: 1.75, pct: 50, level: 'Intermediário' },
    { ratio: 2.25, pct: 75, level: 'Avançado' },
    { ratio: 2.75, pct: 90, level: 'Elite' },
    { ratio: 3.5, pct: 97, level: 'World-class' },
  ];
  
  const OHP_STANDARDS = [
    { ratio: 0.35, pct: 5, level: 'Iniciante' },
    { ratio: 0.5, pct: 25, level: 'Novato' },
    { ratio: 0.65, pct: 50, level: 'Intermediário' },
    { ratio: 0.8, pct: 75, level: 'Avançado' },
    { ratio: 1.0, pct: 90, level: 'Elite' },
  ];
  
  export function getStrengthPercentile(
    exerciseName: string,
    oneRM: number,
    bodyWeight: number
  ): StrengthPercentile | null {
    if (bodyWeight <= 0 || oneRM <= 0) return null;
    const ratio = oneRM / bodyWeight;
    const n = exerciseName.toLowerCase();
  
    let standards = null;
    let label = '';
  
    if (n.includes('supino')) {
      standards = BENCH_STANDARDS;
      label = 'Supino';
    } else if (n.includes('agachamento')) {
      standards = SQUAT_STANDARDS;
      label = 'Agachamento';
    } else if (n.includes('terra')) {
      standards = DEADLIFT_STANDARDS;
      label = 'Levantamento terra';
    } else if (n.includes('desenvolvimento') || n.includes('militar')) {
      standards = OHP_STANDARDS;
      label = 'Desenvolvimento';
    } else {
      return null;
    }
  
    // Interpolação linear
    let percentile = 0;
    let level = 'Iniciante';
  
    for (let i = 0; i < standards.length; i++) {
      if (ratio <= standards[i].ratio) {
        if (i === 0) {
          percentile = (ratio / standards[0].ratio) * standards[0].pct;
          level = 'Iniciante';
        } else {
          const prev = standards[i - 1];
          const curr = standards[i];
          const t = (ratio - prev.ratio) / (curr.ratio - prev.ratio);
          percentile = prev.pct + t * (curr.pct - prev.pct);
          level = curr.level;
        }
        break;
      }
      if (i === standards.length - 1) {
        percentile = 99;
        level = standards[i].level;
      }
    }
  
    return {
      exercise: label,
      ratio: Math.round(ratio * 100) / 100,
      percentile: Math.round(percentile),
      level,
    };
  }
  
  /* ─────────────── 3. SCORE DE PRONTIDÃO (READINESS) ───────────────
     Base: Saw et al. (2016), Bourdon et al. (2017)
     Componentes:
     - Dias desde último treino (ideal: 1-2 dias)
     - Soreness (1-5)
     - Sleep (últimas 24h)
     - Stress (1-5)
     - Mood (1-5)
     Retorna 0-100 + recomendação
  */
  export interface ReadinessResult {
    score: number;
    level: 'baixa' | 'moderada' | 'boa' | 'excelente';
    recommendation: string;
    factors: {
      name: string;
      score: number;
      weight: number;
    }[];
  }
  
  export function calculateReadiness(input: {
    daysSinceLastWorkout: number;
    soreness: number;    // 1-5 (1 = nenhuma)
    sleepHours: number;
    stress: number;      // 1-5
    mood: number;        // 1-5
  }): ReadinessResult {
    // ─── Dias desde último treino (25%) ───
    // 0 = ruim (muito recente), 1-2 = ideal, 3+ = ok, 7+ = destreinado
    let restScore: number;
    if (input.daysSinceLastWorkout === 0) restScore = 50;
    else if (input.daysSinceLastWorkout === 1) restScore = 100;
    else if (input.daysSinceLastWorkout === 2) restScore = 95;
    else if (input.daysSinceLastWorkout <= 4) restScore = 80;
    else if (input.daysSinceLastWorkout <= 7) restScore = 60;
    else restScore = 40;
  
    // ─── Soreness (25%) ───
    // 1 = nenhuma (100), 5 = muita (20)
    const sorenessScore = (5 - input.soreness + 1) * 20;
  
    // ─── Sono (25%) ───
    // 0h = 0, 8h = 100, 9+h = 100
    const sleepScore = Math.min(100, (input.sleepHours / 8) * 100);
  
    // ─── Stress (15%) ───
    // 1 = pouco (100), 5 = muito (20)
    const stressScore = (5 - input.stress + 1) * 20;
  
    // ─── Mood (10%) ───
    const moodScore = (input.mood / 5) * 100;
  
    const factors = [
      { name: 'Descanso', score: restScore, weight: 0.25 },
      { name: 'Dor muscular', score: sorenessScore, weight: 0.25 },
      { name: 'Sono', score: sleepScore, weight: 0.25 },
      { name: 'Estresse', score: stressScore, weight: 0.15 },
      { name: 'Humor', score: moodScore, weight: 0.10 },
    ];
  
    const score = Math.round(
      factors.reduce((acc, f) => acc + f.score * f.weight, 0)
    );
  
    let level: ReadinessResult['level'];
    let recommendation: string;
  
    if (score >= 85) {
      level = 'excelente';
      recommendation = '🔥 Ótimo dia pra bater PR!';
    } else if (score >= 70) {
      level = 'boa';
      recommendation = '✅ Bom dia pra treinar forte.';
    } else if (score >= 50) {
      level = 'moderada';
      recommendation = '⚠️ Reduza intensidade em 10-20%.';
    } else {
      level = 'baixa';
      recommendation = '😴 Considere descanso ou deload.';
    }
  
    return { score, level, recommendation, factors };
  }
  
  /* ─────────────── 4. SESSION-RPE (CARGA INTERNA) ───────────────
     Base: Foster et al. (2001)
     Carga = duração (min) × RPE médio
  */
  export function calculateSessionRPE(durationMin: number, avgRPE: number): number {
    return Math.round(durationMin * avgRPE);
  }
  
  /* ─────────────── 5. ACWR (CARGA AGUDA:CRÔNICA) ───────────────
     Base: Gabbett (2016)
     ACWR = carga aguda (últimos 7 dias) / média crônica (últimas 4 semanas)
     Zona ideal: 0.8 - 1.3
  */
  export interface ACWRResult {
    acute: number;
    chronic: number;
    ratio: number;
    zone: 'destreino' | 'ideal' | 'atenção' | 'risco';
    recommendation: string;
  }
  
  export function calculateACWR(
    dailyLoads: { date: string; load: number }[]
  ): ACWRResult {
    const now = new Date();
    const ms7 = 7 * 24 * 60 * 60 * 1000;
    const ms28 = 28 * 24 * 60 * 60 * 1000;
  
    const acute = dailyLoads
      .filter((d) => {
        const t = new Date(d.date).getTime();
        return now.getTime() - t <= ms7;
      })
      .reduce((a, d) => a + d.load, 0);
  
    const chronic = dailyLoads
      .filter((d) => {
        const t = new Date(d.date).getTime();
        return now.getTime() - t <= ms28;
      })
      .reduce((a, d) => a + d.load, 0);
  
    const chronicAvg = chronic / 4;
    const ratio = chronicAvg > 0 ? acute / chronicAvg : 0;
  
    let zone: ACWRResult['zone'];
    let recommendation: string;
  
    if (ratio < 0.8) {
      zone = 'destreino';
      recommendation = '📉 Carga baixa. Pode aumentar.';
    } else if (ratio <= 1.3) {
      zone = 'ideal';
      recommendation = '✅ Zona ideal. Continue assim.';
    } else if (ratio <= 1.5) {
      zone = 'atenção';
      recommendation = '⚠️ Carga alta. Monitore recuperação.';
    } else {
      zone = 'risco';
      recommendation = '🚨 Risco de lesão! Reduza volume.';
    }
  
    return {
      acute: Math.round(acute),
      chronic: Math.round(chronicAvg),
      ratio: Math.round(ratio * 100) / 100,
      zone,
      recommendation,
    };
  }
  
  /* ─────────────── 6. STRAIN + MONOTONIA ───────────────
     Base: Foster (1998, 2001)
     Monotonia = média diária / desvio-padrão
     Strain = carga semanal × monotonia
  */
  export interface StrainResult {
    weeklyLoad: number;
    monotony: number;
    strain: number;
    warning: string | null;
  }
  
  export function calculateStrain(
    dailyLoads: { date: string; load: number }[]
  ): StrainResult {
    const now = new Date();
    const ms7 = 7 * 24 * 60 * 60 * 1000;
    const recent = dailyLoads.filter(
      (d) => now.getTime() - new Date(d.date).getTime() <= ms7
    );
  
    if (recent.length === 0) {
      return {
        weeklyLoad: 0,
        monotony: 0,
        strain: 0,
        warning: null,
      };
    }
  
    // Cria 7 "dias" (inclusive vazios = 0)
    const days: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const load = recent.find((x) => x.date === key)?.load ?? 0;
      days.push(load);
    }
  
    const weeklyLoad = days.reduce((a, b) => a + b, 0);
    const mean = weeklyLoad / 7;
    const variance =
      days.reduce((a, d) => a + Math.pow(d - mean, 2), 0) / 7;
    const sd = Math.sqrt(variance);
  
    const monotony = sd > 0 ? mean / sd : 0;
    const strain = weeklyLoad * monotony;
  
    let warning: string | null = null;
    if (monotony > 2.0) {
      warning = '📊 Monotonia alta — varie a carga entre os dias.';
    }
    if (strain > 6000) {
      warning = '🚨 Strain elevado — considere deload.';
    }
  
    return {
      weeklyLoad: Math.round(weeklyLoad),
      monotony: Math.round(monotony * 100) / 100,
      strain: Math.round(strain),
      warning,
    };
  }
  
  /* ─────────────── 7. HIDRATAÇÃO ───────────────
     Base: ACSM (2007) — 35 ml por kg de peso corporal
  */
  export function calculateWaterTarget(weightKg: number): number {
    return Math.round(weightKg * 35); // em ml
  }
  
  /* ─────────────── 8. PROTEÍNA ALVO ───────────────
     Base: Morton et al. (2018) meta-análise
     - Manutenção: 1.6 g/kg
     - Hipertrofia: 1.6 - 2.2 g/kg
     - Cutting: 2.2 - 2.6 g/kg
  */
  export function calculateProteinTarget(
    weightKg: number,
    goal: 'manutencao' | 'hipertrofia' | 'cutting'
  ): { min: number; max: number } {
    const ranges = {
      manutencao: [1.4, 1.8],
      hipertrofia: [1.6, 2.2],
      cutting: [2.2, 2.6],
    };
    const [min, max] = ranges[goal];
    return {
      min: Math.round(weightKg * min),
      max: Math.round(weightKg * max),
    };
  }
  
  /* ─────────────── 9. TMB (Mifflin-St Jeor) ───────────────
     Base: Mifflin et al. (1990)
     Homem: 10×peso + 6.25×altura − 5×idade + 5
     Mulher: 10×peso + 6.25×altura − 5×idade − 161
  */
  export function calculateBMR(
    weightKg: number,
    heightCm: number,
    age: number,
    sex: 'M' | 'F'
  ): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(sex === 'M' ? base + 5 : base - 161);
  }
  
  /* ─────────────── 10. TDEE (gasto total diário) ───────────────
     Fatores de atividade (Harris-Benedict atualizado):
     - Sedentário: 1.2
     - Leve: 1.375
     - Moderado: 1.55
     - Intenso: 1.725
     - Atleta: 1.9
  */
  export function calculateTDEE(
    bmr: number,
    activityLevel: 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'atleta'
  ): number {
    const factors = {
      sedentario: 1.2,
      leve: 1.375,
      moderado: 1.55,
      intenso: 1.725,
      atleta: 1.9,
    };
    return Math.round(bmr * factors[activityLevel]);
  }
  
  /* ─────────────── 11. SOMATOTIPO (Heath-Carter) ───────────────
     Base: Carter & Heath (1990)
     Versão simplificada por questionário de 10 itens.
  */
  export interface SomatotypeInput {
    // Cada item: 1 (ectomorfo) a 7 (endomorfo)
    // 4 = equilibrado
    bodyBuild: number;      // magro → robusto
    muscle: number;         // pouca → muita
    fat: number;            // pouca → muita
    shoulders: number;      // estreitos → largos
    arms: number;           // finos → grossos
    legs: number;           // finas → grossas
    diet: number;           // come pouco → come muito
    metabolism: number;     // rápido → lento
    strength: number;       // fraca → forte
    activity: number;       // ativo → sedentário
  }
  
  export interface SomatotypeResultData {
    endomorphy: number;
    mesomorphy: number;
    ectomorphy: number;
    dominant: 'Endomorfo' | 'Mesomorfo' | 'Ectomorfo' | 'Equilibrado';
    description: string;
  }
  
  export function calculateSomatotype(
    input: SomatotypeInput
  ): SomatotypeResultData {
    // Normaliza de 1-7 para 0-1
    const norm = (v: number) => (v - 1) / 6;
  
    const endoScore =
      (norm(input.fat) * 0.3 +
        norm(input.diet) * 0.15 +
        (1 - norm(input.metabolism)) * 0.2 +
        norm(input.bodyBuild) * 0.15 +
        norm(input.activity) * 0.2) *
      7;
  
    const mesoScore =
      (norm(input.muscle) * 0.3 +
        norm(input.strength) * 0.25 +
        norm(input.shoulders) * 0.15 +
        norm(input.arms) * 0.15 +
        norm(input.legs) * 0.15) *
      7;
  
    const ectoScore =
      ((1 - norm(input.bodyBuild)) * 0.3 +
        (1 - norm(input.fat)) * 0.2 +
        norm(input.metabolism) * 0.25 +
        (1 - norm(input.muscle)) * 0.15 +
        (1 - norm(input.arms)) * 0.1) *
      7;
  
    const endo = Math.round(endoScore * 10) / 10;
    const meso = Math.round(mesoScore * 10) / 10;
    const ecto = Math.round(ectoScore * 10) / 10;
  
    const max = Math.max(endo, meso, ecto);
    let dominant: SomatotypeResultData['dominant'];
    let description: string;
  
    // Se a diferença for < 0.5, é equilibrado
    const diffs = [endo, meso, ecto].sort((a, b) => b - a);
    if (diffs[0] - diffs[1] < 0.5) {
      dominant = 'Equilibrado';
      description =
        'Você tem características equilibradas dos 3 tipos. Foco em periodização variada.';
    } else if (max === endo) {
      dominant = 'Endomorfo';
      description =
        'Tende a ganhar gordura fácil. Priorize déficit calórico, cardio regular e treino com pesos.';
    } else if (max === meso) {
      dominant = 'Mesomorfo';
      description =
        'Genética favorável pra hipertrofia. Aproveite pra construir músculo com periodização bem planejada.';
    } else {
      dominant = 'Ectomorfo';
      description =
        'Metabolismo acelerado, dificuldade em ganhar massa. Aumente calorias e foque em cargas progressivas.';
    }
  
    return {
      endomorphy: endo,
      mesomorphy: meso,
      ectomorphy: ecto,
      dominant,
      description,
    };
  }