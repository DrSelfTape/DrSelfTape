/**
 * Face presets for ReaderPortrait — the illustrated avatar an actor can choose
 * instead of putting their own photo on a swipe card.
 *
 * SPLIT OUT OF ReaderPortrait.jsx so the artwork can grow without touching the
 * rendering logic.
 *
 * ⚠️ The original six skewed heavily male: across a dozen seeds only two read
 * as anything other than a short-dark-haired man. Since this stands in for a
 * real person's identity, that is a correctness problem, not a taste one.
 * When adding presets, keep the pool BALANCED across presented gender, hair
 * length/texture and skin tone.
 *
 * Coordinate space: the face group is drawn around origin (0,0) at roughly
 * ±40 units, and ReaderPortrait scales that group to fit whatever viewBox it
 * is given. Keep new geometry inside the same envelope as the presets below.
 *
 * Shape of a preset:
 *   skin, hair, shirt      required hex colours
 *   faceW, faceH           face ellipse radii (~36-38 x ~44-48)
 *   hairPath               front hair, drawn over the face
 *   hairBackPath           optional hair behind the head (long styles)
 *   browL, browR           eyebrow strokes
 *   browW, eyeW, eyeH      optional stroke/ellipse sizing
 *   mouth, mouthW, lip     mouth path, stroke width, optional lip colour
 *   extras                 one of: stubble | earrings | grin | glasses-bun |
 *                          beard | hoops   (rendered by ReaderPortrait)
 */

export const FACE_PRESETS = [
  { // 0 — short dark wave + light stubble
    skin: '#C99A78', hair: '#1F140A', shirt: '#26303C',
    faceW: 38, faceH: 48, eyeGap: 13.0,
    eyeW: 3.5, eyeH: 2.5, browW: 3.0, mouthW: 2.4,
    hairPath: 'M -36 -28 Q -38 -52 -10 -54 Q 22 -56 36 -42 Q 38 -28 36 -22 Q 30 -36 16 -38 Q 0 -34 -16 -36 Q -32 -32 -36 -22 Z',
    browL: 'M -22 -12 Q -16 -16 -8 -14',
    browR: 'M 22 -12 Q 16 -16 8 -14',
    mouth: 'M -7 22 Q 0 25 7 22',
    extras: 'stubble',
  },
  { // 1 — long dark hair + gold earrings + red lip
    skin: '#C68B5E', hair: '#0F0805', shirt: '#1F2A2E',
    faceW: 36, faceH: 45, eyeGap: 12.0,
    eyeW: 3.6, eyeH: 2.8, browW: 2.6, mouthW: 2.2,
    hairBackPath: 'M -52 -22 Q -56 30 -38 56 L -28 30 L -34 -10 Z M 52 -22 Q 56 30 38 56 L 28 30 L 34 -10 Z',
    hairPath: 'M -38 -32 Q -42 -54 -8 -56 Q 26 -58 38 -42 Q 40 -22 36 -16 Q 28 -34 12 -36 Q -8 -32 -22 -34 Q -34 -30 -38 -22 Z',
    browL: 'M -22 -14 Q -16 -19 -8 -17',
    browR: 'M 22 -14 Q 16 -19 8 -17',
    mouth: 'M -8 22 Q 0 27 8 22',
    lip: '#7A2A2A',
    extras: 'earrings',
  },
  { // 2 — mop top + wide grin
    skin: '#E2B58E', hair: '#3F2818', shirt: '#3A3225',
    faceW: 39, faceH: 44, eyeGap: 14.0,
    eyeW: 3.2, eyeH: 2.2, browW: 3.2, mouthW: 2.6,
    hairPath: 'M -38 -22 Q -44 -54 -4 -56 Q 30 -54 38 -34 Q 40 -22 30 -16 Q 18 -32 4 -32 Q -10 -30 -22 -34 Q -34 -30 -38 -18 Z',
    browL: 'M -22 -16 Q -16 -20 -8 -17',
    browR: 'M 22 -16 Q 16 -20 8 -17',
    mouth: 'M -10 21 Q 0 30 10 21',
    extras: 'grin',
  },
  { // 3 — bun + glasses
    skin: '#D9A57E', hair: '#1A0F0A', shirt: '#3A2E22',
    faceW: 36, faceH: 47, eyeGap: 12.5,
    eyeW: 3.4, eyeH: 2.6, browW: 2.8, mouthW: 2.3,
    hairBackPath: 'M -42 -28 Q -50 4 -42 24 L -34 14 L -36 -8 Z M 42 -28 Q 50 4 42 24 L 34 14 L 36 -8 Z',
    hairPath: 'M -36 -28 Q -42 -54 0 -56 Q 36 -54 38 -36 Q 32 -32 22 -34 Q 8 -38 -8 -36 Q -22 -34 -32 -32 Q -38 -32 -36 -22 Z',
    browL: 'M -22 -14 Q -16 -18 -8 -16',
    browR: 'M 22 -14 Q 16 -18 8 -16',
    mouth: 'M -7 22 Q 0 24 7 22',
    extras: 'glasses-bun',
  },
  { // 4 — fade + beard, deeper skin tone
    skin: '#7C4A30', hair: '#0A0605', shirt: '#1F1F1F',
    faceW: 39, faceH: 50, eyeGap: 13.5,
    eyeW: 3.3, eyeH: 2.3, browW: 3.6, mouthW: 2.5,
    hairPath: 'M -36 -26 Q -38 -52 -8 -54 Q 24 -56 36 -42 Q 38 -28 36 -22 Q 26 -28 14 -28 Q -2 -26 -18 -28 Q -32 -26 -36 -22 Z',
    browL: 'M -22 -14 Q -16 -18 -8 -16',
    browR: 'M 22 -14 Q 16 -18 8 -16',
    mouth: 'M -6 22 Q 0 24 6 22',
    extras: 'beard',
  },
  { // 5 — wavy shoulder hair + hoops + red lip
    skin: '#D89868', hair: '#5A2F1A', shirt: '#3A2A20',
    faceW: 35, faceH: 45, eyeGap: 12.0,
    eyeW: 3.7, eyeH: 2.9, browW: 2.5, mouthW: 2.2,
    hairBackPath: 'M -46 -22 Q -52 28 -38 50 L -30 32 L -32 -6 Z M 46 -22 Q 52 28 38 50 L 30 32 L 32 -6 Z',
    hairPath: 'M -38 -28 Q -44 -54 -4 -56 Q 32 -54 38 -36 Q 40 -22 34 -16 Q 24 -34 6 -36 Q -10 -32 -22 -34 Q -34 -30 -38 -18 Z',
    browL: 'M -22 -14 Q -16 -18 -8 -16',
    browR: 'M 22 -14 Q 16 -18 8 -16',
    mouth: 'M -8 22 Q 0 26 8 22',
    lip: '#9B3838',
    extras: 'hoops',
  },
  { // 6 — very fair long straight hair + soft lip
    // Warmed from #F0D2BC: at card size that value rendered almost grey-white,
    // because every facial detail is derived from the skin (shade(skin, -16/-25/-35))
    // and there was not enough tone left underneath for them to bite.
    skin: '#EDC3A2', hair: '#3A241A', shirt: '#24425A',
    faceW: 35, faceH: 46, eyeGap: 11.5,
    eyeW: 3.8, eyeH: 3.0, browW: 2.4, mouthW: 2.1,
    hairBackPath: 'M -46 -24 Q -50 18 -44 56 L -30 56 L -28 16 L -32 -12 Z M 46 -24 Q 50 18 44 56 L 30 56 L 28 16 L 32 -12 Z',
    hairPath: 'M -38 -30 Q -42 -56 0 -58 Q 38 -56 38 -30 L 34 -16 Q 26 -34 10 -36 Q -8 -34 -22 -36 Q -34 -32 -38 -20 Z',
    browL: 'M -22 -14 Q -16 -19 -8 -17',
    browR: 'M 22 -14 Q 16 -19 8 -17',
    mouth: 'M -7 22 Q 0 25 7 22',
    lip: '#A44B55',
  },
  { // 7 — deep skin + rounded curly crown + gold lip
    skin: '#8D5A3B', hair: '#24130E', shirt: '#D69A2D',
    faceW: 40, faceH: 47, eyeGap: 14.5,
    eyeW: 3.1, eyeH: 2.2, browW: 3.4, mouthW: 2.7,
    hairPath: 'M -38 -18 Q -46 -28 -38 -38 Q -42 -50 -28 -50 Q -22 -60 -10 -54 Q 0 -62 10 -54 Q 24 -60 30 -50 Q 44 -48 38 -36 Q 46 -26 36 -16 Q 26 -30 12 -32 Q 0 -34 -14 -32 Q -28 -30 -38 -18 Z',
    browL: 'M -22 -14 Q -16 -19 -8 -17',
    browR: 'M 22 -14 Q 16 -19 8 -17',
    mouth: 'M -8 22 Q 0 27 8 22',
    lip: '#F0B0A0',
    extras: 'earrings',
  },
  { // 8 — deep skin + short locs with side braids
    skin: '#5C3520', hair: '#120B08', shirt: '#233F38',
    faceW: 37, faceH: 50, eyeGap: 13.0,
    eyeW: 3.3, eyeH: 2.4, browW: 3.0, mouthW: 2.4,
    hairBackPath: 'M -42 -16 Q -50 2 -46 38 L -38 56 L -30 50 L -34 18 Z M 42 -16 Q 50 2 46 38 L 38 56 L 30 50 L 34 18 Z',
    hairPath: 'M -36 -26 Q -38 -54 -10 -56 Q 18 -58 36 -40 L 34 -22 Q 24 -30 12 -30 Q 0 -28 -14 -30 Q -26 -28 -36 -22 Z',
    browL: 'M -22 -14 Q -16 -18 -8 -16',
    browR: 'M 22 -14 Q 16 -18 8 -16',
    mouth: 'M -6 22 Q 0 24 6 22',
    extras: 'stubble',
  },
  { // 9 — very short shaved head + deep rose shirt
    skin: '#B87550', hair: '#35221A', shirt: '#4B2C48',
    faceW: 40, faceH: 44, eyeGap: 15.0,
    eyeW: 3.0, eyeH: 2.1, browW: 3.3, mouthW: 2.8,
    hairPath: 'M -36 -28 Q -34 -50 -8 -52 Q 22 -54 36 -38 L 34 -24 Q 22 -30 10 -30 Q -4 -28 -18 -30 Q -30 -28 -36 -22 Z',
    browL: 'M -22 -13 Q -16 -17 -8 -15',
    browR: 'M 22 -13 Q 16 -17 8 -15',
    mouth: 'M -7 22 Q 0 24 7 22',
    extras: 'beard',
  },
  { // 10 — patterned head wrap + deep skin + bright shirt
    skin: '#6F422B', hair: '#C58B48', shirt: '#193E46',
    faceW: 36, faceH: 49, eyeGap: 12.0,
    eyeW: 3.6, eyeH: 2.7, browW: 2.7, mouthW: 2.2,
    hairPath: 'M -40 -18 Q -46 -34 -34 -42 Q -30 -58 0 -58 Q 30 -58 36 -42 Q 48 -34 40 -18 Q 26 -28 14 -30 Q 0 -26 -14 -30 Q -28 -28 -40 -18 Z',
    browL: 'M -22 -14 Q -16 -19 -8 -17',
    browR: 'M 22 -14 Q 16 -19 8 -17',
    mouth: 'M -8 22 Q 0 26 8 22',
    lip: '#D77A6E',
    extras: 'hoops',
  },
  { // 11 — knit beanie + short dark hair
    skin: '#D6A27C', hair: '#7A3E28', shirt: '#2F2F38',
    faceW: 35, faceH: 44, eyeGap: 11.0,
    eyeW: 3.9, eyeH: 3.1, browW: 2.3, mouthW: 2.0,
    hairPath: 'M -40 -20 Q -44 -38 -32 -46 Q -28 -60 0 -60 Q 28 -60 34 -46 Q 46 -38 40 -20 Q 26 -28 14 -30 Q 0 -27 -14 -30 Q -28 -28 -40 -20 Z',
    browL: 'M -22 -14 Q -16 -18 -8 -16',
    browR: 'M 22 -14 Q 16 -18 8 -16',
    mouth: 'M -7 22 Q 0 25 7 22',
    extras: 'stubble',
  },
  { // 12 — androgynous long wavy hair + teal shirt
    skin: '#B87955', hair: '#51352F', shirt: '#335C5E',
    faceW: 38, faceH: 46, eyeGap: 13.0,
    eyeW: 3.4, eyeH: 2.5, browW: 2.9, mouthW: 2.4,
    hairBackPath: 'M -46 -18 Q -54 10 -42 54 L -30 54 L -28 24 L -34 -8 Z M 46 -18 Q 54 10 42 54 L 30 54 L 28 24 L 34 -8 Z',
    hairPath: 'M -38 -28 Q -44 -54 -6 -56 Q 26 -58 38 -38 Q 40 -24 34 -16 Q 26 -32 12 -34 Q -2 -30 -16 -34 Q -30 -30 -38 -18 Z',
    browL: 'M -22 -14 Q -16 -18 -8 -16',
    browR: 'M 22 -14 Q 16 -18 8 -16',
    mouth: 'M -7 22 Q 0 24 7 22',
  },
  { // 13 — medium-deep skin + big curly halo + red lip
    skin: '#A96E4E', hair: '#271712', shirt: '#6B2546',
    faceW: 39, faceH: 49, eyeGap: 14.0,
    eyeW: 3.2, eyeH: 2.3, browW: 3.5, mouthW: 2.6,
    hairPath: 'M -38 -16 Q -48 -24 -40 -36 Q -46 -48 -32 -50 Q -26 -60 -14 -54 Q -4 -62 6 -54 Q 20 -62 28 -52 Q 44 -50 38 -38 Q 48 -28 38 -16 Q 26 -28 12 -32 Q 0 -34 -14 -32 Q -28 -28 -38 -16 Z',
    browL: 'M -22 -14 Q -16 -19 -8 -17',
    browR: 'M 22 -14 Q 16 -19 8 -17',
    mouth: 'M -8 22 Q 0 27 8 22',
    lip: '#B9404C',
    extras: 'grin',
  },
];
