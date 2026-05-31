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
    <div className="aurora-orbs flex" style={{
      background: 'var(--aurora-bg)',
      // 100dvh shrinks with the iOS virtual keyboard so inputs at the bottom
      // of the form stay reachable. min-h-screen (100vh) does not.
      minHeight: '100dvh',
    }}>

      {/* Left — Form */}
      <div
        className="flex-1 flex flex-col justify-start px-6 sm:px-10 lg:px-16 overflow-y-auto"
        style={{
          // Respect iOS safe-area (dynamic island / status bar). py-10 alone
          // rendered the logo under the status bar on iPhone 14+.
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
          // Extra bottom space so the submit button isn't pinned under the
          // iOS keyboard when an input above it is focused.
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <img src={logo} alt="Dr Self Tape" className="w-10 h-10 rounded-xl shrink-0" style={{
            background: 'var(--aurora-surface-solid)',
            boxShadow: '0 0 0 1px var(--aurora-line), 0 4px 12px rgba(10,10,10,0.06)',
            padding: 4,
          }} />
          <span className="aurora-display text-xl tracking-tight" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.3px' }}>
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

        {/* Soft light vignette from bottom so text reads */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E0D0A]/85 via-[#0E0D0A]/40 to-transparent" />

        {/* Gold colour wash — antique gold tint from top, mint glow bottom-right */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4A85F]/25 via-transparent to-[#9FE6B4]/15" />

        {/* Subtle left-edge fade so it blends into the form panel */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#FAFAF7] to-transparent" />

        {/* Decorative accent line */}
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-[#D4A85F]/40 to-transparent" />

        {/* Bottom text block */}
        {headline && (
          <div className="relative z-10 p-12 pb-16">
            {/* Glowing pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
              style={{
                background: 'rgba(212,168,95,0.20)',
                border: '1px solid rgba(212,168,95,0.45)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#D4A85F' }} />
              <span className="aurora-mono text-xs" style={{ color: '#F0D097', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Professional Studio
              </span>
            </div>

            <h2 className="aurora-display text-white text-4xl xl:text-5xl leading-tight max-w-md">
              {headline}
            </h2>

            <p className="text-lg mt-4 font-medium max-w-sm leading-relaxed" style={{ color: '#F0D097' }}>
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
                  <span className="text-white/80 text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
