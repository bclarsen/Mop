/**
 * Theme manager for Cleanist App
 * Supports:
 * - 'forest_night' (Option 1: Forest Night Dark Theme)
 * - 'light' (Clean Light Theme)
 * - 'system' (Follow device preferences)
 */

export const THEME_OPTIONS = [
  {
    id: 'forest_night',
    name: 'Forest Night (Dark)',
    description: 'Deep pine charcoal with rich emerald accents and soft sage text',
    palette: {
      bg: '#0C1311',
      card: '#15221E',
      border: '#213630',
      accent: '#10B981',
      text: '#F0FDF4',
    },
  },
  {
    id: 'light',
    name: 'Clean Light',
    description: 'Fresh mint and light crystal canvas with high contrast typography',
    palette: {
      bg: '#F3F9F7',
      card: '#FFFFFF',
      border: '#E2E8F0',
      accent: '#059669',
      text: '#0F172A',
    },
  },
  {
    id: 'system',
    name: 'System Match',
    description: 'Automatically synchronizes with your device or browser color scheme',
    palette: null,
  },
];

export function getInitialTheme() {
  try {
    const stored = localStorage.getItem('cleanist_theme');
    if (stored && ['forest_night', 'dark', 'light', 'system'].includes(stored)) {
      return stored === 'dark' ? 'forest_night' : stored;
    }
  } catch {
    // fallback
  }
  return 'light';
}

export function applyTheme(themeId) {
  const root = document.documentElement;
  const isDark =
    themeId === 'forest_night' ||
    themeId === 'dark' ||
    (themeId === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  try {
    localStorage.setItem('cleanist_theme', themeId);
  } catch {
    // ignore
  }

  return isDark;
}
