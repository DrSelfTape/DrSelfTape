import { useEffect } from 'react';
import { ThemeContext } from './useTheme';
import { consoleSurfaceEnabled } from './consoleSurface';
import { Capacitor } from '@capacitor/core';

// The native app uses the unified Future Studio dark theme. Desktop web
// retains its own surface; the mobile shell also themes body-level portals.
export function ThemeProvider({ children }) {
  const theme = Capacitor.isNativePlatform() ? 'dark' : 'light';
  // Keep legacy theme-aware components aligned with the native palette.
  // Aurora Noir (Ring 0): the console surface stamps on desktop web only,
  // gated by consoleSurfaceEnabled() (VITE_CONSOLE_THEME or the
  // dst_console_preview localStorage override).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (consoleSurfaceEnabled()) {
      document.documentElement.setAttribute('data-surface', 'console');
    } else {
      document.documentElement.removeAttribute('data-surface');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: () => {}, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}
