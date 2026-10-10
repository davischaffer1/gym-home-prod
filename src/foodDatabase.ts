import type { Food } from './db';

/**
 * Base de alimentos brasileiros (TACO + complementos).
 * Valores por 100g (ou 100ml para líquidos).
 * Fonte: Tabela TACO (UNICAMP/NEPA) + USDA.
 */
export const FOOD_DATABASE: Omit<Food, 'id' | 'createdAt'>[] = [
  /* ══════════ PROTEÍNAS ANIMAIS ══════════ */
  { name: 'Frango grelhado (peito)', category: 'proteinas', kcalPer100: 165, proteinPer100: 31, carbsPer100: 0, fatPer100: 3.6, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Frango cozido (coxa)', category: 'proteinas', kcalPer100: 217, proteinPer100: 26, carbsPer100: 0, fatPer100: 12, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Frango frito', category: 'proteinas', kcalPer100: 260, proteinPer100: 28, carbsPer100: 3, fatPer100: 15, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Carne bovina (patinho)', category: 'proteinas', kcalPer100: 219, proteinPer100: 32, carbsPer100: 0, fatPer100: 9, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Carne bovina (contrafilé)', category: 'proteinas', kcalPer100: 278, proteinPer100: 28, carbsPer100: 0, fatPer100: 18, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Carne moída (patinho)', category: 'proteinas', kcalPer100: 212, proteinPer100: 27, carbsPer100: 0, fatPer100: 11, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Picanha', category: 'proteinas', kcalPer100: 289, proteinPer100: 24, carbsPer100: 0, fatPer100: 21, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Porco (lombo)', category: 'proteinas', kcalPer100: 210, proteinPer100: 30, carbsPer100: 0, fatPer100: 10, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Tilápia', category: 'proteinas', kcalPer100: 96, proteinPer100: 20, carbsPer100: 0, fatPer100: 1.7, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Salmão', category: 'proteinas', kcalPer100: 208, proteinPer100: 22, carbsPer100: 0, fatPer100: 13, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Atum (lata, em água)', category: 'proteinas', kcalPer100: 116, proteinPer100: 26, carbsPer100: 0, fatPer100: 1, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Sardinha (lata)', category: 'proteinas', kcalPer100: 165, proteinPer100: 25, carbsPer100: 0, fatPer100: 7, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Ovo de galinha (cozido)', category: 'proteinas', kcalPer100: 146, proteinPer100: 13, carbsPer100: 0.6, fatPer100: 9.5, fiberPer100: 0, commonUnit: 'unidade', commonUnitGrams: 50 },
  { name: 'Ovo frito', category: 'proteinas', kcalPer100: 240, proteinPer100: 14, carbsPer100: 1, fatPer100: 20, fiberPer100: 0, commonUnit: 'unidade', commonUnitGrams: 50 },
  { name: 'Clara de ovo', category: 'proteinas', kcalPer100: 52, proteinPer100: 11, carbsPer100: 0.7, fatPer100: 0.2, fiberPer100: 0, commonUnit: 'g' },

  /* ══════════ CARBOIDRATOS ══════════ */
  { name: 'Arroz branco cozido', category: 'carboidratos', kcalPer100: 128, proteinPer100: 2.5, carbsPer100: 28, fatPer100: 0.2, fiberPer100: 1.6, commonUnit: 'g' },
  { name: 'Arroz integral cozido', category: 'carboidratos', kcalPer100: 124, proteinPer100: 2.6, carbsPer100: 26, fatPer100: 1, fiberPer100: 2.5, commonUnit: 'g' },
  { name: 'Feijão carioca cozido', category: 'carboidratos', kcalPer100: 76, proteinPer100: 4.8, carbsPer100: 13.6, fatPer100: 0.5, fiberPer100: 8.5, commonUnit: 'g' },
  { name: 'Feijão preto cozido', category: 'carboidratos', kcalPer100: 77, proteinPer100: 4.5, carbsPer100: 14, fatPer100: 0.5, fiberPer100: 8.4, commonUnit: 'g' },
  { name: 'Macarrão cozido', category: 'carboidratos', kcalPer100: 102, proteinPer100: 3.5, carbsPer100: 20, fatPer100: 0.9, fiberPer100: 1.6, commonUnit: 'g' },
  { name: 'Batata inglesa cozida', category: 'carboidratos', kcalPer100: 52, proteinPer100: 1.2, carbsPer100: 12, fatPer100: 0, fiberPer100: 1.3, commonUnit: 'g' },
  { name: 'Batata doce cozida', category: 'carboidratos', kcalPer100: 77, proteinPer100: 0.6, carbsPer100: 18.4, fatPer100: 0.1, fiberPer100: 2.2, commonUnit: 'g' },
  { name: 'Mandioca cozida', category: 'carboidratos', kcalPer100: 125, proteinPer100: 0.6, carbsPer100: 30, fatPer100: 0.3, fiberPer100: 1.6, commonUnit: 'g' },
  { name: 'Pão francês', category: 'carboidratos', kcalPer100: 300, proteinPer100: 8, carbsPer100: 58, fatPer100: 3.1, fiberPer100: 2.3, commonUnit: 'unidade', commonUnitGrams: 50 },
  { name: 'Pão de forma integral', category: 'carboidratos', kcalPer100: 253, proteinPer100: 9, carbsPer100: 49, fatPer100: 3.4, fiberPer100: 6.9, commonUnit: 'unidade', commonUnitGrams: 25 },
  { name: 'Pão de forma branco', category: 'carboidratos', kcalPer100: 265, proteinPer100: 8, carbsPer100: 50, fatPer100: 3.5, fiberPer100: 2.3, commonUnit: 'unidade', commonUnitGrams: 25 },
  { name: 'Tapioca (goma)', category: 'carboidratos', kcalPer100: 240, proteinPer100: 0, carbsPer100: 60, fatPer100: 0, fiberPer100: 0.5, commonUnit: 'g' },
  { name: 'Aveia em flocos', category: 'carboidratos', kcalPer100: 394, proteinPer100: 14, carbsPer100: 67, fatPer100: 8, fiberPer100: 10, commonUnit: 'g' },
  { name: 'Granola', category: 'carboidratos', kcalPer100: 470, proteinPer100: 10, carbsPer100: 65, fatPer100: 18, fiberPer100: 7, commonUnit: 'g' },
  { name: 'Cuscuz de milho', category: 'carboidratos', kcalPer100: 113, proteinPer100: 2.4, carbsPer100: 25, fatPer100: 0.7, fiberPer100: 1.6, commonUnit: 'g' },
  { name: 'Milho verde cozido', category: 'carboidratos', kcalPer100: 98, proteinPer100: 3.2, carbsPer100: 22, fatPer100: 1.2, fiberPer100: 4.6, commonUnit: 'g' },
  { name: 'Quinoa cozida', category: 'carboidratos', kcalPer100: 120, proteinPer100: 4.4, carbsPer100: 21, fatPer100: 1.9, fiberPer100: 2.8, commonUnit: 'g' },

  /* ══════════ FRUTAS ══════════ */
  { name: 'Banana prata', category: 'frutas', kcalPer100: 98, proteinPer100: 1.3, carbsPer100: 26, fatPer100: 0.1, fiberPer100: 2, commonUnit: 'unidade', commonUnitGrams: 90 },
  { name: 'Banana nanica', category: 'frutas', kcalPer100: 92, proteinPer100: 1.4, carbsPer100: 24, fatPer100: 0.1, fiberPer100: 1.9, commonUnit: 'unidade', commonUnitGrams: 100 },
  { name: 'Maçã', category: 'frutas', kcalPer100: 56, proteinPer100: 0.3, carbsPer100: 15, fatPer100: 0.2, fiberPer100: 1.3, commonUnit: 'unidade', commonUnitGrams: 130 },
  { name: 'Laranja', category: 'frutas', kcalPer100: 37, proteinPer100: 1, carbsPer100: 9, fatPer100: 0.1, fiberPer100: 0.8, commonUnit: 'unidade', commonUnitGrams: 130 },
  { name: 'Mamão papaia', category: 'frutas', kcalPer100: 40, proteinPer100: 0.5, carbsPer100: 10, fatPer100: 0.1, fiberPer100: 1.8, commonUnit: 'g' },
  { name: 'Manga', category: 'frutas', kcalPer100: 64, proteinPer100: 0.4, carbsPer100: 17, fatPer100: 0.3, fiberPer100: 1.6, commonUnit: 'unidade', commonUnitGrams: 200 },
  { name: 'Abacaxi', category: 'frutas', kcalPer100: 48, proteinPer100: 0.9, carbsPer100: 12.3, fatPer100: 0.1, fiberPer100: 1, commonUnit: 'g' },
  { name: 'Melancia', category: 'frutas', kcalPer100: 33, proteinPer100: 0.9, carbsPer100: 8, fatPer100: 0, fiberPer100: 0.1, commonUnit: 'g' },
  { name: 'Morango', category: 'frutas', kcalPer100: 30, proteinPer100: 0.9, carbsPer100: 6.8, fatPer100: 0.3, fiberPer100: 1.7, commonUnit: 'g' },
  { name: 'Uva', category: 'frutas', kcalPer100: 53, proteinPer100: 0.7, carbsPer100: 13.6, fatPer100: 0.2, fiberPer100: 0.9, commonUnit: 'g' },
  { name: 'Abacate', category: 'frutas', kcalPer100: 96, proteinPer100: 1.2, carbsPer100: 6, fatPer100: 8.4, fiberPer100: 6.3, commonUnit: 'g' },
  { name: 'Kiwi', category: 'frutas', kcalPer100: 51, proteinPer100: 1.3, carbsPer100: 11.5, fatPer100: 0.6, fiberPer100: 2.7, commonUnit: 'unidade', commonUnitGrams: 80 },

  /* ══════════ LATICÍNIOS ══════════ */
  { name: 'Leite integral', category: 'laticinios', kcalPer100: 61, proteinPer100: 3.2, carbsPer100: 4.7, fatPer100: 3.2, fiberPer100: 0, commonUnit: 'ml' },
  { name: 'Leite desnatado', category: 'laticinios', kcalPer100: 35, proteinPer100: 3.4, carbsPer100: 5, fatPer100: 0.2, fiberPer100: 0, commonUnit: 'ml' },
  { name: 'Iogurte natural integral', category: 'laticinios', kcalPer100: 51, proteinPer100: 4.1, carbsPer100: 1.9, fatPer100: 3, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Iogurte grego natural', category: 'laticinios', kcalPer100: 97, proteinPer100: 9, carbsPer100: 3.6, fatPer100: 5, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Queijo mussarela', category: 'laticinios', kcalPer100: 330, proteinPer100: 22, carbsPer100: 3, fatPer100: 25, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Queijo minas frescal', category: 'laticinios', kcalPer100: 264, proteinPer100: 17, carbsPer100: 3.2, fatPer100: 20, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Queijo cottage', category: 'laticinios', kcalPer100: 98, proteinPer100: 11, carbsPer100: 3.4, fatPer100: 4.3, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Requeijão cremoso', category: 'laticinios', kcalPer100: 257, proteinPer100: 7, carbsPer100: 2, fatPer100: 25, fiberPer100: 0, commonUnit: 'g' },

  /* ══════════ SUPLEMENTOS ══════════ */
  { name: 'Whey protein (pó)', category: 'suplementos', kcalPer100: 400, proteinPer100: 80, carbsPer100: 8, fatPer100: 5, fiberPer100: 0, commonUnit: 'g' },

  /* ══════════ LEGUMINOSAS / VEGETAIS ══════════ */
  { name: 'Lentilha cozida', category: 'leguminosas', kcalPer100: 93, proteinPer100: 6.3, carbsPer100: 16.3, fatPer100: 0.5, fiberPer100: 7.9, commonUnit: 'g' },
  { name: 'Grão-de-bico cozido', category: 'leguminosas', kcalPer100: 130, proteinPer100: 7, carbsPer100: 22, fatPer100: 2, fiberPer100: 6, commonUnit: 'g' },
  { name: 'Soja cozida', category: 'leguminosas', kcalPer100: 172, proteinPer100: 17, carbsPer100: 10, fatPer100: 9, fiberPer100: 6, commonUnit: 'g' },
  { name: 'Tofu', category: 'leguminosas', kcalPer100: 76, proteinPer100: 8, carbsPer100: 1.9, fatPer100: 4.8, fiberPer100: 0.3, commonUnit: 'g' },
  { name: 'Brócolis cozido', category: 'vegetais', kcalPer100: 25, proteinPer100: 2.1, carbsPer100: 4.4, fatPer100: 0.5, fiberPer100: 3.4, commonUnit: 'g' },
  { name: 'Couve-flor cozida', category: 'vegetais', kcalPer100: 19, proteinPer100: 1.2, carbsPer100: 4.5, fatPer100: 0.3, fiberPer100: 2.1, commonUnit: 'g' },
  { name: 'Cenoura crua', category: 'vegetais', kcalPer100: 34, proteinPer100: 1.3, carbsPer100: 7.7, fatPer100: 0.2, fiberPer100: 3.2, commonUnit: 'g' },
  { name: 'Tomate', category: 'vegetais', kcalPer100: 15, proteinPer100: 1.1, carbsPer100: 3.1, fatPer100: 0.2, fiberPer100: 1.2, commonUnit: 'unidade', commonUnitGrams: 120 },
  { name: 'Alface', category: 'vegetais', kcalPer100: 11, proteinPer100: 1.3, carbsPer100: 1.7, fatPer100: 0.2, fiberPer100: 1.7, commonUnit: 'g' },
  { name: 'Pepino', category: 'vegetais', kcalPer100: 10, proteinPer100: 0.9, carbsPer100: 2, fatPer100: 0.1, fiberPer100: 1.1, commonUnit: 'g' },
  { name: 'Abobrinha cozida', category: 'vegetais', kcalPer100: 19, proteinPer100: 1.1, carbsPer100: 3.5, fatPer100: 0.2, fiberPer100: 1.1, commonUnit: 'g' },

  /* ══════════ GORDURAS / OLEAGINOSAS ══════════ */
  { name: 'Azeite de oliva', category: 'gorduras', kcalPer100: 884, proteinPer100: 0, carbsPer100: 0, fatPer100: 100, fiberPer100: 0, commonUnit: 'ml' },
  { name: 'Óleo de coco', category: 'gorduras', kcalPer100: 862, proteinPer100: 0, carbsPer100: 0, fatPer100: 100, fiberPer100: 0, commonUnit: 'ml' },
  { name: 'Manteiga', category: 'gorduras', kcalPer100: 726, proteinPer100: 0.4, carbsPer100: 0.1, fatPer100: 82, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Pasta de amendoim', category: 'gorduras', kcalPer100: 588, proteinPer100: 25, carbsPer100: 20, fatPer100: 50, fiberPer100: 8, commonUnit: 'g' },
  { name: 'Amendoim torrado', category: 'gorduras', kcalPer100: 544, proteinPer100: 27, carbsPer100: 20, fatPer100: 44, fiberPer100: 8, commonUnit: 'g' },
  { name: 'Castanha de caju', category: 'gorduras', kcalPer100: 570, proteinPer100: 18, carbsPer100: 29, fatPer100: 46, fiberPer100: 3.7, commonUnit: 'g' },
  { name: 'Castanha do Pará', category: 'gorduras', kcalPer100: 643, proteinPer100: 15, carbsPer100: 15, fatPer100: 63, fiberPer100: 8, commonUnit: 'g' },
  { name: 'Amêndoa', category: 'gorduras', kcalPer100: 581, proteinPer100: 21, carbsPer100: 20, fatPer100: 51, fiberPer100: 12.5, commonUnit: 'g' },
  { name: 'Noz', category: 'gorduras', kcalPer100: 620, proteinPer100: 14, carbsPer100: 14, fatPer100: 59, fiberPer100: 5, commonUnit: 'g' },
  { name: 'Chia (semente)', category: 'gorduras', kcalPer100: 486, proteinPer100: 17, carbsPer100: 42, fatPer100: 31, fiberPer100: 34, commonUnit: 'g' },
  { name: 'Linhaça', category: 'gorduras', kcalPer100: 495, proteinPer100: 18, carbsPer100: 29, fatPer100: 37, fiberPer100: 27, commonUnit: 'g' },

  /* ══════════ BEBIDAS ══════════ */
  { name: 'Café sem açúcar', category: 'bebidas', kcalPer100: 2, proteinPer100: 0.1, carbsPer100: 0.3, fatPer100: 0, fiberPer100: 0, commonUnit: 'ml' },
  { name: 'Café com leite', category: 'bebidas', kcalPer100: 40, proteinPer100: 2, carbsPer100: 4, fatPer100: 1.5, fiberPer100: 0, commonUnit: 'ml' },
  { name: 'Suco de laranja natural', category: 'bebidas', kcalPer100: 45, proteinPer100: 0.7, carbsPer100: 10.4, fatPer100: 0.2, fiberPer100: 0.2, commonUnit: 'ml' },
  { name: 'Água de coco', category: 'bebidas', kcalPer100: 22, proteinPer100: 0, carbsPer100: 5.3, fatPer100: 0, fiberPer100: 0, commonUnit: 'ml' },
  { name: 'Refrigerante cola', category: 'bebidas', kcalPer100: 42, proteinPer100: 0, carbsPer100: 10.6, fatPer100: 0, fiberPer100: 0, commonUnit: 'ml' },
  { name: 'Cerveja', category: 'bebidas', kcalPer100: 43, proteinPer100: 0.5, carbsPer100: 3.6, fatPer100: 0, fiberPer100: 0, commonUnit: 'ml' },

  /* ══════════ DOCES / SNACKS ══════════ */
  { name: 'Chocolate ao leite', category: 'doces', kcalPer100: 540, proteinPer100: 7.2, carbsPer100: 59, fatPer100: 30, fiberPer100: 2.5, commonUnit: 'g' },
  { name: 'Chocolate amargo 70%', category: 'doces', kcalPer100: 598, proteinPer100: 8, carbsPer100: 46, fatPer100: 43, fiberPer100: 11, commonUnit: 'g' },
  { name: 'Biscoito recheado', category: 'doces', kcalPer100: 480, proteinPer100: 6, carbsPer100: 68, fatPer100: 20, fiberPer100: 2, commonUnit: 'g' },
  { name: 'Açúcar refinado', category: 'doces', kcalPer100: 387, proteinPer100: 0, carbsPer100: 100, fatPer100: 0, fiberPer100: 0, commonUnit: 'g' },
  { name: 'Mel', category: 'doces', kcalPer100: 309, proteinPer100: 0.4, carbsPer100: 84, fatPer100: 0, fiberPer100: 0.3, commonUnit: 'g' },
];

/**
 * Popula a tabela `foods` com a base TACO.
 * Só roda se a tabela estiver vazia.
 */
export async function seedFoodDatabase(db: any) {
  const count = await db.foods.count();
  if (count > 0) return { seeded: false, count };

  const now = Date.now();
  const foods = FOOD_DATABASE.map((f) => ({
    ...f,
    isCustom: false,
    isFavorite: false,
    createdAt: now,
  }));

  await db.foods.bulkAdd(foods);
  return { seeded: true, count: foods.length };
}

/* ────────── Categorias ────────── */
export const FOOD_CATEGORIES = [
  { id: 'proteinas', label: 'Proteínas', icon: '🥩' },
  { id: 'carboidratos', label: 'Carboidratos', icon: '🍚' },
  { id: 'frutas', label: 'Frutas', icon: '🍎' },
  { id: 'vegetais', label: 'Vegetais', icon: '🥦' },
  { id: 'laticinios', label: 'Laticínios', icon: '🥛' },
  { id: 'leguminosas', label: 'Leguminosas', icon: '🫘' },
  { id: 'gorduras', label: 'Gorduras', icon: '🥑' },
  { id: 'bebidas', label: 'Bebidas', icon: '🥤' },
  { id: 'doces', label: 'Doces', icon: '🍫' },
  { id: 'suplementos', label: 'Suplementos', icon: '💊' },
];

export const MEAL_LABELS: Record<string, { label: string; icon: string }> = {
  cafe: { label: 'Café da manhã', icon: '🍳' },
  lanche1: { label: 'Lanche da manhã', icon: '🍎' },
  almoco: { label: 'Almoço', icon: '🍽️' },
  lanche2: { label: 'Lanche da tarde', icon: '🥪' },
  jantar: { label: 'Jantar', icon: '🍲' },
  ceia: { label: 'Ceia', icon: '🌙' },
  pre: { label: 'Pré-treino', icon: '⚡' },
  pos: { label: 'Pós-treino', icon: '💪' },
};