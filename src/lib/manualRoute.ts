const STORAGE_KEY = "manualRoute";

export function getManualRoute(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function setManualRoute(slugs: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // Safari w trybie prywatnym (i inne restrykcyjne ustawienia) może
    // rzucić wyjątkiem przy zapisie do localStorage — trasa po prostu
    // nie zostanie zapamiętana między odświeżeniami, ale appka ma
    // działać dalej.
  }
}

export function clearManualRoute(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // jw.
  }
}
