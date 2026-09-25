import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, MapPin, Compass, Shield, Languages, Navigation, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { reverseGeocode, fetchDiscoverPlaces, formatDistance } from '@/lib/naviora';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'What are the best things to do near me?',
  "I'm lost, how do I get back?",
  'Translate "where is the bathroom" to Hindi',
  'Plan a day trip with museums and lunch',
  'What local customs should I know?'
];

export default function Assistant() {
  const { user } = useAuth();
  const { location } = useGeolocation();
  const [placeName, setPlaceName] = useState('');
  const [nearby, setNearby] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (location) {
      reverseGeocode(location.lat, location.lng).then(setPlaceName);
      fetchDiscoverPlaces(location.lat, location.lng, 2000, 8).then(setNearby).catch(() => {});
    }
    base44.entities.SavedPlace.list().then(setSavedPlaces).catch(() => {});
    base44.entities.Trip.filter({ status: 'active' }).then((t) => t[0] && setActiveTrip(t[0])).catch(() => {});
  }, [location]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const buildContext = () => {
    const parts = [];
    if (location) parts.push(`Current location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}${placeName ? ` (${placeName})` : ''}`);
    if (activeTrip) parts.push(`Active trip: "${activeTrip.name}" to ${activeTrip.destination}`);
    if (nearby.length) parts.push(`Nearby places the user can visit now: ${nearby.slice(0, 6).map((p) => `${p.name} (${formatDistance(p.distance)})`).join('; ')}`);
    if (savedPlaces.length) parts.push(`Saved places: ${savedPlaces.slice(0, 5).map((p) => p.name).join(', ')}`);
    if (user?.data?.language) parts.push(`Preferred language: ${user.data.language}`);
    return parts.join('\n');
  };

  const callLLM = async (prompt) => {
    // InvokeLLM must run server-side; call the backend function.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await base44.functions.invoke('InvokeAssistant', { prompt });
        const out = res?.data?.text || res?.text || '';
        if (out) return out;
      } catch (e) {
        if (attempt === 1) throw e;
      }
    }
    return '';
  };

  const send = async (text) => {
    const content = text ?? input;
    if (!content.trim() || loading) return;
    const userMsg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const safetyKeywords = ['lost', 'followed', 'danger', 'emergency', 'help me', 'scared', 'unsafe', 'harass', 'attack'];
    const isSafety = safetyKeywords.some((k) => content.toLowerCase().includes(k));

    const system = `You are NaviOra AI, an intelligent travel companion. You help with destinations, nearby places, directions, local customs, travel planning, safety, translation, and discovery. Be concise, warm, and practical. Use markdown for readability (short bullet lists are fine).${isSafety ? '\n\nSAFETY PRIORITY: The user may be in a difficult situation. Prioritize their safety: suggest moving to a public/well-lit place, contacting a trusted contact, using the SOS button if in danger, and calling local emergency services (112 in India / 100 for police). Do not give speculative or risky advice.' : ''}\n\nUser context (use only if relevant):\n${buildContext()}`;

    try {
      const prompt = `${system}\n\nConversation:\n${newMessages.map((m) => `${m.role}: ${m.content}`).join('\n')}\n\nassistant:`;
      const out = await callLLM(prompt);
      setMessages((prev) => [...prev, { role: 'assistant', content: out || 'I am here to help with your journey.' }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `I am having trouble reaching the AI service right now (${e?.message || 'network error'}). Please try again in a moment — tap retry below.` }]);
    } finally {
      setLoading(false);
    }
  };

  const retryLast = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      const trimmed = messages.slice(0, messages.lastIndexOf(lastUser));
      setMessages(trimmed);
      setTimeout(() => send(lastUser.content), 50);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] lg:h-[calc(100vh-7rem)] max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><Sparkles size={20} /></div>
        <div>
          <h1 className="text-xl font-heading font-bold text-navy">NaviOra AI</h1>
          <p className="text-xs text-text-secondary">Your intelligent travel companion</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-mint/60 flex items-center justify-center mx-auto mb-4"><Sparkles size={28} className="text-primary" /></div>
            <h2 className="font-heading font-semibold text-navy mb-1">How can I help your journey?</h2>
            <p className="text-sm text-text-secondary mb-6">Ask about places, directions, customs, translation, or safety.</p>
            <div className="grid gap-2 text-left">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-sm text-left px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm',
              m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border border-border rounded-bl-md')}>
              {m.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none [&>*]:my-0 [&_li]:my-0.5">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-text-secondary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-text-secondary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-text-secondary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {!loading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content.includes('trouble reaching') && (
          <div className="flex justify-start">
            <button onClick={retryLast} className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary"><RefreshCw size={14} /> Retry</button>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask NaviOra…"
          rows={1}
          className="flex-1 rounded-2xl border border-input bg-card px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring max-h-32"
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send" className="w-11 h-11 shrink-0 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}