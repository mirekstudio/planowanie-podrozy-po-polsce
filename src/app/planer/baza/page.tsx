import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Place } from "@/data/places";
import { getRoutePlaces } from "@/lib/getRoutePlaces";
import { suggestBaseCandidates, nearbyPlacesForBase } from "@/lib/suggestBases";
import { filterActiveRegionTypes } from "@/lib/placeFilters";
import { bazyListHref, type PlannerSearchParams } from "@/lib/plannerSearchParams";
import BackLink from "@/components/BackLink";
import MapboxRouteMapLoader from "@/components/MapboxRouteMapLoader";

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

  // Ta sama pula i ten sam dobór baz co na /planer/bazy (deterministyczne
  // dla tych samych parametrów) — żeby otworzyć konkretną bazę po jej
  // slugu, bez przekazywania całego obiektu przez URL.
  const places = await getRoutePlaces({
    days,
    interests,
    regionTypes,
    surroundings: surroundingsFilter,
    nearbyAttractions,
  });
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

  const nearby = nearbyPlacesForBase(places, base);

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
          miejsca w zasięgu.
        </p>

        <div className="mt-8">
          <MapboxRouteMapLoader
            stops={nearby}
            startPoint={{ lat: base.lat, lng: base.lng, label: base.title }}
          />
        </div>

        <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-zinc-500">
          W zasięgu {base.radiusKm} km ({nearby.length}
          {nearby.length === 1 ? " miejsce" : " miejsc"})
        </h2>

        {nearby.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Nie znaleźliśmy nic w promieniu {base.radiusKm} km od tej bazy.
          </p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {nearby.map((place) => (
              <NearbyPlaceCard key={place.slug} place={place} />
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}

function NearbyPlaceCard({ place }: { place: Place }) {
  const isBasic = place.source === "basic";

  const content = (
    <>
      {isBasic ? (
        place.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.image}
            alt={place.imageAlt}
            className="h-20 w-20 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-2xl dark:bg-zinc-800">
            📍
          </div>
        )
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
