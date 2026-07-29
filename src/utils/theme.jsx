import { createContext, useContext, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Light-only mode (decision 2026-05-29). Dark theme retired in favor of the
// single Aurora-derived light surface. We keep ThemeProvider + the useTheme
// hook so existing imports don't break, but theme is now a constant.
const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggleTheme: () => {} });

// Aurora Noir console surface (Ring 0) — DESKTOP WEB ONLY, flag-gated so the
// dark tokens never reach users before the console shell (Ring 2) is ready.
// `.trim() !== ''` guards the "true\n" env-whitespace landmine. Preview on
// prod: localStorage.setItem('dst_console_preview','1') + reload.
const CONSOLE_THEME = String(import.meta.env.VITE_CONSOLE_THEME ?? '').trim() === 'true';
function consolePreviewForced() {
  try { return window.localStorage.getItem('dst_console_preview') === '1'; } catch { return false; }
}

export function ThemeProvider({ children }) {
  // Pin the document attribute to 'light' on every mount. CSS variables keyed
  // to [data-theme="light"] resolve; the [data-theme="dark"] block is dead
  // code that we'll sweep later.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    const isDesktopWeb = !Capacitor.isNativePlatform() && window.innerWidth >= 992;
    if (isDesktopWeb && (CONSOLE_THEME || consolePreviewForced())) {
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
