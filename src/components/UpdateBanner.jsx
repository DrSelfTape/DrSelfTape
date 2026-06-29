import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import axiosInstance from "../redux/http";
import { openExternal } from "../utils/openExternal";
import { trackEvent } from "../utils/analytics";

const APP_STORE_URL = "itms-apps://itunes.apple.com/app/id6770320460";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.drselftape.app";

// The right store per platform — itms-apps:// is dead on Android.
function storeUrl() {
  return Capacitor.getPlatform() === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
}

// Web fallback only. On native we read the TRUE installed binary version at
// runtime via CapApp.getInfo() (the iOS MARKETING_VERSION / Android
// versionName), so a missed native bump can never silently fail-open the
// banner. The banner only fires when the BE-reported live version is GREATER
// than the installed version.
const WEB_BUNDLE_VERSION = "1.0.11";

const LS_DISMISSED = "updateBannerDismissed";
const VERSION_ENDPOINT = "/v1/notifications/system/latest-version/";

function versionGt(a, b) {
  const pa = String(a || "0").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b || "0").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const ai = pa[i] || 0;
    const bi = pb[i] || 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return false;
}

export default function UpdateBanner() {
  const [latest, setLatest] = useState(null);
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
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get(VERSION_ENDPOINT);
        // Read the live version for THIS platform (ios / android).
        const reported = Capacitor.getPlatform() === 'android' ? data?.android : data?.ios;
        if (!cancelled && reported) setLatest(reported);
      } catch { /* network down — banner stays hidden */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Native only — links to the right store per platform. Web auto-updates via
  // Vercel, so no nag there.
  if (!Capacitor.isNativePlatform()) return null;
  if (!latest) return null;
  if (!versionGt(latest, bundleVersion)) return null;

  let dismissedFor = null;
  try { dismissedFor = localStorage.getItem(LS_DISMISSED); } catch { /* storage unavailable */ }
  if (dismissedFor === latest) return null;

  const handleUpdate = () => {
    if (opening) return;
    setOpening(true);
    trackEvent("update_banner_tapped", { from: bundleVersion, to: latest });
    openExternal(storeUrl());
  };

  const handleDismiss = () => {
    trackEvent("update_banner_dismissed", { from: bundleVersion, to: latest });
    try { localStorage.setItem(LS_DISMISSED, latest); } catch { /* storage unavailable */ }
    setLatest(null);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "linear-gradient(90deg, #5ee6b8 0%, #A7ECDA 100%)",
        color: "#0a1a14",
        padding: "10px 14px 10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 2px 14px rgba(0,0,0,0.25)",
        paddingTop: "calc(10px + env(safe-area-inset-top))",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Space Grotesk', 'Poppins', sans-serif",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>
          Dr Self Tape {latest} is live
        </div>
        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.3, marginTop: 2 }}>
          Tap to update from the App Store.
        </div>
      </div>
      <button
        type="button"
        onClick={handleUpdate}
        disabled={opening}
        style={{
          background: "#0a1a14",
          color: "#5ee6b8",
          border: "none",
          borderRadius: 8,
          padding: "8px 14px",
          fontWeight: 700,
          fontSize: 13,
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          cursor: "pointer",
          opacity: opening ? 0.6 : 1,
        }}
      >
        Update
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={handleDismiss}
        style={{
          background: "transparent",
          color: "#0a1a14",
          border: "none",
          fontSize: 20,
          lineHeight: 1,
          padding: "4px 6px",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          cursor: "pointer",
          opacity: 0.6,
        }}
      >
        ×
      </button>
    </div>
  );
}
