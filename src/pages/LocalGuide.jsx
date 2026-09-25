import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2, Check, X, Lightbulb, Info, MapPin, Sparkles, RefreshCw } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { reverseGeocode } from '@/lib/naviora';
import { useI18n } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';

const EXAMPLES = [
  'Visiting the Golden Temple (Gurudwara)',
  'Going to a mosque for the first time',
  'Entering a Hindu temple',
  'At a Japanese onsen',
  'Visiting a Buddhist monastery',
  'Shopping at a local market',
  'Attending a Sikh wedding',
  'Trekking in a national park'
];

export default function LocalGuide() {
  const { lang } = useI18n();
  const { location: geo, error, loading, requestOnce } = useGeolocation();
  const [placeName, setPlaceName] = useState('');
  const [query, setQuery] = useState('');
  const [guide, setGuide] = useState(null);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (geo) reverseGeocode(geo.lat, geo.lng).then((n) => { setPlaceName(n); if (!query) setQuery(`Visiting ${n}`); }).catch(() => {});
  }, [geo]);

  const getGuide = async () => {
    if (!placeName && !query.trim()) { setErr('Allow location or describe where you are going.'); return; }
    setLoadingGuide(true);
    setErr(null);
    setGuide(null);
    try {
      const res = await base44.functions.invoke('LocalGuide', {
        query: query.trim(),
        location: placeName || '',
        userLat: geo?.lat,
        userLng: geo?.lng,
        userLang: lang
      });
      if (res?.data?.error) setErr(res.data.error);
      else setGuide(res.data);
    } catch (e) {
      setErr(e.message || 'Could not load the local guide.');
    } finally {
      setLoadingGuide(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><BookOpen className="text-primary" /> Local Guide</h1>
        <p className="text-sm text-text-secondary mt-1">Know what to do — and what not to — at the place you're visiting. Respect local customs and stay safe.</p>
      </div>

      {/* Location */}
      <div className="rounded-xl bg-card border border-border p-3 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-text-secondary min-w-0"><MapPin size={15} className="text-primary shrink-0" /> {loading ? 'Locating…' : error ? 'Location off — type your place below' : placeName ? <span className="truncate">{placeName}</span> : 'Location off'}</span>
        {error && <button onClick={() => requestOnce().catch(() => {})} className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1"><RefreshCw size={12} /> Enable</button>}
      </div>

      {/* Query */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
        <div>
          <label className="text-xs text-text-secondary">What are you visiting or doing?</label>
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={2} placeholder="e.g. Visiting the Golden Temple (a Gurudwara) in Amritsar" className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.slice(0, 6).map((ex) => (
            <button key={ex} onClick={() => setQuery(ex)} className="px-2.5 py-1 rounded-full text-xs bg-mint/40 text-navy border border-mint hover:bg-mint/60">
              {ex}
            </button>
          ))}
        </div>

        <button onClick={getGuide} disabled={loadingGuide} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
          {loadingGuide ? <><Loader2 size={16} className="animate-spin" /> Researching local rules…</> : <><Sparkles size={16} /> Get local rules</>}
        </button>
      </div>

      {err && <div className="rounded-xl bg-emergency/10 border border-emergency/20 p-3 text-sm text-emergency">{err}</div>}

      {loadingGuide && (
        <div className="rounded-2xl bg-card border border-border p-6 text-center text-sm text-text-secondary flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={24} />
          Searching live sources for the customs, rules and etiquette of this place…
        </div>
      )}

      {guide && (
        <div className="space-y-4 animate-fade-in">
          {/* Header */}
          <div className="rounded-2xl bg-gradient-to-br from-navy to-primary text-primary-foreground p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wide text-primary-foreground/70">{guide.place_type}</div>
            <h2 className="text-xl font-heading font-bold mt-0.5">{guide.place_name}</h2>
            {guide.context && <p className="text-sm text-primary-foreground/85 mt-2 leading-relaxed">{guide.context}</p>}
          </div>

          {guide.essential_info?.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
              <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2"><Info size={16} className="text-primary" /> Essential info</h3>
              <ul className="space-y-2">
                {guide.essential_info.map((x, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" /> <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Do */}
            <div className="rounded-2xl bg-card border border-emerald-200 p-5 shadow-soft">
              <h3 className="font-heading font-semibold text-emerald-700 mb-3 flex items-center gap-2"><Check size={16} /> Do</h3>
              <ul className="space-y-2.5">
                {guide.do_list?.map((x, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" /> <span className="text-foreground">{x}</span>
                  </li>
                ))}
                {(!guide.do_list || guide.do_list.length === 0) && <li className="text-sm text-text-secondary">No specific do's found.</li>}
              </ul>
            </div>

            {/* Don't */}
            <div className="rounded-2xl bg-card border border-red-200 p-5 shadow-soft">
              <h3 className="font-heading font-semibold text-red-600 mb-3 flex items-center gap-2"><X size={16} /> Don't</h3>
              <ul className="space-y-2.5">
                {guide.dont_list?.map((x, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <X size={15} className="text-red-500 mt-0.5 shrink-0" /> <span className="text-foreground">{x}</span>
                  </li>
                ))}
                {(!guide.dont_list || guide.dont_list.length === 0) && <li className="text-sm text-text-secondary">No specific don'ts found.</li>}
              </ul>
            </div>
          </div>

          {guide.tips?.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
              <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2"><Lightbulb size={16} className="text-amber-500" /> Insider tips</h3>
              <ul className="space-y-2">
                {guide.tips.map((x, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <Lightbulb size={14} className="text-amber-500 mt-0.5 shrink-0" /> <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {guide.sources?.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
              <h3 className="font-heading font-semibold text-navy mb-3">Sources</h3>
              <ul className="space-y-2">
                {guide.sources.map((s, i) => (
                  <li key={i} className="text-sm">
                    {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.name}</a> : <span className="text-foreground">{s.name}</span>}
                    {s.note && <span className="text-text-secondary"> — {s.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={`rounded-xl p-3 text-xs ${guide.confidence === 'high' ? 'bg-emerald-50 text-emerald-700' : guide.confidence === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-muted text-text-secondary'}`}>
            Confidence: {guide.confidence}. {guide.confidence_note}
          </div>
        </div>
      )}

      <p className="text-xs text-text-secondary/70 text-center">Local Guide uses live web search for the real customs of your specific place. When a rule is uncertain, it tells you so rather than guessing.</p>
    </div>
  );
}