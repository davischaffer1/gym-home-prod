import { useMemo, useState } from 'react';
import {
  EXERCISE_LIBRARY,
  MUSCLE_GROUPS,
  EQUIPMENTS,
  type MuscleGroup,
  type Equipment,
} from './exerciseLibrary';

interface Props {
  onAdd: (name: string, group?: string) => void;
  onClose: () => void;
}

export default function ExercisePicker({ onAdd, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'Todos'>('Todos');
  const [equipment, setEquipment] = useState<Equipment | 'Todos'>('Todos');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISE_LIBRARY.filter((ex) => {
      if (group !== 'Todos' && ex.group !== group) return false;
      if (equipment !== 'Todos' && ex.equipment !== equipment) return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, group, equipment]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-bg-0 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col border border-white/[0.06]">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-white/[0.06] flex justify-between items-center">
          <h2 className="text-lg font-bold">Adicionar exercício</h2>
          <button
            onClick={onClose}
            className="bg-bg-2 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        {/* Busca */}
        <div className="p-4 space-y-3 border-b border-white/[0.06]">
          <input
            autoFocus
            className="w-full bg-bg-1 rounded-lg px-3 py-2 outline-none"
            placeholder="🔍 Buscar exercício..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <Chip
              active={group === 'Todos'}
              onClick={() => setGroup('Todos')}
              label="Todos"
            />
            {MUSCLE_GROUPS.map((g) => (
              <Chip
                key={g}
                active={group === g}
                onClick={() => setGroup(g)}
                label={g}
              />
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <Chip
              active={equipment === 'Todos'}
              onClick={() => setEquipment('Todos')}
              label="Todos"
            />
            {EQUIPMENTS.map((e) => (
              <Chip
                key={e}
                active={equipment === e}
                onClick={() => setEquipment(e)}
                label={e}
              />
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-text-3 py-8 text-sm">
              Nenhum exercício encontrado.
            </p>
          )}
          {filtered.map((ex) => (
            <button
            key={ex.name}
            onClick={() => onAdd(ex.name, ex.group)}
              className="w-full text-left bg-bg-1 hover:bg-bg-2 rounded-lg px-4 py-3 transition flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{ex.name}</div>
                <div className="text-xs text-text-3">
                  {ex.group} · {ex.equipment}
                </div>
              </div>
              <span className="text-accent text-xl">+</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
        active
          ? 'bg-accent text-white'
          : 'bg-bg-2 hover:bg-zinc-700 text-text-1'
      }`}
    >
      {label}
    </button>
  );
}
