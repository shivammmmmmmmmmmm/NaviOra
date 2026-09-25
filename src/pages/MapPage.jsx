import React, { useState, useEffect, useCallback } from 'react';
import { Map as MapIcon, MapPin, RefreshCw, Layers, Navigation, Locate, Crosshair, Sparkles } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { PLACE_CATEGORIES, fetchMultiPlaces, fetchDiscoverPlaces, openInMaps, formatDistance } from '@/lib/naviora';
import MapView from '@/components/MapView';
import PlaceDetailModal from '@/components/PlaceDetailModal';
import EmptyState from '@/components/EmptyState';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function MapPage() {
  const { location, error, loading, requestOnce, startWatch, stopWatch } = useGeolocation({ watch: true });
  const [activeCats, setActiveCats] = useState(new Set(['attractions']));
  const [discoverMode, setDiscoverMode] = useState(false);
  const [radius, setRadius] = useState(3000);
  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingMarkers, setLoadingMarkers] = useState(false);
  const [follow, setFollow] = useState(true);
  const [fitKey, setFitKey] = useState(0);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);

  const loadMarkers = useCallback(async () => {
    if (!location) { setMarkers([]); return; }
    setLoadingMarkers(true);
    try {
      let all = [];
      if (discoverMode) {
        all = await fetchDiscoverPlaces(location.lat, location.lng, radius, 40).catch(() => []);
      } else if (activeCats.size > 0) {
        all = await fetchMultiPlaces(location.lat, location.lng, Array.from(activeCats), radius, 40).catch(() => []);
      }
      setMarkers(all);
      setFitKey((k) => k + 1);
    } finally {
      setLoadingMarkers(false);
    }
  }, [location, activeCats, radius, discoverMode]);

  useEffect(() => { loadMarkers(); }, [loadMarkers]);

  useEffect(() => {
    base44.entities.SavedPlace.list().then(setSavedPlaces).catch(() => {});
    base44.entities.Trip.filter({ status: 'active' }).then((t) => {
      if (t[0]) {
        setActiveTrip(t[0]);
        base44.entities.Checkpoint.filter({ trip_id: t[0].id }).then(setCheckpoints).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const toggleCat = (id) => {
    setDiscoverMode(false);
    setActiveCats((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const savedMarkers = savedPlaces.map((p) => ({ ...p, id: p.place_id, category: 'saved', glyph: '★' }));
  const checkpointMarkers = checkpoints.filter((c) => c.lat).map((c) => ({
    id: `cp-${c.id}`, name: c.title, lat: c.lat, lng: c.lng, category: c.status === 'reached' ? 'attractions' : 'expected', glyph: c.status === 'reached' ? '✓' : '•'
  }));
  const expectedRoute = checkpoints.filter((c) => c.lat).sort((a, b) => a.order - b.order).map((c) => ({ lat: c.lat, lng: c.lng }));
  const allMarkers = [...markers, ...savedMarkers, ...checkpointMarkers];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><MapIcon /> Map</h1>
          <p className="text-sm text-text-secondary mt-1">Your live position, nearby places, saved spots and checkpoints.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full', location ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-text-secondary')}>
            <span className={cn('w-1.5 h-1.5 rounded-full', location ? 'bg-emerald-500 animate-pulse' : 'bg-text-secondary')} />
            {location ? 'Live' : 'Off'}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-emergency/10 border border-emergency/20 p-3 text-sm text-emergency flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => requestOnce().catch(()=>{})} className="text-xs underline flex items-center gap-1"><RefreshCw size={12} /> Retry</button>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => { setDiscoverMode(true); }} className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border', discoverMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-text-secondary')}>
          <Sparkles size={15} /> Top picks
        </button>
        <button onClick={() => { setDiscoverMode(false); setActiveCats(new Set(['attractions'])); }} className={cn('flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border', !discoverMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-text-secondary')}>
          <Layers size={15} /> By category
        </button>
      </div>

      {/* Category chips */}
      {!discoverMode && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <Layers size={16} className="text-text-secondary shrink-0" />
          {PLACE_CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => toggleCat(c.id)} className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all', activeCats.has(c.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-text-secondary')}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Radius */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-text-secondary">Radius:</span>
        {[1000, 3000, 5000, 10000, 50000, 100000].map((r) => (
          <button key={r} onClick={() => setRadius(r)} className={cn('px-2.5 py-1 rounded-lg font-medium', radius === r ? 'bg-mint text-navy' : 'text-text-secondary hover:bg-muted')}>
            {r < 1000 ? `${r} m` : `${r / 1000} km`}
          </button>
        ))}
        <button onClick={loadMarkers} disabled={loadingMarkers} className="ml-auto flex items-center gap-1 text-primary hover:underline"><RefreshCw size={12} className={loadingMarkers ? 'animate-spin' : ''} /> Refresh</button>
      </div>

      {loadingMarkers && <p className="text-sm text-text-secondary flex items-center gap-1.5"><RefreshCw size={14} className="animate-spin" /> Loading places on map…</p>}
      {!loadingMarkers && allMarkers.length === 0 && location && <p className="text-sm text-text-secondary">No places found for this selection. Try a bigger radius or different categories.</p>}

      {/* Map with recenter overlay */}
      <div className="relative">
        <MapView userLocation={location} markers={allMarkers} expectedRoute={expectedRoute} height="60vh" onMarkerClick={(m) => setSelected(m)} follow={follow} fitKey={fitKey} />
        <button
          onClick={() => { setFollow(true); if (location) setFitKey((k) => k + 1); }}
          className="absolute right-3 top-3 z-[1000] w-10 h-10 rounded-xl bg-white shadow-soft-lg border border-border flex items-center justify-center text-primary hover:bg-mint/40"
          aria-label="Recenter on me"
        >
          <Locate size={18} />
        </button>
        <button
          onClick={() => setFollow((f) => !f)}
          className={cn('absolute right-3 top-16 z-[1000] px-3 h-10 rounded-xl shadow-soft-lg border border-border flex items-center gap-1.5 text-xs font-medium', follow ? 'bg-primary text-primary-foreground' : 'bg-white text-text-secondary')}
        >
          <Crosshair size={14} /> {follow ? 'Following' : 'Follow me'}
        </button>
      </div>

      {/* Marker count + list */}
      {allMarkers.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
          <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2"><MapPin size={16} /> {allMarkers.length} places on map</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar">
            {markers.slice(0, 30).map((m) => (
              <button key={m.id} onClick={() => { setSelected(m); }} className="w-full flex items-center gap-3 text-left rounded-lg hover:bg-muted p-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#D97706' }} />
                <span className="text-sm font-medium truncate flex-1">{m.name}</span>
                <span className="text-xs text-text-secondary">{formatDistance(m.distance)}</span>
                <Navigation size={14} className="text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}

      {checkpoints.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
          <h3 className="font-heading font-semibold text-navy mb-2 flex items-center gap-2"><Navigation size={16} /> Expected route</h3>
          <div className="space-y-1.5">
            {checkpoints.slice().sort((a, b) => a.order - b.order).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 text-sm">
                <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', c.status === 'reached' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-text-secondary')}>{c.status === 'reached' ? '✓' : i + 1}</span>
                <span className={c.status === 'reached' ? 'text-text-secondary line-through' : 'text-foreground'}>{c.title}</span>
                {c.expected_time && <span className="text-xs text-text-secondary ml-auto">{new Date(c.expected_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <PlaceDetailModal place={selected} open={!!selected} onClose={() => setSelected(null)} onNavigate={(p) => openInMaps(p.lat, p.lng, p.name)} />
    </div>
  );
}