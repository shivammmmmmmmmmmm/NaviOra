import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n, LANGUAGES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Globe icon that opens a language picker and switches the whole app's UI language.
export default function GlobeLanguage() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change app language"
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-medium text-text-secondary hover:bg-muted hover:text-foreground transition-colors"
      >
        <Globe size={16} />
        <span className="hidden sm:inline truncate max-w-[100px]">{current?.label || 'English'}</span>
      </button>
      {open && (
        <div className="absolute left-0 rtl:left-auto rtl:right-0 mt-2 w-60 max-h-80 overflow-y-auto rounded-2xl bg-card border border-border shadow-soft-lg z-50 p-1.5 animate-scale-in">
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-text-secondary/70">App language</p>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-muted transition-colors',
                l.code === lang ? 'text-primary font-medium bg-mint/30' : 'text-foreground'
              )}
            >
              <span>{l.label}</span>
              {l.code === lang && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}