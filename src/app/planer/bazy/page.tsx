import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRoutePlaces } from "@/lib/getRoutePlaces";
import {
  suggestBaseCandidates,
  restrictToSubRegion,
  previewPinsForSubRegion,
  type BaseCandidate,
  type PreviewPin,
} from "@/lib/suggestBases";
import { buildRouteThumbnailUrl } from "@/lib/mapboxStaticThumbnail";
import { filterActiveRegionTypes } from "@/lib/placeFilters";
import { COASTAL_SUB_REGIONS, type SubRegion } from "@/lib/poland";
import {
  plannerFormHref,
  bazySubRegionPickerHref,
  type PlannerSearchParams,
} from "@/lib/plannerSearchParams";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

type SearchParams = PlannerSearchParams;

function hrefForSubRegion(params: SearchParams, subRegionId: string): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "baza" || key === "variant" || key === "podregion" || !value) continue;
    search.set(key, value);
  }
  search.set("podregion", subRegionId);
  return `/planer/bazy?${search.toString()}`;
}

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

// Zgłoszenie 05.09: podpis Poziomu 2 wcześniej pokazywał sub.summary —
// pełną listę WSZYSTKICH miejscowości całego podregionu (np. 6 dla
// Środkowego), sugerując, że wszystkie to dostępne bazy, podczas gdy
// karty niżej pokazują tylko podzbiór (do MAX_BASE_CANDIDATES)
// najlepszych kandydatów wg suggestBaseCandidates. To nie był błąd
// danych (nagłówek i karty celowo opisują różne zbiory — cały podregion
// vs. najlepsze propozycje), ale mylące sformułowanie. Liczba tu = liczba
// kart faktycznie renderowanych niżej, więc nie może się z nimi rozjechać.
function baseSelectionIntro(count: number): string {
  if (count === 1) {
    return "W tym regionie mamy dla Ciebie jedną proponowaną bazę — pokażemy Ci, co jest w jej zasięgu.";
  }
  return `Wybierz jedną z ${count} proponowanych baz w tym regionie — pokażemy Ci, co jest w zasięgu.`;
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

  const regionTypes = params.regionType
    ? filterActiveRegionTypes(params.regionType.split(","))
    : [];
  const hasMorze = regionTypes.includes("Morze");

  // POZIOM 1: dla "Morze" appka najpierw pyta o ODCINEK wybrzeża — te same
  // trzy podregiony (Zachodnie/Środkowe/Wschodnie), co warianty geograficzne
  // w ścieżce "Trasa objazdowa" (patrz SPREAD_REGION_SUB_REGIONS w
  // poland.ts). Miniatury pokazują prawdziwe kuratorskie miejsca z danego
  // podregionu (patrz previewPinsForSubRegion) — nie same stałe kotwice —
  // żeby mapa na tym poziomie nie obiecywała czegoś innego niż lista
  // kandydatów niżej (zgłoszenie 05.09: dwa niezależne, niespójne źródła).
  // Sam wybór/ocena kandydatów (suggestBaseCandidates) wciąż dzieje się
  // dopiero na Poziomie 2 — tu tylko podgląd, jedno tanie zapytanie do
  // kuratorskiej bazy, bez Geoapify.
  if (hasMorze && !params.podregion) {
    const { getPlaces } = await import("@/lib/getPlaces");
    const curated = await getPlaces();

    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="mx-auto max-w-3xl px-6 py-16">
          <BackLink href={plannerFormHref(params)} label="Zmień parametry" />

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Wybierz odcinek wybrzeża
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Polskie wybrzeże jest długie — najpierw wybierz odcinek, potem
            zaproponujemy w nim konkretne bazy wypadowe.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {COASTAL_SUB_REGIONS.map((sub) => (
              <SubRegionCard
                key={sub.id}
                sub={sub}
                pins={previewPinsForSubRegion(curated, sub.bounds, sub.anchors)}
                href={hrefForSubRegion(params, sub.id)}
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // POZIOM 2: propozycje konkretnych baz — w obrębie wybranego podregionu
  // (jeśli Morze), albo z całej dopasowanej puli (Wielkopolska, gdzie nie
  // ma podziału na podregiony).
  const days = Math.max(1, Number(params.days) || 1);
  const interests = params.interests ? params.interests.split(",") : [];
  const surroundingsFilter = params.surroundings
    ? params.surroundings.split(",")
    : [];
  const nearbyAttractions = params.nearbyAttraction
    ? params.nearbyAttraction.split(",")
    : [];

  let subRegion: SubRegion | null = null;
  if (hasMorze && params.podregion) {
    subRegion = COASTAL_SUB_REGIONS.find((s) => s.id === params.podregion) ?? null;
    if (!subRegion) {
      redirect(bazySubRegionPickerHref(params));
    }
  }

  // getRoutePlaces zwraca tylko PULĘ kandydatów (kuratorskie + uzupełnienie
  // z Geoapify) — nie odpala żadnego sortowania/podziału na dni. Właściwy
  // dobór baz robi suggestBaseCandidates, celowo osobno od generateRoute.ts
  // (patrz komentarz w suggestBases.ts) — ta strona nigdy nie dotyka
  // algorytmu najbliższego sąsiada ani wariantów geograficznych.
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

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackLink
          href={subRegion ? bazySubRegionPickerHref(params) : plannerFormHref(params)}
          label={subRegion ? "Wybierz inny odcinek" : "Zmień parametry"}
        />

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {subRegion ? `Wybierz bazę — ${subRegion.title}` : "Wybierz bazę wypadową"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {subRegion
            ? baseSelectionIntro(candidates.length)
            : "Zamieszkasz w jednym miejscu i stamtąd zwiedzasz okolicę. Wybierz miejscowość, która najbardziej Ci odpowiada — pokażemy Ci, co jest w zasięgu."}
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

// Podpis pod miniaturą budowany z TYCH SAMYCH obiektów co pineski na
// mapie (patrz komentarz przy previewPinsForSubRegion) — jedyny sposób,
// żeby tekst i mapa nigdy nie mogły się rozjechać. Pusty string, gdy
// `pins` to fallbackowe kotwice bez tytułów (patrz previewPinsForSubRegion)
// — wtedy lepiej nie pokazywać żadnej listy nazw niż znowu zgadywać.
function subRegionCaption(pins: PreviewPin[]): string | null {
  const titles = pins.map((p) => p.title).filter(Boolean);
  return titles.length > 0 ? titles.join(" – ") : null;
}

function SubRegionCard({
  sub,
  pins,
  href,
}: {
  sub: SubRegion;
  pins: PreviewPin[];
  href: string;
}) {
  const thumbnail = buildRouteThumbnailUrl(pins, null);
  const caption = subRegionCaption(pins);

  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-xl border border-black/[.08] bg-white transition hover:border-wine/50 hover:shadow-md active:scale-[0.98] active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:bg-zinc-900 dark:hover:border-wine/50 dark:active:bg-wine/10"
    >
      <div className="aspect-[2/1] w-full bg-zinc-100 dark:bg-zinc-800">
        {thumbnail && (
          // Mapbox Static Images API — ten sam wzorzec co miniatury
          // wariantów tras na /planer/wynik (buildRouteThumbnailUrl).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={`Podgląd odcinka: ${sub.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          {sub.title}
        </h2>
        {caption && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {caption}
          </p>
        )}
      </div>
    </Link>
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
