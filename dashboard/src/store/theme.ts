import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

const query = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Resolve `system` against the OS preference. */
function effective(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return query().matches ? 'dark' : 'light';
}

interface ThemeState {
  /** What the user picked. */
  theme: Theme;
  /** What is actually on screen — `system` resolved. Components read this. */
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  /** Flip between explicit light and dark, resolving `system` first. */
  toggle: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolved: 'light',
      setTheme: (theme) => set({ theme, resolved: sync(theme) }),
      toggle: () => get().setTheme(get().resolved === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: 'boutique-dashboard-theme',
      // Only the choice is persisted; `resolved` is derived at boot
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        const theme = state?.theme ?? 'system';
        useTheme.setState({ resolved: sync(theme) });
      },
    },
  ),
);

/** Write the class to <html> and return what was applied. */
function sync(theme: Theme): 'light' | 'dark' {
  const next = effective(theme);
  document.documentElement.classList.toggle('dark', next === 'dark');
  return next;
}

/** Called once at boot so the class is on <html> before the first paint. */
export function initTheme() {
  useTheme.setState({ resolved: sync(useTheme.getState().theme) });
  // Keep `system` live if the OS flips while the tab is open
  query().addEventListener('change', () => {
    const { theme } = useTheme.getState();
    if (theme === 'system') useTheme.setState({ resolved: sync(theme) });
  });
}
