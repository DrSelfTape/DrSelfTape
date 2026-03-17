import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomInput, CustomButton, Logo } from '../../../components/Shared';
import { isEmpty, isError } from '../../../utils/utils';
import { AuthLayout } from '../../../components/Auth/AuthLayout';

export const VerifyEmail = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ otp: '' });
  const [errors, setErrors] = useState({});

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

  const handleSubmit = (e) => {
    e.preventDefault();

    let newErrors = {};
    if (!formData.otp.trim()) {
      newErrors.otp = 'OTP is required';
    }

    if (isError(newErrors)) {
      setErrors(newErrors);
      return;
    }

    console.log('OTP Verified:', formData.otp);
    navigate('/reset-password');
  };

  return (
    <AuthLayout title="Verify OTP">
      <div className="mx-auto w-full max-w-sm lg:w-96">
        <Logo showText={false}/>
        <h2 className="mt-3 lg:mt-6 text-2xl font-semibold tracking-tight text-gray-900 max-lg:text-center">
          Verify your email
        </h2>
        <p className="mt-2 text-sm text-gray-600 max-lg:text-center">
          Enter the OTP sent to your email address
        </p>

        <div className="mt-8">
          <form onSubmit={handleSubmit} className="">
            <div className="space-y-8">
              <CustomInput
                label='OTP'
                name='otp'
                type='text'
                value={formData.otp}
                onChange={handleChange}
                placeholder='Enter the OTP sent to your email'
                error={!!errors.otp}
                errorMsg={errors.otp}
                autoFocus
              />
            </div>

            <div className="space-y-5 mt-8">
              <CustomButton disabled={isEmpty(formData)} type='submit'>
                Verify
              </CustomButton>

              <p className="text-sm text-center">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  className="text-primary cursor-pointer font-medium hover:underline"
                  onClick={() => navigate('/forgot-password')}
                >
                  Resend
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
