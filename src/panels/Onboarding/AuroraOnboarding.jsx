import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfileThunk, fetchProfileThunk } from '../../redux/features/profile/profileSlice';
import { patchUserSettings } from '../../redux/features/userSettings/userSettingsSlice';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import useHideMobileHeader from '../../components/Shared/useHideMobileHeader';

/* ── Aurora post-signup onboarding flow ────────────────────────────────
 * 8 steps: identity → profile → interests → goals → level → notif →
 * follow → building → welcome.
 *
 * Mounts as a full-screen overlay above MobileApp content. Replaces the
 * old ReaderOnboardingModal trigger. Persists progress to localStorage so
 * the user can resume if they close mid-flow. Final step PATCHes the
 * profile + sets userSettings.reader_onboarding_seen = true.
 * ─────────────────────────────────────────────────────────────────── */

// Free-first-review onboarding (the Day-0 activation + paywall moment). When
// off, the flow ends at 'welcome' exactly as before. When on, a final 'offer'
// step pitches one free Tape Review, then the analyzer's result carries the
// paywall. Flip VITE_FIRST_REVIEW_FLOW=true once 1.0.7 (the analyzer) is live.
const FIRST_REVIEW_FLOW = import.meta.env.VITE_FIRST_REVIEW_FLOW === 'true';

// Activation-first order when the free-first-review flow is ON: pitch the free
// Tape Review right after the name step (fast aha), and move the push-permission
// (notif) ask to the LAST question step (after value). Flag OFF = original order.
const STEPS = FIRST_REVIEW_FLOW
  ? ['identity', 'offer', 'profile', 'interests', 'goals', 'level', 'follow', 'notif', 'building', 'welcome']
  : ['identity', 'profile', 'interests', 'goals', 'level', 'notif', 'follow', 'building', 'welcome', 'offer'];
const Q_STEPS = FIRST_REVIEW_FLOW
  ? ['identity', 'profile', 'interests', 'goals', 'level', 'follow', 'notif']
  : ['identity', 'profile', 'interests', 'goals', 'level', 'notif', 'follow'];

// Best-effort analytics — mirrors the dynamic-import pattern finish() already
// uses so a missing/blocked analytics bundle never breaks onboarding.
function track(event, props) {
  import('../../utils/analytics').then(({ trackEvent, Events }) => {
    const name = Events[event] || event;
    trackEvent(name, props);
  }).catch(() => { /* analytics unavailable */ });
}

const ROLES = [
  { id: 'film', label: 'Film / TV', sub: 'SCRIPTED · STUDIO' },
  { id: 'commercial', label: 'Commercial', sub: 'BRAND · HERO' },
  { id: 'theatre', label: 'Theatre', sub: 'STAGE · LIVE' },
  { id: 'voiceover', label: 'Voice Over', sub: 'VO · ANIMATION' },
  { id: 'hosting', label: 'Hosting', sub: 'ON-CAMERA · PRESENT' },
  { id: 'student', label: 'Student / Short', sub: 'INDIE · GRAD FILM' },
];
const GOALS = [
  { id: 'roles', label: 'Land more roles', sub: 'TRACK & CONVERT', tint: 'var(--aurora-heritage-gold)' },
  { id: 'habit', label: 'Build a rehearsal habit', sub: 'DAILY REPS', tint: 'var(--aurora-peach)' },
  { id: 'partners', label: 'Find scene partners', sub: 'READERS NEAR ME', tint: 'var(--aurora-sky)' },
  { id: 'coaching', label: 'Get AI coaching', sub: 'NOTES ON EVERY TAKE', tint: 'var(--aurora-mint)' },
];
const LEVELS = [
  { id: 'new', label: 'Just starting out', sub: 'NEW TO AUDITIONING' },
  { id: 'working', label: 'Working actor', sub: 'BOOKING REGULARLY' },
  { id: 'established', label: 'Established', sub: 'CREDITS & REP' },
  { id: 'pro', label: 'Full-time pro', sub: 'THIS IS THE CAREER' },
];
const TYPES = ['Leading', 'Character', 'Comedic', 'Ingénue', 'Best Friend', 'Villain', 'Parent'];
const PRONOUNS = ['she/her', 'he/him', 'they/them', 'other'];
const UNIONS = ['SAG-AFTRA', 'Eligible', 'Non-union'];

const STORAGE_STEP = 'dst_onb_step';
const STORAGE_DATA = 'dst_onb_data';

/* Primary gold CTA — gradient + sheen */
function GoldBtn({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '16px', border: 'none', borderRadius: 100,
        cursor: disabled ? 'default' : 'pointer',
        position: 'relative', overflow: 'hidden',
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 15, fontWeight: 600, letterSpacing: '-0.2px',
        color: disabled ? 'var(--aurora-dim)' : '#1A1408',
        background: disabled
          ? 'rgba(10,10,10,0.06)'
          : 'linear-gradient(135deg,#C99A4E 0%,var(--aurora-heritage-gold) 45%,var(--aurora-heritage-gold-light) 100%)',
        boxShadow: disabled
          ? 'none'
          : '0 2px 4px rgba(122,90,24,0.25), 0 14px 30px rgba(212,168,95,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 0 0 1px rgba(212,168,95,0.3)',
        transition: 'opacity 0.2s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px', border: 'none', borderRadius: 100,
        background: 'transparent', color: 'var(--aurora-accent-deep)',
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function TopBar({ step, total, onBack, onSkip }) {
  return (
    <div style={{
      position: 'relative', zIndex: 10,
      padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 22px 4px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* No-op back on the first step — render a spacer instead of a dead button. */}
      {step > 1 ? (
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 4, color: 'var(--aurora-text)', display: 'flex',
        }}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none">
            <path d="M10 2L2 10l8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <div style={{ width: 11 }} />
      )}
      <div style={{
        flex: 1, height: 6, background: 'rgba(10,10,10,0.07)',
        borderRadius: 100, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${(step / total) * 100}%`, borderRadius: 100,
          background: 'linear-gradient(90deg, var(--aurora-mint), var(--aurora-heritage-gold))',
          boxShadow: '0 0 8px rgba(212,168,95,0.55)',
          transition: 'width 0.5s cubic-bezier(.2,.7,.3,1)',
        }} />
      </div>
      {onSkip ? (
        <button onClick={onSkip} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          letterSpacing: '0.1em', color: 'var(--aurora-dim)',
        }}>SKIP</button>
      ) : (
        <div style={{ width: 30 }} />
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', multiline, disabled, hint }) {
  const C = multiline ? 'textarea' : 'input';
  return (
    <div>
      <label style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        letterSpacing: '0.15em', color: 'var(--aurora-dim)',
        textTransform: 'uppercase',
      }}>{label}</label>
      <C
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        rows={multiline ? 3 : undefined}
        disabled={disabled}
        readOnly={disabled}
        style={{
          width: '100%', marginTop: 6,
          border: '1.5px solid var(--aurora-line)',
          borderRadius: 14, padding: '14px 16px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 16, color: 'var(--aurora-text)',
          outline: 'none',
          background: disabled ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.7)',
          resize: multiline ? 'none' : undefined,
          lineHeight: multiline ? 1.5 : undefined,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
      {hint && (
        <p style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '0.1em', color: 'var(--aurora-dim)',
          margin: '6px 0 0', textTransform: 'uppercase',
        }}>{hint}</p>
      )}
    </div>
  );
}

function ChipRow({ options, value, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const on = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onPick(opt)}
            style={{
              padding: '9px 14px', borderRadius: 100, cursor: 'pointer',
              background: on ? 'var(--aurora-text)' : 'rgba(255,255,255,0.6)',
              color: on ? '#fff' : 'var(--aurora-text)',
              border: `1.5px solid ${on ? 'var(--aurora-text)' : 'var(--aurora-line)'}`,
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 500,
            }}
          >{opt}</button>
        );
      })}
    </div>
  );
}

function SelectRow({ label, sub, on, onClick, tint }) {
  const color = tint || 'var(--aurora-heritage-gold)';
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
      padding: '15px 16px', marginBottom: 10, borderRadius: 16,
      cursor: 'pointer', textAlign: 'left',
      background: on ? `color-mix(in oklch, ${color} 22%, transparent)` : 'rgba(255,255,255,0.6)',
      border: `1.5px solid ${on ? color : 'var(--aurora-line)'}`,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      transition: 'background 0.15s, border-color 0.15s',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 16, fontWeight: 600, letterSpacing: '-0.2px',
          color: on ? 'var(--aurora-accent-deep)' : 'var(--aurora-text)',
        }}>{label}</div>
        {sub && <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: 'var(--aurora-dim)', marginTop: 3, letterSpacing: '0.05em',
        }}>{sub}</div>}
      </div>
      <span style={{
        flexShrink: 0, width: 24, height: 24, borderRadius: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? color : 'transparent',
        border: on ? 'none' : '1.5px solid var(--aurora-line)',
      }}>
        {on && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A1408" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-11" />
          </svg>
        )}
      </span>
    </button>
  );
}

/* ───── STEP COMPONENTS ───── */

function Identity({ data, set, onNext, nameLocked }) {
  const valid = (data.first_name || '').trim() && (data.last_name || '').trim();
  // When the name arrived from Sign in with Apple (or a prior signup), we
  // lock the inputs read-only so Apple's Authentication Services framework
  // remains the only source of name truth (Apple HIG: never re-ask for data
  // SiwA already provided). The user can still change it later from Profile.
  const nameHint = nameLocked ? 'SYNCED FROM YOUR ACCOUNT — EDIT FROM PROFILE LATER' : null;
  return (
    <div style={{ padding: '12px 26px 30px' }}>
      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700,
        letterSpacing: '-0.6px', lineHeight: 1.02, margin: 0,
      }}>{nameLocked ? <>Welcome,<br />{(data.first_name || '').trim() || 'actor'}.</> : <>Tell us<br />who you are.</>}</h1>
      <div style={{ marginTop: 22 }}>
        <Field label="FIRST NAME" value={data.first_name} onChange={(v) => set({ first_name: v })} placeholder="Maya" disabled={nameLocked} hint={nameHint} />
      </div>
      <div style={{ marginTop: 16 }}>
        <Field label="LAST NAME" value={data.last_name} onChange={(v) => set({ last_name: v })} placeholder="Okonkwo" disabled={nameLocked} />
      </div>
      <div style={{ marginTop: 16 }}>
        <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.15em', color: 'var(--aurora-dim)' }}>UNION STATUS</label>
        <ChipRow options={UNIONS} value={data.union_status} onPick={(v) => set({ union_status: v })} />
      </div>
      <div style={{ marginTop: 16 }}>
        <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.15em', color: 'var(--aurora-dim)' }}>PRONOUNS</label>
        <ChipRow options={PRONOUNS} value={data.pronouns} onPick={(v) => set({ pronouns: v })} />
      </div>
      <GoldBtn onClick={onNext} disabled={!valid} style={{ marginTop: 26 }}>Continue</GoldBtn>
    </div>
  );
}

function ProfileStep({ data, set, onNext }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [cropImg, setCropImg] = useState(null);
  const valid = (data.city || '').trim();
  const fullName = `${(data.first_name || 'Your').trim()} ${(data.last_name || 'Name').trim()}`.trim();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type || !f.type.startsWith('image/')) {
      e.target.value = '';
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropImg(reader.result);
    reader.readAsDataURL(f);
  };

  const acceptCrop = () => {
    set({ headshotDataUrl: cropImg });
    setCropImg(null);
    setUploading(false);
  };

  return (
    <div style={{ padding: '12px 26px 30px' }}>
      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700,
        letterSpacing: '-0.6px', lineHeight: 1.02, margin: 0,
      }}>Build your<br />actor profile.</h1>
      <p style={{ fontSize: 13.5, color: 'var(--aurora-sub)', marginTop: 12, lineHeight: 1.5 }}>
        This is what casting and scene partners see. You can polish it anytime.
      </p>

      <button onClick={() => setUploading(true)} style={{
        width: '100%', height: 220, marginTop: 20, borderRadius: 22, cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        border: data.headshotDataUrl ? 'none' : '2px dashed var(--aurora-line)',
        background: data.headshotDataUrl
          ? `#0E0D0A url(${data.headshotDataUrl}) center/cover`
          : 'rgba(255,255,255,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {data.headshotDataUrl ? (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
            borderRadius: 100, padding: '7px 12px',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: '0.1em', color: 'var(--aurora-accent-deep)',
          }}>REPLACE</div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--aurora-dim)' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'color-mix(in oklch, var(--aurora-heritage-gold) 22%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto', color: 'var(--aurora-accent-deep)',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="6" width="18" height="14" rx="2" />
                <circle cx="12" cy="13" r="3.5" />
                <path d="M8 6l1.5-2h5L16 6" />
              </svg>
            </div>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600,
              color: 'var(--aurora-text)', marginTop: 12,
            }}>Add your headshot</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              letterSpacing: '0.1em', marginTop: 4,
            }}>TAP TO UPLOAD · JPG OR PNG</div>
          </div>
        )}
      </button>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />

      {uploading && !cropImg && (
        <div onClick={() => setUploading(false)} style={{
          position: 'fixed', inset: 0, zIndex: 95,
          display: 'flex', alignItems: 'flex-end',
          background: 'rgba(20,18,14,0.45)', backdropFilter: 'blur(4px)',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', borderRadius: '26px 26px 0 0',
            padding: '20px 22px calc(env(safe-area-inset-bottom, 0px) + 32px)',
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(28px) saturate(1.5)',
            boxShadow: '0 -10px 40px rgba(10,10,10,0.2)',
          }}>
            <div style={{
              width: 40, height: 4, background: 'var(--aurora-line)',
              borderRadius: 100, margin: '0 auto 18px',
            }} />
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Add your headshot</div>
            <div style={{ fontSize: 13, color: 'var(--aurora-sub)', lineHeight: 1.45, marginBottom: 18 }}>
              Use a clean, current headshot — shoulders up, neutral background reads best.
            </div>
            <button onClick={() => fileRef.current && fileRef.current.click()} style={{
              width: '100%', padding: 14, borderRadius: 16, cursor: 'pointer',
              background: 'var(--aurora-text)', color: '#fff', border: 'none',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="6" width="18" height="14" rx="2" />
                <circle cx="12" cy="13" r="3.5" />
                <path d="M8 6l1.5-2h5L16 6" />
              </svg>
              Upload photo
            </button>
          </div>
        </div>
      )}

      {cropImg && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 96, background: '#0E0D0A',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{
              width: 280, height: 280, borderRadius: '50%', overflow: 'hidden',
              boxShadow: '0 0 0 2000px rgba(14,13,10,0.78)',
              background: `#222 url(${cropImg}) center/cover`,
            }} />
            <div style={{
              position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)',
            }}>THIS WILL BE YOUR HEADSHOT</div>
          </div>
          {/* zIndex sits the actions above the circle's 2000px vignette shadow
              so they read at full contrast instead of washed-out on black. */}
          <div style={{
            position: 'relative', zIndex: 2,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 26px calc(env(safe-area-inset-bottom, 0px) + 32px)',
          }}>
            <button onClick={() => setCropImg(null)} style={{
              flex: '0 0 auto',
              background: 'rgba(255,255,255,0.14)',
              border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff',
              borderRadius: 100, padding: '13px 22px',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>Retake</button>
            <button onClick={acceptCrop} style={{
              flex: 1,
              background: 'linear-gradient(135deg,#C99A4E 0%,var(--aurora-heritage-gold) 45%,var(--aurora-heritage-gold-light) 100%)',
              border: 'none', color: '#1A1408', borderRadius: 100, padding: '15px 28px',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(122,90,24,0.25), 0 14px 30px rgba(212,168,95,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}>Use this photo</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--aurora-text)' }}>{fullName}</div>
        {data.union_status && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.1em',
            color: 'var(--aurora-accent-deep)',
            background: 'color-mix(in oklch, var(--aurora-heritage-gold) 28%, transparent)',
            padding: '3px 7px', borderRadius: 100,
          }}>{data.union_status.toUpperCase()}</div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="BASED IN" value={data.city} onChange={(v) => set({ city: v })} placeholder="Brooklyn, NY" />
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label="REPRESENTATION · OPTIONAL" value={data.representation} onChange={(v) => set({ representation: v })} placeholder="Agency or “Seeking rep”" />
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.15em', color: 'var(--aurora-dim)' }}>
          YOUR TYPE <span style={{ opacity: 0.6 }}>· PICK A FEW</span>
        </label>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {TYPES.map((t) => {
            const sel = (data.types || []).includes(t);
            return (
              <button
                key={t}
                onClick={() => set({
                  types: sel
                    ? (data.types || []).filter((x) => x !== t)
                    : [...(data.types || []), t],
                })}
                style={{
                  padding: '8px 13px', borderRadius: 100, cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 500,
                  background: sel
                    ? 'color-mix(in oklch, var(--aurora-heritage-gold) 28%, transparent)'
                    : 'rgba(255,255,255,0.6)',
                  color: sel ? 'var(--aurora-accent-deep)' : 'var(--aurora-text)',
                  border: `1.5px solid ${sel ? 'var(--aurora-heritage-gold)' : 'var(--aurora-line)'}`,
                }}
              >{t}</button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Field label="SHORT BIO · OPTIONAL" value={data.bio} onChange={(v) => set({ bio: v })} placeholder="A line or two on your training, range, and what you're after." multiline />
      </div>

      <GoldBtn onClick={onNext} disabled={!valid} style={{ marginTop: 22 }}>
        {valid ? 'Continue' : 'Add your city to continue'}
      </GoldBtn>
      <GhostBtn onClick={onNext} style={{ marginTop: 6 }}>I'll finish this later</GhostBtn>
    </div>
  );
}

function MultiPicker({ title, subtitle, items, selected, onToggle, onNext, min = 1, useItemTint }) {
  return (
    <div style={{ padding: '12px 26px 30px' }}>
      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700,
        letterSpacing: '-0.6px', lineHeight: 1.02, margin: 0, whiteSpace: 'pre-line',
      }}>{title}</h1>
      <p style={{ fontSize: 13.5, color: 'var(--aurora-sub)', marginTop: 12, lineHeight: 1.5 }}>{subtitle}</p>
      <div style={{ marginTop: 22 }}>
        {items.map((it) => (
          <SelectRow
            key={it.id}
            label={it.label}
            sub={it.sub}
            on={selected.includes(it.id)}
            onClick={() => onToggle(it.id)}
            tint={useItemTint ? it.tint : undefined}
          />
        ))}
      </div>
      <GoldBtn onClick={onNext} disabled={selected.length < min} style={{ marginTop: 12 }}>
        {selected.length < min ? 'Pick at least one' : `Continue${selected.length ? ` · ${selected.length}` : ''}`}
      </GoldBtn>
    </div>
  );
}

function SinglePicker({ title, subtitle, items, value, onPick, onNext }) {
  return (
    <div style={{ padding: '12px 26px 30px' }}>
      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700,
        letterSpacing: '-0.6px', lineHeight: 1.02, margin: 0, whiteSpace: 'pre-line',
      }}>{title}</h1>
      <p style={{ fontSize: 13.5, color: 'var(--aurora-sub)', marginTop: 12, lineHeight: 1.5 }}>{subtitle}</p>
      <div style={{ marginTop: 22 }}>
        {items.map((it) => (
          <SelectRow key={it.id} label={it.label} sub={it.sub} on={value === it.id} onClick={() => onPick(it.id)} />
        ))}
      </div>
      <GoldBtn onClick={onNext} disabled={!value} style={{ marginTop: 12 }}>Continue</GoldBtn>
    </div>
  );
}

function Notif({ onAllow, onSkip }) {
  const { subscribe, permission, supported } = usePushNotifications();
  const allow = async () => {
    try { await subscribe?.(); } catch { /* user denied or unsupported */ }
    onAllow();
  };
  return (
    <div style={{ padding: '12px 26px 30px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 200, marginTop: 6 }}>
        <div style={{
          position: 'absolute', left: 20, right: 20, top: 30, borderRadius: 18, padding: '14px 16px',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.85), rgba(255,255,255,0.65))',
          backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 14px 36px rgba(122,90,24,0.14)', transform: 'rotate(-3deg)',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            letterSpacing: '0.12em', color: 'var(--aurora-dim)',
          }}>NOW · CALLBACK</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, letterSpacing: '-0.2px' }}>Hollow Bones called you back 🎬</div>
          <div style={{ fontSize: 11, color: 'var(--aurora-sub)', marginTop: 3 }}>Wed 14 May · 14:00 · CSA Studios</div>
        </div>
        <div style={{
          position: 'absolute', left: 36, right: 36, top: 110, borderRadius: 18, padding: '14px 16px',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.8), rgba(255,255,255,0.6))',
          backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 14px 36px rgba(122,90,24,0.12)', transform: 'rotate(2.5deg)',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            letterSpacing: '0.12em', color: 'var(--aurora-dim)',
          }}>12m · MATCH</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, letterSpacing: '-0.2px' }}>Jonah wants to run sides tonight</div>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700,
          letterSpacing: '-0.6px', lineHeight: 1.02, margin: 0,
        }}>Never miss<br />a callback.</h1>
        <p style={{ fontSize: 13.5, color: 'var(--aurora-sub)', marginTop: 12, lineHeight: 1.6 }}>
          Turn on notifications and we'll ping you about:
        </p>
        <div style={{ marginTop: 12 }}>
          {['Callback invites & self-tape deadlines', 'When a reader matches with you', 'Your weekly Jericho craft readout'].map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
              <span style={{
                width: 20, height: 20, borderRadius: 100,
                background: 'var(--aurora-mint)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A1408" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-11" />
                </svg>
              </span>
              <span style={{ fontSize: 14, color: 'var(--aurora-text)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 22 }}>
        {permission === 'granted' || !supported ? (
          <GoldBtn onClick={onAllow}>Continue</GoldBtn>
        ) : (
          <>
            <GoldBtn onClick={allow}>Allow notifications</GoldBtn>
            <GhostBtn onClick={onSkip} style={{ marginTop: 8 }}>Not now</GhostBtn>
          </>
        )}
      </div>
    </div>
  );
}

function Follow({ onNext }) {
  return (
    <div style={{ padding: '12px 26px 30px' }}>
      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700,
        letterSpacing: '-0.6px', lineHeight: 1.02, margin: 0,
      }}>It's not always<br />a solo craft.</h1>
      <p style={{ fontSize: 13.5, color: 'var(--aurora-sub)', marginTop: 12, lineHeight: 1.5 }}>
        After onboarding, swipe through verified readers and coaches in the Find a Reader tab. Build your Green Room of scene partners.
      </p>
      <div style={{ marginTop: 22 }}>
        {[
          { e: '🎬', text: 'Match with readers in your zip' },
          { e: '💬', text: 'Chat + run sides live in the Green Room' },
          { e: '✦', text: 'Find a coach or rehearsal partner before your next callback' },
        ].map((row) => (
          <div key={row.e} className="aurora-card" style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', marginBottom: 10,
          }}>
            <span style={{ fontSize: 22 }}>{row.e}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--aurora-text)' }}>{row.text}</span>
          </div>
        ))}
      </div>
      <GoldBtn onClick={onNext} style={{ marginTop: 22 }}>Continue</GoldBtn>
    </div>
  );
}

function Building({ onDone }) {
  const tasks = [
    'Setting up your tracker',
    'Tuning your AI scene partner',
    'Finding readers in your area',
    'Building your Craft Journey',
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    const timers = tasks.map((_, k) => setTimeout(() => setDone(k + 1), 600 + k * 600));
    const fin = setTimeout(onDone, 600 + tasks.length * 600 + 500);
    return () => { timers.forEach(clearTimeout); clearTimeout(fin); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pct = done / tasks.length;
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="aurora-orbs aurora-orbs-live" style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top, 0px) + 54px) 30px calc(env(safe-area-inset-bottom, 0px) + 40px)',
    }}>
      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', width: '100%' }}>
        <svg width="140" height="140" viewBox="0 0 140 140" style={{ margin: '0 auto' }}>
          <circle cx="70" cy="70" r={r} stroke="rgba(10,10,10,0.07)" strokeWidth="10" fill="none" />
          <circle
            cx="70" cy="70" r={r}
            stroke="var(--aurora-heritage-gold)" strokeWidth="10" fill="none"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
            transform="rotate(-90 70 70)"
            style={{
              transition: 'stroke-dashoffset 0.5s cubic-bezier(.5,.1,.2,1)',
              filter: 'drop-shadow(0 0 8px rgba(212,168,95,0.55))',
            }}
          />
          <text x="70" y="78" textAnchor="middle" fontFamily="'JetBrains Mono'" fontSize="30" fontWeight="500" fill="var(--aurora-text)">{Math.round(pct * 100)}%</text>
        </svg>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700,
          letterSpacing: '-0.4px', marginTop: 22,
        }}>Personalizing your studio…</div>
        <div style={{ marginTop: 22, textAlign: 'left', maxWidth: 300, margin: '22px auto 0' }}>
          {tasks.map((t, k) => {
            const isDone = k < done;
            const active = k === done;
            return (
              <div key={t} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                opacity: k > done ? 0.4 : 1, transition: 'opacity 0.3s',
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 100, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? 'var(--aurora-mint)'
                    : active ? 'var(--aurora-heritage-gold)'
                    : 'rgba(10,10,10,0.06)',
                  transition: 'background 0.3s',
                }}>
                  {isDone && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A1408" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-11" />
                    </svg>
                  )}
                  {active && (
                    <span style={{
                      width: 10, height: 10,
                      border: '2px solid #1A1408', borderTopColor: 'transparent',
                      borderRadius: 100, animation: 'aurora-spin 0.7s linear infinite',
                    }} />
                  )}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--aurora-text)' }}>{t}</span>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes aurora-spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

function Welcome({ data, onDone }) {
  const name = (data.first_name || 'there').trim();
  const COLS = ['var(--aurora-heritage-gold)', 'var(--aurora-mint)', 'var(--aurora-sky)', 'var(--aurora-rose)', 'var(--aurora-peach)'];
  return (
    <div className="aurora-orbs aurora-orbs-live" style={{
      position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
        {Array.from({ length: 22 }).map((_, k) => {
          const ang = (k / 22) * Math.PI * 2;
          const dist = 120 + (k % 4) * 40;
          return (
            <div key={k} style={{
              position: 'absolute', left: '50%', top: '34%',
              width: k % 2 ? 6 : 8, height: k % 2 ? 6 : 8,
              borderRadius: k % 3 ? '50%' : 2,
              background: COLS[k % 5],
              transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px)`,
              animation: `aurora-pop 0.7s cubic-bezier(.2,1.4,.4,1) ${0.2 + (k % 6) * 0.05}s both`,
            }} />
          );
        })}
      </div>
      <div style={{
        position: 'relative', zIndex: 5, flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center',
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: 30,
          background: 'linear-gradient(135deg,#C99A4E,var(--aurora-heritage-gold) 45%,var(--aurora-heritage-gold-light))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 16px 40px rgba(212,168,95,0.55), inset 0 1px 0 rgba(255,255,255,0.6)',
          border: '2px solid rgba(255,255,255,0.6)',
        }}>
          <span style={{ fontSize: 52 }}>✦</span>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.2em',
          color: 'var(--aurora-accent-deep)', marginTop: 24,
        }}>YOU'RE ALL SET</div>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 700,
          letterSpacing: '-0.6px', lineHeight: 1.0, marginTop: 8,
        }}>Welcome,<br />{name}.</h1>
        <p style={{ fontSize: 14, color: 'var(--aurora-sub)', marginTop: 14, lineHeight: 1.5, maxWidth: 300 }}>
          Your studio is ready. Log an audition, run a take, or find a reader — your callback rate starts climbing today.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          {[
            { text: `${(data.interests || []).length || 3} role types`, bg: 'color-mix(in oklch, var(--aurora-heritage-gold) 33%, transparent)' },
            { text: `${(data.goals || []).length || 2} goals set`, bg: 'color-mix(in oklch, var(--aurora-mint) 44%, transparent)' },
            { text: `${(data.types || []).length || 0} types picked`, bg: 'color-mix(in oklch, var(--aurora-sky) 44%, transparent)' },
          ].map((c, k) => (
            <div key={k} style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              padding: '7px 12px', borderRadius: 100, letterSpacing: '0.05em',
              background: c.bg, color: '#1A1408', border: '1px solid rgba(255,255,255,0.5)',
            }}>{c.text.toUpperCase()}</div>
          ))}
        </div>
      </div>
      <div style={{
        position: 'relative', zIndex: 5,
        padding: '0 26px calc(env(safe-area-inset-bottom, 0px) + 38px)',
      }}>
        <GoldBtn onClick={onDone}>Enter your studio →</GoldBtn>
      </div>
      <style>{`@keyframes aurora-pop {0%{transform:translate(0,0) scale(0) rotate(-30deg);opacity:0;}60%{transform:scale(1.25);}100%{opacity:1;}}`}</style>
    </div>
  );
}

/* The offer — the activation moment. Pitches one free Tape Review right after
 * the welcome celebration, while intent is highest (Day-0 converts best). */
function Offer({ onTry, onSkip }) {
  useEffect(() => { track('FIRST_REVIEW_OFFER_SHOWN'); }, []);
  return (
    <div className="aurora-orbs aurora-orbs-live" style={{
      position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        position: 'relative', zIndex: 5, flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center',
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: 30,
          background: 'linear-gradient(135deg,#C99A4E,var(--aurora-heritage-gold) 45%,var(--aurora-heritage-gold-light))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 16px 40px rgba(212,168,95,0.55), inset 0 1px 0 rgba(255,255,255,0.6)',
          border: '2px solid rgba(255,255,255,0.6)',
        }}>
          <span style={{ fontSize: 50 }}>🎥</span>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.2em',
          color: 'var(--aurora-accent-deep)', marginTop: 24,
        }}>ON THE HOUSE</div>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 34, fontWeight: 700,
          letterSpacing: '-0.6px', lineHeight: 1.04, marginTop: 8,
        }}>Your first Tape<br />Review is free.</h1>
        <p style={{ fontSize: 14, color: 'var(--aurora-sub)', marginTop: 14, lineHeight: 1.5, maxWidth: 320 }}>
          Upload a take and Jericho gives you real casting-grade notes — your
          performance, framing, eyeline, and the moves that book the room. ~30 seconds.
        </p>
        <div style={{ marginTop: 20, textAlign: 'left', maxWidth: 300, width: '100%' }}>
          {['Casting-grade acting notes', 'Your strongest beat + the one fix', 'Framing, eyeline & lighting scored'].map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
              <span style={{
                width: 20, height: 20, borderRadius: 100, background: 'var(--aurora-mint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A1408" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-11" />
                </svg>
              </span>
              <span style={{ fontSize: 14, color: 'var(--aurora-text)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{
        position: 'relative', zIndex: 5,
        padding: '0 26px calc(env(safe-area-inset-bottom, 0px) + 38px)',
      }}>
        <GoldBtn onClick={onTry}>Try my free review →</GoldBtn>
        <GhostBtn onClick={onSkip} style={{ marginTop: 6 }}>Maybe later</GhostBtn>
      </div>
    </div>
  );
}

/* ───── ROOT ───── */
export default function AuroraOnboarding({ onClose }) {
  // Onboarding is its own full-screen flow with its own progress bar
  // at top; the persistent MobileApp top bar + bottom tab pill were
  // showing through on every step (most visible on the headshot
  // sheet, which also has a bottom action card the tab bar overlapped).
  useHideMobileHeader(true);
  const dispatch = useDispatch();
  // Apple guideline 4 / Sign in with Apple HIG: if Authentication Services
  // already provided the user's name, never re-ask. We seed the onboarding
  // form from the logged-in user so the Identity step renders pre-filled
  // and read-only when first_name + last_name are present.
  const authUser = useSelector((s) => s?.auth?.user) || {};
  const [i, setI] = useState(() => {
    const saved = parseInt(typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_STEP) : null, 10);
    return Number.isFinite(saved) ? Math.min(saved, STEPS.length - 1) : 0;
  });
  const [data, setData] = useState(() => {
    let saved = {};
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_DATA) : null;
      saved = raw ? JSON.parse(raw) : {};
    } catch {
      saved = {};
    }
    // Backfill name + city from the logged-in user record on first render.
    // localStorage wins for anything the user has already typed in this
    // onboarding session, but we never want an empty name input when SiwA
    // already gave us one.
    return {
      first_name: saved.first_name || authUser.first_name || '',
      last_name: saved.last_name || authUser.last_name || '',
      city: saved.city || authUser.city || '',
      ...saved,
    };
  });
  const nameLocked = !!(authUser.first_name && authUser.last_name);

  const step = STEPS[i];
  const go = (n) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, n));
    setI(next);
    try { window.localStorage.setItem(STORAGE_STEP, String(next)); } catch { /* storage unavailable */ }
  };
  const next = () => go(i + 1);
  const back = () => go(i - 1);

  const set = (patch) => setData((d) => {
    const nd = { ...d, ...patch };
    try { window.localStorage.setItem(STORAGE_DATA, JSON.stringify(nd)); } catch { /* storage unavailable */ }
    return nd;
  });
  const toggle = (key, id) => {
    const cur = data[key] || [];
    set({ [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  const finish = useCallback((opts) => {
    // Mark onboarding seen, clear local progress, and CLOSE IMMEDIATELY. The
    // profile PATCH (especially a multi-MB headshot upload) is best-effort and
    // runs in the background — awaiting it here previously trapped the user on
    // the final screen whenever the upload was slow ("button stuck").
    dispatch(patchUserSettings({ reader_onboarding_seen: true }));
    try {
      window.localStorage.removeItem(STORAGE_STEP);
      window.localStorage.removeItem(STORAGE_DATA);
    } catch { /* storage unavailable */ }

    // Snapshot the data now; the component may unmount before this resolves.
    const d = data;
    (async () => {
      try {
        const fd = new FormData();
        if (d.first_name) fd.append('first_name', d.first_name);
        if (d.last_name) fd.append('last_name', d.last_name);
        if (d.city) fd.append('city', d.city);
        if (d.bio) fd.append('bio', d.bio);
        if (d.pronouns) fd.append('pronouns', d.pronouns);
        if (d.union_status) fd.append('union_status', d.union_status);
        if (d.representation) fd.append('representation', d.representation);
        if (d.types) fd.append('types', JSON.stringify(d.types));
        if (d.interests) fd.append('interests', JSON.stringify(d.interests));
        if (d.goals) fd.append('goals', JSON.stringify(d.goals));
        if (d.level) fd.append('level', d.level);

        if (d.headshotDataUrl && d.headshotDataUrl.startsWith('data:')) {
          try {
            const blob = await (await fetch(d.headshotDataUrl)).blob();
            fd.append('headshot', blob, 'headshot.jpg');
            try { const { trackEvent, Events } = await import('../../utils/analytics'); trackEvent(Events.UPLOAD_HEADSHOT, { source: 'onboarding' }); } catch { /* swallow */ }
          } catch { /* headshot upload failed, continue without */ }
        }

        const hasAny = ['first_name', 'last_name', 'city', 'bio'].some((k) => fd.get(k));
        if (hasAny) {
          await dispatch(updateProfileThunk(fd)).unwrap().catch(() => {});
          await dispatch(fetchProfileThunk()).catch(() => {});
        }
      } catch { /* profile patch best-effort */ }
    })();

    if (onClose) onClose(opts);
  }, [data, dispatch, onClose]);

  // From the 'offer' step: close onboarding, then ask MobileApp to drop the
  // user straight into a (free) Tape Review. The event is the cross-component
  // bridge — onboarding lives inside HomeScreen, the analyzer in the root.
  // finish() is now synchronous (background persist), so the handoff is instant.
  const launchFirstReview = useCallback(() => {
    // STARTED fires at the actual upload (in TapeReview); here we only persist
    // onboarding + hand off. The offer_shown → started → completed funnel then
    // measures real drop-off, not just CTA taps.
    //
    // The sessionStorage flag is the durable handoff: granting AI consent on
    // the Tape Review screen remounts MobileApp (resetting its in-memory tab),
    // so MobileApp re-reads this flag on every mount and re-asserts the
    // first-review screen. The event covers the immediate (no-remount) case.
    try { window.sessionStorage.setItem('dst_first_review', '1'); } catch { /* noop */ }
    finish({ launchFirstReview: true });
    try { window.dispatchEvent(new CustomEvent('drst-start-first-review')); } catch { /* noop */ }
  }, [finish]);

  // Offer now comes early (right after the name step). Skipping CONTINUES the
  // rest of onboarding (profile → interests → … → notif) instead of ending it,
  // so non-takers still complete their profile. (Plain fn: needs current `i`.)
  const skipFirstReview = () => {
    track('FIRST_REVIEW_SKIPPED');
    next();
  };

  const qIndex = Q_STEPS.indexOf(step);

  return (
    <div className="aurora-orbs aurora-orbs-live" style={{
      // 100dvh + top:0 so the overlay shrinks with the iOS virtual keyboard
      // (inset:0 + 100vh would leave inputs hidden under the keyboard).
      position: 'fixed', top: 0, left: 0, right: 0,
      height: '100dvh',
      zIndex: 1000, overflow: 'hidden',
      background: 'var(--aurora-bg)',
    }}>
      {qIndex >= 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
        }}>
          <TopBar
            step={qIndex + 1}
            total={Q_STEPS.length}
            onBack={back}
            // Always escapable: SKIP exits setup entirely (best-effort persists
            // whatever's entered + marks onboarding seen). A required-step
            // validation a user can't clear (iOS keyboard/focus bug, indecision)
            // must never lock them out of the whole app behind this modal.
            onSkip={() => finish()}
          />
          <div key={step} className="aurora-page-in" style={{
            flex: 1, overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            // Add scroll-margin so focused inputs scroll into view above
            // the keyboard, not pinned at the very top.
            scrollPaddingBottom: '120px',
          }}>
            {step === 'identity' && <Identity data={data} set={set} onNext={next} nameLocked={nameLocked} />}
            {step === 'profile' && <ProfileStep data={data} set={set} onNext={next} />}
            {step === 'interests' && (
              <MultiPicker
                title={"Which roles\nare you chasing?"}
                subtitle="We'll tailor your sides, readers, and coaching to where you audition. Pick all that apply."
                items={ROLES}
                selected={data.interests || []}
                onToggle={(id) => toggle('interests', id)}
                onNext={next}
                min={1}
              />
            )}
            {step === 'goals' && (
              <MultiPicker
                title={"What should we\nhelp you do?"}
                subtitle="Your home screen leads with whatever matters most to you."
                items={GOALS}
                selected={data.goals || []}
                onToggle={(id) => toggle('goals', id)}
                onNext={next}
                min={1}
                useItemTint
              />
            )}
            {step === 'level' && (
              <SinglePicker
                title={"Where are you\nin your career?"}
                subtitle="So we set the right pace for your Craft Journey."
                items={LEVELS}
                value={data.level}
                onPick={(id) => set({ level: id })}
                onNext={next}
              />
            )}
            {step === 'notif' && <Notif onAllow={next} onSkip={next} />}
            {step === 'follow' && <Follow onNext={next} />}
          </div>
        </div>
      )}
      {step === 'building' && <Building onDone={next} />}
      {/* When the free-review flow is on, the welcome CTA advances to the offer
          step instead of finishing; otherwise it closes onboarding as before. */}
      {step === 'welcome' && <Welcome data={data} onDone={finish} />}
      {step === 'offer' && <Offer onTry={launchFirstReview} onSkip={skipFirstReview} />}
    </div>
  );
}
