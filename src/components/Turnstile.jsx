import { useEffect, useRef, useState } from 'react';

// Cloudflare Turnstile site key. Defaults to Cloudflare's official always-pass
// test key (1x00000000000000000000AA) so the verification tick renders in
// development without real credentials. Set VITE_TURNSTILE_SITE_KEY to your
// real site key (from the Cloudflare dashboard) for production.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export default function Turnstile({ onVerify, className }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onVerifyRef = useRef(onVerify);
  const [failed, setFailed] = useState(false);

  useEffect(() => { onVerifyRef.current = onVerify; }, [onVerify]);

  useEffect(() => {
    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: 'light',
        appearance: 'always',
        size: 'normal',
        callback: (token) => onVerifyRef.current?.(token),
        'expired-callback': () => onVerifyRef.current?.(''),
        'error-callback': () => setFailed(true),
      });
    };

    if (window.turnstile) { render(); return; }

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener('load', render);
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => { if (!cancelled) setFailed(true); };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
      }
    };
  }, []);

  return (
    <div className={className}>
      <div ref={containerRef} style={{ minHeight: 65 }} />
      {failed && (
        <p className="text-xs text-destructive mt-1">Verification failed to load — please refresh the page.</p>
      )}
    </div>
  );
}
