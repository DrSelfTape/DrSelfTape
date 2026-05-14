import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../utils/theme';

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: isDark ? 'var(--bg-surface)' : 'var(--bg-elevated)',
          border: `1px solid var(--border-active)`,
        }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun className="w-4 h-4 text-[#FCE072]" /> : <Moon className="w-4 h-4 text-[#7A5A18]" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
      style={{
        background: isDark ? 'var(--bg-surface)' : 'var(--bg-elevated)',
        border: `1px solid var(--border-active)`,
        color: 'var(--text-secondary)',
      }}
    >
      {isDark ? <Sun className="w-3.5 h-3.5 text-[#FCE072]" /> : <Moon className="w-3.5 h-3.5 text-[#7A5A18]" />}
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
