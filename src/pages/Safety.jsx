import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Phone, Plus, Pencil, Trash2, Star, MapPin, Navigation, RefreshCw, X, Check, AlertTriangle, Share2, Square, Heart, Moon, MessageCircle, MessageSquareText, Send, Building2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { fetchMultiPlaces, openInMaps, formatDistance, SAFETY_CATEGORIES, WOMEN_SAFE_CATEGORIES, isOpenNow, buildLiveLocationMessage, waLink, smsLink } from '@/lib/naviora';
import SOSButton from '@/components/SOSButton';
import EmptyState from '@/components/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const HELPLINES = [
  { label: 'Emergency (112)', num: '112' },
  { label: 'Police (100)', num: '100' },
  { label: "Women's Helpline (1091)", num: '1091' },
  { label: 'Women in Distress (181)', num: '181' },
  { label: 'Cyber Crime (1930)', num: '1930' }
];

export default function Safety() {
  const { user } = useAuth();
  const { location, error, loading, requestOnce, startWatch, stopWatch } = useGeolocation();
  const [tab, setTab] = useState('general');
  const [safetyMode, setSafetyMode] = useState(false);
  const [womenMode, setWomenMode] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [sosState, setSosState] = useState(null);
  const [sosError, setSosError] = useState(null);
  const [locSession, setLocSession] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [nearby, setNearby] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [notifyResult, setNotifyResult] = useState(null);
  const [notifying, setNotifying] = useState(false);

  const loadContacts = () => base44.entities.EmergencyContact.list('-created_date').then(setContacts).catch(() => {});
  useEffect(() => {
    loadContacts();
    base44.entities.LocationSession.filter({ status: 'active' }).then((s) => s[0] && setLocSession(s)).catch(() => {});
  }, []);

  // ---- One-click auto notify ALL contacts (SMS via Twilio + email via SendEmail) ----
  const autoNotifyAll = async (note) => {
    const message = buildLiveLocationMessage(user?.full_name, location?.lat, location?.lng, note);
    const payload = contacts.filter((c) => c.include_in_sos).map((c) => ({ name: c.name, phone: c.phone }));
    if (payload.length === 0) return { message, noContacts: true };
    setNotifying(true);
    try {
      const res = await base44.functions.invoke('SendSafetyAlerts', { message, contacts: payload });
      return { message, ...res.data };
    } catch (e) {
      return { message, error: e?.message || 'Failed to send alerts' };
    } finally {
      setNotifying(false);
    }
  };

  // ---- Live location sharing ----
  const startSharing = async () => {
    try {
      const pos = await requestOnce();
      const session = await base44.entities.LocationSession.create({ start_time: new Date().toISOString(), status: 'active', last_lat: pos.lat, last_lng: pos.lng, last_updated: new Date().toISOString() });
      setLocSession(session);
      startWatch();
      await base44.entities.SafetyEvent.create({ event_type: 'location_shared', severity: 'info', status: 'active' });
      // One-click: automatically notify all emergency contacts with live location
      const result = await autoNotifyAll('is sharing their live location with you and needs you to stay connected');
      setNotifyResult(result);
    } catch (e) { setSosError(e.message); }
  };
  const stopSharing = async () => {
    stopWatch();
    if (locSession) await base44.entities.LocationSession.update(locSession.id, { status: 'stopped', end_time: new Date().toISOString() });
    setLocSession(null);
    setNotifyResult(null);
    await base44.entities.SafetyEvent.create({ event_type: 'location_stopped', severity: 'info', status: 'resolved' });
  };

  useEffect(() => {
    if (locSession) {
      const interval = setInterval(() => setSessionDuration(Math.round((Date.now() - new Date(locSession.start_time).getTime()) / 1000)), 1000);
      return () => clearInterval(interval);
    }
  }, [locSession]);

  useEffect(() => {
    if (location && locSession) {
      base44.entities.LocationSession.update(locSession.id, { last_lat: location.lat, last_lng: location.lng, last_updated: new Date().toISOString() }).catch(() => {});
    }
  }, [location, locSession]);

  const liveMessage = (note = 'needs you') => buildLiveLocationMessage(user?.full_name, location?.lat, location?.lng, note);

  // ---- SOS activation ----
  const handleSOS = async () => {
    setSosActive(true); setSosError(null);
    setSosState({ step: 'locating' });
    let pos = location;
    try {
      if (!pos) pos = await requestOnce();
      setSosState({ step: 'notifying', location: pos });
      await base44.entities.SafetyEvent.create({ event_type: 'sos_activated', severity: 'critical', status: 'active', lat: pos?.lat, lng: pos?.lng });
      if (!locSession) {
        const session = await base44.entities.LocationSession.create({ start_time: new Date().toISOString(), status: 'active', last_lat: pos.lat, last_lng: pos.lng, last_updated: new Date().toISOString() });
        setLocSession(session);
        startWatch();
      }
      const result = await autoNotifyAll('has activated SOS and needs you urgently');
      setSosState({ step: 'active', location: pos, result });
    } catch (e) {
      setSosError(e.message || 'Could not activate SOS.');
      setSosState({ step: 'active', location: null, result: { error: e.message } });
    }
  };
  const cancelSOS = async () => {
    await base44.entities.SafetyEvent.create({ event_type: 'sos_cancelled', severity: 'info', status: 'resolved' });
    setSosActive(false); setSosState(null);
  };

  // ---- Nearby services ----
  const loadNearby = useCallback(async () => {
    if (!location) return;
    setLoadingNearby(true);
    try {
      const cats = tab === 'women' ? WOMEN_SAFE_CATEGORIES : SAFETY_CATEGORIES;
      const merged = await fetchMultiPlaces(location.lat, location.lng, cats, 5000, 24).catch(() => []);
      if (tab === 'women') setSafeZones(merged); else setNearby(merged);
    } finally { setLoadingNearby(false); }
  }, [location, tab]);

  useEffect(() => { if (location && (safetyMode || womenMode)) loadNearby(); }, [location, safetyMode, womenMode, loadNearby]);

  const toggleSafetyMode = async () => {
    const n = !safetyMode;
    setSafetyMode(n);
    base44.entities.SafetyEvent.create({ event_type: n ? 'safety_mode_on' : 'safety_mode_off', severity: 'info', status: n ? 'active' : 'resolved' }).catch(() => {});
    if (n) {
      if (!location) await requestOnce().catch(() => {});
      startWatch();
      loadNearby();
    } else {
      stopWatch();
    }
  };

  const saveContact = async (data) => {
    if (editing) await base44.entities.EmergencyContact.update(editing.id, data);
    else await base44.entities.EmergencyContact.create(data);
    if (data.is_primary) {
      const others = contacts.filter((c) => c.is_primary && c.id !== editing?.id);
      await Promise.all(others.map((c) => base44.entities.EmergencyContact.update(c.id, { is_primary: false })));
    }
    loadContacts(); setShowContactForm(false); setEditing(null);
  };

  const CAT_BADGE = (cat) => cat === 'police' ? 'bg-blue-100 text-blue-700' : cat === 'hospitals' ? 'bg-red-100 text-red-700' : cat === 'pharmacies' ? 'bg-emerald-100 text-emerald-700' : 'bg-mint text-navy';

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><Shield /> Safety Center</h1>
        <p className="text-sm text-text-secondary mt-1">Real-time SOS, live location sharing, trusted contacts and nearby help.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setTab('general')} className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5', tab === 'general' ? 'border-primary text-primary' : 'border-transparent text-text-secondary')}><Shield size={15} /> General Safety</button>
        <button onClick={() => setTab('women')} className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5', tab === 'women' ? 'border-primary text-primary' : 'border-transparent text-text-secondary')}><Heart size={15} /> Women's Safety</button>
      </div>

      {/* ===== GENERAL SAFETY ===== */}
      {tab === 'general' && (
        <>
          {/* Safety mode */}
          <div className="rounded-2xl bg-card border border-border p-4 shadow-soft flex items-center justify-between">
            <div>
              <div className="font-heading font-semibold text-navy">Safety Mode</div>
              <p className="text-xs text-text-secondary">Starts live tracking and shows nearby police, hospitals and pharmacies.</p>
            </div>
            <button onClick={toggleSafetyMode} className={cn('relative w-12 h-7 rounded-full transition-colors', safetyMode ? 'bg-primary' : 'bg-muted')} aria-label="Toggle safety mode">
              <span className={cn('absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform', safetyMode ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>

          {/* SOS */}
          <div className="rounded-3xl bg-gradient-to-br from-emergency/10 to-peach/40 border border-emergency/20 p-8 flex flex-col items-center">
            <h2 className="font-heading font-semibold text-navy mb-1">Emergency SOS</h2>
            <p className="text-xs text-text-secondary mb-6 text-center max-w-xs">Hold 2 seconds to activate. It starts live sharing and automatically emails all your emergency contacts.</p>
            {!sosActive ? (
              <SOSButton onActivate={handleSOS} />
            ) : (
              <div className="w-full text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emergency text-white text-sm font-medium animate-pulse"><AlertTriangle size={16} /> SOS Active</div>
                {sosState?.location && <a href={`https://www.google.com/maps?q=${sosState.location.lat},${sosState.location.lng}`} target="_blank" rel="noopener" className="block text-sm text-primary underline">Your location: {sosState.location.lat.toFixed(4)}, {sosState.location.lng.toFixed(4)}</a>}
                {notifying && <p className="text-sm text-text-secondary flex items-center justify-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Sending alerts to your contacts…</p>}
                {sosState?.result && <NotifyResult result={sosState.result} />}
                <p className="text-sm font-medium text-navy">Send manually as backup:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {contacts.filter((c) => c.include_in_sos).map((c) => (
                    <ContactShareRow key={c.id} contact={c} message={liveMessage('has activated SOS and needs you')} />
                  ))}
                </div>
                {contacts.filter((c) => c.include_in_sos).length === 0 && <p className="text-sm text-text-secondary">No emergency contacts yet — add some below.</p>}
                <div className="flex gap-2 justify-center pt-2">
                  <a href="tel:112" className="px-5 py-2.5 rounded-xl bg-emergency text-white font-medium flex items-center gap-2"><Phone size={16} /> Call 112</a>
                  <button onClick={cancelSOS} className="px-5 py-2.5 rounded-xl border border-border font-medium flex items-center gap-2"><X size={16} /> Cancel SOS</button>
                </div>
              </div>
            )}
            {sosError && <p className="text-sm text-emergency mt-3 text-center">{sosError}</p>}
          </div>

          {/* Live location sharing */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-navy flex items-center gap-2"><Share2 size={18} /> Live Location Sharing</h3>
              {locSession && <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active • {Math.floor(sessionDuration / 60)}m {sessionDuration % 60}s</span>}
            </div>
            {locSession ? (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">Your live location is being shared and updated in real time. All emergency contacts were notified automatically when you started.</p>
                {location && <p className="text-xs text-text-secondary">Current: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>}
                {notifyResult && <NotifyResult result={notifyResult} />}
                <button onClick={() => autoNotifyAll('is still sharing their live location with you').then(setNotifyResult)} disabled={notifying} className="w-full flex items-center justify-center gap-2 bg-mint text-navy rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
                  {notifying ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><RefreshCw size={14} /> Re-notify all contacts</>}
                </button>
                <button onClick={stopSharing} className="w-full flex items-center justify-center gap-2 bg-emergency text-white rounded-xl py-2.5 text-sm font-medium"><Square size={14} /> Stop Sharing</button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">One tap starts sharing and automatically notifies all your emergency contacts with your live location.</p>
                {error && <p className="text-xs text-emergency">{error}</p>}
                <button onClick={startSharing} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">{loading ? 'Locating…' : <><MapPin size={14} /> Start & Notify All</>}</button>
                {error && <button onClick={() => requestOnce().catch(()=>{})} className="text-xs text-primary underline flex items-center gap-1 mx-auto"><RefreshCw size={12} /> Retry location</button>}
              </div>
            )}
          </div>

          {/* Nearby help — always visible when safety mode on */}
          {safetyMode && (
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-navy flex items-center gap-2"><MapPin size={18} /> Nearby Help</h3>
                {location && <button onClick={loadNearby} className="text-xs text-primary flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>}
              </div>
              {!location && <p className="text-sm text-text-secondary">Locating you…</p>}
              {loadingNearby && <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />)}</div>}
              {!loadingNearby && nearby.length === 0 && location && <p className="text-sm text-text-secondary">No emergency services found nearby. Call 112 for help.</p>}
              {nearby.length > 0 && (
                <div className="space-y-2">
                  {nearby.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold', CAT_BADGE(p.category))}>{p.category === 'police' ? 'P' : p.category === 'hospitals' ? 'H' : 'Rx'}</div>
                      <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{p.name}</div><div className="text-xs text-text-secondary">{formatDistance(p.distance)} away</div></div>
                      {p.phone && <a href={`tel:${p.phone}`} className="p-2 rounded-lg hover:bg-muted text-primary"><Phone size={15} /></a>}
                      <button onClick={() => openInMaps(p.lat, p.lng, p.name)} className="p-2 rounded-lg hover:bg-muted text-primary"><Navigation size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== WOMEN'S SAFETY ===== */}
      {tab === 'women' && (
        <>
          <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-peach/40 border border-pink-200 p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Heart size={20} className="text-pink-600" />
                <div>
                  <div className="font-heading font-semibold text-navy">Women's Safety Mode</div>
                  <p className="text-xs text-text-secondary">Surfaces safe zones, helplines and one-tap live-location sharing.</p>
                </div>
              </div>
              <button onClick={async () => { const n = !womenMode; setWomenMode(n); base44.entities.SafetyEvent.create({ event_type: n ? 'safety_mode_on' : 'safety_mode_off', severity: 'info', status: n ? 'active' : 'resolved' }).catch(()=>{}); if (n) { if (!location) await requestOnce().catch(()=>{}); startWatch(); loadNearby(); } else stopWatch(); }}
                className={cn('relative w-12 h-7 rounded-full transition-colors', womenMode ? 'bg-pink-600' : 'bg-muted')} aria-label="Toggle women's safety mode">
                <span className={cn('absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform', womenMode ? 'translate-x-5' : 'translate-x-0.5')} />
              </button>
            </div>
            <div className="flex items-start gap-2 text-xs text-text-secondary bg-white/60 rounded-xl p-3">
              <Moon size={14} className="shrink-0 mt-0.5 text-pink-600" />
              <span>If you're travelling at night, stay in well-lit, crowded areas. Avoid empty streets and unverified cabs. Share your live location with a trusted contact before you leave.</span>
            </div>
          </div>

          {/* One-tap notify all */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
            <h3 className="font-heading font-semibold text-navy mb-1 flex items-center gap-2"><Share2 size={18} /> Notify all trusted contacts</h3>
            <p className="text-xs text-text-secondary mb-3">One tap sends "{user?.full_name || 'This traveler'} needs you" with your live coordinates to every contact automatically by email.</p>
            <button onClick={async () => { const r = await autoNotifyAll('needs you — please stay with me on the line'); setNotifyResult(r); }} disabled={notifying || contacts.length === 0} className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
              {notifying ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={15} /> Notify all contacts now</>}
            </button>
            {contacts.length === 0 && <p className="text-xs text-text-secondary mt-2">Add a trusted contact below to enable this.</p>}
            {notifyResult && <div className="mt-3"><NotifyResult result={notifyResult} /></div>}
          </div>

          {/* Quick helplines */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
            <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2"><Phone size={18} /> Quick Helplines (India)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HELPLINES.map((h) => (
                <a key={h.num} href={`tel:${h.num}`} className="flex items-center gap-2 rounded-xl border border-border p-3 hover:border-pink-400 hover:bg-pink-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm">{h.num}</div>
                  <span className="text-xs font-medium text-navy">{h.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Safe zones nearby */}
          {womenMode && (
            <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-navy flex items-center gap-2"><Building2 size={18} /> Safe Zones Nearby</h3>
                {location && <button onClick={loadNearby} className="text-xs text-primary flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>}
              </div>
              {!location && <p className="text-sm text-text-secondary">Locating you…</p>}
              {loadingNearby && <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />)}</div>}
              {!loadingNearby && safeZones.length === 0 && location && <p className="text-sm text-text-secondary">No safe zones found nearby.</p>}
              {safeZones.length > 0 && (
                <div className="space-y-2">
                  {safeZones.map((p) => {
                    const open = isOpenNow(p.opening_hours);
                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold', CAT_BADGE(p.category))}>{p.category[0].toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{p.name}</div>
                          <div className="text-xs text-text-secondary flex items-center gap-2">{formatDistance(p.distance)} {open === true && <span className="text-emerald-600 font-medium">• Open</span>}{open === false && <span className="text-red-500">• Closed</span>}</div>
                        </div>
                        {p.phone && <a href={`tel:${p.phone}`} className="p-2 rounded-lg hover:bg-muted text-primary"><Phone size={15} /></a>}
                        <button onClick={() => openInMaps(p.lat, p.lng, p.name)} className="p-2 rounded-lg hover:bg-muted text-primary"><Navigation size={15} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Emergency contacts */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-navy">Emergency Contacts</h3>
          <button onClick={() => { setEditing(null); setShowContactForm(true); }} className="text-sm text-primary flex items-center gap-1 hover:underline"><Plus size={16} /> Add</button>
        </div>
        {contacts.length === 0 ? (
          <EmptyState icon={Phone} title="Add trusted contacts for extra peace of mind." description="They receive your live location and SOS alerts automatically." action={<Button onClick={() => setShowContactForm(true)}>Add contact</Button>} />
        ) : (
          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', c.is_primary ? 'bg-emergency/10 text-emergency' : 'bg-mint text-navy')}>{c.is_primary ? <Star size={16} /> : c.name[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.name} {c.is_primary && <span className="text-xs text-emergency">★ Primary</span>}</div>
                  <div className="text-xs text-text-secondary truncate">{c.phone}{c.relationship ? ` • ${c.relationship}` : ''}</div>
                </div>
                <a href={`tel:${c.phone}`} className="p-2 rounded-lg hover:bg-muted text-primary"><Phone size={16} /></a>
                {c.phone && !c.phone.includes('@') && <a href={waLink(c.phone, liveMessage('needs you'))} target="_blank" rel="noopener" className="p-2 rounded-lg hover:bg-muted text-emerald-600"><MessageCircle size={16} /></a>}
                <button onClick={() => { setEditing(c); setShowContactForm(true); }} className="p-2 rounded-lg hover:bg-muted text-text-secondary"><Pencil size={15} /></button>
                <button onClick={async () => { await base44.entities.EmergencyContact.delete(c.id); loadContacts(); }} className="p-2 rounded-lg hover:bg-muted text-text-secondary hover:text-emergency"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ContactForm open={showContactForm} onClose={() => { setShowContactForm(false); setEditing(null); }} onSave={saveContact} editing={editing} />
    </div>
  );
}

// ---- Auto-notify result display ----
function NotifyResult({ result }) {
  if (!result) return null;
  if (result.noContacts) return <p className="text-sm text-text-secondary">No emergency contacts configured yet.</p>;
  if (result.error) return <p className="text-sm text-emergency">⚠ {result.error}</p>;
  const emailOk = (result.email_sent || []).length;
  const emailFail = (result.email_failed || []).length;
  const skipped = (result.skipped || []).length;
  return (
    <div className="text-sm space-y-1 text-left bg-mint/30 border border-mint rounded-xl p-3">
      {emailOk > 0 && <p className="text-emerald-700 flex items-center gap-1.5"><Check size={14} /> Email sent to {emailOk} contact{emailOk > 1 ? 's' : ''}.</p>}
      {emailFail > 0 && <p className="text-emergency">Email failed for {emailFail} — the mail gateway may be unavailable. Use the manual buttons below.</p>}
      {skipped > 0 && <p className="text-text-secondary text-xs">{skipped} phone-only contact{skipped > 1 ? 's were' : ' was'} skipped (no SMS) — use WhatsApp / call buttons below.</p>}
      {emailOk === 0 && emailFail === 0 && skipped > 0 && <p className="text-amber-700 text-xs">No email contacts found. Add a contact with an email address to receive automatic alerts.</p>}
    </div>
  );
}

// ---- One contact row with Call / WhatsApp / SMS / Email one-tap (manual backup) ----
function ContactShareRow({ contact, message }) {
  const isEmail = String(contact.phone || '').includes('@');
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border p-2.5 bg-background/50">
      <div className="w-9 h-9 rounded-full bg-mint text-navy flex items-center justify-center text-sm font-semibold shrink-0">{contact.name[0]?.toUpperCase()}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{contact.name}</div>
        <div className="text-xs text-text-secondary truncate">{contact.phone}</div>
      </div>
      <a href={`tel:${contact.phone}`} className="p-2 rounded-lg hover:bg-muted text-primary" aria-label="Call"><Phone size={16} /></a>
      {isEmail ? (
        <a href={`mailto:${contact.phone}?subject=${encodeURIComponent('NaviOra Alert')}&body=${encodeURIComponent(message)}`} className="p-2 rounded-lg hover:bg-muted text-primary" aria-label="Email"><Send size={16} /></a>
      ) : (
        <>
          <a href={waLink(contact.phone, message)} target="_blank" rel="noopener" className="p-2 rounded-lg hover:bg-muted text-emerald-600" aria-label="WhatsApp"><MessageCircle size={16} /></a>
          <a href={smsLink(contact.phone, message)} className="p-2 rounded-lg hover:bg-muted text-primary" aria-label="SMS"><MessageSquareText size={16} /></a>
        </>
      )}
    </div>
  );
}

function ContactForm({ open, onClose, onSave, editing }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [includeSos, setIncludeSos] = useState(true);

  useEffect(() => {
    if (editing) { setName(editing.name); setPhone(editing.phone); setRelationship(editing.relationship || ''); setIsPrimary(editing.is_primary); setIncludeSos(editing.include_in_sos); }
    else { setName(''); setPhone(''); setRelationship(''); setIsPrimary(false); setIncludeSos(true); }
  }, [editing, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit contact' : 'Add emergency contact'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" /></div>
          <div><Label>Email (recommended) or phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="name@email.com or +91…" /></div>
          <div><Label>Relationship (optional)</Label><Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. Sister" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} /> Primary contact</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeSos} onChange={(e) => setIncludeSos(e.target.checked)} /> Include in SOS notifications</label>
          <p className="text-xs text-text-secondary">Email contacts get an automatic alert by email when you start sharing or activate SOS. Phone contacts are reached via one-tap WhatsApp / call buttons.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, phone, relationship, is_primary: isPrimary, include_in_sos: includeSos })} disabled={!name || !phone}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}