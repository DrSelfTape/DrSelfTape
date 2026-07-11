import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import ModePicker from './ModePicker';
import axios from '../../../redux/http';
import endPoints from '../../../redux/constant';
import PermissionsModal from '../../../components/PermissionsModal';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';
import { isNativeIOS } from '../../../utils/purchases';
import { SpeechRecognition as NativeSpeech } from '@capgo/capacitor-speech-recognition';
import { cueProgress, tok as cueTokens } from '../../../utils/cueMatch';
import { resetAudioToPlayback } from '../../../utils/audioSession';
import { logSession } from '../../../redux/features/jericho/jerichoSlice';
import { completeCraftNode, fetchCraftJourney } from '../../../redux/features/craftJourney/craftJourneySlice';

const SILENCE_TIMEOUT = 1500;

/**
 * Voice picker modal shown before starting a live scene.
 */
function VoicePicker({ characters, userRole, onSelect, onCancel }) {
  const partnerChars = characters.filter((c) => c !== userRole);
  const [selected, setSelected] = useState('partner_male');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-[rgba(10,10,10,0.08)] p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-[#0A0A0A] text-xl font-bold mb-2">Who plays opposite you?</h3>
        <p className="text-[rgba(10,10,10,0.4)] text-sm mb-6">
          {partnerChars.length > 0
            ? `Your scene partner: ${partnerChars.join(', ')}`
            : 'Choose a voice for the AI scene partner'}
        </p>

        <div className="space-y-3">
          {[
            { id: 'partner_male', label: 'Male Voice (George)', icon: '👨' },
            { id: 'partner_female', label: 'Female Voice (Lily)', icon: '👩' },
            { id: 'partner_neutral', label: 'Neutral Voice (River)', icon: '🧑' },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setSelected(v.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selected === v.id
                  ? 'border-[#D4A85F] bg-[#D4A85F]/10'
                  : 'border-[rgba(10,10,10,0.08)] hover:border-[rgba(10,10,10,0.14)] bg-white'
              }`}
            >
              <span className="text-2xl">{v.icon}</span>
              <span className={`font-medium ${selected === v.id ? 'text-[#0A0A0A]' : 'text-gray-300'}`}>
                {v.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onCancel}
            className="flex-1 px-5 py-3 rounded-xl border border-[rgba(10,10,10,0.08)] text-[rgba(10,10,10,0.4)] hover:text-[#0A0A0A] hover:border-[rgba(10,10,10,0.14)] transition-colors cursor-pointer font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(selected)}
            className="flex-1 px-5 py-3 rounded-xl bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] font-semibold transition-colors cursor-pointer"
          >
            Start Scene
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Pulsing mic/status indicator in the center of the scene.
 */
function StatusIndicator({ status, compact = false }) {
  const colors = {
    listening: '#FF8280',
    thinking: '#FF8280',
    playing: '#ffffff',
    idle: '#4b5563',
    error: '#ef4444',
  };
  const color = colors[status] || colors.idle;
  const isActive = status === 'listening' || status === 'thinking';

  return (
    <div className="flex items-center justify-center py-8">
      <div className="relative">
        {/* Outer pulse ring */}
        {isActive && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: color }}
          />
        )}
        {/* Second ring */}
        {status === 'listening' && (
          <div
            className="absolute -inset-3 rounded-full animate-pulse opacity-10"
            style={{ backgroundColor: color }}
          />
        )}
        {/* Main circle */}
        <div
          className={`relative ${compact ? 'w-12 h-12' : 'w-20 h-20'} rounded-full flex items-center justify-center transition-colors duration-300 shadow-lg`}
          style={{ backgroundColor: `${color}20`, border: `3px solid ${color}` }}
        >
          {status === 'listening' && (
            <svg className={`${compact ? 'w-5 h-5' : 'w-8 h-8'}`} fill={color} viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
          {status === 'thinking' && (
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#D4A85F] animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-[#D4A85F] animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-[#D4A85F] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          {status === 'playing' && (
            <svg className={`${compact ? 'w-5 h-5' : 'w-8 h-8'}`} fill="white" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
          {status === 'idle' && (
            <svg className={`${compact ? 'w-5 h-5' : 'w-8 h-8'}`} fill="#4b5563" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
          {status === 'error' && (
            <svg className={`${compact ? 'w-5 h-5' : 'w-8 h-8'}`} fill="#ef4444" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_MESSAGES = {
  idle: 'Ready to start',
  listening: 'Your turn — say your line',
  thinking: 'is responding...',
  playing: 'Playing response...',
  error: 'Something went wrong',
};

export default function LiveSceneMode({ lines, userRole, characters, initialVoice, craftSkill, onExit }) {
  // Live Study Mode owns its own Pause / End Scene controls in the top
  // banner — the persistent MobileApp top bar + bottom tab pill just
  // crowd the script and the mic. Slide them both away.
  useHideMobileHeader(true);
  const dispatch = useDispatch();
  const sceneStartTimeRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | listening | thinking | playing | error
  const [showVoicePicker, setShowVoicePicker] = useState(!initialVoice);
  const [showModePicker, setShowModePicker] = useState(false);
  const [readerMode, setReaderMode] = useState(null); // 'pretimed' | 'voice'
  const [pendingVoice, setPendingVoice] = useState(null);
  const [prePauseSeconds, setPrePauseSeconds] = useState(3); // pause after AI line before next
  const [voice, setVoice] = useState(initialVoice || 'partner_male');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const conversationHistoryRef = useRef([]);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const currentLineIdxRef = useRef(0);
  const setCurrentLine = useCallback((idx) => {
    currentLineIdxRef.current = idx;
    setCurrentLineIdx(idx);
  }, []);
  const [errorMsg, setErrorMsg] = useState('');
  const [aiCurrentLine, setAiCurrentLine] = useState('');

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const hasInterimRef = useRef(false);
  const isActiveRef = useRef(false);
  const isProcessingRef = useRef(false);
  const scriptPanelRef = useRef(null);
  // Live mirror of `status` for the SpeechRecognition onerror/onend handlers,
  // which are registered once and otherwise close over a stale `status` —
  // making them drop or wrongly auto-restart listening (#11).
  const statusRef = useRef('idle');
  useEffect(() => { statusRef.current = status; }, [status]);
  // ── Native "listen" mode (iOS default) — SFSpeechRecognizer via the Capgo
  // plugin + known-line endpointing (cueMatch). Refs avoid stale closures in
  // the per-partial handler + the silence-deadlock ticker.
  const readerModeRef = useRef(null);
  const liveTranscriptRef = useRef('');
  const nativeListenersRef = useRef([]);
  const nativeLastSpeechRef = useRef(0);
  const nativeLastChangeRef = useRef(0);
  const nativeConfirmRef = useRef(null);
  const nativeFiredRef = useRef(false);
  const nativeTickRef = useRef(null);
  // Forward refs (these functions are defined below; calling sites above use
  // the ref to dodge the TDZ, same pattern as startPreTimedSceneRef).
  const beginListeningRef = useRef(null);
  const startListenSceneRef = useRef(null);
  const switchToPretimedRef = useRef(null);
  useEffect(() => { readerModeRef.current = readerMode; }, [readerMode]);
  // Stores the resolver for the actor-line wait so the manual "Next"
  // button can short-circuit the auto-advance setTimeout in pre-timed
  // mode. iOS WKWebView doesn't support real speech recognition, so
  // we rely on the actor tapping when they're done.
  const actorAdvanceRef = useRef(null);
  const [sceneStarted, setSceneStarted] = useState(false);
  const [sceneComplete, setSceneComplete] = useState(false);
  const [showMicPermission, setShowMicPermission] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // Keep conversationHistory ref in sync
  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  // Craft Journey completion — when the scene naturally finishes and the
  // session was launched from a Craft Journey node, mark that node done
  // on the BE and unlock the next one. Fires once per session. Also
  // re-fetches the journey map so any other open mount (Home widget,
  // Craft Journey panel) sees the new state without a navigate cycle.
  useEffect(() => {
    if (sceneComplete && craftSkill) {
      dispatch(completeCraftNode({ node: craftSkill, stars: 2 }))
        .then(() => dispatch(fetchCraftJourney()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneComplete]);

  // Fire practice_with_ai analytics event when the session opens.
  useEffect(() => {
    import('../../../utils/analytics').then(({ trackEvent, Events }) => {
      trackEvent(Events.PRACTICE_AI, { script_lines: lines?.length || 0, role: userRole || null });
    }).catch(() => { /* swallow */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // iOS WKWebView refuses to play audio unless the AudioContext is created
  // AND resumed inside a synchronous user-gesture handler. Creating on mount
  // (the previous approach) left the context permanently suspended on iOS,
  // so playTTS appeared silent. We now create it lazily via primeAudio()
  // called from the Begin button's onClick — see line ~915.
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e) {}
        audioContextRef.current = null;
      }
    };
  }, []);

  // Must be called synchronously inside a user-gesture handler (e.g. Begin tap).
  // Creates the AudioContext if needed and resumes it; on iOS this is the only
  // way to unlock audio playback for the rest of the session.
  const primeAudio = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioContextRef.current = new AC();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      // Play a 1-sample silent buffer to fully unlock the context on iOS
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch { /* swallow */ }
  }, []);

  // Determine partner character name
  const partnerName = characters.find((c) => c !== userRole) || 'Scene Partner';

  // Can the listening reader actually work? It needs the script to have parsed
  // into a real back-and-forth: 2+ distinct characters, with lines for BOTH the
  // actor's role AND the partner. A flattened/garbled script that collapses to
  // one undifferentiated blob has no cue to listen for — so we run TIMED mode
  // instead of stranding the actor on a dead "Line 1 of 1" reader.
  const canListen = useMemo(() => {
    // Derive the distinct-character check from `lines` (the actual playback
    // array) rather than the `characters` prop — after a mis-parse the two can
    // diverge, leaving the selected role with no real beats and stranding the
    // actor in listen mode forever (BUG 17).
    if (!Array.isArray(lines) || lines.length < 2) return false;
    const distinctInLines = new Set(lines.map((l) => l.character).filter(Boolean));
    if (distinctInLines.size < 2) return false;
    const actorBeats = lines.filter((l) => l.character === userRole).length;
    const partnerBeats = lines.filter((l) => l.character !== userRole).length;
    return actorBeats >= 1 && partnerBeats >= 1;
  }, [lines, userRole]);

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  /**
   * Scroll the script panel to the current line.
   */
  const scrollToLine = useCallback((idx) => {
    const panel = scriptPanelRef.current;
    if (!panel) return;
    const lineEl = panel.querySelector(`[data-line-idx="${idx}"]`);
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  /**
   * Play TTS audio for the AI response.
   */
  const playTTS = useCallback(async (text, selectedVoice) => {
    // Each line starts with a clean slate — a failure banner from a previous
    // line disappears as soon as a new line attempts playback.
    setErrorMsg('');
    // Lazy fallback: if no gesture has fired yet (shouldn't happen on iOS
    // since Begin / VoicePicker / Allow all prime), still try to create.
    if (!audioContextRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try { audioContextRef.current = new AC(); } catch { /* swallow */ }
      }
    }
    const ctx = audioContextRef.current;

    // Resume if suspended. NOTE: outside a user gesture this can silently
    // fail and leave the context suspended (iOS suspends it after any
    // audio-session interruption) — we branch on the REAL state below
    // instead of assuming resume worked. A missing/suspended context no
    // longer bails: the HTMLAudio path plays regardless.
    if (ctx && ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* swallow */ }
    }

    let response;
    try {
      response = await axios.post(
        endPoints.tts,
        { text, voice: selectedVoice },
        { responseType: 'arraybuffer', timeout: 25000 }
      );
    } catch (err) {
      // Try to decode error response body as JSON for a better message
      let errMsg = err.message;
      try {
        if (err?.response?.data) {
          const decoded = JSON.parse(new TextDecoder().decode(err.response.data));
          errMsg = decoded?.message || errMsg;
        }
      } catch {}
      setErrorMsg(`Voice error: ${errMsg}. Continuing without audio.`);
      setStatus('listening');
      return;
    }

    const arrayBuf = response.data;
    if (!arrayBuf || arrayBuf.byteLength === 0) {
      setStatus('listening');
      return;
    }

    // HTMLAudio path — NOT gated by AudioContext state. Serves two cases:
    // (1) the context is missing or stuck suspended (iOS suspends WebAudio
    //     after an audio-session interruption and resume() outside a gesture
    //     silently fails — previously source.start() then played NOTHING with
    //     no error while the scene marched on: the June-29 silent-reader
    //     1-star, session #114);
    // (2) decodeAudioData rejects (the original fallback).
    // audio.play() rejections propagate to the caller so silence can be
    // surfaced instead of swallowed.
    const playViaHtmlAudio = async () => {
      const blob = new Blob([arrayBuf], { type: 'audio/mpeg' });
      const blobUrl = URL.createObjectURL(blob);
      const audio = new Audio(blobUrl);
      audioRef.current = audio;
      await audio.play();
      await new Promise((resolve) => {
        let done = false;
        const cleanup = () => {
          if (done) return;
          done = true;
          try { URL.revokeObjectURL(blobUrl); } catch { /* noop */ }
          audioRef.current = null;
          resolve();
        };
        audio.onended = cleanup;
        // Without these the scene hangs forever if the blob fails to play
        // or never fires 'ended'. Watchdog = clip duration + 2s slack,
        // falling back to 60s before metadata loads.
        audio.onerror = cleanup;
        setTimeout(cleanup, ((audio.duration || 58) + 2) * 1000);
      });
    };

    const webAudioReady = ctx && ctx.state === 'running';
    if (!webAudioReady) {
      try {
        await playViaHtmlAudio();
      } catch {
        // Even HTMLAudio couldn't start — tell the actor instead of reading
        // the scene in silence. A screen tap is a gesture, so the next line's
        // resume() attempt will succeed.
        setErrorMsg("The reader's voice couldn't play — tap the screen once and continue; the next line will have audio.");
      }
      return;
    }

    let audioBuffer;
    try {
      // .slice(0) prevents "detached ArrayBuffer" crash in Chrome
      audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
    } catch (decodeErr) {
      try {
        await playViaHtmlAudio();
      } catch (fallbackErr) {
        // fallback playback failed
      }
      return;
    }

    return new Promise((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      // Boost the reader's voice — TTS output + the post-recording speaker route
      // can be quiet. >1 gain amplifies above the raw buffer level.
      const gain = ctx.createGain();
      gain.gain.value = 3.5;
      source.connect(gain);
      gain.connect(ctx.destination);
      audioRef.current = source;
      // Watchdog: if iOS still has the context suspended (so source.start
      // silently fails to fire onended), we'd hang runPreTimed forever.
      // Cap the wait at the buffer's known duration + 1.5s slack.
      const watchdogMs = Math.ceil((audioBuffer.duration + 1.5) * 1000);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        audioRef.current = null;
        resolve();
      };
      source.onended = finish;
      setTimeout(finish, watchdogMs);
      try { source.start(0); } catch { finish(); }
    });
  }, []);

  /**
   * Play ALL consecutive AI lines from startIdx, one line at a time.
   * Each line: fetch GPT response for that exact script line → display → TTS → next line.
   */
  const playAiLinesFrom = useCallback(async (startIdx, historySnapshot) => {
    let idx = startIdx;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    // Route audio to the loud playback speaker before the reader speaks — the
    // native recognizer otherwise leaves the session on a quiet record route.
    await resetAudioToPlayback();

    while (idx < lines.length && lines[idx].character !== userRole) {
      if (!isActiveRef.current) return;

      const scriptLine = lines[idx];
      setCurrentLine(idx);
      scrollToLine(idx);
      setStatus('thinking');

      let aiText = scriptLine.dialogue || '';
      // Scripted read: the partner's line is already known, so speak it directly.
      // The scene-partner endpoint only echoes next_script_line back verbatim
      // while charging a live_scene token + a Claude call — skip that redundant
      // cost. Only the improv path (no scripted line) needs a generated line.
      if (!scriptLine.dialogue) {
        try {
          const { data } = await axios.post(endPoints.scenePartner, {
            line: historySnapshot[historySnapshot.length - 1]?.text || '',
            actor_line: historySnapshot[historySnapshot.length - 1]?.text || '',
            script_context: lines.map((l) => `${l.character}: ${l.dialogue}`).join('\n'),
            character: scriptLine.character,
            previous_lines: historySnapshot.slice(-6),
          });
          aiText = data?.data?.response || data?.response || '';
        } catch {
          aiText = '';
        }
      }

      setAiCurrentLine(aiText);
      setConversationHistory((prev) => {
        const updated = [...prev, { role: 'ai', text: aiText }];
        conversationHistoryRef.current = updated;
        return updated;
      });
      setStatus('playing');

      await playTTS(aiText, voice);

      if (!isActiveRef.current) return;
      idx++;
    }

    setAiCurrentLine('');

    if (idx >= lines.length) {
      setStatus('idle');
      setAiCurrentLine('🎬 Scene complete!');
      setSceneComplete(true);
      return;
    }

    setCurrentLine(idx);
    scrollToLine(idx);
    setStatus('listening');
    beginListeningRef.current?.();
  }, [lines, userRole, voice, playTTS, scrollToLine, setCurrentLine]);  // eslint-disable-line

  /**
   * Called when actor finishes speaking. Records their line, then plays AI lines one by one.
   */
  const handleActorLineComplete = useCallback(
    async (spokenText) => {
      if (!spokenText.trim()) return;
      if (isProcessingRef.current) return; // prevent double-fire
      isProcessingRef.current = true;

      // Use refs for both to avoid stale closures
      const newHistory = [...conversationHistoryRef.current, { role: 'actor', text: spokenText.trim() }];
      setConversationHistory(newHistory);
      conversationHistoryRef.current = newHistory;
      setLiveTranscript('');

      // Use ref for current index — always up to date
      // Listen mode advances ONE line at a time (consecutive same-character
      // lines are separate beats). Voice mode keeps skip-to-next-AI.
      let nextIdx;
      if (readerModeRef.current === 'listen') {
        nextIdx = currentLineIdxRef.current + 1;
      } else {
        nextIdx = currentLineIdxRef.current;
        while (nextIdx < lines.length && lines[nextIdx].character === userRole) {
          nextIdx++;
        }
      }

      if (nextIdx >= lines.length) {
        setStatus('idle');
        setAiCurrentLine('🎬 Scene complete!');
        setSceneComplete(true);
        isProcessingRef.current = false;
        return;
      }

      // The next line is ALSO the actor's (listen mode) → advance the
      // teleprompter and listen for it; don't hand off to the reader yet.
      if (readerModeRef.current === 'listen' && lines[nextIdx].character === userRole) {
        setCurrentLine(nextIdx);
        scrollToLine(nextIdx);
        setStatus('listening');
        isProcessingRef.current = false;
        beginListeningRef.current?.();
        return;
      }

      // Play all consecutive AI lines from this point, one at a time
      try {
        await playAiLinesFrom(nextIdx, newHistory);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [lines, userRole, playAiLinesFrom]
  );

  /**
   * Initialize and start SpeechRecognition.
   */
  const startRecognition = useCallback(() => {
    if (!SpeechRecognition) return;

    // Clean up existing
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      const displayText = final || interim;
      if (displayText) {
        hasInterimRef.current = true;
        setLiveTranscript(displayText);
      }

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      if (final) {
        // Got a final result — trigger after silence
        silenceTimerRef.current = setTimeout(() => {
          if (isActiveRef.current) {
            handleActorLineComplete(final);
          }
        }, SILENCE_TIMEOUT);
      } else if (hasInterimRef.current) {
        // Still getting interim results — set longer timeout
        silenceTimerRef.current = setTimeout(() => {
          if (isActiveRef.current && displayText) {
            handleActorLineComplete(displayText);
          }
        }, SILENCE_TIMEOUT);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setStatus('error');
        setErrorMsg('Microphone access required. Please allow mic in browser settings.');
        isActiveRef.current = false;
      } else if (event.error !== 'aborted') {
        // Auto-restart on non-fatal errors
        setTimeout(() => {
          if (isActiveRef.current && statusRef.current === 'listening') {
            startRecognition();
          }
        }, 500);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we're still supposed to be listening. Use statusRef
      // (not the closed-over `status`) so it doesn't see a stale value — same
      // as onerror above (#11).
      if (isActiveRef.current && statusRef.current === 'listening') {
        setTimeout(() => {
          if (isActiveRef.current) {
            try { recognition.start(); } catch {}
          }
        }, 100);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      // recognition start failed
    }
  }, [SpeechRecognition, handleActorLineComplete, status]);

  // ── Native "listen" mode (iOS default): SFSpeechRecognizer via the Capgo
  // plugin + known-line endpointing. The actor's expected turn is KNOWN, so we
  // fire on CONTENT (they reached the line's end), holding through dramatic
  // pauses; silence is only a deadlock fallback. See cueMatch.js.

  // The actor's expected turn = consecutive actor lines from the current index
  // (a turn can span multiple script lines).
  const expectedActorTurn = useCallback(() => {
    // Listen for the CURRENT line only — progress one beat at a time, matching
    // the teleprompter and pre-timed mode. (Consecutive same-character lines are
    // separate beats, NOT one turn — treating them as one made the reader wait
    // for a line the teleprompter never showed.)
    return lines[currentLineIdxRef.current]?.dialogue || '';
  }, [lines]);

  const stopNativeListen = useCallback(async () => {
    if (nativeConfirmRef.current) { clearTimeout(nativeConfirmRef.current); nativeConfirmRef.current = null; }
    if (nativeTickRef.current) { clearInterval(nativeTickRef.current); nativeTickRef.current = null; }
    try { await NativeSpeech.stop(); } catch { /* not running */ }
    try { await NativeSpeech.removeAllListeners(); } catch { /* none */ }
    nativeListenersRef.current = [];
  }, []);

  const startNativeListen = useCallback(async () => {
    const expected = expectedActorTurn();
    // Empty / stage-direction "line" (whitespace, a parenthetical, etc.) has no
    // words to listen for — there's no fire path, so the scene would hang on
    // "listening" forever. Treat it as a no-wait beat and advance immediately.
    if (cueTokens(expected).length === 0) {
      await stopNativeListen();
      // handleActorLineComplete drops whitespace-only text, so pass a tiny
      // placeholder beat to get past its trim guard and advance the scene.
      if (isActiveRef.current) handleActorLineComplete(expected.trim() || '(beat)');
      return;
    }
    nativeFiredRef.current = false;
    nativeLastSpeechRef.current = Date.now();
    nativeLastChangeRef.current = Date.now();
    liveTranscriptRef.current = '';
    setLiveTranscript('');
    await stopNativeListen();

    const fire = async (text) => {
      if (nativeFiredRef.current) return;
      nativeFiredRef.current = true;
      // FULLY stop recognition first — iOS holds the AVAudioSession in record
      // mode while listening, which leaves the reader's TTS silent (the scene
      // "advances" but you hear nothing). Await the stop, give the session a
      // beat to hand back to playback, then re-arm the AudioContext.
      await stopNativeListen();
      // The real fix: the recognizer left the AVAudioSession in `.measurement`
      // mode + `.duckOthers` (silences TTS). Restore the playback session
      // natively before the reader speaks.
      await resetAudioToPlayback();
      await new Promise((r) => setTimeout(r, 120));
      try {
        const ctx = audioContextRef.current;
        if (ctx && ctx.state === 'suspended') await ctx.resume();
        primeAudio(); // silent-buffer kick to re-wake playback after recording
      } catch { /* swallow */ }
      if (isActiveRef.current) handleActorLineComplete(text || expected);
    };

    // Content-match is the primary trigger; this ticker catches the very common
    // case where iOS DROPS THE LAST WORD when you stop talking.
    nativeTickRef.current = setInterval(() => {
      if (!isActiveRef.current || isPausedRef.current) return;
      if (nativeConfirmRef.current || nativeFiredRef.current) return;
      // Absolute wall-clock safety: no line can EVER hang on "listening" — if
      // we've gone 8s without any speech at all, advance regardless of content.
      if (Date.now() - nativeLastSpeechRef.current > 8000) { fire(liveTranscriptRef.current); return; }
      const t = liveTranscriptRef.current;
      if (!t) return;
      const stable = Date.now() - nativeLastChangeRef.current; // transcript settled
      const p = cueProgress(expected, t);
      // Deadlock insurance only — the anchor (above) handles normal completion.
      // If recognition was rough and never hit the anchor, but they've said most
      // of the line and the transcript has settled, advance so it never stalls.
      // Floor the threshold so 1–2 word lines ("No.", "Stop.") don't go negative
      // and fire on any settled noise; require a near-full match on short lines.
      if (p.total > 0 && p.covered >= Math.max(1, p.total - 2) && stable > 1600) {
        if (p.total <= 2 && !p.complete) return;
        fire(t);
      }
    }, 200);

    try {
      const avail = await NativeSpeech.available();
      if (!avail?.available) { switchToPretimedRef.current?.(); return; }
      // Don't discard the permission result — on denial the listener never
      // hears anything and the scene hangs. Fall back to pre-timed instead.
      const perm = await NativeSpeech.requestPermissions();
      const speechPerm = perm?.speechRecognition || perm?.permission || perm?.status;
      if (speechPerm && speechPerm !== 'granted') { switchToPretimedRef.current?.(); return; }
      const h = await NativeSpeech.addListener('partialResults', (e) => {
        if (!isActiveRef.current || isPausedRef.current) return;
        const t = (e?.matches && e.matches[0]) || '';
        if (!t) return;
        nativeLastSpeechRef.current = Date.now();
        // Track when the TEXT actually changes (not just when a partial fires) —
        // a settled transcript is the real "they're done" signal.
        if (t !== liveTranscriptRef.current) {
          liveTranscriptRef.current = t;
          nativeLastChangeRef.current = Date.now();
          setLiveTranscript(t);
        }
        const p = cueProgress(expected, t);
        // Fire when they reach the line's last MEANINGFUL word (the cue). We do
        // NOT reset this on later partials — trailing laughter or a fumbled
        // final syllable is expected and shouldn't delay the reader. A clean
        // full-line match fires a touch faster.
        if (p.anchorReached && !nativeConfirmRef.current) {
          const wait = p.complete ? 350 : 600;
          nativeConfirmRef.current = setTimeout(() => fire(liveTranscriptRef.current), wait);
        }
      });
      nativeListenersRef.current = [h];
      await NativeSpeech.start({
        language: 'en-US',
        partialResults: true,
        contextualStrings: cueTokens(expected),  // bias toward the scripted words
        maxResults: 3,
      });
    } catch (err) {
      // Native recognition failed → fall back to pre-timed so the scene works.
      switchToPretimedRef.current?.();
    }
  }, [expectedActorTurn, stopNativeListen, handleActorLineComplete]);

  // Route "now listen for the actor" to the right engine for the current mode.
  const beginListening = useCallback(() => {
    if (readerModeRef.current === 'listen') startNativeListen();
    else startRecognition();
  }, [startNativeListen, startRecognition]);
  useEffect(() => { beginListeningRef.current = beginListening; }, [beginListening]);

  // Start the scene in LISTEN mode (the iOS default).
  const startListenScene = useCallback((selectedVoice) => {
    setVoice(selectedVoice);
    setShowVoicePicker(false);
    setShowModePicker(false);
    setReaderMode('listen');
    readerModeRef.current = 'listen';   // sync now so beginListening routes right
    setSceneStarted(true);
    isActiveRef.current = true;
    sceneStartTimeRef.current = Date.now();
    const firstLine = lines[0];
    if (firstLine && firstLine.character !== userRole) {
      playAiLinesFrom(0, []);
    } else {
      setCurrentLine(0);
      scrollToLine(0);
      setStatus('listening');
      beginListeningRef.current?.();
    }
  }, [lines, userRole, playAiLinesFrom, scrollToLine, setCurrentLine]);
  useEffect(() => { startListenSceneRef.current = startListenScene; }, [startListenScene]);

  // Fallback: if listening misbehaves (noisy room, hard delivery), drop to the
  // reliable pre-timed flow from the current line.
  const switchToPretimed = useCallback(async () => {
    await stopNativeListen();
    // Native listening left the AVAudioSession in record mode (silences TTS).
    // Restore the playback session + re-wake the AudioContext BEFORE the
    // pre-timed reader speaks, mirroring fire() — otherwise the fallback reader
    // plays silent. (See fire() ~666-671.)
    await resetAudioToPlayback();
    try {
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === 'suspended') await ctx.resume();
      primeAudio();
    } catch { /* swallow */ }
    setReaderMode('pretimed');
    readerModeRef.current = 'pretimed';
    startPreTimedSceneRef.current?.(voice, prePauseSeconds, currentLineIdxRef.current);
  }, [stopNativeListen, voice, prePauseSeconds, primeAudio]);
  useEffect(() => { switchToPretimedRef.current = switchToPretimed; }, [switchToPretimed]);

  /**
   * Start the live scene session.
   */
  // Called after voice is picked — show mode picker.
  // On iOS Capacitor, webkitSpeechRecognition is defined but doesn't
  // actually transcribe (known WKWebView limitation), so skip the mode
  // picker and auto-start in pre-timed mode. Pre-timed plays the AI's
  // line, then pauses for the actor's beat, then auto-advances — same
  // dramatic flow without the broken speech recognition path.
  const onVoiceSelected = useCallback((selectedVoice) => {
    // Unlock audio INSIDE this user gesture — iOS pre-timed mode never
    // reaches the Begin/Allow buttons, so this is our only chance to
    // create + resume the AudioContext before runPreTimed → playTTS.
    primeAudio();
    setPendingVoice(selectedVoice);
    setVoice(selectedVoice);
    setShowVoicePicker(false);
    // Smart auto-fallback: if the script didn't parse into a real back-and-forth
    // there's no cue to listen against, so skip listen/the mode picker entirely
    // and run timed — the reader is never stranded on a dead single "line".
    if (!canListen) {
      startPreTimedSceneRef.current?.(selectedVoice, prePauseSeconds);
      return;
    }
    if (isNativeIOS()) {
      // Listen mode is the iOS default: the reader hears the actor finish their
      // line and responds on their cue. If recognition misbehaves it auto-falls
      // back to pre-timed (and the actor can switch manually mid-scene).
      startListenSceneRef.current?.(selectedVoice);
    } else {
      setShowModePicker(true);
    }
  }, [primeAudio, canListen, prePauseSeconds]);
  // Forward ref to startPreTimedScene — it's defined later in the file
  // and useCallback deps would hit the TDZ if referenced directly.
  const startPreTimedSceneRef = useRef(null);

  // Start voice-activated mode (original behavior)
  const startScene = useCallback(
    (selectedVoice) => {
      // Defensive fallback: if SpeechRecognition isn't available (iOS
      // WKWebView, older browsers), DON'T enter voice mode — the user
      // would get stranded forever on "Your turn" because there's
      // nothing listening. Fall back to pre-timed mode silently so
      // every code path that lands here still produces a working scene.
      if (!SpeechRecognition || isNativeIOS() || !canListen) {
        startPreTimedSceneRef.current?.(selectedVoice, 3);
        return;
      }

      setVoice(selectedVoice);
      setShowVoicePicker(false);
      setShowModePicker(false);
      setReaderMode('voice');
      isActiveRef.current = true;
      sceneStartTimeRef.current = Date.now();

      const firstLine = lines[0];
      if (firstLine && firstLine.character !== userRole) {
        playAiLinesFrom(0, []);
      } else {
        setCurrentLine(0);
        scrollToLine(0);
        setStatus('listening');
        startRecognition();
      }
    },
    [SpeechRecognition, lines, userRole, playAiLinesFrom, startRecognition, scrollToLine, canListen]
  );

  // Start pre-timed mode — AI reads, then pauses for actor, then auto-advances
  const startPreTimedScene = useCallback(
    (selectedVoice, pauseSecs, startIdx = 0) => {
      setVoice(selectedVoice);
      setShowModePicker(false);
      setReaderMode('pretimed');
      setSceneStarted(true);
      isActiveRef.current = true;
      // Stamp the start time so endScene's duration math actually works.
      // Without this, every iOS session (which forces pre-timed mode) had
      // duration=0 → practice-log skipped, Jericho session_log dur=0, and
      // the Craft Journey End-Scene completion guard never fired.
      sceneStartTimeRef.current = Date.now();

      const runPreTimed = async (idx) => {
        if (!isActiveRef.current) return;
        if (idx >= lines.length) {
          setStatus('idle');
          setSceneComplete(true);
          return;
        }

        const line = lines[idx];
        setCurrentLineIdx(idx);
        scrollToLine(idx);

        if (line.character !== userRole) {
          // AI line — play TTS then auto-advance after pause
          setStatus('playing');
          setAiCurrentLine(line.dialogue);
          await playTTS(line.dialogue, selectedVoice);
          if (!isActiveRef.current) return;
          // Pause for actor to absorb / react
          setStatus('idle');
          setAiCurrentLine('');
          await new Promise((res) => setTimeout(res, pauseSecs * 1000));
          runPreTimed(idx + 1);
        } else {
          // Actor's line — show it highlighted and wait. We give the
          // actor two ways forward: tap the "Next →" button when they
          // finish the line (preferred), or let the auto-advance
          // safety timer fire after pauseSecs*2 seconds (so an idle
          // session still moves along instead of hanging on the
          // "Your line" state — the bug Joseph hit on TestFlight).
          setStatus('listening'); // repurpose as "your turn"
          setAiCurrentLine('');
          if (isActiveRef.current) {
            await new Promise((res) => {
              actorAdvanceRef.current = res;
              setTimeout(() => {
                // Only fire the safety timer if no manual tap landed first.
                if (actorAdvanceRef.current === res) res();
              }, pauseSecs * 2000);
            });
            actorAdvanceRef.current = null;
            if (!isActiveRef.current) return;
            runPreTimed(idx + 1);
          }
        }
      };

      runPreTimed(startIdx);
    },
    [lines, userRole, playTTS, scrollToLine]
  );

  // Bind the ref so onVoiceSelected (defined above) can call into the
  // latest startPreTimedScene without taking it as a useCallback dep.
  useEffect(() => {
    startPreTimedSceneRef.current = startPreTimedScene;
  }, [startPreTimedScene]);

  /**
   * Pause the live scene — stop recognition and audio, keep state.
   */
  /**
   * Advance past the current actor line manually. Resolves the
   * actor-wait Promise inside runPreTimed so the scene moves on
   * without waiting for the auto-advance timer.
   */
  const advanceLine = useCallback(() => {
    const resolve = actorAdvanceRef.current;
    if (resolve) {
      actorAdvanceRef.current = null;
      resolve();
    }
  }, []);

  // Manual "I'm done" — works in every mode. In listen mode it skips ahead with
  // whatever was heard (escape hatch if recognition whiffs); in pre-timed it
  // resolves the actor-wait Promise.
  const forceAdvanceActor = useCallback(() => {
    if (readerModeRef.current === 'listen') {
      stopNativeListen();
      const text = liveTranscriptRef.current || expectedActorTurn();
      if (isActiveRef.current) handleActorLineComplete(text);
    } else {
      advanceLine();
    }
  }, [stopNativeListen, expectedActorTurn, handleActorLineComplete, advanceLine]);

  const pauseScene = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    stopNativeListen();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (audioRef.current) {
      try { audioRef.current.stop(); } catch(e) {}
      audioRef.current = null;
    }
    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current.suspend();
    }
    // Resolve any pending actor-line wait so the pre-timed Promise
    // doesn't dangle forever. runPreTimed's post-await `isActiveRef`
    // check will then bail cleanly.
    const resolve = actorAdvanceRef.current;
    if (resolve) {
      actorAdvanceRef.current = null;
      resolve();
    }
    setStatus('idle');
  }, []);

  /**
   * Resume from pause — restart recognition and audio context.
   */
  const resumeScene = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    isActiveRef.current = true;
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Pre-timed (iOS-only path) needs to re-enter runPreTimed from the
    // current line — startRecognition would drop the user into broken
    // voice mode on iOS where webkitSpeechRecognition is non-functional.
    if (readerMode === 'pretimed') {
      startPreTimedSceneRef.current?.(voice, prePauseSeconds, currentLineIdxRef.current);
      return;
    }

    const currentLine = lines[currentLineIdxRef.current];
    if (currentLine && currentLine.character === userRole) {
      setStatus('listening');
      beginListeningRef.current?.();
    } else if (currentLine && currentLine.character !== userRole) {
      playAiLinesFrom(currentLineIdxRef.current, conversationHistoryRef.current);
    }
  }, [lines, userRole, startRecognition, playAiLinesFrom, readerMode, voice, prePauseSeconds]);

  /**
   * End the scene and clean up.
   */
  const endScene = useCallback(() => {
    isActiveRef.current = false;
    isPausedRef.current = false;
    // Resolve any pending actor-line wait so runPreTimed bails cleanly.
    const resolve = actorAdvanceRef.current;
    if (resolve) {
      actorAdvanceRef.current = null;
      resolve();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    stopNativeListen();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (audioRef.current) {
      try { audioRef.current.stop(); } catch(e) {}
      audioRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    // Log session to Jericho (fire and forget)
    const duration = sceneStartTimeRef.current ? Math.round((Date.now() - sceneStartTimeRef.current) / 1000) : 0;
    dispatch(logSession({
      session_type: 'live_scene',
      script_text: lines.map((l) => `${l.character}: ${l.dialogue}`).join('\n').slice(0, 2000),
      role_played: userRole,
      ai_feedback: { conversation_history: conversationHistoryRef.current?.slice(-20) || [] },
      duration_seconds: duration,
    }));
    // Log to the practice-time tracker so the home widget reflects this
    // session. Skip if < 5s to avoid logging accidental Begin → Exit taps.
    if (duration >= 5) {
      axios.post('/v1/growth/practice/log/', { seconds: duration }).catch(() => {});
      sceneStartTimeRef.current = null; // don't double-log on unmount
    }
    // Craft Journey early-out: tapping "End Scene" after a meaningful
    // session (≥15s) should still count the skill as practiced. Without
    // this, the only completion path was getting all the way through
    // every line — most users tap End Scene first and were left stuck
    // on the same node forever. The BE complete_node is idempotent, so
    // re-firing on a session the user already finished is harmless.
    if (craftSkill && duration >= 15) {
      dispatch(completeCraftNode({ node: craftSkill, stars: 2 }))
        .then(() => dispatch(fetchCraftJourney()));
    }
    onExit();
  }, [onExit, dispatch, lines, userRole, craftSkill]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      try { NativeSpeech.stop(); } catch { /* not running */ }
      try { NativeSpeech.removeAllListeners(); } catch { /* none */ }
      if (nativeTickRef.current) clearInterval(nativeTickRef.current);
      if (nativeConfirmRef.current) clearTimeout(nativeConfirmRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (audioRef.current) {
        try { audioRef.current.stop(); } catch(e) {}
        audioRef.current = null;
      }
      // If the user backed out without tapping End, the timer is still
      // live — log whatever they got so home practice time isn't lost.
      const startedAt = sceneStartTimeRef.current;
      if (startedAt) {
        const duration = Math.round((Date.now() - startedAt) / 1000);
        if (duration >= 5) {
          axios.post('/v1/growth/practice/log/', { seconds: duration }).catch(() => {});
        }
        sceneStartTimeRef.current = null;
      }
    };
  }, []);

  // Voice picker
  if (showVoicePicker) {
    return (
      <VoicePicker
        characters={characters}
        userRole={userRole}
        onSelect={onVoiceSelected}
        onCancel={onExit}
      />
    );
  }

  // ── Mode Picker ─────────────────────────────────────────────────────────────
  if (showModePicker) {
    return (
      <ModePicker
        prePauseSeconds={prePauseSeconds}
        setPrePauseSeconds={setPrePauseSeconds}
        onPreTimed={() => startPreTimedScene(pendingVoice, prePauseSeconds)}
        onVoice={() => startScene(pendingVoice)}
        onBack={onExit}
      />
    );
  }

  // Error state for unsupported browsers
  if (!SpeechRecognition && status !== 'error') {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-[#0A0A0A] text-xl font-bold mb-2">Browser Not Supported</h2>
          <p className="text-[rgba(10,10,10,0.4)] mb-6">
            Your browser doesn&apos;t support the Web Speech API. Please use Google Chrome for Live Study Mode.
          </p>
          <button
            onClick={onExit}
            className="bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] px-6 py-3 rounded-xl font-semibold cursor-pointer transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusLabel = status === 'listening' && readerMode === 'listen'
    ? '🎧 Your line — I\'m listening'
    : status === 'listening' && readerMode === 'pretimed'
    ? '🎬 Your line — deliver it now'
    : status === 'thinking'
    ? `${partnerName} ${STATUS_MESSAGES.thinking}`
    : STATUS_MESSAGES[status];

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      style={{
        background: 'var(--aurora-bg, #FAFAF7)',
        // Full-screen takeover: keep the top bar out of the notch and the
        // bottom status bar (with the mobile Pause/End controls) above the
        // home indicator.
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Mic Permission Modal */}
      <PermissionsModal
        isOpen={showMicPermission}
        requireCamera={false}
        requireMic={true}
        context="Live Study Mode"
        onGranted={() => {
          // Belt + suspenders: prime audio again inside this gesture in case
          // iOS suspended the context between Begin and Allow.
          primeAudio();
          setShowMicPermission(false);
          setSceneStarted(true);
          // iOS WKWebView doesn't have a functional webkitSpeechRecognition,
          // so voice-listening mode strands users on "Your turn" forever.
          // Force pre-timed mode on iOS — same logic that runs from the
          // VoicePicker iOS branch (onVoiceSelected at line 580).
          if (isNativeIOS()) {
            startListenSceneRef.current?.(voice);
          } else {
            startScene(voice);
          }
        }}
        onDenied={() => {
          setShowMicPermission(false);
        }}
      />
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a2e]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#D4A85F] animate-pulse" />
            <span className="text-[#0A0A0A] font-semibold text-sm">Live Study Mode</span>
          {readerMode === 'pretimed' && (
            <span className="text-xs bg-[#D4A85F]/20 text-[#7A5A18] border border-[#D4A85F]/30 px-2 py-0.5 rounded-full font-semibold ml-2">
              ⏱ Pre-Timed
            </span>
          )}
          {readerMode === 'voice' && (
            <span className="text-xs bg-[#A7ECDA]/15 text-[#A7ECDA] border border-[#A7ECDA]/20 px-2 py-0.5 rounded-full font-semibold ml-2">
              🎙 Voice
            </span>
          )}
          {readerMode === 'listen' && (
            <span className="text-xs bg-[#A7ECDA]/15 text-[#7A5A18] border border-[#A7ECDA]/30 px-2 py-0.5 rounded-full font-semibold ml-2">
              🎧 Listening
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sceneStarted && (
            <button
              onClick={isPaused ? resumeScene : pauseScene}
              className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isPaused
                  ? 'bg-[#D4A85F] text-[#0A0A0A] hover:bg-[#C09850]'
                  : 'border border-[#D4A85F]/40 text-[#7A5A18] hover:bg-[#D4A85F]/10'
              }`}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
          <button
            onClick={endScene}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors cursor-pointer"
          >
            End Scene
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Mobile "your turn" indicator + manual Next button — only on
            actor lines. iOS WKWebView can't actually listen to the
            actor's voice, so tapping Next is how the scene advances
            once they finish delivering the line. A safety timer
            (pauseSecs * 2) still fires as a fallback. */}
        {status === 'listening' && lines[currentLineIdx]?.character === userRole && (
          <div className="lg:hidden w-full">
            <button
              type="button"
              onClick={forceAdvanceActor}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#D4A85F] active:bg-[#C09850] text-[#0A0A0A] font-bold text-sm tracking-wide cursor-pointer transition-colors"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#7A5A18] animate-pulse" />
              {readerMode === 'listen' ? 'Listening — say your line (tap to skip)' : 'Your line — tap when done'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
            {readerMode === 'listen' && liveTranscript && (
              <div className="w-full px-4 py-1.5 text-center text-xs text-[#7A5A18]/80 italic truncate">“{liveTranscript}”</div>
            )}
            {readerMode === 'listen' && (
              <button
                type="button"
                onClick={() => switchToPretimedRef.current?.()}
                className="w-full text-center py-2 text-xs text-[#7A5A18]/70 underline cursor-pointer"
                style={{ touchAction: 'manipulation' }}
              >
                Trouble hearing you? Switch to timed mode
              </button>
            )}
          </div>
        )}
        {/* Left: Script Panel */}
        <div
          ref={scriptPanelRef}
          className="lg:w-80 lg:h-auto lg:border-r lg:border-b-0 border-b border-[#1a1a2e] overflow-y-auto p-3 block"
          style={{ height: 'var(--script-panel-h, 38vh)' }}
        >
          <style>{`@media (min-width: 1024px) { :root { --script-panel-h: 100%; } }`}</style>
          <h3 className="text-[rgba(10,10,10,0.62)] text-xs font-bold uppercase tracking-wider mb-4">Script</h3>
          <div className="space-y-2">
            {lines.map((line, i) => {
              const isUser = line.character === userRole;
              const isCurrent = i === currentLineIdx;
              const isPast = i < currentLineIdx;
              // Contrast tiers: PAST lines fade (opacity 65%) but stay
              // legible; CURRENT line is full-strength ink with a tinted
              // background; UPCOMING lines are slightly muted so the
              // eye finds the current row instantly.
              return (
                <div
                  key={i}
                  data-line-idx={i}
                  className={`rounded-lg p-2 lg:p-2.5 transition-all duration-300 ${
                    isCurrent
                      ? isUser
                        ? 'bg-[#D4A85F]/20 border-l-4 border-[#D4A85F]'
                        : 'bg-[#A7ECDA]/18 border-l-4 border-[#1AB680]'
                      : isPast
                        ? 'opacity-60'
                        : 'opacity-85'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${
                      isUser ? 'text-[#7A5A18]' : 'text-[rgba(10,10,10,0.78)]'
                    }`}
                  >
                    {line.character}
                  </span>
                  <p className={`text-sm leading-snug ${isCurrent ? 'text-[#0A0A0A] font-medium' : 'text-[rgba(10,10,10,0.82)]'}`}>
                    {line.dialogue}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Stage */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 lg:px-6 min-h-0 overflow-y-auto relative z-10 bg-[var(--aurora-bg,#FAFAF7)]">

          {/* START SCREEN — shown before scene begins */}
          {status === 'idle' && !sceneStarted && (
            <div className="text-center max-w-sm w-full">
              <div className="w-14 h-14 rounded-full bg-[#D4A85F]/15 flex items-center justify-center mx-auto mb-7">
                <svg className="w-7 h-7 text-[#7A5A18]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2
                className="text-[#0A0A0A] text-3xl font-medium tracking-tight mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Ready to study?
              </h2>
              <p className="text-[rgba(10,10,10,0.55)] text-sm mb-10 tracking-wide">
                <span className="text-[#7A5A18] font-semibold">{userRole}</span>
                <span className="mx-2 text-[rgba(10,10,10,0.25)]">·</span>
                <span className="text-[#0A0A0A] font-semibold">{partnerName}</span>
              </p>
              <button
                onClick={() => {
                  // Unlock audio inside the user gesture — iOS WKWebView
                  // requires this BEFORE any later async playback.
                  primeAudio();
                  setShowMicPermission(true);
                }}
                className="w-full bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] px-8 py-3.5 rounded-full font-semibold text-base transition-colors cursor-pointer flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Begin
              </button>
              <p className="text-[rgba(10,10,10,0.4)] text-xs mt-5 leading-relaxed">
                Say your line, then pause — the AI handles the rest.
              </p>
            </div>
          )}

          {/* Paused Overlay */}
          {isPaused && sceneStarted && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-transparent/80 backdrop-blur-sm">
              <div className="text-6xl mb-4">⏸</div>
              <h2 className="text-[#0A0A0A] text-2xl font-bold mb-2">Scene Paused</h2>
              <p className="text-[rgba(10,10,10,0.62)] text-sm mb-6">Take a moment. Resume when you&apos;re ready.</p>
              <div className="flex gap-3">
                <button
                  onClick={resumeScene}
                  className="bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] px-8 py-3 rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span>▶</span> Resume Scene
                </button>
                <button
                  onClick={endScene}
                  className="border border-red-500/40 text-red-400 hover:bg-red-500/10 px-6 py-3 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  End Scene
                </button>
              </div>
            </div>
          )}

          {/* AI Character Line Display — when listening, show the
              user's UPCOMING line in big teleprompter type so they can
              read it. When the AI is speaking, show the AI line. */}
          {(sceneStarted || status !== 'idle') && (
          <div className="text-center max-w-2xl w-full mb-2 lg:mb-4">
            {status === 'playing' || aiCurrentLine ? (
              <>
                <span className="text-[#7A5A18] text-xs font-bold uppercase tracking-widest block mb-3">
                  {partnerName}
                </span>
                <p className="text-[#0A0A0A] text-xl md:text-3xl font-light leading-relaxed">
                  {aiCurrentLine}
                </p>
              </>
            ) : status === 'listening' && lines[currentLineIdx]?.character === userRole ? (
              <>
                <span className="text-[#7A5A18] text-xs font-bold uppercase tracking-widest block mb-3">
                  Your line · {userRole}
                </span>
                <p className="text-[#0A0A0A] text-xl md:text-3xl font-light leading-relaxed px-2">
                  &ldquo;{lines[currentLineIdx]?.dialogue}&rdquo;
                </p>
              </>
            ) : status === 'listening' ? (
              <p className="text-[rgba(10,10,10,0.62)] text-lg">Your turn...</p>
            ) : null}
          </div>
          )}

          {/* Status Indicator */}
          <>
            <span className="hidden lg:block"><StatusIndicator status={status} /></span>
            <span className="lg:hidden"><StatusIndicator status={status} compact={true} /></span>
          </>

          {/* Status Label */}
          <div className="mt-2 mb-3 lg:mb-6">
            <span
              className={`text-sm font-medium px-4 py-1.5 rounded-full ${
                status === 'listening'
                  ? 'bg-[#D4A85F]/10 text-[#7A5A18]'
                  : status === 'thinking'
                  ? 'bg-[#D4A85F]/10 text-[#7A5A18]'
                  : status === 'playing'
                  ? 'bg-white/5 text-gray-300'
                  : status === 'error'
                  ? 'bg-red-500/10 text-red-400'
                  : 'text-[rgba(10,10,10,0.62)]'
              }`}
            >
              {statusLabel}
            </span>
          </div>

          {/* Live Transcript */}
          <div className="max-w-xl w-full min-h-[60px] text-center">
            {liveTranscript && status === 'listening' && (
              <p className="text-[rgba(10,10,10,0.4)] text-lg italic animate-pulse">&ldquo;{liveTranscript}&rdquo;</p>
            )}
          </div>

          {/* Error Message — renders whenever a message is set, NOT only in
              the terminal 'error' status: the TTS-failure paths deliberately
              continue the scene (status stays 'listening'/'playing'), and
              gating on status==='error' made those messages invisible (codex
              review catch — the June-29 silent reader stayed silent AND
              unexplained). playTTS clears it on each new line. */}
          {errorMsg && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-6 py-3 max-w-md">
              <p className="text-red-400 text-sm text-center">{errorMsg}</p>
            </div>
          )}

          {/* Conversation History (last few lines) */}
          {conversationHistory.length > 0 && (
            <div className="mt-8 max-w-lg w-full space-y-2 lg:hidden">
              {conversationHistory.slice(-4).map((turn, i) => (
                <div
                  key={i}
                  className={`text-xs px-3 py-2 rounded-lg ${
                    turn.role === 'actor'
                      ? 'bg-[#D4A85F]/10 text-[#7A5A18]/70 text-right'
                      : 'bg-white/5 text-[rgba(10,10,10,0.62)] text-left'
                  }`}
                >
                  <span className="font-bold uppercase text-[10px] block mb-0.5">
                    {turn.role === 'actor' ? userRole : partnerName}
                  </span>
                  {turn.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 sm:px-6 py-3 border-t border-[#1a1a2e] flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4 text-xs text-[rgba(10,10,10,0.62)]">
          <span>
            Line {Math.min(currentLineIdx + 1, lines.length)} of {lines.length}
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">{conversationHistory.length} exchanges</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile pause/end buttons — compact for bottom bar */}
          {sceneStarted && (
            <div className="flex items-center gap-2 sm:hidden">
              <button
                onClick={isPaused ? resumeScene : pauseScene}
                className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isPaused
                    ? 'bg-[#D4A85F] text-[#0A0A0A]'
                    : 'border border-[#D4A85F]/40 text-[#7A5A18]'
                }`}
              >
                {isPaused ? '▶' : '⏸'}
              </button>
              <button
                onClick={endScene}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 rounded-lg border border-red-500/40 text-red-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          <span className="text-xs text-[rgba(10,10,10,0.62)] hidden sm:inline">
            {voice === 'partner_male' ? 'George' : voice === 'partner_female' ? 'Lily' : 'River'}
          </span>
        </div>
      </div>
    </div>
  );
}
