import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, MapPin, Clock, Navigation, Play, Pause, Check, AlertTriangle, RefreshCw, Flag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { computeJourneyStatus, haversine, formatDistance, openInMaps } from '@/lib/naviora';
import JourneyStatusBadge from '@/components/JourneyStatusBadge';
import MapView from '@/components/MapView';
import EmptyState from '@/components/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function TripDetail() {
  const { id } = useParams();
  const { location, requestOnce } = useGeolocation();
  const [trip, setTrip] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCp, setShowCp] = useState(false);
  const [editingCp, setEditingCp] = useState(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [acknowledgedSafeAt, setAcknowledgedSafeAt] = useState(null);
  const [events, setEvents] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Trip.get(id).catch(() => null),
      base44.entities.Checkpoint.filter({ trip_id: id }).then((c) => c.sort((a, b) => a.order - b.order)).catch(() => []),
      base44.entities.JourneyEvent.filter({ trip_id: id }).then((e) => e.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10)).catch(() => [])
    ]).then(([t, c, ev]) => { setTrip(t); setCheckpoints(c); setEvents(ev || []); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Compute route deviation: distance from current location to nearest checkpoint segment
  const routeDeviation = (() => {
    if (!location || checkpoints.length === 0) return null;
    const withCoords = checkpoints.filter((c) => c.lat);
    if (withCoords.length === 0) return null;
    const minDist = Math.min(...withCoords.map((c) => haversine(location.lat, location.lng, c.lat, c.lng)));
    return minDist;
  })();

  const status = trip ? computeJourneyStatus({ checkpoints, currentLocation: location, routeDeviationMeters: routeDeviation, acknowledgedSafeAt }) : null;

  // Auto check-in prompt when concern+
  useEffect(() => {
    if (status && (status.level === 'concern' || status.level === 'critical') && !acknowledgedSafeAt) {
      setCheckinOpen(true);
    }
  }, [status?.level, acknowledgedSafeAt]);

  const logEvent = (eventType, metadata) => base44.entities.JourneyEvent.create({ trip_id: id, timestamp: new Date().toISOString(), event_type: eventType, metadata, lat: location?.lat, lng: location?.lng }).catch(() => {});

  const markReached = async (cp) => {
    await base44.entities.Checkpoint.update(cp.id, { status: 'reached', actual_time: new Date().toISOString() });
    logEvent('checkpoint_reached', { checkpoint: cp.title });
    load();
  };

  const deleteCp = async (cpId) => { await base44.entities.Checkpoint.delete(cpId); load(); };

  const saveCp = async (data) => {
    if (editingCp) await base44.entities.Checkpoint.update(editingCp.id, data);
    else await base44.entities.Checkpoint.create({ ...data, trip_id: id, order: checkpoints.length });
    setShowCp(false); setEditingCp(null); load();
  };

  const activateTrip = async () => {
    const next = trip.status === 'active' ? 'planned' : 'active';
    await base44.entities.Trip.update(id, { status: next, monitoring_enabled: next === 'active' });
    if (next === 'active') { await requestOnce(); logEvent('status_change', { to: 'active' }); }
    load();
  };

  const respondCheckin = async (safe) => {
    setAcknowledgedSafeAt(Date.now());
    setCheckinOpen(false);
    logEvent(safe ? 'checkin_safe' : 'checkin_help', {});
    await base44.entities.SafetyEvent.create({ event_type: safe ? 'checkin_safe' : 'checkin_help', severity: safe ? 'info' : 'high', status: safe ? 'resolved' : 'active' });
    if (!safe) window.location.href = '/safety';
  };

  if (loading) return <div className="h-64 rounded-2xl bg-muted/50 animate-pulse" />;
  if (!trip) return <EmptyState icon={AlertTriangle} title="Trip not found" action={<Link to="/trips" className="text-primary underline">Back to trips</Link>} />;

  const reachedCount = checkpoints.filter((c) => c.status === 'reached').length;
  const expectedRoute = checkpoints.filter((c) => c.lat).sort((a, b) => a.order - b.order).map((c) => ({ lat: c.lat, lng: c.lng }));
  const actualRoute = []; // populated from journey events with location in a full build
  const mapMarkers = checkpoints.filter((c) => c.lat).map((c) => ({ id: c.id, name: c.title, lat: c.lat, lng: c.lng, category: c.status === 'reached' ? 'attractions' : 'expected', glyph: c.status === 'reached' ? '✓' : '•' }));
  if (location) mapMarkers.push({ id: 'me', name: 'You', lat: location.lat, lng: location.lng, category: 'user' });

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"><ArrowLeft size={16} /> All trips</Link>

      <div className="rounded-3xl bg-gradient-to-br from-navy to-primary text-primary-foreground p-6 shadow-soft-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">{trip.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-primary-foreground/80"><MapPin size={14} /> {trip.destination}</div>
          </div>
          <JourneyStatusBadge level={status.level} label={status.label} />
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm text-primary-foreground/80">
          <span className="flex items-center gap-1"><Check size={14} /> {reachedCount}/{checkpoints.length} stops</span>
          {routeDeviation != null && <span className="flex items-center gap-1"><Navigation size={14} /> {formatDistance(routeDeviation)} from route</span>}
        </div>
        <div className="mt-4">
          <Button onClick={activateTrip} variant={trip.status === 'active' ? 'secondary' : 'default'} className="gap-1.5 bg-white text-navy hover:bg-white/90">
            {trip.status === 'active' ? <><Pause size={15} /> Pause monitoring</> : <><Play size={15} /> Start journey monitoring</>}
          </Button>
        </div>
      </div>

      {/* Status reasons */}
      {status.reasons.length > 0 && (
        <div className={cn('rounded-2xl border p-4',
          status.level === 'critical' ? 'bg-red-50 border-emergency/30' : status.level === 'concern' ? 'bg-orange-50 border-orange-300' : 'bg-amber-50 border-amber-300')}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className={cn('shrink-0 mt-0.5', status.level === 'critical' ? 'text-emergency' : status.level === 'concern' ? 'text-orange-600' : 'text-amber-600')} />
            <div>
              <div className="font-medium text-sm text-navy mb-1">Journey status: {status.label}</div>
              <ul className="text-sm text-text-secondary space-y-0.5 list-disc list-inside">
                {status.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
              <p className="text-xs text-text-secondary mt-2">NaviOra does not classify you as in danger from a single signal. This combines multiple journey signals.</p>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <MapView userLocation={location} markers={mapMarkers} expectedRoute={expectedRoute} actualRoute={actualRoute} height="350px" onMarkerClick={() => {}} />

      {/* Checkpoints */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-navy">Journey checkpoints</h3>
          <Button size="sm" variant="outline" onClick={() => { setEditingCp(null); setShowCp(true); }} className="gap-1"><Plus size={14} /> Add stop</Button>
        </div>
        {checkpoints.length === 0 ? (
          <EmptyState icon={Flag} title="Add your first checkpoint" description="Plan stops like Hotel → Museum → Restaurant with expected times." />
        ) : (
          <div className="space-y-2">
            {checkpoints.map((c, i) => {
              const delayed = c.expected_time && c.status !== 'reached' && new Date(c.expected_time).getTime() < Date.now();
              return (
                <div key={c.id} className={cn('flex items-center gap-3 rounded-xl border p-3', c.status === 'reached' ? 'bg-emerald-50/50 border-emerald-200' : delayed ? 'bg-amber-50/50 border-amber-200' : 'border-border')}>
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    c.status === 'reached' ? 'bg-emerald-500 text-white' : delayed ? 'bg-amber-400 text-white' : 'bg-muted text-text-secondary')}>
                    {c.status === 'reached' ? <Check size={14} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-medium text-sm', c.status === 'reached' && 'text-text-secondary line-through')}>{c.title}</div>
                    <div className="text-xs text-text-secondary flex items-center gap-2 flex-wrap">
                      {c.expected_time && <span className="flex items-center gap-1"><Clock size={11} /> {new Date(c.expected_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                      {c.lat && <span className="flex items-center gap-1"><MapPin size={11} /> {c.lat.toFixed(3)}, {c.lng.toFixed(3)}</span>}
                      {delayed && <span className="text-amber-600 font-medium">⚠ {Math.round((Date.now() - new Date(c.expected_time).getTime()) / 60000)} min late</span>}
                    </div>
                  </div>
                  {c.status !== 'reached' && <button onClick={() => markReached(c)} className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-600" title="Mark reached"><Check size={16} /></button>}
                  {c.lat && <button onClick={() => openInMaps(c.lat, c.lng, c.title)} className="p-2 rounded-lg hover:bg-muted text-primary"><Navigation size={15} /></button>}
                  <button onClick={() => { setEditingCp(c); setShowCp(true); }} className="p-2 rounded-lg hover:bg-muted text-text-secondary"><Flag size={14} /></button>
                  <button onClick={() => deleteCp(c.id)} className="p-2 rounded-lg hover:bg-muted text-text-secondary hover:text-emergency"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent journey events */}
      {events.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <h3 className="font-heading font-semibold text-navy mb-3">Journey activity</h3>
          <div className="space-y-1.5">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="capitalize">{e.event_type.replace(/_/g, ' ')}</span>
                <span className="ml-auto">{new Date(e.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <CheckpointForm open={showCp} onClose={() => { setShowCp(false); setEditingCp(null); }} onSave={saveCp} editing={editingCp} />

      {/* Smart check-in */}
      <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">Are you okay?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary text-center">
            {status?.reasons.length > 0 ? status.reasons[0] : 'Your journey looks different from your planned route.'}
          </p>
          <div className="flex gap-3 mt-2">
            <Button onClick={() => respondCheckin(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1.5"><Check size={16} /> I'm Safe</Button>
            <Button onClick={() => respondCheckin(false)} className="flex-1 bg-emergency hover:bg-emergency/90 gap-1.5"><AlertTriangle size={16} /> Need Help</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckpointForm({ open, onClose, onSave, editing }) {
  const [title, setTitle] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [expectedTime, setExpectedTime] = useState('');

  useEffect(() => {
    if (editing) {
      setTitle(editing.title); setPlaceName(editing.place_name || ''); setLat(editing.lat || ''); setLng(editing.lng || '');
      setExpectedTime(editing.expected_time ? new Date(editing.expected_time).toISOString().slice(0, 16) : '');
    } else { setTitle(''); setPlaceName(''); setLat(''); setLng(''); setExpectedTime(''); }
  }, [editing, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit checkpoint' : 'Add checkpoint'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. City Museum" /></div>
          <div><Label>Place name (optional)</Label><Input value={placeName} onChange={(e) => setPlaceName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Latitude</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="26.9124" /></div>
            <div><Label>Longitude</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="75.7873" /></div>
          </div>
          <div><Label>Expected arrival</Label><Input type="datetime-local" value={expectedTime} onChange={(e) => setExpectedTime(e.target.value)} /></div>
          <p className="text-xs text-text-secondary">Tip: find coordinates by right-clicking a place on Google Maps.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ title, place_name: placeName, lat: lat ? parseFloat(lat) : undefined, lng: lng ? parseFloat(lng) : undefined, expected_time: expectedTime ? new Date(expectedTime).toISOString() : undefined })} disabled={!title}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}