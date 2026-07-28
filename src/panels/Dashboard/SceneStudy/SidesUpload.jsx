import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axiosInstance from '../../../redux/http';
import endPoints from '../../../redux/constant';
import { requestAiConsent } from '../../../components/AIConsent/AIConsentModal';
import { trackEvent, Events } from '../../../utils/analytics';

/**
 * SidesUpload — "Bring your own sides."
 *
 * Lets an actor upload a REAL audition-sides PDF (Actors Access / Breakdown
 * Services / Backstage) and rehearse it with the AI reader. Unlike the plain
 * script upload (which scrapes text and chokes on the diagonal-X struck scenes,
 * START/END markers, overlap columns, and the "Role:" header), this posts the
 * PDF to /v1/ai/parse-sides/ where Claude *sees* the rendered pages and returns
 * a clean structured scene.
 *
 *   <SidesUpload onReady={({ scriptContent, characters, role, title }) => ...} />
 *
 * The parent decides what to do with the result (web SceneStudy jumps to the
 * role-pick step; mobile ScenesScreen drops it in as a virtual script). Both
 * ultimately feed the existing LiveSceneMode reader.
 */

const GOLD = '#D4A85F';

// Scene → the CHARACTER: dialogue string the existing parser/reader expects.
// Drop action + parentheticals — the AI reader only speaks dialogue, and a
// stray "(off her silence)" must never be read aloud.
function sidesToScript(scene) {
  return (scene.scenes || [])
    .map((sc) =>
      (sc.lines || [])
        .filter((l) => l.type === 'dialogue' && l.character && l.text)
        .map((l) => `${l.character}: ${l.text}`)
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n\n');
}

export default function SidesUpload({ onReady }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scene, setScene] = useState(null);   // parsed result → confirm card
  const [role, setRole] = useState('');
  const inputRef = useRef(null);

  // Slide the mobile top/bottom bars out of the way while the confirm card
  // is up so its buttons aren't clipped by the tab pill.
  useEffect(() => {
    if (!scene) return;
    window.dispatchEvent(new CustomEvent('drst-modal-open'));
    return () => window.dispatchEvent(new CustomEvent('drst-modal-closed'));
  }, [scene]);

  const handleFile = async (file) => {
    if (!file) return;
    // The ~90s parse-sides request charges a token. Guard against a second
    // tap landing while the first is still in flight (double token charge).
    if (loading) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF of your sides.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('That PDF is over 15MB. Try exporting just the sides pages.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      const { data } = await axiosInstance.post(endPoints.parseSides, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000,
      });
      const parsed = data?.data || data;
      if (!parsed?.scenes?.length) {
        throw new Error('empty');
      }
      setScene(parsed);
      setRole(parsed.role || parsed.characters?.[0] || '');
      trackEvent(Events.SIDES_UPLOADED, { role: parsed.role || '', scenes: parsed.scenes?.length || 0 });
    } catch (err) {
      const sc = err?.response?.status;
      const beMsg = err?.response?.data?.message;
      if (sc === 402) setError("You're out of AI tokens. Top up to read your sides.");
      else if (sc === 403) {
        // Open the consent modal inline instead of dead-ending.
        requestAiConsent();
        setError('Turn on AI features to read your sides, then upload again.');
      } else if (sc === 429) {
        // fair_use_limit — daily soft cap.
        setError(beMsg || "You've hit today's AI limit. It resets in a few hours.");
      } else if (sc === 503 || !err?.response) {
        // token_check_failed, or a client-side timeout / network drop (no
        // response object). Not a bad-PDF problem — don't blame the file.
        setError(beMsg || "Couldn't reach the server. Try again.");
      } else setError(beMsg || "Couldn't read those sides. Make sure it's a text PDF (not a photo) and try again.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const start = () => {
    if (!scene || !role) return;
    onReady?.({
      scriptContent: sidesToScript(scene),
      characters: scene.characters || [],
      role,
      title: scene.title || 'Audition Sides',
    });
    setScene(null);
  };

  const readers = (scene?.characters || []).filter((c) => c !== role);
  const lineCount = (scene?.scenes || []).reduce(
    (n, sc) => n + (sc.lines || []).filter((l) => l.type === 'dialogue').length, 0,
  );

  return (
    <>
      {/* Upload tile */}
      <label htmlFor="sides-upload-input" style={{ display: 'block', cursor: loading ? 'default' : 'pointer', pointerEvents: loading ? 'none' : 'auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(212,168,95,0.14), rgba(122,90,24,0.06))',
          borderRadius: 18, padding: 22, marginBottom: 14,
          border: `1.5px solid ${GOLD}55`, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: GOLD, color: '#0E0D0A', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.6px', padding: '3px 7px', borderRadius: 6,
          }}>NEW</div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <svg style={{ width: 30, height: 30, color: GOLD, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.25 }} />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--aurora-text, #0A0A0A)', margin: 0 }}>Reading your sides…</p>
              <p style={{ fontSize: 11, color: 'var(--aurora-sub, rgba(10,10,10,0.5))', margin: 0 }}>Finding your role + the other parts. This can take up to 90 seconds</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `${GOLD}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--aurora-text, #0A0A0A)', margin: 0, letterSpacing: '-0.2px' }}>Upload your audition sides</p>
                <p style={{ fontSize: 12, color: 'var(--aurora-sub, rgba(10,10,10,0.55))', margin: '4px 0 0', lineHeight: 1.35 }}>
                  Actors Access, Backstage, any PDF: we read the other part for you
                </p>
              </div>
            </div>
          )}
        </div>
        <input id="sides-upload-input" ref={inputRef} type="file" accept=".pdf" disabled={loading}
          style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#b91c1c', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 14,
        }}>{error}</div>
      )}

      {/* Confirm card */}
      {scene && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          background: 'rgba(10,9,7,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setScene(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 460, background: 'var(--aurora-surface-solid, #fff)',
            borderRadius: '24px 24px 0 0', padding: '20px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
            boxShadow: 'var(--aurora-shadow-modal, 0 -8px 40px rgba(0,0,0,0.25))',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--aurora-line, #eee)', margin: '0 auto 18px' }} />

            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD, margin: '0 0 4px' }}>
              Sides ready{scene.tape_window?.detected ? ' · tape window found' : ''}
            </p>
            <h3 className="aurora-display" style={{ fontSize: 21, color: 'var(--aurora-text, #0A0A0A)', margin: '0 0 16px', letterSpacing: '-0.4px', fontFamily: "'Playfair Display', serif" }}>
              {scene.title || 'Your scene'}
            </h3>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--aurora-sub, rgba(10,10,10,0.55))', margin: '0 0 6px' }}>
              You're playing
            </label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{
              width: '100%', padding: '13px 14px', borderRadius: 13, fontSize: 16, fontWeight: 600,
              border: `1.5px solid ${GOLD}`, background: `${GOLD}10`, color: 'var(--aurora-text, #0A0A0A)',
              appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', marginBottom: 14,
            }}>
              {(scene.characters || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
              <Chip label={`AI reads: ${readers.length ? readers.join(', ') : 'none'}`} />
              <Chip label={`${scene.scenes.length} scene${scene.scenes.length > 1 ? 's' : ''}`} />
              <Chip label={`${lineCount} lines`} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setScene(null)} style={{
                flex: 1, padding: 14, borderRadius: 14, border: '1px solid var(--aurora-line, #e5e5e5)',
                background: 'transparent', color: 'var(--aurora-text, #0A0A0A)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={start} disabled={!role} style={{
                flex: 2, padding: 14, borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${GOLD}, #7A5A18)`, color: '#0E0D0A',
                fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: role ? 1 : 0.5,
              }}>Start reading →</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function Chip({ label }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, color: 'var(--aurora-sub, rgba(10,10,10,0.6))',
      background: 'var(--aurora-glass, rgba(10,10,10,0.04))', border: '1px solid var(--aurora-line, rgba(10,10,10,0.08))',
      padding: '6px 11px', borderRadius: 999,
    }}>{label}</span>
  );
}
