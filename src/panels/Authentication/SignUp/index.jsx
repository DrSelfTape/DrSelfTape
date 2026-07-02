import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

// Local Imports
import { AuthLayout } from '../../../components/Auth/AuthLayout';
import {
  CustomButton,
  CustomCheckbox,
  CustomInput,
  Logo,
  SelectDropdown,
  FilePicker,
  Textarea,
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
    <AuthLayout>
      <div className='mx-auto w-full max-w-sm lg:w-96'>
        <span className='aurora-eyebrow block mb-2'>JOIN DR SELF TAPE</span>
        <h2 className='aurora-display text-3xl tracking-tight' style={{ color: 'var(--aurora-text)', letterSpacing: '-0.6px' }}>
          Create account
        </h2>
        <p className='mt-2 text-sm' style={{ color: 'var(--aurora-sub)' }}>Start practicing in under 60 seconds</p>

        {/* Apple Sign In leads — one tap beats the form. Hidden on Android
            (no SiwA there). */}
        {Capacitor.getPlatform() !== 'android' && (
          <div className='mt-6'>
            <AppleSignInButton onError={(msg) => toast.error(msg)} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: 'var(--aurora-dim)', letterSpacing: '0.15em',
              }}>OR SIGN UP WITH EMAIL</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
            </div>
          </div>
        )}

        <div className='mt-6'>
          <form onSubmit={handleSubmit} className=''>
            <div className='space-y-6'>
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
                    height: '48px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
                    color: '#fff',
                    fontWeight: 700,
                    boxShadow: '0 8px 22px rgba(212,168,95,0.30)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #C09850, #6A4D14)',
                      boxShadow: '0 10px 26px rgba(212,168,95,0.40)',
                    },
                    '&:disabled': {
                      background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
                      color: '#fff',
                      opacity: 0.5,
                    },
                  }}
                >
                  Get Started
                </CustomButton>

                <p className='text-sm text-center' style={{ color: 'var(--aurora-sub)' }}>
                  Already have an account?{' '}
                  <button
                    type='button'
                    onClick={() => navigate('/login')}
                    className='font-semibold hover:underline cursor-pointer'
                    style={{ color: 'var(--aurora-accent-deep)' }}
                  >
                    Log in
                  </button>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
};
