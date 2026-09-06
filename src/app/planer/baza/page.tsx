import { redirect } from "next/navigation";
import { getRoutePlaces } from "@/lib/getRoutePlaces";
import { getNoclegi } from "@/lib/getNoclegi";
import {
  suggestBaseCandidates,
  restrictToSubRegion,
  nearbyPlacesWithDistance,
  functionsAsHotel,
  DETAIL_MAX_RADIUS_KM,
} from "@/lib/suggestBases";
import { getAccommodationOptionsForBase } from "@/lib/accommodation";
import { filterActiveRegionTypes } from "@/lib/placeFilters";
import { COASTAL_SUB_REGIONS, type SubRegion } from "@/lib/poland";
import {
  bazaObiektListHref,
  bazyListHref,
  parseAccommodationType,
  type PlannerSearchParams,
} from "@/lib/plannerSearchParams";
import BackLink from "@/components/BackLink";
import BaseRadiusExplorer from "@/components/BaseRadiusExplorer";
import SaveActiveTripButton from "@/components/SaveActiveTripButton";

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

  // Zgłoszenie 06.09 (kryteria jakości bazy): kryterium 1 (realna
  // infrastruktura noclegowa) potrzebuje tabeli `noclegi`, żeby ocenić
  // kandydatów, nie tylko wykluczyć parki narodowe — patrz komentarz przy
  // hasConfirmedLodging w suggestBases.ts. Dociągane raz, tym samym
  // wzorcem co w wyniku trasy objazdowej (getNoclegi w /planer/wynik).
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

  // Zgłoszenie 06.09, wymóg 4: promień atrakcji liczy się od KONKRETNEGO
  // wybranego obiektu noclegowego (Poziom 2.5), nie od ogólnego środka
  // miejscowości — odtwarzamy tę samą listę obiektów co na
  // /planer/baza-obiekt (deterministycznie, z tych samych parametrów) i
  // szukamy tego, którego `id` przyszło w URL. Brak "obiekt" w URL (stary
  // link/zakładka sprzed tej zmiany) albo brak dopasowania — łagodne
  // przejście na współrzędne samej miejscowości, tak jak działało to
  // wcześniej, zamiast dead-endu.
  const transport = params.transport === "camper" ? "camper" : "car";
  const accommodationType = parseAccommodationType(params.accommodationType);
  const accommodationOptions = await getAccommodationOptionsForBase(
    base,
    noclegi,
    { transport, accommodationType },
    functionsAsHotel(base),
  );
  const chosenAccommodation = params.obiekt
    ? accommodationOptions.find((o) => o.id === params.obiekt)
    : undefined;
  const basePoint = {
    slug: base.slug,
    lat: chosenAccommodation?.lat ?? base.lat,
    lng: chosenAccommodation?.lng ?? base.lng,
  };

  // Liczone raz, do górnej granicy suwaka — dalsze filtrowanie po
  // przesunięciu suwaka dzieje się już w całości po stronie klienta
  // (patrz BaseRadiusExplorer.tsx), bez kolejnych zapytań do serwera.
  const nearby = nearbyPlacesWithDistance(places, basePoint, DETAIL_MAX_RADIUS_KM);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackLink href={bazaObiektListHref(params)} label="Wybierz inny nocleg" />

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {base.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {base.description}
        </p>
        {/* Zgłoszenie 06.09, wymóg 4: jawnie widoczne, OD CZEGO faktycznie
            liczy się promień poniżej — bez tego wybór konkretnego obiektu
            na Poziomie 2.5 byłby niewidoczny dla użytkownika na tym
            ekranie. Brak, gdy nie udało się dopasować "obiekt" z URL
            (basePoint spada wtedy na współrzędne samej miejscowości). */}
        {chosenAccommodation && (
          <p className="mt-1 text-sm font-medium text-wine">
            📍 Twój nocleg: {chosenAccommodation.nazwa}
          </p>
        )}

        {/* Zgłoszenie 06.09: usunięty żółty komunikat "Tymczasowy widok —
            pełny plan wypadów dzień po dniu dopracujemy w kolejnym kroku"
            — to podejście (planowanie z góry dzień po dniu) jest już
            nieaktualne dla stylu "Baza wypadowa": zamiast sztywnego planu
            appka wprowadza koncepcję "aktywnej podróży" (patrz
            SaveActiveTripButton niżej i /dzis) — użytkownik zapisuje
            wybraną bazę i na bieżąco sprawdza, co jest w zasięgu, zamiast
            układać plan z wyprzedzeniem. */}
        <SaveActiveTripButton
          trip={{
            baseSlug: base.slug,
            baseTitle: chosenAccommodation ? `${chosenAccommodation.nazwa} (${base.title})` : base.title,
            baseLat: basePoint.lat,
            baseLng: basePoint.lng,
            region: subRegion ? `${regionTypes.join(", ")} — ${subRegion.title}` : regionTypes.join(", "),
            days,
          }}
        />

        <BaseRadiusExplorer
          base={{
            lat: basePoint.lat,
            lng: basePoint.lng,
            title: chosenAccommodation?.nazwa ?? base.title,
          }}
          nearby={nearby}
        />
      </main>
    </div>
  );
}
