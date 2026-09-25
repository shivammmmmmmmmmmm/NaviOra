import React, { useRef } from 'react';
import { Camera, Upload, ImagePlus } from 'lucide-react';

// Premium, simple capture control: real camera (mobile) or file upload.
// No fake scanning animation — analysis only runs when the user taps Analyze.
export default function CameraCapture({ onFile, preview, onClear }) {
  const camRef = useRef(null);
  const upRef = useRef(null);

  const handle = (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f, URL.createObjectURL(f));
  };

  if (preview) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
        <div className="relative">
          <img src={preview} alt="Captured" className="w-full max-h-[420px] object-contain bg-black/5" />
          <button onClick={onClear} className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-medium">Retake</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 sm:p-8 text-center shadow-soft">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-mint/50 flex items-center justify-center mb-4">
        <ImagePlus size={28} className="text-primary" />
      </div>
      <p className="text-sm text-text-secondary mb-5">Point your camera at a sign, menu, ticket, price board or receipt — or upload a photo.</p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button onClick={() => camRef.current?.click()} className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium">
          <Camera size={16} /> Take photo
        </button>
        <button onClick={() => upRef.current?.click()} className="inline-flex items-center justify-center gap-2 bg-mint text-navy rounded-xl px-4 py-2.5 text-sm font-medium">
          <Upload size={16} /> Upload image
        </button>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={upRef} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  );
}