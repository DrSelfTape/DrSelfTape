import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../redux/features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { getFirstRouteByRole } from "../../routes/routeHelpers";
import { loginLogo } from "../../assets/images";
import { setAuthToken } from "../../redux/http";

const COOLDOWN_AFTER = 5;
const COOLDOWN_SECONDS = 30;

const MINT = "#D4A85F";
const GOLD = "#F0D097";
const CORAL_SOFT = "#F0D097";
const CORAL = "#D4A85F";
const BG = "#FAFAF7";
const BG_CARD = "#FFFFFF";
const BG_INPUT = "#FFFFFF";
const BORDER = "rgba(10,10,10,0.08)";
const TEXT = "#0A0A0A";
const TEXT2 = "rgba(10,10,10,0.72)"; // body subtle — bumped from 0.62 for WCAG AA
const TEXT3 = "rgba(10,10,10,0.55)"; // placeholders/footnotes — bumped from 0.40 for WCAG AA

const LOGO_SRC = loginLogo;

function EyeIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {open ? (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>) : (<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>)}
    </svg>
  );
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading: authLoading, error: authError } = useSelector((state) => state.auth);
  const [phase, setPhase] = useState("dark");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const passwordRef = useRef(null);

  // Tick down the cooldown timer
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = setInterval(() => {
      setCooldownLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownLeft]);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase("logo-in"), 400),
      setTimeout(() => setPhase("logo-glow"), 1200),
      setTimeout(() => setPhase("tagline"), 2100),
      setTimeout(() => setPhase("bar"), 3000),
      setTimeout(() => setPhase("exit"), 4000),
      setTimeout(() => setPhase("form"), 4600),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const skip = useCallback(() => {
    if (phase === "form") return;
    setPhase("exit");
    setTimeout(() => setPhase("form"), 600);
  }, [phase]);

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
      // Re-focus the password field so retry is one keystroke away
      setTimeout(() => passwordRef.current?.focus(), 0);
      if (nextAttempts >= COOLDOWN_AFTER) {
        setCooldownLeft(COOLDOWN_SECONDS);
      }
    }
  }, [email, password, dispatch, navigate, failedAttempts, cooldownLeft]);

  // Caps Lock detection on the password input
  const checkCapsLock = useCallback((e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  }, []);

  const showForm = phase === "form";
  const isExit = phase === "exit";
  const glowPhases = phase === "logo-glow" || phase === "tagline" || phase === "bar";
  const textPhases = phase === "tagline" || phase === "bar";

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Poppins', sans-serif", color: TEXT, overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet" />

      {/* ═══════════ SPLASH ═══════════ */}
      <div onClick={skip} style={{
        position: "fixed", inset: 0, zIndex: 50, background: "#FAFAF7",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        transform: isExit ? "scale(1.12)" : "scale(1)",
        opacity: isExit ? 0 : showForm ? 0 : 1,
        transition: "transform 0.7s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.6s ease",
        pointerEvents: showForm ? "none" : "auto",
        cursor: phase !== "dark" ? "pointer" : "default",
      }}>
        {/* Ambient light orbs */}
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: `radial-gradient(circle, ${MINT}0e 0%, transparent 70%)`,
          opacity: glowPhases ? 1 : 0,
          transition: "opacity 1.5s ease", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 280, height: 280, borderRadius: "50%",
          background: `radial-gradient(circle, ${CORAL}0a 0%, transparent 70%)`,
          transform: "translate(80px, 60px)",
          opacity: textPhases ? 1 : 0,
          transition: "opacity 1.2s ease 0.2s", pointerEvents: "none",
        }} />

        {/* ACTUAL LOGO IMAGE */}
        <img
          src={LOGO_SRC}
          alt="Dr Self Tape"
          draggable={false}
          style={{
            width: 180, height: "auto", userSelect: "none",
            opacity: phase === "dark" ? 0 : 1,
            transform: phase === "dark" ? "scale(0.6) translateY(30px)" :
                       phase === "logo-in" ? "scale(1) translateY(0)" : "scale(1.03) translateY(0)",
            transition: "all 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
            filter: glowPhases
              ? `drop-shadow(0 0 40px ${MINT}40) drop-shadow(0 0 80px ${CORAL}20)`
              : "none",
          }}
        />

        {/* Tagline */}
        <p style={{
          fontSize: 14, color: TEXT2, marginTop: 28,
          fontFamily: "'Playfair Display', serif", fontStyle: "italic", letterSpacing: "0.5px",
          opacity: textPhases ? 1 : 0,
          transform: textPhases ? "translateY(0)" : "translateY(14px)",
          transition: "all 0.7s ease",
        }}>
          Empowering Actors, One Take at a Time
        </p>

        {/* Brand gradient bar */}
        <div style={{
          height: 2.5, borderRadius: 2, marginTop: 20,
          background: `linear-gradient(90deg, ${MINT}, ${GOLD}, ${CORAL_SOFT}, ${CORAL})`,
          width: phase === "bar" ? 240 : 0,
          transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }} />

        <p style={{
          position: "absolute", bottom: 44, fontSize: 11, color: TEXT3,
          opacity: phase === "bar" ? 0.5 : 0, transition: "opacity 0.4s ease",
        }}>tap to continue</p>
      </div>

      {/* ═══════════ LOGIN FORM ═══════════ */}
      <div style={{
        minHeight: "100vh", background: BG,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px 20px",
        opacity: showForm ? 1 : 0, transition: "opacity 0.5s ease 0.1s",
      }}>
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 500px 350px at 15% 85%, ${MINT}06, transparent), radial-gradient(ellipse 400px 400px at 85% 15%, ${CORAL}05, transparent)`,
        }} />

        {/* Small logo above form */}
        <img
          src={LOGO_SRC}
          alt="Dr Self Tape"
          draggable={false}
          style={{
            width: 90, height: "auto", marginBottom: 28,
            position: "relative", zIndex: 1, userSelect: "none",
            opacity: showForm ? 1 : 0, transform: showForm ? "scale(1)" : "scale(0.85)",
            transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s",
          }}
        />

        {/* Card */}
        <div style={{
          width: "100%", maxWidth: 400, position: "relative", zIndex: 1,
          background: BG_CARD, borderRadius: 24, border: `1px solid ${BORDER}`, padding: "36px 28px 28px",
          opacity: showForm ? 1 : 0, transform: showForm ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.6s ease 0.4s",
        }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif", textAlign: "center", letterSpacing: "-0.6px" }}>
            Hello Again
          </h1>
          <p style={{ fontSize: 13, color: TEXT2, margin: "0 0 28px", textAlign: "center" }}>
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: TEXT2, marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="demo@drselftape.com"
                style={{ width: "100%", height: 52, background: BG_INPUT, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0 16px", color: TEXT, fontSize: 14, outline: "none", transition: "border-color 0.2s, box-shadow 0.2s" }}
                onFocus={(e) => { e.target.style.borderColor = "#D4A85F"; e.target.style.boxShadow = "0 0 0 3px rgba(212,168,95,0.20)"; }} onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = "none"; }} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: TEXT2, marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input ref={passwordRef} type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={checkCapsLock} onKeyUp={checkCapsLock} placeholder="Enter your password"
                  style={{ width: "100%", height: 52, background: BG_INPUT, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0 16px", paddingRight: 48, color: TEXT, fontSize: 14, outline: "none", transition: "border-color 0.2s, box-shadow 0.2s" }}
                  onFocus={(e) => { e.target.style.borderColor = "#D4A85F"; e.target.style.boxShadow = "0 0 0 3px rgba(212,168,95,0.20)"; }} onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = "none"; }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <EyeIcon open={showPw} />
                </button>
              </div>
              {capsLockOn && (
                <p style={{ marginTop: 6, fontSize: 11, color: "#B26F00", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 13 }}>⇧</span> Caps Lock is on
                </p>
              )}
            </div>

            <div style={{ textAlign: "right", marginBottom: 24 }}>
              <a href="/forgot-password" style={{ fontSize: 12, color: CORAL, textDecoration: "none", fontWeight: 500 }}>Forgot password?</a>
            </div>

            {error && (
              <div style={{ background: `${CORAL}12`, border: `1px solid ${CORAL}25`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: CORAL }}>
                {error}
                {failedAttempts >= 2 && cooldownLeft === 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${CORAL}25`, fontSize: 12 }}>
                    Trouble signing in?{" "}
                    <a href="/forgot-password" style={{ color: CORAL, fontWeight: 600, textDecoration: "underline" }}>Reset your password →</a>
                  </div>
                )}
                {cooldownLeft > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${CORAL}25`, fontSize: 12 }}>
                    Too many attempts. Try again in {cooldownLeft}s, or{" "}
                    <a href="/forgot-password" style={{ color: CORAL, fontWeight: 600, textDecoration: "underline" }}>reset your password</a>.
                  </div>
                )}
              </div>
            )}

            <button type="submit" disabled={authLoading || cooldownLeft > 0} style={{
              width: "100%", height: 52, padding: 0, borderRadius: 28, border: "none", cursor: cooldownLeft > 0 ? "not-allowed" : "pointer",
              background: (authLoading || cooldownLeft > 0) ? "#D4A85F60" : "linear-gradient(135deg, #D4A85F, #7A5A18)",
              color: "#fff", fontSize: 15, fontWeight: 600, transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 8px 22px rgba(212,168,95,0.30)",
            }}>
              {authLoading && <div style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
              {authLoading ? "Signing in..." : cooldownLeft > 0 ? `Wait ${cooldownLeft}s` : "Sign in"}
            </button>
          </form>


        </div>

        <p style={{ marginTop: 24, fontSize: 13, color: TEXT2, position: "relative", zIndex: 1, opacity: showForm ? 1 : 0, transition: "opacity 0.5s ease 0.7s" }}>
          Don't have account?{" "}<a href="/signup" style={{ color: "#7A5A18", textDecoration: "none", fontWeight: 700 }}>Sign Up</a>
        </p>

        <p style={{ marginTop: 16, fontSize: 11, color: TEXT3, position: "relative", zIndex: 1, opacity: showForm ? 1 : 0, transition: "opacity 0.5s ease 0.9s" }}>
          <a href="/terms" style={{ color: TEXT3, textDecoration: "underline" }}>Terms</a>
          {" · "}
          <a href="/privacy" style={{ color: TEXT3, textDecoration: "underline" }}>Privacy</a>
        </p>

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${MINT}, ${GOLD}, ${CORAL_SOFT}, ${CORAL})`, opacity: showForm ? 1 : 0, transition: "opacity 0.5s ease 0.8s" }} />
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; }
        input::placeholder { color: ${TEXT3}; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
