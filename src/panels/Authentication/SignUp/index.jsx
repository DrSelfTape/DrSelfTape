import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

// Local Imports
import {
  CustomButton,
  CustomCheckbox,
  CustomInput,
} from '../../../components/Shared';
import { validateEmail, validatePassword } from '../../../utils/utils';
import { MIN_SIGNUP_AGE, calculateAge } from '../../../utils/age';
import PasswordRequirements from '../../../components/Shared/PasswordRequirments';
import { registerUser } from '../../../redux/features/auth/authSlice';
import { useSnackbar } from '../../../hooks/useSnackbar';
import AppleSignInButton from '../../../components/Auth/AppleSignInButton';
import { Capacitor } from '@capacitor/core';
import axiosInstance, { setAuthToken } from '../../../redux/http';
import { trackEvent, Events } from '../../../utils/analytics';

const REF_CODE_KEY = 'dst_ref_code';

// Visual language shared with LoginPage.jsx — the signup an ad-clicker lands
// on must smell like the login screen they just saw, not a different app.
const DEEP = '#4A3208';
const TEXT = '#0E0D0A';
const SUB = 'rgba(14,13,10,0.6)';
const DIM = 'rgba(14,13,10,0.4)';

const BG_VIDEO = `${import.meta.env.BASE_URL}login-bg.mp4`;

// Redeem a stored referral code right after registration. Both sides earn
// 50 tokens (POST /v1/growth/referral/apply/ — BE validates self-referral,
// reuse, and the referrer cap). Failure is silent-but-logged: an invalid or
// expired code must never degrade a successful signup.
async function applyStoredReferral(toast) {
  let code = null;
  try { code = localStorage.getItem(REF_CODE_KEY); } catch { /* private mode */ }
  if (!code) return;
  try {
    const res = await axiosInstance.post('/v1/growth/referral/apply/', { code });
    if (res?.data?.success) {
      try { localStorage.removeItem(REF_CODE_KEY); } catch { /* noop */ }
      trackEvent(Events.REFERRAL_APPLIED, { code });
      toast.success('+50 tokens — referral bonus added! 🎁');
    }
  } catch (err) {
    console.warn('Referral apply failed:', err?.response?.data?.message || err?.message);
  }
}

export const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    password: '',
    accountType: { label: 'Actor', value: 'actor' },
    phoneNo: '',
    dateOfBirth: '',
  });
  const fieldRefs = {
    email: useRef(null),
    password: useRef(null),
  };
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  // Respect prefers-reduced-motion: skip the video background entirely so we
  // don't burn battery or trigger vestibular issues. (LoginPage pattern.)
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Some iOS browsers refuse autoplay until the element is in the DOM and
  // muted attributes are confirmed. Kick play() defensively.
  useEffect(() => {
    if (reducedMotion) return;
    const v = videoRef.current;
    if (!v) return;
    v.play?.().catch(() => {});
  }, [reducedMotion]);

  // Capture ?ref= from a shared referral link (the BE share_url points at
  // /signup?ref=CODE). Persisted to localStorage so the code survives the
  // form → register → auto-login transition.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) localStorage.setItem(REF_CODE_KEY, ref.trim().toUpperCase());
    } catch { /* noop */ }
  }, []);

  const handleChange = (e) => {
    let { name, value, type, files } = e.target;

    if (name === 'phoneNo') {
      value = value.replace(/[^0-9+\-\s()]/g, '');
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!validateEmail(formData?.email?.trim())) {
      newErrors.email = 'Invalid Email';
    }

    // Age gate (Terms §1 / COPPA). The server re-validates in
    // apps/users/age.py — this is the friendly pre-flight guard.
    if (!formData?.dateOfBirth) {
      newErrors.dateOfBirth = 'Please enter your date of birth';
    } else {
      const age = calculateAge(formData.dateOfBirth);
      if (new Date(formData.dateOfBirth).getTime() > Date.now()) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      } else if (Number.isNaN(age) || age < MIN_SIGNUP_AGE) {
        newErrors.dateOfBirth = `You must be at least ${MIN_SIGNUP_AGE} to join Dr Self Tape`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField && fieldRefs[firstErrorField]?.current) {
        fieldRefs[firstErrorField].current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      return;
    }

    const registrationPayload = new FormData();
    registrationPayload.append('email', formData?.email?.trim()?.toLowerCase());
    registrationPayload.append('password', formData?.password);
    registrationPayload.append('first_name', formData?.firstName?.trim());
    registrationPayload.append('role', 'actor');
    registrationPayload.append('date_of_birth', formData?.dateOfBirth);

    try {
      setLoading(true);
      const action = dispatch(registerUser(registrationPayload));
      const data = await action;

      if (data?.meta?.requestStatus === 'fulfilled') {
        // Registration auto-logs-in, but the axios Authorization default is
        // only synced by the route guards on navigation — set it here from
        // the fulfilled payload (LoginPage pattern) so the referral apply
        // can't race it.
        const src = data?.payload?.login_data || data?.payload;
        const accessToken = src?.token?.access || src?.token;
        if (accessToken) setAuthToken(accessToken);
        applyStoredReferral(toast);
        setFormData({
          firstName: '',
          email: '',
          password: '',
          accountType: { label: 'Actor', value: 'actor' },
          phoneNo: '',
          dateOfBirth: '',
        });
        setLoading(false);
      } else if (data?.meta?.requestStatus === 'rejected') {
        setLoading(false);
        toast.error(data.payload || 'An error occurred');
      }
    } catch (err) {
      setLoading(false);
      toast.error(typeof err === 'string' ? err : 'An error occurred');
      console.error('Registration failed:', err);
    }
  };

  const passwordValidation = useMemo(
    () => validatePassword(formData?.password),
    [formData?.password]
  );

  const isPasswordValid =
    passwordValidation.length &&
    passwordValidation.upper &&
    passwordValidation.number &&
    passwordValidation.specialChar;

  return (
    <div style={{
      // 100dvh shrinks with the iOS virtual keyboard so the CTA stays
      // reachable while an input is focused (LoginPage pattern).
      minHeight: '100dvh', position: 'relative', overflow: 'hidden',
      background: '#0E0D0A', color: TEXT,
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
    }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />

      {/* Washed-out video background — same asset and treatment as LoginPage.
          Hidden under prefers-reduced-motion; the wash gradient below still
          renders, so the screen never looks bare. */}
      {!reducedMotion && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0E0D0A' }}>
          <video
            ref={videoRef}
            src={BG_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              filter: 'saturate(0.65) brightness(1.06) contrast(0.92)',
              opacity: 0.42,
            }}
          />
        </div>
      )}

      {/* Aurora wash — always renders, regardless of video presence. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          linear-gradient(180deg, rgba(250,250,247,0.55) 0%, rgba(250,250,247,0.30) 32%, rgba(250,250,247,0.62) 70%, rgba(250,250,247,0.96) 100%),
          radial-gradient(70% 45% at 80% 12%, rgba(212,168,95,0.30) 0%, transparent 55%),
          radial-gradient(60% 40% at 0% 38%, rgba(167,214,255,0.30) 0%, transparent 55%),
          radial-gradient(60% 45% at 60% 90%, rgba(159,230,180,0.28) 0%, transparent 55%)
        `,
      }} />

      {/* Fine grain texture for tactility. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: 0.4, mixBlendMode: 'soft-light',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* Content layer — scrolls; the form is taller than the login card. */}
      <div style={{
        position: 'relative', zIndex: 10,
        height: '100dvh',
        display: 'flex', flexDirection: 'column',
        padding: 'calc(env(safe-area-inset-top, 0px) + 28px) 24px calc(env(safe-area-inset-bottom, 0px) + 120px)',
        maxWidth: 460, margin: '0 auto',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Full Dr Self Tape logo — same mark as the login screen. */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img
            src={`${import.meta.env.BASE_URL}logo-black.png`}
            alt="Dr Self Tape"
            style={{
              width: 'min(150px, 38vw)', height: 'auto', display: 'block',
              filter: 'drop-shadow(0 6px 16px rgba(10,10,10,0.12))',
            }}
          />
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: DEEP,
          }}>JOIN DR SELF TAPE</div>

          <h1 style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 'clamp(36px, 10vw, 46px)', lineHeight: 0.98, letterSpacing: '-1px',
            color: TEXT, margin: '12px 0 0', fontWeight: 500,
          }}>
            Create your<br /><em>account.</em>
          </h1>

          {/* The promise the ad made — restated at the highest-intent moment. */}
          <p style={{
            fontSize: 14, color: SUB, lineHeight: 1.5, marginTop: 14, maxWidth: 320,
          }}>
            <span style={{ color: DEEP, fontWeight: 600 }}>Your first AI tape review is free.</span>{' '}
            Casting-grade notes on a real self-tape, minutes after you sign up.
          </p>

          {/* Glass card — same treatment as the login auth card. */}
          <div style={{
            marginTop: 22, borderRadius: 26, padding: 20, position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(160deg, rgba(255,255,255,0.78), rgba(255,255,255,0.58))',
            backdropFilter: 'blur(30px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(30px) saturate(1.6)',
            border: '1px solid rgba(255,255,255,0.65)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 1px 2px rgba(10,10,10,0.05), 0 18px 44px rgba(122,90,24,0.10)',
          }}>
            {/* Apple Sign In leads — one tap beats the form. Hidden on Android
                (no SiwA there). */}
            {Capacitor.getPlatform() !== 'android' && (
              <div style={{ marginBottom: 16 }}>
                <AppleSignInButton
                  onError={(msg) => toast.error(msg)}
                  onSuccess={() => applyStoredReferral(toast)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    color: DIM, letterSpacing: '0.15em',
                  }}>OR SIGN UP WITH EMAIL</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className='space-y-5'>
                <CustomInput
                  label='Full Name'
                  name='firstName'
                  type='text'
                  autoFocus
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder='Your name'
                  required
                />

                <CustomInput
                  label='Email'
                  name='email'
                  type='text'
                  value={formData.email}
                  onChange={handleChange}
                  placeholder='you@email.com'
                  error={!!errors.email}
                  errorMsg={errors.email}
                  required
                  ref={fieldRefs.email}
                />

                <div className='flex flex-col gap-1 relative'>
                  <CustomInput
                    label='Password'
                    name='password'
                    type='password'
                    value={formData.password}
                    onChange={handleChange}
                    placeholder='Create a password'
                    error={!!errors.password}
                    errorMsg={errors.password}
                    required
                    ref={fieldRefs.password}
                  />
                  {formData.password && !isPasswordValid && (
                    <PasswordRequirements
                      passwordValidation={passwordValidation}
                    />
                  )}
                </div>

                <CustomInput
                  label='Date of Birth'
                  name='dateOfBirth'
                  type='date'
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  error={!!errors.dateOfBirth}
                  errorMsg={errors.dateOfBirth}
                  required
                />
              </div>

              <div className='space-y-5 mt-6'>
                <CustomCheckbox
                  type='checkbox'
                  required={true}
                  label={
                    <>
                      I agree to the{' '}
                      <a
                        href='/terms'
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: 'var(--aurora-accent-deep)', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a
                        href='/privacy'
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: 'var(--aurora-accent-deep)', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Privacy Policy
                      </a>
                    </>
                  }
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className='mt-[3px] accent-primary w-4 h-4'
                />

                <div className='flex flex-col gap-3'>
                  {/* Gold pill CTA — matches the login screen's Sign in button. */}
                  <CustomButton
                    disabled={
                      !formData.firstName ||
                      !formData.email ||
                      !formData.password ||
                      !formData.dateOfBirth ||
                      !isPasswordValid ||
                      !agreeTerms
                    }
                    type='submit'
                    loading={loading}
                    sx={{
                      width: '100%',
                      height: '50px',
                      borderRadius: '100px',
                      background: 'linear-gradient(135deg, #C99A4E 0%, #D4A85F 45%, #F0D097 100%)',
                      color: '#1A1408',
                      fontWeight: 600,
                      fontSize: '15px',
                      letterSpacing: '-0.2px',
                      boxShadow: '0 2px 4px rgba(122,90,24,0.25), 0 14px 30px rgba(212,168,95,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 0 0 1px rgba(212,168,95,0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #B98E44 0%, #C99A4E 45%, #E0C087 100%)',
                        boxShadow: '0 2px 4px rgba(122,90,24,0.25), 0 16px 34px rgba(212,168,95,0.5), inset 0 1px 0 rgba(255,255,255,0.6)',
                      },
                      '&:disabled': {
                        background: 'linear-gradient(135deg, #C99A4E 0%, #D4A85F 45%, #F0D097 100%)',
                        color: '#1A1408',
                        opacity: 0.5,
                      },
                    }}
                  >
                    Get Started →
                  </CustomButton>

                  <p className='text-sm text-center' style={{ color: SUB }}>
                    Already have an account?{' '}
                    <button
                      type='button'
                      onClick={() => navigate('/login')}
                      className='font-semibold hover:underline cursor-pointer'
                      style={{ color: DEEP }}
                    >
                      Log in
                    </button>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
