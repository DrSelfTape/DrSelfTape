import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Camera } from 'lucide-react';
import axios from '../../redux/http';
import { baseURL } from '../../redux/constant';
import { showSnackbar } from '../../redux/features/snackbarSlice/snackbarSlice';
import { fetchProfileThunk } from '../../redux/features/profile/profileSlice';
import { markStep } from '../Dashboard/tutorialProgress';
import { trackEvent, Events } from '../../utils/analytics';
import { ReaderPortrait } from '../Aurora';
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
 * ONE way out: a real photo. Until 2026-10-10 an illustrated avatar also
 * counted, offered here as an equal-weight choice for actors who will not put
 * their face on a swipe card. Joseph ended that on seeing one on a card —
 * "only real uploaded images should be considered in the pool" — because an
 * actor picking a reader is picking a person to run lines with, and a drawing
 * tells them nothing about who they would be meeting.
 *
 * The avatar is NOT gone: it is still someone's picture in chat, the Green
 * Room and their profile, and is still chosen from Profile -> Appearance. It
 * simply no longer deals you into the deck, so offering it HERE — on the
 * prompt whose entire job is getting you into the deck — would be a dead end
 * dressed as a solution.
 *
 * We still do not generate synthetic faces: a fake face on a real person's
 * profile misleads whoever is choosing who to run lines with.
 */
export default function VisibilityPrompt({ onDismiss, compact = false }) {
  const dispatch = useDispatch();
  const [cropSrc, setCropSrc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [findings, setFindings] = useState([]);
  // Set once the choice is saved, so the prompt goes away without waiting on a
  // profile refetch that might fail.
  const [done, setDone] = useState(false);

  // Fires once per mount. `where` distinguishes the Home card from the Match
  // gate — if one converts and the other doesn't, that is the whole answer.
  useEffect(() => {
    trackEvent(Events.VISIBILITY_PROMPT_SHOWN, { where: compact ? 'home' : 'match' });
  }, [compact]);

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
      // Flip the headline to "YOU'RE VISIBLE" on the SAVED photo. Until
      // 2026-10-10 only the avatar path set this, so the primary action —
      // uploading a face — never showed its own success state; the card kept
      // saying "YOU'RE NOT BEING SHOWN" until the parent happened to unmount
      // it. Found while removing the avatar route left setDone unused.
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
      // findings.length tells us whether our own quality checks are firing on
      // real uploads, or whether the validator is shouting at nobody.
      trackEvent(Events.VISIBILITY_PHOTO_UPLOADED, { warnings: found.length });
    } catch (err) {
      dispatch(showSnackbar({
        message: err?.response?.data?.message || "Couldn't upload that photo. Please try again.",
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

      </div>


      <p style={{ color: 'var(--aurora-sub)', fontSize: 12, lineHeight: 1.45, margin: 0, opacity: 0.85 }}>
        A real photo is the only thing that deals you into the deck. An actor picking a
        reader is picking a person to run lines with, so the illustrated avatar no longer
        stands in for a face here &mdash; it still shows as your picture everywhere else.
      </p>

      {onDismiss && (
        <button
          type="button"
          onClick={() => { trackEvent(Events.VISIBILITY_DISMISSED); onDismiss(); }}
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
