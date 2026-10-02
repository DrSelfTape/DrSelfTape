// Library imports
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

// Local imports
import {
  ReaderInviteUnavailableError,
  fetchReaderInvite,
  sendReaderClips,
} from '../../api/readerInvite';
import { trackEvent } from '../../utils/analytics';
import ReaderLineCard from './ReaderLineCard';
import ReaderThanks from './ReaderThanks';
import { useReaderRecorder } from './useReaderRecorder';
import './publicRecord.css';

/* ══════════════════════════════════════════════════════════════════════
 * /r/<token> — "read the other character's lines for me"
 *
 * The only unauthenticated page in the app, and the only acquisition loop
 * we have. An actor mints a link, texts it to a friend, and the friend
 * opens it on whatever phone they are holding: no account, no install, no
 * email, nothing between them and the first Record button.
 *
 * Everything on this page is in service of a person who did not ask to be
 * here and is doing someone a favour. The headline names both people, the
 * second line tells them what it will cost them in minutes, and the first
 * control is reachable without a tap.
 * ══════════════════════════════════════════════════════════════════════ */

// Rough but honest. Spoken dialogue runs about 2.6 words a second; add a
// fixed handling cost per line for reading it, tapping, and the odd retake.
const SECONDS_PER_WORD = 1 / 2.6;
const SECONDS_PER_LINE_OVERHEAD = 9;

const estimateMinutes = (lines) => {
  const words = lines.reduce(
    (sum, l) => sum + String(l.text || '').trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  const seconds = words * SECONDS_PER_WORD + lines.length * SECONDS_PER_LINE_OVERHEAD;
  return Math.max(1, Math.round(seconds / 60));
};

// Who is talking TO the reader. Taken from the cue lines rather than
// guessed, because a scene can have more than two voices in it.
const otherSpeaker = (recordable) => {
  const tally = new Map();
  recordable.forEach((l) => {
    const name = l.context?.character;
    if (name) tally.set(name, (tally.get(name) || 0) + 1);
  });
  let best = null;
  let bestN = 0;
  tally.forEach((n, name) => {
    if (n > bestN) { best = name; bestN = n; }
  });
  return best;
};

const useSystemDark = () => {
  const [dark, setDark] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
};

const PublicRecord = () => {
  const { token } = useParams();
  const dark = useSystemDark();

  const [status, setStatus] = useState('loading'); // loading | ready | gone | error
  const [invite, setInvite] = useState(null);
  const [skipped, setSkipped] = useState(() => new Set());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [rejected, setRejected] = useState([]);
  const [sentCount, setSentCount] = useState(0);
  const [showThanks, setShowThanks] = useState(false);
  // True when the server already holds a take for every line the friend was
  // asked to read — they finished on an earlier visit.
  const [alreadyDone, setAlreadyDone] = useState(false);

  const recorder = useReaderRecorder();
  const { takes, start, stop, discard } = recorder;
  const openTrackedRef = useRef(false);

  /* ── The page is the credential. Keep it out of every index, and keep
   * the token out of any Referer header a tap on the CTA would send. ── */
  useEffect(() => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow, noarchive';
    const referrer = document.createElement('meta');
    referrer.name = 'referrer';
    referrer.content = 'no-referrer';
    document.head.appendChild(robots);
    document.head.appendChild(referrer);
    const previousTitle = document.title;
    document.title = 'Read a scene';
    return () => {
      robots.remove();
      referrer.remove();
      document.title = previousTitle;
    };
  }, []);

  /* ── Load ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    let live = true;
    setStatus('loading');
    fetchReaderInvite(token)
      .then((data) => {
        if (!live) return;
        setInvite(data);
        setStatus('ready');
        const recordable = (data?.lines || []).filter((l) => l.to_record);
        setAlreadyDone(
          recordable.length > 0 && recordable.every((l) => (l.recorded_count || 0) > 0),
        );
        if (!openTrackedRef.current) {
          openTrackedRef.current = true;
          trackEvent('reader_invite_opened', { lines: recordable.length });
        }
      })
      .catch((err) => {
        if (!live) return;
        setStatus(err instanceof ReaderInviteUnavailableError ? 'gone' : 'error');
      });
    return () => { live = false; };
  }, [token]);

  const recordable = useMemo(
    () => (invite?.lines || []).filter((l) => l.to_record),
    [invite],
  );
  const total = recordable.length;
  const minutes = useMemo(() => estimateMinutes(recordable), [recordable]);
  const other = useMemo(() => otherSpeaker(recordable), [recordable]);
  const recordedCount = Object.keys(takes).length;

  // Walk the scene once and decide what each line renders as. A stage
  // direction that is also the cue for the next recordable line must not
  // appear twice, so it is suppressed here rather than in the markup.
  const rows = useMemo(() => {
    const lines = invite?.lines || [];
    const out = [];
    let position = 0;
    lines.forEach((line, i) => {
      if (line.to_record) {
        position += 1;
        const cueIsPreviousDirection =
          i > 0 && lines[i - 1].line_type !== 'dialogue';
        out.push({
          kind: 'record',
          line,
          position,
          // The server already hands us the cue; drop it only when the row
          // above already showed the same text as a stage direction.
          cue: cueIsPreviousDirection ? null : line.context,
        });
        return;
      }
      if (line.line_type !== 'dialogue') {
        out.push({ kind: 'direction', line });
      }
      // Other characters' dialogue is not rendered on its own — it appears
      // as the cue inside the card it sets up.
    });
    return out;
  }, [invite]);

  /* ── Record ────────────────────────────────────────────────────────── */
  const handleRecord = useCallback(async (lineId) => {
    const ok = await start(lineId);
    if (ok) trackEvent('reader_invite_line_recorded', { line_id: lineId });
  }, [start]);

  const handleSkip = useCallback((lineId) => {
    setSkipped((prev) => new Set(prev).add(lineId));
  }, []);

  const handleUnskip = useCallback((lineId) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      next.delete(lineId);
      return next;
    });
  }, []);

  /* ── Send ──────────────────────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    const clips = Object.entries(takes).map(([lineId, take]) => ({
      lineId: Number(lineId),
      blob: take.blob,
      durationMs: take.durationMs,
    }));
    if (!clips.length || sending) return;

    setSending(true);
    setSendError(null);
    setRejected([]);
    try {
      const result = await sendReaderClips(token, clips);
      const stored = result?.stored?.length || 0;
      setSentCount(stored);
      setRejected(result?.rejected || []);
      // Takes that landed are released; anything the server refused stays
      // in hand so a retry costs the friend nothing.
      const storedIds = new Set((result?.stored || []).map((s) => s.line_id));
      storedIds.forEach((id) => discard(id));
      setShowThanks(true);
      trackEvent('reader_invite_sent', { clips: stored, rejected: result?.rejected?.length || 0 });
    } catch (err) {
      if (err instanceof ReaderInviteUnavailableError) {
        setStatus('gone');
      } else {
        // Nothing is thrown away. The blobs are still in memory and the
        // button says Try again.
        setSendError("That did not go through. Your recordings are still here.");
      }
    } finally {
      setSending(false);
    }
  }, [takes, sending, token, discard]);

  const handleCtaClick = useCallback(() => {
    trackEvent('reader_invite_cta_tapped', {});
  }, []);

  /* ── Shells ────────────────────────────────────────────────────────── */
  const shell = (children, centered) => (
    <div className='rdr' data-theme={dark ? 'dark' : undefined}>
      <div className={`rdr__wrap${centered ? ' rdr__wrap--centered' : ''}`}>{children}</div>
    </div>
  );

  if (status === 'loading') {
    return shell(
      <div style={{ textAlign: 'center' }}>
        <div className='rdr__spinner' />
        <p className='rdr__body'>Opening the scene.</p>
      </div>,
      true,
    );
  }

  // Unknown, expired and revoked are one state on purpose: the backend
  // returns the same 404 for all three, and the page must not invent a
  // distinction it cannot actually see.
  if (status === 'gone') {
    return shell(
      <>
        <h1 className='rdr__thanks-title'>This link is not available.</h1>
        <p className='rdr__body'>
          Reading links stop working after two weeks, and the actor can switch one
          off at any time. Ask them to send you a fresh one.
        </p>
      </>,
      true,
    );
  }

  if (status === 'error') {
    return shell(
      <>
        <h1 className='rdr__thanks-title'>We could not load the scene.</h1>
        <p className='rdr__body'>Check your connection and try again.</p>
        <div className='rdr__controls'>
          <button type='button' className='rdr__btn' onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </>,
      true,
    );
  }

  const actor = invite?.actor_first_name || 'Your friend';
  const character = invite?.character || '';

  if (showThanks) {
    const remaining = total - sentCount;
    return shell(
      <ReaderThanks
        title={`Sent. ${actor} has your takes.`}
        body={
          sentCount === 1
            ? `One line just landed in ${actor}'s rehearsal. They can run the scene against your voice now.`
            : `${sentCount} lines just landed in ${actor}'s rehearsal. They can run the scene against your voice now.`
        }
        actionLabel={remaining > 0
          ? (remaining === 1 ? 'Record the last line' : `Record the other ${remaining} lines`)
          : null}
        onAction={() => setShowThanks(false)}
        onCtaClick={handleCtaClick}
      />,
      false,
    );
  }

  if (alreadyDone && recordedCount === 0) {
    return shell(
      <ReaderThanks
        title={`You already read these for ${actor}.`}
        body={`All ${total} lines came back. If you want to redo one, you still can.`}
        actionLabel='Record a line again'
        onAction={() => setAlreadyDone(false)}
        onCtaClick={handleCtaClick}
      />,
      false,
    );
  }

  const headline = invite?.friend_name
    ? `${invite.friend_name}, ${actor} needs you to read `
    : `${actor} needs you to read `;

  return (
    <div className='rdr' data-theme={dark ? 'dark' : undefined}>
      <div className='rdr__wrap'>
        <p className='rdr__eyebrow'>Dr Self Tape</p>

        <h1 className='rdr__title'>
          {headline}
          <em>{character}</em>
          {"'s lines."}
        </h1>

        <p className='rdr__cost'>
          {`About ${total} ${total === 1 ? 'line' : 'lines'}: usually about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`}
        </p>

        {invite?.scene_title ? (
          <p className='rdr__scene'>{invite.scene_title}</p>
        ) : null}

        {invite?.note ? (
          <blockquote className='rdr__note'>
            <p>{invite.note}</p>
            <cite>{actor}</cite>
          </blockquote>
        ) : null}

        <div className='rdr__legend'>
          <span className='rdr__chip'>
            <i aria-hidden='true' />
            {`${other || 'They'} said this to you`}
          </span>
          <span className='rdr__chip rdr__chip--mine'>
            <i aria-hidden='true' />
            {`${character} say next`}
          </span>
        </div>

        {recorder.micDenied ? (
          <div className='rdr__notice rdr__notice--warn'>
            <p>Your browser is not letting us use the microphone.</p>
            <p>
              Allow microphone access for this page in your browser settings, then
              tap Record again.
            </p>
          </div>
        ) : null}

        <div className='rdr__lines'>
          {rows.map((row) => (
            row.kind === 'direction' ? (
              <p className='rdr__direction' key={`d-${row.line.id}`}>{row.line.text}</p>
            ) : (
              <ReaderLineCard
                key={row.line.id}
                line={row.line}
                cue={row.cue}
                position={row.position}
                total={total}
                take={takes[row.line.id]}
                isRecording={recorder.activeLineId === row.line.id && recorder.isRecording}
                recordTimer={recorder.recordTimer}
                skipped={skipped.has(row.line.id)}
                onRecord={() => handleRecord(row.line.id)}
                onStop={stop}
                onRedo={() => { discard(row.line.id); handleRecord(row.line.id); }}
                onSkip={() => handleSkip(row.line.id)}
                onUnskip={() => handleUnskip(row.line.id)}
              />
            )
          ))}
        </div>

        {sendError ? (
          <div className='rdr__notice rdr__notice--warn'>
            <p>{sendError}</p>
            <p>Tap Send again when you have signal.</p>
          </div>
        ) : null}

        {rejected.length ? (
          <div className='rdr__notice'>
            <p>
              {rejected.length === 1
                ? 'One take could not be saved. Record it again and send.'
                : `${rejected.length} takes could not be saved. Record them again and send.`}
            </p>
          </div>
        ) : null}
      </div>

      <div className='rdr__footer'>
        <div className='rdr__footer-inner'>
          <span className='rdr__progress'>
            <b>{recordedCount}</b>
            {` of ${total}`}
          </span>
          <button
            type='button'
            className='rdr__btn rdr__btn--send'
            onClick={handleSend}
            // Sending mid-record used to upload only the finalised takes and
            // move to the thanks screen with the microphone still running —
            // the take they were in the middle of was silently dropped and
            // its Stop button went with it. Finish the line first.
            disabled={recordedCount === 0 || sending || recorder.isRecording}
          >
            {recorder.isRecording
              ? 'Finish this line first'
              : sending ? 'Sending' : sendError ? 'Try again' : 'Send recordings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicRecord;
