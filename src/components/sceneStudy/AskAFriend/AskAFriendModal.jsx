// Library imports
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';

// Shared components
import { CustomModal } from '../../Shared';

// Local imports
import useHideMobileHeader from '../../Shared/useHideMobileHeader';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { trackEvent } from '../../../utils/analytics';
import {
  createReaderInvite,
  listReaderInvites,
  revokeReaderInvite,
} from '../../../api/readerInvite';

/**
 * "Ask a friend to read the other character's lines."
 *
 * The actor's half of the loop. Pick the part they are NOT playing, mint a
 * link, send it. The friend's half is /r/<token>, which needs no account.
 *
 * Deliberately small: no email field and no phone field. We never message
 * the friend — the actor does, from their own thread, which is the only
 * reason the friend opens it at all.
 *
 * An invite is minted against ONE scene, because that is what the backend
 * stores and what the friend's page renders. A script with several scenes
 * therefore has to ask which one — a rehearsal view that flattens them all
 * would otherwise silently send scene 1 and look broken to both people.
 *
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {Array}    scenes       [{ id, title, characters: string[] }]
 * @param {string}   myCharacter  the part the ACTOR plays, so it is not
 *                                offered as the one to hand over
 */
const AskAFriendModal = ({
  open,
  onClose,
  scenes = [],
  myCharacter = '',
}) => {
  useHideMobileHeader(open);
  const { toast } = useSnackbar();

  const [sceneId, setSceneId] = useState(null);
  const scene = useMemo(
    () => scenes.find((s) => s.id === sceneId) || scenes[0] || null,
    [scenes, sceneId],
  );
  const sceneTitle = scene?.title || '';

  const options = useMemo(() => {
    const mine = String(myCharacter || '').trim().toLowerCase();
    const seen = new Set();
    return (scene?.characters || [])
      .map((c) => String(c || '').trim())
      .filter((c) => {
        if (!c) return false;
        const key = c.toLowerCase();
        if (key === mine || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [scene, myCharacter]);

  const [character, setCharacter] = useState('');
  const [friendName, setFriendName] = useState('');
  const [note, setNote] = useState('');
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState(null);
  const [invites, setInvites] = useState([]);
  // Which returned batch the actor has opened to listen to.
  const [openClipsFor, setOpenClipsFor] = useState(null);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  // Reset to a clean sheet every time the modal opens — a stale minted link
  // from the last scene is worse than no link at all.
  useEffect(() => {
    if (!open) return;
    setMinted(null);
    setFriendName('');
    setNote('');
    setSceneId(scenes[0]?.id ?? null);
  }, [open, scenes]);

  // Keep the chosen part valid when the scene changes under it.
  useEffect(() => {
    setCharacter((prev) => (options.includes(prev) ? prev : options[0] || ''));
  }, [options]);

  const refreshInvites = useCallback(() => {
    if (!scene?.id) return;
    setLoadingInvites(true);
    listReaderInvites(scene.id)
      .then(setInvites)
      .catch(() => setInvites([]))
      .finally(() => setLoadingInvites(false));
  }, [scene]);

  useEffect(() => {
    if (open) refreshInvites();
  }, [open, refreshInvites]);

  const handleMint = useCallback(async () => {
    if (!scene?.id || !character || minting) return;
    setMinting(true);
    try {
      const invite = await createReaderInvite({
        sceneId: scene.id,
        character,
        friendName: friendName.trim(),
        note: note.trim(),
      });
      setMinted(invite);
      refreshInvites();
      trackEvent('reader_invite_created', { character });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || 'Could not create the link. Try again.',
      );
    } finally {
      setMinting(false);
    }
  }, [scene, character, friendName, note, minting, refreshInvites, toast]);

  const shareText = useMemo(() => {
    if (!minted) return '';
    return `Can you read ${minted.character}'s lines for me? No sign-up, it opens straight on your phone.`;
  }, [minted]);

  const handleShare = useCallback(async () => {
    if (!minted?.url) return;
    trackEvent('reader_invite_shared', { method: navigator.share ? 'native' : 'copy' });
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Read a scene with me', text: shareText, url: minted.url });
        return;
      } catch {
        // Share sheet dismissed. Fall through to copy so the tap still does
        // something rather than nothing.
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${minted.url}`);
      toast.success('Link copied. Paste it into your message.');
    } catch {
      toast.error('Could not copy. Select the link and copy it by hand.');
    }
  }, [minted, shareText, toast]);

  const handleCopy = useCallback(async () => {
    if (!minted?.url) return;
    try {
      await navigator.clipboard.writeText(minted.url);
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy. Select the link and copy it by hand.');
    }
  }, [minted, toast]);

  const handleRevoke = useCallback(async (inviteId) => {
    setRevokingId(inviteId);
    try {
      await revokeReaderInvite(inviteId);
      setInvites((prev) => prev.map((i) => (i.id === inviteId ? { ...i, revoked: true } : i)));
      if (minted?.id === inviteId) setMinted(null);
      toast.success('That link no longer works.');
    } catch {
      toast.error('Could not turn the link off. Try again.');
    } finally {
      setRevokingId(null);
    }
  }, [minted, toast]);

  const liveInvites = invites.filter((i) => !i.revoked && !i.expired);

  return (
    <CustomModal
      open={open}
      close={onClose}
      title='Ask a friend to read'
      noFooter
      childClassName='!px-4 !pb-4'
    >
      <div className='flex flex-col gap-4'>
        {!minted ? (
          <>
            <p className='text-sm text-[var(--dst-ink-3)]'>
              Pick the part you are not playing. Your friend gets the scene with
              that character's lines marked to record, reads them on their phone,
              and sends them back. No account, nothing to install.
            </p>

            {scenes.length > 1 ? (
              <label className='flex flex-col gap-1'>
                <span className='text-xs uppercase tracking-wider text-[var(--dst-ink-3)]'>
                  Scene
                </span>
                <select
                  className='h-11 rounded-lg border border-[var(--dst-line)] bg-[var(--dst-surface)] px-3 text-sm'
                  value={scene?.id ?? ''}
                  onChange={(e) => setSceneId(Number(e.target.value))}
                >
                  {scenes.map((s, i) => (
                    <option key={s.id} value={s.id}>{s.title || `Scene ${i + 1}`}</option>
                  ))}
                </select>
              </label>
            ) : null}

            {options.length === 0 ? (
              <p className='text-sm text-[var(--dst-ink-3)]'>
                This scene only has one speaking part, so there is nothing to hand over.
              </p>
            ) : (
              <>
                <label className='flex flex-col gap-1'>
                  <span className='text-xs uppercase tracking-wider text-[var(--dst-ink-3)]'>
                    They read
                  </span>
                  <select
                    className='h-11 rounded-lg border border-[var(--dst-line)] bg-[var(--dst-surface)] px-3 text-sm'
                    value={character}
                    onChange={(e) => setCharacter(e.target.value)}
                  >
                    {options.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                <label className='flex flex-col gap-1'>
                  <span className='text-xs uppercase tracking-wider text-[var(--dst-ink-3)]'>
                    Their first name (optional)
                  </span>
                  <input
                    className='h-11 rounded-lg border border-[var(--dst-line)] bg-[var(--dst-surface)] px-3 text-sm'
                    value={friendName}
                    maxLength={80}
                    placeholder='Sam'
                    onChange={(e) => setFriendName(e.target.value)}
                  />
                  <span className='text-xs text-[var(--dst-ink-3)]'>
                    Only so the page can greet them. We never message them, you do.
                  </span>
                </label>

                <label className='flex flex-col gap-1'>
                  <span className='text-xs uppercase tracking-wider text-[var(--dst-ink-3)]'>
                    A note (optional)
                  </span>
                  <textarea
                    className='min-h-[72px] rounded-lg border border-[var(--dst-line)] bg-[var(--dst-surface)] px-3 py-2 text-sm'
                    value={note}
                    maxLength={500}
                    placeholder='Self-tape is due Friday. Read it flat, I just need the cue.'
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>

                <button
                  type='button'
                  className='h-11 rounded-full bg-[var(--dst-fill-ink)] text-[var(--dst-on-fill-ink)] text-sm font-semibold disabled:opacity-60'
                  onClick={handleMint}
                  disabled={!character || minting}
                >
                  {minting ? <CircularProgress size={18} color='inherit' /> : 'Create the link'}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <p className='text-sm text-[var(--dst-ink-3)]'>
              {`Send this to ${minted.friend_name || 'your friend'}. It works for 14 days.`}
            </p>
            <code className='block break-all rounded-lg border border-[var(--dst-line)] bg-[var(--dst-surface-sunken)] px-3 py-2 text-xs'>
              {minted.url}
            </code>
            <div className='flex gap-2'>
              <button
                type='button'
                className='h-11 flex-1 rounded-full bg-[var(--dst-fill-ink)] text-[var(--dst-on-fill-ink)] text-sm font-semibold'
                onClick={handleShare}
              >
                Send it
              </button>
              <button
                type='button'
                className='h-11 rounded-full border border-[var(--dst-line)] px-4 text-sm font-semibold'
                onClick={handleCopy}
              >
                Copy
              </button>
            </div>
            <button
              type='button'
              className='h-11 text-sm text-[var(--dst-ink-3)] underline'
              onClick={() => setMinted(null)}
            >
              Make another one
            </button>
          </>
        )}

        {/* Live links for this scene, so a link that is out in the world can
            always be found and switched off. */}
        {loadingInvites ? null : liveInvites.length > 0 && (
          <div className='flex flex-col gap-2 border-t border-[var(--dst-line)] pt-3'>
            <span className='text-xs uppercase tracking-wider text-[var(--dst-ink-3)]'>
              {sceneTitle ? `Links out for ${sceneTitle}` : 'Links you have sent'}
            </span>
            {liveInvites.map((inv) => (
              <div key={inv.id} className='flex flex-col gap-2'>
                <div className='flex items-center justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='truncate text-sm'>
                    {inv.friend_name ? `${inv.friend_name} · ${inv.character}` : inv.character}
                  </p>
                  {inv.clips?.length ? (
                    // Takes that came back are the whole point of the link, so
                    // they are playable here rather than only counted. They do
                    // not read opposite you in rehearsal yet — that is the next
                    // build — and nothing in this modal claims they do.
                    <button
                      type='button'
                      className='text-xs text-[var(--dst-brass-deep)] underline'
                      onClick={() => setOpenClipsFor(openClipsFor === inv.id ? null : inv.id)}
                      aria-expanded={openClipsFor === inv.id}
                    >
                      {`${inv.clips.length} ${inv.clips.length === 1 ? 'line' : 'lines'} back · ${openClipsFor === inv.id ? 'hide' : 'listen'}`}
                    </button>
                  ) : (
                    <p className='text-xs text-[var(--dst-ink-3)]'>
                      {inv.open_count ? 'Opened, nothing back yet' : 'Not opened yet'}
                    </p>
                  )}
                </div>
                <button
                  type='button'
                  className='shrink-0 text-xs text-[var(--dst-ink-3)] underline disabled:opacity-50'
                  onClick={() => handleRevoke(inv.id)}
                  disabled={revokingId === inv.id}
                >
                  Turn off
                </button>
                </div>

                {openClipsFor === inv.id && (
                  <ul className='flex flex-col gap-2 rounded-lg bg-[var(--dst-surface-sunken)] p-2'>
                    {inv.clips.map((clip, i) => (
                      <li key={clip.id} className='flex flex-col gap-1'>
                        <span className='text-xs text-[var(--dst-ink-3)]'>
                          {`Line ${i + 1}`}
                        </span>
                        {/* Native controls on purpose: this is a handful of
                            short takes, not a player we need to own. */}
                        <audio
                          controls
                          preload='none'
                          src={clip.audio_url}
                          className='w-full'
                        >
                          <track kind='captions' />
                        </audio>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomModal>
  );
};

export default AskAFriendModal;
