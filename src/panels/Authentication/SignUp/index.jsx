import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomInput, Logo, SelectDropdown } from '../../../components/Shared';

export default function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: '',
  });

  const [agreeTerms, setAgreeTerms] = useState(false);
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

    if (!formData.firstName.trim())
      newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.accountType) newErrors.accountType = 'Select account type';
    if (!agreeTerms) newErrors.terms = 'You must agree to the terms';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    console.log('Signup form data:', formData);
  };

  const accountOptions = [
    { name: 'Actor', id: 'actor' },
    { name: 'Casting Director', id: 'casting_director' },
    { name: 'Agent', id: 'agent' },
  ];

  return (
    <div className='min-h-screen flex items-center justify-center bg-white px-2 sm:px-4'>
      <form
        onSubmit={handleSubmit}
        className='w-full max-w-[448px] flex flex-col gap-5'
      >
        <Logo />

        <h2 className='text-[24px] font-light md:text-center'>
          Create new account
        </h2>

        <div className='flex flex-col gap-5'>
          <CustomInput
            label='First Name'
            name='firstName'
            type='text'
            value={formData.firstName}
            onChange={handleChange}
            placeholder='Enter your first name'
            error={!!errors.firstName}
            errorMsg={errors.firstName}
          />

          <CustomInput
            label='Last Name'
            name='lastName'
            type='text'
            value={formData.lastName}
            onChange={handleChange}
            placeholder='Enter your last name'
            error={!!errors.lastName}
            errorMsg={errors.lastName}
          />

          <CustomInput
            label='Email'
            name='email'
            type='text'
            value={formData.email}
            onChange={handleChange}
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

          <CustomInput
            // label='Confirm Password'
            name='confirmPassword'
            type='password'
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder='Re-enter your password'
            error={!!errors.confirmPassword}
            errorMsg={errors.confirmPassword}
          />

          <SelectDropdown
            label='Account Type'
            value={formData.accountType}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, accountType: value }))
            }
            optionsArray={accountOptions}
            placeholder='Select account type'
            error={!!errors.accountType}
            errorMsg={errors.accountType}
          />
        </div>

        <div className='w-full pt-2 h-[80px] bg-secondary-light rounded text-center text-sm text-secondary-dark flex items-center justify-center'>
          Captcha
        </div>

        <label className='flex items-start gap-2 text-sm text-black leading-tight'>
          <input
            type='checkbox'
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className='mt-[3px] accent-primary w-4 h-4'
          />
          I agree to the Terms and Conditions
        </label>
        {errors.terms && (
          <span className='text-[11px] text-danger ml-1 -mt-4'>
            {errors.terms}
          </span>
        )}

        <button
          type='submit'
          className='w-full bg-primary text-white py-2 rounded hover:bg-primary-dark transition-all text-sm font-medium'
        >
          Sign Up
        </button>

        <p className='text-sm text-center'>
          Already have an account?{' '}
          <button
            type='button'
            onClick={() => navigate('/')}
            className='text-primary font-medium hover:underline'
          >
            Log in
          </button>
        </p>
      </form>
    </div>
  );
}
