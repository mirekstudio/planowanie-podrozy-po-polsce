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

function orderByProximity(
  places: Place[],
  start: Coordinates | null,
): Place[] {
  const remaining = [...places].sort((a, b) => a.sortOrder - b.sortOrder);
  const ordered: Place[] = [];

  let current: Coordinates | null = start;

  if (!current) {
    const first = remaining.shift();
    if (!first) return ordered;
    ordered.push(first);
    current = first;
  }

  while (remaining.length > 0) {
    remaining.sort((a, b) => distanceKm(current!, a) - distanceKm(current!, b));
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

export function generateRoute(
  places: Place[],
  options: RouteOptions,
): GeneratedRoute {
  const dayCount = Math.max(1, options.days);

  const hasYoungChild = (options.childrenAges ?? []).some(
    (age) => age < YOUNG_CHILD_AGE_THRESHOLD,
  );
  const dailyHoursLimit = hasYoungChild
    ? DAILY_HOURS_MAX * YOUNG_FAMILY_DAILY_HOURS_FACTOR
    : DAILY_HOURS_MAX;

  let candidates =
    options.interests.length > 0
      ? places.filter((place) =>
          place.tags.some((tag) => options.interests.includes(tag)),
        )
      : places;

  const usedFallback = candidates.length === 0;
  if (usedFallback) {
    candidates = places;
  }

  const startCoords = options.startPoint ?? null;
  const ordered = orderByProximity(candidates, startCoords);

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

    const hours = travelHours(current, place) + VISIT_HOURS;

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
