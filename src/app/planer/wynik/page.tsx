import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Place } from "@/data/places";
import { getRoutePlaces } from "@/lib/getRoutePlaces";
import { generateRouteVariants, type RouteVariant } from "@/lib/generateRoute";
import { buildRouteThumbnailUrl } from "@/lib/mapboxStaticThumbnail";
import MapboxRouteMapLoader from "@/components/MapboxRouteMapLoader";
import StartNavigationButton from "@/components/StartNavigationButton";
import SelectRouteButton from "@/components/SelectRouteButton";
import BackLink from "@/components/BackLink";
import AccommodationCard from "@/components/AccommodationCard";
import {
  parseAccommodationType,
  parseNumberList,
  plannerFormHref,
  type PlannerSearchParams,
} from "@/lib/plannerSearchParams";
import { filterActiveRegionTypes } from "@/lib/placeFilters";
import { getNoclegi } from "@/lib/getNoclegi";
import { attachAccommodationOptions } from "@/lib/accommodation";

export const dynamic = "force-dynamic";

type SearchParams = PlannerSearchParams;

function hrefForVariant(params: SearchParams, variantId?: string): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "variant" || !value) continue;
    search.set(key, value);
  }
  if (variantId) search.set("variant", variantId);
  return `/planer/wynik?${search.toString()}`;
}

export default async function PlanerWynikPage({
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
  // filterActiveRegionTypes odrzuca np. "Góry"/"Jeziora" nawet gdy ktoś
  // wklei taki link ręcznie — patrz komentarz przy
  // ACTIVE_REGION_TYPE_OPTIONS w placeFilters.ts. Wyszarzenie checkboxów w
  // PlanerForm to tylko UI, ta linia to niezależna, właściwa blokada.
  const regionTypes = params.regionType
    ? filterActiveRegionTypes(params.regionType.split(","))
    : [];
  const surroundingsFilter = params.surroundings
    ? params.surroundings.split(",")
    : [];
  const nearbyAttractions = params.nearbyAttraction
    ? params.nearbyAttraction.split(",")
    : [];
  // Motocykl zachowuje się jak samochód pod kątem doboru noclegu (patrz
  // niżej) — tylko camper wpływa na priorytetyzację kempingów z
  // przyłączami w src/lib/accommodation.ts. transportLabel to wartość do
  // wyświetlenia (chip), transport to uproszczona wersja binarna.
  const transportOption =
    params.transport === "camper"
      ? "camper"
      : params.transport === "motorcycle"
        ? "motorcycle"
        : "car";
  const transport = transportOption === "camper" ? "camper" : "car";
  const travelGroup =
    params.travelGroup === "family"
      ? "family"
      : params.travelGroup === "single"
        ? "single"
        : "adults";
  const numAdults = Math.max(1, Number(params.numAdults) || 1);
  const childrenAges = parseNumberList(params.children);
  const accommodationType = parseAccommodationType(params.accommodationType);

  const startPoint =
    params.startLat && params.startLng
      ? {
          lat: Number(params.startLat),
          lng: Number(params.startLng),
          label: params.startLabel ?? "Punkt startowy",
        }
      : null;

  const places = await getRoutePlaces({
    days,
    interests,
    startPoint,
    regionTypes,
    surroundings: surroundingsFilter,
    nearbyAttractions,
  });
  const usedSupplement = places.some((p) => p.source === "basic");
  const variants = generateRouteVariants(places, {
    days,
    interests,
    startPoint,
    childrenAges: travelGroup === "family" ? childrenAges : undefined,
    regionTypes,
    surroundings: surroundingsFilter,
    nearbyAttractions,
  });

  const selectedVariant = params.variant
    ? variants.find((v) => v.id === params.variant)
    : undefined;

  const chips = (
    <div className="mt-4 flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]">
        {days} {days === 1 ? "dzień" : "dni"}
      </span>
      <span className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]">
        {transportOption === "camper"
          ? "Camper"
          : transportOption === "motorcycle"
            ? "Motocykl"
            : "Samochód osobowy"}
      </span>
      <span className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]">
        {travelGroup === "family"
          ? `Rodzina: ${numAdults} dorosłych, ${childrenAges.length} dzieci`
          : travelGroup === "single"
            ? "Solo"
            : `${numAdults} dorosłych`}
      </span>
      {startPoint && (
        <span className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]">
          🏁 Start: {startPoint.label}
        </span>
      )}
      {interests.map((interest) => (
        <span
          key={interest}
          className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]"
        >
          {interest}
        </span>
      ))}
      {regionTypes.map((regionType) => (
        <span
          key={regionType}
          className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]"
        >
          🗺️ {regionType}
        </span>
      ))}
      {surroundingsFilter.map((option) => (
        <span
          key={option}
          className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]"
        >
          {option}
        </span>
      ))}
      {nearbyAttractions.map((option) => (
        <span
          key={option}
          className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]"
        >
          {option}
        </span>
      ))}
    </div>
  );

  if (!selectedVariant) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="mx-auto max-w-3xl px-6 py-16">
          <BackLink href={plannerFormHref(params)} label="Zmień parametry" />

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Wybierz wariant trasy
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Przygotowaliśmy {variants.length}{" "}
            {variants.length === 1 ? "wariant" : "warianty"} na podstawie
            Twoich preferencji. Kliknij kartę, aby zobaczyć pełną trasę.
          </p>

          {chips}

          {usedSupplement && (
            <p className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-400">
              W naszej bazie było za mało pasujących miejsc, więc trasę
              uzupełniliśmy propozycjami z Geoapify (oznaczone jako
              „Odkryj więcej”).
            </p>
          )}

          {variants.length > 0 && variants[0].route.usedFallback && interests.length > 0 && (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              Żadne miejsce w bazie nie pasuje do wybranych zainteresowań —
              pokazujemy warianty ze wszystkich dostępnych miejsc.
            </p>
          )}

          {variants.length === 0 ? (
            <p className="mt-8 text-sm text-zinc-500">
              Nie udało się wygenerować żadnej trasy dla podanych parametrów.
            </p>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {variants.map((variant) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  startPoint={startPoint}
                  href={hrefForVariant(params, variant.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  const route = selectedVariant.route;

  // Nocleg proponujemy tylko dla tras wielodniowych (patrz zgłoszenie,
  // punkt 2) — jednodniowa trasa kończy się w domu, nie w noclegu.
  const daysWithAccommodation =
    days >= 2
      ? await attachAccommodationOptions(route.days, await getNoclegi(), {
          transport,
          accommodationType,
        })
      : route.days.map((d) => ({ ...d, accommodationOptions: [] }));

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <BackLink href={hrefForVariant(params)} label="Wróć do wariantów" />
          <BackLink href={plannerFormHref(params)} label="Zmień parametry" />
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {selectedVariant.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {selectedVariant.summary}
        </p>

        {chips}

        {usedSupplement && (
          <p className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-400">
            W naszej bazie było za mało pasujących miejsc, więc trasę
            uzupełniliśmy propozycjami z Geoapify (oznaczone jako „Odkryj
            więcej”).
          </p>
        )}

        {route.usedFallback && interests.length > 0 && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            Żadne miejsce w bazie nie pasuje do wybranych zainteresowań —
            pokazujemy trasę ze wszystkich dostępnych miejsc.
          </p>
        )}

        <div className="mt-8">
          <MapboxRouteMapLoader stops={route.stops} startPoint={startPoint} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <SelectRouteButton />
          <StartNavigationButton stops={route.stops} startPoint={startPoint} />
        </div>

        <ol className="mt-8 flex flex-col gap-4">
          {daysWithAccommodation.map(({ day, places: dayPlaces, accommodationOptions }) => (
            <li
              key={day}
              className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wine-solid text-sm font-medium text-white">
                  {day}
                </div>
                <span className="text-sm text-zinc-500">
                  {dayPlaces.length === 0
                    ? "Dzień wolny"
                    : `${dayPlaces.length} ${
                        dayPlaces.length === 1 ? "miejsce" : "miejsca"
                      }`}
                </span>
              </div>

              {dayPlaces.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">
                  Czas na odpoczynek lub dłuższe zwiedzanie poprzedniego
                  miejsca.
                </p>
              ) : (
                <>
                  <div className="mt-3 flex flex-col gap-3">
                    {dayPlaces.map((place) => (
                      <ItineraryPlaceCard key={place.slug} place={place} />
                    ))}
                  </div>
                  {days >= 2 && <AccommodationCard options={accommodationOptions} />}
                </>
              )}
            </li>
          ))}
        </ol>

        {route.stops.length > 0 && (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-500">
            Łączny dystans w linii prostej: {route.totalDistanceKm.toFixed(0)}{" "}
            km
          </p>
        )}
      </main>
    </div>
  );
}

function ItineraryPlaceCard({ place }: { place: Place }) {
  const isBasic = place.source === "basic";

  const content = (
    <>
      {isBasic ? (
        place.image ? (
          // Zdjęcia z Geoapify pochodzą z różnych domen (zależnie od
          // miejsca) — next/image wymagałby zarejestrowania każdej z
          // nich w next.config, zwykły <img> jest prostszy i wystarczający
          // dla miniatury.
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

  const className =
    "flex gap-4 rounded-lg border border-black/[.08] p-3 transition-colors hover:border-wine/50 hover:shadow-md active:scale-[0.98] active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:hover:border-wine/50 dark:active:bg-wine/10";

  // Miejsca "podstawowe" (Geoapify) też prowadzą do /miejsca/[slug] — ta
  // strona rozpoznaje ich slug (prefiks dostawcy) i dociąga dane na
  // żywo, więc "Odkryj więcej" zawsze gdzieś prowadzi, niezależnie od
  // tego, czy dane miejsce ma własną stronę na Wikipedii czy nie.
  return (
    <Link href={`/miejsca/${place.slug}`} className={className}>
      {content}
    </Link>
  );
}

function VariantCard({
  variant,
  startPoint,
  href,
}: {
  variant: RouteVariant;
  startPoint: { lat: number; lng: number } | null;
  href: string;
}) {
  const usedDays = variant.route.days.filter((d) => d.places.length > 0).length;
  const thumbnail = buildRouteThumbnailUrl(
    variant.route.stops.map((p) => ({ lat: p.lat, lng: p.lng })),
    startPoint,
  );

  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-xl border border-black/[.08] bg-white transition hover:border-wine/50 hover:shadow-md active:scale-[0.98] active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:bg-zinc-900 dark:hover:border-wine/50 dark:active:bg-wine/10"
    >
      <div className="aspect-[2/1] w-full bg-zinc-100 dark:bg-zinc-800">
        {thumbnail && (
          // Mapbox Static Images API zwraca gotowy obraz pod dynamicznym
          // URL-em (współrzędne przystanków) — next/image wymagałby
          // rejestracji domeny w next.config, zwykły <img> jest prostszy.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={`Podgląd trasy: ${variant.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          {variant.title}
        </h2>
        <p className="text-sm text-zinc-500">
          {usedDays} {usedDays === 1 ? "dzień" : "dni"} •{" "}
          {variant.route.stops.length}{" "}
          {variant.route.stops.length === 1 ? "przystanek" : "przystanków"}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {variant.summary}
        </p>
      </div>
    </Link>
  );
}
