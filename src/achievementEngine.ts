import { db } from './db';
import { ACHIEVEMENTS, type UserStats } from './achievements';

export async function computeUserStats(): Promise<UserStats> {
  const sessions = await db.sessions.toArray();
  const sets = await db.sets.toArray();
  const exercises = await db.exercises.toArray();
  const workouts = await db.workouts.toArray();

  const finished = sessions.filter((s) => s.finishedAt !== undefined);

  const totalSets = sets.length;
  const totalReps = sets.reduce((a, s) => a + s.reps, 0);
  const totalVolume = sets.reduce((a, s) => a + s.reps * s.weight, 0);
  const totalMinutes = finished.reduce(
    (a, s) =>
      a +
      Math.round(
        (s.finishedAt! - s.startedAt - (s.totalPausedMs ?? 0)) / 60000
      ),
    0
  );

  // Streak atual e máximo
  const { current, max } = computeStreaks(finished.map((s) => s.startedAt));

  // Exercícios / treinos distintos
  const distinctExercises = new Set(sets.map((s) => s.exerciseId)).size;
  const distinctWorkouts = workouts.length;

  // PRs: conta exercícios onde o maior peso foi batido em algum momento
  // Simplificação: conta quantas vezes uma série foi a maior de todas as
  // anteriores daquele exercício
  let totalPRs = 0;
  const setsByExercise = new Map<number, typeof sets>();
  for (const s of sets) {
    if (!setsByExercise.has(s.exerciseId)) setsByExercise.set(s.exerciseId, []);
    setsByExercise.get(s.exerciseId)!.push(s);
  }
  for (const [, list] of setsByExercise) {
    list.sort((a, b) => a.createdAt - b.createdAt);
    let max = 0;
    for (const s of list) {
      if (s.type === 'warmup') continue;
      if (s.weight > max) {
        max = s.weight;
        if (max > 0) totalPRs++;
      }
    }
  }

  // Melhores cargas em exercícios-chave
  let bestBenchPress = 0;
  let bestSquat = 0;
  let bestDeadlift = 0;
  for (const s of sets) {
    const ex = exercises.find((e) => e.id === s.exerciseId);
    if (!ex) continue;
    const n = ex.name.toLowerCase();
    if (n.includes('supino'))
      bestBenchPress = Math.max(bestBenchPress, s.weight);
    if (n.includes('agachamento')) bestSquat = Math.max(bestSquat, s.weight);
    if (n.includes('terra')) bestDeadlift = Math.max(bestDeadlift, s.weight);
  }

  // Treinos por horário
  let earlyBirdSessions = 0;
  let nightOwlSessions = 0;
  let weekendSessions = 0;
  for (const s of finished) {
    const d = new Date(s.startedAt);
    const h = d.getHours();
    const day = d.getDay();
    if (h < 7) earlyBirdSessions++;
    if (h >= 22) nightOwlSessions++;
    if (day === 0 || day === 6) weekendSessions++;
  }

  // Semanas consecutivas com pelo menos 1 treino
  const consecutiveWeeks = computeConsecutiveWeeks(
    finished.map((s) => s.startedAt)
  );

  return {
    totalSessions: finished.length,
    totalSets,
    totalReps,
    totalVolume,
    totalMinutes,
    maxStreak: max,
    currentStreak: current,
    distinctExercises,
    distinctWorkouts,
    totalPRs,
    bestBenchPress,
    bestSquat,
    bestDeadlift,
    earlyBirdSessions,
    nightOwlSessions,
    weekendSessions,
    consecutiveWeeks,
  };
}

export async function checkAndUnlockAchievements(): Promise<string[]> {
  const stats = await computeUserStats();
  const unlocked = await db.achievements.toArray();
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));

  const newlyUnlocked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlockedIds.has(a.id)) continue;
    if (a.check(stats)) {
      await db.achievements.add({
        achievementId: a.id,
        unlockedAt: Date.now(),
      });
      newlyUnlocked.push(a.id);
    }
  }
  return newlyUnlocked;
}

function computeStreaks(timestamps: number[]) {
  const days = new Set(
    timestamps.map((t) => new Date(t).toISOString().slice(0, 10))
  );
  if (days.size === 0) return { current: 0, max: 0 };

  // Ordena dias
  const sorted = Array.from(days).sort();

  // Streak máximo
  let max = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round(
      (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (diff === 1) {
      cur++;
      max = Math.max(max, cur);
    } else {
      cur = 1;
    }
  }

  // Streak atual (a partir de hoje)
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let currentStreak = 0;
  if (days.has(today) || days.has(yesterday)) {
    let cursor = days.has(today) ? today : yesterday;
    while (days.has(cursor)) {
      currentStreak++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    }
  }

  return { current: currentStreak, max };
}

function computeConsecutiveWeeks(timestamps: number[]) {
  if (timestamps.length === 0) return 0;
  const weeks = new Set(
    timestamps.map((t) => {
      const d = new Date(t);
      const onejan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(
        ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7
      );
      return `${d.getFullYear()}-${week}`;
    })
  );
  // Conta a partir da semana atual para trás
  const now = new Date();
  let count = 0;
  for (let i = 0; i < 52; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(
      ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7
    );
    const key = `${d.getFullYear()}-${week}`;
    if (weeks.has(key)) count++;
    else if (i > 0) break;
  }
  return count;
}
