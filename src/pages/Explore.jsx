import React, { useState, useEffect, useCallback } from 'react';
import { Compass, Search, RefreshCw, MapPin, Sparkles, Navigation, BedDouble } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { PLACE_CATEGORIES, fetchNearbyPlaces, fetchDiscoverPlaces, openInMaps, forwardGeocode, formatDistance, isOpenNow } from '@/lib/naviora';
import { base44 } from '@/api/base44Client';
import PlaceCard from '@/components/PlaceCard';
import PlaceDetailModal from '@/components/PlaceDetailModal';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

const RADII = [
  { r: 0, label: 'Any' },
  { r: 1000, label: '1 km' },
  { r: 3000, label: '3 km' },
  { r: 5000, label: '5 km' },
  { r: 10000, label: '10 km' },
  { r: 50000, label: '50 km' },
  { r: 100000, label: '100 km' }
];

export default function Explore() {
  const { location, error, loading, requestOnce, setLocation } = useGeolocation();
  const [mode, setMode] = useState('discover'); // 'discover' | 'category' | 'hotels'
  const [category, setCategory] = useState('attractions');
  const [radius, setRadius] = useState(0);
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [manualQuery, setManualQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    if (!location) return;
    setLoadingPlaces(true);
    setFetchError(null);
    try {
      let p = [];
      if (mode === 'discover') {
        p = await fetchDiscoverPlaces(location.lat, location.lng, radius, 24);
      } else if (mode === 'hotels') {
        p = await fetchNearbyPlaces(location.lat, location.lng, 'hotels', radius, 40);
      } else {
        p = await fetchNearbyPlaces(location.lat, location.lng, category, radius, 40);
      }
      setPlaces(p);
      setLastUpdated(new Date());
    } catch (e) {
      setFetchError(e.message);
      setPlaces([]);
    } finally {
      setLoadingPlaces(false);
    }
  }, [location, mode, category, radius]);

  useEffect(() => { if (location) load(); }, [location, load]);

  useEffect(() => {
    base44.entities.SavedPlace.list().then((s) => setSavedIds(new Set(s.map((p) => p.place_id)))).catch(() => {});
  }, []);

  const toggleSave = async (place) => {
    if (savedIds.has(place.id)) {
      const existing = await base44.entities.SavedPlace.filter({ place_id: place.id });
      if (existing[0]) await base44.entities.SavedPlace.delete(existing[0].id);
      setSavedIds((prev) => { const n = new Set(prev); n.delete(place.id); return n; });
    } else {
      await base44.entities.SavedPlace.create({ place_id: place.id, name: place.name, category: place.category, lat: place.lat, lng: place.lng, address: place.address, phone: place.phone });
      setSavedIds((prev) => new Set(prev).add(place.id));
    }
  };

  const searchPlace = async () => {
    if (!manualQuery.trim()) return;
    setSearching(true);
    setFetchError(null);
    try {
      const res = await forwardGeocode(manualQuery);
      setLocation({ lat: res.lat, lng: res.lng });
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><Compass /> Explore Nearby</h1>
        <p className="text-sm text-text-secondary mt-1">Real places around you, live from OpenStreetMap. Discover sights up to 100 km away.</p>
      </div>

      {/* Location status */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-soft flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <MapPin size={16} className="text-primary shrink-0" />
          {loading ? 'Locating you…' : error ? <span className="text-emergency truncate">{error}</span> : location ? <span className="truncate">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span> : 'Location off'}
        </div>
        {error && <button onClick={() => requestOnce().catch(() => {})} className="text-xs flex items-center gap-1 text-primary hover:underline shrink-0"><RefreshCw size={12} /> Retry</button>}
      </div>

      {/* Manual location search — always available */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
        <p className="text-sm text-text-secondary mb-3">Can't use GPS or want to explore somewhere else? Search any city or landmark.</p>
        <div className="flex gap-2">
          <input value={manualQuery} onChange={(e) => setManualQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchPlace()} placeholder="e.g. Golden Temple, Amritsar" className="flex-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
          <button onClick={searchPlace} disabled={searching || !manualQuery.trim()} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50">
            <Search size={15} /> {searching ? '…' : 'Search'}
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => setMode('discover')} className={cn('flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border', mode === 'discover' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-text-secondary')}>
          <Sparkles size={15} /> Discover top picks
        </button>
        <button onClick={() => setMode('hotels')} className={cn('flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border', mode === 'hotels' ? 'bg-navy text-primary-foreground border-navy' : 'bg-card border-border text-text-secondary')}>
          <BedDouble size={15} /> Hotels
        </button>
        <button onClick={() => setMode('category')} className={cn('flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border', mode === 'category' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-text-secondary')}>
          <MapPin size={15} /> By category
        </button>
      </div>

      {/* Category chips (only in category mode) */}
      {mode === 'category' && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {PLACE_CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} className={cn('shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all', category === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-text-secondary hover:border-primary/40')}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Radius */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="text-text-secondary">Radius:</span>
        {RADII.map((r) => (
          <button key={r.r} onClick={() => setRadius(r.r)} className={cn('px-3 py-1 rounded-lg text-xs font-medium', radius === r.r ? 'bg-mint text-navy' : 'text-text-secondary hover:bg-muted')}>
            {r.label}
          </button>
        ))}
        <button onClick={load} disabled={loadingPlaces} className="ml-auto text-xs flex items-center gap-1 text-primary hover:underline"><RefreshCw size={12} className={loadingPlaces ? 'animate-spin' : ''} /> Refresh now</button>
      </div>

      {lastUpdated && <p className="text-xs text-text-secondary/70">Last updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>}

      {/* Results */}
      {fetchError && (
        <div className="rounded-xl bg-emergency/10 border border-emergency/20 p-4 text-sm text-emergency flex items-center justify-between">
          <span>{fetchError}</span>
          <button onClick={load} className="text-xs underline">Try again</button>
        </div>
      )}

      {loadingPlaces && <Skeleton count={6} className="grid sm:grid-cols-2 lg:grid-cols-3" />}

      {!loadingPlaces && !fetchError && places.length === 0 && location && (
        <EmptyState icon={Compass} title="We couldn't find places nearby right now." description="Try a wider radius or a different category." />
      )}

      {places.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {places.map((p) => {
            const open = isOpenNow(p.opening_hours);
            return (
              <div key={p.id} className="relative">
                {open && <span className="absolute top-3 right-3 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">OPEN NOW</span>}
                <PlaceCard place={p} saved={savedIds.has(p.id)} onSave={() => toggleSave(p)} onNavigate={() => openInMaps(p.lat, p.lng, p.name)} onClick={setSelected} />
              </div>
            );
          })}
        </div>
      )}

      <PlaceDetailModal place={selected} open={!!selected} onClose={() => setSelected(null)} onNavigate={(p) => openInMaps(p.lat, p.lng, p.name)} onSave={(p) => toggleSave(p)} saved={selected && savedIds.has(selected.id)} />
    </div>
  );
}