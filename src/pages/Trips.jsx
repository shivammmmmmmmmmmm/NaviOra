import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, MapPin, Calendar, Trash2, Pencil, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { INTERESTS } from '@/lib/naviora';
import EmptyState from '@/components/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => { setLoading(true); base44.entities.Trip.list('-created_date').then(setTrips).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const remove = async (id) => { await base44.entities.Trip.delete(id); load(); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><Briefcase /> My Trips</h1>
          <p className="text-sm text-text-secondary mt-1">Plan journeys with checkpoints that power your digital twin.</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-1.5"><Plus size={16} /> New trip</Button>
      </div>

      {loading && <div className="grid sm:grid-cols-2 gap-4">{[0,1,2].map((i) => <div key={i} className="h-40 rounded-2xl bg-muted/50 animate-pulse" />)}</div>}

      {!loading && trips.length === 0 && (
        <EmptyState icon={Briefcase} title="Your journey starts here." description="Create a trip, add checkpoints, and let NaviOra watch over your journey." action={<Button onClick={() => setShowForm(true)}>Create your first trip</Button>} />
      )}

      {!loading && trips.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {trips.map((t) => (
            <div key={t.id} className="group rounded-2xl bg-card border border-border p-5 shadow-soft hover:shadow-soft-lg transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <Link to={`/trips/${t.id}`} className="font-heading font-semibold text-navy hover:text-primary truncate block">{t.name}</Link>
                  <div className="text-sm text-text-secondary flex items-center gap-1 mt-0.5"><MapPin size={12} /> {t.destination}</div>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : t.status === 'planned' ? 'bg-mint text-navy' : 'bg-muted text-text-secondary')}>
                  {t.status}
                </span>
              </div>
              {(t.start_date || t.end_date) && (
                <div className="text-xs text-text-secondary flex items-center gap-1 mb-3"><Calendar size={12} /> {t.start_date} → {t.end_date}</div>
              )}
              <div className="flex gap-2">
                <Link to={`/trips/${t.id}`} className="flex-1 text-center text-sm bg-primary text-primary-foreground rounded-xl py-2 font-medium">Open journey</Link>
                <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-2 rounded-xl border border-border hover:bg-muted"><Pencil size={15} /></button>
                <button onClick={() => remove(t.id)} className="p-2 rounded-xl border border-border hover:bg-muted hover:text-emergency"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TripForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={load} editing={editing} />
    </div>
  );
}

function TripForm({ open, onClose, onSaved, editing }) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interests, setInterests] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name); setDestination(editing.destination); setStartDate(editing.start_date || ''); setEndDate(editing.end_date || ''); setInterests(editing.interests || []);
    } else { setName(''); setDestination(''); setStartDate(''); setEndDate(''); setInterests([]); }
  }, [editing, open]);

  const toggleInterest = (i) => setInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);

  const save = async () => {
    setSaving(true);
    try {
      if (editing) await base44.entities.Trip.update(editing.id, { name, destination, start_date: startDate, end_date: endDate, interests });
      else await base44.entities.Trip.create({ name, destination, start_date: startDate, end_date: endDate, interests, status: 'planned' });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit trip' : 'Create trip'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Trip name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jaipur weekend" /></div>
          <div><Label>Destination</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Jaipur, India" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>End date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div>
            <Label>Interests</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {INTERESTS.map((i) => (
                <button key={i} type="button" onClick={() => toggleInterest(i)}
                  className={cn('px-3 py-1 rounded-full text-xs border', interests.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-text-secondary')}>
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!name || !destination || saving}>{saving ? 'Saving…' : 'Save trip'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}