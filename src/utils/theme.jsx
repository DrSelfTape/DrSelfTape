import { createContext, useContext, useEffect } from 'react';

// Light-only mode (decision 2026-05-29). Dark theme retired in favor of the
// single Aurora-derived light surface. We keep ThemeProvider + the useTheme
// hook so existing imports don't break, but theme is now a constant.
const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  // Pin the document attribute to 'light' on every mount. CSS variables keyed
  // to [data-theme="light"] resolve; the [data-theme="dark"] block is dead
  // code that we'll sweep later.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
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
