import type { Place } from "@/data/places";
import { getPlaces } from "@/lib/getPlaces";
import { filterCandidates, type Coordinates, type RouteOptions } from "@/lib/generateRoute";
import { activePlacesProvider, type ExternalPlaceResult } from "@/lib/placesProviders";
import {
  REGION_TYPE_ANCHORS,
  SPREAD_REGION_SUB_REGIONS,
  POLAND_CENTER,
  isWithinPoland,
  type SubRegion,
} from "@/lib/poland";

// Poniżej tej liczby pasujących miejsc kuratorskich uznajemy, że nie da
// się z nich ułożyć sensownej trasy, i dociągamy uzupełnienie z
// zewnętrznego dostawcy (patrz src/lib/placesProviders).
const MIN_MATCHING_CURATED_PLACES = 4;

// Promień i liczba dociąganych miejsc rosną z liczbą dni podróży — 2-dniowy
// wypad nie potrzebuje szukać 300 km dalej, ale 7-dniowa trasa camperem
// powinna mieć z czego wybierać na całej rozpiętości, a nie tylko w
// promieniu 60 km od jednego punktu (stąd wcześniej trasy na dłuższe
// pobyty kurczyły się do wąskiego wycinka wybrzeża).
//
// Wyjątek: kombinacja Morze+Relaks ma promień celowo WĄSKI i niezależny od
// liczby dni — kategorie takie jak "camping" czy "beach.beach_resort" nie
// są same w sobie nadmorskie (Geoapify nie ma pojęcia "blisko wybrzeża"),
// więc przy promieniu skalowanym do 90 km dla 7-dniowej podróży wyniki
// ciągnęły dziesiątki km w głąb lądu. Zasięg całego wybrzeża i tak dają
// trzy niezależne kotwice podregionów (patrz SPREAD_REGION_SUB_REGIONS),
// nie potrzeba do tego szerokiego promienia wokół jednej z nich.
const TIGHT_COASTAL_RADIUS_METERS = 45_000;

function radiusMetersForDays(days: number, tightCoastal: boolean): number {
  if (tightCoastal) return TIGHT_COASTAL_RADIUS_METERS;
  return Math.min(90_000, 40_000 + days * 8_000);
}

function limitForDays(days: number): number {
  return Math.min(16, 4 + Math.ceil(days * 1.5));
}

// Podregion może mieć kilka kotwic (patrz SubRegion w poland.ts) — ten
// sam realny obiekt (ten sam Geoapify place_id) może się znaleźć w
// wynikach więcej niż jednej z nich, gdy leżą blisko siebie.
function dedupeByExternalId(results: ExternalPlaceResult[]): ExternalPlaceResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.externalId)) return false;
    seen.add(r.externalId);
    return true;
  });
}

function centroid(points: Coordinates[]): Coordinates | null {
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

// Jeśli wybrano typ regionu wskazujący na konkretny obszar Polski (np.
// "Morze"), to on wyznacza środek wyszukiwania — niezależnie od tego,
// gdzie jest punkt startowy. Dzięki temu "Morze" ze startem w Zurychu
// nadal szuka nad Bałtykiem, a nie w promieniu od Zurychu.
function regionAnchor(regionTypes: string[] | undefined): Coordinates | null {
  const anchors = (regionTypes ?? [])
    .map((type) => REGION_TYPE_ANCHORS[type])
    .filter((a): a is Coordinates => Boolean(a));
  return centroid(anchors);
}

// Wybiera środek wyszukiwania miejsc podstawowych, z priorytetem:
// 1) obszar geograficzny wskazany przez typ_regionu (jeśli konkretny),
// 2) środek ciężkości już pasujących miejsc kuratorskich (zawsze w Polsce),
// 3) punkt startowy — ale TYLKO jeśli leży w Polsce (start za granicą,
//    np. w Zurychu, nie może przesuwać wyszukiwania poza kraj),
// 4) środek ciężkości całej bazy kuratorskiej,
// 5) geograficzny środek Polski jako ostateczny fallback.
function pickSearchCenter(
  regionTypes: string[] | undefined,
  matching: Place[],
  curated: Place[],
  startPoint: Coordinates | null | undefined,
): Coordinates {
  return (
    regionAnchor(regionTypes) ??
    centroid(matching.map((p) => ({ lat: p.lat, lng: p.lng }))) ??
    (startPoint && isWithinPoland(startPoint) ? startPoint : null) ??
    centroid(curated.map((p) => ({ lat: p.lat, lng: p.lng }))) ??
    POLAND_CENTER
  );
}

function toBasicPlace(
  result: ExternalPlaceResult,
  tags: string[],
  regionType: string[],
  subRegionId: string | null,
): Place {
  return {
    slug: `${activePlacesProvider.id}-${result.externalId}`,
    title: result.title,
    // Miejsca "podstawowe" nie mają prawdziwego regionu administracyjnego
    // (nie pytamy o niego), więc dla wariantów geograficznych (patrz
    // SPREAD_REGION_SUB_REGIONS) trzymamy tu ID podregionu, z którego
    // dane miejsce zostało dociągnięte — to on, a nie odległość liczona
    // po fakcie, decyduje w generateRouteVariants, do którego wariantu
    // (np. "wschodnie-wybrzeze") to miejsce należy. Odległość zawodzi,
    // gdy sąsiednie kotwice leżą blisko siebie (np. Łeba i Gdynia, ~70 km)
    // — promienie się nakładają i dwa warianty wychodzą identyczne.
    region: subRegionId ?? "",
    description: result.description,
    longDescription: result.description,
    lat: result.lat,
    lng: result.lng,
    image: result.image ?? "",
    imageAlt: result.imageAlt,
    credit: activePlacesProvider.attribution,
    sortOrder: 999,
    tags,
    source: "basic",
    sourceUrl: result.sourceUrl,
    // Dostawcy zewnętrzni nie znają naszej taksonomii otoczenia/bliskości
    // atrakcji, więc te dwa pola zostają puste — patrz komentarz przy
    // filterCandidates w generateRoute.ts. typ_regionu jest wyjątkiem:
    // gdy wyszukiwanie było zakotwiczone na konkretnym typie regionu
    // (patrz regionAnchor/podregiony), wyniki geograficznie z tego
    // regionu, więc uczciwie możemy je nim otagować — inaczej filtr
    // regionu sam by je odrzucał, mimo że to właśnie po nie sięgnęliśmy.
    regionType,
    surroundings: [],
    nearbyAttraction: null,
  };
}

async function fetchSupplementFrom(
  center: Coordinates,
  interests: string[],
  regionTypes: string[] | undefined,
  days: number,
  exclude: Coordinates[],
): Promise<ExternalPlaceResult[]> {
  const tightCoastal = (regionTypes ?? []).includes("Morze") && interests.includes("Relaks");
  return activePlacesProvider.fetchPlaces({
    center,
    radiusMeters: radiusMetersForDays(days, tightCoastal),
    interests,
    regionTypes,
    limit: limitForDays(days),
    exclude,
  });
}

export type GetRoutePlacesOptions = Pick<
  RouteOptions,
  "days" | "interests" | "startPoint" | "regionTypes" | "surroundings" | "nearbyAttractions"
>;

// Zwraca pulę miejsc do generowania trasy: najpierw baza kuratorska
// (Supabase), a jeśli dla wybranych filtrów (zainteresowania, typ
// regionu, otoczenie, bliskość atrakcji) jest w niej za mało pasujących
// miejsc, dokłada do niej miejsca "podstawowe" z aktywnego dostawcy
// danych zewnętrznych — zawsze z terytorium Polski (patrz pickSearchCenter
// i twardy filtr granic w placesProviders/geoapify.ts), niezależnie od
// tego, gdzie faktycznie znajduje się punkt startowy użytkownika.
export async function getRoutePlaces(options: GetRoutePlacesOptions): Promise<Place[]> {
  const curated = await getPlaces();
  const matching = filterCandidates(curated, options);

  if (matching.length >= MIN_MATCHING_CURATED_PLACES) {
    return curated;
  }

  const excludePoints = curated.map((p) => ({ lat: p.lat, lng: p.lng }));
  const tags = options.interests;
  // Tylko te wybrane typy regionu, dla których faktycznie mamy
  // geograficzną kotwicę (patrz REGION_TYPE_ANCHORS) — to nimi otagujemy
  // znalezione miejsca, bo to właśnie po nie sięgaliśmy wyszukiwaniem.
  const geoAnchoredRegionTypes = (options.regionTypes ?? []).filter(
    (type) => type in REGION_TYPE_ANCHORS,
  );

  // Typy regionu geograficznie "rozciągnięte" (na razie tylko Morze —
  // patrz komentarz przy SPREAD_REGION_SUB_REGIONS) szukają równolegle
  // wokół kilku punktów wzdłuż całego obszaru, zamiast jednego punktu w
  // jego środku — inaczej dłuższe podróże kurczyły się do wąskiego
  // wycinka wokół jednej kotwicy (np. tylko Koszalin-Słupsk dla "Morze"
  // zamiast całego wybrzeża).
  const subRegions: SubRegion[] = (options.regionTypes ?? []).flatMap(
    (type) => SPREAD_REGION_SUB_REGIONS[type] ?? [],
  );

  if (subRegions.length > 0) {
    const resultsPerSubRegion = await Promise.all(
      subRegions.map(async (sub) => {
        // Kilka kotwic na podregion (patrz komentarz przy SubRegion) —
        // pytamy Geoapify o każdą z osobna i łączymy wyniki, bo jeden
        // punkt + wąski promień nie objąłby np. naraz i Trójmiasta, i
        // Helu, i Mierzei Wiślańskiej.
        const resultsPerAnchor = await Promise.all(
          sub.anchors.map((anchor) =>
            fetchSupplementFrom(
              anchor,
              options.interests,
              options.regionTypes,
              options.days,
              excludePoints,
            ),
          ),
        );
        return { subRegionId: sub.id, results: dedupeByExternalId(resultsPerAnchor.flat()) };
      }),
    );

    return [
      ...curated,
      ...resultsPerSubRegion.flatMap(({ subRegionId, results }) =>
        results.map((r) => toBasicPlace(r, tags, geoAnchoredRegionTypes, subRegionId)),
      ),
    ];
  }

  const center = pickSearchCenter(
    options.regionTypes,
    matching,
    curated,
    options.startPoint,
  );

  const results = await fetchSupplementFrom(
    center,
    options.interests,
    options.regionTypes,
    options.days,
    excludePoints,
  );

  return [
    ...curated,
    ...results.map((r) => toBasicPlace(r, tags, geoAnchoredRegionTypes, null)),
  ];
}
