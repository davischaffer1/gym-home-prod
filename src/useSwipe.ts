import { useEffect, useRef } from 'react';

/**
 * Detecta swipe horizontal na tela inteira.
 * Chama onSwipeLeft / onSwipeRight se o movimento passar de `threshold`.
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
  enabled = true,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);
  const tracking = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    function handleTouchStart(e: TouchEvent) {
      // Ignora se o toque começou em input, textarea ou select
      const target = e.target as HTMLElement;
      if (
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select') ||
        target.closest('[data-no-swipe]')
      ) {
        return;
      }

      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      startTime.current = Date.now();
      tracking.current = true;
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!tracking.current) return;
      if (startX.current === null || startY.current === null) return;

      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const dx = endX - startX.current;
      const dy = endY - startY.current;
      const dt = Date.now() - (startTime.current ?? 0);

      // Velocidade mínima para não ativar em scroll lento
      const velocity = Math.abs(dx) / Math.max(1, dt);
      const isFast = velocity > 0.4;

      // Horizontal predominante e distância suficiente
      if (
        Math.abs(dx) > threshold &&
        Math.abs(dx) > Math.abs(dy) * 1.5 &&
        (isFast || Math.abs(dx) > 100)
      ) {
        if (dx < 0 && onSwipeLeft) onSwipeLeft();
        if (dx > 0 && onSwipeRight) onSwipeRight();
      }

      tracking.current = false;
      startX.current = null;
      startY.current = null;
      startTime.current = null;
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold, onSwipeLeft, onSwipeRight]);
}