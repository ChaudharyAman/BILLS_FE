/**
 * Global Theme Utility for Flance
 * Synchronizes dark/light theme across Dashboards, Sidebar Layout, and HTML Root
 */

export const getStoredTheme = () => {
  try {
    const saved = localStorage.getItem('tax-dashboard-theme') || localStorage.getItem('app-theme');
    return saved === 'dark';
  } catch (_) {
    return false;
  }
};

export const setGlobalTheme = (isDark) => {
  const mode = isDark ? 'dark' : 'light';
  try {
    localStorage.setItem('tax-dashboard-theme', mode);
    localStorage.setItem('app-theme', mode);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (_) {}

  // Dispatch custom event for real-time reactivity across all open components
  window.dispatchEvent(new CustomEvent('app-theme-sync', { detail: { isDark, theme: mode } }));
};

export const initGlobalTheme = () => {
  const isDark = getStoredTheme();
  try {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (_) {}
  return isDark;
};
