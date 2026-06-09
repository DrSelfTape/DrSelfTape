import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import axiosInstance from '../redux/http';
import { openExternal } from '../utils/openExternal';

const APP_STORE_URL = 'itms-apps://itunes.apple.com/app/id6770320460';
const VERSION_ENDPOINT = '/v1/notifications/system/latest-version/';
// Keep in lockstep with UpdateBanner.BUNDLE_VERSION and the iOS pbxproj
// MARKETING_VERSION. The gate trips when this is BELOW the BE's reported
// min_ios.
const BUNDLE_VERSION = '1.0.5';

function versionLt(a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const ai = pa[i] || 0;
    const bi = pb[i] || 0;
    if (ai < bi) return true;
    if (ai > bi) return false;
  }
  return false;
}

/**
 * Full-screen "Update Required" modal that gates the entire app when the
 * baked BUNDLE_VERSION is below the BE's reported min_ios. Renders children
 * normally when the gate is clear (the common case).
 *
 * Only fires on native iOS — web users auto-update via Vercel, no install
 * step to gate behind.
 *
 * Fail-open: if the version fetch errors out, render children. A network
 * blip should never lock everyone out.
 */
export default function ForceUpdateGate({ children }) {
  const [minIos, setMinIos] = useState(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    // iOS-only: this gate checks min_ios and links to the App Store. Web
    // auto-updates via Vercel, and Android has no update channel yet
    // (no min_android, no Play link) — gating it here avoids trapping
    // Android users on a blocking modal with a dead itms-apps:// button.
    if (Capacitor.getPlatform() !== 'ios') return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get(VERSION_ENDPOINT);
        if (!cancelled && data?.min_ios) setMinIos(data.min_ios);
      } catch { /* fail open — don't lock users out on a network blip */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const blocked = !!(minIos && versionLt(BUNDLE_VERSION, minIos));

  if (!blocked) return children;

  const handleUpdate = () => {
    if (opening) return;
    setOpening(true);
    openExternal(APP_STORE_URL);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#0a1a14',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Space Grotesk', 'Poppins', sans-serif",
        paddingTop: 'calc(32px + env(safe-area-inset-top))',
        paddingBottom: 'calc(32px + env(safe-area-inset-bottom))',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(94,230,184,0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 38,
          marginBottom: 24,
        }}
      >
        ⬆️
      </div>
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          margin: 0,
          marginBottom: 12,
        }}
      >
        Update Required
      </h1>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.5,
          opacity: 0.78,
          margin: 0,
          marginBottom: 28,
          maxWidth: 320,
        }}
      >
        A newer version of Dr Self Tape is available. To keep using the app,
        please update from the App Store — it only takes a moment.
      </p>
      <button
        type="button"
        onClick={handleUpdate}
        disabled={opening}
        style={{
          background: 'linear-gradient(90deg, #5ee6b8 0%, #A7ECDA 100%)',
          color: '#0a1a14',
          border: 'none',
          borderRadius: 999,
          padding: '14px 32px',
          fontSize: 15,
          fontWeight: 700,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          cursor: 'pointer',
          opacity: opening ? 0.7 : 1,
          minWidth: 240,
        }}
      >
        {opening ? 'Opening App Store…' : 'Open App Store'}
      </button>
      <p
        style={{
          fontSize: 11,
          opacity: 0.45,
          marginTop: 24,
          marginBottom: 0,
          letterSpacing: '0.04em',
        }}
      >
        Your version: {BUNDLE_VERSION} · Required: {minIos}
      </p>
    </div>
  );
}
