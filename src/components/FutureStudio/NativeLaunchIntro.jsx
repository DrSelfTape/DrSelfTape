import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import BootSplash from '../Shared/BootSplash';

/** Mount the app immediately behind a brief native brand reveal. */
export default function NativeLaunchIntro({ children }) {
  const [showIntro, setShowIntro] = useState(() => Capacitor.isNativePlatform());
  useEffect(() => {
    if (!showIntro) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // A bounded presentation, independent of API progress. App hydration and
    // requests continue underneath; a failed native bridge cannot trap launch.
    const timer = window.setTimeout(() => setShowIntro(false), reduceMotion ? 250 : 1200);
    const frame = requestAnimationFrame(() => {
      import('@capacitor/splash-screen')
        .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: reduceMotion ? 0 : 180 }))
        .catch(() => { /* native auto-hide remains the fallback */ });
    });
    return () => { window.clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [showIntro]);

  return <>{children}{showIntro && <div className="future-native-intro"><BootSplash /></div>}</>;
}
