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

export const ResetPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get params from URL (for example, token or email)
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

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

        navigate('/login');
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset Password">
      <div className="mx-auto w-full max-w-sm lg:w-96">
        <Logo showText={false} />
        <h2 className="mt-3 lg:mt-6 text-2xl font-semibold tracking-tight text-gray-900 max-lg:text-center">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-gray-600 max-lg:text-center">
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

            <div className="flex flex-col gap-2 space-y-5 mt-8">
              <CustomButton
                disabled={isEmpty(formData) || !isPasswordValid}
                type="submit"
                loading={loading}
                   sx={{
                  width:'100%'
                }}
              >
                Set New Password
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
