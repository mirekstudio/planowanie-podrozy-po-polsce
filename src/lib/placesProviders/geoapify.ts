import { distanceKm } from "@/lib/geo";
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
    description?: string;
    website?: string;
    wiki_and_media?: {
      image?: string;
      wikipedia?: string;
      wikimedia_commons?: string;
    };
  };
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
    const searchUrl =
      `${PLACES_URL}?categories=${encodeURIComponent(categories)}` +
      `&filter=circle:${center.lng},${center.lat},${radiusMeters}` +
      `&bias=proximity:${center.lng},${center.lat}` +
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

export const geoapifyProvider: PlacesProvider = {
  id: "geoapify",
  attribution: {
    author: "Geoapify (dane OpenStreetMap)",
    license: "ODbL",
  },
  fetchPlaces,
};
