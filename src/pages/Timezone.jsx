import React, { useState, useEffect } from 'react';
import { Clock, ArrowRight, Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const TIMEZONES = [
  { tz: 'Asia/Kolkata', label: 'India (IST)', flag: '🇮🇳' },
  { tz: 'Asia/Dubai', label: 'Dubai (GST)', flag: '🇦🇪' },
  { tz: 'Asia/Singapore', label: 'Singapore', flag: '🇸🇬' },
  { tz: 'Asia/Tokyo', label: 'Tokyo (JST)', flag: '🇯🇵' },
  { tz: 'Asia/Hong_Kong', label: 'Hong Kong', flag: '🇭🇰' },
  { tz: 'Asia/Bangkok', label: 'Bangkok', flag: '🇹🇭' },
  { tz: 'Asia/Kathmandu', label: 'Nepal', flag: '🇳🇵' },
  { tz: 'Asia/Karachi', label: 'Pakistan', flag: '🇵🇰' },
  { tz: 'Asia/Dhaka', label: 'Bangladesh', flag: '🇧🇩' },
  { tz: 'Asia/Colombo', label: 'Sri Lanka', flag: '🇱🇰' },
  { tz: 'Europe/London', label: 'London (GMT)', flag: '🇬🇧' },
  { tz: 'Europe/Paris', label: 'Paris (CET)', flag: '🇫🇷' },
  { tz: 'Europe/Berlin', label: 'Berlin', flag: '🇩🇪' },
  { tz: 'Europe/Moscow', label: 'Moscow', flag: '🇷🇺' },
  { tz: 'America/New_York', label: 'New York (EST)', flag: '🇺🇸' },
  { tz: 'America/Los_Angeles', label: 'Los Angeles', flag: '🇺🇸' },
  { tz: 'America/Chicago', label: 'Chicago', flag: '🇺🇸' },
  { tz: 'America/Toronto', label: 'Toronto', flag: '🇨🇦' },
  { tz: 'America/Sao_Paulo', label: 'São Paulo', flag: '🇧🇷' },
  { tz: 'Australia/Sydney', label: 'Sydney', flag: '🇦🇺' },
  { tz: 'Pacific/Auckland', label: 'Auckland', flag: '🇳🇿' },
  { tz: 'UTC', label: 'UTC', flag: '🌐' }
];

const LOCAL_TZ = (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';

function fmtTime(date, tz, opts = {}) {
  return new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true, ...opts }).format(date);
}
function fmtFull(date, tz) {
  return new Intl.DateTimeFormat(undefined, { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
}

// Offset (minutes) of tz at the given instant, wall - utc
function tzOffsetMinutes(tz, date) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = fmt.formatToParts(date).reduce((a, x) => (a[x.type] = x.value, a), {});
  let h = parseInt(p.hour, 10); if (p.hour === '24') h = 0;
  const wallAsUtc = Date.UTC(parseInt(p.year, 10), parseInt(p.month, 10) - 1, parseInt(p.day, 10), h, parseInt(p.minute, 10));
  return Math.round((wallAsUtc - date.getTime()) / 60000);
}

function offsetLabel(min) {
  const sign = min >= 0 ? '+' : '-';
  const abs = Math.abs(min);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

export default function Timezone() {
  const { t } = useI18n();
  const [now, setNow] = useState(new Date());
  const [srcTz, setSrcTz] = useState(LOCAL_TZ);
  const [tgtTz, setTgtTz] = useState('Asia/Kolkata');
  const [dt, setDt] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Parse the input wall time as being in srcTz → produce an instant
  let converted = null;
  let srcOffset = 0, tgtOffset = 0, diffMin = 0;
  try {
    const [datePart, timePart] = dt.split('T');
    const [Y, Mo, D] = datePart.split('-').map(Number);
    const [H, Mi] = timePart.split(':').map(Number);
    const asUtc = Date.UTC(Y, Mo - 1, D, H, Mi);
    srcOffset = tzOffsetMinutes(srcTz, new Date(asUtc));
    const instant = new Date(asUtc - srcOffset * 60000);
    tgtOffset = tzOffsetMinutes(tgtTz, instant);
    diffMin = tgtOffset - srcOffset;
    converted = instant;
  } catch (e) {
    converted = null;
  }

  const srcMeta = TIMEZONES.find((z) => z.tz === srcTz) || { label: srcTz, flag: '📍' };
  const tgtMeta = TIMEZONES.find((z) => z.tz === tgtTz) || { label: tgtTz, flag: '📍' };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><Clock className="text-primary" /> Timezone Converter</h1>
        <p className="text-sm text-text-secondary mt-1">See the time anywhere, and convert a moment between two places.</p>
      </div>

      {/* Live world clock */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2"><Globe size={16} className="text-primary" /> World clock (live)</h3>
        <div className="grid grid-cols-2 gap-2">
          {TIMEZONES.slice(0, 12).map((z) => (
            <div key={z.tz} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs text-text-secondary truncate">{z.flag} {z.label}</span>
              <span className="text-sm font-semibold text-navy tabular-nums">{fmtTime(now, z.tz)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Converter */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
        <h3 className="font-heading font-semibold text-navy">Convert a time</h3>

        <div>
          <label className="text-xs text-text-secondary">Date & time</label>
          <input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div>
            <label className="text-xs text-text-secondary">From timezone</label>
            <select value={srcTz} onChange={(e) => setSrcTz(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm">
              {[{ tz: LOCAL_TZ, label: 'My device time', flag: '📍' }, ...TIMEZONES.filter((z) => z.tz !== LOCAL_TZ)].map((z) => (
                <option key={z.tz} value={z.tz}>{z.flag} {z.label} ({z.tz})</option>
              ))}
            </select>
          </div>
          <div className="pb-2 flex justify-center text-primary"><ArrowRight size={18} /></div>
          <div>
            <label className="text-xs text-text-secondary">To timezone</label>
            <select value={tgtTz} onChange={(e) => setTgtTz(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm">
              {TIMEZONES.map((z) => <option key={z.tz} value={z.tz}>{z.flag} {z.label} ({z.tz})</option>)}
            </select>
          </div>
        </div>

        {converted && (
          <div className="rounded-xl bg-mint/30 border border-mint p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 text-center flex-1">
                <div className="text-xs text-text-secondary">{srcMeta.flag} {srcMeta.label}</div>
                <div className="text-lg font-heading font-bold text-navy tabular-nums">{fmtFull(converted, srcTz)}</div>
                <div className="text-xs text-text-secondary">{offsetLabel(srcOffset)}</div>
              </div>
              <ArrowRight size={18} className="text-primary shrink-0" />
              <div className="min-w-0 text-center flex-1">
                <div className="text-xs text-text-secondary">{tgtMeta.flag} {tgtMeta.label}</div>
                <div className="text-lg font-heading font-bold text-navy tabular-nums">{fmtFull(converted, tgtTz)}</div>
                <div className="text-xs text-text-secondary">{offsetLabel(tgtOffset)}</div>
              </div>
            </div>
            {diffMin !== 0 && (
              <div className="text-center text-xs text-text-secondary mt-3 pt-3 border-t border-mint">
                {tgtMeta.label} is {diffMin > 0 ? 'ahead of' : 'behind'} {srcMeta.label} by {Math.abs(diffMin) >= 60 ? `${Math.floor(Math.abs(diffMin) / 60)}h ${Math.abs(diffMin) % 60}m` : `${Math.abs(diffMin)}m`}.
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-text-secondary/70 text-center">Timezones computed with your device's Intl engine — accurate, offline, no API key.</p>
    </div>
  );
}