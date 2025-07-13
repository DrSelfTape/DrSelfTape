import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomInput, Logo } from '../../../components/Shared';
import { validateEmail } from '../../../utils/utils';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
    } else if (!validateEmail(email)) {
      setError('Enter a valid email address');
    } else {
      console.log('Email submitted:', email);
      navigate('/verify-otp');
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-white px-2 sm:px-4'>
      <form
        onSubmit={handleSubmit}
        className='w-full max-w-[448px] flex flex-col gap-8'
      >
        <div>
          <Logo />

          <h2 className='text-[24px] font-light md:text-center'>
            Forgot Password
          </h2>
        </div>

        <CustomInput
          label='Email'
          name='email'
          type='text'
          value={email}
          onChange={handleChange}
          placeholder='Enter your email'
          error={!!error}
          errorMsg={error}
        />

        <div className='flex flex-col gap-5'>
          <button
            type='submit'
            className='w-full bg-primary cursor-pointer text-white py-2 rounded hover:bg-primary-dark transition-all text-sm font-medium'
          >
            Send
          </button>

          <p className='text-sm text-center'>
            <button
              type='button'
              onClick={() => navigate('/login')}
              className='text-primary cursor-pointer font-medium hover:underline'
            >
              Back to Login
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
