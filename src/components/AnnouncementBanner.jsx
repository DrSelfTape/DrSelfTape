import { useEffect, useState } from "react";
import { X } from "lucide-react";
import axiosInstance from "../redux/http";
import { openExternal } from "../utils/openExternal";

/**
 * Server-controlled in-app banner. Fetches the current live announcement on
 * boot and shows a dismissible bar to EVERY user, any platform, no push token
 * needed. Set/clear it server-side with the set_announcement / clear_announcement
 * management commands. Dismissal is per-announcement (a new id shows again even
 * if a previous one was dismissed).
 */
const ENDPOINT = "/v1/notifications/system/announcement/";
const LS_DISMISSED = "announcementDismissedId";
// Internal CTA destinations a banner may deep-link to. Anything not in here
// (typos, drst:// schemes, javascript:, unknown tabs) is IGNORED so a bad CTA
// can never navigate the app to a blank screen.
const INTERNAL_TABS = new Set([
  "home", "auditions", "scenes", "connect", "tape-review", "profile", "more", "live",
]);

export default function AnnouncementBanner() {
  const [ann, setAnn] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get(ENDPOINT, { timeout: 8000 });
        const a = data?.announcement || data?.data?.announcement || null;
        if (cancelled || !a || !a.id) return;
        let dismissed = null;
        try { dismissed = localStorage.getItem(LS_DISMISSED); } catch { /* private mode */ }
        if (String(dismissed) === String(a.id)) return; // already dismissed THIS one
        setAnn(a);
      } catch { /* endpoint down or offline: just don't show a banner */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ann) return null;

  const dismiss = () => {
    try { localStorage.setItem(LS_DISMISSED, String(ann.id)); } catch { /* private mode */ }
    setAnn(null);
  };

  const onCta = () => {
    const url = (ann.cta_url || "").trim();
    if (!url) return;
    if (/^https:\/\//i.test(url)) {
      // External: HTTPS only. Blocks http://, javascript:, and other schemes.
      openExternal(url);
      dismiss();
    } else if (INTERNAL_TABS.has(url)) {
      window.dispatchEvent(new CustomEvent("drst-navigate", { detail: { tab: url } }));
      dismiss();
    }
    // Unknown/unsafe destination: do nothing (never navigate to a blank screen),
    // leave the banner up.
  };

  return (
    <div className="dst-banner-in" style={{
      margin: "4px 12px 12px",
      background: "linear-gradient(135deg, #FFF7E6, #FCEFCf)",
      border: "1px solid rgba(212,168,95,0.55)", borderRadius: 16,
      boxShadow: "0 8px 22px rgba(122,90,24,0.18)",
      padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{ fontSize: 18, lineHeight: "20px", flex: "0 0 auto" }}>🎬</span>
      <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 14, color: "#2A2115" }}>{ann.title}</div>
        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 12.5, color: "#6B5B3E", marginTop: 2, lineHeight: 1.4 }}>{ann.body}</div>
        {ann.cta_label && ann.cta_url ? (
          <button onClick={onCta} style={{
            marginTop: 9, padding: "7px 14px", borderRadius: 100, border: "none", cursor: "pointer",
            background: "#2A2115", color: "#FFF7E6", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 12.5,
            WebkitTapHighlightColor: "transparent",
          }}>{ann.cta_label}</button>
        ) : null}
      </div>
      <button onClick={dismiss} aria-label="Dismiss" style={{
        flex: "0 0 auto", display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: 100,
        border: "none", background: "transparent", cursor: "pointer", WebkitTapHighlightColor: "transparent",
      }}>
        <X size={15} color="#8A7A55" />
      </button>
    </div>
  );
}
