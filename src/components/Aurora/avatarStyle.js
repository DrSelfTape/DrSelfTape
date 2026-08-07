/**
 * How an actor's chosen avatar is encoded, in one place.
 *
 * Stored on ActorProfile.avatar_style as "aurora:<index>". The index is a
 * position in FACE_PRESETS, which is why presets must only ever be APPENDED —
 * reordering them silently changes the face of every actor who already chose.
 *
 * Lives in its own module rather than in ReaderPortrait.jsx because that file
 * may only export a component (react-refresh), and rather than in
 * readerPortraitPresets.js so artwork and encoding can be edited independently.
 */

/** The bare legacy value written before the picker existed. */
export const LEGACY_AVATAR_STYLE = 'aurora';

export const avatarStyleFor = (index) => `aurora:${index}`;

/**
 * "aurora:4" -> 4. Anything else — including the legacy bare "aurora", which
 * means "chose an avatar before there was anything to choose" — returns null,
 * and the caller falls back to hashing the user id.
 */
export function parseAvatarStyle(style) {
  const m = /^aurora:(\d+)$/.exec(String(style || ''));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** True for any value that means "this actor picked an avatar". */
export function hasAvatar(style) {
  return String(style || '').startsWith(LEGACY_AVATAR_STYLE);
}
