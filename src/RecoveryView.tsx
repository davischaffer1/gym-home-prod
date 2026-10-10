import { useLiveQuery } from 'dexie-react-hooks';
import { SubScreen, Card, SectionTitle, Badge } from './ui';
import {
  calculateRecoveryByGroup,
  suggestWorkoutToday,
  formatHoursRemaining,
  type MuscleGroupRecovery,
} from './recovery';

interface Props {
  onBack: () => void;
}

export default function RecoveryView({ onBack }: Props) {
  const recovery = useLiveQuery(() => calculateRecoveryByGroup(), []);

  if (!recovery) {
    return (
      <SubScreen title="Recuperação" onBack={onBack}>
        <p className="text-text-3 text-center py-10">Carregando...</p>
      </SubScreen>
    );
  }

  const suggestion = suggestWorkoutToday(recovery);

  return (
    <SubScreen title="Recuperação" onBack={onBack}>
      {/* Sugestão do dia */}
      {(suggestion.recommended.length > 0 ||
        suggestion.warning.length > 0) && (
        <Card variant="accent" className="mb-5">
          <div className="text-xs text-accent uppercase tracking-wider font-semibold mb-2">
            💡 Sugestão de hoje
          </div>

          {suggestion.recommended.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-text-3 uppercase mb-1">
                ✅ Prontos
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestion.recommended.map((g) => (
                  <Badge key={g} variant="accent">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {suggestion.warning.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-text-3 uppercase mb-1">
                ⚠️ Quase recuperados
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestion.warning.map((g) => (
                  <Badge key={g} variant="warn">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {suggestion.avoid.length > 0 && (
            <div>
              <div className="text-[10px] text-text-3 uppercase mb-1">
                🚫 Evite hoje
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestion.avoid.map((g) => (
                  <Badge key={g} variant="danger">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Lista por grupo */}
      <SectionTitle>Músculos</SectionTitle>
      <div className="space-y-2">
        {recovery.map((r) => (
          <RecoveryBar key={r.group} data={r} />
        ))}
      </div>

      <div className="text-[10px] text-text-3 text-center mt-6 italic">
        Base: Flann (2011), Damas (2016), Cheung (2003)
      </div>
    </SubScreen>
  );
}

function RecoveryBar({ data }: { data: MuscleGroupRecovery }) {
  const colorBar = {
    recuperando: 'bg-danger',
    quase: 'bg-warn',
    pronto: 'bg-accent',
  }[data.status];

  const colorText = {
    recuperando: 'text-danger',
    quase: 'text-warn',
    pronto: 'text-accent',
  }[data.status];

  const statusIcon = {
    recuperando: '🔴',
    quase: '🟡',
    pronto: '🟢',
  }[data.status];

  const statusLabel = {
    recuperando: 'Recuperando',
    quase: 'Quase pronto',
    pronto: 'Pronto',
  }[data.status];

  return (
    <div className="bg-bg-1 border border-white/[0.06] rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{statusIcon}</span>
          <span className="text-sm font-semibold text-text-0">
            {data.group}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${colorText}`}>
            {data.score}%
          </span>
        </div>
      </div>

      {/* Barra */}
      <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${colorBar} transition-all duration-500 rounded-full`}
          style={{ width: `${data.score}%` }}
        />
      </div>

      {/* Info */}
      <div className="flex justify-between text-[10px] text-text-3">
        <span>
          {data.hoursSince >= 9999
            ? 'Nunca treinado'
            : `Último: há ${data.hoursSince}h`}
        </span>
        <span className={colorText}>
          {data.score >= 100
            ? '✅ Pronto pra treinar'
            : `Pronto em ${formatHoursRemaining(data.hoursRemaining)}`}
        </span>
      </div>

      {/* Detalhes (48h) */}
      {data.setsLast48h > 0 && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-white/[0.04] text-[10px]">
          <span className="text-text-3">
            📊 {data.setsLast48h} séries ·{' '}
            {data.volumeLast48h.toLocaleString('pt-BR')} kg
          </span>
          {data.avgRIR !== null && (
            <span className="text-text-3">
              🎯 RIR médio {data.avgRIR}
            </span>
          )}
        </div>
      )}
    </div>
  );
}