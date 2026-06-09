import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import axiosInstance from "../redux/http";
import { openExternal } from "../utils/openExternal";
import { trackEvent } from "../utils/analytics";

const APP_STORE_URL = "itms-apps://itunes.apple.com/app/id6770320460";

// The marketing version baked into THIS FE bundle. Bump in lockstep with the
// iOS pbxproj MARKETING_VERSION every time we ship a new build. The banner
// only fires when the BE-reported live version is GREATER than this constant,
// so users on the latest bundle never see a stale "update" nag.
const BUNDLE_VERSION = "1.0.5";

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
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get(VERSION_ENDPOINT);
        const reported = data?.ios;
        if (!cancelled && reported) setLatest(reported);
      } catch { /* network down — banner stays hidden */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // iOS-only — links to the App Store (itms-apps://). Web auto-updates via
  // Vercel; Android has no update channel yet, so don't show a dead CTA.
  if (Capacitor.getPlatform() !== 'ios') return null;
  if (!latest) return null;
  if (!versionGt(latest, BUNDLE_VERSION)) return null;

  let dismissedFor = null;
  try { dismissedFor = localStorage.getItem(LS_DISMISSED); } catch { /* storage unavailable */ }
  if (dismissedFor === latest) return null;

  const handleUpdate = () => {
    if (opening) return;
    setOpening(true);
    trackEvent("update_banner_tapped", { from: BUNDLE_VERSION, to: latest });
    openExternal(APP_STORE_URL);
  };

  const handleDismiss = () => {
    trackEvent("update_banner_dismissed", { from: BUNDLE_VERSION, to: latest });
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
