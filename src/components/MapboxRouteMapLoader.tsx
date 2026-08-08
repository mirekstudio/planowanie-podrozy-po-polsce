"use client";

import dynamic from "next/dynamic";
import type { Place } from "@/data/places";
import type { GeocodedPlace } from "@/lib/geocoding";

const MapboxRouteMap = dynamic(() => import("./MapboxRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-black/[.08] bg-white text-zinc-500 dark:border-white/[.145] dark:bg-zinc-900">
      Ładowanie mapy...
    </div>
  ),
});

export default function MapboxRouteMapLoader({
  stops,
  startPoint,
}: {
  stops: Place[];
  startPoint?: GeocodedPlace | null;
}) {
  return <MapboxRouteMap stops={stops} startPoint={startPoint} />;
}
