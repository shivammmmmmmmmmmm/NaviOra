import React, { useState } from 'react';
import { Star, MapPin, Clock, Navigation, Bookmark, BookmarkCheck, Phone, Globe, BedDouble } from 'lucide-react';
import { formatDistance, isOpenNow, bookHotel, isHotelPlace } from '@/lib/naviora';
import { cn } from '@/lib/utils';

export default function PlaceCard({ place, saved, onSave, onNavigate, onClick }) {
  const [saving, setSaving] = useState(false);
  const open = isOpenNow(place.opening_hours);

  const handleSave = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try { await onSave?.(); } finally { setSaving(false); }
  };

  return (
    <div
      onClick={() => onClick?.(place)}
      className="group rounded-2xl bg-card border border-border p-4 shadow-soft hover:shadow-soft-lg hover:border-primary/30 transition-all cursor-pointer animate-fade-in"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="font-heading font-semibold text-navy truncate">{place.name}</h3>
          {place.address && <p className="text-xs text-text-secondary truncate flex items-center gap-1 mt-0.5"><MapPin size={12} />{place.address}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          aria-label={saved ? 'Unsave' : 'Save place'}
          className="shrink-0 p-2 rounded-lg hover:bg-muted text-text-secondary hover:text-primary transition-colors"
        >
          {saved ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} />}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-text-secondary mb-3">
        {place.distance != null && <span className="flex items-center gap-1"><Navigation size={12} />{formatDistance(place.distance)}</span>}
        {place.rating != null && <span className="flex items-center gap-1 text-amber-600"><Star size={12} className="fill-amber-400" />{place.rating}</span>}
        {open != null && (
          <span className={cn('flex items-center gap-1 font-medium', open ? 'text-emerald-600' : 'text-red-500')}>
            <Clock size={12} />{open ? 'Open now' : 'Closed'}
          </span>
        )}
        {open == null && place.opening_hours == null && <span className="text-text-secondary/60">Hours unknown</span>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate?.(place); }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Navigation size={14} /> Navigate
        </button>
        {isHotelPlace(place) && (
          <button
            onClick={(e) => { e.stopPropagation(); bookHotel(place); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-navy text-primary-foreground rounded-xl py-2 text-sm font-medium hover:opacity-90"
          >
            <BedDouble size={14} /> Book
          </button>
        )}
        {place.phone && !isHotelPlace(place) && (
          <a href={`tel:${place.phone}`} onClick={(e) => e.stopPropagation()} className="px-3 rounded-xl border border-border hover:bg-muted flex items-center justify-center" aria-label="Call">
            <Phone size={15} />
          </a>
        )}
        {place.website && !isHotelPlace(place) && (
          <a href={place.website} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="px-3 rounded-xl border border-border hover:bg-muted flex items-center justify-center" aria-label="Website">
            <Globe size={15} />
          </a>
        )}
      </div>
    </div>
  );
}