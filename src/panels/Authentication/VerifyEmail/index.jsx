import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomInput, Logo } from '../../../components/Shared';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setOtp(e.target.value);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('OTP is required');
    } else {
      console.log('OTP Verified:', otp);
      navigate('/reset-password');
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

          <h2 className='text-[24px] font-light md:text-center'>Verify OTP</h2>
        </div>

        <CustomInput
          label='OTP'
          name='otp'
          type='text'
          value={otp}
          onChange={handleChange}
          placeholder='Enter the OTP sent to your email'
          error={!!error}
          errorMsg={error}
        />

        <button
          type='submit'
          className='w-full bg-primary cursor-pointer text-white py-2 rounded hover:bg-primary-dark transition-all text-sm font-medium'
        >
          Verify
        </button>
      </form>
    </div>
  );
}
