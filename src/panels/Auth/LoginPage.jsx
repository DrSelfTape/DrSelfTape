import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../redux/features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { getFirstRouteByRole } from "../../routes/routeHelpers";
import { setAuthToken } from "../../redux/http";
import { warn as hapticWarn } from "../../utils/haptics";
import AppleSignInButton from "../../components/Auth/AppleSignInButton";
import { Capacitor } from "@capacitor/core";

const COOLDOWN_AFTER = 5;
const COOLDOWN_SECONDS = 30;

const ACCENT = "#D4A85F";
// DEEP was #7A5A18 — too washed-out over the bright aurora background. Darkened
// for legibility of eyebrow text, forgot-password / signup links, and error copy.
const DEEP = "#4A3208";
const BG = "#FAFAF7";
const TEXT = "#0E0D0A";
const SUB = "rgba(14,13,10,0.6)";
const DIM = "rgba(14,13,10,0.4)";

const BG_VIDEO = `${import.meta.env.BASE_URL}login-bg.mp4`;

function EyeIcon({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={DIM} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
      ) : (
        <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
      )}
    </svg>
  );
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading: authLoading } = useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const passwordRef = useRef(null);
  const videoRef = useRef(null);
  const cardRef = useRef(null);

  // On iOS Capacitor + Keyboard.resize="native" the WebView shrinks above the
  // keyboard but the marketing copy still claims the upper half — leaving the
  // glass auth card pinned below the keyboard. Force-scroll the card to the
  // top of the visible WebView when any input focuses.
  const scrollCardIntoView = useCallback(() => {
    // Defer to next frame so the WKWebView keyboard reflow lands first.
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // Respect prefers-reduced-motion: skip the video background entirely so we
  // don't burn battery or trigger vestibular issues.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Some iOS browsers refuse autoplay until the element is in the DOM and
  // muted attributes are confirmed. Kick play() defensively.
  useEffect(() => {
    if (reducedMotion) return;
    const v = videoRef.current;
    if (!v) return;
    v.play?.().catch(() => {});
  }, [reducedMotion]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = setInterval(() => setCooldownLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldownLeft]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (cooldownLeft > 0) return;
    if (!email || !password) { setError("Please enter your email and password"); return; }
    setError("");
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      const token = result.payload?.token?.access || result.payload?.token;
      if (token) setAuthToken(token);
      const role = result.payload?.active_role || result.payload?.role || 'actor';
      navigate(getFirstRouteByRole(role));
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      setError(result.payload || "Email and password don't match. Try again.");
      setPassword("");
      hapticWarn();
      setTimeout(() => passwordRef.current?.focus(), 0);
      if (nextAttempts >= COOLDOWN_AFTER) setCooldownLeft(COOLDOWN_SECONDS);
    }
  }, [email, password, dispatch, navigate, failedAttempts, cooldownLeft]);

  const checkCapsLock = useCallback((e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  }, []);

  // iOS 26 WKWebView leaves this scroll container scrolled after the keyboard
  // dismisses, parking the logo under the Dynamic Island (screenshot-reported
  // 2026-07-02). Restore the resting position once nothing is focused —
  // keyboardDidHide on native, focusout as the web fallback.
  const scrollRef = useRef(null);
  useEffect(() => {
    const restore = () => {
      setTimeout(() => {
        const el = document.activeElement;
        const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
        if (!typing) scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 80);
    };
    let sub;
    (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { Keyboard } = await import('@capacitor/keyboard');
          sub = await Keyboard.addListener('keyboardDidHide', restore);
        }
      } catch { /* plugin unavailable — the focusout fallback still applies */ }
    })();
    const node = scrollRef.current;
    node?.addEventListener('focusout', restore);
    return () => {
      try { sub?.remove(); } catch { /* noop */ }
      node?.removeEventListener('focusout', restore);
    };
  }, []);

  return (
    <div style={{
      // 100dvh shrinks with the iOS virtual keyboard so the Sign In button
      // stays reachable when the password field is focused.
      minHeight: "100dvh", position: "relative", overflow: "hidden",
      background: "#0E0D0A", color: TEXT,
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
    }}>
      {/* Fonts (Space Grotesk / JetBrains Mono / Instrument Serif) come from
          the consolidated index.html pipeline — no per-page injection. */}
      {/* Washed-out video background. Hidden under prefers-reduced-motion;
          the wash gradient below still renders, so the screen never looks bare. */}
      {!reducedMotion && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0E0D0A" }}>
          <video
            ref={videoRef}
            src={BG_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover",
              filter: "saturate(0.65) brightness(1.06) contrast(0.92)",
              opacity: 0.42,
            }}
          />
        </div>
      )}

      {/* Aurora wash — always renders, regardless of video presence. */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `
          linear-gradient(180deg, rgba(250,250,247,0.55) 0%, rgba(250,250,247,0.30) 32%, rgba(250,250,247,0.62) 70%, rgba(250,250,247,0.96) 100%),
          radial-gradient(70% 45% at 80% 12%, rgba(212,168,95,0.30) 0%, transparent 55%),
          radial-gradient(60% 40% at 0% 38%, rgba(167,214,255,0.30) 0%, transparent 55%),
          radial-gradient(60% 45% at 60% 90%, rgba(159,230,180,0.28) 0%, transparent 55%)
        `,
      }} />

      {/* Fine grain texture for tactility. */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        opacity: 0.4, mixBlendMode: "soft-light",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* Content layer */}
      <div ref={scrollRef} style={{
        position: "relative", zIndex: 10,
        minHeight: "100dvh",
        display: "flex", flexDirection: "column",
        padding: "max(96px, env(safe-area-inset-top, 24px) + 80px) 24px max(40px, env(safe-area-inset-bottom, 24px)) 24px",
        maxWidth: 460, margin: "0 auto",
        // Allow vertical scroll when the keyboard pushes the form upward —
        // otherwise Password + Sign In button get pinned under the keyboard.
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {/* Full Dr Self Tape logo — the mark already contains the wordmark, so
            we drop the previous tiny mark + "DR · SELF · TAPE" text row. */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img
            src={`${import.meta.env.BASE_URL}logo-black.png`}
            alt="Dr Self Tape"
            style={{
              width: "min(180px, 44vw)", height: "auto", display: "block",
              filter: "drop-shadow(0 6px 16px rgba(10,10,10,0.12))",
            }}
          />
        </div>

        {/* Hero text + auth card pinned to the bottom of the viewport */}
        <div style={{ marginTop: "auto" }}>
          <div style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: DEEP,
          }}>FOR ACTORS WHO BOOK</div>

          <h1 style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "clamp(40px, 11vw, 52px)", lineHeight: 0.98, letterSpacing: "-1px",
            color: TEXT, margin: "14px 0 0", fontWeight: 500,
          }}>
            Your craft,<br /><em>in motion.</em>
          </h1>

          <p style={{
            fontSize: 14, color: SUB, lineHeight: 1.5, marginTop: 16, maxWidth: 300,
          }}>
            Track auditions, run sides with verified readers, and get AI notes on every take.
          </p>

          {/* Glass auth card */}
          <div ref={cardRef} style={{
            marginTop: 26, borderRadius: 26, padding: 20, position: "relative", overflow: "hidden",
            scrollMarginTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
            background: "linear-gradient(160deg, rgba(255,255,255,0.78), rgba(255,255,255,0.58))",
            backdropFilter: "blur(30px) saturate(1.6)",
            WebkitBackdropFilter: "blur(30px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 1px 2px rgba(10,10,10,0.05), 0 18px 44px rgba(122,90,24,0.10)",
          }}>
            <form onSubmit={handleSubmit}>
              {/* Email field */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.6)", border: "1px solid rgba(10,10,10,0.08)",
                borderRadius: 14, padding: "13px 14px", marginBottom: 10,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DIM} strokeWidth="1.7" style={{ flexShrink: 0 }}>
                  <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={scrollCardIntoView}
                  placeholder="Email address"
                  autoComplete="email"
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: TEXT }}
                />
              </div>

              {/* Password field */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.6)", border: "1px solid rgba(10,10,10,0.08)",
                borderRadius: 14, padding: "13px 14px", marginBottom: capsLockOn ? 4 : 10,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DIM} strokeWidth="1.7" style={{ flexShrink: 0 }}>
                  <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  ref={passwordRef}
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={scrollCardIntoView}
                  onKeyDown={checkCapsLock}
                  onKeyUp={checkCapsLock}
                  placeholder="Password"
                  autoComplete="current-password"
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: TEXT }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>

              {capsLockOn && (
                <p style={{ margin: "0 0 10px 4px", fontSize: 11, color: "#B26F00", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 13 }}>⇧</span> Caps Lock is on
                </p>
              )}

              {/* Forgot password — right-aligned, just above the CTA */}
              <div style={{ textAlign: "right", marginBottom: 12 }}>
                <a href="/forgot-password" className="aurora-link" style={{ fontSize: 12, color: DEEP, fontWeight: 600, textDecoration: "none" }}>
                  Forgot password?
                </a>
              </div>

              {error && (
                <div style={{
                  background: `${ACCENT}1A`, border: `1px solid ${ACCENT}40`,
                  borderRadius: 12, padding: "10px 14px", marginBottom: 12,
                  fontSize: 13, color: DEEP,
                }}>
                  {error}
                  {failedAttempts >= 2 && cooldownLeft === 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${ACCENT}40`, fontSize: 12 }}>
                      Trouble signing in?{" "}
                      <a href="/forgot-password" style={{ color: DEEP, fontWeight: 600, textDecoration: "underline" }}>
                        Reset your password →
                      </a>
                    </div>
                  )}
                  {cooldownLeft > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${ACCENT}40`, fontSize: 12 }}>
                      Too many attempts. Try again in {cooldownLeft}s, or{" "}
                      <a href="/forgot-password" style={{ color: DEEP, fontWeight: 600, textDecoration: "underline" }}>
                        reset your password
                      </a>.
                    </div>
                  )}
                </div>
              )}

              {/* Gold CTA with animated sheen */}
              <button
                type="submit"
                disabled={authLoading || cooldownLeft > 0}
                className="login-cta"
                style={{
                  width: "100%", padding: 15, border: "none", borderRadius: 100,
                  cursor: cooldownLeft > 0 ? "not-allowed" : "pointer",
                  position: "relative", overflow: "hidden",
                  background: (authLoading || cooldownLeft > 0)
                    ? `${ACCENT}80`
                    : "linear-gradient(135deg, #C99A4E 0%, #D4A85F 45%, #F0D097 100%)",
                  color: "#1A1408", fontFamily: "inherit", fontSize: 15, fontWeight: 600, letterSpacing: "-0.2px", marginTop: 4,
                  boxShadow: "0 2px 4px rgba(122,90,24,0.25), 0 14px 30px rgba(212,168,95,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 0 0 1px rgba(212,168,95,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {authLoading && (
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: "2px solid rgba(26,20,8,0.3)", borderTopColor: "#1A1408",
                    animation: "drst-spin 0.7s linear infinite", display: "inline-block",
                  }} />
                )}
                {authLoading ? "Signing in…" : cooldownLeft > 0 ? `Wait ${cooldownLeft}s` : "Sign in →"}
              </button>

              {/* Create Account — fresh installs land here, so signup gets a
                  primary-weight CTA right beside Sign In instead of a 13px
                  footer link. Anchor (not react-router navigate) — same
                  navigation path the old footer link used, which works in
                  the Capacitor shell. */}
              <a
                href="/signup"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "100%", padding: 15, borderRadius: 100, marginTop: 10,
                  background: "rgba(26,20,8,0.92)", color: "#F0D097",
                  fontFamily: "inherit", fontSize: 15, fontWeight: 600, letterSpacing: "-0.2px",
                  textDecoration: "none", cursor: "pointer",
                  boxShadow: "0 10px 26px rgba(20,16,8,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                }}
              >
                New here? Create an account →
              </a>

              {/* Divider + Apple Sign In — hidden on Android (no SiwA there) */}
              {Capacitor.getPlatform() !== 'android' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: DIM, letterSpacing: '0.15em',
                    }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
                  </div>

                  <AppleSignInButton onError={(msg) => setError(msg)} />
                </>
              )}

            </form>
          </div>

          {/* Legal foot — matches the EULA path enforced by App Store guidelines */}
          <div style={{
            textAlign: "center", marginTop: 18,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 9, letterSpacing: "0.08em", color: DIM, lineHeight: 1.6,
          }}>
            BY CONTINUING YOU AGREE TO OUR{" "}
            <a href="/terms" style={{ color: DIM, textDecoration: "underline" }}>TERMS</a>{" "}&{" "}
            <a href="/privacy" style={{ color: DIM, textDecoration: "underline" }}>PRIVACY POLICY</a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drst-spin { to { transform: rotate(360deg); } }
        @keyframes drst-sheen {
          0% { transform: translateX(-120%) rotate(8deg); }
          100% { transform: translateX(240%) rotate(8deg); }
        }
        .login-cta::after {
          content: '';
          position: absolute;
          top: -40%;
          left: 0;
          width: 55%;
          height: 180%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent);
          transform: translateX(-120%) rotate(8deg);
          animation: drst-sheen 5.5s ease-in-out infinite 1s;
          pointer-events: none;
        }
        input::placeholder { color: ${DIM}; }
      `}</style>
    </div>
  );
}
