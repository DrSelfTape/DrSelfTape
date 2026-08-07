/**
 * ProfilePhoto
 * Renders a headshot with the brand gradient overlay (purple → mint).
 * Drop-in replacement wherever we show actor/user profile images.
 *
 * Props:
 *   src        — image URL
 *   alt        — alt text (default "Profile")
 *   className  — outer container className (controls size/shape)
 *   style      — outer container inline style
 *   initials   — fallback initials if no src
 *   round      — true = circle (default), false = rounded-lg
 *   avatarStyle— the actor's CHOSEN illustrated avatar ("aurora:<n>"). When set
 *                it WINS over src: someone who picked an avatar must look the
 *                same everywhere, or they appear as a drawing on the swipe card
 *                and as their photo in the Green Room list.
 *   seedId     — id used to seed the illustration (falls back to alt)
 */
import { useState } from 'react';
import { ReaderPortrait } from '../../Aurora';
import { hasAvatar } from '../../Aurora/avatarStyle';

export default function ProfilePhoto({
  src,
  alt = 'Profile',
  className = 'w-16 h-16',
  style = {},
  initials = '',
  round = true,
  avatarStyle = '',
  seedId,
}) {
  const usingAvatar = hasAvatar(avatarStyle);
  const shape = round ? 'rounded-full' : 'rounded-lg';
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !usingAvatar && src && !imgFailed;

  return (
    <div
      className={`relative overflow-hidden ${shape} ${className}`}
      style={style}
    >
      {usingAvatar ? (
        <ReaderPortrait reader={{ id: seedId ?? alt, name: alt, avatar_style: avatarStyle }} />
      ) : showImage ? (
        <>
          {/* Photo */}
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover object-top"
            onError={() => setImgFailed(true)}
          />
          {/* Brand gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF8280]/25 via-transparent to-[#A7ECDA]/20 pointer-events-none" />
          {/* Subtle inner glow ring */}
          <div
            className={`absolute inset-0 ${shape}`}
            style={{ boxShadow: 'inset 0 0 0 1.5px rgba(255, 130, 128,0.35)' }}
          />
        </>
      ) : (
        /* Fallback avatar */
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FF8280]/20 to-[#A7ECDA]/10">
          <span className="text-[#7A5A18] font-bold text-lg select-none">
            {initials || '?'}
          </span>
        </div>
      )}
    </div>
  );
}
