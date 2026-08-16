import { distanceKm } from "@/lib/geo";
import { POLAND_BOUNDS } from "@/lib/poland";
import type {
  ExternalPlaceResult,
  PlacesProvider,
  PlacesProviderParams,
} from "./types";

// Klucz jest tylko po stronie serwera (bez prefiksu NEXT_PUBLIC_) — ten
// moduł jest wywoływany wyłącznie z komponentów serwerowych, więc klucz
// nigdy nie trafia do przeglądarki.
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY ?? "";
const PLACES_URL = "https://api.geoapify.com/v2/places";
const PLACE_DETAILS_URL = "https://api.geoapify.com/v2/place-details";

const MIN_DISTANCE_FROM_CURATED_KM = 1;
const MAX_DETAIL_LOOKUPS = 8;

// Mapowanie naszych kategorii zainteresowań (z formularza planera i z
// kategorii przeglądania w bocznym menu) na kategorie turystyczne
// Geoapify — https://apidocs.geoapify.com/docs/places/#categories
// To dopasowanie heurystyczne: Geoapify ma znacznie bogatszą,
// hierarchiczną taksonomię, tu bierzemy najbliższe odpowiedniki.
const INTEREST_TO_GEOAPIFY_CATEGORIES: Record<string, string[]> = {
  Historia: [
    "tourism.sights",
    "heritage",
    "tourism.sights.memorial",
    "tourism.sights.archaeological_site",
    "tourism.sights.battlefield",
  ],
  Natura: ["natural", "national_park", "leisure.park.nature_reserve"],
  Architektura: [
    "tourism.sights.building",
    "tourism.sights.castle",
    "tourism.sights.manor",
    "building.historic",
  ],
  "Zamki i Pałace": [
    "tourism.sights.castle",
    "tourism.sights.manor",
    "tourism.sights.fort",
  ],
  "Parki Narodowe": ["national_park", "natural.protected_area"],
  Jeziora: ["natural.water", "natural.water.bay"],
  "Aktywność fizyczna": ["sport", "leisure.park", "entertainment.activity_park"],
  "Architektura sakralna": [
    "tourism.sights.place_of_worship",
    "religion.place_of_worship",
    "heritage",
  ],
  Relaks: ["leisure.park", "leisure.spa", "beach", "natural.water"],
};

const DEFAULT_CATEGORIES = ["tourism.sights", "tourism.attraction", "heritage", "natural"];

function categoriesForInterests(interests: string[]): string {
  const categories = interests.flatMap(
    (interest) => INTEREST_TO_GEOAPIFY_CATEGORIES[interest] ?? [],
  );
  const unique = Array.from(new Set(categories));
  return (unique.length > 0 ? unique : DEFAULT_CATEGORIES).join(",");
}

type GeoapifyPlaceFeature = {
  properties: {
    place_id: string;
    name?: string;
    formatted?: string;
    lat: number;
    lon: number;
  };
};

type GeoapifyDetailsFeature = {
  properties: {
    name?: string;
    // Obecne na properties, gdy miejsce ma adres — niezależnie od typu
    // geometrii (patrz komentarz przy fetchPlaceDetails niżej).
    lat?: number;
    lon?: number;
    description?: string;
    website?: string;
    wiki_and_media?: {
      image?: string;
      wikipedia?: string;
      wikimedia_commons?: string;
    };
  };
  // Dla obszarów (jeziora, parki, budynki) geometria to Polygon/
  // MultiPolygon — zagnieżdżona tablica pierścieni, nie prosta para
  // [lon, lat]. Typujemy więc "coordinates" jako nieznane i parsujemy
  // je ostrożnie, tylko gdy typ to faktycznie "Point".
  geometry?: { type: string; coordinates: unknown };
};

async function fetchPlaces({
  center,
  radiusMeters,
  interests,
  limit,
  exclude,
}: PlacesProviderParams): Promise<ExternalPlaceResult[]> {
  if (!GEOAPIFY_API_KEY) return [];

  const categories = categoriesForInterests(interests);

  try {
    // "filter" jest twardym ograniczeniem (wyklucza wyniki spoza obszaru),
    // a "bias" tylko preferuje wyniki bliżej podanego punktu, nie
    // wykluczając reszty — dlatego to filter=rect musi wyznaczać granicę
    // Polski, a nie promień wokół center (który bywa punktem startowym
    // użytkownika spoza kraju, np. Zurychem). Wcześniej używaliśmy tu
    // filter=circle wokół center, co przy zagranicznym punkcie startowym
    // dosłownie szukało miejsc za granicą zamiast w Polsce.
    const searchUrl =
      `${PLACES_URL}?categories=${encodeURIComponent(categories)}` +
      `&filter=rect:${POLAND_BOUNDS.minLng},${POLAND_BOUNDS.minLat},${POLAND_BOUNDS.maxLng},${POLAND_BOUNDS.maxLat}` +
      `&bias=circle:${center.lng},${center.lat},${radiusMeters}` +
      `&limit=${Math.min(limit * 3, 40)}&lang=pl&apiKey=${GEOAPIFY_API_KEY}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const features = (searchData.features ?? []) as GeoapifyPlaceFeature[];

    const candidates = features.filter((feature) => {
      if (!feature.properties.name) return false;
      const point = { lat: feature.properties.lat, lng: feature.properties.lon };
      return !exclude.some(
        (curated) => distanceKm(curated, point) < MIN_DISTANCE_FROM_CURATED_KM,
      );
    });

    const picked = candidates.slice(0, Math.min(limit, MAX_DETAIL_LOOKUPS));

    const details = await Promise.all(
      picked.map(async (feature) => {
        try {
          const detailUrl =
            `${PLACE_DETAILS_URL}?id=${feature.properties.place_id}` +
            `&features=details&lang=pl&apiKey=${GEOAPIFY_API_KEY}`;
          const detailRes = await fetch(detailUrl);
          if (!detailRes.ok) return null;
          const detailData = await detailRes.json();
          return (detailData.features?.[0] as GeoapifyDetailsFeature | undefined) ?? null;
        } catch {
          return null;
        }
      }),
    );

    return picked.map((feature, index) => {
      const detailProps = details[index]?.properties;
      const description =
        detailProps?.description?.trim() ||
        feature.properties.formatted ||
        "Dodatkowe miejsce w pobliżu trasy, znalezione poza naszą kuratorską bazą.";

      return {
        externalId: feature.properties.place_id,
        title: feature.properties.name!,
        description: description.slice(0, 220),
        lat: feature.properties.lat,
        lng: feature.properties.lon,
        image: detailProps?.wiki_and_media?.image ?? null,
        imageAlt: feature.properties.name!,
        sourceUrl:
          detailProps?.wiki_and_media?.wikipedia ?? detailProps?.website ?? null,
      };
    });
  } catch {
    // Sieć/Geoapify niedostępne — po prostu nie dokładamy miejsc
    // podstawowych, trasa zostaje zbudowana z samej bazy kuratorskiej.
    return [];
  }
}

// Dociąga na żywo szczegóły jednego miejsca po jego Geoapify place_id.
// Miejsca "podstawowe" nie mają własnego rekordu w Supabase (ich dane
// nigdy nie są zapisywane — powstają tylko na czas generowania trasy),
// więc strona szczegółów odpytuje o nie ponownie w tym miejscu.
async function fetchPlaceDetails(externalId: string): Promise<ExternalPlaceResult | null> {
  if (!GEOAPIFY_API_KEY) return null;

  try {
    const detailUrl =
      `${PLACE_DETAILS_URL}?id=${externalId}` +
      `&features=details&lang=pl&apiKey=${GEOAPIFY_API_KEY}`;
    const res = await fetch(detailUrl);
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0] as GeoapifyDetailsFeature | undefined;
    if (!feature?.properties.name) return null;

    // Preferujemy properties.lat/lon — Geoapify je podaje jako proste
    // liczby niezależnie od typu geometrii. Do współrzędnych z geometrii
    // sięgamy tylko jako zapasowo, i tylko dla punktów — dla jezior,
    // parków czy budynków geometria to Polygon/MultiPolygon (zagnieżdżona
    // tablica pierścieni), a nie pojedyncza para [lon, lat].
    let lat = feature.properties.lat;
    let lng = feature.properties.lon;

    if ((lat === undefined || lng === undefined) && feature.geometry?.type === "Point") {
      const point = feature.geometry.coordinates as [number, number];
      [lng, lat] = point;
    }

    if (lat === undefined || lng === undefined) return null;

    const description =
      feature.properties.description?.trim() ||
      "Dodatkowe miejsce, znalezione poza naszą kuratorską bazą.";

    return {
      externalId,
      title: feature.properties.name,
      description: description.slice(0, 600),
      lat,
      lng,
      image: feature.properties.wiki_and_media?.image ?? null,
      imageAlt: feature.properties.name,
      sourceUrl:
        feature.properties.wiki_and_media?.wikipedia ?? feature.properties.website ?? null,
    };
  } catch {
    return null;
  }
}

export const geoapifyProvider: PlacesProvider = {
  id: "geoapify",
  attribution: {
    author: "Geoapify (dane OpenStreetMap)",
    license: "ODbL",
  },
  fetchPlaces,
  fetchPlaceDetails,
};
