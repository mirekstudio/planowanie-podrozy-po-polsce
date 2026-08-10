"use client";

import { useState } from "react";
import type { Place } from "@/data/places";
import type { GeocodedPlace } from "@/lib/geocoding";

type Coord = { lat: number; lng: number };

// Praktyczny limit punktów pośrednich obsługiwanych niezawodnie przez
// link Google Maps (oficjalnie dopuszczalne jest więcej, ale powyżej
// tej liczby zdarza się, że przeglądarka/aplikacja obcina trasę).
const MAX_GOOGLE_WAYPOINTS = 23;

function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
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
  const [truncatedNotice, setTruncatedNotice] = useState(false);

  const points: Coord[] = [
    ...(startPoint ? [{ lat: startPoint.lat, lng: startPoint.lng }] : []),
    ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
  ];

  if (points.length < 2) return null;

  const platform = detectPlatform();

  function handleClick() {
    if (detectPlatform() === "ios") {
      window.open(buildAppleMapsUrl(points), "_blank");
      return;
    }

    const { url, truncated } = buildGoogleMapsUrl(points);
    if (truncated) setTruncatedNotice(true);
    window.open(url, "_blank");
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
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

      {platform === "ios" && (
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
