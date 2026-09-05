"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Place } from "@/data/places";
import type { NearbyPlaceWithDistance } from "@/lib/suggestBases";
import {
  DETAIL_MIN_RADIUS_KM,
  DETAIL_MAX_RADIUS_KM,
  DETAIL_DEFAULT_RADIUS_KM,
} from "@/lib/suggestBases";
import MapboxRouteMapLoader from "@/components/MapboxRouteMapLoader";
import BasicPlaceThumbnail from "@/components/BasicPlaceThumbnail";

// Odstęp między ostatnim ruchem suwaka a faktycznym przeliczeniem
// widocznej listy/mapy — bez tego przeciąganie suwaka wywoływałoby
// ponowne zapytanie Mapbox Directions (w MapboxRouteMap) przy KAŻDYM
// pikselu przesunięcia, zamiast raz, gdy użytkownik się zatrzyma.
const DEBOUNCE_MS = 250;

export default function BaseRadiusExplorer({
  base,
  nearby,
}: {
  base: { lat: number; lng: number; title: string };
  nearby: NearbyPlaceWithDistance[];
}) {
  // sliderValue: natychmiastowa wartość do wyświetlenia przy suwaku.
  // radiusKm: wartość faktycznie sterująca listą/mapą, aktualizowana z
  // opóźnieniem — patrz DEBOUNCE_MS.
  const [sliderValue, setSliderValue] = useState(DETAIL_DEFAULT_RADIUS_KM);
  const [radiusKm, setRadiusKm] = useState(DETAIL_DEFAULT_RADIUS_KM);

  useEffect(() => {
    const timer = setTimeout(() => setRadiusKm(sliderValue), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [sliderValue]);

  const visible = nearby.filter((entry) => entry.distanceKm <= radiusKm);

  return (
    <>
      <div className="mt-6 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900">
        <label
          htmlFor="baza-radius"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Promień poszukiwań: {sliderValue} km
        </label>
        <input
          id="baza-radius"
          type="range"
          min={DETAIL_MIN_RADIUS_KM}
          max={DETAIL_MAX_RADIUS_KM}
          step={1}
          value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          className="mt-3 w-full"
        />
        <div className="mt-1 flex justify-between text-xs text-zinc-500">
          <span>{DETAIL_MIN_RADIUS_KM} km</span>
          <span>{DETAIL_MAX_RADIUS_KM} km</span>
        </div>
      </div>

      <div className="mt-6">
        <MapboxRouteMapLoader
          stops={visible.map((entry) => entry.place)}
          startPoint={{ lat: base.lat, lng: base.lng, label: base.title }}
        />
      </div>

      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-zinc-500">
        W zasięgu {radiusKm} km ({visible.length}
        {visible.length === 1 ? " miejsce" : " miejsc"})
      </h2>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Nic nie znaleźliśmy w tym promieniu — spróbuj zwiększyć suwak.
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {visible.map(({ place }) => (
            <NearbyPlaceCard key={place.slug} place={place} />
          ))}
        </ol>
      )}
    </>
  );
}

function NearbyPlaceCard({ place }: { place: Place }) {
  const isBasic = place.source === "basic";

  const content = (
    <>
      {isBasic ? (
        <BasicPlaceThumbnail
          image={place.image}
          imageAlt={place.imageAlt}
          icon={place.basicPlaceIcon}
          className="h-20 w-20 shrink-0 rounded-lg object-cover"
          iconClassName="text-2xl"
        />
      ) : (
        <Image
          src={place.image}
          alt={place.imageAlt}
          width={96}
          height={96}
          className={`h-20 w-20 shrink-0 rounded-lg object-cover ${
            place.imagePosition === "top" ? "object-top" : "object-center"
          }`}
        />
      )}
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-medium text-black dark:text-zinc-50">
          {place.title}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {place.description}
        </p>
        <span
          className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            isBasic
              ? "bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
              : "bg-honey/10 text-honey"
          }`}
        >
          {isBasic ? "Odkryj więcej →" : "★ Poleca przewodnik"}
        </span>
      </div>
    </>
  );

  return (
    <li>
      <Link
        href={`/miejsca/${place.slug}`}
        className="flex gap-4 rounded-lg border border-black/[.08] bg-white p-3 transition-colors hover:border-wine/50 hover:shadow-md active:scale-[0.98] active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:bg-zinc-900 dark:hover:border-wine/50 dark:active:bg-wine/10"
      >
        {content}
      </Link>
    </li>
  );
}
