import { useEffect, useRef, useState } from 'react';

interface Props {
  seconds: number;
  onClose: () => void;
}

export default function RestTimer({ seconds, onClose }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const beepedRef = useRef(false);

  // Contagem regressiva
  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) return;

    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, paused]);

  // Alerta ao terminar
  useEffect(() => {
    if (remaining === 0 && !beepedRef.current) {
      beepedRef.current = true;
      playBeep();
      vibrate();
      showRestNotification();
    }
  }, [remaining]);

  function showRestNotification() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('⏱ Descanso concluído!', {
        body: 'Pode voltar para a próxima série 💪',
        icon: '/icon-192.png',
        tag: 'rest-timer',
        requireInteraction: false,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new Notification('⏱ Descanso concluído!', {
            body: 'Pode voltar para a próxima série 💪',
            icon: '/icon-192.png',
            tag: 'rest-timer',
          });
        }
      });
    }
  }

  function playBeep() {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
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
    } catch {
      // ignora se o navegador bloquear
    }
  }

  function vibrate() {
    if ('vibrate' in navigator) {
      navigator.vibrate?.([200, 100, 200]);
    }
  }

  function addTime(delta: number) {
    beepedRef.current = false;
    setRemaining((r) => Math.max(0, r + delta));
  }

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const total = seconds;
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50">
      <div className="bg-bg-1 border border-zinc-700 rounded-2xl p-4 shadow-2xl space-y-3">
        {/* Barra de progresso */}
        <div className="w-full h-1.5 bg-bg-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-hover transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏱</span>
            <div>
              <div className="text-xl font-bold tabular-nums">
                {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-text-2">
                {remaining === 0 ? '✅ Descanso concluído' : 'Descanso'}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPaused((p) => !p)}
              className="bg-bg-2 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm"
            >
              {paused ? '▶' : '⏸'}
            </button>
            <button
              onClick={onClose}
              className="bg-bg-2 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => addTime(-15)}
            className="flex-1 bg-bg-2 hover:bg-zinc-700 py-1.5 rounded-lg text-xs"
          >
            −15s
          </button>
          <button
            onClick={() => addTime(15)}
            className="flex-1 bg-bg-2 hover:bg-zinc-700 py-1.5 rounded-lg text-xs"
          >
            +15s
          </button>
          <button
            onClick={() => addTime(30)}
            className="flex-1 bg-bg-2 hover:bg-zinc-700 py-1.5 rounded-lg text-xs"
          >
            +30s
          </button>
        </div>
      </div>
    </div>
  );
}
