import React from 'react';
import { cn } from '@/lib/utils';

export function SkeletonCard({ className = '' }) {
  return <div className={cn('rounded-2xl bg-muted/60 animate-pulse h-44', className)} />;
}

export function SkeletonRow({ className = '' }) {
  return <div className={cn('h-4 rounded bg-muted/60 animate-pulse', className)} />;
}

export default function Skeleton({ count = 3, className = '' }) {
  return (
    <div className={cn('grid gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}