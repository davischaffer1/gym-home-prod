import { useEffect, useRef, useState } from 'react';

interface Props {
  seconds: number;
  /** Incrementa quando o usuário pede +30s por fora (ex.: ação da notificação). */
  adjustSignal?: number;
  onClose: () => void;
}

/**
 * Descanso entre séries.
 *
 * Antes: `useState(seconds)` só valia na montagem e a contagem era um
 * `setTimeout` encadeado. Resultado: a partir da 2ª série o timer ficava
 * em 00:00 (o componente não reiniciava) e, com o app em background,
 * o descanso "congelava".
 *
 * Agora: o componente é remontado a cada série (via `key` no pai) e a
 * contagem vem de um deadline absoluto — `Date.now()`, não de ticks.
 * Se o navegador suspender a aba, ao voltar o tempo está correto.
 */
export default function RestTimer({ seconds, adjustSignal = 0, onClose }: Props) {
  const [deadline, setDeadline] = useState<number | null>(
    () => Date.now() + seconds * 1000
  );
  const [remaining, setRemaining] = useState(seconds);
  const doneRef = useRef(false);
  const adjustRef = useRef(adjustSignal);

  // Contagem: recalcula a partir do deadline, não de um contador.
  useEffect(() => {
    if (deadline === null) return;

    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(Math.ceil(left / 1000));
    };

    tick();
    const id = window.setInterval(tick, 250);

    // Volta do background: o intervalo pode ter sido suspenso.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [deadline]);

  // Aviso sonoro/tátil uma única vez por descanso.
  useEffect(() => {
    if (remaining > 0) {
      doneRef.current = false;
      return;
    }
    if (doneRef.current) return;
    doneRef.current = true;
    playBeep();
    vibrate();
    notify('⏱ Descanso concluído!', 'Pode voltar para a próxima série 💪');
  }, [remaining]);

  // +30s pedido pela notificação (fora do componente).
  useEffect(() => {
    if (adjustSignal === adjustRef.current) return;
    adjustRef.current = adjustSignal;
    addTime(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustSignal]);

  function addTime(delta: number) {
    setRemaining((r) => Math.max(0, r + delta));
    setDeadline((d) => (d === null ? null : d + delta * 1000));
  }

  function togglePause() {
    if (deadline === null) {
      setDeadline(Date.now() + remaining * 1000);
    } else {
      setDeadline(null);
    }
  }

  const paused = deadline === null;
  const total = Math.max(seconds, remaining, 1);
  const progress = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div
      className="fixed left-3 right-3 z-50 mx-auto max-w-md"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <div className="rounded-2xl border border-white/[0.10] bg-bg-1/95 p-3 shadow-card-lg backdrop-blur-xl">
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-bg-2">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
              remaining === 0 ? 'bg-success' : 'bg-accent'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono-ui text-3xl font-bold leading-none tabular-nums text-text-0">
              {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] font-mono-ui uppercase tracking-wider text-text-3">
              {remaining === 0 ? 'concluído' : paused ? 'pausado' : 'descanso'}
            </span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={togglePause}
              aria-label={paused ? 'Retomar descanso' : 'Pausar descanso'}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-sm text-text-1 active:scale-95"
            >
              {paused ? '▶' : '⏸'}
            </button>
            <button
              onClick={onClose}
              aria-label="Fechar descanso"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-sm text-text-1 active:scale-95"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(
            [
              [-15, '−15s'],
              [15, '+15s'],
              [30, '+30s'],
            ] as const
          ).map(([delta, label]) => (
            <button
              key={label}
              onClick={() => addTime(delta)}
              className="min-h-[36px] rounded-xl bg-white/[0.05] font-mono-ui text-[11px] uppercase tracking-wider text-text-2 active:scale-95"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────── efeitos ────────── */

function notify(title: string, body: string) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    // iOS PWA não suporta o construtor Notification em todos os casos.
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      tag: 'rest-timer',
    });
  } catch {
    // sem notificação: o bipe e a vibração já avisaram
  }
}

function playBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    // libera o contexto (antes ficava aberto a cada bipe)
    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // navegador bloqueou áudio sem gesto do usuário
  }
}

function vibrate() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // sem suporte
  }
}
