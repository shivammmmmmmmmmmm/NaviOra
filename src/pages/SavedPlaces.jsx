import React, { useState, useEffect } from 'react';
import { Bookmark, Navigation, Trash2, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { openInMaps } from '@/lib/naviora';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

const CAT_COLORS = {
  attractions: 'bg-amber-100 text-amber-700', restaurants: 'bg-orange-100 text-orange-700',
  hotels: 'bg-purple-100 text-purple-700', museums: 'bg-violet-100 text-violet-700',
  police: 'bg-blue-100 text-blue-700', hospitals: 'bg-red-100 text-red-700',
  pharmacies: 'bg-emerald-100 text-emerald-700'
};

export default function SavedPlaces() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); base44.entities.SavedPlace.list('-created_date').then(setPlaces).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const remove = async (id) => { await base44.entities.SavedPlace.delete(id); load(); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><Bookmark /> Saved Places</h1>
        <p className="text-sm text-text-secondary mt-1">Places you've bookmarked for your journeys.</p>
      </div>

      {loading && <div className="grid sm:grid-cols-2 gap-4">{[0,1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted/50 animate-pulse" />)}</div>}

      {!loading && places.length === 0 && (
        <EmptyState icon={Bookmark} title="Your journey starts here." description="Save places from Explore or the Map to find them here later." />
      )}

      {!loading && places.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {places.map((p) => (
            <div key={p.id} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-navy truncate">{p.name}</h3>
                  {p.address && <p className="text-xs text-text-secondary truncate flex items-center gap-1 mt-0.5"><MapPin size={11} />{p.address}</p>}
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', CAT_COLORS[p.category] || 'bg-muted text-text-secondary')}>{p.category}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openInMaps(p.lat, p.lng, p.name)} className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium">
                  <Navigation size={14} /> Navigate
                </button>
                <button onClick={() => remove(p.id)} className="px-3 rounded-xl border border-border hover:bg-muted hover:text-emergency"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}