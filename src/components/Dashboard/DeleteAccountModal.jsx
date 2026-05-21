import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../redux/http';
import { performLogout } from '../../redux/features/auth/authSlice';

/**
 * Account deletion modal.
 *
 * Apple Guideline 5.1.1(V) requires apps that support account creation
 * to ALSO provide an in-app deletion path. Backend hard-deletes the
 * user (and via CASCADE relationships, their scripts/auditions/etc.)
 * and scrubs PII fields before the row is removed.
 *
 * UX safeguards before we fire the request:
 *  - User must type their email to confirm (prevents accidental tap)
 *  - Clear copy about what gets deleted
 *  - "What you'll lose" list — no surprises
 */
const DeleteAccountModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth?.user);
  const userEmail = user?.email || '';

  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const canSubmit =
    !loading && confirmText.trim().toLowerCase() === userEmail.toLowerCase();

  const handleDelete = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await axiosInstance.delete('/v1/users/account/', {
        data: { confirm_email: userEmail },
      });
      // Server has scrubbed + deleted the row; lock the client out too.
      await dispatch(performLogout());
      navigate('/login');
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Couldn't delete the account right now. Please try again in a minute, or email info@drselftapes.com."
      );
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(10,10,10,0.55)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        style={{
          background: 'var(--aurora-surface-solid, #FFFFFF)',
          border: '1px solid var(--aurora-line, rgba(10,10,10,0.08))',
          borderRadius: 20,
          padding: 28,
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 30px 60px rgba(10,10,10,0.25)',
        }}
      >
        <h2 className="aurora-display" style={{
          fontSize: 24, color: 'var(--aurora-text)',
          margin: 0, marginBottom: 12, letterSpacing: '-0.02em',
        }}>
          Delete your account?
        </h2>
        <p style={{ fontSize: 14, color: 'var(--aurora-sub)', margin: 0, marginBottom: 20, lineHeight: 1.5 }}>
          This permanently removes your account and everything tied to it. You can't undo it.
        </p>

        <ul style={{
          fontSize: 13, color: 'var(--aurora-sub)',
          padding: '14px 16px', margin: 0, marginBottom: 20,
          background: 'rgba(255,128,128,0.06)',
          border: '1px solid rgba(255,128,128,0.18)',
          borderRadius: 12,
          listStyle: 'none',
        }}>
          <li style={{ marginBottom: 4 }}>• Profile, headshot, bio, union</li>
          <li style={{ marginBottom: 4 }}>• Scripts, scenes, recordings, journal entries</li>
          <li style={{ marginBottom: 4 }}>• Auditions, submissions, callbacks</li>
          <li style={{ marginBottom: 4 }}>• Match history and reader connections</li>
          <li>• Any active subscription tied to this account</li>
        </ul>

        <p style={{ fontSize: 12, color: 'var(--aurora-dim)', margin: 0, marginBottom: 8 }}>
          Type <strong style={{ color: 'var(--aurora-text)' }}>{userEmail}</strong> to confirm.
        </p>
        <input
          type="email"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="your.email@example.com"
          autoComplete="off"
          style={{
            width: '100%', height: 44, padding: '0 14px',
            border: '1px solid var(--aurora-line, rgba(10,10,10,0.12))',
            borderRadius: 10, fontSize: 14, color: 'var(--aurora-text)',
            background: '#FFFFFF', outline: 'none', marginBottom: 16,
          }}
        />

        {error && (
          <div style={{
            fontSize: 12, color: '#B0001B', marginBottom: 12,
            background: 'rgba(255,40,40,0.07)', padding: '8px 12px', borderRadius: 8,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, height: 44, borderRadius: 22,
              border: '1px solid var(--aurora-line, rgba(10,10,10,0.12))',
              background: '#FFFFFF',
              color: 'var(--aurora-text)',
              fontWeight: 600, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canSubmit}
            style={{
              flex: 1, height: 44, borderRadius: 22, border: 'none',
              background: canSubmit ? '#B0001B' : 'rgba(176,0,27,0.35)',
              color: '#FFFFFF',
              fontWeight: 600, fontSize: 14,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
