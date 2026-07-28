import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Video, Square, X, Download, Send, RotateCcw, Volume2, Sparkles } from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import endPoints from '../../../redux/constant';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';
import { saveBlobUrl } from '../../../utils/saveMedia';
import { reviewTape } from '../../../redux/features/jericho/jerichoSlice';
import { requestAiConsent } from '../../../components/AIConsent/AIConsentModal';

// Helper: pick a supported video mimeType (MP4 for Safari/iOS, WebM otherwise)
function getSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return ''; // let browser pick default
}

function getFileExt(mimeType) {
  return mimeType.includes('mp4') ? 'mp4' : 'webm';
}

// Helper: lock orientation to portrait during recording
async function lockOrientation() {
  try {
    if (screen.orientation?.lock) {
      await screen.orientation.lock('portrait');
    }
  } catch {
    // Not supported on all browsers — that's fine
  }
}

function unlockOrientation() {
  try {
    if (screen.orientation?.unlock) {
      screen.orientation.unlock();
    }
  } catch {
    // Ignore
  }
}

export default function SelfTapeRecorder({ lines = [], userRole, onClose }) {
  useHideMobileHeader(true);
  const dispatch = useDispatch();
  // Script-less mode ("Record a take" from the Practice tab): no teleprompter,
  // no AI partner voice — just the camera + the record→review loop.
  const hasLines = Array.isArray(lines) && lines.length > 0;
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(true);
  const [currentLineIdx, setCurrentLineIdx] = useState(-1);
  const aiPlayingRef = useRef(false);
  const scrollRef = useRef(null);
  const cancelledRef = useRef(false);

  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const recordedUrlRef = useRef(null); // tracks live object URL so unmount cleanup sees the latest
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [idemKey, setIdemKey] = useState(null); // per-recording idempotency key (BUG 12)
  const [timer, setTimer] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recordError, setRecordError] = useState(null);
  const timerRef = useRef(null);
  const mimeTypeRef = useRef(getSupportedMimeType());

  // Start camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    }).then((stream) => {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
    }).catch(() => {
      alert('Camera access required for self-tape recording.');
    });

    return () => {
      unlockOrientation();
      cancelledRef.current = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Revoke the recorded object URL on unmount — read from the ref so we
  // always revoke the latest URL, not a stale closure value (BUG 13).
  useEffect(() => {
    return () => {
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
        recordedUrlRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    cancelledRef.current = false;
    setRecordError(null);

    // Lock to portrait so rotation doesn't kill the stream
    await lockOrientation();

    const mimeType = mimeTypeRef.current;
    const recorderOpts = mimeType ? { mimeType } : undefined;

    const recorder = new MediaRecorder(streamRef.current, recorderOpts);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      unlockOrientation();
      // A recorder that errored mid-capture fires onerror BEFORE onstop and
      // sets cancelledRef — don't surface a half/empty take as a good one.
      if (cancelledRef.current && chunksRef.current.length === 0) return;
      const actualType = mimeType || recorder.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: actualType });
      // Revoke any previous URL before replacing it (BUG 13 memory leak)
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
      const url = URL.createObjectURL(blob);
      recordedUrlRef.current = url;
      setRecordedUrl(url);
      setRecordedBlob(blob);
      // Fresh idempotency key per finalized take, so a retry of THIS take
      // dedups server-side but a new/retaken take gets a new key (BUG 12).
      setIdemKey(crypto.randomUUID());
    };
    // Surface a mid-capture failure instead of silently losing the take.
    recorder.onerror = (e) => {
      console.error('MediaRecorder runtime error', e?.error || e);
      cancelledRef.current = true;
      unlockOrientation();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch { /* already stopped */ }
      setRecording(false);
      setRecordError('Recording failed mid-capture. Your take was not saved. Please try again.');
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setTimer(0);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);

    // Play through lines with AI voice for partner lines
    if (!hasLines) {
      // Script-less take — nothing to prompt or read.
    } else if (aiVoiceEnabled) {
      playThroughLines(0);
    } else {
      // Just auto-scroll
      if (scrollRef.current) {
        const el = scrollRef.current;
        const scroll = () => {
          el.scrollTop += 0.8;
          if (el.scrollTop < el.scrollHeight - el.clientHeight) requestAnimationFrame(scroll);
        };
        requestAnimationFrame(scroll);
      }
    }
  }, [aiVoiceEnabled, hasLines]);

  // Play through lines — AI reads partner lines, pauses for user lines
  const playThroughLines = useCallback(async (startIdx) => {
    for (let i = startIdx; i < lines.length; i++) {
      // Check both recorder state AND cancellation flag
      if (cancelledRef.current) break;
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') break;

      const line = lines[i];
      const isUser = line.character === userRole;
      setCurrentLineIdx(i);

      // Scroll to current line
      if (scrollRef.current) {
        const lineEl = scrollRef.current.querySelector(`[data-line="${i}"]`);
        if (lineEl) lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      if (!isUser && aiVoiceEnabled) {
        // Skip empty dialogue
        const text = line.dialogue?.trim();
        if (!text) continue;

        // AI reads the partner line via TTS
        try {
          aiPlayingRef.current = true;
          const response = await axios.post(
            `${baseURL}/v1/ai/tts/`,
            { text, voice: 'partner_male' },
            { responseType: 'arraybuffer', timeout: 15000 }
          );
          if (cancelledRef.current) break;
          if (response.data && response.data.byteLength > 0) {
            const blob = new Blob([response.data], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            await new Promise((resolve) => {
              // Safety timeout — if audio doesn't end within 30s, move on
              const timeout = setTimeout(() => {
                audio.pause();
                URL.revokeObjectURL(url);
                resolve();
              }, 30000);
              audio.onended = () => { clearTimeout(timeout); URL.revokeObjectURL(url); resolve(); };
              audio.onerror = () => {
                clearTimeout(timeout);
                URL.revokeObjectURL(url);
                console.warn(`TTS audio playback error on line ${i}`);
                resolve();
              };
              audio.play().catch(() => {
                clearTimeout(timeout);
                URL.revokeObjectURL(url);
                console.warn(`TTS audio.play() failed on line ${i}`);
                resolve();
              });
            });
          } else {
            // Server returned empty audio — estimate pause from word count
            const words = text.split(' ').length;
            await new Promise((r) => setTimeout(r, Math.max(2000, words * 400)));
          }
        } catch (err) {
          console.warn(`TTS request failed for line ${i}:`, err?.message || err);
          // Estimate pause so the scene still flows
          const words = (text || '').split(' ').length;
          await new Promise((r) => setTimeout(r, Math.max(2000, words * 400)));
        }
        aiPlayingRef.current = false;
      } else {
        // User's line — pause to let them deliver it
        const words = (line.dialogue || '').split(' ').length;
        const pauseMs = Math.max(3000, 1000 + words * 400);
        await new Promise((r) => setTimeout(r, pauseMs));
      }
    }
  }, [lines, userRole, aiVoiceEnabled]);

  const stopRecording = useCallback(() => {
    cancelledRef.current = true;
    unlockOrientation();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleRetake = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    recordedUrlRef.current = null;
    setRecordedUrl(null);
    setRecordedBlob(null);
    setIdemKey(null); // drop the old take's idempotency key — next take gets a fresh one
    notesKeyRef.current = null; // same for the AI Notes key
    notesFiringRef.current = false;
    setTimer(0);
    setSaved(false);
    // Restart camera preview
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  };

  const handleSave = async () => {
    if (!recordedBlob || saving) return;
    setSaving(true);
    try {
      const fd = new FormData();
      const ext = getFileExt(mimeTypeRef.current);
      fd.append('video', recordedBlob, `self-tape-${Date.now()}.${ext}`);
      fd.append('title', `Self-Tape ${new Date().toLocaleDateString()}`);
      fd.append('duration_seconds', String(timer));
      // Dedup a lost-response retry of the same take server-side (BUG 12).
      if (idemKey) fd.append('idempotency_key', idemKey);
      await axios.post(`${baseURL}/v1/growth/self-tapes/upload/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSaved(true);
    } catch {
      alert('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const handleDownload = async () => {
    if (!recordedUrl) return;
    const ext = getFileExt(mimeTypeRef.current);
    const filename = `DrSelfTape-${new Date().toISOString().slice(0, 16)}.${ext}`;
    // saveBlobUrl handles the platform split: a real download on web, and a
    // Filesystem-write + native share sheet on iOS/Android (the Android
    // WebView ignores <a download>, so the old code silently failed there).
    const res = await saveBlobUrl(recordedUrl, filename);
    if (!res.ok) alert('Failed to save. Please try again.');
  };

  // Record→review loop (Tier 2 item 4): hand this take straight to the Tape
  // Review analyzer. Consent is resolved HERE (same pattern as onboarding's
  // launchFirstReview — the global modal resolves instantly when consent is
  // already on file; without it the API hard-403s). Then dispatch reviewTape
  // with the blob wrapped as a File (the thunk reads .name/.type for the R2
  // presign) and land on the Review tab, where the staged progress + result
  // render. The thunk outlives this component, so closing is safe.
  const [notesLoading, setNotesLoading] = useState(false);
  // Synchronous re-entry guard for the AI Notes tap. The tap-belt fires BOTH
  // onTouchEnd and (sometimes) a synthetic click; React state alone lets both
  // pass the guard before the rerender — on a MONEY action that meant two
  // reviewTape dispatches with two different idempotency keys, i.e. a double
  // charge the BE cannot dedupe (codex review catch).
  const notesFiringRef = useRef(false);
  // One idempotency key per recorded take — belt #2: even if a double-fire
  // slipped through, the BE would dedupe identical keys. Reset per new take.
  const notesKeyRef = useRef(null);
  const handleGetNotes = async () => {
    if (!recordedBlob || notesLoading || notesFiringRef.current) return;
    notesFiringRef.current = true;
    setNotesLoading(true);
    let ok = false;
    try { ok = await requestAiConsent(); } catch { ok = false; }
    if (!ok) { setNotesLoading(false); notesFiringRef.current = false; return; }
    const ext = getFileExt(mimeTypeRef.current);
    const file = new File([recordedBlob], `self-tape-${Date.now()}.${ext}`, {
      type: recordedBlob.type || 'video/webm',
    });
    // Fresh key (not the Save flow's idemKey): different endpoint, different
    // action — sharing one key risks a cross-endpoint dedup collision.
    if (!notesKeyRef.current) {
      notesKeyRef.current = (crypto?.randomUUID?.() || `tape-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }
    dispatch(reviewTape({ video: file, idempotencyKey: notesKeyRef.current }));
    try { window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { tab: 'tape-review' } })); } catch { /* noop */ }
    if (onClose) onClose();
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>
        {recording && (
          <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-full px-4 py-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-sm font-bold">{formatTime(timer)}</span>
          </div>
        )}
        <div className="w-9" />
      </div>

      {/* Recording-failure banner — surfaces a mid-capture MediaRecorder
          error so a failed take isn't silently lost, with a retry. */}
      {recordError && (
        <div className="mx-4 mt-2 z-20 flex items-center justify-between gap-3 rounded-lg bg-red-500/15 border border-red-500/40 px-4 py-2.5">
          <span className="text-red-300 text-sm">{recordError}</span>
          <button
            onClick={() => { setRecordError(null); startRecording(); }}
            className="shrink-0 rounded-full bg-red-500 px-4 py-1.5 text-sm font-bold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main area — camera + teleprompter */}
      <div className="flex-1 relative overflow-hidden">
        {/* Camera */}
        {!recordedUrl ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <video
            src={recordedUrl}
            controls
            playsInline
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        )}

        {/* Teleprompter overlay — bottom half, centered (script mode only) */}
        {!recordedUrl && hasLines && (
          <div
            ref={scrollRef}
            className="absolute bottom-0 left-0 right-0 overflow-y-auto"
            style={{
              maxHeight: '50%',
              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 10%, rgba(0,0,0,0.92) 30%, rgba(0,0,0,0.98) 100%)',
              padding: '50px 16px 16px',
            }}
          >
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              {lines.map((line, i) => {
                const isUser = line.character === userRole;
                const isCurrent = i === currentLineIdx;
                return (
                  <div key={i} data-line={i} className="text-center mb-4" style={{
                    padding: '10px 16px',
                    borderRadius: 12,
                    background: isCurrent ? 'rgba(255,255,255,0.08)' : 'transparent',
                    borderLeft: isCurrent ? '3px solid #FF8280' : '3px solid transparent',
                    transition: 'all 0.3s',
                  }}>
                    <span className={`text-xs font-bold uppercase tracking-[2px] ${isUser ? 'text-[#7A5A18]' : 'text-[#A7ECDA]'}`}>
                      {line.character}
                      {!isUser && isCurrent && aiVoiceEnabled && <span className="ml-2 text-[10px] normal-case tracking-normal">🔊 speaking...</span>}
                    </span>
                    <p className={`text-lg leading-relaxed mt-1 ${
                      isUser
                        ? 'text-white font-bold'
                        : isCurrent
                          ? 'text-white/90 font-medium'
                          : 'text-white/40'
                    }`} style={{ fontFamily: "'Poppins', sans-serif" }}>
                      {line.dialogue}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-6 py-5 flex flex-col items-center gap-4" style={{ background: 'rgba(0,0,0,0.95)', paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 20px)' }}>
        {/* AI Voice toggle — only meaningful when there's a script to read */}
        {!recordedUrl && hasLines && (
          <button
            onClick={() => setAiVoiceEnabled(!aiVoiceEnabled)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors"
            style={{
              background: aiVoiceEnabled ? 'rgba(167,236,218,0.15)' : 'rgba(255,255,255,0.1)',
              border: aiVoiceEnabled ? '1px solid rgba(167,236,218,0.3)' : '1px solid rgba(255,255,255,0.2)',
              color: aiVoiceEnabled ? '#A7ECDA' : '#999',
            }}
          >
            <Volume2 className="w-3.5 h-3.5" />
            {aiVoiceEnabled ? 'AI Voice: ON' : 'AI Voice: OFF'}
          </button>
        )}

        <div className="flex items-center justify-center gap-8">
        {!recordedUrl ? (
          <>
            {/* Close button */}
            <button onClick={onClose} className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] text-white/60 font-medium">Close</span>
            </button>

            {/* Record / Stop */}
            {!recording ? (
              <button
                onClick={startRecording}
                disabled={!cameraReady}
                className="flex flex-col items-center gap-1.5 disabled:opacity-30"
              >
                <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-red-500" />
                </div>
                <span className="text-[11px] text-white font-semibold">Record</span>
              </button>
            ) : (
              <button onClick={stopRecording} className="flex flex-col items-center gap-1.5">
                <div className="w-20 h-20 rounded-full border-4 border-red-500 flex items-center justify-center animate-pulse">
                  <Square className="w-8 h-8 text-red-500 fill-red-500" />
                </div>
                <span className="text-[11px] text-red-400 font-semibold">Stop</span>
              </button>
            )}

            {/* Placeholder for balance */}
            <div className="w-14" />
          </>
        ) : (
          <div className="flex items-center gap-5">
            <button onClick={handleRetake} className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] text-white/60 font-medium">Retake</span>
            </button>

            <button onClick={handleDownload} className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] text-white/60 font-medium">Download</span>
            </button>

            {/* The money action — the take goes straight to the analyzer.
                iOS tap-belt applied: this sits in a full-screen overlay,
                exactly where WKWebView drops synthetic clicks. */}
            <button
              type="button"
              onClick={handleGetNotes}
              onTouchEnd={(e) => { e.preventDefault(); handleGetNotes(); }}
              disabled={notesLoading}
              className="flex flex-col items-center gap-1.5"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#D4A85F]">
                {notesLoading
                  ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Sparkles className="w-6 h-6 text-white" />}
              </div>
              <span className="text-[11px] text-white font-semibold">AI Notes</span>
            </button>

            <button onClick={handleSave} disabled={saving || saved} className="flex flex-col items-center gap-1.5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${saved ? 'bg-emerald-500' : 'bg-white/10'}`}>
                {saved ? <Video className="w-5 h-5 text-white" /> : saving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5 text-white" />}
              </div>
              <span className="text-[11px] text-white/60 font-medium">{saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
