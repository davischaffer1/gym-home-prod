import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import {
  calculateDailyBalance,
  getCumulativeFatLoss,
  formatBalance,
  formatFatGrams,
  intensityLabel,
  intensityColor,
  KCAL_PER_KG_FAT,
  EPOC_FACTOR,
} from './energyBalance';
import { todayKey } from './nutrition';
import { SubScreen, Card, Badge } from './ui';
import { StaggerItem } from './Motion';
import { ForceLineChart, ForceBarChart } from './ForceCharts';
import { motion } from 'framer-motion';

interface Props {
  onBack: () => void;
}

export default function EnergyBalanceView({ onBack }: Props) {
  const today = todayKey();

  const todayBalance = useLiveQuery(() => calculateDailyBalance(today), [today]);
  const cumulative = useLiveQuery(() => getCumulativeFatLoss(30), []);

  if (!todayBalance || !cumulative) {
    return (
      <SubScreen title="Balanço Energético" onBack={onBack}>
        <p className="text-text-3 text-center py-10 font-mono-ui uppercase tracking-wider text-[11px]">
          Carregando...
        </p>
      </SubScreen>
    );
  }

  const balance = todayBalance;

  // Cor do balanço
  const balanceColor =
    balance.balance < -300
      ? 'text-accent' // déficit = bom
      : balance.balance > 300
      ? 'text-warn' // superávit = atenção
      : 'text-text-0';

  // Meta de balanço baseada no objetivo
  const targetBalance =
    balance.goalType === 'cutting'
      ? -400
      : balance.goalType === 'bulking'
      ? 300
      : 0;

  const balancePct = Math.min(100, Math.abs(balance.balance / 1000) * 100);

  return (
    <SubScreen title="Balanço Energético" onBack={onBack}>
      {/* Card principal — balanço de hoje */}
      <StaggerItem delay={0}>
        <Card
          variant={balance.balance < 0 ? 'accent' : balance.balance > 300 ? 'pr' : 'default'}
          glow
          className="mb-4"
        >
          <div className="text-center mb-4">
            <div className="text-[11px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold mb-2">
              🔥 Balanço de Hoje
            </div>
            <div className={`text-5xl font-bold font-mono-ui ${balanceColor}`}>
              {formatBalance(balance.balance)}
            </div>
            <div className="text-[11px] text-text-3 font-mono-ui uppercase tracking-wider mt-2">
              {balance.balance < 0
                ? `Déficit → ~${formatFatGrams(balance.fatLossGrams)} de gordura`
                : balance.balance > 0
                ? `Superávit → ~${formatFatGrams(balance.fatGainGrams)} a mais`
                : 'Equilíbrio'}
            </div>
          </div>

          {/* Barra */}
          <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden mb-4 relative">
            <div
              className="absolute top-0 h-full bg-accent/20"
              style={{
                left: `${50 + (targetBalance / 1000) * 50 - 5}%`,
                width: '10%',
              }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${balancePct}%` }}
              transition={{ duration: 0.6 }}
              className={`h-full rounded-full ${
                balance.balance < 0 ? 'bg-accent' : 'bg-warn'
              }`}
            />
          </div>

          {/* Meta */}
          <div className="text-center text-[11px] text-text-3 font-mono-ui uppercase tracking-wider">
            Meta:{' '}
            <strong className="text-text-1">
              {targetBalance > 0 ? '+' : ''}
              {targetBalance} kcal
            </strong>{' '}
            · {balance.goalType === 'cutting' ? 'Cutting' : balance.goalType === 'bulking' ? 'Bulking' : 'Manutenção'}
          </div>
        </Card>
      </StaggerItem>

      {/* Breakdown detalhado */}
      <StaggerItem delay={0.05}>
        <Card className="mb-4">
          <div className="text-[11px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold mb-3">
            📊 Cálculo Detalhado
          </div>

          <BreakdownRow
            icon="🔥"
            label="TDEE base"
            value={`${balance.tdeeBase} kcal`}
            sub="Mifflin + atividade − adaptação"
          />

          {balance.metabolicAdaptation > 0 && (
            <BreakdownRow
              icon="📉"
              label="Adaptação metabólica"
              value={`−${balance.metabolicAdaptation} kcal`}
              sub={`${balance.weightStart} → ${balance.weightCurrent} kg`}
              color="text-warn"
            />
          )}

          {balance.kcalFromWorkouts > 0 && (
            <BreakdownRow
              icon="🏋️"
              label={`Treino (${balance.sessions.length}x)`}
              value={`+${balance.kcalFromWorkouts} kcal`}
              sub={balance.sessions
                .map((s) => `${s.durationMin}min · ${intensityLabel(s.intensity)}`)
                .join(' · ')}
              color="text-accent"
            />
          )}

          {balance.kcalFromEpoc > 0 && (
            <BreakdownRow
              icon="⚡"
              label={`EPOC (${Math.round(EPOC_FACTOR * 100)}%)`}
              value={`+${balance.kcalFromEpoc} kcal`}
              sub="LaForgia (2006), Borsheim (2003)"
              color="text-info"
            />
          )}

          <div className="h-px bg-white/[0.06] my-2" />

          <BreakdownRow
            icon="🎯"
            label="TDEE ajustado"
            value={`${balance.tdeeAjustado} kcal`}
            bold
          />

          <BreakdownRow
            icon="🍽️"
            label="Consumido (dieta)"
            value={`${balance.kcalConsumed} kcal`}
            color={balance.kcalConsumed > 0 ? 'text-info' : 'text-text-3'}
          />

          <div className="h-px bg-white/[0.06] my-2" />

          <BreakdownRow
            icon="⚖️"
            label="Balanço"
            value={formatBalance(balance.balance)}
            bold
            color={balanceColor}
          />
        </Card>
      </StaggerItem>

      {/* Info sobre o dia */}
      {balance.sessions.length === 0 && (
        <StaggerItem delay={0.08}>
          <Card variant="glass" className="mb-4">
            <div className="flex items-center gap-2 text-text-3 text-xs font-mono-ui">
              <span className="text-lg">💤</span>
              <div>
                <div className="text-text-2 font-bold">Dia de descanso</div>
                <div className="text-[11px] mt-0.5">
                  Sem treino hoje. Balanço considera apenas TDEE base.
                </div>
              </div>
            </div>
          </Card>
        </StaggerItem>
      )}

      {/* Sessões do dia */}
      {balance.sessions.length > 0 && (
        <StaggerItem delay={0.1}>
          <Card className="mb-4">
            <div className="text-[11px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold mb-3">
              🏋️ Treinos de Hoje
            </div>
            <div className="space-y-2">
              {balance.sessions.map((s) => (
                <div
                  key={s.sessionId}
                  className="bg-bg-2 border border-white/[0.04] rounded-xl px-3 py-2.5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono-ui text-text-2">
                      {new Date(s.startedAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Badge
                      variant={
                        s.intensity === 'muito_intenso'
                          ? 'danger'
                          : s.intensity === 'intenso'
                          ? 'warn'
                          : 'accent'
                      }
                    >
                      {intensityLabel(s.intensity)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono-ui">
                    <div>
                      <div className="text-text-3 uppercase tracking-wider">
                        Duração
                      </div>
                      <div className="text-text-0 font-bold mt-0.5">
                        {s.durationMin} min
                      </div>
                    </div>
                    <div>
                      <div className="text-text-3 uppercase tracking-wider">
                        Volume
                      </div>
                      <div className="text-text-0 font-bold mt-0.5">
                        {Math.round(s.volumeKg / 1000)}t
                      </div>
                    </div>
                    <div>
                      <div className="text-text-3 uppercase tracking-wider">
                        Kcal
                      </div>
                      <div className="text-accent font-bold mt-0.5">
                        {s.kcalTotal}
                      </div>
                    </div>
                  </div>
                  {s.avgRIR !== null && (
                    <div className="text-[11px] text-text-3 font-mono-ui mt-1.5">
                      MET {s.metUsed} · RIR médio {s.avgRIR.toFixed(1)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </StaggerItem>
      )}

      {/* Projeção acumulada */}
      {cumulative.daysWithData >= 3 && (
        <>
          <StaggerItem delay={0.15}>
            <Card variant="sci" className="mb-4">
              <div className="text-[11px] text-sci font-mono-ui uppercase tracking-[0.15em] font-bold mb-3">
                🔮 Projeção (baseada em {cumulative.daysWithData} dias)
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <ProjectionBox
                  label="Déficit médio"
                  value={`${cumulative.avgDailyBalance > 0 ? '+' : ''}${cumulative.avgDailyBalance}`}
                  unit="kcal/dia"
                  color={cumulative.avgDailyBalance < 0 ? 'accent' : 'warn'}
                />
                <ProjectionBox
                  label="Semanal"
                  value={`${cumulative.projectedWeeklyFatKg > 0 ? '+' : ''}${cumulative.projectedWeeklyFatKg}`}
                  unit="kg gordura"
                  color={cumulative.projectedWeeklyFatKg < 0 ? 'accent' : 'warn'}
                />
                <ProjectionBox
                  label="Mensal"
                  value={`${cumulative.projectedMonthlyFatKg > 0 ? '+' : ''}${cumulative.projectedMonthlyFatKg}`}
                  unit="kg gordura"
                  color={cumulative.projectedMonthlyFatKg < 0 ? 'accent' : 'warn'}
                />
              </div>

              <div className="text-[11px] text-text-3 italic font-mono-ui leading-relaxed">
                ⚠️ Projeção teórica. Perda real pode ser 20-30% menor por
                adaptação metabólica, retenção de água e aderência.
                <br />
                Hall & Chow (2020), Thomas (2014).
              </div>
            </Card>
          </StaggerItem>

          {/* Gráfico cumulativo */}
          <StaggerItem delay={0.2}>
            <Card className="mb-4">
              <ForceLineChart
                data={cumulative.history.map((h) => ({
                  label: h.date.slice(8, 10),
                  value: Math.abs(h.cumulativeFat * 1000),
                }))}
                title="Gordura acumulada perdida (g)"
                color="#a78bfa"
                height={200}
              />
            </Card>
          </StaggerItem>
        </>
      )}

      {/* Sem dados suficientes */}
      {cumulative.daysWithData < 3 && (
        <StaggerItem delay={0.15}>
          <Card variant="glass" className="mb-4">
            <div className="text-center py-6">
              <div className="text-4xl mb-3">📊</div>
              <div className="text-sm font-bold font-display text-text-0 mb-2">
                Continue registrando
              </div>
              <p className="text-[11px] text-text-3 font-mono-ui uppercase tracking-wider max-w-[240px] mx-auto">
                Registre dieta e treinos por 3+ dias para desbloquear a análise
                de gordura acumulada
              </p>
            </div>
          </Card>
        </StaggerItem>
      )}

      {/* Base científica */}
      <div className="text-[11px] text-text-3 text-center mt-6 italic font-mono-ui uppercase tracking-[0.15em]">
        Base: Wishnofsky (1958), Hall (2011, 2020), LaForgia (2006)
      </div>
    </SubScreen>
  );
}

/* ══════════════ Componentes ══════════════ */

function BreakdownRow({
  icon,
  label,
  value,
  sub,
  color = 'text-text-0',
  bold,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <div
            className={`text-xs ${
              bold ? 'font-bold text-text-0 font-display' : 'text-text-2'
            } truncate`}
          >
            {label}
          </div>
          {sub && (
            <div className="text-[11px] text-text-3 font-mono-ui mt-0.5 truncate">
              {sub}
            </div>
          )}
        </div>
      </div>
      <div
        className={`text-sm font-mono-ui font-bold ${color} flex-shrink-0 ml-2`}
      >
        {value}
      </div>
    </div>
  );
}

function ProjectionBox({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: 'accent' | 'warn' | 'info';
}) {
  const textColor = {
    accent: 'text-accent',
    warn: 'text-warn',
    info: 'text-info',
  }[color];

  return (
    <div className="bg-bg-2 border border-white/[0.04] rounded-xl p-2.5 text-center">
      <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-base font-bold font-mono-ui ${textColor}`}>
        {value}
      </div>
      <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-wider mt-0.5">
        {unit}
      </div>
    </div>
  );
}