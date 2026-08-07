import { useEffect, useState } from 'react';

import { ReaderPortrait } from '../Aurora';
import { FACE_PRESETS } from '../Aurora/readerPortraitPresets';
import { avatarStyleFor, parseAvatarStyle } from '../Aurora/avatarStyle';

/**
 * The grid of illustrated avatars an actor can choose instead of a photo.
 *
 * Shared by VisibilityPrompt (first-run, "you aren't being shown") and the
 * Profile appearance card (changing your mind later). Extracted so the two can
 * never drift — the picker's job is identical in both places and a second copy
 * is how one of them quietly stops matching the artwork.
 *
 * `selected` is the stored avatar_style string, not an index, so callers pass
 * the server value straight through without decoding it.
 */
export default function AvatarPicker({ userId, name, selected, onPick, disabled = false }) {
  const parsed = parseAvatarStyle(selected);
  // A stored value can point past the end of the set — ReaderPortrait already
  // guards for that, and this has to as well. Without clamping, every button
  // got tabIndex=-1 and the grid became completely unreachable by keyboard.
  const selectedIndex = parsed !== null && parsed < FACE_PRESETS.length ? parsed : null;

  // The roving tabindex has to FOLLOW focus, not sit on the selection. Pinned
  // to the selected item, arrowing to another avatar left the tab stop behind,
  // so tabbing out and back dumped you at the start again.
  const [focusIndex, setFocusIndex] = useState(selectedIndex ?? 0);
  useEffect(() => { setFocusIndex(selectedIndex ?? 0); }, [selectedIndex]);

  // A radiogroup is expected to move focus with the arrow keys. Without this a
  // keyboard or switch-control user has to tab through fourteen buttons to
  // reach the last one, and VoiceOver announces a group that does not behave
  // like the group it claims to be.
  const onKeyDown = (e, i) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + FACE_PRESETS.length) % FACE_PRESETS.length;
    setFocusIndex(next);
    e.currentTarget.parentElement?.querySelectorAll('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Choose an avatar"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))', gap: 10 }}
    >
      {FACE_PRESETS.map((_, i) => {
        const isSelected = selectedIndex === i;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Avatar option ${i + 1}`}
            disabled={disabled}
            onClick={() => { setFocusIndex(i); onPick(i, avatarStyleFor(i)); }}
            onKeyDown={(e) => onKeyDown(e, i)}
            // Roving tabindex: one stop for the whole group, arrows move within.
            tabIndex={focusIndex === i ? 0 : -1}
            style={{
              padding: 0, borderRadius: '50%', overflow: 'hidden', aspectRatio: '1 / 1',
              background: 'none', cursor: disabled ? 'default' : 'pointer',
              border: isSelected
                ? '3px solid var(--aurora-accent)'
                : '2px solid var(--aurora-glass-border)',
              opacity: disabled && !isSelected ? 0.5 : 1,
            }}
          >
            <ReaderPortrait reader={{ id: userId, name, avatar_style: avatarStyleFor(i) }} />
          </button>
        );
      })}
    </div>
  );
}
