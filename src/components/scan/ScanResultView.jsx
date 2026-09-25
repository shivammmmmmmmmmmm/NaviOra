import React from 'react';
import { Languages, FileText, Lightbulb, ShieldAlert, MapPin, ExternalLink, Ticket, BadgeCheck, AlertCircle, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONF = {
  high: { label: 'High confidence', color: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Medium confidence', color: 'bg-amber-100 text-amber-700' },
  low: { label: 'Low confidence', color: 'bg-orange-100 text-orange-700' }
};

const money = (n, c) => (n == null ? '' : `${c || '₹'}${Number(n).toLocaleString('en-IN')}`);

export default function ScanResultView({ result, image, onCheckPrice, onScanAgain }) {
  if (!result) return null;
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const priceData = Array.isArray(result.price_data) ? result.price_data : [];
  const actions = Array.isArray(result.recommended_actions) ? result.recommended_actions : [];
  const avoid = Array.isArray(result.avoid_actions) ? result.avoid_actions : [];
  const ticket = result.ticket_summary || null;
  const conf = CONF[result.confidence] || CONF.low;

  const Section = ({ icon: Icon, title, children }) => (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
      <h3 className="font-heading font-semibold text-navy mb-2 flex items-center gap-2"><Icon size={16} /> {title}</h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header + image */}
      <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
        {image && <img src={image} alt="Scanned" className="w-full max-h-64 object-contain bg-black/5" />}
        <div className="p-4 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs text-text-secondary uppercase tracking-wide">Detected</div>
            <div className="font-heading font-semibold text-navy">{result.detected_type || 'Object'}</div>
            {result.detected_language && <div className="text-xs text-text-secondary mt-0.5">Detected language: {result.detected_language}</div>}
          </div>
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', conf.color)}>{conf.label}</span>
        </div>
      </div>

      {result.confidence_note && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> {result.confidence_note}
        </div>
      )}

      {/* Original + translation */}
      {result.extracted_text && (
        <Section icon={Languages} title="Original text">
          <p className="text-sm whitespace-pre-wrap text-foreground/90">{result.extracted_text}</p>
        </Section>
      )}
      {result.translation && (
        <Section icon={FileText} title="Translation">
          <p className="text-sm whitespace-pre-wrap text-navy">{result.translation}</p>
        </Section>
      )}

      {/* Explanation */}
      {result.explanation && (
        <Section icon={Lightbulb} title="What does this mean?">
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{result.explanation}</p>
        </Section>
      )}

      {/* Ticket summary */}
      {ticket && (
        <Section icon={Ticket} title="Ticket summary">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(ticket).filter(([, v]) => v && (!Array.isArray(v) || v.length)).map(([k, v]) => (
              <div key={k}>
                <div className="text-text-secondary text-xs capitalize">{k.replace(/_/g, ' ')}</div>
                <div className="font-medium">{Array.isArray(v) ? v.join(', ') : String(v)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* What to do */}
      {actions.length > 0 && (
        <Section icon={BadgeCheck} title="What should you do?">
          <ul className="space-y-1.5 text-sm">
            {actions.map((a, i) => <li key={i} className="flex gap-2 text-foreground/90"><span className="text-primary mt-1">›</span>{a}</li>)}
          </ul>
        </Section>
      )}

      {/* Avoid */}
      {avoid.length > 0 && (
        <Section icon={ShieldAlert} title="Avoid">
          <ul className="space-y-1.5 text-sm">
            {avoid.map((a, i) => <li key={i} className="flex gap-2 text-foreground/90"><span className="text-emergency mt-1">✕</span>{a}</li>)}
          </ul>
        </Section>
      )}

      {/* Location context */}
      {result.location_context && (
        <Section icon={MapPin} title="Location context">
          <p className="text-sm text-foreground/90">{result.location_context}</p>
        </Section>
      )}

      {/* Extracted prices → NaviVerify */}
      {priceData.length > 0 && (
        <Section icon={ScanLine} title="Prices found in this scan">
          <ul className="space-y-2 text-sm">
            {priceData.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="text-text-secondary truncate">{p.item || 'Item'}{p.quantity ? ` ×${p.quantity}` : ''}</span>
                <span className="font-medium">{p.total != null ? money(p.total, p.currency) : money(p.price, p.currency)}</span>
              </li>
            ))}
          </ul>
          <button onClick={onCheckPrice} className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium">
            <ScanLine size={16} /> Check this price with NaviVerify
          </button>
        </Section>
      )}

      {/* Sources / verification */}
      {sources.length > 0 && (
        <Section icon={ExternalLink} title="Source / verification">
          <div className="space-y-2 text-sm">
            {sources.map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-navy">{s.name || 'Source'}</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-muted text-text-secondary">{(s.kind || 'source').replace('_', ' ')}</span>
                </div>
                {s.note && <p className="text-text-secondary text-xs mt-0.5">{s.note}</p>}
                {s.url && <a href={s.url} target="_blank" rel="noopener" className="text-primary text-xs hover:underline break-all">{s.url}</a>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <button onClick={onScanAgain} className="w-full inline-flex items-center justify-center gap-2 bg-mint text-navy rounded-xl py-2.5 text-sm font-medium">
        <ScanLine size={16} /> Scan again
      </button>
    </div>
  );
}