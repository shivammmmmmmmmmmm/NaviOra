import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  normal: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  attention: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-200' },
  concern: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', ring: 'ring-orange-200' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', ring: 'ring-red-200' }
};

export default function JourneyStatusBadge({ level = 'normal', label = 'Normal', size = 'md' }) {
  const s = STATUS_STYLES[level] || STATUS_STYLES.normal;
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3 py-1.5 text-sm' };
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full font-medium', s.bg, s.text, sizes[size])}>
      <span className={cn('w-2 h-2 rounded-full', s.dot, level !== 'normal' && 'animate-pulse')} />
      {label}
    </span>
  );
}