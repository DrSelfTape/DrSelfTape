/**
 * Slate — the in-app AI copilot. Built to the design handoff spec (Aurora tokens,
 * exact motion). A gold FAB opens a full-screen chat console that can minimize to
 * a dock pill (conversation preserved) or close (resets). Text + push-to-talk
 * voice, quick-reply chips, typing indicator, and inline action cards that
 * deep-link into the app. Brain: POST /v1/ai/slate/chat → {reply, chips, card}.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, X, ChevronDown, ChevronUp, Plus, Check, MessageCircle, BadgeCheck } from 'lucide-react';
import axiosInstance from '../../redux/http';
import { baseURL } from '../../redux/constant';
import { SlateAurora } from '../Aurora/game/Slate';
import { tapSelect, tapPrimary, warn } from '../../utils/haptics';

// ── Design tokens (Aurora — from the Slate handoff) ──────────────────────────
const T = {
  accent: '#D4A85F', goldLight: '#E7BE72', goldMid: '#C99A4E', deep: '#7A5A18',
  text: '#0A0A0A', sub: 'rgba(10,10,10,0.62)', dim: 'rgba(10,10,10,0.40)',
  bg: '#FAFAF7', line: 'rgba(10,10,10,0.06)', surface: 'rgba(255,255,255,0.62)',
  mint: '#9FE6B4', mintText: '#12401F', onGold: '#1A1408', rec: '#E5484D',
};
const GLASS = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.72), rgba(255,255,255,0.52))',
  backdropFilter: 'blur(26px) saturate(1.5)', WebkitBackdropFilter: 'blur(26px) saturate(1.5)',
  border: '1px solid rgba(255,255,255,0.6)', borderRadius: 24,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(212,168,95,0.06), 0 1px 2px rgba(10,10,10,0.04), 0 8px 24px rgba(10,10,10,0.05), 0 24px 48px rgba(122,90,24,0.04)',
};
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SANS = "'Space Grotesk', system-ui, sans-serif";
const SERIF = "'Instrument Serif', serif";

const OPENER = "Hey, I'm Slate. Your take, your audition, your nerves, whatever's in front of you tonight. What are we working on?";
const OPENER_CHIPS = ['Prep an audition', 'Calm my nerves', 'Find me a reader', 'Help with my sides'];

// Keyframes injected once.
const SLATE_CSS = `
@keyframes v1cSheet { from { transform: translateY(9%); opacity:0; } to { transform:none; opacity:1; } }
@keyframes v1cBubble { from { transform: translateY(10px); opacity:0; } to { transform:none; opacity:1; } }
@keyframes v1cChip { from { transform: translateY(6px); opacity:0; } to { transform:none; opacity:1; } }
@keyframes v1cDot { 0%,80%,100% { transform: translateY(0); opacity:.35; } 40% { transform: translateY(-4px); opacity:1; } }
@keyframes v1cDock { from { transform: translateY(20px); opacity:0; } to { transform:none; opacity:1; } }
@keyframes v1cEq  { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
@keyframes v1cRec { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
@keyframes v1AiGlow { 0%,100% { box-shadow: 0 10px 22px #D4A85F66, inset 0 1px 0 rgba(255,255,255,0.55); } 50% { box-shadow: 0 12px 30px #D4A85FAA, inset 0 1px 0 rgba(255,255,255,0.55); } }
@keyframes v1AiRipple { 0% { transform: scale(1); opacity:.5; } 100% { transform: scale(1.9); opacity:0; } }
@keyframes slateBob { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-4px) rotate(1.5deg); } }
@keyframes slateHalo { 0%,100% { opacity:0.5; transform: scale(1); } 50% { opacity:0.85; transform: scale(1.1); } }
@media (prefers-reduced-motion: reduce) { .slate-bob, .slate-halo, .slate-ripple { animation: none !important; } }
.v1-slate-scroll::-webkit-scrollbar { display: none; }
.v1-slate-scroll { scrollbar-width: none; }
`;

function Avatar({ size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 10, overflow: 'hidden', flex: '0 0 auto',
      background: 'linear-gradient(160deg,#FFFDF8,#F1E9D8)', boxShadow: 'inset 0 0 0 1px rgba(212,168,95,0.3)',
      display: 'grid', placeItems: 'center' }}>
      <SlateAurora size={Math.round(size * 0.82)} mood="happy" accent={T.accent} />
    </div>
  );
}

// ── The floating action button (entry point) ─────────────────────────────────
export function SlateFAB({ onOpen }) {
  return (
    <>
      <style>{SLATE_CSS}</style>
      <button
        onClick={() => { tapPrimary(); onOpen(); }}
        aria-label="Ask Slate"
        style={{
          // Include the home-indicator safe area so the button clears the
          // floating tab bar (which is itself inset by env(safe-area-inset-bottom)).
          position: 'absolute', right: 14, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 98px)', zIndex: 29,
          width: 76, height: 76, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Soft gold halo behind the character (breathes) + expanding ripple. */}
        <span className="slate-halo" style={{ position: 'absolute', inset: '2%', borderRadius: 100,
          background: 'radial-gradient(circle, rgba(212,168,95,0.5), transparent 66%)',
          animation: 'slateHalo 3.2s ease-in-out infinite', pointerEvents: 'none' }} />
        <span className="slate-ripple" style={{ position: 'absolute', inset: '14%', borderRadius: 100, border: `2px solid ${T.accent}66`,
          animation: 'v1AiRipple 2.6s ease-out infinite', pointerEvents: 'none' }} />
        <img
          src={`${import.meta.env.BASE_URL}slate-mascot.png`}
          alt=""
          className="slate-bob"
          style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain',
            filter: 'drop-shadow(0 6px 14px rgba(122,90,24,0.42))', animation: 'slateBob 2.8s ease-in-out infinite' }}
        />
      </button>
    </>
  );
}

// ── Action card ──────────────────────────────────────────────────────────────
function ActionCard({ card, onAct }) {
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []); // clear if unmounted mid-animation
  const CARDS = {
    // Honest done labels — these only NAVIGATE, they don't log/award anything.
    log: { eyebrow: 'DRAFT · NEW AUDITION', icon: Plus, label: 'Log this audition', doneLabel: 'Opening tracker…', act: 'log' },
    reader: { eyebrow: (card.tag || 'READER · AVAILABLE'), icon: MessageCircle, label: `Hold a slot with ${(card.name || 'a reader')}`, doneLabel: 'Opening match…', act: 'reader' },
    script: { eyebrow: 'SIDES · READY', icon: Mic, label: 'Open in Studio', doneLabel: 'Opening studio…', act: 'script' },
  };
  const c = CARDS[card.kind];
  if (!c) return null;
  const Icon = c.icon;
  const title = card.kind === 'log' ? (card.title || 'New audition')
    : card.kind === 'reader' ? (card.name || 'A reader')
      : (card.title || 'Your scene');
  const sub = card.kind === 'log' ? [card.role, card.cd].filter(Boolean).join(' · ')
    : card.kind === 'script' ? [card.role, card.tone].filter(Boolean).join(' · ')
      : '';
  const fire = () => {
    if (done) return;
    tapPrimary();
    setDone(true);
    timerRef.current = setTimeout(() => onAct(c.act), 480);
  };
  return (
    <div style={{ ...GLASS, padding: 14, borderRadius: 18, maxWidth: '82%' }}>
      <p style={{ margin: 0, fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.dim }}>{c.eyebrow}</p>
      <p style={{ margin: '6px 0 0', fontFamily: SANS, fontSize: 15, fontWeight: 700, color: T.text }}>{title}</p>
      {sub && <p style={{ margin: '2px 0 0', fontFamily: SANS, fontSize: 12.5, color: T.sub }}>{sub}</p>}
      <button
        onClick={fire}
        style={{
          width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 100, border: 'none', cursor: 'pointer',
          background: done ? T.mint : T.text, color: done ? T.mintText : '#FFFFFF',
          fontFamily: SANS, fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          transition: 'background 0.2s', WebkitTapHighlightColor: 'transparent',
        }}
      >
        {done ? <Check size={16} /> : <Icon size={16} />}
        {done ? c.doneLabel : c.label}
      </button>
    </div>
  );
}

// ── A single message row ─────────────────────────────────────────────────────
function Message({ m, onAct }) {
  if (m.from === 'me') {
    return (
      <div className="v1c-bubble" style={{ display: 'flex', justifyContent: 'flex-end', animation: 'v1cBubble 0.38s cubic-bezier(.2,.7,.3,1) both' }}>
        <div style={{
          maxWidth: m.voice ? '82%' : '78%', padding: m.voice ? '10px 14px' : '11px 15px',
          borderRadius: '18px 18px 6px 18px', background: `linear-gradient(150deg,${T.accent},${T.goldMid})`,
          color: T.onGold, fontWeight: 500, fontFamily: SANS, fontSize: 14, lineHeight: 1.45,
          boxShadow: '0 4px 14px #D4A85F44',
        }}>
          {m.voice ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mic size={16} />
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, flex: 1 }}>
                  {[6, 11, 16, 9, 14, 7, 13, 17, 8, 12, 6, 10, 15, 7].map((h, i) => (
                    <span key={i} style={{ width: 2.5, height: h, borderRadius: 100, background: 'rgba(26,20,8,0.55)' }} />
                  ))}
                </div>
                <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600 }}>{m.dur}</span>
              </div>
              {m.text && <p style={{ margin: '6px 0 0', fontStyle: 'italic', fontSize: 12.5, opacity: 0.85 }}>“{m.text}”</p>}
            </>
          ) : m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="v1c-bubble" style={{ display: 'flex', alignItems: 'flex-end', gap: 8, animation: 'v1cBubble 0.38s cubic-bezier(.2,.7,.3,1) both' }}>
      <Avatar size={30} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '86%' }}>
        {m.text && (
          <div style={{ ...GLASS, padding: '12px 15px', borderRadius: '18px 18px 18px 6px', fontFamily: SANS, fontSize: 14, lineHeight: 1.5, color: T.text }}>
            {m.text}
          </div>
        )}
        {m.card && <ActionCard card={m.card} onAct={onAct} />}
      </div>
    </div>
  );
}

// ── The console ──────────────────────────────────────────────────────────────
export default function SlateCopilot({ minimized, onClose, onMinimize, onExpand, onLogAudition, onFindReader, onOpenScript }) {
  const [msgs, setMsgs] = useState([{ from: 'ai', text: OPENER }]);
  const [chips, setChips] = useState(OPENER_CHIPS);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [secs, setSecs] = useState(0);
  const streamRef = useRef(null);   // scroll container
  const secTimer = useRef(null);
  const mediaRec = useRef(null);
  const micStream = useRef(null);   // most-recent getUserMedia stream (bail-path cleanup)
  const heldRef = useRef(false);    // pointer is down (push-to-talk)
  const recGen = useRef(0);         // record-request generation; bumped per press + on unmount
  const inFlightRef = useRef(false); // a chat request is in flight (sync send-lock)
  const msgsRef = useRef(msgs);     // latest history for the async request (avoids stale closure)
  const [voiceErr, setVoiceErr] = useState('');
  const voiceUnsupported = typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined';
  useEffect(() => { msgsRef.current = msgs; }, [msgs]);
  // Release the mic + timers on unmount, and invalidate any in-flight
  // getUserMedia (bumping recGen + clearing heldRef) so a permission that
  // resolves after unmount never starts a recording.
  useEffect(() => () => {
    recGen.current++;
    heldRef.current = false;
    clearInterval(secTimer.current);
    try { micStream.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
  }, []);

  const scrollDown = useCallback(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => { scrollDown(); }, [msgs, typing, minimized, scrollDown]);

  const lastAi = [...msgs].reverse().find((m) => m.from === 'ai')?.text || '';

  // Send text to Slate's brain.
  const ask = useCallback(async (text, voice = null) => {
    const clean = (text || '').trim();
    if (!clean || inFlightRef.current) return; // sync lock — `typing` state isn't synchronous
    inFlightRef.current = true;
    const userMsg = voice ? { from: 'me', text: clean, voice: true, dur: voice } : { from: 'me', text: clean };
    const history = msgsRef.current.slice(-16).map((m) => ({ from: m.from, text: m.text }));
    setMsgs((s) => [...s, userMsg]);
    setChips([]);
    setTyping(true);
    try {
      const { data } = await axiosInstance.post(`${baseURL}/v1/ai/slate/chat/`, { text: clean, messages: history });
      const d = data?.data ?? data ?? {}; // tolerate the house envelope OR a flat body
      setMsgs((s) => [...s, { from: 'ai', text: d.reply || "I'm here. What's up?", card: d.card || null }]);
      setChips(Array.isArray(d.chips) ? d.chips : []);
    } catch {
      setMsgs((s) => [...s, { from: 'ai', text: 'I lost that one for a second. Say it again?' }]);
    } finally {
      setTyping(false);
      inFlightRef.current = false;
    }
  }, []);

  const onSend = () => { const t = draft.trim(); if (!t || inFlightRef.current) return; setDraft(''); ask(t); };
  const onChip = (c) => { tapSelect(); ask(c); };
  const onAct = (kind) => {
    onClose();
    if (kind === 'log') onLogAudition?.();
    else if (kind === 'reader') onFindReader?.();
    else if (kind === 'script') onOpenScript?.();
  };

  // ── Push-to-talk: record → Whisper transcribe → send ──
  const releaseMic = () => {
    try { micStream.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    micStream.current = null;
  };

  const startRec = async () => {
    const gen = ++recGen.current; // this press supersedes any earlier pending one
    heldRef.current = true;
    setVoiceErr('');
    if (voiceUnsupported) { setVoiceErr('Voice is not available here. Type instead.'); return; }
    if (inFlightRef.current || listening) return;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      if (gen === recGen.current) { heldRef.current = false; warn(); setVoiceErr('Mic access is off. Enable it in Settings, or just type.'); }
      return;
    }
    // Superseded by a newer press, released, or unmounted while the permission
    // prompt was open → discard this stream, never start a hanging recording.
    if (gen !== recGen.current || !heldRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
    micStream.current = stream;
    let mr;
    try { mr = new MediaRecorder(stream); } catch {
      releaseMic(); heldRef.current = false; warn();
      setVoiceErr('Recording is not supported here. Type instead.');
      return;
    }
    mediaRec.current = mr;
    // Chunks live ON the recorder so an earlier take's late onstop can never
    // read (or a newer take clobber) a shared buffer.
    mr._chunks = [];
    mr.ondataavailable = (e) => { if (e.data.size) mr._chunks.push(e.data); };
    try { mr.start(); } catch {
      releaseMic(); mediaRec.current = null; heldRef.current = false; warn();
      setVoiceErr('Recording failed to start. Type instead.');
      return;
    }
    tapPrimary();
    setListening(true);
    setSecs(0);
    secTimer.current = setInterval(() => setSecs((s) => s + 1), 1000);
  };

  const stopRec = async (cancel) => {
    heldRef.current = false;
    clearInterval(secTimer.current);
    setListening(false);
    const mr = mediaRec.current;
    if (!mr || mr.state !== 'recording') { releaseMic(); return; }
    const dur = fmt(secs);
    mr.onstop = async () => {
      const type = mr.mimeType || 'audio/webm';
      const parts = mr._chunks || [];
      // Release THIS recorder's own stream (not the shared ref, which a newer
      // take may already own), and only clear the shared ref if it's still ours.
      try { mr.stream.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
      if (micStream.current === mr.stream) micStream.current = null;
      if (cancel || !parts.length) return;
      const ext = type.includes('mp4') ? 'mp4' : type.includes('mpeg') ? 'mp3' : 'webm';
      const blob = new Blob(parts, { type });
      const fd = new FormData();
      fd.append('audio', blob, `slate-voice.${ext}`);
      setTyping(true);
      try {
        const { data } = await axiosInstance.post(`${baseURL}/v1/ai/transcribe/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const text = (data?.data?.transcript ?? data?.transcript ?? '').trim();
        setTyping(false);
        if (text) ask(text, dur);
        else setMsgs((s) => [...s, { from: 'ai', text: "I didn't catch that. Try again, or type it?" }]);
      } catch {
        setTyping(false);
        setMsgs((s) => [...s, { from: 'ai', text: "Voice hiccuped. Type it and I've got you." }]);
      }
    };
    try { mr.stop(); } catch { releaseMic(); }
  };

  // ── Minimized dock pill ──
  if (minimized) {
    return (
      <div onClick={() => { tapSelect(); onExpand(); }} style={{
        position: 'absolute', left: 14, right: 14, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)', zIndex: 80, cursor: 'pointer',
        background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px) saturate(1.5)', WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
        border: '1px solid rgba(255,255,255,0.6)', borderRadius: 100, padding: '9px 12px',
        boxShadow: '0 12px 34px rgba(122,90,24,0.16)', display: 'flex', alignItems: 'center', gap: 10,
        animation: 'v1cDock 0.4s cubic-bezier(.2,.8,.3,1.1)', WebkitTapHighlightColor: 'transparent',
      }}>
        <Avatar size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: T.text }}>Slate</p>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 11.5, color: T.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {typing ? 'typing…' : lastAi}
          </p>
        </div>
        <ChevronUp size={18} color={T.deep} />
      </div>
    );
  }

  // ── Full console ──
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: T.bg, display: 'flex', flexDirection: 'column',
      paddingTop: 'calc(54px + env(safe-area-inset-top, 0px))', animation: 'v1cSheet 0.42s cubic-bezier(.2,.75,.25,1)' }}>
      {/* Aurora backdrop */}
      <div style={{ position: 'absolute', inset: '-12%', pointerEvents: 'none', zIndex: 0, background:
        'radial-gradient(60% 44% at 82% 8%, #D4A85F55 0%, transparent 55%), radial-gradient(52% 40% at -6% 26%, #A7D6FF88 0%, transparent 55%), radial-gradient(50% 38% at 60% 96%, #9FE6B488 0%, transparent 55%)' }} />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12, padding: '4px 18px 12px', borderBottom: `1px solid ${T.line}` }}>
        <Avatar size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1, letterSpacing: '-0.3px', color: T.text }}>Slate</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: 100, background: T.mint, boxShadow: `0 0 6px ${T.mint}` }} />
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', color: T.dim }}>AI COPILOT · ONLINE</span>
          </div>
        </div>
        <button onClick={() => { tapSelect(); onMinimize(); }} aria-label="Minimize" style={hdrBtn}><ChevronDown size={18} color={T.deep} /></button>
        <button onClick={() => { tapSelect(); onClose(); }} aria-label="Close" style={hdrBtn}><X size={16} color={T.deep} /></button>
      </div>

      {/* Message stream */}
      <div ref={streamRef} className="v1-slate-scroll" style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '16px 16px 6px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => <Message key={i} m={m} onAct={onAct} />)}
        {typing && (
          <div className="v1c-bubble" style={{ display: 'flex', alignItems: 'flex-end', gap: 8, animation: 'v1cBubble 0.38s cubic-bezier(.2,.7,.3,1) both' }}>
            <Avatar size={30} />
            <div style={{ ...GLASS, padding: '13px 16px', borderRadius: '18px 18px 18px 6px', display: 'flex', gap: 5 }}>
              {[0, 1, 2].map((d) => <span key={d} style={{ width: 7, height: 7, borderRadius: 100, background: T.dim, animation: `v1cDot 1.2s ease-in-out ${d * 0.16}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>

      {/* Quick-reply chips */}
      {chips.length > 0 && !typing && (
        <div className="v1-slate-scroll" style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 8, padding: '8px 16px 10px', overflowX: 'auto' }}>
          {chips.map((c, i) => (
            <button key={c + i} onClick={() => onChip(c)} className="v1c-chip" style={{
              flex: '0 0 auto', padding: '9px 15px', borderRadius: 100, background: '#FFFFFF', border: `1px solid ${T.accent}55`,
              color: T.deep, fontFamily: SANS, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(122,90,24,0.06)', animation: `v1cChip 0.34s cubic-bezier(.2,.7,.3,1) ${i * 0.05}s both`, WebkitTapHighlightColor: 'transparent',
            }}>{c}</button>
          ))}
        </div>
      )}

      {/* Inline voice/permission error */}
      {voiceErr && (
        <div style={{ position: 'relative', zIndex: 2, padding: '0 18px', textAlign: 'center', fontFamily: SANS, fontSize: 12, color: T.rec }}>{voiceErr}</div>
      )}

      {/* Composer / push-to-talk */}
      <div style={{ position: 'relative', zIndex: 2, padding: '8px 14px calc(20px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${T.line}`,
        background: `linear-gradient(${T.bg}00, ${T.bg} 40%)`, display: 'flex', gap: 9, alignItems: 'center' }}>
        {listening ? (
          <div style={{ ...GLASS, flex: 1, borderRadius: 100, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: 100, background: T.rec, animation: 'v1cRec 1.1s ease-in-out infinite' }} />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 20 }}>
              {Array.from({ length: 22 }).map((_, i) => (
                <span key={i} style={{ flex: 1, height: '100%', background: T.accent, borderRadius: 2, transformOrigin: 'center',
                  animation: `v1cEq ${0.7 + (i % 5) * 0.12}s ease-in-out ${(i % 7) * 0.05}s infinite` }} />
              ))}
            </div>
            <span style={{ fontFamily: MONO, fontSize: 12, color: T.deep }}>{fmt(secs)}</span>
          </div>
        ) : (
          <div style={{ ...GLASS, flex: 1, borderRadius: 100, padding: '6px 6px 6px 16px', display: 'flex', alignItems: 'center' }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
              placeholder="Ask Slate anything…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: SANS, fontSize: 14, color: T.text }} />
          </div>
        )}
        {draft.trim() && !listening ? (
          <button onClick={onSend} aria-label="Send" style={sendBtn}><Send size={18} color={T.onGold} /></button>
        ) : (
          <button
            aria-label="Hold to talk"
            onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ } startRec(); }}
            onPointerUp={() => stopRec(false)}
            onPointerCancel={() => stopRec(true)}
            style={{ ...sendBtn, background: listening ? T.rec : sendBtn.background,
              transform: listening ? 'scale(1.06)' : 'none', boxShadow: listening ? '0 0 0 6px rgba(229,72,77,0.18)' : sendBtn.boxShadow,
              transition: 'transform .15s, box-shadow .15s', touchAction: 'none', userSelect: 'none' }}
          >
            <Mic size={19} color="#FFFFFF" />
          </button>
        )}
      </div>

      {/* Release-to-send hint + off-button catcher */}
      {listening && (
        <>
          <div onPointerUp={() => stopRec(false)} style={{ position: 'absolute', inset: 0, zIndex: 5 }} />
          <div style={{ position: 'absolute', bottom: 86, left: 0, right: 0, textAlign: 'center', zIndex: 6, pointerEvents: 'none',
            fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', color: T.deep }}>RELEASE TO SEND</div>
        </>
      )}
    </div>
  );
}

const hdrBtn = { width: 34, height: 34, borderRadius: 100, background: T.surface, border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' };
const sendBtn = { width: 46, height: 46, borderRadius: 100, border: 'none', cursor: 'pointer', flex: '0 0 auto',
  background: `linear-gradient(150deg, ${T.goldLight}, ${T.accent} 60%, ${T.goldMid})`, display: 'grid', placeItems: 'center',
  boxShadow: '0 6px 16px #D4A85F66, inset 0 1px 0 rgba(255,255,255,0.5)', WebkitTapHighlightColor: 'transparent' };

function fmt(s) { const m = Math.floor(s / 60); const ss = String(s % 60).padStart(2, '0'); return `${m}:${ss}`; }
