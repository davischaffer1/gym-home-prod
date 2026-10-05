import { useEffect, useRef, useState } from 'react';
import { type Exercise } from './db';

interface Props {
  exercises: Exercise[];
  activeIndex: number;
  onIndexChange: (idx: number) => void;
  children: (exercise: Exercise, index: number) => React.ReactNode;
}

export default function SwipeableExerciseView({
  exercises,
  activeIndex,
  onIndexChange,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const axisLocked = useRef<'x' | 'y' | null>(null);

  const total = exercises.length;

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    axisLocked.current = null;
    setIsDragging(true);
    setDragX(0);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging) return;
    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;

    // Decide o eixo na primeira movimentação significativa
    if (!axisLocked.current) {
      if (Math.abs(dx) > Math.abs(dy) + 4) {
        axisLocked.current = 'x';
      } else if (Math.abs(dy) > Math.abs(dx) + 4) {
        axisLocked.current = 'y';
      } else {
        return;
      }
    }

    // Se for scroll vertical, cancela o drag horizontal
    if (axisLocked.current === 'y') {
      setIsDragging(false);
      return;
    }

    // Aplica resistência nas bordas
    let applied = dx;
    if (
      (activeIndex === 0 && dx > 0) ||
      (activeIndex === total - 1 && dx < 0)
    ) {
      applied = dx * 0.25;
    }

    setDragX(applied);
  }

  function handleTouchEnd() {
    if (!isDragging) return;
    const dx = dragX;
    const threshold = 60;

    if (dx < -threshold && activeIndex < total - 1) {
      onIndexChange(activeIndex + 1);
    } else if (dx > threshold && activeIndex > 0) {
      onIndexChange(activeIndex - 1);
    }

    setDragX(0);
    setIsDragging(false);
    axisLocked.current = null;
  }

  return (
    <div
      className="relative overflow-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex"
        style={{
          transform: `translateX(calc(-${activeIndex * 100}% + ${dragX}px))`,
          transition: isDragging
            ? 'none'
            : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {exercises.map((ex, idx) => (
          <div
            key={ex.id}
            className="w-full flex-shrink-0 px-4"
            style={{ minWidth: '100%' }}
          >
            {children(ex, idx)}
          </div>
        ))}
      </div>
    </div>
  );
}