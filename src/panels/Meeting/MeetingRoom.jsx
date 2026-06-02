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

  const [status, setStatus] = useState('loading'); // 'loading' | 'in-call' | 'left' | 'error'
  const [error, setError] = useState('');
  const [partnerName, setPartnerName] = useState('Your scene partner');

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

    call.on('joined-meeting', () => {
      setStatus('in-call');
    });
    call.on('participant-joined', (e) => {
      const name = e?.participant?.user_name;
      if (name) setPartnerName(name);
    });
    call.on('left-meeting', () => {
      setStatus('left');
    });
    call.on('error', (e) => {
      setStatus('error');
      setError(e?.errorMsg || 'The call ended unexpectedly.');
    });

    // Kick off the join — Daily's prebuilt iframe handles the
    // permission prompts (camera/mic) inside the iframe so we don't
    // need a separate PreJoinScreen.
    call.join({ url: roomUrl, userName }).catch((err) => {
      setStatus('error');
      setError(err?.message || 'Could not join the rehearsal room.');
    });

    // Clean up on unmount + on a hard navigation away (back button,
    // tab close). beforeunload is best-effort but covers most cases.
    const onUnload = () => { teardown(); };
    window.addEventListener('beforeunload', onUnload);

    return () => {
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
    return <PostCallScreen partnerName={partnerName} onClose={() => navigate('/dashboard?rehearsal=ended')} />;
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
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.18em',
              opacity: 0.7,
            }}
          >
            JOINING THE ROOM…
          </div>
        </div>
      )}
    </div>
  );
}
