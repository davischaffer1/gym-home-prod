import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { useMemo, useState } from 'react';
import { SubScreen } from './ui';

interface Props {
  onBack: () => void;
}

export default function CalendarView({ onBack }: Props) {
  const [year, setYear] = useState(new Date().getFullYear());

  const sessions = useLiveQuery(
    () => db.sessions.filter((s) => s.finishedAt !== undefined).toArray(),
    []
  );

  const workouts = useLiveQuery(() => db.workouts.toArray(), []);

  // Agrupa sessões por dia (usando data LOCAL)
  const sessionsByDay = useMemo(() => {
    if (!sessions) return new Map<string, typeof sessions>();
    const map = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      if (d.getFullYear() !== year) continue;
      const key = toLocalDateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sessions, year]);

  const { weeks, monthLabels } = useMemo(() => buildYearCalendar(year), [year]);

  const totalThisYear = sessionsByDay.size;

  const maxInDay = Math.max(
    1,
    ...Array.from(sessionsByDay.values()).map((arr) => arr.length)
  );

  function colorFor(count: number) {
    if (count === 0) return 'bg-bg-2';
    const intensity = count / maxInDay;
    if (intensity <= 0.33) return 'bg-accent/20';
    if (intensity <= 0.66) return 'bg-accent/50';
    return 'bg-accent';
  }

  function tooltipFor(dateKey: string) {
    const list = sessionsByDay.get(dateKey) ?? [];
    if (list.length === 0) return `${dateKey}: sem treino`;
    return list
      .map((s) => {
        const w = workouts?.find((x) => x.id === s.workoutId);
        return `💪 ${w?.name ?? 'Treino'}`;
      })
      .join('\n');
  }

  return (
    <SubScreen title="CalendarioVisualizador" onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📅 Calendário</h1>
        <button
          onClick={onBack}
          className="bg-bg-2 hover:bg-zinc-700 px-4 py-2 rounded-lg"
        >
          Voltar
        </button>
      </div>

      {/* Navegação por ano */}
      <div className="flex items-center justify-between bg-bg-1 rounded-2xl p-3">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="bg-bg-2 hover:bg-zinc-700 px-3 py-1 rounded-lg text-sm"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-lg font-bold">{year}</div>
          <div className="text-xs text-text-2">
            {totalThisYear} dia{totalThisYear !== 1 ? 's' : ''} treinado
            {totalThisYear !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={() => setYear((y) => y + 1)}
          disabled={year >= new Date().getFullYear()}
          className="bg-bg-2 hover:bg-zinc-700 disabled:opacity-40 px-3 py-1 rounded-lg text-sm"
        >
          →
        </button>
      </div>

      {/* Calendário */}
      <div className="bg-bg-1 rounded-2xl p-4 overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Rótulos de mês */}
          <div className="flex gap-1 pl-8 mb-1">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-[9px] text-text-3"
                style={{ width: `${m.cols * 14}px` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Grid de semanas */}
          <div className="flex gap-1">
            {/* Dias da semana (Y) */}
            <div className="flex flex-col gap-1 pr-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <div
                  key={i}
                  className="w-3 h-3 text-[8px] text-text-3 flex items-center justify-center"
                >
                  {i % 2 === 1 ? d : ''}
                </div>
              ))}
            </div>

            {/* Semanas */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => {
                  if (!day) {
                    return (
                      <div
                        key={di}
                        className="w-3 h-3 rounded-sm bg-transparent"
                      />
                    );
                  }
                  const key = toLocalDateKey(day);
                  const count = sessionsByDay.get(key)?.length ?? 0;
                  const isFuture = day.getTime() > Date.now();
                  return (
                    <div
                      key={di}
                      title={tooltipFor(key)}
                      className={`w-3 h-3 rounded-sm ${
                        isFuture ? 'bg-bg-2/50' : colorFor(count)
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-end gap-2 text-xs text-text-3">
        <span>menos</span>
        <div className="w-3 h-3 rounded-sm bg-bg-2" />
        <div className="w-3 h-3 rounded-sm bg-emerald-900" />
        <div className="w-3 h-3 rounded-sm bg-accent" />
        <div className="w-3 h-3 rounded-sm bg-accent-hover" />
        <span>mais</span>
      </div>
    </div>
    </SubScreen>
  );

}

/* ============================================================
   Helpers — fora do componente
   ============================================================ */

const MONTH_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function monthName(m: number): string {
  return MONTH_NAMES[m] ?? '';
}

/**
 * Converte Date para string "YYYY-MM-DD" no FUSO LOCAL.
 * Nunca usar .toISOString() aqui — isso força UTC e quebra o calendário
 * quando o usuário treina à noite (Brasil = UTC-3).
 */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildYearCalendar(year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  // Ajusta para começar no domingo
  const startDay = start.getDay();
  const first = new Date(start);
  first.setDate(first.getDate() - startDay);

  const weeks: (Date | null)[][] = [];
  const cursor = new Date(first);
  let currentWeek: (Date | null)[] = [];

  while (cursor <= end) {
    const isInYear = cursor.getFullYear() === year;
    currentWeek.push(isInYear ? new Date(cursor) : null);

    // Fim da semana (sábado)
    if (cursor.getDay() === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  // Semana incompleta no final
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // Rótulos de mês
  const monthLabels: { label: string; cols: number }[] = [];
  for (let m = 0; m < 12; m++) {
    let firstWeekIdx = -1;
    let lastWeekIdx = -1;
    for (let w = 0; w < weeks.length; w++) {
      for (const d of weeks[w]) {
        if (!d) continue;
        if (firstWeekIdx === -1 && d.getMonth() === m && d.getDate() === 1) {
          firstWeekIdx = w;
        }
        if (d.getMonth() === m) {
          lastWeekIdx = w;
        }
      }
    }
    if (firstWeekIdx !== -1 && lastWeekIdx !== -1) {
      monthLabels.push({
        label: monthName(m),
        cols: lastWeekIdx - firstWeekIdx + 1,
      });
    }
  }

  return { weeks, monthLabels };
}
