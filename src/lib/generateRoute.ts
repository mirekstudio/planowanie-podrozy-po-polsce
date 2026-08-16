import type { Place } from "@/data/places";
import { distanceKm } from "@/lib/geo";
import { SPREAD_REGION_SUB_REGIONS } from "@/lib/poland";

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

// Opis wariantu geograficznego ("Łeba – Władysławowo") był wcześniej
// statycznym tekstem z definicji podregionu — niezależnym od tego, jakie
// przystanki faktycznie trafiły do trasy. Budujemy go teraz z pierwszego
// i ostatniego RZECZYWISTEGO przystanku w wygenerowanej trasie, żeby
// zawsze odzwierciedlał to, co appka naprawdę wybrała, a nie z góry
// założony zakres.
function describeRouteSpan(route: GeneratedRoute, fallback: string): string {
  if (route.stops.length === 0) return fallback;
  const first = route.stops[0].title;
  const last = route.stops[route.stops.length - 1].title;
  return first === last ? first : `${first} – ${last}`;
}

// Promień (wokół kotwicy podregionu) używany TYLKO dla miejsc kuratorskich
// — one nie wiedzą, do którego podregionu należą (patrz niżej), więc dla
// nich to jedyny dostępny sposób. Dla dłuższego czasu nie próbujemy tu być
// zbyt precyzyjni: kuratorskich miejsc jest mało i zwykle żadne nie
// wypadnie w promieniu wybrzeża, co jest ok — wariant i tak wypełni się
// miejscami "podstawowymi".
const CURATED_SUB_REGION_RADIUS_KM = 120;

// Ogranicza pulę kandydatów do jednego podregionu geograficznego. Miejsca
// "podstawowe" (z Geoapify) są otagowane wprost ID podregionu, z którego
// zostały dociągnięte (patrz toBasicPlace w getRoutePlaces.ts) — to
// dokładniejsze niż liczenie odległości po fakcie, bo sąsiednie kotwice
// bywają blisko siebie (np. Łeba i Gdynia, ~70 km) i promienie by się
// zazębiały, przez co dwa "różne" warianty wychodziłyby identyczne.
// Miejsca kuratorskie takiego tagu nie mają, więc dla nich jedyną opcją
// jest zwykły filtr odległości od kotwicy.
function withinSubRegion(places: Place[], subRegionId: string, anchors: Coordinates[]): Place[] {
  return places.filter((place) =>
    place.source === "basic"
      ? place.region === subRegionId
      : anchors.some((anchor) => distanceKm(anchor, place) <= CURATED_SUB_REGION_RADIUS_KM),
  );
}

// Rozdziela pulę miejsc podregionu między jego kotwice (np. Trójmiasto /
// Hel / Mierzeja Wiślana) — każde miejsce trafia do klastra najbliższej
// kotwicy. Potrzebne, bo zwykły chciwy algorytm najbliższego sąsiada
// (orderByProximity), puszczony na całej połączonej puli, utyka w
// najgęstszym klastrze (np. plaże Trójmiasta) i przy skromnym limicie
// przystanków nigdy nie "przeskakuje" do odleglejszego (Mierzeja
// Wiślana) — mimo że dane dla niego realnie istnieją.
function clusterByNearestAnchor(places: Place[], anchors: Coordinates[]): Place[][] {
  const clusters: Place[][] = anchors.map(() => []);
  for (const place of places) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    anchors.forEach((anchor, index) => {
      const d = distanceKm(anchor, place);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = index;
      }
    });
    clusters[bestIndex].push(place);
  }
  return clusters;
}

// Rozdziela liczbę dni na `parts` możliwie równych części (reszta trafia
// do pierwszych klastrów), żeby każda kotwica podregionu dostała
// proporcjonalny kawałek trasy zamiast zera dni.
function distributeDays(totalDays: number, parts: number): number[] {
  const base = Math.floor(totalDays / parts);
  const remainder = totalDays % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

// Łączy kilka wygenerowanych mini-tras (jedna na kotwicę podregionu) w
// jedną, z ponownie ponumerowanymi dniami po kolei.
function mergeRoutes(routes: GeneratedRoute[], startPoint: Coordinates | null): GeneratedRoute {
  const stops = routes.flatMap((r) => r.stops);
  const days: RouteDay[] = [];
  let dayNumber = 0;
  for (const r of routes) {
    for (const d of r.days) {
      dayNumber += 1;
      days.push({ day: dayNumber, places: d.places });
    }
  }

  return {
    stops,
    days,
    totalDistanceKm: calcTotalDistance(stops, startPoint),
    usedFallback: routes.some((r) => r.usedFallback),
    dailyHoursLimit: routes[0]?.dailyHoursLimit ?? DAILY_HOURS_MAX,
  };
}

// Zwraca od 1 do 3 wariantów tej samej trasy dla tych samych preferencji.
// Kolejność priorytetu, którą wymiar różnicujemy:
// 1) Jeśli wybrano geograficznie "rozciągnięty" typ regionu (na razie
//    tylko Morze — patrz SPREAD_REGION_SUB_REGIONS), warianty różnią się
//    odcinkiem wybrzeża (zachodnie/środkowe/wschodnie) — każdy liczony na
//    puli miejsc ograniczonej do okolic innej kotwicy, więc trasy są
//    naprawdę geograficznie różne, a nie tylko innym tempem w tym samym
//    miejscu.
// 2) W przeciwnym razie, jeśli zaznaczono kilka zainteresowań, warianty
//    różnią się tym, które z nich jest priorytetowe przy doborze miejsc.
// 3) W przeciwnym razie różnią się tempem zwiedzania (a przez to też
//    doborem miejsc, bo inny limit godzin dziennie mieści inną liczbę
//    przystanków).
// Identyczne w skutkach lub puste warianty są odfiltrowywane, więc czasem
// wynikiem jest tylko 1-2.
export function generateRouteVariants(
  places: Place[],
  options: RouteOptions,
): RouteVariant[] {
  const subRegions = (options.regionTypes ?? []).flatMap(
    (type) => SPREAD_REGION_SUB_REGIONS[type] ?? [],
  );

  const specs =
    subRegions.length > 0
      ? subRegions.slice(0, 3).map((sub) => ({
          id: sub.id,
          title: sub.title,
          summary: sub.summary,
          focusTag: null as string | null,
          paceFactor: 1,
          geoAnchors: sub.anchors as Coordinates[] | null,
        }))
      : options.interests.length >= 2
        ? options.interests.slice(0, 3).map((interest) => ({
            id: interest,
            title: `Wariant skupiony na: ${interest}`,
            summary: `Priorytet dla miejsc związanych z „${interest}”, reszta dnia dopełniona pozostałymi zainteresowaniami.`,
            focusTag: interest as string | null,
            paceFactor: 1,
            geoAnchors: null as Coordinates[] | null,
          }))
        : PACE_VARIANTS.map((variant) => ({
            id: variant.id,
            title: variant.title,
            summary: variant.summary,
            focusTag: (options.interests[0] ?? null) as string | null,
            paceFactor: variant.paceFactor,
            geoAnchors: null as Coordinates[] | null,
          }));

  const seenSignatures = new Set<string>();
  const variants: RouteVariant[] = [];

  for (const spec of specs) {
    let route: GeneratedRoute;

    if (spec.geoAnchors && spec.geoAnchors.length > 1) {
      // Kilka kotwic w tym podregionie (patrz clusterByNearestAnchor) —
      // dzielimy dni proporcjonalnie i liczymy osobną mini-trasę na
      // każdą, żeby np. "Trójmiasto – Hel – Mierzeja Wiślana" faktycznie
      // odwiedzało wszystkie trzy, a nie utykało w samym Trójmieście.
      const candidatePool = withinSubRegion(places, spec.id, spec.geoAnchors);
      const clusters = clusterByNearestAnchor(candidatePool, spec.geoAnchors);
      const dayCount = Math.max(1, options.days);
      const daysPerCluster = distributeDays(dayCount, clusters.length);

      const subRoutes = clusters
        .map((clusterPlaces, i) =>
          daysPerCluster[i] > 0
            ? generateRoute(clusterPlaces, {
                ...options,
                days: daysPerCluster[i],
                focusTag: spec.focusTag,
                paceFactor: spec.paceFactor,
              })
            : null,
        )
        .filter((r): r is GeneratedRoute => r !== null);

      route = mergeRoutes(subRoutes, options.startPoint ?? null);
    } else {
      const candidatePool = spec.geoAnchors
        ? withinSubRegion(places, spec.id, spec.geoAnchors)
        : places;

      route = generateRoute(candidatePool, {
        ...options,
        focusTag: spec.focusTag,
        paceFactor: spec.paceFactor,
      });
    }

    if (route.stops.length === 0) continue;

    const signature = routeSignature(route);
    if (seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);

    variants.push({
      id: spec.id,
      title: spec.title,
      summary: spec.geoAnchors ? describeRouteSpan(route, spec.summary) : spec.summary,
      route,
    });
  }

  return variants;
}
