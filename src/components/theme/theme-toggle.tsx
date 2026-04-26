"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const storageKey = "allme-theme";
const defaultTheme: Theme = "light";

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(storageKey, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event("allme-theme-change"));
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

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("allme-theme-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("allme-theme-change", onStoreChange);
  };
}

function getThemeSnapshot(): Theme {
  const storedTheme = window.localStorage.getItem(storageKey);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return defaultTheme;
}
