import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

const stored = (typeof localStorage !== 'undefined' ? localStorage.getItem('webg-theme') : null) as Theme | null;
const initialTheme: Theme = stored || 'system';
const initialResolved = resolveTheme(initialTheme);
if (typeof document !== 'undefined') applyTheme(initialResolved);

export const useThemeStore = create<ThemeState>((set, get) => {
  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const { theme } = get();
      if (theme === 'system') {
        const resolved = resolveTheme('system');
        applyTheme(resolved);
        set({ resolved });
      }
    });
  }

  return {
    theme: initialTheme,
    resolved: initialResolved,
    setTheme: (theme: Theme) => {
      const resolved = resolveTheme(theme);
      applyTheme(resolved);
      try { localStorage.setItem('webg-theme', theme); } catch {}
      set({ theme, resolved });
    },
  };
});
