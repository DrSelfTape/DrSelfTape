import { Capacitor } from '@capacitor/core';

// Aurora Noir console surface predicate — the single source of truth shared
// by theme.jsx (which stamps <html data-surface="console">) and any component
// that branches on the console shell (DashboardLayout). Desktop web only,
// behind VITE_CONSOLE_THEME, with a localStorage preview override so the crew
// can walk the set on prod before the flag flips.
const CONSOLE_THEME = String(import.meta.env.VITE_CONSOLE_THEME ?? '').trim() === 'true';

export function consoleSurfaceEnabled() {
  if (Capacitor.isNativePlatform()) return false;
  if (typeof window === 'undefined' || window.innerWidth < 992) return false;
  if (CONSOLE_THEME) return true;
  try { return window.localStorage.getItem('dst_console_preview') === '1'; } catch { return false; }
}
