import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }
}

const stored = (typeof localStorage !== 'undefined' ? localStorage.getItem('webg-theme') : null) as Theme | null;
const initialTheme: Theme = stored || 'system';
const initialResolved = resolveTheme(initialTheme);
applyTheme(initialResolved);

// Singleton media query handling to avoid HMR leak
let mql: MediaQueryList | null = null;
let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;
let listenerAttached = false;

function ensureMediaListener(get: () => ThemeState, set: (s: Partial<ThemeState>) => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  if (listenerAttached) return;
  mql = window.matchMedia('(prefers-color-scheme: dark)');
  mediaHandler = () => {
    const { theme } = get();
    if (theme === 'system') {
      const resolved = resolveTheme('system');
      applyTheme(resolved);
      set({ resolved });
    }
  };
  // Modern browsers
  if (mql.addEventListener) {
    mql.addEventListener('change', mediaHandler);
  } else {
    // Safari < 14 fallback
    (mql as any).addListener(mediaHandler);
  }
  listenerAttached = true;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  ensureMediaListener(get, set);

  return {
    theme: initialTheme,
    resolved: initialResolved,
    setTheme: (theme: Theme) => {
      const resolved = resolveTheme(theme);
      applyTheme(resolved);
      try {
        localStorage.setItem('webg-theme', theme);
      } catch {
        // ignore storage errors (private mode, quota)
      }
      set({ theme, resolved });
    },
  };
});
