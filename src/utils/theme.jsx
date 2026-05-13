import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'drst-theme';
const MIGRATION_KEY = 'drst-aurora-migrated';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // One-time migration: existing users on the old dark theme get bumped
    // to Aurora light when the redesign ships. They can still toggle back
    // to dark via ThemeToggle — the migration only runs once per device.
    if (!localStorage.getItem(MIGRATION_KEY)) {
      localStorage.setItem(STORAGE_KEY, 'light');
      localStorage.setItem(MIGRATION_KEY, '1');
      return 'light';
    }
    return localStorage.getItem(STORAGE_KEY) || 'light';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
