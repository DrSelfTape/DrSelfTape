import { useMemo, useState, useRef } from 'react';
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
import PasswordRequirements from '../../../components/Shared/PasswordRequirments';
import { registerUser } from '../../../redux/features/auth/authSlice';
import { AppleIcon, GoogleIcon } from '../../../assets/icons';
import { useSnackbar } from '../../../hooks/useSnackbar';

export const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: { label: 'Actor', value: 'actor' },
    phoneNo: '',
  });
  const fieldRefs = {
    email: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
  };
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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

    if (
      validatePassword(formData?.password?.trim()) &&
      validatePassword(formData?.confirmPassword?.trim()) &&
      formData?.password !== formData?.confirmPassword
    ) {
      newErrors.confirmPassword = 'Passwords do not match';
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

    try {
      setLoading(true);
      const action = dispatch(registerUser(registrationPayload));
      const data = await action;

      if (data?.meta?.requestStatus === 'fulfilled') {
        setFormData({
          firstName: '',
          email: '',
          password: '',
          confirmPassword: '',
          accountType: { label: 'Actor', value: 'actor' },
          phoneNo: '',
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

        <div className='mt-8'>
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
                label='Confirm Password'
                name='confirmPassword'
                type='password'
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder='Re-enter your password'
                error={!!errors.confirmPassword}
                errorMsg={errors.confirmPassword}
                ref={fieldRefs.confirmPassword}
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
                    !formData.confirmPassword ||
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
