/**
 * ReaderPortrait — illustrated SVG fallback for Match cards / chat list
 * when a reader has no headshot. Picks one of 6 face geometries
 * deterministically from the reader id/name. Geometry data ported from
 * the Aurora handoff `screens/v1-match.jsx` READER_FACES.
 */

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

// Six face presets — each represents a distinct person archetype.
// Reader id/name hashes into the pool; same reader always gets the same face.
const FACE_PRESETS = [
  { // 0 — short dark wave + light stubble
    skin: '#C99A78', hair: '#1F140A', shirt: '#26303C', faceW: 38, faceH: 48,
    hairPath: 'M -36 -28 Q -38 -52 -10 -54 Q 22 -56 36 -42 Q 38 -28 36 -22 Q 30 -36 16 -38 Q 0 -34 -16 -36 Q -32 -32 -36 -22 Z',
    browL: 'M -22 -12 Q -16 -16 -8 -14',
    browR: 'M 22 -12 Q 16 -16 8 -14',
    mouth: 'M -7 22 Q 0 25 7 22',
    extras: 'stubble',
  },
  { // 1 — long dark hair + gold earrings + red lip
    skin: '#C68B5E', hair: '#0F0805', shirt: '#1F2A2E', faceW: 36, faceH: 46,
    hairBackPath: 'M -52 -22 Q -56 30 -38 56 L -28 30 L -34 -10 Z M 52 -22 Q 56 30 38 56 L 28 30 L 34 -10 Z',
    hairPath: 'M -38 -32 Q -42 -54 -8 -56 Q 26 -58 38 -42 Q 40 -22 36 -16 Q 28 -34 12 -36 Q -8 -32 -22 -34 Q -34 -30 -38 -22 Z',
    browL: 'M -22 -14 Q -16 -19 -8 -17',
    browR: 'M 22 -14 Q 16 -19 8 -17',
    mouth: 'M -8 22 Q 0 27 8 22',
    lip: '#7A2A2A',
    extras: 'earrings',
  },
  { // 2 — mop top + wide grin
    skin: '#E2B58E', hair: '#3F2818', shirt: '#3A3225', faceW: 38, faceH: 44,
    hairPath: 'M -38 -22 Q -44 -54 -4 -56 Q 30 -54 38 -34 Q 40 -22 30 -16 Q 18 -32 4 -32 Q -10 -30 -22 -34 Q -34 -30 -38 -18 Z',
    browL: 'M -22 -16 Q -16 -20 -8 -17',
    browR: 'M 22 -16 Q 16 -20 8 -17',
    eyeW: 3.2, eyeH: 2.2,
    mouth: 'M -10 21 Q 0 30 10 21',
    mouthW: 2.6,
    extras: 'grin',
  },
  { // 3 — bun + glasses
    skin: '#D9A57E', hair: '#1A0F0A', shirt: '#3A2E22', faceW: 36, faceH: 46,
    hairBackPath: 'M -42 -28 Q -50 4 -42 24 L -34 14 L -36 -8 Z M 42 -28 Q 50 4 42 24 L 34 14 L 36 -8 Z',
    hairPath: 'M -36 -28 Q -42 -54 0 -56 Q 36 -54 38 -36 Q 32 -32 22 -34 Q 8 -38 -8 -36 Q -22 -34 -32 -32 Q -38 -32 -36 -22 Z',
    browL: 'M -22 -14 Q -16 -18 -8 -16',
    browR: 'M 22 -14 Q 16 -18 8 -16',
    mouth: 'M -7 22 Q 0 24 7 22',
    extras: 'glasses-bun',
  },
  { // 4 — fade + beard, deeper skin tone
    skin: '#7C4A30', hair: '#0A0605', shirt: '#1F1F1F', faceW: 38, faceH: 48,
    hairPath: 'M -36 -26 Q -38 -52 -8 -54 Q 24 -56 36 -42 Q 38 -28 36 -22 Q 26 -28 14 -28 Q -2 -26 -18 -28 Q -32 -26 -36 -22 Z',
    browL: 'M -22 -14 Q -16 -18 -8 -16',
    browR: 'M 22 -14 Q 16 -18 8 -16',
    browW: 3.5,
    mouth: 'M -6 22 Q 0 24 6 22',
    extras: 'beard',
  },
  { // 5 — wavy shoulder hair + hoops + red lip
    skin: '#D89868', hair: '#5A2F1A', shirt: '#3A2A20', faceW: 36, faceH: 46,
    hairBackPath: 'M -46 -22 Q -52 28 -38 50 L -30 32 L -32 -6 Z M 46 -22 Q 52 28 38 50 L 30 32 L 32 -6 Z',
    hairPath: 'M -38 -28 Q -44 -54 -4 -56 Q 32 -54 38 -36 Q 40 -22 34 -16 Q 24 -34 6 -36 Q -10 -32 -22 -34 Q -34 -30 -38 -18 Z',
    browL: 'M -22 -14 Q -16 -18 -8 -16',
    browR: 'M 22 -14 Q 16 -18 8 -16',
    mouth: 'M -8 22 Q 0 26 8 22',
    lip: '#9B3838',
    extras: 'hoops',
  },
];

const BG_COLORS = ['#D4A85F', '#A7D6FF', '#9FE6B4', '#FFC9A3', '#FFB3C1', '#D8C5F2'];

export default function ReaderPortrait({
  reader = {},
  viewWidth = 400,
  viewHeight = 220,
  showBackground = true,
}) {
  const seed = String(reader.id ?? reader.name ?? '0');
  const h = hashStr(seed);
  const preset = FACE_PRESETS[h % FACE_PRESETS.length];
  const bgColor = reader.color || BG_COLORS[h % BG_COLORS.length];
  const ink = '#1A1408';
  const skin = preset.skin;
  const hair = preset.hair;
  const variant = (h % 9999).toString();
  const gradId = `dst-pbg-${variant}`;
  const glowId = `dst-pglow-${variant}`;

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
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
          <rect width={viewWidth} height={viewHeight} fill={`url(#${gradId})`} />
          <rect width={viewWidth} height={viewHeight} fill={`url(#${glowId})`} />
        </>
      )}

      {/* shoulders */}
      <g transform={`translate(${viewWidth / 2}, ${viewHeight * 0.95})`}>
        <path
          d={`M -${viewWidth * 0.42} 30 Q -${viewWidth * 0.32} -${viewHeight * 0.18} 0 -${viewHeight * 0.22} Q ${viewWidth * 0.32} -${viewHeight * 0.18} ${viewWidth * 0.42} 30 Z`}
          fill={preset.shirt}
        />
        <path
          d={`M -${viewWidth * 0.22} -${viewHeight * 0.22} L 0 -${viewHeight * 0.12} L ${viewWidth * 0.22} -${viewHeight * 0.22}`}
          fill="none"
          stroke={shade(preset.shirt, -25)}
          strokeWidth="2"
        />
      </g>

      {/* head */}
      <g transform={`translate(${viewWidth / 2}, ${viewHeight * 0.55})`}>
        {/* neck */}
        <rect x="-14" y="20" width="28" height="20" fill={skin} />
        <ellipse cx="0" cy="40" rx="20" ry="6" fill={shade(skin, -18)} opacity="0.5" />
        {/* hair back */}
        {preset.hairBackPath && <path d={preset.hairBackPath} fill={hair} />}
        {/* face */}
        <ellipse cx="0" cy="0" rx={preset.faceW || 38} ry={preset.faceH || 46} fill={skin} />
        {/* cheek blush */}
        <ellipse cx="-22" cy="14" rx="9" ry="5" fill={shade(bgColor, 10)} opacity="0.35" />
        <ellipse cx="22" cy="14" rx="9" ry="5" fill={shade(bgColor, 10)} opacity="0.35" />
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
        {preset.extras === 'stubble' && (
          <rect x="-22" y="14" width="44" height="18" fill="#7E5A40" opacity="0.18" />
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

      {/* highlight */}
      <ellipse cx={viewWidth * 0.42} cy={viewHeight * 0.42} rx="14" ry="8" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}
