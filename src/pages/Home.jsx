import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Map, Languages, Shield, Briefcase, Navigation, Sparkles, MapPin, RefreshCw, Search, Heart, Clock, Star } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { reverseGeocode, fetchTopPlaces, formatDistance, forwardGeocode, openInMaps } from '@/lib/naviora';
import { useI18n } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import PlaceCard from '@/components/PlaceCard';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import JourneyStatusBadge from '@/components/JourneyStatusBadge';
import { useAuth } from '@/lib/AuthContext';

const RADIUS = 100000; // 100 km — the only net we cast on the home feed

export default function Home() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { location, error, loading, requestOnce, setLocation } = useGeolocation();
  const [placeName, setPlaceName] = useState('');
  const [top, setTop] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [activeTrip, setActiveTrip] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [manualQuery, setManualQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('greeting_morning');
    if (h < 18) return t('greeting_afternoon');
    return t('greeting_evening');
  };

  const QUICK_ACTIONS = [
    { to: '/explore', label: t('qa_explore'), icon: Compass, color: 'bg-mint text-navy' },
    { to: '/map', label: t('qa_navigate'), icon: Map, color: 'bg-peach text-coral' },
    { to: '/translate', label: t('qa_translate'), icon: Languages, color: 'bg-secondary text-navy' },
    { to: '/safety', label: t('qa_safety'), icon: Shield, color: 'bg-emergency/10 text-emergency' },
    { to: '/safety', label: t('qa_women'), icon: Heart, color: 'bg-pink-100 text-pink-700' },
    { to: '/trips', label: t('qa_trip'), icon: Briefcase, color: 'bg-primary/10 text-primary' }
  ];

  const loadAll = useCallback(async (loc) => {
    if (!loc) return;
    setLoadingPlaces(true);
    try {
      const [tops] = await Promise.allSettled([
        fetchTopPlaces(loc.lat, loc.lng, 15, RADIUS)
      ]);
      setTop(tops.status === 'fulfilled' ? tops.value : []);
      setLastUpdated(new Date());
    } catch {
      setTop([]);
    } finally {
      setLoadingPlaces(false);
    }
  }, []);

  useEffect(() => {
    if (location) {
      reverseGeocode(location.lat, location.lng).then(setPlaceName);
      loadAll(location);
    }
    base44.entities.SavedPlace.list().then((s) => setSavedIds(new Set(s.map((p) => p.place_id)))).catch(() => {});
    base44.entities.Trip.filter({ status: 'active' }).then((tr) => {
      if (tr[0]) {
        setActiveTrip(tr[0]);
        base44.entities.Checkpoint.filter({ trip_id: tr[0].id }).then(setCheckpoints).catch(() => {});
      }
    }).catch(() => {});
  }, [location, loadAll]);

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
    try {
      const res = await forwardGeocode(manualQuery);
      const loc = { lat: res.lat, lng: res.lng };
      setLocation(loc);
      setPlaceName(res.name);
      loadAll(loc);
    } catch {
      // keep inline
    } finally {
      setSearching(false);
    }
  };

  const PlaceSection = ({ title, subtitle, icon: Icon, items, accent }) => (
    <section>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading font-semibold text-base sm:text-lg text-navy flex items-center gap-2">
          {Icon && <Icon size={18} className={accent} />} {title}
        </h2>
        {location && <button onClick={() => loadAll(location)} disabled={loadingPlaces} className="text-xs flex items-center gap-1 text-primary hover:underline">
          <RefreshCw size={12} className={loadingPlaces ? 'animate-spin' : ''} /> {t('refresh')}
        </button>}
      </div>
      {subtitle && <p className="text-xs text-text-secondary/80 mb-3">{subtitle}</p>}
      {loadingPlaces && <Skeleton count={3} className="grid sm:grid-cols-2 lg:grid-cols-3" />}
      {!loadingPlaces && items.length === 0 && location && (
        <p className="text-sm text-text-secondary">No results within 100 km right now — try searching a specific city.</p>
      )}
      {!loadingPlaces && items.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {items.map((p) => (
            <PlaceCard key={p.id} place={p} saved={savedIds.has(p.id)} onSave={() => toggleSave(p)} onNavigate={() => openInMaps(p.lat, p.lng, p.name)} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Greeting + location */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-primary text-primary-foreground p-5 sm:p-8 shadow-soft-lg">
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-mint/20 blur-3xl" />
        <div className="relative">
          <h1 className="text-xl sm:text-3xl font-heading font-bold">{greeting()}, {user?.full_name ? user.full_name.split(' ')[0] : 'Traveler'} 👋</h1>
          <div className="flex items-center gap-2 mt-2 text-primary-foreground/85 text-sm">
            <MapPin size={15} className="shrink-0" />
            {loading ? <span>{t('locating')}</span> : error ? <span>Location unavailable — search a place below</span> : placeName ? <span>{t('currently_in')} {placeName}</span> : <span>{t('search_place')}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-primary-foreground/75">
            <span className="flex items-center gap-1.5"><Clock size={13} /> {new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', weekday: 'short' })}</span>
            {location && <span className="flex items-center gap-1.5"><Navigation size={13} /> {location.lat.toFixed(3)}, {location.lng.toFixed(3)}</span>}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.label} to={a.to} className="group rounded-2xl bg-card border border-border p-3 sm:p-4 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${a.color} flex items-center justify-center mb-2 sm:mb-3`}>
              <a.icon size={18} />
            </div>
            <div className="font-medium text-xs sm:text-sm text-navy leading-tight">{a.label}</div>
          </Link>
        ))}
      </div>

      {/* Location fallback / enable */}
      {(error || !location) && (
        <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={18} className="text-primary" />
            <h3 className="font-heading font-semibold text-navy">{error ? 'Location issue' : 'Find places around you'}</h3>
          </div>
          {error && <p className="text-sm text-emergency mb-3">{error}</p>}
          <p className="text-sm text-text-secondary mb-3">Allow location, or search any city/landmark to explore it instantly.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => requestOnce().catch(() => {})} disabled={loading} className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50">
              <MapPin size={15} /> {loading ? t('locating') : 'Enable my location'}
            </button>
            <div className="flex-1 flex gap-2">
              <input value={manualQuery} onChange={(e) => setManualQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchPlace()} placeholder="e.g. Amritsar, India" className="flex-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm" />
              <button onClick={searchPlace} disabled={searching || !manualQuery.trim()} className="inline-flex items-center gap-1.5 bg-mint text-navy rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50">
                <Search size={15} /> {searching ? '…' : 'Go'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Your journey */}
      {activeTrip && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-lg text-navy">{t('your_journey')}</h2>
            <Link to={`/trips/${activeTrip.id}`} className="text-sm text-primary hover:underline">View</Link>
          </div>
          <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0">
                <div className="font-heading font-semibold text-navy truncate">{activeTrip.name}</div>
                <div className="text-sm text-text-secondary truncate">{activeTrip.destination}</div>
              </div>
              <JourneyStatusBadge level="normal" label="Normal" />
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-text-secondary">
              <Navigation size={12} /> {checkpoints.filter((c) => c.status === 'reached').length} of {checkpoints.length} stops reached
            </div>
          </div>
        </section>
      )}

      {/* Top picks near you — within 100 km, ranked by prominence */}
      {location && (
        <PlaceSection title={t('top_attractions')} subtitle={t('attractions_sub')} icon={Star} accent="text-coral" items={top} />
      )}

      {lastUpdated && <p className="text-xs text-text-secondary/60 text-center pt-2">Last updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}

      {/* Explore CTA when not located yet */}
      {!location && (
        <div className="rounded-2xl bg-mint/30 border border-mint p-5 flex items-center gap-3">
          <Sparkles className="text-primary shrink-0" size={20} />
          <div className="text-sm text-navy">Tip: the <Link to="/explore" className="text-primary font-medium underline">Explore</Link> page lets you pick categories and radius for deeper discovery.</div>
        </div>
      )}
    </div>
  );
}