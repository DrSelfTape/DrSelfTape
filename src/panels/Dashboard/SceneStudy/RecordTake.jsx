import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { createAuditionThunk } from '../../../redux/features/auditions/auditionsSlice';
import VideoTrimmer from './VideoTrimmer';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';

// Pick a supported video mimeType (MP4 for Safari/iOS, WebM otherwise)
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
  return '';
}

export default function RecordTake({ onBack }) {
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeTypeRef = useRef(getSupportedMimeType());

  const [status, setStatus] = useState('idle'); // idle | recording | recorded | trimming
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError('Could not access camera/mic. Please allow permissions and try again.');
    }
  }, []);

  useEffect(() => {
    // Lock orientation to portrait during recording component
    const lockOrientation = async () => {
      try { await screen.orientation?.lock?.('portrait'); } catch { /* unsupported */ }
    };
    lockOrientation();

    startCamera();
    return () => {
      try { screen.orientation?.unlock?.(); } catch { /* ignore */ }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const mimeType = mimeTypeRef.current;
    const recorderOpts = mimeType ? { mimeType } : undefined;

    const mr = new MediaRecorder(streamRef.current, recorderOpts);
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const actualType = mimeType || mr.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: actualType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setStatus('recorded');
    };
    mediaRecorderRef.current = mr;
    mr.start(1000);
    setStatus('recording');
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const handleRedo = async () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setSaved(false);
    setStatus('idle');
    await startCamera();
  };

  const handleSaveToPhone = (blobToSave = recordedBlob, url = recordedUrl) => {
    if (!url) return;
    // Try to detect iOS — use MP4 if possible
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const mimeType = blobToSave?.type || 'video/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const filename = `DrSelfTape-${new Date().toISOString().slice(0,10)}-take.${ext}`;

    // Use Web Share API on mobile if available (lets user save to Photos on iOS)
    if (navigator.share && navigator.canShare) {
      const file = new File([blobToSave], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'My Self Tape' })
          .catch(() => fallbackDownload(url, filename));
        return;
      }
    }
    fallbackDownload(url, filename);
  };

  const fallbackDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSave = async () => {
    if (!recordedBlob) return;
    setSaving(true);
    try {
      const ext = (mimeTypeRef.current || '').includes('mp4') ? 'mp4' : 'webm';
      const fd = new FormData();
      fd.append('video', recordedBlob, `scene-take-${Date.now()}.${ext}`);
      fd.append('project', 'Scene Study Take');
      fd.append('role', 'Self-tape');
      fd.append('title', `Self-Tape ${new Date().toLocaleDateString()}`);
      await axios.post(`${baseURL}/v1/growth/self-tapes/upload/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSaved(true);
    } catch {
      // error handled in redux
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0A0A0A]">Record Your Take</h2>
        <p className="text-[rgba(10,10,10,0.62)] text-sm mt-1">
          {status === 'idle' && 'Position yourself and hit record'}
          {status === 'recording' && 'Recording in progress...'}
          {status === 'recorded' && 'Review your take below'}
        </p>
      </div>

      {cameraError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {cameraError}
        </div>
      ) : (
        <div className="bg-black rounded-xl overflow-hidden shadow-sm mb-4 aspect-video">
          {status === 'recorded' && recordedUrl ? (
            <video
              src={recordedUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
        </div>
      )}

      {/* Recording indicator */}
      {status === 'recording' && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-red-600">REC</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        {status === 'idle' && (
          <>
            <button
              onClick={startRecording}
              disabled={!!cameraError}
              className="flex-1 bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="6" />
              </svg>
              Record
            </button>
            <button
              onClick={onBack}
              className="px-5 py-3 text-sm font-semibold text-[rgba(10,10,10,0.62)] bg-[#F4F4EE] hover:bg-[#F4F4EE] rounded-lg transition-colors cursor-pointer"
            >
              Back to Practice
            </button>
          </>
        )}

        {status === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex-1 bg-red-600 hover:bg-red-700 text-[#0A0A0A] px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Stop Recording
          </button>
        )}

        {status === 'recorded' && (
          <>
            {/* Save to Phone — primary CTA */}
            <button
              onClick={() => handleSaveToPhone()}
              className="flex-1 bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Save to Phone
            </button>

            {/* Trim */}
            <button
              onClick={() => setStatus('trimming')}
              className="flex-1 bg-white border border-[rgba(10,10,10,0.14)] hover:border-[#D4A85F]/50 text-[#0A0A0A] px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              ✂️ Trim
            </button>

            {/* Save to Auditions */}
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="flex-1 bg-green-600 hover:bg-green-700 text-[#0A0A0A] px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save to Auditions'}
            </button>

            <button
              onClick={handleRedo}
              className="px-5 py-3 text-sm font-semibold text-[rgba(10,10,10,0.62)] bg-[#F4F4EE] rounded-lg transition-colors cursor-pointer"
            >
              Redo
            </button>
          </>
        )}

        {status === 'trimming' && recordedUrl && (
          <div className="w-full">
            <VideoTrimmer
              videoUrl={recordedUrl}
              videoBlob={recordedBlob}
              onSave={(trimmedBlob, trimmedUrl) => {
                setRecordedBlob(trimmedBlob);
                setRecordedUrl(trimmedUrl);
                setStatus('recorded');
                handleSaveToPhone(trimmedBlob, trimmedUrl);
              }}
              onCancel={() => setStatus('recorded')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
