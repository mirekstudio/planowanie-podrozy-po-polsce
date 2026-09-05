import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRoutePlaces } from "@/lib/getRoutePlaces";
import { suggestBaseCandidates, type BaseCandidate } from "@/lib/suggestBases";
import { filterActiveRegionTypes } from "@/lib/placeFilters";
import {
  plannerFormHref,
  type PlannerSearchParams,
} from "@/lib/plannerSearchParams";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

type SearchParams = PlannerSearchParams;

function hrefForBase(params: SearchParams, baseSlug: string): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "baza" || key === "variant" || !value) continue;
    search.set(key, value);
  }
  search.set("baza", baseSlug);
  return `/planer/baza?${search.toString()}`;
}

// Polska odmiana liczebnikowa — 1 atrakcja, 2-4 atrakcje (poza 12-14),
// reszta atrakcji.
function attractionWord(n: number): string {
  if (n === 1) return "atrakcja";
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return "atrakcje";
  }
  return "atrakcji";
}

export default async function PlanerBazyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (!params.days) {
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

  // getRoutePlaces zwraca tylko PULĘ kandydatów (kuratorskie + uzupełnienie
  // z Geoapify) — nie odpala żadnego sortowania/podziału na dni. Właściwy
  // dobór baz robi suggestBaseCandidates, celowo osobno od generateRoute.ts
  // (patrz komentarz w suggestBases.ts) — ta strona nigdy nie dotyka
  // algorytmu najbliższego sąsiada ani wariantów geograficznych.
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

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackLink href={plannerFormHref(params)} label="Zmień parametry" />

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Wybierz bazę wypadową
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Zamieszkasz w jednym miejscu i stamtąd zwiedzasz okolicę. Wybierz
          miejscowość, która najbardziej Ci odpowiada — pokażemy Ci, co jest
          w zasięgu.
        </p>

        {candidates.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500">
            Nie udało się znaleźć propozycji bazy dla podanych filtrów.
            Spróbuj zmienić region lub zainteresowania.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {candidates.map((candidate) => (
              <BaseCard
                key={candidate.slug}
                candidate={candidate}
                href={hrefForBase(params, candidate.slug)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BaseCard({
  candidate,
  href,
}: {
  candidate: BaseCandidate;
  href: string;
}) {
  const isBasic = candidate.source === "basic";

  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-xl border border-black/[.08] bg-white transition-colors hover:border-wine/50 hover:shadow-md active:scale-[0.98] active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:bg-zinc-900 dark:hover:border-wine/50 dark:active:bg-wine/10"
    >
      {isBasic ? (
        candidate.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.image}
            alt={candidate.imageAlt}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-zinc-100 text-3xl dark:bg-zinc-800">
            📍
          </div>
        )
      ) : (
        <Image
          src={candidate.image}
          alt={candidate.imageAlt}
          width={640}
          height={360}
          className={`h-40 w-full object-cover ${
            candidate.imagePosition === "top" ? "object-top" : "object-center"
          }`}
        />
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          {candidate.title}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {candidate.description}
        </p>
        <p className="mt-1 text-sm font-medium text-wine">
          {candidate.nearbyCount} {attractionWord(candidate.nearbyCount)} w
          promieniu {candidate.radiusKm} km
        </p>
      </div>
    </Link>
  );
}
