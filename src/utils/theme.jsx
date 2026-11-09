import { useEffect } from 'react';
import { ThemeContext } from './useTheme';
import { consoleSurfaceEnabled } from './consoleSurface';

// One unified Future Studio dark theme on every platform. Web used to sit on
// 'light' while main.jsx added .future-theme only on native; the two gates have
// to agree, or web gets the dark token overrides with a data-theme="light"
// attribute and any [data-theme="dark"] rule silently does not apply.
export function ThemeProvider({ children }) {
  const theme = 'dark';
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
