import Dexie, { type Table } from 'dexie';

/* ══════════════════════════════════════════════════════════
   TIPOS
   ══════════════════════════════════════════════════════════ */

export interface Workout {
  id?: number;
  name: string;
  createdAt: number;
}

export interface Exercise {
  id?: number;
  workoutId: number;
  name: string;
  order: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetSets?: number;
  note?: string;
  primaryGroup?: string;
  equipment?: string;
  targetRIR?: number;
  useRIR?: boolean;
}

export type SetType =
  | 'normal'
  | 'warmup'
  | 'drop'
  | 'myo'
  | 'restpause'
  | 'cluster'
  | 'failure';

export interface Session {
  id?: number;
  workoutId: number;
  startedAt: number;
  finishedAt?: number;
  notes?: string;
  pausedAt?: number;
  totalPausedMs?: number;
  isDeload?: boolean;
}

export interface SetLog {
  id?: number;
  sessionId: number;
  exerciseId: number;
  setNumber: number;
  reps: number;
  weight: number;
  createdAt: number;
  type?: SetType;
  tutSeconds?: number;
  rpe?: number;
  note?: string;
}

export interface Profile {
  id?: number;
  name: string;
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'M' | 'F';
  restSeconds: number;
  updatedAt: number;
}

export interface UnlockedAchievement {
  id?: number;
  achievementId: string;
  unlockedAt: number;
}

export interface BodyMeasurement {
  id?: number;
  date: number;
  weightKg?: number;
  bodyFatPct?: number;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  armCm?: number;
  thighCm?: number;
  calfCm?: number;
  neckCm?: number;
  shoulderCm?: number;
  note?: string;
}

export interface DailyLog {
  id?: number;
  date: string;
  waterMl?: number;
  proteinG?: number;
  caloriesKcal?: number;
  sleepHours?: number;
  readinessScore?: number;
  mood?: 1 | 2 | 3 | 4 | 5;
  soreness?: 1 | 2 | 3 | 4 | 5;
  stress?: 1 | 2 | 3 | 4 | 5;
}

export interface SomatotypeResult {
  id?: number;
  date: number;
  endomorphy: number;
  mesomorphy: number;
  ectomorphy: number;
}

/* ══════════════════════════════════════════════════════════
   NUTRIÇÃO / DIETA
   ══════════════════════════════════════════════════════════ */

export type MealType =
  | 'cafe'
  | 'lanche1'
  | 'almoco'
  | 'lanche2'
  | 'jantar'
  | 'ceia'
  | 'pre'
  | 'pos';

export type GoalType = 'cutting' | 'maintenance' | 'bulking';

export interface Food {
  id?: number;
  name: string;
  brand?: string;
  category: string;

  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fiberPer100?: number;

  commonUnit?: 'g' | 'ml' | 'unidade';
  commonUnitGrams?: number;

  isFavorite?: boolean;
  isCustom?: boolean;
  createdAt: number;
}

export interface MealEntry {
  id?: number;
  date: string;
  mealType: MealType;
  foodId?: number;
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  createdAt: number;
}

export interface NutritionGoal {
  id?: number;
  goalType: GoalType;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;

  mealDistribution: {
    cafe: number;
    lanche1: number;
    almoco: number;
    lanche2: number;
    jantar: number;
    ceia: number;
  };

  updatedAt: number;
}

/* ══════════════════════════════════════════════════════════
   DB
   ══════════════════════════════════════════════════════════ */

class GymDB extends Dexie {
  workouts!: Table<Workout, number>;
  exercises!: Table<Exercise, number>;
  sessions!: Table<Session, number>;
  sets!: Table<SetLog, number>;
  profile!: Table<Profile, number>;
  meta!: Table<{ id?: number; lastDeloadAt?: number }, number>;
  achievements!: Table<UnlockedAchievement, number>;
  bodyMeasurements!: Table<BodyMeasurement, number>;
  dailyLogs!: Table<DailyLog, number>;
  somatotypes!: Table<SomatotypeResult, number>;

  foods!: Table<Food, number>;
  mealEntries!: Table<MealEntry, number>;
  nutritionGoals!: Table<NutritionGoal, number>;

  constructor() {
    super('gymDB');

    this.version(1).stores({
      workouts: '++id, name, createdAt',
      exercises: '++id, workoutId, order',
      sessions: '++id, workoutId, startedAt',
      sets: '++id, sessionId, exerciseId',
    });

    this.version(2).stores({
      workouts: '++id, name, createdAt',
      exercises: '++id, workoutId, order',
      sessions: '++id, workoutId, startedAt',
      sets: '++id, sessionId, exerciseId',
      profile: '++id',
    });

    this.version(3).stores({
      workouts: '++id, name, createdAt',
      exercises: '++id, workoutId, order',
      sessions: '++id, workoutId, startedAt',
      sets: '++id, sessionId, exerciseId, type',
      profile: '++id',
      meta: '++id',
    });

    this.version(4).stores({
      workouts: '++id, name, createdAt',
      exercises: '++id, workoutId, order, name',
      sessions: '++id, workoutId, startedAt',
      sets: '++id, sessionId, exerciseId, type',
      profile: '++id',
      meta: '++id',
    });

    this.version(5).stores({
      workouts: '++id, name, createdAt',
      exercises: '++id, workoutId, order, name',
      sessions: '++id, workoutId, startedAt',
      sets: '++id, sessionId, exerciseId, type',
      profile: '++id',
      meta: '++id',
      achievements: '++id, achievementId, unlockedAt',
    });

    this.version(6).stores({
      workouts: '++id, name, createdAt',
      exercises: '++id, workoutId, order, name',
      sessions: '++id, workoutId, startedAt',
      sets: '++id, sessionId, exerciseId, type',
      profile: '++id',
      meta: '++id',
      achievements: '++id, achievementId, unlockedAt',
      bodyMeasurements: '++id, date',
      dailyLogs: '++id, date',
      somatotypes: '++id, date',
    });

    this.version(7).stores({
      workouts: '++id, name, createdAt',
      exercises: '++id, workoutId, order, name',
      sessions: '++id, workoutId, startedAt',
      sets: '++id, sessionId, exerciseId, type',
      profile: '++id',
      meta: '++id',
      achievements: '++id, achievementId, unlockedAt',
      bodyMeasurements: '++id, date',
      dailyLogs: '++id, date',
      somatotypes: '++id, date',
      foods: '++id, name, category, isFavorite',
      mealEntries: '++id, date, mealType, foodId',
      nutritionGoals: '++id',
    });
  }
}

export const db = new GymDB();

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.toCollection().first();
}

export async function saveProfile(p: Omit<Profile, 'id' | 'updatedAt'>) {
  const existing = await getProfile();
  const data = { ...p, updatedAt: Date.now() };
  if (existing?.id) {
    await db.profile.update(existing.id, data);
  } else {
    await db.profile.add(data);
  }
}

export async function getLastSet(exerciseId: number) {
  const all = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .reverse()
    .sortBy('createdAt');
  return all[0];
}

export async function getFinishedSessions() {
  const all = await db.sessions
    .filter((s) => s.finishedAt !== undefined)
    .toArray();
  return all.sort((a, b) => b.startedAt - a.startedAt);
}

export async function getExercisePR(exerciseId: number) {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  if (sets.length === 0) return null;
  const maxWeight = Math.max(...sets.map((s) => s.weight));
  const bestSets = sets.filter((s) => s.weight === maxWeight);
  const bestReps = Math.max(...bestSets.map((s) => s.reps));
  return { weight: maxWeight, reps: bestReps };
}