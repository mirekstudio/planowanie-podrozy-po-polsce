import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRoutePlaces } from "@/lib/getRoutePlaces";
import {
  suggestBaseCandidates,
  restrictToSubRegion,
  pinsFromBaseCandidates,
  type BaseCandidate,
  type PreviewPin,
} from "@/lib/suggestBases";
import { filterActiveRegionTypes } from "@/lib/placeFilters";
import { COASTAL_SUB_REGIONS, type SubRegion } from "@/lib/poland";
import {
  plannerFormHref,
  bazySubRegionPickerHref,
  type PlannerSearchParams,
} from "@/lib/plannerSearchParams";
import BackLink from "@/components/BackLink";
import SubRegionPreviewMapLoader from "@/components/SubRegionPreviewMapLoader";

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

  const days = Math.max(1, Number(params.days) || 1);
  const interests = params.interests ? params.interests.split(",") : [];
  const surroundingsFilter = params.surroundings
    ? params.surroundings.split(",")
    : [];
  const nearbyAttractions = params.nearbyAttraction
    ? params.nearbyAttraction.split(",")
    : [];
  const candidateOptions = {
    interests,
    regionTypes,
    surroundings: surroundingsFilter,
    nearbyAttractions,
  };

  // getRoutePlaces zwraca tylko PULĘ kandydatów (kuratorskie + uzupełnienie
  // z Geoapify) — nie odpala żadnego sortowania/podziału na dni. Właściwy
  // dobór baz robi suggestBaseCandidates, celowo osobno od generateRoute.ts
  // (patrz komentarz w suggestBases.ts) — ta strona nigdy nie dotyka
  // algorytmu najbliższego sąsiada ani wariantów geograficznych. Jedno
  // zapytanie o pulę dla CAŁEGO wybrzeża, użyte niżej i na Poziomie 1 (dla
  // wszystkich trzech podregionów naraz), i na Poziomie 2 (dla wybranego) —
  // to samo źródło danych dla obu poziomów.
  const allPlaces = await getRoutePlaces({ days, ...candidateOptions });

  // POZIOM 1: dla "Morze" appka najpierw pyta o ODCINEK wybrzeża — te same
  // trzy podregiony (Zachodnie/Środkowe/Wschodnie), co warianty geograficzne
  // w ścieżce "Trasa objazdowa" (patrz SPREAD_REGION_SUB_REGIONS w
  // poland.ts).
  //
  // Zgłoszenie 05.09 (trzecia kontynuacja): miniatura ma pokazywać
  // WSZYSTKICH kandydatów na bazę w danym podregionie — te same, które
  // użytkownik zobaczy jako pełną listę kart na Poziomie 2 — a nie osobny,
  // ograniczony podgląd. Więc dla każdego podregionu liczymy tu dokładnie
  // to samo, co Poziom 2 liczy dla WYBRANEGO podregionu: restrictToSubRegion
  // + suggestBaseCandidates, z tych samych `allPlaces` i tych samych
  // filtrów. Koszt: Poziom 1 wykonuje teraz to samo zapytanie
  // (getRoutePlaces, ewentualnie z Geoapify) co Poziom 2, zamiast dawnego
  // taniego zapytania tylko do kuratorskiej bazy — cena za to, żeby mapa i
  // lista kart nigdy nie mogły pokazać czegoś innego.
  if (hasMorze && !params.podregion) {
    const subRegionCandidates = COASTAL_SUB_REGIONS.map((sub) => {
      const places = restrictToSubRegion(allPlaces, sub.id, sub.anchors, sub.bounds);
      return { sub, candidates: suggestBaseCandidates(places, candidateOptions) };
    });

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
            {subRegionCandidates.map(({ sub, candidates }) => (
              <SubRegionCard
                key={sub.id}
                sub={sub}
                pins={pinsFromBaseCandidates(candidates, sub.anchors)}
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
  let subRegion: SubRegion | null = null;
  if (hasMorze && params.podregion) {
    subRegion = COASTAL_SUB_REGIONS.find((s) => s.id === params.podregion) ?? null;
    if (!subRegion) {
      redirect(bazySubRegionPickerHref(params));
    }
  }

  const places = subRegion
    ? restrictToSubRegion(allPlaces, subRegion.id, subRegion.anchors, subRegion.bounds)
    : allPlaces;

  const candidates = suggestBaseCandidates(places, candidateOptions);

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
// mapie (patrz komentarz przy pinsFromBaseCandidates) — jedyny sposób,
// żeby tekst i mapa nigdy nie mogły się rozjechać. Zgłoszenie 05.09
// (trzecia kontynuacja): WSZYSTKIE tytuły, bez skracania/ograniczania —
// tyle samo miejsc, ile kart zobaczy się o piętro niżej. Pusty string,
// gdy `pins` to fallbackowe kotwice bez tytułów (patrz
// pinsFromBaseCandidates) — wtedy lepiej nie pokazywać żadnej listy nazw
// niż znowu zgadywać.
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
  const caption = subRegionCaption(pins);

  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-xl border border-black/[.08] bg-white transition hover:border-wine/50 hover:shadow-md active:scale-[0.98] active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:bg-zinc-900 dark:hover:border-wine/50 dark:active:bg-wine/10"
    >
      <div
        className="aspect-[2/1] w-full bg-zinc-100 dark:bg-zinc-800"
        aria-label={`Podgląd odcinka: ${sub.title}`}
      >
        {/* Prawdziwa, interaktywna mapa (nie statyczny obrazek) — Poziomu
            1 nie da się już oddać zwykłym Static Images API, bo zgłoszenie
            05.09 (druga kontynuacja) wymaga etykiety z nazwą miejsca po
            najechaniu/dotknięciu na pinezkę, patrz SubRegionPreviewMap. */}
        <SubRegionPreviewMapLoader pins={pins} />
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
