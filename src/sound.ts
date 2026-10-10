/**
 * Sons sintetizados via Web Audio API.
 * Sem arquivos externos, funciona offline.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/* ────────── Som de PR (level up) ────────── */
export function playPRSound() {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Tríade maior ascendente: C5 - E5 - G5 - C6
  const notes = [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const start = now + i * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

    osc.start(start);
    osc.stop(start + 0.4);
  });
}

/* ────────── Som de série registrada ────────── */
export function playSetSound() {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

/* ────────── Som de descanso concluído ────────── */
export function playRestDoneSound() {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const freqs = [880, 1108.73]; // A5 → C#6

  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const start = now + i * 0.15;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

    osc.start(start);
    osc.stop(start + 0.35);
  });
}

/* ────────── Vibração ────────── */
export function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}