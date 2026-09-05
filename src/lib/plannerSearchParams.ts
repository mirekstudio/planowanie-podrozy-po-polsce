import type { PlanerFormInitialValues, TravelStyle } from "@/components/PlanerForm";
import type { AccommodationTypePreference } from "@/lib/accommodation";
import { filterActiveRegionTypes } from "@/lib/placeFilters";

export type PlannerSearchParams = {
  days?: string;
  interests?: string;
  regionType?: string;
  surroundings?: string;
  nearbyAttraction?: string;
  transport?: string;
  travelGroup?: string;
  numAdults?: string;
  children?: string;
  accommodationType?: string;
  // Na razie tylko zapamiętywany i przekazywany dalej — patrz komentarz
  // przy STEP_LABELS w PlanerForm.tsx. Bez efektu na sam algorytm
  // generowania trasy (to osobne, kolejne zadanie).
  travelStyle?: string;
  variant?: string;
  // Slug wybranej bazy wypadowej — istnieje tylko na /planer/baza, ten sam
  // wzorzec co "variant" dla /planer/wynik (patrz suggestBases.ts).
  baza?: string;
  // ID podregionu wybrzeża (np. "srodkowe-wybrzeze") — pośredni poziom
  // ścieżki "Baza wypadowa": /planer/bazy bez tego pokazuje 3 karty
  // podregionów, z tym pokazuje propozycje baz W TYM podregionie.
  podregion?: string;
};

const VALID_TRAVEL_STYLES: TravelStyle[] = ["baza_wypadowa", "trasa_objazdowa"];

export function parseTravelStyle(value: string | undefined): TravelStyle {
  return VALID_TRAVEL_STYLES.find((v) => v === value) ?? "trasa_objazdowa";
}

const VALID_ACCOMMODATION_TYPES: AccommodationTypePreference[] = [
  "kemping",
  "pole namiotowe",
  "hotel_pensjonat",
];

export function parseAccommodationType(
  value: string | undefined,
): AccommodationTypePreference | undefined {
  return VALID_ACCOMMODATION_TYPES.find((v) => v === value);
}

export function parseNumberList(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => Number(v))
    .filter((n) => !Number.isNaN(n));
}

// Buduje URL formularza /planer z parametrami z wyniku — używane przez link
// "Zmień parametry", żeby formularz odtworzył się z tymi samymi wartościami,
// zamiast pokazać się pusty. Bez "variant" — to pojęcie istnieje tylko na
// /planer/wynik, formularz go nie zna.
export function plannerFormHref(params: PlannerSearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "variant" || !value) continue;
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `/planer?${query}` : "/planer";
}

// Buduje URL listy proponowanych baz wypadowych (/planer/bazy) z tymi
// samymi parametrami — używane przez link powrotny z /planer/baza. Bez
// "baza" (to pojęcie istnieje tylko na /planer/baza) ani "variant" (istnieje
// tylko na /planer/wynik, druga ścieżka wizarda).
export function bazyListHref(params: PlannerSearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "baza" || key === "variant" || !value) continue;
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `/planer/bazy?${query}` : "/planer/bazy";
}

// Buduje URL wyboru PODREGIONU wybrzeża (/planer/bazy bez "podregion") —
// pierwszy poziom ścieżki "Baza wypadowa". W odróżnieniu od bazyListHref
// (który zostaje w wybranym podregionie, tylko cofa z konkretnej bazy do
// jego listy) ten link cofa o jeden poziom wyżej, do wyboru samego
// podregionu.
export function bazySubRegionPickerHref(params: PlannerSearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "baza" || key === "variant" || key === "podregion" || !value) continue;
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `/planer/bazy?${query}` : "/planer/bazy";
}

export function parsePlannerInitialValues(
  params: PlannerSearchParams,
): PlanerFormInitialValues | undefined {
  // Brak "days" oznacza, że na /planer trafiono wprost (np. z bocznego
  // menu), a nie z powrotem z wyniku — wtedy formularz ma pokazać zwykłe
  // wartości domyślne, nie częściowo puste initialValues.
  if (!params.days) return undefined;

  const childrenAges = parseNumberList(params.children);

  return {
    days: Math.max(1, Number(params.days) || 1),
    interests: params.interests ? params.interests.split(",") : [],
    regionTypes: params.regionType
      ? filterActiveRegionTypes(params.regionType.split(","))
      : [],
    surroundings: params.surroundings ? params.surroundings.split(",") : [],
    nearbyAttractions: params.nearbyAttraction
      ? params.nearbyAttraction.split(",")
      : [],
    transport:
      params.transport === "camper"
        ? "camper"
        : params.transport === "motorcycle"
          ? "motorcycle"
          : "car",
    travelGroup:
      params.travelGroup === "family"
        ? "family"
        : params.travelGroup === "single"
          ? "single"
          : "adults",
    numAdults: Math.max(1, Number(params.numAdults) || 1),
    childrenAges: childrenAges.length > 0 ? childrenAges : undefined,
    accommodationType: parseAccommodationType(params.accommodationType),
    travelStyle: parseTravelStyle(params.travelStyle),
  };
}
