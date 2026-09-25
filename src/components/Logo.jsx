import React from 'react';

// NaviOra logo: compass + navigation pin + travel route, works at any size.
export default function Logo({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label="NaviOra">
      <circle cx="24" cy="24" r="22" stroke="hsl(var(--primary))" strokeWidth="2.5" />
      <path d="M10 32 C16 22, 22 30, 30 18" stroke="hsl(var(--coral))" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="3 3" />
      {/* compass needle */}
      <path d="M24 9 L27 24 L24 22 L21 24 Z" fill="hsl(var(--primary))" />
      <path d="M24 39 L27 24 L24 26 L21 24 Z" fill="hsl(var(--navy))" opacity="0.4" />
      {/* pin */}
      <circle cx="24" cy="24" r="3.2" fill="hsl(var(--coral))" />
      <circle cx="24" cy="24" r="1.2" fill="#fff" />
    </svg>
  );
}