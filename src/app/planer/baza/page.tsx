import { redirect } from "next/navigation";
import { getRoutePlaces } from "@/lib/getRoutePlaces";
import {
  suggestBaseCandidates,
  restrictToSubRegion,
  nearbyPlacesWithDistance,
  DETAIL_MAX_RADIUS_KM,
} from "@/lib/suggestBases";
import { filterActiveRegionTypes } from "@/lib/placeFilters";
import { COASTAL_SUB_REGIONS, type SubRegion } from "@/lib/poland";
import { bazyListHref, type PlannerSearchParams } from "@/lib/plannerSearchParams";
import BackLink from "@/components/BackLink";
import BaseRadiusExplorer from "@/components/BaseRadiusExplorer";

export const dynamic = "force-dynamic";

type SearchParams = PlannerSearchParams;

export default async function PlanerBazaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (!params.days || !params.baza) {
    redirect("/planer");
  }

  const days = Math.max(1, Number(params.days) || 1);
  const interests = params.interests ? params.interests.split(",") : [];
  const regionTypes = params.regionType
    ? filterActiveRegionTypes(params.regionType.split(","))
    : [];
  const surroundingsFilter = params.surroundings
    ? params.surroundings.split(",")
    : [];
  const nearbyAttractions = params.nearbyAttraction
    ? params.nearbyAttraction.split(",")
    : [];
  const hasMorze = regionTypes.includes("Morze");

  let subRegion: SubRegion | null = null;
  if (hasMorze && params.podregion) {
    subRegion = COASTAL_SUB_REGIONS.find((s) => s.id === params.podregion) ?? null;
  }

  // Ta sama pula i ten sam dobór baz co na /planer/bazy (deterministyczne
  // dla tych samych parametrów, włącznie z ograniczeniem do podregionu) —
  // żeby otworzyć konkretną bazę po jej slugu, bez przekazywania całego
  // obiektu przez URL.
  const allPlaces = await getRoutePlaces({
    days,
    interests,
    regionTypes,
    surroundings: surroundingsFilter,
    nearbyAttractions,
  });
  const places = subRegion
    ? restrictToSubRegion(allPlaces, subRegion.id, subRegion.anchors, subRegion.bounds)
    : allPlaces;

  const candidates = suggestBaseCandidates(places, {
    interests,
    regionTypes,
    surroundings: surroundingsFilter,
    nearbyAttractions,
  });
  const base = candidates.find((c) => c.slug === params.baza);

  if (!base) {
    redirect(bazyListHref(params));
  }

  // Liczone raz, do górnej granicy suwaka — dalsze filtrowanie po
  // przesunięciu suwaka dzieje się już w całości po stronie klienta
  // (patrz BaseRadiusExplorer.tsx), bez kolejnych zapytań do serwera.
  const nearby = nearbyPlacesWithDistance(places, base, DETAIL_MAX_RADIUS_KM);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackLink href={bazyListHref(params)} label="Wróć do listy baz" />

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {base.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {base.description}
        </p>

        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          Tymczasowy widok — pełny plan wypadów dzień po dniu z tej bazy
          dopracujemy w kolejnym kroku. Na razie pokazujemy samą bazę i
          miejsca w zasięgu, z suwakiem promienia.
        </p>

        <BaseRadiusExplorer
          base={{ lat: base.lat, lng: base.lng, title: base.title }}
          nearby={nearby}
        />
      </main>
    </div>
  );
}
