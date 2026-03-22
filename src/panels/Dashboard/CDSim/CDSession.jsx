import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import PermissionsModal from '../../../components/PermissionsModal';
import axios from '../../../redux/http';
import endPoints from '../../../redux/constant';
import { getRandomNote } from './mockCDFeedback';

async function fetchCDFeedback(line, scriptContext, character, type) {
  try {
    const { data } = await axios.post(endPoints.cdFeedback, {
      line, script_context: scriptContext, character, type,
    });
    return data?.data?.feedback || null;
  } catch {
    return null;
  }
}

async function playTTS(text, voice = 'cd_female') {
  try {
    const response = await axios.post(endPoints.tts, { text, voice }, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  } catch {
    // TTS failed silently — feedback text still shows
  }
}

export default function CDSession({ lines, userRole, cdVoice = 'cd_female', onEnd, onRestart }) {
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [redirectCount, setRedirectCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [webcamOn, setWebcamOn] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [feedbackAnimating, setFeedbackAnimating] = useState(false);
  const scriptRef = useRef(null);
  const webcamRef = useRef(null);
  const streamRef = useRef(null);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll script view to current line
  useEffect(() => {
    const el = document.getElementById(`line-${currentLineIdx}`);
    if (el && scriptRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIdx]);

  // Webcam toggle
  useEffect(() => {
    if (webcamOn) {
      // Show permissions modal instead of raw getUserMedia
      setShowPermissions(true);
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [webcamOn]);

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentLine = lines[currentLineIdx];
  const isUserLine = currentLine?.character === userRole;
  const isFinished = currentLineIdx >= lines.length;

  const addFeedback = useCallback((note, type) => {
    setFeedbackAnimating(true);
    setFeedbackHistory((prev) => [...prev, { note, type, lineIdx: currentLineIdx }]);
    setTimeout(() => setFeedbackAnimating(false), 300);
  }, [currentLineIdx]);

  const handleMyLine = () => {
    if (isFinished) return;

    if (isUserLine) {
      const currentLine = lines[currentLineIdx];
      fetchCDFeedback(currentLine?.text || '', '', currentLine?.character || userRole, 'line').then((feedback) => {
        const note = feedback || getRandomNote('line');
        addFeedback(note, 'line');
        playTTS(note, cdVoice);
      });
    }

    const nextIdx = currentLineIdx + 1;
    if (nextIdx >= lines.length) {
      onEnd({
        elapsedSeconds,
        linesCompleted: lines.filter((l) => l.character === userRole).length,
        redirectCount,
        feedbackHistory: [...feedbackHistory],
      });
    } else {
      setCurrentLineIdx(nextIdx);
    }
  };

  const handleRedirect = () => {
    const currentLine = lines[currentLineIdx];
    fetchCDFeedback(currentLine?.text || '', '', currentLine?.character || userRole, 'redirect').then((feedback) => {
      const note = feedback || getRandomNote('redirect');
      addFeedback(note, 'redirect');
      playTTS(note, cdVoice);
    });
    setRedirectCount((c) => c + 1);
  };

  const handleRestart = () => {
    setCurrentLineIdx(0);
    setFeedbackHistory([]);
    setRedirectCount(0);
    setElapsedSeconds(0);
    if (onRestart) onRestart();
  };

  const handleEndSession = () => {
    onEnd({
      elapsedSeconds,
      linesCompleted: lines.filter((l, i) => l.character === userRole && i <= currentLineIdx).length,
      redirectCount,
      feedbackHistory: [...feedbackHistory],
    });
  };

  const latestFeedback = feedbackHistory[feedbackHistory.length - 1];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-7xl mx-auto">
      {/* Permissions Modal */}
      <PermissionsModal
        isOpen={showPermissions}
        requireCamera={true}
        requireMic={false}
        context="CD Sim webcam"
        onGranted={(stream) => {
          setShowPermissions(false);
          streamRef.current = stream;
          if (webcamRef.current) webcamRef.current.srcObject = stream;
        }}
        onDenied={() => {
          setShowPermissions(false);
          setWebcamOn(false);
        }}
      />
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">CD Sim Mode</h2>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE SESSION
          </span>
        </div>
        <span className="font-mono text-sm font-semibold text-[#ff6b35]">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      {/* MAIN PANELS */}
      <div className="flex flex-1 gap-3 min-h-0">
        {/* LEFT — Script View (60%) */}
        <div className="w-[60%] bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Script</p>
          </div>
          <div ref={scriptRef} className="flex-1 overflow-y-auto p-4 space-y-2 invisible-scrollbar">
            {lines.map((line, i) => {
              const isUser = line.character === userRole;
              const isCurrent = i === currentLineIdx;
              return (
                <div
                  key={i}
                  id={`line-${i}`}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    isCurrent ? 'border-l-4 border-[#ff6b35]' : 'border-l-4 border-transparent'
                  } ${
                    isUser
                      ? 'bg-orange-50 font-bold text-gray-900'
                      : 'bg-gray-50 text-gray-600'
                  } ${i > currentLineIdx ? 'opacity-40' : ''}`}
                >
                  <span className={`text-xs font-semibold ${isUser ? 'text-[#ff6b35]' : 'text-gray-400'}`}>
                    {isUser ? line.character : 'CD'}:
                  </span>{' '}
                  {line.dialogue}
                </div>
              );
            })}
          </div>

          {/* My Line Button */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleMyLine}
              disabled={isFinished}
              className="w-full bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUserLine ? 'My Line' : 'Next Line'}
            </button>
          </div>
        </div>

        {/* RIGHT — CD Feedback Panel (40%) */}
        <div className="w-[40%] bg-[#1a1a2e] rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              CD Feedback
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 invisible-scrollbar">
            {feedbackHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500 italic">Waiting for your take...</p>
              </div>
            ) : (
              feedbackHistory.map((fb, i) => {
                const isLatest = i === feedbackHistory.length - 1;
                return (
                  <div
                    key={i}
                    className={`flex gap-3 ${isLatest && feedbackAnimating ? 'animate-fade-in-up' : ''}`}
                  >
                    {/* CD Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-gray-300">CD</span>
                    </div>
                    <div
                      className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                        fb.type === 'redirect'
                          ? 'bg-orange-900/30 text-orange-200 border border-orange-700/40'
                          : 'bg-white/10 text-gray-200'
                      }`}
                    >
                      {fb.type === 'redirect' && (
                        <span className="text-[10px] font-semibold uppercase text-orange-400 block mb-1">
                          Redirect
                        </span>
                      )}
                      {fb.note}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Redirect Button */}
          <div className="p-3 border-t border-white/10">
            <button
              onClick={handleRedirect}
              disabled={feedbackHistory.length === 0 || isFinished}
              className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Redirect
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm mt-3">
        <div className="flex gap-2">
          <button
            onClick={handleRestart}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Restart Scene
          </button>
          <button
            onClick={handleEndSession}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
          >
            End Session
          </button>
        </div>
        <button
          onClick={() => setWebcamOn((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
            webcamOn
              ? 'bg-[#ff6b35] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
          {webcamOn ? 'Cam On' : 'Cam Off'}
        </button>
      </div>

      {/* Webcam Preview */}
      {webcamOn && (
        <div className="fixed bottom-24 right-6 w-48 h-36 rounded-xl overflow-hidden shadow-lg border-2 border-[#ff6b35] bg-black z-50">
          <video ref={webcamRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}
