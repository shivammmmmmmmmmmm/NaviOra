import React, { createContext, useContext, useState, useEffect } from 'react';
import { translateText } from '@/lib/naviora';

// Full language list for the globe picker.
export const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi' }, { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' }, { code: 'te', label: 'Telugu' }, { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' }, { code: 'kn', label: 'Kannada' }, { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' }, { code: 'or', label: 'Odia' }, { code: 'as', label: 'Assamese' },
  { code: 'ur', label: 'Urdu' }, { code: 'sa', label: 'Sanskrit' }, { code: 'ne', label: 'Nepali' },
  { code: 'si', label: 'Sinhala' },
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
  { code: 'ja', label: 'Japanese' }, { code: 'ko', label: 'Korean' }, { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' }, { code: 'th', label: 'Thai' }, { code: 'vi', label: 'Vietnamese' },
  { code: 'id', label: 'Indonesian' }, { code: 'ms', label: 'Malay' }, { code: 'tl', label: 'Filipino' },
  { code: 'my', label: 'Burmese' }, { code: 'km', label: 'Khmer' }, { code: 'lo', label: 'Lao' },
  { code: 'mn', label: 'Mongolian' }, { code: 'ka', label: 'Georgian' }, { code: 'hy', label: 'Armenian' },
  { code: 'az', label: 'Azerbaijani' }, { code: 'kk', label: 'Kazakh' }, { code: 'uz', label: 'Uzbek' },
  { code: 'ky', label: 'Kyrgyz' }, { code: 'tg', label: 'Tajik' }, { code: 'tk', label: 'Turkmen' },
  { code: 'ar', label: 'Arabic' }, { code: 'fa', label: 'Persian' }, { code: 'he', label: 'Hebrew' },
  { code: 'ps', label: 'Pashto' }, { code: 'ku', label: 'Kurdish' }, { code: 'am', label: 'Amharic' },
  { code: 'sw', label: 'Swahili' }, { code: 'af', label: 'Afrikaans' }, { code: 'zu', label: 'Zulu' },
  { code: 'xh', label: 'Xhosa' }, { code: 'ha', label: 'Hausa' }, { code: 'yo', label: 'Yoruba' },
  { code: 'ig', label: 'Igbo' }, { code: 'so', label: 'Somali' }, { code: 'mg', label: 'Malagasy' },
  { code: 'qu', label: 'Quechua' }, { code: 'ay', label: 'Aymara' }, { code: 'gn', label: 'Guarani' }
];

// Static dictionaries for the most common languages (instant, offline).
// Every other language is translated on demand from English and cached.
const DICT = {
  en: {
    nav_home: 'Home', nav_explore: 'Explore', nav_map: 'Map', nav_translate: 'Translate', nav_safety: 'Safety', nav_trips: 'My Trips', nav_assistant: 'NaviOra AI', nav_profile: 'Profile', nav_verify: 'NaviVerify', nav_scan: 'NaviScan', nav_currency: 'Currency', nav_timezone: 'Timezone', nav_guide: 'Local Guide',
    sign_out: 'Sign out', tagline: 'Navigate • Discover • Stay Safe',
    greeting_morning: 'Good morning', greeting_afternoon: 'Good afternoon', greeting_evening: 'Good evening',
    currently_in: 'Currently in', search_place: 'Search a place to begin', locating: 'Locating you…',
    places_visit: 'Places to visit now', top_attractions: 'Top picks near you', stay_nearby: 'Stay nearby', your_journey: 'Your Journey',
    qa_explore: 'Explore Nearby', qa_navigate: 'Navigate', qa_translate: 'Translate', qa_safety: 'Safety', qa_women: "Women's Safety", qa_trip: 'My Trip',
    navigate: 'Navigate', save: 'Save', saved: 'Saved', book: 'Book', refresh: 'Refresh', save_place: 'Save place',
    discover_sub: 'The best places within 100 km of you — attractions, museums, viewpoints and more, ranked by prominence.',
    attractions_sub: 'Top sights around you, within 100 km, ranked by prominence then distance.',
    stay_sub: 'Hotels, hostels and guest houses within 100 km. Tap Book to check availability and reserve.'
  },
  hi: {
    nav_home: 'होम', nav_explore: 'एक्सप्लोर', nav_map: 'नक्शा', nav_translate: 'अनुवाद', nav_safety: 'सुरक्षा', nav_trips: 'मेरी यात्राएँ', nav_assistant: 'नविओरा AI', nav_profile: 'प्रोफ़ाइल',
    sign_out: 'साइन आउट', tagline: 'नेविगेट • खोजें • सुरक्षित रहें',
    greeting_morning: 'सुप्रभात', greeting_afternoon: 'नमस्कार', greeting_evening: 'शुभ संध्या',
    currently_in: 'वर्तमान स्थान', search_place: 'शुरू करने के लिए जगह खोजें', locating: 'आपका स्थान ढूँढा जा रहा है…',
    places_visit: 'अभी घूमने लायक जगहें', top_attractions: 'आपके पास प्रमुख चुनिंदा जगहें', stay_nearby: 'पास में ठहरें', your_journey: 'आपकी यात्रा',
    qa_explore: 'आस-पास एक्सप्लोर करें', qa_navigate: 'नेविगेट', qa_translate: 'अनुवाद', qa_safety: 'सुरक्षा', qa_women: 'महिला सुरक्षा', qa_trip: 'मेरी यात्रा',
    navigate: 'नेविगेट', save: 'सहेजें', saved: 'सहेजा', book: 'बुक करें', refresh: 'रिफ्रेश', save_place: 'जगह सहेजें',
    discover_sub: 'आपके 100 किमी के भीतर की सर्वश्रेष्ठ जगहें — आकर्षण, संग्रहालय, व्यूपॉइंट आदि, प्रसिद्धि के अनुसार।',
    attractions_sub: 'आपके 100 किमी के भीतर प्रमुख स्थान, प्रसिद्धि और दूरी के अनुसार।',
    stay_sub: '100 किमी के भीतर होटल, हॉस्टल और गेस्ट हाउस। बुक करें टैप करके उपलब्धता देखें।'
  },
  pa: {
    nav_home: 'ਹੋਮ', nav_explore: 'ਖੋਜੋ', nav_map: 'ਨਕਸ਼ਾ', nav_translate: 'ਅਨੁਵਾਦ', nav_safety: 'ਸੁਰੱਖਿਆ', nav_trips: 'ਮੇਰੀਆਂ ਯਾਤਰਾਵਾਂ', nav_assistant: 'ਨਵਿਓਰਾ AI', nav_profile: 'ਪ੍ਰੋਫਾਈਲ',
    sign_out: 'ਸਾਈਨ ਆਉਟ', tagline: 'ਨੇਵੀਗੇਟ • ਖੋਜੋ • ਸੁਰੱਖਿਅਤ ਰਹੋ',
    greeting_morning: 'ਸ਼ੁਭ ਸਵੇਰ', greeting_afternoon: 'ਸ਼ੁਭ ਦੁਪਹਿਰ', greeting_evening: 'ਸ਼ੁਭ ਸ਼ਾਮ',
    currently_in: 'ਮੌਜੂਦਾ ਟਿਕਾਣਾ', search_place: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਥਾਂ ਖੋਜੋ', locating: 'ਤੁਹਾਡਾ ਟਿਕਾਣਾ ਲੱਭਿਆ ਜਾ ਰਿਹਾ ਹੈ…',
    places_visit: 'ਹੁਣ ਵੇਖਣ ਲਾਇਕ ਥਾਂਵਾਂ', top_attractions: 'ਤੁਹਾਡੇ ਨੇੜੇ ਪ੍ਰਮੁੱਖ ਚੋਣਵੀਆਂ ਥਾਂਵਾਂ', stay_nearby: 'ਨੇੜੇ ਰਹੋ', your_journey: 'ਤੁਹਾਡੀ ਯਾਤਰਾ',
    qa_explore: 'ਨੇੜੇ ਖੋਜੋ', qa_navigate: 'ਨੇਵੀਗੇਟ', qa_translate: 'ਅਨੁਵਾਦ', qa_safety: 'ਸੁਰੱਖਿਆ', qa_women: 'ਔਰਤ ਸੁਰੱਖਿਆ', qa_trip: 'ਮੇਰੀ ਯਾਤਰਾ',
    navigate: 'ਨੇਵੀਗੇਟ', save: 'ਸੰਭਾਲੋ', saved: 'ਸੰਭਾਲਿਆ', book: 'ਬੁੱਕ ਕਰੋ', refresh: 'ਰਿਫ੍ਰੈਸ਼', save_place: 'ਥਾਂ ਸੰਭਾਲੋ',
    discover_sub: 'ਤੁਹਾਡੇ 100 ਕਿਮੀ ਦੇ ਅੰਦਰ ਵਧੀਆ ਥਾਂਵਾਂ — ਆਕਰਸ਼ਣ, ਅਜਾਇਬਘਰ, ਵਿਊਪੁਆਇੰਟ ਆਦਿ।',
    attractions_sub: 'ਤੁਹਾਡੇ 100 ਕਿਮੀ ਦੇ ਅੰਦਰ ਪ੍ਰਮੁੱਖ ਥਾਂਵਾਂ, ਪ੍ਰਸਿੱਧੀ ਤੇ ਦੂਰੀ ਅਨੁਸਾਰ।',
    stay_sub: '100 ਕਿਮੀ ਦੇ ਅੰਦਰ ਹੋਟਲ, ਹੋਸਟਲ ਤੇ ਗੈਸਟ ਹਾਊਸ। ਬੁੱਕ ਕਰੋ ਨੂੰ ਛੋਹ ਕੇ ਉਪਲਬਧਤਾ ਵੇਖੋ।'
  },
  es: {
    nav_home: 'Inicio', nav_explore: 'Explorar', nav_map: 'Mapa', nav_translate: 'Traducir', nav_safety: 'Seguridad', nav_trips: 'Mis viajes', nav_assistant: 'NaviOra IA', nav_profile: 'Perfil',
    sign_out: 'Cerrar sesión', tagline: 'Navega • Descubre • Viaja seguro',
    greeting_morning: 'Buenos días', greeting_afternoon: 'Buenas tardes', greeting_evening: 'Buenas noches',
    currently_in: 'Actualmente en', search_place: 'Busca un lugar para empezar', locating: 'Localizándote…',
    places_visit: 'Lugares para visitar ahora', top_attractions: 'Mejores lugares cerca de ti', stay_nearby: 'Dónde alojarse cerca', your_journey: 'Tu viaje',
    qa_explore: 'Explorar cerca', qa_navigate: 'Navegar', qa_translate: 'Traducir', qa_safety: 'Seguridad', qa_women: 'Seguridad femenina', qa_trip: 'Mi viaje',
    navigate: 'Navegar', save: 'Guardar', saved: 'Guardado', book: 'Reservar', refresh: 'Actualizar', save_place: 'Guardar lugar',
    discover_sub: 'Los mejores lugares a menos de 100 km — atracciones, museos, miradores y más.',
    attractions_sub: 'Principales lugares cerca de ti, a menos de 100 km, por prominencia y distancia.',
    stay_sub: 'Hoteles, hostales y casas de huéspedes a menos de 100 km. Toca Reservar para disponibilidad.'
  },
  fr: {
    nav_home: 'Accueil', nav_explore: 'Explorer', nav_map: 'Carte', nav_translate: 'Traduire', nav_safety: 'Sécurité', nav_trips: 'Mes voyages', nav_assistant: 'NaviOra IA', nav_profile: 'Profil',
    sign_out: 'Déconnexion', tagline: 'Naviguer • Découvrir • Voyager en sécurité',
    greeting_morning: 'Bonjour', greeting_afternoon: 'Bon après-midi', greeting_evening: 'Bonsoir',
    currently_in: 'Actuellement à', search_place: 'Cherchez un lieu pour commencer', locating: 'Localisation…',
    places_visit: 'Lieux à visiter maintenant', top_attractions: 'Meilleurs lieux près de vous', stay_nearby: 'Hébergements à proximité', your_journey: 'Votre voyage',
    qa_explore: 'Explorer à proximité', qa_navigate: 'Naviguer', qa_translate: 'Traduire', qa_safety: 'Sécurité', qa_women: 'Sécurité des femmes', qa_trip: 'Mon voyage',
    navigate: 'Naviguer', save: 'Enregistrer', saved: 'Enregistré', book: 'Réserver', refresh: 'Actualiser', save_place: 'Enregistrer le lieu',
    discover_sub: 'Les meilleurs lieux à moins de 100 km — attractions, musées, points de vue et plus.',
    attractions_sub: 'Top lieux près de vous, à moins de 100 km, par prominence puis distance.',
    stay_sub: 'Hôtels, auberges et maisons d\'hôtes à moins de 100 km. Touchez Réserver pour la disponibilité.'
  },
  de: {
    nav_home: 'Start', nav_explore: 'Entdecken', nav_map: 'Karte', nav_translate: 'Übersetzen', nav_safety: 'Sicherheit', nav_trips: 'Meine Reisen', nav_assistant: 'NaviOra KI', nav_profile: 'Profil',
    sign_out: 'Abmelden', tagline: 'Navigieren • Entdecken • Sicher reisen',
    greeting_morning: 'Guten Morgen', greeting_afternoon: 'Guten Tag', greeting_evening: 'Guten Abend',
    currently_in: 'Aktuell in', search_place: 'Ort suchen zum Starten', locating: 'Standort wird ermittelt…',
    places_visit: 'Orte zum sofortigen Besuch', top_attractions: 'Beste Orte in deiner Nähe', stay_nearby: 'In der Nähe übernachten', your_journey: 'Deine Reise',
    qa_explore: 'In der Nähe entdecken', qa_navigate: 'Navigieren', qa_translate: 'Übersetzen', qa_safety: 'Sicherheit', qa_women: 'Frauensicherheit', qa_trip: 'Meine Reise',
    navigate: 'Navigieren', save: 'Speichern', saved: 'Gespeichert', book: 'Buchen', refresh: 'Aktualisieren', save_place: 'Ort speichern',
    discover_sub: 'Die besten Orte innerhalb von 100 km — Sehenswürdigkeiten, Museen, Aussichtspunkte und mehr.',
    attractions_sub: 'Top-Orte in deiner Nähe, innerhalb 100 km, nach Bedeutung und Entfernung.',
    stay_sub: 'Hotels, Hostels und Pensionen innerhalb 100 km. Tippe auf Buchen für Verfügbarkeit.'
  },
  ar: {
    nav_home: 'الرئيسية', nav_explore: 'استكشاف', nav_map: 'الخريطة', nav_translate: 'ترجمة', nav_safety: 'الأمان', nav_trips: 'رحلاتي', nav_assistant: 'NaviOra الذكاء', nav_profile: 'الملف الشخصي',
    sign_out: 'تسجيل الخروج', tagline: 'تنقّل • اكتشف • ابقَ آمنًا',
    greeting_morning: 'صباح الخير', greeting_afternoon: 'مساء الخير', greeting_evening: 'مساء الخير',
    currently_in: 'حاليًا في', search_place: 'ابحث عن مكان للبدء', locating: 'جارٍ تحديد موقعك…',
    places_visit: 'أماكن للزيارة الآن', top_attractions: 'أفضل الأماكن القريبة منك', stay_nearby: 'أماكن الإقارة القريبة', your_journey: 'رحلتك',
    qa_explore: 'استكشاف القريب', qa_navigate: 'تنقّل', qa_translate: 'ترجمة', qa_safety: 'الأمان', qa_women: 'أمان المرأة', qa_trip: 'رحلتي',
    navigate: 'تنقّل', save: 'حفظ', saved: 'محفوظ', book: 'احجز', refresh: 'تحديث', save_place: 'حفظ المكان',
    discover_sub: 'أفضل الأماكن ضمن 100 كم — معالم ومتاحف ونقاط مشاهدة والمزيد.',
    attractions_sub: 'أفضل الأماكن قربك ضمن 100 كم حسب الأهمية ثم المسافة.',
    stay_sub: 'فنادق ونُزل وبيوت ضيافة ضمن 100 كم. اضغط احجز لمعرفة التوفر.'
  }
};

const UI_KEYS = Object.keys(DICT.en);
const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps']);

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('naviora_lang') || 'en'; } catch { return 'en'; }
  });
  const [extra, setExtra] = useState(null);

  useEffect(() => {
    try { localStorage.setItem('naviora_lang', lang); } catch {}
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr';
    // Static dictionary? nothing to fetch.
    if (DICT[lang]) { setExtra(null); return; }
    // Try cache first.
    try {
      const cached = localStorage.getItem(`naviora_dict_${lang}`);
      if (cached) { setExtra(JSON.parse(cached)); return; }
    } catch {}
    // Translate the UI strings on demand.
    let cancelled = false;
    setExtra(null);
    const blob = UI_KEYS.map((k) => DICT.en[k]).join('\n');
    translateText(blob, 'en', lang)
      .then((out) => {
        if (cancelled) return;
        const parts = String(out).split('\n');
        const d = {};
        UI_KEYS.forEach((k, i) => { d[k] = (parts[i] || '').trim() || DICT.en[k]; });
        setExtra(d);
        try { localStorage.setItem(`naviora_dict_${lang}`, JSON.stringify(d)); } catch {}
      })
      .catch(() => setExtra(null));
    return () => { cancelled = true; };
  }, [lang]);

  const t = (key) => (extra && extra[key]) || (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useI18n = () => useContext(LangContext);