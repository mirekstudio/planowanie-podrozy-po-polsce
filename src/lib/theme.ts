export const THEME_STORAGE_KEY = "theme";

export type Theme = "light" | "dark";

// Blokujący skrypt wstrzykiwany w layout.tsx PRZED pierwszym renderem —
// musi być zwykłym stringiem (nie importem z tego modułu), bo działa
// zanim jakikolwiek JS aplikacji (w tym ten moduł) się załaduje. Logika
// jest celowo identyczna z getStoredTheme/getSystemTheme niżej, żeby oba
// miejsca nigdy się nie rozjechały: zapisany wybór ma pierwszeństwo, w
// jego braku decyduje prefers-color-scheme systemu.
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// null = użytkownik nigdy ręcznie nie wybrał motywu — appka ma wtedy
// nadal podążać za zmianami preferencji systemowej na żywo (patrz
// ThemeToggle.tsx).
export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    // Safari w trybie prywatnym potrafi rzucić wyjątkiem przy dostępie
    // do localStorage — appka po prostu nie pamięta wtedy wyboru
    // między wizytami, przełącznik dalej działa w ramach sesji.
    return null;
  }
}

export function storeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // jw. — brak zapisu nie powinien blokować samego przełączenia.
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
