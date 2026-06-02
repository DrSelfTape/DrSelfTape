import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { Flag, ShieldOff, X, Loader2 } from 'lucide-react';
import http from '../../redux/http';
import { baseURL } from '../../redux/constant';
import { showSnackbar } from '../../redux/features/snackbarSlice/snackbarSlice';
import { fetchAvailableReaders, fetchMatches } from '../../redux/features/readers/readersMatchSlice';

/**
 * ReportBlockMenu — Apple guideline 1.2 flag + block controls.
 *
 * Two flows surfaced as a single overflow control:
 *   • Report (flag): posts a ContentReport to BE; the admin inbox sees it.
 *   • Block: posts a UserBlock; the blocked user immediately disappears
 *     from the caller's matches + swipe deck (BE-side filter).
 *
 * Pass `targetType="user"` + `targetUserId` for direct user reports
 * (Reader profile, chat header), or `targetType="message"` + `targetObjectId`
 * to flag a single message. `targetUserId` is still required for blocking.
 */
const REASONS = [
  { value: 'harassment',   label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam',         label: 'Spam or scam' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'hate_speech',  label: 'Hate speech' },
  { value: 'other',        label: 'Other' },
];

export default function ReportBlockMenu({
  targetType = 'user',
  targetUserId,
  targetObjectId = null,
  targetName = 'this user',
  variant = 'icon', // 'icon' | 'inline'
  align = 'right',
}) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'report' | 'block' | null
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const closeAll = () => { setOpen(false); setMode(null); setReason(''); setDetails(''); };

  const handleSubmitReport = async () => {
    if (!reason || submitting) return;
    // Guard against rendering with a missing user id — the BE would
    // 400 and the user would just see a generic toast. Bail early.
    if (targetType === 'user' && !targetUserId) {
      dispatch(showSnackbar({
        message: "Couldn't load this user's info — please try again.",
        variant: 'error',
      }));
      return;
    }
    if (targetType !== 'user' && !targetObjectId) {
      dispatch(showSnackbar({
        message: "Couldn't identify the content to report.",
        variant: 'error',
      }));
      return;
    }
    setSubmitting(true);
    try {
      await http.post(`${baseURL}/v1/community/report/`, {
        target_type: targetType,
        target_user_id: targetType === 'user' ? targetUserId : undefined,
        target_object_id: targetType !== 'user' ? targetObjectId : undefined,
        reason,
        details,
      });
      dispatch(showSnackbar({
        message: 'Thanks — our team will review this.',
        variant: 'success',
      }));
      closeAll();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not submit report. Please try again.';
      dispatch(showSnackbar({ message: msg, variant: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBlock = async () => {
    if (submitting) return;
    if (!targetUserId) {
      dispatch(showSnackbar({
        message: "Couldn't load this user's info — please try again.",
        variant: 'error',
      }));
      return;
    }
    setSubmitting(true);
    try {
      await http.post(`${baseURL}/v1/community/block/`, {
        user_id: targetUserId,
        reason: reason || undefined,
      });
      dispatch(showSnackbar({
        message: `${targetName} has been blocked. Their content won't appear in your feeds.`,
        variant: 'success',
      }));
      // Refresh feeds so the blocked user disappears immediately.
      dispatch(fetchAvailableReaders());
      dispatch(fetchMatches());
      closeAll();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not block user. Please try again.';
      dispatch(showSnackbar({ message: msg, variant: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const triggerButton = variant === 'inline' ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="aurora-mono"
      style={{
        background: 'transparent',
        border: '1px solid var(--aurora-line)',
        borderRadius: 100,
        padding: '6px 12px',
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--aurora-sub)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Flag size={11} /> Report / Block
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Report or block"
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '1px solid var(--aurora-line)',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--aurora-sub)',
        cursor: 'pointer',
      }}
    >
      <Flag size={14} />
    </button>
  );

  const sheet = open && createPortal(
    <>
      <div
        onClick={closeAll}
        style={{
          position: 'fixed', inset: 0, zIndex: 120,
          background: 'rgba(10,10,10,0.45)',
          backdropFilter: 'blur(6px)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          left: 0, right: 0,
          bottom: 0,
          zIndex: 130,
          padding: '20px 22px calc(env(safe-area-inset-bottom, 0px) + 24px)',
          background: 'var(--aurora-surface-solid)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: '0 -20px 60px rgba(10,10,10,0.25)',
          maxHeight: '85vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <span className="aurora-eyebrow" style={{ color: 'var(--aurora-dim)' }}>SAFETY</span>
            <h3 className="aurora-display" style={{ fontSize: 20, color: 'var(--aurora-text)', letterSpacing: '-0.3px', marginTop: 2 }}>
              {mode === 'block' ? `Block ${targetName}?` : mode === 'report' ? 'Tell us what happened' : `Report or block ${targetName}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeAll}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(10,10,10,0.04)', border: 'none',
              color: 'var(--aurora-sub)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => setMode('report')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 14,
                border: '1px solid var(--aurora-line)',
                background: 'rgba(10,10,10,0.02)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <Flag size={18} color="var(--aurora-heritage-gold-deep)" />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--aurora-text)' }}>Report</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--aurora-sub)' }}>
                  Send to our review team. They&apos;ll see it within a few hours.
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode('block')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 14,
                border: '1px solid rgba(255,130,128,0.30)',
                background: 'rgba(255,130,128,0.08)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <ShieldOff size={18} color="var(--aurora-coral-deep, #C05957)" />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--aurora-text)' }}>
                  Block {targetName}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--aurora-sub)' }}>
                  Hide them from your feed and matches immediately.
                </p>
              </div>
            </button>
          </div>
        )}

        {(mode === 'report' || mode === 'block') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="aurora-eyebrow" style={{ color: 'var(--aurora-dim)', margin: 0 }}>REASON</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {REASONS.map((r) => {
                const on = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1px solid ${on ? 'var(--aurora-heritage-gold)' : 'var(--aurora-line)'}`,
                      background: on ? 'rgba(212,168,95,0.12)' : 'var(--aurora-surface-solid)',
                      color: 'var(--aurora-text)',
                      fontSize: 14,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {mode === 'report' && (
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder="Add any context that would help our review (optional)"
                rows={3}
                style={{
                  border: '1px solid var(--aurora-line)',
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 13,
                  background: 'rgba(10,10,10,0.02)',
                  color: 'var(--aurora-text)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            )}

            <button
              type="button"
              onClick={mode === 'block' ? handleSubmitBlock : handleSubmitReport}
              disabled={!reason || submitting}
              style={{
                marginTop: 8,
                width: '100%',
                padding: 14,
                borderRadius: 14,
                border: 'none',
                background: mode === 'block'
                  ? 'var(--aurora-coral, #FF8280)'
                  : 'linear-gradient(135deg, var(--aurora-heritage-gold-light) 0%, var(--aurora-heritage-gold) 55%, var(--aurora-heritage-gold-deep) 100%)',
                color: '#FFF',
                fontSize: 15,
                fontWeight: 600,
                cursor: !reason || submitting ? 'not-allowed' : 'pointer',
                opacity: !reason || submitting ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {mode === 'block' ? `Block ${targetName}` : 'Submit report'}
            </button>
            <button
              type="button"
              onClick={() => { setMode(null); setReason(''); setDetails(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--aurora-sub)',
                fontSize: 13,
                cursor: 'pointer',
                padding: 8,
              }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );

  return (
    <>
      {triggerButton}
      {sheet}
    </>
  );
}
