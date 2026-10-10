import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

/* ══════════════════════════════════════════════════════════
   FORCE FIELD — Animações
   ══════════════════════════════════════════════════════════ */

/* ────────── Transição de página ────────── */
export function PageTransition({
  children,
  direction = 'forward',
}: {
  children: ReactNode;
  direction?: 'forward' | 'back';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction === 'forward' ? 24 : -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction === 'forward' ? -24 : 24 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

/* ────────── Item com entrada em cascata ────────── */
export function StaggerItem({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/* ────────── Botão com "punch" e som ────────── */
export function PunchButton({
  children,
  onClick,
  className = '',
  disabled,
  withHaptic,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  withHaptic?: boolean;
} & Omit<HTMLMotionProps<'button'>, 'onClick' | 'children'>) {
  function handleClick() {
    if (withHaptic && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(30);
      } catch {}
    }
    onClick?.();
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.12 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/* ────────── Pull-to-refresh ────────── */
export function PullDown({
  children,
  onRefresh,
}: {
  children: ReactNode;
  onRefresh?: () => Promise<void>;
}) {
  return (
    <motion.div
      drag={onRefresh ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.15}
      onDragEnd={async (_, info) => {
        if (info.offset.y > 90 && onRefresh) {
          await onRefresh();
        }
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

/* ────────── Card com tilt 3D sutil ────────── */
export function TiltCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}