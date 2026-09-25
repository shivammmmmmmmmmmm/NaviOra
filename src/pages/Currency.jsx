import React, { useState, useEffect } from 'react';
import { Coins, ArrowLeftRight, Loader2, RefreshCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'NPR', name: 'Nepali Rupee', flag: '🇳🇵' },
  { code: 'LKR', name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'BDT', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' }
];

const POPULAR = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'JPY', 'SGD', 'THB'];

export default function Currency() {
  const { t } = useI18n();
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('INR');
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);

  const load = async (base) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const data = await res.json();
      if (data && data.rates) {
        setRates(data.rates);
        setUpdated(data.time_last_update_utc || new Date().toUTCString());
      } else {
        setErr('Could not load live rates. Try again.');
      }
    } catch (e) {
      setErr('Network error — check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(from); }, [from]);

  const swap = () => { setFrom(to); setTo(from); };

  const rate = rates && rates[to];
  const amt = parseFloat(amount) || 0;
  const result = rate != null ? amt * rate : null;

  const fmt = (val, code) => {
    if (val == null || isNaN(val)) return '—';
    const cur = code === 'USD' || code === 'EUR' || code === 'GBP' || code === 'AUD' || code === 'CAD' || code === 'NZD' || code === 'CHF' || code === 'SGD' ? 2 : code === 'JPY' || code === 'KRW' || code === 'IDR' ? 0 : 2;
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: cur, minimumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><Coins className="text-primary" /> Currency Converter</h1>
        <p className="text-sm text-text-secondary mt-1">Live exchange rates, updated in real time. No sign-up needed.</p>
      </div>

      {/* Converter card */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
        <div>
          <label className="text-xs text-text-secondary">Amount</label>
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-lg font-semibold" />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div>
            <label className="text-xs text-text-secondary">From</label>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
            </select>
          </div>
          <button onClick={swap} aria-label="Swap" className="mb-1 w-10 h-10 rounded-xl bg-mint text-navy flex items-center justify-center hover:bg-mint/70 shrink-0">
            <ArrowLeftRight size={16} />
          </button>
          <div>
            <label className="text-xs text-text-secondary">To</label>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-xl bg-mint/30 border border-mint p-4 text-center">
          {loading && !rates ? (
            <div className="flex items-center justify-center gap-2 text-text-secondary text-sm"><Loader2 size={16} className="animate-spin" /> Fetching live rates…</div>
          ) : err ? (
            <div className="text-sm text-emergency">{err}</div>
          ) : (
            <>
              <div className="text-2xl font-heading font-bold text-navy">{fmt(result, to)}</div>
              <div className="text-xs text-text-secondary mt-1">1 {from} = {rate != null ? fmt(rate, to) : '—'} · {amt} {from} → {fmt(result, to)}</div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>{updated && <>Updated {new Date(updated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</>}</span>
          <button onClick={() => load(from)} disabled={loading} className="flex items-center gap-1 text-primary hover:underline">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Quick reference table */}
      {rates && !err && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <h3 className="font-heading font-semibold text-navy mb-3">1 {from} in popular currencies</h3>
          <div className="grid grid-cols-2 gap-2">
            {POPULAR.filter((c) => c !== from).map((c) => (
              <div key={c} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm text-text-secondary">{CURRENCIES.find((x) => x.code === c)?.flag} {c}</span>
                <span className="text-sm font-medium text-navy">{rates[c] ? fmt(rates[c], c) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-text-secondary/70 text-center">Rates from open.er-api.com (live, no API key). For guidance only — confirm with your bank or exchange before large transactions.</p>
    </div>
  );
}