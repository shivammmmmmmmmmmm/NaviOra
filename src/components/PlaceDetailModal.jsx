import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, Send, BedDouble } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { bookHotel, isHotelPlace } from '@/lib/naviora';
import { cn } from '@/lib/utils';

export default function PlaceDetailModal({ place, open, onClose, onNavigate, onSave, saved }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (place && open) {
      setLoadingReviews(true);
      base44.entities.Review.filter({ place_id: place.id })
        .then((r) => setReviews(r))
        .catch(() => setReviews([]))
        .finally(() => setLoadingReviews(false));
    }
  }, [place, open]);

  if (!place) return null;

  const submitReview = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const created = await base44.entities.Review.create({
        place_id: place.id,
        place_name: place.name,
        rating,
        content: content.trim(),
        author_name: user?.full_name || 'Traveler'
      });
      setReviews((prev) => [created, ...prev]);
      setContent('');
      setRating(5);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-navy">{place.name}</DialogTitle>
          <DialogDescription>
            {place.address || 'No address available'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 text-sm text-text-secondary">
          {place.distance != null && <span>{place.distance < 1000 ? `${Math.round(place.distance)} m away` : `${(place.distance / 1000).toFixed(1)} km away`}</span>}
          {place.cuisine && <span className="capitalize">• {place.cuisine}</span>}
        </div>

        {place.opening_hours && (
          <div className="text-xs text-text-secondary bg-muted/50 rounded-lg p-3">
            <span className="font-medium">Opening hours:</span> {place.opening_hours}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={() => onNavigate?.(place)} className="flex-1">Navigate</Button>
          {isHotelPlace(place) && (
            <Button onClick={() => bookHotel(place)} className="flex-1 gap-1.5">
              <BedDouble size={15} /> Book on Booking.com
            </Button>
          )}
          <Button variant="outline" onClick={() => onSave?.(place)}>
            {saved ? 'Saved' : 'Save place'}
          </Button>
        </div>

        {/* Reviews — clearly marked as community-submitted (verified), no fabricated reviews */}
        <div className="border-t border-border pt-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-heading font-semibold text-navy">Traveler reviews</h4>
            {avg != null && (
              <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                <Star size={14} className="fill-amber-400" />{avg.toFixed(1)} ({reviews.length})
              </span>
            )}
          </div>

          <form onSubmit={submitReview} className="mb-4 space-y-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                  <Star size={20} className={cn(n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
                </button>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience…"
              className="w-full rounded-xl border border-input bg-card p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
            />
            <Button type="submit" disabled={submitting || !content.trim()} size="sm" className="gap-1.5">
              <Send size={14} /> {submitting ? 'Posting…' : 'Post review'}
            </Button>
          </form>

          {loadingReviews ? (
            <div className="space-y-2">
              {[0, 1].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />)}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-text-secondary py-4 text-center">Be the first traveler to share your experience.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl bg-muted/40 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{r.author_name}</span>
                    <span className="flex items-center gap-0.5 text-amber-500 text-xs">
                      {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={11} className="fill-amber-400" />)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">{r.content}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-text-secondary/70 mt-3">Reviews are submitted by NaviOra travelers. NaviOra does not generate fake reviews.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}