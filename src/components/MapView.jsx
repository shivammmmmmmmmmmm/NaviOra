import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Map as MapIcon, Satellite } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const BASEMAPS = {
  street: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NPS, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }
};

function makeIcon(color, glyph = '') {
  return L.divIcon({
    className: 'naviora-marker',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font-size:13px;font-weight:700">${glyph}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });
}

const userIcon = L.divIcon({
  className: 'naviora-marker',
  html: `<div style="position:relative;width:20px;height:20px"><div style="position:absolute;inset:0;background:hsl(var(--primary));border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px hsl(var(--primary) / .25)"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const CATEGORY_COLORS = {
  user: '#D97706', saved: '#d97706', expected: '#64748B', attractions: '#d97706', actual: '#D97706',
  police: '#1d4ed8', hospitals: '#dc2626', pharmacies: '#16a34a', clinics: '#0ea5e9',
  cafes: '#92400e', restaurants: '#ea580c', hotels: '#7c3aed', supermarket: '#db2777',
  bus_station: '#475569', atms: '#0891b2',   fuel: '#0d9488', default: '#D97706'
};

function Recenter({ userLocation, follow }) {
  const map = useMap();
  useEffect(() => {
    if (follow && userLocation) map.setView([userLocation.lat, userLocation.lng], map.getZoom() || 15, { animate: true });
  }, [userLocation, follow, map]);
  return null;
}

function FitBounds({ markers, userLocation, fitKey }) {
  const map = useMap();
  useEffect(() => {
    const pts = [
      ...markers.map((m) => [m.lat, m.lng]),
      userLocation ? [userLocation.lat, userLocation.lng] : null
    ].filter(Boolean);
    if (pts.length === 0) return;
    if (pts.length === 1) { map.setView(pts[0], 15); return; }
    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}

export default function MapView({ userLocation, markers = [], expectedRoute = [], actualRoute = [], height = '400px', onMarkerClick, follow = false, fitKey }) {
  const [basemap, setBasemap] = useState('street');
  const center = userLocation ? [userLocation.lat, userLocation.lng] : markers[0] ? [markers[0].lat, markers[0].lng] : [20, 0];
  const layer = BASEMAPS[basemap];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border shadow-soft" style={{ height }}>
      <MapContainer center={center} zoom={14} zoomControl scrollWheelZoom className="w-full h-full" style={{ height: '100%' }}>
        <TileLayer key={basemap} url={layer.url} attribution={layer.attribution} maxZoom={19} />
        <Recenter userLocation={userLocation} follow={follow} />
        <FitBounds markers={markers} userLocation={userLocation} fitKey={fitKey} />
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        {markers.filter(Boolean).map((m, i) => (
          <Marker
            key={m.id || i}
            position={[m.lat, m.lng]}
            icon={makeIcon(CATEGORY_COLORS[m.category] || CATEGORY_COLORS.default, m.glyph || '')}
            eventHandlers={{ click: () => onMarkerClick?.(m) }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{m.name}</div>
                {m.distance != null && <div className="text-text-secondary">{typeof m.distance === 'number' ? `${Math.round(m.distance)} m` : m.distance}</div>}
                {m.address && <div className="text-text-secondary text-xs mt-1">{m.address}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
        {expectedRoute.length > 0 && (
          <Polyline positions={expectedRoute.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#94a3b8', weight: 4, dashArray: '8 8' }} />
        )}
        {actualRoute.length > 0 && (
          <Polyline positions={actualRoute.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#D97706', weight: 5 }} />
        )}
      </MapContainer>

      {/* Basemap toggle */}
      <div className="absolute left-3 top-3 z-[1000] flex rounded-xl overflow-hidden border border-border shadow-soft-lg">
        <button
          onClick={() => setBasemap('street')}
          className={`flex items-center gap-1 px-2.5 h-9 text-xs font-medium ${basemap === 'street' ? 'bg-primary text-primary-foreground' : 'bg-white text-text-secondary'}`}
        >
          <MapIcon size={14} /> Street
        </button>
        <button
          onClick={() => setBasemap('satellite')}
          className={`flex items-center gap-1 px-2.5 h-9 text-xs font-medium ${basemap === 'satellite' ? 'bg-primary text-primary-foreground' : 'bg-white text-text-secondary'}`}
        >
          <Satellite size={14} /> Satellite
        </button>
      </div>
    </div>
  );
}