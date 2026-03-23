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
        <Logo showText={false} />
        <h2 className='mt-3 lg:mt-6 text-2xl font-semibold tracking-tight text-gray-900 max-lg:text-center'>
          Sign in to your account
        </h2>

        <div className='mt-8'>
          <div>
            <div>
              <p className='text-sm font-medium text-gray-700 pb-1'>
                Login with
              </p>
              <div className='mt-1 grid grid-cols-2 gap-3'>
                <div>
                  <div className='h-[42px] inline-flex w-full justify-center items-center rounded-md cursor-pointer border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50'>
                    <GoogleIcon />
                  </div>
                </div>

                <div>
                  <div className='h-[42px] inline-flex w-full justify-center rounded-md border cursor-pointer border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50'>
                    <AppleIcon />
                  </div>
                </div>
              </div>
            </div>

            <div className='relative my-6'>
              <div
                className='absolute inset-0 flex items-center'
                aria-hidden='true'
              >
                <div className='w-full border-t border-gray-300' />
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='bg-white px-2 text-gray-500'>
                  Or continue with
                </span>
              </div>
            </div>
          </div>
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

              <p className='text-sm text-center'>
                Don’t have an account?{' '}
                <button
                  type='submit'
                  className='text-primary cursor-pointer font-medium hover:underline'
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
