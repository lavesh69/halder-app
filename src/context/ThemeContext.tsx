import React, { useEffect, useState } from 'react';
import { ThemeMode } from '../types';
import { ThemeContext } from './themeUtils';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('halder-theme') as ThemeMode;
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'light';
  });

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const isDark = theme === 'system' ? systemDark : theme === 'dark';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
    }
    try {
      localStorage.setItem('halder-theme', theme);
    } catch {}

    if (theme === 'system' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, isDark]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
