import React from 'react';
import { BadgeCheck, AlertTriangle, CircleDollarSign, Clock, FileText, ExternalLink, Lightbulb, ShieldAlert, Database, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const CLASS = {
  within_range: { label: 'Within available range', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: BadgeCheck, dot: 'bg-emerald-500' },
  above_range: { label: 'Above available range', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle, dot: 'bg-amber-500' },
  significant_difference: { label: 'Significant difference — verify before paying', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: ShieldAlert, dot: 'bg-orange-500' },
  insufficient_data: { label: 'Insufficient data', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Info, dot: 'bg-slate-400' }
};

const FRESH = { current: 'Current', recent: 'Recent', outdated: 'Outdated', unknown: 'Freshness unknown' };

const money = (n, c) => (n == null ? '—' : `${c || '₹'}${Number(n).toLocaleString('en-IN')}`);

export default function PriceResultView({ result }) {
  if (!result) return null;
  const c = CLASS[result.classification] || CLASS.insufficient_data;
  const Icon = c.icon;
  const stats = result.stats || {};
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const observations = Array.isArray(result.observations) ? result.observations : [];
  const factors = Array.isArray(result.factors) ? result.factors : [];
  const todo = Array.isArray(result.what_to_do) ? result.what_to_do : [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Verdict */}
      <div className={cn('rounded-2xl border p-4 flex items-start gap-3', c.color)}>
        <Icon size={22} className="shrink-0 mt-0.5" />
        <div>
          <div className="font-heading font-semibold">{c.label}</div>
          {result.insufficient && <div className="text-sm opacity-90 mt-0.5">NaviOra couldn't find enough reliable current pricing information to calculate a meaningful comparison.</div>}
        </div>
      </div>

      {/* Comparison block */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-text-secondary uppercase tracking-wide">Your quoted price</div>
            <div className="text-2xl font-heading font-bold text-navy mt-1">{money(result.quoted_price, result.currency)}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary uppercase tracking-wide">Comparable range</div>
            <div className="text-2xl font-heading font-bold text-navy mt-1">
              {stats.min != null ? `${money(stats.min, result.currency)} – ${money(stats.max, result.currency)}` : '—'}
            </div>
          </div>
        </div>
        {stats.median != null && (
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border text-sm">
            <div><div className="text-text-secondary text-xs">Median</div><div className="font-semibold">{money(stats.median, result.currency)}</div></div>
            <div><div className="text-text-secondary text-xs">Average</div><div className="font-semibold">{money(stats.average, result.currency)}</div></div>
            <div><div className="text-text-secondary text-xs">Observations</div><div className="font-semibold">{stats.count ?? observations.length}</div></div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-text-secondary"><Database size={12} /> {stats.source_count ?? sources.length} source(s)</span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-text-secondary"><Clock size={12} /> {FRESH[result.freshness] || 'Freshness unknown'}</span>
          {result.comparison_basis && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-mint/40 text-navy"><CircleDollarSign size={12} /> {result.comparison_basis}</span>}
        </div>
      </div>

      {/* Explanation */}
      {result.explanation && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <h3 className="font-heading font-semibold text-navy mb-2 flex items-center gap-2"><FileText size={16} /> Assessment</h3>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{result.explanation}</p>
        </div>
      )}

      {/* Factors */}
      {factors.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <h3 className="font-heading font-semibold text-navy mb-2 flex items-center gap-2"><Info size={16} /> Why the price may differ</h3>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            {factors.map((f, i) => <li key={i} className="flex gap-2"><span className="text-coral mt-1">•</span>{f}</li>)}
          </ul>
        </div>
      )}

      {/* What to do */}
      {todo.length > 0 && (
        <div className="rounded-2xl bg-mint/30 border border-mint p-5">
          <h3 className="font-heading font-semibold text-navy mb-2 flex items-center gap-2"><Lightbulb size={16} /> What you can do</h3>
          <ul className="space-y-1.5 text-sm text-navy">
            {todo.map((f, i) => <li key={i} className="flex gap-2"><ArrowRight size={14} className="mt-1 text-primary shrink-0" />{f}</li>)}
          </ul>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2"><ExternalLink size={16} /> Sources</h3>
          <div className="space-y-3">
            {sources.map((s, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-navy">{s.name || 'Source'}</span>
                  <span className={cn('text-[10px] uppercase px-2 py-0.5 rounded-full', s.type === 'official' ? 'bg-emerald-100 text-emerald-700' : s.type === 'business' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>{s.type || 'source'}</span>
                </div>
                <div className="text-text-secondary text-xs mt-0.5 flex flex-wrap gap-x-3">
                  {s.price != null && <span>{money(s.price, s.currency)}</span>}
                  {s.date_published && <span>Published {s.date_published}</span>}
                  {s.retrieved && <span>Retrieved {s.retrieved}</span>}
                  <span className="capitalize">Reliability: {s.reliability || '—'}</span>
                  <span className="capitalize">{FRESH[s.freshness] || ''}</span>
                </div>
                {s.url && <a href={s.url} target="_blank" rel="noopener" className="text-primary text-xs hover:underline break-all">{s.url}</a>}
                {s.note && <p className="text-text-secondary text-xs mt-1">{s.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observations */}
      {observations.length > 0 && (
        <details className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <summary className="font-heading font-semibold text-navy cursor-pointer flex items-center gap-2"><Database size={16} /> Comparable observations ({observations.length})</summary>
          <ul className="mt-3 space-y-2 text-sm">
            {observations.map((o, i) => (
              <li key={i} className="flex items-center justify-between gap-2 border-b border-border pb-1.5 last:border-0">
                <span className="text-text-secondary truncate">{o.description}</span>
                <span className="font-medium shrink-0">{money(o.price, o.currency)}{o.as_of ? <span className="text-text-secondary text-xs ml-2">{o.as_of}</span> : null}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}