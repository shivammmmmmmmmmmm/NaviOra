import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Server-side proxy for place discovery + geocoding via Photon (Komoot) and Nominatim.
// Browsers get blocked/rate-limited by these services (no User-Agent header, CORS, concurrency).
// Photon is fast and reliable for nearby POI search; Nominatim reverse/forward is used for naming.

const PHOTON_API = 'https://photon.komoot.io/api';
const PHOTON_REV = 'https://photon.komoot.io/reverse';
const REQ_TIMEOUT = 12000;

// OSM value -> a Photon-friendly search term
const PHOTON_TERMS = {
  attraction: 'tourist attraction', museum: 'museum', gallery: 'art gallery', viewpoint: 'viewpoint',
  monument: 'monument', castle: 'castle', restaurant: 'restaurant', cafe: 'cafe', bar: 'bar',
  fast_food: 'fast food', hotel: 'hotel', hostel: 'hostel', guest_house: 'guest house', mall: 'shopping mall',
  supermarket: 'supermarket', marketplace: 'market', bakery: 'bakery', park: 'park', garden: 'garden',
  beach: 'beach', pharmacy: 'pharmacy', hospital: 'hospital', clinic: 'clinic', dentist: 'dentist',
  police: 'police', atm: 'atm', bank: 'bank', fuel: 'fuel station', charging_station: 'ev charging',
  bus_stop: 'bus stop', station: 'train station', taxi: 'taxi', car_rental: 'car rental',
  information: 'tourist information', toilets: 'public toilet', drinking_water: 'drinking water',
  cinema: 'cinema', theatre: 'theatre', library: 'library', place_of_worship: 'place of worship'
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Place'; }

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQ_TIMEOUT);
  try {
    const res = await fetch(url, { ...opts, headers: { 'User-Agent': 'NaviOra/1.0', ...(opts.headers || {}) }, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

function parsePhotonFeature(ft, lat, lng, filter) {
  const p = ft.properties || {};
  const coords = ft.geometry?.coordinates;
  const pLng = coords?.[0];
  const pLat = coords?.[1];
  if (pLat == null || pLng == null) return null;
  const name = p.name || filter?.fallback || cap(filter?.value || 'place');
  return {
    id: `${filter?.id || 'place'}-${p.osm_id || `${pLat},${pLng}`}`,
    osm_id: p.osm_id,
    name,
    category: filter?.id || 'place',
    lat: pLat, lng: pLng,
    address: [p.street, p.housenumber, p.postcode, p.city].filter(Boolean).join(' ').trim() || '',
    phone: p.phone || '',
    website: p.website || '',
    opening_hours: p.opening_hours || '',
    cuisine: p.cuisine || '',
    distance: haversine(lat, lng, pLat, pLng),
    rating: null,
    review_count: 0
  };
}

async function queryPlaces(filters, lat, lng, limit) {
  const perFilter = Math.min(Math.ceil(limit / Math.max(filters.length, 1)) + 6, 50);
  const all = [];
  for (const f of filters) {
    const term = PHOTON_TERMS[f.value] || f.value;
    try {
      const url = `${PHOTON_API}?q=${encodeURIComponent(term)}&lat=${lat}&lon=${lng}&limit=${perFilter}`;
      const data = await fetchJson(url);
      for (const ft of (data.features || [])) {
        // Prefer exact OSM tag match when available; otherwise trust the query.
        const ok = (!ft.properties?.osm_value) || ft.properties.osm_value === f.value ||
          (ft.properties.osm_key === f.key);
        if (ok) all.push(parsePhotonFeature(ft, lat, lng, f));
      }
    } catch (e) { /* one category failing shouldn't break the rest */ }
  }
  const seen = new Set();
  const dedup = all.filter(Boolean).filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  dedup.sort((a, b) => a.distance - b.distance);
  return dedup;
}

async function nominatimReverse(lat, lng) {
  try {
    const d = await fetchJson(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
    return d.address ? (d.address.city || d.address.town || d.address.village || d.address.county || d.display_name || 'Unknown location') : (d.display_name || 'Unknown location');
  } catch {
    // Photon reverse fallback
    try {
      const d = await fetchJson(`${PHOTON_REV}?lon=${lng}&lat=${lat}&limit=1`);
      const p = d.features?.[0]?.properties || {};
      return p.city || p.name || p.state || p.country || 'Unknown location';
    } catch { return 'Unknown location'; }
  }
}

async function nominatimForward(query) {
  try {
    const data = await fetchJson(`${PHOTON_API}?q=${encodeURIComponent(query)}&limit=1`);
    const f = data.features?.[0];
    if (!f) throw new Error('No matching place found. Try another name.');
    const [lng, lat] = f.geometry.coordinates;
    return { lat, lng, name: f.properties?.name || query };
  } catch (e) {
    throw new Error(e.message || 'Could not find that place.');
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const op = body.op;

    if (op === 'reverse') {
      return Response.json({ name: await nominatimReverse(Number(body.lat), Number(body.lng)) });
    }
    if (op === 'forward') {
      try { return Response.json(await nominatimForward(String(body.query || ''))); }
      catch (e) { return Response.json({ error: e.message }, { status: 400 }); }
    }
    if (op === 'query') {
      const lat = Number(body.lat), lng = Number(body.lng);
      const limit = Math.min(Number(body.limit) || 40, 80);
      const filters = Array.isArray(body.filters) ? body.filters.filter((f) => f && f.key && f.value).slice(0, 12) : [];
      if (!isFinite(lat) || !isFinite(lng) || filters.length === 0) {
        return Response.json({ error: 'invalid params' }, { status: 400 });
      }
      const places = await queryPlaces(filters, lat, lng, limit);
      return Response.json({ places });
    }
    return Response.json({ error: 'unknown op' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}