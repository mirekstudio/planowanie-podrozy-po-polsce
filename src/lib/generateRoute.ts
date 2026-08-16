import type { Place } from "@/data/places";
import { distanceKm } from "@/lib/geo";

const VISIT_HOURS = 2.5;
const DAILY_HOURS_MAX = 7;
const YOUNG_CHILD_AGE_THRESHOLD = 6;
const YOUNG_FAMILY_DAILY_HOURS_FACTOR = 0.7;
// Założona średnia prędkość przejazdu między miejscami (drogi krajowe/lokalne w Polsce).
const AVERAGE_SPEED_KMH = 60;

export type Coordinates = { lat: number; lng: number };

export type RouteOptions = {
  days: number;
  interests: string[];
  startPoint?: Coordinates | null;
  childrenAges?: number[];
  // Miejsca z tym tagiem są preferowane przy układaniu kolejności
  // odwiedzin, więc częściej mieszczą się w limicie dni/godzin.
  focusTag?: string | null;
  // Mnożnik tempa zwiedzania: >1 = więcej godzin dziennie i krótsze
  // wizyty (więcej przystanków), <1 = mniej godzin dziennie i dłuższe
  // wizyty (mniej przystanków). 1 = tempo standardowe.
  paceFactor?: number;
  // Dodatkowe wymiary filtrowania — patrz src/lib/placeFilters.ts.
  // Puste/nieustawione = nie filtruj po tym wymiarze.
  regionTypes?: string[];
  surroundings?: string[];
  nearbyAttractions?: string[];
};

export type RouteDay = {
  day: number;
  places: Place[];
};

export type GeneratedRoute = {
  stops: Place[];
  days: RouteDay[];
  totalDistanceKm: number;
  usedFallback: boolean;
  dailyHoursLimit: number;
};

function travelHours(a: Coordinates, b: Coordinates): number {
  return distanceKm(a, b) / AVERAGE_SPEED_KMH;
}

// Premia (w km) odejmowana od dystansu miejsc pasujących do focusTag,
// dzięki czemu w kolejności odwiedzin wysuwają się przed inne miejsca
// i częściej mieszczą się w limicie dni/godzin danego wariantu.
const FOCUS_BONUS_KM = 45;

function matchesFocus(place: Place, focusTag: string | null | undefined) {
  return Boolean(focusTag) && place.tags.includes(focusTag as string);
}

function effectiveDistance(
  current: Coordinates,
  place: Place,
  focusTag: string | null | undefined,
): number {
  const distance = distanceKm(current, place);
  return matchesFocus(place, focusTag)
    ? Math.max(0, distance - FOCUS_BONUS_KM)
    : distance;
}

function orderByProximity(
  places: Place[],
  start: Coordinates | null,
  focusTag: string | null | undefined,
): Place[] {
  const remaining = [...places].sort((a, b) => {
    const focusDiff = Number(matchesFocus(b, focusTag)) - Number(matchesFocus(a, focusTag));
    return focusDiff !== 0 ? focusDiff : a.sortOrder - b.sortOrder;
  });
  const ordered: Place[] = [];

  let current: Coordinates | null = start;

  if (!current) {
    const first = remaining.shift();
    if (!first) return ordered;
    ordered.push(first);
    current = first;
  }

  while (remaining.length > 0) {
    remaining.sort(
      (a, b) =>
        effectiveDistance(current!, a, focusTag) -
        effectiveDistance(current!, b, focusTag),
    );
    const next = remaining.shift()!;
    ordered.push(next);
    current = next;
  }

  return ordered;
}

function calcTotalDistance(stops: Place[], start: Coordinates | null): number {
  let total = 0;
  let prev: Coordinates | null = start;

  for (const stop of stops) {
    if (prev) total += distanceKm(prev, stop);
    prev = stop;
  }

  return total;
}

export function filterByInterests(places: Place[], interests: string[]): Place[] {
  return interests.length > 0
    ? places.filter((place) => place.tags.some((tag) => interests.includes(tag)))
    : places;
}

// Miejsce przechodzi dany wymiar, jeśli nic nie wybrano (brak filtra) albo
// jeśli ma choć jedną z wybranych wartości w tym wymiarze.
function matchesAny(placeValues: string[], selected: string[] | undefined): boolean {
  return !selected || selected.length === 0 || placeValues.some((v) => selected.includes(v));
}

// Łączy filtr zainteresowań z nowymi wymiarami (typ regionu, otoczenie,
// bliskość atrakcji) — wszystkie aktywne wymiary muszą być spełnione
// jednocześnie (AND), a w ramach jednego wymiaru wystarczy jedna
// pasująca wartość (OR). Miejsca "basic" z zewnętrznych dostawców nie
// mają tych wymiarów otagowanych, więc przy aktywnym filtrze regionu/
// otoczenia/bliskości atrakcji zwykle odpadają — to świadome ograniczenie,
// nie błąd (dostawca zewnętrzny nie zna naszej taksonomii).
export function filterCandidates(
  places: Place[],
  options: Pick<RouteOptions, "interests" | "regionTypes" | "surroundings" | "nearbyAttractions">,
): Place[] {
  return filterByInterests(places, options.interests).filter(
    (place) =>
      matchesAny(place.regionType, options.regionTypes) &&
      matchesAny(place.surroundings, options.surroundings) &&
      matchesAny(
        place.nearbyAttraction ? [place.nearbyAttraction] : [],
        options.nearbyAttractions,
      ),
  );
}

export function generateRoute(
  places: Place[],
  options: RouteOptions,
): GeneratedRoute {
  const dayCount = Math.max(1, options.days);
  const paceFactor = options.paceFactor ?? 1;
  const focusTag = options.focusTag ?? null;

  const hasYoungChild = (options.childrenAges ?? []).some(
    (age) => age < YOUNG_CHILD_AGE_THRESHOLD,
  );
  const baseDailyHoursLimit = hasYoungChild
    ? DAILY_HOURS_MAX * YOUNG_FAMILY_DAILY_HOURS_FACTOR
    : DAILY_HOURS_MAX;
  const dailyHoursLimit = baseDailyHoursLimit * paceFactor;
  const visitHours = VISIT_HOURS / paceFactor;

  let candidates = filterCandidates(places, options);

  const usedFallback = candidates.length === 0;
  if (usedFallback) {
    candidates = places;
  }

  const startCoords = options.startPoint ?? null;
  const ordered = orderByProximity(candidates, startCoords, focusTag);

  const days: RouteDay[] = Array.from({ length: dayCount }, (_, i) => ({
    day: i + 1,
    places: [],
  }));

  const stops: Place[] = [];
  let dayIndex = 0;
  let dayHoursUsed = 0;
  let current: Coordinates = startCoords ?? ordered[0] ?? { lat: 0, lng: 0 };

  for (const place of ordered) {
    if (dayIndex >= dayCount) break;

    const hours = travelHours(current, place) + visitHours;

    if (dayHoursUsed > 0 && dayHoursUsed + hours > dailyHoursLimit) {
      dayIndex += 1;
      dayHoursUsed = 0;
      if (dayIndex >= dayCount) break;
    }

    days[dayIndex].places.push(place);
    stops.push(place);
    dayHoursUsed += hours;
    current = place;
  }

  const totalDistanceKm = calcTotalDistance(stops, startCoords);

  return { stops, days, totalDistanceKm, usedFallback, dailyHoursLimit };
}

export type RouteVariant = {
  id: string;
  title: string;
  summary: string;
  route: GeneratedRoute;
};

const PACE_VARIANTS: {
  id: string;
  title: string;
  summary: string;
  paceFactor: number;
}[] = [
  {
    id: "spokojne",
    title: "Spokojne tempo",
    summary: "Mniej przystanków dziennie, więcej czasu na zwiedzanie każdego miejsca.",
    paceFactor: 0.8,
  },
  {
    id: "zrownowazone",
    title: "Zrównoważone tempo",
    summary: "Standardowe proporcje między zwiedzaniem a przejazdami.",
    paceFactor: 1,
  },
  {
    id: "intensywne",
    title: "Intensywne tempo",
    summary: "Więcej przystanków dziennie, krótsze wizyty w każdym miejscu.",
    paceFactor: 1.25,
  },
];

function routeSignature(route: GeneratedRoute): string {
  return route.stops.map((place) => place.slug).join(",");
}

// Zwraca od 1 do 3 wariantów tej samej trasy dla tych samych preferencji.
// Jeśli użytkownik zaznaczył kilka zainteresowań, warianty różnią się tym,
// które z nich jest priorytetowe przy doborze miejsc. W przeciwnym razie
// różnią się tempem zwiedzania (a przez to też doborem miejsc, bo inny
// limit godzin dziennie mieści inną liczbę przystanków). Identyczne w
// skutkach warianty są odfiltrowywane, więc czasem wynikiem jest tylko 1-2.
export function generateRouteVariants(
  places: Place[],
  options: RouteOptions,
): RouteVariant[] {
  const specs =
    options.interests.length >= 2
      ? options.interests.slice(0, 3).map((interest) => ({
          id: interest,
          title: `Wariant skupiony na: ${interest}`,
          summary: `Priorytet dla miejsc związanych z „${interest}”, reszta dnia dopełniona pozostałymi zainteresowaniami.`,
          focusTag: interest,
          paceFactor: 1,
        }))
      : PACE_VARIANTS.map((variant) => ({
          id: variant.id,
          title: variant.title,
          summary: variant.summary,
          focusTag: options.interests[0] ?? null,
          paceFactor: variant.paceFactor,
        }));

  const seenSignatures = new Set<string>();
  const variants: RouteVariant[] = [];

  for (const spec of specs) {
    const route = generateRoute(places, {
      ...options,
      focusTag: spec.focusTag,
      paceFactor: spec.paceFactor,
    });

    const signature = routeSignature(route);
    if (seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);

    variants.push({
      id: spec.id,
      title: spec.title,
      summary: spec.summary,
      route,
    });
  }

  return variants;
}
