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
        <h2 className='text-3xl font-bold text-white tracking-tight'>
          Create account
        </h2>
        <p className='mt-2 text-sm text-[#888]'>Start practicing in under 60 seconds</p>

        <div className='mt-8'>
          <form onSubmit={handleSubmit} className=''>
            <div className='space-y-6'>
              <CustomInput dark
                label='Full Name'
                name='firstName'
                type='text'
                autoFocus
                value={formData.firstName}
                onChange={handleChange}
                placeholder='Your name'
                required
              />

              <CustomInput dark
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
                <CustomInput dark
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

              <CustomInput dark
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
                label={'I agree to the Terms and Conditions'}
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className='mt-[3px] accent-primary w-4 h-4'
              />

              <div className='flex flex-col gap-2'>
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
                  }}
                >
                  Get Started
                </CustomButton>

                <p className='text-sm text-center'>
                  Already have an account?{' '}
                  <button
                    type='button'
                    onClick={() => navigate('/login')}
                    className='text-primary font-medium hover:underline cursor-pointer'
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
