import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomInput, Logo } from '../../../components/Shared';
import { validateEmail } from '../../../utils/utils';

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

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

  const validateFormData = (formData, setErrors) => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateFormData(formData, setErrors)) {
      console.log('Form data:', formData);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-white px-2 sm:px-4'>
      <form
        onSubmit={handleSubmit}
        className='w-full max-w-[448px] flex flex-col gap-5'
      >
        <div className='flex flex-col gap-1'>
          <Logo />
          <h2 className='text-[24px] font-light md:text-center'>
            Welcome back!
          </h2>
        </div>

        <div className='flex flex-col gap-6'>
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
        </div>

        <div className='text-center'>
          <button
            type='button'
            onClick={() => navigate('/forgot-password')}
            className='text-sm text-primary cursor-pointer hover:underline'
          >
            Forgot password?
          </button>
        </div>

        <button
          type='submit'
          className='w-full bg-primary cursor-pointer text-white py-2 rounded hover:bg-primary-dark transition-all text-sm font-medium'
        >
          Log In
        </button>

        <p className='text-sm text-center'>
          Didn’t have an account?{' '}
          <button
            type='button'
            onClick={() => navigate('/signup')}
            className='text-primary cursor-pointer font-medium hover:underline'
          >
            Sign up
          </button>
        </p>
      </form>
    </div>
  );
}
