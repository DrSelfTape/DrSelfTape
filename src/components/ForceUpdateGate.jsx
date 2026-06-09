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
        background: 'linear-gradient(160deg, #FBF6EC 0%, #F4E7CB 52%, #E7D3A6 100%)',
        color: '#2A2418',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 28px',
        textAlign: 'center',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Space Grotesk', 'Poppins', sans-serif",
        paddingTop: 'calc(40px + env(safe-area-inset-top))',
        paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
        animation: 'updGateIn 0.5s ease-out both',
      }}
    >
      {/* logo in a soft floating card for depth */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 28,
          padding: '26px 30px',
          marginBottom: 30,
          boxShadow: '0 18px 50px rgba(150,116,40,0.20)',
          animation: 'updGateFloat 4s ease-in-out infinite',
        }}
      >
        <img
          src="/logo-black.png"
          alt="Dr Self Tape"
          style={{ width: 168, height: 'auto', display: 'block' }}
        />
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: '#A9842E',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        New version available
      </div>
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '-0.4px',
          lineHeight: 1.15,
          margin: 0,
          marginBottom: 14,
          color: '#231E12',
        }}
      >
        Time for an update
      </h1>
      <p
        style={{
          fontSize: 15.5,
          lineHeight: 1.55,
          color: '#6B5E42',
          margin: 0,
          marginBottom: 32,
          maxWidth: 300,
        }}
      >
        You're on an older version. Update to the latest Dr Self Tape for a
        smoother, more reliable studio.
      </p>
      <button
        type="button"
        onClick={handleUpdate}
        onTouchEnd={(e) => { e.preventDefault(); handleUpdate(); }}
        disabled={opening}
        style={{
          background: 'linear-gradient(135deg, #E9C879 0%, #C9A24E 100%)',
          color: '#2A2114',
          border: 'none',
          borderRadius: 999,
          padding: '16px 36px',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.01em',
          boxShadow: '0 10px 26px rgba(201,162,78,0.42)',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          cursor: 'pointer',
          opacity: opening ? 0.7 : 1,
          minWidth: 260,
        }}
      >
        {opening ? 'Opening App Store…' : 'Update now  →'}
      </button>
      <p
        style={{
          fontSize: 11.5,
          color: 'rgba(60,52,32,0.45)',
          marginTop: 22,
          marginBottom: 0,
          letterSpacing: '0.03em',
        }}
      >
        You have v{BUNDLE_VERSION}{minIos ? ` · latest v${minIos}` : ''}
      </p>

      <style>{`
        @keyframes updGateIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes updGateFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }
      `}</style>
    </div>
  );
}
