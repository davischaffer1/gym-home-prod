import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type GoalType } from './db';
import { calculateMacros, updateGoal } from './nutrition';
import { SubScreen, Card, Button, Input, Badge } from './ui';
import { StaggerItem, PunchButton } from './Motion';

interface Props {
  onBack: () => void;
}

export default function NutritionGoalView({ onBack }: Props) {
  const profile = useLiveQuery(() => db.profile.toCollection().first(), []);
  const goal = useLiveQuery(() => db.nutritionGoals.toCollection().first(), []);

  const [goalType, setGoalType] = useState<GoalType>('maintenance');
  const [activity, setActivity] = useState<
    'sedentario' | 'leve' | 'moderado' | 'intenso' | 'atleta'
  >('moderado');

  useEffect(() => {
    if (goal) {
      setGoalType(goal.goalType);
    }
  }, [goal]);

  const calculated = (() => {
    if (!profile?.weightKg || !profile?.heightCm || !profile?.age || !profile?.sex)
      return null;
    return calculateMacros(
      profile.weightKg,
      profile.heightCm,
      profile.age,
      profile.sex,
      activity,
      goalType
    );
  })();

  async function handleSave() {
    if (!calculated || !goal) return;
    await updateGoal(goal.id!, {
      goalType,
      targetKcal: calculated.kcal,
      targetProtein: calculated.protein,
      targetCarbs: calculated.carbs,
      targetFat: calculated.fat,
      targetFiber: calculated.fiber,
    });
    onBack();
  }

  if (!profile?.weightKg) {
    return (
      <SubScreen title="Metas Nutricionais" onBack={onBack}>
        <Card variant="glass">
          <p className="text-text-3 text-sm text-center py-10 font-mono-ui text-[11px] uppercase tracking-wider">
            Preencha peso, altura, idade e sexo no Perfil primeiro
          </p>
        </Card>
      </SubScreen>
    );
  }

  return (
    <SubScreen title="Metas Nutricionais" onBack={onBack}>
      {/* Objetivo */}
      <StaggerItem delay={0}>
        <Card className="mb-4">
          <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold mb-3">
            🎯 Objetivo
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'cutting', label: 'Cutting', emoji: '📉', sub: 'Perder gordura' },
                { id: 'maintenance', label: 'Manter', emoji: '⚖️', sub: 'Recomposição' },
                { id: 'bulking', label: 'Bulking', emoji: '📈', sub: 'Ganhar massa' },
              ] as { id: GoalType; label: string; emoji: string; sub: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setGoalType(opt.id)}
                className={`rounded-2xl p-3 text-center transition-all active:scale-95 border ${
                  goalType === opt.id
                    ? 'bg-accent-dim border-accent/40 shadow-glow-accent'
                    : 'bg-bg-1 border-white/[0.06] hover:bg-bg-2'
                }`}
              >
                <div className="text-2xl mb-1">{opt.emoji}</div>
                <div
                  className={`text-xs font-bold font-display ${
                    goalType === opt.id ? 'text-accent' : 'text-text-0'
                  }`}
                >
                  {opt.label}
                </div>
                <div className="text-[9px] text-text-3 font-mono-ui mt-0.5">
                  {opt.sub}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </StaggerItem>

      {/* Nível de atividade */}
      <StaggerItem delay={0.05}>
        <Card className="mb-4">
          <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold mb-3">
            🏃 Nível de Atividade
          </div>
          <div className="space-y-1.5">
            {(
              [
                { id: 'sedentario', label: 'Sedentário', sub: 'Sem exercício' },
                { id: 'leve', label: 'Leve', sub: '1-3× semana' },
                { id: 'moderado', label: 'Moderado', sub: '3-5× semana' },
                { id: 'intenso', label: 'Intenso', sub: '6-7× semana' },
                { id: 'atleta', label: 'Atleta', sub: '2× por dia' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActivity(opt.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all active:scale-[0.99] flex items-center justify-between ${
                  activity === opt.id
                    ? 'bg-accent-dim border border-accent/40'
                    : 'bg-bg-2 border border-white/[0.04] hover:bg-bg-3'
                }`}
              >
                <div>
                  <div
                    className={`text-sm font-medium ${
                      activity === opt.id ? 'text-accent' : 'text-text-0'
                    }`}
                  >
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-text-3 font-mono-ui mt-0.5">
                    {opt.sub}
                  </div>
                </div>
                {activity === opt.id && (
                  <span className="text-accent">●</span>
                )}
              </button>
            ))}
          </div>
        </Card>
      </StaggerItem>

      {/* Preview das metas */}
      {calculated && (
        <StaggerItem delay={0.1}>
          <Card variant="accent" glow className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] text-accent font-mono-ui uppercase tracking-[0.15em] font-bold">
                ✦ Metas Calculadas
              </div>
              <Badge variant="accent">
                {goalType === 'cutting'
                  ? '-20%'
                  : goalType === 'bulking'
                  ? '+15%'
                  : 'TDEE'}
              </Badge>
            </div>

            <div className="text-center py-2 mb-3">
              <div className="text-4xl font-bold font-mono-ui text-accent">
                {calculated.kcal}
              </div>
              <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-wider mt-1">
                kcal / dia
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.04]">
              <MacroBox label="Proteína" value={calculated.protein} color="accent" />
              <MacroBox label="Carbo" value={calculated.carbs} color="info" />
              <MacroBox label="Gordura" value={calculated.fat} color="sci" />
            </div>

            <div className="text-[10px] text-text-3 font-mono-ui text-center mt-3 pt-2 border-t border-white/[0.04]">
              Fibra alvo: {calculated.fiber}g
            </div>
          </Card>
        </StaggerItem>
      )}

      {/* Info científica */}
      <StaggerItem delay={0.15}>
        <Card variant="glass" className="mb-4">
          <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold mb-2">
            📚 Base científica
          </div>
          <div className="text-[10px] text-text-3 space-y-1 font-mono-ui">
            <div>• TMB: Mifflin-St Jeor (1990)</div>
            <div>• Proteína: Morton et al. (2018)</div>
            <div>• Gordura: Helms et al. (2014)</div>
            <div>• Fibra: USDA Dietary Guidelines</div>
          </div>
        </Card>
      </StaggerItem>

      <PunchButton
        onClick={handleSave}
        disabled={!calculated}
        className="w-full bg-accent hover:bg-accent-hover text-black py-4 rounded-2xl font-bold font-display shadow-glow-accent disabled:opacity-40"
      >
        Salvar Metas
      </PunchButton>
    </SubScreen>
  );
}

function MacroBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'accent' | 'info' | 'sci';
}) {
  const textColor = {
    accent: 'text-accent',
    info: 'text-info',
    sci: 'text-sci',
  }[color];

  return (
    <div className="text-center">
      <div className={`text-xl font-bold font-mono-ui ${textColor}`}>
        {value}g
      </div>
      <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mt-0.5">
        {label}
      </div>
    </div>
  );
}