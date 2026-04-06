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
        <h2 className='text-3xl font-bold text-white tracking-tight'>
          Sign in
        </h2>
        <p className='mt-2 text-sm text-[#888]'>Welcome back to Dr. Self Tape</p>

        <div className='mt-8'>
          <form onSubmit={handleSubmit}>
            <div className='space-y-8'>
              <CustomInput dark
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

              <CustomInput dark
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

            <div className='text-end'>
              <button
                type='button'
                onClick={() => navigate('/forgot-password')}
                className='text-sm text-primary cursor-pointer hover:underline'
              >
                Forgot password?
              </button>
            </div>

            {/* <div className="flex items-center mt-6 cursor-pointer">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                checked={formData.rememberMe || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    rememberMe: e.target.checked,
                  }))
                }
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                Remember me
              </label>
            </div> */}

            <div className='flex flex-col gap-2 w-full mt-8'>
              <CustomButton
                disabled={isEmpty(formData)}
                type='submit'
                loading={loading}
                sx={{
                  width: '100%',
                }}
              >
                Log in
              </CustomButton>

              <p className='text-sm text-center text-[#666]'>
                Don't have an account?{' '}
                <button
                  type='button'
                  className='text-[#C855F0] cursor-pointer font-semibold hover:text-[#A040C8] transition-colors'
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
