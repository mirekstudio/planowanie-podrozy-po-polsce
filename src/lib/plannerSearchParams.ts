import type { PlanerFormInitialValues } from "@/components/PlanerForm";
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
  variant?: string;
};

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
  };
}
