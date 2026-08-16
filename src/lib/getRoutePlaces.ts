import type { Place } from "@/data/places";
import { getPlaces } from "@/lib/getPlaces";
import { filterCandidates, type Coordinates, type RouteOptions } from "@/lib/generateRoute";
import { activePlacesProvider, type ExternalPlaceResult } from "@/lib/placesProviders";

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

function toBasicPlace(result: ExternalPlaceResult, tags: string[]): Place {
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
    // Dostawcy zewnętrzni nie znają naszej taksonomii regionu/otoczenia/
    // bliskości atrakcji, więc te miejsca zostają bez tych tagów — patrz
    // komentarz przy filterCandidates w generateRoute.ts.
    regionType: [],
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
// danych zewnętrznych, w promieniu wokół punktu startowego (lub środka
// ciężkości pasujących miejsc kuratorskich, gdy nie podano startu).
export async function getRoutePlaces(options: GetRoutePlacesOptions): Promise<Place[]> {
  const curated = await getPlaces();
  const matching = filterCandidates(curated, options);

  if (matching.length >= MIN_MATCHING_CURATED_PLACES) {
    return curated;
  }

  const center =
    options.startPoint ??
    centroid(
      (matching.length > 0 ? matching : curated).map((p) => ({
        lat: p.lat,
        lng: p.lng,
      })),
    );

  if (!center) return curated;

  const tags = options.interests;
  const results = await activePlacesProvider.fetchPlaces({
    center,
    radiusMeters: SUPPLEMENT_RADIUS_METERS,
    interests: options.interests,
    limit: SUPPLEMENT_LIMIT,
    exclude: curated.map((p) => ({ lat: p.lat, lng: p.lng })),
  });

  return [...curated, ...results.map((r) => toBasicPlace(r, tags))];
}
