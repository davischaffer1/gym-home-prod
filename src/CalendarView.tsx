import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { useMemo, useState } from 'react';
import { SubScreen } from './ui';
import { Icon } from './Icon';

interface Props {
  bottomNav?: ReactNode;
  onBack: () => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function CalendarView({ onBack, bottomNav }: Props) {
  const [year, setYear] = useState(new Date().getFullYear());

  const sessions = useLiveQuery(
    () => db.sessions.filter((s) => s.finishedAt !== undefined).toArray(),
    []
  );

  const workouts = useLiveQuery(() => db.workouts.toArray(), []);

  // Agrupa sessões por dia (usando data LOCAL)
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, NonNullable<typeof sessions>>();
    if (!sessions) return map;
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      if (d.getFullYear() !== year) continue;
      const key = toLocalDateKey(d);
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    return map;
  }, [sessions, year]);

  const totalThisYear = sessionsByDay.size;

  const maxInDay = Math.max(
    1,
    ...Array.from(sessionsByDay.values()).map((arr) => arr.length)
  );

  function colorFor(count: number) {
    if (count === 0) return 'bg-bg-2';
    const intensity = count / maxInDay;
    if (intensity <= 0.33) return 'bg-accent/25';
    if (intensity <= 0.66) return 'bg-accent/60';
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

  const today = new Date();
  const todayKey = toLocalDateKey(today);

  return (
    <SubScreen title="Calendário" onBack={onBack} bottomNav={bottomNav}>
      <div className="space-y-4">
        {/* Navegação por ano */}
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-bg-1 p-3">
          <button
            onClick={() => setYear((y) => y - 1)}
            aria-label="Ano anterior"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-text-1 active:scale-95"
          >
            <span className="rotate-180">
              <Icon name="chevron-right" size={18} />
            </span>
          </button>

          <div className="text-center">
            <div className="font-display text-lg font-bold text-text-0">
              {year}
            </div>
            <div className="font-mono-ui text-[11px] uppercase tracking-wider text-text-3">
              {totalThisYear === 0
                ? 'nenhum treino'
                : `${totalThisYear} ${totalThisYear === 1 ? 'dia treinado' : 'dias treinados'}`}
            </div>
          </div>

          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= today.getFullYear()}
            aria-label="Próximo ano"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-text-1 active:scale-95 disabled:opacity-30"
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </div>

        {/* 12 meses em grade — cabe em 390px sem rolagem horizontal */}
        <div className="grid grid-cols-2 gap-3">
          {MONTH_NAMES.map((name, month) => (
            <MonthBlock
              key={name}
              year={year}
              month={month}
              name={name}
              sessionsByDay={sessionsByDay}
              colorFor={colorFor}
              tooltipFor={tooltipFor}
              todayKey={todayKey}
            />
          ))}
        </div>

        {/* Legenda — mesmas classes que colorFor usa */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <span className="font-mono-ui text-[11px] uppercase tracking-wider text-text-3">
            menos
          </span>
          <span className="h-3 w-3 rounded-sm bg-bg-2" />
          <span className="h-3 w-3 rounded-sm bg-accent/25" />
          <span className="h-3 w-3 rounded-sm bg-accent/60" />
          <span className="h-3 w-3 rounded-sm bg-accent" />
          <span className="font-mono-ui text-[11px] uppercase tracking-wider text-text-3">
            mais
          </span>
        </div>
      </div>
    </SubScreen>
  );
}

/* ────────── um mês ────────── */

function MonthBlock({
  year,
  month,
  name,
  sessionsByDay,
  colorFor,
  tooltipFor,
  todayKey,
}: {
  year: number;
  month: number;
  name: string;
  sessionsByDay: Map<string, unknown[]>;
  colorFor: (count: number) => string;
  tooltipFor: (dateKey: string) => string;
  todayKey: string;
}) {
  const cells = useMemo(() => buildMonth(year, month), [year, month]);
  const trained = cells.reduce((acc, d) => {
    if (!d) return acc;
    return acc + (sessionsByDay.get(toLocalDateKey(d))?.length ?? 0);
  }, 0);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-bg-1 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono-ui text-[11px] font-bold uppercase tracking-wider text-text-1">
          {name.slice(0, 3)}
        </span>
        {trained > 0 && (
          <span className="font-mono-ui text-[10px] text-accent">{trained}</span>
        )}
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_INITIALS.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="text-center font-mono-ui text-[9px] text-text-3"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const key = toLocalDateKey(day);
          const count = sessionsByDay.get(key)?.length ?? 0;
          const isFuture = day.getTime() > Date.now();
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              title={tooltipFor(key)}
              aria-label={
                count > 0
                  ? `${day.getDate()}: ${count} treino(s)`
                  : `${day.getDate()}: sem treino`
              }
              className={`aspect-square rounded-[4px] ${
                isFuture ? 'bg-bg-2/40' : colorFor(count)
              } ${isToday ? 'ring-1 ring-accent ring-offset-1 ring-offset-bg-1' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ────────── helpers ────────── */

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

/** Grade do mês: começa no domingo, com null nos espaços vazios. */
function buildMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}
