"use client";

import dynamic from "next/dynamic";
import type { Place } from "@/data/places";

const MapboxPlacesMap = dynamic(() => import("./MapboxPlacesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-xl border border-black/[.08] bg-white text-zinc-500 dark:border-white/[.145] dark:bg-zinc-900">
      Ładowanie mapy...
    </div>
  ),
});

export default function MapboxPlacesMapLoader({ places }: { places: Place[] }) {
  return <MapboxPlacesMap places={places} />;
}
