import React, { useState, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

// Press-and-hold (2s) SOS button. Only emits activation; parent handles workflow.
export default function SOSButton({ onActivate, size = 'lg', className = '' }) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const HOLD_MS = 2000;

  const tick = () => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
    setProgress(pct);
    if (pct >= 100) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setHolding(false);
      setProgress(0);
      onActivate?.();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (holding) return;
    setHolding(true);
    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setHolding(false);
    setProgress(0);
  };

  const sizes = { lg: 'w-40 h-40', md: 'w-24 h-24', sm: 'w-16 h-16' };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        aria-label="Hold for SOS"
        onPointerDown={begin}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        className={cn(
          'relative rounded-full flex items-center justify-center text-white select-none touch-none transition-transform',
          sizes[size],
          holding ? 'scale-95' : 'scale-100',
          'bg-emergency shadow-[0_8px_30px_-8px_hsl(355_78%_56%/0.6)]',
          className
        )}
        style={{ background: `conic-gradient(hsl(var(--navy)) ${progress}%, hsl(var(--emergency)) ${progress}% 100%)` }}
      >
        <div className="absolute inset-2 rounded-full bg-emergency flex flex-col items-center justify-center">
          {holding && <div className="absolute inset-0 rounded-full animate-pulse-ring" />}
          <ShieldAlert size={size === 'lg' ? 40 : 24} className="relative" />
          {size === 'lg' && <span className="relative text-xs font-bold mt-1 tracking-wider">SOS</span>}
        </div>
      </button>
      {size === 'lg' && (
        <p className="text-xs text-text-secondary text-center max-w-[200px]">
          {holding ? 'Keep holding to activate…' : 'Press and hold for 2 seconds to activate SOS'}
        </p>
      )}
    </div>
  );
}