"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  getStoredTheme,
  storeTheme,
  type Theme,
} from "@/lib/theme";

export default function ThemeToggle() {
  // Domyślnie "light" tylko na pierwszy render po stronie serwera (gdzie
  // nie znamy jeszcze wyboru użytkownika) — useEffect niżej natychmiast
  // nadpisuje to faktycznym stanem <html>, ustawionym wcześniej przez
  // blokujący skrypt w layout.tsx (patrz THEME_INIT_SCRIPT).
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of DOM state set by the pre-hydration script, unavailable during SSR
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );

    // Dopóki użytkownik nie wybrał ręcznie (brak wpisu w localStorage),
    // appka ma dalej podążać za zmianą preferencji systemowej na żywo —
    // np. gdy telefon przełączy się w tryb ciemny o zachodzie słońca.
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    function handleSystemChange(event: MediaQueryListEvent) {
      if (getStoredTheme() !== null) return;
      const next: Theme = event.matches ? "dark" : "light";
      applyTheme(next);
      setTheme(next);
    }
    mql.addEventListener("change", handleSystemChange);
    return () => mql.removeEventListener("change", handleSystemChange);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    storeTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white active:bg-white/20 active:text-white"
    >
      {theme === "dark" ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
