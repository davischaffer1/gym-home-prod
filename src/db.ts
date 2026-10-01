import Dexie, { type Table } from 'dexie';

export type SetType =
  | 'normal'
  | 'warmup' // aquecimento
  | 'drop' // drop-set
  | 'myo' // myo-reps (mini-série)
  | 'restpause' // rest-pause
  | 'cluster' // cluster
  | 'failure'; // falha

export interface Workout {
  id?: number;
  name: string;
  createdAt: number;
}

export interface UnlockedAchievement {
  id?: number;
  achievementId: string;
  unlockedAt: number;
}

export interface Profile {
  id?: number;
  name: string;
  weightKg: number; // peso atual
  heightCm: number;
  age: number;
  sex: 'M' | 'F';
  updatedAt: number;
  restSeconds: number; // ← novo (ex: 90)
}

export interface Exercise {
  id?: number;
  workoutId: number;
  name: string;
  order: number;
  targetRepsMin?: number; // ex: 8
  targetRepsMax?: number; // ex: 12
  targetSets?: number; // ex: 4
  note?: string; // nota permanente ("ombro esquerdo...")
  primaryGroup?: string; // do exercício da biblioteca
  equipment?: string;
  targetRIR?: number;      // 👈 NOVO — RIR alvo (ex: 2)
  useRIR?: boolean;        // 👈 NOVO — toggle por exercício
}

export interface Session {
  id?: number;
  workoutId: number;
  startedAt: number;
  finishedAt?: number;
  notes?: string; // ← novo
  pausedAt?: number; // timestamp de quando pausou
  totalPausedMs?: number; // soma de todas as pausas
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
  type?: SetType; // default "normal"
  tutSeconds?: number; // tempo sob tensão (seg)
  rpe?: number; // 1-10 (opcional)
  note?: string; // nota rápida da série
}

class GymDB extends Dexie {
  workouts!: Table<Workout, number>;
  exercises!: Table<Exercise, number>;
  sessions!: Table<Session, number>;
  sets!: Table<SetLog, number>;
  profile!: Table<Profile, number>; // ← nova
  meta!: Table<{ id?: number; lastDeloadAt?: number }, number>; // 👈 novo
  achievements!: Table<UnlockedAchievement, number>;

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
      sets: '++id, sessionId, exerciseId, type', // 👈 índice novo
      profile: '++id',
      meta: '++id',
    });
    this.version(4).stores({
      workouts: '++id, name, createdAt',
      exercises: '++id, workoutId, order, name', // 👈 name indexado
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
      achievements: '++id, achievementId, unlockedAt', // 👈 novo
    });
  }
}

export const db = new GymDB();

// Pega a última série registrada de um exercício (qualquer sessão)
export async function getLastSet(exerciseId: number) {
  const all = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .reverse()
    .sortBy('createdAt');
  return all[0];
}

// Sessões finalizadas, mais recentes primeiro
export async function getFinishedSessions() {
  const all = await db.sessions
    .filter((s) => s.finishedAt !== undefined)
    .toArray();
  return all.sort((a, b) => b.startedAt - a.startedAt);
}

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

// Retorna o PR (maior carga) de um exercício em qualquer sessão
export async function getExercisePR(exerciseId: number) {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  if (sets.length === 0) return null;
  const maxWeight = Math.max(...sets.map((s) => s.weight));
  const bestSets = sets.filter((s) => s.weight === maxWeight);
  const bestReps = Math.max(...bestSets.map((s) => s.reps));
  return { weight: maxWeight, reps: bestReps };
}
