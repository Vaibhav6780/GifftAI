"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "gifftai-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  const applyTheme = useCallback((next: Theme, persist: boolean) => {
    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.classList.toggle("dark", next === "dark");
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
    }
    setThemeState(next);
    window.setTimeout(() => root.classList.remove("theme-transition"), 550);
  }, []);

  // Sync initial state with what the blocking script already applied.
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setThemeState(isDark ? "dark" : "light");
  }, []);

  // React to OS changes only when the user hasn't chosen explicitly.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(STORAGE_KEY)) return;
      applyTheme(e.matches ? "dark" : "light", false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [applyTheme]);

  const setTheme = useCallback(
    (next: Theme) => applyTheme(next, true),
    [applyTheme],
  );

  const toggle = useCallback(
    () => applyTheme(theme === "dark" ? "light" : "dark", true),
    [applyTheme, theme],
  );

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
