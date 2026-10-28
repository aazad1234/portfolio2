import { qs } from './utils.js';

const STORAGE_KEY = 'john-anderson-theme';

function storedTheme() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    return;
  }
}

export function initTheme() {
  const toggle = qs('[data-theme-toggle]');
  if (!toggle) return;

  const icon = qs('[data-theme-icon]', toggle);
  const themeColor = qs('#theme-color-meta');
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const applyTheme = (theme, persist = false) => {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', normalized);
    document.documentElement.style.colorScheme = normalized;
    toggle.setAttribute('aria-pressed', String(normalized === 'dark'));
    toggle.setAttribute('aria-label', `Switch to ${normalized === 'dark' ? 'light' : 'dark'} theme`);
    if (icon) {
      icon.className = normalized === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
    }
    if (themeColor) {
      themeColor.setAttribute('content', normalized === 'dark' ? '#070b14' : '#f8fafc');
    }
    if (persist) saveTheme(normalized);
  };

  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');

  toggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  });

  const handleSystemTheme = (event) => {
    const hasQueryOverride = new URLSearchParams(window.location.search).has('theme');
    if (!storedTheme() && !hasQueryOverride) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  };

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handleSystemTheme);
  } else if (typeof media.addListener === 'function') {
    media.addListener(handleSystemTheme);
  }
}
