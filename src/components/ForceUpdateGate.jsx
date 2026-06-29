import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import axiosInstance from '../redux/http';
import { openExternal } from '../utils/openExternal';

const APP_STORE_URL = 'itms-apps://itunes.apple.com/app/id6770320460';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.drselftape.app';
const VERSION_ENDPOINT = '/v1/notifications/system/latest-version/';
// Web fallback only. On native we read the TRUE installed binary version at
// runtime via CapApp.getInfo() (the iOS MARKETING_VERSION / Android
// versionName) so a missed native bump can never silently fail-open the gate.
// Web users auto-update via Vercel, so the gate never fires there anyway.
const WEB_BUNDLE_VERSION = '1.0.8';

// Practice builds (compiled with VITE_FORCE_UPDATE_TEST_CHANNEL=true) read the
// TEST gate field (min_ios_test / min_android_test) so we can rehearse the
// force-update flow without ever touching production users, who read min_ios.
const TEST_CHANNEL = import.meta.env.VITE_FORCE_UPDATE_TEST_CHANNEL === 'true';

// The right store per platform — itms-apps:// is dead on Android and the Play
// https link is wrong on iOS, so the "Update now" CTA must choose by platform.
function storeUrl() {
  return Capacitor.getPlatform() === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
}

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
 * installed binary version is below the BE's reported min_ios. Renders children
 * normally when the gate is clear (the common case).
 *
 * Only fires on native iOS — web users auto-update via Vercel, no install
 * step to gate behind.
 *
 * Fail-open: if the version fetch errors out, render children. A network
 * blip should never lock everyone out.
 */
export default function ForceUpdateGate({ children }) {
  const [minVersion, setMinVersion] = useState(null);
  const [bundleVersion, setBundleVersion] = useState(WEB_BUNDLE_VERSION);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    // Source the REAL installed binary version on native (MARKETING_VERSION /
    // versionName). Fail-open to the web fallback if getInfo errors.
    if (Capacitor.isNativePlatform()) {
      CapApp.getInfo()
        .then((info) => { if (info?.version) setBundleVersion(info.version); })
        .catch(() => { /* keep WEB_BUNDLE_VERSION fallback */ });
    }
  }, []);

  useEffect(() => {
    // Native only (web auto-updates via Vercel). Use the CURRENT platform's
    // min version — min_ios on iOS, min_android on Android — both fail-open:
    // the BE defaults them to 0.0.0, so this modal never traps anyone until
    // we explicitly set the env var. The CTA links to the correct store.
    const platform = Capacitor.getPlatform();
    if (platform !== 'ios' && platform !== 'android') return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get(VERSION_ENDPOINT);
        const min = platform === 'android'
          ? (TEST_CHANNEL ? data?.min_android_test : data?.min_android)
          : (TEST_CHANNEL ? data?.min_ios_test : data?.min_ios);
        if (!cancelled && min) setMinVersion(min);
      } catch { /* fail open — don't lock users out on a network blip */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const blocked = !!(minVersion && versionLt(bundleVersion, minVersion));

  if (!blocked) return children;

  const handleUpdate = () => {
    if (opening) return;
    setOpening(true);
    openExternal(storeUrl());
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
      {/* animated mascot in a soft floating card (poster = static fallback) */}
      <div
        style={{
          width: 184,
          height: 245,
          background: '#FBF6EC',
          borderRadius: 28,
          marginBottom: 30,
          overflow: 'hidden',
          boxShadow: '0 18px 50px rgba(150,116,40,0.20)',
          animation: 'updGateFloat 4s ease-in-out infinite',
        }}
      >
        <video
          src="/mascot-update.mp4"
          poster="/mascot-update.jpg"
          autoPlay
          muted
          loop
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
        {TEST_CHANNEL ? 'Update required · 🧪 test channel' : 'Update required'}
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
        This version of Dr Self Tape is no longer supported. Update to the latest
        to keep using your studio.
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
        {opening ? `Opening ${Capacitor.getPlatform() === 'android' ? 'Play Store' : 'App Store'}…` : 'Update now  →'}
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
        You have v{bundleVersion}{minVersion ? ` · required v${minVersion}` : ''}
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
