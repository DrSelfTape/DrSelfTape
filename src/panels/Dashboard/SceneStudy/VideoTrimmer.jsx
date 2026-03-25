import { useRef, useState, useEffect } from 'react';

/**
 * VideoTrimmer
 * Lets the user drag start/end handles on a timeline to trim a recorded video.
 * Uses Canvas + MediaRecorder to re-record only the selected segment client-side.
 */
export default function VideoTrimmer({ videoUrl, videoBlob, onSave, onCancel }) {
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [dragging, setDragging] = useState(null); // 'start' | 'end' | null
  const [trimming, setTrimming] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      setDuration(video.duration);
      setEndTime(video.duration);
    };
    video.addEventListener('loadedmetadata', onLoaded);
    return () => video.removeEventListener('loadedmetadata', onLoaded);
  }, []);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getTimeFromX = (clientX) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  };

  const handleMouseDown = (handle) => (e) => {
    e.preventDefault();
    setDragging(handle);
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const t = getTimeFromX(clientX);
      if (dragging === 'start') setStartTime(Math.min(t, endTime - 0.5));
      if (dragging === 'end') setEndTime(Math.max(t, startTime + 0.5));
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, startTime, endTime, duration]);

  const handlePreview = () => {
    const video = videoRef.current;
    if (!video) return;
    if (previewPlaying) {
      video.pause();
      setPreviewPlaying(false);
      return;
    }
    video.currentTime = startTime;
    video.play();
    setPreviewPlaying(true);
    const checkEnd = setInterval(() => {
      if (video.currentTime >= endTime) {
        video.pause();
        setPreviewPlaying(false);
        clearInterval(checkEnd);
      }
    }, 100);
  };

  const handleTrim = async () => {
    setTrimming(true);
    try {
      // Use MediaRecorder to re-record the selected segment
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = false;
      await new Promise((res) => { video.onloadedmetadata = res; });

      const stream = video.captureStream();
      const chunks = [];
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9' : 'video/webm',
      });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      await new Promise((res, rej) => {
        mr.onstop = res;
        mr.onerror = rej;
        video.currentTime = startTime;
        video.oncanplay = () => {
          video.play();
          mr.start();
          const stopAt = setInterval(() => {
            if (video.currentTime >= endTime) {
              mr.stop();
              video.pause();
              clearInterval(stopAt);
            }
          }, 50);
        };
      });

      const trimmedBlob = new Blob(chunks, { type: 'video/webm' });
      const trimmedUrl = URL.createObjectURL(trimmedBlob);
      onSave(trimmedBlob, trimmedUrl);
    } catch (err) {
      console.error('Trim failed:', err);
      // Fall back — just save original
      onSave(videoBlob, videoUrl);
    } finally {
      setTrimming(false);
    }
  };

  const startPct = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPct = duration > 0 ? (endTime / duration) * 100 : 100;

  return (
    <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-4 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">✂️ Trim Video</h3>
        <span className="text-xs text-[#888]">
          {fmt(startTime)} → {fmt(endTime)} ({fmt(endTime - startTime)})
        </span>
      </div>

      {/* Video preview */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full rounded-lg bg-black"
        style={{ maxHeight: 180, objectFit: 'contain' }}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        playsInline
      />

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="relative h-10 rounded-lg overflow-visible select-none"
        style={{ background: '#2A2A2A', cursor: 'pointer' }}
        onClick={(e) => {
          if (!dragging && videoRef.current) {
            const t = getTimeFromX(e.clientX);
            videoRef.current.currentTime = t;
          }
        }}
      >
        {/* Selected range highlight */}
        <div
          className="absolute top-0 bottom-0 rounded"
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
            background: 'rgba(200,85,240,0.25)',
            border: '2px solid #C855F0',
          }}
        />

        {/* Playhead */}
        {duration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        )}

        {/* Start handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-8 rounded-sm bg-[#C855F0] cursor-ew-resize flex items-center justify-center"
          style={{ left: `calc(${startPct}% - 8px)`, zIndex: 10, touchAction: 'none' }}
          onMouseDown={handleMouseDown('start')}
          onTouchStart={handleMouseDown('start')}
        >
          <div className="w-0.5 h-4 bg-white/70 rounded mx-px" />
          <div className="w-0.5 h-4 bg-white/70 rounded mx-px" />
        </div>

        {/* End handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-8 rounded-sm bg-[#C855F0] cursor-ew-resize flex items-center justify-center"
          style={{ left: `calc(${endPct}% - 8px)`, zIndex: 10, touchAction: 'none' }}
          onMouseDown={handleMouseDown('end')}
          onTouchStart={handleMouseDown('end')}
        >
          <div className="w-0.5 h-4 bg-white/70 rounded mx-px" />
          <div className="w-0.5 h-4 bg-white/70 rounded mx-px" />
        </div>
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-[#666]">
        <span>{fmt(0)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePreview}
          className="flex-1 border border-[#3A3A3A] text-[#999] hover:text-white hover:border-[#555] py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          {previewPlaying ? '⏸ Pause' : '▶ Preview'}
        </button>
        <button
          onClick={handleTrim}
          disabled={trimming}
          className="flex-1 bg-[#C855F0] hover:bg-[#A040C8] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {trimming ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Trimming...</>
          ) : '✂️ Trim & Save to Phone'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 border border-[#3A3A3A] text-[#666] hover:text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
