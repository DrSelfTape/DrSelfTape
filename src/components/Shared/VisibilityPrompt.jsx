import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Camera } from 'lucide-react';
import axios from '../../redux/http';
import { baseURL } from '../../redux/constant';
import { showSnackbar } from '../../redux/features/snackbarSlice/snackbarSlice';
import { fetchProfileThunk } from '../../redux/features/profile/profileSlice';
import { markStep } from '../Dashboard/TutorialChecklist';
import { ReaderPortrait } from '../Aurora';
import { FACE_PRESETS } from '../Aurora/readerPortraitPresets';
import { avatarStyleFor } from '../Aurora/avatarStyle';
import HeadshotCropper from './HeadshotCropper';

/**
 * The prompt for actors who cannot be dealt into anyone's deck.
 *
 * Measured 2026-08-07: of the 70 people active in the last 30 days, only 16
 * could be shown in a deck. The other 54 had no picture, so they were invisible
 * — they could not be seen and could not be matched, and nothing in the app
 * told them so. The old copy ("Other actors want to see who they're reading
 * with") described a nicety. Being unable to be matched at all is not a
 * nicety, so this says the true thing instead.
 *
 * Two ways out, deliberately equal in weight. Some actors will not put their
 * face on a swipe card; that is a position, not an unfinished profile, and the
 * illustrated avatar exists so it doesn't cost them every match. The avatar is
 * plainly a drawing — we do not generate synthetic faces, because a fake face
 * on a real person's profile misleads whoever is choosing who to run lines
 * with.
 */
export default function VisibilityPrompt({ userId, name, onDismiss, compact = false }) {
  const dispatch = useDispatch();
  const [cropSrc, setCropSrc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [findings, setFindings] = useState([]);
  // null until they open the picker — the avatar is a CHOICE, so nothing is
  // preselected. It used to be assigned by hashing the user id, which handed
  // plenty of women a male-presenting face.
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState(null);
  // Set once the choice is saved, so the prompt goes away without waiting on a
  // profile refetch that might fail.
  const [done, setDone] = useState(false);

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      dispatch(showSnackbar({ message: 'Please choose an image file.', variant: 'error' }));
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  };

  const uploadPhoto = async (blob) => {
    const src = cropSrc;
    setCropSrc(null);
    if (src) URL.revokeObjectURL(src);
    if (!blob) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('headshot', blob, 'headshot.jpg');
      const { data } = await axios.patch(`${baseURL}/v1/users/profile/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // The photo is already saved. These are notes on how it will look, never
      // a rejection — a picture we think is dark still beats the blank card.
      const found = (data?.data || data)?.headshot_findings || [];
      setFindings(found);
      if (found.length) {
        // A successful upload flips needs_visual, the parent unmounts this
        // component, and the inline list disappears before it can be read.
        dispatch(showSnackbar({ message: found[0].message, variant: 'warning' }));
      }
      dispatch(fetchProfileThunk());
      markStep('headshot');
    } catch (err) {
      dispatch(showSnackbar({
        message: err?.response?.data?.message || "Couldn't upload that photo. Please try again.",
        variant: 'error',
      }));
    }
    setBusy(false);
  };

  const chooseAvatar = async (index) => {
    setBusy(true);
    try {
      await axios.patch(`${baseURL}/v1/users/profile/`, { avatar_style: avatarStyleFor(index) });
      // Mark it chosen only once the SERVER has it. Setting this on click left
      // a failed save looking successful — the avatar stayed ringed as selected
      // while the server still had nothing.
      setChosen(index);
      setDone(true);
      // The prompt AND the deck are both gated on needs_visual, so this refetch
      // is what actually reveals Match. Await it and retry once — dispatching
      // and walking away meant a cellular blip left the flag stale.
      try {
        await dispatch(fetchProfileThunk()).unwrap();
      } catch {
        await new Promise((r) => setTimeout(r, 900));
        dispatch(fetchProfileThunk());
      }
      markStep('headshot');
      dispatch(showSnackbar({ message: "You're visible in Match now.", variant: 'success' }));
    } catch (err) {
      dispatch(showSnackbar({
        message: err?.response?.data?.message || "Couldn't save that. Please try again.",
        variant: 'error',
      }));
    }
    setBusy(false);
  };

  return (
    <div
      className="aurora-glass"
      style={{
        padding: compact ? '18px 18px 16px' : '28px 24px 24px',
        borderRadius: 20,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      <div>
        <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 6 }}>
          {done ? 'YOU\u2019RE VISIBLE' : 'YOU\u2019RE NOT BEING SHOWN'}
        </span>
        <h2
          className="aurora-display"
          style={{ fontSize: compact ? 19 : 23, color: 'var(--aurora-text)', margin: 0, letterSpacing: '-0.4px' }}
        >
          {done ? 'You\u2019re in the deck now' : 'Actors can\u2019t see you yet'}
        </h2>
        <p style={{ color: 'var(--aurora-sub)', fontSize: 14, lineHeight: 1.5, marginTop: 8 }}>
          Match only deals cards that have a picture on them. Until you add one you
          won&apos;t appear in anyone&apos;s deck, and nobody can ask you to read.
        </p>
      </div>

      {findings.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {findings.map((f) => (
            <li key={f.code} style={{ color: 'var(--aurora-sub)', fontSize: 13, lineHeight: 1.45 }}>
              {f.message}
            </li>
          ))}
          <li style={{ color: 'var(--aurora-sub)', fontSize: 13, opacity: 0.8 }}>
            Your photo is saved either way — swap it any time in Profile.
          </li>
        </ul>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <label
          style={{
            flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '13px 16px', borderRadius: 14, cursor: busy ? 'default' : 'pointer',
            background: 'linear-gradient(135deg, var(--aurora-accent), var(--aurora-accent-deep))',
            color: '#fff', fontWeight: 700, fontSize: 14, opacity: busy ? 0.6 : 1,
            boxShadow: 'var(--aurora-shadow-coral)', minHeight: 48,
          }}
        >
          <Camera size={16} />
          {busy ? 'Saving…' : 'Add a photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                 style={{ display: 'none' }} disabled={busy} onChange={pickFile} />
        </label>

        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          disabled={busy}
          aria-expanded={picking}
          style={{
            flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '10px 16px', borderRadius: 14, minHeight: 48,
            background: 'var(--aurora-glass)', border: '1px solid var(--aurora-glass-border)',
            color: 'var(--aurora-text)', fontWeight: 600, fontSize: 14,
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {/* The thumbnail is a PREVIEW of what's on offer. Once the grid is
              open it previews nothing, so it goes — leaving a decorative face
              next to the word "Close" just reads as a stray graphic. */}
          {!picking && (
            <span style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
              <ReaderPortrait reader={{ id: userId, name }} />
            </span>
          )}
          {picking ? 'Close' : 'Pick an avatar'}
        </button>
      </div>

      {picking && (
        <div>
          <p style={{ color: 'var(--aurora-sub)', fontSize: 12.5, margin: '0 0 10px' }}>
            Pick the one you want.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))', gap: 10 }}>
            {FACE_PRESETS.map((_, i) => (
              <button
                key={i}
                type="button"
                disabled={busy}
                onClick={() => chooseAvatar(i)}
                aria-label={`Avatar option ${i + 1}`}
                aria-pressed={chosen === i}
                style={{
                  padding: 0, borderRadius: '50%', overflow: 'hidden', cursor: busy ? 'default' : 'pointer',
                  aspectRatio: '1 / 1', background: 'none',
                  border: chosen === i
                    ? '3px solid var(--aurora-accent)'
                    : '2px solid var(--aurora-glass-border)',
                  opacity: busy && chosen !== i ? 0.5 : 1,
                }}
              >
                <ReaderPortrait reader={{ id: userId, name, avatar_style: `aurora:${i}` }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <p style={{ color: 'var(--aurora-sub)', fontSize: 12, lineHeight: 1.45, margin: 0, opacity: 0.85 }}>
        Rather not put your face on a swipe card? The avatar makes you visible without one.
        It&apos;s clearly a drawing, so nobody is misled about who they matched with.
      </p>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            alignSelf: 'flex-start', background: 'none', border: 'none', padding: '4px 0',
            color: 'var(--aurora-sub)', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Not now
        </button>
      )}

      {cropSrc && (
        <HeadshotCropper
          imageSrc={cropSrc}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onComplete={uploadPhoto}
        />
      )}
    </div>
  );
}
