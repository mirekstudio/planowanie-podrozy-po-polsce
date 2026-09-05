import type { Place } from "@/data/places";
import { filterCandidates, type RouteOptions } from "@/lib/generateRoute";
import { distanceKm } from "@/lib/geo";

// Logika dla stylu podróży "Baza wypadowa" — CELOWO osobna od
// generateRoute.ts/generateRouteVariants.ts. Tamten algorytm (najbliższy
// sąsiad, podział na dni, warianty geograficzne) zakłada podróż objazdową
// odwiedzającą kolejne różne miejsca — dla bazy wypadowej pytanie jest
// inne ("gdzie zamieszkać, żeby mieć dużo w zasięgu", nie "w jakiej
// kolejności zwiedzać"), więc nie ma potrzeby, żeby te dwie ścieżki
// współdzieliły algorytm sortowania/podziału na dni. Korzysta tylko z
// filterCandidates (ten sam filtr zainteresowań/regionu co reszta appki)
// i zwykłej odległości — nigdy z orderByProximity/generateRoute.

export type BaseCandidate = {
  slug: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  image: string;
  imageAlt: string;
  imagePosition?: "center" | "top";
  source: "curated" | "basic";
  nearbyCount: number;
  radiusKm: number;
};

// Promień "w zasięgu bazy" — dojazd autem w jedną stronę bez poświęcania
// całego dnia na sam przejazd (spójne z MAX_DISTANCE_KM dla noclegów w
// accommodation.ts, tam z tego samego powodu).
export const BASE_SEARCH_RADIUS_KM = 30;

// Dwie proponowane bazy nie mogą leżeć praktycznie w tym samym miejscu
// (np. dwie plaże w tej samej miejscowości) — to nie są dwie różne
// sensowne propozycje, tylko duplikat.
const MIN_DISTANCE_BETWEEN_BASES_KM = 40;

const MAX_BASE_CANDIDATES = 3;
const MIN_BASE_CANDIDATES_BEFORE_FALLBACK = 2;

function countNearby(pool: Place[], center: Place, radiusKm: number): number {
  return pool.filter(
    (other) => other.slug !== center.slug && distanceKm(center, other) <= radiusKm,
  ).length;
}

// Wybiera 2-3 kandydatów na bazę wypadową spośród `places`: miejsca z
// największą "gęstością" innych pasujących miejsc w promieniu
// BASE_SEARCH_RADIUS_KM — to one najlepiej nadają się na centralny punkt
// noclegowy. Zachłannie odrzuca kolejnych kandydatów zbyt blisko już
// wybranych (patrz MIN_DISTANCE_BETWEEN_BASES_KM), żeby propozycje były
// realnie różnymi opcjami, nie tym samym miejscem dwa razy.
export function suggestBaseCandidates(
  places: Place[],
  options: Pick<RouteOptions, "interests" | "regionTypes" | "surroundings" | "nearbyAttractions">,
): BaseCandidate[] {
  const matching = filterCandidates(places, options);
  // Ten sam kompromis co MIN_MATCHING_CURATED_PLACES w getRoutePlaces.ts —
  // gdy filtr zainteresowań zostawia za mało miejsc, żeby cokolwiek ocenić,
  // lepiej zaproponować bazy z całej puli niż nie zaproponować niczego.
  const pool = matching.length >= MIN_BASE_CANDIDATES_BEFORE_FALLBACK ? matching : places;

  const scored = pool
    .map((place) => ({ place, nearbyCount: countNearby(pool, place, BASE_SEARCH_RADIUS_KM) }))
    .sort((a, b) => b.nearbyCount - a.nearbyCount);

  const selected: { place: Place; nearbyCount: number }[] = [];
  for (const candidate of scored) {
    if (selected.length >= MAX_BASE_CANDIDATES) break;
    const tooCloseToExisting = selected.some(
      (s) => distanceKm(s.place, candidate.place) < MIN_DISTANCE_BETWEEN_BASES_KM,
    );
    if (tooCloseToExisting) continue;
    selected.push(candidate);
  }

  return selected.map(({ place, nearbyCount }) => ({
    slug: place.slug,
    title: place.title,
    description: place.description,
    lat: place.lat,
    lng: place.lng,
    image: place.image,
    imageAlt: place.imageAlt,
    imagePosition: place.imagePosition,
    source: place.source ?? "curated",
    nearbyCount,
    radiusKm: BASE_SEARCH_RADIUS_KM,
  }));
}

// Miejsca "w zasięgu" wybranej bazy — posortowane od najbliższego, do
// pokazania na tymczasowym widoku /planer/baza (patrz zgłoszenie: bez
// podziału na dni, to osobne zadanie na później).
export function nearbyPlacesForBase(
  places: Place[],
  base: { slug: string; lat: number; lng: number },
  radiusKm: number = BASE_SEARCH_RADIUS_KM,
): Place[] {
  return places
    .filter((p) => p.slug !== base.slug && distanceKm(base, p) <= radiusKm)
    .sort((a, b) => distanceKm(base, a) - distanceKm(base, b));
}
