import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentPosition } from '@/lib/naviora';

// Live geolocation tracking hook. Real browser API, no simulation.
// auto: request position on mount (default true) so "enable location" works proactively.
export function useGeolocation({ watch = false, auto = true } = {}) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef(null);
  const lastMovementRef = useRef(null);
  const lastPosRef = useRef(null);

  const requestOnce = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition(opts);
      setLocation(pos);
      lastPosRef.current = pos;
      return pos;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const startWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this device.');
      return;
    }
    setLoading(true);
    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const cur = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp };
        const prev = lastPosRef.current;
        if (prev) {
          const d = Math.hypot(cur.lat - prev.lat, cur.lng - prev.lng) * 111000;
          if (d > 25) lastMovementRef.current = cur.timestamp;
        } else {
          lastMovementRef.current = cur.timestamp;
        }
        lastPosRef.current = cur;
        setLocation(cur);
        setLoading(false);
      },
      (err) => {
        const messages = { 1: 'Location access was denied. Please allow location permission.', 2: 'Location unavailable.', 3: 'Location request timed out.' };
        setError(messages[err.code] || err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );
  }, []);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Auto-request on mount
  useEffect(() => {
    if (auto) requestOnce().catch(() => {});
    if (watch) startWatch();
    return () => stopWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, error, loading, requestOnce, startWatch, stopWatch, lastMovementTime: lastMovementRef.current, setLocation };
}