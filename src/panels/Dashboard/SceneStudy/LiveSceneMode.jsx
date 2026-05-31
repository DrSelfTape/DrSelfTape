import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import ModePicker from './ModePicker';
import axios from '../../../redux/http';
import endPoints from '../../../redux/constant';
import PermissionsModal from '../../../components/PermissionsModal';
import { logSession } from '../../../redux/features/jericho/jerichoSlice';

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

export default function LiveSceneMode({ lines, userRole, characters, initialVoice, onExit }) {
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
  const [sceneStarted, setSceneStarted] = useState(false);
  const [sceneComplete, setSceneComplete] = useState(false);
  const [showMicPermission, setShowMicPermission] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // Keep conversationHistory ref in sync
  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  // Fire practice_with_ai analytics event when the session opens.
  useEffect(() => {
    import('../../../utils/analytics').then(({ trackEvent, Events }) => {
      trackEvent(Events.PRACTICE_AI, { script_lines: lines?.length || 0, role: userRole || null });
    }).catch(() => { /* swallow */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create AudioContext on mount — resumed on user gesture (not created inside it)
  useEffect(() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      audioContextRef.current = new AC();
    }
    return () => {
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e) {}
        audioContextRef.current = null;
      }
    };
  }, []);

  // Determine partner character name
  const partnerName = characters.find((c) => c !== userRole) || 'Scene Partner';

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
    const ctx = audioContextRef.current;
    if (!ctx) {
      return;
    }

    // Resume if suspended
    if (ctx.state === 'suspended') {
      await ctx.resume();
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

    let audioBuffer;
    try {
      // .slice(0) prevents "detached ArrayBuffer" crash in Chrome
      audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
    } catch (decodeErr) {
      try {
        const blob = new Blob([arrayBuf], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        const audio = new Audio(blobUrl);
        audioRef.current = audio;
        await audio.play();
        await new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(blobUrl);
            audioRef.current = null;
            resolve();
          };
        });
      } catch (fallbackErr) {
        // fallback playback failed
      }
      return;
    }

    return new Promise((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      audioRef.current = source;
      source.onended = () => {
        audioRef.current = null;
        resolve();
      };
      source.start(0);
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

    while (idx < lines.length && lines[idx].character !== userRole) {
      if (!isActiveRef.current) return;

      const scriptLine = lines[idx];
      setCurrentLine(idx);
      scrollToLine(idx);
      setStatus('thinking');

      let aiText = scriptLine.dialogue; // fallback: use raw script line

      try {
        const { data } = await axios.post(endPoints.scenePartner, {
          line: historySnapshot[historySnapshot.length - 1]?.text || '',
          actor_line: historySnapshot[historySnapshot.length - 1]?.text || '',
          next_script_line: scriptLine.dialogue,
          script_context: lines.map((l) => `${l.character}: ${l.dialogue}`).join('\n'),
          character: scriptLine.character,
          previous_lines: historySnapshot.slice(-6),
        });
        aiText = data?.data?.response || data?.response || scriptLine.dialogue;
      } catch {
        // API failed — use raw script line so scene keeps moving
        aiText = scriptLine.dialogue;
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
      return;
    }

    setCurrentLine(idx);
    scrollToLine(idx);
    setStatus('listening');
    startRecognition();
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
      let nextIdx = currentLineIdxRef.current;
      // Move past the current user line(s) to find the next AI line
      while (nextIdx < lines.length && lines[nextIdx].character === userRole) {
        nextIdx++;
      }

      if (nextIdx >= lines.length) {
        setStatus('idle');
        setAiCurrentLine('🎬 Scene complete!');
        isProcessingRef.current = false;
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
          if (isActiveRef.current && status === 'listening') {
            startRecognition();
          }
        }, 500);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we're still supposed to be listening
      if (isActiveRef.current && status === 'listening') {
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

  /**
   * Start the live scene session.
   */
  // Called after voice is picked — show mode picker
  const onVoiceSelected = useCallback((selectedVoice) => {
    setPendingVoice(selectedVoice);
    setVoice(selectedVoice);
    setShowVoicePicker(false);
    setShowModePicker(true);
  }, []);

  // Start voice-activated mode (original behavior)
  const startScene = useCallback(
    (selectedVoice) => {
      if (!SpeechRecognition) {
        setStatus('error');
        setErrorMsg("Your browser doesn't support live mode. Try Chrome.");
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
    [SpeechRecognition, lines, userRole, playAiLinesFrom, startRecognition, scrollToLine]
  );

  // Start pre-timed mode — AI reads, then pauses for actor, then auto-advances
  const startPreTimedScene = useCallback(
    (selectedVoice, pauseSecs) => {
      setVoice(selectedVoice);
      setShowModePicker(false);
      setReaderMode('pretimed');
      setSceneStarted(true);
      isActiveRef.current = true;

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
          // Actor's line — show it highlighted, wait for manual "Next" tap
          setStatus('listening'); // repurpose as "your turn"
          setAiCurrentLine('');
          // Auto-advance after actor has time to deliver their line (pauseSecs * 2)
          if (isActiveRef.current) {
            await new Promise((res) => setTimeout(res, pauseSecs * 2000));
            runPreTimed(idx + 1);
          }
        }
      };

      runPreTimed(0);
    },
    [lines, userRole, playTTS, scrollToLine]
  );

  /**
   * Pause the live scene — stop recognition and audio, keep state.
   */
  const pauseScene = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (audioRef.current) {
      try { audioRef.current.stop(); } catch(e) {}
      audioRef.current = null;
    }
    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current.suspend();
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

    const currentLine = lines[currentLineIdxRef.current];
    if (currentLine && currentLine.character === userRole) {
      setStatus('listening');
      startRecognition();
    } else if (currentLine && currentLine.character !== userRole) {
      playAiLinesFrom(currentLineIdxRef.current, conversationHistoryRef.current);
    }
  }, [lines, userRole, startRecognition, playAiLinesFrom]);

  /**
   * End the scene and clean up.
   */
  const endScene = useCallback(() => {
    isActiveRef.current = false;
    isPausedRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
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
    onExit();
  }, [onExit, dispatch, lines, userRole]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
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

  const statusLabel = readerMode === 'pretimed' && status === 'listening'
    ? '🎬 Your line — deliver it now'
    : status === 'thinking'
    ? `${partnerName} ${STATUS_MESSAGES.thinking}`
    : STATUS_MESSAGES[status];

  return (
    <div className="fixed inset-0 z-[60] bg-transparent flex flex-col overflow-hidden">
      {/* Mic Permission Modal */}
      <PermissionsModal
        isOpen={showMicPermission}
        requireCamera={false}
        requireMic={true}
        context="Live Study Mode"
        onGranted={() => {
          // Just resume the already-created AudioContext inside the user gesture
          if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
          }
          setShowMicPermission(false);
          setSceneStarted(true);
          startScene(voice);
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
        </div>
        <div className="flex items-center gap-2">
          {sceneStarted && (
            <button
              onClick={isPaused ? resumeScene : pauseScene}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
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
            className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors cursor-pointer"
          >
            End Scene
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Mobile "your turn" indicator — only shows on mobile when it's actor's line */}
        {status === 'listening' && lines[currentLineIdx]?.character === userRole && (
          <div className="lg:hidden flex items-center justify-center gap-2 py-1.5 bg-[#D4A85F]/20 border-b border-[#D4A85F]/30 text-[#7A5A18] text-xs font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A85F] animate-pulse" />
            Your line
          </div>
        )}
        {/* Left: Script Panel */}
        <div
          ref={scriptPanelRef}
          className="lg:w-80 lg:h-auto lg:border-r lg:border-b-0 border-b border-[#1a1a2e] overflow-y-auto p-3 block"
          style={{ height: 'var(--script-panel-h, 45vh)' }}
        >
          <style>{`@media (min-width: 1024px) { :root { --script-panel-h: 100%; } }`}</style>
          <h3 className="text-[rgba(10,10,10,0.62)] text-xs font-bold uppercase tracking-wider mb-4">Script</h3>
          <div className="space-y-2">
            {lines.map((line, i) => {
              const isUser = line.character === userRole;
              const isCurrent = i === currentLineIdx;
              return (
                <div
                  key={i}
                  data-line-idx={i}
                  className={`rounded-lg p-1.5 lg:p-2.5 transition-all duration-300 ${
                    isCurrent
                      ? isUser
                        ? 'bg-[#D4A85F]/15 border-l-2 border-[#D4A85F]'
                        : 'bg-white/5 border-l-2 border-white/40'
                      : 'opacity-40'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${
                      isUser ? 'text-[#7A5A18]' : 'text-[rgba(10,10,10,0.62)]'
                    }`}
                  >
                    {line.character}
                  </span>
                  <p className={`text-xs leading-relaxed ${isCurrent ? 'text-gray-200' : 'text-[rgba(10,10,10,0.62)]'}`}>
                    {line.dialogue}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Stage */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 lg:px-6 min-h-0">

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
                onClick={() => setShowMicPermission(true)}
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

          {/* AI Character Line Display */}
          {(sceneStarted || status !== 'idle') && (
          <div className="text-center max-w-2xl w-full mb-2 lg:mb-4">
            {status === 'playing' || aiCurrentLine ? (
              <>
                <span className="text-[#7A5A18] text-xs font-bold uppercase tracking-widest block mb-3">
                  {partnerName}
                </span>
                <p className="text-[#0A0A0A] text-2xl md:text-3xl font-light leading-relaxed">
                  {aiCurrentLine}
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

          {/* Error Message */}
          {status === 'error' && errorMsg && (
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isPaused
                    ? 'bg-[#D4A85F] text-[#0A0A0A]'
                    : 'border border-[#D4A85F]/40 text-[#7A5A18]'
                }`}
              >
                {isPaused ? '▶' : '⏸'}
              </button>
              <button
                onClick={endScene}
                className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-xs font-semibold transition-colors cursor-pointer"
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
