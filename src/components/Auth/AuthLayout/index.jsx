import { useLocation } from 'react-router-dom';
import { actor } from '../../../assets/images';

export const AuthLayout = ({ children }) => {
  const location = useLocation();
  const path = location?.pathname;
  return (
    <div className="flex h-screen">
      <div className="flex-1 py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 h-screen overflow-auto">
        {children}
      </div>

      <div className="relative hidden w-0 flex-1 lg:block">

        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={actor}
          alt=""
        />
        {path?.includes('/login') ? (
          <p className='absolute top-14 text-[3rem] xl:text-[4rem] font-bold pr-10 pl-[5rem] font-jetbrains text-[#0a2540] w-full max-w-[40rem]'>
            Welcome to Dr. Self Tape
          </p>
        ) : path?.includes('/signup') ? (
          <p className='absolute top-14 text-[3rem] xl:text-[4rem] font-bold pr-10 pl-[5rem] font-jetbrains text-[#0a2540] w-full max-w-[49rem]'>
            Your professional journey starts here.
          </p>
        ) : null}
      </div>
    </div>
  );
}
