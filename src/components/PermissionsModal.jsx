import { useState } from 'react';
import { Mic, Video, Shield, CheckCircle, XCircle } from 'lucide-react';

/**
 * PermissionsModal — branded camera/mic permission request
 * Props:
 *   isOpen: bool
 *   onGranted(stream): called with MediaStream when both permissions granted
 *   onDenied(): called if user denies or error occurs
 *   requireCamera: bool (default true)
 *   requireMic: bool (default true)
 *   context: string — e.g. "Live Scene Mode" shown in the modal
 */
export default function PermissionsModal({
  isOpen,
  onGranted,
  onDenied,
  requireCamera = true,
  requireMic = true,
  context = 'this feature',
}) {
  const [status, setStatus] = useState('idle'); // idle | requesting | denied | error
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAllow = async () => {
    setErrorMsg('');
    setStatus('requesting');

    try {
      // Mic-only mode: use Permissions API to grant access without holding the stream
      // This avoids conflicts with Web Speech API which manages its own mic access
      if (requireMic && !requireCamera) {
        // Request mic just to trigger the browser permission prompt
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        // Release immediately — Web Speech API will handle the actual mic
        stream.getTracks().forEach(t => t.stop());
        setStatus('idle');
        onGranted(null); // null stream is fine — caller uses Web Speech API
        return;
      }

      // Camera (or camera+mic) — hold the stream and pass it to the caller
      const constraints = {
        audio: requireMic,
        video: requireCamera
          ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setStatus('idle');
      onGranted(stream);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('denied');
        setErrorMsg('Permission denied. Please allow microphone access in your browser settings, then refresh.');
      } else if (err.name === 'NotFoundError') {
        setStatus('error');
        setErrorMsg(`No ${requireCamera ? 'camera' : 'microphone'} found. Please check your device is connected.`);
      } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        setStatus('error');
        setErrorMsg('Microphone is in use by another app. Please close it and try again.');
      } else {
        setStatus('error');
        setErrorMsg('Could not access microphone. Please close other apps using it and try again.');
      }
    }
  };

  const handleDeny = () => {
    setStatus('idle');
    onDenied();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#F4F4EE] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#FF8280] to-[#A040C8] p-6 text-[#0A0A0A]">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6" />
            <span className="font-semibold text-lg">Permissions Required</span>
          </div>
          <p className="text-[#0A0A0A]/80 text-sm">
            Dr. Self Tape needs access to use {context}.
          </p>
        </div>

        {/* Permissions List */}
        <div className="p-6 space-y-4">
          {requireMic && (
            <div className="flex items-start gap-4 p-4 rounded-xl bg-[#F4F4EE] border border-[rgba(10,10,10,0.14)]">
              <div className="w-10 h-10 rounded-full bg-[#D4A85F]/10 flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5 text-[#7A5A18]" />
              </div>
              <div>
                <div className="font-semibold text-[#0A0A0A]">Microphone</div>
                <div className="text-sm text-[rgba(10,10,10,0.62)] mt-0.5">
                  To hear your lines and detect when you finish speaking.
                </div>
              </div>
            </div>
          )}
          {requireCamera && (
            <div className="flex items-start gap-4 p-4 rounded-xl bg-[#F4F4EE] border border-[rgba(10,10,10,0.14)]">
              <div className="w-10 h-10 rounded-full bg-[#D4A85F]/10 flex items-center justify-center flex-shrink-0">
                <Video className="w-5 h-5 text-[#7A5A18]" />
              </div>
              <div>
                <div className="font-semibold text-[#0A0A0A]">Camera</div>
                <div className="text-sm text-[rgba(10,10,10,0.62)] mt-0.5">
                  To record your performance and self-tape sessions.
                </div>
              </div>
            </div>
          )}

          {/* Privacy note */}
          <div className="flex items-center gap-2 text-xs text-[rgba(10,10,10,0.4)] pt-1">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Your recordings stay on your device. We never store or share your video.</span>
          </div>

          {/* Error state */}
          {(status === 'denied' || status === 'error') && (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
              {status === 'denied' && (
                <div className="pl-6">
                  <p className="text-xs text-red-500 mb-2">
                    Already changed your browser settings? You may need to refresh the page first.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs font-semibold text-[#0A0A0A] bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    🔄 Refresh Page
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleDeny}
            className="flex-1 px-4 py-3 rounded-xl border border-[rgba(10,10,10,0.14)] text-[rgba(10,10,10,0.62)] font-medium hover:bg-[#F4F4EE] transition-colors text-sm"
          >
            Not Now
          </button>
          <button
            onClick={handleAllow}
            disabled={status === 'requesting'}
            className="flex-1 px-4 py-3 rounded-xl bg-[#D4A85F] text-[#0A0A0A] font-semibold hover:bg-[#C09850] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
          >
            {status === 'requesting' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Requesting...
              </>
            ) : status === 'denied' ? (
              '🔄 Try Again'
            ) : status === 'error' ? (
              'Try Again'
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Allow Access
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
