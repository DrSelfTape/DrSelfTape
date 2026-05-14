import { createContext, useContext, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { patchUserSettings, selectSetting } from '../redux/features/userSettings/userSettingsSlice';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'drst-theme';
const MIGRATION_KEY = 'drst-aurora-migrated';

export function ThemeProvider({ children }) {
  const dispatch = useDispatch();
  // Server-synced setting (lands after fetchUserSettings completes on login).
  const serverTheme = useSelector(selectSetting('theme'));
  const settingsLoaded = useSelector((s) => s.userSettings?.loaded);

  const [theme, setTheme] = useState(() => {
    // One-time device migration: existing users get bumped to Aurora light.
    if (!localStorage.getItem(MIGRATION_KEY)) {
      localStorage.setItem(STORAGE_KEY, 'light');
      localStorage.setItem(MIGRATION_KEY, '1');
      return 'light';
    }
    return localStorage.getItem(STORAGE_KEY) || 'light';
  });

  // When the server settings load and they have a theme value, adopt it.
  // (Only override the local default; once a user explicitly toggles in this
  // session, that local choice wins until next reload.)
  useEffect(() => {
    if (settingsLoaded && serverTheme && serverTheme !== theme) {
      setTheme(serverTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, serverTheme]);

  // Persist locally + push to server when theme changes.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (settingsLoaded && serverTheme !== theme) {
      dispatch(patchUserSettings({ theme }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
