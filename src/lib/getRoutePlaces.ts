import type { Place } from "@/data/places";
import { getPlaces } from "@/lib/getPlaces";
import { filterCandidates, type Coordinates, type RouteOptions } from "@/lib/generateRoute";
import { activePlacesProvider, type ExternalPlaceResult } from "@/lib/placesProviders";
import { REGION_TYPE_ANCHORS, POLAND_CENTER, isWithinPoland } from "@/lib/poland";

// Poniżej tej liczby pasujących miejsc kuratorskich uznajemy, że nie da
// się z nich ułożyć sensownej trasy, i dociągamy uzupełnienie z
// zewnętrznego dostawcy (patrz src/lib/placesProviders).
const MIN_MATCHING_CURATED_PLACES = 4;
const SUPPLEMENT_RADIUS_METERS = 60_000;
const SUPPLEMENT_LIMIT = 8;

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
): Place {
  return {
    slug: `${activePlacesProvider.id}-${result.externalId}`,
    title: result.title,
    region: "",
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
    // (patrz regionAnchor), wyniki geograficznie z tego regionu, więc
    // uczciwie możemy je nim otagować — inaczej filtr regionu sam by je
    // odrzucał, mimo że to właśnie po nie sięgnęliśmy.
    regionType,
    surroundings: [],
    nearbyAttraction: null,
  };
}

export type GetRoutePlacesOptions = Pick<
  RouteOptions,
  "interests" | "startPoint" | "regionTypes" | "surroundings" | "nearbyAttractions"
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

  const center = pickSearchCenter(
    options.regionTypes,
    matching,
    curated,
    options.startPoint,
  );

  const tags = options.interests;
  // Tylko te wybrane typy regionu, dla których faktycznie mamy
  // geograficzną kotwicę (patrz REGION_TYPE_ANCHORS) — to nimi otagujemy
  // znalezione miejsca, bo to właśnie po nie sięgaliśmy wyszukiwaniem.
  const geoAnchoredRegionTypes = (options.regionTypes ?? []).filter(
    (type) => type in REGION_TYPE_ANCHORS,
  );
  const results = await activePlacesProvider.fetchPlaces({
    center,
    radiusMeters: SUPPLEMENT_RADIUS_METERS,
    interests: options.interests,
    limit: SUPPLEMENT_LIMIT,
    exclude: curated.map((p) => ({ lat: p.lat, lng: p.lng })),
  });

  return [
    ...curated,
    ...results.map((r) => toBasicPlace(r, tags, geoAnchoredRegionTypes)),
  ];
}
