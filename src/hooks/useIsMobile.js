import { useState, useEffect } from 'react';

// Resize-aware mobile detection. Returns true on touchscreens whose
// short edge is < 768px, so a phone in landscape still reads as mobile
// while a tablet in portrait does not. Subscribes to window resize so
// the value updates on rotation and on desktop dev-tool resizes.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => detect());

  useEffect(() => {
    const handler = () => setIsMobile(detect());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile;
}

function detect() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) < 768;
  return isTouchDevice && isSmallScreen;
}
