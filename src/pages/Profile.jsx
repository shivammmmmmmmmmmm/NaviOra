import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Bookmark, Briefcase, Shield, LogOut, Globe, Heart, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { INTERESTS } from '@/lib/naviora';
import { cn } from '@/lib/utils';

export default function Profile() {
  const { user, logout } = useAuth();
  const [language, setLanguage] = useState(user?.data?.language || 'en');
  const [interests, setInterests] = useState(user?.data?.interests || []);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState({ trips: 0, saved: 0, contacts: 0 });

  useEffect(() => {
    Promise.all([
      base44.entities.Trip.list().then((t) => t.length).catch(() => 0),
      base44.entities.SavedPlace.list().then((s) => s.length).catch(() => 0),
      base44.entities.EmergencyContact.list().then((c) => c.length).catch(() => 0)
    ]).then(([trips, saved, contacts]) => setCounts({ trips, saved, contacts }));
  }, []);

  const savePrefs = async () => {
    setSaving(true);
    try { await base44.auth.updateMe({ language, interests }); } finally { setSaving(false); }
  };

  const toggleInterest = (i) => setInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);

  const LANGS = [
    { code: 'en', label: 'English' }, { code: 'es', label: 'Spanish' }, { code: 'fr', label: 'French' }, { code: 'hi', label: 'Hindi' }, { code: 'ar', label: 'Arabic' }, { code: 'ja', label: 'Japanese' }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-navy to-primary text-primary-foreground p-6 shadow-soft-lg flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-heading font-bold">
          {(user?.full_name || user?.email || 'T')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold">{user?.full_name || 'Traveler'}</h1>
          <p className="text-sm text-primary-foreground/80">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/trips" className="rounded-2xl bg-card border border-border p-4 text-center shadow-soft hover:shadow-soft-lg transition-all">
          <div className="text-2xl font-heading font-bold text-navy">{counts.trips}</div>
          <div className="text-xs text-text-secondary">Trips</div>
        </Link>
        <Link to="/saved" className="rounded-2xl bg-card border border-border p-4 text-center shadow-soft hover:shadow-soft-lg transition-all">
          <div className="text-2xl font-heading font-bold text-navy">{counts.saved}</div>
          <div className="text-xs text-text-secondary">Saved</div>
        </Link>
        <Link to="/safety" className="rounded-2xl bg-card border border-border p-4 text-center shadow-soft hover:shadow-soft-lg transition-all">
          <div className="text-2xl font-heading font-bold text-navy">{counts.contacts}</div>
          <div className="text-xs text-text-secondary">Contacts</div>
        </Link>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
        <h3 className="font-heading font-semibold text-navy flex items-center gap-2"><Globe size={18} /> Preferences</h3>
        <div>
          <label className="text-sm font-medium">Preferred language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm">
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium flex items-center gap-1.5"><Heart size={14} /> Travel interests</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {INTERESTS.map((i) => (
              <button key={i} onClick={() => toggleInterest(i)} className={cn('px-3 py-1.5 rounded-full text-xs border', interests.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-text-secondary')}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <button onClick={savePrefs} disabled={saving} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <h3 className="font-heading font-semibold text-navy flex items-center gap-2 mb-3"><Info size={18} /> Quick links</h3>
        <div className="space-y-1">
          <Link to="/trips" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm"><Briefcase size={16} className="text-primary" /> My trips</Link>
          <Link to="/saved" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm"><Bookmark size={16} className="text-primary" /> Saved places</Link>
          <Link to="/safety" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm"><Shield size={16} className="text-primary" /> Safety center</Link>
        </div>
      </div>

      <button onClick={() => logout()} className="w-full flex items-center justify-center gap-2 text-emergency border border-emergency/30 rounded-xl py-3 text-sm font-medium hover:bg-emergency/5">
        <LogOut size={16} /> Sign out
      </button>

      <p className="text-center text-xs text-text-secondary/70">NaviOra • Navigate • Discover • Connect • Stay Safe</p>
    </div>
  );
}