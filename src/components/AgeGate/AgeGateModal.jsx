/**
 * AgeGateModal — Terms §1 / COPPA age verification.
 *
 * Mounted once at app root. Opens automatically for any authenticated
 * user whose `date_of_birth` is NULL — i.e. Sign-in-with-Apple accounts
 * (Apple never supplies a birthdate) and accounts created before the DOB
 * field shipped. Email signups collect DOB on the form, so they never
 * see this.
 *
 * Real enforcement is server-side (apps/users/age.py + the
 * /v1/users/date-of-birth/ endpoint, which rejects under-MIN_SIGNUP_AGE
 * and refuses to overwrite a stored value). This modal is the in-product
 * capture surface. There is intentionally no "skip" — a user must supply
 * a qualifying birthdate or log out.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';

import axiosInstance from '../../redux/http';
import { logoutUser, setDateOfBirth } from '../../redux/features/auth/authSlice';
import { MIN_SIGNUP_AGE, calculateAge, meetsMinAge } from '../../utils/age';

const PRIMARY_GOLD = '#D4A85F';
const DEEP_GOLD = '#7A5A18';

export default function AgeGateModal() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s?.auth?.user);
  const isAuthenticated = useSelector((s) => s?.auth?.isAuthenticated);

  const [dob, setDob] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Open whenever we have an authenticated user with no birthdate on file.
  const needsGate = !!(isAuthenticated && user?.id && !user?.date_of_birth);

  useEffect(() => {
    if (!needsGate) {
      setError('');
      setDob('');
    }
  }, [needsGate]);

  if (!needsGate) return null;

  const onSubmit = async () => {
    setError('');
    if (!dob) {
      setError('Please enter your date of birth.');
      return;
    }
    if (new Date(dob).getTime() > Date.now()) {
      setError('Date of birth cannot be in the future.');
      return;
    }
    if (!meetsMinAge(dob)) {
      setError(`You must be at least ${MIN_SIGNUP_AGE} years old to use Dr Self Tape.`);
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axiosInstance.post('/v1/users/date-of-birth/', {
        date_of_birth: dob,
      });
      const stored = data?.data?.date_of_birth || data?.date_of_birth || dob;
      dispatch(setDateOfBirth(stored));
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          'Could not save your date of birth. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onLogout = () => dispatch(logoutUser());

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        background: 'rgba(14, 12, 8, 0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 420,
        maxHeight: 'calc(100dvh - 40px)',
        background: '#FFFDF8',
        borderRadius: 20,
        border: '1px solid rgba(212, 168, 95, 0.35)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '22px 22px 6px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: '0.18em', color: DEEP_GOLD,
          }}>ONE QUICK THING</div>
          <h2 id="age-gate-title" style={{
            margin: '6px 0 0',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px',
            color: '#1A1612', lineHeight: 1.2,
          }}>
            Confirm your date of birth
          </h2>
          <p style={{
            margin: '10px 0 0',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13, color: 'rgba(26,22,18,0.78)', lineHeight: 1.5,
          }}>
            Dr Self Tape requires members to be at least {MIN_SIGNUP_AGE} years
            old. Enter your date of birth to continue — we only use it to verify
            your age.
          </p>
        </div>

        <div style={{ padding: '14px 22px 6px' }}>
          <label
            htmlFor="age-gate-dob"
            style={{
              display: 'block', marginBottom: 6,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.14em', color: DEEP_GOLD,
            }}
          >DATE OF BIRTH</label>
          <input
            id="age-gate-dob"
            type="date"
            value={dob}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => { setDob(e.target.value); setError(''); }}
            style={{
              width: '100%', height: 48, padding: '0 14px',
              borderRadius: 12,
              border: '1px solid rgba(212, 168, 95, 0.4)',
              background: '#fff',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 15, color: '#1A1612',
            }}
          />
          {dob && !Number.isNaN(calculateAge(dob)) && (
            <div style={{
              marginTop: 6,
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12, color: 'rgba(26,22,18,0.6)',
            }}>Age: {calculateAge(dob)}</div>
          )}
        </div>

        {error && (
          <div style={{ padding: '4px 22px 0', color: '#B23A48', fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{
          padding: '16px 22px 22px',
          display: 'flex', flexDirection: 'column', gap: 10,
          background: '#FFFDF8',
          borderTop: '1px solid rgba(212, 168, 95, 0.18)',
          marginTop: 12,
        }}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !dob}
            style={{
              width: '100%', padding: '14px 0',
              borderRadius: 100,
              background: PRIMARY_GOLD,
              border: 'none',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14, fontWeight: 700, color: '#0E0D0A',
              cursor: submitting || !dob ? 'not-allowed' : 'pointer',
              opacity: submitting || !dob ? 0.55 : 1,
            }}
          >{submitting ? 'Saving…' : 'Continue'}</button>
          <button
            type="button"
            onClick={onLogout}
            disabled={submitting}
            style={{
              width: '100%', padding: '10px 0',
              borderRadius: 100,
              background: 'transparent', border: 'none',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13, fontWeight: 600, color: 'rgba(26,22,18,0.55)',
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >Log out</button>
        </div>
      </div>
    </div>
  );

  // Portal to body — escapes the `.aurora-orbs` stacking context and
  // paints above MobileApp's top/bottom bars (zIndex 50), same as the
  // AI consent modal.
  return createPortal(node, document.body);
}
