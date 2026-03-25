import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { createAuditionThunk } from '../../../redux/features/auditions/auditionsSlice';
import VideoTrimmer from './VideoTrimmer';

export default function RecordTake({ onBack }) {
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

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
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setStatus('recorded');
    };
    mediaRecorderRef.current = mr;
    mr.start();
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
      const videoUrl = URL.createObjectURL(recordedBlob);
      await dispatch(
        createAuditionThunk({
          project: 'Scene Study Take',
          role: 'Self-tape',
          video_url: videoUrl,
        })
      );
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
        <h2 className="text-2xl font-bold text-white">Record Your Take</h2>
        <p className="text-[#999999] text-sm mt-1">
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
              className="flex-1 bg-[#C855F0] hover:bg-[#A040C8] text-white px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="6" />
              </svg>
              Record
            </button>
            <button
              onClick={onBack}
              className="px-5 py-3 text-sm font-semibold text-[#999999] bg-[#2A2A2A] hover:bg-[#2A2A2A] rounded-lg transition-colors cursor-pointer"
            >
              Back to Practice
            </button>
          </>
        )}

        {status === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
              className="flex-1 bg-[#C855F0] hover:bg-[#A040C8] text-white px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Save to Phone
            </button>

            {/* Trim */}
            <button
              onClick={() => setStatus('trimming')}
              className="flex-1 bg-[#1E1E1E] border border-[#3A3A3A] hover:border-[#C855F0]/50 text-white px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              ✂️ Trim
            </button>

            {/* Save to Auditions */}
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save to Auditions'}
            </button>

            <button
              onClick={handleRedo}
              className="px-5 py-3 text-sm font-semibold text-[#999999] bg-[#2A2A2A] rounded-lg transition-colors cursor-pointer"
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
