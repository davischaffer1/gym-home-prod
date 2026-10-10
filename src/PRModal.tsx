import { useEffect, useState } from 'react';
import Confetti from './Confetti';
import { PunchButton } from './Motion';

interface PRModalProps {
  open: boolean;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  previousPR?: number;
  onClose: () => void;
}

export default function PRModal({
  open,
  exerciseName,
  weight,
  reps,
  estimated1RM,
  previousPR,
  onClose,
}: PRModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3200);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const gain = previousPR ? weight - previousPR : 0;

  return (
    <>
      <Confetti active={showConfetti} duration={3200} />

      <div
        className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-bg-1 border border-pr/40 rounded-3xl p-6 max-w-sm w-full shadow-glow-pr animate-scale-in"
        >
          {/* Hero */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-3 animate-float">🏆</div>
            <h2
              className="text-3xl font-bold font-display text-pr tracking-tight"
              style={{
                textShadow: '0 0 24px rgba(249, 115, 22, 0.5)',
              }}
            >
              NOVO PR!
            </h2>
            <p className="text-[10px] text-text-3 mt-1 font-mono-ui uppercase tracking-[0.2em]">
              Personal Record
            </p>
          </div>

          {/* Exercício */}
          <div className="text-center mb-5">
            <div className="text-sm text-text-2 font-mono-ui uppercase tracking-wider">
              {exerciseName}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-3 text-center">
              <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mb-1">
                Carga
              </div>
              <div className="text-2xl font-bold font-mono-ui text-text-0">
                {weight}
                <span className="text-sm text-text-3 ml-1">kg</span>
              </div>
            </div>
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-3 text-center">
              <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mb-1">
                Reps
              </div>
              <div className="text-2xl font-bold font-mono-ui text-text-0">
                {reps}
              </div>
            </div>
            <div className="bg-bg-2 border border-white/[0.06] rounded-2xl p-3 text-center col-span-2">
              <div className="text-[9px] text-text-3 uppercase tracking-wider font-mono-ui mb-1">
                1RM Estimado
              </div>
              <div className="text-2xl font-bold font-mono-ui text-accent">
                {Math.round(estimated1RM * 10) / 10}
                <span className="text-sm text-text-3 ml-1">kg</span>
              </div>
            </div>
          </div>

          {/* Ganho */}
          {previousPR && gain > 0 && (
            <div className="bg-pr/10 border border-pr/30 rounded-2xl p-3 mb-5 text-center">
              <div className="text-[10px] text-text-3 uppercase tracking-wider font-mono-ui mb-1">
                Progresso
              </div>
              <div className="text-lg font-bold font-mono-ui text-pr">
                +{gain} kg
                <span className="text-xs text-text-3 ml-2">
                  (antes {previousPR} kg)
                </span>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="space-y-2">
            <PunchButton
              onClick={onClose}
              className="w-full bg-pr hover:bg-pr/90 text-black font-bold font-display py-3.5 rounded-2xl shadow-glow-pr"
            >
              Continuar Treino
            </PunchButton>
          </div>
        </div>
      </div>
    </>
  );
}