import { useState, useEffect, useCallback } from "react";

type ThemeMode = "dark" | "light" | "system";

interface UseThemeReturn {
  theme: ThemeMode;
  resolvedTheme: "dark" | "light";
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "nps_theme";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") return getSystemTheme();
  return mode;
}

function applyThemeClass(resolved: "dark" | "light") {
  if (resolved === "light") {
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.remove("light");
  }
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored;
    }
    return "dark";
  });

  const [resolved, setResolved] = useState<"dark" | "light">(() =>
    resolveTheme(theme),
  );

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode =
        prev === "dark" ? "light" : prev === "light" ? "system" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  // Update resolved theme whenever theme mode changes
  useEffect(() => {
    setResolved(resolveTheme(theme));
  }, [theme]);

  // Apply theme class whenever resolved theme changes
  useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const systemTheme = getSystemTheme();
      setResolved(systemTheme);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, resolvedTheme: resolved, setTheme, toggleTheme };
}
