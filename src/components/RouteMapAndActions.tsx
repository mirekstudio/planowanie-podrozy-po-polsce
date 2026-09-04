"use client";

import { useState } from "react";
import type { Place } from "@/data/places";
import type { GeocodedPlace } from "@/lib/geocoding";
import MapboxRouteMapLoader from "@/components/MapboxRouteMapLoader";
import SelectRouteButton from "@/components/SelectRouteButton";
import StartNavigationButton from "@/components/StartNavigationButton";
import StartPointPicker from "@/components/StartPointPicker";
import SaveRouteButton from "@/components/SaveRouteButton";

// Trzyma punkt startowy jako stan KLIENCKI, niezależny od generowania
// trasy — appka pyta o niego dopiero tutaj, w momencie "Start — nawiguj",
// nie na etapie formularza Planera (patrz uproszczenie architektury).
// Mapa (dojazd do pierwszego przystanku) i przycisk nawigacji dzielą ten
// sam stan, więc obie reagują na siebie: podanie punktu startowego od razu
// pokazuje na mapie odcinek dojazdu i odsłania właściwy przycisk
// nawigacji do Google/Apple Maps.
export default function RouteMapAndActions({
  stops,
  savedRouteLabel,
  savedRouteParams,
}: {
  stops: Place[];
  savedRouteLabel: string;
  savedRouteParams: Record<string, string>;
}) {
  const [startPoint, setStartPoint] = useState<GeocodedPlace | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <div className="mt-8">
        <MapboxRouteMapLoader stops={stops} startPoint={startPoint} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <SelectRouteButton />
        {startPoint ? (
          <StartNavigationButton stops={stops} startPoint={startPoint} />
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker((current) => !current)}
            aria-expanded={showPicker}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-wine-solid-hover active:bg-wine-solid-hover"
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
        )}
      </div>

      {showPicker && !startPoint && (
        <div className="mt-4 max-w-md rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Skąd wyruszasz?
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Podaj punkt startowy — policzymy dojazd do pierwszego przystanku
            i przygotujemy nawigację przez całą trasę.
          </p>
          <div className="mt-3">
            <StartPointPicker
              onSelect={(point) => {
                setStartPoint(point);
                setShowPicker(false);
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-3">
        <SaveRouteButton label={savedRouteLabel} params={savedRouteParams} />
      </div>
    </>
  );
}
