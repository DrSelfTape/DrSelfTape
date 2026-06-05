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

  const containerRef = useRef(null);
  const callRef = useRef(null);
  const cleanupRanRef = useRef(false);

  const [status, setStatus] = useState('loading'); // 'loading' | 'waiting' | 'in-call' | 'left' | 'error'
  const [error, setError] = useState('');
  const [partnerName, setPartnerName] = useState('Your scene partner');

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
        "We couldn't find your rehearsal room — start the call again from your match's chat.",
      );
      return undefined;
    }
    if (!containerRef.current) return undefined;

    const userName =
      `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
      user?.email ||
      'Actor';

    const call = DailyIframe.createFrame(containerRef.current, {
      url: roomUrl,
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        background: PRIMARY_BG,
      },
      showLeaveButton: true,
      showFullscreenButton: true,
      // Daily's prebuilt UI handles its own theming; we just tint the
      // outer container so the page never shows a flash of wrong color.
    });
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
      teardown();
    };
    // We intentionally don't depend on `teardown` directly — it has a
    // stable identity for the lifetime of the component thanks to
    // useCallback, and re-creating the Daily frame on every render
    // would be catastrophic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl]);

  if (status === 'left') {
    return (
      <PostCallScreen
        partnerName={partnerName}
        // Route back to the green-room chat so the user lands where they
        // started — the rating modal opens via ?rehearsal=ended on that
        // screen. Without /green-room they were dumped onto /dashboard
        // and the rating UX never appeared on mobile.
        onClose={() => navigate(`/dashboard/green-room/${meetingId}?rehearsal=ended`)}
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
            justifyContent: 'center',
            gap: 16,
            color: '#FFFFFF',
            background: 'rgba(12,14,20,0.72)',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(212,168,95,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34,
            animation: 'waitPulse 1.6s ease-in-out infinite',
          }}>
            📞
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22, fontWeight: 600,
            letterSpacing: '-0.3px',
          }}>
            Waiting for {partnerName}…
          </div>
          <div style={{ fontSize: 13, opacity: 0.65, maxWidth: 280, textAlign: 'center' }}>
            We let {partnerName.split(' ')[0]} know you're ready. They'll see an Incoming Scene Request notification.
          </div>
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
