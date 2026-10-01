export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category:
    | 'inicio'
    | 'volume'
    | 'forca'
    | 'consistencia'
    | 'variedade'
    | 'especial';
  check: (stats: UserStats) => boolean;
  progress?: (stats: UserStats) => { current: number; target: number };
}

export interface UserStats {
  totalSessions: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number; // kg
  totalMinutes: number;
  maxStreak: number;
  currentStreak: number;
  distinctExercises: number;
  distinctWorkouts: number;
  totalPRs: number;
  bestBenchPress?: number; // opcional, se tiver nome parecido
  bestSquat?: number;
  bestDeadlift?: number;
  earlyBirdSessions: number; // treinos antes das 7h
  nightOwlSessions: number; // treinos depois das 22h
  weekendSessions: number;
  consecutiveWeeks: number; // semanas seguidas treinando
}

export const ACHIEVEMENTS: Achievement[] = [
  // ---------- INÍCIO ----------
  {
    id: 'first_workout',
    name: 'Primeiro Passo',
    description: 'Complete seu primeiro treino',
    icon: '🎯',
    category: 'inicio',
    check: (s) => s.totalSessions >= 1,
    progress: (s) => ({ current: Math.min(s.totalSessions, 1), target: 1 }),
  },
  {
    id: 'first_week',
    name: 'Semana Completa',
    description: 'Treine 3 vezes na primeira semana',
    icon: '📅',
    category: 'inicio',
    check: (s) => s.totalSessions >= 3,
    progress: (s) => ({ current: Math.min(s.totalSessions, 3), target: 3 }),
  },

  // ---------- CONSISTÊNCIA ----------
  {
    id: 'streak_3',
    name: 'Pegando o Ritmo',
    description: '3 dias consecutivos treinando',
    icon: '🔥',
    category: 'consistencia',
    check: (s) => s.maxStreak >= 3,
    progress: (s) => ({ current: Math.min(s.maxStreak, 3), target: 3 }),
  },
  {
    id: 'streak_7',
    name: 'Uma Semana Forte',
    description: '7 dias consecutivos treinando',
    icon: '🔥🔥',
    category: 'consistencia',
    check: (s) => s.maxStreak >= 7,
    progress: (s) => ({ current: Math.min(s.maxStreak, 7), target: 7 }),
  },
  {
    id: 'streak_30',
    name: 'Mês de Ferro',
    description: '30 dias consecutivos treinando',
    icon: '💎',
    category: 'consistencia',
    check: (s) => s.maxStreak >= 30,
    progress: (s) => ({ current: Math.min(s.maxStreak, 30), target: 30 }),
  },
  {
    id: 'sessions_10',
    name: '10 Treinos',
    description: 'Complete 10 treinos',
    icon: '🥉',
    category: 'consistencia',
    check: (s) => s.totalSessions >= 10,
    progress: (s) => ({ current: Math.min(s.totalSessions, 10), target: 10 }),
  },
  {
    id: 'sessions_50',
    name: '50 Treinos',
    description: 'Complete 50 treinos',
    icon: '🥈',
    category: 'consistencia',
    check: (s) => s.totalSessions >= 50,
    progress: (s) => ({ current: Math.min(s.totalSessions, 50), target: 50 }),
  },
  {
    id: 'sessions_100',
    name: 'Centurião',
    description: 'Complete 100 treinos',
    icon: '🥇',
    category: 'consistencia',
    check: (s) => s.totalSessions >= 100,
    progress: (s) => ({ current: Math.min(s.totalSessions, 100), target: 100 }),
  },
  {
    id: 'sessions_365',
    name: 'Lenda',
    description: 'Complete 365 treinos',
    icon: '👑',
    category: 'consistencia',
    check: (s) => s.totalSessions >= 365,
    progress: (s) => ({ current: Math.min(s.totalSessions, 365), target: 365 }),
  },

  // ---------- VOLUME ----------
  {
    id: 'volume_1t',
    name: 'Primeira Tonelada',
    description: 'Levante 1.000 kg no total',
    icon: '📦',
    category: 'volume',
    check: (s) => s.totalVolume >= 1000,
    progress: (s) => ({ current: Math.min(s.totalVolume, 1000), target: 1000 }),
  },
  {
    id: 'volume_10t',
    name: '10 Toneladas',
    description: 'Levante 10.000 kg no total',
    icon: '🚚',
    category: 'volume',
    check: (s) => s.totalVolume >= 10000,
    progress: (s) => ({
      current: Math.min(s.totalVolume, 10000),
      target: 10000,
    }),
  },
  {
    id: 'volume_100t',
    name: 'Cem Toneladas',
    description: 'Levante 100.000 kg no total',
    icon: '🏗',
    category: 'volume',
    check: (s) => s.totalVolume >= 100000,
    progress: (s) => ({
      current: Math.min(s.totalVolume, 100000),
      target: 100000,
    }),
  },
  {
    id: 'volume_1000t',
    name: 'Mil Toneladas',
    description: 'Levante 1.000.000 kg no total',
    icon: '🛳',
    category: 'volume',
    check: (s) => s.totalVolume >= 1000000,
    progress: (s) => ({
      current: Math.min(s.totalVolume, 1000000),
      target: 1000000,
    }),
  },
  {
    id: 'sets_500',
    name: '500 Séries',
    description: 'Complete 500 séries',
    icon: '🔁',
    category: 'volume',
    check: (s) => s.totalSets >= 500,
    progress: (s) => ({ current: Math.min(s.totalSets, 500), target: 500 }),
  },
  {
    id: 'reps_10000',
    name: '10.000 Repetições',
    description: 'Complete 10.000 repetições',
    icon: '🔢',
    category: 'volume',
    check: (s) => s.totalReps >= 10000,
    progress: (s) => ({ current: Math.min(s.totalReps, 10000), target: 10000 }),
  },

  // ---------- FORÇA ----------
  {
    id: 'pr_first',
    name: 'Primeiro Recorde',
    description: 'Bata seu primeiro PR',
    icon: '🏆',
    category: 'forca',
    check: (s) => s.totalPRs >= 1,
    progress: (s) => ({ current: Math.min(s.totalPRs, 1), target: 1 }),
  },
  {
    id: 'pr_10',
    name: 'Caçador de PRs',
    description: 'Bata 10 PRs',
    icon: '🎖',
    category: 'forca',
    check: (s) => s.totalPRs >= 10,
    progress: (s) => ({ current: Math.min(s.totalPRs, 10), target: 10 }),
  },
  {
    id: 'bench_100',
    name: 'Supino 100 kg',
    description: 'Faça supino com 100 kg',
    icon: '💪',
    category: 'forca',
    check: (s) => (s.bestBenchPress ?? 0) >= 100,
  },
  {
    id: 'squat_140',
    name: 'Agachamento 140 kg',
    description: 'Faça agachamento com 140 kg',
    icon: '🦵',
    category: 'forca',
    check: (s) => (s.bestSquat ?? 0) >= 140,
  },
  {
    id: 'deadlift_180',
    name: 'Terra 180 kg',
    description: 'Faça levantamento terra com 180 kg',
    icon: '⚡',
    category: 'forca',
    check: (s) => (s.bestDeadlift ?? 0) >= 180,
  },

  // ---------- VARIEDADE ----------
  {
    id: 'exercises_10',
    name: 'Explorador',
    description: 'Faça 10 exercícios diferentes',
    icon: '🧭',
    category: 'variedade',
    check: (s) => s.distinctExercises >= 10,
    progress: (s) => ({
      current: Math.min(s.distinctExercises, 10),
      target: 10,
    }),
  },
  {
    id: 'exercises_30',
    name: 'Colecionador',
    description: 'Faça 30 exercícios diferentes',
    icon: '🗺',
    category: 'variedade',
    check: (s) => s.distinctExercises >= 30,
    progress: (s) => ({
      current: Math.min(s.distinctExercises, 30),
      target: 30,
    }),
  },
  {
    id: 'workouts_5',
    name: 'Arquiteto',
    description: 'Crie 5 treinos diferentes',
    icon: '📐',
    category: 'variedade',
    check: (s) => s.distinctWorkouts >= 5,
    progress: (s) => ({ current: Math.min(s.distinctWorkouts, 5), target: 5 }),
  },

  // ---------- ESPECIAL ----------
  {
    id: 'early_bird',
    name: 'Madrugador',
    description: 'Treine 5 vezes antes das 7h',
    icon: '🌅',
    category: 'especial',
    check: (s) => s.earlyBirdSessions >= 5,
    progress: (s) => ({ current: Math.min(s.earlyBirdSessions, 5), target: 5 }),
  },
  {
    id: 'night_owl',
    name: 'Coruja',
    description: 'Treine 5 vezes depois das 22h',
    icon: '🌙',
    category: 'especial',
    check: (s) => s.nightOwlSessions >= 5,
    progress: (s) => ({ current: Math.min(s.nightOwlSessions, 5), target: 5 }),
  },
  {
    id: 'weekend_warrior',
    name: 'Guerreiro de Fim de Semana',
    description: 'Treine 10 vezes no fim de semana',
    icon: '🏖',
    category: 'especial',
    check: (s) => s.weekendSessions >= 10,
    progress: (s) => ({ current: Math.min(s.weekendSessions, 10), target: 10 }),
  },
  {
    id: 'consecutive_weeks_4',
    name: 'Mês Perfeito',
    description: 'Treine 4 semanas consecutivas',
    icon: '📆',
    category: 'especial',
    check: (s) => s.consecutiveWeeks >= 4,
    progress: (s) => ({ current: Math.min(s.consecutiveWeeks, 4), target: 4 }),
  },
];
