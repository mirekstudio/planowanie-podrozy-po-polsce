"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/data/places";
import type { GeocodedPlace } from "@/lib/geocoding";

type Coord = { lat: number; lng: number };
type NavApp = "google" | "apple";

const STORAGE_KEY = "nav-app-preference";

// Praktyczny limit punktów pośrednich obsługiwanych niezawodnie przez
// link Google Maps (oficjalnie dopuszczalne jest więcej, ale powyżej
// tej liczby zdarza się, że przeglądarka/aplikacja obcina trasę).
const MAX_GOOGLE_WAYPOINTS = 23;

function getStoredPreference(): NavApp | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "google" || value === "apple" ? value : null;
  } catch {
    // Safari w trybie prywatnym potrafi rzucić wyjątkiem przy dostępie
    // do localStorage — po prostu nie proponujemy wtedy domyślnego
    // wyboru, menu dalej działa normalnie.
    return null;
  }
}

function storePreference(app: NavApp) {
  try {
    window.localStorage.setItem(STORAGE_KEY, app);
  } catch {
    // jw. — brak zapisu nie powinien zablokować otwarcia nawigacji.
  }
}

function buildGoogleMapsUrl(points: Coord[]): {
  url: string;
  truncated: boolean;
} {
  const origin = points[0];
  const last = points[points.length - 1];
  let middle = points.slice(1, -1);
  const truncated = middle.length > MAX_GOOGLE_WAYPOINTS;
  if (truncated) middle = middle.slice(0, MAX_GOOGLE_WAYPOINTS);

  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${last.lat},${last.lng}`,
    travelmode: "driving",
  });
  if (middle.length > 0) {
    params.set("waypoints", middle.map((p) => `${p.lat},${p.lng}`).join("|"));
  }

  return { url: `https://www.google.com/maps/dir/?${params.toString()}`, truncated };
}

function buildAppleMapsUrl(points: Coord[]): string {
  const [start, ...rest] = points;
  const daddr = rest.map((p) => `${p.lat},${p.lng}`).join("+to:");
  const params = new URLSearchParams({
    saddr: `${start.lat},${start.lng}`,
    daddr,
  });
  return `https://maps.apple.com/?${params.toString()}`;
}

export default function StartNavigationButton({
  stops,
  startPoint,
}: {
  stops: Place[];
  startPoint?: GeocodedPlace | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [preferred, setPreferred] = useState<NavApp | null>(() =>
    getStoredPreference(),
  );
  const [lastOpened, setLastOpened] = useState<NavApp | null>(null);
  const [truncatedNotice, setTruncatedNotice] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const points: Coord[] = [
    ...(startPoint ? [{ lat: startPoint.lat, lng: startPoint.lng }] : []),
    ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
  ];

  if (points.length < 2) return null;

  function openWith(app: NavApp) {
    storePreference(app);
    setPreferred(app);
    setLastOpened(app);
    setPopupBlocked(false);
    setOpen(false);

    let url: string;
    if (app === "apple") {
      url = buildAppleMapsUrl(points);
    } else {
      const google = buildGoogleMapsUrl(points);
      url = google.url;
      if (google.truncated) setTruncatedNotice(true);
    }

    const newWindow = window.open(url, "_blank");
    if (!newWindow) {
      // Przeglądarka (np. Safari) zablokowała wyskakujące okno —
      // informujemy o tym zamiast ciszy, żeby nie wyglądało to jak
      // brak reakcji na kliknięcie.
      setPopupBlocked(true);
    }
  }

  return (
    <div ref={containerRef} className="relative max-w-xs text-right">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white hover:bg-wine-solid-hover"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        Start — nawiguj
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-black/[.08] bg-white p-1.5 text-left shadow-xl dark:border-white/[.145] dark:bg-zinc-900"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            Otwórz w
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={() => openWith("google")}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-3 text-sm text-black hover:bg-black/5 dark:text-zinc-50 dark:hover:bg-white/10"
          >
            <span>Google Maps</span>
            {preferred === "google" && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                ostatnio
              </span>
            )}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => openWith("apple")}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-3 text-sm text-black hover:bg-black/5 dark:text-zinc-50 dark:hover:bg-white/10"
          >
            <span>Apple Maps</span>
            {preferred === "apple" && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                ostatnio
              </span>
            )}
          </button>
        </div>
      )}

      {popupBlocked && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Przeglądarka zablokowała otwarcie nawigacji. Zezwól na wyskakujące
          okna dla tej strony i spróbuj ponownie.
        </p>
      )}
      {lastOpened === "apple" && !popupBlocked && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          Otworzy się aplikacja Mapy. Jeśli nie wszystkie przystanki wczytają
          się automatycznie, dodaj pozostałe ręcznie w aplikacji.
        </p>
      )}
      {truncatedNotice && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          Trasa ma bardzo dużo przystanków — Google Maps otworzy pierwsze{" "}
          {MAX_GOOGLE_WAYPOINTS + 2}, resztę dodaj ręcznie w aplikacji.
        </p>
      )}
    </div>
  );
}
