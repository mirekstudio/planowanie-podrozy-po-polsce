"use client";

import { useState } from "react";
import type { AccommodationOption } from "@/lib/accommodation";

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function emojiFor(typ: AccommodationOption["typ"]): string {
  return typ === "kemping" || typ === "pole namiotowe" ? "🏕️" : "🏨";
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function AccommodationCard({
  options,
}: {
  options: AccommodationOption[];
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (options.length === 0) {
    return (
      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-500">
        Nie znaleźliśmy noclegu w rozsądnej odległości od ostatniego
        przystanku tego dnia.
      </p>
    );
  }

  const selected = options[selectedIndex];
  const isBasic = selected.source === "basic";

  return (
    <div className="mt-3 rounded-lg border border-black/[.08] bg-honey/5 p-3 dark:border-white/[.145]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm text-black dark:text-zinc-50">
          {emojiFor(selected.typ)} Nocleg: <strong>{selected.nazwa}</strong> —{" "}
          {formatDistance(selected.distanceKm)} od ostatniego przystanku
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3 border-t border-black/[.08] pt-3 dark:border-white/[.145]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                isBasic
                  ? "bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
                  : "bg-honey/10 text-honey"
              }`}
            >
              {isBasic ? "Odkryj więcej →" : "★ Kuratorskie"}
            </span>
            {selected.poziomKomfortu && (
              <span className="text-xs text-zinc-500">
                {capitalize(selected.poziomKomfortu)}
              </span>
            )}
          </div>

          {selected.udogodnienia && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {selected.udogodnienia}
            </p>
          )}

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-600 hover:text-wine dark:text-zinc-400 dark:hover:text-wine"
          >
            Otwórz w Mapach Google ↗
          </a>

          {options.length > 1 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Inne propozycje w okolicy
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {options.map((option, index) =>
                  index === selectedIndex ? null : (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      className="flex items-center justify-between gap-3 rounded-lg border border-black/[.08] px-3 py-2 text-left text-sm hover:border-wine/50 dark:border-white/[.145] dark:hover:border-wine/50"
                    >
                      <span className="text-black dark:text-zinc-50">
                        {emojiFor(option.typ)} {option.nazwa}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {formatDistance(option.distanceKm)}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
