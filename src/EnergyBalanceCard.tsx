import { useLiveQuery } from 'dexie-react-hooks';
import { calculateDailyBalance, formatBalance, formatFatGrams } from './energyBalance';
import { todayKey } from './nutrition';
import { PunchButton } from './Motion';
import { motion } from 'framer-motion';

interface Props {
  date?: string;
  onNavigate?: () => void;
  compact?: boolean;
}

export default function EnergyBalanceCard({
  date,
  onNavigate,
  compact = false,
}: Props) {
  const targetDate = date ?? todayKey();
  const balance = useLiveQuery(
    () => calculateDailyBalance(targetDate),
    [targetDate]
  );

  if (!balance) return null;

  const isDeficit = balance.balance < 0;
  const bgColor = isDeficit
    ? 'bg-accent-dim border-accent/25'
    : balance.balance > 300
    ? 'bg-pr/5 border-pr/25'
    : 'bg-bg-1 border-white/[0.06]';

  if (compact) {
    return (
      <PunchButton
        onClick={onNavigate}
        className={`w-full ${bgColor} border rounded-2xl px-4 py-3 flex items-center justify-between active:scale-[0.99]`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <div className="text-left">
            <div className="text-[9px] text-text-3 font-mono-ui uppercase tracking-wider">
              Balanço
            </div>
            <div
              className={`text-sm font-bold font-mono-ui ${
                isDeficit ? 'text-accent' : balance.balance > 300 ? 'text-pr' : 'text-text-0'
              }`}
            >
              {formatBalance(balance.balance)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`text-sm font-bold font-mono-ui ${
              isDeficit ? 'text-accent' : 'text-pr'
            }`}
          >
            {isDeficit
              ? `−${formatFatGrams(balance.fatLossGrams)}`
              : `+${formatFatGrams(balance.fatGainGrams)}`}
          </div>
          <div className="text-[9px] text-text-3 font-mono-ui uppercase tracking-wider">
            gordura
          </div>
        </div>
      </PunchButton>
    );
  }

  return (
    <div className={`${bgColor} border rounded-2xl p-4 shadow-card`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-text-3 font-mono-ui uppercase tracking-[0.15em] font-bold">
          🔥 Balanço Energético
        </div>
        <span
          className={`text-2xl font-bold font-mono-ui ${
            isDeficit ? 'text-accent' : balance.balance > 300 ? 'text-pr' : 'text-text-0'
          }`}
        >
          {formatBalance(balance.balance)}
        </span>
      </div>

      <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: `${Math.min(100, Math.abs(balance.balance / 1000) * 100)}%`,
          }}
          transition={{ duration: 0.6 }}
          className={`h-full rounded-full ${
            isDeficit ? 'bg-accent' : 'bg-pr'
          }`}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[9px] text-text-3 font-mono-ui uppercase tracking-wider">
            Gasto
          </div>
          <div className="text-xs font-bold font-mono-ui text-text-0 mt-0.5">
            {balance.tdeeAjustado}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-text-3 font-mono-ui uppercase tracking-wider">
            Consumido
          </div>
          <div className="text-xs font-bold font-mono-ui text-text-0 mt-0.5">
            {balance.kcalConsumed}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-text-3 font-mono-ui uppercase tracking-wider">
            Gordura
          </div>
          <div
            className={`text-xs font-bold font-mono-ui mt-0.5 ${
              isDeficit ? 'text-accent' : 'text-pr'
            }`}
          >
            {isDeficit
              ? `−${formatFatGrams(balance.fatLossGrams)}`
              : `+${formatFatGrams(balance.fatGainGrams)}`}
          </div>
        </div>
      </div>

      {onNavigate && (
        <button
          onClick={onNavigate}
          className="w-full text-[10px] text-accent hover:text-accent-hover font-mono-ui uppercase tracking-wider font-bold py-2 mt-2 border-t border-white/[0.04]"
        >
          Ver detalhes →
        </button>
      )}
    </div>
  );
}