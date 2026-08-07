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
  const selectedIndex = parseAvatarStyle(selected);

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
            onClick={() => onPick(i, avatarStyleFor(i))}
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
