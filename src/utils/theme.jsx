import { createContext, useContext, useEffect } from 'react';
import { consoleSurfaceEnabled } from './consoleSurface';

// Light-only mode (decision 2026-05-29). Dark theme retired in favor of the
// single Aurora-derived light surface. We keep ThemeProvider + the useTheme
// hook so existing imports don't break, but theme is now a constant.
const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  // Pin the document attribute to 'light' on every mount. CSS variables keyed
  // to [data-theme="light"] resolve; the [data-theme="dark"] block is dead
  // code that we'll sweep later.
  // Aurora Noir (Ring 0): the console surface stamps on desktop web only,
  // gated by consoleSurfaceEnabled() (VITE_CONSOLE_THEME or the
  // dst_console_preview localStorage override).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    if (consoleSurfaceEnabled()) {
      document.documentElement.setAttribute('data-surface', 'console');
    } else {
      document.documentElement.removeAttribute('data-surface');
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme: () => {}, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
