/**
 * MeetingRoom — Daily.co prebuilt iframe.
 *
 * Earlier builds rendered a custom PeerJS-based UI (see MeetingRoomLegacy.jsx).
 * The BE was already provisioning a Daily.co room on every Start Rehearsal
 * tap, but the FE was discarding the URL and using PeerJS cloud signaling
 * instead — so Daily.co was paying for empty rooms and the cloud recording
 * feature was wired but never captured anything.
 *
 * This rewrite plugs the FE into the Daily.co room the BE already created.
 * Daily handles every video tile, mute/camera/screen-share control, leave
 * button, chat, network handling, and the prebuilt iframe is accessible.
 * Cloud recording (apps/rehearsals/views.py) now actually captures audio
 * + video because both participants are in the same Daily room.
 *
 * `roomUrl` arrives via navigation state from GreenRoomChat.handleStartRehearsal
 * or socket.jsx's incoming-call modal. If a user lands here without it
 * (deep link / refresh), they're bounced back to Green Room with a hint.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import DailyIframe from '@daily-co/daily-js';

import PostCallScreen from '../../components/MeetingRoom/PostCallScreen';
import { clearMeetingHostFlag } from '../../utils/meeting';
import axiosInstance from '../../redux/http';

const PRIMARY_BG = '#0c0e14';

export default function MeetingRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { meetingId } = useParams();
  const user = useSelector((state) => state?.auth?.user);

  // The Daily room URL set by GreenRoomChat / incoming-call modal.
  // (`location.state.roomUrl` is the canonical source; the fallback is a
  // demo room derived from the meetingId, which is only meaningful if
  // someone pre-creates that room on the Daily side.)
  const roomUrl = location.state?.roomUrl || null;
  // The :meetingId param is the Daily room slug, NOT the match. The real matchId
  // rides navigation state (from handleStartRehearsal). It's null when we arrived
  // via a path that doesn't carry it (incoming call / notification) — in which
  // case we must NOT rate against the wrong id (PostCallScreen skips rating on
  // null). The return route can still fall back to the slug.
  const matchId = location.state?.matchId || null;
  // Caller-side ring context (set by GreenRoomChat when WE initiated).
  const startedCall = Boolean(location.state?.startedCall);
  const ringIdRef = useRef(location.state?.ringId || null);

  const containerRef = useRef(null);
  const callRef = useRef(null);
  const cleanupRanRef = useRef(false);
  // 'ringing' | 'declined' | 'noanswer' | null — caller overlay state while
  // we wait alone in the room. Cleared the moment the partner joins.
  const [ringPhase, setRingPhase] = useState(startedCall ? 'ringing' : null);
  const ringPhaseRef = useRef(startedCall ? 'ringing' : null);
  const setRing = (v) => { ringPhaseRef.current = v; setRingPhase(v); };
  const reachedCallRef = useRef(false);

  // Best-effort hang-up signal: kills the callee's ring + leaves them a
  // missed-call note. Fired on explicit hang-up, decline timeout exit, and
  // unmount-before-connect. Server ignores it (409) once answered.
  const cancelRing = useCallback(() => {
    if (!matchId || ringPhaseRef.current !== 'ringing' || reachedCallRef.current) return;
    ringPhaseRef.current = null;
    axiosInstance.post(`/v1/matching/matches/${matchId}/cancel-rehearsal/`, {
      ring_id: ringIdRef.current || undefined,
    }).catch(() => {});
  }, [matchId]);

  const [status, setStatus] = useState('loading'); // 'loading' | 'waiting' | 'in-call' | 'left' | 'error'
  const [error, setError] = useState('');
  // Lowercase so it reads naturally inside "Waiting for …" / "session with …"
  // before a real participant name arrives via setPartnerName().
  const DEFAULT_PARTNER = 'your scene partner';
  // Seed from nav state (GreenRoomChat passes the real name) so the ringing
  // overlay says "Ringing Sam…" instead of "Ringing your scene partner…".
  const [partnerName, setPartnerName] = useState(location.state?.partnerName || DEFAULT_PARTNER);

  // If the iframe never fires 'joined-meeting' within 30s, surface a
  // real error so the user isn't stuck on the spinner. Daily.co usually
  // joins in <5s; >30s means something is wrong (camera permission
  // denied silently, network block, room expired).
  const joinTimerRef = useRef(null);

  // Cleanup helper — destroys the Daily frame + clears the host flag.
  // Safe to call multiple times; guarded by cleanupRanRef so a quick
  // unmount-then-remount in dev doesn't double-destroy.
  const teardown = useCallback(async () => {
    if (cleanupRanRef.current) return;
    cleanupRanRef.current = true;
    if (meetingId) clearMeetingHostFlag(meetingId);
    const call = callRef.current;
    callRef.current = null;
    if (!call) return;
    try {
      await call.leave();
    } catch {
      /* swallow — Daily throws if already-left */
    }
    try {
      call.destroy();
    } catch {
      /* swallow */
    }
  }, [meetingId]);

  useEffect(() => {
    // No room URL → user landed here via a stale deep link. Send them
    // back to Green Room with a polite error so they can retry start.
    if (!roomUrl) {
      setStatus('error');
      setError(
        "We couldn't find your rehearsal room. Start the call again from your match's chat.",
      );
      return undefined;
    }
    if (!containerRef.current) return undefined;

    // A roomUrl CHANGE re-runs this effect: without resetting the guard,
    // teardown() would no-op forever after the first cleanup, leaking the
    // old Daily frame (and the camera) under the new one.
    cleanupRanRef.current = false;

    // Daily's prebuilt breadcrumb shows the parent document.title (the
    // "Home page" label Joseph flagged). Name the room for real.
    const prevTitle = document.title;
    document.title = 'Scene Read';

    const userName =
      `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
      user?.email ||
      'Actor';

    let call;
    try {
      call = DailyIframe.createFrame(containerRef.current, {
        url: roomUrl,
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          background: PRIMARY_BG,
        },
        showLeaveButton: true,
        showFullscreenButton: true,
        // Brand the prebuilt UI: Aurora dark + heritage gold accents so the
        // call room reads as OUR studio, not Daily's default navy.
        theme: {
          colors: {
            accent: '#D4A85F',
            accentText: '#0A0A0A',
            background: '#0c0e14',
            backgroundAccent: '#161A24',
            baseText: '#F4F4EE',
            border: '#2A2E3A',
            mainAreaBg: '#0c0e14',
            mainAreaBgAccent: '#161A24',
            mainAreaText: '#F4F4EE',
            supportiveText: '#9AA0AD',
          },
        },
      });
    } catch (err) {
      // DailyIframe.createFrame can throw synchronously if another frame
      // already exists in this container, or if the SDK fails to load.
      // Without catching here, the React tree crashes and the user gets
      // bounced back to the chat with no visible explanation.
      setStatus('error');
      setError(
        (err && err.message)
          ? `Couldn't initialize the call: ${err.message}`
          : "Couldn't initialize the call. Please try again."
      );
      return undefined;
    }
    callRef.current = call;

    // Watchdog — fail loud if Daily never confirms join within 30s.
    joinTimerRef.current = setTimeout(() => {
      // Don't trip if we already moved past loading.
      setStatus((s) => (s === 'loading' ? 'error' : s));
      setError((e) => e || "Couldn't connect to the rehearsal room. Check your camera + mic permissions in Settings → Dr Self Tape and try again.");
    }, 30000);

    call.on('joined-meeting', () => {
      if (joinTimerRef.current) { clearTimeout(joinTimerRef.current); joinTimerRef.current = null; }
      // Joined the room — but we're still alone until the partner
      // shows up. The 'participant-joined' event below flips us to
      // 'in-call' the moment they connect.
      setStatus('waiting');
    });
    call.on('participant-joined', (e) => {
      const name = e?.participant?.user_name;
      if (name) setPartnerName(name);
      reachedCallRef.current = true;
      setRing(null); // they picked up — ringing overlay dies
      setStatus('in-call');
    });
    call.on('left-meeting', () => {
      if (joinTimerRef.current) { clearTimeout(joinTimerRef.current); joinTimerRef.current = null; }
      setStatus('left');
    });
    call.on('error', (e) => {
      if (joinTimerRef.current) { clearTimeout(joinTimerRef.current); joinTimerRef.current = null; }
      setStatus('error');
      // Daily error messages are usually technical — map the common
      // ones to plainer copy.
      const raw = e?.errorMsg || '';
      const friendly = /not.*allowed|permission|nodevice|no.media/i.test(raw)
        ? 'We need camera and microphone access. Open Settings → Dr Self Tape and turn them on, then try again.'
        : /expired|invalid.*url|room.*not.*found/i.test(raw)
        ? 'This rehearsal room is no longer available. Tap Back to start a new one.'
        : raw || 'The call ended unexpectedly.';
      setError(friendly);
    });

    // Kick off the join — Daily's prebuilt iframe handles the
    // permission prompts (camera/mic) inside the iframe so we don't
    // need a separate PreJoinScreen.
    call.join({ url: roomUrl, userName }).catch((err) => {
      if (joinTimerRef.current) { clearTimeout(joinTimerRef.current); joinTimerRef.current = null; }
      setStatus('error');
      setError(err?.message || 'Could not join the rehearsal room.');
    });

    // Clean up on unmount + on a hard navigation away (back button,
    // tab close). beforeunload is best-effort but covers most cases.
    const onUnload = () => { teardown(); };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      if (joinTimerRef.current) { clearTimeout(joinTimerRef.current); joinTimerRef.current = null; }
      window.removeEventListener('beforeunload', onUnload);
      document.title = prevTitle;
      // Leaving while still ringing = hanging up. Must run before teardown
      // so the callee's phone stops ringing the moment we bail.
      cancelRing();
      teardown();
    };
    // We intentionally don't depend on `teardown` directly — it has a
    // stable identity for the lifetime of the component thanks to
    // useCallback, and re-creating the Daily frame on every render
    // would be catastrophic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl]);

  // Caller ring lifecycle: the callee's answer/decline arrives over the
  // socket (drst-ring-update); no event within the ring TTL = no answer.
  useEffect(() => {
    if (!startedCall) return undefined;
    const onRingUpdate = (e) => {
      const d = e?.detail || {};
      if (String(d.matchId) !== String(matchId)) return;
      if (ringIdRef.current && d.ringId && d.ringId !== ringIdRef.current) return;
      // Once the partner actually connected, a straggling 'declined' from a
      // second device must not flip a live call into the declined screen.
      if (d.state === 'declined' && !reachedCallRef.current) setRing('declined');
      if (d.state === 'answered') setRing(null); // joining any second — keep waiting UI
    };
    window.addEventListener('drst-ring-update', onRingUpdate);
    const noAnswerTimer = setTimeout(() => {
      if (ringPhaseRef.current === 'ringing' && !reachedCallRef.current) {
        cancelRing(); // sends the missed-call note; safe no-op if answered
        ringPhaseRef.current = 'noanswer';
        setRingPhase('noanswer');
      }
    }, 90000);
    return () => {
      window.removeEventListener('drst-ring-update', onRingUpdate);
      clearTimeout(noAnswerTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedCall, matchId]);

  const hangUp = () => {
    cancelRing();
    navigate(matchId ? `/dashboard/green-room/${matchId}` : '/dashboard/green-room');
  };

  if (status === 'left') {
    return (
      <PostCallScreen
        partnerName={partnerName}
        matchId={matchId}
        onHome={() => navigate('/dashboard')}
        // Rating is now captured ON the post-call screen (submits on tap), so we
        // drop straight back into the match's chat — no ?rehearsal=ended, which
        // would pop a second, now-redundant rating modal.
        // With a real matchId, land in that match's chat; without one (a path
        // that didn't carry it), go to the matches list rather than a chat keyed
        // by the Daily room slug, which isn't a valid match id.
        onClose={() => navigate(matchId ? `/dashboard/green-room/${matchId}` : '/dashboard/green-room')}
      />
    );
  }

  if (status === 'error') {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: PRIMARY_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: '#FFFFFF',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
            Couldn&apos;t join the call
          </h2>
          <p style={{ marginTop: 12, color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.5 }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              marginTop: 20,
              padding: '12px 24px',
              borderRadius: 100,
              background: '#D4A85F',
              color: '#0E0D0A',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Back to Green Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: PRIMARY_BG,
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '100dvh',
        }}
      />
      {status === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            color: '#FFFFFF',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '3px solid rgba(212,168,95,0.25)',
            borderTopColor: '#D4A85F',
            animation: 'meetingSpin 0.9s linear infinite',
          }} />
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.18em',
            opacity: 0.7,
          }}>
            CONNECTING…
          </div>
          <div style={{ fontSize: 13, opacity: 0.55, maxWidth: 280, textAlign: 'center' }}>
            Allow camera and microphone when prompted.
          </div>
          <style>{`@keyframes meetingSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {status === 'waiting' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            // While ringing (or plainly waiting) the caller's own camera is
            // the best thing on screen — actors warm up on it (Bumble/
            // Snapchat pattern). Bottom-anchor the ring UI over a gradient
            // instead of drowning the self-view in a full scrim; the heavier
            // centered scrim returns for the declined/no-answer verdicts.
            justifyContent: (ringPhase === 'declined' || ringPhase === 'noanswer') ? 'center' : 'flex-end',
            paddingBottom: (ringPhase === 'declined' || ringPhase === 'noanswer') ? 0 : 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
            gap: 16,
            color: '#FFFFFF',
            background: (ringPhase === 'declined' || ringPhase === 'noanswer')
              ? 'rgba(12,14,20,0.82)'
              : 'linear-gradient(180deg, rgba(12,14,20,0.35) 0%, rgba(12,14,20,0) 30%, rgba(12,14,20,0) 55%, rgba(12,14,20,0.88) 100%)',
            // The container must NOT eat taps during ringing — the gradient
            // is transparent over Daily's own controls, so only the verdict
            // scrims capture; the Hang up button opts back in below.
            pointerEvents: (ringPhase === 'declined' || ringPhase === 'noanswer') ? 'auto' : 'none',
          }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: ringPhase === 'declined' ? 'rgba(255,59,48,0.18)' : 'rgba(212,168,95,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34,
            animation: ringPhase === 'ringing' || !ringPhase ? 'waitPulse 1.6s ease-in-out infinite' : 'none',
          }}>
            📞
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22, fontWeight: 600,
            letterSpacing: '-0.3px',
          }}>
            {ringPhase === 'ringing' && `Ringing ${partnerName === DEFAULT_PARTNER ? 'them' : partnerName.split(' ')[0]}…`}
            {ringPhase === 'declined' && `${partnerName === DEFAULT_PARTNER ? 'They' : partnerName.split(' ')[0]} can't read right now`}
            {ringPhase === 'noanswer' && 'No answer'}
            {!ringPhase && `Waiting for ${partnerName}…`}
          </div>
          <div style={{ fontSize: 13, opacity: 0.65, maxWidth: 280, textAlign: 'center' }}>
            {ringPhase === 'ringing' && "Their phone is ringing, even with the app closed. Warm up — you're already on camera."}
            {ringPhase === 'declined' && 'Try them again later, or line up another reader in Green Room.'}
            {ringPhase === 'noanswer' && `We left ${partnerName === DEFAULT_PARTNER ? 'them' : partnerName.split(' ')[0]} a missed-call note. They can call you back in one tap.`}
            {!ringPhase && `We let ${partnerName === DEFAULT_PARTNER ? 'them' : partnerName.split(' ')[0]} know you're ready. They'll see an Incoming Scene Request notification.`}
          </div>
          {ringPhase === 'ringing' && (
            <button
              type="button"
              onClick={hangUp}
              onTouchEnd={(e) => { e.preventDefault(); hangUp(); }}
              style={{
                marginTop: 8, padding: '13px 30px', borderRadius: 100,
                background: '#FF3B30', color: '#fff', fontWeight: 700,
                border: 'none', cursor: 'pointer', fontSize: 14,
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                pointerEvents: 'auto', // container is pointerEvents:none while ringing
              }}
            >
              Hang up
            </button>
          )}
          {(ringPhase === 'declined' || ringPhase === 'noanswer') && (
            <button
              type="button"
              onClick={hangUp}
              onTouchEnd={(e) => { e.preventDefault(); hangUp(); }}
              style={{
                marginTop: 8, padding: '13px 30px', borderRadius: 100,
                background: '#D4A85F', color: '#0E0D0A', fontWeight: 700,
                border: 'none', cursor: 'pointer', fontSize: 14,
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              }}
            >
              Back to Green Room
            </button>
          )}
          <style>{`
            @keyframes waitPulse {
              0%, 100% { transform: scale(1); opacity: 0.85; }
              50%      { transform: scale(1.08); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
