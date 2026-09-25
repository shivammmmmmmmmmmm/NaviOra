import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BadgeCheck, Sparkles, MapPin, Loader2 } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { reverseGeocode } from '@/lib/naviora';
import { useI18n } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import PriceResultView from '@/components/verify/PriceResultView';
import { cn } from '@/lib/utils';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'NPR', 'LKR', 'BDT', 'PKR', 'THB', 'SGD', 'MYR', 'IDR', 'JPY', 'KRW'];

export default function NaviVerify() {
  const location = useLocation();
  const { t } = useI18n();
  const { location: geo, error, loading, requestOnce } = useGeolocation();
  const [tab, setTab] = useState('describe');
  const [scenario, setScenario] = useState('');
  const [item, setItem] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [placeName, setPlaceName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  // Prefill from NaviScan hand-off
  useEffect(() => {
    const pd = location.state?.priceData;
    if (pd && pd[0]) {
      setTab('details');
      setItem(pd[0].item || '');
      setPrice(pd[0].total != null ? String(pd[0].total) : (pd[0].price != null ? String(pd[0].price) : ''));
      if (pd[0].currency) setCurrency(pd[0].currency);
    }
  }, [location.state]);

  useEffect(() => {
    if (geo) reverseGeocode(geo.lat, geo.lng).then(setPlaceName).catch(() => {});
  }, [geo]);

  const submit = async () => {
    setErr(null);
    if (tab === 'describe' && !scenario.trim()) { setErr('Describe the situation.'); return; }
    if (tab === 'details' && (!item.trim() || !price)) { setErr('Provide the item and the price.'); return; }
    setChecking(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('VerifyPrice', {
        scenario: tab === 'describe' ? scenario : '',
        item: tab === 'details' ? item : '',
        price: tab === 'details' ? Number(price) : null,
        currency,
        location: placeName || '',
        origin, destination,
        userLat: geo?.lat, userLng: geo?.lng
      });
      if (res?.data?.error) setErr(res.data.error);
      else setResult(res.data);
    } catch (e) {
      setErr(e.message || 'Price check failed.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><BadgeCheck className="text-primary" /> NaviVerify</h1>
        <p className="text-sm text-text-secondary mt-1">See how today's price compares with available local information.</p>
      </div>

      {/* Location */}
      <div className="rounded-xl bg-card border border-border p-3 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-text-secondary min-w-0"><MapPin size={15} className="text-primary shrink-0" /> {loading ? 'Locating…' : error ? 'Location off — add a place below' : placeName ? <span className="truncate">{placeName}</span> : 'Location off'}</span>
        {error && <button onClick={() => requestOnce().catch(() => {})} className="text-xs text-primary hover:underline shrink-0">Enable</button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('describe')} className={cn('flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border', tab === 'describe' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-text-secondary')}>Describe it</button>
        <button onClick={() => setTab('details')} className={cn('flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border', tab === 'details' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-text-secondary')}>Enter details</button>
      </div>

      {tab === 'describe' ? (
        <textarea value={scenario} onChange={(e) => setScenario(e.target.value)} rows={4} placeholder="e.g. Taxi driver is asking ₹2,000 from Delhi Airport to Connaught Place." className="w-full rounded-2xl border border-input bg-card p-4 text-base resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
      ) : (
        <div className="space-y-3">
          <div><label className="text-xs text-text-secondary">Item / service</label><input value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Taxi, Monument entry, Thali" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text-secondary">Price</label><input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2000" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" /></div>
            <div><label className="text-xs text-text-secondary">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm">
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-xs text-text-secondary">Location (area / city)</label><input value={placeName || ''} onChange={(e) => setPlaceName(e.target.value)} placeholder="Delhi, India" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text-secondary">Origin (optional)</label><input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Delhi Airport" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" /></div>
            <div><label className="text-xs text-text-secondary">Destination (optional)</label><input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Connaught Place" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" /></div>
          </div>
        </div>
      )}

      <button onClick={submit} disabled={checking} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
        {checking ? <><Loader2 size={16} className="animate-spin" /> Searching live prices…</> : <><Sparkles size={16} /> Check this price</>}
      </button>

      {err && <div className="rounded-xl bg-emergency/10 border border-emergency/20 p-3 text-sm text-emergency">{err}</div>}

      {checking && (
        <div className="rounded-2xl bg-card border border-border p-6 text-center text-sm text-text-secondary flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={24} />
          Retrieving current pricing from the web and comparing it with your quote…
        </div>
      )}

      {result && <PriceResultView result={result} />}

      <p className="text-xs text-text-secondary/70 text-center">NaviVerify uses live web search and never invents prices. When reliable current data can't be found, it tells you so.</p>
    </div>
  );
}