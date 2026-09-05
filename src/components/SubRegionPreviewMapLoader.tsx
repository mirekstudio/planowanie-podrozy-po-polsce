"use client";

import dynamic from "next/dynamic";
import type { PreviewPin } from "@/lib/suggestBases";

// Ten sam wzorzec co MapboxPlacesMapLoader/MapboxRouteMapLoader — mapbox-gl
// ładowany dopiero po stronie klienta (ssr: false), żeby nie trafiał do
// serwerowego bundle'a i nie próbował dotykać `window`/`document` przy
// renderowaniu strony /planer/bazy na serwerze.
const SubRegionPreviewMap = dynamic(() => import("./SubRegionPreviewMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-800">
      Ładowanie mapy...
    </div>
  ),
});

export default function SubRegionPreviewMapLoader({ pins }: { pins: PreviewPin[] }) {
  return <SubRegionPreviewMap pins={pins} />;
}
