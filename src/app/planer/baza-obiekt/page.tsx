import { redirect } from "next/navigation";
import Link from "next/link";
import { getRoutePlaces } from "@/lib/getRoutePlaces";
import { getNoclegi } from "@/lib/getNoclegi";
import { suggestBaseCandidates, restrictToSubRegion, functionsAsHotel } from "@/lib/suggestBases";
import { getAccommodationOptionsForBase, type AccommodationOption } from "@/lib/accommodation";
import { filterActiveRegionTypes } from "@/lib/placeFilters";
import { COASTAL_SUB_REGIONS, type SubRegion } from "@/lib/poland";
import {
  bazyListHref,
  parseAccommodationType,
  type PlannerSearchParams,
} from "@/lib/plannerSearchParams";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

type SearchParams = PlannerSearchParams;

function hrefForObiekt(params: SearchParams, obiektId: string): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "obiekt" || key === "variant" || !value) continue;
    search.set(key, value);
  }
  search.set("obiekt", obiektId);
  return `/planer/baza?${search.toString()}`;
}

// Poziom 2.5 ścieżki "Baza wypadowa" (zgłoszenie 06.09): między wyborem
// miejscowości (/planer/bazy, Poziom 2) a widokiem promienia atrakcji
// (/planer/baza, Poziom 3) — użytkownik wybiera tu KONKRETNY obiekt
// noclegowy w tej miejscowości, żeby promień atrakcji (wymóg 4) liczył się
// od realnego miejsca noclegu, nie od ogólnego środka miejscowości.
export default async function PlanerBazaObiektPage({
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

  // Ta sama pula i ten sam dobór baz co na /planer/bazy i /planer/baza —
  // deterministyczne dla tych samych parametrów, patrz komentarz tam.
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

  const noclegi = await getNoclegi();

  const candidates = suggestBaseCandidates(
    places,
    {
      interests,
      regionTypes,
      surroundings: surroundingsFilter,
      nearbyAttractions,
    },
    noclegi,
  );
  const base = candidates.find((c) => c.slug === params.baza);

  if (!base) {
    redirect(bazyListHref(params));
  }

  // Ten sam wzorzec upraszczania transportu co w /planer/wynik —
  // motocykl zachowuje się jak samochód pod kątem doboru noclegu, tylko
  // camper wpływa na priorytetyzację kempingów z przyłączami.
  const transport = params.transport === "camper" ? "camper" : "car";
  const accommodationType = parseAccommodationType(params.accommodationType);

  // Wymogi 1-3 zgłoszenia 06.09: kuratorskie obiekty PRZYPISANE do tej
  // miejscowości (patrz miejscePowiazane), sama baza jako własna opcja,
  // gdy to zamek/pałac z potwierdzoną funkcją hotelową (functionsAsHotel),
  // a dopiero gdy oba te źródła nic nie dały — uzupełnienie z Geoapify.
  const options = await getAccommodationOptionsForBase(
    base,
    noclegi,
    { transport, accommodationType },
    functionsAsHotel(base),
  );

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackLink href={bazyListHref(params)} label="Wybierz inną miejscowość" />

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Wybierz nocleg — {base.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {options.some((o) => o.source === "curated")
            ? "Wybierz konkretny obiekt, w którym się zatrzymasz — od niego policzymy, co jest w zasięgu."
            : "Nie mamy jeszcze redakcyjnie sprawdzonego noclegu w tej miejscowości — poniżej propozycje znalezione w pobliżu."}
        </p>

        {options.length === 0 ? (
          <div className="mt-8 flex flex-col items-start gap-3">
            <p className="text-sm text-zinc-500">
              Nie udało nam się znaleźć żadnego konkretnego obiektu noclegowego w tej miejscowości.
            </p>
            <Link
              href={hrefForObiekt(params, `self-${base.slug}`)}
              className="rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-wine-solid-hover active:bg-wine-solid-hover"
            >
              Kontynuuj z ogólną lokalizacją miejscowości
            </Link>
          </div>
        ) : (
          <ol className="mt-8 flex flex-col gap-3">
            {options.map((option) => (
              <AccommodationOptionCard
                key={option.id}
                option={option}
                href={hrefForObiekt(params, option.id)}
              />
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}

function emojiFor(typ: AccommodationOption["typ"]): string {
  return typ === "kemping" || typ === "pole namiotowe" ? "🏕️" : "🏨";
}

function AccommodationOptionCard({
  option,
  href,
}: {
  option: AccommodationOption;
  href: string;
}) {
  const isBasic = option.source === "basic";
  // "self-" to sama baza (zamek/pałac z potwierdzoną funkcją hotelową,
  // patrz placeAsAccommodationOption w accommodation.ts) — reprezentuje ją
  // więc odznaka "★ Poleca przewodnik", jak każde inne miejsce kuratorskie,
  // nie ogólna "kuratorski nocleg" przewidziana dla wpisów z tabeli noclegi.
  const isSelf = option.id.startsWith("self-");

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 rounded-lg border border-black/[.08] bg-white p-4 transition-colors hover:border-wine/50 hover:shadow-md active:scale-[0.98] active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:bg-zinc-900 dark:hover:border-wine/50 dark:active:bg-wine/10"
      >
        <span className="text-2xl" aria-hidden>
          {emojiFor(option.typ)}
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <p className="font-medium text-black dark:text-zinc-50">{option.nazwa}</p>
          {option.udogodnienia && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{option.udogodnienia}</p>
          )}
          <span
            className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              isBasic
                ? "bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
                : "bg-honey/10 text-honey"
            }`}
          >
            {isBasic ? "Odkryj więcej →" : isSelf ? "★ Poleca przewodnik" : "★ Kuratorski nocleg"}
          </span>
        </div>
      </Link>
    </li>
  );
}
