import { useLocation } from 'react-router-dom';
import { dstHero, logo } from '../../../assets/images';

export const AuthLayout = ({ children }) => {
  const location = useLocation();
  const path = location?.pathname;

  const isSignup = path?.includes('/signup');
  const headline = isSignup
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

      {/* Right — Hero (desktop only) */}
      <div className="relative hidden lg:flex flex-col justify-end w-[48%] min-h-screen overflow-hidden">

        {/* Photo */}
        <img
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={dstHero}
          alt="Actor headshot"
        />

        {/* Deep dark vignette from bottom so text reads */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a0f] via-[#080a0f]/60 to-transparent" />

        {/* Brand colour wash — purple tint from top, mint glow bottom-right */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF8280]/20 via-transparent to-[#A7ECDA]/10" />

        {/* Subtle left-edge fade so it blends into the form panel */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#080a0f] to-transparent" />

        {/* Decorative accent line */}
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-[#FF8280]/40 to-transparent" />

        {/* Bottom text block */}
        {headline && (
          <div className="relative z-10 p-12 pb-16">
            {/* Glowing pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF8280]/15 border border-[#FF8280]/30 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF8280] animate-pulse" />
              <span className="text-[#FF8280] text-xs font-semibold tracking-wider uppercase">
                Professional Studio
              </span>
            </div>

            <h2 className="text-white text-4xl xl:text-5xl font-bold leading-tight font-jetbrains max-w-md">
              {headline}
            </h2>

            <p className="text-[#A7ECDA] text-lg mt-4 font-medium max-w-sm leading-relaxed">
              The self-tape studio built for actors who are serious about booking.
            </p>

            {/* Three trust points */}
            <div className="mt-8 flex flex-col gap-3">
              {[
                { icon: '🎬', text: 'AI-powered scene partner & acting coach' },
                { icon: '🎙️', text: 'Professional studio recording tools' },
                { icon: '📊', text: 'Track every audition, callback & booking' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-base">{icon}</span>
                  <span className="text-white/70 text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
