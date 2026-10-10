import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Food } from './db';
import { FOOD_CATEGORIES, MEAL_LABELS } from './foodDatabase';
import { searchFoods, calcMacrosForQuantity } from './nutrition';
import { Modal, Button, Input, Chip, Badge } from './ui';
import { PunchButton } from './Motion';

interface Props {
  onAdd: (entry: {
    foodId: number;
    foodName: string;
    quantityG: number;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }) => void;
  onClose: () => void;
  mealType: string;
}

export default function FoodPicker({ onAdd, onClose, mealType }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');

  const foods = useLiveQuery(() => searchFoods(query, 100), [query]);

  const filtered = foods?.filter((f) => {
    if (!category) return true;
    return f.category === category;
  });

  const mealInfo = MEAL_LABELS[mealType] ?? { label: 'Refeição', icon: '🍽️' };

  async function handleSelect(food: Food) {
    setSelectedFood(food);
    // Pré-preenche com a unidade comum
    if (food.commonUnit === 'unidade' && food.commonUnitGrams) {
      setQuantity(String(food.commonUnitGrams));
    } else {
      setQuantity('100');
    }
  }

  function handleAdd() {
    if (!selectedFood) return;
    const q = parseFloat(quantity.replace(',', '.'));
    if (!q || q <= 0) return;

    const macros = calcMacrosForQuantity(selectedFood, q);

    onAdd({
      foodId: selectedFood.id!,
      foodName: selectedFood.name,
      quantityG: q,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber,
    });

    // Reseta pra permitir adicionar outro
    setSelectedFood(null);
    setQuery('');
  }

  // ═══ TELA DE ADICIONAR QUANTIDADE ═══
  if (selectedFood) {
    const q = parseFloat(quantity.replace(',', '.')) || 0;
    const macros = calcMacrosForQuantity(selectedFood, q);

    return (
      <Modal onClose={onClose} title="Adicionar alimento">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div>
            <div className="text-base font-bold font-display text-text-0">
              {selectedFood.name}
            </div>
            {selectedFood.brand && (
              <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-wider mt-0.5">
                {selectedFood.brand}
              </div>
            )}
          </div>

          {/* Quantidade */}
          <div>
            <label className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold">
              Quantidade
            </label>
            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 bg-bg-2 border border-white/[0.06] rounded-2xl px-4 py-3 text-base text-text-0 outline-none focus:border-accent/50 font-mono-ui text-center font-bold"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
              <div className="flex items-center px-3 text-text-3 font-mono-ui uppercase tracking-wider text-xs">
                {selectedFood.commonUnit === 'ml' ? 'ml' : 'g'}
              </div>
            </div>

            {/* Atalhos de quantidade */}
            {selectedFood.commonUnit === 'unidade' &&
              selectedFood.commonUnitGrams && (
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setQuantity(
                          String(n * (selectedFood.commonUnitGrams ?? 100))
                        )
                      }
                      className="flex-1 bg-bg-2 border border-white/[0.04] rounded-xl py-2 text-xs text-text-2 hover:bg-bg-3 active:scale-95 transition-all font-mono-ui"
                    >
                      {n} un = {n * (selectedFood.commonUnitGrams ?? 100)}g
                    </button>
                  ))}
                </div>
              )}

            {selectedFood.commonUnit !== 'unidade' && (
              <div className="flex gap-2 mt-2">
                {[50, 100, 150, 200].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuantity(String(n))}
                    className="flex-1 bg-bg-2 border border-white/[0.04] rounded-xl py-2 text-xs text-text-2 hover:bg-bg-3 active:scale-95 transition-all font-mono-ui"
                  >
                    {n}g
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Macros calculados */}
          <div className="bg-bg-2 border border-white/[0.04] rounded-2xl p-4 space-y-3">
            <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold">
              Valores nutricionais
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-sm text-text-2">Calorias</span>
              <span className="text-2xl font-bold font-mono-ui text-accent">
                {macros.kcal}
                <span className="text-xs text-text-3 ml-1">kcal</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.04]">
              <MacroPill label="Proteína" value={macros.protein} color="text-accent" />
              <MacroPill label="Carbo" value={macros.carbs} color="text-info" />
              <MacroPill label="Gordura" value={macros.fat} color="text-sci" />
            </div>

            {macros.fiber > 0 && (
              <div className="text-[10px] text-text-3 font-mono-ui text-center pt-2 border-t border-white/[0.04]">
                Fibra: {macros.fiber}g
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setSelectedFood(null)}
              className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] py-3.5 rounded-2xl font-bold font-display active:scale-[0.98] transition-all text-text-1"
            >
              ← Voltar
            </button>
            <PunchButton
              onClick={handleAdd}
              className="flex-1 bg-accent hover:bg-accent-hover text-black py-3.5 rounded-2xl font-bold font-display shadow-glow-accent"
            >
              Adicionar
            </PunchButton>
          </div>
        </div>
      </Modal>
    );
  }

  // ═══ LISTA DE BUSCA ═══
  return (
    <Modal onClose={onClose} title={`${mealInfo.icon} ${mealInfo.label}`}>
      <div className="p-4 space-y-3">
        {/* Busca */}
        <Input
          value={query}
          onChange={setQuery}
          placeholder="🔍 Buscar alimento..."
          autoFocus
        />

        {/* Categorias */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          <Chip
            active={category === null}
            onClick={() => setCategory(null)}
            size="sm"
          >
            Todos
          </Chip>
          {FOOD_CATEGORIES.map((cat) => (
            <Chip
              key={cat.id}
              active={category === cat.id}
              onClick={() => setCategory(cat.id)}
              size="sm"
            >
              {cat.icon} {cat.label}
            </Chip>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {filtered?.length === 0 && (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-text-3 text-xs font-mono-ui uppercase tracking-wider">
                Nenhum alimento encontrado
              </p>
            </div>
          )}

          {filtered?.map((food) => (
            <button
              key={food.id}
              onClick={() => handleSelect(food)}
              className="w-full text-left bg-bg-2 hover:bg-bg-3 border border-white/[0.04] rounded-2xl px-3 py-2.5 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text-0 truncate">
                    {food.name}
                  </div>
                  <div className="text-[10px] text-text-3 font-mono-ui mt-0.5">
                    {food.category}
                    {food.commonUnit === 'unidade' &&
                      ` · ${food.commonUnitGrams}g un`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold font-mono-ui text-accent">
                    {food.kcalPer100} kcal
                  </div>
                  <div className="text-[9px] text-text-3 font-mono-ui">
                    /100g
                  </div>
                </div>
              </div>

              {/* Macros mini */}
              <div className="flex gap-3 mt-1.5 text-[10px] font-mono-ui">
                <span className="text-accent">P {food.proteinPer100}g</span>
                <span className="text-info">C {food.carbsPer100}g</span>
                <span className="text-sci">G {food.fatPer100}g</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function MacroPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-sm font-bold font-mono-ui ${color}`}>
        {Math.round(value * 10) / 10}g
      </div>
      <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mt-0.5">
        {label}
      </div>
    </div>
  );
}