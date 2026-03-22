import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { CustomInput, CustomButton, Logo } from '../../../components/Shared';
import { AuthLayout } from '../../../components/Auth/AuthLayout';
import { forgotPassword } from '../../../redux/features/auth/authSlice';
import {
  validateEmail,
  isEmpty,
  isError,
} from '../../../utils/utils';
import { useSnackbar } from '../../../hooks/useSnackbar';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const [formData, setFormData] = useState({ email: '' });
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

    if (!formData?.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData?.email?.trim()?.toLowerCase())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (isError(newErrors)) {
      setErrors(newErrors);
      return;
    }

    const forgotPasswordPayload = {
      email: formData?.email?.trim()?.toLowerCase(),
    };

    try {
      setLoading(true);
      const result = await dispatch(forgotPassword(forgotPasswordPayload));

      if (result?.meta?.requestStatus === 'fulfilled') {
        toast.success('Reset email sent successfully. Please check your email.');
        setLoading(false);
        setFormData({ email: '' });
        navigate('/login');
      } else {
        setLoading(false);
        setErrors({ email: result.payload || 'Failed to send reset email' });
      }
    } catch (err) {
      console.log(err);
      setLoading(false);
      setErrors({ email: 'Failed to send reset email' });
    }
  };

  return (
    <AuthLayout title="Forgot Password">
      <div className="mx-auto w-full max-w-sm lg:w-96">
        <Logo showText={false} />
        <h2 className="mt-3 lg:mt-6 text-2xl font-semibold tracking-tight text-gray-900 max-lg:text-center">
          Forgot your password?
        </h2>
        <p className="mt-2 text-sm text-gray-600 max-lg:text-center">
          Enter your email address and we'll send you a verification code
        </p>

        <div className="mt-8">
          <form onSubmit={handleSubmit} className="">
            <div className="space-y-8">
              <CustomInput
                label="Email"
                name="email"
                type="text"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                error={!!errors.email}
                errorMsg={errors.email}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2 space-y-5 mt-8">
              <CustomButton
                disabled={isEmpty(formData)}
                type="submit"
                loading={loading}
                sx={{
                  width: '100%'
                }}
              >
                Send Verification Code
              </CustomButton>

              <p className="text-sm text-center">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-primary cursor-pointer font-medium hover:underline"
                >
                  Back to Login
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
