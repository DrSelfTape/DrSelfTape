import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { updateProfileThunk, fetchProfileThunk } from '../../redux/features/profile/profileSlice';
import { patchUserSettings } from '../../redux/features/userSettings/userSettingsSlice';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import useHideMobileHeader from '../../components/Shared/useHideMobileHeader';
import { requestAiConsent } from '../../components/AIConsent/consentRequest';
import SampleReview from './SampleReview';
import { createOnboardingSession } from './onboardingSession';
import { flushPendingPersonalization, pendingKey } from './pendingPersonalization';
import { PLATE_OPTIONS, TAPED_OPTIONS, normalizePersonalization, getOfferCopy, personalizationProperties } from '../../data/onboardingPersonalization';

/* ── Aurora post-signup onboarding flow ────────────────────────────────
 * 3 screens pre-value (Tier 2 item 2): identity + optional context → free-review offer →
 * notifications. The old profile/interests/goals/level/follow steps were
 * cut — their only BE-real data (headshot, bio, union, location, years,
 * genres) is collected post-first-review via the ProfileCompleteness
 * card on Home instead (interests/goals/level never had BE fields; the
 * old flow appended them to the profile PATCH and the serializer dropped
 * them).
 *
 * Mounts as a full-screen overlay above MobileApp content. Replaces the
 * old ReaderOnboardingModal trigger. Those cut step components have now been
 * deleted outright — neither STEPS array reached them in either flag state,
 * so they were ~500 unreachable lines. Home's ProfileCompleteness card is the
 * post-first-review collection surface; rebuild from it, not from here.
 *
 * Persists progress to localStorage so
 * the user can resume if they close mid-flow. Final step PATCHes the
 * profile + sets userSettings.reader_onboarding_seen = true.
 * ─────────────────────────────────────────────────────────────────── */

// Free-first-review onboarding (the Day-0 activation + paywall moment). When
// off, the flow ends at 'welcome' exactly as before. When on, a final 'offer'
// step pitches one free Tape Review, then the analyzer's result carries the
// paywall. Fail-safe ON: the Day-0 flow is enabled unless VITE_FIRST_REVIEW_FLOW
// is explicitly set to "false". The old `=== 'true'` check went silently DORMANT
// whenever the gitignored .env flag was absent from a build; this can't regress
// that way. `.trim()` also survives the "true\n"/"false\n" env-whitespace landmine.
// Kill-switch: set VITE_FIRST_REVIEW_FLOW=false to disable.
const FIRST_REVIEW_FLOW = String(import.meta.env.VITE_FIRST_REVIEW_FLOW ?? 'true').trim() !== 'false';

// Three screens, nothing between the ad click and the aha moment. Flag ON:
// name → free-review offer → notifications (offer-skip continues to notif;
// taking the offer hands straight off to the analyzer). Flag OFF keeps the
// offer terminal, as before, so skipFirstReview's finish() branch still holds.
const STEPS = FIRST_REVIEW_FLOW
  ? ['identity', 'offer', 'notif']
  : ['identity', 'notif', 'offer'];
const Q_STEPS = ['identity', 'notif'];

// Best-effort analytics — mirrors the dynamic-import pattern finish() already
// uses so a missing/blocked analytics bundle never breaks onboarding.
function track(event, props, isCurrent = () => true) {
  import('../../utils/analytics').then(({ trackEvent, Events }) => {
    if (!isCurrent()) return;
    const name = Events[event] || event;
    trackEvent(name, props);
  }).catch(() => { /* analytics unavailable */ });
}

const PRONOUNS = ['she/her', 'he/him', 'they/them', 'other'];
const UNIONS = ['SAG-AFTRA', 'Eligible', 'Non-union'];

const STORAGE_STEP = 'dst_onb_step_v3'; // v3: flow cut to 3 screens — old numeric indices meant different steps, so ignore stale v1/v2 progress (entered data in STORAGE_DATA is preserved)
const STORAGE_DATA = 'dst_onb_data';
const answerPatch = (d) => Object.fromEntries(
  (d.personalization_keys || []).filter(key => ['plate', 'taped_before'].includes(key))
    .map(key => [key, d.onboarding_personalization[key]]),
);

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

/* ───── STEP COMPONENTS ───── */

function Identity({ data, set, onNext, onSkipQuestions, nameLocked, saving }) {
  // First name only. Last name has no bearing on getting a Tape Review, and
  // email signup never asked for one — gating Continue on it stranded every
  // email user on an empty required field. Profile collects it later, the
  // same way it collects the headshot and bio.
  const valid = (data.first_name || '').trim();
  // When the name arrived from Sign in with Apple (or a prior signup), we
  // lock the inputs read-only so Apple's Authentication Services framework
  // remains the only source of name truth (Apple HIG: never re-ask for data
  // SiwA already provided). The user can still change it later from Profile.
  const nameHint = nameLocked ? 'SYNCED FROM YOUR ACCOUNT · EDIT FROM PROFILE LATER' : null;
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
        <Field label="LAST NAME · OPTIONAL" value={data.last_name} onChange={(v) => set({ last_name: v })} placeholder="Okonkwo" disabled={nameLocked} />
      </div>
      <div style={{ marginTop: 16 }}>
        <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.15em', color: 'var(--aurora-dim)' }}>UNION STATUS · OPTIONAL</label>
        <ChipRow options={UNIONS} value={data.union_status} onPick={(v) => set({ union_status: v })} />
      </div>
      <div style={{ marginTop: 16 }}>
        <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.15em', color: 'var(--aurora-dim)' }}>PRONOUNS · OPTIONAL</label>
        <ChipRow options={PRONOUNS} value={data.pronouns} onPick={(v) => set({ pronouns: v })} />
      </div>
      {FIRST_REVIEW_FLOW && <>
      <p style={{ fontSize: 'var(--type-base)', color: 'var(--aurora-sub)', marginTop: 20 }}>Two optional questions to make your first review feel useful.</p>
      {[
        { key: 'plate', label: "What's on your plate?", options: PLATE_OPTIONS },
        { key: 'taped_before', label: 'Taped before?', options: TAPED_OPTIONS },
      ].map(({ key, label, options }) => (
        <fieldset key={key} style={{ margin: '16px 0 0', padding: 0, border: 0 }}>
          <legend style={{ fontSize: 'var(--type-base)', fontWeight: 600, color: 'var(--aurora-text)' }}>{label}</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {options.map(({ value, label: optionLabel }) => {
              const selected = data.onboarding_personalization?.[key] === value;
              return (
                <button key={value} type="button" aria-pressed={selected}
                  onClick={() => set({ onboarding_personalization: { ...data.onboarding_personalization, [key]: selected ? '' : value } })}
                  style={{
                    padding: '12px 14px', minHeight: 44, borderRadius: 100, cursor: 'pointer',
                    border: `1.5px solid ${selected ? 'var(--aurora-heritage-gold)' : 'var(--aurora-line)'}`,
                    background: selected ? 'color-mix(in oklch, var(--aurora-heritage-gold) 18%, transparent)' : 'rgba(255,255,255,0.6)',
                    color: 'var(--aurora-text)', fontFamily: 'inherit', fontSize: 'var(--type-base)',
                    touchAction: 'manipulation',
                  }}
                >{optionLabel}</button>
              );
            })}
          </div>
        </fieldset>
      ))}
      </>}
      <GoldBtn onClick={onNext} disabled={!valid || saving} style={{ marginTop: 26 }}>{saving ? 'Saving…' : 'Continue'}</GoldBtn>
      {FIRST_REVIEW_FLOW && <GhostBtn onClick={onSkipQuestions}>Skip these questions</GhostBtn>}
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

/* The offer — the activation moment. Pitches one free Tape Review right after
 * the welcome celebration, while intent is highest (Day-0 converts best).
 * Two-card guaranteed win (Duolingo's pre-blessed default): "record our
 * practice scene" is preselected + RECOMMENDED so the no-tape/no-sides user —
 * the common case for a brand-new signup — still has a one-tap path to the
 * aha. Both cards terminate at the analyzer; only the variant differs. */
function Offer({ firstName, personalization, onTry, onSkip }) {
  useEffect(() => { track('FIRST_REVIEW_OFFER_SHOWN'); }, []);
  const copy = getOfferCopy(personalization);
  const [variant, setVariant] = useState('record');
  const [sampleOpen, setSampleOpen] = useState(false);
  const sampleLinkRef = useRef(null);
  const closeSample = () => {
    setSampleOpen(false);
    requestAnimationFrame(() => sampleLinkRef.current?.focus());
  };
  const cards = [
    {
      id: 'record', emoji: '🎬', badge: 'RECOMMENDED',
      title: 'Record our 30-second practice scene',
      desc: 'We give you the lines. Read them once, tape it, get casting notes.',
    },
    {
      id: 'upload', emoji: '📼', badge: null,
      title: 'I have my own tape or sides',
      desc: 'Upload any take you already have. An old monologue, even a rough one.',
    },
  ];
  return (
    <>
    <div className="aurora-orbs aurora-orbs-live" style={{
      position: 'absolute', inset: 0, overflow: 'hidden', display: sampleOpen ? 'none' : 'flex', flexDirection: 'column',
    }}>
      {/* Safe-center: margin-auto bookends instead of justify-center, plus
          overflow-y — the two offer cards make this column taller than a
          667pt iPhone, and a centered flex column that overflows clips from
          BOTH ends with no scroll. */}
      <div style={{
        position: 'relative', zIndex: 5, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '0 30px', textAlign: 'center',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: 30, marginTop: 'auto', flexShrink: 0,
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
        }}>{FIRST_REVIEW_FLOW ? copy.headline : <>Get casting notes<br />on any take. Free.</>}</h1>
        <p style={{ fontSize: 14, color: 'var(--aurora-sub)', marginTop: 14, lineHeight: 1.5, maxWidth: 320 }}>
          {FIRST_REVIEW_FLOW ? copy.body : <>Know how your tape reads before casting ever sees it. Jericho scores
          your performance, framing, and eyeline, then names the one fix that
          books the room.</>}
        </p>
        {/* 3-step expectation strip (pliability pattern): show the destination
            before the ask, so the camera request reads as a step toward
            casting notes instead of a cost. */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexShrink: 0,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.04em',
          color: 'var(--aurora-sub)',
        }}>
          <span>① Frame your shot</span>
          <span style={{ opacity: 0.4 }}>→</span>
          <span>② Record 30 sec</span>
          <span style={{ opacity: 0.4 }}>→</span>
          <span style={{ color: 'var(--aurora-accent-deep)', fontWeight: 700 }}>③ Casting notes</span>
        </div>
        <div style={{ margin: '20px 0 auto', textAlign: 'left', maxWidth: 320, width: '100%', flexShrink: 0 }}>
          {cards.map((c) => {
            const selected = variant === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setVariant(c.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 14px', marginBottom: 10, borderRadius: 16, cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit',
                  background: selected
                    ? 'color-mix(in oklch, var(--aurora-heritage-gold) 18%, transparent)'
                    : 'rgba(255,255,255,0.35)',
                  border: selected
                    ? '2px solid var(--aurora-heritage-gold)'
                    : '2px solid rgba(255,255,255,0.5)',
                  boxShadow: selected ? '0 6px 18px rgba(212,168,95,0.25)' : 'none',
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1.2 }}>{c.emoji}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--aurora-text)' }}>{c.title}</span>
                    {c.badge && (
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700,
                        letterSpacing: '0.12em', padding: '3px 7px', borderRadius: 100,
                        background: 'var(--aurora-mint)', color: '#1A1408',
                      }}>{c.badge}</span>
                    )}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--aurora-sub)', marginTop: 3, lineHeight: 1.45 }}>
                    {c.desc}
                  </span>
                </span>
              </button>
            );
          })}
          <button
            ref={sampleLinkRef}
            type="button"
            onClick={() => {
              track('FIRST_REVIEW_SAMPLE_VIEWED');
              setSampleOpen(true);
            }}
            className="text-xs underline"
            style={{
              display: 'block', margin: '0 auto', padding: '12px 4px',
              background: 'none', border: 'none', color: 'var(--aurora-sub)',
              cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation',
            }}
          >See what a review looks like</button>
        </div>
      </div>
      <div style={{
        position: 'relative', zIndex: 5,
        padding: '0 26px calc(env(safe-area-inset-bottom, 0px) + 38px)',
      }}>
        <GoldBtn onClick={() => onTry(variant)}>Get my free review →</GoldBtn>
        {/* Skip demoted from a peer ghost button to a quiet text link — the
            offer→skip funnel showed 57% taking the equal-weight "Maybe later".
            The upload path is the one CTA; "Not now" is the low-emphasis exit. */}
        <button
          onClick={onSkip}
          style={{
            display: 'block', margin: '16px auto 0', padding: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            // No opacity dimming here: at 0.65 this renders ~2.72:1 against
            // the ivory plate and fails WCAG AA (tests/accessibility.browser).
            // The skip stays de-emphasised by being plain text next to a gold
            // button — it does not need to be unreadable to be quiet.
            fontFamily: 'inherit', fontSize: 13, color: 'var(--aurora-sub)',
          }}
        >Not now</button>
      </div>
    </div>
    {sampleOpen && (
      <SampleReview
        firstName={firstName}
        onClose={closeSample}
        onTry={(chosenVariant) => {
          track('FIRST_REVIEW_SAMPLE_CTA', { variant: chosenVariant });
          return onTry(chosenVariant);
        }}
      />
    )}
    </>
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
  const store = useStore();
  const session = useRef(null);
  const personalizationSave = useRef(null);
  const transitioning = useRef(false);
  const launching = useRef(false);
  const [saving, setSaving] = useState(false);
  // Apple guideline 4 / Sign in with Apple HIG: if Authentication Services
  // already provided the user's name, never re-ask. We seed the onboarding
  // form from the logged-in user so the Identity step renders pre-filled
  // and read-only when first_name + last_name are present.
  const authUser = useSelector((s) => s?.auth?.user) || {};
  const profile = useSelector((s) => s?.profile?.profile);
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
    if (FIRST_REVIEW_FLOW && saved.personalization_user_id && saved.personalization_user_id !== String(authUser.id)) saved = {};
    // Logout clears the legacy, unscoped draft. Unacknowledged answers have
    // their own account key so they survive cancellation and can be retried
    // only when their originating actor signs back in.
    if (FIRST_REVIEW_FLOW && authUser.id) {
      try {
        const pending = JSON.parse(window.localStorage.getItem(pendingKey(authUser.id)));
        if (pending) saved = { ...saved, personalization_user_id: String(authUser.id),
          onboarding_personalization: normalizePersonalization(pending),
          personalization_keys: Object.keys(pending), personalization_touched: Object.keys(pending),
          personalization_pending: true };
      } catch { /* storage unavailable */ }
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
      // The older draft contains names without an owner key. Only reuse the
      // new answers when they belong to this account on a shared device.
      ...(FIRST_REVIEW_FLOW ? {
      onboarding_personalization: normalizePersonalization(
        authUser.id && saved.personalization_user_id === String(authUser.id)
          ? saved.onboarding_personalization
          : (String(profile?.id) === String(authUser.id) ? profile?.onboarding_personalization : null),
      ),
      personalization_keys: authUser.id && saved.personalization_user_id === String(authUser.id)
        ? (saved.personalization_keys || Object.keys(saved.onboarding_personalization || {}))
        : (String(profile?.id) === String(authUser.id) ? Object.keys(profile?.onboarding_personalization || {}) : []),
      } : {}),
    };
  });
  const dataRef = useRef(data);
  const touched = useRef(new Set(data.personalization_touched || (
    data.personalization_user_id === String(authUser.id) ? data.personalization_keys : []
  )));
  useEffect(() => {
    const scope = createOnboardingSession(store);
    session.current = scope;
    return () => scope.dispose();
  }, [store]);

  // Keep hydration separate from edits. A late GET may fill an untouched
  // answer, but cannot undo a selection or an explicit deselection/skip.
  useEffect(() => {
    if (!FIRST_REVIEW_FLOW || !authUser.id || String(profile?.id) !== String(authUser.id) || !session.current?.current()) return;
    const answers = normalizePersonalization(profile.onboarding_personalization);
    const current = dataRef.current;
    const hydrated = { ...current.onboarding_personalization };
    const keys = new Set(current.personalization_keys);
    for (const key of Object.keys(profile.onboarding_personalization || {})) {
      if (!touched.current.has(key) && key in answers) { hydrated[key] = answers[key]; keys.add(key); }
    }
    const nd = { ...current, onboarding_personalization: hydrated, personalization_keys: [...keys] };
    dataRef.current = nd;
    setData(nd);
  }, [profile, authUser.id]);
  const nameLocked = !!(authUser.first_name && authUser.last_name);

  const step = STEPS[i];
  const go = (n) => {
    if (FIRST_REVIEW_FLOW && transitioning.current) return;
    const next = Math.max(0, Math.min(STEPS.length - 1, n));
    setI(next);
    try { window.localStorage.setItem(STORAGE_STEP, String(next)); } catch { /* storage unavailable */ }
  };
  const next = () => go(i + 1);
  const back = () => {
    // 'offer' is a forward-only interstitial — Back should step over it
    // (e.g. notif → identity, not notif → offer) so there's no offer↔notif loop.
    let t = i - 1;
    if (STEPS[t] === 'offer') t -= 1;
    go(Math.max(0, t));
  };

  const set = (patch) => {
    if (FIRST_REVIEW_FLOW && (!session.current?.current() || transitioning.current)) return;
    const d = dataRef.current;
    if (FIRST_REVIEW_FLOW && patch.onboarding_personalization) {
      for (const key of Object.keys(patch.onboarding_personalization)) {
        if (patch.onboarding_personalization[key] !== d.onboarding_personalization[key]) touched.current.add(key);
      }
    }
    const nd = { ...d, ...patch, ...(FIRST_REVIEW_FLOW ? {
      personalization_user_id: String(authUser.id || ''),
      personalization_touched: [...touched.current],
      personalization_keys: [...new Set([...(d.personalization_keys || []), ...touched.current])],
    } : {}) };
    dataRef.current = nd;
    setData(nd);
    try { window.localStorage.setItem(STORAGE_DATA, JSON.stringify(nd)); } catch { /* storage unavailable */ }
    if (FIRST_REVIEW_FLOW && nd.personalization_pending) {
      try { window.localStorage.setItem(pendingKey(authUser.id), JSON.stringify(answerPatch(nd))); } catch { /* storage unavailable */ }
    }
  };
  const persistPersonalization = useCallback(() => {
    if (personalizationSave.current) return personalizationSave.current;
    const scope = session.current;
    if (!FIRST_REVIEW_FLOW || !scope?.current()) return Promise.resolve(false);
    const pending = (async () => {
      while (scope.current() && dataRef.current.personalization_pending) {
        // Omit answers that have not hydrated. A blank would clear a value
        // saved on another device. Snapshot each attempt so a late ACK cannot
        // discard edits made while a resumed request was in flight.
        const payload = JSON.stringify(answerPatch(dataRef.current));
        if (!await scope.wait(flushPendingPersonalization(store, dispatch, payload)) || !scope.current()) return false;
        if (payload !== JSON.stringify(answerPatch(dataRef.current))) continue;
        const nd = { ...dataRef.current, personalization_pending: false };
        dataRef.current = nd;
        setData(nd);
        try {
          window.localStorage.setItem(STORAGE_DATA, JSON.stringify(nd));
        } catch { /* storage unavailable */ }
      }
      return scope.current();
    })().finally(() => { if (personalizationSave.current === pending) personalizationSave.current = null; });
    personalizationSave.current = pending;
    return pending;
  }, [dispatch, store]);

  useEffect(() => {
    // Resuming an interrupted offer also retries. launchFirstReview waits on
    // this request before opening consent; retries cannot race that POST.
    if (FIRST_REVIEW_FLOW && dataRef.current.personalization_pending) persistPersonalization();
  }, [persistPersonalization]);

  const continueIdentity = async (skipQuestions = false) => {
    if (transitioning.current || !session.current?.current()) return;
    const answers = normalizePersonalization(skipQuestions ? null : dataRef.current.onboarding_personalization);
    if (skipQuestions) { touched.current.add('plate'); touched.current.add('taped_before'); }
    set({ onboarding_personalization: answers, personalization_pending: true });
    transitioning.current = true;
    setSaving(true);
    track('onboarding_personalized', { $set: personalizationProperties(answers) }, session.current.current);
    await persistPersonalization();
    if (!session.current.current()) return;
    transitioning.current = false;
    setSaving(false);
    next();
  };

  const finishLegacy = useCallback((opts) => {
    const scope = session.current;
    if (!scope?.current()) return;
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
    void scope.wait((async () => {
      try {
        if (!session.current?.current()) return;
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
        if (hasAny && session.current?.current()) {
          await session.current.run(dispatch, updateProfileThunk(fd));
          if (session.current.current()) await session.current.run(dispatch, fetchProfileThunk());
        }
      } catch { /* profile patch best-effort */ }
    })());

    if (onClose) onClose(opts);
  }, [data, dispatch, onClose]);

  const finishPersonalized = async (opts) => {
    const scope = session.current;
    if (transitioning.current || !scope?.current()) return false;
    if (step === 'identity') {
      set({ personalization_pending: true });
      track('onboarding_personalized', { $set: personalizationProperties(dataRef.current.onboarding_personalization) }, scope.current);
    }
    transitioning.current = true;
    setSaving(true);
    // Settle answers before the AI handoff. The identity save below continues
    // after close, just as in the legacy flow; unmount is not session loss.
    const answersSaved = await persistPersonalization();
    if (!scope.current()) return false;
    const d = dataRef.current;
    const fd = new FormData();
    for (const key of ['first_name', 'last_name', 'city', 'bio', 'pronouns', 'union_status', 'representation']) {
      if (d[key]) fd.append(key, d[key]);
    }
    void (async () => {
      const profileSaved = ![...fd.keys()].length || await scope.run(dispatch, updateProfileThunk(fd));
      if (!scope.current()) return;
      if (answersSaved && profileSaved) {
        dispatch(patchUserSettings({ reader_onboarding_seen: true }));
        try {
          window.localStorage.removeItem(STORAGE_STEP);
          window.localStorage.removeItem(STORAGE_DATA);
        } catch { /* storage unavailable */ }
      }
    })();
    // Failed answers remain account-scoped for the app-level retry, even if
    // desktop Home independently marks onboarding seen on the server.
    transitioning.current = false;
    setSaving(false);
    if (opts?.launchFirstReview) {
      try {
        window.sessionStorage.setItem('dst_first_review', '1');
        window.sessionStorage.setItem('dst_first_review_variant', opts.variant || 'upload');
      } catch { /* storage unavailable */ }
    }
    onClose?.(opts);
    return true;
  };
  const finish = FIRST_REVIEW_FLOW ? finishPersonalized : finishLegacy;

  // From the 'offer' step: close onboarding, then ask MobileApp to drop the
  // user straight into a (free) Tape Review. The event is the cross-component
  // bridge — onboarding lives inside HomeScreen, the analyzer in the root.
  // The enabled flow settles its bounded saves before handing off.
  const launchFirstReview = async (variant = 'upload') => {
    const scope = session.current;
    if (launching.current || transitioning.current || !scope?.current()) return;
    launching.current = true;
    try {
    if (FIRST_REVIEW_FLOW) await personalizationSave.current;
    if (!scope.current()) return;
    track('FIRST_REVIEW_OFFER_TAPPED', { variant });
    // H-05: stamp the entry path so first_review_started/_upload_shown/
    // _completed can be attributed to onboarding vs the Home hero.
    try {
      import('../../utils/firstReviewFunnel').then(
        ({ markFirstReviewEntry, FIRST_REVIEW_SOURCE_ONBOARDING }) =>
          markFirstReviewEntry(FIRST_REVIEW_SOURCE_ONBOARDING),
      ).catch(() => {});
    } catch { /* noop */ }
    // De-stack the pre-upload interstitials: resolve AI consent HERE, while
    // onboarding is still on screen, instead of letting TapeReview's useAIGate
    // stack the consent modal on top of the fresh first-review screen (and
    // remount MobileApp mid-handoff). The global modal resolves instantly if
    // consent is already on file. A decline continues the rest of onboarding —
    // TapeReview's gate would bounce a non-consenting user home anyway.
    // (Plain fn, not useCallback: the decline path needs the current step
    // index via skipFirstReview.)
    let ok = false;
    try { ok = await requestAiConsent(); } catch { ok = false; }
    if (!scope.current()) return;
    if (!ok) {
      // Consent decline is its OWN funnel drop — distinct from a deliberate
      // "maybe later" skip. Splitting them tells us whether the leak is the
      // consent wall or genuine disinterest.
      skipFirstReview('consent');
      return;
    }
    // STARTED fires at the actual upload (in TapeReview); here we only persist
    // onboarding + hand off. The offer_shown → started → completed funnel then
    // measures real drop-off, not just CTA taps.
    //
    // The sessionStorage flag is the durable handoff: consent is granted
    // above now, but the flag still guards any MobileApp remount between here
    // and the upload (e.g. the BE-403 consent path), so MobileApp re-reads it
    // on every mount and re-asserts the first-review screen. The event covers
    // the immediate (no-remount) case.
    if (!FIRST_REVIEW_FLOW) try { window.sessionStorage.setItem('dst_first_review', '1'); } catch { /* noop */ }
    // Which offer card was chosen. TapeReview reads this once in firstReview
    // mode: 'record' prefills the bundled practice sides and promotes the
    // record button to primary; 'upload' keeps the classic upload emphasis.
    if (FIRST_REVIEW_FLOW) {
      if (!await finish({ launchFirstReview: true, variant })) return;
    } else {
      try { window.sessionStorage.setItem('dst_first_review_variant', variant); } catch { /* noop */ }
      finish({ launchFirstReview: true });
    }
    try { window.dispatchEvent(new CustomEvent('drst-start-first-review')); } catch { /* noop */ }
    } finally { launching.current = false; }
  };

  // Offer now comes early (right after the name step). Skipping CONTINUES the
  // rest of onboarding (→ notif) instead of ending it, so non-takers still
  // land on the notification ask. (Plain fn: needs current `i`.)
  const skipFirstReview = (reason) => {
    track(reason === 'consent' ? 'FIRST_REVIEW_CONSENT_DECLINED' : 'FIRST_REVIEW_SKIPPED');
    // Advance into the rest of onboarding — but finish() if 'offer' is the LAST
    // step (flag-off safety: offer is terminal there, so next() would clamp and
    // trap the user on the offer forever).
    if (i + 1 >= STEPS.length) finish(); else next();
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
            {step === 'identity' && <Identity data={data} set={set} onNext={FIRST_REVIEW_FLOW ? () => continueIdentity() : next} onSkipQuestions={() => continueIdentity(true)} nameLocked={nameLocked} saving={saving} />}
            {/* notif is the LAST step when the free-review flow is on — advance
                via finish() there, since next() would clamp and trap the user. */}
            {step === 'notif' && (
              <Notif
                onAllow={() => (i + 1 >= STEPS.length ? finish() : next())}
                onSkip={() => (i + 1 >= STEPS.length ? finish() : next())}
              />
            )}
          </div>
        </div>
      )}
      {step === 'offer' && <Offer firstName={data.first_name} personalization={data.onboarding_personalization} onTry={launchFirstReview} onSkip={skipFirstReview} />}
    </div>
  );
}
