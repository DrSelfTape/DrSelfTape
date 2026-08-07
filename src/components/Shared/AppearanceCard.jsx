import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from '../../redux/http';
import { baseURL } from '../../redux/constant';
import { showSnackbar } from '../../redux/features/snackbarSlice/snackbarSlice';
import { fetchProfileThunk } from '../../redux/features/profile/profileSlice';
import { ReaderPortrait } from '../Aurora';
import { hasAvatar } from '../Aurora/avatarStyle';
import AvatarPicker from './AvatarPicker';
import { trackEvent, Events } from '../../utils/analytics';

/**
 * "How you appear in Match" — the Profile control for switching between your
 * photo and an illustrated avatar.
 *
 * This exists because the choice used to be ONE-WAY: VisibilityPrompt let you
 * pick an avatar, then vanished (it is gated on needs_visual, which your choice
 * had just cleared), and Profile had no avatar control at all. The prompt even
 * told people "you can change it later in Profile", which was untrue.
 *
 * Switching is non-destructive in both directions. Choosing an avatar does not
 * delete an uploaded photo — the card simply prefers the avatar while one is
 * set (see SwipeCard) — so "use my photo again" is a one-tap undo rather than a
 * re-upload.
 */
export default function AppearanceCard({ profile }) {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  // `busy` disables the buttons, but that is a render-time guard — two saves can
  // still overlap (rapid taps, a programmatic click). Without a generation
  // counter the LAST RESPONSE wins rather than the last CHOICE, so the card can
  // end up showing avatar A while the server holds avatar B.
  const saveGen = useRef(0);

  const userId = profile?.id;
  const name = profile?.first_name;
  const style = profile?.actor_profile?.avatar_style || '';
  const photo = profile?.actor_profile?.headshot || profile?.user_image || null;
  const usingAvatar = hasAvatar(style);

  const save = async (value, successMessage) => {
    const gen = ++saveGen.current;
    setBusy(true);
    try {
      await axios.patch(`${baseURL}/v1/users/profile/`, { avatar_style: value });
      // The card reads from the refreshed profile, so it must land — but a
      // failed refresh must not report the save as failed, because the save
      // already succeeded.
      try {
        await dispatch(fetchProfileThunk()).unwrap();
      } catch {
        dispatch(fetchProfileThunk());
      }
      if (gen !== saveGen.current) return; // superseded by a later choice
      trackEvent(Events.VISIBILITY_AVATAR_CHOSEN, {
        where: 'profile',
        // '' means they switched BACK to their photo — the signal that the
        // avatar was tried and rejected, which is worth knowing separately.
        cleared: value === '',
      });
      dispatch(showSnackbar({ message: successMessage, variant: 'success' }));
      setPicking(false);
    } catch (err) {
      if (gen !== saveGen.current) return;
      dispatch(showSnackbar({
        message: err?.response?.data?.message || "Couldn't save that. Please try again.",
        variant: 'error',
      }));
    }
    if (gen === saveGen.current) setBusy(false);
  };

  return (
    <div
      className="aurora-glass"
      style={{ padding: 20, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div>
        <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 6 }}>
          HOW YOU APPEAR IN MATCH
        </span>
        <p style={{ color: 'var(--aurora-sub)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
          {usingAvatar
            ? 'Your card shows this avatar. Other actors see a drawing, not a photo.'
            : photo
              ? 'Your card shows your photo.'
              : "Your card has no picture yet, so you aren't being shown to anyone."}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      border: '1px solid var(--aurora-glass-border)' }}>
          {usingAvatar || !photo ? (
            <ReaderPortrait reader={{ id: userId, name, avatar_style: style }} />
          ) : (
            <img src={photo} alt="Your headshot"
                 style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => { if (!picking) trackEvent(Events.VISIBILITY_PICKER_OPENED, { where: 'profile' }); setPicking((v) => !v); }}
            style={{
              padding: '11px 18px', borderRadius: 12, minHeight: 44, fontSize: 13.5, fontWeight: 700,
              background: 'linear-gradient(135deg, var(--aurora-accent), var(--aurora-accent-deep))',
              border: 'none', color: '#fff', boxShadow: 'var(--aurora-shadow-coral)',
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {picking ? 'Close' : usingAvatar ? 'Change avatar' : 'Use an avatar'}
          </button>

          {/* Only offered when there is actually a photo to fall back to —
              clearing the avatar without one would put them straight back out
              of every deck. */}
          {usingAvatar && photo && (
            <button
              type="button"
              disabled={busy}
              onClick={() => save('', 'Your card shows your photo again.')}
              style={{
                padding: '11px 18px', borderRadius: 12, minHeight: 44, fontSize: 13.5, fontWeight: 600,
                background: 'var(--aurora-glass)', border: '1.5px solid var(--aurora-line)',
                color: 'var(--aurora-text)', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
              }}
            >
              Use my photo
            </button>
          )}
        </div>
      </div>

      {picking && (
        <AvatarPicker
          userId={userId}
          name={name}
          selected={style}
          disabled={busy}
          onPick={(i, value) => save(value, "That's your card now.")}
        />
      )}

      {usingAvatar && photo && (
        <p style={{ color: 'var(--aurora-sub)', fontSize: 12, margin: 0, opacity: 0.85 }}>
          Your uploaded photo is still saved. Switching to the avatar doesn&apos;t delete it.
        </p>
      )}
    </div>
  );
}
