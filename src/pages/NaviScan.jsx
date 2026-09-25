import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Loader2, Sparkles } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { reverseGeocode } from '@/lib/naviora';
import { useI18n } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import CameraCapture from '@/components/scan/CameraCapture';
import ScanResultView from '@/components/scan/ScanResultView';

export default function NaviScan() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { location: geo, error, loading, requestOnce } = useGeolocation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const [err, setErr] = useState(null);

  const onFile = async (f, pv) => {
    setFile(f);
    setPreview(pv);
    setFileUrl(null);
    setResult(null);
    setErr(null);
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: f });
      setFileUrl(file_url);
    } catch (e) {
      setErr('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const analyze = async () => {
    if (!fileUrl) { setErr('Take or upload a photo first.'); return; }
    if (!placeName && geo) reverseGeocode(geo.lat, geo.lng).then(setPlaceName).catch(() => {});
    setAnalyzing(true);
    setErr(null);
    try {
      const res = await base44.functions.invoke('AnalyzeScan', {
        file_url: fileUrl,
        userLang: lang,
        userLat: geo?.lat,
        userLng: geo?.lng,
        location: placeName || ''
      });
      if (res?.data?.error) setErr(res.data.error);
      else setResult(res.data);
    } catch (e) {
      setErr(e.message || 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setFileUrl(null); setResult(null); setErr(null); };

  const checkPrice = () => {
    if (result?.price_data?.length) navigate('/verify', { state: { priceData: result.price_data } });
    else navigate('/verify');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-navy flex items-center gap-2"><ScanLine className="text-primary" /> NaviScan</h1>
        <p className="text-sm text-text-secondary mt-1">Scan a sign, menu, ticket or receipt. Understand it, then act.</p>
      </div>

      {!result && (
        <>
          <CameraCapture onFile={onFile} preview={preview} onClear={reset} />

          {preview && !result && (
            <button onClick={analyze} disabled={analyzing || uploading || !fileUrl} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
              {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : analyzing ? <><Loader2 size={16} className="animate-spin" /> Understanding the image…</> : <><Sparkles size={16} /> Analyze</>}
            </button>
          )}

          {(analyzing || uploading) && (
            <div className="rounded-2xl bg-card border border-border p-6 text-center text-sm text-text-secondary flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-primary" size={24} />
              {uploading ? 'Uploading your photo…' : 'Reading the image, detecting language, translating and reasoning about context…'}
            </div>
          )}

          {err && <div className="rounded-xl bg-emergency/10 border border-emergency/20 p-3 text-sm text-emergency">{err}</div>}

          <p className="text-xs text-text-secondary/70 text-center">Real image understanding via on-device capture and server-side vision + OCR. No content is invented beyond what's in the image.</p>
        </>
      )}

      {result && <ScanResultView result={result} image={preview} onCheckPrice={checkPrice} onScanAgain={reset} />}
    </div>
  );
}