import React, { useState } from 'react';
import { Languages, ArrowLeftRight, Copy, Check, Eraser, MessageSquareText, Volume2 } from 'lucide-react';
import { translateText } from '@/lib/naviora';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Comprehensive list: all major Indian languages + world languages (covers most countries)
const LANGUAGES = [
  // Indian languages
  { code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi' }, { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' }, { code: 'te', label: 'Telugu' }, { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' }, { code: 'kn', label: 'Kannada' }, { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' }, { code: 'or', label: 'Odia' }, { code: 'as', label: 'Assamese' },
  { code: 'ur', label: 'Urdu' }, { code: 'sa', label: 'Sanskrit' }, { code: 'ne', label: 'Nepali' },
  { code: 'si', label: 'Sinhala' },
  // World — Europe
  { code: 'es', label: 'Spanish' }, { code: 'fr', label: 'French' }, { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' }, { code: 'pt', label: 'Portuguese' }, { code: 'nl', label: 'Dutch' },
  { code: 'ru', label: 'Russian' }, { code: 'pl', label: 'Polish' }, { code: 'uk', label: 'Ukrainian' },
  { code: 'tr', label: 'Turkish' }, { code: 'el', label: 'Greek' }, { code: 'sv', label: 'Swedish' },
  { code: 'no', label: 'Norwegian' }, { code: 'da', label: 'Danish' }, { code: 'fi', label: 'Finnish' },
  { code: 'cs', label: 'Czech' }, { code: 'sk', label: 'Slovak' }, { code: 'hu', label: 'Hungarian' },
  { code: 'ro', label: 'Romanian' }, { code: 'bg', label: 'Bulgarian' }, { code: 'hr', label: 'Croatian' },
  { code: 'sr', label: 'Serbian' }, { code: 'sl', label: 'Slovenian' }, { code: 'lt', label: 'Lithuanian' },
  { code: 'lv', label: 'Latvian' }, { code: 'et', label: 'Estonian' }, { code: 'is', label: 'Icelandic' },
  { code: 'ga', label: 'Irish' }, { code: 'cy', label: 'Welsh' }, { code: 'mt', label: 'Maltese' },
  { code: 'sq', label: 'Albanian' }, { code: 'mk', label: 'Macedonian' }, { code: 'bs', label: 'Bosnian' },
  // World — Asia & Pacific
  { code: 'ja', label: 'Japanese' }, { code: 'ko', label: 'Korean' }, { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' }, { code: 'th', label: 'Thai' }, { code: 'vi', label: 'Vietnamese' },
  { code: 'id', label: 'Indonesian' }, { code: 'ms', label: 'Malay' }, { code: 'tl', label: 'Filipino' },
  { code: 'my', label: 'Burmese' }, { code: 'km', label: 'Khmer' }, { code: 'lo', label: 'Lao' },
  { code: 'mn', label: 'Mongolian' }, { code: 'ka', label: 'Georgian' }, { code: 'hy', label: 'Armenian' },
  { code: 'az', label: 'Azerbaijani' }, { code: 'kk', label: 'Kazakh' }, { code: 'uz', label: 'Uzbek' },
  { code: 'ky', label: 'Kyrgyz' }, { code: 'tg', label: 'Tajik' }, { code: 'tk', label: 'Turkmen' },
  // World — Middle East & Africa
  { code: 'ar', label: 'Arabic' }, { code: 'fa', label: 'Persian' }, { code: 'he', label: 'Hebrew' },
  { code: 'ps', label: 'Pashto' }, { code: 'ku', label: 'Kurdish' }, { code: 'am', label: 'Amharic' },
  { code: 'sw', label: 'Swahili' }, { code: 'af', label: 'Afrikaans' }, { code: 'zu', label: 'Zulu' },
  { code: 'xh', label: 'Xhosa' }, { code: 'ha', label: 'Hausa' }, { code: 'yo', label: 'Yoruba' },
  { code: 'ig', label: 'Igbo' }, { code: 'so', label: 'Somali' }, { code: 'mg', label: 'Malagasy' },
  // Americas
  { code: 'qu', label: 'Quechua' }, { code: 'ay', label: 'Aymara' }, { code: 'gn', label: 'Guarani' }
];

const HELP_CATEGORIES = {
  Restaurant: ['Is this vegetarian?', 'A table for two, please.', 'Could we have the menu?', 'No spicy, please.', 'The bill, please.'],
  Hotel: ['Where is my room?', 'What time is checkout?', 'Is breakfast included?', 'I need extra towels.', 'Can I have late checkout?'],
  Taxi: ['Please take me to this location.', 'How much to the airport?', 'Please wait here for me.', 'To the train station, please.'],
  Shopping: ['How much does this cost?', 'Do you have this in another size?', 'Can I pay by card?', 'I am just looking, thank you.'],
  Directions: ['Where is the nearest restroom?', 'How do I get to the station?', 'Is it within walking distance?', 'Can you show me on the map?'],
  Medical: ['I need a doctor.', 'I am feeling unwell.', 'Where is the nearest pharmacy?', 'I have a headache.'],
  Police: ['I need help, please.', 'I have lost my belongings.', 'Where is the police station?'],
  Airport: ['Where is my gate?', 'Where is the check-in counter?', 'I have lost my passport.'],
  Emergency: ['Please call an ambulance.', 'I need help immediately.', 'Please call the police.']
};

export default function Translate() {
  const [source, setSource] = useState('en');
  const [target, setTarget] = useState('hi');
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [fullscreen, setFullscreen] = useState(null);
  const [tab, setTab] = useState('translate');

  const translate = async (overrideText) => {
    const src = (overrideText ?? text).trim();
    if (!src) return;
    setLoading(true);
    setError(null);
    try {
      const out = await translateText(src, source, target);
      setResult(out);
      if (!overrideText) setHistory((prev) => [{ source, target, text: src, result: out, ts: Date.now() }, ...prev].slice(0, 8));
    } catch (e) {
      setError(e.message || 'Translation failed. Please try again.');
      setResult('');
    } finally {
      setLoading(false);
    }
  };

  const swap = () => { setSource(target); setTarget(source); setResult(''); };

  const copy = (txt) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const speak = (txt, lang) => {
    if (!('speechSynthesis' in window) || !txt) return;
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  };

  const translatePhrase = async (phrase) => {
    setText(phrase);
    setLoading(true);
    setError(null);
    try {
      const out = await translateText(phrase, source, target);
      setResult(out);
      setFullscreen({ text: phrase, translation: out });
    } catch (e) {
      setError(e.message || 'Translation unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><Languages /> Translate</h1>
        <p className="text-sm text-text-secondary mt-1">Free real-time translation across {LANGUAGES.length} languages — all Indian languages and most countries.</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setTab('translate')} className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px', tab === 'translate' ? 'border-primary text-primary' : 'border-transparent text-text-secondary')}>Translate</button>
        <button onClick={() => setTab('help')} className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px', tab === 'help' ? 'border-primary text-primary' : 'border-transparent text-text-secondary')}>Help me communicate</button>
      </div>

      {tab === 'translate' && (
        <>
          <div className="flex items-center gap-2">
            <select value={source} onChange={(e) => setSource(e.target.value)} className="flex-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button onClick={swap} aria-label="Swap languages" className="p-2.5 rounded-xl border border-border hover:bg-muted"><ArrowLeftRight size={16} /></button>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="flex-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type text to translate…"
            rows={4}
            className="w-full rounded-2xl border border-input bg-card p-4 text-base resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <Button onClick={() => translate()} disabled={loading || !text.trim()} className="w-full gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> Translating…</> : <><Languages size={16} /> Translate</>}
          </Button>

          {error && <div className="rounded-xl bg-emergency/10 border border-emergency/20 p-3 text-sm text-emergency">{error}</div>}

          {result && (
            <div className="rounded-2xl bg-mint/30 border border-mint p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-lg text-navy whitespace-pre-wrap flex-1">{result}</p>
                <div className="flex gap-1">
                  <button onClick={() => speak(result, target)} className="p-2 rounded-lg hover:bg-white/50" aria-label="Speak"><Volume2 size={16} /></button>
                  <button onClick={() => copy(result)} className="p-2 rounded-lg hover:bg-white/50" aria-label="Copy">{copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}</button>
                  <button onClick={() => { setText(''); setResult(''); }} className="p-2 rounded-lg hover:bg-white/50" aria-label="Clear"><Eraser size={16} /></button>
                </div>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold text-navy mb-2 flex items-center gap-2"><MessageSquareText size={16} /> History</h3>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="rounded-xl bg-card border border-border p-3 text-sm">
                    <div className="text-text-secondary text-xs mb-1">{LANGUAGES.find((l) => l.code === h.source)?.label} → {LANGUAGES.find((l) => l.code === h.target)?.label}</div>
                    <div className="text-foreground">{h.text}</div>
                    <div className="text-primary font-medium mt-1">{h.result}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'help' && (
        <div className="space-y-5">
          <p className="text-sm text-text-secondary">Pick a situation and tap a phrase. Show the fullscreen translation to the person you're talking to.</p>
          {Object.entries(HELP_CATEGORIES).map(([cat, phrases]) => (
            <div key={cat} className="rounded-2xl bg-card border border-border p-4 shadow-soft">
              <h3 className="font-heading font-semibold text-navy mb-3">{cat}</h3>
              <div className="flex flex-wrap gap-2">
                {phrases.map((p) => (
                  <button key={p} onClick={() => translatePhrase(p)} disabled={loading} className="text-left text-sm px-3 py-2 rounded-xl bg-muted/60 hover:bg-mint/40 border border-border transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen display */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-navy flex flex-col items-center justify-center p-8 animate-fade-in" onClick={() => setFullscreen(null)}>
          <div className="text-primary-foreground/60 text-sm mb-4 uppercase tracking-wider">{LANGUAGES.find((l) => l.code === source)?.label} → {LANGUAGES.find((l) => l.code === target)?.label}</div>
          <div className="text-center text-primary-foreground text-3xl sm:text-5xl font-heading font-bold leading-tight max-w-3xl">{fullscreen.translation}</div>
          <div className="text-primary-foreground/40 text-base mt-6">{fullscreen.text}</div>
          <button onClick={(e) => { e.stopPropagation(); speak(fullscreen.translation, target); }} className="mt-6 p-3 rounded-full bg-white/10 text-primary-foreground"><Volume2 size={22} /></button>
          <button className="mt-10 text-primary-foreground/60 text-sm underline">Tap to close</button>
        </div>
      )}
    </div>
  );
}