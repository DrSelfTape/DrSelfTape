import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, Square, X, Download, Send, RotateCcw, Volume2 } from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import endPoints from '../../../redux/constant';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';

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

export default function SelfTapeRecorder({ lines, userRole, onClose }) {
  useHideMobileHeader(true);
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
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [timer, setTimer] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  const startRecording = useCallback(async () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    cancelledRef.current = false;

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
      const actualType = mimeType || recorder.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: actualType });
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      setRecordedBlob(blob);
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setTimer(0);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);

    // Play through lines with AI voice for partner lines
    if (aiVoiceEnabled) {
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
  }, [aiVoiceEnabled]);

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
    setRecordedUrl(null);
    setRecordedBlob(null);
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
      await axios.post(`${baseURL}/v1/growth/self-tapes/upload/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSaved(true);
    } catch {
      alert('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const handleDownload = () => {
    if (!recordedUrl) return;
    const a = document.createElement('a');
    a.href = recordedUrl;
    const ext = getFileExt(mimeTypeRef.current);
    a.download = `DrSelfTape-${new Date().toISOString().slice(0, 16)}.${ext}`;
    a.click();
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

        {/* Teleprompter overlay — bottom half, centered */}
        {!recordedUrl && (
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
        {/* AI Voice toggle */}
        {!recordedUrl && (
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
          <div className="flex items-center gap-6">
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

            <button onClick={handleSave} disabled={saving || saved} className="flex flex-col items-center gap-1.5">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${saved ? 'bg-emerald-500' : 'bg-[#D4A85F]'}`}>
                {saved ? <Video className="w-6 h-6 text-white" /> : saving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-6 h-6 text-white" />}
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
