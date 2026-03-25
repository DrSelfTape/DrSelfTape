import { useLocation } from 'react-router-dom';
import { actor } from '../../../assets/images';
import { logo } from '../../../assets/images';

export const AuthLayout = ({ children }) => {
  const location = useLocation();
  const path = location?.pathname;

  const headline = path?.includes('/signup')
    ? 'Your professional journey starts here.'
    : path?.includes('/login')
    ? 'Welcome back.'
    : null;

  return (
    <div className="flex min-h-screen bg-[#080a0f]">
      {/* Left — Form */}
      <div className="flex-1 flex flex-col justify-start py-10 px-6 sm:px-10 lg:px-16 overflow-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <img src={logo} alt="Dr Self Tape" className="w-10 h-10" />
          <span className="text-white text-xl font-bold tracking-tight font-jetbrains">
            Dr. Self Tape
          </span>
        </div>
        {children}
      </div>

      {/* Right — Hero image (desktop only) */}
      <div className="relative hidden lg:flex flex-col justify-end w-[45%] min-h-screen overflow-hidden">
        <img
          className="absolute inset-0 h-full w-full object-cover object-top"
          src={actor}
          alt=""
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a0f] via-[#080a0f]/40 to-transparent" />
        {headline && (
          <div className="relative z-10 p-12 pb-16">
            <p className="text-white text-4xl xl:text-5xl font-bold leading-tight font-jetbrains max-w-md">
              {headline}
            </p>
            <p className="text-[#A7ECDA] text-lg mt-4 font-medium">
              The professional self-tape studio built for actors.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
