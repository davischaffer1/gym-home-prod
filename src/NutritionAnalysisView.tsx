import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import {
  getDailyHistory,
  getAverageAdherence,
  getNutritionPerformanceCorrelation,
  getWeekComparison,
} from './nutrition';
import { SubScreen, Card, Badge } from './ui';
import { StaggerItem } from './Motion';
import { ForceLineChart, ForceBarChart } from './ForceCharts';
import { motion } from 'framer-motion';

interface Props {
  onBack: () => void;
}

export default function NutritionAnalysisView({ onBack }: Props) {
  const goal = useLiveQuery(() => db.nutritionGoals.toCollection().first(), []);
  const history = useLiveQuery(() => getDailyHistory(30), []);
  const adherence = useLiveQuery(() => getAverageAdherence(30), []);
  const correlation = useLiveQuery(
    () => getNutritionPerformanceCorrelation(30),
    []
  );
  const comparison = useLiveQuery(() => getWeekComparison(), []);

  if (!goal) {
    return (
      <SubScreen title="Análise da Dieta" onBack={onBack}>
        <Card variant="glass">
          <p className="text-text-3 text-sm text-center py-10 font-mono-ui text-[11px] uppercase tracking-wider">
            Configure as metas primeiro
          </p>
        </Card>
      </SubScreen>
    );
  }

  if (!history || !adherence) {
    return (
      <SubScreen title="Análise da Dieta" onBack={onBack}>
        <p className="text-text-3 text-center py-10 font-mono-ui uppercase tracking-wider text-[11px]">
          Carregando...
        </p>
      </SubScreen>
    );
  }

  const kcalChart = history.slice(-14).map((d) => ({
    label: d.date.slice(8, 10),
    value: Math.round(d.summary.kcal),
  }));

  const proteinChart = history.slice(-14).map((d) => ({
    label: d.date.slice(8, 10),
    value: Math.round(d.summary.protein),
  }));

  const logged = history.filter((d) => d.summary.kcal > 0);
  const avgKcal = logged.length
    ? Math.round(logged.reduce((a, d) => a + d.summary.kcal, 0) / logged.length)
    : 0;
  const avgProtein = logged.length
    ? Math.round(
        logged.reduce((a, d) => a + d.summary.protein, 0) / logged.length
      )
    : 0;
  const avgCarbs = logged.length
    ? Math.round(logged.reduce((a, d) => a + d.summary.carbs, 0) / logged.length)
    : 0;
  const avgFat = logged.length
    ? Math.round(logged.reduce((a, d) => a + d.summary.fat, 0) / logged.length)
    : 0;

  const adherenceColor =
    adherence.adherence >= 85
      ? 'text-accent'
      : adherence.adherence >= 60
      ? 'text-warn'
      : 'text-danger';

  return (
    <SubScreen title="Análise da Dieta" onBack={onBack}>
      {/* Aderência */}
      <StaggerItem delay={0}>
        <Card variant="accent" glow className="mb-4">
          <div className="text-center py-3">
            <div className="text-[10px] text-accent font-mono-ui uppercase tracking-[0.15em] font-bold mb-2">
              ✦ Aderência às Metas
            </div>
            <div className={`text-5xl font-bold font-mono-ui ${adherenceColor}`}>
              {adherence.adherence}%
            </div>
            <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-wider mt-2">
              {adherence.daysLogged} de {adherence.daysTotal} dias registrados
            </div>
          </div>
        </Card>
      </StaggerItem>

      {/* Comparação semana */}
      {comparison && comparison.thisWeek.days > 0 && comparison.lastWeek.days > 0 && (
        <StaggerItem delay={0.03}>
          <Card className="mb-4">
            <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold mb-3">
              📊 Esta semana vs. anterior
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CompareRow
                label="Kcal"
                current={comparison.thisWeek.kcal}
                previous={comparison.lastWeek.kcal}
              />
              <CompareRow
                label="Proteína"
                current={comparison.thisWeek.protein}
                previous={comparison.lastWeek.protein}
                unit="g"
              />
            </div>
          </Card>
        </StaggerItem>
      )}

      {/* Médias */}
      <StaggerItem delay={0.05}>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatBox
            label="Média Kcal"
            value={String(avgKcal)}
            target={goal.targetKcal}
            color="accent"
          />
          <StatBox
            label="Média Proteína"
            value={`${avgProtein}g`}
            target={goal.targetProtein}
            color="info"
          />
          <StatBox
            label="Média Carbo"
            value={`${avgCarbs}g`}
            target={goal.targetCarbs}
            color="sci"
          />
          <StatBox
            label="Média Gordura"
            value={`${avgFat}g`}
            target={goal.targetFat}
            color="warn"
          />
        </div>
      </StaggerItem>

      {/* Gráfico Calorias */}
      <StaggerItem delay={0.1}>
        <Card className="mb-4">
          <ForceBarChart
            data={kcalChart}
            title="Calorias (últimos 14 dias)"
            color="#06b6d4"
            height={180}
            formatValue={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <div className="text-[9px] text-text-3 font-mono-ui text-center mt-2 uppercase tracking-wider">
            Meta: {goal.targetKcal} kcal/dia
          </div>
        </Card>
      </StaggerItem>

      {/* Gráfico Proteína */}
      <StaggerItem delay={0.15}>
        <Card className="mb-4">
          <ForceLineChart
            data={proteinChart}
            title="Proteína (últimos 14 dias)"
            color="#60a5fa"
            height={180}
          />
          <div className="text-[9px] text-text-3 font-mono-ui text-center mt-2 uppercase tracking-wider">
            Meta: {goal.targetProtein}g/dia
          </div>
        </Card>
      </StaggerItem>

      {/* Correlação */}
      {correlation && (
        <StaggerItem delay={0.2}>
          <Card variant="sci" className="mb-4">
            <div className="text-[10px] text-sci font-mono-ui uppercase tracking-[0.15em] font-bold mb-3">
              ⚡ Correlação com Treino
            </div>

            <div className="text-[11px] text-text-2 mb-3 leading-relaxed">
              Baseado em{' '}
              <strong className="text-text-0">{correlation.samples} dias</strong>{' '}
              com registro + treino:
            </div>

            <CorrelationBar
              label="Calorias"
              correlation={correlation.kcalCorrelation}
            />
            <CorrelationBar
              label="Proteína"
              correlation={correlation.proteinCorrelation}
            />

            <div className="text-[9px] text-text-3 mt-3 pt-3 border-t border-white/[0.04] italic font-mono-ui">
              Base: Aragon & Schoenfeld (2020), Kerksick (2017)
            </div>
          </Card>
        </StaggerItem>
      )}

      {/* Consistência semanal */}
      <StaggerItem delay={0.25}>
        <Card className="mb-4">
          <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold mb-3">
            📊 Consistência Semanal
          </div>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((weekIdx) => {
              const end = history.length - weekIdx * 7;
              const start = Math.max(0, end - 7);
              const weekDays = history.slice(start, end);

              const weekLogged = weekDays.filter(
                (d) => d.summary.kcal > 0
              ).length;
              const weekAdherence = weekDays.length
                ? Math.round(
                    weekDays.reduce((a, d) => a + d.adherence, 0) /
                      weekDays.length
                  )
                : 0;

              return (
                <div key={weekIdx} className="flex items-center justify-between">
                  <span className="text-xs text-text-2 font-mono-ui">
                    {weekIdx === 0 ? 'Atual' : `S-${weekIdx}`}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-text-3 font-mono-ui">
                      {weekLogged}/7
                    </span>
                    <div className="w-24 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${weekAdherence}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${
                          weekAdherence >= 85
                            ? 'bg-accent'
                            : weekAdherence >= 60
                            ? 'bg-warn'
                            : 'bg-danger'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-mono-ui font-bold text-text-0 w-8 text-right">
                      {weekAdherence}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </StaggerItem>

      <div className="text-[9px] text-text-3 text-center mt-6 italic font-mono-ui uppercase tracking-[0.15em]">
        Force Field · Nutrição Científica
      </div>
    </SubScreen>
  );
}

/* ══════════════ Componentes ══════════════ */

function StatBox({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: string;
  target: number;
  color: 'accent' | 'info' | 'sci' | 'warn';
}) {
  const textColor = {
    accent: 'text-accent',
    info: 'text-info',
    sci: 'text-sci',
    warn: 'text-warn',
  }[color];

  const barColor = {
    accent: 'bg-accent',
    info: 'bg-info',
    sci: 'bg-sci',
    warn: 'bg-warn',
  }[color];

  const numericValue = parseInt(value.replace(/\D/g, ''), 10);
  const p = target > 0 ? Math.min(100, (numericValue / target) * 100) : 0;

  return (
    <div className="bg-bg-1 border border-white/[0.06] rounded-2xl p-3 text-center">
      <div className={`text-xl font-bold font-mono-ui ${textColor}`}>
        {value}
      </div>
      <div className="text-[9px] text-text-3 uppercase tracking-[0.15em] font-mono-ui mt-1">
        {label}
      </div>
      <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden mt-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${p}%` }}
          transition={{ duration: 0.6 }}
          className={`h-full ${barColor} rounded-full`}
        />
      </div>
    </div>
  );
}

function CorrelationBar({
  label,
  correlation,
}: {
  label: string;
  correlation: number;
}) {
  const abs = Math.abs(correlation);
  const pct = Math.round(abs * 100);

  const strength =
    abs >= 0.7
      ? { label: 'Forte', color: 'text-accent' }
      : abs >= 0.4
      ? { label: 'Moderada', color: 'text-info' }
      : abs >= 0.2
      ? { label: 'Fraca', color: 'text-warn' }
      : { label: 'Nenhuma', color: 'text-text-3' };

  const isPositive = correlation >= 0;
  const barColor = isPositive ? 'bg-accent' : 'bg-danger';

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-text-1 font-mono-ui">{label}</span>
        <span className={`text-[10px] font-mono-ui font-bold ${strength.color}`}>
          {correlation > 0 ? '+' : ''}
          {correlation} · {strength.label}
        </span>
      </div>
      <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full ${barColor} rounded-full`}
        />
      </div>
    </div>
  );
}

function CompareRow({
  label,
  current,
  previous,
  unit = '',
}: {
  label: string;
  current: number;
  previous: number;
  unit?: string;
}) {
  const diff = current - previous;
  const pctDiff = previous > 0 ? Math.round((diff / previous) * 100) : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="bg-bg-2 border border-white/[0.04] rounded-xl p-2.5">
      <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mb-1">
        {label}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-base font-bold font-mono-ui text-text-0">
          {current}
          {unit}
        </span>
        <span
          className={`text-[10px] font-mono-ui font-bold ${
            isUp ? 'text-accent' : isDown ? 'text-danger' : 'text-text-3'
          }`}
        >
          {isUp ? '↑' : isDown ? '↓' : '='} {Math.abs(pctDiff)}%
        </span>
      </div>
    </div>
  );
}