// NaviOra shared real-data utilities: geolocation, OpenStreetMap (via GeoService backend), distance, journey anomaly engine, translation.
import { base44 } from '@/api/base44Client';

export const PLACE_CATEGORIES = [
  { id: 'attractions', label: 'Attractions', osm: { key: 'tourism', value: 'attraction' } },
  { id: 'museums', label: 'Museums', osm: { key: 'tourism', value: 'museum' } },
  { id: 'galleries', label: 'Galleries', osm: { key: 'tourism', value: 'gallery' } },
  { id: 'viewpoints', label: 'Viewpoints', osm: { key: 'tourism', value: 'viewpoint' } },
  { id: 'monuments', label: 'Monuments', osm: { key: 'historic', value: 'monument' } },
  { id: 'castles', label: 'Castles', osm: { key: 'historic', value: 'castle' } },
  { id: 'restaurants', label: 'Restaurants', osm: { key: 'amenity', value: 'restaurant' } },
  { id: 'cafes', label: 'Cafés', osm: { key: 'amenity', value: 'cafe' } },
  { id: 'bars', label: 'Bars', osm: { key: 'amenity', value: 'bar' } },
  { id: 'fast_food', label: 'Fast Food', osm: { key: 'amenity', value: 'fast_food' } },
  { id: 'hotels', label: 'Hotels', osm: { key: 'tourism', value: 'hotel' } },
  { id: 'hostels', label: 'Hostels', osm: { key: 'tourism', value: 'hostel' } },
  { id: 'guest_houses', label: 'Guest Houses', osm: { key: 'tourism', value: 'guest_house' } },
  { id: 'shopping', label: 'Shopping', osm: { key: 'shop', value: 'mall' } },
  { id: 'supermarket', label: 'Supermarkets', osm: { key: 'shop', value: 'supermarket' } },
  { id: 'marketplace', label: 'Markets', osm: { key: 'amenity', value: 'marketplace' } },
  { id: 'bakery', label: 'Bakeries', osm: { key: 'shop', value: 'bakery' } },
  { id: 'parks', label: 'Parks', osm: { key: 'leisure', value: 'park' } },
  { id: 'gardens', label: 'Gardens', osm: { key: 'leisure', value: 'garden' } },
  { id: 'beaches', label: 'Beaches', osm: { key: 'natural', value: 'beach' } },
  { id: 'pharmacies', label: 'Pharmacies', osm: { key: 'amenity', value: 'pharmacy' } },
  { id: 'hospitals', label: 'Hospitals', osm: { key: 'amenity', value: 'hospital' } },
  { id: 'clinics', label: 'Clinics', osm: { key: 'amenity', value: 'clinic' } },
  { id: 'dentists', label: 'Dentists', osm: { key: 'amenity', value: 'dentist' } },
  { id: 'police', label: 'Police', osm: { key: 'amenity', value: 'police' } },
  { id: 'atms', label: 'ATMs', osm: { key: 'amenity', value: 'atm' } },
  { id: 'banks', label: 'Banks', osm: { key: 'amenity', value: 'bank' } },
  { id: 'fuel', label: 'Fuel', osm: { key: 'amenity', value: 'fuel' } },
  { id: 'ev_charging', label: 'EV Charging', osm: { key: 'amenity', value: 'charging_station' } },
  { id: 'bus_station', label: 'Bus Stops', osm: { key: 'highway', value: 'bus_stop' } },
  { id: 'train_station', label: 'Train Stations', osm: { key: 'railway', value: 'station' } },
  { id: 'taxi', label: 'Taxi', osm: { key: 'amenity', value: 'taxi' } },
  { id: 'car_rental', label: 'Car Rental', osm: { key: 'amenity', value: 'car_rental' } },
  { id: 'tourist_info', label: 'Tourist Info', osm: { key: 'tourism', value: 'information' } },
  { id: 'toilets', label: 'Toilets', osm: { key: 'amenity', value: 'toilets' } },
  { id: 'drinking_water', label: 'Drinking Water', osm: { key: 'amenity', value: 'drinking_water' } },
  { id: 'cinema', label: 'Cinema', osm: { key: 'amenity', value: 'cinema' } },
  { id: 'theatre', label: 'Theatre', osm: { key: 'amenity', value: 'theatre' } },
  { id: 'library', label: 'Libraries', osm: { key: 'amenity', value: 'library' } },
  { id: 'place_of_worship', label: 'Places of Worship', osm: { key: 'amenity', value: 'place_of_worship' } }
];

export const SAFETY_CATEGORIES = ['police', 'hospitals', 'pharmacies', 'clinics'];
export const WOMEN_SAFE_CATEGORIES = ['police', 'cafes', 'restaurants', 'hotels', 'pharmacies', 'supermarket', 'bus_station', 'atms', 'fuel'];

export const INTERESTS = ['Culture', 'History', 'Food', 'Nature', 'Adventure', 'Shopping', 'Photography', 'Family', 'Nightlife', 'Architecture', 'Spirituality', 'Beaches'];

const FALLBACK_NAMES = { atms: 'ATM', toilets: 'Toilet', drinking_water: 'Drinking Water', bus_station: 'Bus Stop', train_station: 'Train Station', fuel: 'Fuel Station', pharmacy: 'Pharmacy', hospital: 'Hospital', police: 'Police', clinic: 'Clinic' };

function filterFor(catId) {
  const c = PLACE_CATEGORIES.find((x) => x.id === catId);
  if (!c) return null;
  return { key: c.osm.key, value: c.osm.value, id: catId, fallback: FALLBACK_NAMES[catId] || c.label.replace(/s$/, '') };
}

// ---- Geolocation ----
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp }),
      (err) => {
        const messages = {
          1: 'Location access was denied. Please allow location permission in your browser settings.',
          2: 'Your location is currently unavailable. Try moving to an open area or search a place manually below.',
          3: 'Location request timed out. Try again or search a place manually.'
        };
        reject(new Error(messages[err.code] || err.message || 'Could not get your location.'));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000, ...options }
    );
  });
}

// ---- Distance (haversine) ----
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters) {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ---- Forward geocode (Nominatim) — via GeoService ----
export async function forwardGeocode(query) {
  const res = await base44.functions.invoke('GeoService', { op: 'forward', query });
  if (res?.data?.error) throw new Error(res.data.error);
  return res?.data;
}

// ---- Reverse geocode (Nominatim) — via GeoService ----
export async function reverseGeocode(lat, lng) {
  try {
    const res = await base44.functions.invoke('GeoService', { op: 'reverse', lat, lng });
    return res?.data?.name || 'Unknown location';
  } catch {
    return 'Unknown location';
  }
}

// ---- Nearby places (single category) via GeoService ----
export async function fetchNearbyPlaces(lat, lng, categoryId, radiusMeters = 0, limit = 40) {
  const f = filterFor(categoryId);
  if (!f) throw new Error('Unknown category');
  const res = await base44.functions.invoke('GeoService', { op: 'query', lat, lng, filters: [f], radius: radiusMeters, limit });
  const places = (res?.data?.places || []).slice().sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  return radiusMeters ? places.filter((p) => p.distance <= radiusMeters) : places;
}

// ---- Multiple categories in a single request (used by Map + Safety) ----
export async function fetchMultiPlaces(lat, lng, categoryIds, radiusMeters = 0, limit = 40) {
  const filters = categoryIds.map(filterFor).filter(Boolean);
  if (!filters.length) return [];
  const res = await base44.functions.invoke('GeoService', { op: 'query', lat, lng, filters, radius: radiusMeters, limit: limit * filters.length });
  const places = res?.data?.places || [];
  const seen = new Set();
  const dedup = places.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  const within = (radiusMeters ? dedup.filter((p) => p.distance <= radiusMeters) : dedup).slice().sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  return within.slice(0, limit);
}

// ---- Discover: a balanced mix of top categories to "visit now" ----
// Round-robin interleaving so famous attractions/museums surface even when
// parks are physically closer (e.g. Golden Temple ~80km away still appears).
export async function fetchDiscoverPlaces(lat, lng, radiusMeters = 0, limit = 24) {
  const ids = ['attractions', 'museums', 'viewpoints', 'monuments', 'place_of_worship', 'gardens', 'parks', 'tourist_info'];
  const filters = ids.map(filterFor).filter(Boolean);
  const res = await base44.functions.invoke('GeoService', { op: 'query', lat, lng, filters, radius: radiusMeters, limit: 80 });
  const places = res?.data?.places || [];
  const byCat = {};
  places.forEach((p) => { (byCat[p.category] ||= []).push(p); });
  Object.values(byCat).forEach((arr) => arr.sort((a, b) => a.distance - b.distance));
  const out = [];
  let added = true;
  while (added && out.length < limit) {
    added = false;
    for (const id of ids) {
      const arr = byCat[id];
      if (arr && arr.length) {
        out.push(arr.shift());
        added = true;
        if (out.length >= limit) break;
      }
    }
  }
  return out.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}

// ---- Prominence scoring + top picks (best places within a radius) ----
// OSM/Photon doesn't expose star ratings, so we approximate "best rated" by a
// prominence score: richer, more complete listings (website, phone, hours) and
// notable categories (attractions, museums, monuments…) rank above bare tags.
export function scorePlace(p) {
  let s = 0;
  if (p.name) s += 1;
  if (p.website) s += 3;
  if (p.phone) s += 1;
  if (p.opening_hours) s += 1;
  if (['attractions', 'museums', 'monuments', 'castles', 'viewpoints', 'place_of_worship', 'gardens', 'tourist_info'].includes(p.category)) s += 2;
  return s;
}
export function rankByProminence(places) {
  return [...places].sort((a, b) => (scorePlace(b) - scorePlace(a)) || ((a.distance ?? 0) - (b.distance ?? 0)));
}
export async function fetchTopPlaces(lat, lng, limit = 15, radiusMeters = 100000) {
  const ids = ['attractions', 'museums', 'monuments', 'viewpoints', 'castles', 'place_of_worship', 'gardens', 'parks', 'tourist_info'];
  const filters = ids.map(filterFor).filter(Boolean);
  const res = await base44.functions.invoke('GeoService', { op: 'query', lat, lng, filters, radius: radiusMeters, limit: 120 });
  let places = res?.data?.places || [];
  if (radiusMeters) places = places.filter((p) => p.distance <= radiusMeters);
  return places.slice().sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0) || (scorePlace(b) - scorePlace(a))).slice(0, limit);
}

// ---- Opening hours (lightweight parser) ----
export function isOpenNow(openingHours) {
  if (!openingHours) return null;
  if (openingHours.toLowerCase() === '24/7') return true;
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const now = new Date();
  const day = days[now.getDay()];
  const time = now.getHours() * 60 + now.getMinutes();
  const re = /([A-Za-z]{2})(?:-([A-Za-z]{2}))?\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/g;
  let m;
  let result = null;
  while ((m = re.exec(openingHours)) !== null) {
    const startDay = m[1];
    const endDay = m[2] || startDay;
    const startIdx = days.indexOf(startDay);
    const endIdx = days.indexOf(endDay);
    const curIdx = days.indexOf(day);
    let dayMatch = false;
    if (startIdx <= endIdx) dayMatch = curIdx >= startIdx && curIdx <= endIdx;
    else dayMatch = curIdx >= startIdx || curIdx <= endIdx;
    const open = parseInt(m[3]) * 60 + parseInt(m[4]);
    const close = parseInt(m[5]) * 60 + parseInt(m[6]);
    if (dayMatch && time >= open && time <= close) result = true;
    if (dayMatch && (time < open || time > close)) result = false;
  }
  return result;
}

// ---- Journey Anomaly Engine ----
export function computeJourneyStatus({ checkpoints, currentLocation, lastMovementTime, routeDeviationMeters, environmentalRisk, acknowledgedSafeAt }) {
  const reasons = [];
  let score = 0;
  const now = Date.now();
  const missed = checkpoints.filter((c) => {
    if (c.status === 'reached' || c.status === 'skipped') return false;
    return c.expected_time && new Date(c.expected_time).getTime() < now - 15 * 60 * 1000;
  });
  if (missed.length > 0) {
    score += missed.length * 2;
    reasons.push(`${missed.length} expected stop${missed.length > 1 ? 's were' : ' was'} missed (${missed.map((m) => m.title).join(', ')}).`);
  }
  if (routeDeviationMeters != null && routeDeviationMeters > 400) {
    score += routeDeviationMeters > 1000 ? 2 : 1;
    reasons.push(`You are approximately ${formatDistance(routeDeviationMeters)} from your planned route.`);
  }
  if (lastMovementTime) {
    const inactiveMin = Math.round((now - lastMovementTime) / 60000);
    if (inactiveMin >= 20) {
      score += inactiveMin >= 35 ? 2 : 1;
      reasons.push(`You have remained stationary for about ${inactiveMin} minutes.`);
    }
  }
  if (environmentalRisk) {
    score += 1;
    reasons.push('An environmental risk note is active for this area.');
  }
  let suppressed = false;
  if (acknowledgedSafeAt && now - acknowledgedSafeAt < 30 * 60 * 1000) suppressed = true;
  let level = 'normal';
  if (score >= 6) level = 'critical';
  else if (score >= 4) level = 'concern';
  else if (score >= 2) level = 'attention';
  if (suppressed && level !== 'critical') level = 'attention';
  const labels = { normal: 'Normal', attention: 'Attention', concern: 'Concern', critical: 'Critical' };
  return { level, label: labels[level], reasons, score };
}

// ---- External navigation handoff ----
export function openInMaps(destinationLat, destinationLng, label) {
  const url = `https://www.google.com/maps/search/?api=1&query=${destinationLat},${destinationLng}${label ? `&query_place_id=${encodeURIComponent(label)}` : ''}`;
  window.open(url, '_blank', 'noopener');
}

// ---- Hotel booking handoff (Booking.com search for the place + area) ----
export function bookHotel(place) {
  const q = encodeURIComponent(`${place.name} ${place.address || ''}`.trim() || place.name);
  window.open(`https://www.booking.com/search.html?ss=${q}`, '_blank', 'noopener');
}

export const HOTEL_CATEGORIES = ['hotels', 'hostels', 'guest_houses'];
export function isHotelPlace(place) { return HOTEL_CATEGORIES.includes(place?.category); }

// ---- Translation (free, reliable, all languages) ----
export async function translateText(text, source = 'en', target = 'es') {
  const clean = (text || '').trim();
  if (!clean) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const out = data[0].map((seg) => (seg && seg[0]) || '').join('');
        if (out) return out;
      }
    }
  } catch (e) { /* fall through */ }
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${source}|${target}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) return data.responseData.translatedText;
    }
  } catch (e) { /* fall through */ }
  throw new Error('Translation service is unavailable right now. Please try again.');
}

// ---- Build a live-location message for emergency contacts ----
export function buildLiveLocationMessage(userName, lat, lng, note = 'needs you') {
  const name = userName || 'This traveler';
  const link = lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : '';
  return `${name} ${note}. They are using NaviOra and shared their live location with you.${link ? `\nLive location: ${link}` : ''}\nSent via NaviOra.`;
}

// ---- WhatsApp / SMS share helpers ----
export function waLink(phone, message) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
export function smsLink(phone, message) {
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}