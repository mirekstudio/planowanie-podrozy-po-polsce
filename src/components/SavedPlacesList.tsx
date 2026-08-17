"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { SavedPlace } from "@/lib/userPlaces";
import { removeFavorite, removeVisited } from "@/app/actions/userPlaces";

export default function SavedPlacesList({
  type,
  items,
}: {
  type: "favorite" | "visited";
  items: SavedPlace[];
}) {
  const [places, setPlaces] = useState(items);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRemove(slug: string) {
    setPendingSlug(slug);
    startTransition(async () => {
      try {
        if (type === "favorite") await removeFavorite(slug);
        else await removeVisited(slug);
        setPlaces((prev) => prev.filter((p) => p.slug !== slug));
      } finally {
        setPendingSlug(null);
      }
    });
  }

  if (places.length === 0) {
    return (
      <p className="mt-10 text-zinc-500 dark:text-zinc-500">
        {type === "favorite"
          ? "Nie masz jeszcze żadnych ulubionych miejsc. Otwórz dowolne miejsce i kliknij „Dodaj do ulubionych”."
          : "Nie oznaczyłeś jeszcze żadnych miejsc jako odwiedzone. Otwórz dowolne miejsce i kliknij „Oznacz jako odwiedzone”."}
      </p>
    );
  }

  return (
    <ul className="mt-10 grid gap-4 sm:grid-cols-2">
      {places.map((place) => (
        <li
          key={place.slug}
          className="relative overflow-hidden rounded-xl border border-black/[.08] bg-white transition-colors has-[a:hover]:border-wine/50 has-[a:active]:border-wine dark:border-white/[.145] dark:bg-zinc-900 dark:has-[a:hover]:border-wine/50"
        >
          <button
            type="button"
            onClick={() => handleRemove(place.slug)}
            disabled={pendingSlug === place.slug}
            aria-label="Usuń z listy"
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 active:bg-black/90 disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-4 w-4"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <Link href={`/miejsca/${place.slug}`} className="block h-full">
            {place.image ? (
              // Miks miejsc kuratorskich (lokalne /images/*) i podstawowych
              // (zewnętrzne URL-e Geoapify/Wikimedia) w jednej liście — zwykły
              // <img> działa dla obu, next/image wymagałby rejestrowania
              // domen zewnętrznych w next.config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={place.image}
                alt={place.imageAlt ?? place.title}
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="flex h-40 w-full items-center justify-center bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600">
                Brak zdjęcia
              </div>
            )}
            <div className="p-5">
              <h2 className="text-xl font-medium text-black dark:text-zinc-50">
                {place.title}
              </h2>
              {place.source === "basic" && (
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
                  Miejsce spoza kuratorskiej bazy
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
