/**
 * ReaderPortrait — illustrated SVG fallback for Match cards / chat list
 * when a reader has no headshot. Picks one of 6 face geometries
 * deterministically from the reader id/name. Geometry data ported from
 * the Aurora handoff `screens/v1-match.jsx` READER_FACES.
 */

import { FACE_PRESETS } from './readerPortraitPresets';
import { parseAvatarStyle } from './avatarStyle';

function shade(hex, amt) {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const adj = (c) => Math.max(0, Math.min(255, c + amt));
  return `#${adj(r).toString(16).padStart(2, '0')}${adj(g).toString(16).padStart(2, '0')}${adj(b).toString(16).padStart(2, '0')}`;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const BG_COLORS = ['#D4A85F', '#A7D6FF', '#9FE6B4', '#FFC9A3', '#FFB3C1', '#D8C5F2'];

// The figure is authored ONCE in this coordinate space and scaled to cover
// whatever box it is placed in. Previously the background and shoulders scaled
// with the caller's viewWidth/viewHeight while the head was drawn at FIXED
// coordinates (face rx 38, neck 28 wide) and only translated — so the head's
// size relative to its frame changed with every caller. It happened to look
// right in a 150px circle and in the 400x220 default, and badly wrong on a
// 230x380 swipe card: a small head marooned under an empty field of gradient.
const DESIGN_W = 400;
const DESIGN_H = 260;

// Callers still pass viewWidth/viewHeight; they are accepted and ignored. The
// SVG fills its container and crops, so the caller's CSS box decides framing.
export default function ReaderPortrait({ reader = {}, showBackground = true }) {
  const seed = String(reader.id ?? reader.name ?? '0');
  const h = hashStr(seed);
  // An explicit CHOICE wins over the id hash. Assigning a face by hashing the
  // user id meant your avatar was allocated to you — for something standing in
  // for your identity, that is backwards, and it handed plenty of women a
  // male-presenting face. `avatar_style` is stored as "aurora:<index>".
  const chosen = parseAvatarStyle(reader.avatar_style ?? reader.avatarStyle);
  const idx = chosen ?? (h % FACE_PRESETS.length);
  const preset = FACE_PRESETS[idx % FACE_PRESETS.length];
  const bgColor = reader.color || BG_COLORS[(chosen ?? h) % BG_COLORS.length];
  const ink = '#1A1408';
  const skin = preset.skin;
  const hair = preset.hair;
  const variant = (h % 9999).toString();
  const gradId = `dst-pbg-${variant}`;
  const glowId = `dst-pglow-${variant}`;

  return (
    <svg
      viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={bgColor} />
          <stop offset="1" stopColor={shade(bgColor, -25)} />
        </linearGradient>
        <radialGradient id={glowId} cx="65%" cy="35%" r="55%">
          <stop offset="0" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {showBackground && (
        <>
          <rect width={DESIGN_W} height={DESIGN_H} fill={`url(#${gradId})`} />
          <rect width={DESIGN_W} height={DESIGN_H} fill={`url(#${glowId})`} />
        </>
      )}

      {/* shoulders */}
      <g transform={`translate(${DESIGN_W / 2}, ${DESIGN_H * 0.99})`}>
        <path
          d={`M -${DESIGN_W * 0.42} 30 Q -${DESIGN_W * 0.32} -${DESIGN_H * 0.18} 0 -${DESIGN_H * 0.22} Q ${DESIGN_W * 0.32} -${DESIGN_H * 0.18} ${DESIGN_W * 0.42} 30 Z`}
          fill={preset.shirt}
        />
        <path
          d={`M -${DESIGN_W * 0.22} -${DESIGN_H * 0.22} L 0 -${DESIGN_H * 0.12} L ${DESIGN_W * 0.22} -${DESIGN_H * 0.22}`}
          fill="none"
          stroke={shade(preset.shirt, -25)}
          strokeWidth="2"
        />
      </g>

      {/* head */}
      <g transform={`translate(${DESIGN_W / 2}, ${DESIGN_H * 0.46}) scale(1.35)`}>
        {/* neck */}
        <rect x="-14" y="20" width="28" height="20" fill={skin} />
        <ellipse cx="0" cy="40" rx="20" ry="6" fill={shade(skin, -18)} opacity="0.5" />
        {/* hair back */}
        {preset.hairBackPath && <path d={preset.hairBackPath} fill={hair} />}
        {/* face */}
        <ellipse cx="0" cy="0" rx={preset.faceW || 38} ry={preset.faceH || 46} fill={skin} />
        {/* Cheek blush, tinted from the SKIN. It used to be shade(bgColor, 10)
            — a colour taken from the background — which put a pale patch on a
            deep skin tone whenever the card behind was light, big enough to
            read as a blank eye at card size. Warm the skin instead, and keep
            it small enough to suggest a cheek rather than announce itself. */}
        <ellipse cx="-21" cy="15" rx="7" ry="3.6" fill={shade(skin, -16)} opacity="0.28" />
        <ellipse cx="21" cy="15" rx="7" ry="3.6" fill={shade(skin, -16)} opacity="0.28" />
        {/* hair front */}
        {preset.hairPath && <path d={preset.hairPath} fill={hair} />}
        {/* brows */}
        <path d={preset.browL} stroke={hair} strokeWidth={preset.browW || 3} fill="none" strokeLinecap="round" />
        <path d={preset.browR} stroke={hair} strokeWidth={preset.browW || 3} fill="none" strokeLinecap="round" />
        {/* eyes */}
        <ellipse cx="-13" cy="-2" rx={preset.eyeW || 3.5} ry={preset.eyeH || 2.5} fill={ink} />
        <ellipse cx="13" cy="-2" rx={preset.eyeW || 3.5} ry={preset.eyeH || 2.5} fill={ink} />
        {/* nose */}
        <path d="M 0 4 Q -2 12 0 14 Q 3 14 4 12" stroke={shade(skin, -25)} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* mouth */}
        <path d={preset.mouth} stroke={preset.lip || shade(skin, -35)} strokeWidth={preset.mouthW || 2.4} fill="none" strokeLinecap="round" />
        {/* extras — accessories per preset */}
        {/* Stubble followed the JAW. It was a literal <rect> across the chin,
            which is invisible at 40px and an obvious grey box on a swipe card. */}
        {preset.extras === 'stubble' && (
          <path
            d="M -26 10 Q -20 34 0 38 Q 20 34 26 10 Q 18 26 0 28 Q -18 26 -26 10 Z"
            fill={shade(skin, -55)}
            opacity="0.22"
          />
        )}
        {preset.extras === 'earrings' && (
          <g>
            <circle cx="-32" cy="14" r="2.5" fill="#D4A85F" />
            <circle cx="32" cy="14" r="2.5" fill="#D4A85F" />
          </g>
        )}
        {preset.extras === 'grin' && (
          <ellipse cx="0" cy="26" rx="6" ry="2" fill="#7A2A2A" opacity="0.4" />
        )}
        {preset.extras === 'glasses-bun' && (
          <g>
            <circle cx="-13" cy="-2" r="8.5" stroke="#1A1408" strokeWidth="1.8" fill="rgba(26,20,8,0.06)" />
            <circle cx="13" cy="-2" r="8.5" stroke="#1A1408" strokeWidth="1.8" fill="rgba(26,20,8,0.06)" />
            <path d="M -4.5 -2 L 4.5 -2" stroke="#1A1408" strokeWidth="1.8" />
            <circle cx="0" cy="-50" r="10" fill={hair} />
          </g>
        )}
        {preset.extras === 'beard' && (
          <path d="M -28 18 Q -22 38 0 42 Q 22 38 28 18 Q 22 30 0 32 Q -22 30 -28 18 Z" fill="#0A0605" opacity="0.85" />
        )}
        {preset.extras === 'hoops' && (
          <g>
            <circle cx="-32" cy="14" r="4.5" stroke="#D4A85F" strokeWidth="2" fill="none" />
            <circle cx="32" cy="14" r="4.5" stroke="#D4A85F" strokeWidth="2" fill="none" />
          </g>
        )}
      </g>

      {/* A specular highlight ellipse used to be drawn HERE — last, on top of
          everything, at 42%/42% of the box. That put a white blob squarely on
          the left eye of every avatar at every size, and it read as a blank or
          rolled-back eye. The background already carries a radial sheen
          (glowId), so this was duplicate anyway. Removed, not moved. */}
    </svg>
  );
}
