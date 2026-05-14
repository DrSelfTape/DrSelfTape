import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { CustomInput, CustomButton, Logo } from '../../../components/Shared';
import {
  validatePassword,
  isEmpty,
  isError,
} from '../../../utils/utils';
import PasswordRequirements from '../../../components/Shared/PasswordRequirments';
import { AuthLayout } from '../../../components/Auth/AuthLayout';
import { resetPassword } from '../../../redux/features/auth/authSlice';
import { useSnackbar } from '../../../hooks/useSnackbar';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useSnackbar();

  // Get params from URL (for example, token or email)
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const linkIsValid = !!(token && email);

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const passwordValidation = useMemo(
    () => validatePassword(formData?.newPassword),
    [formData?.newPassword]
  );

  const isPasswordValid =
    passwordValidation.length &&
    passwordValidation.upper &&
    passwordValidation.number &&
    passwordValidation.specialChar;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { newPassword, confirmPassword } = formData;
    let newErrors = {};

    if (isEmpty(formData)) {
      return;
    }

    if (!isPasswordValid) {
      newErrors.newPassword = 'Password does not meet requirements';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (isError(newErrors)) {
      setErrors(newErrors);
      return;
    }

    const resetPasswordPayload = {
      email: email?.trim(),
      token: token?.trim(),
      new_password: newPassword?.trim(),
    };

    try {
      setLoading(true);
      const result = await dispatch(resetPassword(resetPasswordPayload));

      if (result?.meta?.requestStatus === 'fulfilled') {
        setLoading(false);
        setFormData({
          newPassword: '',
          confirmPassword: '',
        });
        toast.success('Password reset successfully. Please log in with your new password.');
        navigate('/login');
      } else {
        setLoading(false);
        toast.error(result?.payload || 'Reset link is invalid or has expired. Please request a new one.');
      }
    } catch (err) {
      console.log(err);
      setLoading(false);
      toast.error('Something went wrong. Please try again.');
    }
  };

  if (!linkIsValid) {
    return (
      <AuthLayout title="Reset Password">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <span className='aurora-eyebrow block mb-2'>RESET LINK</span>
          <h2 className="aurora-display text-3xl tracking-tight" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.6px' }}>
            Invalid reset link
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--aurora-sub)' }}>
            This password reset link is missing required information or has expired. Please request a new one.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <CustomButton
              type="button"
              onClick={() => navigate('/forgot-password')}
              sx={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
                color: '#fff',
                fontWeight: 700,
                boxShadow: '0 8px 22px rgba(212,168,95,0.30)',
                '&:hover': { background: 'linear-gradient(135deg, #C09850, #6A4D14)' },
              }}
            >
              Request New Link
            </CustomButton>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm cursor-pointer font-semibold hover:underline"
              style={{ color: 'var(--aurora-accent-deep)' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password">
      <div className="mx-auto w-full max-w-sm lg:w-96">
        <span className='aurora-eyebrow block mb-2'>NEW PASSWORD</span>
        <h2 className="aurora-display text-3xl tracking-tight" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.6px' }}>
          Reset your password
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--aurora-sub)' }}>
          Create a new password
        </p>

        <div className="mt-8">
          <form onSubmit={handleSubmit} className="">
            <div className="space-y-8">
              <div className="relative flex flex-col gap-1">
                <CustomInput
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter your new password"
                  error={!!errors.newPassword}
                  errorMsg={errors.newPassword}
                />
                {formData.newPassword && !isPasswordValid && (
                  <PasswordRequirements
                    password={formData.newPassword}
                    passwordValidation={passwordValidation}
                  />
                )}
              </div>

              <CustomInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your new password"
                error={!!errors.confirmPassword}
                errorMsg={errors.confirmPassword}
              />
            </div>

            <div className="flex flex-col gap-3 mt-8">
              <CustomButton
                disabled={isEmpty(formData) || !isPasswordValid}
                type="submit"
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
                Set New Password
              </CustomButton>

              <p className="text-sm text-center" style={{ color: 'var(--aurora-sub)' }}>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="cursor-pointer font-semibold hover:underline"
                  style={{ color: 'var(--aurora-accent-deep)' }}
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
