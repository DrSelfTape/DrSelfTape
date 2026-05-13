import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

// Local Imports
import { AuthLayout } from '../../../components/Auth/AuthLayout';
import { isEmpty, isError, validateEmail } from '../../../utils/utils';
import { loginUser } from '../../../redux/features/auth/authSlice';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { AppleIcon, GoogleIcon } from '../../../assets/icons';
import { getFirstRouteByRole } from '../../../routes/routeHelpers';
import { setAuthToken } from '../../../redux/http';
import { CustomButton, CustomInput, Logo } from '../../../components/Shared';

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useSnackbar();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

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

    if (isEmpty(formData)) {
      return;
    }

    if (!validateEmail(formData?.email)) {
      newErrors.email = 'Invalid Email';
    }

    if (isError(newErrors)) {
      setErrors(newErrors);
      return;
    }

    const loginPayload = {
      email: formData?.email?.trim()?.toLowerCase(),
      password: formData?.password,
      is_admin: false,
    };

    try {
      setLoading(true);
      const result = await dispatch(loginUser(loginPayload));

      if (result?.meta?.requestStatus === 'fulfilled') {
        setLoading(false);
        setFormData({
          email: '',
          password: '',
        });

        const payload = result?.payload;

        // Set axios auth token immediately
        const token = payload?.token?.access;
        if (token) {
          setAuthToken(token);
        }

        // Get role from response - use active_role if available, otherwise use role
        const role = payload?.active_role || payload?.role;

        if (role) {
          // Navigate directly based on role - no role selection needed
          const firstPath = getFirstRouteByRole(role);
          navigate(firstPath, { replace: true });
        } else {
          // Fallback if no role found
          toast.error('Unable to determine user role. Please contact support.');
        }
      } else {
        setLoading(false);
        toast.error(result?.payload);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Login failed:', err);
    }
  };

  return (
    <AuthLayout title='Welcome back!'>
      <div className='mx-auto w-full max-w-sm lg:w-96'>
        <span className='aurora-eyebrow block mb-2'>WELCOME BACK</span>
        <h2 className='aurora-display text-3xl tracking-tight' style={{ color: 'var(--aurora-text)', letterSpacing: '-0.6px' }}>
          Sign in
        </h2>
        <p className='mt-2 text-sm' style={{ color: 'var(--aurora-sub)' }}>Pick up where you left off</p>

        <div className='mt-8'>
          <form onSubmit={handleSubmit}>
            <div className='space-y-8'>
              <CustomInput
                label='Email'
                name='email'
                type='text'
                value={formData.email}
                onChange={handleChange}
                autoComplete='on'
                autoFocus
                placeholder='Enter your email'
                error={!!errors.email}
                errorMsg={errors.email}
              />

              <CustomInput
                label='Password'
                name='password'
                type='password'
                value={formData.password}
                onChange={handleChange}
                placeholder='Enter your password'
                error={!!errors.password}
                errorMsg={errors.password}
              />
            </div>

            <div className='text-end mt-3'>
              <button
                type='button'
                onClick={() => navigate('/forgot-password')}
                className='aurora-mono cursor-pointer hover:underline'
                style={{
                  color: 'var(--aurora-accent-deep)',
                  fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}
              >
                Forgot password?
              </button>
            </div>

            <div className='flex flex-col gap-3 w-full mt-8'>
              <CustomButton
                disabled={isEmpty(formData)}
                type='submit'
                loading={loading}
                sx={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
                  color: '#fff',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
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
                Log in
              </CustomButton>

              <p className='text-sm text-center' style={{ color: 'var(--aurora-sub)' }}>
                Don't have an account?{' '}
                <button
                  type='button'
                  className='cursor-pointer font-semibold transition-colors'
                  style={{ color: 'var(--aurora-accent-deep)' }}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/signup');
                  }}
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
};
