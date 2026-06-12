import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';

/**
 * Reusable headshot cropper. Shows the chosen image with a circular guide and
 * pan / zoom / pinch so the actor frames their face perfectly. Outputs a clean
 * square JPEG Blob (serves circular avatars AND the portrait swipe card).
 *
 *   <HeadshotCropper imageSrc={objectUrl} onCancel={...} onComplete={(blob)=>...} />
 *
 * The caller owns the object URL (create it, revoke it on cancel/complete).
 */
async function getCroppedBlob(imageSrc, cropPixels, size = 900) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  // Fill so transparent PNGs don't crop to black.
  ctx.fillStyle = '#0E0D0A';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, size, size,
  );
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
}

export default function HeadshotCropper({ imageSrc, onCancel, onComplete }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area, croppedAreaPixels) => {
    setPixels(croppedAreaPixels);
  }, []);

  const handleUse = async () => {
    if (!pixels || saving) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, pixels);
      onComplete?.(blob);
    } catch (e) {
      onComplete?.(null, e);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'rgba(8,7,5,0.97)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 10px', textAlign: 'center' }}>
        <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Position your headshot</h3>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '5px 0 0' }}>Drag to center your face · pinch or slide to zoom</p>
      </div>

      {/* Crop surface */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          restrictPosition
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Controls */}
      <div style={{ padding: '16px 24px calc(env(safe-area-inset-bottom, 0px) + 18px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          type="range" min={1} max={3} step={0.01} value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          style={{ width: '100%', accentColor: '#D4A85F' }}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{ flex: 1, padding: '13px', borderRadius: 14, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleUse}
            disabled={saving || !pixels}
            style={{ flex: 2, padding: '13px', borderRadius: 14, background: 'linear-gradient(135deg, #D4A85F, #7A5A18)', border: 'none', color: '#0E0D0A', fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: (saving || !pixels) ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Use photo'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
