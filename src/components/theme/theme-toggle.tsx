"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const storageKey = "allme-theme";
const themeChangeEvent = "allme-theme-change";
const defaultTheme: Theme = "light";

let currentTheme: Theme = defaultTheme;

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey);
    const initialTheme = storedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
  }, []);

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="fixed right-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-[var(--foreground)] shadow-sm transition hover:border-[var(--accent)]"
      onClick={toggleTheme}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      type="button"
    >
      {theme === "dark" ? (
        <Sun aria-hidden="true" className="h-5 w-5" />
      ) : (
        <Moon aria-hidden="true" className="h-5 w-5" />
      )}
    </button>
  );
}

function setTheme(theme: Theme) {
  currentTheme = theme;
  window.localStorage.setItem(storageKey, theme);
  document.documentElement.setAttribute("data-theme", theme);
  window.dispatchEvent(new Event(themeChangeEvent));
}

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener(themeChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener(themeChangeEvent, onStoreChange);
  };
}

function getThemeSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return defaultTheme;
}
