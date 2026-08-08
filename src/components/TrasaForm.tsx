"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/data/places";
import { distanceKm } from "@/lib/geo";
import { getManualRoute, setManualRoute } from "@/lib/manualRoute";

export default function TrasaForm({ places }: { places: Place[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from localStorage, unavailable during SSR
    setSelected(getManualRoute());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setManualRoute(selected);
  }, [selected, hydrated]);

  function toggle(slug: string) {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug],
    );
  }

  function move(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const route = selected
    .map((slug) => places.find((p) => p.slug === slug))
    .filter((p): p is Place => p !== undefined);

  const totalKm = route
    .slice(1)
    .reduce((sum, place, i) => sum + distanceKm(route[i], place), 0);

  return (
    <div className="mt-10 grid gap-8 sm:grid-cols-2">
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Dostępne miejsca
        </h2>
        <ul className="mt-4 space-y-2">
          {places.map((place) => (
            <li key={place.slug}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-zinc-900">
                <input
                  type="checkbox"
                  checked={selected.includes(place.slug)}
                  onChange={() => toggle(place.slug)}
                  className="h-4 w-4"
                />
                <span className="text-black dark:text-zinc-50">
                  {place.title}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Twoja trasa
        </h2>

        {route.length === 0 ? (
          <p className="mt-4 text-zinc-500">
            Zaznacz miejsca po lewej, aby ułożyć trasę.
          </p>
        ) : (
          <>
            <ol className="mt-4 space-y-2">
              {route.map((place, index) => (
                <li
                  key={place.slug}
                  className="flex items-center justify-between gap-3 rounded-lg border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-zinc-900"
                >
                  <span className="text-black dark:text-zinc-50">
                    {index + 1}. {place.title}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Przenieś ${place.title} wyżej`}
                      className="rounded border border-black/[.08] px-2 py-1 text-sm text-zinc-600 disabled:opacity-30 dark:border-white/[.145] dark:text-zinc-400"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === route.length - 1}
                      aria-label={`Przenieś ${place.title} niżej`}
                      className="rounded border border-black/[.08] px-2 py-1 text-sm text-zinc-600 disabled:opacity-30 dark:border-white/[.145] dark:text-zinc-400"
                    >
                      ↓
                    </button>
                  </span>
                </li>
              ))}
            </ol>

            {route.length > 1 && (
              <p className="mt-4 text-sm text-zinc-500">
                Łączny dystans w linii prostej: {totalKm.toFixed(0)} km
              </p>
            )}

            <p className="mt-4 text-xs text-zinc-500">
              Ta trasa zostanie użyta w Planerze zamiast automatycznego
              dopasowania.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
